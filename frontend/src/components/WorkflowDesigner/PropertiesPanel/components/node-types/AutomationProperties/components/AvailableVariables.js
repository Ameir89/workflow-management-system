import { useTranslation } from "react-i18next";
import { InformationCircleIcon } from "@heroicons/react/solid";
const AvailableVariables = () => {
  const { t } = useTranslation();

  return (
    <div className="p-3 bg-blue-50 rounded-md">
      <div className="flex items-start">
        <InformationCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
        <div>
          <h5 className="text-sm font-medium text-blue-900 mb-1">
            {t("designer.availableVariables")}
          </h5>
          <div className="text-xs text-blue-700 space-y-1">
            <div className="grid grid-cols-2 gap-1">
              <code>{"{{workflow.id}}"}</code>
              <code>{"{{workflow.name}}"}</code>
              <code>{"{{workflow.status}}"}</code>
              <code>{"{{task.assignee}}"}</code>
              <code>{"{{task.due_date}}"}</code>
              <code>{"{{current_timestamp}}"}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailableVariables;
