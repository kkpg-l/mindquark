import { getCrisisFallback, isHighRiskText } from "@/lib/safety";
import { getCaptchaVerification } from "@/lib/tcaptcha";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://kkpg-d2ga363tca9086e3e-1469579803.ap-shanghai.app.tcloudbase.com"
).replace(/\/$/, "");

export type CounselorPersona = "female" | "male";
export type ChatRole = "user" | "assistant";

export interface ChatHistoryMessage {
  role: ChatRole;
  content: string;
}

export interface ChatResponse {
  reply: string;
  cbtTip?: string;
  cbtCategory?: string;
  isCrisis?: boolean;
  time?: string;
}

function createCrisisResponse(value: string): ChatResponse {
  return {
    reply: getCrisisFallback(value),
    cbtTip: "Prioritize immediate human support.",
    cbtCategory: "Crisis Safety",
    isCrisis: true,
  };
}

export async function sendChatMessage(
  message: string,
  history: ChatHistoryMessage[] = [],
  persona: CounselorPersona = "female"
): Promise<ChatResponse> {
  const text = message.trim();
  if (isHighRiskText(text)) return createCrisisResponse(text);

  try {
    const captchaData = await getCaptchaVerification();
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history,
        persona,
        captchaTicket: captchaData?.ticket,
        captchaRandstr: captchaData?.randstr,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn("Chat request fell back to local support copy:", error);
  }

  const fallback = persona === "male"
    ? "I hear you. Whatever you're going through, let's take a slow breath and unpack it together step by step. What part feels most pressing right now?"
    : "I hear you clearly, and I am holding gentle space for you. Take a soft breath. What is feeling heaviest on your heart right now?";

  return {
    reply: fallback,
    cbtTip: "Empathetic CBT Reflection • MindQuark Sanctuary",
    cbtCategory: "Supportive Fallback",
    isCrisis: false,
    time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}

export async function requestCbtReframe(thought: string, distortionType: string): Promise<string> {
  if (isHighRiskText(thought)) return getCrisisFallback(thought);

  try {
    const response = await fetch(`${API_BASE_URL}/api/reframe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thought, distortionType }),
      signal: AbortSignal.timeout(25_000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.reframed) return data.reframed;
    }
  } catch (error) {
    console.warn("Reframe request fell back to local support copy:", error);
  }

  return `💡【CBT Cognitive Reframing】\nOriginal Thought: "${thought}"\nBalanced Perspective: Thoughts are emotional signals, not permanent facts. Give yourself permission to make progress in gentle iterations rather than expecting instant perfection.`;
}

export interface VoiceCallResult {
  call_outcome?: string;
  crisis_signal?: string;
  mood_after_call?: string;
  support_summary?: string;
}

export interface VoiceCallResource {
  label: string;
  url: string;
}

export interface VoiceCallCreateResponse {
  ok: boolean;
  callId?: string;
  status?: string;
  error?: string;
}

export interface VoiceCallStatusResponse {
  ok: boolean;
  callId: string;
  status: string;
  crisis: boolean;
  failureCode?: string | null;
  result?: VoiceCallResult | null;
  resources?: VoiceCallResource[];
  error?: string;
}

const E164_PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;

export function normalizePhone(phone: string): string {
  if (typeof phone !== "string") return "";
  return phone.replace(/[\s\-\(\)\.]/g, "").trim();
}

export function isValidE164Phone(phone: string): boolean {
  const cleaned = normalizePhone(phone);
  return E164_PHONE_PATTERN.test(cleaned);
}

export async function createVoiceCall(
  phone: string,
  consent: boolean
): Promise<VoiceCallCreateResponse> {
  const normalized = normalizePhone(phone);
  if (!consent) {
    return { ok: false, error: "Explicit consent is required before requesting a support call." };
  }
  if (!isValidE164Phone(normalized)) {
    return { ok: false, error: "Please enter a valid phone number in international format, for example +12125550123." };
  }

  try {
    const captchaData = await getCaptchaVerification();
    const response = await fetch(`${API_BASE_URL}/api/call/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: normalized,
        consent: true,
        captchaTicket: captchaData?.ticket,
        captchaRandstr: captchaData?.randstr,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const data = await response.json().catch(() => null);
    if (response.ok && data?.ok) {
      return { ok: true, callId: data.callId, status: data.status };
    }
    return { ok: false, error: data?.error || "The support call could not be scheduled. Please try again later." };
  } catch (error) {
    console.warn("Voice call request failed:", error);
    return { ok: false, error: "The support call could not be scheduled. Please check your connection and try again." };
  }
}

export async function getVoiceCallStatus(callId: string): Promise<VoiceCallStatusResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/call/status/${encodeURIComponent(callId)}`,
      { signal: AbortSignal.timeout(15_000) }
    );

    const data = await response.json().catch(() => null);
    if (response.ok && data?.ok) {
      return {
        ok: true,
        callId: data.callId,
        status: data.status,
        crisis: Boolean(data.crisis),
        failureCode: data.failureCode ?? null,
        result: data.result ?? null,
        resources: data.resources,
      };
    }
    return {
      ok: false,
      callId,
      status: "unknown",
      crisis: false,
      error: data?.error || "Voice call status is temporarily unavailable.",
    };
  } catch (error) {
    console.warn("Voice call status polling failed:", error);
    return { ok: false, callId, status: "unknown", crisis: false, error: "Voice call status is temporarily unavailable." };
  }
}

export async function analyzeDialogue(transcript: string): Promise<string> {
  if (isHighRiskText(transcript)) return getCrisisFallback(transcript);

  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
      signal: AbortSignal.timeout(30_000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.analysis) return data.analysis;
    }
  } catch (error) {
    console.warn("Dialogue analysis fell back to local support copy:", error);
  }

  return "1. 🌡️ **Emotional Climate & Needs**: The dialogue reveals subtle emotional vulnerability and a deep need for validation.\n\n2. 🧩 **Cognitive Distortions**: Potential patterns of all-or-nothing thinking and self-criticism.\n\n3. 💡 **CBT Psychological Audit**: The interaction could benefit from deeper active listening and non-judgmental acceptance before jumping to conclusions.\n\n4. 🌱 **Recommended Action**: Take a grounded pause to validate inner feelings and separate facts from emotional assumptions.";
}
