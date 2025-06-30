// src/components/Admin/RolesManagement/hooks/useRoleForm.js
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ROLE_FORM_VALIDATION } from "../constants/rolesConstants";

const INITIAL_FORM_DATA = {
  name: "",
  description: "",
  is_active: true,
};

export const useRoleForm = (role = null) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Initialize form data when role changes
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || "",
        description: role.description || "",
        is_active: role.is_active !== false,
      });
    } else {
      setFormData(INITIAL_FORM_DATA);
    }
    setErrors({});
    setIsDirty(false);
  }, [role]);

  const updateField = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: null }));
      }
    },
    [errors]
  );

  const validateField = useCallback(
    (field, value) => {
      switch (field) {
        case "name":
          if (!value || !value.trim()) {
            return t("validation.required", "This field is required");
          }
          if (value.trim().length < ROLE_FORM_VALIDATION.NAME_MIN_LENGTH) {
            return t(
              "validation.minLength",
              "Must be at least {{min}} characters",
              {
                min: ROLE_FORM_VALIDATION.NAME_MIN_LENGTH,
              }
            );
          }
          if (value.trim().length > ROLE_FORM_VALIDATION.NAME_MAX_LENGTH) {
            return t(
              "validation.maxLength",
              "Must be no more than {{max}} characters",
              {
                max: ROLE_FORM_VALIDATION.NAME_MAX_LENGTH,
              }
            );
          }
          break;

        case "description":
          if (
            value &&
            value.length > ROLE_FORM_VALIDATION.DESCRIPTION_MAX_LENGTH
          ) {
            return t(
              "validation.maxLength",
              "Must be no more than {{max}} characters",
              {
                max: ROLE_FORM_VALIDATION.DESCRIPTION_MAX_LENGTH,
              }
            );
          }
          break;

        default:
          return null;
      }
      return null;
    },
    [t]
  );

  const validateForm = useCallback(
    (selectedPermissions = []) => {
      const newErrors = {};

      // Validate each field
      Object.keys(formData).forEach((field) => {
        const error = validateField(field, formData[field]);
        if (error) {
          newErrors[field] = error;
        }
      });

      // Validate permissions
      if (!selectedPermissions || selectedPermissions.length === 0) {
        newErrors.permissions = t(
          "admin.roles.validation.permissionsRequired",
          "At least one permission must be selected"
        );
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [formData, validateField, t]
  );

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setIsDirty(false);
  }, []);

  const getFormattedData = useCallback(() => {
    return {
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
    };
  }, [formData]);

  return {
    formData,
    errors,
    isDirty,
    updateField,
    validateField,
    validateForm,
    resetForm,
    getFormattedData,
  };
};
