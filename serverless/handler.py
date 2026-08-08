"""
FreeSurf Language Tutor — consolidated STT + LLM + TTS handler.
Single endpoint: { "input": { "audio_base64": "...", "practice_language": "es" } }
Returns:        { "audio_base64": "...", "text": "corrected...", "original": "raw transcript", "language": "en" }
"""
print("BOOT: handler.py starting", flush=True)

import base64
import io
import os
import traceback
import sys
import runpod

os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

try:
    import torch
    import numpy as np
    import soundfile as sf
    from faster_whisper import WhisperModel
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from kokoro import KPipeline
    from langdetect import detect, DetectorFactory
    DetectorFactory.seed = 0

    print(f"CUDA available: {torch.cuda.is_available()}", flush=True)
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}", flush=True)
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.0f}GB", flush=True)
    print("All imports OK", flush=True)
except Exception:
    traceback.print_exc()
    sys.stderr.flush()
    raise

# Language → Kokoro lang code mapping
LANG_MAP = {
    "en": "a", "es": "e", "fr": "f", "de": "d", "it": "i",
    "pt": "p", "ja": "j", "hi": "h", "pl": "p",
}
# Kokoro code → ISO 639-1
REVERSE_LANG_MAP = {v: k for k, v in LANG_MAP.items()}

TUTOR_PROMPT = """You are a friendly language tutor. The student just said something in {language}.
{marking_instruction}
1. If there are grammar or pronunciation errors, gently correct them.
2. Respond naturally in {language} as a conversation partner. Keep it brief (1-3 sentences).
3. Add encouragement.

Format your response as JSON:
{{"correction": "corrected version of what they said (or null if correct)", "response": "your conversational reply in {language}"}}"""

_whisper = None
_llm = None
_tokenizer = None
_kokoro = {}

def get_whisper():
    global _whisper
    if _whisper is None:
        print("Loading Whisper...", flush=True)
        _whisper = WhisperModel("base", device="cuda" if torch.cuda.is_available() else "cpu", compute_type="float16")
        print("Whisper ready", flush=True)
    return _whisper

def get_llm():
    global _llm, _tokenizer
    if _llm is None:
        print("Loading LLM...", flush=True)
        _llm = AutoModelForCausalLM.from_pretrained(
            "Qwen/Qwen2.5-3B-Instruct",
            torch_dtype=torch.bfloat16,
            device_map="auto",
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
        )
        _tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-3B-Instruct")
        print("LLM ready", flush=True)
    return _llm, _tokenizer

def get_kokoro(lang_code="a"):
    if lang_code not in _kokoro:
        _kokoro[lang_code] = KPipeline(lang_code=lang_code)
    return _kokoro[lang_code]

def transcribe_audio(audio_base64: str):
    """Returns (text, language_code)"""
    audio_bytes = base64.b64decode(audio_base64)
    audio_np, sr = sf.read(io.BytesIO(audio_bytes))
    if len(audio_np.shape) > 1:
        audio_np = audio_np.mean(axis=1)
    if sr != 16000:
        import librosa
        audio_np = librosa.resample(audio_np.astype(np.float32), orig_sr=sr, target_sr=16000)
        sr = 16000
    audio_np = audio_np.astype(np.float32)

    model = get_whisper()
    segments, info = model.transcribe(audio_np, beam_size=5)
    text = " ".join(s.text.strip() for s in segments)
    return text, info.language

