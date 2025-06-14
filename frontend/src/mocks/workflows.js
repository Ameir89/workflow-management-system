export const financialApprovalProcess = {
  name: "Financial Approval Process",
  description: "Multi-level approval process for financial expenditures",
  category: "Finance",
  tags: ["finance", "approval", "budget"],
  definition: {
    steps: [
      {
        id: "submit_request",
        name: "Submit Financial Request",
        type: "task",
        description: "Submit request for financial expenditure",
        isStart: true,
        position: { x: 100, y: 200 },
        properties: {
          formId: "financial-request-form",
          assignee: "{{initiator}}",
          dueHours: 48,
          instructions:
            "Provide detailed justification and supporting documents",
        },
      },
      {
        id: "budget_check",
        name: "Budget Availability Check",
        type: "automation",
        description: "Automatically check budget availability",
        position: { x: 300, y: 200 },
        properties: {
          script: "budget_system.check_availability",
          timeout: 60,
        },
      },
      {
        id: "supervisor_approval",
        name: "Supervisor Approval",
        type: "approval",
        description: "Direct supervisor approval for amounts under $5,000",
        position: { x: 500, y: 100 },
        properties: {
          approvers: ["{{initiator.supervisor}}"],
          approvalType: "any",
          dueHours: 24,
          condition: {
            field: "amount",
            operator: "less_than",
            value: 5000,
          },
        },
      },
      {
        id: "manager_approval",
        name: "Manager Approval",
        type: "approval",
        description: "Department manager approval for amounts $5,000-$25,000",
        position: { x: 500, y: 200 },
        properties: {
          approvers: ["{{initiator.department_manager}}"],
          approvalType: "any",
          dueHours: 48,
          condition: {
            field: "amount",
            operator: "between",
            value: [5000, 25000],
          },
        },
      },
      {
        id: "director_approval",
        name: "Director Approval",
        type: "approval",
        description: "Director approval for amounts $25,000-$100,000",
        position: { x: 500, y: 300 },
        properties: {
          approvers: ["{{initiator.director}}", "finance_director"],
          approvalType: "all",
          dueHours: 72,
          condition: {
            field: "amount",
            operator: "between",
            value: [25000, 100000],
          },
        },
      },
      {
        id: "executive_approval",
        name: "Executive Approval",
        type: "approval",
        description: "Executive team approval for amounts over $100,000",
        position: { x: 500, y: 400 },
        properties: {
          approvers: ["ceo", "cfo"],
          approvalType: "all",
          dueHours: 168,
          condition: {
            field: "amount",
            operator: "greater_than",
            value: 100000,
          },
        },
      },
      {
        id: "procurement",
        name: "Procurement Processing",
        type: "task",
        description: "Procurement team processes approved request",
        position: { x: 700, y: 200 },
        properties: {
          assignee: "procurement_team",
          dueHours: 72,
          instructions: "Process purchase order and vendor selection",
        },
      },
      {
        id: "budget_allocation",
        name: "Budget Allocation",
        type: "automation",
        description: "Allocate budget and update financial systems",
        position: { x: 900, y: 200 },
        properties: {
          script: "budget_system.allocate_funds",
          timeout: 300,
        },
      },
    ],
    transitions: [
      {
        id: "submit_to_budget_check",
        from: "submit_request",
        to: "budget_check",
      },
      {
        id: "budget_to_supervisor",
        from: "budget_check",
        to: "supervisor_approval",
        condition: {
          field: "budget_available",
          operator: "equals",
          value: true,
        },
      },
      {
        id: "budget_to_manager",
        from: "budget_check",
        to: "manager_approval",
        condition: {
          field: "budget_available",
          operator: "equals",
          value: true,
        },
      },
      {
        id: "budget_to_director",
        from: "budget_check",
        to: "director_approval",
        condition: {
          field: "budget_available",
          operator: "equals",
          value: true,
        },
      },
      {
        id: "budget_to_executive",
        from: "budget_check",
        to: "executive_approval",
        condition: {
          field: "budget_available",
          operator: "equals",
          value: true,
        },
      },
      {
        id: "supervisor_to_procurement",
        from: "supervisor_approval",
        to: "procurement",
        condition: {
          field: "supervisor_decision",
          operator: "equals",
          value: "approved",
        },
      },
      {
        id: "manager_to_procurement",
        from: "manager_approval",
        to: "procurement",
        condition: {
          field: "manager_decision",
          operator: "equals",
          value: "approved",
        },
      },
      {
        id: "director_to_procurement",
        from: "director_approval",
        to: "procurement",
        condition: {
          field: "director_decision",
          operator: "equals",
          value: "approved",
        },
      },
      {
        id: "executive_to_procurement",
        from: "executive_approval",
        to: "procurement",
        condition: {
          field: "executive_decision",
          operator: "equals",
          value: "approved",
        },
      },
      {
        id: "procurement_to_allocation",
        from: "procurement",
        to: "budget_allocation",
      },
    ],
  },
};

