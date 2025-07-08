// src/components/Admin/LookupsManagement/ImportModal/FieldMappingPreview.js - Updated for API structure
import { useMemo } from "react";

const FieldMappingPreview = ({ tableFields, csvHeaders }) => {
  const mappings = useMemo(() => {
    return tableFields.map((field) => {
      // Try to find matching header (case insensitive)
      const matchingHeader = csvHeaders.find(
        (header) =>
          header.toLowerCase() === field.name.toLowerCase() ||
          header.toLowerCase() === field.displayName.toLowerCase()
      );

      return {
        field,
        csvHeader: matchingHeader,
        isMatched: !!matchingHeader,
      };
    });
  }, [tableFields, csvHeaders]);

  const matchedCount = mappings.filter((m) => m.isMatched).length;
  const totalFields = mappings.length;
  const requiredFields = mappings.filter((m) => m.field.isRequired);
  const missingRequiredFields = requiredFields.filter((m) => !m.isMatched);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="font-medium text-blue-900 mb-3">
        Field Mapping Preview ({matchedCount}/{totalFields} matched)
      </h4>

      <div className="space-y-2">
        {mappings.map((mapping, index) => (
          <div
            key={index}
            className={`flex justify-between items-center py-2 px-3 rounded text-sm ${
              mapping.isMatched
                ? "bg-green-100 text-green-800"
                : mapping.field.isRequired
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            <span className="font-medium">
              {mapping.field.displayName || mapping.field.name}
              {mapping.field.isRequired && (
                <span className="text-red-500 ml-1">*</span>
              )}
              {mapping.field.isValueField && (
                <span className="text-indigo-600 ml-1 text-xs">(Value)</span>
              )}
              {mapping.field.isDisplayField && (
                <span className="text-green-600 ml-1 text-xs">(Display)</span>
              )}
            </span>
            <span>
              {mapping.isMatched
                ? `→ ${mapping.csvHeader}`
                : "No matching column"}
            </span>
          </div>
        ))}
      </div>

      {missingRequiredFields.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-xs text-red-800 font-medium">
            Missing required fields:{" "}
            {missingRequiredFields.map((m) => m.field.name).join(", ")}
          </p>
          <p className="text-xs text-red-700 mt-1">
            These fields must have matching columns in your CSV for import to
            succeed.
          </p>
        </div>
      )}

      {matchedCount < totalFields && missingRequiredFields.length === 0 && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-800">
            Some optional fields don't have matching columns. These fields will
            be left empty during import.
          </p>
        </div>
      )}
    </div>
  );
};

export default FieldMappingPreview;
