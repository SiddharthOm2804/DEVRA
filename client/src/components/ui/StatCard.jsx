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
  badgeColor = "cyan"
}) {
  return (
    <Card hover className="flex flex-col justify-between relative overflow-hidden group">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 group-hover:text-sky-400 group-hover:border-sky-500/30 transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="mt-4 mb-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-white font-mono">
          {value}
        </span>
        {badgeText && (
          <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            {badgeText}
          </span>
        )}
      </div>

      {/* Progress Bar (Optional) */}
      {typeof progress === "number" && (
        <div className="w-full bg-slate-800 rounded-full h-1.5 my-2 overflow-hidden">
          <div
            className="bg-sky-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          ></div>
        </div>
      )}

      {/* Footer / Trend */}
      <div className="mt-2 text-xs flex items-center justify-between">
        {trend && (
          <span
            className={`font-medium flex items-center gap-1 ${
              trendPositive === true
                ? "text-emerald-400"
                : trendPositive === false
                ? "text-rose-400"
                : "text-slate-400"
            }`}
          >
            {trend}
          </span>
        )}
        {subtitle && <span className="text-slate-500 truncate ml-auto">{subtitle}</span>}
      </div>
    </Card>
  );
}
