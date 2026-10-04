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
    color: "#38bdf8",
    glowColor: "#0284c7",
    size: 0.32,
    isCore: true,
    metrics: { status: "Active", astNodes: "12,480", sync: "Real-time" }
  },
  {
    id: "frontend",
    name: "Frontend",
    label: "Client UI & SPA",
    domain: "Presentation",
    position: [-2.5, 0.4, 0.5],
    color: "#38bdf8",
    glowColor: "#0ea5e9",
    size: 0.24,
    metrics: { framework: "React 19", bundle: "184 kB", components: "42" }
  },
  {
    id: "api",
    name: "API Gateway",
    label: "REST & Streaming API",
    domain: "Gateway",
    position: [0, 0.3, -0.4],
    color: "#34d399",
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
    color: "#a855f7",
    glowColor: "#7c3aed",
    size: 0.24,
    metrics: { workers: "4 threads", vectorIndex: "128-d L2", aiModel: "Gemini 1.5" }
  },
  {
    id: "database",
    name: "Database Layer",
    label: "MongoDB & Vector Store",
    domain: "Persistence",
    position: [0, -1.8, 0],
    color: "#fbbf24",
    glowColor: "#d97706",
    size: 0.26,
    metrics: { readyState: "Connected", collections: "8", replication: "Primary" }
  },
  // Satellite satellite modules
  {
    id: "auth-guard",
    name: "JWT Guard",
    label: "Auth & Security",
    domain: "Security",
    position: [-1.4, 1.2, 0.2],
    color: "#38bdf8",
    glowColor: "#0284c7",
    size: 0.16,
    metrics: { algorithm: "RS256", expires: "7d" }
  },
  {
    id: "vector-rag",
    name: "Codebase RAG",
    label: "Semantic Embeddings",
    domain: "AI Index",
    position: [1.5, 1.2, 0.1],
    color: "#a855f7",
    glowColor: "#7c3aed",
    size: 0.16,
    metrics: { similarity: "Cosine", chunks: "1,240" }
  },
  {
    id: "diff-engine",
    name: "AST Reviewer",
    label: "Automated Linter",
    domain: "Review",
    position: [1.6, -0.8, 0.4],
    color: "#f43f5e",
    glowColor: "#e11d48",
    size: 0.16,
    metrics: { rules: "24 rules", score: "96/100" }
  },
  {
    id: "cache-layer",
    name: "LRU Cache",
    label: "Memory Store",
    domain: "Cache",
    position: [-1.5, -0.8, 0.3],
    color: "#34d399",
    glowColor: "#059669",
    size: 0.15,
    metrics: { hitRate: "94.2%", maxItems: "5,000" }
  }
];

// Defined directional connections
const ARCH_CONNECTIONS = [
  // DEVRA core broadcasts to all top subsystems
  ["devra-core", "frontend"],
  ["devra-core", "api"],
  ["devra-core", "services"],
  ["devra-core", "auth-guard"],
  ["devra-core", "vector-rag"],
  // Middle layer inter-connections
  ["frontend", "api"],
  ["api", "services"],
  ["auth-guard", "api"],
  ["services", "vector-rag"],
  ["services", "diff-engine"],
  ["api", "cache-layer"],
  // Converge to Database
  ["frontend", "database"],
  ["api", "database"],
  ["services", "database"],
  ["cache-layer", "database"],
  ["diff-engine", "database"]
];

