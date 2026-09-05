import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Wind,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Heart,
  Eye,
  Hand,
  Ear,
  Smile,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Activity,
  Waves,
  Check,
  Flame,
  Triangle,
  Zap,
  Feather,
  Info,
  Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SparklesText } from "@/components/ui/sparkles-text";
import { chimeAudio } from "@/lib/chimeAudio";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

export type BreathingTechnique =
  | "4-7-8"
  | "box"
  | "coherent"
  | "triangle"
  | "sigh"
  | "energy"
  | "54321";

export type BreathingPhase =
  | "prepare"
  | "inhale"
  | "inhaleExtra"
  | "hold"
  | "exhale"
  | "holdPost";

interface PhaseConfig {
  phase: BreathingPhase;
  duration: number; // in seconds
  title: string;
  guide: string;
  sound: "inhale" | "hold" | "exhale";
  colorClass: string;
  glowColor: string;
}

interface TechniqueConfig {
  id: BreathingTechnique;
  name: string;
  badge: string;
  timingBadge: string;
  desc: string;
  mechanism: string;
  benefits: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  phases: PhaseConfig[];
}

// Harmonious White & Green Botanical Palette across all techniques (Bilingual support)
function getTechniques(lang: "en" | "zh"): TechniqueConfig[] {
  const isZh = lang === "zh";
  return [
    {
      id: "4-7-8",
      name: isZh ? "4-7-8 迷走神经放松法" : "4-7-8 Vagus Nerve Reset",
      badge: isZh ? "助眠与深度宁静" : "Sleep & Deep Calm",
      timingBadge: isZh ? "吸气 4秒 · 屏息 7秒 · 呼气 8秒" : "4s In · 7s Hold · 8s Out",
      desc: isZh
        ? "由安德鲁·韦尔博士开创的自然镇静法。通过延长呼气深度调节副交感神经，降低静息心率，化解睡前反刍与失眠。"
        : "Dr. Andrew Weil's natural tranquilizer to down-regulate the nervous system, lower resting heart rate, and dissolve bedtime insomnia.",
      mechanism: isZh
        ? "延长呼气时长强烈刺激迷走神经释放乙酰胆碱，对过度活跃的心率发挥强效减速刹车，迅速平息奔腾杂乱的念头。"
        : "Extended exhales trigger vagal tone to release acetylcholine, rapidly braking cardiac acceleration and halting racing thoughts.",
      benefits: isZh
        ? "化解失眠困扰 · 平复心慌心悸 · 晚间身心重置"
        : "Dissolves insomnia · Calms heart palpitations · Nighttime reset",
      icon: Sparkles,
      phases: [
        {
          phase: "inhale",
          duration: 4,
          title: isZh ? "深长吸气 (4秒)" : "Inhale (4s)",
          guide: isZh ? "闭上嘴唇，用鼻子深长平稳地吸气，感受腹部柔和隆起。" : "Inhale quietly through your nose deep into your belly.",
          sound: "inhale",
          colorClass: "from-emerald-400 via-emerald-500 to-teal-600",
          glowColor: "rgba(16, 185, 129, 0.45)",
        },
        {
          phase: "hold",
          duration: 7,
          title: isZh ? "充盈屏息 (7秒)" : "Hold Full (7s)",
          guide: isZh ? "在静谧中保持充盈，感受双肩自然下沉，体会当下的安定。" : "Retain the fullness in quiet stillness, feeling your shoulders drop.",
          sound: "hold",
          colorClass: "from-teal-400 via-emerald-500 to-teal-600",
          glowColor: "rgba(20, 184, 166, 0.45)",
        },
        {
          phase: "exhale",
          duration: 8,
          title: isZh ? "绵长呼气 (8秒)" : "Exhale Completely (8s)",
          guide: isZh ? "微张双唇，像轻柔叹息一样把所有气体缓缓吐尽，释放所有紧绷。" : "Release all air through your mouth with a gentle, continuous sigh.",
          sound: "exhale",
          colorClass: "from-emerald-500 via-teal-600 to-emerald-700",
          glowColor: "rgba(16, 185, 129, 0.35)",
        },
      ],
    },
    {
      id: "box",
      name: isZh ? "箱式呼吸法 4-4-4-4" : "Box Breathing 4-4-4-4",
      badge: isZh ? "战术专注与高压冷静" : "Focus & Tactical Calm",
      timingBadge: isZh ? "吸气 4秒 · 屏息 4秒 · 呼气 4秒 · 停顿 4秒" : "4s In · 4s Hold · 4s Out · 4s Rest",
      desc: isZh
        ? "海豹突击队战术减压法则。迅速扫清急性脑雾，中和“战或逃”惊恐反射，迅速恢复沉着决断力。"
        : "Navy SEALs tactical protocol to clear acute brain fog, neutralize the fight-or-flight panic reflex, and regain situational composure.",
      mechanism: isZh
        ? "等时四相呼吸能重置自主神经稳态平衡，在 2 分钟内平息杏仁核发出的警报信号。"
        : "Equalized 4-phase respiration re-balances the autonomic nervous system, quieting amygdala alarm signals within 2 minutes.",
      benefits: isZh
        ? "高压从容应对 · 清除思维脑雾 · 快速控制惊恐"
        : "High-pressure composure · Clears brain fog · Rapid panic control",
      icon: Activity,
      phases: [
        {
          phase: "inhale",
          duration: 4,
          title: isZh ? "平稳吸气 (4秒)" : "Inhale (4s)",
          guide: isZh ? "均匀平稳地吸气，感受胸廓与肋骨向外柔和扩展。" : "Inhale smoothly and steadily as your ribcage expands outward.",
          sound: "inhale",
          colorClass: "from-emerald-400 via-emerald-500 to-teal-600",
          glowColor: "rgba(16, 185, 129, 0.45)",
        },
        {
          phase: "hold",
          duration: 4,
          title: isZh ? "充盈屏息 (4秒)" : "Hold Full (4s)",
          guide: isZh ? "放松喉咙，保持肺部充盈，体会内心的平稳从容。" : "Hold without closing your throat; maintain open ease.",
          sound: "hold",
          colorClass: "from-teal-400 via-emerald-500 to-teal-600",
          glowColor: "rgba(20, 184, 166, 0.45)",
        },
        {
          phase: "exhale",
          duration: 4,
          title: isZh ? "缓慢呼气 (4秒)" : "Exhale (4s)",
          guide: isZh ? "平缓有节奏地呼出空气，释放胸口的一切压力。" : "Release air smoothly and evenly through nose or mouth.",
          sound: "exhale",
          colorClass: "from-emerald-500 via-teal-600 to-emerald-700",
          glowColor: "rgba(16, 185, 129, 0.35)",
        },
        {
          phase: "holdPost",
          duration: 4,
          title: isZh ? "停顿休息 (4秒)" : "Hold Empty (4s)",
          guide: isZh ? "在呼气结束后的空旷宁静中停留，感受安详。" : "Rest in the quiet stillness at the bottom of the breath.",
          sound: "hold",
          colorClass: "from-emerald-600 via-teal-600 to-emerald-700",
          glowColor: "rgba(16, 185, 129, 0.3)",
        },
      ],
    },
    {
      id: "coherent",
      name: isZh ? "心脑同频呼吸 5.5秒" : "Coherent HRV Resonance",
      badge: isZh ? "心脑协同与共振" : "Heart-Brain Coherence",
      timingBadge: isZh ? "吸气 5.5秒 · 呼气 5.5秒" : "5.5s Inhale · 5.5s Exhale",
      desc: isZh
        ? "神经心脏学实证的最佳共振节律（约每分钟 5.5 次呼吸）。极大提升心率变异性 (HRV)，维持日间心流状态。"
        : "Neuro-cardiology resonance rhythm (approx. 5.5 breaths/min) that maximizes Heart Rate Variability (HRV) and sustains daytime flow state.",
      mechanism: isZh
        ? "使心血管与呼吸节律产生生物物理共振，促发大脑 α 波，带来深沉的情绪平衡。"
        : "Resonates cardiovascular and pulmonary rhythms to stimulate alpha brainwaves, inducing profound emotional equilibrium.",
      benefits: isZh
        ? "白天心流聚焦 · 情绪稳定中和 · 降低压力皮质醇"
        : "Daytime flow state · Emotional stabilization · Cortisol reduction",
      icon: Waves,
      phases: [
        {
          phase: "inhale",
          duration: 5.5,
          title: isZh ? "平顺吸气 (5.5秒)" : "Inhale Coherently (5.5s)",
          guide: isZh ? "如同一波温润潮汐缓缓涌起，舒展胸口与心区。" : "A smooth, uninterrupted wave of breath expanding the heart space.",
          sound: "inhale",
          colorClass: "from-emerald-400 via-emerald-500 to-teal-600",
          glowColor: "rgba(16, 185, 129, 0.45)",
        },
        {
          phase: "exhale",
          duration: 5.5,
          title: isZh ? "柔和呼气 (5.5秒)" : "Exhale Coherently (5.5s)",
          guide: isZh ? "潮汐缓缓退去，整个人沉入轻盈宁静的放松中。" : "Gentle receding tide of breath, sinking into peaceful lightness.",
          sound: "exhale",
          colorClass: "from-emerald-500 via-teal-600 to-emerald-700",
          glowColor: "rgba(16, 185, 129, 0.35)",
        },
      ],
    },
    {
      id: "triangle",
      name: isZh ? "三角平衡呼吸 4-4-4" : "Triangle Breathing 4-4-4",
      badge: isZh ? "调和身心与专注" : "Balance & Harmony",
      timingBadge: isZh ? "吸气 4秒 · 屏息 4秒 · 呼气 4秒" : "4s In · 4s Hold · 4s Out",
      desc: isZh
        ? "源自经典调息法的等边对称练习。温和集中注意力，平衡左右脑，帮助进入静心状态。"
        : "Classical Pranayama 3-phase symmetrical practice to gently center the mind, balance left-right hemispheres, and prepare for mindfulness.",
      mechanism: isZh
        ? "构建等边三角形的平稳节律，释放日间肌肉张力，让基础呼吸重归平静。"
        : "Constructs an equilateral physiological rhythm, releasing everyday tension and stabilizing baseline respiration.",
      benefits: isZh
        ? "日常温和减压 · 冥想前热身 · 自主神经调和"
        : "Gentle daily de-stress · Meditation preparation · Autonomic harmony",
      icon: Triangle,
      phases: [
        {
          phase: "inhale",
          duration: 4,
          title: isZh ? "吸气 (4秒)" : "Inhale (4s)",
          guide: isZh ? "沿着三角形第一条边吸入清新空气与生机。" : "Draw fresh energy along the first side of the triangle.",
          sound: "inhale",
          colorClass: "from-emerald-400 via-emerald-500 to-teal-600",
          glowColor: "rgba(16, 185, 129, 0.45)",
        },
        {
          phase: "hold",
          duration: 4,
          title: isZh ? "屏息 (4秒)" : "Hold (4s)",
          guide: isZh ? "沿着第二条边安静屏息，感受内心的稳固与从容。" : "Hold calmly along the second side, sensing stability.",
          sound: "hold",
          colorClass: "from-teal-400 via-emerald-500 to-teal-600",
          glowColor: "rgba(20, 184, 166, 0.45)",
        },
        {
          phase: "exhale",
          duration: 4,
          title: isZh ? "呼气 (4秒)" : "Exhale (4s)",
          guide: isZh ? "沿着第三条边舒畅呼出，让疲惫随气息沉降释放。" : "Release fatigue along the third side, feeling grounded.",
          sound: "exhale",
          colorClass: "from-emerald-500 via-teal-600 to-emerald-700",
          glowColor: "rgba(16, 185, 129, 0.35)",
        },
      ],
    },
    {
      id: "sigh",
      name: isZh ? "生理性叹息呼吸" : "Physiological Sigh",
      badge: isZh ? "斯坦福极速减压" : "Stanford Fast De-Stress",
      timingBadge: isZh ? "深吸 2.5秒 + 补吸 1秒 · 呼气 6秒" : "2.5s In + 1s Top-Up · 6s Out",
      desc: isZh
        ? "斯坦福大学胡伯曼实验室科学验证：两次吸气重新撑开微小肺泡，紧接绵长叹息，60秒内快速切断急性压力。"
        : "Stanford Huberman Lab method: double inhale pops open collapsed alveoli, followed by a long sigh to eliminate acute stress in under 60 seconds.",
      mechanism: isZh
        ? "第二次补吸撑开闭合的肺泡气囊；随后的超长叹息最大程度排出二氧化碳，迅速给交感神经踩刹车。"
        : "The second quick inhale inflates collapsed air sacs (alveoli); the long sigh offloads maximum CO₂ to rapidly brake autonomic arousal.",
      benefits: isZh
        ? "遏制惊恐焦虑 · 紧急情绪减压 · 瞬间卸下身体紧绷"
        : "Rapid panic shutdown · Emergency stress relief · Instant physical release",
      icon: Feather,
      phases: [
        {
          phase: "inhale",
          duration: 2.5,
          title: isZh ? "首次深吸气 (2.5秒)" : "First Inhale (2.5s)",
          guide: isZh ? "用鼻子充分深吸气，填满大部分肺部容积。" : "Deep nasal inhale filling the majority of your lung volume.",
          sound: "inhale",
          colorClass: "from-emerald-400 via-emerald-500 to-teal-600",
          glowColor: "rgba(16, 185, 129, 0.45)",
        },
        {
          phase: "inhaleExtra",
          duration: 1,
          title: isZh ? "快速补吸一口 (1秒)" : "Quick Top-Up Inhale (1s)",
          guide: isZh ? "不要呼气！紧接着短促再吸一小口，彻底撑开闭合的微小肺泡！" : "Sharply top off with a second quick sip of air to pop open alveoli!",
          sound: "inhale",
          colorClass: "from-emerald-300 via-teal-400 to-emerald-500",
          glowColor: "rgba(52, 211, 153, 0.55)",
        },
        {
          phase: "exhale",
          duration: 6,
          title: isZh ? "绵长叹息呼气 (6秒)" : "Long Sigh Exhale (6s)",
          guide: isZh ? "微张双唇，像叹气一样把所有气体完全吐尽，全身肌肉彻底松弛。" : "Gently sigh all the air out through your mouth, dropping every muscle.",
          sound: "exhale",
          colorClass: "from-emerald-500 via-teal-600 to-emerald-700",
          glowColor: "rgba(16, 185, 129, 0.35)",
        },
      ],
    },
    {
      id: "energy",
      name: isZh ? "身心唤醒呼吸 4-2-4" : "Awake & Energize 4-2-4",
      badge: isZh ? "清晨活力与提神" : "Morning Clarity & Wake Up",
      timingBadge: isZh ? "吸气 4秒 · 屏息 2秒 · 呼气 4秒" : "4s In · 2s Hold · 4s Out",
      desc: isZh
        ? "轻快有力的充氧节律，增加血氧饱和度，扫清午后困倦与脑雾，自然恢复清醒专注。"
        : "Brisk energizing rhythm to boost oxygenation, shake off afternoon brain fog, and restore vibrant mental clarity naturally without caffeine.",
      mechanism: isZh
        ? "加快循环与血氧供给，温和激活中枢神经系统，带来纯天然清爽活力。"
        : "Accelerates metabolic circulation and blood oxygen saturation to stimulate the central nervous system with zero crash.",
      benefits: isZh
        ? "清晨大脑唤醒 · 击退午后困顿 · 纯自然专注"
        : "Morning brain wake-up · Beat afternoon slump · Clean natural focus",
      icon: Zap,
      phases: [
        {
          phase: "inhale",
          duration: 4,
          title: isZh ? "吸气充氧 (4秒)" : "Inhale Fresh Energy (4s)",
          guide: isZh ? "深长有力地吸气，将充足氧气输送至全身细胞。" : "Inhale deeply and briskly, drawing vibrant energy into your cells.",
          sound: "inhale",
          colorClass: "from-emerald-400 via-emerald-500 to-teal-500",
          glowColor: "rgba(16, 185, 129, 0.45)",
        },
        {
          phase: "hold",
          duration: 2,
          title: isZh ? "短暂停顿 (2秒)" : "Brief Hold (2s)",
          guide: isZh ? "短暂停留 2 秒，感受充盈的氧气在身体各个角落流淌。" : "Brief 2-second pause as oxygen distributes through your body.",
          sound: "hold",
          colorClass: "from-teal-400 via-emerald-400 to-teal-500",
          glowColor: "rgba(20, 184, 166, 0.45)",
        },
        {
          phase: "exhale",
          duration: 4,
          title: isZh ? "有力呼气 (4秒)" : "Exhale Clear (4s)",
          guide: isZh ? "平稳有力地将废气呼出，保持精神焕发与神清气爽。" : "Release smoothly through your nose or mouth, staying alert and clear.",
          sound: "exhale",
          colorClass: "from-emerald-500 via-teal-600 to-emerald-700",
          glowColor: "rgba(16, 185, 129, 0.35)",
        },
      ],
    },
  ];
}

