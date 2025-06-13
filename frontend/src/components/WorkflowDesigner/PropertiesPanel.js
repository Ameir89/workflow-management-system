import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { formsService } from "../../services/formsService";
import {
  XMarkIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
const PropertiesPanel = ({
  workflow,
  selectedNode,
  onUpdateWorkflow,
  onUpdateNode,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("properties");

  const handleWorkflowChange = (field, value) => {
    onUpdateWorkflow((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNodeChange = (field, value) => {
    if (selectedNode) {
      onUpdateNode(selectedNode.id, {
        [field]: value,
      });
    }
  };

  const handleNodePropertyChange = (propertyKey, value) => {
    if (selectedNode) {
      onUpdateNode(selectedNode.id, {
        properties: {
          ...selectedNode.properties,
          [propertyKey]: value,
        },
      });
    }
  };

  const renderWorkflowProperties = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("workflow.name")} *
        </label>
        <input
          type="text"
          value={workflow.name || ""}
          onChange={(e) => handleWorkflowChange("name", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={t("workflow.enterName")}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("workflow.description")}
        </label>
        <textarea
          value={workflow.description || ""}
          onChange={(e) => handleWorkflowChange("description", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={t("workflow.enterDescription")}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("workflow.category")}
        </label>
        <select
          value={workflow.category || ""}
          onChange={(e) => handleWorkflowChange("category", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">{t("workflow.selectCategory")}</option>
          <option value="approval">{t("workflow.categories.approval")}</option>
          <option value="automation">
            {t("workflow.categories.automation")}
          </option>
          <option value="notification">
            {t("workflow.categories.notification")}
          </option>
          <option value="integration">
            {t("workflow.categories.integration")}
          </option>
        </select>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={workflow.is_active !== false}
          onChange={(e) => handleWorkflowChange("is_active", e.target.checked)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          {t("workflow.active")}
        </label>
      </div>
    </div>
  );

  const renderNodeProperties = () => {
    if (!selectedNode) {
      return (
        <div className="text-center py-8">
          <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {t("designer.noNodeSelected")}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t("designer.selectNodeToEdit")}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Basic Node Properties */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("designer.nodeName")} *
          </label>
          <input
            type="text"
            value={selectedNode.name || ""}
            onChange={(e) => handleNodeChange("name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("designer.nodeDescription")}
          </label>
          <textarea
            value={selectedNode.description || ""}
            onChange={(e) => handleNodeChange("description", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={selectedNode.isStart || false}
            onChange={(e) => handleNodeChange("isStart", e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            {t("designer.startNode")}
          </label>
        </div>

        {/* Type-specific Properties */}
        {renderTypeSpecificProperties()}
      </div>
    );
  };

  const renderTypeSpecificProperties = () => {
    if (!selectedNode) return null;

    const { type, properties = {} } = selectedNode;

    switch (type) {
      case "task":
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 border-t pt-4">
              {t("designer.taskProperties")}
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("designer.assignee")}
              </label>
              <input
                type="email"
                value={properties.assignee || ""}
                onChange={(e) =>
                  handleNodePropertyChange("assignee", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("designer.dueHours")}
              </label>
              <input
                type="number"
                value={properties.dueHours || 24}
                onChange={(e) =>
                  handleNodePropertyChange("dueHours", parseInt(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("designer.instructions")}
              </label>
              <textarea
                value={properties.instructions || ""}
                onChange={(e) =>
                  handleNodePropertyChange("instructions", e.target.value)
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("workflow.form")}
              </label>
              <select
                value={workflow.form}
                onChange={(e) => handleWorkflowChange("form", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{t("workflow.form")}</option>
                <option value="form1">{t("form1")}</option>
                <option value="automation">
                  {t("workflow.categories.automation")}
                </option>
                <option value="notification">
                  {t("workflow.categories.notification")}
                </option>
                <option value="integration">
                  {t("workflow.categories.integration")}
                </option>
              </select>
            </div>
          </div>
        );

      case "approval":
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 border-t pt-4">
              {t("designer.approvalProperties")}
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("designer.approvers")}
              </label>
              <textarea
                value={properties.approvers?.join(", ") || ""}
                onChange={(e) =>
                  handleNodePropertyChange(
                    "approvers",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="user1@example.com, user2@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("designer.approvalType")}
              </label>
              <select
                value={properties.approvalType || "any"}
                onChange={(e) =>
                  handleNodePropertyChange("approvalType", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="any">{t("designer.anyApprover")}</option>
                <option value="all">{t("designer.allApprovers")}</option>
                <option value="majority">{t("designer.majority")}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("designer.dueHours")}
              </label>
              <input
                type="number"
                value={properties.dueHours || 48}
                onChange={(e) =>
                  handleNodePropertyChange("dueHours", parseInt(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                min="1"
              />
            </div>
          </div>
        );

      case "notification":
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 border-t pt-4">
              {t("designer.notificationProperties")}
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("designer.recipients")}
              </label>
              <textarea
                value={properties.recipients?.join(", ") || ""}
                onChange={(e) =>
                  handleNodePropertyChange(
                    "recipients",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="user1@example.com, user2@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("designer.channel")}
              </label>
              <select
                value={properties.channel || "email"}
                onChange={(e) =>
                  handleNodePropertyChange("channel", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="email">{t("designer.email")}</option>
                <option value="sms">{t("designer.sms")}</option>
                <option value="in_app">{t("designer.inApp")}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("designer.template")}
              </label>
              <textarea
                value={properties.template || ""}
                onChange={(e) =>
                  handleNodePropertyChange("template", e.target.value)
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t("designer.templatePlaceholder")}
              />
            </div>
          </div>
        );

      case "condition":
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 border-t pt-4">
              {t("designer.conditionProperties")}
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("designer.operator")}
              </label>
              <select
                value={properties.operator || "and"}
                onChange={(e) =>
                  handleNodePropertyChange("operator", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="and">{t("designer.and")}</option>
                <option value="or">{t("designer.or")}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("designer.conditions")}
              </label>
              <textarea
                value={JSON.stringify(properties.conditions || [], null, 2)}
                onChange={(e) => {
                  try {
                    const conditions = JSON.parse(e.target.value);
                    handleNodePropertyChange("conditions", conditions);
                  } catch (error) {
                    // Invalid JSON, ignore
                  }
                }}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                placeholder='[{"field": "status", "operator": "equals", "value": "approved"}]'
              />
            </div>
          </div>
        );

      case "automation":
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 border-t pt-4">
              {t("designer.automationProperties")}
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("designer.script")}
              </label>
              <textarea
                value={properties.script || ""}
                onChange={(e) =>
                  handleNodePropertyChange("script", e.target.value)
                }
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                placeholder="// JavaScript code here"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("designer.timeout")} ({t("common.seconds")})
              </label>
              <input
                type="number"
                value={properties.timeout || 300}
                onChange={(e) =>
                  handleNodePropertyChange("timeout", parseInt(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                min="1"
                max="3600"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const tabs = [
    {
      id: "properties",
      name: t("designer.properties"),
      icon: Cog6ToothIcon,
    },
  ];

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          {selectedNode ? selectedNode.name : t("designer.workflowProperties")}
        </h3>
        {selectedNode && (
          <p className="text-sm text-gray-500 capitalize">
            {selectedNode.type}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "properties" &&
          (selectedNode ? renderNodeProperties() : renderWorkflowProperties())}
      </div>
    </div>
  );
};

export default PropertiesPanel;
