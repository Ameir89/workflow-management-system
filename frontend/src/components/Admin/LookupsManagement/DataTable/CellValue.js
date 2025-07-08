import StatusBadge from "../../../Common/StatusBadge";

const CellValue = ({ value, field }) => {
  // Handle null/undefined values
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-400 italic">—</span>;
  }

  // Format based on field name patterns since API doesn't provide types
  const formatValue = (value, fieldName) => {
    const lowerFieldName = fieldName.toLowerCase();

    if (
      typeof value === "boolean" ||
      lowerFieldName.includes("active") ||
      lowerFieldName.includes("enabled")
    ) {
      return (
        <StatusBadge
          status={value ? "True" : "False"}
          variant={value ? "success" : "error"}
          size="xs"
        />
      );
    }

    if (lowerFieldName.includes("email")) {
      return (
        <a
          href={`mailto:${value}`}
          className="text-indigo-600 hover:text-indigo-900 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      );
    }

    if (lowerFieldName.includes("url") || lowerFieldName.includes("website")) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-900 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      );
    }

    if (lowerFieldName.includes("date")) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return (
            <span className="text-gray-700">{date.toLocaleDateString()}</span>
          );
        }
      } catch (error) {
        // Fall through to default handling
      }
    }

    if (
      typeof value === "number" ||
      lowerFieldName.includes("number") ||
      lowerFieldName.includes("count")
    ) {
      return (
        <span className="font-mono text-gray-900">
          {value.toLocaleString()}
        </span>
      );
    }

    // Default text handling
    const stringValue = String(value);
    if (stringValue.length > 50) {
      return (
        <span title={stringValue} className="cursor-help">
          {stringValue.substring(0, 50)}...
        </span>
      );
    }

    return <span>{stringValue}</span>;
  };

  return formatValue(value, field.name);
};

export default CellValue;
