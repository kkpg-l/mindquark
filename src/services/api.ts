import { getCrisisFallback, isHighRiskText } from "@/lib/safety";

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
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history, persona }),
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
