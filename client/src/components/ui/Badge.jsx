import React from "react";

export default function Badge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  className = ""
}) {
  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5 font-mono",
    md: "text-xs px-2.5 py-1 font-mono"
  };

  const variantStyles = {
    emerald: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
    sky: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
    purple: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    amber: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    neutral: "bg-slate-800/80 text-slate-300 border border-slate-700/60"
  };

  const dotColors = {
    emerald: "bg-emerald-400",
    cyan: "bg-cyan-400",
    sky: "bg-sky-400",
    purple: "bg-purple-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
    neutral: "bg-slate-400"
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium tracking-wide ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.neutral} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || dotColors.neutral}`}></span>
      )}
      {children}
    </span>
  );
}
