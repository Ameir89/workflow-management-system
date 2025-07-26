import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLookups } from "../../../hooks/useLookups";
import {
  TableCellsIcon,
  ListBulletIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

// Import sub-components
import LookupTablesTab from "./LookupTablesTab/LookupTablesTab";
import DataManagementTab from "./DataManagementTab/DataManagementTab";
import SettingsTab from "./SettingsTab";
import CreateTableModal from "./CreateTableModal/CreateTableModal";
import RecordEditModal from "../RecordEditModal/RecordEditModal";
import ImportModal from "./ImportModal/ImportModal";
import TabNavigation from "./TabNavigation";

const LookupsManagement = () => {
  const { t } = useTranslation();

  // State management
  const [activeTab, setActiveTab] = useState("tables");
  const [selectedTable, setSelectedTable] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [modals, setModals] = useState({
    createTable: false,
    editRecord: false,
    import: false,
  });
  const [editingRecord, setEditingRecord] = useState(null);

  // Custom hooks
  const { useDeleteTableMutation, exportTableData } = useLookups();

  // Mutations
  const deleteTableMutation = useDeleteTableMutation({
    onSuccess: (data, deletedId) => {
      if (selectedTable?.id === deletedId) {
        setSelectedTable(null);
        setActiveTab("tables");
      }
    },
  });

  // Tab configuration
  const tabs = [
    {
      id: "tables",
      name: t("admin.lookups.lookupTables"),
      icon: TableCellsIcon,
    },
    { id: "data", name: t("admin.lookups.manageData"), icon: ListBulletIcon },
    { id: "settings", name: t("common.settings"), icon: Cog6ToothIcon },
  ];

  // Modal handlers
  const openModal = (modalName, data = null) => {
    setModals((prev) => ({ ...prev, [modalName]: true }));
    if (modalName === "editRecord") {
      setEditingRecord(data);
    }
  };

  const closeModal = (modalName) => {
    setModals((prev) => ({ ...prev, [modalName]: false }));
    if (modalName === "editRecord") {
      setEditingRecord(null);
    }
    if (modalName === "createTable") {
      setSelectedTable(null);
    }
  };

  // Event handlers
  const handleCreateTable = () => {
    setSelectedTable(null);
    openModal("createTable");
  };

  const handleEditTable = (table) => {
    setSelectedTable(table);
    openModal("createTable");
  };

  const handleDeleteTable = (table) => {
    deleteTableMutation.mutate(table.id);
  };

  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setActiveTab("data");
  };

  const handleEditRecord = (record) => {
    openModal("editRecord", record);
  };

  const handleImport = () => {
    openModal("import");
  };

  const handleExport = async (tableId) => {
    if (!tableId) return;
    try {
      await exportTableData(tableId, selectedTable?.name || "lookup_data");
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  // Common props for tabs
  const commonTabProps = {
    selectedTable,
    setSelectedTable,
    searchTerm,
    setSearchTerm,
  };

  const tabProps = {
    tables: {
      ...commonTabProps,
      onCreateTable: handleCreateTable,
      onEditTable: handleEditTable,
      onDeleteTable: handleDeleteTable,
      onSelectTable: handleSelectTable,
      deleteTableMutation,
    },
    data: {
      ...commonTabProps,
      onEditRecord: handleEditRecord,
      onImport: handleImport,
      onExport: handleExport,
    },
    settings: {},
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("admin.lookups.title")}
          </h1>
          <p className="text-gray-600 mt-2">{t("admin.lookups.description")}</p>
        </div>

        {/* Tab Navigation */}
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "tables" && <LookupTablesTab {...tabProps.tables} />}
          {activeTab === "data" && <DataManagementTab {...tabProps.data} />}
          {activeTab === "settings" && <SettingsTab {...tabProps.settings} />}
        </div>

        {/* Modals */}
        <CreateTableModal
          isOpen={modals.createTable}
          onClose={() => closeModal("createTable")}
          selectedTable={selectedTable}
        />

        <RecordEditModal
          isOpen={modals.editRecord}
          onClose={() => closeModal("editRecord")}
          selectedTable={selectedTable}
          editingRecord={editingRecord}
        />

        <ImportModal
          isOpen={modals.import}
          onClose={() => closeModal("import")}
          selectedTable={selectedTable}
        />
      </div>
    </div>
  );
};

export default LookupsManagement;
