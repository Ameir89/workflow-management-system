import { useTranslation } from "react-i18next";
import FormField from "../../../../../../Common/FormField";

const DatabaseMode = ({ properties, onPropertyChange }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <FormField label={t("designer.connectionString")} required>
        <input
          type="text"
          value={properties.connectionString || ""}
          onChange={(e) => onPropertyChange("connectionString", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="mongodb://localhost:27017/mydb"
        />
      </FormField>
    </div>
  );
};

export default DatabaseMode;
