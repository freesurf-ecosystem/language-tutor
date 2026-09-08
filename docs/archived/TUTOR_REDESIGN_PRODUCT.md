# English Tutor — Redesign (Product & Feature Doc)

> v2 of the FreeSurf English Tutor, rebuilt from a clean Expo base (`tutor-app/`), keeping the same store
> identity **`tools.freesurf.tutor`** and the name **"FreeSurf's English Tutor"**.
>
> Two goals:
> 1. A **genuinely better product** (not just a repaint).
> 2. A binary + design that reads as **clearly distinct** from the prior version and from the other apps
>    (to move past the reviewer "spam/template" flag and avoid repeat flags).

---

## 1. Core product thesis (one coherent loop)

Instead of bolting features onto the old bare mic app, make everything serve one story:

> **Import a document → the app extracts target vocabulary/sentences → auto-builds flashcards + quizzes →
> the student practices out loud (same tutor voice) → progress shows on a dashboard.**

One loop, one backend brain, one clear value: *"learn from your own material, with a tutor."*

**Feature surface**
- **Dashboard / home** — decks, quiz scores, practice streak, "words still weak." Simple cards, not art.
- **Document import** — paste text or import a file; the worker extracts vocabulary + example sentences.
- **Flashcards** — auto-built decks from an import; front/back text + a **Pronounce** button (same voice).
- **Quizzes** — LLM-generated multiple choice / fill-in / "which is correct," from the doc + deck.
- **Voice conversation** — the original tutor conversation, kept as the marquee feature.
- **Native-language picker** (22 languages) as the lightweight, non-gated entry point.

### Anonymous-first (no auth for now)
- **No sign-up/sign-in gate** — a user opens the app, picks their native language, and starts. Zero friction.
- Because there's no account, **progress is stored locally on-device** (decks, flashcards, quiz scores,
  imported docs, streak). No cross-device sync in v1.
- A shared cross-app subscription (the earlier reason we reached for auth) is **not a near-term concern** —
  defer it. If monetization is needed later, we revisit auth then, not now.

---

## 2. Design principle: text + audio first (avoid the graphics trap)

Flashcards/quizzes don't need AI-generated images. Keep v2 **text + voice**:

- Flashcard = text (word → example → translation hint in native language) + **audio** via the same
  single Cartesia voice (so the learner hears pronunciation in English and hints in their language).
- Quizzes = text only.
- **Defer images.** Revisit cover/deck art later, and only via optional/free sources — never per-card
  AI generation unless there's clear value + budget. This removes the graphics headache entirely and
  makes the product cheaper and faster to ship.

Audio cards are arguably *better* for a language tutor than static images anyway.

---

## 3. Distinct design language (address the "same template" read)

The prior apps all used **react-native-paper** with a similar look. A uniform UI across apps feeds the
"same developer / same template" impression. For v2:

- **Do not default to paper.** Build a **bespoke, lightweight design token system** (color, type scale,
  spacing, corner radii) on React Native core components, giving the app its own visual identity.
- Consider a different component/primitive layer if useful (e.g., NativeWind or Tamagui) **only if** it
  fits the visual direction — the goal is distinctness + lightness, not tooling for its own sake.
- Fresh iconography, layout, and empty/loading states that don't mirror the other FreeSurf apps.
- Keep the single shared thread = the **FreeSurf brand color/mark** (so it's clearly "ours" but not a clone).

Visual distinctness is part of the submission strategy, not just cosmetics.

---

## 4. Reuse, don't rebuild the backend

- Same worker: `POST /api/tutor` (contract in `docs/TUTOR_AI_PIPELINE.md`) for the conversation.
- **Vocabulary extraction / quiz generation** = new endpoints on the same worker using the LLM brain
  (GLM), returning language-tagged segments where spoken. No separate service needed.
- TTS stays one voice, per-segment language (Cartesia) so flashcards/quiz narration match the tutor.

---

## 5. Suggested build order (Google first, Apple later)

1. Native-language picker + clean home shell (anonymous, no auth).
2. Voice conversation (marquee, against the pipeline doc).
3. **Flashcards** (import a small doc → deck) — biggest new differentiator, text+audio.
4. Quiz on a deck.
5. Dashboard / streak last.
6. Revisit visuals/icons/images; then submit to Apple.

---

## 6. Review-pacing rules (Apple spam lesson)

The likely trigger for the "spam" flag was submitting **changes for ~4 apps at once** from one account.
Rules to avoid recurrence:

- **Submit one app's changes at a time**, spaced out (days apart, not same sitting).
- Make each app's **binary + UI genuinely distinct** (this redesign is the point).
- Avoid pushing near-identical changelogs/versions across apps at the same time.
- Prefer **substantive** updates (new feature/flow) over small tweaks to reduce churn.

A reviewer flag is recoverable (not a deactivation) — pacing + distinctness is the fix.

---

## 7. Identity / non-goals
- Identity stays **`tools.freesurf.tutor`**; name "FreeSurf's English Tutor".
- **Anonymous-first:** no auth/sign-in in v1; progress is local to the device.
- **Out of scope:** virtual-assistant / Twilio calling; per-card AI image generation for v1; shared
  cross-app subscription (deferred).
- New native (Kotlin/Swift) scaffold at `native/android-kotlin` is parked as a fallback if Apple still
  flags the Expo binary after a clearly redesigned v2.
