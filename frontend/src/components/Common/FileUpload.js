import React, { useState, useRef, forwardRef } from "react";
import {
  CloudArrowUpIcon,
  DocumentIcon,
  TrashIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";

const FileUpload = forwardRef(
  (
    {
      value = [],
      onChange,
      accept = "*/*",
      multiple = false,
      maxSize = 10 * 1024 * 1024, // 10MB default
      disabled = false,
      onError,
      className = "",
      ...props
    },
    ref
  ) => {
    const [dragOver, setDragOver] = useState(false);
    const [files, setFiles] = useState(Array.isArray(value) ? value : []);
    const fileInputRef = useRef(null);

    const validateFile = (file) => {
      if (maxSize && file.size > maxSize) {
        const sizeInMB = (maxSize / (1024 * 1024)).toFixed(1);
        throw new Error(`File size must be less than ${sizeInMB}MB`);
      }

      if (accept && accept !== "*/*") {
        const acceptedTypes = accept.split(",").map((type) => type.trim());
        const fileType = file.type;
        const fileExtension = "." + file.name.split(".").pop().toLowerCase();

        const isValid = acceptedTypes.some((type) => {
          if (type.startsWith(".")) {
            return type === fileExtension;
          }
          if (type.includes("/*")) {
            const category = type.split("/")[0];
            return fileType.startsWith(category + "/");
          }
          return type === fileType;
        });

        if (!isValid) {
          throw new Error(`File type not accepted. Allowed types: ${accept}`);
        }
      }
    };

    const handleFileSelection = (selectedFiles) => {
      const fileList = Array.from(selectedFiles);

      try {
        // Validate all files first
        fileList.forEach(validateFile);

        let newFiles;
        if (multiple) {
          newFiles = [...files, ...fileList];
        } else {
          newFiles = fileList.slice(0, 1);
        }

        setFiles(newFiles);
        if (onChange) {
          onChange(newFiles);
        }
      } catch (error) {
        if (onError) {
          onError(error.message);
        }
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setDragOver(false);

      if (disabled) return;

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        handleFileSelection(droppedFiles);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      if (!disabled) {
        setDragOver(true);
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      setDragOver(false);
    };

    const handleInputChange = (e) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        handleFileSelection(selectedFiles);
      }
    };

    const removeFile = (index) => {
      const newFiles = files.filter((_, i) => i !== index);
      setFiles(newFiles);
      if (onChange) {
        onChange(newFiles);
      }
    };

    const formatFileSize = (bytes) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const openFileDialog = () => {
      if (!disabled && fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    return (
      <div className={`file-upload-container ${className}`} ref={ref}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
          {...props}
        />

        {/* Drop zone */}
        <div
          className={`file-upload-area ${dragOver ? "dragover" : ""} ${
            disabled ? "disabled" : ""
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={openFileDialog}
        >
          <div className="file-upload-content">
            <CloudArrowUpIcon className="file-upload-icon" />
            <div className="file-upload-text">
              <p className="text-sm text-gray-600">
                {dragOver ? (
                  "Drop files here"
                ) : (
                  <>
                    <span className="font-medium">Click to upload</span> or drag
                    and drop
                  </>
                )}
              </p>
              <p className="file-upload-hint">
                {accept && accept !== "*/*"
                  ? `Accepted types: ${accept}`
                  : "Any file type"}
                {maxSize && ` (Max size: ${formatFileSize(maxSize)})`}
              </p>
            </div>
          </div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="file-list">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-item-info">
                  <DocumentIcon className="file-item-icon" />
                  <div className="flex-1 min-w-0">
                    <p className="file-item-name">{file.name}</p>
                    <p className="file-item-size">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="file-item-remove"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* File count info */}
        {multiple && files.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            {files.length} file{files.length !== 1 ? "s" : ""} selected
          </div>
        )}
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

export default FileUpload;
