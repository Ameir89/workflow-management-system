// src/components/Scripts/ScriptTemplates.js
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { scriptsService } from "../../services/scriptsService";
import {
  BookOpenIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  CodeBracketIcon,
  TagIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

const ScriptTemplates = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [filters, setFilters] = useState({
    language: "",
    category: "",
    search: "",
  });

  // Fetch templates
  const {
    data: templatesData,
    isLoading,
    error,
  } = useQuery(
    ["script-templates", filters],
    () => scriptsService.getScriptTemplates({ ...filters }),
    { keepPreviousData: true }
  );

  // Fetch categories
  const { data: categories } = useQuery(
    ["script-categories"],
    scriptsService.getScriptCategories
  );

  // Create template mutation
  const createTemplateMutation = useMutation(
    (templateData) => scriptsService.createScriptTemplate(templateData),
    {
      onSuccess: () => {
        toast.success("Template created successfully");
        queryClient.invalidateQueries(["script-templates"]);
        setShowCreateModal(false);
        setSelectedTemplate(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Update template mutation
  const updateTemplateMutation = useMutation(
    ({ id, data }) => scriptsService.updateScriptTemplate(id, data),
    {
      onSuccess: () => {
        toast.success("Template updated successfully");
        queryClient.invalidateQueries(["script-templates"]);
        setShowCreateModal(false);
        setSelectedTemplate(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Delete template mutation
  const deleteTemplateMutation = useMutation(
    (id) => scriptsService.deleteScriptTemplate(id),
    {
      onSuccess: () => {
        toast.success("Template deleted successfully");
        queryClient.invalidateQueries(["script-templates"]);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const getLanguageColor = (language) => {
    const colors = {
      javascript: "bg-yellow-100 text-yellow-800",
      python: "bg-blue-100 text-blue-800",
      sql: "bg-green-100 text-green-800",
      shell: "bg-gray-100 text-gray-800",
    };
    return colors[language] || "bg-gray-100 text-gray-800";
  };

  const getCategoryColor = (category) => {
    const colors = {
      condition: "bg-purple-100 text-purple-800",
      validation: "bg-indigo-100 text-indigo-800",
      transformation: "bg-green-100 text-green-800",
      utility: "bg-orange-100 text-orange-800",
      integration: "bg-pink-100 text-pink-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const handleDeleteTemplate = (template) => {
    if (template.is_system) {
      toast.error("Cannot delete system templates");
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setShowCreateModal(true);
  };

  const handlePreviewTemplate = (template) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };

  const TemplateForm = ({ template, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      name: template?.name || "",
      description: template?.description || "",
      language: template?.language || "javascript",
      category: template?.category || "utility",
      content: template?.content || "",
      parameters: template?.parameters || [],
      tags: template?.tags?.join(", ") || "",
      is_public: template?.is_public !== false,
    });

    const handleSubmit = (e) => {
      e.preventDefault();

      const templateData = {
        ...formData,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
      };

      onSubmit(templateData);
    };

    const addParameter = () => {
      setFormData({
        ...formData,
        parameters: [
          ...formData.parameters,
          {
            name: "",
            type: "string",
            description: "",
            required: false,
            default_value: "",
          },
        ],
      });
    };

    const updateParameter = (index, field, value) => {
      const updatedParameters = [...formData.parameters];
      updatedParameters[index][field] = value;
      setFormData({ ...formData, parameters: updatedParameters });
    };

    const removeParameter = (index) => {
      const updatedParameters = formData.parameters.filter(
        (_, i) => i !== index
      );
      setFormData({ ...formData, parameters: updatedParameters });
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {template ? "Edit Template" : "Create New Template"}
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 max-h-[80vh] overflow-y-auto"
          >
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Data Validation Script"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language *
                </label>
                <select
                  value={formData.language}
                  onChange={(e) =>
                    setFormData({ ...formData, language: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="sql">SQL</option>
                  <option value="shell">Shell</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categories?.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="validation, utility, data-processing"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe what this template does..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Content *
              </label>
              <textarea
                required
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={15}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                placeholder="Write your template code here..."
              />
            </div>

            {/* Parameters */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">
                  Template Parameters
                </h4>
                <button
                  type="button"
                  onClick={addParameter}
                  className="inline-flex items-center px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                >
                  <TagIcon className="h-4 w-4 mr-1" />
                  Add Parameter
                </button>
              </div>

              {formData.parameters.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <TagIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm">No parameters defined</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.parameters.map((param, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Parameter Name
                        </label>
                        <input
                          type="text"
                          value={param.name}
                          onChange={(e) =>
                            updateParameter(index, "name", e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="param_name"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          value={param.type}
                          onChange={(e) =>
                            updateParameter(index, "type", e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="array">Array</option>
                          <option value="object">Object</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={param.description}
                          onChange={(e) =>
                            updateParameter(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Parameter description"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Default Value
                        </label>
                        <input
                          type="text"
                          value={param.default_value}
                          onChange={(e) =>
                            updateParameter(
                              index,
                              "default_value",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Default"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="flex items-center text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={param.required}
                            onChange={(e) =>
                              updateParameter(
                                index,
                                "required",
                                e.target.checked
                              )
                            }
                            className="mr-1 h-3 w-3 text-indigo-600 rounded"
                          />
                          Required
                        </label>
                      </div>
                      <div className="col-span-1">
                        <button
                          type="button"
                          onClick={() => removeParameter(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) =>
                  setFormData({ ...formData, is_public: e.target.checked })
                }
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Make this template public (available to all users)
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  createTemplateMutation.isLoading ||
                  updateTemplateMutation.isLoading
                }
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {createTemplateMutation.isLoading ||
                updateTemplateMutation.isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : template ? (
                  "Update Template"
                ) : (
                  "Create Template"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const TemplatePreviewModal = ({ template, onClose }) => {
    if (!template) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Template Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Language:</span>
                <span
                  className={`ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLanguageColor(
                    template.language
                  )}`}
                >
                  {template.language}
                </span>
              </div>
              <div>
                <span className="font-medium">Category:</span>
                <span
                  className={`ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getCategoryColor(
                    template.category
                  )}`}
                >
                  {template.category}
                </span>
              </div>
              <div className="col-span-2">
                <span className="font-medium">Description:</span>
                <p className="mt-1 text-gray-600">{template.description}</p>
              </div>
            </div>

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <div>
                <span className="font-medium text-sm">Tags:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {template.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Parameters */}
            {template.parameters && template.parameters.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Parameters</h4>
                <div className="space-y-2">
                  {template.parameters.map((param, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg text-sm"
                    >
                      <div>
                        <span className="font-medium">{param.name}</span>
                        {param.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </div>
                      <div className="text-gray-600">{param.type}</div>
                      <div className="text-gray-600">
                        {param.default_value || "-"}
                      </div>
                      <div className="text-gray-600">{param.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Template Content */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Template Content
              </h4>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm max-h-96 font-mono">
                {template.content}
              </pre>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <BookOpenIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Error Loading Templates
        </h3>
        <p className="mt-1 text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Script Templates
          </h2>
          <p className="text-sm text-gray-600">
            Manage reusable script templates for common workflows
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Template
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filters.language}
            onChange={(e) =>
              setFilters({ ...filters, language: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Languages</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="sql">SQL</option>
            <option value="shell">Shell</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) =>
              setFilters({ ...filters, category: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            {categories?.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templatesData?.templates?.map((template) => (
          <div
            key={template.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {template.description || "No description provided"}
                  </p>
                </div>
                {template.is_system && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    System
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLanguageColor(
                    template.language
                  )}`}
                >
                  {template.language}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getCategoryColor(
                    template.category
                  )}`}
                >
                  {template.category}
                </span>
                {template.is_public && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                    Public
                  </span>
                )}
              </div>

              {template.tags && template.tags.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                        +{template.tags.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400 mb-4">
                Created by {template.created_by_name} on{" "}
                {new Date(template.created_at).toLocaleDateString()}
                {template.parameters && template.parameters.length > 0 && (
                  <span className="ml-2">
                    • {template.parameters.length} parameters
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePreviewTemplate(template)}
                    className="text-blue-400 hover:text-blue-600"
                    title="Preview template"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="text-indigo-400 hover:text-indigo-600"
                    title="Edit template"
                    disabled={template.is_system}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => {
                      // Create a copy of the template
                      const copy = {
                        ...template,
                        name: `${template.name} (Copy)`,
                        is_system: false,
                      };
                      setSelectedTemplate(copy);
                      setShowCreateModal(true);
                    }}
                    className="text-green-400 hover:text-green-600"
                    title="Duplicate template"
                  >
                    <DocumentDuplicateIcon className="h-5 w-5" />
                  </button>

                  {!template.is_system && (
                    <button
                      onClick={() => handleDeleteTemplate(template)}
                      className="text-red-400 hover:text-red-600"
                      title="Delete template"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handlePreviewTemplate(template)}
                  className="text-gray-400 hover:text-gray-600"
                  title="View details"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {templatesData?.templates?.length === 0 && (
        <div className="text-center py-12">
          <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No templates found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.search || filters.language || filters.category
              ? "No templates match your current filters."
              : "Get started by creating your first script template."}
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Your First Template
            </button>
          </div>
        </div>
      )}

      {/* Template Categories */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Template Categories
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories?.map((category) => {
            const categoryCount =
              templatesData?.templates?.filter(
                (t) => t.category === category.value
              ).length || 0;

            return (
              <div
                key={category.value}
                className="text-center p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 cursor-pointer transition-colors"
                onClick={() =>
                  setFilters({ ...filters, category: category.value })
                }
              >
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3 ${getCategoryColor(
                    category.value
                  )}`}
                >
                  <CodeBracketIcon className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-medium text-gray-900">
                  {category.label}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {categoryCount} templates
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <TemplateForm
          template={selectedTemplate}
          onSubmit={(data) => {
            if (selectedTemplate?.id) {
              updateTemplateMutation.mutate({ id: selectedTemplate.id, data });
            } else {
              createTemplateMutation.mutate(data);
            }
          }}
          onCancel={() => {
            setShowCreateModal(false);
            setSelectedTemplate(null);
          }}
        />
      )}

      {showPreviewModal && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
};

export default ScriptTemplates;
