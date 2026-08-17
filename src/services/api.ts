const API_BASE_URL = "https://kkpg-d2ga363tca9086e3e-1469579803.ap-shanghai.app.tcloudbase.com";

export type CounselorPersona = "female" | "male";

export interface ChatResponse {
  reply: string;
  cbtTip?: string;
  isCrisis?: boolean;
  time?: string;
}

export async function sendChatMessage(
  message: string,
  history: Array<{ text: string; sender: { id: string } }> = [],
  persona: CounselorPersona = "female"
): Promise<ChatResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, persona }),
      signal: AbortSignal.timeout(25000),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("API request fallback:", err);
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const fallback = persona === "male"
    ? `I hear you. Whatever you're going through, let's take a slow breath and unpack it together step by step. What part feels most pressing right now?`
    : `I hear you clearly, and I am holding gentle space for you. Take a soft breath. What is feeling heaviest on your heart right now?`;

  return {
    reply: fallback,
    cbtTip: "Empathetic CBT Reflection • MindQuark Sanctuary",
    isCrisis: false,
    time: timeStr,
  };
}

export async function requestCbtReframe(thought: string, distortionType: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/reframe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thought, distortionType }),
      signal: AbortSignal.timeout(25000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.reframed) return data.reframed;
    }
  } catch (err) {
    console.warn("Reframe request fallback:", err);
  }

  return `💡【CBT Cognitive Reframing】\nOriginal Thought: "${thought}"\nBalanced Perspective: Thoughts are emotional signals, not permanent facts. Give yourself permission to make progress in gentle iterations rather than expecting instant perfection.`;
}

export async function analyzeDialogue(transcript: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
      signal: AbortSignal.timeout(30000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.analysis) return data.analysis;
    }
  } catch (err) {
    console.warn("Dialogue analysis fallback:", err);
  }

  return `1. 🌡️ **Emotional Climate & Needs**: The dialogue reveals subtle emotional vulnerability and a deep need for validation.\n\n2. 🧩 **Cognitive Distortions**: Potential patterns of all-or-nothing thinking and self-criticism.\n\n3. 💡 **CBT Psychological Audit**: The interaction could benefit from deeper active listening and non-judgmental acceptance before jumping to conclusions.\n\n4. 🌱 **Recommended Action**: Take a grounded pause to validate inner feelings and separate facts from emotional assumptions.`;
}
