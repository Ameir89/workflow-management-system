import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import DynamicForm from "../../Forms/DynamicForm";
import {
  ClockIcon,
  ChatBubbleLeftRightIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

const TaskTabContent = ({
  activeTab,
  task,
  form,
  onFormSubmit,
  submitting,
}) => {
  const { t } = useTranslation();

  const renderDetailsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Task Details</h3>

        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Task ID</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono">{task.id}</dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">
              Workflow Instance
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              <Link
                to={`/workflows/instances/${task.workflow_instance_id}`}
                className="text-indigo-600 hover:text-indigo-800"
              >
                {task.workflow_instance_id}
              </Link>
            </dd>
          </div>

          {task.started_at && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Started At</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(task.started_at).toLocaleString()}
              </dd>
            </div>
          )}

          {task.completed_at && (
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Completed At
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(task.completed_at).toLocaleString()}
              </dd>
            </div>
          )}

          {task.tags && task.tags.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Tags</dt>
              <dd className="mt-1">
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      <TagIcon className="h-3 w-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {task.result && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Task Result
          </h4>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap">
              {typeof task.result === "object"
                ? JSON.stringify(task.result, null, 2)
                : task.result}
            </pre>
          </div>
        </div>
      )}
    </div>
  );

  const renderFormTab = () => {
    if (!form) {
      return (
        <div className="text-center py-8">
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Form not found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            The form associated with this task could not be loaded.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{form.name}</h3>
        </div>

        {form.description && (
          <p className="text-gray-600">{form.description}</p>
        )}

        <DynamicForm
          schema={form.schema}
          defaultValues={task.form_data || {}}
          readOnly={task.status === "completed"}
          onSubmit={task.status === "completed" ? undefined : onFormSubmit}
          isSubmitting={submitting}
        />
      </div>
    );
  };

  const renderHistoryTab = () => (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Task History</h3>
      <div className="space-y-4">
        {task.history && task.history.length > 0 ? (
          task.history.map((entry, index) => (
            <div key={index} className="border-l-4 border-gray-200 pl-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">
                  {entry.action}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
              </div>
              {entry.details && (
                <div className="text-sm text-gray-600 mt-1">
                  {entry.details}
                </div>
              )}
              {entry.user && (
                <div className="text-xs text-gray-500 mt-1">
                  by {entry.user}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No history available
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Task history will appear here as actions are performed.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderCommentsTab = () => (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Comments</h3>
      <div className="text-center py-8">
        <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No comments yet
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Comments and collaboration features coming soon.
        </p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "details":
        return renderDetailsTab();
      case "form":
        return renderFormTab();
      case "history":
        return renderHistoryTab();
      case "comments":
        return renderCommentsTab();
      default:
        return renderDetailsTab();
    }
  };

  return <div className="p-6">{renderContent()}</div>;
};

export default TaskTabContent;
