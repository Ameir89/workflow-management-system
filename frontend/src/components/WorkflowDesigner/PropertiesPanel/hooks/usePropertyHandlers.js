// Fixed usePropertyHandlers.js - Updated to handle both condition formats
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

        // FIXED: Special handling for condition updates - handle both formats
        if (field === "condition") {
          if (value === null || value === undefined) {
            // Removing condition
            updates.condition = null;
          } else if (value) {
            // Ensure condition has proper structure
            let processedCondition;

            // Handle the new rules-based format
            if (value.rules && Array.isArray(value.rules)) {
              processedCondition = {
                operator: value.operator || "and",
                rules: value.rules.map((rule) => ({
                  id: rule.id || Date.now().toString(),
                  field: rule.field || "",
                  operator: rule.operator || "equals",
                  value: rule.value !== undefined ? rule.value : "",
                  ...rule,
                })),
                ...value,
              };
            }
            // Handle the old direct format (field/operator/value)
            else if (value.field && value.operator) {
              processedCondition = {
                field: value.field,
                operator: value.operator,
                value: value.value !== undefined ? value.value : "",
                ...value,
              };
            }
            // Handle mixed or unknown formats
            else {
              processedCondition = { ...value };
            }

            updates.condition = processedCondition;
          }
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

  // FIXED: Validation helpers - Updated to handle both condition formats
  const validateConditions = useCallback((conditions) => {
    if (!conditions) return [];

    // Handle rules-based format
    if (conditions.rules && Array.isArray(conditions.rules)) {
      return conditions.rules.filter((rule) => {
        // Basic validation - ensure required fields exist
        if (!rule.field || !rule.operator) return false;

        // Check if value is required for this operator
        const operatorsWithoutValue = ["is_empty", "is_not_empty"];
        if (!operatorsWithoutValue.includes(rule.operator) && !rule.value) {
          return false;
        }

        return true;
      });
    }

    // Handle direct format (single condition)
    if (conditions.field && conditions.operator) {
      const operatorsWithoutValue = ["is_empty", "is_not_empty"];
      if (
        !operatorsWithoutValue.includes(conditions.operator) &&
        !conditions.value
      ) {
        return [];
      }
      return [conditions];
    }

    // Handle array format (legacy)
    if (Array.isArray(conditions)) {
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
    }

    return [];
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
        const validConditions = validateConditions(transition.condition);

        // Check if condition structure is valid
        if (
          transition.condition.rules &&
          Array.isArray(transition.condition.rules)
        ) {
          if (
            transition.condition.rules.length > 0 &&
            validConditions.length === 0
          ) {
            errors.push("All condition rules must be properly configured");
          }
        } else if (
          transition.condition.field &&
          transition.condition.operator
        ) {
          if (validConditions.length === 0) {
            errors.push("Condition must be properly configured");
          }
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

  // FIXED: Import/Export helpers for conditions - Updated to handle both formats
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

    let conditions = [];

    // Handle rules-based format
    if (
      transition.condition.rules &&
      Array.isArray(transition.condition.rules)
    ) {
      conditions = transition.condition.rules.map((rule) => ({
        field: rule.field,
        operator: rule.operator,
        value: rule.value,
        description: rule.description || "",
      }));
    }
    // Handle direct format
    else if (transition.condition.field && transition.condition.operator) {
      conditions = [
        {
          field: transition.condition.field,
          operator: transition.condition.operator,
          value: transition.condition.value,
          description: transition.condition.description || "",
        },
      ];
    }

    return {
      type: "transition_conditions",
      transitionId: transition.id,
      transitionName:
        transition.name || `${transition.from} → ${transition.to}`,
      operator: transition.condition.operator || "and",
      rules: conditions,
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

  // FIXED: Utility function to normalize condition format
  const normalizeConditionFormat = useCallback((condition) => {
    if (!condition) return null;

    // If it's already in the new format, return as is
    if (condition.rules && Array.isArray(condition.rules)) {
      return condition;
    }

    // If it's in the old format, convert to new format
    if (condition.field && condition.operator) {
      return {
        operator: "and",
        rules: [
          {
            id: Date.now().toString(),
            field: condition.field,
            operator: condition.operator,
            value: condition.value || "",
          },
        ],
      };
    }

    return null;
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

    // Utility
    normalizeConditionFormat,
  };
};
