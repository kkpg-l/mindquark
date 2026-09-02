# Sentience_v2 深入代码分析：8步CBT Thought Reframer 完整实现详解

> 仓库地址：https://github.com/NyX-K1/Sentience_v2
> 技术栈：React 18 + Vite 5 + TypeScript 5 + Tailwind CSS 3 + Framer Motion + Supabase + Groq API (Llama 3.3 70B)

---

## 目录

1. [整体架构概览](#1-整体架构概览)
2. [核心类型定义](#2-核心类型定义)
3. [12个子组件接口与实现详解](#3-12个子组件接口与实现详解)
4. [951种情绪数据库结构](#4-951种情绪数据库结构)
5. [步骤间导航与进度管理](#5-步骤间导航与进度管理)
6. [草稿自动保存机制](#6-草稿自动保存机制)
7. [LLM API 交互方式](#7-llm-api-交互方式)
8. [数据库 Schema（Supabase 映射）](#8-数据库-schemasupabase-映射)
9. [可直接复用的 React 组件接口设计要点](#9-可直接复用的-react-组件接口设计要点)

---

## 1. 整体架构概览

### 文件目录结构

```
src/
├── pages/
│   └── ThoughtReframer.tsx          # 主编排页面（视图路由 + 步骤调度）
├── components/
│   └── thought-reframer/            # 12个CBT子组件
│       ├── SituationStep.tsx        # 步骤1：情境描述
│       ├── ThoughtTrapStep.tsx      # 步骤2：自动思维捕获
│       ├── EmotionCheckStep.tsx     # 步骤3：情绪标记
│       ├── DistortionDetective.tsx  # 步骤4：认知扭曲侦探
│       ├── EvidenceScale.tsx        # 步骤5：证据衡量
│       ├── ReframeStep.tsx          # 步骤6/7：认知重构
│       ├── ShiftStep.tsx            # 步骤7：信念转变测量
│       ├── TakeawayStep.tsx         # 步骤8：总结与收获
│       ├── AICompanion.tsx          # 通用AI辅助组件（可复用）
│       ├── ProgressBar.tsx          # 进度条
│       ├── StepTransition.tsx       # 步骤过渡动画
│       └── DistortionIcon.tsx       # 扭曲图标映射
├── hooks/
│   ├── useReframerSession.ts        # 会话状态管理 + 草稿保存 + 提交
│   └── useReframerHistory.ts        # 历史记录读取 + 分析统计
├── types/
│   ├── reframer.ts                  # ThoughtReframerSession 等类型
│   └── mood.ts                      # EmotionDef 等类型
└── data/
    ├── emotions.ts                  # 951种情绪数据库
    ├── distortions.ts               # 16种认知扭曲定义
    └── reframePrompts.ts            # 重构提示语 + 应对建议 + 危机关键词
```

### 数据流架构

```
ThoughtReframer.tsx (页面层)
  │
  ├── useReframerSession()  ──→ 持有单一 session 状态对象
  │     ├── session (ThoughtReframerSession)
  │     ├── updateSession(partial)
  │     ├── goToStep(step)
  │     ├── completeSession()
  │     └── 草稿自动保存 → localStorage
  │
  ├── useReframerHistory()  ──→ 从 Supabase 读取历史
  │     ├── sessions[]
  │     ├── deleteSession(id)
  │     └── analytics (统计聚合)
  │
  └── 渲染当前步骤组件 ← 传入 session 字段 + onUpdate/onContinue/onBack
        └── 子组件内部可嵌入 AICompanion (步骤4/5/6)
```

### 核心设计模式

- **受控组件模式**：所有子组件不持有业务状态，通过 `onUpdate(partial)` 回调将数据上浮到 `session` 对象
- **渐进式表单**：每个步骤只关注自己的数据片段，通过 `Partial<ThoughtReframerSession>` 类型安全地更新
- **单向数据流**：父组件持有唯一真相源（session），子组件纯展示 + 回调上报

---

## 2. 核心类型定义

### `ThoughtReframerSession`（会话状态对象）

```typescript
// src/types/reframer.ts

export interface ThoughtReframerSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  currentStep: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;  // 字面量联合类型，确保步骤安全
  isComplete: boolean;

  // ── Step 1: 情境 ──
  situation: string;
  contextTags: string[];
  situationDate?: string;

  // ── Step 2: 自动思维 ──
  automaticThought: string;
  initialBelief: number;               // 0-100

  // ── Step 3: 情绪 ──
  initialEmotions: { emotionId: string; intensity: number }[];
  bodyMapRegions?: { region: string; sensation: string }[];

  // ── Step 4: 认知扭曲 ──
  identifiedDistortions: string[];      // distortion ID 数组

  // ── Step 5: 证据 ──
  evidenceFor: string[];
  evidenceAgainst: string[];

  // ── Step 6/7: 重构 ──
  reframedThoughts: string[];
  selectedReframe: string;

  // ── Step 7: 信念转变 ──
  finalBelief: number;                  // 0-100
  finalEmotions: { emotionId: string; intensity: number }[];
  beliefShift: number;                  // initialBelief - finalBelief

  // ── Step 8: 收获 ──
  personalTakeaway?: string;
  copingSuggestions: string[];

  // ── 元信息 ──
  durationMinutes?: number;
  source: 'manual' | 'mood-flow' | 'journal-flow';
}
```

### `CognitiveDistortion`（认知扭曲定义）

```typescript
// src/types/reframer.ts

export interface CognitiveDistortion {
  id: string;              // 如 'all-or-nothing'
  name: string;            // 如 'All-or-Nothing Thinking'
  hook: string;            // 一句话钩子，如 "If it's not perfect, it's a disaster."
  icon: string;            // emoji 图标
  definition: string;      // 详细定义
  examples: string[];      // 典型例子数组
  realityCheck: string;    // 现实检验问题
  visualMetaphor: string;  // 视觉隐喻
  colorAccent: string;     // 主题色（十六进制）
  oppositeSkill: string;   // 对应的应对技能
}
```

### `EmotionDef`（情绪定义）

```typescript
// src/types/mood.ts

export type EmotionFamily =
  'Joy' | 'Trust' | 'Fear' | 'Surprise' |
  'Sadness' | 'Disgust' | 'Anger' | 'Anticipation' | 'Complex';

export interface EmotionDef {
  id: string;              // 如 'joy-ecstatic'
  label: string;           // 如 'Ecstatic'
  family: EmotionFamily;
  intensity: 1 | 2 | 3 | 4;
  valence: number;         // -1 到 1
  arousal: number;         // 0 到 1
  colorHex: string;        // 主题色
  quadrant: 'tense' | 'energized' | 'low' | 'calm';
  definition?: string;
  example?: string;
  bodySignals?: string[];
  cognitivePatterns?: string[];
  behavioralTendencies?: string[];
  healthyResponses?: string[];
  didYouKnow?: string;
  subFamily?: string;
  otherAttributes?: string;
}
```

---

## 3. 12个子组件接口与实现详解

### 组件依赖关系图

```
ThoughtReframer.tsx
 ├── ProgressBar
 ├── StepTransition
 ├── SituationStep          (步骤1)
 ├── ThoughtTrapStep         (步骤2)
 ├── EmotionCheckStep        (步骤3)
 ├── DistortionDetective     (步骤4) ──→ AICompanion + DistortionIcon
 ├── EvidenceScale           (步骤5) ──→ AICompanion
 ├── ReframeStep             (步骤6) ──→ AICompanion
 ├── ShiftStep               (步骤7)
 └── TakeawayStep            (步骤8) ──→ DistortionIcon
```

---

### 3.1 SituationStep（步骤1：情境描述）

```typescript
interface SituationStepProps {
  situation: string;
  contextTags: string[];
  onUpdate: (data: { situation?: string; contextTags?: string[] }) => void;
  onContinue: () => void;
  // 注意：步骤1没有 onBack（第一步无法后退）
}
```

**实现要点：**
- 受控 `<textarea>`，最大 1000 字符，实时字符计数
- 继续按钮在 `situation.trim().length < 20` 时禁用
- `contextTags` 从 `CONTEXT_TAGS` 常量数组中选择（Work/Relationship/Family 等 10 个标签）
- 设计意图：引导用户用客观视角描述（"什么会被摄像机记录下来"）

```typescript
// 核心验证逻辑
disabled={situation.trim().length < 20}  // 至少20字符才能继续
onChange限制：e.target.value.length <= 1000
```

---

### 3.2 ThoughtTrapStep（步骤2：自动思维捕获）

```typescript
interface ThoughtTrapStepProps {
  automaticThought: string;
  initialBelief: number;   // 0-100
  onUpdate: (data: { automaticThought?: string; initialBelief?: number }) => void;
  onContinue: () => void;
  onBack: () => void;
}
```

**实现要点：**
- 文本区最大 500 字符
- 信念强度滑块 `<input type="range" min={0} max={100}>`
- 5 级描述标签动态匹配信念值：

```typescript
const BELIEF_LABELS = [
  { max: 20, text: 'A whisper in the back of your mind' },
  { max: 40, text: "It's there, nudging you" },
  { max: 60, text: "It's got a grip on you" },
  { max: 80, text: 'It feels very real' },
  { max: 100, text: 'It feels like absolute truth' }
];
```

- 滑块轨道动态渐变色：根据 `initialBelief` 值改变透明度
- 继续条件：`automaticThought.trim().length < 10` 时禁用

---

### 3.3 EmotionCheckStep（步骤3：情绪标记）

```typescript
interface EmotionCheckStepProps {
  initialEmotions: { emotionId: string; intensity: number }[];
  onUpdate: (data: { initialEmotions: { emotionId: string; intensity: number }[] }) => void;
  onContinue: () => void;
  onBack: () => void;
}
```

**实现要点：**
- **两层级联选择 UI**：先选情绪家族（9个），再选该家族下的具体情绪
- 家族按钮展开/折叠使用 `AnimatePresence` + 高度动画
- 每个家族限制展示前 30 个情绪（`.slice(0, 30)`）
- 选中情绪后展示 1-10 强度滑块
- 内部状态：`expandedFamily`（当前展开的家族）

```typescript
// 情绪选择/取消逻辑
const toggleEmotion = (emotionId: string) => {
  const existing = initialEmotions.find(e => e.emotionId === emotionId);
  if (existing) {
    onUpdate({ initialEmotions: initialEmotions.filter(e => e.emotionId !== emotionId) });
  } else {
    onUpdate({ initialEmotions: [...initialEmotions, { emotionId, intensity: 5 }] });
  }
};

// 强度更新逻辑
const updateIntensity = (emotionId: string, intensity: number) => {
  onUpdate({
    initialEmotions: initialEmotions.map(e =>
      e.emotionId === emotionId ? { ...e, intensity } : e
    )
  });
};
```

- 9 个情绪家族常量定义（含 emoji 图标 + 渐变色方案）：

```typescript
const FAMILIES = [
  { family: 'Joy',         icon: '😊', color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30' },
  { family: 'Trust',       icon: '🤝', color: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30' },
  { family: 'Fear',        icon: '😰', color: 'from-violet-500/20 to-fuchsia-500/20 border-violet-500/30' },
  { family: 'Surprise',    icon: '😲', color: 'from-sky-500/20 to-cyan-500/20 border-sky-500/30' },
  { family: 'Sadness',     icon: '😢', color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30' },
  { family: 'Disgust',     icon: '🤢', color: 'from-lime-500/20 to-green-500/20 border-lime-500/30' },
  { family: 'Anger',       icon: '😤', color: 'from-red-500/20 to-rose-500/20 border-red-500/30' },
  { family: 'Anticipation',icon: '⏳', color: 'from-orange-500/20 to-amber-500/20 border-orange-500/30' },
  { family: 'Complex',     icon: '🌀', color: 'from-zinc-500/20 to-slate-500/20 border-zinc-500/30' },
];
```

---

### 3.4 DistortionDetective（步骤4：认知扭曲侦探）

```typescript
interface DistortionDetectiveProps {
  automaticThought: string;
  identifiedDistortions: string[];
  onUpdate: (data: { identifiedDistortions: string[] }) => void;
  onContinue: () => void;
  onBack: () => void;
}
```

**实现要点：**
- **顶部钉住的"思维标本"**：展示用户的自动思维（只读），下方显示已选扭曲标签
- **16 个扭曲卡片**，网格布局（2列），可展开/折叠
- 每个卡片展开后显示：定义、例子（3个）、现实检验问题、视觉隐喻
- 选中状态使用扭曲自身的 `colorAccent` 动态着色

```typescript
// 扭曲选择/取消逻辑
const toggleDistortion = (id: string) => {
  const updated = identifiedDistortions.includes(id)
    ? identifiedDistortions.filter(d => d !== id)
    : [...identifiedDistortions, id];
  onUpdate({ identifiedDistortions: updated });
};
```

- **嵌入 AICompanion** 用于 AI 自动检测扭曲：

```typescript
<AICompanion
  accentColor="amber"
  buttonLabel="AI: Detect my distortions"
  systemPrompt={`...识别认知扭曲，返回 JSON: { observation, suggestions: ["distortion-id"] }...
    The valid distortion IDs are: ${COGNITIVE_DISTORTIONS.map(d => d.id).join(', ')}.`}
  userContext={`My automatic thought is: "${automaticThought}"`}
  renderSuggestion={(id, i) => {
    // 自定义渲染：返回可点击的扭曲选择按钮
    const d = COGNITIVE_DISTORTIONS.find(cd => cd.id === id);
    // ...
  }}
/>
```

- 关键设计：AI 返回的 `suggestions` 是 distortion ID 数组（而非文本），通过 `renderSuggestion` 自定义渲染为可选择的卡片
- 无需选择扭曲也可继续（允许跳过）

---

### 3.5 EvidenceScale（步骤5：证据衡量）

```typescript
interface EvidenceScaleProps {
  evidenceFor: string[];       // 支持负面思维的证据
  evidenceAgainst: string[];   // 反驳负面思维的证据
  automaticThought?: string;
  onUpdate: (data: { evidenceFor?: string[]; evidenceAgainst?: string[] }) => void;
  onContinue: () => void;
  onBack: () => void;
}
```

**实现要点：**
- **双标签页界面**（For / Against），颜色区分：玫红（支持）vs 青色（反驳）
- **平衡进度条**：根据双方数量比例动态显示宽度（spring 动画）

```typescript
const ratio = total === 0 ? 0.5 : totalAgainst / total;
// 0 = 全部支持, 1 = 全部反驳, 0.5 = 平衡
```

- **引导提示芯片**：每个标签页有 3-5 个预设引导问题，点击填入输入框

```typescript
const FOR_PROMPTS = [
  "What facts support this thought?",
  "Has something like this happened before?",
  "Would others agree this is true?"
];
const AGAINST_PROMPTS = [
  "What facts contradict this thought?",
  "Have there been exceptions to this?",
  "What would a supportive friend say?",
  "Am I ignoring anything positive?",
  "Is this based on feelings or facts?"
];
```

- **智能总结**：根据证据比例生成动态反馈文案
- **嵌入 AICompanion** 用于 AI 生成反驳证据：

```typescript
<AICompanion
  accentColor="teal"
  buttonLabel="AI: Generate counter-evidence"
  systemPrompt={`...生成3-4个反驳证据...
    Return ONLY raw JSON: { observation, suggestions: [...] }`}
  userContext={`My automatic thought is: "${automaticThought}"
    Evidence FOR: ${evidenceFor.join('; ')}
    Evidence AGAINST: ${evidenceAgainst.join('; ')}`}
  onUseSuggestion={(suggestion) => {
    onUpdate({ evidenceAgainst: [...evidenceAgainst, suggestion] });
    setActiveTab('against');
  }}
/>
```

- 继续条件：至少添加一条证据

---

### 3.6 ReframeStep（步骤6/7：认知重构）

```typescript
interface ReframeStepProps {
  automaticThought: string;
  identifiedDistortions: string[];
  reframedThoughts: string[];
  selectedReframe: string;
  onUpdate: (data: {
    reframedThoughts?: string[];
    selectedReframe?: string;
  }) => void;
  onContinue: () => void;
  onBack: () => void;
}
```

**实现要点：**
- **原始思维展示框**（玫红背景）：始终显示用户的自动思维
- **应对技能建议**：根据首个识别的扭曲动态匹配

```typescript
const copingSuggestion = identifiedDistortions.length > 0
  ? COPING_SUGGESTIONS[identifiedDistortions[0]]
  : null;
```

- **5个引导重构提示**（来自 `REFRAME_PROMPTS`），点击后自动填入起句

```typescript
export const REFRAME_PROMPTS: ReframePrompt[] = [
  { id: 'friend-advice',       icon: '🗣️', text: 'What would I tell a close friend...?', starter: 'If my friend told me this, I would say...' },
  { id: 'evidence-based',      icon: '⚖️', text: 'Based on the evidence...',            starter: 'Looking at the evidence, a more balanced view is...' },
  { id: 'future-perspective',  icon: '🔮', text: 'In 6 months, will I see this...',     starter: 'In 6 months, I will probably see this as...' },
  { id: 'realistic-outcome',   icon: '🔬', text: "What's the most realistic outcome?",   starter: 'The most realistic outcome is probably...' },
  { id: 'control-check',       icon: '🧩', text: 'What part is in my control?',          starter: 'What I can control is... What I can\'t control is...' },
];
```

- **已保存重构列表**：用户可从多个重构中选择最佳方案（`selectReframe`）
- **嵌入 AICompanion** 用于 AI 生成重构：

```typescript
<AICompanion
  accentColor="emerald"
  buttonLabel="AI: Generate reframes for me"
  systemPrompt={`...生成3个平衡的重构思维...
    每个需：直接针对该思维、用第一人称、自然不临床`}
  userContext={`自动思维: "${automaticThought}"
    已识别扭曲: ${identifiedDistortions.map(id => distortionName).join(', ')}
    已写重构: ${reframedThoughts.join(' | ')}`}
  onUseSuggestion={(suggestion) => {
    const updated = [...reframedThoughts, suggestion];
    onUpdate({ reframedThoughts: updated, selectedReframe: suggestion });
  }}
/>
```

- 继续条件：必须选择一个重构方案（`!selectedReframe` 时禁用）

---

### 3.7 ShiftStep（步骤7：信念转变测量）

```typescript
interface ShiftStepProps {
  automaticThought: string;
  selectedReframe: string;
  initialBelief: number;
  finalBelief: number;
  initialEmotions: { emotionId: string; intensity: number }[];
  finalEmotions: { emotionId: string; intensity: number }[];
  onUpdate: (data: {
    finalBelief?: number;
    finalEmotions?: { emotionId: string; intensity: number }[];
  }) => void;
  onContinue: () => void;
  onBack: () => void;
}
```

**实现要点：**
- **Before/After 对比卡片**：左右分栏展示原始思维 vs 重构思维
- **信念重评滑块**（0-100），动态渐变填充
- **转变指标计算**：

```typescript
const beliefShift = initialBelief - finalBelief;
const shiftDirection = beliefShift > 0 ? 'down' : beliefShift < 0 ? 'up' : 'same';

const getShiftMessage = () => {
  if (beliefShift >= 30) return "🌟 Significant shift! ...";
  if (beliefShift >= 15) return "💪 Good work — ...";
  if (beliefShift >= 5)  return "📊 Even a small shift ...";
  if (beliefShift > 0)   return "Every degree of change matters. ...";
  if (beliefShift === 0) return "No shift yet — that's okay. ...";
  return "Your belief went up — that can happen. ...";
};
```

- **情绪重检**：可折叠的情绪选择器（复用情绪家族选择 UI），展示初始情绪 vs 当前情绪对比

---

### 3.8 TakeawayStep（步骤8：总结与收获）

```typescript
interface TakeawayStepProps {
  situation: string;
  automaticThought: string;
  selectedReframe: string;
  initialBelief: number;
  finalBelief: number;
  identifiedDistortions: string[];
  initialEmotions: { emotionId: string; intensity: number }[];
  finalEmotions: { emotionId: string; intensity: number }[];
  personalTakeaway?: string;
  onUpdate: (data: { personalTakeaway?: string }) => void;
  onComplete: () => void;      // 提交保存
  onBack: () => void;
  onStartNew: () => void;
  isSaving?: boolean;          // 保存中状态
}
```

**实现要点：**
- **完整会话摘要**：情境 → 思维转变对比 → 信念转变幅度 → 识别扭曲 → 情绪前后 → 应对技能建议
- **个人收获输入**（可选 `<textarea>`）
- **保存按钮**带 loading 状态（`isSaving`），显示 "Saving to Journal..."

```typescript
// 完成时的保存按钮
<motion.button
  onClick={onComplete}
  disabled={isSaving}
  className="..."
>
  {isSaving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
  {isSaving ? 'Saving to Journal...' : 'Save & Complete Session'}
</motion.button>
```

- **底部双按钮**：返回修改 / 开始新会话
- 自动汇总应对技能：

```typescript
const copingSkills = identifiedDistortions
  .map(id => COPING_SUGGESTIONS[id])
  .filter(Boolean);
```

---

### 3.9 AICompanion（通用AI辅助组件 — 可复用核心组件）

```typescript
export interface AIResponse {
  suggestions: string[];
  observation: string;
}

interface AICompanionProps {
  systemPrompt: string;            // AI 系统提示
  userContext: string;             // 用户上下文数据
  buttonLabel?: string;            // 触发按钮文字（默认 'Ask AI for help'）
  accentColor?: 'violet' | 'teal' | 'emerald' | 'amber';  // 主题色
  onUseSuggestion?: (suggestion: string) => void;           // 点击建议回调
  renderSuggestion?: (suggestion: string, index: number) => React.ReactNode;  // 自定义建议渲染
}
```

**内部状态：**
```typescript
const [isOpen, setIsOpen] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [result, setResult] = useState<AIResponse | null>(null);
const [error, setError] = useState('');
```

**API 调用逻辑：**
```typescript
const fetchAI = async () => {
  setIsLoading(true);
  setError('');
  setResult(null);
  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,  // import.meta.env.VITE_GROQ_API_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },   // 强制 JSON 输出
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContext },
        ],
      }),
    });
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content) as AIResponse;
    setResult(parsed);
  } catch (err: any) {
    setError('AI is unavailable right now. Try again in a moment.');
  } finally {
    setIsLoading(false);
  }
};
```

**UI 行为：**
- 触发按钮点击时自动发起请求（无需额外确认）
- 弹出面板使用 spring 动画向上展开
- 加载态：旋转 Sparkles 图标 + 文字提示
- 结果展示：Observation 区块 + 可点击的 Suggestions 列表
- 支持 "Regenerate"（重新生成）和关闭
- **关键设计**：`renderSuggestion` 允许调用方完全自定义建议项的渲染方式（如 DistortionDetective 中渲染为扭曲选择卡片）

---

### 3.10 ProgressBar（进度条）

```typescript
interface ProgressBarProps {
  currentStep: number;
  totalSteps?: number;  // 默认 8
}
```

**实现要点：**
- 固定在顶部（`sticky top-0 z-50`）
- 8 个步骤段，每段有图标 + 文字标签
- 已完成步骤：100% 填充；当前步骤：50% 填充；未到步骤：空
- 每段颜色使用 HSL 渐变，根据步骤索引计算色相

```typescript
const STEP_ICONS = ['📍', '💭', '🫀', '🔍', '⚖️', '🔄', '📊', '✨'];
const STEP_LABELS = ['Situation', 'Thought', 'Emotion', 'Distortion', 'Evidence', 'Reframe', 'Shift', 'Takeaway'];

// 渐变色计算
background: `linear-gradient(90deg,
  hsl(${220 + (step * 18)}, 70%, 50%),
  hsl(${220 + ((step + 1) * 18)}, 65%, 55%)
)`
```

---

### 3.11 StepTransition（步骤过渡动画）

```typescript
interface StepTransitionProps {
  stepKey: number;        // 当前步骤编号（作为 AnimatePresence 的 key）
  direction: number;      // 1 = 前进, -1 = 后退
  children: ReactNode;
}
```

**实现要点：**
- 基于 Framer Motion 的 `AnimatePresence` + `custom` 实现方向感知过渡
- 前进：新页面从右侧 (x:300) 滑入，旧页面向左 (x:-300) 滑出
- 后退：新页面从左侧 (x:-300) 滑入，旧页面向右 (x:300) 滑出
- spring 动画：stiffness=300, damping=30

```typescript
const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.96
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    scale: 0.96
  })
};
```

---

### 3.12 DistortionIcon（扭曲图标映射）

```typescript
interface DistortionIconProps {
  distortionId: string;
  size?: number;     // 默认 16
  className?: string;
  color?: string;
}
```

**实现要点：**
- 将 16 种认知扭曲 ID 映射到 Lucide React SVG 图标
- 替代 emoji，提供更精致的视觉一致性
- 未匹配时 fallback 到 `Circle` 图标

```typescript
const ICON_MAP = {
  'all-or-nothing':           Circle,
  'overgeneralization':       RefreshCw,
  'mental-filter':            Search,
  'disqualifying-positive':   XCircle,
  'fortune-telling':          Sparkles,
  'catastrophizing':          Maximize,
  'minimization':             Minimize,
  'emotional-reasoning':      HeartPulse,
  'should-statements':        Ruler,
  'labeling':                 Tag,
  'personalization':          Target,
  'blame':                    ArrowRight,
  'fallacy-of-fairness':      Scale,
  'fallacy-of-change':        Wrench,
  'heavens-reward':           Trophy,
  // jumping-to-conclusions/magnification -> Brain/Maximize
};
```

---

## 4. 951种情绪数据库结构

### 数据存储位置
`src/data/emotions.ts` — 由 Gemini LLM 扩展脚本自动生成

### JSON Schema（TypeScript 接口）

```typescript
export interface EmotionDef {
  // ── 核心标识 ──
  id: string;              // 格式: "{family}-{label-lowercase}"，如 "joy-ecstatic"
  label: string;           // 显示名称，如 "Ecstatic"
  family: EmotionFamily;   // 9 大家族之一

  // ── 量化维度 ──
  intensity: 1 | 2 | 3 | 4;    // 内禀强度等级（1=轻微, 4=极强）
  valence: number;              // 效价 -1 到 1（负=不愉快, 正=愉快）
  arousal: number;              // 唤醒度 0 到 1（0=平静, 1=极度激动）
  colorHex: string;             // 十六进制主题色，如 "#FDE047"
  quadrant: 'tense' | 'energized' | 'low' | 'calm';  // 情感象限

  // ── 描述性字段（可选，由AI生成） ──
  definition?: string;              // 详细定义（1-3句）
  example?: string;                 // 典型场景，用 " | " 分隔多个
  bodySignals?: string[];           // 身体信号列表
  cognitivePatterns?: string[];     // 认知模式
  behavioralTendencies?: string[];  // 行为倾向
  healthyResponses?: string[];      // 健康应对方式
  didYouKnow?: string;              // 趣味知识
  subFamily?: string;               // 子家族
  otherAttributes?: string;         // 其他属性（用 " | " 分隔）
}
```

### 数据示例

```json
{
  "id": "joy-ecstatic",
  "label": "Ecstatic",
  "family": "Joy",
  "intensity": 4,
  "valence": 0.8,
  "arousal": 0.8,
  "colorHex": "#FDE047",
  "quadrant": "energized",
  "definition": "An overwhelming feeling of intense joy...",
  "example": "Receiving news of a dream job offer... | Witnessing a miraculous event...",
  "bodySignals": [
    "Wide, genuine smile, often unable to stop...",
    "Bright, sparkling eyes; dilated pupils...",
    "Rapid heart rate, feeling light or bouncy...",
    "Energetic movements, jumping, dancing..."
  ],
  "otherAttributes": "Intensity: One of the highest levels... | Duration: Often transient... | Expression: Highly expressive..."
}
```

### 9 大情绪家族

| 家族 | 中文 | Emoji | 代表色系 |
|------|------|-------|---------|
| Joy | 喜悦 | 😊 | 黄色/琥珀 |
| Trust | 信任 | 🤝 | 翠绿 |
| Fear | 恐惧 | 😰 | 紫色/紫红 |
| Surprise | 惊讶 | 😲 | 天蓝/青色 |
| Sadness | 悲伤 | 😢 | 蓝色/靛蓝 |
| Disgust | 厌恶 | 🤢 | 柠檬绿 |
| Anger | 愤怒 | 😤 | 红色/玫瑰 |
| Anticipation | 期待 | ⏳ | 橙色/琥珀 |
| Complex | 复杂 | 🌀 | 灰色/石板 |

### 使用方式

```typescript
import { emotions } from '../data/emotions';

// 按家族过滤
emotions.filter(e => e.family === 'Joy')

// 按 ID 查找
emotions.find(e => e.id === 'joy-ecstatic')

// 按强度排序
emotions.filter(e => e.intensity >= 3 && e.valence > 0.5)
```

---

## 5. 步骤间导航与进度管理

### 页面级视图状态

```typescript
// ThoughtReframer.tsx
type View = 'landing' | 'session' | 'history' | 'completed';

const [view, setView] = useState<View>('landing');
const [direction, setDirection] = useState(1);  // 过渡方向
```

### 步骤导航逻辑

```typescript
const nextStep = useCallback(() => {
  if (session.currentStep < 8) {
    setDirection(1);
    goToStep((session.currentStep + 1) as any);
  }
}, [session.currentStep, goToStep]);

const prevStep = useCallback(() => {
  if (session.currentStep > 1) {
    setDirection(-1);
    goToStep((session.currentStep - 1) as any);
  }
}, [session.currentStep, goToStep]);
```

### 步骤组件调度（渲染逻辑）

ThoughtReframer.tsx 的 session 视图根据 `session.currentStep` 渲染对应组件，每次都用 `StepTransition` 包裹：

```typescript
// 伪代码（基于源码模式推断）
{view === 'session' && (
  <StepTransition stepKey={session.currentStep} direction={direction}>
    {session.currentStep === 1 && (
      <SituationStep
        situation={session.situation}
        contextTags={session.contextTags}
        onUpdate={updateSession}
        onContinue={nextStep}
      />
    )}
    {session.currentStep === 2 && (
      <ThoughtTrapStep
        automaticThought={session.automaticThought}
        initialBelief={session.initialBelief}
        onUpdate={updateSession}
        onContinue={nextStep}
        onBack={prevStep}
      />
    )}
    {session.currentStep === 3 && (
      <EmotionCheckStep
        initialEmotions={session.initialEmotions}
        onUpdate={updateSession}
        onContinue={nextStep}
        onBack={prevStep}
      />
    )}
    {session.currentStep === 4 && (
      <DistortionDetective
        automaticThought={session.automaticThought}
        identifiedDistortions={session.identifiedDistortions}
        onUpdate={updateSession}
        onContinue={nextStep}
        onBack={prevStep}
      />
    )}
    {session.currentStep === 5 && (
      <EvidenceScale
        evidenceFor={session.evidenceFor}
        evidenceAgainst={session.evidenceAgainst}
        automaticThought={session.automaticThought}
        onUpdate={updateSession}
        onContinue={nextStep}
        onBack={prevStep}
      />
    )}
    {session.currentStep === 6 && (
      <ReframeStep
        automaticThought={session.automaticThought}
        identifiedDistortions={session.identifiedDistortions}
        reframedThoughts={session.reframedThoughts}
        selectedReframe={session.selectedReframe}
        onUpdate={updateSession}
        onContinue={nextStep}
        onBack={prevStep}
      />
    )}
    {session.currentStep === 7 && (
      <ShiftStep
        automaticThought={session.automaticThought}
        selectedReframe={session.selectedReframe}
        initialBelief={session.initialBelief}
        finalBelief={session.finalBelief}
        initialEmotions={session.initialEmotions}
        finalEmotions={session.finalEmotions}
        onUpdate={updateSession}
        onContinue={nextStep}
        onBack={prevStep}
      />
    )}
    {session.currentStep === 8 && (
      <TakeawayStep
        {...session}  // 传入所有 session 字段
        onUpdate={updateSession}
        onComplete={handleComplete}
        onBack={prevStep}
        onStartNew={handleStartNewSession}
        isSaving={isSaving}
      />
    )}
  </StepTransition>
)}
```

### ProgressBar 在 session 视图的集成

```typescript
{view === 'session' && (
  <>
    <ProgressBar currentStep={session.currentStep} />
    {/* 步骤内容 */}
  </>
)}
```

### 步骤进度数据流

```
用户交互                     状态更新                    UI 更新
─────────                    ─────────                  ────────
点击 Continue  ──→  nextStep()  ──→  goToStep(n+1)  ──→  session.currentStep 变化
                                                     ──→  ProgressBar 重新渲染（新段高亮）
                                                     ──→  StepTransition 触发退出/进入动画
                                                     ──→  新步骤组件挂载
```

### 危机关键词检测（贯穿所有步骤）

```typescript
useEffect(() => {
  const textToCheck = `${session.situation} ${session.automaticThought}`.toLowerCase();
  const hasCrisisKeyword = CRISIS_KEYWORDS.some(kw => textToCheck.includes(kw));
  setShowCrisis(hasCrisisKeyword);
}, [session.situation, session.automaticThought]);

// CRISIS_KEYWORDS = [
//   'suicidal', 'end it', 'self-harm', 'hurt myself', 'want to die',
//   'no point', "can't go on", 'kill myself', 'not worth living', 'better off dead'
// ]
```

---

## 6. 草稿自动保存机制

### 实现位置
`src/hooks/useReframerSession.ts`

### 核心机制

```typescript
const DRAFT_KEY = 'sentience_reframer_draft';

export const useReframerSession = () => {
  const [session, setSession] = useState<ThoughtReframerSession>(createEmptySession);
  const [hasDraft, setHasDraft] = useState(false);
  const startTime = useRef(Date.now());

  // 1. 挂载时检查是否有未完成的草稿
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft) as ThoughtReframerSession;
        if (!parsed.isComplete) {
          setHasDraft(true);  // 标记有可恢复的草稿
        }
      }
    } catch { /* ignore */ }
  }, []);

  // 2. 恢复草稿
  const resumeDraft = useCallback(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        setSession(JSON.parse(draft));
        setHasDraft(false);
      }
    } catch { /* ignore */ }
  }, []);

  // 3. 开启全新会话
  const startFresh = useCallback(() => {
    const fresh = createEmptySession();
    setSession(fresh);
    setHasDraft(false);
    startTime.current = Date.now();
    localStorage.removeItem(DRAFT_KEY);  // 清除草稿
  }, []);

  // 4. ★ 自动保存：session 每次变化时自动写入 localStorage
  useEffect(() => {
    if (session.situation || session.automaticThought) {
      const updated = { ...session, updatedAt: new Date().toISOString() };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
    }
  }, [session]);  // ← 依赖 session，任何字段变化都触发

  // 5. 会话更新方法
  const updateSession = useCallback(
    (updates: Partial<ThoughtReframerSession>) => {
      setSession(prev => ({
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString()
      }));
    },
    []
  );

  // 6. 步骤跳转
  const goToStep = useCallback(
    (step: ThoughtReframerSession['currentStep']) => {
      setSession(prev => ({
        ...prev,
        currentStep: step,
        updatedAt: new Date().toISOString()
      }));
    },
    []
  );
};
```

### 草稿保存触发条件
- 只有当 `session.situation` 或 `session.automaticThought` 有值时才保存（避免保存空白草稿）
- 每次 `session` 对象引用变化时自动触发（React useEffect 依赖 `[session]`）

### 完成会话时的清理

```typescript
const completeSession = useCallback(async () => {
  // ... 构建完成数据 ...
  
  // 1. 保存到 Supabase（如果用户已登录）
  if (user) {
    await supabase.from('thought_reframing_sessions').insert([{ ... }]);
  }

  // 2. 保存到本地历史 + 清除草稿
  try {
    const historyKey = 'sentience_reframer_history';
    const existing = JSON.parse(localStorage.getItem(historyKey) || '[]');
    existing.unshift(completed);                          // 添加到历史头部
    localStorage.setItem(historyKey, JSON.stringify(existing));
    localStorage.removeItem(DRAFT_KEY);                   // ★ 清除草稿
  } catch { /* ignore */ }

  setSession(completed);
  return completed;
}, [session, user]);
```

### localStorage 键名约定

| 键名 | 用途 | 生命周期 |
|------|------|---------|
| `sentience_reframer_draft` | 当前未完成会话草稿 | 写入→会话完成后清除 |
| `sentience_reframer_history` | 已完成会话的本地历史 | 持久保留 |

### Landing 页面的草稿恢复 UI

```typescript
<AnimatePresence>
  {hasDraft && (
    <motion.div className="bg-amber-500/10 border border-amber-500/20 ...">
      <Clock className="text-amber-400" />
      <p>You have an unfinished session</p>
      <p>Pick up where you left off</p>
      <button onClick={() => { resumeDraft(); setView('session'); }}>
        Resume
      </button>
    </motion.div>
  )}
</AnimatePresence>
```

---

## 7. LLM API 交互方式

### API 端点
```
POST https://api.groq.com/openai/v1/chat/completions
```

### 请求格式

```typescript
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${GROQ_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' },  // ★ 强制 JSON 模式
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContext },
    ],
  }),
});
```

### 统一响应解析

```typescript
const data = await resp.json();
const content = data.choices?.[0]?.message?.content || '{}';
const parsed = JSON.parse(content) as AIResponse;

// AIResponse 标准格式
interface AIResponse {
  observation: string;   // AI 观察/共情反馈（1-2句）
  suggestions: string[]; // 建议列表（3-4条）
}
```

### 三处 AI 调用的 System Prompt 设计

#### 步骤4 — DistortionDetective（检测扭曲）

```
You are a CBT therapist AI. Analyze the user's automatic thought and identify
which cognitive distortions are present.
Return ONLY raw JSON:
{
  "observation": "A brief, empathetic 1-2 sentence observation about THIS specific thought pattern",
  "suggestions": ["distortion-id-1", "distortion-id-2"]
}
The valid distortion IDs are: all-or-nothing, overgeneralization, ...
Pick ONLY the ones that clearly match. Usually 1-3 distortions.
```

**关键**：AI 返回的 `suggestions` 是 distortion ID 数组（不是文本描述），通过 `renderSuggestion` 回调渲染为可点击的选择按钮。

#### 步骤5 — EvidenceScale（生成反驳证据）

```
You are a CBT therapist AI. The user has an automatic thought and needs help
finding evidence AGAINST it (counter-evidence).
Generate 3-4 specific, realistic counter-evidence statements...
Return ONLY raw JSON:
{
  "observation": "...",
  "suggestions": ["counter-evidence 1", "counter-evidence 2", ...]
}
Be specific and personal to their situation. Avoid generic advice.
```

**关键**：`suggestions` 是文本数组，通过 `onUseSuggestion` 直接添加到 `evidenceAgainst`。

#### 步骤6 — ReframeStep（生成重构思维）

```
You are a CBT therapist AI. Generate 3 specific, balanced reframed thoughts.
Each reframe should:
- Directly address THIS specific thought (not generic)
- Acknowledge the kernel of truth while offering a more balanced view
- Be written in first person ("I...")
- Feel natural, not clinical
Return ONLY raw JSON:
{
  "observation": "...",
  "suggestions": ["reframed thought 1", ...]
}
```

### AI 交互的用户上下文传递模式

每个调用都将用户之前输入的数据拼接为上下文字符串：

```typescript
// 步骤5 的 userContext 构建
userContext={`My automatic thought is: "${automaticThought}"
  Evidence FOR: ${evidenceFor.join('; ')}
  Evidence AGAINST: ${evidenceAgainst.join('; ')}`}

// 步骤6 的 userContext 构建
userContext={`自动思维: "${automaticThought}"
  扭曲: ${identifiedDistortions.map(id => distortionName).join(', ')}
  已有重构: ${reframedThoughts.join(' | ')}`}
```

### 错误处理

```typescript
try {
  // ... fetch ...
} catch (err: any) {
  setError('AI is unavailable right now. Try again in a moment.');
  console.error('AI Companion error:', err);
} finally {
  setIsLoading(false);
}
```

- AI 不可用时不阻断用户流程，用户可手动完成所有步骤
- 支持 "Regenerate" 重新生成结果

---

## 8. 数据库 Schema（Supabase 映射）

### 表名：`thought_reframing_sessions`

```typescript
// useReframerSession.ts 中的 insert 映射
await supabase.from('thought_reframing_sessions').insert([{
  user_id:                    user.id,
  situation_description:      session.situation,           // text
  situation_date:             session.situationDate,       // timestamptz
  context_tags:               session.contextTags,         // text[]
  automatic_thought:          session.automaticThought,    // text
  initial_belief:             session.initialBelief,       // int (0-100)
  initial_emotions:           session.initialEmotions,     // jsonb [{emotionId, intensity}]
  physical_sensations:        [...],                       // text[]
  cognitive_distortions:      session.identifiedDistortions, // text[]
  evidence_supporting:        session.evidenceFor.join('\n'), // text
  evidence_against:           session.evidenceAgainst.join('\n'), // text
  brainstormed_alternatives:  session.reframedThoughts,    // text[]
  selected_reframe:           session.selectedReframe,     // text
  final_belief:               session.finalBelief,         // int (0-100)
  final_emotions:             session.finalEmotions,       // jsonb
  belief_shift:               beliefShift,                 // int
  takeaway:                   session.personalTakeaway,    // text
  coping_strategies:          session.copingSuggestions,   // text[]
  duration_minutes:           durationMinutes              // int
}]);
```

### 反向映射（读取时）

```typescript
// useReframerHistory.ts 中从数据库行映射回前端类型
const mappedSessions = data.map(row => ({
  id:                   row.id,
  createdAt:            row.created_at,
  situation:            row.situation_description || '',
  situationDate:        row.situation_date,
  contextTags:          row.context_tags || [],
  automaticThought:     row.automatic_thought || '',
  initialBelief:        row.initial_belief || 50,
  initialEmotions:      row.initial_emotions || [],
  identifiedDistortions: row.cognitive_distortions || [],
  evidenceFor:          row.evidence_supporting ? row.evidence_supporting.split('\n') : [],
  evidenceAgainst:      row.evidence_against ? row.evidence_against.split('\n') : [],
  reframedThoughts:     row.brainstormed_alternatives || [],
  selectedReframe:      row.selected_reframe || '',
  finalBelief:          row.final_belief || 50,
  finalEmotions:        row.final_emotions || [],
  beliefShift:          row.belief_shift || 0,
  personalTakeaway:     row.takeaway,
  copingSuggestions:    row.coping_strategies || [],
  durationMinutes:      row.duration_minutes,
  // ...
}));
```

### 分析统计（useReframerHistory）

```typescript
const analytics = {
  totalSessions: sessions.length,
  averageBeliefShift: sessions.reduce((sum, s) => sum + s.beliefShift, 0) / sessions.length,
  mostCommonDistortions: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5),
  averageDuration: sessions.reduce((sum, s) => sum + s.durationMinutes, 0) / sessions.length,
  contextTagFrequency: Object.entries(tagCounts).sort((a, b) => b[1] - a[1]),
};
```

---

## 9. 可直接复用的 React 组件接口设计要点

### 9.1 核心架构模式（推荐复用）

```typescript
// ★ 模式1：单一会话状态对象 + 受控子组件
// 所有步骤数据合并到一个大对象中，子组件通过 onUpdate(partial) 更新

interface SessionData {
  // 所有步骤的数据字段
  [key: string]: any;
}

// 父组件
function MultiStepForm() {
  const [session, setSession] = useState<SessionData>(initialSession);
  const [currentStep, setCurrentStep] = useState(1);

  const updateSession = (updates: Partial<SessionData>) => {
    setSession(prev => ({ ...prev, ...updates }));
  };

  const goToStep = (step: number) => setCurrentStep(step);

  return (
    <StepTransition stepKey={currentStep} direction={direction}>
      {currentStep === 1 && <Step1 data={session} onUpdate={updateSession} onContinue={...} />}
      {currentStep === 2 && <Step2 data={session} onUpdate={updateSession} onContinue={...} onBack={...} />}
    </StepTransition>
  );
}
```

### 9.2 统一的步骤组件 Props 接口规范

```typescript
// ★ 模式2：每个步骤组件的 Props 接口规范

interface StepComponentProps<TData, TUpdate extends Partial<TData>> {
  // 该步骤需要的数据字段（从 session 中解构传入）
  // 如 situation, automaticThought 等

  // 数据更新回调：只传需要更新的字段
  onUpdate: (data: TUpdate) => void;

  // 导航回调
  onContinue: () => void;  // 前进
  onBack?: () => void;     // 后退（第一步省略）

  // 最后一步特有
  onComplete?: () => void;
  onStartNew?: () => void;
  isSaving?: boolean;
}
```

### 9.3 AICompanion 可复用组件接口（最高复用价值）

```typescript
// ★ 这是整个项目中最值得复用的组件

interface AICompanionProps {
  systemPrompt: string;
  userContext: string;
  buttonLabel?: string;
  accentColor?: 'violet' | 'teal' | 'emerald' | 'amber';
  onUseSuggestion?: (suggestion: string) => void;
  renderSuggestion?: (suggestion: string, index: number) => React.ReactNode;
}

// 使用示例1：返回文本建议
<AICompanion
  systemPrompt="生成3个应对策略..."
  userContext={userSituation}
  onUseSuggestion={(s) => addToList(s)}
/>

// 使用示例2：返回ID数组，自定义渲染
<AICompanion
  systemPrompt="返回匹配的标签ID..."
  userContext={text}
  renderSuggestion={(id, i) => (
    <button onClick={() => toggle(id)}>{getLabel(id)}</button>
  )}
/>
```

### 9.4 草稿自动保存 Hook 接口（可直接复用）

```typescript
// ★ 模式4：泛型自动保存 Hook

function useDraftSession<T extends { isComplete: boolean }>(
  storageKey: string,
  createEmpty: () => T,
  hasContent: (s: T) => boolean
) {
  const [session, setSession] = useState<T>(createEmpty);
  const [hasDraft, setHasDraft] = useState(false);

  // 挂载检查草稿
  useEffect(() => {
    const draft = localStorage.getItem(storageKey);
    if (draft) {
      const parsed = JSON.parse(draft) as T;
      if (!parsed.isComplete) setHasDraft(true);
    }
  }, []);

  // 自动保存
  useEffect(() => {
    if (hasContent(session)) {
      localStorage.setItem(storageKey, JSON.stringify({
        ...session,
        updatedAt: new Date().toISOString()
      }));
    }
  }, [session]);

  const resumeDraft = () => {
    const draft = localStorage.getItem(storageKey);
    if (draft) {
      setSession(JSON.parse(draft));
      setHasDraft(false);
    }
  };

  const startFresh = () => {
    setSession(createEmpty());
    setHasDraft(false);
    localStorage.removeItem(storageKey);
  };

  const update = (updates: Partial<T>) =>
    setSession(prev => ({ ...prev, ...updates }));

  return { session, hasDraft, resumeDraft, startFresh, update };
}
```

### 9.5 步骤过渡动画组件（可直接复用）

```typescript
// ★ 模式5：方向感知的步骤过渡

interface StepTransitionProps {
  stepKey: number | string;
  direction: number;  // 1=前进, -1=后退
  children: ReactNode;
}

// 变体定义
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0, scale: 0.96 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0, scale: 0.96 }),
};

<AnimatePresence mode="wait" custom={direction}>
  <motion.div key={stepKey} custom={direction}
    variants={slideVariants} initial="enter" animate="center" exit="exit">
    {children}
  </motion.div>
</AnimatePresence>
```

### 9.6 进度条组件接口

```typescript
interface ProgressBarProps {
  currentStep: number;
  totalSteps?: number;  // 默认 8
}
// 自包含：内部硬编码图标和标签数组
// 可通过 props 扩展为可配置
```

### 9.7 情绪选择器组件接口

```typescript
// ★ 模式7：级联选择器（家族→具体情绪）

interface EmotionPickerProps {
  selected: { emotionId: string; intensity: number }[];
  onUpdate: (emotions: { emotionId: string; intensity: number }[]) => void;
  emotionDatabase: EmotionDef[];  // 可替换为自己的数据库
  maxPerFamily?: number;          // 默认 30
  intensityRange?: { min: number; max: number };  // 默认 1-10
}
```

### 9.8 认知扭曲选择器接口

```typescript
interface DistortionPickerProps {
  automaticThought: string;
  selected: string[];             // distortion ID 数组
  onUpdate: (ids: string[]) => void;
  distortions: CognitiveDistortion[];  // 可配置的扭曲定义数组
  enableAIDetection?: boolean;    // 是否启用 AI 自动检测
  apiKey?: string;               // AI API key
}
```

### 9.9 完整步骤组件接口速查表

| 组件 | Props | 内部状态 | 状态管理方式 |
|------|-------|---------|------------|
| SituationStep | situation, contextTags, onUpdate, onContinue | charCount | 受控（无业务状态） |
| ThoughtTrapStep | automaticThought, initialBelief, onUpdate, onContinue, onBack | 无 | 纯受控 |
| EmotionCheckStep | initialEmotions, onUpdate, onContinue, onBack | expandedFamily | 仅 UI 状态 |
| DistortionDetective | automaticThought, identifiedDistortions, onUpdate, onContinue, onBack | expandedId | 仅 UI 状态 |
| EvidenceScale | evidenceFor, evidenceAgainst, automaticThought, onUpdate, onContinue, onBack | forInput, againstInput, activeTab | 输入缓冲 + UI 状态 |
| AICompanion | systemPrompt, userContext, buttonLabel, accentColor, onUseSuggestion, renderSuggestion | isOpen, isLoading, result, error | 自管理（异步请求） |
| ReframeStep | automaticThought, identifiedDistortions, reframedThoughts, selectedReframe, onUpdate, onContinue, onBack | activePrompt, reframeInput | 输入缓冲 + UI 状态 |
| ShiftStep | automaticThought, selectedReframe, initialBelief, finalBelief, initialEmotions, finalEmotions, onUpdate, onContinue, onBack | showEmotionPicker, expandedFamily | 仅 UI 状态 |
| TakeawayStep | 所有 session 字段, onUpdate, onComplete, onBack, onStartNew, isSaving | 无 | 纯受控 |
| ProgressBar | currentStep, totalSteps | 无 | 纯展示 |
| StepTransition | stepKey, direction, children | 无 | 纯动画包装 |

---

## 10. 16 种认知扭曲完整清单

| ID | 名称 | 钩子语 | 对应技能 |
|----|------|--------|---------|
| all-or-nothing | All-or-Nothing Thinking | If it's not perfect, it's a disaster. | Spectrum Thinking |
| overgeneralization | Overgeneralization | One bad thing means everything is bad forever. | Specific Thinking |
| mental-filter | Mental Filter | Zooming in on the one bad thing. | Full Spectrum View |
| disqualifying-positive | Disqualifying the Positive | Good things don't count. | Positive Accounting |
| mind-reading | Mind Reading | I know what they're thinking (and it's bad). | Perspective Checking |
| fortune-telling | Fortune Telling | I already know this will end badly. | Possibility Thinking |
| catastrophizing | Catastrophizing | Making mountains out of molehills. | Right-Sizing |
| minimization | Minimization | My successes are tiny and don't matter. | Fair Self-Assessment |
| emotional-reasoning | Emotional Reasoning | I feel it, therefore it must be true. | Feeling-Fact Separation |
| should-statements | Should Statements | I should, I must, I have to... | Flexible Preference |
| labeling | Labeling | I AM the mistake. | Behavioral Description |
| personalization | Personalization | Everything is my fault. | Contribution Analysis |
| blame | Blame | It's entirely their fault. | Ownership + Agency |
| fallacy-of-fairness | Fallacy of Fairness | This isn't fair, so it's wrong. | Acceptance + Advocacy |
| fallacy-of-change | Fallacy of Change | If only they would change... | Internal Locus |
| heavens-reward | Heaven's Reward Fallacy | All my sacrifice will be rewarded. | Intrinsic Motivation |

---

## 总结

Sentience_v2 的 Thought Reframer 模块展现了以下工程亮点：

1. **类型安全的渐进式表单**：通过 `Partial<Session>` 更新模式，每个步骤组件只关注自己的数据片段
2. **可复用的 AI 集成**：AICompanion 组件通过 `systemPrompt` + `userContext` + `renderSuggestion` 实现高度抽象，三处 AI 调用复用同一组件
3. **优雅的草稿持久化**：localStorage 自动保存 + Landing 页面恢复提示，用户体验无缝
4. **结构化 LLM 交互**：利用 Groq 的 `response_format: { type: 'json_object' }` 强制 JSON 输出，统一 `{ observation, suggestions }` 响应格式
5. **丰富的情绪数据库**：951 种情绪覆盖 9 大家族，每种情绪含效价/唤醒度/象限等多维量化数据
6. **安全优先设计**：危机关键词检测贯穿全程，匹配时展示求助热线
