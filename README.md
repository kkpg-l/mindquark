# MindQuark Sanctuary

> **CBT-informed reflection and somatic grounding companion.** MindQuark is a wellbeing tool for supportive reflection and guided grounding; it is not a diagnostic tool, therapy service, or replacement for licensed care or emergency services.

## Highlights

MindQuark combines two supportive conversational personas with multiple paced breathing techniques, 5-4-3-2-1 sensory grounding, local profile personalization, dialogue reflection, and optional voice input/output. It is designed for a calm, short-form hackathon demonstration rather than clinical use.

| Capability | Implementation |
|---|---|
| Supportive conversation | Two selectable CBT-informed personas with a local fallback when providers are unavailable. |
| Crisis handling | Local and server-side high-risk screening returns a static crisis-support response before model generation. |
| Breathing techniques | 4-7-8 Vagus Nerve Reset, Box Breathing 4-4-4-4, Resonance Rhythm (5.5 breaths/min), Triangle Breathing 4-4-4 — each with visual pacing, phase guidance, and optional chimes. |
| Sensory grounding | Interactive 5-4-3-2-1 checklist (sight, touch, sound, smell, taste) with step-by-step prompts. |
| Voice | iFlytek speech services with browser speech-recognition fallback and bounded audio caching. |
| Deployment | React/Vite client with a Tencent CloudBase serverless Express API. |

## Architecture

```text
React + Vite client
        |
        | HTTPS / WSS, no client-side provider credentials
        v
CloudBase Function (/api)
  ├─ CORS origin allowlist and per-instance request limit
  ├─ bounded request validation
  ├─ shared high-risk safety gateway
  ├─ primary / backup model failover
  └─ iFlytek IAT and TTS signing proxy
```

## Security and safety baseline

The repository contains **no provider credentials**. Configure all secrets as CloudBase function environment variables or in a local untracked `.env` file. Do not place real credentials in source files, client-side `VITE_*` variables, screenshots, pull requests, or deployment logs.

The function applies an origin allowlist, bounded JSON body and text lengths, an in-memory per-instance rate limit, and a shared high-risk safety screen before `/chat`, `/reframe`, and `/analyze` call a model. The rate limiter reduces incidental abuse but is not a replacement for platform-level WAF, quota limits, monitoring, or identity controls.

> **Before a public submission:** rotate any provider key that has ever appeared in a source file or commit, set production variables in CloudBase, and verify `CORS_ORIGINS` includes only the actual presentation and local-development origins you intend to allow.

## Prerequisites

- Node.js 18 or later.
- npm 9 or later.
- A CloudBase environment for the API deployment.
- Provider credentials for the features you choose to enable.

## Local setup

### 1. Install client dependencies

```bash
npm install
cp .env.example .env
```

Set the public API address used by the browser when necessary:

```bash
VITE_API_BASE_URL=http://localhost:9000
```

### 2. Configure and run the API locally

```bash
cd functions/api
npm install
cp .env.example .env
```

Set the following server-only values in the function environment: `OPENROUTER_API_KEY`, `BACKUP_API_KEY` (if using the backup provider), `XF_APPID`, `XF_API_SECRET`, `XF_API_KEY`, `CORS_ORIGINS`, `RATE_LIMIT_WINDOW_MS`, and `RATE_LIMIT_MAX_REQUESTS`.

For a local browser client, set `CORS_ORIGINS=http://localhost:5173`. Then start the function:

```bash
node index.js
```

### 3. Run the client

From the repository root:

```bash
npm run dev
```

Open the displayed local URL. The default production API address remains available when `VITE_API_BASE_URL` is not set.

## Verification

Run these checks before every demo recording or submission:

```bash
npm run typecheck
npm test
npm run build
node --check functions/api/index.js
npm audit --omit=dev
```

The test suite covers the client crisis short-circuit, profile persistence, emotion detection, and server safety gateway source requirements. The build command emits a production bundle to `dist/`; this directory is intentionally ignored because it is reproducible.

## CloudBase deployment checklist

1. Install dependencies under `functions/api` before packaging the function; `functions/api/node_modules` is intentionally not committed.
2. Set the server-only environment variables in the CloudBase console or deployment pipeline.
3. Set `CORS_ORIGINS` to the exact production web origin and any intentionally supported local origin; never use `*`.
4. Deploy the `api` function described in `cloudbaserc.json`, then verify `GET /api/health`.
5. Build and deploy the static client with the correct `VITE_API_BASE_URL` if the API host differs from the default.
6. Run a normal chat, a safe local fallback, a crisis-text short-circuit, a breathing exercise, and a voice-stop flow before presenting.

## Hackathon demo flow

A concise demo can start on the landing page, switch personas in chat, send one non-sensitive wellbeing prompt, demonstrate a breathing or grounding technique, and show the profile personalization screen. If you demonstrate the safety path, use a prepared, non-personal sample and explain that the app routes high-risk text to immediate human-support resources rather than model generation.

## License

MIT.
