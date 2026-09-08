/**
 * FreeSurf Language Tutor — Cloudflare Worker (Together AI pipeline)
 *
 * Replaces the RunPod-pod proxy. Calls Together AI directly:
 *   ASR (Whisper) -> LLM "brain" (GLM) -> TTS (swappable: Orpheus / Cartesia / Kokoro).
 * Supports VOICE (audio in -> audio out) and TEXT (no audio cost) modes, and returns
 * language-tagged segments so a single tutor voice can switch languages per span.
 *
 * Contract: see ../../docs/TUTOR_AI_PIPELINE.md
 *
 * Secrets (wrangler secret put):
 *   TOGETHER_API_KEY
 * Optional overrides ([vars] or secret): TOGETHER_ASR_MODEL, TOGETHER_LLM_MODEL,
 *   TOGETHER_TTS_MODEL, TOGETHER_TTS_VOICE, TOGETHER_TTS_SAMPLE_RATE
 */

export interface Env {
  TOGETHER_API_KEY: string;
  TOGETHER_ASR_MODEL?: string;
  TOGETHER_LLM_MODEL?: string;
  TOGETHER_TTS_MODEL?: string;
  TOGETHER_TTS_VOICE?: string;
}

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:8081",
  "https://freesurf.tools",
  "https://links.freesurf.tools",
];

const CHAT_URL = "https://api.together.xyz/v1/chat/completions";
const AUDIO_BASE = "https://api.together.ai/v1/audio";

const DEFAULT_ASR = "openai/whisper-large-v3";
const DEFAULT_LLM = "zai-org/glm-5.3-flash";
const DEFAULT_TTS = "canopylabs/orpheus-3b-0.1-ft"; // cross-lingual same-voice candidate; Cartesia = cartesia/sonic

// Default single voice per model when TOGETHER_TTS_VOICE isn't set. These models infer language from the
// input text, so ONE voice id is all that's needed to keep the same tutor voice across languages.
const DEFAULT_VOICE_BY_MODEL: Record<string, string> = {
  "canopylabs/orpheus-3b-0.1-ft": "tara",
  "cartesia/sonic": "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4",
};
function defaultVoiceFor(model: string): string {
  return DEFAULT_VOICE_BY_MODEL[model] || "";
}

// Known native languages the tutor supports (used to clamp LLM `lang` output to sane values).
const NATIVE_LANGS = new Set([
  "ar", "da", "de", "el", "es", "fi", "fr", "he", "hi", "it", "ja", "ko",
  "ms", "nl", "no", "pl", "pt", "ru", "sv", "sw", "tr", "zh", "en",
]);

type Segment = { text: string; lang: string };
interface TutorRequest {
  mode?: string;
  audio_base64?: string;
  audio_format?: string; // recorded container, e.g. "m4a", "wav", "mp3"
  text?: string;
  native_language?: string;
  history?: { role: string; text: string }[];
}
interface TutorResult {
  mode: string;
  original?: string;
  correction?: string;
  segments: Segment[];
  audio_base64?: string;
  tts_warning?: string | null;
}

function corsHeaders(origin: string): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.some(
    (o) => origin === o || origin.startsWith("exp://") || origin.startsWith("http://localhost")
  );
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
function jsonResponse(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

// ---------- Together helpers ----------

const MIME_BY_EXT: Record<string, string> = {
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  mp3: "audio/mpeg",
  webm: "audio/webm",
};

async function togetherTranscribe(env: Env, audioBase64: string, ext: string): Promise<string> {
  const model = env.TOGETHER_ASR_MODEL || DEFAULT_ASR;
  const safeExt = MIME_BY_EXT[ext] ? ext : "wav";
  const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: MIME_BY_EXT[safeExt] }), `audio.${safeExt}`);
  form.append("model", model);
  // Together's `language` param defaults to "en", which TRANSLATES other languages to English.
  // "auto" transcribes in the spoken language instead (no forced translation).
  form.append("language", "auto");
  const res = await fetch(`${AUDIO_BASE}/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.TOGETHER_API_KEY}` },
    body: form,
  });
  const raw = await res.text();
  let data: { text?: string; error?: { message?: string } } | null = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }
  if (!res.ok || !data?.text) {
    const errMsg = data?.error?.message || raw.slice(0, 300);
    throw new Error(`ASR ${model} HTTP ${res.status}: ${errMsg || "(empty body)"}`);
  }
  return data.text.trim();
}

