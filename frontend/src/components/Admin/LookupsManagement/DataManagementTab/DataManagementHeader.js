import { useTranslation } from "react-i18next";
import ActionButtons from "./ActionButtons";

const DataManagementHeader = ({
  selectedTable,
  onImport,
  onExport,
  onAddRecord,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t("admin.lookups.manageData")}
        </h2>
        <p className="text-sm text-gray-600">
          {t("admin.lookups.manageDataDescription")}
        </p>
      </div>
      <ActionButtons
        selectedTable={selectedTable}
        onImport={onImport}
        onExport={onExport}
        onAddRecord={onAddRecord}
      />
    </div>
  );
};

export default DataManagementHeader;
