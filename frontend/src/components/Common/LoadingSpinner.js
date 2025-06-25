import React from "react";

const LoadingSpinner = ({
  size = "md",
  color = "indigo",
  fullScreen = false,
  text = null,
  className = "",
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  const colorClasses = {
    indigo: "border-indigo-600",
    blue: "border-blue-600",
    green: "border-green-600",
    red: "border-red-600",
    yellow: "border-yellow-600",
    gray: "border-gray-600",
    white: "border-white",
  };

  const spinnerClasses = `
    animate-spin rounded-full border-2 border-gray-300 ${colorClasses[color]} ${sizeClasses[size]}
  `.trim();

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={spinnerClasses}
        style={{ borderTopColor: "transparent" }}
      />
      {text && (
        <p className="mt-2 text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
