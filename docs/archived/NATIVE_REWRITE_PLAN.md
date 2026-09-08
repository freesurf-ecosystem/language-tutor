# Native Rewrite Plan — Emmaline / English Tutor

> Goal (per product owner): keep the **same store lane, app identity, and bundle IDs** — but submit a
> **natively implemented binary** (Kotlin on Android, Swift on iOS) instead of the Expo/React Native
> binary, so Apple's automated review doesn't flag it as a repetitive "template" app, and so the app
> reads as a unique, worthwhile contribution.
>
> **NOT changing** bundles/packages or the store lane. We are only changing **how the binary is built**.

Status: **planning** — no native code scaffolded yet. This doc captures what we learned by reading the
current RN app so the native build is grounded, not guessed.

---

## 1. Identity — CONFIRMED

Confirmed by product owner: the tutor production lane is **`tools.freesurf.tutor`**. (`com.emmaline.app`
is a *different*, future app for the virtual-assistant space — not this rewrite.)

| Scope | Value |
|---|---|
| **Android `applicationId` (production)** | `tools.freesurf.tutor` |
| **iOS `bundleIdentifier` (production)** | `tools.freesurf.tutor` |
| Dev / preview variant | `tools.freesurf.tutor.dev` |
| Display scheme | `freesurf-tutor` |

`app.json`'s `com.emmaline.app` entry is stale/for-another-app and should not be used for this rewrite.

---

## 2. Current app surface — INVENTORY (grounded in actual `mobile/src`)

**Important finding:** the RN deps list (`package.json`) is misleading — most heavy libs (Twilio,
`incall-manager`, `expo-audio/av`, `speech`) belong to the **virtual-assistant call** feature, which we
are **excluding** from this tutor rewrite. The actual on-screen **tutor core is small, clean, and local**:

### The tutor core (PORT to native)
- **`App.js`** — theme (dark default, primary `#5b8cff`), session gate: loading → Onboarding (if no
  session) → Home. iOS ATT tracking request.
- **`screens/Onboarding.js`** — Supabase auth: email/password + Google/Apple OAuth; sign-up consents
  (Terms / Privacy / AI-Processing) + FeedFree Digest opt-in (calls edge fn `feedfree-create-signup`).
- **`screens/NotesScreen.js` + `NoteCard.js`** — local Notes/Transcripts (AsyncStorage key
  `freesurf-tutor-notes`), two sections (Notes / Transcripts), editor w/ autosave, create/batch-delete.
- **`components/VoiceOrb.js`** — the conversation: mic record → base64 → POST worker `/api/tutor`
  `{audio_base64, native_language, history[]}` → `{original, correction, response, audio_base64}` →
  render transcript + play response audio (writes temp .wav), then auto-re-arm to record. Native-language
  setup modal + onboarding tooltip. States: idle/recording/thinking/speaking.
- **`navigation/AppNavigator.js`** — Home shell: Notes list + VoiceOrb FAB + hamburger menu (About,
  Support/Privacy/Terms links, 22-language native-language picker, theme toggle).
- **`lib/supabase.js`** — Supabase publishable key (already `sb_publishable_…`), SecureStore-backed
  session. **No secrets.**
- **Backend contract (the "brain", unchanged):** `POST https://freesurf-language-tutor.freesurf.workers.dev/api/tutor`
  does STT + LLM + TTS (RunPod-style stitch) and returns base64 audio. Mobile only records/sends/plays.

### Native-language list (22) — reused verbatim in native
`ar da de el es fi fr he hi it ja ko ms nl no pl pt ru sv sw tr zh`

### EXCLUDE from this rewrite (virtual-assistant / Twilio)
- `screens/CallScreen.js`, `CallDetailScreen.js`, `TimelineScreen.js`, `TranscriptScreen.js`,
  `CreateNoteScreen.js`-VA-variants, `components/CallButton.js`, `CallCard.js`, `FloatingCallButton.js`,
  and `mobile/src/utils/secureStorage.js` (legacy `emmaline_auth_token` — VA leftover).
- No CallKit / ConnectionService / in-call audio needed. "Voice" in the tutor = standard record+play.

### Simplified native feature list (Kotlin/Swift)
1. Supabase auth (email/password, Google, Apple) + secure session persistence.
2. Onboarding (consents + digest opt-in).
3. Home shell: Notes (local storage) + language picker (22) + theme + About/legal links.
4. Conversation screen: mic record → send base64 → render transcript → play returned audio.
5. Monetization hooks (later): RevenueCat soft-limit, optional.

### Native mapping
- **Supabase** → auth via GoTrue REST + PKCE (or a native client); session in EncryptedSharedPreferences/Keychain.
- **Audio** → Android `MediaRecorder`/`MediaPlayer` + `RECORD_AUDIO`; iOS `AVAudioRecorder`/`AVAudioPlayer`.
- **Local notes** → Android Room/DataStore; iOS Core Data/SwiftData.
- **Backend** → existing worker endpoint (unchanged).
- **UI** → Kotlin + Compose; Swift + SwiftUI.

---

## 3. Proposed approach

1. **Resolve identity** (Section 1) and lock the production bundle id for Android (`applicationId`) and
   iOS (`bundleIdentifier`).
2. **Scaffold Android (Kotlin) first** as the reference pattern (more self-contained to write/build
   correctly): a Compose app using the confirmed `applicationId`, matching display name/icon, wired to
   config (worker URL, Supabase, feature flags) — then grow feature-by-feature.
3. **Mirror to iOS (Swift)** once Android pattern is proven.
4. Keep the shared **AI worker + Supabase backend** unchanged; only the client changes.
5. Deliver incrementally so each platform's code can be built/verified in Android Studio / Xcode (we
   cannot compile here, so builds must happen on the developer's machine).

### Incremental feature order (suggested)
1. App shell + identity + config + navigation.
2. Auth (Supabase, incl. Apple on iOS).
3. Onboarding + consents + newsletter.
4. Core tutor/chat screen hitting the worker.
5. Monetization (RevenueCat) hooks / soft limit.
6. Voice call (Twilio) + audio + TTS — the hardest, do last.

---

## 4. Risks / prerequisites

- **Build environment required:** Android Studio (Kotlin/Compose) and Xcode (Swift) on the developer's
  machine. This environment has no mobile toolchain, so I can scaffold source but not compile/run it.
- **Identity must be locked first** to avoid store-lane breakage.
- **Full voice-call parity** (Twilio/in-call audio/CallKit) is the largest, riskiest slice — schedule it
  last and consider shipping text-chat tutor first for a unique-binary milestone.
- **Store-review risk:** the native apps must also be *visually* distinct and demonstrably valuable —
  code-language alone isn't proof of uniqueness to Apple.

---

## 5. Open questions to answer before building
1. ~~Which is the real production identity?~~ **RESOLVED:** `tools.freesurf.tutor`.
2. Which single screen/feature must exist first to be a credible, shippable v1 of the native binary?
3. Does text-chat-first (no voice) count as an acceptable first native submission, or must voice be in?
