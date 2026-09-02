# Motion Polish Design — 全站组件交互动效质感升级

Date: 2026-09-02
Status: Approved (user confirmed approach A + component inventory)
Conformance target: WCAG 2.2 AA (motion, focus, keyboard paths)

## 1. Goal & Context

MindQuark Sanctuary 的页面视觉已达标，但组件交互质感存在三类问题：

1. **Dead animation classes**: ~10 处使用 `animate-in fade-in-* zoom-in-*` 类，但项目为 Tailwind CSS v4 且未安装 `tw-animate-css`，这些类全部无效 — 语音弹窗、下拉菜单、聊天气泡入场、打字指示器、保存状态目前均为瞬时硬切。
2. **Base component gaps**: `Button` 仅 default 变体有按压反馈且为默认 150ms 直线过渡；`Card` 基座零过渡；Navbar 胶囊 tab 激活态瞬时跳变；主题切换图标瞬时替换。
3. **No motion token system**: 时长/缓动各处临时定值，风格不统一；`prefers-reduced-motion` 仅 HeroSection 一处覆盖。

**Motion personality（用户确认方向）**: 沉静而灵敏 — 视觉柔和（小位移、柔缓动）、响应精确（短时长、按下滑跟手）。疗愈气质 + Apple 式手感。

**Out of scope**: App.tsx 页面转场（GSAP，保持原样）；现有 GSAP 入场时间线结构（仅允许对齐 token 时长）；视觉风格（White & Emerald 不变）；SparklesText / mouse-trail 内部实现。

## 2. Approach

**选定路线 A：CSS Motion Token 为主 + GSAP 保留编排。**

- 高频状态交互（hover / press / select / open-close）全部走 CSS — 零运行时开销、GPU 合成属性、与 Tailwind v4 类体系契合。
- GSAP 继续负责入场时间线与编排类动画（已有体系），新增数字滚动、完成庆祝等编排场景。
- 不引入新的 JS 运行时依赖；唯一新依赖为 `tw-animate-css`（纯 CSS，约 3KB，Tailwind v4 官方推荐的 `tailwindcss-animate` 替代）。
- framer-motion 保持现状（仅 SparklesText 使用），不再铺开。

被否路线：B（GSAP 全包 — hover/press 用 JS 驱动浪费性能、与类体系割裂）；C（铺开 framer-motion — 三套体系并存维护混乱）。

## 3. Motion Token System（`src/lib/motion.css`）

在 `src/index.css` 中 `@import "tailwindcss";` 之后引入。内容分四部分：

### 3.1 Tailwind v4 `@theme` 缓动 token（生成原生工具类）

```css
@theme {
  --ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1);      /* 进场：快起柔停 */
  --ease-in-soft: cubic-bezier(0.64, 0, 0.78, 0);       /* 离场：加速退出 */
  --ease-spring-gentle: cubic-bezier(0.34, 1.56, 0.64, 1); /* 选中轻回弹，克制使用 */
}
```

产出 `ease-out-soft` / `ease-in-soft` / `ease-spring-gentle` 工具类。

### 3.2 时长标尺（直接使用 Tailwind 原生 duration 刻度，不自造工具类）

| Token 语义 | 值 | 用途 |
|---|---|---|
| instant | 100ms (`duration-100`) | 按压、微反馈 |
| fast | 150ms (`duration-150`) | hover 进、关闭、退出 |
| base | 200ms (`duration-200`) | hover 出、选中、fade |
| moderate | 300ms (`duration-300`) | 下拉、抽屉、滑动指示器 |
| slow | 500ms (`duration-500`) | 大位移、庆祝类编排；绘制动画为自定义 keyframe 400ms，不占此档 |

### 3.3 自定义 keyframes / 类（仅 CSS 能力不足时）

