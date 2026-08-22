# MindQuark Sanctuary 🌿

> **CBT-informed reflection, emotional resonance, and somatic grounding companion.**  
> MindQuark is a wellbeing sanctuary for supportive reflection, cognitive reframing, and guided grounding.  
> 🔗 **Live Demo:** [https://kkpg-d2ga363tca9086e3e-1469579803.tcloudbaseapp.com](https://kkpg-d2ga363tca9086e3e-1469579803.tcloudbaseapp.com)

---

## ✨ Core Highlights & Capabilities

MindQuark combines dual empathetic conversational personas with paced breathing, dual-axis mood mapping, 5-4-3-2-1 sensory grounding, local profile personalization, and optional voice input/output — all wrapped in an organic White & Emerald aesthetic with fluid, physical motion.

| Capability | Implementation & Technology |
|---|---|
| **Fluid Motion & Intro** | GSAP 3 + `@gsap/react` dual-layer Bezier liquid wave morphing, spring-driven typography and hero entrance choreography. |
| **Supportive Conversation** | Dual CBT-informed personas (Maya & Liam) with intelligent local fallback when providers are unavailable. |
| **Crisis Safety Gateway** | Multi-layer local and server-side high-risk screening returning static crisis-support resources prior to model inference. |
| **Somatic Grounding** | Sacred mandala kinetic breath guide (4-7-8, Box, 4-4, Deep Calm), 5-4-3-2-1 sensory radar, and interactive visual pacing. |
| **Voice & Speech Services** | iFlytek speech services (IAT & TTS) with browser speech-recognition fallback and audio caching. |
| **Full-Stack Deployment** | React 19 + TypeScript + Vite + Tailwind CSS static client hosted on Tencent CloudBase with Serverless Express API. |

---

## 🏛️ Architecture

```text
React 19 + TypeScript + Vite (GSAP + Tailwind)
                  │
                  │ HTTPS / WSS, zero client-side credentials
                  ▼
Tencent CloudBase Serverless Function (/api)
  ├─ CORS origin allowlist & per-instance request limit
  ├─ Bounded JSON body validation & sanitization
  ├─ Shared high-risk safety gateway & crisis short-circuit
  ├─ Primary / backup LLM failover (DeepSeek / GLM / OpenRouter)
  └─ iFlytek IAT and TTS signing proxy
```

---

## 🛡️ Security and Safety Baseline

The repository contains **no provider credentials**. All secrets are configured strictly as CloudBase function environment variables or in a local untracked `.env` file.

The API gateway enforces:
- Strict CORS origin allowlist (`CORS_ORIGINS`).
- Bounded payload length and rate limits (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`).
- Pre-inference crisis keywords interceptor routing users immediately to professional support hotlines.

---

## 🚀 Local Development Setup

### 1. Install Client Dependencies

```bash
npm install
cp .env.example .env
```

Optionally set the local API base URL:
```bash
VITE_API_BASE_URL=http://localhost:9000
```

### 2. Configure and Run the API Locally

```bash
cd functions/api
npm install
cp .env.example .env
```

Set server environment variables (`OPENROUTER_API_KEY`, `CORS_ORIGINS=http://localhost:5173`, etc.), then start the serverless function:

```bash
node index.js
```

### 3. Start the Client

From the repository root:
```bash
npm run dev
```

---

## 🧪 Verification & Test Suite

Run the full automated test and quality suite:

```bash
npm run typecheck       # TypeScript 0 errors check
npm test                # Vitest 15/15 unit and component tests
npm run build           # Production bundle optimization
node --check functions/api/index.js
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
