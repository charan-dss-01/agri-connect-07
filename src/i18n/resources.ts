import authEn from "./locales/en/auth";
import commonEn from "./locales/en/common";
import adminEn from "./locales/en/admin";
import farmerEn from "./locales/en/farmer";
import industryEn from "./locales/en/industry";
import landingEn from "./locales/en/landing";
import settingsEn from "./locales/en/settings";
import authHi from "./locales/hi/auth";
import commonHi from "./locales/hi/common";
import adminHi from "./locales/hi/admin";
import farmerHi from "./locales/hi/farmer";
import industryHi from "./locales/hi/industry";
import landingHi from "./locales/hi/landing";
import settingsHi from "./locales/hi/settings";
import authTe from "./locales/te/auth";
import commonTe from "./locales/te/common";
import adminTe from "./locales/te/admin";
import farmerTe from "./locales/te/farmer";
import industryTe from "./locales/te/industry";
import landingTe from "./locales/te/landing";
import settingsTe from "./locales/te/settings";

export const defaultNS = "common";
export const fallbackLanguage = "en";
export const languageStorageKey = "agriconnect-language";
export const supportedLanguages = ["en", "hi", "te"] as const;
export const languageLocales = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
} as const;

export type AppLanguage = (typeof supportedLanguages)[number];

export const resources = {
  en: {
    common: commonEn,
    admin: adminEn,
    landing: landingEn,
    auth: authEn,
    farmer: farmerEn,
    industry: industryEn,
    settings: settingsEn,
  },
  hi: {
    common: commonHi,
    admin: adminHi,
    landing: landingHi,
    auth: authHi,
    farmer: farmerHi,
    industry: industryHi,
    settings: settingsHi,
  },
  te: {
    common: commonTe,
    admin: adminTe,
    landing: landingTe,
    auth: authTe,
    farmer: farmerTe,
    industry: industryTe,
    settings: settingsTe,
  },
} as const;
