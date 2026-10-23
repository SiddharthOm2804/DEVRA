import React from "react";

export default function Card({
  children,
  className = "",
  hover = false,
  padding = "md",
  dark = false,
  ...props
}) {
  const paddingStyles = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8"
  };

  const hoverStyles = hover
    ? dark
      ? "hover:border-abyssal-jade/60 hover:shadow-card-jade transition-all duration-200"
      : "hover:border-abyssal-borderLight hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
    : "";

  const themeStyles = dark
    ? "bg-abyssal-card border border-abyssal-border text-abyssal-ivory shadow-card"
    : "bg-abyssal-card border border-abyssal-border text-abyssal-ivory shadow-card-sm";

  return (
    <div
      className={`rounded-xl ${themeStyles} ${paddingStyles[padding] || paddingStyles.md} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
