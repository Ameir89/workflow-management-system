import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  WorkflowNodeIcon,
  ConnectionLines,
  ClipboardIcon,
  LightningBoltIcon,
  AdjustmentsIcon,
  ChartBarIcon,
  LoginIcon,
  SignIn,
  EyeOffIcon,
  EyeOnIcon,
  TranslationIcon,
} from "../Assets/Icons";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [loginData, setLoginData] = useState(null);
  const [username, setUsername] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123!");
  const [token, setToken] = useState("");
  const [errors, setErrors] = useState({});
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const [showPassword, setShowPassword] = useState(false);

  // Get the intended destination after login
  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validation
    const newErrors = {};
    if (!username) newErrors.username = t("auth.usernameRequired");
    if (!password) newErrors.password = t("auth.passwordRequired");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const credentials = {
        username: username.trim(),
        password: password,
      };

      const response = await login(credentials);

      if (response.requires_2fa) {
        setRequires2FA(true);
        setLoginData(response);
        toast.info(t("auth.twoFactorRequired"));
      } else {
        // Login successful
        toast.success(t("auth.loginSuccess"));
        navigate(from, { replace: true });
      }
    } catch (error) {
      setErrors({
        general: error.message || t("auth.loginFailed"),
      });
      toast.error(error.message || t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit2FA = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (!token || token.length !== 6) {
      setErrors({ token: t("auth.enterSixDigitCode") });
      setLoading(false);
      return;
    }

    try {
      // Complete 2FA verification with the auth service
      const response = await login({
        username: loginData.username || username,
        password: loginData.password || password,
        two_factor_token: token,
        session_id: loginData.session_id,
      });

      toast.success(t("auth.loginSuccess"));
      navigate(from, { replace: true });
    } catch (error) {
      console.error("2FA verification error:", error);
      setErrors({
        token: error.message || t("auth.twoFactorFailed"),
      });
      toast.error(error.message || t("auth.twoFactorFailed"));
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = currentLang === "en" ? "ar" : "en";
    setCurrentLang(newLang);
    i18n.changeLanguage(newLang);
    document.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const goBack = () => {
    setRequires2FA(false);
    setLoginData(null);
    setToken("");
    setErrors({});
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Workflow Nodes */}
        <WorkflowNodeIcon />
        <ConnectionLines />
        <ClipboardIcon />
        <LightningBoltIcon />
        <AdjustmentsIcon />
        <ChartBarIcon />

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-12 grid-rows-8 h-full w-full">
            {Array.from({ length: 96 }).map((_, i) => (
              <div key={i} className="border border-white/10"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            <LoginIcon />
            <h2 className="mt-6 text-center text-4xl font-bold text-white">
              {t("auth.signInToAccount")}
            </h2>
            <p className="mt-2 text-center text-lg text-blue-200">
              {t("auth.workflowManagementSystem")}
            </p>
            <div className="mt-4 flex items-center justify-center space-x-2 text-blue-300">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: "100ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: "200ms" }}
                ></div>
              </div>
              <span className="text-sm">
                {currentLang === "en"
                  ? "Streamline Your Workflow"
                  : "تبسيط سير العمل"}
              </span>
            </div>
          </div>

          {/* Login Form Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
            {!requires2FA ? (
              <div className="space-y-6">
                {errors.general && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 text-center text-red-200 text-sm">
                    {errors.general}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm font-medium text-blue-100 mb-2"
                    >
                      {t("auth.username")}
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm transition-all duration-200"
                      placeholder={t("auth.enterUsername")}
                    />
                    {errors.username && (
                      <p className="mt-2 text-sm text-red-300">
                        {errors.username}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-blue-100 mb-2"
                    >
                      {t("auth.password")}
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className={`w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm transition-all duration-200 ${
                          currentLang === "ar" ? "pl-12 pr-4" : "pr-12 pl-4"
                        }`}
                        placeholder={t("auth.enterPassword")}
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className={`absolute inset-y-0 flex items-center text-blue-200 hover:text-white transition-colors duration-200 ${
                          currentLang === "ar" ? "left-0 pl-3" : "right-0 pr-3"
                        }`}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeOnIcon />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-2 text-sm text-red-300">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>{t("auth.loggingIn")}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>{t("auth.signIn")}</span>
                        <SignIn />
                      </div>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-500/20 mb-4">
                    <svg
                      className="w-6 h-6 text-blue-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white">
                    {t("auth.twoFactorRequired")}
                  </h3>
                  <p className="text-blue-200 text-sm mt-1">
                    {t("auth.enter2FACode")}
                  </p>
                </div>

                <form onSubmit={handleSubmit2FA}>
                  <div>
                    <input
                      type="text"
                      value={token}
                      onChange={(e) =>
                        setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      inputMode="numeric"
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-center text-2xl tracking-widest backdrop-blur-sm"
                      placeholder="000000"
                      maxLength={6}
                      autoComplete="one-time-code"
                    />
                    {errors.token && (
                      <p className="mt-2 text-sm text-red-300 text-center">
                        {errors.token}
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={goBack}
                      className="flex-1 py-3 px-4 border border-white/30 rounded-xl text-sm font-medium text-blue-200 bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                    >
                      {t("common.back")}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transform transition-all duration-200 hover:scale-105"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        </div>
                      ) : (
                        t("auth.verify")
                      )}
                    </button>
                  </div>
                </form>

                <div className="text-center text-sm text-blue-200">
                  <p>
                    {currentLang === "en"
                      ? "Demo 2FA code:"
                      : "رمز المصادقة التجريبي:"}
                  </p>
                  <p className="font-mono bg-white/10 rounded px-2 py-1 mt-1">
                    123456
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Language Toggle */}
          <div className="text-center">
            <button
              onClick={toggleLanguage}
              className="text-blue-300 hover:text-white transition-colors duration-200 flex items-center justify-center space-x-2 mx-auto"
              type="button"
            >
              <TranslationIcon />
              <span>{t("languageToggle")}</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
