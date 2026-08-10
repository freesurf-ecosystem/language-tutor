# FreeSurf English Tutor

Open-source language tutor powered by self-hosted LLMs. No API keys, no per-token billing — everything runs on your own GPU.

Users speak in their target language, get grammar corrections, and hear a native-sounding tutor response — all processed in memory, never shared with third-party AI companies.

## How It Works

```
Mobile App → Cloudflare Worker → RunPod GPU (STT + LLM + TTS)
                  ↕
              Supabase (auth)
```

1. Student presses record, speaks in their target language
2. Audio sent to Cloudflare Worker → forwarded to RunPod GPU endpoint
3. Self-hosted pipeline processes the audio:
   - **faster-whisper** — speech-to-text and language detection
   - **Qwen 2.5 3B** (4-bit quantized) — grammar correction and tutor response
   - **Kokoro** — multilingual text-to-speech with auto language switching
4. Corrected text + audio response returned to the mobile app

## Repository Structure

```
├── mobile/                    # Expo React Native app
│   └── src/screens/           # Tutor, Notes, Login, etc.
├── serverless/                # RunPod GPU handler
│   ├── handler.py             # STT + LLM + TTS pipeline
│   └── Dockerfile             # Multi-stage (model → volume, not baked in)
├── worker/                    # Cloudflare Worker
│   └── src/index.ts           # Proxies mobile → RunPod
├── backend/                   # Legacy Express server (phone calls, billing — not used by tutor)
└── database/                  # Supabase schema & migrations
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Speech-to-Text | faster-whisper (base) |
| LLM | Qwen 2.5 3B Instruct (4-bit) |
| Text-to-Speech | Kokoro (multi-language) |
| GPU | NVIDIA CUDA 12.4 (L4 / A5000 / A100) |
| API Gateway | Cloudflare Workers |
| Auth & Database | Supabase |
| Mobile | Expo / React Native |

## Getting Started

### Prerequisites

- RunPod account with GPU access
- Cloudflare account with Workers
- Supabase project
- HuggingFace account (for Qwen model)

### GPU Deployment

```bash
cd serverless

# Download the LLM once to a persistent volume
docker build --target=downloader -t model-downloader-tutor .
docker run -v /models:/models model-downloader-tutor

# Build and push the runtime image
docker build -t your-registry/freesurf-language-tutor:v1 .
docker push your-registry/freesurf-language-tutor:v1
```

On RunPod, create a serverless template with volume mount `/runpod/volumes/models:/models`.

### Worker Deployment

```bash
cd worker
npx wrangler secret put RUNPOD_API_KEY
npx wrangler secret put RUNPOD_ENDPOINT_ID
npx wrangler deploy
```

### Mobile App

```bash
cd mobile
cp .env.example .env.local
# Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
# EXPO_PUBLIC_API_URL (point to your Cloudflare Worker)
npm install
npx expo start
```

## Environment Variables

**Worker:**
- `RUNPOD_API_KEY` — RunPod API key
- `RUNPOD_ENDPOINT_ID` — Serverless endpoint ID

**Mobile:**
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `EXPO_PUBLIC_API_URL` — Worker URL

## License

GNU General Public License v3.0
