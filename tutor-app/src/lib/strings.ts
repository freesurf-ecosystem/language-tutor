// Minimal UI localization. Only a few strings are translated for now;
// extend this map as more of the UI needs to be localized.

const STRINGS: Record<string, Record<string, string>> = {
  language: {
    en: "Language",
    es: "Idioma",
    fr: "Langue",
    de: "Sprache",
    it: "Lingua",
    pt: "Idioma",
    nl: "Taal",
    ru: "Язык",
    zh: "语言",
    ja: "言語",
    ko: "언어",
    ar: "اللغة",
    hi: "भाषा",
    tr: "Dil",
    pl: "Język",
    sv: "Språk",
    da: "Sprog",
    fi: "Kieli",
    no: "Språk",
    el: "Γλώσσα",
    he: "שפה",
    sw: "Lugha",
    ms: "Bahasa",
  },
  close: {
    en: "Close",
    es: "Cerrar",
    fr: "Fermer",
    de: "Schließen",
    it: "Chiudi",
    pt: "Fechar",
    nl: "Sluiten",
    ru: "Закрыть",
    zh: "关闭",
    ja: "閉じる",
    ko: "닫기",
    ar: "إغلاق",
    hi: "बंद करें",
    tr: "Kapat",
    pl: "Zamknij",
    sv: "Stäng",
    da: "Luk",
    fi: "Sulje",
    no: "Lukk",
    el: "Κλείσιμο",
    he: "סגור",
    sw: "Funga",
    ms: "Tutup",
  },
};

export function t(lang: string | null, key: string): string {
  return STRINGS[key]?.[lang ?? "en"] ?? STRINGS[key]?.en ?? key;
}
