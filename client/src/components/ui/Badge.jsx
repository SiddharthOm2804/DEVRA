import React from "react";

export default function Badge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  className = ""
}) {
  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 font-mono",
    md: "text-xs px-2.5 py-0.5 font-mono"
  };

  const variantStyles = {
    jade: "bg-abyssal-jade/15 text-abyssal-jade border border-abyssal-jade/30",
    citron: "bg-abyssal-citron/15 text-abyssal-citron border border-abyssal-citron/30",
    ivory: "bg-abyssal-surface text-abyssal-ivory border border-abyssal-border",
    lavender: "bg-abyssal-jade/15 text-abyssal-jade border border-abyssal-jade/30",
    blue: "bg-abyssal-citron/15 text-abyssal-citron border border-abyssal-citron/30",
    emerald: "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30",
    amber: "bg-amber-950/60 text-amber-300 border border-amber-500/30",
    rose: "bg-rose-950/60 text-rose-300 border border-rose-500/30",
    neutral: "bg-abyssal-surface text-abyssal-secondary border border-abyssal-border",
    // Dark surface badge variants
    darkLavender: "bg-abyssal-jade/20 text-abyssal-jade border border-abyssal-jade/40",
    darkBlue: "bg-abyssal-citron/20 text-abyssal-citron border border-abyssal-citron/40",
    darkJade: "bg-abyssal-jade/20 text-abyssal-jade border border-abyssal-jade/40",
    darkCitron: "bg-abyssal-citron/20 text-abyssal-citron border border-abyssal-citron/40",
    darkEmerald: "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30",
    darkAmber: "bg-amber-950/60 text-amber-300 border border-amber-500/30",
    darkRose: "bg-rose-950/60 text-rose-300 border border-rose-500/30",
    darkNeutral: "bg-abyssal-surface text-abyssal-secondary border border-abyssal-border"
  };

  // Map legacy color aliases
  const resolvedVariant = {
    cyan: "jade",
    violet: "jade",
    sky: "citron",
    purple: "jade",
    jade: "jade",
    citron: "citron"
  }[variant] || variant;

  const dotColors = {
    jade: "bg-abyssal-jade",
    citron: "bg-abyssal-citron",
    ivory: "bg-abyssal-ivory",
    lavender: "bg-abyssal-jade",
    blue: "bg-abyssal-citron",
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
    neutral: "bg-abyssal-muted",
    darkJade: "bg-abyssal-jade",
    darkCitron: "bg-abyssal-citron",
    darkLavender: "bg-abyssal-jade",
    darkBlue: "bg-abyssal-citron",
    darkEmerald: "bg-emerald-400",
    darkAmber: "bg-amber-400",
    darkRose: "bg-rose-400",
    darkNeutral: "bg-abyssal-muted"
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium tracking-wide ${sizeStyles[size] || sizeStyles.md} ${variantStyles[resolvedVariant] || variantStyles.neutral} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[resolvedVariant] || dotColors.neutral}`}></span>
      )}
      {children}
    </span>
  );
}
