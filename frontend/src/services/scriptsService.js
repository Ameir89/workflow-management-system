// src/services/scriptsService.js - Updated with all methods
import { api } from "./authService";

export const scriptsService = {
  // Get all scripts with optional filtering
  async getScripts(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/scripts?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch scripts");
    }
  },

  // Get a single script by ID
  async getScript(id) {
    try {
      const response = await api.get(`/scripts/${id}`);
      return response.data.script;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch script");
    }
  },

  // Create a new script
  async createScript(scriptData) {
    try {
      const response = await api.post("/scripts", scriptData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to create script");
    }
  },

  // Update an existing script
  async updateScript(id, scriptData) {
    try {
      const response = await api.put(`/scripts/${id}`, scriptData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to update script");
    }
  },

  // Delete a script
  async deleteScript(id) {
    try {
      const response = await api.delete(`/scripts/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to delete script");
    }
  },

  // Test script execution
  async testScript(id, testData = {}) {
    try {
      const response = await api.post(`/scripts/${id}/test`, testData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to test script");
    }
  },

  // Validate script syntax
  async validateScript(scriptContent, language = "javascript") {
    try {
      const response = await api.post("/scripts/validate", {
        content: scriptContent,
        language,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to validate script"
      );
    }
  },

  // Get script categories
  async getScriptCategories() {
    try {
      const response = await api.get("/scripts/categories");
      return (
        response.data.categories || [
          { value: "condition", label: "Condition" },
          { value: "validation", label: "Validation" },
          { value: "transformation", label: "Data Transformation" },
          { value: "utility", label: "Utility" },
          { value: "integration", label: "Integration" },
          { value: "notification", label: "Notification" },
        ]
      );
    } catch (error) {
      // Return default categories if API fails
      return [
        { value: "condition", label: "Condition" },
        { value: "validation", label: "Validation" },
        { value: "transformation", label: "Data Transformation" },
        { value: "utility", label: "Utility" },
        { value: "integration", label: "Integration" },
        { value: "notification", label: "Notification" },
      ];
    }
  },

  // Get scripts by category (for dropdowns)
  async getScriptsByCategory(category) {
    try {
      const response = await api.get(`/scripts/category/${category}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch scripts by category"
      );
    }
  },

  // Get script templates
  async getScriptTemplates(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/scripts/templates?${queryParams}`);
      return response.data;
    } catch (error) {
      // Return mock templates if API fails
      const mockTemplates = [
        {
          id: 1,
          name: "Simple Data Validation",
          description: "Basic data validation template",
          language: "javascript",
          category: "validation",
          content: `// Simple data validation
function validate(data) {
  const errors = [];
  
  if (!data.email || !data.email.includes('@')) {
    errors.push('Invalid email address');
  }
  
  if (!data.name || data.name.length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

return validate(data);`,
          parameters: [
            {
              name: "data",
              type: "object",
              description: "Input data to validate",
              required: true,
              default_value: "{}",
            },
          ],
          tags: ["validation", "utility"],
          is_system: true,
          is_public: true,
          created_by_name: "System",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          name: "HTTP Request Handler",
          description: "Template for making HTTP requests",
          language: "javascript",
          category: "integration",
          content: `// HTTP Request Handler
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    const data = await response.json();
    return {
      success: true,
      data: data,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

return makeRequest(data.url, data.options);`,
          parameters: [
            {
              name: "url",
              type: "string",
              description: "The URL to make request to",
              required: true,
              default_value: "",
            },
            {
              name: "options",
              type: "object",
              description: "Request options (method, headers, body)",
              required: false,
              default_value: "{}",
            },
          ],
          tags: ["http", "integration", "api"],
          is_system: true,
          is_public: true,
          created_by_name: "System",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 3,
          name: "Data Processing Pipeline",
          description: "Template for processing data through multiple steps",
          language: "python",
          category: "transformation",
          content: `# Data Processing Pipeline
def process_data(input_data):
    """Process data through multiple transformation steps"""
    
    # Step 1: Clean data
    cleaned_data = clean_data(input_data)
    
    # Step 2: Transform data
    transformed_data = transform_data(cleaned_data)
    
    # Step 3: Validate results
    validation_result = validate_results(transformed_data)
    
    return {
        'processed_data': transformed_data,
        'validation': validation_result,
        'steps_completed': 3,
        'timestamp': datetime.now().isoformat()
    }

def clean_data(data):
    """Remove null values and normalize data"""
    if isinstance(data, list):
        return [item for item in data if item is not None]
    elif isinstance(data, dict):
        return {k: v for k, v in data.items() if v is not None}
    return data

def transform_data(data):
    """Apply transformations to data"""
    # Add your transformation logic here
    return data

def validate_results(data):
    """Validate processed results"""
    return {
        'valid': True,
        'errors': []
    }

# Main execution
result = process_data(data)
return result`,
          parameters: [
            {
              name: "data",
              type: "object",
              description: "Input data to process",
              required: true,
              default_value: "{}",
            },
          ],
          tags: ["processing", "transformation", "pipeline"],
          is_system: true,
          is_public: true,
          created_by_name: "System",
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      return { templates: mockTemplates };
    }
  },

  // Duplicate a script
  async duplicateScript(id, newName) {
    try {
      const response = await api.post(`/scripts/${id}/duplicate`, {
        name: newName,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to duplicate script"
      );
    }
  },

  // Get script execution history
  async getScriptExecutionHistory(id, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(
        `/scripts/${id}/executions?${queryParams}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error ||
          "Failed to fetch script execution history"
      );
    }
  },

  // Script Templates Management
  async createScriptTemplate(templateData) {
    try {
      const response = await api.post("/scripts/templates", templateData);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to create script template"
      );
    }
  },

  async updateScriptTemplate(id, templateData) {
    try {
      const response = await api.put(`/scripts/templates/${id}`, templateData);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update script template"
      );
    }
  },

  async deleteScriptTemplate(id) {
    try {
      const response = await api.delete(`/scripts/templates/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to delete script template"
      );
    }
  },

  async getScriptTemplate(id) {
    try {
      const response = await api.get(`/scripts/templates/${id}`);
      return response.data.template;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch script template"
      );
    }
  },

  // Script Analytics
  async getScriptAnalytics(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/scripts/analytics?${queryParams}`);
      return response.data;
    } catch (error) {
      // Return mock analytics data if API fails
      const mockAnalytics = {
        metrics: {
          total_executions: 1547,
          execution_change: 12.5,
          success_rate: 94.2,
          success_rate_change: -2.1,
          avg_duration_ms: 1250,
          duration_change: -8.3,
          active_scripts: 23,
          active_scripts_change: 4.5,
        },
        execution_trends: [
          { label: "Monday", value: "245", percentage: 85 },
          { label: "Tuesday", value: "312", percentage: 100 },
          { label: "Wednesday", value: "189", percentage: 60 },
          { label: "Thursday", value: "267", percentage: 75 },
          { label: "Friday", value: "298", percentage: 95 },
          { label: "Saturday", value: "134", percentage: 45 },
          { label: "Sunday", value: "102", percentage: 35 },
        ],
        error_types: [
          { label: "Timeout", value: "23", percentage: 45 },
          { label: "Syntax Error", value: "18", percentage: 35 },
          { label: "Runtime Error", value: "12", percentage: 25 },
          { label: "Permission Error", value: "8", percentage: 15 },
        ],
        category_performance: [
          { label: "Validation", value: "94.5%", percentage: 95 },
          { label: "Transformation", value: "91.2%", percentage: 91 },
          { label: "Integration", value: "89.7%", percentage: 90 },
          { label: "Utility", value: "96.8%", percentage: 97 },
        ],
        language_usage: [
          { label: "JavaScript", value: "45%", percentage: 45 },
          { label: "Python", value: "32%", percentage: 32 },
          { label: "SQL", value: "18%", percentage: 18 },
          { label: "Shell", value: "5%", percentage: 5 },
        ],
        top_scripts: [
          {
            id: 1,
            name: "User Data Validator",
            category: "validation",
            execution_count: 456,
            success_rate: 98.5,
            avg_duration_ms: 320,
            last_executed: "2024-06-19T10:30:00Z",
          },
          {
            id: 2,
            name: "Email Notification Sender",
            category: "notification",
            execution_count: 289,
            success_rate: 94.2,
            avg_duration_ms: 1200,
            last_executed: "2024-06-19T09:15:00Z",
          },
          {
            id: 3,
            name: "Data Transform Pipeline",
            category: "transformation",
            execution_count: 234,
            success_rate: 91.8,
            avg_duration_ms: 2300,
            last_executed: "2024-06-19T08:45:00Z",
          },
        ],
        resource_usage: {
          avg_memory_mb: 45.2,
          avg_cpu_percent: 12.8,
          concurrent_executions: 8,
        },
        insights: [
          {
            message:
              "Script execution volume has increased by 12.5% this period.",
            recommendation:
              "Consider optimizing frequently used scripts to reduce server load.",
          },
          {
            message: "Timeout errors have increased in integration scripts.",
            recommendation: "Review timeout settings for external API calls.",
          },
          {
            message:
              "JavaScript scripts show the highest success rate at 96.2%.",
            recommendation:
              "Consider migrating critical scripts to JavaScript for better reliability.",
          },
        ],
      };

      return mockAnalytics;
    }
  },

  // Script Performance Monitoring
  async getScriptPerformance(id, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(
        `/scripts/${id}/performance?${queryParams}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch script performance"
      );
    }
  },

  // Script Dependencies
  async getScriptDependencies(id) {
    try {
      const response = await api.get(`/scripts/${id}/dependencies`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch script dependencies"
      );
    }
  },

  async updateScriptDependencies(id, dependencies) {
    try {
      const response = await api.put(`/scripts/${id}/dependencies`, {
        dependencies,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update script dependencies"
      );
    }
  },

  // Script Versions
  async getScriptVersions(id, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/scripts/${id}/versions?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch script versions"
      );
    }
  },

  async createScriptVersion(id, versionData) {
    try {
      const response = await api.post(`/scripts/${id}/versions`, versionData);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to create script version"
      );
    }
  },

  async restoreScriptVersion(id, versionId) {
    try {
      const response = await api.post(
        `/scripts/${id}/versions/${versionId}/restore`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to restore script version"
      );
    }
  },

  // Script Scheduling
  async scheduleScript(id, scheduleData) {
    try {
      const response = await api.post(`/scripts/${id}/schedule`, scheduleData);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to schedule script"
      );
    }
  },

  async getScriptSchedules(id) {
    try {
      const response = await api.get(`/scripts/${id}/schedules`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch script schedules"
      );
    }
  },

  async updateScriptSchedule(id, scheduleId, scheduleData) {
    try {
      const response = await api.put(
        `/scripts/${id}/schedules/${scheduleId}`,
        scheduleData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update script schedule"
      );
    }
  },

  async deleteScriptSchedule(id, scheduleId) {
    try {
      const response = await api.delete(
        `/scripts/${id}/schedules/${scheduleId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to delete script schedule"
      );
    }
  },

  // Script Comments and Collaboration
  async getScriptComments(id, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/scripts/${id}/comments?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch script comments"
      );
    }
  },

  async addScriptComment(id, commentData) {
    try {
      const response = await api.post(`/scripts/${id}/comments`, commentData);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to add script comment"
      );
    }
  },

  async updateScriptComment(id, commentId, commentData) {
    try {
      const response = await api.put(
        `/scripts/${id}/comments/${commentId}`,
        commentData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update script comment"
      );
    }
  },

  async deleteScriptComment(id, commentId) {
    try {
      const response = await api.delete(`/scripts/${id}/comments/${commentId}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to delete script comment"
      );
    }
  },

  // Script Import/Export
  async exportScript(id, format = "json") {
    try {
      const response = await api.get(`/scripts/${id}/export`, {
        params: { format },
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to export script");
    }
  },

  async importScript(file, options = {}) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      Object.keys(options).forEach((key) => {
        formData.append(key, options[key]);
      });

      const response = await api.post("/scripts/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to import script");
    }
  },

  // Bulk operations
  async bulkDeleteScripts(scriptIds) {
    try {
      const response = await api.delete("/scripts/bulk", {
        data: { script_ids: scriptIds },
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to bulk delete scripts"
      );
    }
  },

  async bulkUpdateScripts(scriptIds, updateData) {
    try {
      const response = await api.put("/scripts/bulk", {
        script_ids: scriptIds,
        update_data: updateData,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to bulk update scripts"
      );
    }
  },

  async bulkExecuteScripts(scriptIds, executionData = {}) {
    try {
      const response = await api.post("/scripts/bulk-execute", {
        script_ids: scriptIds,
        execution_data: executionData,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to bulk execute scripts"
      );
    }
  },
};
