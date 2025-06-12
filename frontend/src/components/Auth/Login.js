import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode.react";
import "./Auth.css";

const Login = () => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [loginData, setLoginData] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();
  const {
    register: register2FA,
    handleSubmit: handleSubmit2FA,
    formState: { errors: errors2FA },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await login(data);
      if (result.requires_2fa) {
        setRequires2FA(true);
        setLoginData(data);
        toast.info(t("auth.twoFactorRequired"));
      } else {
        toast.success(t("auth.loginSuccess"));
      }
    } catch (error) {
      toast.error(error.message || t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit2FA = async (data) => {
    setLoading(true);
    try {
      await login({ ...loginData, two_fa_token: data.token });
      toast.success(t("auth.loginSuccess"));
    } catch (error) {
      toast.error(error.message || t("auth.twoFactorFailed"));
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "ar" : "en";
    i18n.changeLanguage(newLang);
    document.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-indigo-600">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t("auth.signInToAccount")}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t("auth.workflowManagementSystem")}
          </p>
        </div>

        {!requires2FA ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="username" className="sr-only">
                  {t("auth.username")}
                </label>
                <input
                  {...register("username", {
                    required: t("auth.usernameRequired"),
                  })}
                  type="text"
                  autoComplete="username"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder={t("auth.username")}
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.username.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  {t("auth.password")}
                </label>
                <input
                  {...register("password", {
                    required: t("auth.passwordRequired"),
                  })}
                  type="password"
                  autoComplete="current-password"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder={t("auth.password")}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  t("auth.signIn")
                )}
              </button>
            </div>
          </form>
        ) : (
          <form
            className="mt-8 space-y-6"
            onSubmit={handleSubmit2FA(onSubmit2FA)}
          >
            <div>
              <label
                htmlFor="token"
                className="block text-sm font-medium text-gray-700"
              >
                {t("auth.twoFactorCode")}
              </label>
              <input
                {...register2FA("token", {
                  required: t("auth.twoFactorRequired"),
                })}
                type="text"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder={t("auth.enterSixDigitCode")}
                maxLength={6}
              />
              {errors2FA.token && (
                <p className="mt-1 text-sm text-red-600">
                  {errors2FA.token.message}
                </p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setLoginData(null);
                  reset();
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {t("common.back")}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                ) : (
                  t("auth.verify")
                )}
              </button>
            </div>
          </form>
        )}

        <div className="flex justify-center">
          <button
            onClick={toggleLanguage}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            {i18n.language === "en" ? "العربية" : "English"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
