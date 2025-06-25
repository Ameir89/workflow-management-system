// src/components/Notifications/Templates/utils/templateFormUtils.js

/**
 * Get default form values for notification template
 */
export const getDefaultFormValues = () => ({
  name: "",
  description: "",
  channel: "email",
  category: "task",
  subject: "",
  content: "",
  is_active: true,
  language: "en",
  tags: "",
  variables: {},
  styling: {
    template_type: "basic",
    header_color: "#4F46E5",
    button_color: "#10B981",
    footer_text: "",
  },
  delivery_options: {
    retry_attempts: 3,
    retry_delay: 5,
    send_time_restriction: false,
    start_time: "09:00",
    end_time: "17:00",
  },
});

/**
 * Validate form data before submission
 */
export const validateFormData = (data, variables, t) => {
  const errors = [];

  // Required field validation
  if (!data.name?.trim()) {
    errors.push(t("notifications.templateNameRequired"));
  }

  if (!data.channel) {
    errors.push(t("notifications.channelRequired"));
  }

  if (!data.content?.trim()) {
    errors.push(t("notifications.contentRequired"));
  }

  // Email specific validation
  if (data.channel === "email" && !data.subject?.trim()) {
    errors.push(t("notifications.subjectRequired"));
  }

  // Variable validation
  const duplicateKeys = findDuplicateVariableKeys(variables);
  if (duplicateKeys.length > 0) {
    errors.push(
      t("notifications.duplicateVariableKeys", {
        keys: duplicateKeys.join(", "),
      })
    );
  }

  // Content length validation
  if (data.content && data.content.length < 10) {
    errors.push(t("notifications.contentMinLength"));
  }

  if (data.name && data.name.length < 3) {
    errors.push(t("notifications.templateNameMinLength"));
  }

  return errors;
};

/**
 * Find duplicate variable keys
 */
const findDuplicateVariableKeys = (variables) => {
  const keys = variables.map((v) => v.key).filter(Boolean);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  return [...new Set(duplicates)];
};

/**
 * Format form data for API submission
 */
export const formatFormDataForAPI = (data, variables) => {
  return {
    ...data,
    tags: data.tags
      ? data.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
    variables: variables.reduce((acc, variable) => {
      if (variable.key) {
        acc[variable.key] = {
          description: variable.description || "",
          example: variable.example || "",
        };
      }
      return acc;
    }, {}),
  };
};

/**
 * Parse template data for form
 */
export const parseTemplateDataForForm = (templateData) => {
  return {
    ...templateData,
    tags: templateData.tags?.join(", ") || "",
  };
};

/**
 * Generate preview content with variable substitution
 */
export const generatePreviewContent = (content, variables) => {
  if (!content) return "";

  let preview = content;
  variables.forEach((variable) => {
    if (variable.key && variable.example) {
      const placeholder = new RegExp(`{{\\s*${variable.key}\\s*}}`, "g");
      preview = preview.replace(placeholder, variable.example);
    }
  });

  return preview;
};

/**
 * Validate variable key format
 */
export const isValidVariableKey = (key) => {
  // Variable keys should be alphanumeric with underscores, no spaces
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key);
};

/**
 * Get template content statistics
 */
export const getContentStatistics = (content, variables) => {
  if (!content) return { characters: 0, words: 0, variables: 0 };

  const characters = content.length;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const variablesUsed = variables.filter(
    (v) => v.key && content.includes(`{{${v.key}}}`)
  ).length;

  return { characters, words, variables: variablesUsed };
};

/**
 * Check if template has unsaved changes
 */
export const hasUnsavedChanges = (currentData, originalData) => {
  // Simple deep comparison for form data
  return JSON.stringify(currentData) !== JSON.stringify(originalData);
};

/**
 * Get channel-specific validation rules
 */
export const getChannelValidationRules = (channel) => {
  const rules = {
    email: {
      subjectRequired: true,
      maxContentLength: 10000,
      supportsStyling: true,
    },
    sms: {
      subjectRequired: false,
      maxContentLength: 160,
      supportsStyling: false,
    },
    in_app: {
      subjectRequired: false,
      maxContentLength: 500,
      supportsStyling: false,
    },
  };

  return rules[channel] || rules.email;
};
