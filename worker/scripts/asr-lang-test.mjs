#!/usr/bin/env node
/**
 * Definitively test whether Together's Whisper TRANSLATES non-English audio to English.
 * Generates a real Spanish clip via TTS, then transcribes it 3 ways: language=auto, es, en.
 *
 * Run: TOGETHER_API_KEY=sk-... node scripts/asr-lang-test.mjs
 */
const API_KEY = process.env.TOGETHER_API_KEY;
if (!API_KEY) {
  console.error("Missing TOGETHER_API_KEY env var.");
  process.exit(1);
}

const BASE = "https://api.together.ai/v1/audio";
const SPANISH = "\u00bfHola! \u00bfC\u00f3mo est\u00e1s hoy? Espero que tengas un buen d\u00eda.";

async function tts(text) {
  const res = await fetch(`${BASE}/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "canopylabs/orpheus-3b-0.1-ft",
      input: text,
      voice: "tara",
      response_format: "wav",
      sample_rate: 24000,
    }),
  });
  if (!res.ok) throw new Error(`TTS failed HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function transcribe(audioBytes, language) {
  const form = new FormData();
  form.append("file", new Blob([audioBytes], { type: "audio/wav" }), "spanish.wav");
  form.append("model", "openai/whisper-large-v3");
  if (language) form.append("language", language);
  const res = await fetch(`${BASE}/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form,
  });
  const raw = await res.text();
  let data = null;
  try { data = JSON.parse(raw); } catch {}
  if (!res.ok) return `HTTP ${res.status}: ${raw.slice(0, 200)}`;
  return data?.text ?? raw;
}

const PHRASES = [
  SPANISH, // long
  "\u00bfHola mi amor, c\u00f3mo est\u00e1s?",
  "Hola mi amor",
];

for (const text of PHRASES) {
  console.log("\nSpanish said:", text);
  const audio = await tts(text);
  console.log("  language=auto:", await transcribe(audio, "auto"));
  console.log("  language=es  :", await transcribe(audio, "es"));
}