- `.animate-pop-in`：选中弹性反馈 — `scale 0.96 → 1.02 → 1`，240ms，`ease-spring-gentle`；用于选择卡片被点击瞬间。
- `.animate-draw-check`：SVG 勾选 stroke-dashoffset 绘制，400ms；用于保存成功、向导完成。
- `@keyframes typing-dot-bounce`：聊天打字指示器三点呼吸弹跳（仅当组件为自绘圆点时应用）。
- `.motion-lift` / `.motion-press` / `.motion-slide`：语义交互类 — 分别封装 hover 浮起（`-translate-y` + shadow）、按压回缩（`active:scale`）、滑动指示器的 transform 过渡参数（duration + ease 统一注入）；§5 中相应组件复用这些类而非各自手写，§7 的 reduce 降级以这三个类为收口点。

### 3.4 全局三条原则（写入 motion.css 顶部注释 + 实现约束）

1. **开合不对称**：打开 200-300ms / 关闭 150ms；hover 进 150ms / hover 出 200ms。
2. **只动 transform / opacity**：禁止过渡 width/height/top/left 等布局属性。
3. **Reduced-motion 全局降级**（见 §7）。

## 4. P0 — 修复死类（bug 级，最先执行）

1. `npm install -D tw-animate-css`；在 `src/index.css` 追加 `@import "tw-animate-css";`。
2. 即刻激活既有 10 处 `animate-in fade-in-* zoom-in-*`：VoiceCallModal、dropdown-menu、messaging-conversation（气泡入场 + 打字指示器）、MoodTrackerSection（两个状态区）、MeSection（两处）、BreatheSection（详情展开）、avatar-uploader。
3. 验收：上述交互全部出现设计意图中的淡入/缩放入场。

## 5. P1 — 组件交互优化清单

| # | 组件 | 现状 | 优化规格 |
|---|---|---|---|
| 1 | `ui/button.tsx` | 仅 default 有 `active:scale-98` | 全变体统一按压 `active:scale-[0.97] duration-100`；hover 进出不对称：基态 `duration-200` + `hover:duration-150`（进 150 / 出 200），缓动 `ease-out-soft`；focus ring 过渡保留 |
| 2 | `ui/card.tsx` | 零过渡 | 不强制全局 hover；新增可选 `interactive` prop（hover 浮起 `-translate-y-1` + shadow 过渡 `duration-200 ease-out-soft`），收编 Hero 三卡手写 hover |
| 3 | `Navbar.tsx` tab | 激活态 class 瞬时跳变 | 滑动指示器：绝对定位 pill 元素，JS 测量激活按钮 offsetLeft/width 设置 transform，CSS `transition-transform duration-300 ease-out-soft` 平滑滑动 |
| 4 | `Navbar.tsx` 主题切换 | Sun/Moon 瞬时替换 | 图标容器 `rotate` + 交叉淡入：离场图标 `animate-out spin-out fade-out duration-150`，入场 `animate-in spin-in fade-in duration-200`（tw-animate-css 提供） |
| 5 | `ui/dropdown-menu.tsx` | 打开动画类失效；item 仅变色 | P0 修复后确认打开 scale+fade 生效；item hover 增加 `translate-x-0.5 transition-transform duration-150` |
| 6 | `VoiceCallModal.tsx` | 瞬开瞬关 | 打开：backdrop `fade-in duration-200` + 面板 `zoom-in-95 fade-in duration-200`（P0 已修）；**关闭**：新增 `isClosing` 状态 — 点击关闭先播 `animate-out fade-out zoom-out-95 duration-150`，`onAnimationEnd` 后真正卸载；Esc 同路径 |
| 7 | `messaging-conversation.tsx` 气泡 | 瞬现（类失效） | P0 恢复入场；追加气泡 `slide-in-from-bottom-1`；建议 chips hover `-translate-y-0.5 duration-150`；发送按钮按压统一走 #1 |
| 8 | 选择卡片组：MoodTracker 心情 6 宫格、StepEmotion 情绪 24 宫格、StepDistortion 歪曲 12 卡、IntakeQuiz 选项 | 仅颜色切换 | 选中瞬间触发 `.animate-pop-in`（点击时加类，animationend 移除）；ring/边框过渡 `duration-200`；hover 统一 `-translate-y-0.5 duration-200 ease-out-soft`；键盘焦点样式与 hover 一致 |
| 9 | 滑杆：MoodTracker 能量/效价、StepEmotion 强度 | 原生无反馈 | thumb 自定义样式 + `transition-transform duration-150`；`input:active::-webkit-slider-thumb { transform: scale(1.15) }`（Chromium 系）+ fallback `:hover`；轨道填充色过渡 `duration-200` |
| 10 | 向导/测验进度条 | `transition-all duration-500/300` | 收敛为 `transition-[width] duration-300 ease-out-soft`（去掉 transition-all，避免无关属性过渡） |

