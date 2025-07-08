import { useTranslation } from "react-i18next";

const TableLegend = ({ fields }) => {
  const { t } = useTranslation();

  const hasSpecialFields = fields.some(
    (f) => f.isValueField || f.isDisplayField || f.isRequired
  );

  if (!hasSpecialFields) return null;

  return (
    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
      <div className="text-xs text-gray-500 space-y-1">
        <div className="flex items-center space-x-4 flex-wrap">
          {fields.some((f) => f.isValueField) && (
            <span className="flex items-center">
              <span className="text-indigo-600 font-bold mr-1">*</span>
              {t("admin.lookups.valueFieldLegend")}
            </span>
          )}
          {fields.some((f) => f.isDisplayField) && (
            <span className="flex items-center">
              <span className="text-green-600 font-bold mr-1">•</span>
              {t("admin.lookups.displayFieldLegend")}
            </span>
          )}
          {fields.some((f) => f.isRequired) && (
            <span className="flex items-center">
              <span className="text-red-500 font-bold mr-1">!</span>
              {t("admin.lookups.requiredFieldLegend")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableLegend;
