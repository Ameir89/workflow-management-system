import React, { useState, useCallback, forwardRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  CloudArrowUpIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const FileUpload = forwardRef(
  (
    {
      value = [],
      onChange,
      accept = null,
      multiple = false,
      maxSize = 10 * 1024 * 1024, // 10MB default
      disabled = false,
      onError = () => {},
      className = "",
      ...props
    },
    ref
  ) => {
    const [files, setFiles] = useState(value || []);

    const onDrop = useCallback(
      (acceptedFiles, rejectedFiles) => {
        // Handle rejected files
        if (rejectedFiles.length > 0) {
          rejectedFiles.forEach(({ file, errors }) => {
            errors.forEach((error) => {
              if (error.code === "file-too-large") {
                onError(
                  `File ${
                    file.name
                  } is too large. Maximum size is ${formatFileSize(maxSize)}.`
                );
              } else if (error.code === "file-invalid-type") {
                onError(`File ${file.name} has an invalid type.`);
              } else {
                onError(`Error uploading ${file.name}: ${error.message}`);
              }
            });
          });
        }

        // Handle accepted files
        if (acceptedFiles.length > 0) {
          const newFiles = acceptedFiles.map((file) => ({
            file,
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type: file.type,
            preview: file.type.startsWith("image/")
              ? URL.createObjectURL(file)
              : null,
          }));

          const updatedFiles = multiple ? [...files, ...newFiles] : newFiles;
          setFiles(updatedFiles);
          onChange(updatedFiles);
        }
      },
      [files, multiple, maxSize, onChange, onError]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: accept ? { [accept]: [] } : undefined,
      multiple,
      maxSize,
      disabled,
    });

    const removeFile = useCallback(
      (fileId) => {
        const updatedFiles = files.filter((f) => f.id !== fileId);
        setFiles(updatedFiles);
        onChange(updatedFiles);
      },
      [files, onChange]
    );

    const formatFileSize = (bytes) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const getFileIcon = (fileType) => {
      if (fileType.startsWith("image/")) {
        return <PhotoIcon className="h-5 w-5 text-green-500" />;
      } else if (fileType.startsWith("video/")) {
        return <FilmIcon className="h-5 w-5 text-purple-500" />;
      } else {
        return <DocumentIcon className="h-5 w-5 text-blue-500" />;
      }
    };

    return (
      <div className={className}>
        <div
          {...getRootProps()}
          className={`
          file-upload-area
          ${isDragActive ? "dragover" : ""}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        >
          <input {...getInputProps()} ref={ref} {...props} />
          <CloudArrowUpIcon className="file-upload-icon" />
          <div className="file-upload-text">
            {isDragActive ? (
              <p>Drop files here...</p>
            ) : (
              <p>
                Drag and drop files here, or{" "}
                <span className="text-indigo-600 font-medium">browse</span>
              </p>
            )}
          </div>
          <p className="file-upload-hint">
            {accept && `Supported formats: ${accept}`}
            {maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
            {multiple && " • Multiple files allowed"}
          </p>
        </div>

        {files.length > 0 && (
          <div className="file-list">
            {files.map((file) => (
              <div key={file.id} className="file-item">
                <div className="file-item-info">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="file-item-name">{file.name}</p>
                    <p className="file-item-size">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="file-item-remove"
                  disabled={disabled}
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

export default FileUpload;