def tutor_response(text: str, lang: str, native_lang: str = ""):
    """Returns (correction, tutor_reply)"""
    model, tokenizer = get_llm()
    lang_names = {"en": "English", "es": "Spanish", "fr": "French", "de": "German",
                  "it": "Italian", "pt": "Portuguese", "ja": "Japanese"}
    lang_name = lang_names.get(lang, lang)

    marking = ""
    if native_lang and native_lang != lang:
        native_name = lang_names.get(native_lang, native_lang)
        marking = (
            f"When you use a word or phrase in {native_name}, "
            f"wrap it exactly like this: [lang:{native_lang}]word[/lang]. "
        )

    prompt = TUTOR_PROMPT.replace("{language}", lang_name).replace(
        "{marking_instruction}", marking
    )
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": text},
    ]
    formatted = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(formatted, return_tensors="pt").to(model.device)
    output = model.generate(**inputs, max_new_tokens=256, temperature=0.7, do_sample=True)
    response = tokenizer.decode(output[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)

    import re, json
    json_match = re.search(r'\{.*\}', response.replace("\n", " "), re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group(0))
            return data.get("correction"), data.get("response", response)
        except:
            pass
    return None, response

def split_by_language(text: str, default_lang_iso: str = "en"):
    """Split mixed-language text into [(segment, kokoro_lang_code), ...].
    Uses [lang:XX]...[/lang] markers if present, otherwise sentence-level detection."""
    import re

    marker_re = re.compile(r'\[lang:(\w+)\](.*?)\[/lang\]', re.DOTALL)
    if marker_re.search(text):
        return _split_by_markers(text, marker_re, default_lang_iso)

    return _split_by_sentences(text, default_lang_iso)


def _split_by_markers(text, marker_re, default_iso):
    segments = []
    last_end = 0
    for m in marker_re.finditer(text):
        before = text[last_end:m.start()].strip()
        if before:
            kcode = LANG_MAP.get(default_iso, "a")
            if segments and segments[-1][1] == kcode:
                segments[-1] = (segments[-1][0] + " " + before, kcode)
            else:
                segments.append((before, kcode))
        iso = m.group(1)
        word = m.group(2).strip()
        if word:
            kcode = LANG_MAP.get(iso, LANG_MAP.get(default_iso, "a"))
            if segments and segments[-1][1] == kcode:
                segments[-1] = (segments[-1][0] + " " + word, kcode)
            else:
                segments.append((word, kcode))
        last_end = m.end()
    after = text[last_end:].strip()
    if after:
        kcode = LANG_MAP.get(default_iso, "a")
        if segments and segments[-1][1] == kcode:
            segments[-1] = (segments[-1][0] + " " + after, kcode)
        else:
            segments.append((after, kcode))
    if not segments:
        segments.append((text, LANG_MAP.get(default_iso, "a")))
    return segments


def _split_by_sentences(text, default_iso):
    import re
    sentences = re.split(r'(?<=[.!?])\s+', text)
    segments = []
    for sent in sentences:
        if not sent.strip():
            continue
        try:
            iso = detect(sent)
        except Exception:
            iso = default_iso
        kcode = LANG_MAP.get(iso, "a")
        if segments and segments[-1][1] == kcode:
            segments[-1] = (segments[-1][0] + " " + sent, kcode)
        else:
            segments.append((sent, kcode))
    if not segments:
        segments.append((text, LANG_MAP.get(default_iso, "a")))
    return segments


def speak_mixed(text: str, default_lang_iso: str = "en"):
    """Returns base64 WAV audio, auto-switching Kokoro voices by detected language."""
    segments = split_by_language(text, default_lang_iso)
    chunks = []
    for seg_text, kcode in segments:
        audio_b64 = speak(seg_text, kcode)
        if audio_b64:
            audio_bytes = base64.b64decode(audio_b64)
            audio_np, sr = sf.read(io.BytesIO(audio_bytes))
            chunks.append(audio_np)
    if not chunks:
        return None
    combined = np.concatenate(chunks)
    buf = io.BytesIO()
    sf.write(buf, combined, 24000, format="WAV")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def speak(text: str, lang_code: str = "a"):
    """Returns base64 WAV audio for a single-language segment"""
    pipeline = get_kokoro(lang_code)
    generator = pipeline(text, voice=f"{lang_code}f_heart", speed=1.0)
    all_samples = []
    for _, _, audio in generator:
        all_samples.append(audio)
    if not all_samples:
        return None
    audio_array = np.concatenate(all_samples)

    buf = io.BytesIO()
    sf.write(buf, audio_array, 24000, format="WAV")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")

def handler(event):
    job_input = event.get("input", {})
    audio_b64 = job_input.get("audio_base64", "")
    if not audio_b64:
        return {"error": "No audio_base64 provided"}

    native_language = job_input.get("native_language", "")

    try:
        text, detected_lang = transcribe_audio(audio_b64)
        if not text.strip():
            return {"error": "No speech detected"}

        correction, reply = tutor_response(text, detected_lang, native_language)
        default_iso = native_language if native_language else detected_lang
        audio = speak_mixed(reply, default_iso) if reply else None

        return {
            "original": text,
            "correction": correction,
            "response": reply,
            "audio_base64": audio,
            "language": detected_lang,
        }
    except Exception:
        return {"error": traceback.format_exc()}

if __name__ == "__main__":
    try:
        import subprocess, tempfile
        print("Pre-warming models...", flush=True)
        get_whisper()
        print("Whisper OK", flush=True)
        get_llm()
        print("LLM OK", flush=True)
        get_kokoro("a")
        print("Kokoro OK", flush=True)
        print("All models ready!", flush=True)
        runpod.serverless.start({"handler": handler})
    except Exception:
        traceback.print_exc()
        sys.stderr.flush()
        raise