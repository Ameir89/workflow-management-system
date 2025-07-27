import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import FormSelect from "../../../../../Common/FormSelect";
import PropertySection from "../../PropertySection";
import Modal from "../../../../../Common/Modal";
import ModalAutomationEditor from "../ModalAutomationEditor";
import { scriptsService } from "../../../../../../services/scriptsService";

// Sub-components
import ScriptMode from "./components/ScriptMode";
import InlineMode from "./components/InlineMode";
import WebhookMode from "./components/WebhookMode";
import EmailMode from "./components/EmailMode";
import DatabaseMode from "./components/DatabaseMode";
import TimeoutSettings from "./components/TimeoutSettings";
import ErrorHandlingSettings from "./components/ErrorHandlingSettings";
import AvailableVariables from "./components/AvailableVariables";

const AutomationProperties = ({ node, onPropertyChange }) => {
  const { t } = useTranslation();
  const properties = node.properties || {};

  // Modal states
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [editingScript, setEditingScript] = useState(null);

  // Fetch scripts
  const {
    data: scriptsData,
    isLoading: scriptsLoading,
    refetch: refetchScripts,
  } = useQuery(
    ["scripts-for-workflow"],
    () => scriptsService.getScripts({ is_active: true, limit: 100 }),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
    }
  );

  const executionModeOptions = [
    { value: "script", label: "Execute Script" },
    { value: "inline", label: "Inline Code" },
    { value: "webhook", label: "Webhook Call" },
    { value: "email", label: "Email Action" },
    { value: "database", label: "Database Query" },
  ];

  // Handle script editor operations
  const handleCreateNewScript = () => {
    setEditingScript(null);
    setShowScriptEditor(true);
  };

  const handleEditScript = () => {
    if (properties.selectedScriptId) {
      setEditingScript(properties.selectedScriptId);
      setShowScriptEditor(true);
    }
  };

  const handleScriptEditorClose = (savedScript) => {
    setShowScriptEditor(false);
    setEditingScript(null);

    if (savedScript) {
      refetchScripts();
      onPropertyChange("selectedScriptId", savedScript.id);
      onPropertyChange("selectedScriptName", savedScript.name);
      onPropertyChange(
        "selectedScriptCategory",
        savedScript.category || "general"
      );
    }
  };

  // Render execution mode specific fields
  const renderExecutionModeFields = () => {
    const executionMode = properties.executionMode || "script";

    const commonProps = {
      properties,
      onPropertyChange,
      scriptsData,
      scriptsLoading,
      refetchScripts,
      onCreateNewScript: handleCreateNewScript,
      onEditScript: handleEditScript,
    };

    switch (executionMode) {
      case "script":
        return <ScriptMode {...commonProps} />;
      case "inline":
        return <InlineMode {...commonProps} />;
      case "webhook":
        return <WebhookMode {...commonProps} />;
      case "email":
        return <EmailMode {...commonProps} />;
      case "database":
        return <DatabaseMode {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <>
      <PropertySection title={t("designer.automationProperties")}>
        <div className="space-y-6">
          {/* Execution Mode Selection */}
          <FormSelect
            label={t("designer.executionMode")}
            value={properties.executionMode || "script"}
            onChange={(e) => onPropertyChange("executionMode", e.target.value)}
            options={executionModeOptions}
          />

          {/* Mode-specific fields */}
          {renderExecutionModeFields()}

          {/* Timeout Settings */}
          <TimeoutSettings
            properties={properties}
            onPropertyChange={onPropertyChange}
          />

          {/* Error Handling */}
          <ErrorHandlingSettings
            properties={properties}
            onPropertyChange={onPropertyChange}
          />

          {/* Available Variables Info */}
          <AvailableVariables />
        </div>
      </PropertySection>

      {/* Script Editor Modal */}
      {showScriptEditor && (
        <Modal
          isOpen={showScriptEditor}
          onClose={() => handleScriptEditorClose()}
          title=""
          maxWidth="7xl"
          showCloseButton={false}
        >
          <ModalAutomationEditor
            scriptId={editingScript}
            isEditing={!!editingScript}
            onClose={handleScriptEditorClose}
            onSave={handleScriptEditorClose}
          />
        </Modal>
      )}
    </>
  );
};

export default AutomationProperties;
