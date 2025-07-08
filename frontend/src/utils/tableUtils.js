// src/utils/tableUtils.js
/**
 * Utility functions for table management
 */

/**
 * Get default fields for a new table
 */
export const getDefaultFields = () => ({
  value_field: "code",
  display_field: "name",
  additional_fields: ["description"],
});

/**
 * Validate table data before submission - updated for API structure
 */
export const validateTableData = (formData) => {
  const errors = {};
  let isValid = true;

  // Validate table name
  if (!formData.tableName?.trim()) {
    errors.tableName = "Table name is required";
    isValid = false;
  } else if (!/^[a-z][a-z0-9_]*$/i.test(formData.tableName)) {
    errors.tableName =
      "Table name must start with a letter and contain only letters, numbers, and underscores";
    isValid = false;
  }

  // Validate display name
  if (!formData.displayName?.trim()) {
    errors.displayName = "Display name is required";
    isValid = false;
  }

  // Validate value field
  if (!formData.value_field?.trim()) {
    errors.value_field = "Value field is required";
    isValid = false;
  }

  // Validate display field
  if (!formData.display_field?.trim()) {
    errors.display_field = "Display field is required";
    isValid = false;
  }

  // Validate additional fields
  if (!formData.additional_fields || formData.additional_fields.length === 0) {
    errors.additional_fields = "At least one additional field is required";
    isValid = false;
  }

  return { isValid, errors };
};

/**
 * Format field value for display - updated for API structure
 */
export const formatFieldValue = (value, fieldName) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const lowerFieldName = fieldName.toLowerCase();

  if (
    typeof value === "boolean" ||
    lowerFieldName.includes("active") ||
    lowerFieldName.includes("enabled")
  ) {
    return value ? "Yes" : "No";
  }

  if (lowerFieldName.includes("date")) {
    try {
      return value ? new Date(value).toLocaleDateString() : "—";
    } catch (error) {
      return "Invalid Date";
    }
  }

  if (
    typeof value === "number" ||
    lowerFieldName.includes("number") ||
    lowerFieldName.includes("count")
  ) {
    return typeof value === "number" ? value.toLocaleString() : value;
  }

  if (lowerFieldName.includes("email")) {
    return value;
  }

  if (lowerFieldName.includes("url") || lowerFieldName.includes("website")) {
    return value;
  }

  // Default text handling
  const stringValue = String(value);
  return stringValue.length > 50
    ? `${stringValue.substring(0, 50)}...`
    : stringValue;
};

/**
 * Convert form data to API format - updated for API structure
 */
export const formatTableDataForAPI = (formData) => {
  return {
    name: formData.tableName.trim(),
    display_name: formData.displayName.trim(),
    description: formData.description?.trim() || "",
    value_field: formData.value_field.trim(),
    display_field: formData.display_field.trim(),
    additional_fields: formData.additional_fields.filter((field) =>
      field.trim()
    ),
    is_active: true,
  };
};

/**
 * Generate sample data for a table - updated for API structure
 */
export const generateSampleData = (table, count = 5) => {
  const sampleData = [];
  const allFields = [
    table.value_field,
    table.display_field,
    ...(table.additional_fields || []),
  ].filter(Boolean);

  for (let i = 1; i <= count; i++) {
    const record = {};

    allFields.forEach((fieldName) => {
      const lowerFieldName = fieldName.toLowerCase();

      if (
        lowerFieldName.includes("number") ||
        lowerFieldName.includes("count") ||
        lowerFieldName.includes("order")
      ) {
        record[fieldName] = i;
      } else if (
        lowerFieldName.includes("active") ||
        lowerFieldName.includes("enabled")
      ) {
        record[fieldName] = Math.random() > 0.5;
      } else if (lowerFieldName.includes("date")) {
        record[fieldName] = new Date().toISOString().split("T")[0];
      } else if (lowerFieldName.includes("email")) {
        record[fieldName] = `user${i}@example.com`;
      } else if (
        lowerFieldName.includes("url") ||
        lowerFieldName.includes("website")
      ) {
        record[fieldName] = `https://example${i}.com`;
      } else {
        record[fieldName] = `Sample ${fieldName} ${i}`;
      }
    });

    sampleData.push(record);
  }

  return sampleData;
};
