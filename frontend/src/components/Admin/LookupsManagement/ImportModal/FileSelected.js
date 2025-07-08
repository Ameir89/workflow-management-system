import { DocumentTextIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { de } from "date-fns/locale";

const FileSelected = ({ file, onRemove, validationResults }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center space-x-2">
        <CheckCircleIcon className="h-8 w-8 text-green-600" />
        <DocumentTextIcon className="h-8 w-8 text-gray-600" />
      </div>

      <div>
        <p className="font-medium text-gray-900">{file.name}</p>
        <p className="text-sm text-gray-600">
          {(file.size / 1024).toFixed(2)} KB
        </p>
      </div>

      {validationResults && (
        <div className="bg-white border border-green-200 rounded-lg p-4 text-left">
          <h4 className="font-medium text-gray-900 mb-2">File Preview</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p>
              <strong>Estimated Records:</strong> {validationResults.totalLines}
            </p>
            <p>
              <strong>Columns Found:</strong>{" "}
              {validationResults.headers?.length || 0}
            </p>
            {validationResults.headers && (
              <div>
                <strong>Headers:</strong>
                <div className="mt-1 flex flex-wrap gap-1">
                  {validationResults.headers.map((header, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 bg-gray-100 text-xs rounded"
                    >
                      {header}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={onRemove}
        className="text-sm text-red-600 hover:text-red-800 font-medium"
      >
        Remove file
      </button>
    </div>
  );
};

export default FileSelected;
