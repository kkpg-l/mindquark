const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const https = require("node:https");
const crypto = require("node:crypto");
const WebSocket = require("ws");
const { assessSafety, buildCrisisResponse } = require("./safety");
const { extractJsonObject, sanitizeSemanticScores, sanitizeReframeResult } = require("./guideUtils");
const {
  CALL_RESULT_SCHEMA,
  buildCallTask,
  buildStableIdempotencyKey,
  callCalleApi,
  isTerminalCallStatus,
  isValidCallId,
  isValidCallPhone,
  normalizeCallPhone,
} = require("./calle");

const app = express();
app.set("trust proxy", 1);

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "https://kkpg-d2ga363tca9086e3e-1469579803.tcloudbaseapp.com",
  "https://kkpg-d2ga363tca9086e3e-1469579803.ap-shanghai.app.tcloudbase.com",
];
// Allow dynamic origin detection when CORS_ORIGINS is not configured
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    const host = url.hostname;
    // Allow CloudBase production/preview hosting and Cloudflare Pages domains
    if (
      host.endsWith(".tcloudbaseapp.com") ||
      host.endsWith(".tcloudbase.com") ||
      host.endsWith(".pages.dev")
    ) {
      return true;
    }
    // Allow local development hostnames
    if (host === "localhost" || host === "127.0.0.1") {
      return true;
    }
  } catch {}
  return false;
}

const RATE_LIMIT_WINDOW_MS = getPositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
const RATE_LIMIT_MAX_REQUESTS = getPositiveInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 30);
const MAX_MESSAGE_LENGTH = 4_000;
const MAX_THOUGHT_LENGTH = 3_000;
const MAX_TRANSCRIPT_LENGTH = 6_000;
const MAX_TTS_LENGTH = 1_000;
const MAX_HISTORY_ITEMS = 8;
const MAX_HISTORY_MESSAGE_LENGTH = 1_200;
const MAX_GUIDE_MESSAGES = 12;
const MAX_GUIDE_MESSAGE_LENGTH = 1_200;
const MAX_GUIDE_SESSION_LENGTH = 2_000;
const MAX_GUIDE_THOUGHT_LENGTH = 3_000;
const requestBuckets = new Map();

// CALL-E voice check-in call guards (real phone calls cost real money)
const CALL_MAX_PER_DAY_PER_IP = getPositiveInteger(process.env.CALL_MAX_PER_DAY_PER_IP, 3);
const CALL_MAX_ACTIVE = getPositiveInteger(process.env.CALL_MAX_ACTIVE, 1);
const CALL_ACTIVE_TTL_MS = 15 * 60 * 1000; // 15 minutes max active call timeout to prevent permanent lockouts
const callDayBuckets = new Map(); // `${clientKey}:${YYYY-MM-DD}` -> calls created
const activeCalls = new Map(); // callId -> { clientKey, createdAt } (released on terminal status poll or TTL)

function pruneActiveCalls() {
  const now = Date.now();
  for (const [id, entry] of activeCalls) {
    if (!entry?.createdAt || now - entry.createdAt > CALL_ACTIVE_TTL_MS) {
      activeCalls.delete(id);
    }
  }
}

function pruneRequestBuckets() {
  const now = Date.now();
  for (const [key, bucket] of requestBuckets) {
    if (now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS * 2) {
      requestBuckets.delete(key);
    }
  }
}

function pruneCallDayBuckets() {
  const today = new Date().toISOString().slice(0, 10);
  for (const [key] of callDayBuckets) {
    if (!key.endsWith(`:${today}`)) {
      callDayBuckets.delete(key);
    }
  }
}

const CALL_CRISIS_RESOURCES = [
  { label: "988 Suicide & Crisis Lifeline (US/Canada)", url: "https://988lifeline.org/" },
  { label: "Find A Helpline (international)", url: "https://findahelpline.com/" },
];

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS policy"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Api-Token"],
  })
);
app.use(express.json({ limit: "64kb" }));

const BOT_UA_REGEX = /(python-requests|aiohttp|httpx|urllib|scrapy|postmanruntime|insomnia|httpie|go-http-client|okhttp|libwww-perl|wget)/i;

function antiBotMiddleware(req, res, next) {
  // Allow health check endpoint for uptime monitors
  if (req.path === "/health" || req.path === "/api/health") {
    return next();
  }

  const userAgent = String(req.headers["user-agent"] || "").trim();

  // 1. Block missing or suspiciously short User-Agent
  if (!userAgent || userAgent.length < 5) {
    return res.status(403).json({ error: "Access denied: Missing or invalid User-Agent." });
  }

  // 2. Block well-known automated crawler / scraper User-Agents
  if (BOT_UA_REGEX.test(userAgent)) {
    return res.status(403).json({ error: "Access denied: Automated scraper detected." });
  }

  // 3. Honeypot check: reject if hidden bot trap fields were filled
  if (req.body && (req.body._hp_trap || req.body.__bot_field)) {
    return res.status(403).json({ error: "Access denied: Bot honeypot triggered." });
  }

  next();
}

