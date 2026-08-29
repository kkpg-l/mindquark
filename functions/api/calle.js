const http = require("node:http");
const https = require("node:https");
const crypto = require("node:crypto");

const DEFAULT_BASE_URL = "https://api.heycall-e.com";
const E164_PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;
const CALL_ID_PATTERN = /^[A-Za-z0-9_-]{6,80}$/;
const TERMINAL_CALL_STATUSES = new Set(["completed", "failed", "canceled"]);

const CALL_RESULT_SCHEMA = {
  type: "object",
  required: ["call_outcome", "crisis_signal", "mood_after_call"],
  additionalProperties: false,
  properties: {
    call_outcome: {
      type: "string",
      enum: ["completed_supportive_conversation", "recipient_unavailable", "recipient_declined", "ended_for_safety"],
      description:
        "Use completed_supportive_conversation when a supportive conversation took place. Use recipient_unavailable when the call did not reach the recipient. Use recipient_declined when the recipient declined the check-in. Use ended_for_safety when the call was ended following the crisis safety protocol.",
    },
    crisis_signal: {
      type: "string",
      enum: ["yes", "no", "unknown"],
      description:
        "Use yes ONLY when the recipient expressed thoughts of self-harm, suicide, or harming themselves or others during the call. Use unknown when the evidence is unclear. Prefer no only when there is clearly no such signal.",
    },
    mood_after_call: {
      type: "string",
      enum: ["better", "same", "worse", "unknown"],
      description:
        "How the recipient reported feeling by the end of the call compared to the start. Use unknown when this was not expressed clearly.",
    },
    support_summary: {
      type: "string",
      description:
        "One or two compassionate sentences summarizing what was discussed and any grounding practice offered. Never include sensitive personal identifiers such as full address, workplace, or financial details.",
    },
  },
};

function buildCallTask(phone) {
  const targetIntro = phone
    ? `Call ${phone} for a supportive, gentle wellbeing check-in. The person requested this call themselves.`
    : "The person you are calling requested this supportive check-in call themselves.";

  return [
    `You are Maya, a warm, gentle wellbeing companion calling from MindQuark. ${targetIntro}`,
    "Begin with a soft greeting, say this is a supportive check-in call from their MindQuark companion, and invite them to share how they have been feeling today.",
    "Listen more than you speak. Offer gentle, CBT-informed reflection: validate feelings, softly name unhelpful thought patterns, and offer one simple grounding practice (slow 4-7-8 breathing or 5-4-3-2-1 sensory awareness).",
    "Keep the whole call under about 10 minutes. Close warmly by thanking them for sharing and inviting them to schedule another check-in whenever they wish.",
    "HARD SAFETY RULES (you must always follow these):",
    "1. You are not a medical professional. Never give medical, medication, or diagnostic advice, and never assess or predict any condition.",
    "2. If at ANY point the person expresses thoughts of self-harm, suicide, or harming themselves or others: stay calm and compassionate, tell them that support is available, encourage them to contact the 988 Suicide & Crisis Lifeline (call or text 988 in the US or Canada) or their local emergency services, do not attempt to counsel the crisis yourself, and end the call politely as soon as it is safe to do so.",
    "3. Never promise to keep crisis information confidential, and never contact emergency services yourself.",
    "4. Do not ask for or repeat sensitive personal identifiers such as full address, financial details, or identification numbers.",
  ].join(" ");
}

function normalizeCallPhone(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\s\-\(\)\.]/g, "").trim();
}

function isValidCallPhone(value) {
  const clean = normalizeCallPhone(value);
  return clean.length > 0 && E164_PHONE_PATTERN.test(clean);
}

function isValidCallId(value) {
  return typeof value === "string" && CALL_ID_PATTERN.test(value);
}

function isTerminalCallStatus(status) {
  return TERMINAL_CALL_STATUSES.has(status);
}

function buildStableIdempotencyKey(...parts) {
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

function callCalleApi({ method, path, apiKey, idempotencyKey, body, timeoutMs = 15_000 }) {
  const base = (process.env.CALLE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const url = new URL(`${base}${path}`);
  const payload = body === undefined ? null : JSON.stringify(body);
  const isHttp = url.protocol === "http:";
  const client = isHttp ? http : https;
  const port = url.port ? Number(url.port) : isHttp ? 80 : 443;

  return new Promise((resolve, reject) => {
    let settled = false;
    const req = client.request(
      {
        hostname: url.hostname,
        port,
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
        timeout: timeoutMs,
      },
      (response) => {
        let raw = "";
        response.on("data", (chunk) => (raw += chunk));
        response.on("end", () => {
          if (settled) return;
          settled = true;
          let data = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            data = null;
          }
          resolve({ status: response.statusCode || 0, data });
        });
      }
    );

    req.on("error", (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      if (settled) return;
      settled = true;
      reject(new Error("CALL-E API request timed out."));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = {
  CALL_RESULT_SCHEMA,
  buildCallTask,
  buildStableIdempotencyKey,
  callCalleApi,
  isTerminalCallStatus,
  isValidCallId,
  isValidCallPhone,
  normalizeCallPhone,
};