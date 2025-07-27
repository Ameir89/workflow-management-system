import { useTranslation } from "react-i18next";
import FormField from "../../../../../../Common/FormField";

const EmailMode = ({ properties, onPropertyChange }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <FormField label={t("designer.emailRecipients")} required>
        <input
          type="text"
          value={properties.emailRecipients || ""}
          onChange={(e) => onPropertyChange("emailRecipients", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="user1@example.com, user2@example.com"
        />
      </FormField>

      <FormField label={t("designer.emailSubject")}>
        <input
          type="text"
          value={properties.emailSubject || ""}
          onChange={(e) => onPropertyChange("emailSubject", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={t("designer.emailSubjectPlaceholder")}
        />
      </FormField>
    </div>
  );
};

export default EmailMode;