app.use(antiBotMiddleware);

function verifyTencentCaptcha({ ticket, randstr, userIp }) {
  const appId = process.env.TCAPTCHA_APP_ID?.trim() || process.env.CAPTCHA_APP_ID?.trim();
  const secretKey = process.env.TCAPTCHA_SECRET_KEY?.trim() || process.env.CAPTCHA_SECRET_KEY?.trim();

  // If captcha is not configured in env or placeholder is present, allow request (graceful degradation)
  if (
    !appId ||
    !secretKey ||
    appId.startsWith("__SET_IN_") ||
    secretKey.startsWith("__SET_IN_")
  ) {
    return Promise.resolve({ ok: true, skipped: true });
  }

  if (!ticket || !randstr) {
    return Promise.resolve({ ok: false, error: "Tencent Cloud Captcha verification required." });
  }

  const postData = JSON.stringify({
    CaptchaType: 9,
    Ticket: ticket,
    Randstr: randstr,
    CaptchaAppId: Number(appId) || appId,
    AppSecretKey: secretKey,
    UserIp: userIp || "127.0.0.1",
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "captcha.tencentcloudapi.com",
        port: 443,
        path: "/",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-TC-Action": "DescribeCaptchaResult",
          "X-TC-Version": "2019-07-22",
          "Content-Length": Buffer.byteLength(postData),
        },
        timeout: 5000,
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => {
          try {
            const data = JSON.parse(body);
            const captchaCode = data.Response?.CaptchaCode;
            if (captchaCode === 1) {
              resolve({ ok: true });
            } else {
              const msg = data.Response?.CaptchaMsg || "Tencent Captcha verification failed.";
              resolve({ ok: false, error: msg });
            }
          } catch (e) {
            resolve({ ok: false, error: "Failed to parse captcha verification response." });
          }
        });
      }
    );

    req.on("error", (err) => {
      console.warn("Captcha verification network warning:", err.message);
      // Soft-degrade if upstream captcha network times out
      resolve({ ok: true, degraded: true });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: true, degraded: true });
    });

    req.write(postData);
    req.end();
  });
}

function getPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function requireConfigured(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getClientKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded || req.ip || "unknown";
  return String(ip).split(",")[0].trim();
}

function rateLimit(req, res, next) {
  const now = Date.now();
  if (requestBuckets.size > 200) {
    pruneRequestBuckets();
  }
  if (callDayBuckets.size > 200) {
    pruneCallDayBuckets();
  }

  const key = `${req.path}:${getClientKey(req)}`;
  const existing = requestBuckets.get(key);
  const bucket = !existing || now - existing.windowStart >= RATE_LIMIT_WINDOW_MS
    ? { windowStart: now, count: 0 }
    : existing;

  bucket.count += 1;
  requestBuckets.set(key, bucket);

  if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - bucket.windowStart)) / 1_000));
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({ error: "Too many requests. Please try again shortly." });
  }

  return next();
}

function limitText(value, maxLength, fieldName) {
  if (typeof value !== "string") {
    return { error: `${fieldName} must be a string.` };
  }

  const text = value.trim();
  if (!text) {
    return { error: `${fieldName} is required.` };
  }
  if (text.length > maxLength) {
    return { error: `${fieldName} must not exceed ${maxLength} characters.` };
  }

  return { text };
}

function getCrisisResponse(value) {
  const assessment = assessSafety(value);
  return assessment.level === "high" ? buildCrisisResponse(assessment.language) : null;
}

function getSystemPrompt(persona = "female") {
  if (persona === "male") {
    return `You are Liam, a calm, steady, and deeply gentle male counselor at MindQuark.
Your presence is reassuring, grounded, warm, and supportive (like a thoughtful brother or dependable mentor).

Your counseling approach:
1. Provide gentle, steady validation so the client feels secure and unhurried.
2. Grounded in Cognitive Behavioral Therapy (CBT), gently help the client examine unhelpful thoughts (all-or-nothing thinking, catastrophizing, harsh self-criticism) with practical, gentle realism.
3. Suggest simple, actionable grounding reflections or physical breath resets.
4. Keep your tone gentle, respectful, calm, and soothing. 2-3 concise paragraphs max.
5. Output ONLY your direct response to the client. Never output thinking process tags or meta commentary.`;
  }

  return `You are Maya, a warm, intuitive, and deeply gentle female counselor at MindQuark.
Your presence is nurturing, empathetic, soft, and soothing (like a compassionate confidante or caring guide).

Your counseling approach:
1. Provide soft, deeply empathetic emotional validation so the client feels entirely accepted and held.
2. Grounded in Cognitive Behavioral Therapy (CBT), gently illuminate cognitive distortions and invite self-compassion.
3. Suggest soothing somatic grounding (5-4-3-2-1 sensory awareness or mindful breathing) and gentle self-kindness.
4. Keep your tone soft, gentle, caring, and conversational. 2-3 concise paragraphs max.
5. Output ONLY your direct response to the client. Never output thinking process tags or meta commentary.`;
}

