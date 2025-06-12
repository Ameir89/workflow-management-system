import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { useDropzone } from "react-dropzone";
import { toast } from "react-toastify";
import { filesService } from "../../services/filesService";
import {
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  ArchiveBoxIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";

const FileManager = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [selectedFiles, setSelectedFiles] = useState(new Set());

  const { data: filesData, isLoading } = useQuery(
    ["files", page, filters],
    () => filesService.getFiles({ page, limit: 24, ...filters }),
    { keepPreviousData: true }
  );

  const { data: fileStats } = useQuery("file-stats", () =>
    filesService.getFileStats()
  );

  const uploadFileMutation = useMutation(
    (fileData) => filesService.uploadFile(fileData.file, fileData.metadata),
    {
      onSuccess: () => {
        toast.success(t("files.uploadSuccess"));
        queryClient.invalidateQueries(["files"]);
        queryClient.invalidateQueries(["file-stats"]);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const deleteFileMutation = useMutation((id) => filesService.deleteFile(id), {
    onSuccess: () => {
      toast.success(t("files.deleteSuccess"));
      queryClient.invalidateQueries(["files"]);
      queryClient.invalidateQueries(["file-stats"]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onDrop = useCallback(
    (acceptedFiles) => {
      acceptedFiles.forEach((file) => {
        const metadata = {
          description: `Uploaded ${file.name}`,
          access_level: "private",
        };
        uploadFileMutation.mutate({ file, metadata });
      });
    },
    [uploadFileMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith("image/")) {
      return <PhotoIcon className="h-8 w-8 text-green-500" />;
    } else if (mimeType?.startsWith("video/")) {
      return <FilmIcon className="h-8 w-8 text-purple-500" />;
    } else if (mimeType?.includes("zip") || mimeType?.includes("archive")) {
      return <ArchiveBoxIcon className="h-8 w-8 text-yellow-500" />;
    } else {
      return <DocumentIcon className="h-8 w-8 text-blue-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDownload = (file) => {
    filesService.downloadFile(file.id, file.original_name);
  };

  const handleDelete = (file) => {
    if (
      window.confirm(t("files.confirmDelete", { name: file.original_name }))
    ) {
      deleteFileMutation.mutate(file.id);
    }
  };

  const toggleFileSelection = (fileId) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const AccessLevelBadge = ({ level }) => {
    const colors = {
      private: "bg-red-100 text-red-800",
      team: "bg-yellow-100 text-yellow-800",
      public: "bg-green-100 text-green-800",
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[level]}`}
      >
        {t(`files.access.${level}`)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("files.title")}
          </h1>
          <p className="text-gray-600">{t("files.subtitle")}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {viewMode === "grid" ? t("files.listView") : t("files.gridView")}
          </button>
        </div>
      </div>

      {/* Statistics */}
      {fileStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <FolderIcon className="h-8 w-8 text-indigo-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  {t("files.totalFiles")}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {fileStats.user_stats.total_files}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <ArchiveBoxIcon className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  {t("files.totalSize")}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatFileSize(fileStats.user_stats.total_size)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <DocumentIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  {t("files.recentFiles")}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {fileStats.user_stats.recent_files}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-indigo-500 bg-indigo-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? t("files.dropFiles") : t("files.dragDropFiles")}
        </p>
        <p className="text-xs text-gray-500">{t("files.maxFileSize")}</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("files.fileType")}
            </label>
            <select
              value={filters.mime_type || ""}
              onChange={(e) =>
                setFilters({ ...filters, mime_type: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("common.all")}</option>
              <option value="image">{t("files.types.images")}</option>
              <option value="application">{t("files.types.documents")}</option>
              <option value="video">{t("files.types.videos")}</option>
              <option value="audio">{t("files.types.audio")}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("files.accessLevel")}
            </label>
            <select
              value={filters.access_level || ""}
              onChange={(e) =>
                setFilters({ ...filters, access_level: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("common.all")}</option>
              <option value="private">{t("files.access.private")}</option>
              <option value="team">{t("files.access.team")}</option>
              <option value="public">{t("files.access.public")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Files Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filesData?.files?.map((file) => (
            <div
              key={file.id}
              className={`bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow ${
                selectedFiles.has(file.id) ? "ring-2 ring-indigo-500" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleFileSelection(file.id)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <AccessLevelBadge level={file.access_level} />
              </div>

              <div className="text-center mb-3">
                {getFileIcon(file.mime_type)}
                <p className="mt-2 text-sm font-medium text-gray-900 truncate">
                  {file.original_name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.file_size)}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {new Date(file.uploaded_at).toLocaleDateString()}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title={t("files.download")}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-1 text-red-400 hover:text-red-600"
                    title={t("common.delete")}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filesData?.files?.map((file) => (
              <li key={file.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => toggleFileSelection(file.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    {getFileIcon(file.mime_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.original_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.file_size)} •{" "}
                        {file.uploaded_by_name} •{" "}
                        {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <AccessLevelBadge level={file.access_level} />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDownload(file)}
                        className="text-gray-400 hover:text-gray-600"
                        title={t("files.download")}
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(file)}
                        className="text-red-400 hover:text-red-600"
                        title={t("common.delete")}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty State */}
      {filesData?.files?.length === 0 && (
        <div className="text-center py-12">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {t("files.noFiles")}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t("files.noFilesDescription")}
          </p>
        </div>
      )}
    </div>
  );
};

export default FileManager;
