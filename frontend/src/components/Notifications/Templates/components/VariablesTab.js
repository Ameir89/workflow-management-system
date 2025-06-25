// src/components/Notifications/Templates/components/VariablesTab.js
import React from "react";
import { useTranslation } from "react-i18next";
import {
  PlusIcon,
  TrashIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

const VariablesTab = ({
  variables,
  addVariable,
  updateVariable,
  removeVariable,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          {t("notifications.templateVariables")}
        </h3>
        <button
          type="button"
          onClick={addVariable}
          className="btn btn-outline btn-sm"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          {t("notifications.addVariable")}
        </button>
      </div>

      {variables.length === 0 ? (
        <EmptyVariablesState onAddVariable={addVariable} />
      ) : (
        <VariablesList
          variables={variables}
          onUpdateVariable={updateVariable}
          onRemoveVariable={removeVariable}
        />
      )}
    </div>
  );
};

const EmptyVariablesState = ({ onAddVariable }) => {
  const { t } = useTranslation();

  return (
    <div className="text-center py-8 text-gray-500">
      <AdjustmentsHorizontalIcon className="mx-auto h-12 w-12 text-gray-300" />
      <p className="mt-2">{t("notifications.noVariables")}</p>
      <button
        type="button"
        onClick={onAddVariable}
        className="mt-4 btn btn-primary btn-sm"
      >
        {t("notifications.addFirstVariable")}
      </button>
    </div>
  );
};

const VariablesList = ({ variables, onUpdateVariable, onRemoveVariable }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {variables.map((variable, index) => (
        <VariableItem
          key={index}
          variable={variable}
          index={index}
          onUpdate={onUpdateVariable}
          onRemove={onRemoveVariable}
        />
      ))}
    </div>
  );
};

const VariableItem = ({ variable, index, onUpdate, onRemove }) => {
  const { t } = useTranslation();

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("notifications.variableKey")} *
          </label>
          <input
            type="text"
            value={variable.key}
            onChange={(e) => onUpdate(index, "key", e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="user_name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("notifications.variableDescription")}
          </label>
          <input
            type="text"
            value={variable.description}
            onChange={(e) => onUpdate(index, "description", e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder={t("notifications.variableDescPlaceholder")}
          />
        </div>

        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">
              {t("notifications.variableExample")}
            </label>
            <input
              type="text"
              value={variable.example}
              onChange={(e) => onUpdate(index, "example", e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="John Doe"
            />
          </div>

          <button
            type="button"
            onClick={() => onRemove(index)}
            className="btn btn-danger btn-sm"
            title={t("common.remove")}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariablesTab;
