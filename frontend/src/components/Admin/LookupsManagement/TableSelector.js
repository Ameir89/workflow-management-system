import { useTranslation } from "react-i18next";

const TableSelector = ({ tables, selectedTable, onTableChange }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {t("admin.lookups.selectTable")}
      </label>
      <select
        value={selectedTable?.id || ""}
        onChange={(e) => {
          const table = tables.find((t) => t.id === e.target.value);
          onTableChange(table);
        }}
        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">{t("admin.lookups.selectATable")}...</option>
        {tables.map((table) => (
          <option key={table.id} value={table.id}>
            {table.display_name || table.name}
          </option>
        ))}
      </select>
      {selectedTable && (
        <div className="mt-2 text-sm text-gray-600">
          <p>
            {selectedTable.description ||
              t("admin.lookups.noDescriptionAvailable")}
          </p>
          <p className="mt-1">
            <span className="font-medium">
              {selectedTable.additional_fields?.length || 0}
            </span>{" "}
            {t("admin.lookups.fieldsConfigured")}
          </p>
          <p className="mt-1">
            <span className="font-medium">
              {selectedTable.record_count || 0}
            </span>{" "}
            {t("admin.lookups.records")}
          </p>
        </div>
      )}
    </div>
  );
};

export default TableSelector;
