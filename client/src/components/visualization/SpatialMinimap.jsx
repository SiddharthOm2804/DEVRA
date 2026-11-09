import React from "react";
import {
  Compass,
  MousePointer,
  Layers,
  ZoomIn,
  Move,
  Focus,
  BookOpen
} from "lucide-react";

export default function SpatialMinimap({
  groupConfig,
  selectedGroup,
  onSelectGroup,
  onResetCamera
}) {
  return (
    <div className="p-3 bg-[#0B0F17]/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-xl font-mono text-[11px] space-y-2">
      <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
          <Compass className="w-3.5 h-3.5" />
          <span>District Navigator</span>
        </div>
        <button
          onClick={onResetCamera}
          className="text-[10px] text-slate-500 hover:text-white transition-colors"
          title="Reset to Universe Overview"
        >
          Reset
        </button>
      </div>

      {/* 2D Schematic Grid of 6 Districts */}
      <div className="grid grid-cols-2 gap-1.5 w-48">
        {Object.entries(groupConfig).map(([name, conf]) => {
          const isSelected = selectedGroup === name;
          return (
            <button
              key={name}
              onClick={() => onSelectGroup(name)}
              className={`p-1.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                isSelected
                  ? "bg-slate-800 text-white font-bold shadow-sm"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700"
              }`}
              style={{
                borderColor: isSelected ? conf.color : undefined
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: conf.color }}
              ></span>
              <span className="truncate text-[10px]">{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
