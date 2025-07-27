import { useTranslation } from "react-i18next";
import FormField from "../../../../../../Common/FormField";

const TimeoutSettings = ({ properties, onPropertyChange }) => {
  const { t } = useTranslation();

  return (
    <div className="border-t pt-4">
      <FormField label={t("designer.timeout")} help={t("designer.timeoutHelp")}>
        <input
          type="number"
          value={properties.timeout || 300}
          onChange={(e) =>
            onPropertyChange("timeout", parseInt(e.target.value) || 300)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          min="1"
          max="3600"
        />
        <div className="mt-1 text-xs text-gray-500">
          {t("designer.timeoutInSeconds")} (1-3600)
        </div>
      </FormField>
    </div>
  );
};
export default TimeoutSettings;
