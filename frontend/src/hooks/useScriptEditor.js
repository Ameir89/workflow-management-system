// src/hooks/useScriptEditor.js - Updated to handle editor save events
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "react-query";
import { scriptsService } from "../services/scriptsService";
import { toast } from "react-toastify"; //

const initialScript = {
  name: "",
  description: "",
  content: "",
  language: "javascript",
  category: "",
  status: "active",
  tags: [],
  parameters: [],
};

export const useScriptEditor = (scriptId, isEditing) => {
  const [script, setScript] = useState(initialScript);
  const [validationErrors, setValidationErrors] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch existing script for editing
  const { data: existingScript, isLoading: isLoadingScript } = useQuery(
    ["script", scriptId],
    () => scriptsService.getScript(scriptId),
    {
      enabled: isEditing && Boolean(scriptId),
      onSuccess: (data) => {
        // Map API response to component state
        const mappedScript = {
          name: data.name || "",
          description: data.description || "",
          content: data.script_content || "", // Map script_content to content
          language: data.script_type || "javascript", // Map script_type to language
          category: data.category || "",
          status: data.is_active ? "active" : "inactive", // Map is_active to status
          tags: data.tags ? (Array.isArray(data.tags) ? data.tags : []) : [],
          parameters: data.parameters || [],
        };
        setScript(mappedScript);
        setHasUnsavedChanges(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Fetch categories
  const { data: categories, isLoading: isLoadingCategories } = useQuery(
    "scriptCategories",
    scriptsService.getScriptCategories,
    {
      onError: (error) => {
        console.error("Failed to fetch categories:", error);
      },
    }
  );

  // Fetch templates
  const { data: templates, isLoading: isLoadingTemplates } = useQuery(
    "scriptTemplates",
    () => scriptsService.getScriptTemplates(),
    {
      onError: (error) => {
        console.error("Failed to fetch templates:", error);
      },
    }
  );

  // Save script mutation
  const saveScriptMutation = useMutation(
    (scriptData) => {
      // Map component state to API format
      const apiPayload = {
        name: scriptData.name,
        description: scriptData.description,
        script_content: scriptData.content, // Map content to script_content
        script_type: scriptData.language, // Map language to script_type
        category: scriptData.category,
        is_active: scriptData.status === "active", // Map status to is_active
        tags: scriptData.tags,
        parameters: scriptData.parameters,
      };

      if (isEditing) {
        return scriptsService.updateScript(scriptId, apiPayload);
      } else {
        return scriptsService.createScript(apiPayload);
      }
    },
    {
      onSuccess: (data) => {
        toast.success(
          isEditing
            ? "Script updated successfully"
            : "Script created successfully"
        );
        setHasUnsavedChanges(false);
        setValidationErrors([]);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Validate script mutation
  const validateScriptMutation = useMutation(
    () => scriptsService.validateScript(script.content, script.language),
    {
      onSuccess: (data) => {
        if (data.valid) {
          toast.success("Script validation passed");
          setValidationErrors([]);
        } else {
          setValidationErrors(data.errors || []);
          toast.error("Script validation failed");
        }
      },
      onError: (error) => {
        toast.error(error.message);
        setValidationErrors([error.message]);
      },
    }
  );

  // Handle script changes
  const handleScriptChange = (field, value) => {
    setScript((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasUnsavedChanges(true);
  };

  // Handle tags change
  const handleTagsChange = (tagsString) => {
    const tags = tagsString
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    handleScriptChange("tags", tags);
  };

  // Handle save
  const handleSave = async () => {
    try {
      const result = await saveScriptMutation.mutateAsync(script);
      return result;
    } catch (error) {
      console.error("Save failed:", error);
      return null;
    }
  };

  // Handle validation
  const handleValidate = () => {
    if (!script.content.trim()) {
      toast.error("No script content to validate");
      return;
    }
    validateScriptMutation.mutate();
  };

  // Handle template selection
  const handleTemplateSelect = (template) => {
    setScript((prev) => ({
      ...prev,
      content: template.script_content || template.content || "",
      language: template.script_type || template.language || prev.language,
      category: template.category || prev.category,
      name: prev.name || template.name || "",
      description: prev.description || template.description || "",
    }));
    setHasUnsavedChanges(true);
  };

  // Clear unsaved changes
  const clearUnsavedChanges = () => {
    setHasUnsavedChanges(false);
  };

  // Handle editor save events (Ctrl+S from Monaco Editor)
  useEffect(() => {
    const handleEditorSave = (event) => {
      handleSave();
    };

    window.addEventListener("editorSave", handleEditorSave);
    return () => {
      window.removeEventListener("editorSave", handleEditorSave);
    };
  }, [script]); // Re-attach listener when script changes

  // Loading state
  const isLoading =
    isLoadingScript || isLoadingCategories || isLoadingTemplates;

  return {
    script,
    validationErrors,
    hasUnsavedChanges,
    isLoading,
    existingScript,
    categories: categories || [],
    templates: templates?.templates || [],
    saveScriptMutation,
    validateScriptMutation,
    handleScriptChange,
    handleSave,
    handleValidate,
    handleTemplateSelect,
    handleTagsChange,
    clearUnsavedChanges,
  };
};
