import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import * as THREE from "three";

// Subtle interactive 3D Codebase Node Network
function CodebaseGraph({ hovered, setHovered }) {
  const groupRef = useRef();

  // Create subtle nodes and connecting lines
  const { nodePositions, linePositions } = useMemo(() => {
    const nodes = [
      [0, 0, 0],         // Root AST node
      [1.4, 0.6, 0.4],   // Auth Service
      [-1.3, 0.8, -0.2], // API Gateway
      [0.8, -1.2, 0.5],  // Database Layer
      [-0.9, -1.1, -0.6],// Parser Worker
      [1.6, -0.4, -0.8], // 3D Render Loop
      [-1.5, -0.2, 1.1]  // VS Code Extension
    ];

    const lines = [];
    // Connect root to all outer nodes
    for (let i = 1; i < nodes.length; i++) {
      lines.push(...nodes[0], ...nodes[i]);
    }
    // Cross connections for cluster topology
    lines.push(...nodes[1], ...nodes[5]);
    lines.push(...nodes[2], ...nodes[6]);
    lines.push(...nodes[3], ...nodes[4]);

    return {
      nodePositions: nodes,
      linePositions: new Float32Array(lines)
    };
  }, []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.25;
      groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Interconnecting Wire Lines */}
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
          color="#0284c7"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Code Nodes */}
      {nodePositions.map((pos, index) => {
        const isRoot = index === 0;
        return (
          <mesh
            key={index}
            position={pos}
            onPointerOver={() => setHovered(index)}
            onPointerOut={() => setHovered(null)}
          >
            <sphereGeometry args={[isRoot ? 0.22 : 0.14, 16, 16]} />
            <meshStandardMaterial
              color={
                hovered === index
                  ? "#38bdf8"
                  : isRoot
                  ? "#0284c7"
                  : "#1e293b"
              }
              emissive={
                hovered === index
                  ? "#0284c7"
                  : isRoot
                  ? "#0369a1"
                  : "#0f172a"
              }
              emissiveIntensity={hovered === index ? 0.9 : 0.4}
              roughness={0.3}
              metalness={0.7}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default function ThreeScene() {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="relative w-full h-[340px] sm:h-[380px] rounded-xl overflow-hidden bg-[#0A0D14] border border-slate-800">
      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        className="cursor-grab active:cursor-grabbing"
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} color="#f8fafc" />
        <pointLight position={[-5, -5, -3]} intensity={0.5} color="#38bdf8" />
        
        <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.6}>
          <CodebaseGraph hovered={hovered} setHovered={setHovered} />
        </Float>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={true}
          autoRotateSpeed={0.8}
          maxPolarAngle={Math.PI / 1.6}
          minPolarAngle={Math.PI / 2.6}
        />
      </Canvas>

      {/* Top Subtle Pill */}
      <div className="absolute top-3 left-3 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0F1420]/90 border border-slate-800 text-[11px] font-mono text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
          <span>Spatial AST Topology &bull; 7 Modules</span>
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 right-3 pointer-events-none">
        <span className="text-[10px] font-mono text-slate-500">
          Interactive &bull; Drag to inspect
        </span>
      </div>
    </div>
  );
}
