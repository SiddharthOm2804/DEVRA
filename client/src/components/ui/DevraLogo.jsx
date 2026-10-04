import React from "react";

export function DevraIcon({ className = "w-6 h-6", glow = true }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {glow && (
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/30 to-indigo-500/30 blur-md rounded-lg pointer-events-none" />
      )}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]"
      >
        <defs>
          <linearGradient id="devra-grad-main" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <linearGradient id="devra-grad-inner" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        {/* Outer Hex-Delta Geometry */}
        <path
          d="M20 4L34 12.5V27.5L20 36L6 27.5V12.5L20 4Z"
          stroke="url(#devra-grad-main)"
          strokeWidth="2.2"
          strokeLinejoin="round"
          fill="#0B0F19"
          fillOpacity="0.85"
        />

        {/* Internal Connected Tri-Node Core (DEVRA -> FRONTEND / API / DB) */}
        <path
          d="M20 12V20M20 20L13 25M20 20L27 25"
          stroke="url(#devra-grad-main)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Core Nexus Center Node */}
        <circle cx="20" cy="20" r="3" fill="#38bdf8" />
        <circle cx="20" cy="12" r="2" fill="#818cf8" />
        <circle cx="13" cy="25" r="2" fill="#38bdf8" />
        <circle cx="27" cy="25" r="2" fill="#818cf8" />
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
            className={`font-extrabold uppercase font-mono text-white tracking-widest ${currentSize.text} ${textClassName}`}
          >
            DEVRA
          </span>
          {tagline && (
            <span className="text-[9px] font-mono text-slate-400 tracking-normal -mt-0.5">
              AI ENGINEERING COMPANION
            </span>
          )}
        </div>
      )}
    </div>
  );
}