export const contractReviewAndApproval = {
  name: "Contract Review and Approval",
  description: "Legal and business review process for contracts",
  category: "Legal",
  tags: ["legal", "contract", "review"],
  definition: {
    steps: [
      {
        id: "contract_submission",
        name: "Contract Submission",
        type: "task",
        description: "Submit contract for review with supporting documents",
        isStart: true,
        position: { x: 100, y: 150 },
        properties: {
          formId: "contract-submission-form",
          assignee: "{{initiator}}",
          dueHours: 24,
          instructions: "Upload contract draft and provide business context",
        },
      },
      {
        id: "initial_review",
        name: "Initial Business Review",
        type: "task",
        description: "Business stakeholder reviews contract terms",
        position: { x: 300, y: 150 },
        properties: {
          assignee: "{{initiator.business_lead}}",
          dueHours: 48,
          instructions: "Review business terms, pricing, and scope",
        },
      },
      {
        id: "risk_assessment",
        name: "Risk Assessment",
        type: "task",
        description: "Risk management team assesses potential risks",
        position: { x: 500, y: 100 },
        properties: {
          assignee: "risk_management_team",
          dueHours: 72,
          instructions: "Evaluate financial, operational, and compliance risks",
        },
      },
      {
        id: "legal_review",
        name: "Legal Review",
        type: "task",
        description: "Legal team reviews contract for compliance and terms",
        position: { x: 500, y: 200 },
        properties: {
          assignee: "legal_team",
          dueHours: 120,
          instructions:
            "Review legal terms, liability, and regulatory compliance",
        },
      },
      {
        id: "finance_review",
        name: "Finance Review",
        type: "task",
        description: "Finance team reviews financial implications",
        position: { x: 500, y: 300 },
        properties: {
          assignee: "finance_team",
          dueHours: 48,
          instructions: "Review pricing, payment terms, and budget impact",
          condition: {
            field: "contract_value",
            operator: "greater_than",
            value: 50000,
          },
        },
      },
      {
        id: "stakeholder_approval",
        name: "Stakeholder Approval",
        type: "approval",
        description: "Final approval from relevant stakeholders",
        position: { x: 700, y: 150 },
        properties: {
          approvers: ["{{business_lead}}", "{{legal_lead}}"],
          approvalType: "all",
          dueHours: 48,
          escalationRules: [
            {
              level: 2,
              afterHours: 72,
              recipients: ["department_head"],
            },
          ],
        },
      },
      {
        id: "executive_approval",
        name: "Executive Approval",
        type: "approval",
        description: "Executive approval for high-value contracts",
        position: { x: 700, y: 50 },
        properties: {
          approvers: ["ceo", "cfo"],
          approvalType: "majority",
          dueHours: 168,
          condition: {
            field: "contract_value",
            operator: "greater_than",
            value: 500000,
          },
        },
      },
      {
        id: "contract_execution",
        name: "Contract Execution",
        type: "task",
        description: "Finalize and execute the approved contract",
        position: { x: 900, y: 150 },
        properties: {
          assignee: "{{initiator}}",
          dueHours: 72,
          instructions: "Coordinate final signatures and contract execution",
        },
      },
      {
        id: "contract_filing",
        name: "Contract Filing",
        type: "automation",
        description: "File executed contract in contract management system",
        position: { x: 1100, y: 150 },
        properties: {
          script: "contract_system.file_contract",
          timeout: 300,
        },
      },
    ],
    transitions: [
      {
        id: "submission_to_initial",
        from: "contract_submission",
        to: "initial_review",
      },
      {
        id: "initial_to_risk",
        from: "initial_review",
        to: "risk_assessment",
        condition: {
          field: "initial_approval",
          operator: "equals",
          value: "approved",
        },
      },
      {
        id: "initial_to_legal",
        from: "initial_review",
        to: "legal_review",
        condition: {
          field: "initial_approval",
          operator: "equals",
          value: "approved",
        },
      },
      {
        id: "initial_to_finance",
        from: "initial_review",
        to: "finance_review",
        condition: {
          field: "initial_approval",
          operator: "equals",
          value: "approved",
        },
      },
      {
        id: "reviews_to_stakeholder",
        from: "legal_review",
        to: "stakeholder_approval",
        condition: {
          field: "all_reviews_complete",
          operator: "equals",
          value: true,
        },
      },
      {
        id: "stakeholder_to_executive",
        from: "stakeholder_approval",
        to: "executive_approval",
        condition: {
          field: "stakeholder_decision",
          operator: "equals",
          value: "approved",
        },
      },
      {
        id: "stakeholder_to_execution",
        from: "stakeholder_approval",
        to: "contract_execution",
        condition: {
          field: "stakeholder_decision",
          operator: "equals",
          value: "approved",
        },
      },
      {
        id: "executive_to_execution",
        from: "executive_approval",
        to: "contract_execution",
        condition: {
          field: "executive_decision",
          operator: "equals",
          value: "approved",
        },
      },
      {
        id: "execution_to_filing",
        from: "contract_execution",
        to: "contract_filing",
      },
    ],
  },
};

export const workflowInitialData = {
  name: "",
  description: "",
  definition: {
    steps: [],
    transitions: [],
  },
};
