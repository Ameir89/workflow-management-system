// conditionMigrationUtil.js - Utility to migrate workflow conditions to new format
export const conditionMigrationUtil = {
  /**
   * Migrate a workflow to use the new condition format
   */
  migrateWorkflowConditions(workflow) {
    if (!workflow || !workflow.definition) {
      return workflow;
    }

    const migratedWorkflow = JSON.parse(JSON.stringify(workflow)); // Deep clone

    // Migrate transitions
    if (migratedWorkflow.definition.transitions) {
      migratedWorkflow.definition.transitions =
        migratedWorkflow.definition.transitions.map((transition) => ({
          ...transition,
          condition: this.migrateCondition(transition.condition),
        }));
    }

    // Migrate condition nodes
    if (migratedWorkflow.definition.steps) {
      migratedWorkflow.definition.steps = migratedWorkflow.definition.steps.map(
        (step) => {
          if (step.type === "condition" && step.properties) {
            return {
              ...step,
              properties: {
                ...step.properties,
                conditions: this.migrateNodeConditions(
                  step.properties.conditions
                ),
              },
            };
          }
          return step;
        }
      );
    }

    return migratedWorkflow;
  },

  /**
   * Migrate a single condition to the new format
   */
  migrateCondition(condition) {
    if (!condition) {
      return null;
    }

    // If it's already in the new format (has rules array), return as is
    if (condition.rules && Array.isArray(condition.rules)) {
      return condition;
    }

    // If it's in the old format (has field/operator/value), convert to new format
    if (condition.field && condition.operator) {
      return {
        operator: "and",
        rules: [
          {
            id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            field: condition.field,
            operator: condition.operator,
            value: condition.value || "",
          },
        ],
      };
    }

    // Unknown format, return as is
    return condition;
  },

  /**
   * Migrate node conditions (array format)
   */
  migrateNodeConditions(conditions) {
    if (!conditions) {
      return [];
    }

    if (Array.isArray(conditions)) {
      return conditions.map((condition) => ({
        id:
          condition.id ||
          `cond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        field: condition.field || "",
        operator: condition.operator || "equals",
        value: condition.value || "",
        ...condition,
      }));
    }

    return [];
  },

  /**
   * Check if a workflow needs migration
   */
  needsMigration(workflow) {
    if (!workflow || !workflow.definition) {
      return false;
    }

    // Check transitions for old format conditions
    const hasOldTransitionConditions = workflow.definition.transitions?.some(
      (transition) =>
        transition.condition &&
        transition.condition.field &&
        transition.condition.operator &&
        !transition.condition.rules
    );

    // Check condition nodes for missing IDs
    const hasOldNodeConditions = workflow.definition.steps?.some(
      (step) =>
        step.type === "condition" &&
        step.properties?.conditions?.some((condition) => !condition.id)
    );

    return hasOldTransitionConditions || hasOldNodeConditions;
  },

  /**
   * Validate condition structure
   */
  validateConditionStructure(condition) {
    if (!condition) {
      return { valid: true, errors: [] };
    }

    const errors = [];

    // Check new format
    if (condition.rules && Array.isArray(condition.rules)) {
      if (condition.rules.length === 0) {
        errors.push("Rules array cannot be empty");
      }

      condition.rules.forEach((rule, index) => {
        if (!rule.field) {
          errors.push(`Rule ${index + 1}: Field is required`);
        }
        if (!rule.operator) {
          errors.push(`Rule ${index + 1}: Operator is required`);
        }
        if (!rule.id) {
          errors.push(`Rule ${index + 1}: ID is required`);
        }

        // Check if value is required for this operator
        const operatorsWithoutValue = ["is_empty", "is_not_empty"];
        if (
          !operatorsWithoutValue.includes(rule.operator) &&
          (rule.value === undefined || rule.value === null || rule.value === "")
        ) {
          errors.push(
            `Rule ${index + 1}: Value is required for operator '${
              rule.operator
            }'`
          );
        }
      });

      const validOperators = ["any", "all", "null"];
      if (condition.operator && !validOperators.includes(condition.operator)) {
        errors.push(
          `Invalid operator '${condition.operator}'. Must be 'any' , 'all' or 'null',`
        );
      }
    }
    // Check old format
    else if (condition.field && condition.operator) {
      const operatorsWithoutValue = ["is_empty", "is_not_empty"];
      if (
        !operatorsWithoutValue.includes(condition.operator) &&
        (condition.value === undefined ||
          condition.value === null ||
          condition.value === "")
      ) {
        errors.push(`Value is required for operator '${condition.operator}'`);
      }
    }
    // Invalid format
    else {
      errors.push("Invalid condition format");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Convert old format condition to display string
   */
  conditionToDisplayString(condition) {
    if (!condition) {
      return null;
    }

    // Handle new format
    if (condition.rules && Array.isArray(condition.rules)) {
      if (condition.rules.length === 1) {
        const rule = condition.rules[0];
        return `${rule.field} ${rule.operator} ${rule.value || ""}`;
      }
      return `${condition.rules.length} conditions (${(
        condition.operator || "AND"
      ).toUpperCase()})`;
    }

    // Handle old format
    if (condition.field && condition.operator) {
      return `${condition.field} ${condition.operator} ${
        condition.value || ""
      }`;
    }

    return "Has condition";
  },

  /**
   * Migrate workflow on load (for use in WorkflowDesigner)
   */
  migrateWorkflowOnLoad(workflow) {
    if (!workflow) {
      return workflow;
    }

    // Check if migration is needed
    if (!this.needsMigration(workflow)) {
      return workflow;
    }

    console.log("Migrating workflow conditions to new format...");
    const migratedWorkflow = this.migrateWorkflowConditions(workflow);

    // Log migration results
    const transitionsMigrated =
      migratedWorkflow.definition.transitions?.filter(
        (t) => t.condition && t.condition.rules
      ).length || 0;

    const conditionNodesMigrated =
      migratedWorkflow.definition.steps?.filter(
        (s) => s.type === "condition" && s.properties?.conditions?.length > 0
      ).length || 0;

    console.log(
      `Migration complete: ${transitionsMigrated} transitions and ${conditionNodesMigrated} condition nodes migrated`
    );

    return migratedWorkflow;
  },

  /**
   * Bulk migrate multiple workflows
   */
  bulkMigrateWorkflows(workflows) {
    if (!Array.isArray(workflows)) {
      return workflows;
    }

    return workflows.map((workflow) => this.migrateWorkflowOnLoad(workflow));
  },

  /**
   * Generate migration report
   */
  generateMigrationReport(originalWorkflow, migratedWorkflow) {
    const report = {
      workflowId: originalWorkflow.id,
      workflowName: originalWorkflow.name,
      migrationDate: new Date().toISOString(),
      changes: [],
    };

    // Check transition changes
    if (originalWorkflow.definition?.transitions) {
      originalWorkflow.definition.transitions.forEach(
        (originalTransition, index) => {
          const migratedTransition =
            migratedWorkflow.definition?.transitions?.[index];

          if (
            originalTransition.condition &&
            originalTransition.condition.field &&
            migratedTransition?.condition?.rules
          ) {
            report.changes.push({
              type: "transition_condition",
              transitionId: originalTransition.id,
              from: originalTransition.from,
              to: originalTransition.to,
              oldFormat: {
                field: originalTransition.condition.field,
                operator: originalTransition.condition.operator,
                value: originalTransition.condition.value,
              },
              newFormat: {
                operator: migratedTransition.condition.operator,
                rules: migratedTransition.condition.rules,
              },
            });
          }
        }
      );
    }

    // Check condition node changes
    if (originalWorkflow.definition?.steps) {
      originalWorkflow.definition.steps.forEach((originalStep, index) => {
        const migratedStep = migratedWorkflow.definition?.steps?.[index];

        if (
          originalStep.type === "condition" &&
          originalStep.properties?.conditions?.some((c) => !c.id) &&
          migratedStep?.properties?.conditions?.every((c) => c.id)
        ) {
          report.changes.push({
            type: "condition_node",
            stepId: originalStep.id,
            stepName: originalStep.name,
            conditionsUpdated: migratedStep.properties.conditions.length,
          });
        }
      });
    }

    return report;
  },
};

export default conditionMigrationUtil;
