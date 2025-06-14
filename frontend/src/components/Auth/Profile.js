import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import {
  UserIcon,
  CameraIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  KeyIcon,
  BellIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  CalendarIcon,
  MapPinIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";

const Profile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("general");
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    defaultValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      title: user?.title || "",
      department: user?.department || "",
      location: user?.location || "",
      bio: user?.bio || "",
      timezone: user?.timezone || "UTC",
      language: user?.language || "en",
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch: watchPassword,
  } = useForm();

  const updateProfileMutation = useMutation(
    (data) => authService.updateProfile(data),
    {
      onSuccess: () => {
        toast.success(t("profile.updateSuccess"));
        queryClient.invalidateQueries(["user-profile"]);
        setIsEditing(false);
      },
      onError: (error) => {
        toast.error(error.message || t("profile.updateError"));
      },
    }
  );

  const changePasswordMutation = useMutation(
    (data) => authService.changePassword(data),
    {
      onSuccess: () => {
        toast.success(t("profile.passwordChangeSuccess"));
        setShowPasswordChange(false);
        resetPassword();
      },
      onError: (error) => {
        toast.error(error.message || t("profile.passwordChangeError"));
      },
    }
  );

  const uploadAvatarMutation = useMutation(
    (file) => authService.uploadAvatar(file),
    {
      onSuccess: () => {
        toast.success(t("profile.avatarUpdateSuccess"));
        queryClient.invalidateQueries(["user-profile"]);
      },
      onError: (error) => {
        toast.error(error.message || t("profile.avatarUpdateError"));
      },
    }
  );

  const onSubmit = (data) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data) => {
    changePasswordMutation.mutate(data);
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("profile.avatarSizeError"));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatar(e.target.result);
      };
      reader.readAsDataURL(file);

      uploadAvatarMutation.mutate(file);
    }
  };

  const tabs = [
    {
      id: "general",
      name: t("profile.tabs.general"),
      icon: UserIcon,
    },
    {
      id: "security",
      name: t("profile.tabs.security"),
      icon: ShieldCheckIcon,
    },
    {
      id: "preferences",
      name: t("profile.tabs.preferences"),
      icon: BellIcon,
    },
  ];

  const timezones = [
    { value: "UTC", label: "UTC" },
    { value: "America/New_York", label: "Eastern Time" },
    { value: "America/Chicago", label: "Central Time" },
    { value: "America/Denver", label: "Mountain Time" },
    { value: "America/Los_Angeles", label: "Pacific Time" },
    { value: "Europe/London", label: "London" },
    { value: "Europe/Paris", label: "Paris" },
    { value: "Asia/Tokyo", label: "Tokyo" },
    { value: "Asia/Dubai", label: "Dubai" },
    { value: "Asia/Riyadh", label: "Riyadh" },
  ];

  const languages = [
    { value: "en", label: "English" },
    { value: "ar", label: "العربية" },
    { value: "es", label: "Español" },
    { value: "fr", label: "Français" },
    { value: "de", label: "Deutsch" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center overflow-hidden">
                {avatar || user?.avatar ? (
                  <img
                    src={avatar || user.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-12 h-12 text-white" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
              >
                <CameraIcon className="w-6 h-6 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold">
                {user?.first_name} {user?.last_name}
              </h1>
              <p className="text-xl opacity-90">
                {user?.title || t("profile.noTitle")}
              </p>
              <p className="text-lg opacity-75">
                {user?.department || t("profile.noDepartment")}
              </p>

              <div className="flex items-center space-x-4 mt-4 text-sm">
                <div className="flex items-center space-x-1">
                  <EnvelopeIcon className="w-4 h-4" />
                  <span>{user?.email}</span>
                </div>
                {user?.location && (
                  <div className="flex items-center space-x-1">
                    <MapPinIcon className="w-4 h-4" />
                    <span>{user.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span>{t("profile.editProfile")}</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      reset();
                    }}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg transition-all duration-200"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSubmit(onSubmit)}
                    disabled={updateProfileMutation.isLoading}
                    className="bg-white text-indigo-600 hover:bg-gray-100 px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
                  >
                    {updateProfileMutation.isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    ) : (
                      <CheckIcon className="w-4 h-4" />
                    )}
                    <span>{t("common.save")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-all duration-200
                  ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* General Tab */}
          {activeTab === "general" && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("profile.firstName")} *
                  </label>
                  <input
                    {...register("first_name", {
                      required: t("profile.firstNameRequired"),
                    })}
                    type="text"
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors duration-200"
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.first_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("profile.lastName")} *
                  </label>
                  <input
                    {...register("last_name", {
                      required: t("profile.lastNameRequired"),
                    })}
                    type="text"
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors duration-200"
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.last_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("profile.email")} *
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      {...register("email", {
                        required: t("profile.emailRequired"),
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: t("profile.emailInvalid"),
                        },
                      })}
                      type="email"
                      disabled={!isEditing}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors duration-200"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("profile.phone")}
                  </label>
                  <div className="relative">
                    <DevicePhoneMobileIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      {...register("phone")}
                      type="tel"
                      disabled={!isEditing}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("profile.title")}
                  </label>
                  <div className="relative">
                    <BriefcaseIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      {...register("title")}
                      type="text"
                      disabled={!isEditing}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("profile.department")}
                  </label>
                  <input
                    {...register("department")}
                    type="text"
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors duration-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("profile.location")}
                  </label>
                  <div className="relative">
                    <MapPinIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      {...register("location")}
                      type="text"
                      disabled={!isEditing}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors duration-200"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("profile.bio")}
                  </label>
                  <textarea
                    {...register("bio")}
                    rows={4}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors duration-200"
                    placeholder={t("profile.bioPlaceholder")}
                  />
                </div>
              </div>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Password Change Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                      <KeyIcon className="w-5 h-5" />
                      <span>{t("profile.changePassword")}</span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {t("profile.passwordDescription")}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                  >
                    {showPasswordChange
                      ? t("common.cancel")
                      : t("profile.changePassword")}
                  </button>
                </div>

                {showPasswordChange && (
                  <form
                    onSubmit={handlePasswordSubmit(onPasswordSubmit)}
                    className="mt-6 space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("profile.currentPassword")} *
                      </label>
                      <div className="relative">
                        <input
                          {...registerPassword("currentPassword", {
                            required: t("profile.currentPasswordRequired"),
                          })}
                          type={showCurrentPassword ? "text" : "password"}
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? (
                            <EyeSlashIcon className="w-5 h-5" />
                          ) : (
                            <EyeIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {passwordErrors.currentPassword && (
                        <p className="mt-1 text-sm text-red-600">
                          {passwordErrors.currentPassword.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("profile.newPassword")} *
                      </label>
                      <div className="relative">
                        <input
                          {...registerPassword("newPassword", {
                            required: t("profile.newPasswordRequired"),
                            minLength: {
                              value: 8,
                              message: t("profile.passwordMinLength"),
                            },
                          })}
                          type={showNewPassword ? "text" : "password"}
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? (
                            <EyeSlashIcon className="w-5 h-5" />
                          ) : (
                            <EyeIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {passwordErrors.newPassword && (
                        <p className="mt-1 text-sm text-red-600">
                          {passwordErrors.newPassword.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("profile.confirmPassword")} *
                      </label>
                      <input
                        {...registerPassword("confirmPassword", {
                          required: t("profile.confirmPasswordRequired"),
                          validate: (value) =>
                            value === watchPassword("newPassword") ||
                            t("profile.passwordMismatch"),
                        })}
                        type="password"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {passwordErrors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600">
                          {passwordErrors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={changePasswordMutation.isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                      >
                        {changePasswordMutation.isLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          t("profile.updatePassword")
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Two-Factor Authentication */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                      <ShieldCheckIcon className="w-5 h-5" />
                      <span>{t("profile.twoFactorAuth")}</span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {t("profile.twoFactorDescription")}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        user?.two_fa_enabled
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user?.two_fa_enabled
                        ? t("profile.enabled")
                        : t("profile.disabled")}
                    </span>
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                      {user?.two_fa_enabled
                        ? t("profile.disable")
                        : t("profile.enable")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === "preferences" && (
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("profile.timezone")}
                  </label>
                  <div className="relative">
                    <GlobeAltIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <select
                      {...register("timezone")}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {timezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("profile.language")}
                  </label>
                  <select
                    {...register("language")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                  <BellIcon className="w-5 h-5" />
                  <span>{t("profile.notificationPreferences")}</span>
                </h3>

                <div className="space-y-4">
                  {[
                    {
                      key: "email_notifications",
                      label: t("profile.emailNotifications"),
                    },
                    {
                      key: "task_assignments",
                      label: t("profile.taskAssignments"),
                    },
                    {
                      key: "workflow_updates",
                      label: t("profile.workflowUpdates"),
                    },
                    {
                      key: "deadline_reminders",
                      label: t("profile.deadlineReminders"),
                    },
                  ].map((pref) => (
                    <div
                      key={pref.key}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {pref.label}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          defaultChecked
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
