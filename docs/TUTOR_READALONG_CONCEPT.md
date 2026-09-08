# Read-Along English Tutor — Concept & Story Sources

> A possible repositioning of `tools.freesurf.tutor` as a **Read-Along English Tutor**: a library of
> leveled stories that a tutor reads aloud with the learner, word/sentence highlighted, then discusses —
> *"what do you think this means?"* — listening and gently correcting.
>
> Why: gives Apple a genuinely distinct, novel concept (vs. "another AI conversation app"), and doubles
> as ready TikTok content. Not Duolingo-style gamification — immersion + a patient tutor working through
> real text bit by bit.

---

## 1. Positioning (the "new angle")

- Most language apps gamify drills. This is **immersion**: a real story, read and talked through together.
- The tutor **reads slowly**, **highlights** the passage, and **waits for the student to speak** (no
  real-time streaming — push-to-talk only, so credits stay low and the learner drives the pace).
- Multilingual help (translate/simplify a line in the learner's language) uses the same single-voice,
  code-switching TTS.
- Distinct enough to read as a novel contribution rather than a repetitive concept.

---

## 2. Product flow

1. **Library** — a curated set of leveled stories (start small, grow over time).
2. **Read-along player** — big font, high contrast; tutor voice reads with the current phrase highlighted.
3. **Comprehension loop** (reuses the existing worker): after a passage the tutor asks
   *"what do you think this means?"* → learner answers (voice or text) → gentle correction → next line.

### Highlight scope (v1)
- **Sentence/phrase-level highlight**, synced to per-segment audio (we already TTS per segment).
- **Word-level** highlight deferred — it needs per-word timestamps (TTS timestamps or forced alignment).
- **No real-time voice** in v1 — push-to-talk to avoid burning credits and to wait for the student.

---

## 3. Story sources (freely usable reference)

Curated list of license-safe sources, with notes for our use:

[more info here: Set the env flags (from earlier): USAGE_METERING=on, TRANSCRIBER_MONTHLY_SECONDS=60, plus SUPABASE_URL + SUPABASE_SECRET_KEY if not already set.]

| Source | Notes for us |
|---|---|
| **Project Gutenberg** | Huge public-domain corpus. Not leveled; older/archaic language = hard for beginners. Good for advanced. Copyright differs by country (PD in the US may not be elsewhere) — be careful if targeting international learners. |
| **Standard Ebooks** | Same PD corpus, hand-cleaned + beautifully formatted. Easier to import clean text than raw Gutenberg. |
| **LibriVox + Gutenberg pair** | PD **audiobook audio + matching text**. Excellent for read-along, pronunciation, "listen → you read → translate." |
| **StoryWeaver (Pratham Books)** | Free, **CC-licensed, genuinely leveled, multilingual** children's stories. Best for low-level/beginner learners and for stories in the learner's own language alongside English. |
| **Simple English Wikipedia** | Free (CC), ~2,000-word controlled vocabulary. Good leveled non-fiction (not literary). |
| **VOA Learning English** | US federal content, generally public domain; leveled news + audio. |
| **Lit2Go (USF)** | Free PD classics with **readability levels** + free MP3 audio. Very on-target. |

---

## 4. Sourcing / curation plan

- **Start small:** a handful of genuinely leveled pieces (StoryWeaver for beginners, Lit2Go mid, re-leveled
  PD for variety) and grow the database over time as we find/add more.
- **Beginner PD is scarce** (old = hard). Use **CC children's libraries** for low levels, and for PD
  classics let the LLM **re-level** them ("simplify to CEFR B1, keep the plot") — copyright-clean and gives
  real leveled classics.
- Tag everything by **CEFR level** and **learner language** so the library is filterable.
- The read-along format itself is the **TikTok asset**: a short story at A2, highlight following, then a
  comprehension question — cheap to produce from the same library.

---

## 5. Relationship to the existing work
- Reuses the existing worker (`/api/tutor` pipeline: ASR + LLM brain + swappable TTS) and the
  language-tagged segments / multilingual TTS.
- The current voice-conversation orb becomes one *mode* ("talk it through"); reading becomes the primary
  framing and material.
- Anonymous-first, local progress (per the redesign doc).

**Status:** concept. Not committed. References `docs/TUTOR_REDESIGN_PRODUCT.md`, `docs/TUTOR_VISUAL_DESIGN.md`,
`docs/TUTOR_AI_PIPELINE.md`.
