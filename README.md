# MindQuark Sanctuary 🌿

> **CBT-informed reflection, emotional resonance, and somatic grounding companion.**  
> MindQuark is a full-stack mental wellbeing sanctuary designed for supportive reflection, cognitive reframing, somatic breathwork, and AI phone companion check-ins.  
> 🔗 **Live Demo:** [https://kkpg-d2ga363tca9086e3e-1469579803.tcloudbaseapp.com](https://kkpg-d2ga363tca9086e3e-1469579803.tcloudbaseapp.com)

---

## ✨ Core Highlights & Capabilities

MindQuark combines dual empathetic conversational personas with paced somatic breathwork, CBT cognitive reframing, dual-axis mood mapping, 5-4-3-2-1 sensory grounding, outbound AI phone companion calls, and local profile personalization — all wrapped in an organic White & Emerald aesthetic with fluid GSAP physical motion.

| Capability | Implementation & Technology |
|---|---|
| **Fluid Motion & Intro** | GSAP 3 + `@gsap/react` dual-layer Bezier liquid wave morphing, spring-driven typography, smooth tab transitions, and entrance choreography. |
| **Supportive CBT Conversation** | Dual CBT-informed personas (**Maya** - empathetic & warm; **Liam** - analytical & grounding) with streaming dialogue and offline resilience fallback. |
| **CBT Cognitive Reframing & Guide** | Interactive Quick CBT Studio (`/api/reframe`) and step-by-step Guided Journey (`/api/guide/assess`, `/api/guide/reframe`): identifies automatic negative thoughts (NAT) across common distortions (All-or-Nothing, Catastrophizing, Mind Reading, Emotional Reasoning) to produce balanced rational perspectives. |
| **AI Dialogue Psychological Audit** | Deep conversation analysis (`/api/analyze`): evaluates recent dialogue for emotional climate, recurring cognitive patterns, and actionable growth recommendations. |
| **AI Voice Check-in Calls (Phone)** | **CALL-E powered outbound phone companion** (`/api/call/create`, `/api/call/status/:id`): user-requested supportive check-in calls with crisis safety scripts, live dialing status polling, daily per-IP quotas, and zero phone number persistence. |
| **Somatic Grounding & 7 Breath Modes** | Sacred mandala kinetic breath guide with **7 evidence-based techniques** (4-7-8 Deep Relaxation, Box 4-4-4-4 Focus, Coherent 4-4 HRV Resonance, Triangle Zen Focus, Physiological Sigh Instant Relief, Energy Breath, and 5-4-3-2-1 Sensory Grounding) with Web Audio API synthesized singing bowl / chime sound guidance. |
| **Speech & Voice Multimodal** | iFlytek speech services (IAT speech-to-text & TTS voice reading) with browser Web Speech API fallback and audio caching. |
| **Dual-Axis Mood Mapping** | 2D Energy vs. Valence mood quadrant tracker with journal note-taking, emotion tagging, and one-click transition into guided chat. |
| **Crisis Safety Gateway** | Multi-layer local and server-side high-risk screening that short-circuits model inference to immediately return official emergency support resources (988 Lifeline, national mental health hotlines). |
| **Privacy & Local Personalization** | Local `profileStore` with custom counselor names, preset avatar gallery, local Base64 avatar uploader, dark/light theme toggle, and zero server-side user data retention. |
| **Animated Companion Bot** | Canvas-rendered BloubBot desktop companion with a custom 2D motion engine (expressions, blinking, gaze tracking, skin system) that reacts to live emotion detection across the site. |
| **Full Bilingual i18n** | Complete English / 中文 localization via a typed context dictionary with per-key fallback, covering navigation, chat, mood, breathing, and guide subpages. |
| **Full-Stack CloudBase Deployment** | React 19 + TypeScript + Vite + Tailwind CSS static client hosted on Tencent CloudBase with Serverless Express API gateway. |

---

## 🏛️ System Architecture

```text
React 19 + TypeScript + Vite (GSAP 3 + Tailwind CSS v4)
                  │
                  │ HTTPS / WSS (Zero client-side secrets)
                  ▼
Tencent CloudBase Serverless Function (/api)
  ├─ CORS origin allowlist & per-instance request rate limiting
  ├─ Bounded JSON body validation & payload sanitization
  ├─ Shared high-risk safety gateway & crisis short-circuit
  ├─ Primary / Backup LLM failover (askdiandian dots3-note-prev / OpenRouter fallback)
  │    ├─ POST /api/chat          -> Supportive CBT conversation
  │    ├─ POST /api/reframe       -> Quick cognitive distortion reframing
  │    ├─ POST /api/guide/assess  -> Interactive CBT triage assessment
  │    ├─ POST /api/guide/reframe -> Step-by-step cognitive reframe wizard
  │    └─ POST /api/analyze       -> Dialogue psychological audit
  ├─ iFlytek Speech Signing Proxy
  │    ├─ GET  /api/iat-auth      -> WebSocket authentication for voice input
  │    └─ POST /api/tts           -> Signed speech synthesis
  ├─ CALL-E Outbound Phone Companion Proxy
  │    ├─ POST /api/call/create     -> Idempotent outbound call scheduling
  │    └─ GET  /api/call/status/:id -> Live call status & structured result polling
  │         └─ https://api.heycall-e.com (Bearer CALLE_API_KEY, server-only)
  ├─ Anti-Bot Middleware (User-Agent filter, bot honeypot & optional Tencent Captcha)
  └─ GET  /api/health             -> Gateway health check
```

---

## 📞 AI Voice Phone Companion (CALL-E Integration)

MindQuark integrates **CALL-E** to offer real-time outbound telephone check-in calls for users needing a gentle voice companion:

1. **User Experience Flow**:
   - In the Chat interface, click the **"Call Me"** (Phone) icon in the top header.
   - Enter an international phone number (E.164 format, e.g., `+1 212 555 0123`). Outbound calling is limited to CALL-E's supported destinations (US +1, Singapore +65, Malaysia +60, UK +44, etc.); **Mainland China +86 is not supported** and is rejected up front.
   - Check the explicit consent checkbox and confirm.
   - The UI displays live dialing progress while allowing the user to minimize the modal and continue text chat.
   - The AI companion (Maya) calls the user's phone for a warm 5–10 minute check-in with CBT validation and grounding exercises.
   - Post-call structured results (call outcome, mood change, support summary) are polled and recorded.

2. **Safety & Privacy Safeguards**:
   - **Zero Phone Storage**: Phone numbers are strictly used in-flight to initiate the call and are never written to any database or persistent log.
   - **Crisis Call Protocol (best effort)**: The phone task prompt instructs the AI to direct a user reporting self-harm or crisis to local crisis/emergency services and end the call. This is prompt-based, advisory behavior on the voice model — not a deterministic crisis detector or a guaranteed intervention.
   - **Anti-Abuse Limits**: Daily per-IP quotas (`CALL_MAX_PER_DAY_PER_IP=3`) and concurrency caps (`CALL_MAX_ACTIVE=1`) prevent abusive or accidental dialing.
   - **Provider Timing**: CALL-E runs a server-side task-readiness review, so `POST /v1/calls` typically takes ~15–20s to return. The proxy uses a 45s create timeout (`CALL_CREATE_TIMEOUT_MS`) and the client a 50s fetch timeout; a shorter timeout reports a false failure even though the call was accepted. Upstream error codes (unsupported region, balance, concurrency, ...) are mapped to explicit client-facing messages instead of a generic 502.

---

## 🛡️ Security and Safety Baseline

The repository contains **no provider credentials**. All secrets are configured strictly as CloudBase function environment variables or in a local untracked `.env` file.

* **Dual-Layer Crisis Interceptor (recognized text only)**: Pre-inference safety filters on both client and server intercept recognized high-risk text inputs, bypassing LLM inference entirely to return verified crisis hotlines. Spoken-call handling is separate and remains model/prompt-based (see Crisis Call Protocol above), so it can miss or misinterpret crisis content.
* **Strict CORS Allowlist**: Origin validation blocks unauthorized cross-site requests (`CORS_ORIGINS`).
* **Rate Limiting & Payload Bounds**: Protection against brute-force and oversized requests (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, 64KB JSON body limit).
* **Anti-Bot Protection**: Integration with Tencent Cloud Captcha (`VITE_TCAPTCHA_APP_ID`) to verify genuine user interaction before expensive API operations.

---

## 🚀 Local Development Setup

### 1. Install Client Dependencies

```bash
npm install
cp .env.example .env
```

Client `.env` options:
```bash
# Optional: Local API gateway URL (defaults to production CloudBase endpoint)
VITE_API_BASE_URL=http://localhost:9000

# Optional: Tencent Cloud Captcha App ID for anti-bot verification
VITE_TCAPTCHA_APP_ID=
```

### 2. Configure and Run the API Locally

```bash
cd functions/api
npm install
cp .env.example .env
```

Configure your server environment variables in `functions/api/.env`:

```bash
# Primary LLM Provider (askdiandian dots3-note-prev)
PRIMARY_API_KEY=your_askdiandian_api_key_here
PRIMARY_BASE_URL=https://note3-prev-api.askdiandian.com/v1
PRIMARY_MODEL=dots3-note-prev

# Fallback LLM Providers (OpenRouter free: gemma → minimax)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# iFlytek Speech Recognition (IAT) & Text-to-Speech (TTS)
XF_APPID=your_iflytek_appid_here
XF_API_SECRET=your_iflytek_api_secret_here
XF_API_KEY=your_iflytek_api_key_here

# CALL-E Outbound Phone Companion
CALLE_API_KEY=your_calle_api_key_here
CALLE_BASE_URL=https://api.heycall-e.com
CALL_MAX_PER_DAY_PER_IP=3
CALL_MAX_ACTIVE=1

# API Security & Gateway Settings
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=30

# Optional: Anti-Bot Captcha (Tencent Cloud Captcha)
TCAPTCHA_APP_ID=
TCAPTCHA_SECRET_KEY=
```

Start the API server:
```bash
node index.js
```

### 3. Start the Client

From the repository root:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Verification & Test Suite

Run the full automated test and quality suite:

```bash
npm run typecheck       # TypeScript 0 errors check
npm test                # Vitest test suite (11 test files, 97/97 unit & component tests passing)
npm run build           # Production bundle optimization
node --check functions/api/index.js && node --check functions/api/calle.js # Serverless syntax validation
```

---

## ☁️ Tencent CloudBase Deployment

1. **Deploy Serverless Function:**
   ```bash
   # Update function code while preserving console environment variables:
   tcb fn code update api --dir functions/api -e kkpg-d2ga363tca9086e3e
   # Or full configuration deploy:
   tcb fn deploy api -e kkpg-d2ga363tca9086e3e
   ```
2. **Deploy Frontend Static Hosting:**
   ```bash
   npm run build
   tcb hosting deploy dist -e kkpg-d2ga363tca9086e3e
   ```
3. **Live Site URL:**
   `https://kkpg-d2ga363tca9086e3e-1469579803.tcloudbaseapp.com`

---

## 📄 License

MIT © 2026 MindQuark Team
