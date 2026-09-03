// Compact bilingual emotion catalog for the reframe wizard.
// 6 families aligned with the existing Mood Tracker labels; emerald-tinted per family.

export type EmotionFamilyId = "joy" | "calm" | "sadness" | "anxiety" | "anger" | "fatigue";

export interface GuideEmotion {
  id: string;
  label: string;
  labelZh: string;
  family: EmotionFamilyId;
  colorClass: string;
}

export interface EmotionFamily {
  id: EmotionFamilyId;
  label: string;
  emoji: string;
  colorClass: string;
}

export const EMOTION_FAMILIES: EmotionFamily[] = [
  { id: "sadness", label: "Sadness", emoji: "😔", colorClass: "bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400" },
  { id: "anxiety", label: "Anxiety", emoji: "😰", colorClass: "bg-purple-500/10 text-purple-600 border-purple-500/25 dark:text-purple-400" },
  { id: "anger", label: "Anger", emoji: "😡", colorClass: "bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400" },
  { id: "fatigue", label: "Fatigue", emoji: "😴", colorClass: "bg-stone-500/10 text-stone-600 border-stone-500/25 dark:text-stone-400" },
  { id: "calm", label: "Calm", emoji: "🌿", colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400" },
  { id: "joy", label: "Joy", emoji: "😊", colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400" },
];

export const EMOTIONS: GuideEmotion[] = [
  { id: "low", label: "Low", labelZh: "低落", family: "sadness", colorClass: "bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400" },
  { id: "lonely", label: "Lonely", labelZh: "孤独", family: "sadness", colorClass: "bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400" },
  { id: "heartbroken", label: "Heartbroken", labelZh: "伤心", family: "sadness", colorClass: "bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400" },
  { id: "empty", label: "Empty", labelZh: "空虚", family: "sadness", colorClass: "bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400" },
  { id: "anxious", label: "Anxious", labelZh: "焦虑", family: "anxiety", colorClass: "bg-purple-500/10 text-purple-600 border-purple-500/25 dark:text-purple-400" },
  { id: "fearful", label: "Fearful", labelZh: "害怕", family: "anxiety", colorClass: "bg-purple-500/10 text-purple-600 border-purple-500/25 dark:text-purple-400" },
  { id: "overwhelmed", label: "Overwhelmed", labelZh: "不堪重负", family: "anxiety", colorClass: "bg-purple-500/10 text-purple-600 border-purple-500/25 dark:text-purple-400" },
  { id: "restless", label: "Restless", labelZh: "不安", family: "anxiety", colorClass: "bg-purple-500/10 text-purple-600 border-purple-500/25 dark:text-purple-400" },
  { id: "frustrated", label: "Frustrated", labelZh: "沮丧", family: "anger", colorClass: "bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400" },
  { id: "irritated", label: "Irritated", labelZh: "烦躁", family: "anger", colorClass: "bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400" },
  { id: "resentful", label: "Resentful", labelZh: "怨恨", family: "anger", colorClass: "bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400" },
  { id: "betrayed", label: "Betrayed", labelZh: "被背叛", family: "anger", colorClass: "bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400" },
  { id: "drained", label: "Drained", labelZh: "疲惫", family: "fatigue", colorClass: "bg-stone-500/10 text-stone-600 border-stone-500/25 dark:text-stone-400" },
  { id: "numb", label: "Numb", labelZh: "麻木", family: "fatigue", colorClass: "bg-stone-500/10 text-stone-600 border-stone-500/25 dark:text-stone-400" },
  { id: "burnt-out", label: "Burnt out", labelZh: "倦怠", family: "fatigue", colorClass: "bg-stone-500/10 text-stone-600 border-stone-500/25 dark:text-stone-400" },
  { id: "depleted", label: "Depleted", labelZh: "耗竭", family: "fatigue", colorClass: "bg-stone-500/10 text-stone-600 border-stone-500/25 dark:text-stone-400" },
  { id: "centered", label: "Centered", labelZh: "安定", family: "calm", colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400" },
  { id: "serene", label: "Serene", labelZh: "宁静", family: "calm", colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400" },
  { id: "content", label: "Content", labelZh: "满足", family: "calm", colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400" },
  { id: "safe", label: "Safe", labelZh: "安全", family: "calm", colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400" },
  { id: "joyful", label: "Joyful", labelZh: "喜悦", family: "joy", colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400" },
  { id: "grateful", label: "Grateful", labelZh: "感恩", family: "joy", colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400" },
  { id: "hopeful", label: "Hopeful", labelZh: "有希望", family: "joy", colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400" },
  { id: "proud", label: "Proud", labelZh: "自豪", family: "joy", colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400" },
];

export function getEmotionsByFamily(family: EmotionFamilyId): GuideEmotion[] {
  return EMOTIONS.filter((emotion) => emotion.family === family);
}

export function getEmotionById(id: string | undefined): GuideEmotion | undefined {
  if (!id) return undefined;
  return EMOTIONS.find((emotion) => emotion.id === id);
}
