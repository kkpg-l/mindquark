import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Language = "en" | "zh";

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const LANGUAGE_STORAGE_KEY = "mindquark_language";

export const translations = {
  en: {
    nav: {
      brandSub: "Sanctuary",
      tagline: "24/7 AI Mental Health & Coaching",
      explore: "Explore",
      chat: "Chat",
      breathe: "Breathe",
      mood: "Mood",
      guide: "Guide",
      me: "Me",
      toggleTheme: "Toggle theme",
      toggleLangZh: "切换为中文",
      toggleLangEn: "Switch to English",
      currentLang: "EN",
    },
    hero: {
      badge: "Grounded in Evidence-Based CBT & Mindful Psychology",
      title: "MindQuark Sanctuary",
      sub: '"Your 24/7 quiet harbor for mental health & emotional coaching. A safe, gentle space to deconstruct anxiety and rediscover inner stillness."',
      startChat: "Begin Mindful Chat",
      exploreMood: "Explore Mood Radar",
      hint: "💡 What is resting on your mind today? Click to begin gently:",
      bubbleOverwhelmed: "😰 Feeling overwhelmed & spiraling",
      bubbleOverwhelmedPrompt: "I'm feeling really overwhelmed with work and life lately, and my thoughts keep spiraling...",
      bubbleBurnout: "😴 Drained by burnout & insomnia",
      bubbleBurnoutPrompt: "I can't seem to sleep well because my mind won't shut off, and I feel completely exhausted.",
      bubbleRelationship: "💔 Struggling with relationship stress",
      bubbleRelationshipPrompt: "Interpersonal conflicts have been draining me emotionally, and I keep second-guessing myself.",
      bubbleCalm: "🌱 Seeking calm & mindfulness",
      bubbleCalmPrompt: "I'd like to practice mindfulness and ground myself to find inner peace today.",
      card1Title: "CBT Thought Untangling",
      card1Desc: "Unpack cognitive distortions gently with evidence-based psychological reframing.",
      card2Title: "Dual-Axis Mood Radar",
      card2Desc: "Track energy levels and emotional valence, paired with 5-4-3-2-1 sensory grounding techniques.",
      card3Title: "Gentle Perspectives & Real-Time Call",
      card3Desc: "Connect with Maya or Liam via mindful chat, voice dictation, or a gentle real-time AI phone check-in call.",
      privacy: "Client privacy guaranteed • Strict adherence to ethical psychological boundaries",
    },
    chat: {
      companionBadge: "CBT Companion",
      callButton: "Call Me",
      breatheButton: "Breathe Sanctuary",
      clearChat: "Clear Conversation",
      autoSpeak: "Auto-play Voice",
      thinkingTitle: "is reflecting mindfully...",
      thinkingDesc: "Formulating empathetic CBT guidance",
      inputPlaceholder: "Share what's on your mind with",
      listeningPlaceholder: "🎙️ Listening to your voice (iFlytek ASR)... speak gently...",
      send: "Send",
      statusOnline: "Online",
      mayaRole: "Empathetic, non-judgmental CBT listening & compassionate acceptance",
      liamRole: "Grounded, analytical perspective to deconstruct thought loops",
      mayaWelcome: "Hello, I'm Maya. Welcome to this safe, non-judgmental harbor. Take a gentle breath. What's resting on your mind or heart today?",
      liamWelcome: "Hello, I'm Liam. When thoughts feel overwhelming, we can break them down step-by-step together. What's happening in your world right now?",
    },
    breathe: {
      title: "Breathing Sanctuary",
      subtitle: "Harmonize your nervous system with guided scientific breathwork",
      start: "Start Session",
      pause: "Pause Practice",
      startBreathing: "Start Breathing",
      reset: "Reset",
      soundOn: "432Hz Bowl: On",
      soundOff: "Bowl: Off",
      ready: "Ready to Begin",
      readyGuide: "Click start below to synchronize your breathing with the living orb.",
      lungCapacity: "Lung Capacity",
      mechanism: "Neurophysiological Mechanism:",
      completed: "Completed:",
      cycles: "Cycles",
      streak: "Streak Active",
      groundingTitle: "5-4-3-2-1 Somatic Grounding Technique",
      groundingSub: "Acute Panic, Anxiety & Rumination Reset",
      listenVoice: "🔊 Listen Voice Guide",
      phaseInhale: "Inhale deeply",
      phaseHold: "Hold gently",
      phaseExhale: "Exhale slowly",
      phasePrepare: "Get ready...",
    },
    mood: {
      headerBadge: "Daily Mood Radar & CBT Thought Studio",
      headerTitle: "Track Your Mindset, Unpack Your Thoughts",
      headerSub: "Grounded in evidence-based Cognitive Behavioral Therapy (CBT) and mindful reflection.",
      checkinTitle: "Daily Mood Check-In",
      checkinSub: "Notice and honor how you feel right now",
      step1: "1. Select your primary emotional state:",
      energy: "Energy Level",
      energyDepleted: "🔋 Fully Depleted",
      energyEnergized: "⚡ Vibrant & Energized",
      valence: "Emotional Valence (Pleasantness)",
      valenceLow: "🌧️ Deeply Low",
      valenceHigh: "☀️ Uplifted & Joyful",
      step2: "2. Context / Triggers (Optional):",
      notePlaceholder: "e.g., Demanding project timeline triggered my overthinking...",
      reflectBtn: "Reflect on this",
      saveBtn: "Save Check-In",
      saved: "Saved!",
      reframeTitle: "CBT Thought Studio",
      reframeSub: "Unpack cognitive patterns, rebuild mental clarity",
      antTitle: "Automatic Negative Thought:",
      antPlaceholder: "e.g., If this isn't perfect, I'm a total failure...",
      distortionTitle: "Suspected Thinking Habit:",
      reframeBtn: "Scientifically Unpack",
      reframing: "Unpacking with CBT...",
      reframingText: "Formulating balanced perspective...",
      groundingCardTitle: "30s Somatic Grounding (5-4-3-2-1)",
      groundingVoiceBtn: "🔊 Listen Voice Guide",
      groundingDesc: "Look around and acknowledge: 5 things you can see, 4 textures you can touch, 3 sounds you hear, 2 scents you smell, and take 1 deep restorative breath.",
    },
    guide: {
      headerBadge: "Thought Untangling Studio",
      headerTitle: "Understand Your Mind, Unpack Your Thoughts",
      headerSub: "Evidence-based CBT journeys — a structured thought record and a gentle cognitive self-assessment.",
      assessCardTitle: "Cognitive Self-Assessment",
      assessCardSub: "A gentle 10-question intake with a multi-dimension report",
      assessCardDesc: "Answer a short intake quiz to gently map thinking tendencies, energy states, and where your attention has been living.",
      assessPrivacy: "Everything stays on your device — nothing is uploaded or stored on a server.",
      startAssessBtn: "Start Assessment",
      lastSnapshot: "Last snapshot",
      noSnapshot: "No assessment yet — the first one takes about 3 minutes.",
      reframeCardTitle: "Guided Thought Record",
      reframeCardSub: "A 7-step CBT thought record, one gentle move at a time",
      reframeCardDesc: "Walk through situation, hot thought, emotion intensity, cognitive distortion traps, evidence examination, and write a balanced, compassionate perspective.",
      resumeDraft: "Resume In-Progress Draft",
      newReframe: "Start Fresh Thought Record",
      discardDraft: "Discard draft and start fresh",
      backHome: "Back to Studio",
      stepSituation: "Situation",
      stepThought: "Thought",
      stepEmotion: "Emotion",
      stepDistortion: "Trap",
      stepEvidence: "Evidence",
      stepReframe: "Balance",
      stepSummary: "Summary",
      nextStep: "Next",
      prevStep: "Back",
      complete: "Complete",
    },
    me: {
      title: "Profile Sanctuary & Dialogue Studio",
      subtitle: "Personalize your sanctuary experience and counselor preferences",
      userName: "Your Name",
      counselorName: "Counselor Name",
      defaultVoice: "Default Voice",
      selectAvatar: "Select or Upload Avatar",
      saveProfile: "Save Sanctuary Preferences",
      savedSuccess: "Sanctuary preferences saved successfully!",
    },
    voice: {
      modalTitle: "AI Counselor Phone Check-in",
      callButton: "Request Phone Call",
      callingStatus: "Calling in progress...",
    },
  },
  zh: {
    nav: {
      brandSub: "愈心空间",
      tagline: "24/7 AI 心理健康与愈疗向导",
      explore: "发现",
      chat: "愈疗对话",
      breathe: "呼吸减压",
      mood: "情绪记录",
      guide: "思绪梳理",
      me: "个人中心",
      toggleTheme: "切换明暗主题",
      toggleLangZh: "切换为中文",
      toggleLangEn: "Switch to English",
      currentLang: "中文",
    },
    hero: {
      badge: "基于循证认知行为疗法 (CBT) 与正念心理学",
      title: "MindQuark 愈心空间",
      sub: '"你的 24/7 心灵避风港与情绪向导。在安全温柔的空间中，梳理焦虑思绪，重获内心宁静。"',
      startChat: "开启愈疗对话",
      exploreMood: "探索情绪雷达",
      hint: "💡 今天有什么心事？点击下方卡片轻柔开启：",
      bubbleOverwhelmed: "😰 感到思绪过载与焦虑反刍",
      bubbleOverwhelmedPrompt: "我最近感到工作和生活的压力很大，思绪一直在混乱打转，有些喘不过气来...",
      bubbleBurnout: "😴 倦怠疲惫与失眠困扰",
      bubbleBurnoutPrompt: "我最近脑子总是停不下来导致失眠，整个人感到极度疲惫和倦怠。",
      bubbleRelationship: "💔 人际冲突与内耗纠结",
      bubbleRelationshipPrompt: "人际关系中的冲突让我情绪消耗很大，我总是忍不住怀疑和苛责自己。",
      bubbleCalm: "🌱 渴望平静与正念深呼吸",
      bubbleCalmPrompt: "我想通过正念练习让自己安定下来，在今天找回内心的平和与专注。",
      card1Title: "CBT 思绪梳理向导",
      card1Desc: "循序渐进觉察思维盲区，解构非黑即白与灾难化思维，寻找温和平衡的理性新视角。",
      card2Title: "双轴情绪雷达",
      card2Desc: "追踪身心能量与情绪效价，配合 5-4-3-2-1 感官着陆技术稳定心绪。",
      card3Title: "温柔陪伴与实时通话",
      card3Desc: "与 Maya 或 Liam 开展文字对话、双语语音识别与实时 AI 关怀通话。",
      privacy: "严格遵循心理咨询伦理 • 本地化与隐私数据安全保障",
    },
    chat: {
      companionBadge: "CBT 愈疗伙伴",
      callButton: "电话关怀",
      breatheButton: "呼吸减压",
      clearChat: "清空当前对话",
      autoSpeak: "自动朗读回应",
      thinkingTitle: "正在静心思考...",
      thinkingDesc: "构思温暖共情的专业回应",
      inputPlaceholder: "向",
      listeningPlaceholder: "🎙️ 正在倾听您的声音 (讯飞语音识别)... 请轻柔讲述...",
      send: "发送",
      statusOnline: "在线陪伴中",
      mayaRole: "温和倾听与共情接纳，陪伴你梳理日常焦虑与内耗",
      liamRole: "理性拆解与引导思考，助你理清头绪并重塑清晰",
      mayaWelcome: "你好，我是 Maya。这里是一个完全安全、温暖且没有评判的倾诉空间。先放松做一次深呼吸，今天有什么心事或感受，想和我聊聊吗？",
      liamWelcome: "你好，我是 Liam。如果最近感到有些压力或思绪混乱，我们可以一步步慢慢拆解，一起找回内心的清晰与平静。最近发生了什么？",
    },
    breathe: {
      title: "呼吸疗愈空间",
      subtitle: "跟随科学呼吸节律，调节自主神经系统，舒缓焦虑与身心压力",
      start: "开始呼吸练习",
      pause: "暂停练习",
      startBreathing: "开始练习",
      reset: "重置",
      soundOn: "432Hz 颂钵: 开启",
      soundOff: "颂钵: 静音",
      ready: "准备开始",
      readyGuide: "点击下方按钮，跟随愈疗呼吸球同步呼吸节奏。",
      lungCapacity: "肺容积",
      mechanism: "神经生理学机制：",
      completed: "已完成：",
      cycles: "周期",
      streak: "连续练习中",
      groundingTitle: "5-4-3-2-1 感官着陆技术",
      groundingSub: "极速平息焦虑、恐慌与反刍思绪",
      listenVoice: "🔊 播放语音引导",
      phaseInhale: "深长吸气",
      phaseHold: "轻柔屏息",
      phaseExhale: "缓慢呼气",
      phasePrepare: "准备开始...",
    },
    mood: {
      headerBadge: "每日情绪雷达与思绪梳理",
      headerTitle: "记录心绪状态，温和梳理思绪",
      headerSub: "基于循证认知行为疗法 (CBT) 与正念反思，觉察内心细微变化。",
      checkinTitle: "每日心情记录",
      checkinSub: "觉察并接纳此时此刻的真实感受",
      step1: "1. 选择你此刻的主要情绪状态：",
      energy: "身心能量",
      energyDepleted: "🔋 极度耗竭",
      energyEnergized: "⚡ 充沛有活力",
      valence: "情绪效价（愉悦度）",
      valenceLow: "🌧️ 深度低落",
      valenceHigh: "☀️ 愉悦开朗",
      step2: "2. 背景或诱发因素（选填）：",
      notePlaceholder: "例如：工作时间紧迫引发了我的过度担忧与自责...",
      reflectBtn: "开启对话倾诉",
      saveBtn: "保存心情记录",
      saved: "已保存！",
      reframeTitle: "CBT 想法梳理向导",
      reframeSub: "识别思维盲区，找寻温和客观视角",
      antTitle: "脑海中涌现的消极想法：",
      antPlaceholder: "例如：如果这次没做好，就证明我很无能...",
      distortionTitle: "可能的思维倾向：",
      reframeBtn: "梳理想法 / 寻找平衡视角",
      reframing: "正在梳理中...",
      reframingText: "正在梳理更客观温和的视角...",
      groundingCardTitle: "30秒感官着陆 (5-4-3-2-1)",
      groundingVoiceBtn: "🔊 播放语音引导",
      groundingDesc: "环顾四周并留意：5 件你能看到的物品，4 种你能触摸的质感，3 种你能听到的声音，2 种你能闻到的气味，最后做 1 次深长的平稳呼吸。",
    },
    guide: {
      headerBadge: "思绪梳理工作坊",
      headerTitle: "理解内心感受，温和梳理思绪",
      headerSub: "基于循证 CBT 的温和练习 — 包含想法梳理向导与身心状态自测。",
      assessCardTitle: "心境与状态自测",
      assessCardSub: "10道轻量自测题，生成多维度状态报告",
      assessCardDesc: "回答简短的自测问卷，梳理近期的思维倾向、身心能量状态与注意力分布。",
      assessPrivacy: "所有数据仅保存在您的本地浏览器中，绝不上载云端。",
      startAssessBtn: "开始自测",
      lastSnapshot: "最近一次记录：",
      noSnapshot: "暂无自测记录，首次完成约需 3 分钟。",
      reframeCardTitle: "想法梳理向导",
      reframeCardSub: "7步 CBT 想法记录单，循序渐进梳理心结",
      reframeCardDesc: "记录具体情境，识别自动涌现的念头，探查背后的思维倾向，找寻支持与反对证据，最终写下一个更温和客观的平衡视角。",
      resumeDraft: "继续上次草稿",
      newReframe: "开始新梳理",
      discardDraft: "放弃草稿重新开始",
      backHome: "返回工作坊主页",
      stepSituation: "情境",
      stepThought: "念头",
      stepEmotion: "情绪",
      stepDistortion: "偏差",
      stepEvidence: "证据",
      stepReframe: "梳理",
      stepSummary: "总结",
      nextStep: "下一步",
      prevStep: "上一步",
      complete: "完成梳理",
    },
    me: {
      title: "个人中心与咨询偏好设置",
      subtitle: "自定义你的疗愈档案、专属咨询师与对话偏好",
      userName: "用户昵称",
      counselorName: "咨询师姓名",
      defaultVoice: "默认音色",
      selectAvatar: "选择或上传头像",
      saveProfile: "保存偏好设置",
      savedSuccess: "偏好设置已成功保存！",
    },
    voice: {
      modalTitle: "AI 咨询师电话关怀",
      callButton: "发起电话关怀",
      callingStatus: "通话连接中...",
    },
  },
} as const;

