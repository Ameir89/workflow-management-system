// src/components/Scripts/ScriptEditor/RobustCodeEditor.js
import React, { useEffect, useRef, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import FallbackCodeEditor from "./FallbackCodeEditor";

const RobustCodeEditor = ({
  value,
  onChange,
  language = "javascript",
  validationErrors = [],
  height = 400,
  theme = "vs-dark",
  readOnly = false,
}) => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [monaco, setMonaco] = useState(null);

  // Language mapping for Monaco Editor
  const getMonacoLanguage = (lang) => {
    const languageMap = {
      javascript: "javascript",
      python: "python",
      sql: "sql",
      shell: "shell",
      bash: "shell",
    };
    return languageMap[lang] || "javascript";
  };

  // Clean up any existing AMD loader conflicts
  const cleanupAMDConflicts = () => {
    try {
      // Store existing globals
      const existingDefine = window.define;
      const existingRequire = window.require;

      // Clear conflicting globals
      if (window._amdLoaderGlobal) {
        delete window._amdLoaderGlobal;
      }

      return { existingDefine, existingRequire };
    } catch (error) {
      console.error("Error cleaning up AMD conflicts:", error);
      return {};
    }
  };

  // Load Monaco Editor with conflict resolution
  const loadMonaco = async () => {
    try {
      // Check if Monaco is already loaded
      if (window.monaco) {
        setMonaco(window.monaco);
        initializeEditor(window.monaco);
        return;
      }

      // Clean up potential conflicts
      cleanupAMDConflicts();

      // Create a unique script ID to avoid duplicate loading
      const scriptId = "monaco-loader-script";

      // Remove existing script if present
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }

      // Load Monaco loader script
      const script = document.createElement("script");
      script.id = scriptId;
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js";
      script.async = true;

      script.onload = () => {
        // Configure require.js with unique namespace
        const requireConfig = {
          paths: {
            vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs",
          },
          ignoreDuplicateModules: true,
        };

        // Use a timeout to ensure require is fully loaded
        setTimeout(() => {
          if (window.require) {
            try {
              window.require.config(requireConfig);
              window.require(
                ["vs/editor/editor.main"],
                (monaco) => {
                  window.monaco = monaco;
                  setMonaco(monaco);
                  initializeEditor(monaco);
                },
                (error) => {
                  console.error("Error loading Monaco main:", error);
                  setLoadingError(true);
                  setIsLoading(false);
                }
              );
            } catch (error) {
              console.error("Error configuring require:", error);
              setLoadingError(true);
              setIsLoading(false);
            }
          } else {
            console.error("require.js not available after loading");
            setLoadingError(true);
            setIsLoading(false);
          }
        }, 100);
      };

      script.onerror = () => {
        console.error("Failed to load Monaco loader script");
        setLoadingError(true);
        setIsLoading(false);
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error("Error in loadMonaco:", error);
      setLoadingError(true);
      setIsLoading(false);
    }
  };

  // Initialize Monaco Editor instance
  const initializeEditor = (monacoInstance) => {
    if (!monacoInstance || !containerRef.current || editorRef.current) return;

    try {
      // Define custom theme
      monacoInstance.editor.defineTheme("vs-dark-custom", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "6A9955" },
          { token: "keyword", foreground: "569CD6" },
          { token: "string", foreground: "CE9178" },
          { token: "number", foreground: "B5CEA8" },
          { token: "type", foreground: "4EC9B0" },
          { token: "function", foreground: "DCDCAA" },
        ],
        colors: {
          "editor.background": "#1E1E1E",
          "editor.foreground": "#D4D4D4",
          "editor.lineHighlightBackground": "#2A2D2E",
          "editor.selectionBackground": "#264F78",
          "editor.cursor": "#AEAFAD",
        },
      });

      // Create editor
      editorRef.current = monacoInstance.editor.create(containerRef.current, {
        value: value || "",
        language: getMonacoLanguage(language),
        theme: theme === "vs-dark" ? "vs-dark-custom" : theme,
        automaticLayout: true,
        minimap: { enabled: window.innerWidth > 1024 }, // Disable minimap on smaller screens
        scrollBeyondLastLine: false,
        wordWrap: "on",
        lineNumbers: "on",
        renderLineHighlight: "all",
        selectOnLineNumbers: true,
        matchBrackets: "always",
        autoClosingBrackets: "always",
        autoClosingQuotes: "always",
        autoIndent: "advanced",
        formatOnPaste: true,
        formatOnType: true,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnCommitCharacter: true,
        acceptSuggestionOnEnter: "on",
        tabCompletion: "on",
        readOnly: readOnly,
        fontSize: 14,
        fontFamily:
          "'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
        fontLigatures: true,
        contextmenu: true,
        mouseWheelZoom: true,
        smoothScrolling: true,
      });

      // Handle content changes
      editorRef.current.onDidChangeModelContent(() => {
        const currentValue = editorRef.current.getValue();
        if (onChange) {
          onChange(currentValue);
        }
      });

      // Add save command
      editorRef.current.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
        () => {
          const saveEvent = new CustomEvent("editorSave", {
            detail: { value: editorRef.current.getValue() },
          });
          window.dispatchEvent(saveEvent);
        }
      );

      // Set validation errors
      if (validationErrors.length > 0) {
        const model = editorRef.current.getModel();
        const markers = validationErrors.map((error, index) => ({
          severity: monacoInstance.MarkerSeverity.Error,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
          message: error,
        }));
        monacoInstance.editor.setModelMarkers(model, "validation", markers);
      }

      setIsEditorReady(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to initialize Monaco Editor:", error);
      setLoadingError(true);
      setIsLoading(false);
    }
  };

  // Load Monaco on component mount
  useEffect(() => {
    loadMonaco();

    // Cleanup
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  // Update editor when language changes
  useEffect(() => {
    if (editorRef.current && isEditorReady && monaco) {
      const model = editorRef.current.getModel();
      monaco.editor.setModelLanguage(model, getMonacoLanguage(language));
    }
  }, [language, isEditorReady, monaco]);

  // Update editor value when prop changes
  useEffect(() => {
    if (
      editorRef.current &&
      isEditorReady &&
      value !== editorRef.current.getValue()
    ) {
      editorRef.current.setValue(value || "");
    }
  }, [value, isEditorReady]);

  // Update validation errors
  useEffect(() => {
    if (editorRef.current && isEditorReady && monaco) {
      const model = editorRef.current.getModel();
      if (validationErrors.length > 0) {
        const markers = validationErrors.map((error, index) => ({
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
          message: error,
        }));
        monaco.editor.setModelMarkers(model, "validation", markers);
      } else {
        monaco.editor.setModelMarkers(model, "validation", []);
      }
    }
  }, [validationErrors, isEditorReady, monaco]);

  // If Monaco failed to load, use fallback editor
  if (loadingError) {
    return (
      <FallbackCodeEditor
        value={value}
        onChange={onChange}
        language={language}
        validationErrors={validationErrors}
        height={height}
        theme={theme}
        readOnly={readOnly}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-900 text-white rounded-lg border"
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm">Loading Monaco Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="rounded-lg border border-gray-300 overflow-hidden"
        style={{ height: `${height}px` }}
      />

      {/* Validation Errors Overlay */}
      {validationErrors.length > 0 && (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs flex items-center">
          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
          {validationErrors.length} error
          {validationErrors.length > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
};

export default RobustCodeEditor;
