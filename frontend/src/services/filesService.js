import { api } from "./authService";

export const filesService = {
  async uploadFile(file, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append("file", file);

      Object.keys(metadata).forEach((key) => {
        formData.append(key, metadata[key]);
      });

      const response = await api.post("/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to upload file");
    }
  },

  async getFiles(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/files?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch files");
    }
  },

  async getFile(id) {
    try {
      const response = await api.get(`/files/${id}`);
      return response.data.file;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch file");
    }
  },

  async downloadFile(id, filename) {
    try {
      const response = await api.get(`/files/${id}/download`, {
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to download file");
    }
  },

  async updateFile(id, metadata) {
    try {
      const response = await api.put(`/files/${id}`, metadata);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to update file");
    }
  },

  async deleteFile(id) {
    try {
      const response = await api.delete(`/files/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to delete file");
    }
  },

  async getFileStats() {
    try {
      const response = await api.get("/files/stats");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch file stats"
      );
    }
  },
};
