// Sort indicator component
import {
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const SortIndicator = ({ field, sortConfig }) => {
  if (sortConfig.key !== field) {
    return (
      <ChevronUpDownIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    );
  }

  return sortConfig.direction === "asc" ? (
    <ChevronUpIcon className="h-4 w-4 text-indigo-600" />
  ) : (
    <ChevronDownIcon className="h-4 w-4 text-indigo-600" />
  );
};
export default SortIndicator;
