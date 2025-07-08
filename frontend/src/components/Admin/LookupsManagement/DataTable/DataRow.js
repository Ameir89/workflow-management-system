// Individual data row component
import CellValue from "./CellValue";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import ActionButton from "./ActionButton";

const DataRow = ({ row, fields, onEdit, onDelete }) => {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {fields.map((field) => (
        <td
          key={field.name}
          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
        >
          <CellValue value={row[field.name]} field={field} />
        </td>
      ))}
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          <ActionButton
            onClick={onEdit}
            icon={PencilIcon}
            tooltip="Edit record"
            variant="edit"
          />
          <ActionButton
            onClick={onDelete}
            icon={TrashIcon}
            tooltip="Delete record"
            variant="delete"
          />
        </div>
      </td>
    </tr>
  );
};

export default DataRow;
