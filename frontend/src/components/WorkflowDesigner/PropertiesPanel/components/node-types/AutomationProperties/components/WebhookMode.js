import { useTranslation } from "react-i18next";
import FormField from "../../../../../../Common/FormField";
import FormSelect from "../../../../../../Common/FormSelect";
import FormTextarea from "../../../../../../Common/FormTextarea";
const WebhookMode = ({ properties, onPropertyChange }) => {
  const { t } = useTranslation();

  const methodOptions = [
    { value: "GET", label: "GET" },
    { value: "POST", label: "POST" },
    { value: "PUT", label: "PUT" },
    { value: "DELETE", label: "DELETE" },
    { value: "PATCH", label: "PATCH" },
  ];

  return (
    <div className="space-y-4">
      <FormField label={t("designer.webhookUrl")} required>
        <input
          type="url"
          value={properties.webhookUrl || ""}
          onChange={(e) => onPropertyChange("webhookUrl", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://api.example.com/webhook"
        />
      </FormField>

      <FormSelect
        label={t("designer.httpMethod")}
        value={properties.method || "POST"}
        onChange={(e) => onPropertyChange("method", e.target.value)}
        options={methodOptions}
      />

      <FormField label={t("designer.requestHeaders")}>
        <FormTextarea
          value={properties.headers || ""}
          onChange={(e) => onPropertyChange("headers", e.target.value)}
          rows={3}
          placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
        />
      </FormField>
    </div>
  );
};

export default WebhookMode;
