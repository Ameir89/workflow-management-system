import { DocumentTextIcon } from "@heroicons/react/outline";
import ScriptParameters from "./ScriptParameters";
import { useTranslation } from "react-i18next";
const ScriptDetails = ({
  script,
  properties,
  onPropertyChange,
  showDetails,
  onToggleDetails,
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="p-3 bg-blue-50 rounded-md">
        <div className="flex items-start space-x-2">
          <DocumentTextIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="text-sm font-medium text-blue-900">{script.name}</h5>
            <p className="text-xs text-blue-700 mt-1">{script.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-xs text-blue-600">
              <span>
                {t("common.category")}: {script.category || "General"}
              </span>
              <span>
                {t("common.language")}: {script.script_type || "JavaScript"}
              </span>
              <span>
                {t("common.executions")}: {script.execution_count || 0}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleDetails}
          className="text-xs text-blue-600 hover:text-blue-700 mt-2"
        >
          {showDetails ? "Hide Details" : "Show Details"}
        </button>
      </div>

      {showDetails && script.script_content && (
        <div className="p-3 bg-gray-50 rounded-md">
          <h6 className="text-xs font-medium text-gray-900 mb-2">
            {t("designer.scriptPreview")}:
          </h6>
          <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-32">
            <code>{script.script_content.substring(0, 500)}...</code>
          </pre>
        </div>
      )}

      {/* Script Parameters */}
      {script.parameters && script.parameters.length > 0 && (
        <ScriptParameters
          parameters={script.parameters}
          values={properties.scriptParameterValues || {}}
          onParameterChange={(name, value) => {
            const currentValues = properties.scriptParameterValues || {};
            onPropertyChange("scriptParameterValues", {
              ...currentValues,
              [name]: value,
            });
          }}
        />
      )}

      {/* Script Usage Instructions */}
      {script.usage_instructions && (
        <div className="p-3 bg-yellow-50 rounded-md">
          <h6 className="text-xs font-medium text-yellow-900 mb-1">
            {t("designer.usageInstructions")}:
          </h6>
          <p className="text-xs text-yellow-800">{script.usage_instructions}</p>
        </div>
      )}

      {/* Script Status */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {t("common.status")}:{" "}
          {script.is_active ? t("common.active") : t("common.inactive")}
        </span>
        <span>
          {t("common.lastExecuted")}:{" "}
          {script.last_executed
            ? new Date(script.last_executed).toLocaleDateString()
            : t("common.never")}
        </span>
      </div>
    </div>
  );
};

export default ScriptDetails;
