import FormField from "../../../../../../Common/FormSelect";
import { useTranslation } from "react-i18next";

const ScriptParameters = ({ parameters, values, onParameterChange }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <h6 className="text-sm font-medium text-gray-900">
        {t("designer.scriptParameters")}
      </h6>
      {parameters.map((param, index) => (
        <FormField key={index} label={param.name} help={param.description}>
          {param.type === "select" && param.options ? (
            <select
              value={values[param.name] || param.default_value || ""}
              onChange={(e) => onParameterChange(param.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select {param.name}</option>
              {param.options.map((option, optIndex) => (
                <option key={optIndex} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : param.type === "textarea" ? (
            <textarea
              value={values[param.name] || param.default_value || ""}
              onChange={(e) => onParameterChange(param.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder={param.placeholder || `Enter ${param.name}`}
            />
          ) : (
            <input
              type={
                param.type === "number"
                  ? "number"
                  : param.type === "email"
                  ? "email"
                  : "text"
              }
              value={values[param.name] || param.default_value || ""}
              onChange={(e) => onParameterChange(param.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={param.placeholder || `Enter ${param.name}`}
            />
          )}
          {param.required && (
            <p className="text-xs text-red-600 mt-1">
              {t("designer.requiredParameter")}
            </p>
          )}
        </FormField>
      ))}
    </div>
  );
};

export default ScriptParameters;
