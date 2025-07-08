// Table body component
import DataRow from "./DataRow";
const TableBody = ({ data, fields, onEditRecord, onDeleteRecord }) => {
  return (
    <tbody className="bg-white divide-y divide-gray-200">
      {data.map((row, index) => (
        <DataRow
          key={row.id || index}
          row={row}
          fields={fields}
          onEdit={() => onEditRecord(row)}
          onDelete={() => onDeleteRecord(row)}
        />
      ))}
    </tbody>
  );
};

export default TableBody;
