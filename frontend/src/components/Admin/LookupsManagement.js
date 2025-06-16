import React, { useState, useEffect } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  TableCellsIcon,
  ListBulletIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

// Main Lookups Management Component
const LookupsManagement = () => {
  const [activeTab, setActiveTab] = useState("tables");
  const [lookupTables, setLookupTables] = useState([
    {
      id: 1,
      name: "countries",
      displayName: "Countries",
      description: "List of all countries",
      fields: [
        {
          name: "code",
          type: "text",
          displayName: "Country Code",
          isValueField: true,
        },
        {
          name: "name",
          type: "text",
          displayName: "Country Name",
          isDisplayField: true,
        },
        { name: "region", type: "text", displayName: "Region" },
        { name: "population", type: "number", displayName: "Population" },
      ],
      recordCount: 195,
      isActive: true,
      createdAt: "2024-01-15",
    },
    {
      id: 2,
      name: "departments",
      displayName: "Departments",
      description: "Company departments",
      fields: [
        { name: "id", type: "number", displayName: "ID", isValueField: true },
        {
          name: "name",
          type: "text",
          displayName: "Department Name",
          isDisplayField: true,
        },
        { name: "manager", type: "text", displayName: "Manager" },
        { name: "budget", type: "number", displayName: "Budget" },
      ],
      recordCount: 12,
      isActive: true,
      createdAt: "2024-01-10",
    },
    {
      id: 3,
      name: "priorities",
      displayName: "Priority Levels",
      description: "Task and workflow priorities",
      fields: [
        {
          name: "level",
          type: "number",
          displayName: "Level",
          isValueField: true,
        },
        {
          name: "name",
          type: "text",
          displayName: "Priority Name",
          isDisplayField: true,
        },
        { name: "color", type: "text", displayName: "Color Code" },
        { name: "description", type: "text", displayName: "Description" },
      ],
      recordCount: 5,
      isActive: true,
      createdAt: "2024-01-05",
    },
  ]);

  const [selectedTable, setSelectedTable] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const tabs = [
    { id: "tables", name: "Lookup Tables", icon: TableCellsIcon },
    { id: "data", name: "Manage Data", icon: ListBulletIcon },
    { id: "settings", name: "Settings", icon: Cog6ToothIcon },
  ];

  // Lookup Tables Tab
  const LookupTablesTab = () => {
    const filteredTables = lookupTables.filter(
      (table) =>
        table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        table.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Lookup Tables
            </h2>
            <p className="text-sm text-gray-600">
              Manage your lookup tables and their structure
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Table
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search lookup tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTables.map((table) => (
            <div
              key={table.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <TableCellsIcon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {table.displayName}
                    </h3>
                    <p className="text-sm text-gray-500">{table.name}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    table.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {table.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="text-sm text-gray-600 mt-3">{table.description}</p>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>{table.fields.length} fields</span>
                <span>{table.recordCount} records</span>
              </div>

              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedTable(table);
                    setActiveTab("data");
                  }}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  View Data
                </button>
                <button
                  onClick={() => {
                    setSelectedTable(table);
                    setShowCreateModal(true);
                  }}
                  className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button className="inline-flex items-center px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Data Management Tab
  const DataManagementTab = () => {
    const [selectedTableData, setSelectedTableData] = useState(
      selectedTable || lookupTables[0]
    );
    const [tableData, setTableData] = useState([
      {
        code: "US",
        name: "United States",
        region: "North America",
        population: 331000000,
      },
      {
        code: "CA",
        name: "Canada",
        region: "North America",
        population: 38000000,
      },
      {
        code: "UK",
        name: "United Kingdom",
        region: "Europe",
        population: 67000000,
      },
      { code: "DE", name: "Germany", region: "Europe", population: 83000000 },
      { code: "JP", name: "Japan", region: "Asia", population: 125000000 },
    ]);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Data</h2>
            <p className="text-sm text-gray-600">
              Add, edit, and manage lookup data
            </p>
          </div>
          <div className="flex space-x-2">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              Import CSV
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Record
            </button>
          </div>
        </div>

        {/* Table Selection */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Lookup Table
          </label>
          <select
            value={selectedTableData?.id || ""}
            onChange={(e) => {
              const table = lookupTables.find(
                (t) => t.id === parseInt(e.target.value)
              );
              setSelectedTableData(table);
            }}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {lookupTables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Data Table */}
        {selectedTableData && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedTableData.displayName} Data
              </h3>
              <p className="text-sm text-gray-600">
                {tableData.length} records
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {selectedTableData.fields.map((field) => (
                      <th
                        key={field.name}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {field.displayName}
                        {field.isValueField && (
                          <span className="ml-1 text-indigo-600">*</span>
                        )}
                        {field.isDisplayField && (
                          <span className="ml-1 text-green-600">•</span>
                        )}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {selectedTableData.fields.map((field) => (
                        <td
                          key={field.name}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {row[field.name]}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Create/Edit Table Modal
  const CreateTableModal = () => {
    const [tableName, setTableName] = useState(selectedTable?.name || "");
    const [displayName, setDisplayName] = useState(
      selectedTable?.displayName || ""
    );
    const [description, setDescription] = useState(
      selectedTable?.description || ""
    );
    const [fields, setFields] = useState(
      selectedTable?.fields || [
        {
          name: "id",
          type: "number",
          displayName: "ID",
          isValueField: true,
          isDisplayField: false,
        },
        {
          name: "name",
          type: "text",
          displayName: "Name",
          isValueField: false,
          isDisplayField: true,
        },
      ]
    );

    const addField = () => {
      setFields([
        ...fields,
        {
          name: "",
          type: "text",
          displayName: "",
          isValueField: false,
          isDisplayField: false,
        },
      ]);
    };

    const removeField = (index) => {
      setFields(fields.filter((_, i) => i !== index));
    };

    const updateField = (index, field, value) => {
      const updatedFields = [...fields];
      updatedFields[index][field] = value;
      setFields(updatedFields);
    };

    return showCreateModal ? (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {selectedTable ? "Edit" : "Create"} Lookup Table
            </h3>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Table Name *
                  </label>
                  <input
                    type="text"
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., countries"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Countries"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe what this lookup table contains..."
                />
              </div>

              {/* Fields Configuration */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">
                    Fields Configuration
                  </h4>
                  <button
                    onClick={addField}
                    className="inline-flex items-center px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Field
                  </button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Field Name
                        </label>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) =>
                            updateField(index, "name", e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                          placeholder="field_name"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={field.displayName}
                          onChange={(e) =>
                            updateField(index, "displayName", e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                          placeholder="Display Name"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) =>
                            updateField(index, "type", e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="boolean">Boolean</option>
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="flex items-center text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={field.isValueField}
                            onChange={(e) =>
                              updateField(
                                index,
                                "isValueField",
                                e.target.checked
                              )
                            }
                            className="mr-1 h-3 w-3 text-indigo-600 rounded"
                          />
                          Value
                        </label>
                      </div>
                      <div className="col-span-1">
                        <label className="flex items-center text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={field.isDisplayField}
                            onChange={(e) =>
                              updateField(
                                index,
                                "isDisplayField",
                                e.target.checked
                              )
                            }
                            className="mr-1 h-3 w-3 text-green-600 rounded"
                          />
                          Display
                        </label>
                      </div>
                      <div className="col-span-1">
                        <button
                          onClick={() => removeField(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  <p>
                    <span className="text-indigo-600">*</span> Value field: Used
                    as the actual value stored in forms
                  </p>
                  <p>
                    <span className="text-green-600">•</span> Display field:
                    Shown to users in dropdowns
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setSelectedTable(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Save logic here
                setShowCreateModal(false);
                setSelectedTable(null);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              {selectedTable ? "Update" : "Create"} Table
            </button>
          </div>
        </div>
      </div>
    ) : null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Lookups Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage lookup tables and data for your forms and workflows
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "tables" && <LookupTablesTab />}
        {activeTab === "data" && <DataManagementTab />}
        {activeTab === "settings" && (
          <div className="text-center py-12">
            <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Settings</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure lookup system settings
            </p>
          </div>
        )}

        {/* Create/Edit Modal */}
        <CreateTableModal />
      </div>
    </div>
  );
};

export default LookupsManagement;
