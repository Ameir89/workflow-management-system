// workflowValidationUtils.js - Comprehensive workflow validation
export class WorkflowValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = "WorkflowValidationError";
    this.errors = errors;
  }
}

export const workflowValidationUtils = {
  /**
   * Comprehensive workflow validation before save
   */
  validateWorkflow(workflow) {
    const errors = [];

    // Basic workflow validation
    errors.push(...this.validateBasicWorkflow(workflow));

    // Step validation
    errors.push(...this.validateSteps(workflow.definition?.steps || []));

    // Transition validation
    errors.push(
      ...this.validateTransitions(
        workflow.definition?.transitions || [],
        workflow.definition?.steps || []
      )
    );

    // Workflow flow validation
    errors.push(...this.validateWorkflowFlow(workflow.definition || {}));

    return {
      isValid: errors.length === 0,
      errors,
      warnings: this.getValidationWarnings(workflow),
    };
  },

  /**
   * Basic workflow properties validation
   */
  validateBasicWorkflow(workflow) {
    const errors = [];

    if (
      !workflow.name ||
      typeof workflow.name !== "string" ||
      !workflow.name.trim()
    ) {
      errors.push("Workflow name is required and must be a non-empty string");
    }

    if (workflow.name && workflow.name.length > 255) {
      errors.push("Workflow name cannot exceed 255 characters");
    }

    if (workflow.description && workflow.description.length > 1000) {
      errors.push("Workflow description cannot exceed 1000 characters");
    }

    if (!workflow.definition || typeof workflow.definition !== "object") {
      errors.push("Workflow must have a valid definition object");
    }

    return errors;
  },

  /**
   * Validate all workflow steps
   */
  validateSteps(steps) {
    const errors = [];

    if (!Array.isArray(steps)) {
      errors.push("Steps must be an array");
      return errors;
    }

    if (steps.length === 0) {
      errors.push("Workflow must have at least one step");
      return errors;
    }

    const stepIds = new Set();
    const startSteps = [];

    steps.forEach((step, index) => {
      const stepErrors = this.validateStep(step, index);
      errors.push(...stepErrors);

      if (step.id) {
        if (stepIds.has(step.id)) {
          errors.push(`Duplicate step ID found: ${step.id}`);
        }
        stepIds.add(step.id);
      }

      if (step.isStart) {
        startSteps.push(step);
      }
    });

    if (startSteps.length === 0) {
      errors.push("Workflow must have at least one start step");
    }

    return errors;
  },

  /**
   * Validate individual step
   */
  validateStep(step, index) {
    const errors = [];
    const stepLabel = `Step ${index + 1}${step.name ? ` (${step.name})` : ""}`;

    if (!step.id || typeof step.id !== "string") {
      errors.push(`${stepLabel}: Step ID is required and must be a string`);
    }

    if (!step.type || typeof step.type !== "string") {
      errors.push(`${stepLabel}: Step type is required`);
    }

    if (!step.name || typeof step.name !== "string" || !step.name.trim()) {
      errors.push(`${stepLabel}: Step name is required`);
    }

    if (!step.position || typeof step.position !== "object") {
      errors.push(`${stepLabel}: Step must have a valid position object`);
    } else {
      if (
        typeof step.position.x !== "number" ||
        typeof step.position.y !== "number"
      ) {
        errors.push(
          `${stepLabel}: Step position must have numeric x and y coordinates`
        );
      }
    }

    // Type-specific validation
    if (step.type) {
      errors.push(...this.validateStepByType(step, stepLabel));
    }

    return errors;
  },

  /**
   * Validate step based on its type
   */
  validateStepByType(step, stepLabel) {
    const errors = [];
    const properties = step.properties || {};

    switch (step.type) {
      case "condition":
        errors.push(...this.validateConditionStep(properties, stepLabel));
        break;

      case "task":
        errors.push(...this.validateTaskStep(properties, stepLabel));
        break;

      case "approval":
        errors.push(...this.validateApprovalStep(properties, stepLabel));
        break;

      case "notification":
        errors.push(...this.validateNotificationStep(properties, stepLabel));
        break;

      case "automation":
        errors.push(...this.validateAutomationStep(properties, stepLabel));
        break;

      default:
        // Allow custom step types but warn
        break;
    }

    return errors;
  },

  /**
   * Validate condition step properties
   */
  validateConditionStep(properties, stepLabel) {
    const errors = [];

    if (!properties.conditions || !Array.isArray(properties.conditions)) {
      errors.push(`${stepLabel}: Condition step must have a conditions array`);
      return errors;
    }

    if (properties.conditions.length === 0) {
      errors.push(
        `${stepLabel}: Condition step must have at least one condition`
      );
      return errors;
    }

    const validOperators = ["and", "or"];
    if (properties.operator && !validOperators.includes(properties.operator)) {
      errors.push(`${stepLabel}: Invalid operator. Must be 'and' or 'or'`);
    }

    properties.conditions.forEach((condition, condIndex) => {
      errors.push(
        ...this.validateCondition(
          condition,
          `${stepLabel} condition ${condIndex + 1}`
        )
      );
    });

    return errors;
  },

  /**
   * Validate individual condition
   */
  validateCondition(condition, conditionLabel) {
    const errors = [];

    if (
      !condition.field ||
      typeof condition.field !== "string" ||
      !condition.field.trim()
    ) {
      errors.push(`${conditionLabel}: Field is required`);
    }

    const validOperators = [
      "equals",
      "not_equals",
      "greater_than",
      "less_than",
      "contains",
      "starts_with",
      "ends_with",
      "is_empty",
      "is_not_empty",
    ];

    if (!condition.operator || !validOperators.includes(condition.operator)) {
      errors.push(
        `${conditionLabel}: Invalid operator. Must be one of: ${validOperators.join(
          ", "
        )}`
      );
    }

    // Check if value is required for this operator
    const operatorsWithoutValue = ["is_empty", "is_not_empty"];
    if (!operatorsWithoutValue.includes(condition.operator)) {
      if (
        condition.value === undefined ||
        condition.value === null ||
        condition.value === ""
      ) {
        errors.push(
          `${conditionLabel}: Value is required for operator '${condition.operator}'`
        );
      }
    }

    return errors;
  },

  /**
   * Validate task step properties
   */
  validateTaskStep(properties, stepLabel) {
    const errors = [];

    if (properties.assignee && typeof properties.assignee !== "string") {
      errors.push(`${stepLabel}: Assignee must be a string`);
    }

    if (
      properties.assignee &&
      properties.assignee.includes("@") &&
      !this.isValidEmail(properties.assignee)
    ) {
      errors.push(`${stepLabel}: Invalid assignee email format`);
    }

    if (properties.dueHours !== undefined) {
      if (
        typeof properties.dueHours !== "number" ||
        properties.dueHours < 1 ||
        properties.dueHours > 8760
      ) {
        errors.push(
          `${stepLabel}: Due hours must be a number between 1 and 8760`
        );
      }
    }

    const validPriorities = ["low", "medium", "high", "urgent"];
    if (properties.priority && !validPriorities.includes(properties.priority)) {
      errors.push(
        `${stepLabel}: Invalid priority. Must be one of: ${validPriorities.join(
          ", "
        )}`
      );
    }

    return errors;
  },

  /**
   * Validate approval step properties
   */
  validateApprovalStep(properties, stepLabel) {
    const errors = [];

    if (
      !properties.approvers ||
      !Array.isArray(properties.approvers) ||
      properties.approvers.length === 0
    ) {
      errors.push(`${stepLabel}: At least one approver is required`);
    } else {
      properties.approvers.forEach((approver, index) => {
        if (typeof approver !== "string" || !approver.trim()) {
          errors.push(
            `${stepLabel}: Approver ${index + 1} must be a non-empty string`
          );
        } else if (approver.includes("@") && !this.isValidEmail(approver)) {
          errors.push(
            `${stepLabel}: Invalid approver email format: ${approver}`
          );
        }
      });
    }

    const validApprovalTypes = ["any", "all", "majority", "sequential"];
    if (
      properties.approvalType &&
      !validApprovalTypes.includes(properties.approvalType)
    ) {
      errors.push(
        `${stepLabel}: Invalid approval type. Must be one of: ${validApprovalTypes.join(
          ", "
        )}`
      );
    }

    if (properties.dueHours !== undefined) {
      if (
        typeof properties.dueHours !== "number" ||
        properties.dueHours < 1 ||
        properties.dueHours > 8760
      ) {
        errors.push(
          `${stepLabel}: Due hours must be a number between 1 and 8760`
        );
      }
    }

    return errors;
  },

  /**
   * Validate notification step properties
   */
  validateNotificationStep(properties, stepLabel) {
    const errors = [];

    if (
      !properties.recipients ||
      !Array.isArray(properties.recipients) ||
      properties.recipients.length === 0
    ) {
      errors.push(`${stepLabel}: At least one recipient is required`);
    } else {
      properties.recipients.forEach((recipient, index) => {
        if (typeof recipient !== "string" || !recipient.trim()) {
          errors.push(
            `${stepLabel}: Recipient ${index + 1} must be a non-empty string`
          );
        } else if (recipient.includes("@") && !this.isValidEmail(recipient)) {
          errors.push(
            `${stepLabel}: Invalid recipient email format: ${recipient}`
          );
        }
      });
    }

    if (
      !properties.template ||
      typeof properties.template !== "string" ||
      !properties.template.trim()
    ) {
      errors.push(`${stepLabel}: Notification template is required`);
    }

    const validChannels = ["email", "sms", "in_app", "webhook"];
    if (properties.channel && !validChannels.includes(properties.channel)) {
      errors.push(
        `${stepLabel}: Invalid channel. Must be one of: ${validChannels.join(
          ", "
        )}`
      );
    }

    if (properties.channel === "webhook") {
      if (!properties.webhookUrl || typeof properties.webhookUrl !== "string") {
        errors.push(
          `${stepLabel}: Webhook URL is required for webhook channel`
        );
      } else if (!this.isValidUrl(properties.webhookUrl)) {
        errors.push(`${stepLabel}: Invalid webhook URL format`);
      }
    }

    return errors;
  },

  /**
   * Validate automation step properties
   */
  validateAutomationStep(properties, stepLabel) {
    const errors = [];

    if (
      !properties.script ||
      typeof properties.script !== "string" ||
      !properties.script.trim()
    ) {
      errors.push(`${stepLabel}: Script content is required`);
    }

    if (properties.timeout !== undefined) {
      if (
        typeof properties.timeout !== "number" ||
        properties.timeout < 1 ||
        properties.timeout > 3600
      ) {
        errors.push(
          `${stepLabel}: Timeout must be a number between 1 and 3600 seconds`
        );
      }
    }

    const validScriptTypes = ["javascript", "webhook", "email", "database"];
    if (
      properties.scriptType &&
      !validScriptTypes.includes(properties.scriptType)
    ) {
      errors.push(
        `${stepLabel}: Invalid script type. Must be one of: ${validScriptTypes.join(
          ", "
        )}`
      );
    }

    const validErrorHandling = ["stop", "continue", "retry"];
    if (
      properties.errorHandling &&
      !validErrorHandling.includes(properties.errorHandling)
    ) {
      errors.push(
        `${stepLabel}: Invalid error handling. Must be one of: ${validErrorHandling.join(
          ", "
        )}`
      );
    }

    if (properties.errorHandling === "retry") {
      if (properties.retryAttempts !== undefined) {
        if (
          typeof properties.retryAttempts !== "number" ||
          properties.retryAttempts < 1 ||
          properties.retryAttempts > 10
        ) {
          errors.push(
            `${stepLabel}: Retry attempts must be a number between 1 and 10`
          );
        }
      }
    }

    return errors;
  },

  /**
   * Validate workflow transitions
   */
  validateTransitions(transitions, steps) {
    const errors = [];

    if (!Array.isArray(transitions)) {
      errors.push("Transitions must be an array");
      return errors;
    }

    const stepIds = new Set(steps.map((step) => step.id));
    const transitionIds = new Set();

    transitions.forEach((transition, index) => {
      const transitionLabel = `Transition ${index + 1}`;

      if (!transition.id || typeof transition.id !== "string") {
        errors.push(`${transitionLabel}: Transition ID is required`);
      } else {
        if (transitionIds.has(transition.id)) {
          errors.push(`Duplicate transition ID found: ${transition.id}`);
        }
        transitionIds.add(transition.id);
      }

      if (!transition.from || typeof transition.from !== "string") {
        errors.push(`${transitionLabel}: 'from' step ID is required`);
      } else if (!stepIds.has(transition.from)) {
        errors.push(
          `${transitionLabel}: 'from' step '${transition.from}' does not exist`
        );
      }

      if (!transition.to || typeof transition.to !== "string") {
        errors.push(`${transitionLabel}: 'to' step ID is required`);
      } else if (!stepIds.has(transition.to)) {
        errors.push(
          `${transitionLabel}: 'to' step '${transition.to}' does not exist`
        );
      }

      if (transition.from === transition.to) {
        errors.push(
          `${transitionLabel}: Transition cannot connect a step to itself`
        );
      }

      // Validate transition condition if present
      if (transition.condition) {
        errors.push(
          ...this.validateTransitionCondition(
            transition.condition,
            transitionLabel
          )
        );
      }

      // Validate other transition properties
      if (transition.delay !== undefined) {
        if (
          typeof transition.delay !== "number" ||
          transition.delay < 0 ||
          transition.delay > 3600
        ) {
          errors.push(
            `${transitionLabel}: Delay must be a number between 0 and 3600 seconds`
          );
        }
      }

      const validPriorities = ["low", "normal", "high"];
      if (
        transition.priority &&
        !validPriorities.includes(transition.priority)
      ) {
        errors.push(
          `${transitionLabel}: Invalid priority. Must be one of: ${validPriorities.join(
            ", "
          )}`
        );
      }
    });

    return errors;
  },

  /**
   * Validate transition condition
   */
  validateTransitionCondition(condition, transitionLabel) {
    const errors = [];

    if (!condition.rules || !Array.isArray(condition.rules)) {
      errors.push(`${transitionLabel}: Condition must have a rules array`);
      return errors;
    }

    if (condition.rules.length === 0) {
      errors.push(`${transitionLabel}: Condition must have at least one rule`);
      return errors;
    }

    const validOperators = ["and", "or"];
    if (condition.operator && !validOperators.includes(condition.operator)) {
      errors.push(
        `${transitionLabel}: Invalid condition operator. Must be 'and' or 'or'`
      );
    }

    condition.rules.forEach((rule, ruleIndex) => {
      errors.push(
        ...this.validateCondition(
          rule,
          `${transitionLabel} rule ${ruleIndex + 1}`
        )
      );
    });

    return errors;
  },

  /**
   * Validate workflow flow and connectivity
   */
  validateWorkflowFlow(definition) {
    const errors = [];
    const warnings = [];

    const steps = definition.steps || [];
    const transitions = definition.transitions || [];

    if (steps.length === 0) {
      return errors;
    }

    // Check for unreachable steps
    const startSteps = steps.filter((step) => step.isStart);
    const reachableSteps = new Set();

    if (startSteps.length > 0) {
      const queue = [...startSteps.map((step) => step.id)];

      while (queue.length > 0) {
        const currentStepId = queue.shift();
        if (reachableSteps.has(currentStepId)) continue;

        reachableSteps.add(currentStepId);

        const outgoingTransitions = transitions.filter(
          (t) => t.from === currentStepId
        );
        outgoingTransitions.forEach((transition) => {
          if (!reachableSteps.has(transition.to)) {
            queue.push(transition.to);
          }
        });
      }

      const unreachableSteps = steps.filter(
        (step) => !reachableSteps.has(step.id)
      );
      unreachableSteps.forEach((step) => {
        warnings.push(
          `Step '${step.name}' (${step.id}) is not reachable from any start step`
        );
      });
    }

    // Check for dead ends (steps with no outgoing transitions)
    const stepsWithOutgoing = new Set(transitions.map((t) => t.from));
    const deadEndSteps = steps.filter(
      (step) => !stepsWithOutgoing.has(step.id) && !step.isEnd
    );
    deadEndSteps.forEach((step) => {
      warnings.push(
        `Step '${step.name}' (${step.id}) has no outgoing transitions and is not marked as an end step`
      );
    });

    // Check for circular references
    const visited = new Set();
    const recursionStack = new Set();

    const detectCycle = (stepId) => {
      if (recursionStack.has(stepId)) {
        return true; // Cycle detected
      }
      if (visited.has(stepId)) {
        return false;
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const outgoingTransitions = transitions.filter((t) => t.from === stepId);
      for (const transition of outgoingTransitions) {
        if (detectCycle(transition.to)) {
          return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (detectCycle(step.id)) {
        errors.push(
          `Circular reference detected involving step '${step.name}' (${step.id})`
        );
        break;
      }
    }

    return errors;
  },

  /**
   * Get validation warnings (non-blocking issues)
   */
  getValidationWarnings(workflow) {
    const warnings = [];
    const definition = workflow.definition || {};
    const steps = definition.steps || [];
    const transitions = definition.transitions || [];

    // Check for missing descriptions
    if (!workflow.description || !workflow.description.trim()) {
      warnings.push(
        "Workflow description is recommended for better documentation"
      );
    }

    steps.forEach((step) => {
      if (!step.description || !step.description.trim()) {
        warnings.push(`Step '${step.name}' is missing a description`);
      }
    });

    // Check for condition steps without transitions
    const conditionSteps = steps.filter((step) => step.type === "condition");
    conditionSteps.forEach((step) => {
      const outgoingTransitions = transitions.filter((t) => t.from === step.id);
      if (outgoingTransitions.length < 2) {
        warnings.push(
          `Condition step '${step.name}' should typically have multiple outgoing transitions`
        );
      }
    });

    return warnings;
  },

  /**
   * Utility functions
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidUrl(url) {
    try {
      new URL(url);
      return url.startsWith("http://") || url.startsWith("https://");
    } catch {
      return false;
    }
  },

  /**
   * Process workflow before save to ensure proper structure
   */
  processWorkflowForSave(workflow) {
    const processed = JSON.parse(JSON.stringify(workflow)); // Deep clone

    // Ensure all steps have required fields
    if (processed.definition && processed.definition.steps) {
      processed.definition.steps = processed.definition.steps.map((step) => ({
        ...step,
        id:
          step.id ||
          `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        properties: step.properties || {},
        position: step.position || { x: 0, y: 0 },
        created_at: step.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    // Ensure all transitions have required fields
    if (processed.definition && processed.definition.transitions) {
      processed.definition.transitions = processed.definition.transitions.map(
        (transition) => ({
          ...transition,
          id:
            transition.id ||
            `transition_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`,
          created_at: transition.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      );
    }

    // Add workflow metadata
    processed.updated_at = new Date().toISOString();
    if (!processed.created_at) {
      processed.created_at = new Date().toISOString();
    }

    return processed;
  },
};

export default workflowValidationUtils;
