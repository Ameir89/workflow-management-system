import React, { useState, forwardRef } from "react";
import { CalendarIcon } from "@heroicons/react/24/outline";

const DatePicker = forwardRef(
  (
    {
      value,
      onChange,
      placeholder = "Select date",
      disabled = false,
      className = "",
      showTimeSelect = false,
      timeFormat = "HH:mm",
      timeIntervals = 15,
      dateFormat = "yyyy-MM-dd",
      minDate = null,
      maxDate = null,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);

    // Format date for input value
    const formatDateForInput = (date) => {
      if (!date) return "";

      const d = new Date(date);
      if (isNaN(d.getTime())) return "";

      if (showTimeSelect) {
        // Format as datetime-local input format
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      } else {
        // Format as date input format
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    };

    // Handle input change
    const handleInputChange = (e) => {
      const inputValue = e.target.value;
      if (!inputValue) {
        onChange(null);
        return;
      }

      const date = new Date(inputValue);
      if (!isNaN(date.getTime())) {
        onChange(date);
      }
    };

    // Format min/max dates for input
    const formatMinMaxDate = (date) => {
      if (!date) return undefined;
      const d = new Date(date);
      if (isNaN(d.getTime())) return undefined;
      return formatDateForInput(d);
    };

    const inputType = showTimeSelect ? "datetime-local" : "date";
    const inputValue = formatDateForInput(value);

    return (
      <div className="relative">
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            min={formatMinMaxDate(minDate)}
            max={formatMinMaxDate(maxDate)}
            className={`
            form-input pr-10
            ${className}
            ${disabled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
          `}
            {...props}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";

export default DatePicker;
