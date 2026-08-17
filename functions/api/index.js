const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const https = require("node:https");
const crypto = require("node:crypto");
const WebSocket = require("ws");

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Api-Token"],
  })
);
app.use(express.json({ limit: "15mb" }));

// 1. Primary Model: OpenRouter Gemma 4
const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY ||
  "__SET_IN_CLOUDBASE_CONSOLE__";
const PRIMARY_MODEL = "google/gemma-4-26b-a4b-it:free";

// 2. Backup Model: iFlytek Maas Coding astron-code-latest
const BACKUP_API_KEY =
  process.env.BACKUP_API_KEY ||
  "__SET_IN_CLOUDBASE_CONSOLE__";
const BACKUP_MODEL = "astron-code-latest";

// 3. iFlytek Speech Recognition (IAT) & Speech Synthesis (TTS) Credentials
const XF_APPID = "__SET_IN_CLOUDBASE_CONSOLE__";
const XF_API_SECRET = "__SET_IN_CLOUDBASE_CONSOLE__";
const XF_API_KEY = "__SET_IN_CLOUDBASE_CONSOLE__";

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

// Call Primary Model (OpenRouter Gemma 4)
function callPrimaryModel(messages, maxTokens = 600) {
  const postData = JSON.stringify({
    model: PRIMARY_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: maxTokens,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "openrouter.ai",
      port: 443,
      path: "/api/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://mindquark.tcloudbaseapp.com",
        "X-Title": "MindQuark Sanctuary",
        "Content-Length": Buffer.byteLength(postData),
      },
      timeout: 11000,
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300 && json.choices?.[0]?.message?.content) {
            resolve(cleanModelReply(json.choices[0].message.content));
          } else {
            reject(new Error(`Primary API Error: ${res.statusCode} - ${body.slice(0, 150)}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Primary Model request timeout"));
    });

    req.write(postData);
    req.end();
  });
}

// Call Backup Model (iFlytek astron-code-latest)
function callBackupModel(messages, maxTokens = 600) {
  const postData = JSON.stringify({
    model: BACKUP_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: maxTokens,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "maas-coding-api.cn-huabei-1.xf-yun.com",
      port: 443,
      path: "/v2/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BACKUP_API_KEY}`,
        "Content-Length": Buffer.byteLength(postData),
      },
      timeout: 11000,
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300 && json.choices?.[0]?.message?.content) {
            resolve(cleanModelReply(json.choices[0].message.content));
          } else {
            reject(new Error(`Backup API Error: ${res.statusCode} - ${body.slice(0, 150)}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Backup Model request timeout"));
    });

    req.write(postData);
    req.end();
  });
}

// Robust execution with automatic failover
async function callLlmWithFailover(messages, maxTokens = 600) {
  try {
    return await callPrimaryModel(messages, maxTokens);
  } catch (primaryErr) {
    console.warn("Primary model failed, switching to backup model:", primaryErr.message);
    try {
      return await callBackupModel(messages, maxTokens);
    } catch (backupErr) {
      console.error("Backup model also failed:", backupErr.message);
      throw backupErr;
    }
  }
}

// Generate iFlytek IAT WebSocket signed URL
function generateIatUrl() {
  const host = "iat-api.xfyun.cn";
  const date = new Date().toUTCString();
  const builder = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`;
  const sha = crypto
    .createHmac("sha256", XF_API_SECRET)
    .update(builder)
    .digest("base64");
  const authOrigin = `api_key="${XF_API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${sha}"`;
  const authorization = Buffer.from(authOrigin).toString("base64");
  const url = `wss://${host}/v2/iat?authorization=${encodeURIComponent(
    authorization
  )}&date=${encodeURIComponent(date)}&host=${host}`;
  return { url, appId: XF_APPID };
}

// Generate iFlytek TTS WebSocket signed URL
function generateTtsUrl() {
  const host = "tts-api.xfyun.cn";
  const date = new Date().toUTCString();
  const builder = `host: ${host}\ndate: ${date}\nGET /v2/tts HTTP/1.1`;
  const sha = crypto
    .createHmac("sha256", XF_API_SECRET)
    .update(builder)
    .digest("base64");
  const authOrigin = `api_key="${XF_API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${sha}"`;
  const authorization = Buffer.from(authOrigin).toString("base64");
  const url = `wss://${host}/v2/tts?authorization=${encodeURIComponent(
    authorization
  )}&date=${encodeURIComponent(date)}&host=${host}`;
  return { url, appId: XF_APPID };
}

// Synthesize Text to Speech via iFlytek TTS WebSocket
function synthesizeTts(text, voice = "female", speed = 48) {
  return new Promise((resolve, reject) => {
    try {
      const { url, appId } = generateTtsUrl();
      const ws = new WebSocket(url);
      const audioChunks = [];

      // Select gentle voice: female -> catherine (EN/CN), male -> john / aisjiuxu
      const vcn = voice === "male" ? "john" : "catherine";

      const timer = setTimeout(() => {
        try {
          ws.close();
        } catch {}
        reject(new Error("TTS request timed out."));
      }, 15000);

      ws.onopen = () => {
        const frame = {
          common: { app_id: appId },
          business: {
            aue: "lame", // mp3 output
            sfl: 1,
            auf: "audio/L16;rate=16000",
            vcn: vcn,
            speed: speed,
            volume: 50,
            pitch: 50,
            bgs: 0,
            tte: "UTF8",
          },
          data: {
            status: 2,
            text: Buffer.from(text.slice(0, 1000)).toString("base64"),
          },
        };
        ws.send(JSON.stringify(frame));
      };

      ws.onmessage = (e) => {
        try {
          const res = JSON.parse(e.data);
          if (res.code !== 0) {
            clearTimeout(timer);
            ws.close();
            reject(new Error(`iFlytek TTS Error (${res.code}): ${res.message}`));
            return;
          }

          if (res.data?.audio) {
            audioChunks.push(Buffer.from(res.data.audio, "base64"));
          }

          if (res.data?.status === 2) {
            clearTimeout(timer);
            const totalBuffer = Buffer.concat(audioChunks);
            ws.close();
            resolve(totalBuffer.toString("base64"));
          }
        } catch (err) {
          clearTimeout(timer);
          reject(err);
        }
      };

      ws.onerror = (err) => {
        clearTimeout(timer);
        reject(err);
      };
    } catch (e) {
      reject(e);
    }
  });
}

const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "mindquark-counselor-api",
    time: new Date().toISOString(),
  });
});

