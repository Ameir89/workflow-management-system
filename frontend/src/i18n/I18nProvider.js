// src/i18n/I18nProvider.js - Fixed to persist language selection
import i18n from "i18next";
import { initReactI18next, I18nextProvider } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en/";
import ar from "./locales/ar/";
// Merge all translations into a single object for each language
const mergeTranslations = (...translations) => {
  return translations.reduce((acc, translation) => {
    return { ...acc, ...translation };
  }, {});
};

// Translation resources - Merged structure without namespaces
const resources = {
  en: {
    translation: mergeTranslations(...Object.values(en)),
  },
  ar: {
    translation: mergeTranslations(...Object.values(ar)),
  },
};

// Get the stored language or default to English
const getStoredLanguage = () => {
  try {
    return localStorage.getItem("i18nextLng") || "en";
  } catch (error) {
    return "en";
  }
};

// Initialize i18n only if not already initialized
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "en",
      lng: getStoredLanguage(), // Use stored language
      debug: false,

      interpolation: {
        escapeValue: false, // React already escapes values
      },

      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
        lookupLocalStorage: "i18nextLng",
        checkWhitelist: true,
      },

      // Use single namespace
      ns: ["translation"],
      defaultNS: "translation",

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
      nsSeparator: false, // Disable namespace separator since we're not using namespaces

      // Whitelist supported languages
      supportedLngs: ["en", "ar"],
      nonExplicitSupportedLngs: false,
    });
}

// Add language change handler to update document direction
i18n.on("languageChanged", (lng) => {
  // Update document direction for RTL/LTR
  const direction = lng === "ar" ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", direction);
  document.documentElement.setAttribute("lang", lng);

  // Store the language preference
  try {
    localStorage.setItem("i18nextLng", lng);
  } catch (error) {
    console.warn("Could not save language preference:", error);
  }
});

// Set initial direction on page load
const currentLang = i18n.language || getStoredLanguage();
const initialDirection = currentLang === "ar" ? "rtl" : "ltr";
document.documentElement.setAttribute("dir", initialDirection);
document.documentElement.setAttribute("lang", currentLang);

export const I18nProvider = ({ children }) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default i18n;
