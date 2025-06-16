import React, { useState, useEffect, useMemo, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import { toast } from "react-toastify";
import FileUpload from "../Common/FileUpload";
import DatePicker from "../Common/DatePicker";
import "./DynamicForm.css";

const DynamicForm = ({
  schema,
  defaultValues = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  readOnly = false,
}) => {
  const { t } = useTranslation();
  const [formSchema, setFormSchema] = useState(null);

  // Use refs to track previous values and prevent unnecessary re-renders
  const prevSchemaRef = useRef();
  const prevDefaultValuesRef = useRef();
  const hasInitializedRef = useRef(false);

  // Memoize the parsed schema to prevent unnecessary re-parsing
  const parsedSchema = useMemo(() => {
    if (!schema) return null;
    return typeof schema === "string" ? JSON.parse(schema) : schema;
  }, [schema]);

  // Memoize defaultValues to prevent object recreation issues
  const memoizedDefaultValues = useMemo(() => {
    return defaultValues || {};
  }, [defaultValues]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm({
    defaultValues: memoizedDefaultValues,
  });

  // Handle schema updates
  useEffect(() => {
    if (parsedSchema && parsedSchema !== prevSchemaRef.current) {
      setFormSchema(parsedSchema);
      prevSchemaRef.current = parsedSchema;
    }
  }, [parsedSchema]);

  // Handle defaultValues updates (separate effect to avoid conflicts)
  useEffect(() => {
    // Only reset if defaultValues actually changed and we have a schema
    if (
      formSchema &&
      memoizedDefaultValues !== prevDefaultValuesRef.current &&
      Object.keys(memoizedDefaultValues).length > 0
    ) {
      reset(memoizedDefaultValues);
      prevDefaultValuesRef.current = memoizedDefaultValues;
      hasInitializedRef.current = true;
    }
  }, [memoizedDefaultValues, formSchema, reset]);

  // Initial setup effect (runs only once when component mounts)
  useEffect(() => {
    if (
      parsedSchema &&
      !hasInitializedRef.current &&
      Object.keys(memoizedDefaultValues).length > 0
    ) {
      reset(memoizedDefaultValues);
      hasInitializedRef.current = true;
    }
  }, [parsedSchema, memoizedDefaultValues, reset]);

  const renderField = (field) => {
    const {
      name,
      type,
      label,
      required,
      options,
      validation,
      placeholder,
      description,
    } = field;
    const fieldError = errors[name];

    const commonProps = {
      id: name,
      disabled: readOnly || isSubmitting,
      placeholder: placeholder || label,
      "aria-describedby": description ? `${name}-description` : undefined,
      "aria-invalid": fieldError ? "true" : "false",
    };

    const getValidationRules = () => {
      const rules = {};

      if (required) {
        rules.required = t("form.validation.required", { field: label });
      }

      if (validation) {
        if (validation.minLength) {
          rules.minLength = {
            value: validation.minLength,
            message: t("form.validation.minLength", {
              field: label,
              min: validation.minLength,
            }),
          };
        }
        if (validation.maxLength) {
          rules.maxLength = {
            value: validation.maxLength,
            message: t("form.validation.maxLength", {
              field: label,
              max: validation.maxLength,
            }),
          };
        }
        if (validation.pattern) {
          rules.pattern = {
            value: new RegExp(validation.pattern),
            message:
              validation.message ||
              t("form.validation.pattern", { field: label }),
          };
        }
        if (validation.min) {
          rules.min = {
            value: validation.min,
            message: t("form.validation.min", {
              field: label,
              min: validation.min,
            }),
          };
        }
        if (validation.max) {
          rules.max = {
            value: validation.max,
            message: t("form.validation.max", {
              field: label,
              max: validation.max,
            }),
          };
        }
      }

      return rules;
    };

    const renderFieldByType = () => {
      switch (type) {
        case "text":
        case "email":
        case "password":
          return (
            <input
              {...register(name, getValidationRules())}
              type={type}
              className={`form-input ${fieldError ? "error" : ""}`}
              {...commonProps}
            />
          );

        case "number":
          return (
            <input
              {...register(name, {
                ...getValidationRules(),
                valueAsNumber: true,
              })}
              type="number"
              className={`form-input ${fieldError ? "error" : ""}`}
              {...commonProps}
            />
          );

        case "textarea":
          return (
            <textarea
              {...register(name, getValidationRules())}
              className={`form-textarea ${fieldError ? "error" : ""}`}
              rows={field.rows || 4}
              {...commonProps}
            />
          );

        case "select":
          return (
            <Controller
              name={name}
              control={control}
              rules={getValidationRules()}
              render={({ field: controllerField }) => (
                <Select
                  {...controllerField}
                  options={options?.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  isDisabled={commonProps.disabled}
                  placeholder={commonProps.placeholder}
                  className={`react-select-container ${
                    fieldError ? "error" : ""
                  }`}
                  classNamePrefix="react-select"
                  isClearable
                />
              )}
            />
          );

        case "multiselect":
          return (
            <Controller
              name={name}
              control={control}
              rules={getValidationRules()}
              render={({ field: controllerField }) => (
                <Select
                  {...controllerField}
                  isMulti
                  options={options?.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  isDisabled={commonProps.disabled}
                  placeholder={commonProps.placeholder}
                  className={`react-select-container ${
                    fieldError ? "error" : ""
                  }`}
                  classNamePrefix="react-select"
                />
              )}
            />
          );

        case "radio":
          return (
            <div className="radio-group">
              {options?.map((option) => (
                <label key={option.value} className="radio-label">
                  <input
                    {...register(name, getValidationRules())}
                    type="radio"
                    value={option.value}
                    className="radio-input"
                    disabled={commonProps.disabled}
                  />
                  <span className="radio-text">{option.label}</span>
                </label>
              ))}
            </div>
          );

        case "checkbox":
          if (options && options.length > 1) {
            // Multiple checkboxes
            return (
              <div className="checkbox-group">
                {options.map((option) => (
                  <label key={option.value} className="checkbox-label">
                    <input
                      {...register(name, getValidationRules())}
                      type="checkbox"
                      value={option.value}
                      className="checkbox-input"
                      disabled={commonProps.disabled}
                    />
                    <span className="checkbox-text">{option.label}</span>
                  </label>
                ))}
              </div>
            );
          } else {
            // Single checkbox
            return (
              <label className="checkbox-label">
                <input
                  {...register(name, getValidationRules())}
                  type="checkbox"
                  className="checkbox-input"
                  disabled={commonProps.disabled}
                />
                <span className="checkbox-text">
                  {field.checkboxLabel || label}
                </span>
              </label>
            );
          }

        case "date":
          return (
            <Controller
              name={name}
              control={control}
              rules={getValidationRules()}
              render={({ field: controllerField }) => (
                <DatePicker
                  {...controllerField}
                  disabled={commonProps.disabled}
                  placeholder={commonProps.placeholder}
                  className={`form-input ${fieldError ? "error" : ""}`}
                />
              )}
            />
          );

        case "datetime":
          return (
            <Controller
              name={name}
              control={control}
              rules={getValidationRules()}
              render={({ field: controllerField }) => (
                <DatePicker
                  {...controllerField}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="yyyy-MM-dd HH:mm"
                  disabled={commonProps.disabled}
                  placeholder={commonProps.placeholder}
                  className={`form-input ${fieldError ? "error" : ""}`}
                />
              )}
            />
          );

        case "file":
          return (
            <Controller
              name={name}
              control={control}
              rules={getValidationRules()}
              render={({ field: controllerField }) => (
                <FileUpload
                  {...controllerField}
                  accept={field.accept}
                  multiple={field.multiple}
                  maxSize={field.maxSize}
                  disabled={commonProps.disabled}
                  onError={(error) => toast.error(error)}
                />
              )}
            />
          );

        default:
          return (
            <input
              {...register(name, getValidationRules())}
              type="text"
              className={`form-input ${fieldError ? "error" : ""}`}
              {...commonProps}
            />
          );
      }
    };

    return (
      <div key={name} className={`form-group ${field.className || ""}`}>
        <label htmlFor={name} className="form-label">
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>

        {description && (
          <p id={`${name}-description`} className="form-description">
            {description}
          </p>
        )}

        {renderFieldByType()}

        {fieldError && (
          <p className="form-error" role="alert">
            {fieldError.message}
          </p>
        )}
      </div>
    );
  };

  const onFormSubmit = (data) => {
    // Transform data if needed
    const processedData = { ...data };

    // Handle file fields
    formSchema?.fields?.forEach((field) => {
      if (field.type === "file" && processedData[field.name]) {
        // File handling would be done here
        // In this case, files are handled by FileUpload component
      }
    });

    onSubmit(processedData);
  };

  if (!formSchema) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="dynamic-form">
      {formSchema.title && (
        <div className="form-header">
          <h2 className="form-title">{formSchema.title}</h2>
          {formSchema.description && (
            <p className="form-description">{formSchema.description}</p>
          )}
        </div>
      )}

      <div className="form-fields">{formSchema.fields?.map(renderField)}</div>

      {!readOnly && (
        <div className="form-actions">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t("common.submitting")}
              </>
            ) : (
              t("common.submit")
            )}
          </button>
        </div>
      )}
    </form>
  );
};

export default DynamicForm;
