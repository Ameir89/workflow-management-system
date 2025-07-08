// Reusable action button component
const ActionButton = ({
  onClick,
  disabled,
  icon: Icon,
  label,
  variant = "secondary",
}) => {
  const baseClasses =
    "inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors";
  const variantClasses = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50",
    secondary:
      "border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      <Icon className="h-4 w-4 mr-2" />
      {label}
    </button>
  );
};

export default ActionButton;
