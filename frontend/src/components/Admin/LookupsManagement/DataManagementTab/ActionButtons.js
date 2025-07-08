import { useTranslation } from "react-i18next";
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import ActionButton from "./ActionButton";

const ActionButtons = ({ selectedTable, onImport, onExport, onAddRecord }) => {
  const { t } = useTranslation();
  const isDisabled = !selectedTable?.id;

  return (
    <div className="flex space-x-2">
      <ActionButton
        onClick={onImport}
        disabled={isDisabled}
        icon={ArrowUpTrayIcon}
        label={t("admin.lookups.importCSV")}
        variant="secondary"
      />
      <ActionButton
        onClick={onExport}
        disabled={isDisabled}
        icon={ArrowDownTrayIcon}
        label={t("admin.lookups.export")}
        variant="secondary"
      />
      <ActionButton
        onClick={onAddRecord}
        disabled={isDisabled}
        icon={PlusIcon}
        label={t("admin.lookups.addRecord")}
        variant="primary"
      />
    </div>
  );
};

export default ActionButtons;
