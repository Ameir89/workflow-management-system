// Enhanced WorkflowDesigner.js with proper condition handling
import React, { useState, useCallback, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import DesignerCanvas from "./DesignerCanvas";
import NodePalette from "./NodePalette";
import PropertiesPanel from "./PropertiesPanel/PropertiesPanel";
import DesignerToolbar from "./DesignerToolbar";
import { workflowService } from "../../services/workflowService";
import "./WorkflowDesigner.css";

const workflowInitialData = {
  name: "",
  description: "",
  category: "",
  is_active: true,
  definition: {
    steps: [],
    transitions: [],
    variables: [],
    settings: {},
  },
};

const WorkflowDesignerContent = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [workflow, setWorkflow] = useState(workflowInitialData);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedTransition, setSelectedTransition] = useState(null);
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

  // Save workflow mutation with enhanced validation
  const saveWorkflowMutation = useMutation(
    (workflowData) => {
      // Enhanced workflow data processing before save
      const processedWorkflow = processWorkflowForSave(workflowData);

      if (id) {
        return workflowService.updateWorkflow(id, processedWorkflow);
      } else {
        return workflowService.createWorkflow(processedWorkflow);
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

  // Process workflow data before saving to ensure all conditions are included
  const processWorkflowForSave = useCallback((workflowData) => {
    const processedWorkflow = { ...workflowData };

    // Ensure all steps have proper structure
    processedWorkflow.definition.steps = processedWorkflow.definition.steps.map(
      (step) => ({
        ...step,
        // Ensure properties exist
        properties: step.properties || {},
        // Ensure position exists
        position: step.position || { x: 0, y: 0 },
        // Process conditions for condition-type nodes
        ...(step.type === "condition" && {
          properties: {
            ...step.properties,
            conditions: step.properties?.conditions || [],
            operator: step.properties?.operator || "and",
          },
        }),
      })
    );

    // Ensure all transitions have proper structure including conditions
    processedWorkflow.definition.transitions =
      processedWorkflow.definition.transitions.map((transition) => ({
        ...transition,
        // Ensure basic properties
        from: transition.from,
        to: transition.to,
        // Process condition data
        condition: transition.condition || null,
        // Add metadata
        created_at: transition.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

    // Add workflow-level metadata
    processedWorkflow.updated_at = new Date().toISOString();
    if (!processedWorkflow.created_at) {
      processedWorkflow.created_at = new Date().toISOString();
    }

    // Validate workflow structure
    const validation = validateWorkflowStructure(processedWorkflow);
    if (!validation.isValid) {
      throw new Error(
        `Workflow validation failed: ${validation.errors.join(", ")}`
      );
    }

    return processedWorkflow;
  }, []);

  // Enhanced workflow validation
  const validateWorkflowStructure = useCallback((workflow) => {
    const errors = [];

    // Basic validation
    if (!workflow.name?.trim()) {
      errors.push("Workflow name is required");
    }

    if (!workflow.definition?.steps?.length) {
      errors.push("At least one step is required");
    }

    // Validate start steps
    const startSteps = workflow.definition.steps.filter((step) => step.isStart);
    if (startSteps.length === 0) {
      errors.push("At least one start step is required");
    }

    // Validate step structure
    workflow.definition.steps.forEach((step, index) => {
      if (!step.id) {
        errors.push(`Step ${index + 1} is missing an ID`);
      }
      if (!step.type) {
        errors.push(`Step ${index + 1} is missing a type`);
      }
      if (!step.name?.trim()) {
        errors.push(`Step ${index + 1} is missing a name`);
      }

      // Validate condition nodes specifically
      if (step.type === "condition") {
        if (!step.properties?.conditions?.length) {
          errors.push(
            `Condition step "${step.name}" must have at least one condition`
          );
        } else {
          step.properties.conditions.forEach((condition, condIndex) => {
            if (!condition.field) {
              errors.push(
                `Condition ${condIndex + 1} in step "${
                  step.name
                }" is missing a field`
              );
            }
            if (!condition.operator) {
              errors.push(
                `Condition ${condIndex + 1} in step "${
                  step.name
                }" is missing an operator`
              );
            }
            // Check if value is required for this operator
            if (
              !["is_empty", "is_not_empty"].includes(condition.operator) &&
              !condition.value
            ) {
              errors.push(
                `Condition ${condIndex + 1} in step "${
                  step.name
                }" is missing a value`
              );
            }
          });
        }
      }
    });

    // Validate transitions
    workflow.definition.transitions.forEach((transition, index) => {
      if (!transition.from) {
        errors.push(`Transition ${index + 1} is missing a 'from' step`);
      }
      if (!transition.to) {
        errors.push(`Transition ${index + 1} is missing a 'to' step`);
      }

      // Validate that referenced steps exist
      const fromStepExists = workflow.definition.steps.some(
        (step) => step.id === transition.from
      );
      const toStepExists = workflow.definition.steps.some(
        (step) => step.id === transition.to
      );

      if (!fromStepExists) {
        errors.push(
          `Transition ${index + 1} references non-existent 'from' step: ${
            transition.from
          }`
        );
      }
      if (!toStepExists) {
        errors.push(
          `Transition ${index + 1} references non-existent 'to' step: ${
            transition.to
          }`
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  const handleSaveWorkflow = useCallback(() => {
    try {
      // Pre-save validation
      const validation = validateWorkflowStructure(workflow);
      if (!validation.isValid) {
        toast.error(validation.errors[0]);
        return;
      }

      saveWorkflowMutation.mutate(workflow);
    } catch (error) {
      toast.error(error.message);
    }
  }, [workflow, saveWorkflowMutation, validateWorkflowStructure]);

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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
            step.id === nodeId
              ? {
                  ...step,
                  ...updates,
                  updated_at: new Date().toISOString(),
                }
              : step
          ),
        },
      }));

      // Update selected node if it's the one being updated
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode((prev) => ({
          ...prev,
          ...updates,
          updated_at: new Date().toISOString(),
        }));
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
    (fromId, toId, conditionData = null) => {
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
        condition: conditionData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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

  const handleUpdateTransition = useCallback(
    (transitionId, updates) => {
      setWorkflow((prev) => ({
        ...prev,
        definition: {
          ...prev.definition,
          transitions: prev.definition.transitions.map((transition) =>
            transition.id === transitionId
              ? {
                  ...transition,
                  ...updates,
                  updated_at: new Date().toISOString(),
                }
              : transition
          ),
        },
      }));

      // Update selected transition if it's the one being updated
      if (selectedTransition && selectedTransition.id === transitionId) {
        setSelectedTransition((prev) => ({
          ...prev,
          ...updates,
          updated_at: new Date().toISOString(),
        }));
      }
    },
    [selectedTransition]
  );

  const handleDeleteTransition = useCallback(
    (transitionId) => {
      setWorkflow((prev) => ({
        ...prev,
        definition: {
          ...prev.definition,
          transitions: prev.definition.transitions.filter(
            (t) => t.id !== transitionId
          ),
        },
      }));

      if (selectedTransition && selectedTransition.id === transitionId) {
        setSelectedTransition(null);
      }
    },
    [selectedTransition]
  );

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
          priority: "medium",
        };
      case "approval":
        return {
          approvers: [],
          approvalType: "any",
          dueHours: 48,
          reason: "",
        };
      case "notification":
        return {
          recipients: [],
          template: "",
          channel: "email",
          subject: "",
        };
      case "condition":
        return {
          conditions: [],
          operator: "and",
        };
      case "automation":
        return {
          script: "",
          timeout: 300,
          scriptType: "javascript",
          errorHandling: "stop",
        };
      default:
        return {};
    }
  };

  // Handle selection changes
  const handleSelectNode = useCallback((node) => {
    setSelectedNode(node);
    setSelectedTransition(null); // Clear transition selection
  }, []);

  const handleSelectTransition = useCallback((transition) => {
    setSelectedTransition(transition);
    setSelectedNode(null); // Clear node selection
  }, []);

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
            selectedTransition={selectedTransition}
            zoom={zoom}
            panOffset={panOffset}
            onSelectNode={handleSelectNode}
            onSelectTransition={handleSelectTransition}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onAddNode={handleAddNode}
            onAddTransition={handleAddTransition}
            onUpdateTransition={handleUpdateTransition}
            onDeleteTransition={handleDeleteTransition}
            onPan={handlePan}
          />
        </div>

        <PropertiesPanel
          workflow={workflow}
          selectedNode={selectedNode}
          selectedTransition={selectedTransition}
          onUpdateWorkflow={setWorkflow}
          onUpdateNode={handleUpdateNode}
          onUpdateTransition={handleUpdateTransition}
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
