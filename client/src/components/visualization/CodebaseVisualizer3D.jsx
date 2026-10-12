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
  Cpu,
  Zap,
  Gauge,
  Sliders,
  Code
} from "lucide-react";
import {
  buildGraphLayout,
  filterGraphForLOD,
  determineLODLevel,
  LOD_LEVELS,
  LOD_THRESHOLDS,
  GROUP_CONFIG
} from "./graphLayout";
import NodeDetailsPanel from "./NodeDetailsPanel";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

// Pre-allocated shared geometries and materials for zero-waste instancing & single-draw-call rendering
const SHARED_SPHERE_GEO = new THREE.SphereGeometry(1, 16, 16);
const SHARED_STANDARD_MAT = new THREE.MeshStandardMaterial({
  roughness: 0.25,
  metalness: 0.75,
  transparent: true,
  opacity: 0.95
});
const SHARED_RING_GEO = new THREE.RingGeometry(1.3, 1.5, 32);

// Reusable Three.js objects to avoid per-frame garbage collection
const _tempObj = new THREE.Object3D();
const _tempColor = new THREE.Color();
const _zeroVec = new THREE.Vector3(0, 0, 0);

// Smooth Camera Motion Controller
function CameraController({ targetFocus, resetTrigger, controlsRef }) {
  const { camera } = useThree();
  const animatingRef = useRef(false);
  const targetCamPos = useRef(new THREE.Vector3(0, 3.5, 14));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    if (targetFocus) {
      animatingRef.current = true;
      const [x, y, z] = targetFocus.position;
      targetLookAt.current.set(x, y, z);
      targetCamPos.current.set(x, y + 0.6, z + 3.2);
    }
  }, [targetFocus]);

  useEffect(() => {
    if (resetTrigger > 0) {
      animatingRef.current = true;
      targetLookAt.current.set(0, 0, 0);
      targetCamPos.current.set(0, 3.5, 14);
    }
  }, [resetTrigger]);

  useFrame((state, delta) => {
    if (!animatingRef.current) return;

    camera.position.lerp(targetCamPos.current, delta * 4.5);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, delta * 4.5);
      controlsRef.current.update();
    }

    if (
      camera.position.distanceTo(targetCamPos.current) < 0.05 &&
      (!controlsRef.current || controlsRef.current.target.distanceTo(targetLookAt.current) < 0.05)
    ) {
      animatingRef.current = false;
    }
  });

  return null;
}

