// src/components/Admin/LookupsManagement/SettingsTab.js
import React from "react";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";

const SettingsTab = () => {
  return (
    <div className="text-center py-12">
      <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">Settings</h3>
      <p className="mt-1 text-sm text-gray-500">
        Configure lookup system settings
      </p>
      <div className="mt-6 max-w-2xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-left">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            Lookup System Configuration
          </h4>

          <div className="space-y-6">
            {/* Cache Settings */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                Cache Settings
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Cache Duration (minutes)
                  </label>
                  <input
                    type="number"
                    defaultValue={30}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableCache"
                    defaultChecked
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="enableCache"
                    className="ml-2 text-sm text-gray-600"
                  >
                    Enable lookup caching
                  </label>
                </div>
              </div>
            </div>

            {/* Import/Export Settings */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                Import/Export Settings
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Max Import File Size (MB)
                  </label>
                  <input
                    type="number"
                    defaultValue={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Default Export Format
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option value="csv">CSV</option>
                    <option value="xlsx">Excel</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Validation Settings */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                Validation Settings
              </h5>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="strictValidation"
                    defaultChecked
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="strictValidation"
                    className="ml-2 text-sm text-gray-600"
                  >
                    Enable strict field validation
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="duplicateCheck"
                    defaultChecked
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="duplicateCheck"
                    className="ml-2 text-sm text-gray-600"
                  >
                    Check for duplicate values on import
                  </label>
                </div>
              </div>
            </div>

            {/* Performance Settings */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                Performance Settings
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Records per Page
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Search Results Limit
                  </label>
                  <input
                    type="number"
                    defaultValue={1000}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Reset to Defaults
            </button>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
