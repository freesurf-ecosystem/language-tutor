# Read-Along Pipeline (self-hosted word highlighting)

How to get **word-level highlighting** on Qwen3-TTS audio without a paid timestamp API.

## The problem

`Qwen/Qwen3-TTS-12Hz-1.7B` (Together AI) returns raw audio only — no word timestamps.
To highlight each word as the tutor reads, we need to know *when* each word is spoken.

## The solution: forced alignment (free, CPU)

Because we generate the audio ourselves and **know the exact text**, we run a
local `faster-whisper` pass with `word_timestamps=True` to recover per-word times.

```
story text
   │
   ▼
split into sentences
   │
   ▼
Qwen3-TTS (Together)  ──►  sentence audio (WAV, ono_anna, slow)
   │
   ▼
align.py  ──►  { words: [{ word, start, end }] }
   │
   ▼
store { sentence, audio, word_timestamps } in DB
   │
   ▼
app plays audio + highlights words by timestamp
```

## Why pre-compute, not on-demand

Stories are fixed. Run this pipeline **once per story** as a batch job and cache the
result; the app just fetches pre-aligned sentences. No per-read latency or cost.

## Running align.py

```bash
# Python 3.12 recommended (see requirements.txt note)
pip install -r requirements.txt
python align.py sentence.wav --text "The little girl planted a seed." --output out.json
```

First run downloads the model (~150MB) from Hugging Face. Use the default non-gated
mirror `guillaumekln/faster-whisper-base.en`, or pass `--model`.

## Gotchas

- **Expired HF token** can cause `401` on model download — unset `HF_TOKEN`/
  `HUGGING_FACE_HUB_TOKEN` or use a valid token.
- **Python 3.14** needs the monkey-patch in `align.py` (PyAV removed a kwarg).
  Prefer Python 3.11/3.12 for this service.
- This step is **separate from** the Cloudflare Worker (which can't run Python).
  Run it on any cheap box/CI, or fold it into the self-hosted backend later.

## Status

Prototype verified: `align.py` produces correct per-word timestamps on Qwen3-TTS
output. Not yet wired into the app or deployed.
