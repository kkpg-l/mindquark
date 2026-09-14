const http = require("node:http");
const https = require("node:https");
const crypto = require("node:crypto");

const DEFAULT_BASE_URL = "https://api.heycall-e.com";
const E164_PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;
const CALL_ID_PATTERN = /^[A-Za-z0-9_-]{6,80}$/;
const TERMINAL_CALL_STATUSES = new Set(["completed", "failed", "canceled"]);

// Creating a call runs a server-side task-readiness review before CALL-E accepts
// it, which reliably takes ~18s (measured 17.7-19.1s against the live API). The
// create timeout must therefore be well above that; status GETs are fast.
const CALL_CREATE_TIMEOUT_MS = 45_000;
const CALL_STATUS_TIMEOUT_MS = 15_000;

// CALL-E outbound destinations, from the official supported-regions table
// (docs.heycall-e.com/regions, snapshot 2026-09-12). Mainland China (+86) is NOT
// supported. Keys are international calling codes, values are routing regions.
// +1 is the NANP shared code (US/CA); US has a Local line, so it is the default.
const SUPPORTED_CALLING_CODE_REGIONS = {
  1: "US", 65: "SG", 60: "MY", 91: "IN", 971: "AE", 61: "AU", 44: "GB",
  84: "VN", 49: "DE", 81: "JP", 33: "FR", 52: "MX", 55: "BR", 62: "ID",
  63: "PH", 254: "KE", 31: "NL", 48: "PL", 880: "BD", 234: "NG", 968: "OM",
  66: "TH", 264: "NA", 237: "CM", 258: "MZ", 966: "SA", 358: "FI", 380: "UA",
  94: "LK", 267: "BW", 92: "PK", 90: "TR", 504: "HN", 34: "ES", 886: "TW",
  27: "ZA", 20: "EG", 233: "GH", 972: "IL", 353: "IE", 216: "TN",
};

// The call task prompt is written in English, and every supported destination
// accepts English, so en-US is the safe conversation locale for all regions.
const DEFAULT_CALL_LOCALE = "en-US";

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
  return value.replace(/[\s\-().]/g, "").trim();
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

// Extract the international calling code (1-3 digits) from a normalized E.164 number.
function extractCallingCode(cleanPhone) {
  const digits = cleanPhone.replace(/^\+/, "");
  // Longest-match first so three-digit codes (e.g. 971) win over prefixes.
  for (const len of [3, 2, 1]) {
    const candidate = digits.slice(0, len);
    if (candidate in SUPPORTED_CALLING_CODE_REGIONS) {
      return candidate;
    }
  }
  return null;
}

// Resolve routing for a normalized E.164 phone. Returns whether CALL-E supports
// the destination and the region/locale hints to send. Mainland China (+86) and
// any other unsupported code returns supported:false so the caller can fail fast
// with a clear message instead of waiting ~19s for the upstream rejection.
function resolveCallRouting(cleanPhone) {
  const code = extractCallingCode(cleanPhone);
  if (!code) {
    return {
      supported: false,
      region: null,
      locale: DEFAULT_CALL_LOCALE,
      code: "unsupported_region",
    };
  }
  return {
    supported: true,
    region: SUPPORTED_CALLING_CODE_REGIONS[code],
    locale: DEFAULT_CALL_LOCALE,
    callingCode: code,
  };
}

// True only for destinations CALL-E currently supports.
function isSupportedCallDestination(cleanPhone) {
  return resolveCallRouting(cleanPhone).supported;
}

// Map a non-2xx CALL-E create-call error envelope to an HTTP status and a
// user-facing message, so specific causes (region, balance, concurrency, ...)
// are surfaced instead of being collapsed into a generic 502.
function mapCalleCreateError(status, data) {
  const code = data?.error?.code || "";
  const upstreamMessage = data?.error?.message || "";
  switch (code) {
    case "unsupported_region":
    case "unsupported_language":
      return { httpStatus: 400, code, error: "CALL-E cannot place calls to this country or region yet. Please use a supported destination number (for example US +1, Singapore +65, Malaysia +60)." };
    case "invalid_phone":
    case "invalid_recipient":
    case "no_recipients":
    case "result_schema_invalid":
    case "recipient_result_schema_invalid":
    case "call_not_ready":
      return { httpStatus: 400, code, error: "The call request could not be accepted: " + (upstreamMessage || "please check the number and task details.") };
    case "recipient_blocked":
    case "policy_violation":
      return { httpStatus: 403, code, error: "This number cannot be called by the voice service." };
    case "insufficient_balance":
      return { httpStatus: 402, code, error: "The voice-call account is out of calling balance. Please top it up and try again." };
    case "account_concurrency_exceeded":
    case "rate_limit_exceeded":
      return { httpStatus: 429, code, error: "Another call is still in progress (or the rate limit was reached). Please wait a moment and try again." };
    case "idempotency_conflict":
      return { httpStatus: 409, code, error: "A matching call request is already being processed. Please wait rather than submitting again." };
    case "provider_unavailable":
      return { httpStatus: 503, code, error: "The voice-call provider is temporarily unavailable. Please try again shortly." };
    default:
      return { httpStatus: 502, code: code || "upstream_error", error: "The voice check-in call could not be scheduled. Please try again later." };
  }
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
    let responseStarted = false;
    const target = `${url.hostname}${url.port ? `:${url.port}` : ""}`;
    const transportError = (message, cause) => {
      const phase = responseStarted ? "response" : "connection";
      const error = new Error(`CALL-E ${method} ${target} failed during ${phase}: ${message}`);
      error.code = cause?.code || "CALLE_TRANSPORT_ERROR";
      error.cause = cause;
      return error;
    };
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
        responseStarted = true;
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
      reject(transportError(err.message, err));
    });

    req.on("timeout", () => {
      req.destroy();
      if (settled) return;
      settled = true;
      reject(transportError(`timed out after ${timeoutMs}ms`, { code: "CALLE_TIMEOUT" }));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = {
  CALL_CREATE_TIMEOUT_MS,
  CALL_STATUS_TIMEOUT_MS,
  CALL_RESULT_SCHEMA,
  SUPPORTED_CALLING_CODE_REGIONS,
  buildCallTask,
  buildStableIdempotencyKey,
  callCalleApi,
  extractCallingCode,
  isTerminalCallStatus,
  isSupportedCallDestination,
  isValidCallId,
  isValidCallPhone,
  mapCalleCreateError,
  normalizeCallPhone,
  resolveCallRouting,
};