// Camera Distance Tracker with Hysteresis & Adaptive Performance Monitor
function CameraLODTracker({ controlsRef, onDistanceChange, onFpsChange }) {
  const { camera } = useThree();
  const lastDistRef = useRef(14);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useFrame(() => {
    // 1. Distance measurement for LOD
    const target = controlsRef.current ? controlsRef.current.target : _zeroVec;
    const dist = camera.position.distanceTo(target);
    if (Math.abs(dist - lastDistRef.current) > 0.15) {
      lastDistRef.current = dist;
      onDistanceChange(dist);
    }

    // 2. FPS sampling for adaptive quality
    frameCountRef.current++;
    if (frameCountRef.current >= 45) {
      const now = performance.now();
      const elapsed = (now - lastTimeRef.current) / 1000;
      const fps = Math.round(frameCountRef.current / elapsed);
      onFpsChange(fps);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
  });

  return null;
}

// Batched Line Segments for extreme performance across LOD levels
const GraphLines = React.memo(function GraphLines({
  linePositions,
  edges,
  activeNodeId,
  isEcoMode
}) {
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

  // In eco mode, render fewer background lines to guarantee 60fps
  const effectiveLinePositions = useMemo(() => {
    if (!isEcoMode || linePositions.length <= 3000) return linePositions;
    return linePositions.slice(0, 3000);
  }, [linePositions, isEcoMode]);

  return (
    <group>
      {/* Background Static Edges */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={effectiveLinePositions.length / 3}
            array={effectiveLinePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#334155"
          transparent
          opacity={activeNodeId ? 0.12 : isEcoMode ? 0.25 : 0.38}
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

// High-Performance Instanced Nodes for hundreds/thousands of file nodes (1 single draw call)
const InstancedFileNodes = React.memo(function InstancedFileNodes({
  nodes,
  viewMode,
  hoveredNodeId,
  selectedNodeId,
  activeNodeId,
  connectedNodeIds,
  onPointerOver,
  onPointerOut,
  onClick,
  onDoubleClick
}) {
  const meshRef = useRef();

  useEffect(() => {
    if (!meshRef.current || nodes.length === 0) return;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isHovered = node.id === hoveredNodeId;
      const isSelected = node.id === selectedNodeId;
      const isDimmed = activeNodeId && !isHovered && !isSelected && !connectedNodeIds.has(node.id);

      // Position & Scale
      _tempObj.position.set(node.position[0], node.position[1], node.position[2]);
      const scaleMultiplier = isHovered ? 1.4 : isSelected ? 1.3 : isDimmed ? 0.75 : 1.0;
      const r = (node.radius || 0.18) * scaleMultiplier;
      _tempObj.scale.set(r, r, r);
      _tempObj.updateMatrix();

      meshRef.current.setMatrixAt(i, _tempObj.matrix);

      // Color
      let colorHex = node.groupColor;
      if (viewMode === "Health") {
        const score = node.complexity?.score ? 100 - node.complexity.score : 92;
        if (score >= 88) colorHex = "#10b981";
        else if (score >= 70) colorHex = "#38bdf8";
        else if (score >= 50) colorHex = "#fbbf24";
        else colorHex = "#f43f5e";
      } else if (viewMode === "Dependencies") {
        colorHex = "#818cf8";
      }

      _tempColor.set(colorHex);
      if (isDimmed) {
        _tempColor.multiplyScalar(0.28);
      } else if (isHovered || isSelected) {
        _tempColor.offsetHSL(0, 0, 0.18);
      }
      meshRef.current.setColorAt(i, _tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [nodes, viewMode, hoveredNodeId, selectedNodeId, activeNodeId, connectedNodeIds]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[SHARED_SPHERE_GEO, SHARED_STANDARD_MAT, nodes.length]}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (e.instanceId !== undefined && nodes[e.instanceId]) {
          onPointerOver(nodes[e.instanceId]);
        }
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut();
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.instanceId !== undefined && nodes[e.instanceId]) {
          onClick(nodes[e.instanceId]);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (e.instanceId !== undefined && nodes[e.instanceId]) {
          onDoubleClick(nodes[e.instanceId]);
        }
      }}
    />
  );
});

// Domain Cluster Hub / Anchor Node with rotating halo
const ClusterHubNode = React.memo(function ClusterHubNode({
  node,
  isHovered,
  isSelected,
  viewMode,
  onPointerOver,
  onPointerOut,
  onClick,
  onDoubleClick
}) {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
    }
  });

  const nodeColor = node.groupColor;
  const scale = isHovered ? 1.35 : isSelected ? 1.25 : 1.0;

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
        <sphereGeometry args={[node.radius, 20, 20]} />
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={isHovered ? 1.4 : isSelected ? 1.1 : 0.65}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Outer Halo Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[node.radius * 1.35, node.radius * 1.55, 32]} />
        <meshBasicMaterial
          color={nodeColor}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Hub 3D Label Tag */}
      <Html
        position={[0, node.radius + 0.3, 0]}
        center
        distanceFactor={11}
        className="pointer-events-none select-none"
      >
        <div
          className={`px-2.5 py-1 rounded shadow-lg text-[10px] font-mono whitespace-nowrap border backdrop-blur-md transition-all ${
            isSelected
              ? "bg-sky-500/90 text-white border-white/50 font-bold"
              : isHovered
              ? "bg-slate-900/95 text-sky-300 border-sky-400 font-semibold"
              : "bg-slate-900/85 text-slate-200 border-slate-700 font-medium"
          }`}
        >
          {node.name}
          <span className="ml-1.5 opacity-75 text-[9px] text-sky-300">
            ({node.fileCount} files)
          </span>
        </div>
      </Html>
    </group>
  );
});

