// Native languages offered to the learner (BCP-47 code -> display label).
// Limited to the languages Qwen3-TTS speaks natively (EN, ES, FR, DE, IT, PT, RU,
// ZH, JA, KO) so the tutor's native-language clues always render in the same
// voice. "en" is omitted since English is the target language. Expand this when we
// move to a wider-coverage TTS (e.g. Chatterbox, 23+ languages).
export const NATIVE_LANGUAGES: Record<string, string> = {
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
};
