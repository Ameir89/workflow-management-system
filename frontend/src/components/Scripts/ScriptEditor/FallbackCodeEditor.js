// src/components/Scripts/ScriptEditor/FallbackCodeEditor.js
import React, { useRef, useEffect } from "react";

const FallbackCodeEditor = ({
  value,
  onChange,
  language = "javascript",
  validationErrors = [],
  height = 400,
  theme = "vs-dark",
  readOnly = false,
}) => {
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  // Handle tab key for indentation
  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const spaces = "  "; // 2 spaces for indentation

      const newValue =
        value.substring(0, start) + spaces + value.substring(end);
      onChange(newValue);

      // Set cursor position after the inserted spaces
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + spaces.length;
      }, 0);
    }
  };

  // Handle Ctrl+S for save
  const handleKeyDownSave = (e) => {
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      const saveEvent = new CustomEvent("editorSave", {
        detail: { value: value },
      });
      window.dispatchEvent(saveEvent);
    }
  };

  const getLanguageClass = () => {
    const themeClasses = {
      "vs-dark": "bg-gray-900 text-green-400",
      vs: "bg-white text-gray-900",
      "hc-black": "bg-black text-white",
    };
    return themeClasses[theme] || themeClasses["vs-dark"];
  };

  return (
    <div className="relative">
      <div className="rounded-lg border border-gray-300 overflow-hidden">
        {/* Simple header bar */}
        <div
          className={`px-4 py-2 text-xs font-medium border-b ${
            theme === "vs-dark"
              ? "bg-gray-800 text-gray-300 border-gray-700"
              : "bg-gray-100 text-gray-700 border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="capitalize">{language}</span>
            <span className="text-xs opacity-75">
              {value?.length || 0} characters
            </span>
          </div>
        </div>

        {/* Code textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              handleKeyDown(e);
              handleKeyDownSave(e);
            }}
            readOnly={readOnly}
            className={`
              w-full p-4 resize-none outline-none font-mono text-sm leading-relaxed
              ${getLanguageClass()}
              ${readOnly ? "cursor-not-allowed" : ""}
            `}
            style={{
              minHeight: `${height}px`,
              maxHeight: `${height * 2}px`,
            }}
            placeholder={`Write your ${language} code here...`}
            spellCheck={false}
          />

          {/* Line numbers overlay (simple version) */}
          <div
            className={`absolute left-0 top-0 p-4 pr-2 text-xs leading-relaxed pointer-events-none select-none font-mono ${
              theme === "vs-dark" ? "text-gray-500" : "text-gray-400"
            }`}
          >
            {value?.split("\n").map((_, index) => (
              <div key={index} className="whitespace-pre">
                {String(index + 1).padStart(2, " ")}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Validation errors indicator */}
      {validationErrors.length > 0 && (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs">
          {validationErrors.length} error
          {validationErrors.length > 1 ? "s" : ""}
        </div>
      )}

      {/* Simple status bar */}
      <div
        className={`px-4 py-2 text-xs border-t ${
          theme === "vs-dark"
            ? "bg-gray-800 text-gray-400 border-gray-700"
            : "bg-gray-100 text-gray-600 border-gray-300"
        }`}
      >
        <div className="flex items-center justify-between">
          <span>Lines: {value?.split("\n").length || 1}</span>
          <span>Tab size: 2</span>
        </div>
      </div>
    </div>
  );
};

export default FallbackCodeEditor;
