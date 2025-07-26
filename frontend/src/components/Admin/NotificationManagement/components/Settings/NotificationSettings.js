// src/components/Admin/NotificationManagement/components/Settings/NotificationSettings.js
import React from "react";
import { useTranslation } from "react-i18next";

const NotificationSettings = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">
        {t("notifications.settings")}
      </h3>
      <p className="text-gray-600">{t("notifications.settingsComingSoon")}</p>
    </div>
  );
};

export default NotificationSettings;
