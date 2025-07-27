// src/pages/AutomationEditor/components/AutomationTestPanel.js
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../../../Common/LoadingSpinner";

const AutomationTestPanel = ({
  scriptId,
  script,
  testResults,
  onTest,
  onClose,
}) => {
  const { t } = useTranslation();
  const [testData, setTestData] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [testHistory, setTestHistory] = useState([]);

  // Sample test data based on script type
  const getSampleTestData = () => {
    return JSON.stringify(
      {
        workflow_instance_id: "wf_12345",
        workflow_data: {
          title: "Purchase Request",
          amount: 15000,
          department: "IT",
          user: {
            email: "john.doe@company.com",
            name: "John Doe",
          },
          manager_email: "manager@company.com",
          manager_name: "Jane Smith",
          submitter_name: "John Doe",
        },
        user: {
          id: "user_123",
          email: "john.doe@company.com",
          name: "John Doe",
        },
        api_token: "test_token_123",
        approval_url: "https://workflow.company.com/approve/12345",
      },
      null,
      2
    );
  };

  // Initialize with sample data
  useEffect(() => {
    if (!testData) {
      setTestData(getSampleTestData());
    }
  }, []);

  // Handle test execution
  const handleRunTest = async () => {
    try {
      setIsRunning(true);
      let parsedData = {};

      if (testData.trim()) {
        parsedData = JSON.parse(testData);
      }

      const result = await onTest({
        test_data: parsedData,
        timeout: 30,
        allow_network: false,
      });

      // Add to test history
      const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        input: parsedData,
        result: result,
        success: result?.success || false,
        duration: result?.execution_time_ms || 0,
      };

      setTestHistory((prev) => [historyEntry, ...prev.slice(0, 9)]); // Keep last 10
    } catch (error) {
      console.error("Test execution failed:", error);
    } finally {
      setIsRunning(false);
    }
  };

  // Format test data
  const formatTestData = () => {
    try {
      const parsed = JSON.parse(testData);
      setTestData(JSON.stringify(parsed, null, 2));
    } catch (error) {
      // Invalid JSON, leave as is
    }
  };

  // Reset to sample data
  const resetToSample = () => {
    setTestData(getSampleTestData());
  };

  return (
    <div className="space-y-6">
      {/* Test Configuration */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {t("automation.testConfiguration")}
          </h3>
          <div className="flex items-center space-x-2">
            <button onClick={resetToSample} className="btn btn-outline btn-sm">
              {t("automation.useSampleData")}
            </button>
            <button onClick={formatTestData} className="btn btn-outline btn-sm">
              {t("automation.formatJson")}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("automation.testData")}
            </label>
            <textarea
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={t("automation.enterTestData")}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("automation.testDataHelp")}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allow-network"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="allow-network"
                  className="ml-2 text-sm text-gray-700"
                >
                  {t("automation.allowNetworkAccess")}
                </label>
              </div>
              <div className="flex items-center">
                <label className="text-sm text-gray-700 mr-2">
                  {t("automation.timeout")}:
                </label>
                <select className="px-2 py-1 border border-gray-300 rounded text-sm">
                  <option value="30">30s</option>
                  <option value="60">60s</option>
                  <option value="120">120s</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRunTest}
              disabled={isRunning || !testData.trim()}
              className="btn btn-primary"
            >
              {isRunning ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t("automation.running")}
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4 mr-2" />
                  {t("automation.runTest")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            {t("automation.testResults")}
          </h3>

          {/* Result Summary */}
          <div
            className={`rounded-lg p-4 ${
              testResults.success
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center">
              {testResults.success ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
              )}
              <div className="flex-1">
                <h4
                  className={`text-sm font-medium ${
                    testResults.success ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {testResults.success
                    ? t("automation.testPassed")
                    : t("automation.testFailed")}
                </h4>
                <div
                  className={`text-xs mt-1 ${
                    testResults.success ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {t("automation.executionTime")}:{" "}
                  {testResults.execution_time_ms}ms
                </div>
              </div>
            </div>
          </div>

          {/* Result Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Output */}
            {testResults.result && (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-4 w-4 text-gray-500 mr-2" />
                    <h5 className="text-sm font-medium text-gray-900">
                      {t("automation.output")}
                    </h5>
                  </div>
                </div>
                <div className="p-4">
                  <pre className="text-xs text-gray-800 bg-gray-50 p-3 rounded border overflow-auto max-h-64">
                    {typeof testResults.result === "object"
                      ? JSON.stringify(testResults.result, null, 2)
                      : testResults.result}
                  </pre>
                </div>
              </div>
            )}

            {/* Error Details */}
            {testResults.error && (
              <div className="bg-white border border-red-200 rounded-lg">
                <div className="px-4 py-3 border-b border-red-200">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-2" />
                    <h5 className="text-sm font-medium text-red-900">
                      {t("automation.error")}
                    </h5>
                  </div>
                </div>
                <div className="p-4">
                  <pre className="text-xs text-red-800 bg-red-50 p-3 rounded border overflow-auto max-h-64">
                    {testResults.error}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Logs */}
          {testResults.logs && testResults.logs.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center">
                  <CodeBracketIcon className="h-4 w-4 text-gray-500 mr-2" />
                  <h5 className="text-sm font-medium text-gray-900">
                    {t("automation.logs")}
                  </h5>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-1 max-h-48 overflow-auto">
                  {testResults.logs.map((log, index) => (
                    <div
                      key={index}
                      className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded"
                    >
                      <span className="text-gray-400">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span
                        className={`ml-2 ${
                          log.level === "error"
                            ? "text-red-600"
                            : log.level === "warn"
                            ? "text-yellow-600"
                            : "text-gray-800"
                        }`}
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test History */}
      {testHistory.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            {t("automation.testHistory")}
          </h3>

          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
            {testHistory.map((test) => (
              <div key={test.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {test.success ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(test.timestamp).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t("automation.executionTime")}: {test.duration}ms
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        test.success
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {test.success
                        ? t("automation.passed")
                        : t("automation.failed")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button onClick={onClose} className="btn btn-outline">
          {t("common.close")}
        </button>
        <button
          onClick={handleRunTest}
          disabled={isRunning || !testData.trim()}
          className="btn btn-primary"
        >
          {isRunning ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              {t("automation.running")}
            </>
          ) : (
            <>
              <PlayIcon className="h-4 w-4 mr-2" />
              {t("automation.runTest")}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AutomationTestPanel;
