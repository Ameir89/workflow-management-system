// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/ConditionProperties.js
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import FormSelect from "../../../../../components/Common/FormSelect";
import PropertySection from "../PropertySection";

const ConditionProperties = ({ node, onPropertyChange }) => {
  const { t } = useTranslation();
  const properties = node.properties || {};
  const conditions = properties.conditions || [];

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

  const addCondition = () => {
    const newCondition = {
      id: Date.now().toString(),
      field: "",
      operator: "equals",
      value: "",
    };
    onPropertyChange("conditions", [...conditions, newCondition]);
  };

  const updateCondition = (index, field, value) => {
    const updatedConditions = [...conditions];
    updatedConditions[index] = {
      ...updatedConditions[index],
      [field]: value,
    };
    onPropertyChange("conditions", updatedConditions);
  };

  const removeCondition = (index) => {
    const updatedConditions = conditions.filter((_, i) => i !== index);
    onPropertyChange("conditions", updatedConditions);
  };

  return (
    <PropertySection title={t("designer.conditionProperties")}>
      <div className="space-y-4">
        <FormSelect
          label={t("designer.operator")}
          value={properties.operator || "and"}
          onChange={(e) => onPropertyChange("operator", e.target.value)}
          options={operatorOptions}
        />

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              {t("designer.conditions")}
            </label>
            <button
              type="button"
              onClick={addCondition}
              className="btn btn-outline btn-sm"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {t("designer.addCondition")}
            </button>
          </div>

          {conditions.length === 0 ? (
            <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-sm">{t("designer.noConditions")}</p>
              <button
                type="button"
                onClick={addCondition}
                className="mt-2 btn btn-primary btn-sm"
              >
                {t("designer.addFirstCondition")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {conditions.map((condition, index) => (
                <ConditionItem
                  key={condition.id || index}
                  condition={condition}
                  index={index}
                  fieldOptions={fieldOptions}
                  comparisonOperators={comparisonOperators}
                  onUpdate={updateCondition}
                  onRemove={removeCondition}
                  showOperator={index > 0}
                  operator={properties.operator}
                />
              ))}
            </div>
          )}
        </div>

        {/* Condition Logic Info */}
        <div className="p-3 bg-gray-50 rounded-md">
          <h5 className="text-sm font-medium text-gray-900 mb-2">
            {t("designer.conditionLogicInfo")}
          </h5>
          <div className="text-xs text-gray-600 space-y-1">
            <p>
              <strong>{t("designer.and")}:</strong> {t("designer.andDesc")}
            </p>
            <p>
              <strong>{t("designer.or")}:</strong> {t("designer.orDesc")}
            </p>
          </div>
        </div>
      </div>
    </PropertySection>
  );
};

const ConditionItem = ({
  condition,
  index,
  fieldOptions,
  comparisonOperators,
  onUpdate,
  onRemove,
  showOperator,
  operator,
}) => {
  const { t } = useTranslation();

  const needsValue = !["is_empty", "is_not_empty"].includes(condition.operator);

  return (
    <div className="p-3 border border-gray-200 rounded-md bg-white">
      {showOperator && (
        <div className="text-center mb-2">
          <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded">
            {operator?.toUpperCase() || "AND"}
          </span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-2 items-start">
        <div className="col-span-4">
          <select
            value={condition.field}
            onChange={(e) => onUpdate(index, "field", e.target.value)}
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
            value={condition.operator}
            onChange={(e) => onUpdate(index, "operator", e.target.value)}
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
          {needsValue && (
            <input
              type="text"
              value={condition.value}
              onChange={(e) => onUpdate(index, "value", e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              placeholder={t("designer.conditionValue")}
            />
          )}
        </div>

        <div className="col-span-1 flex justify-end">
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-red-400 hover:text-red-600 p-1"
            title={t("common.remove")}
          >
            <TrashIcon className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConditionProperties;