async function togetherBrain(
  env: Env,
  mode: "voice" | "text",
  original: string,
  nativeLang: string,
  history: { role: string; text: string }[]
): Promise<{ correction: string; segments: Segment[] }> {
  const model = env.TOGETHER_LLM_MODEL || DEFAULT_LLM;
  const system =
    "You are a warm, patient English tutor who also speaks the learner's native language fluently. You are " +
    "helping a native " +
    (nativeLang && NATIVE_LANGS.has(nativeLang) ? `"${nativeLang}"` : "language") +
    " speaker learn English, the way a real human tutor would. TEACH AND SPEAK MOSTLY ENGLISH and correct " +
    "their English, but occasionally drop in ONE SHORT native-language clue to help them understand — never " +
    "over-explain in the native language, because the learner is here to PRACTICE ENGLISH. " +
    'Return STRICT JSON only (no markdown): {"correction": string, "segments": [{"text": string, "lang": string}]}. ' +
    '"correction" is a short fix of what they said (empty string if natural). "segments" are what you SAY OUT ' +
    "LOUD in order; most are English (lang=en), with at most one short native-language clue per reply (lang=" +
    `"${nativeLang && NATIVE_LANGS.has(nativeLang) ? nativeLang : "en"}"). ` +
    "RULES: short, natural, conversational sentences; no run-ons; NEVER include reasoning, meta-commentary, or " +
    'phrases like "let me think" — just say the tutor line.';

  const messages = [{ role: "system", content: system }];
  if (history && history.length) {
    for (const h of history.slice(-8)) {
      // Chat APIs accept only system/user/assistant/... — map our client's "tutor" role to "assistant".
      const role = h.role === "tutor" ? "assistant" : h.role === "user" ? "user" : null;
      if (role) messages.push({ role, content: h.text });
    }
  }
  const userContent =
    mode === "text" ? original : `The learner said: "${original}". Correct it and keep the conversation going.`;
  messages.push({ role: "user", content: userContent });

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.TOGETHER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 240,
      response_format: { type: "json_object" },
    }),
  });
  const raw = await res.text();
  let data: { choices?: { message?: { content?: string } }[]; error?: { message?: string } } | null = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }
  if (!res.ok || !data?.choices?.[0]?.message?.content) {
    const errMsg = data?.error?.message || raw.slice(0, 300);
    throw new Error(`LLM ${model} HTTP ${res.status}: ${errMsg || "(empty body)"}`);
  }
  const content = data.choices[0].message.content;
  let parsed: { correction?: string; segments?: Segment[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    // Fallback if the model returns non-JSON: treat whole output as one English segment.
    parsed = { correction: "", segments: [{ text: content, lang: "en" }] };
  }
  const segments = Array.isArray(parsed.segments) && parsed.segments.length ? parsed.segments : [{ text: raw, lang: "en" }];
  return { correction: parsed.correction || "", segments };
}

// ---------- WAV concatenation (single-voice, multi-language audio) ----------

// Parse a wav buffer and return the raw PCM bytes AFTER its 'data' chunk header.
function pcmFromWav(buf: Uint8Array): Uint8Array {
  // Scan chunks until 'data'.
  let off = 12;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  while (off + 8 <= buf.byteLength) {
    const id = String.fromCharCode(buf[off], buf[off + 1], buf[off + 2], buf[off + 3]);
    const size = dv.getUint32(off + 4, true);
    if (id === "data") {
      return buf.subarray(off + 8, off + 8 + Math.min(size, buf.byteLength - (off + 8)));
    }
    off += 8 + size;
  }
  return buf.subarray(44); // fallback
}

