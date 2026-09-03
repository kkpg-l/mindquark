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
| **CBT Cognitive Reframing** | Interactive thought reframing tool (`/api/reframe`): identifies automatic negative thoughts (NAT) across common distortions (All-or-Nothing, Catastrophizing, Mind Reading, Emotional Reasoning) to produce balanced rational perspectives. |
| **AI Dialogue Psychological Audit** | Deep conversation analysis (`/api/analyze`): evaluates recent dialogue for emotional climate, recurring cognitive patterns, and actionable growth recommendations. |
| **AI Voice Check-in Calls (Phone)** | **CALL-E powered outbound phone companion** (`/api/call/create`, `/api/call/status/:id`): user-requested supportive check-in calls with crisis safety scripts, live dialing status polling, daily per-IP quotas, and zero phone number persistence. |
| **Somatic Grounding & 7 Breath Modes** | Sacred mandala kinetic breath guide with **7 evidence-based techniques** (4-7-8 Deep Relaxation, Box 4-4-4-4 Focus, Coherent 4-4 HRV Resonance, Triangle Zen Focus, Physiological Sigh Instant Relief, Energy Breath, and 5-4-3-2-1 Sensory Grounding) with Web Audio API synthesized singing bowl / chime sound guidance. |
| **Speech & Voice Multimodal** | iFlytek speech services (IAT speech-to-text & TTS voice reading) with browser Web Speech API fallback and audio caching. |
| **Dual-Axis Mood Mapping** | 2D Energy vs. Valence mood quadrant tracker with journal note-taking, emotion tagging, and one-click transition into guided chat. |
| **Crisis Safety Gateway** | Multi-layer local and server-side high-risk screening that short-circuits model inference to immediately return official emergency support resources (988 Lifeline, national mental health hotlines). |
| **Privacy & Local Personalization** | Local `profileStore` with custom counselor names, preset avatar gallery, local Base64 avatar uploader, dark/light theme toggle, and zero server-side user data retention. |
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
  ├─ Primary / Backup LLM failover (DeepSeek / GLM / OpenRouter / iFlytek MaaS)
  │    ├─ POST /api/chat     -> Supportive CBT conversation
  │    ├─ POST /api/reframe  -> Cognitive distortion reframing
  │    └─ POST /api/analyze  -> Dialogue psychological audit
  ├─ iFlytek Speech Signing Proxy
  │    ├─ GET  /api/iat-auth -> WebSocket authentication for voice input
  │    └─ POST /api/tts      -> Signed speech synthesis
  ├─ CALL-E Outbound Phone Companion Proxy
  │    ├─ POST /api/call/create     -> Idempotent outbound call scheduling
  │    └─ GET  /api/call/status/:id -> Live call status & structured result polling
  │         └─ https://api.heycall-e.com (Bearer CALLE_API_KEY, server-only)
  ├─ Anti-Bot Middleware (Optional Tencent Cloud Captcha / 防水墙)
  └─ GET  /api/health        -> Gateway health check
```

---

## 📞 AI Voice Phone Companion (CALL-E Integration)

MindQuark integrates **CALL-E** to offer real-time outbound telephone check-in calls for users needing a gentle voice companion:

1. **User Experience Flow**:
   - In the Chat interface, click the **"Call Me"** (Phone) icon in the top header.
   - Enter an international phone number (E.164 format, e.g., `+1 212 555 0123` or `+86 138 0000 0000`).
   - Check the explicit consent checkbox and confirm.
   - The UI displays live dialing progress while allowing the user to minimize the modal and continue text chat.
   - The AI companion (Maya) calls the user's phone for a warm 5–10 minute check-in with CBT validation and grounding exercises.
   - Post-call structured results (call outcome, mood change, support summary) are polled and recorded.

2. **Safety & Privacy Safeguards**:
   - **Zero Phone Storage**: Phone numbers are strictly used in-flight to initiate the call and are never written to any database or persistent log.
   - **Crisis Call Protocol**: If self-harm or crisis is detected during the call, the AI immediately directs the user to 988 / local emergency services and ends the call safely.
   - **Anti-Abuse Limits**: Daily per-IP quotas (`CALL_MAX_PER_DAY_PER_IP=3`) and concurrency caps (`CALL_MAX_ACTIVE=1`) prevent abusive or accidental dialing.

---

## 🛡️ Security and Safety Baseline

The repository contains **no provider credentials**. All secrets are configured strictly as CloudBase function environment variables or in a local untracked `.env` file.

* **Dual-Layer Crisis Interceptor**: Pre-inference safety filters on both client and server intercept crisis keywords, bypassing LLM inference entirely to return verified crisis hotlines.
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
# Primary LLM Provider (OpenRouter / DeepSeek / GLM)
OPENROUTER_API_KEY=your_openrouter_api_key_here
PRIMARY_MODEL=minimax/minimax-m2.7:free

# Optional Backup LLM Provider (Failover resilience)
BACKUP_API_KEY=your_backup_api_key_here
BACKUP_MODEL=astron-code-latest

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
npm test                # Vitest test suite (5 test files, 28/28 unit & component tests passing)
npm run build           # Production bundle optimization
node --check functions/api/index.js # Serverless syntax validation
```

---

## ☁️ Tencent CloudBase Deployment

1. **Deploy Serverless Function:**
   ```bash
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
