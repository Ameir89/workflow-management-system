import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { formsService } from "../../services/formsService";
import Pagination from "../Common/Pagination";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

const FormsList = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});

  const {
    data: formsData,
    isLoading,
    error,
  } = useQuery(
    ["forms", page, search, filters],
    () => formsService.getForms({ page, limit: 20, search, ...filters }),
    { keepPreviousData: true }
  );

  const deleteFormMutation = useMutation((id) => formsService.deleteForm(id), {
    onSuccess: () => {
      toast.success(t("forms.deleteSuccess"));
      queryClient.invalidateQueries(["forms"]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDeleteForm = (id, name) => {
    if (window.confirm(t("forms.confirmDelete", { name }))) {
      deleteFormMutation.mutate(id);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
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
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("forms.title")}
          </h1>
          <p className="text-gray-600">{t("forms.subtitle")}</p>
        </div>
        <Link
          to="/forms/create"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          {t("forms.createNew")}
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("common.search")}
            </label>
            <input
              type="text"
              placeholder={t("forms.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("common.status")}
            </label>
            <select
              value={filters.is_active || ""}
              onChange={(e) =>
                setFilters({ ...filters, is_active: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("common.all")}</option>
              <option value="true">{t("common.active")}</option>
              <option value="false">{t("common.inactive")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Forms List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {formsData?.forms?.map((form) => (
            <li key={form.id}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {form.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {form.description}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          form.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {form.is_active
                          ? t("common.active")
                          : t("common.inactive")}
                      </span>
                      <span className="text-sm text-gray-500">
                        v{form.version}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <span>
                      {t("forms.responses", {
                        count: form.response_count || 0,
                      })}
                    </span>
                    <span className="mx-2">•</span>
                    <span>
                      {t("common.createdBy")} {form.created_by_name}
                    </span>
                    <span className="mx-2">•</span>
                    <span>
                      {new Date(form.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    to={`/forms/${form.id}/responses`}
                    className="text-gray-400 hover:text-gray-500"
                    title={t("forms.viewResponses")}
                  >
                    <EyeIcon className="h-5 w-5" />
                  </Link>
                  <Link
                    to={`/forms/${form.id}/edit`}
                    className="text-indigo-400 hover:text-indigo-500"
                    title={t("common.edit")}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => handleDeleteForm(form.id, form.name)}
                    className="text-red-400 hover:text-red-500"
                    title={t("common.delete")}
                    disabled={deleteFormMutation.isLoading}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Replace custom pagination with common Pagination component */}
      {formsData?.pagination && (
        <Pagination
          pagination={formsData.pagination}
          currentPage={page}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default FormsList;
