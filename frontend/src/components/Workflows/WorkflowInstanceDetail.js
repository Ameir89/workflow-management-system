// src/components/Workflows/WorkflowInstanceDetail.js
import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { workflowService } from "../../services/workflowService";
import { workflowExecutionService } from "../../services/workflowExecutionService";
import { taskService } from "../../services/taskService";
import LoadingSpinner from "../Common/LoadingSpinner";
import {
  ArrowLeftIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CalendarIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  PencilIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ArrowPathIcon,
  CogIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon as CheckCircleIconSolid,
  XCircleIcon as XCircleIconSolid,
  ClockIcon as ClockIconSolid,
  PlayIcon as PlayIconSolid,
  PauseIcon as PauseIconSolid,
} from "@heroicons/react/24/solid";

const StatusBadge = ({ status, size = "md" }) => {
  const statusConfig = {
    pending: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: ClockIconSolid,
      label: "Pending",
    },
    running: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: PlayIconSolid,
      label: "Running",
    },
    completed: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircleIconSolid,
      label: "Completed",
    },
    failed: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: XCircleIconSolid,
      label: "Failed",
    },
    cancelled: {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: StopIcon,
      label: "Cancelled",
    },
    paused: {
      color: "bg-orange-100 text-orange-800 border-orange-200",
      icon: PauseIconSolid,
      label: "Paused",
    },
    scheduled: {
      color: "bg-purple-100 text-purple-800 border-purple-200",
      icon: CalendarIcon,
      label: "Scheduled",
    },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const IconComponent = config.icon;
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <span
      className={`inline-flex items-center ${sizeClasses[size]} rounded-full font-medium border ${config.color}`}
    >
      <IconComponent
        className={`${
          size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
        } mr-1`}
      />
      {config.label}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const priorityConfig = {
    low: { color: "bg-gray-100 text-gray-800", emoji: "🟢" },
    medium: { color: "bg-blue-100 text-blue-800", emoji: "🟡" },
    high: { color: "bg-orange-100 text-orange-800", emoji: "🟠" },
    urgent: { color: "bg-red-100 text-red-800", emoji: "🔴" },
  };

  const config = priorityConfig[priority] || priorityConfig.medium;

  return (
    <span
      className={`inline-flex items-center px-2 py-1 text-xs rounded-full font-medium ${config.color}`}
    >
      <span className="mr-1">{config.emoji}</span>
      {priority?.charAt(0).toUpperCase() + priority?.slice(1)}
    </span>
  );
};