function concatWavs(chunks: Uint8Array[], sampleRate: number): Uint8Array {
  const pcmParts = chunks.map(pcmFromWav);
  const dataLen = pcmParts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(44 + dataLen);
  const dv = new DataView(out.buffer);
  const w = (s: string, o: number) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
  w("RIFF", 0); dv.setUint32(4, 36 + dataLen, true); w("WAVE", 8);
  w("fmt ", 12); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  w("data", 36); dv.setUint32(40, dataLen, true);
  let o = 44;
  for (const p of pcmParts) { out.set(p, o); o += p.length; }
  return out;
}

async function togetherSpeechPerSegment(
  env: Env,
  segment: Segment
): Promise<{ bytes?: Uint8Array; error?: string }> {
  const model = env.TOGETHER_TTS_MODEL || DEFAULT_TTS;
  const sampleRate = 24000;
  try {
    const res = await fetch(`${AUDIO_BASE}/speech`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.TOGETHER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: segment.text,
        // Same single voice regardless of segment.lang; the model infers language from the text.
        voice: env.TOGETHER_TTS_VOICE || defaultVoiceFor(model),
        response_format: "wav",
        sample_rate: sampleRate,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { error: `${model} TTS HTTP ${res.status}: ${txt.slice(0, 300)}` };
    }
    return { bytes: new Uint8Array(await res.arrayBuffer()) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "TTS error" };
  }
}

async function ttsSegments(
  env: Env,
  segments: Segment[]
): Promise<{ audio_base64?: string; warnings: string[] }> {
  const chunks: Uint8Array[] = [];
  const warnings: string[] = [];
  const sampleRate = 24000;
  for (const seg of segments) {
    const { bytes, error } = await togetherSpeechPerSegment(env, seg);
    if (bytes && bytes.byteLength > 0) chunks.push(bytes);
    else warnings.push(`Could not speak segment (${seg.lang}): ${error || "no audio"}`);
  }
  if (!chunks.length) return { warnings };
  return { audio_base64: base64FromBytes(concatWavs(chunks, sampleRate)), warnings };
}

function base64FromBytes(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

// ---------- Router ----------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? "";
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST" || url.pathname !== "/api/tutor") {
      return jsonResponse({ error: "Not found" }, 404, headers);
    }
    if (!env.TOGETHER_API_KEY) {
      return jsonResponse({ error: "Service not configured (TOGETHER_API_KEY)" }, 500, headers);
    }

    try {
      const body = (await request.json()) as TutorRequest;
      const mode = body.mode === "text" ? "text" : "voice";
      const nativeLang = body.native_language || "";
      const history = Array.isArray(body.history) ? body.history : [];
      console.log(`[tutor] request mode=${mode} lang=${nativeLang || "en"} audioLen=${body.audio_base64 ? body.audio_base64.length : 0}`);

      // ---- original text ----
      let original = (body.text || "").trim();
      if (mode === "text") {
        if (!original) return jsonResponse({ error: "No text provided" }, 400, headers);
      } else {
        if (!body.audio_base64) return jsonResponse({ error: "No audio provided" }, 400, headers);
        original = await togetherTranscribe(env, body.audio_base64, body.audio_format || "");
        console.log(`[tutor] asr ok: "${(original || "").slice(0, 120)}"`);
        if (!original) return jsonResponse({ error: "Could not transcribe audio" }, 422, headers);
      }

      // ---- brain: correction + language-tagged segments ----
      const { correction, segments } = await togetherBrain(env, mode, original, nativeLang, history);
      console.log(`[tutor] brain ok: correction="${(correction || "").slice(0, 80)}" segments=${segments.length}`);

      // ---- TTS (voice mode only) ----
      const result: TutorResult = { mode, original, correction, segments };
      if (mode === "voice") {
        const { audio_base64, warnings } = await ttsSegments(env, segments);
        result.audio_base64 = audio_base64;
        result.tts_warning = warnings.length ? warnings.join(" | ") : null;
        console.log(`[tutor] tts ok: audioLen=${audio_base64 ? audio_base64.length : 0} warnings=${warnings.length}`);
      }

      return jsonResponse(result, 200, headers);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Internal server error";
      return jsonResponse({ error: msg }, 500, headers);
    }
  },
};
