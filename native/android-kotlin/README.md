# FreeSurf English Tutor — Android (native Kotlin)

Native Android rewrite of the English tutor (replacing the Expo/RN binary for this app), so the submitted
binary is genuinely platform-native rather than a shared-RN "template". Keeps the same production lane:
**`applicationId tools.freesurf.tutor`** (dev: `tools.freesurf.tutor.dev`).

> **In scope:** auth, onboarding/consents, home + notes, voice tutor (mic → worker → language-tagged
> segments + audio). **Out of scope:** virtual-assistant / Twilio calling.
> AI contract: see `../../docs/TUTOR_AI_PIPELINE.md` and `../../docs/NATIVE_REWRITE_PLAN.md`.

## Open & build

This is a **foundation scaffold** and has not been compiled here (no Android toolchain in this
environment). To build it:

1. Open this folder (`native/android-kotlin`) in **Android Studio**.
2. Android Studio will sync Gradle. The **`gradle-wrapper.jar` is not committed** — if prompted, run the
   wrapper task or let Android Studio configure Gradle (it will use `gradle-wrapper.properties` version
   8.11.1).
3. If the sync errors on SDK/plugin versions, adjust `gradle/libs.versions.toml` (AGP/Kotlin/Compose) and
   `compileSdk`/`targetSdk` in `app/build.gradle.kts` to match your installed SDK. `compileSdk 36` mirrors
   the existing Expo prebuild.

## Structure

```
app/src/main/java/tools/freesurf/tutor/
  MainActivity.kt              # entry: sets Compose content
  data/TutorBrain.kt           # public config (worker URL, Supabase) + language list
  ui/theme/Theme.kt            # FreeSurf light/dark Compose theme
  ui/home/HomeScreen.kt        # placeholder home
app/src/main/AndroidManifest.xml   # INTERNET + RECORD_AUDIO
app/build.gradle.kts              # applicationId tools.freesurf.tutor; public BuildConfig fields
gradle/libs.versions.toml         # AGP/Kotlin/Compose versions (edit to match toolchain)
```

## Next steps (in order)
1. Supabase auth (email/password + Google/Apple) + Onboarding consents + digest opt-in.
2. Native-language picker persisted to DataStore.
3. Conversation screen: record mic → POST `/api/tutor` → render language-tagged segments + play audio.
4. Notes/Transcripts local storage.

## Identity note
`com.emmaline.app` belongs to a different (future) virtual-assistant app — not used here. See
`../../docs/NATIVE_REWRITE_PLAN.md`.
