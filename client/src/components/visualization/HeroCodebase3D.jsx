import React, { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Html } from "@react-three/drei";
import * as THREE from "three";
import { Cpu, Layers, Database, Server, Layout, ShieldCheck, Activity, Sparkles } from "lucide-react";

// Architectural node definitions representing the user's living codebase
const ARCH_NODES = [
  {
    id: "devra-core",
    name: "DEVRA Core",
    label: "AI Neural Engine",
    domain: "Orchestrator",
    position: [0, 2.1, 0],
    color: "#8B7CFF", // Soft Lavender
    glowColor: "#7A6AF5",
    size: 0.34,
    isCore: true,
    metrics: { status: "Active", astNodes: "12,480", sync: "Real-time" }
  },
  {
    id: "frontend",
    name: "Frontend",
    label: "Client UI & SPA",
    domain: "Presentation",
    position: [-2.5, 0.4, 0.5],
    color: "#60A5FA", // Electric Blue
    glowColor: "#3B82F6",
    size: 0.25,
    metrics: { framework: "React 19", bundle: "184 kB", components: "42" }
  },
  {
    id: "api",
    name: "API Gateway",
    label: "REST & Streaming API",
    domain: "Gateway",
    position: [0, 0.3, -0.4],
    color: "#10B981", // Emerald
    glowColor: "#059669",
    size: 0.25,
    metrics: { latency: "14ms", endpoints: "32 routes", rateLimit: "100 req/s" }
  },
  {
    id: "services",
    name: "Services & AST",
    label: "Worker & RAG Engine",
    domain: "Business Logic",
    position: [2.5, 0.4, 0.5],
    color: "#8B7CFF", // Soft Lavender
    glowColor: "#7A6AF5",
    size: 0.25,
    metrics: { workers: "4 threads", vectorIndex: "128-d L2", aiModel: "Gemini 1.5" }
  },
  {
    id: "database",
    name: "Database Layer",
    label: "MongoDB & Vector Store",
    domain: "Persistence",
    position: [0, -1.8, 0],
    color: "#F59E0B", // Amber
    glowColor: "#D97706",
    size: 0.26,
    metrics: { readyState: "Connected", collections: "8", replication: "Primary" }
  },
  // Satellite modules
  {
    id: "auth-guard",
    name: "JWT Guard",
    label: "Auth & Security",
    domain: "Security",
    position: [-1.4, 1.2, 0.2],
    color: "#8B7CFF",
    glowColor: "#7A6AF5",
    size: 0.17,
    metrics: { algorithm: "RS256", expires: "7d" }
  },
  {
    id: "vector-rag",
    name: "Codebase RAG",
    label: "Semantic Embeddings",
    domain: "AI Index",
    position: [1.5, 1.2, 0.1],
    color: "#60A5FA",
    glowColor: "#3B82F6",
    size: 0.17,
    metrics: { similarity: "Cosine", chunks: "1,240" }
  },
  {
    id: "diff-engine",
    name: "AST Reviewer",
    label: "Automated Linter",
    domain: "Review",
    position: [1.6, -0.8, 0.4],
    color: "#EF4444",
    glowColor: "#DC2626",
    size: 0.17,
    metrics: { rules: "24 rules", score: "96/100" }
  },
  {
    id: "cache-layer",
    name: "Redis Pub/Sub",
    label: "Streaming Realtime",
    domain: "Cache",
    position: [-1.5, -0.8, 0.3],
    color: "#60A5FA",
    glowColor: "#2563EB",
    size: 0.17,
    metrics: { throughput: "2.4k ops/s", memory: "18.2 MB" }
  }
];

const ARCH_EDGES = [
  ["devra-core", "frontend"],
  ["devra-core", "api"],
  ["devra-core", "services"],
  ["devra-core", "database"],
  ["devra-core", "auth-guard"],
  ["devra-core", "vector-rag"],
  ["frontend", "api"],
  ["api", "services"],
  ["api", "auth-guard"],
  ["services", "database"],
  ["services", "vector-rag"],
  ["services", "diff-engine"],
  ["database", "cache-layer"],
  ["api", "cache-layer"]
];