function cleanModelReply(raw) {
  let cleaned = String(raw || "").trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  if (/^Here's a thinking process:/i.test(cleaned) || /^Thinking Process:/i.test(cleaned)) {
    const parts = cleaned.split(/\n\s*Draft - Paragraph by Paragraph.*?\n|\n\s*Response:\s*\n|\n\s*Paragraph 1.*?\n/i);
    if (parts.length > 1) {
      cleaned = parts.slice(1).join("\n").trim();
    } else {
      const match = cleaned.match(/"([^"]{30,})"/);
      if (match) cleaned = match[1];
    }
  }
  return cleaned;
}

function requestChatCompletion({ hostname, path, authorization, model, messages, maxTokens, temperature = 0.7 }) {
  const postData = JSON.stringify({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        port: 443,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
          "Content-Length": Buffer.byteLength(postData),
        },
        timeout: 11_000,
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => {
          try {
            const json = JSON.parse(body);
            const content = json.choices?.[0]?.message?.content;
            if (response.statusCode >= 200 && response.statusCode < 300 && content) {
              resolve(cleanModelReply(content));
              return;
            }
            reject(new Error(`Model API error: ${response.statusCode} - ${body.slice(0, 150)}`));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Model request timeout"));
    });
    req.write(postData);
    req.end();
  });
}

const FALLBACK_MODELS = [
  "minimax/minimax-m2.7:free",
  "z-ai/glm-5.2:free",
  "google/gemma-4-26b-a4b-it:free",
];

async function callPrimaryModel(messages, maxTokens = 600, temperature) {
  const configuredModel = process.env.PRIMARY_MODEL?.trim() || "minimax/minimax-m2.7:free";
  const apiKey = requireConfigured("OPENROUTER_API_KEY");
  const modelsToTry = [configuredModel, ...FALLBACK_MODELS.filter((m) => m !== configuredModel)];

  let lastError;
  for (const model of modelsToTry) {
    try {
      return await requestChatCompletion({
        hostname: "openrouter.ai",
        path: "/api/v1/chat/completions",
        authorization: `Bearer ${apiKey}`,
        model,
        messages,
        maxTokens,
        temperature,
      });
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} failed, trying next candidate:`, err.message);
    }
  }
  throw lastError || new Error("All primary models failed");
}

function callBackupModel(messages, maxTokens = 600, temperature) {
  return requestChatCompletion({
    hostname: "maas-coding-api.cn-huabei-1.xf-yun.com",
    path: "/v2/chat/completions",
    authorization: requireConfigured("BACKUP_API_KEY"),
    model: process.env.BACKUP_MODEL?.trim() || "astron-code-latest",
    messages,
    maxTokens,
    temperature,
  });
}

async function callLlmWithFailover(messages, maxTokens = 600, temperature) {
  try {
    return await callPrimaryModel(messages, maxTokens, temperature);
  } catch (primaryError) {
    console.warn("Primary model failed; trying the configured backup model.", primaryError.message);
    try {
      return await callBackupModel(messages, maxTokens, temperature);
    } catch (backupError) {
      console.error("All configured model providers failed.", backupError.message);
      throw backupError;
    }
  }
}

function getSpeechCredentials() {
  return {
    appId: requireConfigured("XF_APPID"),
    apiSecret: requireConfigured("XF_API_SECRET"),
    apiKey: requireConfigured("XF_API_KEY"),
  };
}

function generateSignedSpeechUrl(host, path, credentials) {
  const date = new Date().toUTCString();
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  const signature = crypto
    .createHmac("sha256", credentials.apiSecret)
    .update(signatureOrigin)
    .digest("base64");
  const authorizationOrigin = `api_key="${credentials.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authorizationOrigin).toString("base64");
  const url = `wss://${host}${path}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${host}`;
  return { url, appId: credentials.appId };
}

function generateIatUrl() {
  return generateSignedSpeechUrl("iat-api.xfyun.cn", "/v2/iat", getSpeechCredentials());
}

function generateTtsUrl() {
  return generateSignedSpeechUrl("tts-api.xfyun.cn", "/v2/tts", getSpeechCredentials());
}

function synthesizeTts(text, voice = "female", speed = 48) {
  return new Promise((resolve, reject) => {
    const { url, appId } = generateTtsUrl();
    const ws = new WebSocket(url);
    const audioChunks = [];
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {}
      reject(new Error("TTS request timed out."));
    }, 15_000);

    ws.onopen = () => {
      const frame = {
        common: { app_id: appId },
        business: {
          aue: "lame",
          sfl: 1,
          auf: "audio/L16;rate=16000",
          vcn: voice === "male" ? "john" : "catherine",
          speed,
          volume: 50,
          pitch: 50,
          bgs: 0,
          tte: "UTF8",
        },
        data: {
          status: 2,
          text: Buffer.from(text).toString("base64"),
        },
      };
      ws.send(JSON.stringify(frame));
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (response.code !== 0) {
          clearTimeout(timer);
          ws.close();
          reject(new Error(`iFlytek TTS error (${response.code}): ${response.message}`));
          return;
        }

        if (response.data?.audio) {
          audioChunks.push(Buffer.from(response.data.audio, "base64"));
        }
        if (response.data?.status === 2) {
          clearTimeout(timer);
          const audio = Buffer.concat(audioChunks).toString("base64");
          ws.close();
          resolve(audio);
        }
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timer);
      reject(error);
    };
  });
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-MAX_HISTORY_ITEMS)
    .flatMap((item) => {
      if (!item || (item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string") {
        return [];
      }
      const content = item.content.trim().slice(0, MAX_HISTORY_MESSAGE_LENGTH);
      return content ? [{ role: item.role, content }] : [];
    });
}

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "mindquark-counselor-api",
    time: new Date().toISOString(),
  });
});

