import React, { useRef, useState } from "react";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  isLoading = false,
  icon: Icon,
  onClick,
  ...props
}) {
  const clickLock = useRef(false);
  const [clickPending, setClickPending] = useState(false);
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abyssal-jade disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const handleClick = async (event) => {
    if (!onClick) return;
    if (clickLock.current || disabled || isLoading) {
      event.preventDefault();
      return;
    }

    const result = onClick(event);
    if (!result || typeof result.then !== "function") return;

    clickLock.current = true;
    setClickPending(true);
    try {
      await result;
    } catch (error) {
      console.error("Button action failed:", error);
    } finally {
      clickLock.current = false;
      setClickPending(false);
    }
  };

  const sizeStyles = {
    xs: "text-xs px-2.5 py-1 gap-1.5",
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2 gap-2",
    lg: "text-base px-5 py-2.5 gap-2.5"
  };

  const variantStyles = {
    // Primary: Mineral Jade with dark contrast text
    primary: "bg-abyssal-jade hover:bg-abyssal-jadeHover text-[#081817] font-bold shadow-jade-glow",
    // Citron: Signature Citron accent
    citron: "bg-abyssal-citron hover:bg-abyssal-citronHover text-[#081817] font-bold shadow-citron-glow",
    blue: "bg-abyssal-citron hover:bg-abyssal-citronHover text-[#081817] font-bold shadow-citron-glow",
    // Secondary: Elevated dark surface with jade border
    secondary: "bg-abyssal-card hover:bg-abyssal-surface text-abyssal-ivory border border-abyssal-border hover:border-abyssal-jade/60 shadow-card-jade",
    // Dark: Abyssal foundation
    dark: "bg-abyssal-dark hover:bg-abyssal-card border border-abyssal-border text-abyssal-ivory",
    // Outline: Transparent with jade border
    outline: "bg-transparent hover:bg-abyssal-card/60 text-abyssal-ivory border border-abyssal-border hover:border-abyssal-jade focus:ring-abyssal-jade",
    // Ghost: Clean transparent
    ghost: "bg-transparent hover:bg-abyssal-surface/60 text-abyssal-secondary hover:text-abyssal-ivory focus:ring-abyssal-jade",
    // Ghost Dark: For dark header/sidebar
    ghostDark: "bg-transparent hover:bg-abyssal-card text-abyssal-secondary hover:text-abyssal-ivory focus:ring-abyssal-jade",
    // Danger
    danger: "bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-sm"
  };

  return (
    <button
      disabled={disabled || isLoading || clickPending}
      onClick={onClick ? handleClick : undefined}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : Icon ? (
        <Icon className="w-4 h-4 flex-shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
