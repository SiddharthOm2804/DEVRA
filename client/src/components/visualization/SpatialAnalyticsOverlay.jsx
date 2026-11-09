import React from "react";
import {
  FileCode,
  Layers,
  Activity,
  AlertTriangle,
  GitBranch,
  Search,
  BookOpen,
  Compass,
  Zap,
  Cpu
} from "lucide-react";

export default function SpatialAnalyticsOverlay({
  stats,
  fullGraph,
  onSelectNode,
  onClose
}) {
  if (!stats) return null;

  return (
    <div className="absolute top-16 left-4 z-20 w-80 sm:w-96 bg-[#0B0F17]/95 backdrop-blur-md border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2 text-sky-400 font-bold">
          <Activity className="w-4 h-4" />
          <span>Codebase Spatial Analytics</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase block">Total Files</span>
          <span className="text-base font-bold text-white">{stats.totalFiles}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase block">Total Linkages</span>
          <span className="text-base font-bold text-sky-400">{stats.totalEdges}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase block">Avg Degree</span>
          <span className="text-base font-bold text-emerald-400">{stats.avgDegree}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase block">Avg Complexity</span>
          <span className="text-base font-bold text-amber-400">{stats.avgComplexity} / 100</span>
        </div>
      </div>

      {/* Architectural Districts Breakdown */}
      <div className="space-y-2">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
          Architectural District Balance
        </span>
        <div className="space-y-1.5">
          {Object.entries(fullGraph.clusterMetrics || {}).map(([name, metric]) => (
            <div
              key={name}
              className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 flex items-center justify-between"
            >
              <span className="text-slate-300 font-medium">{name}</span>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>{metric.fileCount} files</span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-slate-500">{metric.totalLines.toLocaleString()} LOC</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 Most Connected Modules */}
      {stats.mostConnected && stats.mostConnected.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
            Most Coupled / Connected Nodes
          </span>
          <div className="space-y-1">
            {stats.mostConnected.map((node) => (
              <button
                key={node.id}
                onClick={() => {
                  const actualNode = fullGraph.nodesById.get(node.id);
                  if (actualNode) onSelectNode(actualNode);
                }}
                className="w-full p-2 rounded-lg bg-slate-900/50 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between transition-colors group"
              >
                <div className="truncate pr-2">
                  <div className="text-white font-medium group-hover:text-sky-300 truncate text-[11px]">
                    {node.name}
                  </div>
                  <div className="text-[9px] text-slate-500 truncate">{node.path}</div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold text-[10px] border border-sky-500/20">
                    {node.degree} links
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
