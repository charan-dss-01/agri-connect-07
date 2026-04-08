import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { defaultNS, fallbackLanguage, languageStorageKey, resources, supportedLanguages } from "./resources";

const syncDocumentLanguage = (language: string) => {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: fallbackLanguage,
    supportedLngs: supportedLanguages,
    load: "languageOnly",
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: languageStorageKey,
      caches: ["localStorage"],
    },
  });

syncDocumentLanguage(i18n.resolvedLanguage ?? fallbackLanguage);
i18n.on("languageChanged", syncDocumentLanguage);

export default i18n;
