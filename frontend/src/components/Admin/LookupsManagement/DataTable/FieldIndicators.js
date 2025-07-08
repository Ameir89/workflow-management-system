// Field indicators component
const FieldIndicators = ({ field }) => {
  return (
    <div className="flex items-center space-x-1">
      {field.isValueField && (
        <span className="text-indigo-600 font-bold text-sm" title="Value field">
          *
        </span>
      )}
      {field.isDisplayField && (
        <span
          className="text-green-600 font-bold text-sm"
          title="Display field"
        >
          •
        </span>
      )}
      {field.isRequired && (
        <span className="text-red-500 font-bold text-sm" title="Required field">
          !
        </span>
      )}
    </div>
  );
};

export default FieldIndicators;
