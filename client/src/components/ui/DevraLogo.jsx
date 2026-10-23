import React, { useId } from "react";

export function DevraIcon({ className = "w-6 h-6", glow = false }) {
  const gradientId = `devra-brand-grad-${useId().replace(/:/g, "")}`;

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {glow && (
        <div className="absolute inset-0 bg-brand-lavender/30 blur-md rounded-lg pointer-events-none" />
      )}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#55D6BE" />
            <stop offset="100%" stopColor="#D5E56B" />
          </linearGradient>
        </defs>

        {/* Outer Hex-Delta Geometry */}
        <path
          d="M20 4L34 12.5V27.5L20 36L6 27.5V12.5L20 4Z"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.4"
          strokeLinejoin="round"
          fill="#112522"
        />

        {/* Internal Connected Tri-Node Core */}
        <path
          d="M20 12V20M20 20L13 25M20 20L27 25"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Core Nexus Center Nodes */}
        <circle cx="20" cy="20" r="2.8" fill="#55D6BE" />
        <circle cx="20" cy="12" r="2" fill="#D5E56B" />
        <circle cx="13" cy="25" r="2" fill="#55D6BE" />
        <circle cx="27" cy="25" r="2" fill="#D5E56B" />
      </svg>
    </div>
  );
}

export default function DevraLogo({
  size = "md",
  showText = true,
  className = "",
  textClassName = "",
  tagline = false,
  theme = "dark", // "dark" (for dark navbars) or "light" (for light headers)
  glow = false
}) {
  const sizeMap = {
    sm: { icon: "w-6 h-6", text: "text-base tracking-[0.18em]" },
    md: { icon: "w-8 h-8", text: "text-xl tracking-[0.2em]" },
    lg: { icon: "w-10 h-10", text: "text-3xl tracking-[0.22em]" }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <DevraIcon className={currentSize.icon} glow={glow} />
      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-extrabold uppercase font-display leading-none ${
              theme === "light"
                ? "text-abyssal-dark"
                : "text-abyssal-ivory"
            } ${currentSize.text} ${textClassName}`}
          >
            DEVRA
          </span>
          {tagline && (
            <span className={`text-[9px] font-mono tracking-wider -mt-0.5 ${
              theme === "light" ? "text-abyssal-muted" : "text-abyssal-jade"
            }`}>
              AI ENGINEERING WORKSPACE
            </span>
          )}
        </div>
      )}
    </div>
  );
}
