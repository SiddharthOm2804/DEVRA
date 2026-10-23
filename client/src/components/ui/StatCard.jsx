import React from "react";
import Card from "./Card";

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive,
  progress,
  badgeText,
  badgeColor = "jade",
  dark = true
}) {
  return (
    <Card hover dark={dark} className="flex flex-col justify-between relative overflow-hidden group bg-abyssal-card border-abyssal-border">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider font-mono text-abyssal-muted">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-abyssal-surface border border-abyssal-border text-abyssal-jade group-hover:border-abyssal-jade">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="mt-4 mb-2 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tracking-tight font-mono text-abyssal-ivory">
          {value}
        </span>
        {badgeText && (
          <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-abyssal-jade/15 text-abyssal-jade border border-abyssal-jade/30">
            {badgeText}
          </span>
        )}
      </div>

      {/* Progress Bar (Optional) */}
      {typeof progress === "number" && (
        <div className="w-full rounded-full h-1.5 my-2 overflow-hidden bg-abyssal-surface border border-abyssal-border">
          <div
            className="bg-abyssal-jade h-full rounded-full transition-all duration-500 shadow-jade-glow"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          ></div>
        </div>
      )}

      {/* Footer / Trend */}
      <div className="mt-2 text-xs flex items-center justify-between">
        {trend && (
          <span
            className={`font-mono font-semibold flex items-center gap-1 ${
              trendPositive === true
                ? "text-abyssal-jade"
                : trendPositive === false
                ? "text-abyssal-error"
                : "text-abyssal-muted"
            }`}
          >
            {trend}
          </span>
        )}
        {subtitle && (
          <span className="truncate ml-auto font-mono text-abyssal-muted">
            {subtitle}
          </span>
        )}
      </div>
    </Card>
  );
}
