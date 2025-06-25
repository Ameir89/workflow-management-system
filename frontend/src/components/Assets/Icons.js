export const WorkflowNodeIcon = () => (
  <>
    <div className="absolute top-20 left-20 w-16 h-16 bg-blue-500/20 rounded-full animate-pulse"></div>
    <div className="absolute top-40 right-32 w-12 h-12 bg-purple-500/20 rounded-full animate-bounce"></div>
    <div
      className="absolute bottom-32 left-16 w-14 h-14 bg-indigo-500/20 rounded-full animate-pulse"
      style={{ animationDelay: "300ms" }}
    ></div>
    <div
      className="absolute bottom-20 right-20 w-18 h-18 bg-cyan-500/20 rounded-full animate-bounce"
      style={{ animationDelay: "500ms" }}
    ></div>
  </>
);

export const ConnectionLines = () => (
  <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
    <defs>
      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
      </linearGradient>
    </defs>

    {/* Animated workflow connections */}
    <path
      d="M100,150 Q300,100 500,200 T900,180"
      stroke="url(#lineGradient)"
      strokeWidth="2"
      fill="none"
      strokeDasharray="10,5"
      className="animate-pulse"
    />
    <path
      d="M150,400 Q400,350 600,450 T1000,420"
      stroke="url(#lineGradient)"
      strokeWidth="2"
      fill="none"
      strokeDasharray="8,4"
      className="animate-pulse"
      style={{ animationDelay: "200ms" }}
    />
    <path
      d="M80,600 Q350,550 650,650 T1100,600"
      stroke="url(#lineGradient)"
      strokeWidth="2"
      fill="none"
      strokeDasharray="12,6"
      className="animate-pulse"
      style={{ animationDelay: "400ms" }}
    />
  </svg>
);

export const ClipboardIcon = () => (
  <div
    className="absolute top-1/4 left-1/4"
    style={{ animation: "float 6s ease-in-out infinite" }}
  >
    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
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
          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    </div>
  </div>
);

export const LightningBoltIcon = () => (
  <div
    className="absolute top-3/4 right-1/4"
    style={{
      animation: "float 6s ease-in-out infinite",
      animationDelay: "1s",
    }}
  >
    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
      <svg
        className="w-6 h-6 text-purple-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    </div>
  </div>
);

export const AdjustmentsIcon = () => (
  <div
    className="absolute top-1/2 left-1/6"
    style={{
      animation: "float 6s ease-in-out infinite",
      animationDelay: "0.5s",
    }}
  >
    <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
      <svg
        className="w-6 h-6 text-indigo-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
        />
      </svg>
    </div>
  </div>
);

export const ChartBarIcon = () => (
  <div
    className="absolute bottom-1/3 right-1/3"
    style={{
      animation: "float 6s ease-in-out infinite",
      animationDelay: "0.7s",
    }}
  >
    <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
      <svg
        className="w-6 h-6 text-cyan-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    </div>
  </div>
);

export const LoginIcon = () => (
  <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl">
    <svg
      className="h-8 w-8 text-white"
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
);

export const SignIn = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
    />
  </svg>
);

export const EyeOffIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 11-4.243-4.243m4.242 4.242L9.88 9.88"
    />
  </svg>
);

export const EyeOnIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

export const TranslationIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
    />
  </svg>
);
