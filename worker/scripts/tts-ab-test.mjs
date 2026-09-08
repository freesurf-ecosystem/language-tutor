#!/usr/bin/env node
/**
 * Together AI TTS A/B test — English + Spanish, same "voice", multiple models.
 *
 * Run:  TOGETHER_API_KEY=sk-... node scripts/tts-ab-test.mjs [--english "..." --spanish "..."]
 *
 * Purpose: confirm the Together /v1/audio/speech request shape for each TTS model and,
 * most importantly, whether ONE model keeps the SAME voice across English AND Spanish
 * (the cross-lingual requirement Kokoro fails). Saves .wav files to ./tts-out/ for listening.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "tts-out");

const API_KEY = process.env.TOGETHER_API_KEY;
if (!API_KEY) {
  console.error("Missing TOGETHER_API_KEY env var.");
  process.exit(1);
}

// Candidate models to test, with the known model ids + a single voice id per model.
const MODELS = [
  { label: "orpheus", model: "canopylabs/orpheus-3b-0.1-ft", voice: "tara" },
  { label: "cartesia", model: "cartesia/sonic", voice: "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4" },
  { label: "kokoro-baseline", model: "hexgrad/Kokoro-82M", voice: "af_heart" },
];

function parseArgs(argv) {
  const a = { english: "Good morning! It is lovely to see you today.", spanish: "\u00a1Buenos d\u00edas! Me alegra mucho verte hoy." };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--english") a.english = argv[++i];
    else if (argv[i] === "--spanish") a.spanish = argv[++i];
    else if (argv[i] === "--model") a.onlyModel = argv[++i];
  }
  return a;
}

async function speech(model, voice, text, langLabel) {
  // The same generic Together shape the worker uses: model + input + voice (same voice for both languages).
  const res = await fetch("https://api.together.ai/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: text,
      voice,
      response_format: "wav",
      sample_rate: 24000,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${model} / ${langLabel} -> HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

const args = parseArgs(process.argv.slice(2));
await mkdir(OUT, { recursive: true });

const started = Date.now();
for (const { label, model, voice, guess } of MODELS) {
  if (args.onlyModel && !label.includes(args.onlyModel)) continue;
  for (const [lang, text] of [["en", args.english], ["es", args.spanish]]) {
    const t0 = Date.now();
    try {
      const buf = await speech(model, voice, text, lang);
      const ms = Date.now() - t0;
      const file = path.join(OUT, `${label}_${lang}.wav`);
      await writeFile(file, buf);
      console.log(`OK   ${label.padEnd(18)} ${lang}  ${buf.length} bytes  ${ms}ms  -> ${file}`);
    } catch (e) {
      console.log(`FAIL ${label.padEnd(18)} ${lang}  ${e.message}`);
    }
  }
}
console.log(`\nDone in ${Date.now() - started}ms. Listen to ./tts-out/* to judge voice consistency across en/es.`);
console.log("Note: Orpheus voice 'tara' and Cartesia 'db6b0ed5...' are from Together's samples. If you want a specific Sonic voice,");
console.log("grab its id from the Cartesia/Together dashboard and set it on both the cartesia test and TOGETHER_TTS_VOICE.");