## 6. P2 — 点睛层

| # | 场景 | 规格 |
|---|---|---|
| 1 | MoodTracker 保存成功 | 勾选图标换 SVG + `.animate-draw-check`；成功徽章 `animate-pop-in`（克制，无撒花） |
| 2 | CognitiveReport 分数 | GSAP count-up（`gsap.to` onUpdate 更新 textContent，600ms，`power2.out`）；reduce 下直接显示终值 |
| 3 | StepSummary 完成 | 勾选 draw + 摘要卡片轻 stagger（GSAP，已有体系内扩展） |
| 4 | avatar-uploader 拖拽 | dragover 容器 `scale-[1.01]` + 边框色过渡 `duration-150` |

## 7. Accessibility Gates（WCAG 2.2 AA）

**Reduced-motion 全局降级**（motion.css 末尾，单点维护）：

```css
@media (prefers-reduced-motion: reduce) {
  .animate-pop-in, .animate-draw-check { animation: none; }
  /* 位移/缩放类过渡降级为纯透明度快速淡入 */
  .motion-lift, .motion-press, .motion-slide { transition-property: opacity; transition-duration: 100ms; }
}
```

GSAP 编排守卫：新增 `src/lib/motion.ts` 导出 `prefersReducedMotion()`；CognitiveReport count-up、StepSummary 庆祝、Wizard 步骤切换在 reduce 下改为瞬时/仅淡入。既有 HeroSection 守卫保持。

**关键旅程门禁**（阻断级）：
1. 键盘完成聊天发送 — 气泡入场不抢焦点（入场动画仅 transform/opacity，不动 focus）。
2. 键盘走完 7 步向导 — 步骤切换焦点顺序稳定。
3. reduce 模式下打卡/测评全可用 — 所有位移/缩放降级为快速淡入。
4. 弹窗/下拉键盘路径 — Esc 关闭、焦点返回触发器、圈闭完好（关闭动画不得改变卸载时序语义）。

**非阻断（记录）**：屏幕阅读器朗读选中态 — 现有组件已用 button + aria 常规属性，本次不动语义；NVDA/VoiceOver 抽查留给用户手动走查一次并记录。

## 8. Validation

- `npm run typecheck` 零错误。
- `node node_modules\vitest\vitest.mjs run` — 现有 69 测试零回归；新增测试：
  - Button 全变体含 `active:scale` 按压类；
  - VoiceCallModal 关闭路径：触发 onClose 后延迟卸载（fake timers 断言动画结束才 unmount）；
  - Navbar 指示器：tab 切换后 transform 更新；
  - motion.css 含 `prefers-reduced-motion` 降级块（读文件断言关键选择器存在）。
- `npm run build` 成功。
- 手动走查清单（明/暗双模式 + DevTools reduce 模拟）：聊天发送、向导全流程、心情打卡、弹窗开合、下拉、tab 滑动。

## 9. Risks

- **tw-animate-css 与既有类的兼容**：其 `animate-in` 实现与原 tailwindcss-animate 类名兼容，风险低；若个别类名缺失则用 motion.css 补等价 keyframes。
- **VoiceCallModal 关闭时序**：延迟卸载引入 150ms 窗口，期间快速重开需处理竞态（以最新 isOpen 为准，clearTimeout）。
- **性能**：全部过渡限于 transform/opacity 合成属性；无持续运行动画新增（打字指示器仅激活时运行）。
