// src/i18n/utils/translationHelpers.js

/**
 * Translation helper utilities for common patterns
 */

/**
 * Create translation function with default namespace
 * @param {Function} t - Translation function
 * @param {string} namespace - Default namespace
 * @returns {Function} Enhanced translation function
 */
export const createNamespacedTranslator = (t, namespace) => {
  return (key, options = {}) => {
    // If key already includes namespace, use as-is
    if (key.includes(":")) {
      return t(key, options);
    }

    // Otherwise, prepend namespace
    return t(`${namespace}:${key}`, options);
  };
};

/**
 * Format date based on current language
 * @param {Date|string} date - Date to format
 * @param {string} language - Language code
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
export const formatDate = (date, language, options = {}) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const defaultOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  };

  // Use Arabic locale for Arabic language
  const locale = language === "ar" ? "ar-SA" : "en-US";

  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
};

/**
 * Format number based on current language
 * @param {number} number - Number to format
 * @param {string} language - Language code
 * @param {Object} options - Intl.NumberFormat options
 * @returns {string} Formatted number
 */
export const formatNumber = (number, language, options = {}) => {
  const locale = language === "ar" ? "ar-SA" : "en-US";
  return new Intl.NumberFormat(locale, options).format(number);
};

/**
 * Get pluralized translation key
 * @param {string} key - Base translation key
 * @param {number} count - Count for pluralization
 * @param {Function} t - Translation function
 * @returns {string} Translated text
 */
export const pluralize = (key, count, t) => {
  // i18next handles pluralization automatically
  return t(key, { count });
};

/**
 * Create status translation helper
 * @param {Function} t - Translation function
 * @returns {Function} Status translator
 */
export const createStatusTranslator = (t) => {
  const statusMap = {
    pending: "pending",
    "in-progress": "inProgress",
    completed: "completed",
    failed: "failed",
    cancelled: "cancelled",
    active: "active",
    inactive: "inactive",
  };

  return (status) => {
    const key = statusMap[status] || status;
    return t(key, { defaultValue: status });
  };
};

/**
 * Create priority translation helper
 * @param {Function} t - Translation function
 * @returns {Function} Priority translator
 */
export const createPriorityTranslator = (t) => {
  const priorityMap = {
    low: "low",
    medium: "medium",
    high: "high",
    urgent: "urgent",
    normal: "normal",
  };

  return (priority) => {
    const key = priorityMap[priority] || priority;
    return t(key, { defaultValue: priority });
  };
};

/**
 * Validate translation completeness
 * @param {Object} sourceTranslations - Source language translations
 * @param {Object} targetTranslations - Target language translations
 * @returns {Array} Missing translation keys
 */
export const validateTranslations = (
  sourceTranslations,
  targetTranslations
) => {
  const missing = [];

  const checkKeys = (source, target, prefix = "") => {
    Object.keys(source).forEach((key) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof source[key] === "object" && source[key] !== null) {
        if (!target[key] || typeof target[key] !== "object") {
          missing.push(fullKey);
        } else {
          checkKeys(source[key], target[key], fullKey);
        }
      } else {
        if (!target[key]) {
          missing.push(fullKey);
        }
      }
    });
  };

  checkKeys(sourceTranslations, targetTranslations);
  return missing;
};

/**
 * Extract translation keys from JSX files
 * @param {string} content - File content
 * @returns {Array} Found translation keys
 */
export const extractTranslationKeys = (content) => {
  const keys = new Set();

  // Pattern to match t('key') or t("key")
  const tPattern = /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;

  while ((match = tPattern.exec(content)) !== null) {
    keys.add(match[1]);
  }

  // Pattern to match {t('key')} or {t("key")}
  const jsxPattern = /\{\s*t\s*\(\s*['"`]([^'"`]+)['"`]/g;

  while ((match = jsxPattern.exec(content)) !== null) {
    keys.add(match[1]);
  }

  return Array.from(keys);
};

/**
 * Create breadcrumb translator
 * @param {Function} t - Translation function from nav namespace
 * @returns {Function} Breadcrumb translator
 */
export const createBreadcrumbTranslator = (t) => {
  return (breadcrumbs) => {
    return breadcrumbs.map((crumb) => ({
      ...crumb,
      label: t(crumb.key, { defaultValue: crumb.label }),
    }));
  };
};

/**
 * RTL text direction utilities
 */
export const rtlUtils = {
  /**
   * Get text direction for language
   * @param {string} language - Language code
   * @returns {string} 'rtl' or 'ltr'
   */
  getDirection: (language) => (language === "ar" ? "rtl" : "ltr"),

  /**
   * Get text alignment for language
   * @param {string} language - Language code
   * @returns {string} 'right' or 'left'
   */
  getAlignment: (language) => (language === "ar" ? "right" : "left"),

  /**
   * Get margin/padding side for language
   * @param {string} language - Language code
   * @param {string} side - 'start' or 'end'
   * @returns {string} Actual CSS side
   */
  getSide: (language, side) => {
    const isRTL = language === "ar";
    if (side === "start") return isRTL ? "right" : "left";
    if (side === "end") return isRTL ? "left" : "right";
    return side;
  },
};

/**
 * Create form error translator
 * @param {Function} t - Translation function from validation namespace
 * @returns {Function} Error translator
 */
export const createErrorTranslator = (t) => {
  return (error, field) => {
    if (typeof error === "string") {
      return t(error, { field });
    }

    if (error?.type) {
      return t(`form.${error.type}`, {
        field,
        ...error.values,
        defaultValue: error.message,
      });
    }

    return error?.message || "Unknown error";
  };
};
