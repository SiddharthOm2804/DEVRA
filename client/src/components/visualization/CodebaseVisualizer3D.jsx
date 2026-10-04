import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Float } from "@react-three/drei";
import * as THREE from "three";
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Search,
  Filter,
  Eye,
  Layers,
  Sparkles,
  Info,
  Check,
  Cpu
} from "lucide-react";
import { buildGraphLayout, GROUP_CONFIG } from "./graphLayout";
import NodeDetailsPanel from "./NodeDetailsPanel";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

// Camera Animation Controller to smoothly tween camera position and target
function CameraController({ targetFocus, resetTrigger, controlsRef }) {
  const { camera } = useThree();
  const animatingRef = useRef(false);
  const targetCamPos = useRef(new THREE.Vector3(0, 3.5, 14));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  // Handle focus on node
  useEffect(() => {
    if (targetFocus) {
      animatingRef.current = true;
      const [x, y, z] = targetFocus.position;
      targetLookAt.current.set(x, y, z);
      // Position camera offset in front of node
      targetCamPos.current.set(x, y + 0.6, z + 3.2);
    }
  }, [targetFocus]);

  // Handle camera reset
  useEffect(() => {
    if (resetTrigger > 0) {
      animatingRef.current = true;
      targetLookAt.current.set(0, 0, 0);
      targetCamPos.current.set(0, 3.5, 14);
    }
  }, [resetTrigger]);

  useFrame((state, delta) => {
    if (!animatingRef.current) return;

    // Smooth lerp
    camera.position.lerp(targetCamPos.current, delta * 4.5);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, delta * 4.5);
      controlsRef.current.update();
    }

    // Stop animation when close enough
    if (
      camera.position.distanceTo(targetCamPos.current) < 0.05 &&
      (!controlsRef.current || controlsRef.current.target.distanceTo(targetLookAt.current) < 0.05)
    ) {
      animatingRef.current = false;
    }
  });

  return null;
}

// Batched Line Segments for extreme performance (1 draw call for all graph edges)
const GraphLines = React.memo(function GraphLines({
  linePositions,
  edges,
  activeNodeId,
  nodesById
}) {
  // Highlighted edges connected to hovered or selected node
  const activeEdges = useMemo(() => {
    if (!activeNodeId) return null;
    const connected = edges.filter(
      (e) => e.fromId === activeNodeId || e.toId === activeNodeId
    );
    if (connected.length === 0) return null;

    const points = [];
    connected.forEach((e) => {
      points.push(
        e.fromPos[0], e.fromPos[1], e.fromPos[2],
        e.toPos[0], e.toPos[1], e.toPos[2]
      );
    });
    return new Float32Array(points);
  }, [activeNodeId, edges]);

  return (
    <group>
      {/* Background Static Edges */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={linePositions.length / 3}
            array={linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#334155"
          transparent
          opacity={activeNodeId ? 0.15 : 0.4}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Active Glowing Highlighted Edges */}
      {activeEdges && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={activeEdges.length / 3}
              array={activeEdges}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.95}
            linewidth={2}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      )}
    </group>
  );
});

