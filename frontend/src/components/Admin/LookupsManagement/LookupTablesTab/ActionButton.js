// Reusable action button
const ActionButton = ({
  onClick,
  variant = "secondary",
  icon: Icon,
  label,
  disabled = false,
  className = "",
  tooltip,
}) => {
  const variants = {
    primary: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    secondary: "border border-gray-300 hover:bg-gray-50",
    danger: "text-red-600 border border-red-200 hover:bg-red-50",
  };

  const baseClasses =
    "inline-flex items-center justify-center px-3 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const button = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      title={tooltip}
    >
      <Icon className="h-4 w-4" />
      {label && <span className="ml-1">{label}</span>}
    </button>
  );

  return button;
};
export default ActionButton;
