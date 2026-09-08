# English Tutor — Landing Concept & Store Pitch

> Pitch + first-screen concept for the redesigned "FreeSurf's English Tutor" (`tools.freesurf.tutor`).
> Written to (a) guide the build and (b) hand directly to Google Play / App Store review & listing.
> Does NOT reference the legacy app — this is a fresh concept.

---

## 1. The concept (the hook)

> **An AI tutor that studies *with* you.**

Not another "voice tutor" app (everyone has that) — a tutor you can talk to **while** you work on real
material. It stays docked and out of the way, then comes forward when you want to speak, type, or ask.

- Voice **and** text modes — full transcript of either.
- One consistent voice that can also explain in the learner's native language.
- Works alongside a document or flashcards on the same screen.

This is a genuinely different interaction model, which is what makes it read as a **unique contribution**
to the store rather than a template.

---

## 2. Landing experience (state machine)

1. **First open** → pick native language (no auth, no wall).
2. **Landing = a working surface**, not a chat list: it shows *your material* (a document or flashcard deck).
3. A **small docked orb / pill** ("Speak" / "Type") sits at the edge — the tutor, present but not blocking.
4. Tap it → the **conversation slides up into a panel** (voice or text). Transcripts accumulate either way.
5. **Chevron minimizes** it back to the docked orb so you and the tutor can keep viewing the doc/flashcards together.
6. (Later, optional) LiveKit → the panel becomes a **live, low-latency spoken** conversation.

**Key idea:** "start talking to the tutor" and "study a document with the tutor" are the *same* screen.
The landing page literally is *your material + a tutor you can summon*.

---

## 3. Store listing copy (draft)

> **FreeSurf's English Tutor — practice by speaking, with an AI tutor that studies beside you.**
>
> Most English apps make you choose: drill vocabulary, or chat with a bot. This one lets an AI tutor do
> *both at once*. Open a document or a flashcard deck, then summon a natural conversation tutor that stays
> docked at the edge of your screen — speak or type, get instant grammar corrections, and hear any word or
> sentence read aloud in a warm, consistent voice that can also explain in your native language (Arabic,
> Spanish, French, Japanese, and 18 more).
>
> Perfect your English from real material you actually care about. Completely free, private (everything
> stays on your device), and fully open source.

### Short taglines (A/B)
- "Speak English out loud — with a tutor that studies beside you."
- "Your AI English tutor. Voice or text. Docked while you work."
- "Practice English the way you'll actually use it: talking."

---

## 4. Reviewer-friendly framing (why this app / who it serves)

- Serves **international learners** who want to *speak*, not just tap.
- **Free + open source** — no paywalled features, transparent, self-hosting possible.
- **Private**: no account, no tracking — practice stays on-device.
- **Distinct UX**: conversation + material together (not a clone of existing language tools).
- **Single voice** that switches languages for help — one coherent tutor personality.

---

## 5. Privacy / open-source (store-visible)
- No account, no sign-in; progress local to the device.
- Open-source under a permissive license; "free tools, no subscription necessary."
- Honest AI-processing disclosure (per FreeSurf standard).

---

## 6. Non-goals for v1
- No auth/account/sync (anonymous-first).
- No virtual-assistant / Twilio calling.
- No per-card AI images (text + audio first).
- LiveKit real-time voice = later, only when worth the spend.

---

## 7. Suggested first-screen build (later, when coding)
1. Language picker (22 languages).
2. Landing surface with a docked conversation orb/pill.
3. Voice + text panel with transcript + chevron minimize.
4. (Then) document/flashcard material that the panel overlays.

Sequence target: Google first, Apple after the visual redesign is complete.
