// src/components/Workflows/WorkflowInstanceDetail/components/TimelineTab.js
import React from "react";
import { useTranslation } from "react-i18next";
import {
  PlusIcon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const ExecutionTimeline = ({ instance, tasks = [] }) => {
  const { t } = useTranslation();

  const events = [
    {
      id: 1,
      type: "created",
      title: t("workflows.workflowInstanceCreated"),
      timestamp: instance.created_at,
      user: instance.created_by_name,
      icon: PlusIcon,
      color: "bg-blue-500",
    },
    {
      id: 2,
      type: "started",
      title: t("workflows.executionStarted"),
      timestamp: instance.started_at,
      user: instance.started_by_name,
      icon: PlayIcon,
      color: "bg-green-500",
    },

    ...tasks.map((task, index) => ({
      id: `task-${task.id}`,
      type: "task",
      title: t("workflows.taskEvent", { name: task.name }),
      timestamp: task.completed_at || task.created_at || task.completed_at,
      comment: task.result?.comments || "",
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
      title: t("workflows.workflowCompleted"),
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

                      {event.comment && (
                        <p className="mt-1 text-xs text-gray-700">
                          {event.comment}
                        </p>
                      )}
                      {event.user && (
                        <p className="text-xs text-gray-500">
                          {t("workflows.byUser", { user: event.user })}
                        </p>
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

const TimelineTab = ({ instance, tasks }) => {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">
        {t("workflows.executionTimeline")}
      </h3>
      <ExecutionTimeline instance={instance} tasks={tasks} />
    </div>
  );
};

export default TimelineTab;
