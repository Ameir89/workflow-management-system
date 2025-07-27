// src/components/Scripts/ScriptEditor/tabs/TestTab.js - Updated for API response and i18n
import React, { useState } from "react";
import { useMutation } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { scriptsService } from "../../../../services/scriptsService";

const TestTab = ({ script, isEditing, scriptId }) => {
  const { t } = useTranslation();
  const [testData, setTestData] = useState("{}");
  const [testResult, setTestResult] = useState(null);

  // Test script mutation
  const testScriptMutation = useMutation(
    ({ scriptId, data }) => scriptsService.testScript(scriptId, data),
    {
      onSuccess: (result) => {
        setTestResult(result);
        toast.success(t("scripts.testing.testSuccess"));
      },
      onError: (error) => {
        setTestResult({ error: error.message });
        toast.error(t("scripts.testing.testFailed"));
      },
    }
  );

  const handleTest = () => {
    if (!script.content.trim()) {
      toast.error(t("scripts.testing.noContentToTest"));
      return;
    }

    let parsedTestData = {};
    try {
      parsedTestData = JSON.parse(testData);
    } catch (error) {
      toast.error(t("scripts.testing.invalidJsonTestData"));
      return;
    }

    if (isEditing) {
      testScriptMutation.mutate({ scriptId, data: parsedTestData });
    } else {
      toast.info(t("scripts.testing.saveScriptBeforeTesting"));
    }
  };

  // Generate sample test data based on script language
  const getSampleTestData = () => {
    switch (script.language) {
      case "python":
        return JSON.stringify(
          {
            workflow_data: {
              user_name: "John Doe",
              email: "john@example.com",
              amount: 1234.56,
              status: "active",
            },
            timestamp: new Date().toISOString(),
          },
          null,
          2
        );
      case "javascript":
        return JSON.stringify(
          {
            data: {
              id: 1,
              name: "Test Item",
              value: 100,
            },
          },
          null,
          2
        );
      case "sql":
        return JSON.stringify(
          {
            start_date: "2024-01-01",
            end_date: "2024-12-31",
          },
          null,
          2
        );
      case "shell":
        return JSON.stringify(
          {
            input_file: "/tmp/input.txt",
            output_file: "/tmp/output.txt",
          },
          null,
          2
        );
      default:
        return "{}";
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">
          {t("scripts.testing.testScript")}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setTestData(getSampleTestData())}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {t("scripts.testing.sampleData")}
          </button>
          <button
            onClick={handleTest}
            disabled={testScriptMutation.isLoading || !isEditing}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {testScriptMutation.isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : null}
            {t("scripts.testing.runTest")}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("scripts.testing.testData")} (JSON)
        </label>
        <textarea
          value={testData}
          onChange={(e) => setTestData(e.target.value)}
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
          placeholder={t("scripts.testing.testDataPlaceholder")}
        />
        <p className="text-xs text-gray-500 mt-1">
          {t("scripts.testing.enterTestDataJson")}
        </p>
      </div>

      {testResult && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("scripts.testing.testResult")}
          </label>
          <div
            className={`p-4 rounded-lg border ${
              testResult.error
                ? "bg-red-50 border-red-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-64">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            {t("scripts.testing.saveScriptBeforeTesting")}
          </p>
        </div>
      )}
    </div>
  );
};

export default TestTab;
