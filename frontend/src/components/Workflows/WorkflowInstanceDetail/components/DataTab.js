// src/components/Workflows/WorkflowInstanceDetail/components/DataTab.js
import React from "react";
import { useTranslation } from "react-i18next";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";

const DataSection = ({ title, data, isEmpty = false }) => {
  if (isEmpty) return null;

  return (
    <div className="mb-6">
      <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
};

const VariablesSection = ({ variables }) => {
  const { t } = useTranslation();

  if (!variables || Object.keys(variables).length === 0) return null;

  return (
    <div className="mb-6">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        {t("workflows.variables")}
      </h4>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 gap-3">
          {Object.entries(variables).map(([key, value]) => (
            <div
              key={key}
              className="flex items-start justify-between border-b border-gray-200 pb-2"
            >
              <span className="text-sm font-medium text-gray-900">{key}:</span>
              <span className="text-sm text-gray-700 ml-4 break-all">
                {typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const NoDataState = () => {
  const { t } = useTranslation();

  return (
    <div className="text-center py-8">
      <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">
        {t("workflows.noDataAvailable")}
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        {t("workflows.noDataAvailableDescription")}
      </p>
    </div>
  );
};

const DataTab = ({ instance }) => {
  const { t } = useTranslation();

  const hasInputData =
    instance.input_data && Object.keys(instance.input_data).length > 0;
  const hasCurrentData =
    instance.current_data && Object.keys(instance.current_data).length > 0;
  const hasOutputData =
    instance.output_data && Object.keys(instance.output_data).length > 0;
  const hasVariables =
    instance.variables && Object.keys(instance.variables).length > 0;
  const hasMetadata =
    instance.metadata && Object.keys(instance.metadata).length > 0;

  const hasAnyData =
    hasInputData ||
    hasCurrentData ||
    hasOutputData ||
    hasVariables ||
    hasMetadata;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {t("workflows.instanceData")}
        </h3>

        {/* Input Data */}
        <DataSection
          title={t("workflows.inputData")}
          data={instance.input_data}
          isEmpty={!hasInputData}
        />

        {/* Current Data */}
        <DataSection
          title={t("workflows.currentData")}
          data={instance.current_data}
          isEmpty={!hasCurrentData}
        />

        {/* Output Data */}
        <DataSection
          title={t("workflows.outputData")}
          data={instance.output_data}
          isEmpty={!hasOutputData}
        />

        {/* Variables */}
        <VariablesSection variables={instance.variables} />

        {/* Metadata */}
        <DataSection
          title={t("workflows.metadata")}
          data={instance.metadata}
          isEmpty={!hasMetadata}
        />

        {/* No Data State */}
        {!hasAnyData && <NoDataState />}
      </div>
    </div>
  );
};

export default DataTab;
