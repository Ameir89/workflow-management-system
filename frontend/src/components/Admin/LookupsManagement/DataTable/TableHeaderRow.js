import FieldIndicators from "./FieldIndicators";
import SortIndicator from "./SortIndicator";

const TableHeaderRow = ({ fields, sortConfig, onSort }) => {
  return (
    <thead className="bg-gray-50">
      <tr>
        {fields.map((field) => (
          <th
            key={field.name}
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => onSort(field.name)}
          >
            <div className="flex items-center space-x-1 group">
              <span className="flex items-center space-x-1">
                <span>{field.displayName}</span>
                <FieldIndicators field={field} />
              </span>
              <SortIndicator field={field.name} sortConfig={sortConfig} />
            </div>
          </th>
        ))}
        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
          Actions
        </th>
      </tr>
    </thead>
  );
};

export default TableHeaderRow;
