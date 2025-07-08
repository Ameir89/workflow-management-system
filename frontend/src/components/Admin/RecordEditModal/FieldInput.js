const FieldInput = ({
  fieldName,
  fieldLabel,
  value,
  onChange,
  isRequired,
  isValueField,
  isDisplayField,
  t,
}) => {
  // Determine field type based on field name patterns
  const getFieldType = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("email")) return "email";
    if (lowerName.includes("url") || lowerName.includes("website"))
      return "url";
    if (lowerName.includes("date")) return "date";
    if (
      lowerName.includes("number") ||
      lowerName.includes("count") ||
      lowerName.includes("order")
    )
      return "number";
    if (lowerName.includes("active") || lowerName.includes("enabled"))
      return "boolean";
    return "text";
  };

  const fieldType = getFieldType(fieldName);

  const renderInput = () => {
    switch (fieldType) {
      case "boolean":
        return (
          <select
            value={value === true ? "true" : value === false ? "false" : ""}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val === "" ? null : val === "true");
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required={isRequired}
          >
            <option value="">{t("common.select")}...</option>
            <option value="true">{t("common.yes")}</option>
            <option value="false">{t("common.no")}</option>
          </select>
        );

      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) =>
              onChange(e.target.value ? Number(e.target.value) : "")
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder={`${t("common.enter")} ${fieldLabel}`}
            required={isRequired}
          />
        );

      case "date":
        return (
          <input
            type="date"
            value={value ? new Date(value).toISOString().split("T")[0] : ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required={isRequired}
          />
        );

      case "email":
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder={`${t("common.enter")} ${fieldLabel}`}
            required={isRequired}
          />
        );

      case "url":
        return (
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder={`${t("common.enter")} ${fieldLabel}`}
            required={isRequired}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder={`${t("common.enter")} ${fieldLabel}`}
            required={isRequired}
          />
        );
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {fieldLabel}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
        {isValueField && (
          <span className="text-indigo-500 ml-1 text-xs">
            ({t("admin.lookups.valueField")})
          </span>
        )}
        {isDisplayField && (
          <span className="text-green-500 ml-1 text-xs">
            ({t("admin.lookups.displayField")})
          </span>
        )}
      </label>
      {renderInput()}
    </div>
  );
};

export default FieldInput;
