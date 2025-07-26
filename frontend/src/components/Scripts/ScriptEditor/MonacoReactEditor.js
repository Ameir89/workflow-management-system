/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-template-curly-in-string */
import React, { useState, useRef, useEffect } from "react";
import Editor, { loader } from "@monaco-editor/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

// Configure Monaco loader to use CDN
loader.config({
  urls: {
    monacoLoader:
      "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js",
    monacoBase:
      "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs",
  },
});

const MonacoReactEditor = ({
  value,
  onChange,
  language = "javascript",
  validationErrors = [],
  height = 400,
  theme = "vs-dark",
  readOnly = false,
  onMount,
  onError,
}) => {
  const editorRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

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

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    setIsReady(true);

    try {
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

      if (theme === "vs-dark") {
        monaco.editor.setTheme("vs-dark-custom");
      }
    } catch (error) {
      console.warn("Failed to set custom theme:", error);
    }

    try {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        const saveEvent = new CustomEvent("editorSave", {
          detail: { value: editor.getValue() },
        });
        window.dispatchEvent(saveEvent);
      });
    } catch (error) {
      console.warn("Failed to add save command:", error);
    }

    setupLanguageFeatures(monaco, getMonacoLanguage(language));
    updateValidationErrors(editor, monaco);

    if (onMount) {
      onMount(editor, monaco);
    }
  };

  const setupLanguageFeatures = (monaco, monacoLanguage) => {
    try {
      monaco.languages.registerCompletionItemProvider(monacoLanguage, {
        provideCompletionItems: () => ({
          suggestions: getLanguageSnippets(language, monaco),
        }),
      });
    } catch (error) {
      console.warn("Failed to register completion provider:", error);
    }
  };

  const getLanguageSnippets = (lang, monaco) => {
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
        {
          label: "arrow function",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "const ${1:name} = (${2:params}) => {\n\t${3:// body}\n}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Arrow function",
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
        {
          label: "class",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText:
            "class ${1:ClassName}:\n\tdef __init__(self${2:, params}):\n\t\t${3:pass}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Class definition",
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
        {
          label: "INSERT",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText:
            "INSERT INTO ${1:table} (${2:columns})\nVALUES (${3:values});",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "INSERT statement",
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
        {
          label: "for",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "for ${1:var} in ${2:list}; do\n\t${3:# commands}\ndone",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "For loop",
        },
      ],
    };

    return snippets[lang] || [];
  };

  const updateValidationErrors = (editor, monaco) => {
    if (!editor || !monaco) return;

    try {
      const model = editor.getModel();
      if (!model) return;

      const markers = validationErrors.length
        ? validationErrors.map((error) => ({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
            message: error,
          }))
        : [];

      monaco.editor.setModelMarkers(model, "validation", markers);
    } catch (error) {
      console.warn("Failed to update validation markers:", error);
    }
  };

  useEffect(() => {
    if (editorRef.current && isReady) {
      loader.init().then((monaco) => {
        updateValidationErrors(editorRef.current, monaco);
      });
    }
  }, [validationErrors, isReady]);

  const handleChange = (newValue) => {
    if (onChange) onChange(newValue || "");
  };

  const editorOptions = {
    automaticLayout: true,
    minimap: { enabled: window.innerWidth > 1024 },
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
    readOnly,
    fontSize: 14,
    fontFamily: "'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
    fontLigatures: true,
    contextmenu: true,
    mouseWheelZoom: true,
    smoothScrolling: true,
    glyphMargin: true,
    folding: true,
    foldingStrategy: "indentation",
    showFoldingControls: "always",
    quickSuggestions: true,
    quickSuggestionsDelay: 100,
    parameterHints: { enabled: true },
    hover: { enabled: true },
  };

  return (
    <div className="relative">
      <div className="rounded-lg border border-gray-300 overflow-hidden">
        <Editor
          height={height}
          language={getMonacoLanguage(language)}
          value={value || ""}
          theme={theme === "vs-dark" ? "vs-dark-custom" : theme}
          options={editorOptions}
          onChange={handleChange}
          onMount={handleEditorMount}
          loading={
            <div className="flex items-center justify-center h-full bg-gray-900 text-white">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm">Loading Monaco Editor...</p>
              </div>
            </div>
          }
        />
      </div>

      {validationErrors.length > 0 && (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs flex items-center z-10">
          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
          {validationErrors.length} error
          {validationErrors.length > 1 ? "s" : ""}
        </div>
      )}

      {isReady && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white bg-opacity-75 px-2 py-1 rounded z-10">
          Monaco Ready
        </div>
      )}
    </div>
  );
};

export default MonacoReactEditor;
