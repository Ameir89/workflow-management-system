// Fields legend
const FieldsLegend = () => {
  return (
    <div className="mt-3 text-xs text-gray-500 space-y-1">
      <p>
        <span className="text-indigo-600 font-bold">*</span> Value field: Used
        as the actual value stored in forms
      </p>
      <p>
        <span className="text-green-600 font-bold">•</span> Display field: Shown
        to users in dropdowns
      </p>
      <p>
        <span className="text-red-500 font-bold">!</span> Required field: Must
        have a value
      </p>
    </div>
  );
};
export default FieldsLegend;
