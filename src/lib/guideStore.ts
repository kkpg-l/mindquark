// Local-first persistence for the guided counseling modules.
// Follows the profileStore pattern with an isolated namespace.

import type { AttentionMap, CognitiveSnapshot, StateScores, TraitScores } from "@/lib/cognitiveEngine";

export interface ReframeSession {
  situation: string;
  automaticThought: string;
  selectedEmotionId?: string;
  emotionIntensity: number;
  energyLevel?: number;
  valenceLevel?: number;
  identifiedDistortion?: { type: string; explanation: string };
  confirmedDistortion?: string;
  evidenceFor: string;
  evidenceAgainst: string;
  reframedThought: string;
  actionableStep?: string;
  completedAt?: string;
  archived: boolean;
}

const REFRAME_DRAFT_KEY = "mindquark_reframe_draft_v1";
const SNAPSHOTS_KEY = "mindquark_cognitive_snapshots_v1";
const MAX_SNAPSHOTS = 30;

export function createEmptyReframeSession(): ReframeSession {
  return {
    situation: "",
    automaticThought: "",
    emotionIntensity: 5,
    evidenceFor: "",
    evidenceAgainst: "",
    reframedThought: "",
    archived: false,
  };
}

export function saveReframeDraft(session: ReframeSession): void {
  if (typeof window === "undefined") return;
  if (!session.situation.trim() && !session.automaticThought.trim()) return;
  try {
    localStorage.setItem(REFRAME_DRAFT_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn("Failed to save reframe draft:", err);
  }
}

export function loadReframeDraft(): ReframeSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REFRAME_DRAFT_KEY);
    if (!raw) return null;
    return { ...createEmptyReframeSession(), ...JSON.parse(raw) } as ReframeSession;
  } catch {
    return null;
  }
}

export function clearReframeDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(REFRAME_DRAFT_KEY);
  } catch {
    /* noop */
  }
}

export interface SnapshotInput {
  traits: TraitScores;
  states: StateScores;
  attention: AttentionMap;
  source: CognitiveSnapshot["source"];
}

export function saveCognitiveSnapshot(input: SnapshotInput): CognitiveSnapshot {
  const snapshot: CognitiveSnapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...input,
  };

  if (typeof window === "undefined") return snapshot;
  try {
    const existing = getCognitiveSnapshots();
    const next = [snapshot, ...existing].slice(0, MAX_SNAPSHOTS);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn("Failed to save cognitive snapshot:", err);
  }
  return snapshot;
}

export function getCognitiveSnapshots(): CognitiveSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
