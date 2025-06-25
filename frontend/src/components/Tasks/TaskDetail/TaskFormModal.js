import React from "react";
import { useTranslation } from "react-i18next";
import DynamicForm from "../../Forms/DynamicForm";

const TaskFormModal = ({ show, onClose, form, task, onSubmit, submitting }) => {
  const { t } = useTranslation();

  if (!show || !form) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {t("tasks.completeTask")} - {form.name}
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

        <DynamicForm
          schema={form.schema}
          onSubmit={onSubmit}
          onCancel={onClose}
          isSubmitting={submitting}
        />
      </div>
    </div>
  );
};

export default TaskFormModal;
