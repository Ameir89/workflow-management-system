// File dropzone component
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";

const FileDropzone = ({ onFileSelect }) => {
  return (
    <div className="space-y-4">
      <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
      <div>
        <p className="text-gray-600">
          Drop your CSV file here, or{" "}
          <label className="text-indigo-600 hover:text-indigo-500 cursor-pointer font-medium">
            browse
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onFileSelect(e.target.files[0])}
            />
          </label>
        </p>
        <p className="text-xs text-gray-500 mt-1">CSV files only (max 10MB)</p>
      </div>
    </div>
  );
};

export default FileDropzone;
