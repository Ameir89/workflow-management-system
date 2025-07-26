// src/components/Admin/NotificationManagement/components/Templates/utils/templateFormUtils.js

/**
 * Get default form values for notification template
 */
export const getDefaultFormValues = () => ({
  name: "",
  description: "",
  channel: "email", // Will be converted to channels array for API
  category: "task",
  subject: "", // Maps to title_template for API
  content: "", // Maps to message_template for API
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
 * Parse template data from API for form
 */
export const parseTemplateDataForForm = (templateData) => {
  console.log("Parsing template data for form:", templateData);

  const formData = {
    // Basic fields mapping
    name: templateData.name || "",
    description: templateData.description || "",
    is_active: templateData.is_active !== false,

    // Map API fields to form fields
    subject: templateData.title_template || "",
    content: templateData.message_template || "",

    // Handle channels array - take first channel or default to email
    channel:
      Array.isArray(templateData.channels) && templateData.channels.length > 0
        ? templateData.channels[0]
        : "email",

    // Handle tags array
    tags: Array.isArray(templateData.tags)
      ? templateData.tags.join(", ")
      : templateData.tags || "",

    // Set defaults for fields not in API response
    category: templateData.category || "task",
    language: templateData.language || "en",
    variables: templateData.variables || {},

    // Handle styling with defaults
    styling: {
      template_type: templateData.styling?.template_type || "basic",
      header_color: templateData.styling?.header_color || "#4F46E5",
      button_color: templateData.styling?.button_color || "#10B981",
      footer_text: templateData.styling?.footer_text || "",
      ...templateData.styling,
    },

    // Handle delivery options with defaults
    delivery_options: {
      retry_attempts: templateData.delivery_options?.retry_attempts || 3,
      retry_delay: templateData.delivery_options?.retry_delay || 5,
      send_time_restriction:
        templateData.delivery_options?.send_time_restriction || false,
      start_time: templateData.delivery_options?.start_time || "09:00",
      end_time: templateData.delivery_options?.end_time || "17:00",
      ...templateData.delivery_options,
    },
  };

  console.log("Parsed form data:", formData);
  return formData;
};

/**
 * Format form data for API submission
 */
export const formatFormDataForAPI = (data, variables = []) => {
  console.log("Formatting form data for API:", data, variables);

  const formattedData = {
    name: data.name?.trim(),
    description: data.description?.trim() || null,

    // Map form fields to API fields
    title_template: data.subject?.trim() || "",
    message_template: data.content?.trim() || "",

    // Convert single channel to array
    channels: [data.channel],

    // Boolean field
    is_active: data.is_active !== false,
  };

  // Handle tags - convert comma-separated string to array
  if (data.tags?.trim()) {
    formattedData.tags = data.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  // Add variables if provided
  if (variables && variables.length > 0) {
    formattedData.variables = variables.reduce((acc, variable) => {
      if (variable.key?.trim()) {
        acc[variable.key] = {
          description: variable.description || "",
          example: variable.example || "",
        };
      }
      return acc;
    }, {});
  }

  // Add additional metadata (these might not be used by API but kept for consistency)
  if (data.category) formattedData.category = data.category;
  if (data.language) formattedData.language = data.language;

  // Only include styling for email channels
  if (data.styling && data.channel === "email") {
    formattedData.styling = data.styling;
  }

  if (data.delivery_options) {
    formattedData.delivery_options = data.delivery_options;
  }

  console.log("Formatted data for API:", formattedData);
  return formattedData;
};

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
 * Generate preview content with variable substitution
 */
export const generatePreviewContent = (content, variables) => {
  if (!content) return "";

  let preview = content;
  variables.forEach((variable) => {
    if (variable.key && variable.example) {
      // Support both {{variable}} and {{#variable}}content{{/variable}} patterns
      const placeholder = new RegExp(`{{\\s*${variable.key}\\s*}}`, "g");
      const conditionalBlock = new RegExp(
        `{{#\\s*${variable.key}\\s*}}(.*?){{/${variable.key}}}`,
        "gs"
      );

      preview = preview.replace(placeholder, variable.example);
      preview = preview.replace(conditionalBlock, variable.example ? "$1" : "");
    }
  });

  return preview;
};

/**
 * Extract variables from template content
 */
export const extractVariablesFromContent = (content) => {
  if (!content) return [];

  // Enhanced regex to capture both simple variables {{var}} and conditional blocks {{#var}}
  const patterns = [
    /{{([^#/\s}]+)}}/g, // Simple variables: {{var}}
    /{{#\s*([^}]+)\s*}}/g, // Conditional blocks start: {{#var}}
  ];

  const variables = [];
  const foundKeys = new Set();

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const variableName = match[1].trim();
      if (!foundKeys.has(variableName)) {
        foundKeys.add(variableName);
        variables.push({
          key: variableName,
          description: "",
          example: "",
        });
      }
    }
  });

  console.log("Extracted variables from content:", variables);
  return variables;
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
    (v) =>
      v.key &&
      (content.includes(`{{${v.key}}}`) || content.includes(`{{#${v.key}}}`))
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
      supportsHtml: true,
    },
    sms: {
      subjectRequired: false,
      maxContentLength: 160,
      supportsStyling: false,
      supportsHtml: false,
    },
    in_app: {
      subjectRequired: false,
      maxContentLength: 500,
      supportsStyling: false,
      supportsHtml: true,
    },
  };

  return rules[channel] || rules.email;
};

/**
 * Convert API variables object to form variables array
 */
export const convertApiVariablesToForm = (apiVariables) => {
  if (!apiVariables || typeof apiVariables !== "object") {
    return [];
  }

  return Object.entries(apiVariables).map(([key, value]) => ({
    key,
    description: value?.description || "",
    example: value?.example || "",
  }));
};

/**
 * Handle template data loading with proper error handling
 */
export const handleTemplateDataLoad = (templateData, setVariables, reset) => {
  try {
    console.log("Raw template data received:", templateData);

    // Get the actual template object (handle nested response structure)
    const template = templateData.template || templateData;
    console.log("Processing template:", template);

    // Parse the template data for form
    const formData = parseTemplateDataForForm(template);
    console.log("Parsed form data:", formData);

    // Reset form with parsed data
    reset(formData);

    // Extract and set variables from content if available
    if (template.message_template) {
      const extractedVars = extractVariablesFromContent(
        template.message_template
      );
      console.log("Extracted variables:", extractedVars);

      // Merge with existing API variables if any
      const apiVariables = convertApiVariablesToForm(template.variables);
      console.log("API variables:", apiVariables);

      // Combine both sources, preferring API variables for existing keys
      const mergedVariables = [...apiVariables];
      extractedVars.forEach((extracted) => {
        if (
          !mergedVariables.find((existing) => existing.key === extracted.key)
        ) {
          mergedVariables.push(extracted);
        }
      });

      console.log("Merged variables:", mergedVariables);
      setVariables(mergedVariables);
    }

    return { success: true, formData };
  } catch (error) {
    console.error("Error processing template data:", error);
    return { success: false, error: error.message };
  }
};
