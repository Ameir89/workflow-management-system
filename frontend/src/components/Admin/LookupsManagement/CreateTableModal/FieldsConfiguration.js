import { PlusIcon } from "@heroicons/react/24/outline";
import FieldConfiguration from "../FieldConfiguration";
import FieldsLegend from "./FieldsLegend";
const FieldsConfiguration = ({
  fields,
  onAddField,
  onRemoveField,
  onUpdateField,
  errors,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-md font-medium text-gray-900">
          Fields Configuration
        </h4>
        <button
          type="button"
          onClick={onAddField}
          className="inline-flex items-center px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Field
        </button>
      </div>

      <FieldConfiguration
        fields={fields}
        onUpdateField={onUpdateField}
        onRemoveField={onRemoveField}
        errors={errors}
      />

      <FieldsLegend />
    </div>
  );
};

export default FieldsConfiguration;
