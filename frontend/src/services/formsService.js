import { api } from "./authService";

export const formsService = {
  async getForms(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/forms?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch forms");
    }
  },

  async getForm(id) {
    try {
      const response = await api.get(`/forms/${id}`);
      return response.data.form;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch form");
    }
  },

  async createForm(formData) {
    try {
      const response = await api.post("/forms", formData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to create form");
    }
  },

  async updateForm(id, formData) {
    try {
      const response = await api.put(`/forms/${id}`, formData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to update form");
    }
  },

  async deleteForm(id) {
    try {
      const response = await api.delete(`/forms/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to delete form");
    }
  },

  async getFormResponses(id, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/forms/${id}/responses?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch form responses"
      );
    }
  },
};
