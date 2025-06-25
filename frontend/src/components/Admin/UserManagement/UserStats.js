// src/components/Admin/UserManagement/UserStats.js
import React from "react";
import {
  UsersIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

const UserStats = ({ summary }) => {
  if (!summary) return null;

  const stats = [
    {
      title: "Total Users",
      value: summary.total || 0,
      icon: UsersIcon,
      color: "text-gray-900",
      bgColor: "bg-gray-50",
      iconColor: "text-gray-600",
    },
    {
      title: "Active Users",
      value: summary.active || 0,
      icon: CheckCircleIcon,
      color: "text-green-600",
      bgColor: "bg-green-50",
      iconColor: "text-green-500",
    },
    {
      title: "Verified",
      value: summary.verified || 0,
      icon: ShieldCheckIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      title: "With 2FA",
      value: summary.with_2fa || 0,
      icon: LockClosedIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-500",
    },
  ];

  const getPercentage = (value, total) => {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        User Statistics
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const percentage = getPercentage(stat.value, summary.total);

          return (
            <div key={stat.title} className="relative">
              <div className={`${stat.bgColor} rounded-lg p-4`}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.title}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className={`text-2xl font-bold ${stat.color}`}>
                          {stat.value.toLocaleString()}
                        </div>
                        {stat.title !== "Total Users" && (
                          <div className="ml-2 flex items-baseline text-sm">
                            <span className="text-gray-500">
                              ({percentage}%)
                            </span>
                          </div>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>

                {/* Progress bar for non-total stats */}
                {stat.title !== "Total Users" && summary.total > 0 && (
                  <div className="mt-3">
                    <div className="bg-white bg-opacity-50 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          stat.title === "Active Users"
                            ? "bg-green-400"
                            : stat.title === "Verified"
                            ? "bg-blue-400"
                            : "bg-purple-400"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional insights */}
      {summary.total > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-500">Security Score</div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.round(
                (((summary.verified || 0) + (summary.with_2fa || 0)) /
                  (summary.total * 2)) *
                  100
              )}
              %
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-500">Activation Rate</div>
            <div className="text-lg font-semibold text-gray-900">
              {getPercentage(summary.active, summary.total)}%
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-500">Verification Rate</div>
            <div className="text-lg font-semibold text-gray-900">
              {getPercentage(summary.verified, summary.total)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserStats;
