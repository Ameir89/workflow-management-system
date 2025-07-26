// src/components/Notifications/Templates/hooks/useUnsavedChanges.js
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";

export const useUnsavedChanges = (isDirty) => {
  const { t } = useTranslation();
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  useEffect(() => {
    setShowUnsavedWarning(isDirty);
  }, [isDirty]);

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = t("notifications.unsavedChangesWarning");
        return t("notifications.unsavedChangesWarning");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, t]);

  const handleNavigation = useCallback(
    (navigateCallback) => {
      if (isDirty) {
        if (window.confirm(t("notifications.unsavedChangesWarning"))) {
          navigateCallback();
        }
      } else {
        navigateCallback();
      }
    },
    [isDirty, t]
  );

  return {
    showUnsavedWarning,
    handleNavigation,
  };
};
