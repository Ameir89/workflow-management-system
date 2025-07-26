// src/components/Workflows/WorkflowInstanceDetail/components/TimelineTab.js - Enhanced Version
import React from "react";
import { useTranslation } from "react-i18next";
import {
  PlusIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  UserIcon,
  ChatBubbleLeftEllipsisIcon,
} from "@heroicons/react/24/outline";

const ExecutionTimeline = ({ instance, tasks = [] }) => {
  const { t } = useTranslation();

  const generateTimelineEvents = () => {
    const events = [];

    // 1. Instance Created
    events.push({
      id: "created",
      type: "created",
      title: t("workflows.workflowInstanceCreated"),
      timestamp: instance.created_at,
      user: instance.created_by_name,
      icon: PlusIcon,
      color: "bg-blue-500",
      description: instance.title || `Instance ${instance.id}`,
    });

    // 2. Instance Started
    if (instance.started_at) {
      events.push({
        id: "started",
        type: "started",
        title: t("workflows.executionStarted"),
        timestamp: instance.started_at,
        user: instance.started_by_name,
        icon: PlayIcon,
        color: "bg-green-500",
      });
    }

    // 3. Task Events with detailed approval information
    tasks.forEach((task, index) => {
      // Task creation/assignment
      if (task.created_at) {
        events.push({
          id: `task-created-${task.id}`,
          type: "task_created",
          title: t("workflows.taskEvent", {
            name: task.name || `Task ${task.id}`,
          }),
          timestamp: task.created_at,
          user: task.assigned_to_name || task.created_by_name,
          icon: task.type === "approval" ? UserIcon : ClockIcon,
          color: "bg-yellow-500",
          description:
            task.description ||
            (task.type === "approval" ? "Approval required" : "Task assigned"),
          taskType: task.type,
        });
      }

      // Task completion with approval status
      if (task.completed_at) {
        let eventConfig = {
          id: `task-completed-${task.id}`,
          type: "task_completed",
          title: t("workflows.taskEvent", {
            name: task.name || `Task ${task.id}`,
          }),
          timestamp: task.completed_at,
          user: task.completed_by_name || task.assigned_to_name,
          taskType: task.type,
        };

        // Handle approval tasks specifically
        if (task.type === "approval") {
          const approvalData = task.result || task.workflow_data || {};
          const decision =
            approvalData.decision || approvalData.approval_decision;
          const comment = approvalData.comment || approvalData.comments;

          if (decision === "approve" || decision === "approved") {
            eventConfig = {
              ...eventConfig,
              title: `${task.name || "Approval Task"} - Approved`,
              icon: CheckCircleIcon,
              color: "bg-green-500",
              description: "Approval granted",
              comment: comment,
              decision: "approved",
            };
          } else if (decision === "reject" || decision === "rejected") {
            eventConfig = {
              ...eventConfig,
              title: `${task.name || "Approval Task"} - Rejected`,
              icon: XCircleIcon,
              color: "bg-red-500",
              description: "Approval rejected",
              comment: comment,
              decision: "rejected",
            };
          } else if (decision === "return_for_changes") {
            eventConfig = {
              ...eventConfig,
              title: `${task.name || "Approval Task"} - Returned for Changes`,
              icon: ArrowPathIcon,
              color: "bg-orange-500",
              description: "Returned for modifications",
              comment: comment,
              decision: "returned",
            };
          } else {
            eventConfig = {
              ...eventConfig,
              title: `${task.name || "Task"} - Completed`,
              icon: CheckCircleIcon,
              color: "bg-green-500",
              description: "Task completed",
              comment: comment,
            };
          }
        } else {
          // Regular task completion
          eventConfig = {
            ...eventConfig,
            title: `${task.name || "Task"} - Completed`,
            icon: CheckCircleIcon,
            color: "bg-green-500",
            description: "Task completed successfully",
            comment: task.result?.comments || task.result?.comment,
          };
        }

        events.push(eventConfig);
      }

      // Task failures
      if (task.status === "failed") {
        events.push({
          id: `task-failed-${task.id}`,
          type: "task_failed",
          title: `${task.name || "Task"} - Failed`,
          timestamp: task.updated_at || task.created_at,
          user: task.assigned_to_name,
          icon: ExclamationTriangleIcon,
          color: "bg-red-500",
          description: "Task execution failed",
          comment: task.error_message || "Task failed to complete",
        });
      }
    });

    // 4. Overall approval status from instance data
    if (instance.data?.approval_decision) {
      const approvalTimestamp =
        instance.data.approved_at ||
        instance.data.rejected_at ||
        instance.updated_at;

      if (instance.data.approval_decision === "approve") {
        events.push({
          id: "instance-approved",
          type: "instance_approved",
          title: "Workflow Instance Approved",
          timestamp: approvalTimestamp,
          user: instance.data.approved_by_name,
          icon: CheckCircleIcon,
          color: "bg-green-600",
          description: "Final approval granted for workflow instance",
          comment: instance.data.comments,
        });
      } else if (instance.data.approval_decision === "reject") {
        events.push({
          id: "instance-rejected",
          type: "instance_rejected",
          title: "Workflow Instance Rejected",
          timestamp: approvalTimestamp,
          user: instance.data.rejected_by_name,
          icon: XCircleIcon,
          color: "bg-red-600",
          description: "Workflow instance rejected",
          comment: instance.data.rejection_reason || instance.data.comments,
        });
      }
    }

    // 5. Instance Completion
    if (instance.completed_at) {
      const isSuccessful = instance.status === "completed";
      events.push({
        id: "completed",
        type: "completed",
        title: isSuccessful
          ? t("workflows.workflowCompleted")
          : "Workflow Ended",
        timestamp: instance.completed_at,
        icon: isSuccessful ? CheckCircleIcon : XCircleIcon,
        color: isSuccessful ? "bg-green-600" : "bg-red-600",
        description: isSuccessful
          ? "Workflow completed successfully"
          : "Workflow ended",
      });
    }

    // 6. Instance Cancellation
    if (instance.status === "cancelled") {
      events.push({
        id: "cancelled",
        type: "cancelled",
        title: "Workflow Cancelled",
        timestamp: instance.updated_at,
        icon: XCircleIcon,
        color: "bg-gray-500",
        description: "Workflow execution was cancelled",
      });
    }

    return events
      .filter((event) => event.timestamp)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const events = generateTimelineEvents();

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return timestamp;
    }
  };

  const getEventPriority = (event) => {
    // Higher numbers = higher priority for visual emphasis
    const priorities = {
      instance_approved: 10,
      instance_rejected: 10,
      task_completed: 8,
      task_failed: 9,
      started: 7,
      created: 5,
      completed: 10,
      cancelled: 8,
    };
    return priorities[event.type] || 5;
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {events.map((event, eventIdx) => {
          const IconComponent = event.icon;
          const priority = getEventPriority(event);
          const isHighPriority = priority >= 8;

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
                      className={`${
                        event.color
                      } h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                        isHighPriority ? "ring-4" : ""
                      }`}
                    >
                      <IconComponent
                        className="h-4 w-4 text-white"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5">
                    <div className="flex justify-between space-x-4">
                      <div className="flex-1">
                        <h4
                          className={`text-sm font-medium text-gray-900 ${
                            isHighPriority ? "font-semibold" : ""
                          }`}
                        >
                          {event.title}
                        </h4>

                        {event.description && (
                          <p className="mt-1 text-sm text-gray-600">
                            {event.description}
                          </p>
                        )}

                        {event.comment && (
                          <div className="mt-2 flex items-start space-x-2">
                            <ChatBubbleLeftEllipsisIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-gray-700 italic bg-gray-50 rounded px-2 py-1">
                              "{event.comment}"
                            </p>
                          </div>
                        )}

                        {event.user && (
                          <p className="mt-1 text-xs text-gray-500 flex items-center">
                            <UserIcon className="h-3 w-3 mr-1" />
                            {t("workflows.byUser", { user: event.user })}
                          </p>
                        )}
                      </div>

                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                        {formatTimestamp(event.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {events.length === 0 && (
        <div className="text-center py-8">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No timeline events
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Timeline events will appear here as the workflow progresses.
          </p>
        </div>
      )}
    </div>
  );
};

const TimelineTab = ({ instance, tasks }) => {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">
          {t("workflows.executionTimeline")}
        </h3>

        {/* Legend for approval status colors */}
        <div className="flex items-center space-x-4 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Approved</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Rejected</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>Returned</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Pending</span>
          </div>
        </div>
      </div>

      <ExecutionTimeline instance={instance} tasks={tasks} />
    </div>
  );
};

export default TimelineTab;
