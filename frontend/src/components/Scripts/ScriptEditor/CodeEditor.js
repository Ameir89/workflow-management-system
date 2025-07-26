// src/components/Scripts/ScriptEditor/CodeEditor.js
import React, { useEffect, useRef, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import FallbackCodeEditor from "./FallbackCodeEditor";
import { monacoEditorService } from "../../../services/monacoEditorService";

// Monaco Editor instance will be managed by the service
let monaco = null;

const CodeEditor = ({
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

  // Load Monaco Editor using the service
  useEffect(() => {
    const loadMonaco = async () => {
      try {
        monaco = await monacoEditorService.getMonaco();
        initializeEditor();
      } catch (error) {
        console.error("Failed to load Monaco Editor:", error);
        setLoadingError(true);
        setIsLoading(false);
      }
    };

    loadMonaco();

    // Cleanup
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  const initializeEditor = () => {
    if (!monaco || !containerRef.current || editorRef.current) return;

    try {
      // Configure Monaco Editor themes
      if (!monaco.editor._themeService?.getTheme("vs-dark-custom")) {
        monaco.editor.defineTheme("vs-dark-custom", {
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
      }

      // Create editor instance
      editorRef.current = monaco.editor.create(containerRef.current, {
        value: value || "",
        language: getMonacoLanguage(language),
        theme: theme === "vs-dark" ? "vs-dark-custom" : theme,
        automaticLayout: true,
        minimap: { enabled: true },
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
      });

      // Handle content changes
      editorRef.current.onDidChangeModelContent(() => {
        const currentValue = editorRef.current.getValue();
        if (onChange) {
          onChange(currentValue);
        }
      });

      // Add custom key bindings
      editorRef.current.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
          // Trigger save (you can emit a custom event or call a callback)
          const saveEvent = new CustomEvent("editorSave", {
            detail: { value: editorRef.current.getValue() },
          });
          window.dispatchEvent(saveEvent);
        }
      );

      // Set up language-specific features
      setupLanguageFeatures();

      setIsEditorReady(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to initialize Monaco Editor:", error);
      setLoadingError(true);
      setIsLoading(false);
    }
  };

  const setupLanguageFeatures = () => {
    if (!monaco) return;

    const monacoLang = getMonacoLanguage(language);

    // Add custom snippets and completions based on language
    monaco.languages.registerCompletionItemProvider(monacoLang, {
      provideCompletionItems: (model, position) => {
        const suggestions = getLanguageSnippets(language);
        return { suggestions };
      },
    });

    // Add validation markers for errors
    if (validationErrors.length > 0) {
      const model = editorRef.current.getModel();
      const markers = validationErrors.map((error, index) => ({
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
        message: error,
      }));
      monaco.editor.setModelMarkers(model, "validation", markers);
    }
  };

  const getLanguageSnippets = (lang) => {
    const snippets = {
      javascript: [
        {
          label: "function",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "function ${1:name}(${2:params}) {\n\t${3:// body}\n}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Function declaration",
        },
        {
          label: "console.log",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "console.log(${1:value});",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Log to console",
        },
      ],
      python: [
        {
          label: "def",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "def ${1:function_name}(${2:params}):\n\t${3:pass}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Function definition",
        },
        {
          label: "print",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "print(${1:value})",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Print statement",
        },
      ],
      sql: [
        {
          label: "SELECT",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText:
            "SELECT ${1:columns}\nFROM ${2:table}\nWHERE ${3:condition};",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "SELECT statement",
        },
      ],
      shell: [
        {
          label: "if",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "if [ ${1:condition} ]; then\n\t${2:# commands}\nfi",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "If statement",
        },
      ],
    };

    return snippets[lang] || [];
  };

  // Update editor when language changes
  useEffect(() => {
    if (editorRef.current && isEditorReady) {
      const model = editorRef.current.getModel();
      monaco.editor.setModelLanguage(model, getMonacoLanguage(language));
      setupLanguageFeatures();
    }
  }, [language, validationErrors]);

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

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-900 text-white rounded-lg border"
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm">Loading editor...</p>
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

export default CodeEditor;
