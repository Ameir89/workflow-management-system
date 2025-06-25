// src/components/Admin/UserManagement/MultiSelect.js
import React, { useState } from "react";
import {
  XMarkIcon,
  ChevronDownIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const MultiSelect = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions =
    options?.filter((option) =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const selectedRoles =
    options?.filter((option) => value.includes(option.name)) || [];

  const handleToggleRole = (roleName) => {
    if (value.includes(roleName)) {
      onChange(value.filter((name) => name !== roleName));
    } else {
      onChange([...value, roleName]);
    }
  };

  const handleRemoveRole = (roleName) => {
    onChange(value.filter((name) => name !== roleName));
  };

  return (
    <div className="relative">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[42px] flex items-center justify-between ${
          disabled
            ? "bg-gray-50 cursor-not-allowed"
            : "cursor-pointer hover:border-gray-400"
        }`}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedRoles.length === 0 ? (
            <span className="text-gray-500">{placeholder}</span>
          ) : (
            selectedRoles.map((role) => (
              <span
                key={role.id}
                className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-800 text-sm"
              >
                {role.name}
                {!disabled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveRole(role.name);
                    }}
                    className="ml-1 text-indigo-600 hover:text-indigo-800"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>
        {!disabled && (
          <ChevronDownIcon
            className={`h-4 w-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No roles found
              </div>
            ) : (
              filteredOptions.map((role) => (
                <div
                  key={role.id}
                  onClick={() => handleToggleRole(role.name)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                    value.includes(role.name)
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700"
                  }`}
                >
                  <div className="flex items-center">
                    <span>{role.name}</span>
                    {role.description && (
                      <span className="ml-2 text-xs text-gray-500 truncate">
                        - {role.description}
                      </span>
                    )}
                  </div>
                  {value.includes(role.name) && (
                    <CheckCircleIcon className="h-4 w-4 text-indigo-600" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};

export default MultiSelect;
