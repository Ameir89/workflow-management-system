import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { PlusIcon, PencilIcon } from "@heroicons/react/24/outline";
import FormSelect from "../../../../../../Common/FormSelect";
import { scriptsService } from "../../../../../../../services/scriptsService";
import ScriptDetails from "./ScriptDetails";
const ScriptMode = ({
  properties,
  onPropertyChange,
  scriptsData,
  scriptsLoading,
  onCreateNewScript,
  onEditScript,
}) => {
  const { t } = useTranslation();
  const [showScriptDetails, setShowScriptDetails] = useState(false);

  // Get script details when one is selected
  const { data: selectedScriptDetails } = useQuery(
    ["script-details", properties.selectedScriptId],
    () => scriptsService.getScript(properties.selectedScriptId),
    {
      enabled: !!properties.selectedScriptId,
      keepPreviousData: true,
    }
  );

  // Format script options from scripts data
  const scriptOptions = [
    { value: "", label: t("designer.selectScript") },
    ...(scriptsData?.scripts || []).map((script) => ({
      value: script.id,
      label: `${script.name} (${script.category || "General"})`,
      data: script,
    })),
  ];

  const selectedScript =
    selectedScriptDetails ||
    scriptsData?.scripts?.find(
      (script) => script.id === properties.selectedScriptId
    );

  // Handle script selection
  const handleScriptChange = (scriptId) => {
    if (scriptId && scriptsData?.scripts) {
      const scriptOption = scriptsData.scripts.find((s) => s.id === scriptId);

      onPropertyChange("selectedScriptId", scriptId);
      if (scriptOption) {
        onPropertyChange("selectedScriptName", scriptOption.name);
        onPropertyChange(
          "selectedScriptCategory",
          scriptOption.category || "general"
        );

        if (scriptOption.parameters) {
          onPropertyChange("scriptParameters", scriptOption.parameters);
        }
      }
    } else if (!scriptId) {
      onPropertyChange("selectedScriptId", "");
      onPropertyChange("selectedScriptName", "");
      onPropertyChange("selectedScriptCategory", "");
      onPropertyChange("scriptParameters", []);
    }
  };

  return (
    <div className="space-y-4">
      {/* Script Selection with Create/Edit Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            {t("designer.selectScript")}
          </label>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onCreateNewScript}
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
            >
              <PlusIcon className="h-3 w-3 mr-1" />
              {t("designer.newScript")}
            </button>
            {properties.selectedScriptId && (
              <button
                type="button"
                onClick={onEditScript}
                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200"
              >
                <PencilIcon className="h-3 w-3 mr-1" />
                {t("common.edit")}
              </button>
            )}
          </div>
        </div>

        <FormSelect
          value={properties.selectedScriptId || ""}
          onChange={(e) => handleScriptChange(e.target.value)}
          options={scriptOptions}
          disabled={scriptsLoading}
        />

        {scriptsLoading && (
          <div className="flex items-center text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
            {t("designer.loadingScripts")}
          </div>
        )}
      </div>

      {/* Selected Script Details */}
      {selectedScript && (
        <ScriptDetails
          script={selectedScript}
          properties={properties}
          onPropertyChange={onPropertyChange}
          showDetails={showScriptDetails}
          onToggleDetails={() => setShowScriptDetails(!showScriptDetails)}
        />
      )}

      {/* No Scripts Available Message */}
      {!scriptsLoading &&
        (!scriptsData?.scripts || scriptsData.scripts.length === 0) && (
          <div className="p-3 bg-gray-50 rounded-md text-center">
            <p className="text-sm text-gray-600">
              {t("designer.noScriptsAvailable")}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t("designer.createFirstScript")}
            </p>
            <button
              type="button"
              onClick={onCreateNewScript}
              className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {t("designer.createScript")}
            </button>
          </div>
        )}
    </div>
  );
};

export default ScriptMode;
