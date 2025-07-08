import { useTranslation } from "react-i18next";
import EmptyState from "../../../Common/EmptyState";
import { PencilIcon } from "@heroicons/react/24/outline";

const EmptyDataState = ({ onAddRecord }) => {
  const { t } = useTranslation();

  return (
    <div className="text-center py-12 px-6">
      <EmptyState
        title={t("admin.lookups.noDataFound")}
        description={t("admin.lookups.noDataFoundDescription")}
        action={{
          label: t("admin.lookups.addFirstRecord"),
          onClick: onAddRecord,
          icon: PencilIcon,
        }}
      />
      <div className="mt-4 text-xs text-gray-400">
        {t("admin.lookups.importFromCSVHint")}
      </div>
    </div>
  );
};

export default EmptyDataState;
