import React from "react";

export default function Card({
  children,
  className = "",
  hover = false,
  padding = "md",
  ...props
}) {
  const paddingStyles = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8"
  };

  const hoverStyles = hover
    ? "hover:border-slate-700 hover:shadow-lg hover:shadow-black/40 transition-all duration-200"
    : "";

  return (
    <div
      className={`bg-[#0F1420] border border-slate-800/80 rounded-xl text-slate-100 ${paddingStyles[padding] || paddingStyles.md} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
