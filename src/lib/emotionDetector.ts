// Smart Mental Well-Being Emotion & Distress Classifier

export interface DetectedEmotion {
  label: string;
  emoji: string;
  category: "anxiety" | "sadness" | "burnout" | "doubt" | "anger" | "gratitude" | "neutral";
  distressLevel: "Mild" | "Moderate" | "High";
  colorBadge: string;
  suggestedAction: string;
}

const EMOTION_PATTERNS: Array<{
  category: DetectedEmotion["category"];
  label: string;
  emoji: string;
  colorBadge: string;
  keywords: string[];
  suggestedAction: string;
}> = [
  {
    category: "anxiety",
    label: "Anxiety & Panic",
    emoji: "😰",
    colorBadge: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    keywords: [
      "anxious", "anxiety", "panic", "scared", "worried", "worry", "fear", "nervous", "spiraling",
      "overwhelmed", "freaking out", "dread", "tensed", "sweating", "racing thoughts", "heart beating",
      "suffocating", "shaking", "restless", "on edge"
    ],
    suggestedAction: "4-7-8 Breathing Reset",
  },
  {
    category: "burnout",
    label: "Burnout & Exhaustion",
    emoji: "🕯️",
    colorBadge: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
    keywords: [
      "burnout", "burned out", "exhausted", "tired", "drained", "can't sleep", "insomnia", "no energy",
      "heavy", "depleted", "workload", "overworked", "numb", "fatigued", "drowning"
    ],
    suggestedAction: "Somatic Breath & Pause",
  },
  {
    category: "doubt",
    label: "Self-Criticism & Doubt",
    emoji: "🪞",
    colorBadge: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
    keywords: [
      "failure", "not good enough", "imposter", "useless", "stupid", "idiot", "my fault", "hate myself",
      "regret", "mess up", "ruined", "incompetent", "unworthy", "worthless", "disappointed in myself"
    ],
    suggestedAction: "CBT Cognitive Reframe",
  },
  {
    category: "sadness",
    label: "Sadness & Vulnerability",
    emoji: "🌧️",
    colorBadge: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
    keywords: [
      "sad", "crying", "tears", "lonely", "alone", "heartbroken", "hurt", "grief", "depressed",
      "hopeless", "abandoned", "miserable", "sorrow", "empty inside"
    ],
    suggestedAction: "Self-Compassion Hug",
  },
  {
    category: "anger",
    label: "Frustration & Anger",
    emoji: "🔥",
    colorBadge: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400",
    keywords: [
      "angry", "mad", "furious", "pissed", "hate", "unfair", "annoyed", "irritated", "betrayed",
      "fuming", "outraged", "resentful"
    ],
    suggestedAction: "5-4-3-2-1 Grounding",
  },
  {
    category: "gratitude",
    label: "Peace & Gratitude",
    emoji: "🌱",
    colorBadge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    keywords: [
      "calm", "better", "thank", "grateful", "peace", "relieved", "hope", "grounded", "safe",
      "serene", "tranquil", "comforted", "uplifted"
    ],
    suggestedAction: "Log to Mood Radar",
  },
];

export function detectEmotion(text: string): DetectedEmotion {
  const clean = text.toLowerCase();

  for (const pattern of EMOTION_PATTERNS) {
    const matched = pattern.keywords.some((k) => clean.includes(k.toLowerCase()));
    if (matched) {
      // Determine distress level
      const lengthFactor = text.length > 50;
      const isHighIntensity = /(very|really|extremely|dying|can't stand|so much|unbearable|breaking down|desperate)/i.test(clean);

      const distressLevel = isHighIntensity ? "High" : lengthFactor ? "Moderate" : "Mild";

      return {
        label: pattern.label,
        emoji: pattern.emoji,
        category: pattern.category,
        distressLevel,
        colorBadge: pattern.colorBadge,
        suggestedAction: pattern.suggestedAction,
      };
    }
  }

  return {
    label: "Reflective Mind",
    emoji: "🌿",
    category: "neutral",
    distressLevel: "Mild",
    colorBadge: "bg-muted text-muted-foreground border-border/60",
    suggestedAction: "Mindful Exploration",
  };
}
