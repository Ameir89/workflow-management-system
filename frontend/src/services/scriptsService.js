// src/services/scriptsService.js - Updated to handle API response structure
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

  // Get a single script by ID - returns the script object directly
  async getScript(id) {
    try {
      const response = await api.get(`/scripts/${id}`);
      return response.data.script; // Return the script object directly
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
        script_content: scriptContent, // Use script_content instead of content
        script_type: language, // Use script_type instead of language
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to validate script"
      );
    }
  },

  // Get script categories - return as array of strings or objects
  async getScriptCategories() {
    try {
      const response = await api.get("/scripts/categories");
      // Handle both array of strings and array of objects
      const categories = response.data.categories || response.data;
      return Array.isArray(categories) ? categories : [];
    } catch (error) {
      // Return default categories if API call fails
      console.warn("Failed to fetch script categories:", error);
      return [
        { category: "processing" },
        { category: "validation" },
        { category: "utility" },
        { category: "automation" },
      ];
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

  // Get script templates
  async getScriptTemplates(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/scripts/templates?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch script templates"
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

  // Script Analytics
  async getScriptAnalytics(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/scripts/analytics?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch script analytics"
      );
    }
  },
};
