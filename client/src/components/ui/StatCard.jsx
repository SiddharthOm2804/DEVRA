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
  badgeColor = "violet"
}) {
  return (
    <Card hover className="flex flex-col justify-between relative overflow-hidden group border-slate-800/80 bg-gradient-to-b from-[#0D1222] to-[#080C16]">
      {/* Subtle top corner ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-600/10 transition-colors" />

      {/* Top Header */}
      <div className="flex items-center justify-between relative z-10">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-violet-950/40 border border-violet-500/20 flex items-center justify-center text-violet-300 group-hover:text-cyan-300 group-hover:border-cyan-500/30 group-hover:shadow-glow-violet transition-all">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="mt-4 mb-2 flex items-baseline gap-2 relative z-10">
        <span className="text-3xl font-extrabold tracking-tight text-white font-mono drop-shadow-[0_2px_8px_rgba(255,255,255,0.1)]">
          {value}
        </span>
        {badgeText && (
          <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30">
            {badgeText}
          </span>
        )}
      </div>

      {/* Progress Bar (Optional) */}
      {typeof progress === "number" && (
        <div className="w-full bg-slate-900/80 rounded-full h-1.5 my-2 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-violet-500 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-violet-500/50"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          ></div>
        </div>
      )}

      {/* Footer / Trend */}
      <div className="mt-2 text-xs flex items-center justify-between relative z-10">
        {trend && (
          <span
            className={`font-mono font-medium flex items-center gap-1 ${
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
        {subtitle && <span className="text-slate-500 truncate ml-auto font-mono">{subtitle}</span>}
      </div>
    </Card>
  );
}