// Level 3 Deep Inspection: Micro-AST Symbols Orbiting Focused File
const DeepInspectionSymbols = React.memo(function DeepInspectionSymbols({
  selectedNode
}) {
  const groupRef = useRef();

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  if (!selectedNode || !selectedNode.symbols || selectedNode.symbols.length === 0) {
    return null;
  }

  const symbols = selectedNode.symbols.slice(0, 4);

  return (
    <group ref={groupRef} position={selectedNode.position}>
      {symbols.map((sym, idx) => {
        const angle = (idx / symbols.length) * Math.PI * 2;
        const dist = (selectedNode.radius || 0.25) + 0.55;
        const px = Math.cos(angle) * dist;
        const py = (idx % 2 === 0 ? 0.2 : -0.2);
        const pz = Math.sin(angle) * dist;

        return (
          <group key={idx} position={[px, py, pz]}>
            <mesh scale={0.06}>
              <sphereGeometry args={[1, 12, 12]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
            <Html center distanceFactor={8} className="pointer-events-none select-none">
              <div className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-sky-500/40 text-[8px] font-mono text-sky-200 whitespace-nowrap shadow-md">
                <span className="text-slate-400 mr-1">{sym.kind}:</span>
                <strong>{sym.name}</strong>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
});

// Domain Cluster Ground Indicators
function ClusterGroundIndicators({ groupConfig }) {
  return (
    <group position={[0, -4.5, 0]}>
      {Object.entries(groupConfig).map(([name, conf]) => (
        <group key={name} position={[conf.center[0], 0, conf.center[2]]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[2.2, 32]} />
            <meshBasicMaterial
              color={conf.color}
              transparent
              opacity={0.06}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.15, 2.2, 32]} />
            <meshBasicMaterial
              color={conf.color}
              transparent
              opacity={0.2}
              depthWrite={false}
            />
          </mesh>
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
 * Main 3D Codebase Visualizer Component with Level of Detail (LOD) & Instancing
 */
export default function CodebaseVisualizer3D({
  analysis,
  repo,
  initialViewMode = "Architecture"
}) {
  const [selectedGroup, setSelectedGroup] = useState("All");
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [targetFocus, setTargetFocus] = useState(null);

  // LOD & Performance States
  const [activeLodLevel, setActiveLodLevel] = useState(LOD_LEVELS.MODULE);
  const [manualLodLock, setManualLodLock] = useState(null); // null = Auto camera driven
  const [measuredFps, setMeasuredFps] = useState(60);
  const [isEcoMode, setIsEcoMode] = useState(false);

  const containerRef = useRef(null);
  const controlsRef = useRef(null);

  // 1. Build Graph Layout with full repository support (no 10-node truncation)
  const fullGraph = useMemo(() => {
    return buildGraphLayout(analysis, repo, { maxNodes: 10000 });
  }, [analysis, repo]);

  // 2. Camera distance change handler with hysteresis guard
  const handleDistanceChange = useCallback((distance) => {
    if (manualLodLock !== null) return;
    setActiveLodLevel((currentLOD) => determineLODLevel(distance, currentLOD));
  }, [manualLodLock]);

  // 3. Adaptive FPS Tracker handler
  const handleFpsChange = useCallback((fps) => {
    setMeasuredFps(fps);
    if (fps < 32 && !isEcoMode) {
      setIsEcoMode(true);
    } else if (fps > 52 && isEcoMode) {
      setIsEcoMode(false);
    }
  }, [isEcoMode]);

  // 4. Effective LOD Level based on manual lock or camera distance
  const currentLOD = manualLodLock !== null ? manualLodLock : activeLodLevel;

  // 5. Filter graph for active LOD level, group, and search query
  const filteredGraph = useMemo(() => {
    return filterGraphForLOD(fullGraph, currentLOD, {
      activeCluster: selectedGroup,
      searchQuery
    });
  }, [fullGraph, currentLOD, selectedGroup, searchQuery]);

  const { nodes: visibleNodes, edges: visibleEdges, linePositions } = filteredGraph;

  // Partition visible nodes into Hubs and Regular file nodes for instancing
  const { hubNodes, fileNodes } = useMemo(() => {
    const hubs = [];
    const files = [];
    visibleNodes.forEach((n) => {
      if (n.isHub) hubs.push(n);
      else files.push(n);
    });
    return { hubNodes: hubs, fileNodes: files };
  }, [visibleNodes]);

  // Connected node set for active selection dimming
  const activeNodeId = hoveredNode?.id || selectedNode?.id;
  const connectedNodeIds = useMemo(() => {
    const set = new Set();
    if (!activeNodeId) return set;
    visibleEdges.forEach((e) => {
      if (e.fromId === activeNodeId) set.add(e.toId);
      if (e.toId === activeNodeId) set.add(e.fromId);
    });
    return set;
  }, [activeNodeId, visibleEdges]);

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

  // LOD Labels
  const lodLabels = {
    [LOD_LEVELS.OVERVIEW]: "L0 Overview",
    [LOD_LEVELS.MODULE]: "L1 Module",
    [LOD_LEVELS.FILE]: "L2 File Detail",
    [LOD_LEVELS.DEEP]: "L3 Deep AST"
  };

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
            All ({fullGraph.nodes.length})
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
              className="pl-7 pr-3 py-1 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-32 sm:w-40 transition-all"
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

        {/* Right: LOD Level Selector & Camera Action Tools */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#0B0F17]/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
          {/* LOD Level Pill / Manual Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800/80 mr-1">
            <button
              onClick={() => setManualLodLock(null)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                manualLodLock === null
                  ? "bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Automatic Camera LOD"
            >
              Auto
            </button>
            {[
              { level: LOD_LEVELS.OVERVIEW, label: "L0" },
              { level: LOD_LEVELS.MODULE, label: "L1" },
              { level: LOD_LEVELS.FILE, label: "L2" },
              { level: LOD_LEVELS.DEEP, label: "L3" }
            ].map(({ level, label }) => (
              <button
                key={level}
                onClick={() => setManualLodLock(level)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all ${
                  currentLOD === level
                    ? "bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title={lodLabels[level]}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-800 mx-0.5"></div>

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
          gl={{
            antialias: !isEcoMode,
            alpha: false,
            powerPreference: "high-performance"
          }}
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

          {/* Batched Wireframe Edges across LOD levels */}
          <GraphLines
            linePositions={linePositions}
            edges={visibleEdges}
            activeNodeId={activeNodeId}
            isEcoMode={isEcoMode}
          />

          {/* High-Performance Instanced File Nodes (1 draw call for thousands of files) */}
          {fileNodes.length > 0 && (
            <InstancedFileNodes
              nodes={fileNodes}
              viewMode={viewMode}
              hoveredNodeId={hoveredNode?.id}
              selectedNodeId={selectedNode?.id}
              activeNodeId={activeNodeId}
              connectedNodeIds={connectedNodeIds}
              onPointerOver={handlePointerOver}
              onPointerOut={handlePointerOut}
              onClick={handleClick}
              onDoubleClick={handleDoubleClick}
            />
          )}

          {/* Cluster Anchor / Hub Nodes */}
          <group>
            {hubNodes.map((hub) => (
              <ClusterHubNode
                key={hub.id}
                node={hub}
                isHovered={hoveredNode?.id === hub.id}
                isSelected={selectedNode?.id === hub.id}
                viewMode={viewMode}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
              />
            ))}
          </group>

          {/* Level 3 Deep Inspection: AST Symbols for focused node */}
          {selectedNode && (
            <DeepInspectionSymbols selectedNode={selectedNode} />
          )}

          {/* Selected/Hovered Node Halo Indicator & Tag */}
          {selectedNode && !selectedNode.isHub && (
            <group position={selectedNode.position}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[selectedNode.radius * 1.3, selectedNode.radius * 1.5, 24]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} side={THREE.DoubleSide} />
              </mesh>
              <Html
                position={[0, selectedNode.radius + 0.28, 0]}
                center
                distanceFactor={10}
                className="pointer-events-none select-none"
              >
                <div className="px-2 py-0.5 rounded shadow-lg text-[10px] font-mono whitespace-nowrap bg-sky-500/90 text-white border border-white/40 font-bold backdrop-blur-md">
                  {selectedNode.name}
                </div>
              </Html>
            </group>
          )}

          {hoveredNode && !hoveredNode.isHub && hoveredNode.id !== selectedNode?.id && (
            <group position={hoveredNode.position}>
              <Html
                position={[0, hoveredNode.radius + 0.24, 0]}
                center
                distanceFactor={10}
                className="pointer-events-none select-none"
              >
                <div className="px-2 py-0.5 rounded shadow-md text-[10px] font-mono whitespace-nowrap bg-slate-900/95 text-sky-300 border border-sky-400 font-semibold backdrop-blur-md">
                  {hoveredNode.name}
                </div>
              </Html>
            </group>
          )}

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

          {/* Camera LOD & Performance Tracker */}
          <CameraLODTracker
            controlsRef={controlsRef}
            onDistanceChange={handleDistanceChange}
            onFpsChange={handleFpsChange}
          />
        </Canvas>
      </div>

      {/* Floating Bottom Left Telemetry Pill */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#0B0F17]/90 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300 shadow-xl">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                measuredFps >= 50 ? "bg-emerald-400" : measuredFps >= 30 ? "bg-amber-400" : "bg-rose-400"
              } animate-pulse`}
            ></span>
            <span className="font-semibold text-white">Spatial AST</span>
          </div>
          <span className="text-slate-500">&bull;</span>
          <span className="text-sky-300 font-semibold">{lodLabels[currentLOD]}</span>
          <span className="text-slate-500">&bull;</span>
          <span>{visibleNodes.length} / {fullGraph.nodes.length} Nodes</span>
          <span className="text-slate-500">&bull;</span>
          <span>{visibleEdges.length} Edges</span>
          <span className="text-slate-500">&bull;</span>
          <span className={`${measuredFps >= 50 ? "text-emerald-400" : "text-amber-400"}`}>
            {measuredFps} FPS {isEcoMode && "(Eco)"}
          </span>
          {hoveredNode && (
            <>
              <span className="text-slate-500">&bull;</span>
              <span className="text-sky-300 font-medium truncate max-w-[140px]">
                {hoveredNode.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Floating Bottom Right Navigation Hint */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-none hidden md:block">
        <div className="px-3 py-1.5 rounded-xl bg-[#0B0F17]/80 backdrop-blur-md border border-slate-800/80 text-[10px] font-mono text-slate-400">
          Double-click to focus &bull; Drag to rotate &bull; Scroll to zoom LOD
        </div>
      </div>

      {/* Side Information Panel */}
      <div className="absolute top-0 right-0 bottom-0 z-30 pointer-events-auto">
        <NodeDetailsPanel
          selectedNode={selectedNode}
          onClose={() => setSelectedNode(null)}
          onFocusNode={handleFocusNode}
          onSelectNode={handleClick}
          nodesById={fullGraph.nodesById}
          edges={visibleEdges}
          groupConfig={GROUP_CONFIG}
        />
      </div>
    </div>
  );
}