const TaskItem = ({ task, onTaskUpdate }) => {
  const getTaskStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircleIconSolid className="h-5 w-5 text-green-600" />;
      case "failed":
        return <XCircleIconSolid className="h-5 w-5 text-red-600" />;
      case "in_progress":
        return <PlayIconSolid className="h-5 w-5 text-blue-600" />;
      case "pending":
        return <ClockIconSolid className="h-5 w-5 text-yellow-600" />;
      default:
        return <ClockIconSolid className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0">{getTaskStatusIcon(task.status)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {task.name || `Task ${task.id}`}
          </h4>
          <StatusBadge status={task.status} size="sm" />
        </div>
        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
          {task.assigned_to && (
            <span className="flex items-center">
              <UserIcon className="h-3 w-3 mr-1" />
              {task.assigned_to_name || task.assigned_to}
            </span>
          )}
          {task.due_date && (
            <span className="flex items-center">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Link
          to={`/tasks/${task.id}`}
          className="text-gray-400 hover:text-gray-600"
          title="View task"
        >
          <EyeIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

const ExecutionTimeline = ({ instance, tasks = [] }) => {
  const events = [
    {
      id: 1,
      type: "created",
      title: "Workflow Instance Created",
      timestamp: instance.created_at,
      user: instance.created_by_name,
      icon: PlusIcon,
      color: "bg-blue-500",
    },
    {
      id: 2,
      type: "started",
      title: "Execution Started",
      timestamp: instance.started_at,
      user: instance.started_by_name,
      icon: PlayIcon,
      color: "bg-green-500",
    },
    ...tasks.map((task, index) => ({
      id: `task-${task.id}`,
      type: "task",
      title: `Task: ${task.name}`,
      timestamp: task.completed_at || task.created_at,
      user: task.assigned_to_name,
      icon: task.status === "completed" ? CheckCircleIcon : ClockIcon,
      color: task.status === "completed" ? "bg-green-500" : "bg-yellow-500",
      status: task.status,
    })),
  ].filter((event) => event.timestamp);

  // Sort events by timestamp
  events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  if (instance.completed_at) {
    events.push({
      id: "completed",
      type: "completed",
      title: "Workflow Completed",
      timestamp: instance.completed_at,
      icon: CheckCircleIcon,
      color: "bg-green-500",
    });
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {events.map((event, eventIdx) => {
          const IconComponent = event.icon;
          return (
            <li key={event.id}>
              <div className="relative pb-8">
                {eventIdx !== events.length - 1 ? (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span
                      className={`${event.color} h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white`}
                    >
                      <IconComponent
                        className="h-4 w-4 text-white"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-sm text-gray-900">{event.title}</p>
                      {event.user && (
                        <p className="text-xs text-gray-500">by {event.user}</p>
                      )}
                    </div>
                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const WorkflowInstanceDetail = () => {
  const { t } = useTranslation();
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [showActions, setShowActions] = useState(false);

  // Fetch workflow instance details
  const {
    data: instance,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ["workflow-instance", instanceId],
    () => workflowService.getWorkflowInstance(instanceId),
    {
      refetchInterval: (data) => {
        // Auto-refresh every 30 seconds if instance is running
        return data?.instance?.status === "running" ? 30000 : false;
      },
    }
  );

  // Fetch related tasks
  const { data: tasksData } = useQuery(
    ["instance-tasks", instanceId],
    () => taskService.getTasks({ workflow_instance_id: instanceId }),
    {
      enabled: !!instanceId,
      refetchInterval: instance?.instance?.status === "running" ? 30000 : false,
    }
  );

  // Instance action mutations
  const pauseMutation = useMutation(
    () => workflowService.pauseWorkflowInstance(instanceId),
    {
      onSuccess: () => {
        toast.success("Workflow instance paused successfully");
        refetch();
      },
      onError: (error) => toast.error(error.message),
    }
  );

  const resumeMutation = useMutation(
    () => workflowService.resumeWorkflowInstance(instanceId),
    {
      onSuccess: () => {
        toast.success("Workflow instance resumed successfully");
        refetch();
      },
      onError: (error) => toast.error(error.message),
    }
  );

  const cancelMutation = useMutation(
    () => workflowService.cancelWorkflowInstance(instanceId),
    {
      onSuccess: () => {
        toast.success("Workflow instance cancelled successfully");
        refetch();
      },
      onError: (error) => toast.error(error.message),
    }
  );

  const cloneMutation = useMutation(
    () => workflowExecutionService.cloneWorkflowInstance(instanceId),
    {
      onSuccess: (response) => {
        toast.success("Workflow instance cloned successfully");
        navigate(`/workflows/instances/${response.instance_id}`);
      },
      onError: (error) => toast.error(error.message),
    }
  );

  const handleAction = (action) => {
    switch (action) {
      case "pause":
        pauseMutation.mutate();
        break;
      case "resume":
        resumeMutation.mutate();
        break;
      case "cancel":
        if (
          window.confirm(
            "Are you sure you want to cancel this workflow instance?"
          )
        ) {
          cancelMutation.mutate();
        }
        break;
      case "clone":
        cloneMutation.mutate();
        break;
      default:
        break;
    }
    setShowActions(false);
  };

  const getDuration = () => {
    if (!instance?.instance?.started_at) return "Not started";

    const start = new Date(instance.instance.started_at);
    const end = instance.instance.completed_at
      ? new Date(instance.instance.completed_at)
      : new Date();
    const diffMs = end - start;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getProgress = () => {
    if (!instance?.instance?.total_steps) return 0;
    return Math.round(
      (instance.instance.completed_steps / instance.instance.total_steps) * 100
    );
  };

  if (isLoading) {
    return (
      <LoadingSpinner fullScreen text="Loading workflow instance details..." />
    );
  }

  if (error || !instance?.instance) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-lg font-medium text-gray-900">
          Instance Not Found
        </h2>
        <p className="mt-2 text-gray-600">
          The requested workflow instance could not be found or you don't have
          permission to access it.
        </p>
        <button
          onClick={() => navigate("/workflows/instances")}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Instances
        </button>
      </div>
    );
  }

  const instanceData = instance.instance;
  const tasks = tasksData?.tasks || [];

  const tabs = [
    { id: "overview", name: "Overview", icon: InformationCircleIcon },
    {
      id: "tasks",
      name: "Tasks",
      icon: ClipboardDocumentListIcon,
      count: tasks.length,
    },
    { id: "timeline", name: "Timeline", icon: ClockIcon },
    { id: "data", name: "Data", icon: DocumentDuplicateIcon },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/workflows/instances")}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Instances
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={refetch}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>

          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <CogIcon className="h-4 w-4 mr-2" />
              Actions
            </button>

            {showActions && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActions(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                  <div className="py-1">
                    {instanceData.status === "running" && (
                      <button
                        onClick={() => handleAction("pause")}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <PauseIcon className="mr-3 h-4 w-4" />
                        Pause Instance
                      </button>
                    )}

                    {instanceData.status === "paused" && (
                      <button
                        onClick={() => handleAction("resume")}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <PlayIcon className="mr-3 h-4 w-4" />
                        Resume Instance
                      </button>
                    )}

                    {["running", "paused", "pending"].includes(
                      instanceData.status
                    ) && (
                      <button
                        onClick={() => handleAction("cancel")}
                        className="flex w-full items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        <StopIcon className="mr-3 h-4 w-4" />
                        Cancel Instance
                      </button>
                    )}

                    <button
                      onClick={() => handleAction("clone")}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <DocumentDuplicateIcon className="mr-3 h-4 w-4" />
                      Clone Instance
                    </button>

                    <Link
                      to={`/workflows/designer/${instanceData.workflow_id}`}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <EyeIcon className="mr-3 h-4 w-4" />
                      View Workflow
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Instance Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {instanceData.title || `Instance ${instanceData.id}`}
              </h1>
              <StatusBadge status={instanceData.status} size="lg" />
              {instanceData.priority && (
                <PriorityBadge priority={instanceData.priority} />
              )}
            </div>

            <h2 className="text-lg text-gray-600 mb-4">
              {instanceData.workflow_name}
            </h2>

            {instanceData.description && (
              <p className="text-gray-700 mb-4">{instanceData.description}</p>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-900">
                    Duration
                  </span>
                </div>
                <p className="text-xl font-semibold text-blue-900 mt-1">
                  {getDuration()}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ChartBarIcon className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-900">
                    Progress
                  </span>
                </div>
                <p className="text-xl font-semibold text-green-900 mt-1">
                  {getProgress()}%
                </p>
                {instanceData.total_steps > 0 && (
                  <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${getProgress()}%` }}
                    ></div>
                  </div>
                )}
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="text-sm font-medium text-purple-900">
                    Tasks
                  </span>
                </div>
                <p className="text-xl font-semibold text-purple-900 mt-1">
                  {instanceData.completed_steps}/{instanceData.total_steps}
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-900">
                    Started By
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {instanceData.started_by_name || "System"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <IconComponent className="h-5 w-5 mr-2" />
                {tab.name}
                {tab.count !== undefined && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-900">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {activeTab === "overview" && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Instance Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Instance Details
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Instance ID
                    </dt>
                    <dd className="text-sm text-gray-900 font-mono">
                      {instanceData.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Workflow
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {instanceData.workflow_name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Created
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(instanceData.created_at).toLocaleString()}
                    </dd>
                  </div>
                  {instanceData.started_at && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Started
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(instanceData.started_at).toLocaleString()}
                      </dd>
                    </div>
                  )}
                  {instanceData.completed_at && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Completed
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(instanceData.completed_at).toLocaleString()}
                      </dd>
                    </div>
                  )}
                  {instanceData.due_date && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Due Date
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(instanceData.due_date).toLocaleString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Current Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Current Status
                </h3>
                {instanceData.current_step ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900">
                      Current Step: {instanceData.current_step.name}
                    </h4>
                    {instanceData.current_step.description && (
                      <p className="text-sm text-blue-700 mt-1">
                        {instanceData.current_step.description}
                      </p>
                    )}
                    {instanceData.current_step.assigned_to && (
                      <div className="flex items-center mt-2 text-sm text-blue-700">
                        <UserIcon className="h-4 w-4 mr-1" />
                        Assigned to:{" "}
                        {instanceData.current_step.assigned_to_name}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-600">No active step</p>
                  </div>
                )}

                {instanceData.error && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
                      <div>
                        <h4 className="font-medium text-red-900">Error</h4>
                        <p className="text-sm text-red-700 mt-1">
                          {instanceData.error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Tasks ({tasks.length})
              </h3>
              <Link
                to={`/tasks?workflow_instance_id=${instanceId}`}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                View all tasks →
              </Link>
            </div>

            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskItem key={task.id} task={task} onTaskUpdate={refetch} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No tasks found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  No tasks have been created for this workflow instance yet.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">
              Execution Timeline
            </h3>
            <ExecutionTimeline instance={instanceData} tasks={tasks} />
          </div>
        )}

        {activeTab === "data" && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Instance Data
              </h3>

              {/* Input Data */}
              {instanceData.input_data && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Input Data
                  </h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(instanceData.input_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Current Data */}
              {instanceData.current_data && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Current Data
                  </h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(instanceData.current_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Output Data */}
              {instanceData.output_data && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Output Data
                  </h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(instanceData.output_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Variables */}
              {instanceData.variables &&
                Object.keys(instanceData.variables).length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Variables
                    </h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 gap-3">
                        {Object.entries(instanceData.variables).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="flex items-start justify-between border-b border-gray-200 pb-2"
                            >
                              <span className="text-sm font-medium text-gray-900">
                                {key}:
                              </span>
                              <span className="text-sm text-gray-700 ml-4 break-all">
                                {typeof value === "object"
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Metadata */}
              {instanceData.metadata &&
                Object.keys(instanceData.metadata).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Metadata
                    </h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(instanceData.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

              {/* No Data State */}
              {!instanceData.input_data &&
                !instanceData.current_data &&
                !instanceData.output_data &&
                (!instanceData.variables ||
                  Object.keys(instanceData.variables).length === 0) &&
                (!instanceData.metadata ||
                  Object.keys(instanceData.metadata).length === 0) && (
                  <div className="text-center py-8">
                    <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      No data available
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      This workflow instance doesn't have any associated data
                      yet.
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ChatBubbleLeftIcon className="h-5 w-5 mr-2" />
            Comments & Notes
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {/* Add Comment Form */}
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Add a comment or note about this workflow instance..."
                />
                <div className="mt-2 flex justify-end">
                  <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                    Add Comment
                  </button>
                </div>
              </div>
            </div>

            {/* Sample Comments */}
            <div className="space-y-4">
              <div className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">JD</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        John Doe
                      </h4>
                      <span className="text-xs text-gray-500">2 hours ago</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Started the approval process. Waiting for manager review.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">AS</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        Alice Smith
                      </h4>
                      <span className="text-xs text-gray-500">1 hour ago</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Approved the request. Moving to next step.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Related Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to={`/workflows/${instanceData.workflow_id}/instances`}
            className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <ClipboardDocumentListIcon className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                View All Instances
              </h4>
              <p className="text-xs text-gray-500">
                See other instances of this workflow
              </p>
            </div>
          </Link>

          <Link
            to={`/workflows/designer/${instanceData.workflow_id}`}
            className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <CogIcon className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Edit Workflow
              </h4>
              <p className="text-xs text-gray-500">
                Modify the workflow definition
              </p>
            </div>
          </Link>

          <Link
            to={`/workflows/${instanceData.workflow_id}/start`}
            className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <PlayIcon className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Start New Instance
              </h4>
              <p className="text-xs text-gray-500">
                Create another instance of this workflow
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WorkflowInstanceDetail;
