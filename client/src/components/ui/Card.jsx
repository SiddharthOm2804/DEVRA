import React from "react";

export default function Card({
  children,
  className = "",
  hover = false,
  padding = "md",
  glow = false,
  ...props
}) {
  const paddingStyles = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8"
  };

  const hoverStyles = hover
    ? "hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-950/20 hover:-translate-y-0.5 transition-all duration-200"
    : "";

  const glowStyles = glow
    ? "border-violet-500/30 shadow-lg shadow-violet-950/30 bg-gradient-to-b from-[#0F1426] to-[#0A0D18]"
    : "bg-[#0A0E1A]/90 border-slate-800/80";

  return (
    <div
      className={`border rounded-xl text-slate-100 backdrop-blur-md shadow-glass-inner ${paddingStyles[padding] || paddingStyles.md} ${glowStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
