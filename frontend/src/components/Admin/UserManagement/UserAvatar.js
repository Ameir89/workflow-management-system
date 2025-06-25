// src/components/Admin/UserManagement/UserAvatar.js
import React from "react";

const UserAvatar = ({ firstName, lastName, size = "md", imageUrl = null }) => {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
  };

  const getInitials = () => {
    const firstInitial = firstName?.charAt(0)?.toUpperCase() || "";
    const lastInitial = lastName?.charAt(0)?.toUpperCase() || "";
    return firstInitial + lastInitial;
  };

  const getGradientColor = () => {
    // Generate consistent gradient based on name
    const name = `${firstName}${lastName}`.toLowerCase();
    const gradients = [
      "from-indigo-500 to-purple-600",
      "from-blue-500 to-cyan-600",
      "from-green-500 to-teal-600",
      "from-yellow-500 to-orange-600",
      "from-pink-500 to-rose-600",
      "from-purple-500 to-indigo-600",
      "from-cyan-500 to-blue-600",
      "from-teal-500 to-green-600",
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return gradients[Math.abs(hash) % gradients.length];
  };

  if (imageUrl) {
    return (
      <div className={`${sizeClasses[size]} flex-shrink-0`}>
        <img
          className={`${sizeClasses[size]} rounded-full object-cover shadow-md`}
          src={imageUrl}
          alt={`${firstName} ${lastName}`}
          onError={(e) => {
            // Fallback to initials if image fails to load
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
        />
        <div
          className={`${
            sizeClasses[size]
          } rounded-full bg-gradient-to-br ${getGradientColor()} flex items-center justify-center shadow-md hidden`}
        >
          <span className="font-medium text-white">{getInitials()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} flex-shrink-0`}>
      <div
        className={`${
          sizeClasses[size]
        } rounded-full bg-gradient-to-br ${getGradientColor()} flex items-center justify-center shadow-md`}
      >
        <span className="font-medium text-white">{getInitials()}</span>
      </div>
    </div>
  );
};

export default UserAvatar;
