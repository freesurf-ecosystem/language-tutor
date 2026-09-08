package tools.freesurf.tutor.data

import tools.freesurf.tutor.BuildConfig

/**
 * Central config for the tutor client. All values here are PUBLIC (publishable/URLs) — never secrets.
 *
 * The AI brain contract lives in docs/TUTOR_AI_PIPELINE.md: the client sends audio (voice mode) or text
 * (text mode) + native_language + history to the worker, and gets back language-tagged segments + audio.
 */
object TutorBrain {
    val workerUrl: String = BuildConfig.WORKER_URL
    val supabaseUrl: String = BuildConfig.SUPABASE_URL
    val supabasePublishableKey: String = BuildConfig.SUPABASE_PUBLISHABLE_KEY

    /** Native-language codes shown in the language picker (BCP-47), matching the RN list. */
    val nativeLanguages: Map<String, String> = linkedMapOf(
        "ar" to "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
        "da" to "Dansk",
        "de" to "Deutsch",
        "el" to "\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac",
        "es" to "Espa\u00f1ol",
        "fi" to "Suomi",
        "fr" to "Fran\u00e7ais",
        "he" to "\u05e2\u05d1\u05e8\u05d9\u05ea",
        "hi" to "\u0939\u093f\u0928\u094d\u0926\u0940",
        "it" to "Italiano",
        "ja" to "\u65e5\u672c\u8a9e",
        "ko" to "\ud55c\uad6d\uc5b4",
        "ms" to "Bahasa Melayu",
        "nl" to "Nederlands",
        "no" to "Norsk",
        "pl" to "Polski",
        "pt" to "Portugu\u00eas",
        "ru" to "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
        "sv" to "Svenska",
        "sw" to "Kiswahili",
        "tr" to "T\u00fcrk\u00e7e",
        "zh" to "\u4e2d\u6587",
    )
}
