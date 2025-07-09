// src/i18n/I18nProvider.js - Better Alternative Configuration
import i18n from "i18next";
import { initReactI18next, I18nextProvider } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import individual JSON files directly
import commonEn from "./locales/en/common.json";
import authEn from "./locales/en/auth.json";
import navigationEn from "./locales/en/navigation.json";
import dashboardEn from "./locales/en/dashboard.json";
import tasksEn from "./locales/en/tasks.json";
import workflowsEn from "./locales/en/workflows.json";
import formsEn from "./locales/en/forms.json";
import filesEn from "./locales/en/files.json";
import webhooksEn from "./locales/en/webhooks.json";
import reportsEn from "./locales/en/reports.json";
import adminEn from "./locales/en/admin.json";
import notificationsEn from "./locales/en/notifications.json";
import scriptsEn from "./locales/en/scripts.json";
import profileEn from "./locales/en/profile.json";
import designerEn from "./locales/en/designer.json";
import validationEn from "./locales/en/validation.json";
import myWorkflowEn from "./locales/en/myWorkflow.json";

import commonAr from "./locales/ar/common.json";
import authAr from "./locales/ar/auth.json";
import navigationAr from "./locales/ar/navigation.json";
import dashboardAr from "./locales/ar/dashboard.json";
import tasksAr from "./locales/ar/tasks.json";
import workflowsAr from "./locales/ar/workflows.json";
import formsAr from "./locales/ar/forms.json";
import filesAr from "./locales/ar/files.json";
import webhooksAr from "./locales/ar/webhooks.json";
import reportsAr from "./locales/ar/reports.json";
import adminAr from "./locales/ar/admin.json";
import notificationsAr from "./locales/ar/notifications.json";
import scriptsAr from "./locales/ar/scripts.json";
import profileAr from "./locales/ar/profile.json";
import designerAr from "./locales/ar/designer.json";
import validationAr from "./locales/ar/validation.json";
import myWorkflowAr from "./locales/ar/myWorkflow.json";

// Merge all translations into a single object for each language
const mergeTranslations = (...translations) => {
  return translations.reduce((acc, translation) => {
    return { ...acc, ...translation };
  }, {});
};

// Translation resources - Merged structure without namespaces
const resources = {
  en: {
    translation: mergeTranslations(
      commonEn,
      authEn,
      navigationEn,
      dashboardEn,
      tasksEn,
      workflowsEn,
      formsEn,
      filesEn,
      webhooksEn,
      reportsEn,
      adminEn,
      notificationsEn,
      scriptsEn,
      profileEn,
      designerEn,
      validationEn,
      myWorkflowEn
    ),
  },
  ar: {
    translation: mergeTranslations(
      commonAr,
      authAr,
      navigationAr,
      dashboardAr,
      tasksAr,
      workflowsAr,
      formsAr,
      filesAr,
      webhooksAr,
      reportsAr,
      adminAr,
      notificationsAr,
      scriptsAr,
      profileAr,
      designerAr,
      validationAr,
      myWorkflowAr
    ),
  },
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
    });
}

export const I18nProvider = ({ children }) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default i18n;
