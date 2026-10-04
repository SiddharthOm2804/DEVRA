import React from "react";
import {
  FileCode,
  AlertTriangle,
  Layers,
  ArrowRight,
  Focus,
  X,
  Package,
  Cpu,
  CheckCircle,
  FolderGit2,
  ShieldAlert,
  Hash,
  ExternalLink,
  GitCommit
} from "lucide-react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

export default function NodeDetailsPanel({
  selectedNode,
  onClose,
  onFocusNode,
  onSelectNode,
  nodesById,
  edges,
  groupConfig
}) {
  if (!selectedNode) {
    return (
      <div className="w-80 sm:w-96 bg-[#0B0F17]/95 backdrop-blur-md border-l border-slate-800 p-5 flex flex-col justify-between h-full text-xs font-mono overflow-y-auto">
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 text-sky-400">
              <Layers className="w-4 h-4" />
              <span className="font-bold text-white tracking-wide">3D AST Spatial Cockpit</span>
            </div>
            <span className="text-[10px] text-slate-500 uppercase">Ready</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <span className="text-slate-300 font-semibold block text-[11px]">Interactive Controls</span>
            <ul className="space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                <span><strong>Hover:</strong> Highlight node &amp; wireframe edges</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span><strong>Click:</strong> Open deep file telemetry</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                <span><strong>Double Click:</strong> Smoothly focus camera</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span><strong>Orbit Drag:</strong> 360&deg; perspective rotation</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                <span><strong>Wheel:</strong> Smooth zoom in/out</span>
              </li>
            </ul>
          </div>

          {/* Group Breakdown */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
              Architectural Domain Clusters
            </span>
            <div className="space-y-2">
              {Object.entries(groupConfig).map(([name, conf]) => (
                <div
                  key={name}
                  className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: conf.color, boxShadow: `0 0 8px ${conf.color}66` }}
                    ></span>
                    <span className="text-slate-200 font-medium">{name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 max-w-[150px] truncate text-right">
                    {conf.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80 text-[10px] text-slate-500 text-center">
          Click any node or module anchor in the 3D space to inspect AST properties.
        </div>
      </div>
    );
  }

  // Calculate connected nodes
  const connectedEdges = edges.filter(
    (e) => e.fromId === selectedNode.id || e.toId === selectedNode.id
  );

  const incomingNodes = connectedEdges
    .filter((e) => e.toId === selectedNode.id)
    .map((e) => ({
      node: nodesById.get(e.fromId),
      type: e.type
    }))
    .filter((item) => item.node);

  const outgoingNodes = connectedEdges
    .filter((e) => e.fromId === selectedNode.id)
    .map((e) => ({
      node: nodesById.get(e.toId),
      type: e.type
    }))
    .filter((item) => item.node);

  const complexityScore = selectedNode.complexity?.score || 50;
  const complexityLabel = selectedNode.complexity?.label || "Medium";
  const issues = selectedNode.complexity?.issues || [];

  return (
    <div className="w-80 sm:w-96 bg-[#0B0F17]/95 backdrop-blur-md border-l border-slate-800 p-5 flex flex-col justify-between h-full text-xs font-mono overflow-y-auto space-y-6">
      <div className="space-y-5">
        {/* Header with Close and Focus Button */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: selectedNode.groupColor,
                  boxShadow: `0 0 10px ${selectedNode.groupColor}`
                }}
              ></span>
              <span
                className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${selectedNode.groupColor}1A`,
                  color: selectedNode.groupColor,
                  border: `1px solid ${selectedNode.groupColor}4D`
                }}
              >
                {selectedNode.group}
              </span>
              {selectedNode.isEntryPoint && (
                <Badge variant="emerald" size="sm">Entry Point</Badge>
              )}
            </div>
            <h3 className="text-base font-bold text-white truncate max-w-[210px]" title={selectedNode.name}>
              {selectedNode.name}
            </h3>
            <p className="text-[10px] text-slate-500 break-all leading-tight">
              {selectedNode.path}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onFocusNode(selectedNode)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sky-400 hover:text-white hover:bg-sky-500/20 transition-colors"
              title="Focus Camera in 3D"
            >
              <Focus className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-rose-500/20 transition-colors"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">Lines of Code</span>
            <span className="text-lg font-bold text-white">
              {selectedNode.lines?.toLocaleString() || "120"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">Dependencies</span>
            <span className="text-lg font-bold text-amber-400">
              {selectedNode.dependenciesCount || 0}
            </span>
          </div>
        </div>

        {/* Complexity / Importance Gauge */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>Complexity &amp; Criticality</span>
            </span>
            <Badge
              variant={
                complexityScore >= 80
                  ? "danger"
                  : complexityScore >= 60
                  ? "amber"
                  : "cyan"
              }
              size="sm"
            >
              {complexityLabel} ({complexityScore}/100)
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                complexityScore >= 80
                  ? "bg-rose-500"
                  : complexityScore >= 60
                  ? "bg-amber-400"
                  : "bg-sky-400"
              }`}
              style={{ width: `${complexityScore}%` }}
            ></div>
          </div>
        </div>

        {/* Issues & Smells */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Detected Issues &amp; Smells</span>
            </span>
            <span className="text-[10px] text-rose-400 font-bold">
              {issues.length} Issues
            </span>
          </div>

          {issues.length === 0 ? (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Clean AST signature. No critical coupling.</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {issues.map((issue, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-start gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dependencies List */}
        {selectedNode.dependenciesList && selectedNode.dependenciesList.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span>Direct Dependencies</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedNode.dependenciesList.map((dep, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300"
                >
                  {dep}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Connected Nodes Linkages */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
            Topology Linkages ({connectedEdges.length})
          </span>

          {/* Outgoing */}
          {outgoingNodes.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400">Calls / Depends On &rarr;</span>
              <div className="space-y-1">
                {outgoingNodes.slice(0, 5).map(({ node, type }) => (
                  <button
                    key={node.id}
                    onClick={() => onSelectNode(node)}
                    className="w-full p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-left flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: node.groupColor }}
                      ></span>
                      <span className="text-slate-200 group-hover:text-sky-300 truncate">
                        {node.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">{type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Incoming */}
          {incomingNodes.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400">&larr; Called By</span>
              <div className="space-y-1">
                {incomingNodes.slice(0, 5).map(({ node, type }) => (
                  <button
                    key={node.id}
                    onClick={() => onSelectNode(node)}
                    className="w-full p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-left flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: node.groupColor }}
                      ></span>
                      <span className="text-slate-200 group-hover:text-emerald-300 truncate">
                        {node.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">{type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-800/80 space-y-2">
        <Button
          onClick={() => onFocusNode(selectedNode)}
          variant="primary"
          size="sm"
          className="w-full"
          icon={Focus}
        >
          Center Camera on Node
        </Button>
      </div>
    </div>
  );
}
