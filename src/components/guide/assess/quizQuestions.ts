import type { AttentionArea } from "@/lib/cognitiveEngine";

export type QuizAnswerValue = number | AttentionArea[] | string;

export interface QuizQuestion {
  id: number;
  type: "scale" | "choice" | "multi" | "text";
  question: string;
  questionZh?: string;
  hint?: string;
  hintZh?: string;
  options?: Array<{ label: string; labelZh?: string; value: number }>;
  areas?: AttentionArea[];
  maxSelect?: number;
  placeholder?: string;
  placeholderZh?: string;
  required?: boolean;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    type: "scale",
    question: "Over the past two weeks, how often have you felt down, low, or hopeless?",
    questionZh: "在过去的两个星期里，你有多经常感到情绪低落、沮丧或绝望？",
    options: [
      { label: "Rarely", labelZh: "很少", value: 1 },
      { label: "Sometimes", labelZh: "有时", value: 2 },
      { label: "Often", labelZh: "经常", value: 3 },
      { label: "Most days", labelZh: "多数日子", value: 4 },
      { label: "Nearly every day", labelZh: "几乎每天", value: 5 },
    ],
  },
  {
    id: 2,
    type: "scale",
    question: "Over the past two weeks, how often did little feel interesting or enjoyable?",
    questionZh: "在过去的两个星期里，你有多经常感到对事物缺乏兴趣或无法体验乐趣？",
    options: [
      { label: "Rarely", labelZh: "很少", value: 1 },
      { label: "Sometimes", labelZh: "有时", value: 2 },
      { label: "Often", labelZh: "经常", value: 3 },
      { label: "Most days", labelZh: "多数日子", value: 4 },
      { label: "Nearly every day", labelZh: "几乎每天", value: 5 },
    ],
  },
  {
    id: 3,
    type: "choice",
    question: "When something stresses you, do you tend to replay it or take action?",
    questionZh: "面对压力时，你更倾向于反复回想还是采取行动？",
    options: [
      { label: "Always replay it", labelZh: "总是在脑海中反复回想", value: 1 },
      { label: "Mostly replay it", labelZh: "大多反复回想", value: 2 },
      { label: "It's balanced", labelZh: "回想与行动兼有", value: 3 },
      { label: "Mostly take action", labelZh: "大多采取行动", value: 4 },
      { label: "Always take action", labelZh: "总是立即采取行动", value: 5 },
    ],
  },
  {
    id: 4,
    type: "scale",
    question: "Do you often set standards for yourself that are hard to reach?",
    questionZh: "你是否经常为自己设定难以企及的高标准？",
    options: [
      { label: "Almost never", labelZh: "几乎从不", value: 1 },
      { label: "Rarely", labelZh: "很少", value: 2 },
      { label: "Sometimes", labelZh: "有时", value: 3 },
      { label: "Often", labelZh: "经常", value: 4 },
      { label: "Almost always", labelZh: "几乎总是", value: 5 },
    ],
  },
  {
    id: 5,
    type: "choice",
    question: "With difficult conversations or tasks, do you avoid them or face them?",
    questionZh: "面对艰难的对话或棘手的任务，你通常会回避还是直面？",
    options: [
      { label: "Almost always avoid", labelZh: "几乎总是回避", value: 1 },
      { label: "Usually avoid", labelZh: "通常回避", value: 2 },
      { label: "It varies", labelZh: "视情况而定", value: 3 },
      { label: "Usually face them", labelZh: "通常直面", value: 4 },
      { label: "Almost always face them", labelZh: "几乎总是直面", value: 5 },
    ],
  },
  {
    id: 6,
    type: "scale",
    question: "How has your sleep been in the last two weeks?",
    questionZh: "在过去的两个星期里，你的睡眠质量如何？",
    options: [
      { label: "Very poor", labelZh: "非常差", value: 1 },
      { label: "Poor", labelZh: "较差", value: 2 },
      { label: "Okay", labelZh: "一般", value: 3 },
      { label: "Good", labelZh: "较好", value: 4 },
      { label: "Very good", labelZh: "非常好", value: 5 },
    ],
  },
  {
    id: 7,
    type: "multi",
    question: "Which life areas feel most heavy right now?",
    questionZh: "当下哪个生活领域让你感到最为沉重？",
    hint: "Pick up to 2",
    hintZh: "最多选择 2 项",
    maxSelect: 2,
    areas: ["academic", "career", "health", "relationships", "identity", "family"],
  },
  {
    id: 8,
    type: "multi",
    question: "Which of these have helped you recover in the past month?",
    questionZh: "在过去一个月里，哪些方式曾帮助你恢复身心能量？",
    hint: "Pick any that apply",
    hintZh: "可多选",
    maxSelect: 6,
    areas: [],
    options: [
      { label: "Walking or exercise", labelZh: "散步或运动", value: 1 },
      { label: "Journaling", labelZh: "写日记或倾诉记录", value: 2 },
      { label: "Talking with a friend", labelZh: "与朋友倾诉", value: 3 },
      { label: "Breathing or meditation", labelZh: "深呼吸或正念练习", value: 4 },
      { label: "Music or art", labelZh: "音乐或艺术活动", value: 5 },
      { label: "Rest and sleep", labelZh: "充分休息与睡眠", value: 6 },
    ],
  },
  {
    id: 9,
    type: "choice",
    question: "What kind of support feels most helpful to you right now?",
    questionZh: "此刻你觉得哪种支持对你最有帮助？",
    options: [
      { label: "Being listened to", labelZh: "被耐心倾听与接纳", value: 1 },
      { label: "Gentle guidance", labelZh: "温和的陪伴与引导", value: 2 },
      { label: "Practical tools", labelZh: "切实可行的小工具与方法", value: 3 },
      { label: "Understanding my patterns", labelZh: "理清自己的思维模式", value: 4 },
    ],
  },
  {
    id: 10,
    type: "text",
    question: "What would you most like to feel better about?",
    questionZh: "你最希望自己在哪些方面感到轻松或有所改善？",
    hint: "Optional — it stays on your device",
    hintZh: "选填 — 仅保存在你的本地设备",
    placeholder: "e.g., I want to stop second-guessing myself at work...",
    placeholderZh: "例如：我希望在工作中不再总是怀疑自己、减少思虑内耗……",
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

export const ATTENTION_AREA_LABELS_ZH: Record<AttentionArea, string> = {
  academic: "学业",
  career: "工作",
  health: "身心健康",
  relationships: "人际交往",
  identity: "自我认同",
  family: "家庭",
};
