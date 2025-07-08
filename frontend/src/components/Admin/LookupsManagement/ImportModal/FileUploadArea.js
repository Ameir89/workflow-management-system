// File upload area component
import FileSelected from "./FileSelected";
import FileDropzone from "./FileDropzone";

const FileUploadArea = ({
  csvFile,
  dragOver,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
  onRemoveFile,
  validationResults,
}) => {
  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        dragOver
          ? "border-indigo-500 bg-indigo-50"
          : csvFile
          ? "border-green-500 bg-green-50"
          : "border-gray-300 hover:border-gray-400"
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {csvFile ? (
        <FileSelected
          file={csvFile}
          onRemove={onRemoveFile}
          validationResults={validationResults}
        />
      ) : (
        <FileDropzone onFileSelect={onFileSelect} />
      )}
    </div>
  );
};

export default FileUploadArea;
