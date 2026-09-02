# 引导式开导功能 · 设计文档

- **日期**: 2026-09-02
- **状态**: 已批准（用户确认三项关键决策）
- **前置检查点**: commit `229974c`
- **复用来源**: [Sentience_v2](https://github.com/NyX-K1/Sentience_v2)（CBT Thought Reframer 组件模式）、[Sentia](https://github.com/snehapandit2006/Sentia)（认知评分引擎）、[OpenGnothia](https://github.com/Lepuz-coder/opengnothia)（Intake 问卷模式）
- **调研笔记**: `docs/research/sentience_v2_thought_reframer_analysis.md`

---

## 1. 决策记录（ADR）

**决策问题**: MindQuark 如何以最小侵入方式新增"引导式开导"双模块（B：结构化干预向导 + C：认知评估引导），同时不破坏现有安全管线、LLM 容错链与视觉体系？

**已确认的三项关键决策**:

| # | 决策点 | 选择 |
|---|--------|------|
| 1 | 评估语义评分实现 | **方案A：后端 LLM 语义评分** + 前端确定性公式混合架构 |
| 2 | 引导式问卷 | **需要**（10 问 IntakeQuiz） |
| 3 | 视觉/前端构建 | **严格沿用现有 White & Emerald 风格 + GSAP 动画体系** |

**目标**:
- 新增 Guide Tab，含两个子模块（结构化干预向导、认知评估引导）
- 复用 GitHub 成熟开源模式，减少从零设计风险
- 安全管线零妥协（危机拦截、验证码、限流、双模型容错）
- 视觉与现有风格完全统一

**非目标**:
- 不做用户账号体系
- 不做服务端用户数据持久化（延续本地优先原则）
- 不做诊断级输出（所有结果为描述性、趋势性表述）

**约束**:
- CloudBase 单函数架构（Express + Serverless）
- 限流 30 次/分钟
- LLM 双模型容错链（主备切换）
- React 19 + TypeScript + Vite + Tailwind CSS v4 + GSAP 3

**被拒绝的替代方案**:

| 方案 | 拒绝原因 |
|------|---------|
| 纯前端确定性评分（方案B） | 关键词匹配无法识别变体表述，精度不足（保留为运行时降级兜底） |
| 引入 sentence-transformers 句向量 | 需要 Python 后端，与现有 Node.js Serverless 架构冲突 |
| 直接 fork Sentience_v2/Sentia 整仓 | 技术栈不兼容（Python FastAPI + PostgreSQL / Supabase），移植成本高于 TS 重写核心算法 |
| Framer Motion 步骤动画 | 项目动画统一为 GSAP，引入第二动画库增加包体积且风格割裂 |

**可逆性**: 纯增量改动（新组件 + 2 个新 API 路由 + 独立 localStorage 命名空间），删除即回滚——双向门。

**责任归属**: 用户 + 本地检查（`npm run typecheck`、`npm test`、`npm run build`）。

---

## 2. 系统地图与数据流

```
┌─ 前端（本地）─────────────────────────────────────┐
│ Guide Tab                                           │
│  ├─ ReframeWizard（7步向导，功能B）                  │
│  │    每步输入 → isHighRiskText 预检 → 草稿自动存档    │
│  └─ AssessmentFlow（评估，功能C）                     │
│       ├─ IntakeQuiz（10问，主动信号）                 │
│       ├─ 拉取本地聊天记录 + 情绪日志（被动信号）          │
│       ├─ cognitiveEngine.ts 确定性特征提取（本地）      │
│       └─ 信号融合 → localStorage 快照存档             │
└──────────────┬──────────────────────────────────┘
               │ POST /api/guide/assess（captcha + 危机预检）
               ▼
┌─ 后端 Serverless ─────────────────────────────────┐
│ 安全管线：limitText → getCrisisResponse → captcha    │
│ ① LLM语义评分（0-1五维，严格JSON）→ callLlmWithFailover│
│ ② LLM临床叙事（2-3句）→ callLlmWithFailover          │
└──────────────┬──────────────────────────────────┘
               ▼
前端融合：最终分 = 确定性公式（关键词+问卷）×0.5 + 语义分×0.5
               ▼
报告渲染：雷达图 / 仪表条 / 注意力地图 / 趋势（本地快照历史）
               ▼
评估报告 → 检测到高风险维度 → 一键进入 ReframeWizard 对应引导
```

**信任边界**: 用户数据仅存 localStorage（评估快照、向导草稿均不上传）；API 层验证码 + 限流；LLM 输出强制 JSON 校验 + 兜底降级。

**边界上下文映射**:

| 上下文 | 责任 | 与邻居关系 |
|--------|------|-----------|
| `cognitiveEngine`（本地） | 确定性特征提取、评分融合、漂移检测 | 上游消费 Mood/Chat 本地数据；下游供 AssessmentFlow 渲染 |
| `guideStore`（本地） | 向导草稿 + 评估快照存档 | 遵循 profileStore 模式，共享 localStorage 机制但独立命名空间 |
| `/api/guide/*`（服务端） | 语义评分 + 叙事生成 | 复用共享安全中间件与 LLM 容错链（共享内核），不改动现有路由 |
| `GuideSection`（UI） | Tab 容器与子模块路由 | 通过 props 回调与 Chat/Mood 联动，**禁止直接 import 其他模块内部状态** |

---

## 3. 功能B：结构化干预引导（ReframeWizard）

### 3.1 七步流程

| 步骤 | 名称 | 交互内容 | 复用来源 | MindQuark 优化点 |
|------|------|---------|---------|-----------------|
| 1 | 情境描述 | "发生了什么？" 文本输入 | Sentience_v2 SituationStep | 复用双轴情绪数据自动预填（Mood 页 energy/valence 带入） |
| 2 | 自动思维捕捉 | "你脑海中出现了什么想法？" | ThoughtTrapStep | 情绪标签点击快速生成常见自动思维模板 |
| 3 | 情绪标记 | 情绪轮盘选择 + 强度滑块 | EmotionCheckStep + 951情绪库 | 复用现有 6 情绪标签 + 扩展 family/quadrant 粒度 |
| 4 | 认知扭曲侦探 | AI识别扭曲类型，用户确认或修改 | DistortionDetective | 复用 `/api/reframe` 的 distortionType 参数，16 种扭曲卡片式选择 |
| 5 | 证据检验 | "支持/反对这个想法的证据" 双栏输入 | EvidenceScale | 纯用户自我反思，不调 AI（降成本） |
| 6 | AI引导重构 | AI生成平衡认知，用户可编辑 | AICompanion + ReframeStep | 新端点 `/api/guide/reframe`，输出结构化 JSON |
| 7 | 认知转化总结 | 前后对比 + 可选存档 + 转入深度对话 | ShiftStep | 复用 `handleStartChatWithPrompt` 跨页面跳转模式 |

### 3.2 数据模型（`src/lib/guideStore.ts`）

```typescript
interface ReframeSession {
  // 步骤1-2：情境与思维
  situation: string;
  automaticThought: string;
  // 步骤3：情绪（复用MindQuark双轴模型）
  selectedEmotionId?: string;
  emotionIntensity: number;      // 1-10
  energyLevel?: number;          // 从Mood页面带入 (1-5)
  valenceLevel?: number;         // 从Mood页面带入 (1-5)
  // 步骤4：认知扭曲
  identifiedDistortion?: string; // AI识别的
  confirmedDistortion?: string;  // 用户确认的
  // 步骤5：证据检验
  evidenceFor: string;
  evidenceAgainst: string;
  // 步骤6：重构结果
  reframedThought: string;
  // 步骤7：完成
  completedAt?: string;
  archived: boolean;
}
```

**草稿自动保存**: `useEffect([session])` 序列化到 localStorage（键 `mindquark_reframe_draft`），仅在 situation/automaticThought 有值时保存；Landing 页展示"继续上次"入口。

### 3.3 后端 API（`functions/api/index.js` 新增路由）

```
POST /api/guide/reframe
- 安全管线：limitText → getCrisisResponse → verifyTencentCaptcha
- 入参：{ session: ReframeSession, persona }
- LLM Prompt 要求返回严格 JSON：
  {
    "distortion": { "type": "...", "explanation": "1句温和解释" },
    "reframe": {
      "balancedThought": "2-3句平衡认知",
      "actionableStep": "1个可执行的小步骤"
    }
  }
- 容错：callLlmWithFailover，JSON parse 失败 → 重试一次 → 纯文本降级
```

---

## 4. 功能C：认知评估引导（AssessmentFlow）

### 4.1 混合评分架构（决策1落地）

| 层 | 位置 | 职责 | 特性 |
|----|------|------|------|
| 特征层 | 前端 `cognitiveEngine.ts` | 中英双语关键词词典提取、注意力地图、计数归一化 | 100% 确定性，可测试 |
| 语义层 | 后端 `/api/guide/assess` 第①次 LLM 调用 | 5 模式（完美主义/回避/反刍/灾难化/自我批判）输出 0-1 分 + 证据短句 | 严格 JSON，parse 失败降级 |
| 融合层 | 前端 | `最终分 = 0.5×确定性评分 + 0.5×语义分` | 可解释 |
| 叙事层 | 后端第②次 LLM 调用 | 基于已算好的分数生成 2-3 句温和总结 + 功能推荐 | **绝不让 LLM 参与评分**（Sentia 核心原则） |

**降级链**: LLM 语义分 parse 失败 → 主备模型重试 → 仍失败则融合公式退化为纯确定性评分（方案B 成为运行时兜底）。

**评分公式**（从 Sentia 移植，TS 实现）:

```typescript
// Traits（慢变）
完美主义 = 0.7×语义分.perfectionism + 0.3×自我批判关键词率
回避     = 0.6×语义分.avoidance + 0.4×社交退缩关键词率
反刍     = 0.4×语义分.rumination + 0.3×悲伤情绪频率 + 0.3×语义分.catastrophizing

// States（快变）
倦怠     = min(1, 0.3×愤怒频率 + 0.3×悲伤频率 + 0.2×(1-应对率) + 0.2×语义分.self_criticism)
动机     = 0.4×应对率 + 0.4×(1-悲伤频率) + 0.2×(1-语义分.avoidance)
压力适应 = 0.5×应对率 + 0.3×(1-语义分.catastrophizing) + 0.2×(1-语义分.avoidance)
```

**注意力地图**: 6 领域（学业/职业/健康/关系/身份/家庭）关键词占比归一化；**Z-score 漂移检测**（|Z|≥1.5 显示趋势警告，基于最多 30 条本地历史快照）。

### 4.2 十问引导式问卷（决策2落地，IntakeQuiz）

| # | 问题（5点量表为主） | 信号映射 |
|---|---------------------|---------|
| 1 | 过去两周，感到情绪低落或绝望的频率？ | 倦怠/低落基线 |
| 2 | 过去两周，对事情提不起兴趣的频率？ | 动机基线 |
| 3 | 遇到压力时，更倾向反复回想还是想办法行动？ | 反刍初始值 |
| 4 | 你对自己设定的标准是否常高到难以达到？ | 完美主义初始值 |
| 5 | 面对困难的对话或任务，更倾向回避还是面对？ | 回避初始值 |
| 6 | 最近两周的睡眠质量如何？ | 倦怠修正项 |
| 7 | 当前最困扰你的生活领域？（多选，最多2项） | 注意力地图先验 |
| 8 | 过去一个月做过哪些帮助自己恢复的事？（多选） | 恢复模型 helps/hurts |
| 9 | 你更希望获得的支持方式？（倾听/引导/工具/分析） | 支持偏好 → 个性化推荐 |
| 10 | 你最想通过 MindQuark 改善什么？（开放文本，选填） | LLM 叙事上下文 |

**融合规则**:
- Trait 类: `0.5×问卷初始值 + 0.5×被动信号评分`
- 注意力地图: `0.5×问卷选择 + 0.5×文本关键词占比`
- 问卷可跳过：跳过则纯被动信号评分，UI 明示"评估基于你的对话记录"
- 每题输入实时过 `isHighRiskText()` 预检（第10题开放文本尤其重要）

**伦理护栏**: 报告页固定免责声明——"这是自我觉察工具，不是诊断"；所有维度用趋势化、描述性语言，不出现临床标签。

### 4.3 后端 API

```
POST /api/guide/assess
- 安全管线：limitText → getCrisisResponse → verifyTencentCaptcha
- 入参：{ messages: string[]（本地近期对话文本）, questionnaireResponses?: {...} }
- 第①次 LLM 调用（maxTokens 300）：5 模式语义评分，严格 JSON
- 第②次 LLM 调用（maxTokens 400）：临床叙事 + MindQuark 功能推荐
- 出参：{ semanticScores, narrative, recommendations, evidence }
```

---

## 5. 视觉与前端构建规范（决策3落地）

**风格基线（从现有代码提取，所有新组件强制遵守）**:

| 层面 | 现有基线 | 新组件执行方式 |
|------|---------|---------------|
| 配色 | White & Emerald（emerald-* + 白底玻璃拟态） | 雷达图/仪表条重映射为 emerald 系；预警色用现有 amber/rose |
| 入场动画 | `useGSAP` + timeline `y位移+autoAlpha+stagger` | 复用 `mood-item-stagger` 模式；步骤切换用 GSAP 方向感知滑动（替代 Framer Motion） |
| 进度指示 | 卡片式分段 | 7 段 emerald 渐变进度条，GSAP 驱动宽度动画 |
| AI 思考态 | `ThinkingOrb` 组件 | 语义评分/叙事生成 loading 复用 |
| 音效 | `chimeAudio.playPhaseChime()` | 向导步骤推进、问卷翻页复用 `hold` 音效 |
| 图标 | lucide-react | Guide Tab 用 `Compass`；子模块 `Route`/`HeartPulse` |
| 卡片排版 | `mood-main-card` 结构 | 报告页沿用 |
| 情绪轮盘 | 现有 6 情绪标签 | 951 库按 family 着色映射 emerald 变体，`lazy import` 控制首屏体积 |

**新文件结构（纯增量）**:

```
src/components/GuideSection.tsx           # Tab 主容器
src/components/guide/reframe/              # 7个步骤组件 + index 编排器
src/components/guide/assess/              # IntakeQuiz、CognitiveReport、
                                          # TraitRadar、StateGauge、AttentionMap、TrendChart
src/lib/cognitiveEngine.ts                 # Sentia 算法 TS 移植 + 中英词典
src/lib/emotionsDatabase.ts                # 951情绪库（按需加载）
src/lib/guideStore.ts                       # 草稿 + 快照本地存储
functions/api/index.js                     # +2 路由
tests/cognitiveEngine.test.ts               # 确定性算法测试
tests/guideApi.test.ts                      # API 契约测试
```

**现有文件改动（最小化）**: `App.tsx` 加一个条件渲染块；`Navbar.tsx` 加 Guide Tab 项。

---

## 6. 风险登记表

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| LLM 语义评分返回非法 JSON | 中 | 高 | try-parse → 主备模型重试 → 纯确定性公式降级 |
| 评估结果让用户标签化自己 | 中 | 高 | 免责声明 + 趋势化措辞 + prompt 强制温和语气 |
| 单次评估 2 次 LLM 调用延迟/成本 | 中 | 中 | 串行执行于单端点；maxTokens 300+400；ThinkingOrb 加载态 |
| 问卷/向导中出现危机表述 | 低 | 极高 | 每步输入过 `isHighRiskText`，后端 `getCrisisResponse` 短路 |
| 951 情绪库拖慢首屏 | 低 | 中 | 动态 import 或裁剪至高频子集 |
| 语义分与关键词分冲突漂移 | 中 | 中 | 融合权重固定 + 报告展示证据来源分解 |

**架构守护检查（fitness functions）**:

1. **安全管线不变式**: 新端点必须完整经过 limitText → 危机拦截 → captcha；`serverSafety.test.ts` 加用例
2. **依赖方向规则**: guide 模块禁止 import 其他 Section 内部状态，仅 props 回调
3. **LLM 契约**: 所有 LLM 输出必须 parse 成功或走兜底；api 测试覆盖非法输出用例
4. **本地数据不变式**: 评估快照与草稿仅存 localStorage，network 层零用户数据上传

---

## 7. 实施顺序

1. **地基**: `cognitiveEngine.ts`（纯函数，先写测试）→ `guideStore.ts`
2. **功能C**: 后端 `/api/guide/assess` → IntakeQuiz → 报告组件（雷达图/仪表条）
3. **功能B**: 后端 `/api/guide/reframe` → 7 步向导（复用步骤骨架）
4. **联动与打磨**: 评估报告 → 向导推荐跳转；GSAP 动画细节；音效接入

**未完全定死的后续检查点**（实施时验证）:
- 语义评分 LLM prompt 的 few-shot 样例与温度参数——用 5-10 条真实对话样本小规模验证后固化
- 951 情绪库全量引入 vs 裁剪子集——等向导步骤 3 的实际 UI 决定，先按动态 import 预留
