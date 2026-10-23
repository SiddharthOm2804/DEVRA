import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

/**
 * 3D Glass Lettering Mesh
 * Creates physical, translucent glass letterforms for DEVRA with jade tint and citron reflections.
 * Utilizes MeshPhysicalMaterial with transmission, roughness, thickness, and chromatic dispersion.
 */
function GlassTypography3D({ scrollProgress = 0, mousePos = { x: 0, y: 0 } }) {
  const groupRef = useRef();
  const lightJadeRef = useRef();
  const lightCitronRef = useRef();

  // Create curved cursive letter paths for "DEVRA"
  const letterGeometries = useMemo(() => {
    // Generate expressive cursive/calligraphic 3D ribbon curves
    // Representing D - E - V - R - A in unified flowing strokes
    const curves = [];

    // D - Majestic looping ascender and bowl
    const dPath = new THREE.CurvePath();
    const dLine = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-4.8, -1.8, 0.2),
      new THREE.Vector3(-4.6, 0.2, 0.3),
      new THREE.Vector3(-4.5, 1.8, 0.2),
      new THREE.Vector3(-4.3, 2.2, 0.1)
    );
    const dBowl = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-4.3, 2.2, 0.1),
      new THREE.Vector3(-2.8, 2.0, 0.6),
      new THREE.Vector3(-2.9, -1.6, 0.5),
      new THREE.Vector3(-4.7, -1.7, 0.1)
    );
    dPath.add(dLine);
    dPath.add(dBowl);
    curves.push({
      geo: new THREE.TubeGeometry(dPath, 64, 0.19, 16, false),
      offset: [-0.2, 0, 0]
    });

    // E - Fluid cursive loop
    const eCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.7, -0.6, 0.2),
      new THREE.Vector3(-1.7, -0.2, 0.4),
      new THREE.Vector3(-1.6, 0.9, 0.5),
      new THREE.Vector3(-2.3, 1.1, 0.3),
      new THREE.Vector3(-2.7, 0.3, 0.3),
      new THREE.Vector3(-2.1, -1.2, 0.4),
      new THREE.Vector3(-1.1, -1.4, 0.2)
    ]);
    curves.push({
      geo: new THREE.TubeGeometry(eCurve, 50, 0.16, 16, false),
      offset: [0.1, 0, 0]
    });

    // V - Sharp calligraphic descent and ascending jade sweep
    const vCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.9, 0.9, 0.2),
      new THREE.Vector3(-0.7, 0.1, 0.4),
      new THREE.Vector3(-0.1, -1.5, 0.5),
      new THREE.Vector3(0.3, -1.4, 0.4),
      new THREE.Vector3(0.8, 0.6, 0.3),
      new THREE.Vector3(1.1, 0.9, 0.2)
    ]);
    curves.push({
      geo: new THREE.TubeGeometry(vCurve, 50, 0.17, 16, false),
      offset: [0.1, 0, 0]
    });

    // R - Cursive shoulder and leg
    const rCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.2, -1.5, 0.1),
      new THREE.Vector3(1.3, 0.8, 0.3),
      new THREE.Vector3(1.4, 1.0, 0.3),
      new THREE.Vector3(2.0, 1.1, 0.5),
      new THREE.Vector3(2.3, 0.4, 0.4),
      new THREE.Vector3(1.8, 0.0, 0.3),
      new THREE.Vector3(2.4, -1.4, 0.3),
      new THREE.Vector3(2.8, -1.3, 0.2)
    ]);
    curves.push({
      geo: new THREE.TubeGeometry(rCurve, 56, 0.16, 16, false),
      offset: [0.2, 0, 0]
    });

    // A - Elegant oval and downward terminal stroke
    const aOval = new THREE.CatmullRomCurve3([
      new THREE.Vector3(4.0, 0.8, 0.2),
      new THREE.Vector3(3.3, 0.7, 0.4),
      new THREE.Vector3(3.0, -0.4, 0.4),
      new THREE.Vector3(3.6, -1.3, 0.3),
      new THREE.Vector3(4.2, -0.7, 0.3),
      new THREE.Vector3(4.2, 0.9, 0.3),
      new THREE.Vector3(4.4, -1.5, 0.2),
      new THREE.Vector3(4.9, -1.2, 0.1)
    ]);
    curves.push({
      geo: new THREE.TubeGeometry(aOval, 56, 0.17, 16, false),
      offset: [0.3, 0, 0]
    });

    return curves;
  }, []);

  // Jade Translucent Glass Material
  // Reacts to opacity decay from user scroll
  const glassMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#55D6BE"), // Mineral Jade
      emissive: new THREE.Color("#0d2e28"),
      emissiveIntensity: 0.35,
      metalness: 0.1,
      roughness: 0.12,
      transmission: 0.92, // Real translucent glass
      thickness: 1.4,
      ior: 1.45,
      transparent: true,
      opacity: 0.85,
      reflectivity: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });
  }, []);

  // Frame animation: gentle breathing, mouse parallax, scroll fading
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const t = state.clock.getElapsedTime();

    // Gentle floating undulation
    groupRef.current.position.y = Math.sin(t * 0.7) * 0.08;
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      mousePos.x * 0.4,
      0.05
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      mousePos.x * 0.08 + Math.sin(t * 0.4) * 0.02,
      0.05
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      -mousePos.y * 0.06,
      0.05
    );

    // Scroll-linked opacity & depth reduction
    // Top of page (progress=0) -> Opacity ~ 0.85
    // Scrolled down (progress=1) -> Opacity fades smoothly to 0.12
    const targetOpacity = Math.max(0.12, 0.85 * (1 - scrollProgress * 1.3));
    glassMaterial.opacity = THREE.MathUtils.lerp(glassMaterial.opacity, targetOpacity, 0.1);

    // Dynamic Jade / Citron lighting orbital animation
    if (lightJadeRef.current) {
      lightJadeRef.current.position.x = Math.sin(t * 0.8) * 5;
      lightJadeRef.current.position.y = Math.cos(t * 0.6) * 3 + 1;
    }
    if (lightCitronRef.current) {
      lightCitronRef.current.position.x = Math.cos(t * 0.7) * 4;
      lightCitronRef.current.position.z = Math.sin(t * 0.9) * 3 + 2;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -0.5]} scale={[1.15, 1.15, 1.15]}>
      {/* Jade Edge Lighting & Citron Rim Light */}
      <pointLight
        ref={lightJadeRef}
        color="#55D6BE"
        intensity={2.8}
        distance={14}
        decay={2}
        position={[2, 2, 3]}
      />
      <pointLight
        ref={lightCitronRef}
        color="#D5E56B"
        intensity={2.2}
        distance={12}
        decay={2}
        position={[-3, -1, 2]}
      />
      <ambientLight intensity={0.5} color="#112522" />

      {/* Glass Curves rendering DEVRA */}
      {letterGeometries.map((letter, idx) => (
        <mesh
          key={idx}
          geometry={letter.geo}
          material={glassMaterial}
          position={letter.offset}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

/**
 * Fallback Dimensional Glass Typography (CSS/SVG Based)
 * Used if WebGL fails or user prefers reduced motion
 */
function FallbackGlassTypography({ scrollOpacity = 1 }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none select-none transition-opacity duration-300 overflow-hidden"
      style={{ opacity: scrollOpacity }}
    >
      <div className="relative font-display font-extrabold uppercase text-[clamp(4.5rem,16vw,15rem)] leading-none tracking-[0.12em] text-transparent bg-clip-text bg-gradient-to-r from-abyssal-jade/25 via-abyssal-citron/20 to-abyssal-jade/30 drop-shadow-[0_20px_40px_rgba(85,214,190,0.2)] blur-[0.4px] scale-105 transform -translate-y-4">
        DEVRA
      </div>
    </div>
  );
}

/**
 * Main Hero 3D Glass Typography Container
 * Mounts full Canvas with scroll listener, mouse parallax, and performance controls.
 */
export default function HeroGlassTypography3D() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hasWebGL, setHasWebGL] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Detect reduced motion
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);
    const motionHandler = (e) => setPrefersReducedMotion(e.matches);
    motionQuery.addEventListener("change", motionHandler);

    // Test WebGL availability
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }

    // Scroll opacity calculation
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight * 0.9;
      const progress = Math.min(1, Math.max(0, scrollY / heroHeight));
      setScrollProgress(progress);
    };

    // Mouse parallax
    const handleMouseMove = (e) => {
      if (prefersReducedMotion) return;
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      motionQuery.removeEventListener("change", motionHandler);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [prefersReducedMotion]);

  // Dynamic opacity calculation for ambient container
  const containerOpacity = Math.max(0.12, 1 - scrollProgress * 1.15);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none transition-opacity duration-300"
      style={{ opacity: containerOpacity }}
    >
      {/* Deep Petrol Radial Glow behind the Glass Letters */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[900px] h-[450px] bg-abyssal-jade/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-abyssal-citron/8 blur-[110px] rounded-full pointer-events-none" />

      {/* Stylized background typographic overlay for enhanced depth */}
      <div className="absolute inset-0 flex items-center justify-center -translate-y-2">
        <span
          className="font-display font-extrabold uppercase text-[clamp(4.5rem,19vw,18rem)] leading-none text-abyssal-jade/[0.055] blur-[1.5px] select-none scale-110 tracking-[0.18em]"
          style={{
            transform: `translate3d(${mousePos.x * -12}px, ${mousePos.y * -8}px, 0)`
          }}
        >
          Devra
        </span>
      </div>

      {hasWebGL && !prefersReducedMotion ? (
        <Canvas
          camera={{ position: [0, 0, 5.2], fov: 50 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
          }}
          className="w-full h-full"
        >
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
            <GlassTypography3D
              scrollProgress={scrollProgress}
              mousePos={mousePos}
            />
          </Float>
        </Canvas>
      ) : (
        <FallbackGlassTypography scrollOpacity={containerOpacity} />
      )}
    </div>
  );
}