function LivingMeshNode({ node, isHovered, isSelected, onHover, onClick }) {
  const meshRef = useRef();
  const ringRef = useRef();

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.35;
      meshRef.current.rotation.x += delta * 0.18;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * 0.5;
    }
  });

  const scale = isHovered ? 1.3 : isSelected ? 1.18 : 1;

  return (
    <group position={node.position}>
      {/* Outer subtle orbital ring */}
      <mesh ref={ringRef} scale={scale * 1.5}>
        <ringGeometry args={[node.size * 1.1, node.size * 1.25, 32]} />
        <meshBasicMaterial
          color={node.color}
          transparent
          opacity={isHovered ? 0.8 : 0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Main interactive node geometry */}
      <mesh
        ref={meshRef}
        scale={scale}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(node);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(node);
        }}
        cursor="pointer"
      >
        <octahedronGeometry args={[node.size, 1]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.glowColor}
          emissiveIntensity={isHovered ? 0.9 : 0.35}
          roughness={0.25}
          metalness={0.7}
          wireframe={false}
        />
      </mesh>

      {/* Node label anchor */}
      <Html distanceFactor={10} position={[0, -node.size - 0.25, 0]} center>
        <div
          className={`pointer-events-none transition-all duration-150 select-none px-2 py-0.5 rounded border text-[10px] font-mono whitespace-nowrap shadow-sm ${
            isHovered
              ? "bg-brand-darkSurface text-white border-brand-lavender font-bold scale-105"
              : "bg-brand-dark/90 text-slate-200 border-slate-700"
          }`}
        >
          {node.name}
        </div>
      </Html>
    </group>
  );
}

function LivingMeshEdges({ nodesMap }) {
  const lineData = useMemo(() => {
    const points = [];
    const colors = [];

    ARCH_EDGES.forEach(([srcId, dstId]) => {
      const src = nodesMap[srcId];
      const dst = nodesMap[dstId];
      if (src && dst) {
        points.push(new THREE.Vector3(...src.position));
        points.push(new THREE.Vector3(...dst.position));

        const c1 = new THREE.Color(src.color);
        const c2 = new THREE.Color(dst.color);
        colors.push(c1.r, c1.g, c1.b);
        colors.push(c2.r, c2.g, c2.b);
      }
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geometry;
  }, [nodesMap]);

  return (
    <lineSegments geometry={lineData}>
      <lineBasicMaterial vertexColors transparent opacity={0.3} linewidth={1} />
    </lineSegments>
  );
}

function FloatingSceneGroup({ hoveredNode, selectedNode, onHoverNode, onSelectNode }) {
  const groupRef = useRef();

  useFrame(({ mouse }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        mouse.x * 0.2,
        0.05
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        -mouse.y * 0.12,
        0.05
      );
    }
  });

  const nodesMap = useMemo(() => {
    return ARCH_NODES.reduce((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {});
  }, []);

  return (
    <group ref={groupRef}>
      <LivingMeshEdges nodesMap={nodesMap} />
      {ARCH_NODES.map((node) => (
        <LivingMeshNode
          key={node.id}
          node={node}
          isHovered={hoveredNode?.id === node.id}
          isSelected={selectedNode?.id === node.id}
          onHover={onHoverNode}
          onClick={onSelectNode}
        />
      ))}
    </group>
  );
}

export default function HeroCodebase3D() {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(ARCH_NODES[0]);

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden border border-brand-darkBorder bg-brand-dark shadow-2xl">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand-lavender/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-60 h-60 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

      {/* R3F Canvas */}
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <pointLight position={[0, 0, 2]} intensity={1.4} color="#8B7CFF" />
        <pointLight position={[-3, 2, -1]} intensity={0.9} color="#60A5FA" />

        <FloatingSceneGroup
          hoveredNode={hoveredNode}
          selectedNode={selectedNode}
          onHoverNode={setHoveredNode}
          onSelectNode={setSelectedNode}
        />
      </Canvas>

      {/* Floating HUD Telemetry Panel */}
      <div className="absolute top-4 left-4 pointer-events-none select-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-darkSurface/90 border border-brand-darkBorder text-xs font-mono shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-white font-semibold">SPATIAL CODEBASE GRAPH</span>
          <span className="text-slate-500">|</span>
          <span className="text-brand-lavender">Live AST</span>
        </div>
      </div>

      {/* Bottom Node Inspector Telemetry Bar */}
      <div className="absolute bottom-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="px-4 py-2.5 rounded-xl bg-brand-darkSurface/95 border border-brand-darkBorder text-xs font-mono shadow-lg flex items-center gap-4 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: (hoveredNode || selectedNode)?.color }}
            ></span>
            <span className="font-bold text-white font-mono">
              {(hoveredNode || selectedNode)?.name}
            </span>
            <span className="text-slate-400 text-[11px]">
              ({(hoveredNode || selectedNode)?.domain})
            </span>
          </div>

          <div className="h-3 w-px bg-slate-700 hidden sm:block"></div>

          <div className="hidden sm:flex items-center gap-4 text-slate-300 text-[11px]">
            {Object.entries((hoveredNode || selectedNode)?.metrics || {}).map(([key, val]) => (
              <span key={key}>
                <span className="text-slate-400 uppercase">{key}:</span>{" "}
                <span className="text-brand-lavender font-semibold">{val}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-400 hidden md:block">
          Click or hover nodes to inspect architecture
        </div>
      </div>
    </div>
  );
}
