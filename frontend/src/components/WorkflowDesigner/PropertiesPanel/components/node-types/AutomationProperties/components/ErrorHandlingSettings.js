import { useTranslation } from "react-i18next";
import FormField from "../../../../../../Common/FormField";

const ErrorHandlingSettings = ({ properties, onPropertyChange }) => {
  const { t } = useTranslation();

  return (
    <div className="border-t pt-4 space-y-4">
      <FormField label={t("designer.errorHandling")}>
        <select
          value={properties.errorHandling || "stop"}
          onChange={(e) => onPropertyChange("errorHandling", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="stop">{t("designer.stopOnError")}</option>
          <option value="continue">{t("designer.continueOnError")}</option>
          <option value="retry">{t("designer.retryOnError")}</option>
        </select>
      </FormField>

      {properties.errorHandling === "retry" && (
        <FormField label={t("designer.retryAttempts")}>
          <input
            type="number"
            value={properties.retryAttempts || 3}
            onChange={(e) =>
              onPropertyChange("retryAttempts", parseInt(e.target.value) || 3)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            min="1"
            max="10"
          />
        </FormField>
      )}
    </div>
  );
};

export default ErrorHandlingSettings;
