import type { AttentionArea } from "@/lib/cognitiveEngine";

export type QuizAnswerValue = number | AttentionArea[] | string;

export interface QuizQuestion {
  id: number;
  type: "scale" | "choice" | "multi" | "text";
  question: string;
  hint?: string;
  options?: Array<{ label: string; value: number }>;
  areas?: AttentionArea[];
  maxSelect?: number;
  placeholder?: string;
  required?: boolean;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    type: "scale",
    question: "Over the past two weeks, how often have you felt down, low, or hopeless?",
    options: [
      { label: "Rarely", value: 1 },
      { label: "Sometimes", value: 2 },
      { label: "Often", value: 3 },
      { label: "Most days", value: 4 },
      { label: "Nearly every day", value: 5 },
    ],
  },
  {
    id: 2,
    type: "scale",
    question: "Over the past two weeks, how often did little feel interesting or enjoyable?",
    options: [
      { label: "Rarely", value: 1 },
      { label: "Sometimes", value: 2 },
      { label: "Often", value: 3 },
      { label: "Most days", value: 4 },
      { label: "Nearly every day", value: 5 },
    ],
  },
  {
    id: 3,
    type: "choice",
    question: "When something stresses you, do you tend to replay it or take action?",
    options: [
      { label: "Always replay it", value: 1 },
      { label: "Mostly replay it", value: 2 },
      { label: "It's balanced", value: 3 },
      { label: "Mostly take action", value: 4 },
      { label: "Always take action", value: 5 },
    ],
  },
  {
    id: 4,
    type: "scale",
    question: "Do you often set standards for yourself that are hard to reach?",
    options: [
      { label: "Almost never", value: 1 },
      { label: "Rarely", value: 2 },
      { label: "Sometimes", value: 3 },
      { label: "Often", value: 4 },
      { label: "Almost always", value: 5 },
    ],
  },
  {
    id: 5,
    type: "choice",
    question: "With difficult conversations or tasks, do you avoid them or face them?",
    options: [
      { label: "Almost always avoid", value: 1 },
      { label: "Usually avoid", value: 2 },
      { label: "It varies", value: 3 },
      { label: "Usually face them", value: 4 },
      { label: "Almost always face them", value: 5 },
    ],
  },
  {
    id: 6,
    type: "scale",
    question: "How has your sleep been in the last two weeks?",
    options: [
      { label: "Very poor", value: 1 },
      { label: "Poor", value: 2 },
      { label: "Okay", value: 3 },
      { label: "Good", value: 4 },
      { label: "Very good", value: 5 },
    ],
  },
  {
    id: 7,
    type: "multi",
    question: "Which life areas feel most heavy right now?",
    hint: "Pick up to 2",
    maxSelect: 2,
    areas: ["academic", "career", "health", "relationships", "identity", "family"],
  },
  {
    id: 8,
    type: "multi",
    question: "Which of these have helped you recover in the past month?",
    hint: "Pick any that apply",
    maxSelect: 6,
    areas: [],
    options: [
      { label: "Walking or exercise", value: 1 },
      { label: "Journaling", value: 2 },
      { label: "Talking with a friend", value: 3 },
      { label: "Breathing or meditation", value: 4 },
      { label: "Music or art", value: 5 },
      { label: "Rest and sleep", value: 6 },
    ],
  },
  {
    id: 9,
    type: "choice",
    question: "What kind of support feels most helpful to you right now?",
    options: [
      { label: "Being listened to", value: 1 },
      { label: "Gentle guidance", value: 2 },
      { label: "Practical tools", value: 3 },
      { label: "Understanding my patterns", value: 4 },
    ],
  },
  {
    id: 10,
    type: "text",
    question: "What would you most like to feel better about?",
    hint: "Optional — it stays on your device",
    placeholder: "e.g., I want to stop second-guessing myself at work...",
    required: false,
  },
];

export const ATTENTION_AREA_LABELS: Record<AttentionArea, string> = {
  academic: "Studies",
  career: "Work",
  health: "Health",
  relationships: "Relationships",
  identity: "Identity",
  family: "Family",
};
