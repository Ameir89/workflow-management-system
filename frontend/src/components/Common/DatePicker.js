import React, { forwardRef } from "react";

const DatePicker = forwardRef(
  (
    {
      value,
      onChange,
      disabled = false,
      placeholder = "",
      className = "",
      showTimeSelect = false,
      timeFormat = "HH:mm",
      timeIntervals = 15,
      dateFormat = "yyyy-MM-dd",
      ...props
    },
    ref
  ) => {
    const handleChange = (e) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    // Convert dateFormat to HTML input type
    const inputType = showTimeSelect ? "datetime-local" : "date";

    // Format the value for HTML input
    const formatValue = (val) => {
      if (!val) return "";

      try {
        const date = new Date(val);
        if (isNaN(date.getTime())) return "";

        if (showTimeSelect) {
          // For datetime-local input, format as YYYY-MM-DDTHH:MM
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        } else {
          // For date input, format as YYYY-MM-DD
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        }
      } catch (error) {
        return "";
      }
    };

    const formattedValue = formatValue(value);

    return (
      <input
        ref={ref}
        type={inputType}
        value={formattedValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`form-input ${className}`}
        {...props}
      />
    );
  }
);

DatePicker.displayName = "DatePicker";

export default DatePicker;
