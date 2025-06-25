// src/components/Scripts/ScriptEditor.js - Complete Implementation
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { scriptsService } from "../../services/scriptsService";
import {
  ArrowLeftIcon,
  PlayIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  BookOpenIcon,
  CodeBracketIcon,
  ClockIcon,
  TagIcon,
  UserIcon,
  CalendarIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

const ScriptEditor = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const [script, setScript] = useState({
    name: "",
    description: "",
    language: "javascript",
    category: "condition",
    content: "",
    parameters: [],
    status: "draft",
    tags: [],
  });

  const [testData, setTestData] = useState("{}");
  const [testResult, setTestResult] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [activeTab, setActiveTab] = useState("editor");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showParameterModal, setShowParameterModal] = useState(false);
  const [showUnsavedChanges, setShowUnsavedChanges] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch existing script if editing
  const { data: existingScript, isLoading } = useQuery(
    ["script", id],
    () => scriptsService.getScript(id),
    {
      enabled: isEditing,
      onSuccess: (data) => {
        setScript(data);
        if (data.test_data) {
          setTestData(JSON.stringify(data.test_data, null, 2));
        }
      },
    }
  );

  // Fetch categories and templates
  const { data: categories } = useQuery(
    ["script-categories"],
    scriptsService.getScriptCategories
  );

  const { data: templates } = useQuery(
    ["script-templates"],
    scriptsService.getScriptTemplates
  );

  // Save script mutation
  const saveScriptMutation = useMutation(
    (scriptData) => {
      if (isEditing) {
        return scriptsService.updateScript(id, scriptData);
      } else {
        return scriptsService.createScript(scriptData);
      }
    },
    {
      onSuccess: (data) => {
        toast.success(
          `Script ${isEditing ? "updated" : "created"} successfully`
        );
        queryClient.invalidateQueries(["scripts"]);
        setHasUnsavedChanges(false);
        if (!isEditing) {
          navigate(`/scripts/${data.script.id}/edit`);
        }
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Validate script mutation
  const validateScriptMutation = useMutation(
    (content) => scriptsService.validateScript(content, script.language),
    {
      onSuccess: (result) => {
        if (result.valid) {
          setValidationErrors([]);
          toast.success("Script validation passed");
        } else {
          setValidationErrors(result.errors);
          toast.error("Script validation failed");
        }
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Test script mutation
  const testScriptMutation = useMutation(
    ({ scriptId, data }) => scriptsService.testScript(scriptId, data),
    {
      onSuccess: (result) => {
        setTestResult(result);
        toast.success("Script executed successfully");
      },
      onError: (error) => {
        setTestResult({ error: error.message });
        toast.error("Script execution failed");
      },
    }
  );

  // Track unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleScriptChange = (field, value) => {
    setScript((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    if (!script.name.trim()) {
      toast.error("Script name is required");
      return;
    }

    if (!script.content.trim()) {
      toast.error("Script content is required");
      return;
    }

    saveScriptMutation.mutate(script);
  };

  const handleValidate = () => {
    if (!script.content.trim()) {
      toast.error("No content to validate");
      return;
    }
    validateScriptMutation.mutate(script.content);
  };

  const handleTest = () => {
    if (!script.content.trim()) {
      toast.error("No content to test");
      return;
    }

    let parsedTestData = {};
    try {
      parsedTestData = JSON.parse(testData);
    } catch (error) {
      toast.error("Invalid JSON in test data");
      return;
    }

    if (isEditing) {
      testScriptMutation.mutate({ scriptId: id, data: parsedTestData });
    } else {
      toast.info("Please save the script before testing");
    }
  };

  const handleTemplateSelect = (template) => {
    setScript({
      ...script,
      content: template.content,
      language: template.language,
      parameters: template.parameters || [],
    });
    setHasUnsavedChanges(true);
    setShowTemplateModal(false);
  };

  const addParameter = () => {
    setScript({
      ...script,
      parameters: [
        ...script.parameters,
        {
          name: "",
          type: "string",
          description: "",
          required: false,
          default_value: "",
        },
      ],
    });
    setHasUnsavedChanges(true);
  };

  const updateParameter = (index, field, value) => {
    const updatedParameters = [...script.parameters];
    updatedParameters[index][field] = value;
    setScript({ ...script, parameters: updatedParameters });
    setHasUnsavedChanges(true);
  };

  const removeParameter = (index) => {
    const updatedParameters = script.parameters.filter((_, i) => i !== index);
    setScript({ ...script, parameters: updatedParameters });
    setHasUnsavedChanges(true);
  };

  const handleTagsChange = (tagsString) => {
    const tags = tagsString
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);
    setScript({ ...script, tags });
    setHasUnsavedChanges(true);
  };

  // Language-specific code examples
  const getCodeExample = (language) => {
    const examples = {
      javascript: `// Example JavaScript script
function processData(input) {
  // Your logic here
  const result = {
    processed: true,
    data: input,
    timestamp: new Date().toISOString()
  };
  
  return result;
}

// Main execution
return processData(data);`,
      python: `# Example Python script
def process_data(input_data):
    """Process input data and return result"""
    result = {
        'processed': True,
        'data': input_data,
        'timestamp': datetime.now().isoformat()
    }
    return result

# Main execution
result = process_data(data)
return result`,
      sql: `-- Example SQL query
SELECT 
    id,
    name,
    created_at,
    CASE 
        WHEN status = 'active' THEN 'Active'
        ELSE 'Inactive'
    END as display_status
FROM 
    workflow_instances
WHERE 
    created_at >= :start_date
    AND created_at <= :end_date
ORDER BY 
    created_at DESC;`,
      shell: `#!/bin/bash
# Example shell script

# Set variables
INPUT_FILE="$1"
OUTPUT_FILE="$2"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file not found"
    exit 1
fi

# Process file
echo "Processing $INPUT_FILE..."
cat "$INPUT_FILE" | grep -v "^#" > "$OUTPUT_FILE"

echo "Processing complete. Output saved to $OUTPUT_FILE"
exit 0`,
    };
    return examples[language] || examples.javascript;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: "editor", name: "Editor", icon: CodeBracketIcon },
    { id: "parameters", name: "Parameters", icon: TagIcon },
    { id: "test", name: "Test", icon: PlayIcon },
    { id: "history", name: "History", icon: ClockIcon },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                setShowUnsavedChanges(true);
              } else {
                navigate("/scripts");
              }
            }}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Scripts
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? "Edit Script" : "Create New Script"}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEditing
                ? "Modify your existing script"
                : "Create a reusable script for workflows"}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {hasUnsavedChanges && (
              <span className="text-sm text-amber-600 flex items-center">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                Unsaved changes
              </span>
            )}

            <button
              onClick={handleValidate}
              disabled={validateScriptMutation.isLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <CheckIcon className="h-4 w-4 mr-1" />
              Validate
            </button>

            <button
              onClick={handleTest}
              disabled={testScriptMutation.isLoading || !isEditing}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <PlayIcon className="h-4 w-4 mr-1" />
              Test
            </button>

            <button
              onClick={handleSave}
              disabled={saveScriptMutation.isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {saveScriptMutation.isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : null}
              {isEditing ? "Update" : "Create"} Script
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Basic Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Script Name *
                </label>
                <input
                  type="text"
                  value={script.name}
                  onChange={(e) => handleScriptChange("name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter script name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language *
                </label>
                <select
                  value={script.language}
                  onChange={(e) =>
                    handleScriptChange("language", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="sql">SQL</option>
                  <option value="shell">Shell</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={script.category}
                  onChange={(e) =>
                    handleScriptChange("category", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {categories?.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={script.status}
                  onChange={(e) => handleScriptChange("status", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={script.description}
                onChange={(e) =>
                  handleScriptChange("description", e.target.value)
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe what this script does..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <input
                type="text"
                value={script.tags?.join(", ") || ""}
                onChange={(e) => handleTagsChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter tags separated by commas..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: validation, data-processing, utility
              </p>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "editor" && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Script Content
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <BookOpenIcon className="h-4 w-4 mr-1" />
                    Templates
                  </button>
                  <button
                    onClick={() =>
                      handleScriptChange(
                        "content",
                        getCodeExample(script.language)
                      )
                    }
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <CodeBracketIcon className="h-4 w-4 mr-1" />
                    Example
                  </button>
                </div>
              </div>

              <textarea
                value={script.content}
                onChange={(e) => handleScriptChange("content", e.target.value)}
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                placeholder="Write your script here..."
              />

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">
                        Validation Errors
                      </h4>
                      <ul className="mt-2 text-sm text-red-700 space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "parameters" && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Script Parameters
                </h2>
                <button
                  onClick={addParameter}
                  className="inline-flex items-center px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                >
                  <TagIcon className="h-4 w-4 mr-1" />
                  Add Parameter
                </button>
              </div>

              {script.parameters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No parameters defined
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add parameters to make your script configurable
                  </p>
                  <button
                    onClick={addParameter}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <TagIcon className="h-4 w-4 mr-2" />
                    Add First Parameter
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {script.parameters.map((param, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Parameter Name
                        </label>
                        <input
                          type="text"
                          value={param.name}
                          onChange={(e) =>
                            updateParameter(index, "name", e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                          placeholder="parameter_name"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          value={param.type}
                          onChange={(e) =>
                            updateParameter(index, "type", e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="array">Array</option>
                          <option value="object">Object</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={param.description}
                          onChange={(e) =>
                            updateParameter(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                          placeholder="Parameter description"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Default Value
                        </label>
                        <input
                          type="text"
                          value={param.default_value}
                          onChange={(e) =>
                            updateParameter(
                              index,
                              "default_value",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                          placeholder="Default"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="flex items-center text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={param.required}
                            onChange={(e) =>
                              updateParameter(
                                index,
                                "required",
                                e.target.checked
                              )
                            }
                            className="mr-1 h-3 w-3 text-indigo-600 rounded"
                          />
                          Required
                        </label>
                      </div>
                      <div className="col-span-1">
                        <button
                          onClick={() => removeParameter(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "test" && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Test Script
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Input (JSON)
                </label>
                <textarea
                  value={testData}
                  onChange={(e) => setTestData(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  placeholder='{"key": "value"}'
                />
              </div>

              {testResult && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Result
                  </label>
                  <div
                    className={`p-4 rounded-lg border ${
                      testResult.error
                        ? "bg-red-50 border-red-200"
                        : "bg-green-50 border-green-200"
                    }`}
                  >
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Execution History
              </h2>
              <div className="text-center py-8 text-gray-500">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No execution history
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Script execution history will appear here
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Script Info */}
          {isEditing && existingScript && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Script Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <UserIcon className="h-4 w-4 mr-2" />
                  Created by {existingScript.created_by_name}
                </div>
                <div className="flex items-center text-gray-600">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {new Date(existingScript.created_at).toLocaleDateString()}
                </div>
                {existingScript.updated_at &&
                  existingScript.updated_at !== existingScript.created_at && (
                    <div className="flex items-center text-gray-600">
                      <PencilIcon className="h-4 w-4 mr-2" />
                      Updated{" "}
                      {new Date(existingScript.updated_at).toLocaleDateString()}
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowTemplateModal(true)}
                className="w-full inline-flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <BookOpenIcon className="h-4 w-4 mr-2" />
                Browse Templates
              </button>

              <button
                onClick={handleValidate}
                disabled={validateScriptMutation.isLoading}
                className="w-full inline-flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Validate Syntax
              </button>

              {isEditing && (
                <button
                  onClick={handleTest}
                  disabled={testScriptMutation.isLoading}
                  className="w-full inline-flex items-center px-3 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100"
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Test Script
                </button>
              )}
            </div>
          </div>

          {/* Language Reference */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              {script.language.charAt(0).toUpperCase() +
                script.language.slice(1)}{" "}
              Reference
            </h3>
            <div className="space-y-2 text-xs text-gray-600">
              {script.language === "javascript" && (
                <>
                  <p>
                    • Access input data via{" "}
                    <code className="bg-gray-100 px-1 rounded">data</code>{" "}
                    variable
                  </p>
                  <p>
                    • Return results using{" "}
                    <code className="bg-gray-100 px-1 rounded">return</code>{" "}
                    statement
                  </p>
                  <p>
                    • Use{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      console.log()
                    </code>{" "}
                    for debugging
                  </p>
                  <p>• Available: Date, Math, JSON objects</p>
                </>
              )}
              {script.language === "python" && (
                <>
                  <p>
                    • Access input data via{" "}
                    <code className="bg-gray-100 px-1 rounded">data</code>{" "}
                    variable
                  </p>
                  <p>
                    • Return results using{" "}
                    <code className="bg-gray-100 px-1 rounded">return</code>{" "}
                    statement
                  </p>
                  <p>
                    • Use{" "}
                    <code className="bg-gray-100 px-1 rounded">print()</code>{" "}
                    for debugging
                  </p>
                  <p>• Available: datetime, json, re modules</p>
                </>
              )}
              {script.language === "sql" && (
                <>
                  <p>
                    • Use{" "}
                    <code className="bg-gray-100 px-1 rounded">:parameter</code>{" "}
                    for parameters
                  </p>
                  <p>• Standard SQL functions available</p>
                  <p>• Results returned as JSON array</p>
                </>
              )}
              {script.language === "shell" && (
                <>
                  <p>
                    • Access parameters via{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      $1, $2, etc.
                    </code>
                  </p>
                  <p>
                    • Use <code className="bg-gray-100 px-1 rounded">echo</code>{" "}
                    for output
                  </p>
                  <p>• Exit codes: 0 = success, 1+ = error</p>
                </>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
              <InformationCircleIcon className="h-4 w-4 mr-1" />
              Tips
            </h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Save frequently to avoid losing changes</li>
              <li>• Test your script with different inputs</li>
              <li>• Add parameters for reusability</li>
              <li>• Use descriptive names and comments</li>
              <li>• Validate syntax before saving</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Templates Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Script Templates
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {templates
                ?.filter((t) => t.language === script.language)
                .map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 cursor-pointer"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <h4 className="font-medium text-gray-900">
                      {template.name}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {template.description}
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                        {template.language}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                        {template.category}
                      </span>
                    </div>
                  </div>
                )) || (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No templates available
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No templates found for {script.language}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Modal */}
      {showUnsavedChanges && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">
                Unsaved Changes
              </h3>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              You have unsaved changes. Are you sure you want to leave without
              saving?
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowUnsavedChanges(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setHasUnsavedChanges(false);
                  navigate("/scripts");
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Leave Without Saving
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Save & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptEditor;
