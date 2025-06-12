import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { webhooksService } from "../../services/webhooksService";

const WebhookForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      url: "",
      events: [],
      headers: {},
      secret: "",
      retry_count: 3,
      timeout_seconds: 30,
      is_active: true,
    },
  });

  const [customHeaders, setCustomHeaders] = useState([{ key: "", value: "" }]);

  // Load existing webhook if editing
  const { data: existingWebhook } = useQuery(
    ["webhook", id],
    () => webhooksService.getWebhook(id),
    {
      enabled: !!id,
      onSuccess: (data) => {
        setValue("name", data.name);
        setValue("url", data.url);
        setValue("events", data.events);
        setValue("secret", data.secret || "");
        setValue("retry_count", data.retry_count);
        setValue("timeout_seconds", data.timeout_seconds);
        setValue("is_active", data.is_active);

        // Set custom headers
        const headers = Object.entries(data.headers || {}).map(
          ([key, value]) => ({ key, value })
        );
        setCustomHeaders(
          headers.length > 0 ? headers : [{ key: "", value: "" }]
        );
      },
    }
  );

  const saveWebhookMutation = useMutation(
    (webhookData) => {
      if (isEditing) {
        return webhooksService.updateWebhook(id, webhookData);
      } else {
        return webhooksService.createWebhook(webhookData);
      }
    },
    {
      onSuccess: () => {
        toast.success(
          t(isEditing ? "webhooks.updateSuccess" : "webhooks.createSuccess")
        );
        queryClient.invalidateQueries(["webhooks"]);
        navigate("/webhooks");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const availableEvents = [
    "workflow_started",
    "workflow_completed",
    "workflow_failed",
    "task_assigned",
    "task_completed",
    "task_failed",
    "sla_breach",
    "user_created",
    "form_submitted",
  ];

  const selectedEvents = watch("events") || [];

  const handleEventChange = (event, checked) => {
    const currentEvents = selectedEvents;
    if (checked) {
      setValue("events", [...currentEvents, event]);
    } else {
      setValue(
        "events",
        currentEvents.filter((e) => e !== event)
      );
    }
  };

  const addCustomHeader = () => {
    setCustomHeaders([...customHeaders, { key: "", value: "" }]);
  };

  const removeCustomHeader = (index) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  const updateCustomHeader = (index, field, value) => {
    const updated = [...customHeaders];
    updated[index][field] = value;
    setCustomHeaders(updated);
  };

  const onSubmit = (data) => {
    // Convert custom headers array to object
    const headers = {};
    customHeaders.forEach(({ key, value }) => {
      if (key && value) {
        headers[key] = value;
      }
    });

    const webhookData = {
      ...data,
      headers,
    };

    saveWebhookMutation.mutate(webhookData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing
              ? t("webhooks.editWebhook")
              : t("webhooks.createWebhook")}
          </h1>
          <p className="text-gray-600">{t("webhooks.formSubtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {t("webhooks.basicInfo")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("webhooks.name")} *
              </label>
              <input
                {...register("name", { required: t("webhooks.nameRequired") })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t("webhooks.namePlaceholder")}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("webhooks.url")} *
              </label>
              <input
                {...register("url", {
                  required: t("webhooks.urlRequired"),
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: t("webhooks.urlInvalid"),
                  },
                })}
                type="url"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://your-domain.com/webhook"
              />
              {errors.url && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.url.message}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center">
            <input
              {...register("is_active")}
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              {t("webhooks.active")}
            </label>
          </div>
        </div>

        {/* Events */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {t("webhooks.events")}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {t("webhooks.eventsDescription")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableEvents.map((event) => (
              <label key={event} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(event)}
                  onChange={(e) => handleEventChange(event, e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">{event}</span>
              </label>
            ))}
          </div>

          {errors.events && (
            <p className="mt-2 text-sm text-red-600">{errors.events.message}</p>
          )}
        </div>

        {/* Configuration */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {t("webhooks.configuration")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("webhooks.retryCount")}
              </label>
              <input
                {...register("retry_count", {
                  min: { value: 0, message: t("webhooks.retryCountMin") },
                  max: { value: 10, message: t("webhooks.retryCountMax") },
                })}
                type="number"
                min="0"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.retry_count && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.retry_count.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("webhooks.timeout")} ({t("common.seconds")})
              </label>
              <input
                {...register("timeout_seconds", {
                  min: { value: 1, message: t("webhooks.timeoutMin") },
                  max: { value: 300, message: t("webhooks.timeoutMax") },
                })}
                type="number"
                min="1"
                max="300"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.timeout_seconds && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.timeout_seconds.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("webhooks.secret")}
              </label>
              <input
                {...register("secret")}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t("webhooks.secretPlaceholder")}
              />
              <p className="mt-1 text-sm text-gray-500">
                {t("webhooks.secretDescription")}
              </p>
            </div>
          </div>
        </div>

        {/* Custom Headers */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {t("webhooks.customHeaders")}
          </h2>

          <div className="space-y-3">
            {customHeaders.map((header, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="text"
                  placeholder={t("webhooks.headerName")}
                  value={header.key}
                  onChange={(e) =>
                    updateCustomHeader(index, "key", e.target.value)
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  placeholder={t("webhooks.headerValue")}
                  value={header.value}
                  onChange={(e) =>
                    updateCustomHeader(index, "value", e.target.value)
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => removeCustomHeader(index)}
                  className="p-2 text-red-400 hover:text-red-600"
                >
                  <svg
                    className="h-5 w-5"
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
            ))}

            <button
              type="button"
              onClick={addCustomHeader}
              className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400"
            >
              {t("webhooks.addHeader")}
            </button>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate("/webhooks")}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={saveWebhookMutation.isLoading}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {saveWebhookMutation.isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t("common.saving")}
              </div>
            ) : isEditing ? (
              t("common.update")
            ) : (
              t("common.create")
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WebhookForm;
