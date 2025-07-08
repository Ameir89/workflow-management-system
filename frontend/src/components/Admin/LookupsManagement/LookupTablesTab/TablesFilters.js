import React from "react";
import { useTranslation } from "react-i18next";
import { FunnelIcon } from "@heroicons/react/24/outline";
import SearchInput from "../../../Common/SearchInput";

const TablesFilters = ({ searchTerm, onSearchChange, onSearchClear }) => {
  const { t } = useTranslation();

  return (
    <div className="flex space-x-4">
      <SearchInput
        value={searchTerm}
        onChange={onSearchChange}
        onClear={onSearchClear}
        placeholder={t("admin.lookups.searchTables")}
        className="flex-1"
      />
      <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
        <FunnelIcon className="h-4 w-4 mr-2" />
        {t("common.filters")}
      </button>
    </div>
  );
};

export default TablesFilters;
