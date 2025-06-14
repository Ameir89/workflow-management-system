import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  PlayIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  QuestionMarkCircleIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

const DesignerToolbar = ({
  workflow,
  onSave,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  zoom = 1,
  saving = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleBack = () => {
    navigate("/workflows");
  };

  const handleTest = () => {
    // Implement workflow testing logic
    console.log("Testing workflow...");
  };

  const handleExport = () => {
    // Implement workflow export logic
    const dataStr = JSON.stringify(workflow, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `${workflow.name || "workflow"}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const shortcuts = [
    { key: "Ctrl+S", description: t("designer.shortcuts.save") },
    { key: "Ctrl+Z", description: t("designer.shortcuts.undo") },
    { key: "Ctrl+Y", description: t("designer.shortcuts.redo") },
    { key: "Delete", description: t("designer.shortcuts.delete") },
    { key: "Escape", description: t("designer.shortcuts.deselect") },
    { key: "Ctrl++", description: t("designer.shortcuts.zoomIn") },
    { key: "Ctrl+-", description: t("designer.shortcuts.zoomOut") },
    { key: "Ctrl+0", description: t("designer.shortcuts.zoomReset") },
  ];

  return (
    <div className="designer-toolbar">
      {/* Left Section */}
      <div className="designer-toolbar-left">
        <button
          onClick={handleBack}
          className="designer-toolbar-button"
          title={t("common.back")}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          {t("common.back")}
        </button>

        <div className="hidden md:block border-l border-gray-300 mx-4 h-6" />

        <div className="hidden md:block">
          <h1 className="designer-toolbar-title">
            {workflow.name || t("designer.newWorkflow")}
          </h1>
          <p className="designer-toolbar-subtitle">
            {workflow.description || t("designer.workflowDesigner")}
          </p>
        </div>
      </div>

      {/* Center Section - Zoom Controls */}
      <div className="designer-toolbar-center">
        <div className="zoom-controls">
          <button
            onClick={onZoomOut}
            className="zoom-button"
            title={t("designer.zoomOut")}
            disabled={zoom <= 0.25}
          >
            <MinusIcon className="h-4 w-4" />
          </button>

          <div className="zoom-level">{Math.round(zoom * 100)}%</div>

          <button
            onClick={onZoomIn}
            className="zoom-button"
            title={t("designer.zoomIn")}
            disabled={zoom >= 2}
          >
            <PlusIcon className="h-4 w-4" />
          </button>

          <button
            onClick={onZoomReset}
            className="zoom-button ml-2"
            title={t("designer.zoomReset")}
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Right Section */}
      <div className="designer-toolbar-right">
        <button
          onClick={handleTest}
          className="designer-toolbar-button"
          title={t("designer.testWorkflow")}
          disabled={!workflow.definition?.steps?.length}
        >
          <PlayIcon className="h-4 w-4 mr-2" />
          {t("designer.test")}
        </button>

        <button
          onClick={handleExport}
          className="designer-toolbar-button"
          title={t("designer.exportWorkflow")}
          disabled={!workflow.definition?.steps?.length}
        >
          <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
          {t("designer.export")}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="designer-toolbar-button"
            title={t("designer.keyboardShortcuts")}
          >
            <QuestionMarkCircleIcon className="h-4 w-4" />
          </button>

          {showShortcuts && (
            <div className="keyboard-shortcuts">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                {t("designer.keyboardShortcuts")}
              </h4>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="keyboard-shortcut">
                    <span className="keyboard-shortcut-description">
                      {shortcut.description}
                    </span>
                    <kbd className="keyboard-shortcut-key">{shortcut.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onSave}
          disabled={saving || !workflow.name?.trim()}
          className={`designer-toolbar-button ${saving ? "" : "primary"}`}
          title={t("common.save")}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {t("common.saving")}
            </>
          ) : (
            <>
              <CheckIcon className="h-4 w-4 mr-2" />
              {t("common.save")}
            </>
          )}
        </button>
      </div>

      {/* Status indicators */}
      {saving && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2">
          <div className="designer-saving">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">{t("designer.saving")}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignerToolbar;
