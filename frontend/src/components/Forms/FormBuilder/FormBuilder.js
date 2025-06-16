import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "react-query";
import { useNavigate, useParams } from "react-router-dom";
import { PlusIcon, TableCellsIcon } from "@heroicons/react/24/outline";
import { formsService } from "../../../services/formsService";
import { toast } from "react-toastify";
import FieldEditor from "./FieldEditor";
// Enhanced Form Builder with Lookups Support
const EnhancedFormBuilder = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [fields, setFields] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [availableLookups, setAvailableLookups] = useState([
    {
      id: 1,
      name: "countries",
      displayName: "Countries",
      valueField: "code",
      displayField: "name",
      fields: [
        { name: "code", displayName: "Country Code" },
        { name: "name", displayName: "Country Name" },
        { name: "region", displayName: "Region" },
      ],
    },
    {
      id: 2,
      name: "departments",
      displayName: "Departments",
      valueField: "id",
      displayField: "name",
      fields: [
        { name: "id", displayName: "ID" },
        { name: "name", displayName: "Department Name" },
        { name: "manager", displayName: "Manager" },
      ],
    },
    {
      id: 3,
      name: "priorities",
      displayName: "Priority Levels",
      valueField: "level",
      displayField: "name",
      fields: [
        { name: "level", displayName: "Level" },
        { name: "name", displayName: "Priority Name" },
        { name: "color", displayName: "Color" },
      ],
    },
  ]);

  useQuery(["form", id], () => formsService.getForm(id), {
    enabled: !!id,
    onSuccess: (data) => {
      setFormName(data.name || "");
      setFormDescription(data.description || "");
      setFields(
        data.schema?.fields?.map((field) => ({
          ...field,
          id: field.id || Date.now(), // Ensure each field has a unique ID
          options: field.options || [{ value: "", label: "" }], // Default to empty option
          validation: field.validation || {
            minLength: "",
            maxLength: "",
            pattern: "",
            min: "",
            max: "",
          },
        })) || []
      );
    },
  });

  const fieldTypes = [
    { value: "text", label: "Text Input", hasLookup: false },
    { value: "email", label: "Email", hasLookup: false },
    { value: "number", label: "Number", hasLookup: false },
    { value: "textarea", label: "Text Area", hasLookup: false },
    { value: "select", label: "Select Dropdown", hasLookup: true },
    { value: "multiselect", label: "Multi-Select", hasLookup: true },
    { value: "radio", label: "Radio Buttons", hasLookup: true },
    { value: "checkbox", label: "Checkboxes", hasLookup: true },
    { value: "date", label: "Date Picker", hasLookup: false },
    { value: "datetime", label: "Date & Time", hasLookup: false },
    { value: "file", label: "File Upload", hasLookup: false },
  ];

  const addField = () => {
    const newField = {
      id: Date.now(),
      name: `field_${fields.length + 1}`,
      label: "New Field",
      type: "text",
      required: false,
      placeholder: "",
      description: "",
      // Lookup specific properties
      dataSource: "manual", // 'manual' or 'lookup'
      lookupTable: null,
      lookupConfig: {
        valueField: "",
        displayField: "",
        additionalFields: [],
      },
      options: [{ value: "", label: "" }], // For manual options
      validation: {
        minLength: "",
        maxLength: "",
        pattern: "",
        min: "",
        max: "",
      },
    };
    setFields([...fields, newField]);
  };

  // Create form mutation
  const createFormMutation = useMutation(
    (formData) => formsService.createForm(formData),
    {
      onSuccess: (data) => {
        toast.success("Form created successfully!");
        queryClient.invalidateQueries(["forms"]);
        navigate("/forms");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create form");
      },
    }
  );

  // Update form mutation
  const updateFormMutation = useMutation(
    (formData) => formsService.updateForm(id, formData),
    {
      onSuccess: (data) => {
        toast.success("Form updated successfully!");
        queryClient.invalidateQueries(["forms"]);
        queryClient.invalidateQueries(["form", id]);
        navigate("/forms");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update form");
      },
    }
  );

  // Field Editor Component

  // Validate form before saving
  const validateForm = () => {
    const errors = [];

    if (!formName.trim()) {
      errors.push("Form name is required");
    }

    if (fields.length === 0) {
      errors.push("At least one field is required");
    }

    fields.forEach((field, index) => {
      if (!field.name.trim()) {
        errors.push(`Field ${index + 1}: Field name is required`);
      }
      if (!field.label.trim()) {
        errors.push(`Field ${index + 1}: Field label is required`);
      }

      // Validate lookup configuration
      if (field.dataSource === "lookup") {
        if (!field.lookupTable) {
          errors.push(`Field ${index + 1}: Lookup table is required`);
        }
        if (!field.lookupConfig.valueField) {
          errors.push(`Field ${index + 1}: Value field is required for lookup`);
        }
        if (!field.lookupConfig.displayField) {
          errors.push(
            `Field ${index + 1}: Display field is required for lookup`
          );
        }
      }

      // Validate manual options
      if (
        field.dataSource === "manual" &&
        ["select", "multiselect", "radio", "checkbox"].includes(field.type)
      ) {
        const validOptions = field.options.filter(
          (opt) => opt.value.trim() && opt.label.trim()
        );
        if (validOptions.length === 0) {
          errors.push(
            `Field ${index + 1}: At least one valid option is required`
          );
        }
      }
    });

    return errors;
  };

  const handleSaveForm = async () => {
    const validationErrors = validateForm();

    if (validationErrors.length > 0) {
      toast.error(
        `Please fix the following errors:\n${validationErrors.join("\n")}`
      );
      return;
    }

    setIsSaving(true);

    try {
      // Prepare form data
      const formData = {
        name: formName.trim(),
        description: formDescription.trim(),
        schema: {
          title: formName.trim(),
          description: formDescription.trim(),
          fields: fields.map((field) => {
            // Clean up field data
            const cleanField = {
              name: field.name.trim(),
              label: field.label.trim(),
              type: field.type,
              required: field.required,
              placeholder: field.placeholder?.trim() || "",
              description: field.description?.trim() || "",
            };

            // Add validation if present
            if (
              field.validation &&
              Object.keys(field.validation).some((key) => field.validation[key])
            ) {
              cleanField.validation = Object.fromEntries(
                Object.entries(field.validation).filter(
                  ([_, value]) =>
                    value !== "" && value !== null && value !== undefined
                )
              );
            }

            // Handle options based on data source
            if (field.dataSource === "lookup" && field.lookupTable) {
              cleanField.dataSource = "lookup";
              cleanField.lookupTable = field.lookupTable;
              cleanField.lookupConfig = field.lookupConfig;
            } else if (
              field.dataSource === "manual" &&
              ["select", "multiselect", "radio", "checkbox"].includes(
                field.type
              )
            ) {
              const validOptions = field.options.filter(
                (opt) => opt.value.trim() && opt.label.trim()
              );
              if (validOptions.length > 0) {
                cleanField.options = validOptions;
              }
            }

            return cleanField;
          }),
        },
        is_active: true,
      };

      // Call appropriate mutation
      if (id) {
        await updateFormMutation.mutateAsync(formData);
      } else {
        await createFormMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error("Save form error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (fields.length > 0 || formName.trim() || formDescription.trim()) {
      if (
        window.confirm(
          "Are you sure you want to cancel? All unsaved changes will be lost."
        )
      ) {
        navigate("/forms");
      }
    } else {
      navigate("/forms");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Enhanced Form Builder
          </h1>
          <p className="text-gray-600 mt-2">
            Create dynamic forms with manual options or lookup table integration
          </p>
        </div>

        {/* Form Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Form Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Form Name *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter form name..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Form description..."
              />
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Form Fields</h2>
            <button
              onClick={addField}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Field
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <TableCellsIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No fields yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first form field
              </p>
              <button
                onClick={addField}
                className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add First Field
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {fields.map((field, index) => (
                <FieldEditor
                  key={field.name}
                  field={field}
                  index={index}
                  fields={fields}
                  setFields={setFields}
                  fieldTypes={fieldTypes}
                  availableLookups={availableLookups}
                />
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 mt-8">
          <button
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isSaving}
            onClick={() => handleCancel()}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            onClick={() => handleSaveForm()}
            disabled={isSaving}
          >
            Save Form
          </button>
        </div>

        {/* JSON Preview (for development) */}
        {fields.length > 0 && (
          <div className="mt-8 bg-gray-900 text-green-400 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-white mb-2">
              Form Schema Preview:
            </h3>
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(
                {
                  name: formName,
                  description: formDescription,
                  fields: fields,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedFormBuilder;