const LanguageContext = createContext<I18nContextType | null>(null);

function resolveTranslation(lang: Language, path: string, fallback?: string): string {
  const keys = path.split(".");
  let current: any = translations[lang];
  for (const k of keys) {
    if (current && typeof current === "object" && k in current) {
      current = current[k];
    } else {
      current = undefined;
      break;
    }
  }

  if (typeof current === "string") return current;

  // Fallback to English
  if (lang !== "en") {
    let enCurrent: any = translations.en;
    for (const k of keys) {
      if (enCurrent && typeof enCurrent === "object" && k in enCurrent) {
        enCurrent = enCurrent[k];
      } else {
        return fallback || path;
      }
    }
    if (typeof enCurrent === "string") return enCurrent;
  }

  return fallback || path;
}

export const LanguageProvider: React.FC<{
  children: React.ReactNode;
  initialLanguage?: Language;
}> = ({ children, initialLanguage }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (initialLanguage) return initialLanguage;
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored === "zh" || stored === "en") {
          return stored;
        }
        if (navigator.language && navigator.language.toLowerCase().startsWith("zh")) {
          return "zh";
        }
      }
    } catch {
      // ignore
    }
    return "en";
  });

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === "zh" ? "en" : "zh";
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
        }
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      return resolveTranslation(language, key, fallback);
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): I18nContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback for unprovided trees (e.g. unit tests or SSR)
    return {
      language: "en",
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key: string, fallback?: string) => resolveTranslation("en", key, fallback),
    };
  }
  return context;
}
