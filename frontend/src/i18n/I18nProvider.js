// src/i18n/I18nProvider.js - Fixed Configuration
import i18n from "i18next";
import { initReactI18next, I18nextProvider } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en/";
import ar from "./locales/ar/";

console.log("resources ", ar);
// Translation resources - Fixed structure
const resources = {
  en: en,
  ar: ar,
};

// Initialize i18n only if not already initialized
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "en",
      lng: "en", // Set default language
      debug: process.env.NODE_ENV === "development",

      interpolation: {
        escapeValue: false, // React already escapes values
      },

      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
        lookupLocalStorage: "i18nextLng",
      },

      // Namespace configuration
      ns: [
        "common",
        "auth",
        "navigation",
        "dashboard",
        "tasks",
        "workflows",
        "forms",
        "files",
        "webhooks",
        "reports",
        "admin",
        "notifications",
        "scripts",
        "profile",
        "designer",
        "validation",
      ],
      defaultNS: "common",

      // React specific options
      react: {
        useSuspense: false,
        bindI18n: "languageChanged",
        bindI18nStore: "",
        transEmptyNodeValue: "",
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ["br", "strong", "i"],
      },

      // Key separator and namespace separator
      keySeparator: ".",
      nsSeparator: ":",
    });
}

export const I18nProvider = ({ children }) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default i18n;
