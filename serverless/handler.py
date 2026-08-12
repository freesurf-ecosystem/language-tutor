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
import subprocess
import tempfile
import runpod

os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

try:
    import torch
    import numpy as np
    import soundfile as sf
    from faster_whisper import WhisperModel
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
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

# Language → Kokoro lang code mapping (only codes with actual voice files)
LANG_MAP = {
    "en": "a", "es": "e", "fr": "f", "it": "i",
    "pt": "p", "de": "d", "hi": "h", "ja": "j",
}
REVERSE_LANG_MAP = {v: k for k, v in LANG_MAP.items()}

# Default female voice per Kokoro lang code
VOICE_MAP = {
    "a": "af_heart",   # American English
    "b": "bf_emma",    # British English
    "e": "ef_dora",    # Spanish
    "f": "ff_siwis",   # French
    "i": "if_sara",    # Italian
    "p": "pf_dora",    # Portuguese
    "d": "df_anna",    # German
    "h": "hf_alpha",   # Hindi
    "j": "jf_alpha",   # Japanese
}

TUTOR_PROMPT = """You teach English. Only speak English and {native_lang}.{marking_instruction}
Keep replies short. Be encouraging. No JSON."""

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
        quant = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.bfloat16)
        _llm = AutoModelForCausalLM.from_pretrained(
            "Qwen/Qwen2.5-3B-Instruct",
            dtype=torch.bfloat16,
            device_map="auto",
            quantization_config=quant,
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
    wav_path = None
    input_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".audio", delete=False) as f:
            f.write(audio_bytes)
            input_path = f.name
        wav_path = input_path + ".wav"
        subprocess.run(
            ["ffmpeg", "-y", "-i", input_path, "-ar", "16000", "-ac", "1", "-sample_fmt", "s16", wav_path],
            capture_output=True, check=True, timeout=30,
        )
        model = get_whisper()
        segments, info = model.transcribe(
            wav_path,
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(
                threshold=0.3,
                min_speech_duration_ms=200,
                min_silence_duration_ms=300,
                speech_pad_ms=200,
            ),
        )
        text = " ".join(s.text.strip() for s in segments)
        print(f"[Whisper] transcribed: '{text}' lang={info.language}", flush=True)
        return text, info.language
    finally:
        if wav_path and os.path.exists(wav_path):
            os.unlink(wav_path)
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)

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

    prompt = TUTOR_PROMPT.replace("{native_lang}", native_name if native_lang else "their language").replace(
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
    print(f"[Qwen] raw: {response[:300]}", flush=True)

    # Strip any JSON artifacts Qwen may still spit out
    import re
    response = re.sub(r'\{[\s"]*"(?:correction|response)"[\s:,"\{\}a-zA-Z0-9]*\}', '', response)
    response = response.strip()
    return None, response.strip()

def strip_lang_tags(text: str):
    """Remove [lang:XX] and [/lang] tags from display text while keeping content."""
    import re
    return re.sub(r'\[/?lang:\w*\]', '', text).strip()


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
    voice = VOICE_MAP.get(lang_code, "af_heart")
    generator = pipeline(text, voice=voice, speed=1.0)
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
            reply = "I didn't hear you. Can you say that again?"
            audio_b64_out = speak(reply, "a")
            return {
                "audio_base64": audio_b64_out,
                "original": "",
                "correction": "",
                "response": reply,
                "language": "en",
            }

        correction, reply = tutor_response(text, detected_lang, native_language)
        default_iso = "en"
        audio = speak_mixed(reply, default_iso) if reply else None
        display_reply = strip_lang_tags(reply) if reply else reply

        return {
            "original": text,
            "correction": correction,
            "response": display_reply,
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