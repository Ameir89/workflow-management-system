// src/components/Admin/RolesManagement/components/RoleFormModal.js
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon } from "@heroicons/react/24/outline";
import RoleBasicInfo from "./RoleBasicInfo";
import PermissionsSelector from "./PermissionsSelector";
import LoadingSpinner from "../../../Common/LoadingSpinner";

const RoleFormModal = ({
  role,
  permissionsData,
  selectedPermissions,
  onSubmit,
  onClose,
  onPermissionToggle,
  onPermissionGroupToggle,
  onSelectAllPermissions,
  onClearAllPermissions,
  isLoading,
  isLoadingPermissions,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
  });
  const [errors, setErrors] = useState({});

  // Initialize form data when role changes
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || "",
        description: role.description || "",
        is_active: role.is_active !== false,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        is_active: true,
      });
    }
    setErrors({});
  }, [role]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t("validation.required", "This field is required");
    } else if (formData.name.trim().length < 2) {
      newErrors.name = t(
        "validation.minLength",
        "Must be at least 2 characters"
      );
    }

    if (selectedPermissions.length === 0) {
      newErrors.permissions = t(
        "admin.roles.validation.permissionsRequired",
        "At least one permission must be selected"
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
    });
  };

  const modalTitle = role
    ? t("admin.roles.editRole", "Edit Role")
    : t("admin.roles.createRole", "Create New Role");

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-8 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">{modalTitle}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <RoleBasicInfo
            formData={formData}
            errors={errors}
            onChange={handleInputChange}
          />

          {/* Permissions Section */}
          {isLoadingPermissions ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <PermissionsSelector
              permissionsData={permissionsData}
              selectedPermissions={selectedPermissions}
              onPermissionToggle={onPermissionToggle}
              onPermissionGroupToggle={onPermissionGroupToggle}
              onSelectAll={onSelectAllPermissions}
              onClearAll={onClearAllPermissions}
              error={errors.permissions}
            />
          )}

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isLoading || isLoadingPermissions}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t("common.saving")}
                </>
              ) : role ? (
                t("common.update")
              ) : (
                t("common.create")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleFormModal;
