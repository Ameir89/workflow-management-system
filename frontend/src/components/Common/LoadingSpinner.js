import React from "react";

const LoadingSpinner = ({
  size = "default",
  color = "indigo",
  text = null,
  className = "",
  fullScreen = false,
}) => {
  const getSizeClasses = (size) => {
    const sizeMap = {
      sm: "h-4 w-4",
      default: "h-8 w-8",
      lg: "h-12 w-12",
      xl: "h-16 w-16",
    };
    return sizeMap[size] || sizeMap.default;
  };

  const getColorClasses = (color) => {
    const colorMap = {
      indigo: "border-indigo-600",
      blue: "border-blue-600",
      green: "border-green-600",
      red: "border-red-600",
      yellow: "border-yellow-600",
      purple: "border-purple-600",
      gray: "border-gray-600",
      white: "border-white",
    };
    return colorMap[color] || colorMap.indigo;
  };

  const spinnerClasses = `
    animate-spin rounded-full border-2 border-gray-200 border-t-transparent
    ${getSizeClasses(size)}
    ${getColorClasses(color)}
    ${className}
  `;

  const Spinner = () => (
    <div className={spinnerClasses} role="status" aria-label="Loading">
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-75">
        <div className="text-center">
          <Spinner />
          {text && <p className="mt-4 text-sm text-gray-600">{text}</p>}
        </div>
      </div>
    );
  }

  if (text) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3">
        <Spinner />
        <p className="text-sm text-gray-600">{text}</p>
      </div>
    );
  }

  return <Spinner />;
};

// Preset loading states for common use cases
export const PageLoader = ({ text = "Loading page..." }) => (
  <LoadingSpinner size="lg" text={text} fullScreen />
);

export const ButtonLoader = ({ text = "Loading..." }) => (
  <div className="flex items-center space-x-2">
    <LoadingSpinner size="sm" color="white" />
    <span>{text}</span>
  </div>
);

export const InlineLoader = ({ text = "Loading..." }) => (
  <div className="flex items-center space-x-2">
    <LoadingSpinner size="sm" />
    <span className="text-sm text-gray-600">{text}</span>
  </div>
);

export const CardLoader = () => (
  <div className="flex items-center justify-center h-32">
    <LoadingSpinner size="default" />
  </div>
);

export default LoadingSpinner;