// Unified Green & White styling for 5-4-3-2-1 Sensory Grounding (Bilingual support)
function getGroundingSteps(lang: "en" | "zh") {
  const isZh = lang === "zh";
  return [
    {
      count: 5,
      icon: Eye,
      sense: isZh ? "视觉 (看)" : "Sight",
      instruction: isZh
        ? "环顾四周。寻找并辨认 5 件你视线范围内清晰可见的物品（如：墙上的光影、绿植叶片、水杯、窗外的景象）。"
        : "Look around you. Notice and identify 5 distinct objects in your immediate vision (e.g., light on a wall, a plant, a coffee mug, window reflection).",
      items: isZh
        ? ["看清第 1 件物品", "看清第 2 件物品", "看清第 3 件物品", "看清第 4 件物品", "看清第 5 件物品"]
        : ["Object 1 in sight", "Object 2 in sight", "Object 3 in sight", "Object 4 in sight", "Object 5 in sight"],
    },
    {
      count: 4,
      icon: Hand,
      sense: isZh ? "触觉 (触)" : "Touch",
      instruction: isZh
        ? "感受身体与外界接触的 4 种物理触感（如：双脚踩在地面的支撑感、衣物布料的纹理、皮肤上的空气流动、背靠椅背的触感）。"
        : "Notice 4 physical touch sensations (e.g., feet grounding on the floor, texture of clothing, air on your skin, back against your chair).",
      items: isZh
        ? ["脚底触地感", "衣物质感", "空气温度", "椅背支撑感"]
        : ["Feet on floor", "Fabric texture", "Air temperature", "Back against chair"],
    },
    {
      count: 3,
      icon: Ear,
      sense: isZh ? "听觉 (听)" : "Sound",
      instruction: isZh
        ? "静下心来仔细倾听。分辨 3 种周围环境的声音（如：电风扇的嗡嗡声、远处的车流或鸟鸣、自己平稳的呼吸声）。"
        : "Listen closely. Identify 3 external ambient sounds around you (e.g., hum of a fan, distant traffic/birds, your own steady breathing).",
      items: isZh
        ? ["室内微弱环境音", "远处外部声响", "自己呼吸的声音"]
        : ["Room ambient hum", "Distant exterior sound", "Rhythm of breath"],
    },
    {
      count: 2,
      icon: Wind,
      sense: isZh ? "嗅觉 (闻)" : "Smell",
      instruction: isZh
        ? "留意空气中的 2 种气味，或者在脑海中回忆两种让你感到安心的气味（如：雨后泥土芬芳、咖啡香气、薰衣草香、雪松清香）。"
        : "Notice 2 scents in the air, or recall a comforting aroma you love (e.g., fresh rain, morning coffee, lavender, clean cedar).",
      items: isZh
        ? ["空气中的气味", "回忆中安心的香气"]
        : ["Present room scent", "Comforting aroma memory"],
    },
    {
      count: 1,
      icon: Smile,
      sense: isZh ? "味觉与自我确认 (品)" : "Taste & Affirmation",
      instruction: isZh
        ? "留意口中残留的滋味，轻抿一小口温水，并在心中默念确认：“在此时此刻，我是全然安全与被接纳的。”"
        : "Notice 1 lingering taste, take a sip of water, and affirm: 'I am safe and grounded in this present moment.'",
      items: isZh
        ? ["温和抿一口水并默念“我是安全的”"]
        : ["Mindful sip & 'I am safe' affirmation"],
    },
  ];
}