// iFlytek Voice Dictation Auth URL generator
router.get("/iat-auth", (req, res) => {
  try {
    const authData = generateIatUrl();
    res.json({ ok: true, ...authData });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate IAT auth URL", details: err.message });
  }
});

// iFlytek Speech Synthesis (TTS) Endpoint
router.post("/tts", async (req, res) => {
  const { text, voice = "female", speed = 48 } = req.body || {};
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Text is required for TTS." });
  }

  // Remove markdown headers or bold symbols for clear audio reading
  const cleanText = text
    .replace(/[#*`_~>\[\]]/g, "")
    .replace(/💡【.*?】/g, "")
    .trim();

  try {
    const base64Audio = await synthesizeTts(cleanText, voice, speed);
    res.json({
      ok: true,
      audioBase64: base64Audio,
      mimeType: "audio/mp3",
    });
  } catch (err) {
    console.error("TTS Synthesis error:", err.message);
    res.status(500).json({ error: "Failed to synthesize speech", details: err.message });
  }
});

// AI Counseling & CBT Chat Endpoint (with auto-failover)
router.post("/chat", async (req, res) => {
  const { message, history = [], persona = "female" } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required." });
  }

  const text = message.trim();
  const lower = text.toLowerCase();

  // Crisis detection
  const crisisKeywords = [
    "suicide",
    "kill myself",
    "end my life",
    "hurt myself",
    "cutting",
    "want to die",
    "自杀",
    "自残",
    "不想活了",
  ];
  const isCrisis = crisisKeywords.some((k) => lower.includes(k));

  if (isCrisis) {
    return res.json({
      reply:
        "I hear how much pain you are experiencing right now, and I care deeply about your safety. You don't have to carry this alone. Please reach out to someone who can support you right away:\n\n📞 US/Canada: Call or Text 988 (Suicide & Crisis Lifeline)\n📞 UK: Call 111 | Australia: Call 13 11 14\n🌐 International: https://findahelpline.com",
      cbtTip: "Crisis Safety: Immediate compassionate human support.",
      isCrisis: true,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    });
  }

  const systemPrompt = getSystemPrompt(persona);

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-8).map((h) => ({
      role: h.sender?.id === "user-123" ? "user" : "assistant",
      content: h.text,
    })),
    { role: "user", content: text },
  ];

  try {
    const replyContent = await callLlmWithFailover(messages, 600);
    return res.json({
      reply: replyContent,
      cbtTip: "Empathetic CBT Reflection • MindQuark Sanctuary",
      isCrisis: false,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    });
  } catch (error) {
    console.error("All models failed:", error.message);
    const fallbackGreeting = persona === "male"
      ? `I hear you. Whatever is weighing on you right now, let's take it one step at a time. What part of this feels most important to focus on first?`
      : `I hear you clearly and I'm holding space for what you're feeling. Take a gentle breath. What part of this feels heaviest on your heart right now?`;

    return res.json({
      reply: fallbackGreeting,
      cbtTip: "Active Listening & Mindful Acceptance.",
      isCrisis: false,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    });
  }
});

