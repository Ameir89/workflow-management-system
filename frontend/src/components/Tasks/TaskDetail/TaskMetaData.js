import { useTranslation } from "react-i18next";

const TaskMetadata = ({ task }) => {
  const { t } = useTranslation();

  const formatDuration = (startDate, endDate = null) => {
    if (!startDate) return "Not started";

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end - start;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="px-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex items-center space-x-3">
          <div>
            <div className="text-sm font-medium text-gray-900">
              {t("tasks.assignedTo")}
            </div>
            <div className="text-sm text-gray-600">
              {task.assigned_to_name || t("tasks.unassigned")}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div>
            <div className="text-sm font-medium text-gray-900">
              {t("tasks.duration")}
            </div>
            <div className="text-sm text-gray-600">
              {formatDuration(task.started_at, task.completed_at)}
            </div>
          </div>
        </div>

        {task.due_date && (
          <div className="flex items-center space-x-3">
            <div>
              <div className="text-sm font-medium text-gray-900">
                {t("tasks.dueDate")}
              </div>
              <div
                className={`text-sm ${
                  new Date(task.due_date) < new Date() &&
                  task.status !== "completed"
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {new Date(task.due_date).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        {task.form_id && (
          <div className="flex items-center space-x-3">
            <div>
              <div className="text-sm font-medium text-gray-900">
                {t("tasks.hasForm")}
              </div>
              <div className="text-sm text-gray-600">Form attached</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskMetadata;
