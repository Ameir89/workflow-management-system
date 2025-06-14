import React, { useState, useCallback, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import DesignerCanvas from "./DesignerCanvas";
import NodePalette from "./NodePalette";
import PropertiesPanel from "./PropertiesPanel";
import DesignerToolbar from "./DesignerToolbar";
import { workflowService } from "../../services/workflowService";
import "./WorkflowDesigner.css";
import { workflowInitialData } from "../../mocks/workflows";

const WorkflowDesignerContent = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [workflow, setWorkflow] = useState(workflowInitialData);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Load existing workflow if editing
  const { data: existingWorkflow, isLoading } = useQuery(
    ["workflow", id],
    () => workflowService.getWorkflow(id),
    {
      enabled: !!id,
      onSuccess: (data) => {
        setWorkflow(data);
      },
    }
  );

  // Save workflow mutation
  const saveWorkflowMutation = useMutation(
    (workflowData) => {
      if (id) {
        return workflowService.updateWorkflow(id, workflowData);
      } else {
        return workflowService.createWorkflow(workflowData);
      }
    },
    {
      onSuccess: (data) => {
        toast.success(t("workflow.savedSuccessfully"));
        queryClient.invalidateQueries(["workflows"]);
        if (!id) {
          navigate(`/workflows/designer/${data.id}`);
        }
      },
      onError: (error) => {
        toast.error(error.message || t("workflow.saveFailed"));
      },
    }
  );

  const handleSaveWorkflow = useCallback(() => {
    if (!workflow.name.trim()) {
      toast.error(t("workflow.nameRequired"));
      return;
    }

    if (workflow.definition.steps.length === 0) {
      toast.error(t("workflow.atLeastOneStepRequired"));
      return;
    }

    // Validate workflow structure
    const startSteps = workflow.definition.steps.filter((step) => step.isStart);
    if (startSteps.length === 0) {
      toast.error(t("workflow.startStepRequired"));
      return;
    }

    saveWorkflowMutation.mutate(workflow);
  }, [workflow, saveWorkflowMutation, t]);

  const handleAddNode = useCallback(
    (nodeType, position) => {
      const newNode = {
        id: `step_${Date.now()}`,
        type: nodeType,
        name: t(`workflow.steps.${nodeType}`),
        description: "",
        position,
        properties: getDefaultProperties(nodeType),
        isStart: workflow.definition.steps.length === 0,
      };

      setWorkflow((prev) => ({
        ...prev,
        definition: {
          ...prev.definition,
          steps: [...prev.definition.steps, newNode],
        },
      }));

      setSelectedNode(newNode);
    },
    [workflow.definition.steps.length, t]
  );

  const handleUpdateNode = useCallback(
    (nodeId, updates) => {
      setWorkflow((prev) => ({
        ...prev,
        definition: {
          ...prev.definition,
          steps: prev.definition.steps.map((step) =>
            step.id === nodeId ? { ...step, ...updates } : step
          ),
        },
      }));

      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode((prev) => ({ ...prev, ...updates }));
      }
    },
    [selectedNode]
  );

  const handleDeleteNode = useCallback(
    (nodeId) => {
      setWorkflow((prev) => ({
        ...prev,
        definition: {
          ...prev.definition,
          steps: prev.definition.steps.filter((step) => step.id !== nodeId),
          transitions: prev.definition.transitions.filter(
            (t) => t.from !== nodeId && t.to !== nodeId
          ),
        },
      }));

      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode(null);
      }
    },
    [selectedNode]
  );

  const handleAddTransition = useCallback(
    (fromId, toId) => {
      const existingTransition = workflow.definition.transitions.find(
        (t) => t.from === fromId && t.to === toId
      );

      if (existingTransition) {
        toast.warning(t("workflow.transitionAlreadyExists"));
        return;
      }

      const newTransition = {
        id: `transition_${Date.now()}`,
        from: fromId,
        to: toId,
        condition: null,
      };

      setWorkflow((prev) => ({
        ...prev,
        definition: {
          ...prev.definition,
          transitions: [...prev.definition.transitions, newTransition],
        },
      }));
    },
    [workflow.definition.transitions, t]
  );

  const handleDeleteTransition = useCallback((transitionId) => {
    setWorkflow((prev) => ({
      ...prev,
      definition: {
        ...prev.definition,
        transitions: prev.definition.transitions.filter(
          (t) => t.id !== transitionId
        ),
      },
    }));
  }, []);

  const handleZoom = useCallback((delta) => {
    setZoom((prev) => Math.max(0.25, Math.min(2, prev + delta)));
  }, []);

  const handlePan = useCallback((deltaX, deltaY) => {
    setPanOffset((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));
  }, []);

  const getDefaultProperties = (nodeType) => {
    switch (nodeType) {
      case "task":
        return {
          assignee: "",
          dueHours: 24,
          formId: null,
          instructions: "",
        };
      case "approval":
        return {
          approvers: [],
          approvalType: "any", // any, all, majority
          dueHours: 48,
        };
      case "notification":
        return {
          recipients: [],
          template: "",
          channel: "email", // email, sms, in_app
        };
      case "condition":
        return {
          conditions: [],
          operator: "and", // and, or
        };
      case "automation":
        return {
          script: "",
          timeout: 300,
        };
      default:
        return {};
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="workflow-designer h-screen flex flex-col">
      <DesignerToolbar
        workflow={workflow}
        onSave={handleSaveWorkflow}
        onZoomIn={() => handleZoom(0.1)}
        onZoomOut={() => handleZoom(-0.1)}
        onZoomReset={() => setZoom(1)}
        zoom={zoom}
        saving={saveWorkflowMutation.isLoading}
      />

      <div className="flex-1 flex overflow-hidden">
        <NodePalette onAddNode={handleAddNode} />

        <div className="flex-1 relative">
          <DesignerCanvas
            ref={canvasRef}
            workflow={workflow}
            selectedNode={selectedNode}
            zoom={zoom}
            panOffset={panOffset}
            onSelectNode={setSelectedNode}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onAddNode={handleAddNode}
            onAddTransition={handleAddTransition}
            onDeleteTransition={handleDeleteTransition}
            onPan={handlePan}
          />
        </div>

        <PropertiesPanel
          workflow={workflow}
          selectedNode={selectedNode}
          onUpdateWorkflow={setWorkflow}
          onUpdateNode={handleUpdateNode}
        />
      </div>
    </div>
  );
};

// Main component with DnD Provider
const WorkflowDesigner = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <WorkflowDesignerContent />
    </DndProvider>
  );
};

export default WorkflowDesigner;
