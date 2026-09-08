# Tutor AI Pipeline — Worker Contract

> How the FreeSurf English tutor's worker composes **ASR → LLM "brain" → TTS** and returns language-tagged
> segments to the mobile client. Applies to BOTH the current Expo app and the future Kotlin/Swift rewrite.
>
> Goal: a **single tutor voice that can switch languages mid-response** (e.g., an English explanation
> with an inserted Spanish phrase is spoken with the *same* voice, just tagged `es` for that span), and
> a **text mode** that reuses the same brain without ASR/TTS.

---

## 1. Two input modes, one brain

- **Voice mode:** client records → sends `audio_base64` → worker runs ASR → brain → TTS → returns audio + transcript.
- **Text mode:** client sends `text` → brain (no ASR/TTS) → returns text. Cheap (no audio cost) and a UX differentiator.

The **brain** is the same in both; only the I/O shell differs.

## 2. Worker endpoint: `POST /api/tutor`

Request:

```jsonc
{
  "mode": "voice",                  // "voice" | "text"
  "audio_base64": "<...>",          // required if mode=voice (single student, no diarization)
  "text": "I goed to the store",    // required if mode=text
  "native_language": "es",          // learner's native language (BCP-47, from the 22-lang list)
  "history": [                      // prior turns (for context)
    { "role": "user", "text": "..." },
    { "role": "tutor", "text": "..." }
  ]
}
```

## 3. The brain output — language-tagged segments

The LLM must return a **structured** object (not freeform), with every spoken segment tagged by language.
This is the "per-portion tagging" the product wants: an English paragraph can embed a Spanish phrase, and
each portion carries its own language so TTS knows how to render it.

```jsonc
{
  "original": "I goed to the store",          // voice: ASR transcript (as spoken); text: echo input
  "correction": "I went to the store.",        // grammar fix (the core teaching signal)
  "segments": [                                // what to say / show, in order
    { "text": "Great try! You said, \"I goed\".", "lang": "en" },
    { "text": "The past tense of \u201cgo\u201d is irregular.", "lang": "en" },
    { "text": "En espa\u00f1ol dir\u00edas \u201cfui\u201d.", "lang": "es" },
    { "text": "Now try again: I ___ to the store yesterday.", "lang": "en" }
  ],
  "segment": "A pronoun before a verb is never correct: we say \u201cI went\u201d, not \u201cI goed\u201d."
}
```

- `lang` is BCP-47 (`en`, `es`, ...). A response can mix many `lang`s freely (code-switching) — each
  portion is self-tagged.
- Keep `correction` short and prominent; put fuller explanations in `segments`.
- LLM prompt responsibility: choose `segments[].lang` = the language it wants *spoken*, so the TTS layer
  needs no guesswork.

## 4. TTS rendering (same voice, per-segment language)

For **voice mode**, the worker stitches the segments into spoken audio:

1. Pick a **single voice_id** (e.g., a Cartesia Sonic voice) for the whole tutor session.
2. For each segment, call TTS with that same `voice_id` and `language = segment.lang`:
   `TTS(text=segment.text, voice=voice_id, language=segment.lang)`.
3. Concatenate the resulting audio chunks **in order** → one base64 audio blob → return.

Because `voice_id` is constant and only `language` changes per segment, the learner hears one coherent
voice switching languages mid-utterance — the fix for Kokoro's per-language-voice limitation.

> If the TTS provider lacks a segment's language, the worker should either skip/English-fallback that
> span or flag it, and surface a `tts_warning` in the response (client can show text-only for that span).

## 5. Response to the client

```jsonc
{
  "original": "...",                 // as spoken/typed (voice: ASR; text: echoed)
  "correction": "...",               // grammar fix
  "segments": [ { "text": "...", "lang": "es" }, ... ],  // render in order; color/lang per span
  "audio_base64": "<...>",           // voice mode: stitched TTS audio (same voice, mixed languages)
  "mode": "voice",                   // echo for client
  "tts_warning": null                // non-null if a segment's language was unsupported
}
```

**Client render rules**
- Show `correction` (e.g., struck-through original → correction) and then each `segment` in sequence.
- In **text mode**, render `segments[].text` plainly (no audio path needed).
- In **voice mode**, play `audio_base64` and highlight segments as they're spoken (if we add timestamps later).
- `lang` lets the UI set per-segment styling or a "translation" affordance.

## 6. Model picks (Together AI / provider-agnostic seam)

| Stage | Pick | Why | Swap later |
|---|---|---|---|
| ASR | Whisper large-v3 | best multilingual + accented-learner accuracy | streaming Nemotron 0.6B when adding LiveKit |
| LLM brain | GLM 5.3 Flash | cheap, fast, strong corrections/multilingual; already in the GLM family | DeepSeek V4 Flash (budget) / MiniMax M3 (higher ceiling) |
| TTS | Cartesia Sonic | single voice across languages (per-segment `lang`) | open TTS after traction (weak cross-lingual same-voice today) |

Keep all three behind a small interface in the worker so providers can be swapped without client changes.

## 7. Open / next
- Confirm Together's Cartesia Sonic exposes a stable `voice_id` that can switch `language` per call (else
  we return per-segment audio and let the client play them in order).
- Define whether `history` is capped (e.g., last N turns) to bound cost/context.
- Decide timestamps later if we want per-word highlighting.