function SceneGraph({ hoveredNode, setHoveredNode, selectedNode, setSelectedNode, isReducedMotion }) {
  const groupRef = useRef();
  const mouseTarget = useRef({ x: 0, y: 0 });

  // Pre-calculate line vertices
  const { linePositions, nodeMap } = useMemo(() => {
    const map = {};
    ARCH_NODES.forEach((n) => {
      map[n.id] = n;
    });

    const lines = [];
    ARCH_CONNECTIONS.forEach(([fromId, toId]) => {
      const from = map[fromId];
      const to = map[toId];
      if (from && to) {
        lines.push(
          from.position[0], from.position[1], from.position[2],
          to.position[0], to.position[1], to.position[2]
        );
      }
    });

    return {
      linePositions: new Float32Array(lines),
      nodeMap: map
    };
  }, []);

  // Ambient data particles traveling through the code graph
  const particleCount = 28;
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < particleCount; i++) {
      const conn = ARCH_CONNECTIONS[i % ARCH_CONNECTIONS.length];
      arr.push({
        from: conn[0],
        to: conn[1],
        progress: Math.random(),
        speed: 0.2 + Math.random() * 0.35,
        color: i % 2 === 0 ? "#38bdf8" : "#818cf8"
      });
    }
    return arr;
  }, []);

  const particleRefs = useRef([]);

  // Mouse parallax handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      mouseTarget.current = { x, y };
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (!isReducedMotion) {
      // Subtle orbital sway + smooth mouse parallax
      const targetRotY = mouseTarget.current.x * 0.35 + Math.sin(state.clock.getElapsedTime() * 0.4) * 0.08;
      const targetRotX = -mouseTarget.current.y * 0.25 + Math.cos(state.clock.getElapsedTime() * 0.3) * 0.05;

      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, delta * 2.5);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, delta * 2.5);

      // Animate flowing data particles
      particles.forEach((p, idx) => {
        p.progress += delta * p.speed;
        if (p.progress > 1) p.progress = 0;

        const mesh = particleRefs.current[idx];
        if (mesh && nodeMap[p.from] && nodeMap[p.to]) {
          const fromPos = nodeMap[p.from].position;
          const toPos = nodeMap[p.to].position;
          mesh.position.set(
            THREE.MathUtils.lerp(fromPos[0], toPos[0], p.progress),
            THREE.MathUtils.lerp(fromPos[1], toPos[1], p.progress),
            THREE.MathUtils.lerp(fromPos[2], toPos[2], p.progress)
          );
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* Background Static Connection Lines */}
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
          opacity={0.32}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Active Glowing Lines Connected to Hovered or Selected Node */}
      {hoveredNode && (
        <group>
          {ARCH_CONNECTIONS.filter(([f, t]) => f === hoveredNode.id || t === hoveredNode.id).map(([f, t], i) => {
            const from = nodeMap[f];
            const to = nodeMap[t];
            if (!from || !to) return null;
            const pts = new Float32Array([
              from.position[0], from.position[1], from.position[2],
              to.position[0], to.position[1], to.position[2]
            ]);
            return (
              <lineSegments key={i}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={2}
                    array={pts}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color={hoveredNode.color}
                  transparent
                  opacity={0.9}
                  blending={THREE.AdditiveBlending}
                />
              </lineSegments>
            );
          })}
        </group>
      )}

      {/* Flowing Code/Data Packets */}
      {!isReducedMotion &&
        particles.map((p, idx) => (
          <mesh key={idx} ref={(el) => (particleRefs.current[idx] = el)}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color={p.color} transparent opacity={0.85} />
          </mesh>
        ))}

      {/* Living Architecture Nodes */}
      {ARCH_NODES.map((node) => {
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = selectedNode?.id === node.id;
        const scale = isHovered ? 1.35 : isSelected ? 1.25 : 1.0;

        return (
          <group key={node.id} position={node.position}>
            {/* Core Node Sphere */}
            <mesh
              scale={scale}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredNode(node);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                setHoveredNode((prev) => (prev?.id === node.id ? null : prev));
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode((prev) => (prev?.id === node.id ? null : node));
              }}
            >
              <sphereGeometry args={[node.size, node.isCore ? 24 : 16, node.isCore ? 24 : 16]} />
              <meshStandardMaterial
                color={node.color}
                emissive={node.glowColor}
                emissiveIntensity={isHovered ? 1.2 : node.isCore ? 0.8 : 0.45}
                roughness={0.2}
                metalness={0.8}
              />
            </mesh>

            {/* Orbital Rings for DEVRA Core and Main Hubs */}
            {(node.isCore || isHovered) && (
              <mesh rotation={[Math.PI / 2.5, 0, 0]}>
                <ringGeometry args={[node.size * 1.5, node.size * 1.7, 32]} />
                <meshBasicMaterial
                  color={node.color}
                  transparent
                  opacity={isHovered ? 0.75 : 0.35}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            {/* 3D Floating Node Tag */}
            <Html
              position={[0, node.size + 0.22, 0]}
              center
              distanceFactor={9}
              className="pointer-events-none select-none"
            >
              <div
                className={`px-2 py-0.5 rounded text-[10px] font-mono tracking-wide whitespace-nowrap transition-all duration-200 border backdrop-blur-md ${
                  isSelected
                    ? "bg-sky-500/90 text-white border-white font-bold shadow-lg"
                    : isHovered
                    ? "bg-slate-900/95 text-sky-300 border-sky-400 font-semibold shadow-lg shadow-sky-500/20"
                    : node.isCore
                    ? "bg-slate-900/90 text-sky-200 border-sky-500/40 font-medium"
                    : "bg-[#0B0F17]/80 text-slate-400 border-slate-800"
                }`}
              >
                {node.name}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export default function HeroCodebase3D() {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mq.matches);
    const handler = (e) => setIsReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const activeNode = selectedNode || hoveredNode || ARCH_NODES[0];

  return (
    <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[500px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#0B0F19]/90 to-[#070A10]/95 border border-slate-800/80 shadow-2xl group">
      {/* Architectural Background Grid Texture */}
      <div className="absolute inset-0 bg-devra-lines opacity-40 pointer-events-none" />

      {/* Top Status Header Badge */}
      <div className="absolute top-3.5 left-4 z-10 flex items-center gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D121F]/90 border border-slate-800 text-xs font-mono text-slate-300 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white font-semibold">Living Codebase Topology</span>
          <span className="text-slate-500">&bull;</span>
          <span className="text-sky-400">9 Active Nodes</span>
        </div>
      </div>

      {/* Top Right Legend / Hint */}
      <div className="absolute top-3.5 right-4 z-10 hidden sm:flex items-center gap-2">
        <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800 backdrop-blur-md">
          Hover to inspect &bull; Click to lock
        </span>
      </div>

      {/* Interactive 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0.4, 5.8], fov: 42 }}
        className="cursor-pointer"
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 10, 6]} intensity={1.4} color="#f8fafc" />
        <pointLight position={[-6, -4, -4]} intensity={0.8} color="#38bdf8" />
        <pointLight position={[4, -6, 2]} intensity={0.6} color="#818cf8" />

        <Float speed={isReducedMotion ? 0 : 1.2} rotationIntensity={0.2} floatIntensity={0.4}>
          <SceneGraph
            hoveredNode={hoveredNode}
            setHoveredNode={setHoveredNode}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            isReducedMotion={isReducedMotion}
          />
        </Float>
      </Canvas>

      {/* Bottom Floating Node Inspection Card */}
      <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-xs z-10 pointer-events-auto">
        <div className="p-3.5 rounded-xl bg-[#0C111C]/90 border border-slate-800/90 shadow-xl backdrop-blur-md space-y-2 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: activeNode.color }}
              />
              <span className="text-xs font-mono font-bold text-white">
                {activeNode.name}
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60">
              {activeNode.domain}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-snug">
            {activeNode.label}
          </p>

          {/* Micro-metrics grid */}
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px] font-mono">
            {Object.entries(activeNode.metrics).map(([key, val]) => (
              <div key={key} className="flex flex-col">
                <span className="text-slate-500 uppercase">{key}</span>
                <span className="text-slate-200 font-semibold truncate">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
