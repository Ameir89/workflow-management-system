import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CodeBracketIcon } from "@heroicons/react/24/outline";
import FormField from "../../../../../../Common/FormField";
import FormTextarea from "../../../../../../Common/FormTextarea";

const InlineMode = ({ properties, onPropertyChange }) => {
  const { t } = useTranslation();
  const [showExamples, setShowExamples] = useState(false);

  const getScriptPlaceholder = () => {
    return "// JavaScript code here";
  };

  const getCodeExamples = () => {
    return `// Access workflow data
const workflowData = context.workflow;
const taskData = context.task;

// Perform calculations
const result = workflowData.amount * 0.1;

// Return data to workflow
return {
  success: true,
  calculatedValue: result,
  message: "Calculation completed"
};`;
  };

  return (
    <div className="space-y-4">
      <FormField label={t("designer.script")} required>
        <FormTextarea
          value={properties.script || ""}
          onChange={(e) => onPropertyChange("script", e.target.value)}
          rows={10}
          className="font-mono text-sm"
          placeholder={getScriptPlaceholder()}
        />
      </FormField>

      {/* Code Examples Section */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowExamples(!showExamples)}
          className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
        >
          <CodeBracketIcon className="h-4 w-4 mr-1" />
          {showExamples
            ? t("designer.hideExamples")
            : t("designer.showExamples")}
        </button>

        {showExamples && (
          <div className="mt-3 p-4 bg-gray-50 rounded-md">
            <h5 className="text-sm font-medium text-gray-900 mb-2">
              {t("designer.codeExample")}
            </h5>
            <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
              <code>{getCodeExamples()}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default InlineMode;
