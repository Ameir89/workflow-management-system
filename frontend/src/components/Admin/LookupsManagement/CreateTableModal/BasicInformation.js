import { useTranslation } from "react-i18next";
import FormField from "./FormField";

const BasicInformation = ({ formData, errors, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        label={t("admin.lookups.tableName")}
        required
        error={errors.tableName}
      >
        <input
          type="text"
          value={formData.tableName}
          onChange={(e) => onChange("tableName", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder={t("admin.lookups.tableNamePlaceholder")}
        />
      </FormField>

      <FormField
        label={t("admin.lookups.displayName")}
        required
        error={errors.displayName}
      >
        <input
          type="text"
          value={formData.displayName}
          onChange={(e) => onChange("displayName", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder={t("admin.lookups.displayNamePlaceholder")}
        />
      </FormField>

      <div className="md:col-span-2">
        <FormField label={t("common.description")} error={errors.description}>
          <textarea
            value={formData.description}
            onChange={(e) => onChange("description", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder={t("admin.lookups.descriptionPlaceholder")}
          />
        </FormField>
      </div>
    </div>
  );
};

export default BasicInformation;