export function BreatheSection({
  onNavigateToChat,
}: {
  onNavigateToChat?: (customMessage?: string) => void;
}) {
  const { language, t } = useLanguage();
  const techniques = useMemo(() => getTechniques(language), [language]);
  const groundingSteps = useMemo(() => getGroundingSteps(language), [language]);

  const [selectedTechnique, setSelectedTechnique] = useState<BreathingTechnique>("4-7-8");
  const [isActive, setIsActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [activeGroundingStep, setActiveGroundingStep] = useState(0);
  const [checkedGroundingItems, setCheckedGroundingItems] = useState<Record<number, boolean[]>>({
    0: [false, false, false, false, false],
    1: [false, false, false, false],
    2: [false, false, false],
    3: [false, false],
    4: [false],
  });

  // High-precision smooth animation state (60fps rAF)
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [displaySecondsLeft, setDisplaySecondsLeft] = useState(4);
  const [idleBreathTick, setIdleBreathTick] = useState(0);

  const activeTechConfig = useMemo(
    () => techniques.find((t) => t.id === selectedTechnique) || techniques[0],
    [techniques, selectedTechnique]
  );
  const currentPhaseConfig = activeTechConfig.phases[phaseIndex] || activeTechConfig.phases[0];

  // Shared technique card styles (used by both mapped techniques and the 54321 card)
  const TECHNIQUE_CARD_SELECTED = "bg-gradient-to-br from-white/95 via-emerald-50/40 to-teal-50/30 dark:from-emerald-50/10 dark:via-white/5 dark:to-teal-50/5 border-emerald-300/40 dark:border-emerald-400/25 shadow-sm ring-1 ring-emerald-200/40 dark:ring-emerald-400/20 scale-[1.01]";
  const TECHNIQUE_CARD_UNSELECTED = "bg-card/40 dark:bg-card/30 border border-white/15 dark:border-white/[0.06] hover:border-emerald-300/50 dark:hover:border-emerald-400/20 hover:bg-card/60 dark:hover:bg-card/45 backdrop-blur-xl backdrop-saturate-150";
  const TECHNIQUE_ICON_SELECTED = "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/35 scale-105";
  const TECHNIQUE_ICON_UNSELECTED = "bg-white dark:bg-emerald-50/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-500/25 group-hover:border-emerald-400/60 group-hover:bg-gradient-to-br group-hover:from-white group-hover:to-emerald-50 dark:group-hover:bg-emerald-50/15";

  const rafRef = useRef<number | null>(null);
  const phaseStartTimeRef = useRef<number>(0);
  const counterRef = useRef<HTMLSpanElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const mandalaRef = useRef<SVGSVGElement>(null);

  // Toggle Mute
  const handleToggleSound = () => {
    const nextMuted = !isSoundMuted;
    setIsSoundMuted(nextMuted);
    chimeAudio.setMuted(nextMuted);
  };

  // Reset session
  const handleReset = useCallback(() => {
    setIsActive(false);
    setPhaseIndex(0);
    setPhaseProgress(0);
    setDisplaySecondsLeft(activeTechConfig.phases[0].duration);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [activeTechConfig]);

  // Switch technique
  const handleSelectTechnique = (tech: BreathingTechnique) => {
    setSelectedTechnique(tech);
    setIsActive(false);
    setPhaseIndex(0);
    setPhaseProgress(0);
    const target = techniques.find((t) => t.id === tech);
    if (target) {
      setDisplaySecondsLeft(target.phases[0].duration);
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  // GSAP Kinetic Number Pop when seconds tick down
  useEffect(() => {
    if (counterRef.current && isActive) {
      gsap.fromTo(
        counterRef.current,
        { scale: 1.18, opacity: 0.9 },
        { scale: 1, opacity: 1, duration: 0.28, ease: "power2.out" }
      );
    }
  }, [displaySecondsLeft, isActive]);

  // 60FPS Organic Animation Loop
  useEffect(() => {
    if (!isActive || selectedTechnique === "54321") {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    let currentPIndex = phaseIndex;
    phaseStartTimeRef.current = performance.now();

    const loop = (now: number) => {
      const currentConfig = activeTechConfig.phases[currentPIndex];
      const phaseDurationMs = currentConfig.duration * 1000;
      const elapsed = now - phaseStartTimeRef.current;
      const rawProgress = Math.min(1, Math.max(0, elapsed / phaseDurationMs));
      const secsLeft = Math.max(1, Math.ceil(currentConfig.duration - elapsed / 1000));

      setPhaseProgress(rawProgress);
      setDisplaySecondsLeft(secsLeft);

      if (elapsed >= phaseDurationMs) {
        // Switch to next phase
        const nextIndex = (currentPIndex + 1) % activeTechConfig.phases.length;
        currentPIndex = nextIndex;
        setPhaseIndex(nextIndex);
        phaseStartTimeRef.current = now;

        const nextConfig = activeTechConfig.phases[nextIndex];
        chimeAudio.playPhaseChime(nextConfig.sound);

        if (nextIndex === 0) {
          setCompletedCycles((c) => c + 1);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isActive, selectedTechnique, activeTechConfig]);

  // Gentle idle breathing animation loop (always running for living feel)
  useEffect(() => {
    if (isActive && selectedTechnique !== "54321") return;

    let idleRaf: number;
    const idleStart = performance.now();
    const loop = (now: number) => {
      setIdleBreathTick((now - idleStart) / 1000);
      idleRaf = requestAnimationFrame(loop);
    };
    idleRaf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(idleRaf);
  }, [isActive, selectedTechnique]);

  // Start / Pause
  const handleToggleActive = () => {
    if (!isActive) {
      chimeAudio.playPhaseChime(currentPhaseConfig.sound);
    }
    setIsActive((prev) => !prev);
  };

  // Toggle Grounding Item Check
  const handleToggleGroundingItem = (stepIdx: number, itemIdx: number) => {
    setCheckedGroundingItems((prev) => {
      const stepItems = [...(prev[stepIdx] || [])];
      stepItems[itemIdx] = !stepItems[itemIdx];
      if (stepItems[itemIdx]) {
        chimeAudio.playPhaseChime("hold");
      }
      return { ...prev, [stepIdx]: stepItems };
    });
  };

  // Compute organic biological breathing scale and micro-vibrations with ripple phase offsets
  const { orbScale, ringScale1, ringScale2, ringScale3, auraOpacity, lungPercent, coreGlow, ripplePulse } = useMemo(() => {
    if (!isActive) {
      // Gentle idle micro-breathing so orb never feels dead (4.2s cycle for natural resting breath)
      const t = idleBreathTick;
      const idleBreath = 0.5 - 0.5 * Math.cos((t / 4.2) * Math.PI * 2);
      return {
        orbScale: 0.92 + idleBreath * 0.08,
        ringScale1: 1.02 + idleBreath * 0.06,
        ringScale2: 1.14 + idleBreath * 0.08,
        ringScale3: 1.28 + idleBreath * 0.06,
        auraOpacity: 0.28 + idleBreath * 0.18,
        lungPercent: 45 + Math.round(idleBreath * 10),
        coreGlow: 0.22 + idleBreath * 0.18,
        ripplePulse: 0,
      };
    }

    const p = phaseProgress;
    // Smoother sine ease for organic breathing feel
    const easedProgress = 0.5 - 0.5 * Math.cos(p * Math.PI);

    let scale = 1;
    let aura = 0.45;
    let lung = 50;
    let glow = 0.3;
    let ripple = 0;

    if (currentPhaseConfig.phase === "inhale") {
      // Inhale: smooth expansion from relaxed to full
      scale = 0.82 + easedProgress * 0.6;  // 0.82 -> 1.42
      aura = 0.35 + easedProgress * 0.5;   // soft -> strong
      lung = Math.round(15 + easedProgress * 80);
      glow = 0.25 + easedProgress * 0.55;
    } else if (currentPhaseConfig.phase === "inhaleExtra") {
      // Top off breath - full expansion with slight surge
      scale = 1.42 + easedProgress * 0.08;
      aura = 0.85 + easedProgress * 0.1;
      lung = 100;
      glow = 0.8 + easedProgress * 0.15;
      ripple = easedProgress; // ripple fires at peak inhale
    } else if (currentPhaseConfig.phase === "hold") {
      // Holding full breath - gentle alive tremor (heartbeat-like micro pulse)
      const microFlutter = Math.sin(p * Math.PI * 8) * 0.012 + Math.sin(p * Math.PI * 3) * 0.008;
      scale = 1.48 + microFlutter;
      aura = 0.82 + Math.sin(p * Math.PI * 5) * 0.08;
      lung = 100;
      glow = 0.88 + Math.sin(p * Math.PI * 4) * 0.08;
    } else if (currentPhaseConfig.phase === "exhale") {
      // Exhale: gentle controlled release, slower start faster end
      const exhaleEase = 0.5 - 0.5 * Math.cos(easedProgress * Math.PI * 0.85);
      scale = 1.48 - exhaleEase * 0.68; // 1.48 -> 0.80
      aura = 0.82 - exhaleEase * 0.5;
      lung = Math.round(100 - exhaleEase * 85);
      glow = 0.8 - exhaleEase * 0.6;
    } else if (currentPhaseConfig.phase === "holdPost") {
      // Rest at bottom - calm, tiny pulse like a resting heartbeat
      const microRest = Math.sin(p * Math.PI * 6) * 0.006 + Math.sin(p * Math.PI * 2) * 0.004;
      scale = 0.80 + microRest;
      aura = 0.3 + Math.sin(p * Math.PI * 2) * 0.06;
      lung = 12;
      glow = 0.2 + Math.sin(p * Math.PI) * 0.08;
    }

    return {
      orbScale: scale,
      // Ring scales: each layer progressively larger, single source of truth
      ringScale1: scale * 1.06,
      ringScale2: scale * 1.18,
      ringScale3: scale * 1.48 + 0.06,
      auraOpacity: aura,
      lungPercent: lung,
      coreGlow: glow,
      ripplePulse: ripple,
    };
  }, [isActive, phaseProgress, currentPhaseConfig.phase, idleBreathTick]);

  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference * (1 - phaseProgress);

  // GSAP Entrance & Continuous Sacred Mandala Spin Animation
  useGSAP(
    () => {
      if (mandalaRef.current) {
        gsap.to(mandalaRef.current, {
          rotation: 360,
          transformOrigin: "center center",
          duration: 45,
          repeat: -1,
          ease: "none",
        });
      }

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".breath-banner-eyebrow", {
        y: -12,
        opacity: 0,
        duration: 0.5,
      })
        .from(
          ".breath-title-sparkles",
          {
            y: 16,
            opacity: 0,
            duration: 0.55,
          },
          "-=0.3"
        )
        .from(
          ".breath-subtitle-desc",
          {
            y: 10,
            opacity: 0,
            duration: 0.45,
          },
          "-=0.3"
        )
        .from(
          ".tech-list-column",
          {
            x: -20,
            opacity: 0,
            duration: 0.55,
          },
          "-=0.2"
        )
        .from(
          ".breath-stage-column",
          {
            x: 20,
            opacity: 0,
            duration: 0.55,
          },
          "-=0.4"
        );
    },
    { scope: sectionRef }
  );

  // Animate on technique switch
  useEffect(() => {
    if (contentAreaRef.current) {
      gsap.fromTo(
        contentAreaRef.current,
        { autoAlpha: 0, scale: 0.985 },
        { autoAlpha: 1, scale: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [selectedTechnique]);

  const renderTechniqueCard = (
    technique: Pick<TechniqueConfig, "id" | "name" | "badge" | "timingBadge" | "desc" | "icon">
  ) => {
    const Icon = technique.icon;
    const isSelected = selectedTechnique === technique.id;

    return (
      <div
        key={technique.id}
        onClick={() => handleSelectTechnique(technique.id)}
        className={cn(
          "group relative rounded-2xl p-3.5 sm:p-4 transition-all duration-300 cursor-pointer flex items-start gap-3.5 text-left overflow-hidden",
          isSelected ? TECHNIQUE_CARD_SELECTED : TECHNIQUE_CARD_UNSELECTED
        )}
      >
        <div
          className={cn(
            "absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-all duration-300",
            isSelected
              ? "bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              : "bg-transparent"
          )}
        />
        {isSelected && (
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50/30 via-white/30 to-teal-50/20 dark:from-emerald-950/20 dark:via-transparent dark:to-teal-950/15" />
        )}
        <div
          className={cn(
            "size-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 mt-0.5",
            isSelected ? TECHNIQUE_ICON_SELECTED : TECHNIQUE_ICON_UNSELECTED
          )}
        >
          <Icon className="size-4.5" strokeWidth={isSelected ? 2.2 : 2} />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-1.5">
            <h4
              className={cn(
                "text-[13px] truncate transition-colors font-semibold",
                isSelected ? "text-emerald-900 dark:text-emerald-100" : "text-foreground"
              )}
            >
              {technique.name}
            </h4>
            {isSelected ? (
              <span className="inline-flex items-center gap-1 text-[10px] bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-2.5 py-0.5 rounded-full font-bold shrink-0 shadow-sm shadow-emerald-500/25">
                <CheckCircle2 className="size-2.5" /> {language === "zh" ? "练习中" : "Active"}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0 font-medium">
                {technique.timingBadge}
              </span>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {technique.desc}
          </p>

          <div className="pt-0.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 px-2 py-0.5 rounded-full">
              <span className="size-1 rounded-full bg-emerald-400" /> {technique.badge}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={sectionRef} className="container mx-auto max-w-6xl px-4 py-4 md:py-6 space-y-6 select-none">
      {/* Header Banner */}
      <div className="breath-section-banner text-center max-w-2xl mx-auto space-y-2">
        <div className="breath-banner-eyebrow inline-flex items-center gap-2 rounded-full bg-white dark:bg-white/5 border border-emerald-200/60 dark:border-emerald-500/20 px-4 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 backdrop-blur-md shadow-sm">
          <Wind className="size-3.5 text-emerald-500" />
          <span>{language === "zh" ? "自主神经调节 · 呼吸疗愈空间" : "Somatic Nervous System Reset · Sanctuary"}</span>
        </div>
        <div className="breath-title-sparkles">
          <SparklesText
            colors={{ first: "#059669", second: "#10b981" }}
            sparklesCount={8}
            className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-foreground"
          >
            <span>{language === "zh" ? "正念呼吸与减压 " : "Mindful Breathing & Grounding "}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-lato-light-italic font-normal pb-0.5 inline-block">
              {language === "zh" ? "疗愈空间" : "Sanctuary"}
            </span>
          </SparklesText>
        </div>
        <p className="breath-subtitle-desc text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto font-lato-light-italic">
          {language === "zh"
            ? "7 种基于临床实证的呼吸调息与感官着陆方法。选择一种练习，在 60 秒内舒缓你的神经系统。"
            : "7 clinical evidence-based breathwork and grounding protocols. Select a technique to begin soothing your nervous system within 60 seconds."}
        </p>
      </div>

      {/* Main Responsive Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Technique Selector Hub (5 cols on Desktop) */}
        <div className="tech-list-column lg:col-span-5 space-y-2.5">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-emerald-500" />
              <span>{language === "zh" ? "选择呼吸练习" : "Select Technique"}</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 bg-white dark:bg-white/5 border border-emerald-200/60 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold shadow-sm">
              {language === "zh" ? "7 种科学调息法则" : "7 Clinical Protocols"}
            </span>
          </div>

          <div className="space-y-2.5">
            {techniques.map(renderTechniqueCard)}
            {renderTechniqueCard({
              id: "54321",
              name: language === "zh" ? "5-4-3-2-1 感官着陆练习" : "5-4-3-2-1 Somatic Grounding",
              timingBadge: language === "zh" ? "五感调动" : "5 Senses",
              desc: language === "zh"
                ? "调动五感逐步感知环境，阻断杏仁核焦虑风暴，将注意力重新锚定在平静的当下。"
                : "Clinical sensory grounding to pull racing minds out of amygdala panic and anchor attention firmly in the present.",
              badge: language === "zh" ? "惊恐与反刍阻断" : "Panic & Rumination Reset",
              icon: ShieldCheck,
            })}
          </div>
        </div>

        {/* Right Column: Active Breathing Stage & Biological Simulator (7 cols on Desktop) */}
        <div className="breath-stage-column lg:col-span-7">
          <div ref={contentAreaRef} className="breath-active-container">
            {selectedTechnique !== "54321" ? (
              <div className="rounded-3xl bg-gradient-to-br from-white/60 via-emerald-50/30 to-teal-50/20 dark:from-emerald-50/10 dark:via-white/5 dark:to-teal-50/8 border border-white/15 dark:border-white/[0.08] backdrop-blur-xl backdrop-saturate-150 shadow-xl shadow-emerald-500/[0.06] p-5 sm:p-7 flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
                {/* Top Row Info & Sound Bell Toggle */}
                <div className="w-full flex items-center justify-between z-10 px-1">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2.5">
                      <span className={cn("absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75", isActive && "animate-ping")} />
                      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <div>
                      <span className="text-xs font-bold text-foreground">
                        {activeTechConfig.name}
                      </span>
                      <span className="ml-2 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium">
                        {activeTechConfig.timingBadge}
                      </span>
                    </div>
                  </div>

                  {/* Tibetan Singing Bowl Bell Toggle */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleSound}
                    className="h-8 gap-1.5 rounded-full text-xs text-emerald-700 dark:text-emerald-300 border-emerald-300/50 dark:border-emerald-500/25 bg-emerald-50/60 dark:bg-emerald-50/10 hover:bg-emerald-100/70 dark:hover:bg-emerald-50/15 cursor-pointer shadow-xs font-medium"
                    title={isSoundMuted ? "Enable 432Hz Tibetan singing bowl" : "Mute bells"}
                  >
                    {isSoundMuted ? (
                      <VolumeX className="size-3.5 text-rose-500" />
                    ) : (
                      <Volume2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span className="text-[11px]">{isSoundMuted ? (language === "zh" ? "颂钵: 静音" : "Bowl: Off") : (language === "zh" ? "432Hz 颂钵: 开启" : "432Hz Bowl: On")}</span>
                  </Button>
                </div>

                {/* Dynamic Ambient Background Light Field */}
                <div
                  className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-1000 blur-3xl"
                  style={{
                    opacity: auraOpacity * 0.6,
                    background: `radial-gradient(circle at 50% 50%, ${currentPhaseConfig.glowColor}, transparent 68%)`,
                  }}
                />

                {/* Breathing Phase Header with Step Guidance */}
                <div className="flex flex-col items-center space-y-1 text-center z-10">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-extrabold uppercase tracking-widest transition-all duration-300 shadow-sm",
                        isActive
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border border-emerald-400/50 shadow-emerald-500/20"
                          : "bg-white dark:bg-white/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/20"
                      )}
                    >
                      {isActive ? (
                        <span className="relative flex size-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full size-1.5 bg-white"></span>
                        </span>
                      ) : (
                        <Leaf className="size-3" />
                      )}
                      {isActive ? currentPhaseConfig.title : (language === "zh" ? "准备开始" : "Ready to Begin")}
                    </span>
                    {isActive && (
                      <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold bg-white dark:bg-white/10 border border-emerald-200/60 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full shadow-sm">
                        {language === "zh" ? "肺容积" : "Lung Capacity"} ~{lungPercent}%
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-foreground/80 font-medium max-w-md h-8 flex items-center justify-center transition-all duration-300 leading-snug px-3">
                    {isActive ? currentPhaseConfig.guide : (language === "zh" ? "点击下方按钮，跟随愈疗呼吸球同步呼吸节奏。" : "Click start below to synchronize your breathing with the living orb.")}
                  </p>
                </div>

                {/* The Organic Multi-Layer Living Breath Orb - Pearl White + Emerald Glow */}
                <div className="relative flex size-64 sm:size-72 items-center justify-center my-1">
                  {/* Layer -1: Deep ambient field glow (breath-driven) */}
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: "140%",
                      height: "140%",
                      background: `radial-gradient(circle, ${currentPhaseConfig.glowColor}33 0%, ${currentPhaseConfig.glowColor}11 40%, transparent 70%)`,
                      transform: `scale(${0.9 + (isActive ? auraOpacity * 0.3 : coreGlow * 0.5)})`,
                      opacity: isActive ? auraOpacity * 0.55 : coreGlow * 0.8,
                      filter: "blur(28px)",
                    }}
                  />

                  {/* Layer 0: Subtle Sacred Geometry Mandala Pattern (slow rotation) */}
                  <svg
                    ref={mandalaRef}
                    className="absolute size-64 sm:size-72 pointer-events-none opacity-25 dark:opacity-35"
                    viewBox="0 0 200 200"
                  >
                    <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 5" className="text-emerald-300/70" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 4" className="text-emerald-300/60" />
                    <circle cx="100" cy="100" r="65" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="3 5" className="text-emerald-200/70" />
                    <circle cx="100" cy="100" r="50" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2 6" className="text-emerald-200/50" />
                    {/* 8 petal marks for lotus feel */}
                    {Array.from({ length: 8 }).map((_, i) => {
                      const angle = (i * Math.PI * 2) / 8;
                      const x1 = 100 + Math.cos(angle) * 40;
                      const y1 = 100 + Math.sin(angle) * 40;
                      const x2 = 100 + Math.cos(angle) * 95;
                      const y2 = 100 + Math.sin(angle) * 95;
                      return (
                        <line
                          key={i}
                          x1={x1} y1={y1} x2={x2} y2={y2}
                          stroke="currentColor"
                          strokeWidth="0.4"
                          strokeDasharray="1 3"
                          className="text-emerald-300/40"
                        />
                      );
                    })}
                  </svg>

                  {/* Layer 1: Outermost Soft Ethereal Emerald Breath Aura (expands most) */}
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: "100%",
                      height: "100%",
                      transform: `scale(${ringScale3})`,
                      background: `radial-gradient(circle, ${currentPhaseConfig.glowColor}55 0%, ${currentPhaseConfig.glowColor}22 35%, transparent 68%)`,
                      opacity: auraOpacity * 0.75,
                      filter: "blur(16px)",
                    }}
                  />

                  {/* Layer 1b: Inhale ripple wave - fires outward at peak inhale */}
                  {isActive && ripplePulse > 0 && (
                    <div
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        inset: "1.5rem",
                        border: `1.5px solid rgba(16,185,129,${0.5 - ripplePulse * 0.45})`,
                        transform: `scale(${1 + ripplePulse * 0.45})`,
                        opacity: 1 - ripplePulse,
                        boxShadow: `0 0 20px rgba(16,185,129,${0.3 - ripplePulse * 0.25})`,
                      }}
                    />
                  )}

                  {/* Layer 2: Outer soft white-emerald breath ring */}
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      inset: "1.2rem",
                      transform: `scale(${ringScale2})`,
                      border: `1.5px solid rgba(255,255,255,0.55)`,
                      boxShadow: `0 0 24px ${currentPhaseConfig.glowColor}66, inset 0 0 18px rgba(255,255,255,0.25)`,
                      opacity: auraOpacity * 0.7,
                    }}
                  />

                  {/* Layer 2b: Inner white pearl ring (crisper) */}
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      inset: "0.6rem",
                      transform: `scale(${ringScale1})`,
                      border: `2px solid rgba(255,255,255,0.85)`,
                      boxShadow: `0 0 22px ${currentPhaseConfig.glowColor}99, 0 0 10px rgba(255,255,255,0.7), inset 0 0 16px rgba(255,255,255,0.55)`,
                      opacity: auraOpacity * 0.9,
                    }}
                  />

                  {/* Floating orbit particles - tiny light dots drifting around the orb when active */}
                  {isActive && (
                    <>
                      {[0, 1, 2, 3, 4, 5].map((i) => {
                        const particleTime = phaseProgress;
                        const baseAngle = (i / 6) * Math.PI * 2 + particleTime * (0.3 + i * 0.05);
                        const orbitRadius = 110 + Math.sin((phaseProgress + i * 0.5) * Math.PI * 2) * 18;
                        const px = 128 + Math.cos(baseAngle) * orbitRadius;
                        const py = 128 + Math.sin(baseAngle) * orbitRadius * 0.95;
                        const size = 2 + (i % 3) * 1.2;
                        return (
                          <div
                            key={i}
                            className="absolute rounded-full pointer-events-none"
                            style={{
                              left: `${(px / 256) * 100}%`,
                              top: `${(py / 256) * 100}%`,
                              width: size,
                              height: size,
                              transform: "translate(-50%,-50%)",
                              background: i % 2 === 0 ? "white" : "rgba(52,211,153,0.9)",
                              boxShadow: `0 0 ${size * 3}px ${i % 2 === 0 ? "rgba(255,255,255,0.9)" : "rgba(16,185,129,0.8)"}`,
                              opacity: 0.45 + auraOpacity * 0.45,
                            }}
                          />
                        );
                      })}
                    </>
                  )}

                  {/* Layer 3: Smooth SVG Circular Progress Indicator Ring */}
                  <svg
                    className="absolute size-56 sm:size-64 -rotate-90 pointer-events-none"
                    viewBox="0 0 240 240"
                  >
                    <circle
                      cx="120"
                      cy="120"
                      r="110"
                      className="stroke-emerald-200/50 dark:stroke-emerald-400/20 fill-none"
                      strokeWidth="2"
                    />
                    {isActive && (
                      <circle
                        cx="120"
                        cy="120"
                        r="110"
                        className="stroke-emerald-500 dark:stroke-emerald-400 fill-none"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        style={{
                          filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.7))",
                          transition: "stroke-dashoffset 80ms linear",
                        }}
                      />
                    )}
                  </svg>

                  {/* Layer 4: Pearl-White Living Core Orb with Emerald Breath */}
                  <div
                    className="relative flex size-40 sm:size-48 items-center justify-center rounded-full select-none cursor-pointer group"
                    style={{
                      transform: `scale(${orbScale})`,
                      background: `radial-gradient(circle at 38% 32%, #ffffff 0%, #ffffff 25%, #f0fdf6 50%, #d1fae5 78%, #a7f3d0 100%)`,
                      boxShadow: `
                        0 12px 48px rgba(16,185,129,0.28),
                        0 0 ${40 + coreGlow * 50}px ${currentPhaseConfig.glowColor}cc,
                        0 0 ${20 + coreGlow * 30}px rgba(255,255,255,0.9),
                        inset 0 -8px 28px rgba(16,185,129,${0.12 + coreGlow * 0.15}),
                        inset 0 8px 24px rgba(255,255,255,0.95),
                        inset 0 0 50px rgba(20,184,166,${0.06 + coreGlow * 0.1})
                      `,
                      border: `2.5px solid rgba(255,255,255,0.95)`,
                    }}
                    onClick={handleToggleActive}
                  >
                    {/* Inner soft emerald breath tint - grows and shifts with phase */}
                    <div
                      className="pointer-events-none absolute rounded-full"
                      style={{
                        inset: "8%",
                        background: `radial-gradient(circle at 50% 58%, ${currentPhaseConfig.glowColor} 0%, transparent 65%)`,
                        opacity: isActive ? auraOpacity * 0.5 : coreGlow * 0.7,
                      }}
                    />

                    {/* Second deeper inner glow for core warmth */}
                    <div
                      className="pointer-events-none absolute rounded-full"
                      style={{
                        inset: "28%",
                        background: `radial-gradient(circle, ${currentPhaseConfig.glowColor}88 0%, transparent 70%)`,
                        opacity: isActive ? auraOpacity * 0.45 : coreGlow * 0.5,
                        filter: "blur(4px)",
                      }}
                    />

                    {/* Top-left large pearl highlight (main light source) */}
                    <div
                      className="pointer-events-none absolute rounded-full"
                      style={{
                        top: "8%",
                        left: "16%",
                        width: "32%",
                        height: "26%",
                        background: "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 50%, transparent 75%)",
                        filter: "blur(2px)",
                      }}
                    />

                    {/* Smaller secondary highlight */}
                    <div
                      className="pointer-events-none absolute rounded-full"
                      style={{
                        top: "18%",
                        right: "20%",
                        width: "12%",
                        height: "10%",
                        background: "radial-gradient(circle, rgba(255,255,255,0.7) 0%, transparent 70%)",
                        filter: "blur(1.5px)",
                      }}
                    />

                    {/* Bottom rim light - soft emerald reflection */}
                    <div
                      className="pointer-events-none absolute rounded-full"
                      style={{
                        bottom: "10%",
                        right: "14%",
                        width: "28%",
                        height: "20%",
                        background: "radial-gradient(ellipse at 50% 60%, rgba(52,211,153,0.35) 0%, transparent 70%)",
                        filter: "blur(3px)",
                        opacity: 0.6 + (isActive ? auraOpacity * 0.3 : 0),
                      }}
                    />

                    {/* Subtle specular dot highlight */}
                    <div
                      className="pointer-events-none absolute rounded-full bg-white"
                      style={{
                        top: "14%",
                        left: "22%",
                        width: "5%",
                        height: "5%",
                        boxShadow: "0 0 6px rgba(255,255,255,0.9)",
                        opacity: 0.85,
                      }}
                    />

                    {/* Counter & Status Display */}
                    {isActive ? (
                      <div className="flex flex-col items-center justify-center text-center z-10">
                        <span
                          ref={counterRef}
                          className="text-4xl sm:text-5xl font-black font-mono tracking-tight leading-none breath-counter-number"
                          style={{
                            color: "#047857",
                            textShadow: "0 1px 2px rgba(255,255,255,0.9), 0 0 12px rgba(16,185,129,0.3)",
                          }}
                        >
                          {displaySecondsLeft}
                        </span>
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-700/80 mt-1.5 font-sans">
                          {currentPhaseConfig.phase}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center z-10 space-y-1.5 group-hover:scale-105 transition-transform duration-300">
                        <div
                          className="size-14 rounded-full flex items-center justify-center shadow-lg border-[3px] border-white/90"
                          style={{
                            background: "linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)",
                            boxShadow: "0 6px 20px rgba(16,185,129,0.5), inset 0 1px 2px rgba(255,255,255,0.5)",
                          }}
                        >
                          <Play className="size-5 fill-white text-white ml-0.5 drop-shadow-sm" />
                        </div>
                        <span className="text-[11px] font-extrabold tracking-widest uppercase text-emerald-700 dark:text-emerald-700">
                          {language === "zh" ? "开始" : "Start"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Control Buttons */}
                <div className="flex items-center gap-3 pt-1 z-10">
                  <Button
                    onClick={handleToggleActive}
                    className="h-11 px-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 gap-2 transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer border border-white/20"
                  >
                    {isActive ? (
                      <>
                        <Pause className="size-4 text-white" />
                        <span>{language === "zh" ? "暂停练习" : "Pause Practice"}</span>
                      </>
                    ) : (
                      <>
                        <Play className="size-4 fill-white text-white" />
                        <span>{language === "zh" ? "开始练习" : "Start Breathing"}</span>
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="h-11 px-5 rounded-full text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-500/25 bg-white dark:bg-emerald-50/10 hover:bg-emerald-50 dark:hover:bg-emerald-50/15 gap-1.5 cursor-pointer shadow-sm font-semibold"
                    title="Reset session"
                  >
                    <RotateCcw className="size-3.5" />
                    <span className="text-xs hidden sm:inline">{language === "zh" ? "重置" : "Reset"}</span>
                  </Button>
                </div>

                {/* Scientific Mechanism Note */}
                <div className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/40 via-white/50 to-teal-50/30 dark:from-emerald-50/10 dark:via-white/5 dark:to-teal-50/8 border border-white/15 dark:border-white/[0.06] text-xs text-muted-foreground flex items-start gap-2.5 shadow-sm backdrop-blur-xl backdrop-saturate-150">
                  <Info className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 leading-relaxed text-left">
                    <span className="font-bold text-emerald-800 dark:text-emerald-200">{language === "zh" ? "神经生理学机制：" : "Neurophysiological Mechanism:"}</span>
                    <p className="text-[11px] leading-relaxed">{activeTechConfig.mechanism}</p>
                  </div>
                </div>

                {/* Session Stats & Clinical Insights */}
                <div className="flex flex-col sm:flex-row items-center justify-between w-full pt-1 text-xs text-muted-foreground z-10 gap-2 border-t border-emerald-500/10">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span>{language === "zh" ? "已完成：" : "Completed:"} <strong className="text-foreground text-sm font-mono">{completedCycles}</strong> {language === "zh" ? "周期" : "Cycles"}</span>
                    {completedCycles > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full">
                        <Flame className="size-3 text-emerald-600 dark:text-emerald-400" /> {language === "zh" ? "连续练习中" : "Streak Active"}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] sm:text-right font-medium text-emerald-700 dark:text-emerald-300 font-lato-light-italic">
                    {activeTechConfig.benefits}
                  </div>
                </div>
              </div>
            ) : (
              /* 5-4-3-2-1 Somatic Grounding Interactive Step-by-Step Guide */
              <div className="rounded-3xl bg-gradient-to-br from-white/60 via-emerald-50/30 to-teal-50/20 dark:from-emerald-50/10 dark:via-white/5 dark:to-teal-50/8 border border-white/15 dark:border-white/[0.08] backdrop-blur-xl backdrop-saturate-150 shadow-xl shadow-emerald-500/[0.06] p-5 sm:p-7 space-y-5">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="size-3.5" />
                    <span>{language === "zh" ? "5-4-3-2-1 感官着陆技术" : "5-4-3-2-1 Somatic Grounding Technique"}</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {language === "zh" ? "急性惊恐、焦虑与反刍思绪重置" : "Acute Panic, Anxiety & Rumination Reset"}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-lato-light-italic">
                    {language === "zh" ? "通过逐步点击勾选下方的感官锚点，激活感觉皮层，阻断大脑警报回路：" : "Anchor your sensory cortices by clicking through the real-time physical touchpoints below:"}
                  </p>
                </div>

                {/* Grounding Step Cards (Harmonious Emerald Palette) */}
                <div className="space-y-2.5">
                  {groundingSteps.map((step, idx) => {
                    const Icon = step.icon;
                    const isCurrent = activeGroundingStep === idx;
                    const checkedList = checkedGroundingItems[idx] || [];
                    const allChecked = checkedList.length > 0 && checkedList.every(Boolean);

                    return (
                      <div
                        key={step.count}
                        onClick={() => setActiveGroundingStep(idx)}
                        className={cn(
                          "cursor-pointer rounded-2xl p-3.5 transition-all duration-200 flex flex-col gap-2.5 border",
                          isCurrent
                            ? "bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 dark:from-emerald-50/15 dark:via-white/8 dark:to-teal-50/10 border-emerald-400/60 dark:border-emerald-400/40 shadow-md shadow-emerald-500/10"
                            : allChecked
                            ? "bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-50/10 dark:to-white/5 border-emerald-300/50 dark:border-emerald-500/25"
                            : "bg-white/90 dark:bg-emerald-50/5 border-emerald-100/80 dark:border-emerald-500/20 hover:bg-gradient-to-br hover:from-white hover:to-emerald-50/40 dark:hover:from-emerald-50/8 dark:hover:to-teal-50/6 hover:border-emerald-300/60"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex size-9 items-center justify-center rounded-xl font-bold shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
                            <Icon className="size-4.5" />
                          </div>

                          <div className="flex-1 space-y-0.5 text-left">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground">
                                {language === "zh" ? `第 ${idx + 1} 步：留意 ${step.count} 件事物 · ${step.sense}` : `Step ${idx + 1}: Notice ${step.count} Things · ${step.sense}`}
                              </span>
                              {allChecked ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                  <Check className="size-3" /> {language === "zh" ? "步骤已完成" : "Step Anchored"}
                                </span>
                              ) : isCurrent ? (
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                  {language === "zh" ? "当前专注" : "Active Focus"}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed font-normal">
                              {step.instruction}
                            </p>
                          </div>
                        </div>

                        {/* Interactive Checkable Sensory Items */}
                        {isCurrent && (
                          <div className="pt-2 border-t border-emerald-500/10 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in duration-300">
                            {step.items.map((itemLabel, itemIdx) => {
                              const isItemChecked = checkedList[itemIdx] || false;
                              return (
                                <button
                                  key={itemIdx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleGroundingItem(idx, itemIdx);
                                  }}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer border",
                                    isItemChecked
                                      ? "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-50/15 dark:to-teal-50/10 border-emerald-400/60 text-emerald-900 dark:text-emerald-100 font-semibold shadow-sm"
                                      : "bg-white dark:bg-emerald-50/5 border-emerald-200/70 dark:border-emerald-500/20 text-foreground/80 hover:bg-emerald-50/60 dark:hover:bg-emerald-50/10 hover:border-emerald-300/60"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "size-4 rounded-md flex items-center justify-center transition-colors",
                                      isItemChecked
                                        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm"
                                        : "border border-emerald-300/60 dark:border-emerald-500/30 bg-white dark:bg-emerald-50/5"
                                    )}
                                  >
                                    {isItemChecked && <Check className="size-3 text-white" />}
                                  </div>
                                  <span className="truncate text-[11px]">{itemLabel}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Stepper Navigation */}
                <div className="flex items-center justify-between pt-2 border-t border-emerald-500/10">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activeGroundingStep === 0}
                    onClick={() => setActiveGroundingStep((prev) => Math.max(0, prev - 1))}
                    className="rounded-full text-xs cursor-pointer bg-white dark:bg-emerald-50/10 border-emerald-300/60 dark:border-emerald-500/25 font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-50/15"
                  >
                    {language === "zh" ? "上一步" : "Previous"}
                  </Button>

                  <div className="text-xs font-bold text-muted-foreground font-mono">
                    {language === "zh" ? `第 ${activeGroundingStep + 1} 步 / 共 ${groundingSteps.length} 步` : `Step ${activeGroundingStep + 1} of ${groundingSteps.length}`}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      if (activeGroundingStep < 4) {
                        setActiveGroundingStep((prev) => prev + 1);
                      } else {
                        chimeAudio.playPhaseChime("complete");
                      }
                    }}
                    className="rounded-full text-xs px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    {activeGroundingStep === 4 ? (language === "zh" ? "完成着陆练习 ✨" : "Complete Grounding ✨") : (language === "zh" ? "下一个感官 →" : "Next Sense →")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Callout: Jump back to Chat with Counselor */}
      {onNavigateToChat && (
        <div className="max-w-6xl mx-auto rounded-2xl bg-emerald-500/5 border border-emerald-500/15 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/15">
              <Heart className="size-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">
                {language === "zh" ? "身心感觉更加平稳了吗？准备好聊聊心事了吗？" : "Feeling more grounded? Ready to explore your thoughts?"}
              </div>
              <div className="text-[11px] text-muted-foreground leading-normal mt-0.5 font-lato-light-italic">
                {language === "zh" ? "在安全私密的愈心空间中，与你的专属咨询伙伴 (Maya / Liam) 展开温和的 CBT 倾诉与思绪梳理。" : "Connect with your AI counselor (Maya / Liam) in a safe, confidential sanctuary for gentle CBT guidance."}
              </div>
            </div>
          </div>
          <Button
            onClick={() => onNavigateToChat(language === "zh" ? "我刚完成了一次呼吸减压练习，感觉身心平静了许多。" : "I just completed a mindful breathing session and felt my body calm down.")}
            size="sm"
            className="rounded-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shrink-0 px-4 py-2 cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <span>{language === "zh" ? "与咨询师倾诉" : "Talk with Counselor"}</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
