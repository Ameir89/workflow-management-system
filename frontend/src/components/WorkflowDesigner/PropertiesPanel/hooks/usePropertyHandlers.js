// Enhanced usePropertyHandlers.js with transition support
import { useCallback } from "react";

export const usePropertyHandlers = ({
  selectedNode,
  selectedTransition,
  onUpdateWorkflow,
  onUpdateNode,
  onUpdateTransition,
}) => {
  const handleWorkflowChange = useCallback(
    (field, value) => {
      onUpdateWorkflow((prev) => ({
        ...prev,
        [field]: value,
        updated_at: new Date().toISOString(),
      }));
    },
    [onUpdateWorkflow]
  );

  const handleNodeChange = useCallback(
    (field, value) => {
      if (selectedNode) {
        onUpdateNode(selectedNode.id, {
          [field]: value,
        });
      }
    },
    [selectedNode, onUpdateNode]
  );

  const handleNodePropertyChange = useCallback(
    (propertyKey, value) => {
      if (selectedNode) {
        const updatedProperties = {
          ...selectedNode.properties,
          [propertyKey]: value,
        };

        // Special handling for condition nodes to ensure proper structure
        if (selectedNode.type === "condition" && propertyKey === "conditions") {
          // Validate each condition
          const validatedConditions = Array.isArray(value)
            ? value.map((condition) => ({
                id: condition.id || Date.now().toString(),
                field: condition.field || "",
                operator: condition.operator || "equals",
                value: condition.value || "",
                ...condition,
              }))
            : [];

          updatedProperties.conditions = validatedConditions;
        }

        onUpdateNode(selectedNode.id, {
          properties: updatedProperties,
        });
      }
    },
    [selectedNode, onUpdateNode]
  );

  const handleTransitionChange = useCallback(
    (field, value) => {
      if (selectedTransition && onUpdateTransition) {
        const updates = { [field]: value };

        // Special handling for condition updates
        if (field === "condition" && value) {
          // Ensure condition has proper structure
          const processedCondition = {
            operator: value.operator || "and",
            rules: Array.isArray(value.rules)
              ? value.rules.map((rule) => ({
                  id: rule.id || Date.now().toString(),
                  field: rule.field || "",
                  operator: rule.operator || "equals",
                  value: rule.value !== undefined ? rule.value : "",
                  ...rule,
                }))
              : [],
            ...value,
          };

          updates.condition = processedCondition;
        }

        onUpdateTransition(selectedTransition.id, updates);
      }
    },
    [selectedTransition, onUpdateTransition]
  );

  // Batch update handlers for complex operations
  const handleBatchNodeUpdate = useCallback(
    (updates) => {
      if (selectedNode) {
        onUpdateNode(selectedNode.id, {
          ...updates,
          updated_at: new Date().toISOString(),
        });
      }
    },
    [selectedNode, onUpdateNode]
  );

  const handleBatchTransitionUpdate = useCallback(
    (updates) => {
      if (selectedTransition && onUpdateTransition) {
        onUpdateTransition(selectedTransition.id, {
          ...updates,
          updated_at: new Date().toISOString(),
        });
      }
    },
    [selectedTransition, onUpdateTransition]
  );

  // Validation helpers
  const validateConditions = useCallback((conditions) => {
    if (!Array.isArray(conditions)) return [];

    return conditions.filter((condition) => {
      // Basic validation - ensure required fields exist
      if (!condition.field || !condition.operator) return false;

      // Check if value is required for this operator
      const operatorsWithoutValue = ["is_empty", "is_not_empty"];
      if (
        !operatorsWithoutValue.includes(condition.operator) &&
        !condition.value
      ) {
        return false;
      }

      return true;
    });
  }, []);

  const validateNodeProperties = useCallback(
    (node) => {
      const errors = [];

      if (!node.name?.trim()) {
        errors.push("Node name is required");
      }

      // Type-specific validation
      switch (node.type) {
        case "condition":
          const validConditions = validateConditions(
            node.properties?.conditions || []
          );
          if (validConditions.length === 0) {
            errors.push("At least one valid condition is required");
          }
          break;

        case "task":
          if (
            node.properties?.dueHours &&
            (node.properties.dueHours < 1 || node.properties.dueHours > 8760)
          ) {
            errors.push("Due hours must be between 1 and 8760");
          }
          break;

        case "approval":
          if (!node.properties?.approvers?.length) {
            errors.push("At least one approver is required");
          }
          break;

        case "notification":
          if (!node.properties?.recipients?.length) {
            errors.push("At least one recipient is required");
          }
          if (!node.properties?.template?.trim()) {
            errors.push("Notification template is required");
          }
          break;

        case "automation":
          if (!node.properties?.script?.trim()) {
            errors.push("Script content is required");
          }
          break;
      }

      return errors;
    },
    [validateConditions]
  );

  const validateTransitionProperties = useCallback(
    (transition) => {
      const errors = [];

      if (!transition.from || !transition.to) {
        errors.push("Transition must have both from and to steps");
      }

      if (transition.condition) {
        const validRules = validateConditions(transition.condition.rules || []);
        if (
          transition.condition.rules &&
          transition.condition.rules.length > 0 &&
          validRules.length === 0
        ) {
          errors.push("All condition rules must be properly configured");
        }
      }

      if (
        transition.delay &&
        (transition.delay < 0 || transition.delay > 3600)
      ) {
        errors.push("Delay must be between 0 and 3600 seconds");
      }

      return errors;
    },
    [validateConditions]
  );

  // Import/Export helpers for conditions
  const exportNodeConditions = useCallback((node) => {
    if (node.type !== "condition" || !node.properties?.conditions) {
      return null;
    }

    return {
      type: "node_conditions",
      nodeId: node.id,
      nodeName: node.name,
      operator: node.properties.operator || "and",
      conditions: node.properties.conditions.map((condition) => ({
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
        description: condition.description || "",
      })),
      exportedAt: new Date().toISOString(),
    };
  }, []);

  const exportTransitionConditions = useCallback((transition) => {
    if (!transition.condition) {
      return null;
    }

    return {
      type: "transition_conditions",
      transitionId: transition.id,
      transitionName:
        transition.name || `${transition.from} → ${transition.to}`,
      operator: transition.condition.operator || "and",
      rules:
        transition.condition.rules?.map((rule) => ({
          field: rule.field,
          operator: rule.operator,
          value: rule.value,
          description: rule.description || "",
        })) || [],
      exportedAt: new Date().toISOString(),
    };
  }, []);

  const importConditions = useCallback((conditionData, targetType = "node") => {
    if (!conditionData || (!conditionData.conditions && !conditionData.rules)) {
      return null;
    }

    const conditions = conditionData.conditions || conditionData.rules || [];

    return {
      operator: conditionData.operator || "and",
      [targetType === "node" ? "conditions" : "rules"]: conditions.map(
        (condition) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          field: condition.field || "",
          operator: condition.operator || "equals",
          value: condition.value || "",
          description: condition.description || "",
        })
      ),
    };
  }, []);

  return {
    // Basic handlers
    handleWorkflowChange,
    handleNodeChange,
    handleNodePropertyChange,
    handleTransitionChange,

    // Batch handlers
    handleBatchNodeUpdate,
    handleBatchTransitionUpdate,

    // Validation
    validateConditions,
    validateNodeProperties,
    validateTransitionProperties,

    // Import/Export
    exportNodeConditions,
    exportTransitionConditions,
    importConditions,
  };
};