// Single 3D Graph Node
const GraphNodeMesh = React.memo(function GraphNodeMesh({
  node,
  isHovered,
  isSelected,
  isDimmed,
  viewMode = "Architecture",
  onPointerOver,
  onPointerOut,
  onClick,
  onDoubleClick
}) {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (node.isHub && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
    }
  });

  const nodeColor = useMemo(() => {
    if (viewMode === "Health") {
      const score = node.complexity?.score ? 100 - node.complexity.score : 92;
      if (score >= 88) return "#10b981"; // Emerald
      if (score >= 70) return "#38bdf8"; // Cyan
      if (score >= 50) return "#fbbf24"; // Amber
      return "#f43f5e"; // Rose
    }
    if (viewMode === "Dependencies") {
      return node.isHub ? "#38bdf8" : "#818cf8";
    }
    return node.groupColor;
  }, [viewMode, node]);

  const scale = isHovered ? 1.4 : isSelected ? 1.3 : 1.0;
  const emissiveIntensity = isHovered ? 1.3 : isSelected ? 1.0 : node.isHub ? 0.6 : 0.3;
  const opacity = isDimmed ? 0.25 : 1.0;

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        scale={scale}
        onPointerOver={(e) => {
          e.stopPropagation();
          onPointerOver(node);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onPointerOut();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(node);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onDoubleClick(node);
        }}
      >
        <sphereGeometry args={[node.radius, node.isHub ? 20 : 16, node.isHub ? 20 : 16]} />
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.25}
          metalness={0.75}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Outer Halo Ring for Hub / Anchor Nodes */}
      {node.isHub && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[node.radius * 1.3, node.radius * 1.5, 32]} />
          <meshBasicMaterial
            color={nodeColor}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Floating 3D Label Tag on Hover or Hub */}
      {(isHovered || isSelected || node.isHub) && (
        <Html
          position={[0, node.radius + 0.25, 0]}
          center
          distanceFactor={10}
          className="pointer-events-none select-none"
        >
          <div
            className={`px-2 py-0.5 rounded shadow-lg text-[10px] font-mono whitespace-nowrap border backdrop-blur-md transition-all ${
              isSelected
                ? "bg-sky-500/90 text-white border-white/40 font-bold"
                : isHovered
                ? "bg-slate-900/90 text-sky-300 border-sky-400 font-semibold"
                : "bg-slate-900/80 text-slate-300 border-slate-700"
            }`}
          >
            {node.name}
            {viewMode === "Health" && (
              <span className="ml-1 opacity-80 text-[9px]">
                ({node.complexity?.score ? 100 - node.complexity.score : 92}% Health)
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
});

// Domain Cluster Ground Indicators
function ClusterGroundIndicators({ groupConfig }) {
  return (
    <group position={[0, -4.5, 0]}>
      {Object.entries(groupConfig).map(([name, conf]) => (
        <group key={name} position={[conf.center[0], 0, conf.center[2]]}>
          {/* Subtle glowing ground disc */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[2.2, 32]} />
            <meshBasicMaterial
              color={conf.color}
              transparent
              opacity={0.06}
              depthWrite={false}
            />
          </mesh>
          {/* Ground Ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.15, 2.2, 32]} />
            <meshBasicMaterial
              color={conf.color}
              transparent
              opacity={0.2}
              depthWrite={false}
            />
          </mesh>
          {/* Domain 3D Label */}
          <Html position={[0, 0.1, 0]} center distanceFactor={14} className="pointer-events-none">
            <span
              className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900/80 border"
              style={{ color: conf.color, borderColor: `${conf.color}40` }}
            >
              {name}
            </span>
          </Html>
        </group>
      ))}
    </group>
  );
}

/**
 * Main 3D Codebase Visualizer Component
 */
export default function CodebaseVisualizer3D({ analysis, repo, initialViewMode = "Architecture" }) {
  const [selectedGroup, setSelectedGroup] = useState("All");
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [targetFocus, setTargetFocus] = useState(null);

  const containerRef = useRef(null);
  const controlsRef = useRef(null);

  // 1. Build Graph Layout from analysis and repo
  const graph = useMemo(() => {
    return buildGraphLayout(analysis, repo);
  }, [analysis, repo]);

  const { nodes, nodesById, edges, linePositions } = graph;

  // Filter nodes based on selected group and search query
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const matchGroup = selectedGroup === "All" || node.group === selectedGroup;
      const matchSearch =
        !searchQuery.trim() ||
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.path.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGroup && matchSearch;
    });
  }, [nodes, selectedGroup, searchQuery]);

  // Pointer hover handlers
  const handlePointerOver = useCallback((node) => {
    setHoveredNode(node);
    document.body.style.cursor = "pointer";
  }, []);

  const handlePointerOut = useCallback(() => {
    setHoveredNode(null);
    document.body.style.cursor = "default";
  }, []);

  // Click & Double-click handlers
  const handleClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleDoubleClick = useCallback((node) => {
    setSelectedNode(node);
    setTargetFocus(node);
  }, []);

  const handleFocusNode = useCallback((node) => {
    setTargetFocus(node);
  }, []);

  // Camera Reset
  const handleResetCamera = () => {
    setTargetFocus(null);
    setResetTrigger((prev) => prev + 1);
  };

  // Zoom controls via OrbitControls
  const handleZoom = (inward = true) => {
    if (controlsRef.current) {
      const factor = inward ? 0.8 : 1.25;
      controlsRef.current.object.position.multiplyScalar(factor);
      controlsRef.current.update();
    }
  };

  // Active node for edge highlighting
  const activeNodeId = hoveredNode?.id || selectedNode?.id;

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-xl overflow-hidden bg-[#070A0F] border border-slate-800 transition-all ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-none h-screen w-screen"
          : "h-[650px] sm:h-[720px]"
      }`}
    >
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Mode Toggle & Group Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto bg-[#0B0F17]/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
          {/* Mode Switcher: Architecture | Dependencies | Health */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800/80">
            {["Architecture", "Dependencies", "Health"].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                  viewMode === mode
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block"></div>

          {/* All */}
          <button
            onClick={() => setSelectedGroup("All")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
              selectedGroup === "All"
                ? "bg-slate-700 text-white font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All ({nodes.length})
          </button>

          {/* Groups */}
          {Object.entries(GROUP_CONFIG).map(([name, conf]) => {
            const isCurrent = selectedGroup === name;
            return (
              <button
                key={name}
                onClick={() => setSelectedGroup(name)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
                  isCurrent
                    ? "font-semibold text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                style={{
                  backgroundColor: isCurrent ? `${conf.color}33` : "transparent",
                  borderColor: isCurrent ? conf.color : "transparent",
                  borderWidth: isCurrent ? 1 : 0
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: conf.color }}
                ></span>
                <span>{name}</span>
              </button>
            );
          })}

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block"></div>

          {/* Search Input */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search 3D AST..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-3 py-1 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-36 sm:w-44 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Camera & View Action Tools */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#0B0F17]/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset Camera (Default Perspective)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleZoom(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleZoom(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`p-1.5 rounded-lg transition-colors ${
              isAutoRotating
                ? "text-sky-400 bg-sky-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            title={isAutoRotating ? "Pause Auto-Rotation" : "Enable Orbit Auto-Rotation"}
          >
            {isAutoRotating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5"></div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen 3D Cockpit"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Three.js WebGL Canvas */}
      <div className="w-full h-full">
        <Canvas
          camera={{ position: [0, 3.5, 14], fov: 48 }}
          className="cursor-grab active:cursor-grabbing"
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          onPointerMissed={() => setSelectedNode(null)}
        >
          {/* Background color */}
          <color attach="background" args={["#070A0F"]} />

          {/* Lighting */}
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 15, 10]} intensity={1.3} color="#f8fafc" />
          <pointLight position={[-10, 8, -5]} intensity={0.6} color="#38bdf8" />
          <pointLight position={[10, -5, 5]} intensity={0.5} color="#34d399" />

          {/* Spatial Grid Ground */}
          <gridHelper args={[40, 40, "#1e293b", "#0f172a"]} position={[0, -4.5, 0]} />

          {/* Domain Cluster Ground Rings */}
          <ClusterGroundIndicators groupConfig={GROUP_CONFIG} />

          {/* Batched Wireframe Edges (1 draw call) */}
          <GraphLines
            linePositions={linePositions}
            edges={edges}
            activeNodeId={activeNodeId}
            nodesById={nodesById}
          />

          {/* Nodes */}
          <group>
            {filteredNodes.map((node) => {
              const isHovered = hoveredNode?.id === node.id;
              const isSelected = selectedNode?.id === node.id;
              const isDimmed = activeNodeId && !isHovered && !isSelected && !edges.some(
                (e) => (e.fromId === activeNodeId && e.toId === node.id) ||
                       (e.toId === activeNodeId && e.fromId === node.id)
              );

              return (
                <GraphNodeMesh
                  key={node.id}
                  node={node}
                  isHovered={isHovered}
                  isSelected={isSelected}
                  isDimmed={isDimmed}
                  viewMode={viewMode}
                  onPointerOver={handlePointerOver}
                  onPointerOut={handlePointerOut}
                  onClick={handleClick}
                  onDoubleClick={handleDoubleClick}
                />
              );
            })}
          </group>

          {/* Orbit Controls */}
          <OrbitControls
            ref={controlsRef}
            enableDamping={true}
            dampingFactor={0.08}
            minDistance={2}
            maxDistance={40}
            autoRotate={isAutoRotating}
            autoRotateSpeed={0.6}
            maxPolarAngle={Math.PI / 1.7}
            minPolarAngle={Math.PI / 8}
          />

          {/* Camera Animation Controller */}
          <CameraController
            targetFocus={targetFocus}
            resetTrigger={resetTrigger}
            controlsRef={controlsRef}
          />
        </Canvas>
      </div>

      {/* Floating Bottom Left Telemetry Pill */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#0B0F17]/90 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300 shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-white">Spatial AST</span>
          </div>
          <span className="text-slate-500">&bull;</span>
          <span>{filteredNodes.length} Nodes</span>
          <span className="text-slate-500">&bull;</span>
          <span>{edges.length} Interconnects</span>
          {hoveredNode && (
            <>
              <span className="text-slate-500">&bull;</span>
              <span className="text-sky-300 font-medium truncate max-w-[150px]">
                {hoveredNode.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Floating Bottom Right Navigation Hint */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-none hidden md:block">
        <div className="px-3 py-1.5 rounded-xl bg-[#0B0F17]/80 backdrop-blur-md border border-slate-800/80 text-[10px] font-mono text-slate-400">
          Double-click node to focus &bull; Drag to rotate &bull; Scroll to zoom
        </div>
      </div>

      {/* Side Information Panel */}
      <div className="absolute top-0 right-0 bottom-0 z-30 pointer-events-auto">
        <NodeDetailsPanel
          selectedNode={selectedNode}
          onClose={() => setSelectedNode(null)}
          onFocusNode={handleFocusNode}
          onSelectNode={handleClick}
          nodesById={nodesById}
          edges={edges}
          groupConfig={GROUP_CONFIG}
        />
      </div>
    </div>
  );
}
