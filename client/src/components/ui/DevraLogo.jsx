import React from "react";

export function DevraIcon({ className = "w-6 h-6", glow = true }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {glow && (
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/40 via-violet-500/30 to-cyan-400/30 blur-md rounded-lg pointer-events-none" />
      )}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-[0_0_12px_rgba(139,92,246,0.5)]"
      >
        <defs>
          <linearGradient id="devra-grad-main" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="devra-grad-inner" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6D28D9" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>

        {/* Outer Hex-Delta Geometry */}
        <path
          d="M20 4L34 12.5V27.5L20 36L6 27.5V12.5L20 4Z"
          stroke="url(#devra-grad-main)"
          strokeWidth="2.2"
          strokeLinejoin="round"
          fill="#0A0E1A"
          fillOpacity="0.9"
        />

        {/* Internal Connected Tri-Node Core (DEVRA -> FRONTEND / API / DB) */}
        <path
          d="M20 12V20M20 20L13 25M20 20L27 25"
          stroke="url(#devra-grad-main)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Core Nexus Center Node */}
        <circle cx="20" cy="20" r="3" fill="#8B5CF6" />
        <circle cx="20" cy="12" r="2" fill="#06B6D4" />
        <circle cx="13" cy="25" r="2" fill="#EC4899" />
        <circle cx="27" cy="25" r="2" fill="#38BDF8" />
      </svg>
    </div>
  );
}

export default function DevraLogo({
  size = "md",
  showText = true,
  className = "",
  textClassName = "",
  tagline = false
}) {
  const sizeMap = {
    sm: { icon: "w-6 h-6", text: "text-base tracking-wider" },
    md: { icon: "w-8 h-8", text: "text-lg tracking-wider" },
    lg: { icon: "w-10 h-10", text: "text-2xl tracking-widest" }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <DevraIcon className={currentSize.icon} />
      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-extrabold uppercase font-mono tracking-widest bg-gradient-to-r from-violet-200 via-white to-cyan-300 bg-clip-text text-transparent ${currentSize.text} ${textClassName}`}
          >
            DEVRA
          </span>
          {tagline && (
            <span className="text-[9px] font-mono text-violet-300/70 tracking-wider -mt-0.5">
              SPATIAL AI WORKSPACE
            </span>
          )}
        </div>
      )}
    </div>
  );
}