router.get("/iat-auth", rateLimit, (req, res) => {
  try {
    res.json({ ok: true, ...generateIatUrl() });
  } catch (error) {
    console.error("IAT auth generation failed.", error.message);
    res.status(503).json({ error: "Voice recognition is not configured." });
  }
});

router.post("/tts", rateLimit, async (req, res) => {
  const textResult = limitText(req.body?.text, MAX_TTS_LENGTH, "Text");
  if (textResult.error) return res.status(400).json({ error: textResult.error });

  // Tencent Cloud Captcha (防水墙) verification
  const captchaTicket = req.body?.captchaTicket || req.headers["x-captcha-ticket"];
  const captchaRandstr = req.body?.captchaRandstr || req.headers["x-captcha-randstr"];
  const captchaResult = await verifyTencentCaptcha({
    ticket: captchaTicket,
    randstr: captchaRandstr,
    userIp: getClientKey(req),
  });
  if (!captchaResult.ok) {
    return res.status(403).json({ error: captchaResult.error || "Captcha verification failed." });
  }

  const voice = req.body?.voice === "male" ? "male" : "female";
  const requestedSpeed = Number(req.body?.speed);
  const speed = Number.isFinite(requestedSpeed) ? Math.min(100, Math.max(0, requestedSpeed)) : 48;
  const cleanText = textResult.text.replace(/[#*`_~>\[\]]/g, "").replace(/💡【.*?】/g, "").trim();

  try {
    const audioBase64 = await synthesizeTts(cleanText, voice, speed);
    res.json({ ok: true, audioBase64, mimeType: "audio/mp3" });
  } catch (error) {
    console.error("TTS synthesis failed.", error.message);
    res.status(503).json({ error: "Speech synthesis is temporarily unavailable." });
  }
});

router.post("/chat", rateLimit, async (req, res) => {
  const messageResult = limitText(req.body?.message, MAX_MESSAGE_LENGTH, "Message");
  if (messageResult.error) return res.status(400).json({ error: messageResult.error });

  const crisisResponse = getCrisisResponse(messageResult.text);
  if (crisisResponse) return res.json(crisisResponse);

  // Tencent Cloud Captcha (防水墙) verification
  const captchaTicket = req.body?.captchaTicket || req.headers["x-captcha-ticket"];
  const captchaRandstr = req.body?.captchaRandstr || req.headers["x-captcha-randstr"];
  const captchaResult = await verifyTencentCaptcha({
    ticket: captchaTicket,
    randstr: captchaRandstr,
    userIp: getClientKey(req),
  });
  if (!captchaResult.ok) {
    return res.status(403).json({ error: captchaResult.error || "Captcha verification failed." });
  }

  const persona = req.body?.persona === "male" ? "male" : "female";
  const messages = [
    { role: "system", content: getSystemPrompt(persona) },
    ...normalizeHistory(req.body?.history),
    { role: "user", content: messageResult.text },
  ];

  try {
    const reply = await callLlmWithFailover(messages, 600);
    res.json({
      reply,
      cbtTip: "Empathetic CBT Reflection • MindQuark Sanctuary",
      cbtCategory: "CBT Reflection",
      isCrisis: false,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    });
  } catch (error) {
    console.error("Chat generation failed.", error.message);
    const fallback = persona === "male"
      ? "I hear you. Whatever is weighing on you right now, let's take it one step at a time. What feels most important to focus on first?"
      : "I hear you clearly and I'm holding space for what you're feeling. Take a gentle breath. What part of this feels heaviest right now?";
    res.json({
      reply: fallback,
      cbtTip: "Active Listening & Mindful Acceptance.",
      cbtCategory: "Supportive Fallback",
      isCrisis: false,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    });
  }
});

router.post("/reframe", rateLimit, async (req, res) => {
  const thoughtResult = limitText(req.body?.thought, MAX_THOUGHT_LENGTH, "Thought text");
  if (thoughtResult.error) return res.status(400).json({ error: thoughtResult.error });

  const crisisResponse = getCrisisResponse(thoughtResult.text);
  if (crisisResponse) return res.json(crisisResponse);

  // Tencent Cloud Captcha (防水墙) verification
  const captchaTicket = req.body?.captchaTicket || req.headers["x-captcha-ticket"];
  const captchaRandstr = req.body?.captchaRandstr || req.headers["x-captcha-randstr"];
  const captchaResult = await verifyTencentCaptcha({
    ticket: captchaTicket,
    randstr: captchaRandstr,
    userIp: getClientKey(req),
  });
  if (!captchaResult.ok) {
    return res.status(403).json({ error: captchaResult.error || "Captcha verification failed." });
  }

  const distortionType = typeof req.body?.distortionType === "string"
    ? req.body.distortionType.trim().slice(0, 100) || "all-or-nothing"
    : "all-or-nothing";
  const prompt = `Perform a supportive Cognitive Behavioral Therapy (CBT) reframing analysis on this automatic negative thought:
Thought: "${thoughtResult.text}"
Suspected Distortion: "${distortionType}"

Format your answer cleanly:
💡【CBT Cognitive Reframing】
Original Thought: "${thoughtResult.text}"
Identified Distortion: Explain the distortion gently in 1 sentence.
Balanced Perspective: Provide a compassionate, realistic, evidence-based reframe in 2-3 sentences.`;

  try {
    const reframed = await callLlmWithFailover([
      {
        role: "system",
        content: "You are a CBT-informed reflection assistant. Be concise, empathetic, non-diagnostic, and objective. Output only the formatted result.",
      },
      { role: "user", content: prompt },
    ], 500);
    res.json({ ok: true, reframed });
  } catch (error) {
    console.error("Reframe generation failed.", error.message);
    res.json({
      ok: true,
      reframed: `💡【CBT Cognitive Reframing】\nOriginal Thought: "${thoughtResult.text}"\nBalanced Perspective: Feelings are valid signals, but they are not immutable facts. You can move forward one small, compassionate step at a time.`,
    });
  }
});

router.post("/guide/assess", rateLimit, async (req, res) => {
  const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = rawMessages
    .filter((m) => typeof m === "string")
    .map((m) => m.trim().slice(0, MAX_GUIDE_MESSAGE_LENGTH))
    .filter(Boolean)
    .slice(-MAX_GUIDE_MESSAGES);
  const quizContext = typeof req.body?.quizContext === "string"
    ? req.body.quizContext.trim().slice(0, 600)
    : "";

  if (messages.length === 0 && !quizContext) {
    return res.status(400).json({ error: "No assessment input provided." });
  }

  const combined = [...messages, quizContext].join("\n");
  const crisisResponse = getCrisisResponse(combined);
  if (crisisResponse) return res.json(crisisResponse);

  const captchaTicket = req.body?.captchaTicket || req.headers["x-captcha-ticket"];
  const captchaRandstr = req.body?.captchaRandstr || req.headers["x-captcha-randstr"];
  const captchaResult = await verifyTencentCaptcha({
    ticket: captchaTicket,
    randstr: captchaRandstr,
    userIp: getClientKey(req),
  });
  if (!captchaResult.ok) {
    return res.status(403).json({ error: captchaResult.error || "Captcha verification failed." });
  }

  // ① Semantic scoring — any failure degrades to null (frontend falls back to deterministic mode).
  let semanticScores = null;
  let evidence = [];
  if (messages.length > 0) {
    try {
      const raw = await callLlmWithFailover(
        [
          {
            role: "system",
            content:
              "You are a careful psychological text analyst. You never diagnose. Return ONLY valid JSON with no markdown fences.",
          },
          {
            role: "user",
            content: `Analyze these journal/chat excerpts from one person. Rate how strongly each thinking pattern appears, from 0.0 (absent) to 1.0 (very strong):
- perfectionism: rigid all-or-nothing standards, fear of mistakes
- avoidance: evading tasks, people, or feelings
- rumination: repetitive, stuck thinking loops
- catastrophizing: expecting worst-case outcomes
- selfCriticism: harsh self-judgment and self-blame

Return ONLY this JSON shape:
{"patterns": {"perfectionism": 0.0, "avoidance": 0.0, "rumination": 0.0, "catastrophizing": 0.0, "selfCriticism": 0.0}, "evidence": ["short quote", "short quote"]}
evidence: up to 3 short quotes (max 20 words each) supporting the two highest scores.

Text:
"""
${messages.join("\n---\n")}
"""`,
          },
        ],
        300,
        0.2
      );
      const sanitized = sanitizeSemanticScores(extractJsonObject(raw));
      if (sanitized) {
        semanticScores = sanitized.scores;
        evidence = sanitized.evidence;
      }
    } catch (error) {
      console.warn("Guide semantic scoring failed; falling back to deterministic mode.", error.message);
    }
  }

  // ② Narrative generation — the LLM never participates in scoring.
  let narrative = null;
  let recommendations = [];
  try {
    const scoreLine = semanticScores
      ? `Pattern scores (0-1): perfectionism ${semanticScores.perfectionism}, avoidance ${semanticScores.avoidance}, rumination ${semanticScores.rumination}, catastrophizing ${semanticScores.catastrophizing}, selfCriticism ${semanticScores.selfCriticism}.`
      : "Pattern scores unavailable; rely on the quiz context.";
    const raw = await callLlmWithFailover(
      [
        {
          role: "system",
          content:
            "You are a warm, gentle wellbeing guide. Non-diagnostic, non-clinical, strengths-acknowledging. Return ONLY valid JSON with no markdown fences.",
        },
        {
          role: "user",
          content: `${scoreLine}
${quizContext ? `Quiz context: ${quizContext}\n` : ""}Write:
1. "narrative": 2-3 sentences in second person, warm and non-judgmental, describing these as tendencies (never diagnoses or labels), acknowledging one strength.
2. "recommendations": exactly 3 short actionable suggestions (max 15 words each) matched to the strongest patterns.

Return ONLY this JSON shape: {"narrative": "...", "recommendations": ["...", "...", "..."]}`,
        },
      ],
      400
    );
    const parsed = extractJsonObject(raw);
    if (parsed && typeof parsed.narrative === "string" && parsed.narrative.trim()) {
      narrative = parsed.narrative.trim().slice(0, 600);
    }
    if (Array.isArray(parsed?.recommendations)) {
      recommendations = parsed.recommendations
        .filter((r) => typeof r === "string" && r.trim())
        .map((r) => r.trim().slice(0, 140))
        .slice(0, 3);
    }
  } catch (error) {
    console.warn("Guide narrative generation failed; report will use local copy.", error.message);
  }

  res.json({ ok: true, semanticScores, evidence, narrative, recommendations });
});

router.post("/guide/reframe", rateLimit, async (req, res) => {
  const session = req.body?.session && typeof req.body.session === "object" ? req.body.session : null;
  if (!session) {
    return res.status(400).json({ error: "A reframe session payload is required." });
  }

  const situationResult = limitText(session.situation, MAX_GUIDE_SESSION_LENGTH, "Situation");
  if (situationResult.error) return res.status(400).json({ error: situationResult.error });

  const thoughtResult = limitText(session.automaticThought, MAX_GUIDE_THOUGHT_LENGTH, "Automatic thought");
  if (thoughtResult.error) return res.status(400).json({ error: thoughtResult.error });

  const evidenceFor = typeof session.evidenceFor === "string" ? session.evidenceFor.trim().slice(0, 1_500) : "";
  const evidenceAgainst = typeof session.evidenceAgainst === "string" ? session.evidenceAgainst.trim().slice(0, 1_500) : "";
  const emotionLabel = typeof session.emotionLabel === "string" ? session.emotionLabel.slice(0, 60) : "";
  const emotionIntensity = Number(session.emotionIntensity);

  const combined = [situationResult.text, thoughtResult.text, evidenceFor, evidenceAgainst].join("\n");
  const crisisResponse = getCrisisResponse(combined);
  if (crisisResponse) return res.json(crisisResponse);

  const captchaTicket = req.body?.captchaTicket || req.headers["x-captcha-ticket"];
  const captchaRandstr = req.body?.captchaRandstr || req.headers["x-captcha-randstr"];
  const captchaResult = await verifyTencentCaptcha({
    ticket: captchaTicket,
    randstr: captchaRandstr,
    userIp: getClientKey(req),
  });
  if (!captchaResult.ok) {
    return res.status(403).json({ error: captchaResult.error || "Captcha verification failed." });
  }

  const prompt = `A person is completing a CBT thought record. Help them with the final two steps.

Situation (what happened):
"${situationResult.text}"

Automatic thought:
"${thoughtResult.text}"

Emotion: ${emotionLabel || "unspecified"}${Number.isFinite(emotionIntensity) ? ` (intensity ${Math.min(10, Math.max(1, emotionIntensity))}/10)` : ""}
Evidence supporting the thought: ${evidenceFor || "(none given yet)"}
Evidence against the thought: ${evidenceAgainst || "(none given yet)"}

Tasks:
1. Identify the single best-fitting cognitive distortion type, choosing exactly one of: all-or-nothing, catastrophizing, overgeneralization, mind-reading, fortune-telling, emotional-reasoning, should-statements, labeling, discounting-positive, personalization, blame, filtering.
2. Explain that distortion in ONE gentle, non-judgmental sentence (second person).
3. Write a balanced thought (2-3 sentences): compassionate, realistic, grounded in the evidence above.
4. Suggest ONE small, concrete step they can take today.

Return ONLY valid JSON, no markdown:
{"distortion": {"type": "...", "explanation": "..."}, "reframe": {"balancedThought": "...", "actionableStep": "..."}}`;

  try {
    const raw = await callLlmWithFailover(
      [
        {
          role: "system",
          content: "You are a CBT-informed guide: warm, concise, non-diagnostic. Output only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      500
    );
    const result = sanitizeReframeResult(extractJsonObject(raw));
    if (result) {
      return res.json({ ok: true, ...result });
    }
    console.warn("Guide reframe returned unparseable JSON; using fallback.");
  } catch (error) {
    console.error("Guide reframe generation failed.", error.message);
  }

  res.json({
    ok: true,
    distortion: {
      type: "all-or-nothing",
      explanation: "This thought leans toward an all-or-nothing reading of the situation.",
    },
    reframe: {
      balancedThought: `"${thoughtResult.text}" is a real feeling, and feelings are valid signals — but they are not permanent facts. A more balanced view: this moment is difficult, not the whole story, and you have handled difficult moments before.`,
      actionableStep: "Write down one small thing that went okay today, however minor.",
    },
  });
});

router.post("/analyze", rateLimit, async (req, res) => {
  const transcriptResult = limitText(req.body?.transcript, MAX_TRANSCRIPT_LENGTH, "Transcript text");
  if (transcriptResult.error) return res.status(400).json({ error: transcriptResult.error });

  const crisisResponse = getCrisisResponse(transcriptResult.text);
  if (crisisResponse) return res.json(crisisResponse);

  // Tencent Cloud Captcha (防水墙) verification
  const captchaTicket = req.body?.captchaTicket || req.headers["x-captcha-ticket"];
  const captchaRandstr = req.body?.captchaRandstr || req.headers["x-captcha-randstr"];
  const captchaResult = await verifyTencentCaptcha({
    ticket: captchaTicket,
    randstr: captchaRandstr,
    userIp: getClientKey(req),
  });
  if (!captchaResult.ok) {
    return res.status(403).json({ error: captchaResult.error || "Captcha verification failed." });
  }

  const prompt = `You are an expert CBT-informed dialogue auditor. Analyze the following pasted conversation, which may be between a user and an AI agent or between two individuals:

\`\`\`
${transcriptResult.text}
\`\`\`

Provide a constructive, compassionate assessment structured strictly with these sections:

1. 🌡️ **Emotional Climate & Needs**: Analyze underlying vulnerability, unspoken needs, and relational dynamics.
2. 🧩 **Cognitive Distortions & Blindspots**: Identify potential patterns such as all-or-nothing thinking, catastrophizing, overgeneralization, toxic positivity, or mind-reading.
3. 💡 **CBT Psychological Audit & Improvement**: Evaluate how the other party responded and how it could be more validating and psychologically safe.
4. 🌱 **Recommended Reframing & Grounding Action**: Provide a concrete reframed phrase and a grounding practice.`;

  try {
    const analysis = await callLlmWithFailover([
      {
        role: "system",
        content: "You are MindQuark's CBT-informed dialogue auditor. Provide constructive, compassionate, non-diagnostic analysis. Do not include thinking process tags.",
      },
      { role: "user", content: prompt },
    ], 800);
    res.json({ ok: true, analysis });
  } catch (error) {
    console.error("Dialogue analysis failed.", error.message);
    res.json({
      ok: true,
      analysis: "1. 🌡️ **Emotional Climate & Needs**: The dialogue suggests emotional vulnerability and a need for validation.\n\n2. 🧩 **Cognitive Distortions & Blindspots**: Potential patterns include all-or-nothing thinking and self-criticism.\n\n3. 💡 **CBT Psychological Audit & Improvement**: The response could benefit from active listening and non-judgmental acceptance before advice.\n\n4. 🌱 **Recommended Reframing & Grounding Action**: Pause, name the feeling, and separate observable facts from self-critical interpretations.",
    });
  }
});

router.post("/call/create", rateLimit, async (req, res) => {
  // Explicit informed consent is mandatory before any real phone call
  if (req.body?.consent !== true) {
    return res.status(400).json({ error: "Explicit consent is required before requesting a support call." });
  }

  const rawPhone = typeof req.body?.phone === "string" ? req.body.phone : "";
  const phone = normalizeCallPhone(rawPhone);
  if (!isValidCallPhone(phone)) {
    return res.status(400).json({ error: "A valid E.164 phone number (for example +12125550123) is required." });
  }

  // Tencent Cloud Captcha (防水墙) verification
  const captchaTicket = req.body?.captchaTicket || req.headers["x-captcha-ticket"];
  const captchaRandstr = req.body?.captchaRandstr || req.headers["x-captcha-randstr"];
  const captchaResult = await verifyTencentCaptcha({
    ticket: captchaTicket,
    randstr: captchaRandstr,
    userIp: getClientKey(req),
  });
  if (!captchaResult.ok) {
    return res.status(403).json({ error: captchaResult.error || "Captcha verification failed." });
  }

  const apiKey = process.env.CALLE_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({ error: "Voice check-in calls are not configured yet." });
  }

  // Dedicated per-IP daily quota and global in-flight cap
  pruneActiveCalls();
  const clientKey = getClientKey(req);
  const today = new Date().toISOString().slice(0, 10);
  const dayKey = `${clientKey}:${today}`;
  const usedToday = callDayBuckets.get(dayKey) || 0;
  if (usedToday >= CALL_MAX_PER_DAY_PER_IP) {
    return res.status(429).json({ error: "Daily voice call limit reached. Please try again tomorrow." });
  }
  if (activeCalls.size >= CALL_MAX_ACTIVE) {
    return res.status(429).json({ error: "A support call is already in progress. Please wait a moment." });
  }

  // Stable idempotency key per (client, phone, day, attempt): retries collapse, new attempts do not.
  // The phone number is validated, sent to CALL-E, and then discarded — it is never stored.
  const idempotencyKey = `mq_${buildStableIdempotencyKey(clientKey, phone, today, String(usedToday))}`;

  try {
    const { status, data } = await callCalleApi({
      method: "POST",
      path: "/v1/calls",
      apiKey,
      idempotencyKey,
      body: {
        task: buildCallTask(phone),
        recipients: [{ phones: [phone], region: "US", locale: "en-US" }],
        result_schema: CALL_RESULT_SCHEMA,
        metadata: { source: "mindquark-voice-checkin", requested_date: today },
      },
    });

    if (status < 200 || status >= 300 || !data?.id) {
      console.error("CALL-E call creation failed.", status, data?.error?.message || data?.message || "");
      return res.status(502).json({ error: "The voice check-in call could not be scheduled. Please try again later." });
    }

    callDayBuckets.set(dayKey, usedToday + 1);
    activeCalls.set(data.id, { clientKey, createdAt: Date.now() });

    return res.json({ ok: true, callId: data.id, status: data.status || "queued" });
  } catch (error) {
    console.error("CALL-E call creation error.", error.message);
    return res.status(502).json({ error: "The voice check-in call could not be scheduled. Please try again later." });
  }
});

router.get("/call/status/:callId", rateLimit, async (req, res) => {
  const callId = String(req.params?.callId || "");
  if (!isValidCallId(callId)) {
    return res.status(400).json({ error: "A valid call id is required." });
  }

  const apiKey = process.env.CALLE_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({ error: "Voice check-in calls are not configured yet." });
  }

  try {
    const { status, data } = await callCalleApi({
      method: "GET",
      path: `/v1/calls/${encodeURIComponent(callId)}`,
      apiKey,
    });

    if (status === 404) {
      return res.status(404).json({ error: "Voice call not found." });
    }
    if (status < 200 || status >= 300 || !data) {
      console.error("CALL-E status fetch failed.", status);
      return res.status(502).json({ error: "Voice call status is temporarily unavailable." });
    }

    const callStatus = String(data.status || "unknown");

    if (isTerminalCallStatus(callStatus)) {
      // Release the in-flight slot once the call reaches a terminal state
      activeCalls.delete(callId);

      const result = data.structured_result || data.result || null;
      const crisis = result?.crisis_signal === "yes";

      return res.json({
        ok: true,
        callId,
        status: callStatus,
        failureCode: data.failure_code || data.failureCode || null,
        crisis,
        result,
        ...(crisis ? { resources: CALL_CRISIS_RESOURCES } : {}),
      });
    }

    return res.json({ ok: true, callId, status: callStatus, crisis: false, result: null });
  } catch (error) {
    console.error("CALL-E status fetch error.", error.message);
    return res.status(502).json({ error: "Voice call status is temporarily unavailable." });
  }
});

app.use("/", router);
app.use("/api", router);

app.use((error, req, res, next) => {
  if (error?.message === "Origin is not allowed by CORS policy") {
    return res.status(403).json({ error: error.message });
  }
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large." });
  }
  console.error("Unhandled API error.", error);
  return res.status(500).json({ error: "Internal server error." });
});

const handler = serverless(app);
exports.main = async (event, context) => handler(event, context);

if (require.main === module) {
  const port = process.env.PORT || 9000;
  app.listen(port, () => {
    console.log(`MindQuark Cloud Function listening on port ${port}`);
  });
}
