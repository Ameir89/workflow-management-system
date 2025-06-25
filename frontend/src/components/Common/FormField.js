const FormField = ({
  label,
  required,
  error,
  help,
  children,
  className = "",
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      {help && !error && <p className="text-sm text-gray-500">{help}</p>}
    </div>
  );
};

export default FormField;
