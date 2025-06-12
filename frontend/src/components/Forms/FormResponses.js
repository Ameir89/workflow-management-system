import React, { useState } from "react";
import { useQuery } from "react-query";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formsService } from "../../services/formsService";
import { EyeIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

const FormResponses = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const [selectedResponse, setSelectedResponse] = useState(null);

  const { data: responsesData, isLoading } = useQuery(
    ["form-responses", id, page],
    () => formsService.getFormResponses(id, { page, limit: 20 }),
    { keepPreviousData: true }
  );

  const { data: form } = useQuery(["form", id], () => formsService.getForm(id));

  const exportToCSV = () => {
    if (!responsesData?.responses?.length) return;

    const headers = ["Submitted By", "Submitted At", "Workflow", "Task"];
    const fieldNames = form?.schema?.fields?.map((field) => field.label) || [];
    headers.push(...fieldNames);

    const csvContent = [
      headers.join(","),
      ...responsesData.responses.map((response) => {
        const row = [
          response.submitted_by_name || "",
          new Date(response.submitted_at).toLocaleString(),
          response.workflow_title || "",
          response.task_name || "",
        ];

        // Add form field values
        fieldNames.forEach((fieldName) => {
          const field = form?.schema?.fields?.find(
            (f) => f.label === fieldName
          );
          const value = field ? response.data[field.name] || "" : "";
          row.push(typeof value === "object" ? JSON.stringify(value) : value);
        });

        return row.map((cell) => `"${cell}"`).join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${form?.name || "form"}_responses.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const ResponseDetailModal = ({ response, onClose }) => {
    if (!response) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {t("forms.responseDetail")}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-6 w-6"
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

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                {t("forms.submissionInfo")}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">{t("forms.submittedBy")}:</span>
                  <span className="ml-2">{response.submitted_by_name}</span>
                </div>
                <div>
                  <span className="font-medium">{t("forms.submittedAt")}:</span>
                  <span className="ml-2">
                    {new Date(response.submitted_at).toLocaleString()}
                  </span>
                </div>
                {response.workflow_title && (
                  <div>
                    <span className="font-medium">{t("forms.workflow")}:</span>
                    <span className="ml-2">{response.workflow_title}</span>
                  </div>
                )}
                {response.task_name && (
                  <div>
                    <span className="font-medium">{t("forms.task")}:</span>
                    <span className="ml-2">{response.task_name}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                {t("forms.responseData")}
              </h4>
              <div className="space-y-3">
                {form?.schema?.fields?.map((field) => {
                  const value = response.data[field.name];
                  return (
                    <div
                      key={field.name}
                      className="border-b border-gray-200 pb-2"
                    >
                      <label className="block text-sm font-medium text-gray-700">
                        {field.label}
                      </label>
                      <div className="mt-1 text-sm text-gray-900">
                        {Array.isArray(value)
                          ? value.join(", ")
                          : typeof value === "object"
                          ? JSON.stringify(value, null, 2)
                          : value || t("common.notProvided")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("forms.responses")} - {form?.name}
          </h1>
          <p className="text-gray-600">
            {t("forms.totalResponses", {
              count: responsesData?.responses?.length || 0,
            })}
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={!responsesData?.responses?.length}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          {t("forms.exportCSV")}
        </button>
      </div>

      {/* Responses Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("forms.submittedBy")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("forms.submittedAt")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("forms.context")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {responsesData?.responses?.map((response) => (
              <tr key={response.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {response.submitted_by_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(response.submitted_at).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(response.submitted_at).toLocaleTimeString()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {response.workflow_title && (
                    <div className="text-sm text-gray-900">
                      {t("forms.workflow")}: {response.workflow_title}
                    </div>
                  )}
                  {response.task_name && (
                    <div className="text-sm text-gray-500">
                      {t("forms.task")}: {response.task_name}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => setSelectedResponse(response)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {responsesData?.responses?.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {t("forms.noResponses")}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t("forms.noResponsesDescription")}
          </p>
        </div>
      )}

      {/* Response Detail Modal */}
      <ResponseDetailModal
        response={selectedResponse}
        onClose={() => setSelectedResponse(null)}
      />
    </div>
  );
};

export default FormResponses;
