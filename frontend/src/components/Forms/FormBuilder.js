import React, { useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQueryClient } from "react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { formsService } from "../../services/formsService";
import {
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";

const FormBuilder = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      fields: [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "fields",
  });

  const [previewMode, setPreviewMode] = useState(false);

  const createFormMutation = useMutation(
    (formData) =>
      isEditing
        ? formsService.updateForm(id, formData)
        : formsService.createForm(formData),
    {
      onSuccess: () => {
        toast.success(
          t(isEditing ? "forms.updateSuccess" : "forms.createSuccess")
        );
        queryClient.invalidateQueries(["forms"]);
        navigate("/forms");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const fieldTypes = [
    { value: "text", label: t("forms.fieldTypes.text") },
    { value: "email", label: t("forms.fieldTypes.email") },
    { value: "number", label: t("forms.fieldTypes.number") },
    { value: "textarea", label: t("forms.fieldTypes.textarea") },
    { value: "select", label: t("forms.fieldTypes.select") },
    { value: "multiselect", label: t("forms.fieldTypes.multiselect") },
    { value: "radio", label: t("forms.fieldTypes.radio") },
    { value: "checkbox", label: t("forms.fieldTypes.checkbox") },
    { value: "date", label: t("forms.fieldTypes.date") },
    { value: "datetime", label: t("forms.fieldTypes.datetime") },
    { value: "file", label: t("forms.fieldTypes.file") },
  ];

  const addField = () => {
    append({
      name: `field_${fields.length + 1}`,
      type: "text",
      label: t("forms.newField"),
      required: false,
      placeholder: "",
      description: "",
      options: [],
      validation: {},
    });
  };

  const addOption = (fieldIndex) => {
    const field = fields[fieldIndex];
    const updatedOptions = [...(field.options || []), { value: "", label: "" }];
    // Update the field with new options
    const updatedFields = [...fields];
    updatedFields[fieldIndex] = { ...field, options: updatedOptions };
  };

  const onSubmit = (data) => {
    const formData = {
      name: data.name,
      description: data.description,
      schema: {
        title: data.name,
        description: data.description,
        fields: data.fields,
      },
    };

    createFormMutation.mutate(formData);
  };

  const renderFieldEditor = (field, index) => {
    const fieldType = watch(`fields.${index}.type`);
    const needsOptions = [
      "select",
      "multiselect",
      "radio",
      "checkbox",
    ].includes(fieldType);

    return (
      <div
        key={field.id}
        className="border border-gray-200 rounded-lg p-4 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {t("forms.field")} {index + 1}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => move(index, Math.max(0, index - 1))}
              disabled={index === 0}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <ArrowUpIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                move(index, Math.min(fields.length - 1, index + 1))
              }
              disabled={index === fields.length - 1}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <ArrowDownIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => remove(index)}
              className="p-1 text-red-400 hover:text-red-600"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("forms.fieldName")}
            </label>
            <input
              {...register(`fields.${index}.name`, { required: true })}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("forms.fieldType")}
            </label>
            <select
              {...register(`fields.${index}.type`)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {fieldTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("forms.fieldLabel")}
            </label>
            <input
              {...register(`fields.${index}.label`, { required: true })}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("forms.placeholder")}
            </label>
            <input
              {...register(`fields.${index}.placeholder`)}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("forms.description")}
            </label>
            <textarea
              {...register(`fields.${index}.description`)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center">
            <input
              {...register(`fields.${index}.required`)}
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              {t("forms.required")}
            </label>
          </div>
        </div>

        {needsOptions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("forms.options")}
            </label>
            <div className="space-y-2">
              {field.options?.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center space-x-2">
                  <input
                    {...register(
                      `fields.${index}.options.${optionIndex}.value`
                    )}
                    type="text"
                    placeholder={t("forms.optionValue")}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    {...register(
                      `fields.${index}.options.${optionIndex}.label`
                    )}
                    type="text"
                    placeholder={t("forms.optionLabel")}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updatedOptions = field.options.filter(
                        (_, i) => i !== optionIndex
                      );
                      // Update the field options
                    }}
                    className="p-2 text-red-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOption(index)}
                className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400"
              >
                {t("forms.addOption")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? t("forms.editForm") : t("forms.createForm")}
          </h1>
          <p className="text-gray-600">{t("forms.builderSubtitle")}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {previewMode ? t("forms.editMode") : t("forms.previewMode")}
          </button>
          <button
            onClick={() => navigate("/forms")}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Form Details */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {t("forms.formDetails")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("forms.formName")} *
              </label>
              <input
                {...register("name", { required: t("forms.nameRequired") })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("forms.description")}
              </label>
              <textarea
                {...register("description")}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {t("forms.formFields")}
            </h2>
            <button
              type="button"
              onClick={addField}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {t("forms.addField")}
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => renderFieldEditor(field, index))}

            {fields.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">{t("forms.noFields")}</p>
                <button
                  type="button"
                  onClick={addField}
                  className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  {t("forms.addFirstField")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate("/forms")}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={createFormMutation.isLoading}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {createFormMutation.isLoading ? (
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

export default FormBuilder;
