import { useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
const TransitionProperties = ({ transition, workflow, onTransitionChange }) => {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fromStep = workflow.definition.steps.find(
    (s) => s.id === transition.from
  );
  const toStep = workflow.definition.steps.find((s) => s.id === transition.to);

  const handleConditionChange = (field, value) => {
    const updatedCondition = {
      ...transition.condition,
      [field]: value,
    };
    onTransitionChange("condition", updatedCondition);
  };

  const handleConditionRuleChange = (index, field, value) => {
    const condition = transition.condition || { rules: [], operator: "and" };
    const updatedRules = [...(condition.rules || [])];
    updatedRules[index] = {
      ...updatedRules[index],
      [field]: value,
    };

    onTransitionChange("condition", {
      ...condition,
      rules: updatedRules,
    });
  };

  const addConditionRule = () => {
    const condition = transition.condition || { rules: [], operator: "and" };
    const newRule = {
      id: Date.now().toString(),
      field: "",
      operator: "equals",
      value: "",
    };

    onTransitionChange("condition", {
      ...condition,
      rules: [...(condition.rules || []), newRule],
    });
  };

  const removeConditionRule = (index) => {
    const condition = transition.condition || { rules: [], operator: "and" };
    const updatedRules = condition.rules.filter((_, i) => i !== index);

    onTransitionChange("condition", {
      ...condition,
      rules: updatedRules,
    });
  };

  const operatorOptions = [
    { value: "and", label: t("designer.and") },
    { value: "or", label: t("designer.or") },
  ];

  const comparisonOperators = [
    { value: "equals", label: t("designer.equals") },
    { value: "not_equals", label: t("designer.notEquals") },
    { value: "greater_than", label: t("designer.greaterThan") },
    { value: "less_than", label: t("designer.lessThan") },
    { value: "contains", label: t("designer.contains") },
    { value: "starts_with", label: t("designer.startsWith") },
    { value: "ends_with", label: t("designer.endsWith") },
    { value: "is_empty", label: t("designer.isEmpty") },
    { value: "is_not_empty", label: t("designer.isNotEmpty") },
  ];

  const fieldOptions = [
    { value: "workflow.status", label: t("designer.workflowStatus") },
    { value: "task.status", label: t("designer.taskStatus") },
    { value: "task.assignee", label: t("designer.taskAssignee") },
    { value: "form.field", label: t("designer.formField") },
    { value: "custom", label: t("designer.customField") },
  ];

  return (
    <div className="space-y-6">
      {/* Transition Info */}
      <div className="p-3 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          {t("designer.transitionInfo")}
        </h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>
            <strong>{t("common.from")}:</strong> {fromStep?.name || "Unknown"}
          </div>
          <div>
            <strong>{t("common.to")}:</strong> {toStep?.name || "Unknown"}
          </div>
        </div>
      </div>

      {/* Basic Properties */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("designer.transitionName")}
          </label>
          <input
            type="text"
            value={transition.name || ""}
            onChange={(e) => onTransitionChange("name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={t("designer.enterTransitionName")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("designer.description")}
          </label>
          <textarea
            value={transition.description || ""}
            onChange={(e) => onTransitionChange("description", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={t("designer.enterTransitionDescription")}
          />
        </div>
      </div>

      {/* Condition Configuration */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-900">
            {t("designer.transitionConditions")}
          </h4>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            {showAdvanced ? t("common.hideAdvanced") : t("common.showAdvanced")}
          </button>
        </div>

        {/* Simple condition toggle */}
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={!!transition.condition}
              onChange={(e) => {
                if (e.target.checked) {
                  onTransitionChange("condition", {
                    rules: [
                      {
                        id: Date.now().toString(),
                        field: "",
                        operator: "equals",
                        value: "",
                      },
                    ],
                    operator: "and",
                  });
                } else {
                  onTransitionChange("condition", null);
                }
              }}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              {t("designer.enableConditions")}
            </label>
          </div>

          {transition.condition && (
            <div className="pl-6 space-y-4">
              {/* Operator Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("designer.operator")}
                </label>
                <select
                  value={transition.condition.operator || "and"}
                  onChange={(e) =>
                    handleConditionChange("operator", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {operatorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition Rules */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    {t("designer.conditions")}
                  </label>
                  <button
                    type="button"
                    onClick={addConditionRule}
                    className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                  >
                    {t("designer.addCondition")}
                  </button>
                </div>

                {transition.condition.rules?.map((rule, index) => (
                  <div
                    key={rule.id || index}
                    className="p-3 border border-gray-200 rounded-md mb-3"
                  >
                    <div className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-4">
                        <select
                          value={rule.field}
                          onChange={(e) =>
                            handleConditionRuleChange(
                              index,
                              "field",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">{t("designer.selectField")}</option>
                          {fieldOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <select
                          value={rule.operator}
                          onChange={(e) =>
                            handleConditionRuleChange(
                              index,
                              "operator",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                        >
                          {comparisonOperators.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-4">
                        {!["is_empty", "is_not_empty"].includes(
                          rule.operator
                        ) && (
                          <input
                            type="text"
                            value={rule.value}
                            onChange={(e) =>
                              handleConditionRuleChange(
                                index,
                                "value",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                            placeholder={t("designer.conditionValue")}
                          />
                        )}
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeConditionRule(index)}
                          className="text-red-400 hover:text-red-600 p-1"
                          title={t("common.remove")}
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {index > 0 && (
                      <div className="text-center mt-2">
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded">
                          {transition.condition.operator?.toUpperCase() ||
                            "AND"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {(!transition.condition.rules ||
                  transition.condition.rules.length === 0) && (
                  <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-sm">{t("designer.noConditions")}</p>
                    <button
                      type="button"
                      onClick={addConditionRule}
                      className="mt-2 text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                    >
                      {t("designer.addFirstCondition")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-4">
            {t("designer.advancedOptions")}
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("designer.priority")}
              </label>
              <select
                value={transition.priority || "normal"}
                onChange={(e) => onTransitionChange("priority", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">{t("designer.priority.low")}</option>
                <option value="normal">{t("designer.priority.normal")}</option>
                <option value="high">{t("designer.priority.high")}</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={transition.isDefault || false}
                onChange={(e) =>
                  onTransitionChange("isDefault", e.target.checked)
                }
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                {t("designer.defaultTransition")}
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("designer.executionDelay")} ({t("common.seconds")})
              </label>
              <input
                type="number"
                value={transition.delay || 0}
                onChange={(e) =>
                  onTransitionChange("delay", parseInt(e.target.value) || 0)
                }
                min="0"
                max="3600"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {t("designer.delayHelp")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Help Information */}
      <div className="p-3 bg-blue-50 rounded-md">
        <div className="flex items-start">
          <InformationCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h5 className="text-sm font-medium text-blue-900 mb-1">
              {t("designer.transitionHelp")}
            </h5>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• {t("designer.transitionHelpConditions")}</p>
              <p>• {t("designer.transitionHelpDefault")}</p>
              <p>• {t("designer.transitionHelpPriority")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransitionProperties;
