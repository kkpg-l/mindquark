const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const https = require("node:https");
const crypto = require("node:crypto");
const WebSocket = require("ws");
const { assessSafety, buildCrisisResponse } = require("./safety");

const app = express();

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
const requestBuckets = new Map();

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

  // If captcha is not configured in env, allow request (graceful degradation)
  if (!appId || !secretKey) {
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

function requestChatCompletion({ hostname, path, authorization, model, messages, maxTokens }) {
  const postData = JSON.stringify({
    model,
    messages,
    temperature: 0.7,
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

async function callPrimaryModel(messages, maxTokens = 600) {
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
      });
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} failed, trying next candidate:`, err.message);
    }
  }
  throw lastError || new Error("All primary models failed");
}

function callBackupModel(messages, maxTokens = 600) {
  return requestChatCompletion({
    hostname: "maas-coding-api.cn-huabei-1.xf-yun.com",
    path: "/v2/chat/completions",
    authorization: requireConfigured("BACKUP_API_KEY"),
    model: process.env.BACKUP_MODEL?.trim() || "astron-code-latest",
    messages,
    maxTokens,
  });
}

async function callLlmWithFailover(messages, maxTokens = 600) {
  try {
    return await callPrimaryModel(messages, maxTokens);
  } catch (primaryError) {
    console.warn("Primary model failed; trying the configured backup model.", primaryError.message);
    try {
      return await callBackupModel(messages, maxTokens);
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
