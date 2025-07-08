// Action button component
const ActionButton = ({ onClick, icon: Icon, tooltip, variant }) => {
  const variants = {
    edit: "text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50",
    delete: "text-red-600 hover:text-red-900 hover:bg-red-50",
  };

  return (
    <button
      onClick={onClick}
      className={`p-1 rounded transition-colors ${variants[variant]}`}
      title={tooltip}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
};

export default ActionButton;
