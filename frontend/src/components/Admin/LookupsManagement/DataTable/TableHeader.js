import { useTranslation } from "react-i18next";

const TableHeader = ({ table, recordCount }) => {
  const { t } = useTranslation();

  return (
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {table.displayName || table.name} {t("admin.lookups.data")}
          </h3>
          <p className="text-sm text-gray-600">
            {recordCount}{" "}
            {recordCount === 1
              ? t("admin.lookups.record")
              : t("admin.lookups.records")}
          </p>
        </div>
        {recordCount > 0 && (
          <div className="text-sm text-gray-500">
            {t("admin.lookups.showingAllRecords")}
          </div>
        )}
      </div>
    </div>
  );
};

export default TableHeader;
