// Passive signals for cognitive assessment: recent user chat texts and mood check-ins.
// Local-only, capped to protect the localStorage quota.

export interface LoggedChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: string;
}

export interface LoggedMoodEntry {
  mood: string;
  energy: number;
  valence: number;
  note: string;
  at: string;
}

interface ActivityLogData {
  chatMessages: LoggedChatMessage[];
  moodEntries: LoggedMoodEntry[];
}

const ACTIVITY_LOG_KEY = "mindquark_activity_log_v1";
const MAX_CHAT_MESSAGES = 100;
const MAX_MOOD_ENTRIES = 60;
const MAX_CONTENT_LENGTH = 1_200;

function readLog(): ActivityLogData {
  if (typeof window === "undefined") return { chatMessages: [], moodEntries: [] };
  try {
    const raw = localStorage.getItem(ACTIVITY_LOG_KEY);
    if (!raw) return { chatMessages: [], moodEntries: [] };
    const parsed = JSON.parse(raw) as Partial<ActivityLogData>;
    return {
      chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
      moodEntries: Array.isArray(parsed.moodEntries) ? parsed.moodEntries : [],
    };
  } catch {
    return { chatMessages: [], moodEntries: [] };
  }
}

function writeLog(data: ActivityLogData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to persist activity log:", err);
  }
}

export function logChatMessage(role: LoggedChatMessage["role"], content: string): void {
  const text = String(content || "").trim().slice(0, MAX_CONTENT_LENGTH);
  if (!text) return;
  const data = readLog();
  data.chatMessages.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content: text,
    at: new Date().toISOString(),
  });
  data.chatMessages = data.chatMessages.slice(-MAX_CHAT_MESSAGES);
  writeLog(data);
}

export function logMoodEntry(mood: string, energy: number, valence: number, note: string): void {
  const data = readLog();
  data.moodEntries.push({
    mood: String(mood || "").slice(0, 100),
    energy: Number(energy) || 0,
    valence: Number(valence) || 0,
    note: String(note || "").trim().slice(0, 500),
    at: new Date().toISOString(),
  });
  data.moodEntries = data.moodEntries.slice(-MAX_MOOD_ENTRIES);
  writeLog(data);
}

export function getRecentUserTexts(limit = 20): string[] {
  return readLog()
    .chatMessages.filter((m) => m.role === "user")
    .slice(-limit)
    .map((m) => m.content);
}

export function getRecentMoodEntries(limit = 30): LoggedMoodEntry[] {
  return readLog().moodEntries.slice(-limit);
}

export function getAssessmentTexts(limit = 24): string[] {
  const moodNotes = getRecentMoodEntries(6)
    .map((entry) => entry.note)
    .filter(Boolean);
  const chatTexts = getRecentUserTexts(limit);
  return [...moodNotes, ...chatTexts].slice(-limit);
}

export function clearActivityLog(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVITY_LOG_KEY);
  } catch {
    /* noop */
  }
}
