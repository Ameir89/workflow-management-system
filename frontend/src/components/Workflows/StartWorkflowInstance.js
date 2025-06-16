// src/components/Workflows/StartWorkflowInstance.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { workflowService } from "../../services/workflowService";
import { workflowExecutionService } from "../../services/workflowExecutionService";
import DynamicForm from "../Forms/DynamicForm";
import LoadingSpinner from "../Common/LoadingSpinner";
import {
  RocketLaunchIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
  ClockIcon,
  UserGroupIcon,
  CogIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const StartWorkflowInstance = () => {
  const { t } = useTranslation();
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch workflow details
  const { data: workflow, isLoading: workflowLoading } = useQuery(
    ["workflow", workflowId],
    () => workflowService.getWorkflow(workflowId)
  );

  // Fetch execution templates
  const { data: templates } = useQuery(
    ["execution-templates", workflowId],
    () => workflowExecutionService.getExecutionTemplates(workflowId),
    { enabled: !!workflowId }
  );

  // Fetch execution recommendations
  const { data: recommendations } = useQuery(
    ["execution-recommendations", workflowId],
    () => workflowExecutionService.getExecutionRecommendations(workflowId),
    { enabled: !!workflowId }
  );

  // Start instance mutation
  const startInstanceMutation = useMutation(
    (config) =>
      workflowExecutionService.startWorkflowInstance(workflowId, config),
    {
      onSuccess: (response) => {
        toast.success(
          `Workflow instance started successfully! ID: ${response.instance.id}`
        );
        navigate(`/workflows/instances/${response.instance.id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Validation mutation
  const validateMutation = useMutation(
    (config) =>
      workflowExecutionService.validateWorkflowExecution(workflowId, config),
    {
      onSuccess: (response) => {
        if (response.valid) {
          toast.success("Configuration is valid");
        } else {
          toast.error(`Validation failed: ${response.errors.join(", ")}`);
        }
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Create form schema for workflow initialization
  const createFormSchema = () => {
    const baseFields = [
      {
        name: "title",
        label: "Instance Title",
        type: "text",
        required: true,
        placeholder: "Enter a descriptive title for this workflow instance",
        description: "A clear title helps identify this instance later",
      },
      {
        name: "priority",
        label: "Priority Level",
        type: "select",
        required: true,
        options: [
          { value: "low", label: "🟢 Low - Standard processing" },
          { value: "medium", label: "🟡 Medium - Normal priority" },
          { value: "high", label: "🟠 High - Expedited processing" },
          { value: "urgent", label: "🔴 Urgent - Critical priority" },
        ],
        description: "Priority affects processing order and notifications",
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        required: false,
        placeholder:
          "Optional description or context for this workflow execution",
        description:
          "Provide context that will help others understand this instance",
      },
    ];

    const timingFields = [
      {
        name: "due_date",
        label: "Due Date (Optional)",
        type: "datetime",
        required: false,
        description: "When this workflow should be completed",
      },
      {
        name: "scheduled_start",
        label: "Scheduled Start (Optional)",
        type: "datetime",
        required: false,
        description: "Schedule this workflow to start at a specific time",
      },
    ];

    const assignmentFields = [
      {
        name: "assignee_email",
        label: "Initial Assignee (Optional)",
        type: "email",
        required: false,
        placeholder: "user@example.com",
        description: "User who will be assigned to the first task",
      },
      {
        name: "department",
        label: "Department",
        type: "select",
        required: false,
        options: [
          { value: "finance", label: "Finance" },
          { value: "hr", label: "Human Resources" },
          { value: "it", label: "Information Technology" },
          { value: "operations", label: "Operations" },
          { value: "marketing", label: "Marketing" },
          { value: "sales", label: "Sales" },
        ],
        description: "Department context for this workflow",
      },
    ];

    const notificationFields = [
      {
        name: "notify_stakeholders",
        label: "Notification Settings",
        type: "checkbox",
        checkboxLabel: "Send notifications when workflow starts and completes",
        description:
          "Email notifications will be sent to relevant stakeholders",
      },
      {
        name: "notification_emails",
        label: "Additional Notification Recipients",
        type: "textarea",
        required: false,
        placeholder: "email1@example.com, email2@example.com",
        description:
          "Comma-separated list of emails to notify about workflow progress",
      },
    ];

    const advancedFields = [
      {
        name: "cost_center",
        label: "Cost Center",
        type: "text",
        required: false,
        placeholder: "CC-2024-001",
        description: "Cost center for tracking and reporting",
      },
      {
        name: "project_id",
        label: "Project ID",
        type: "text",
        required: false,
        placeholder: "PRJ-2024-001",
        description: "Associated project identifier",
      },
      {
        name: "tags",
        label: "Tags",
        type: "text",
        required: false,
        placeholder: "urgent, customer-facing, compliance",
        description: "Comma-separated tags for categorization",
      },
      {
        name: "custom_data",
        label: "Custom Data (JSON)",
        type: "textarea",
        required: false,
        placeholder: '{"customer_id": "12345", "contract_value": 50000}',
        description: "Additional data in JSON format to pass to the workflow",
      },
    ];

    const executionFields = [
      {
        name: "auto_assign",
        label: "Execution Options",
        type: "checkbox",
        checkboxLabel: "Automatically assign tasks to available users",
      },
      {
        name: "parallel_execution",
        label: "",
        type: "checkbox",
        checkboxLabel: "Allow parallel execution where possible",
      },
      {
        name: "timeout_minutes",
        label: "Timeout (minutes)",
        type: "number",
        required: false,
        placeholder: "0",
        description: "Maximum execution time (0 = no timeout)",
      },
    ];

    return {
      title: `Start ${workflow?.name}`,
      description:
        workflow?.description || "Configure and start a new workflow instance",
      fields: [
        ...baseFields,
        ...timingFields,
        ...assignmentFields,
        ...notificationFields,
        ...(showAdvanced ? [...advancedFields, ...executionFields] : []),
      ],
    };
  };

  const handleSubmit = async (formData) => {
    // Validate first if enabled
    if (process.env.NODE_ENV === "development") {
      await validateMutation.mutateAsync(formData);
    }

    // Process form data
    const processedData = {
      ...formData,
      // Parse tags
      tags: formData.tags
        ? formData.tags.split(",").map((tag) => tag.trim())
        : [],
      // Parse notification emails
      notification_emails: formData.notification_emails
        ? formData.notification_emails.split(",").map((email) => email.trim())
        : [],
      // Parse custom data
      additional_fields: formData.custom_data
        ? JSON.parse(formData.custom_data)
        : {},
    };

    delete processedData.custom_data; // Remove raw JSON string

    await startInstanceMutation.mutateAsync(processedData);
  };

  const handleUseTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const getDefaultValues = () => {
    const defaults = {
      priority: "medium",
      notify_stakeholders: true,
      auto_assign: true,
      parallel_execution: false,
    };

    // Apply template if selected
    if (selectedTemplate) {
      return { ...defaults, ...selectedTemplate.config };
    }

    // Apply recommendations if available
    if (recommendations?.recommended_config) {
      return { ...defaults, ...recommendations.recommended_config };
    }

    return defaults;
  };

  if (workflowLoading) {
    return <LoadingSpinner fullScreen text="Loading workflow details..." />;
  }

  if (!workflow) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-lg font-medium text-gray-900">
          Workflow Not Found
        </h2>
        <p className="mt-2 text-gray-600">
          The requested workflow could not be found or you don't have permission
          to access it.
        </p>
        <button
          onClick={() => navigate("/start-workflows")}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Workflows
        </button>
      </div>
    );
  }

  if (!workflow.is_active) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400" />
        <h2 className="mt-4 text-lg font-medium text-gray-900">
          Workflow Inactive
        </h2>
        <p className="mt-2 text-gray-600">
          This workflow is currently inactive and cannot be started.
        </p>
        <button
          onClick={() => navigate("/start-workflows")}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Workflows
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => navigate("/start-workflows")}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Workflows
          </button>
        </div>

        <div className="flex items-start space-x-4">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <RocketLaunchIcon className="h-8 w-8 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              Start New Instance
            </h1>
            <h2 className="text-xl text-gray-600 mt-1">{workflow.name}</h2>
            <p className="text-gray-500 mt-2">{workflow.description}</p>
          </div>
        </div>

        {/* Workflow Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <CogIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">
                {workflow.definition?.steps?.length || 0} Steps
              </span>
            </div>
            <p className="text-xs text-blue-700 mt-1">
              Total workflow steps configured
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-900">
                {workflow.avg_completion_time || "N/A"}
              </span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Average completion time
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <UserGroupIcon className="h-5 w-5 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-purple-900">
                {workflow.success_rate || "N/A"}%
              </span>
            </div>
            <p className="text-xs text-purple-700 mt-1">
              Historical success rate
            </p>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      {templates?.templates?.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Quick Start Templates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleUseTemplate(template)}
                className={`text-left p-4 border-2 rounded-lg transition-colors ${
                  selectedTemplate?.id === template.id
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {template.description}
                </p>
                <div className="flex items-center mt-2">
                  <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="text-xs text-gray-500">
                    Used {template.usage_count} times
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations?.recommendations?.length > 0 && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-amber-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-amber-900">
                Recommendations
              </h3>
              <ul className="text-sm text-amber-800 mt-1 space-y-1">
                {recommendations.recommendations.map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Instance Configuration
            </h3>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              {showAdvanced ? "Hide" : "Show"} Advanced Options
            </button>
          </div>
        </div>

        <div className="p-6">
          <DynamicForm
            schema={createFormSchema()}
            defaultValues={getDefaultValues()}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/workflows")}
            isSubmitting={startInstanceMutation.isLoading}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex justify-between items-center text-sm text-gray-500">
        <div>
          <p>
            This will create a new instance of the "{workflow.name}" workflow.
          </p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => validateMutation.mutate(getDefaultValues())}
            disabled={validateMutation.isLoading}
            className="text-indigo-600 hover:text-indigo-800"
          >
            Validate Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartWorkflowInstance;
