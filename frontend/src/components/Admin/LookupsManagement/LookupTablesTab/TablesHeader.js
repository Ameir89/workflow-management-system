import { useTranslation } from "react-i18next";
import { PlusIcon } from "@heroicons/react/24/outline";

const TablesHeader = ({ onCreateTable }) => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t("admin.lookups.lookupTables")}
        </h2>
        <p className="text-sm text-gray-600">
          {t("admin.lookups.lookupTablesDescription")}
        </p>
      </div>
      <button
        onClick={onCreateTable}
        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        {t("admin.lookups.createTable")}
      </button>
    </div>
  );
};

export default TablesHeader;
