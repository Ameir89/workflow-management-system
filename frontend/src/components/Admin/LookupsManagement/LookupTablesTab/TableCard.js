import React from "react";
import { useTranslation } from "react-i18next";
import {
  TableCellsIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import ActionButton from "./ActionButton";
import StatusBadge from "../../../Common/StatusBadge";

const TableCard = ({ table, onEdit, onDelete, onView, isDeleting }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200 group">
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
            <TableCellsIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {table.display_name || table.name}
            </h3>
            <p className="text-sm text-gray-500 truncate">{table.name}</p>
          </div>
        </div>
        <StatusBadge
          status={table.is_active ? t("common.active") : t("common.inactive")}
          variant={table.is_active ? "success" : "default"}
        />
      </div>

      {/* Card Content */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
          {table.description || t("admin.lookups.noDescription")}
        </p>
      </div>

      {/* Card Stats */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <span className="flex items-center">
          <span className="font-medium text-gray-900">
            {table.additional_fields?.length || 0}
          </span>
          <span className="ml-1">{t("admin.lookups.fields")}</span>
        </span>
        <span className="flex items-center">
          <span className="font-medium text-gray-900">
            {table.record_count || 0}
          </span>
          <span className="ml-1">{t("admin.lookups.records")}</span>
        </span>
      </div>

      {/* Card Actions */}
      <div className="flex space-x-2">
        <ActionButton
          onClick={onView}
          variant="primary"
          icon={EyeIcon}
          label={t("admin.lookups.viewData")}
          className="flex-1"
        />
        <ActionButton
          onClick={onEdit}
          variant="secondary"
          icon={PencilIcon}
          tooltip={t("admin.lookups.editTable")}
        />
        <ActionButton
          onClick={onDelete}
          variant="danger"
          icon={TrashIcon}
          disabled={isDeleting}
          tooltip={t("admin.lookups.deleteTable")}
        />
      </div>
    </div>
  );
};

export default TableCard;