// CBT Cognitive Distortion Reframer Endpoint (with auto-failover)
router.post("/reframe", async (req, res) => {
  const { thought, distortionType = "all-or-nothing" } = req.body || {};
  if (!thought) {
    return res.status(400).json({ error: "Thought text is required." });
  }

  const prompt = `Perform a supportive Cognitive Behavioral Therapy (CBT) reframing analysis on this automatic negative thought:
Thought: "${thought}"
Suspected Distortion: "${distortionType}"

Format your answer cleanly:
💡【CBT Cognitive Reframing】
Original Thought: "${thought}"
Identified Distortion: Explain the distortion gently in 1 sentence.
Balanced Perspective: Provide a compassionate, realistic, evidence-based reframe in 2-3 sentences.`;

  try {
    const content = await callLlmWithFailover([
      {
        role: "system",
        content: "You are a master CBT cognitive psychology practitioner. Be concise, empathetic, and objective. Output ONLY the formatted result.",
      },
      { role: "user", content: prompt },
    ], 500);

    return res.json({
      ok: true,
      reframed: content,
    });
  } catch (err) {
    let fallback = `💡【CBT Cognitive Reframing】\nOriginal Thought: "${thought}"\nBalanced Perspective: Feelings are valid signals, but they are not immutable facts. You have navigated challenges before and you can move forward one small step at a time.`;
    return res.json({
      ok: true,
      reframed: fallback,
    });
  }
});

// External Agent & Dialogue Psychological Analyzer Endpoint (with auto-failover)
router.post("/analyze", async (req, res) => {
  const { transcript } = req.body || {};
  if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
    return res.status(400).json({ error: "Transcript text is required." });
  }

  const prompt = `You are an expert Clinical Psychologist & Cognitive Behavioral Therapy (CBT) Dialogue Auditor.
Analyze the following pasted conversation (which could be between a user and an AI agent, or between two individuals):

\`\`\`
${transcript.slice(0, 3000)}
\`\`\`

Provide a comprehensive, constructive, and empathetic psychological assessment structured strictly with these sections:

1. 🌡️ **Emotional Climate & Needs**:
Analyze the underlying emotional vulnerability, unspoken needs, and relational dynamic of the user or participants.

2. 🧩 **Cognitive Distortions & Blindspots**:
Identify any cognitive distortions present (e.g. All-or-Nothing thinking, Catastrophizing, Overgeneralization, Toxic Positivity, or Mind-Reading).

3. 💡 **CBT Psychological Audit & Improvement**:
Evaluate how the other party/agent responded. How could the response be made significantly more validating, psychologically safe, and therapeutic?

4. 🌱 **Recommended Reframing & Grounding Action**:
Provide a concrete reframed phrase and a grounding practice that would foster genuine healing in this scenario.`;

  try {
    const analysis = await callLlmWithFailover([
      {
        role: "system",
        content: "You are MindQuark's Senior Psychological Dialogue Auditor. Provide deep, constructive, and compassionate analysis. Do not include thinking process tags.",
      },
      { role: "user", content: prompt },
    ], 800);

    return res.json({
      ok: true,
      analysis,
    });
  } catch (err) {
    console.error("Analysis error:", err.message);
    const fallback = `1. 🌡️ **Emotional Climate & Needs**: The dialogue reveals subtle emotional vulnerability and a deep need for validation.\n\n2. 🧩 **Cognitive Distortions**: Potential patterns of all-or-nothing thinking and self-criticism.\n\n3. 💡 **CBT Psychological Audit**: The interaction could benefit from deeper active listening and non-judgmental acceptance before jumping to conclusions.\n\n4. 🌱 **Recommended Action**: Take a grounded pause to validate inner feelings and separate facts from emotional assumptions.`;
    return res.json({
      ok: true,
      analysis: fallback,
    });
  }
});

app.use("/", router);
app.use("/api", router);

const handler = serverless(app);
exports.main = async (event, context) => {
  return await handler(event, context);
};

if (require.main === module) {
  const PORT = process.env.PORT || 9000;
  app.listen(PORT, () => {
    console.log(`MindQuark Cloud Function listening on port ${PORT}`);
  });
}
