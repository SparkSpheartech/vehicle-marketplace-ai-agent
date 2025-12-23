import React, { useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// Procedural Sports Car Component
const SportsCar = ({ color = '#22c55e', secondaryColor = '#000000', mods = {} }) => {
  const meshRef = useRef();
  const wheelsRef = useRef([]);

  // Get neon color based on mod
  const neonColor = useMemo(() => {
    switch (mods?.neon) {
      case 'green': return '#22c55e';
      case 'cyan': return '#06b6d4';
      case 'red': return '#ef4444';
      case 'purple': return '#a855f7';
      case 'pink': return '#ec4899';
      case 'blue': return '#3b82f6';
      default: return null;
    }
  }, [mods?.neon]);

  // Animate wheels
  useFrame((state, delta) => {
    wheelsRef.current.forEach((wheel) => {
      if (wheel) {
        wheel.rotation.x += delta * 2;
      }
    });
  });

  // Create body material
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.8,
      roughness: 0.2,
      envMapIntensity: 1.5,
    });
  }, [color]);

  // Glass material
  const glassMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#1a1a2e',
      transparent: true,
      opacity: 0.7,
      metalness: 0.9,
      roughness: 0.1,
    });
  }, []);

  // Wheel material
  const wheelMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#1a1a1a',
      metalness: 0.3,
      roughness: 0.8,
    });
  }, []);

  // Rim material
  const rimMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#888888',
      metalness: 0.9,
      roughness: 0.1,
    });
  }, []);

  // Light materials
  const headlightMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#ffffff',
      emissiveIntensity: 2,
    });
  }, []);

  const taillightMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#ff0000',
      emissive: '#ff0000',
      emissiveIntensity: 1.5,
    });
  }, []);

  // Neon underglow material
  const neonMaterial = useMemo(() => {
    if (!neonColor) return null;
    return new THREE.MeshStandardMaterial({
      color: neonColor,
      emissive: neonColor,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 0.8,
    });
  }, [neonColor]);

  // Stripe material
  const stripeMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: secondaryColor,
      metalness: 0.7,
      roughness: 0.3,
    });
  }, [secondaryColor]);

  // Create wheel
  const Wheel = ({ position, ref }) => (
    <group position={position}>
      {/* Tire */}
      <mesh ref={ref} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.25, 32]} />
        <primitive object={wheelMaterial} attach="material" />
      </mesh>
      {/* Rim */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.26, 16]} />
        <primitive object={rimMaterial} attach="material" />
      </mesh>
      {/* Rim spokes */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <mesh
          key={i}
          rotation={[0, 0, Math.PI / 2]}
          position={[
            Math.sin((angle * Math.PI) / 180) * 0.12,
            0.14,
            Math.cos((angle * Math.PI) / 180) * 0.12,
          ]}
        >
          <boxGeometry args={[0.02, 0.02, 0.2]} />
          <primitive object={rimMaterial} attach="material" />
        </mesh>
      ))}
    </group>
  );

  return (
    <group ref={meshRef} scale={1.2}>
      {/* Main body - lower section */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.5, 1.3]} />
        <primitive object={bodyMaterial} attach="material" />
      </mesh>

      {/* Front hood - sloped */}
      <mesh position={[1.1, 0.45, 0]} rotation={[0, 0, -0.15]} castShadow>
        <boxGeometry args={[0.8, 0.3, 1.25]} />
        <primitive object={bodyMaterial} attach="material" />
      </mesh>

      {/* Rear trunk - sloped */}
      <mesh position={[-1.0, 0.45, 0]} rotation={[0, 0, 0.1]} castShadow>
        <boxGeometry args={[0.7, 0.35, 1.25]} />
        <primitive object={bodyMaterial} attach="material" />
      </mesh>

      {/* Cabin/roof */}
      <mesh position={[0.1, 0.75, 0]} castShadow>
        <boxGeometry args={[1.4, 0.45, 1.2]} />
        <primitive object={bodyMaterial} attach="material" />
      </mesh>

      {/* Front windshield */}
      <mesh position={[0.75, 0.75, 0]} rotation={[0, 0, -0.45]} castShadow>
        <boxGeometry args={[0.6, 0.02, 1.1]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>

      {/* Rear windshield */}
      <mesh position={[-0.55, 0.75, 0]} rotation={[0, 0, 0.35]} castShadow>
        <boxGeometry args={[0.5, 0.02, 1.1]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>

      {/* Side windows */}
      <mesh position={[0.15, 0.8, 0.59]} castShadow>
        <boxGeometry args={[1.2, 0.35, 0.02]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0.15, 0.8, -0.59]} castShadow>
        <boxGeometry args={[1.2, 0.35, 0.02]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>

      {/* Hood stripe (secondary color) */}
      <mesh position={[0.6, 0.62, 0]} castShadow>
        <boxGeometry args={[1.5, 0.02, 0.15]} />
        <primitive object={stripeMaterial} attach="material" />
      </mesh>

      {/* Side stripe */}
      <mesh position={[0, 0.35, 0.66]} castShadow>
        <boxGeometry args={[2.4, 0.08, 0.02]} />
        <primitive object={stripeMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 0.35, -0.66]} castShadow>
        <boxGeometry args={[2.4, 0.08, 0.02]} />
        <primitive object={stripeMaterial} attach="material" />
      </mesh>

      {/* Headlights */}
      <mesh position={[1.4, 0.35, 0.4]} castShadow>
        <boxGeometry args={[0.05, 0.12, 0.25]} />
        <primitive object={headlightMaterial} attach="material" />
      </mesh>
      <mesh position={[1.4, 0.35, -0.4]} castShadow>
        <boxGeometry args={[0.05, 0.12, 0.25]} />
        <primitive object={headlightMaterial} attach="material" />
      </mesh>

      {/* Taillights */}
      <mesh position={[-1.35, 0.4, 0.45]} castShadow>
        <boxGeometry args={[0.05, 0.1, 0.35]} />
        <primitive object={taillightMaterial} attach="material" />
      </mesh>
      <mesh position={[-1.35, 0.4, -0.45]} castShadow>
        <boxGeometry args={[0.05, 0.1, 0.35]} />
        <primitive object={taillightMaterial} attach="material" />
      </mesh>

      {/* Front grille */}
      <mesh position={[1.41, 0.25, 0]}>
        <boxGeometry args={[0.02, 0.2, 0.6]} />
        <meshStandardMaterial color="#111111" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Side mirrors */}
      <mesh position={[0.6, 0.7, 0.7]} castShadow>
        <boxGeometry args={[0.15, 0.08, 0.08]} />
        <primitive object={bodyMaterial} attach="material" />
      </mesh>
      <mesh position={[0.6, 0.7, -0.7]} castShadow>
        <boxGeometry args={[0.15, 0.08, 0.08]} />
        <primitive object={bodyMaterial} attach="material" />
      </mesh>

      {/* Spoiler (if equipped) */}
      {mods?.spoiler && mods.spoiler !== 'none' && (
        <group position={[-1.15, 0.85, 0]}>
          {/* Spoiler wing */}
          <mesh castShadow>
            <boxGeometry args={[0.25, 0.05, 1.2]} />
            <primitive object={stripeMaterial} attach="material" />
          </mesh>
          {/* Spoiler stands */}
          <mesh position={[0, -0.15, 0.4]} castShadow>
            <boxGeometry args={[0.08, 0.25, 0.05]} />
            <primitive object={stripeMaterial} attach="material" />
          </mesh>
          <mesh position={[0, -0.15, -0.4]} castShadow>
            <boxGeometry args={[0.08, 0.25, 0.05]} />
            <primitive object={stripeMaterial} attach="material" />
          </mesh>
        </group>
      )}

      {/* Neon underglow */}
      {neonMaterial && (
        <>
          {/* Front neon */}
          <mesh position={[1.2, 0.08, 0]}>
            <boxGeometry args={[0.1, 0.03, 1.0]} />
            <primitive object={neonMaterial} attach="material" />
          </mesh>
          {/* Rear neon */}
          <mesh position={[-1.2, 0.08, 0]}>
            <boxGeometry args={[0.1, 0.03, 1.0]} />
            <primitive object={neonMaterial} attach="material" />
          </mesh>
          {/* Side neons */}
          <mesh position={[0, 0.08, 0.65]}>
            <boxGeometry args={[2.2, 0.03, 0.1]} />
            <primitive object={neonMaterial} attach="material" />
          </mesh>
          <mesh position={[0, 0.08, -0.65]}>
            <boxGeometry args={[2.2, 0.03, 0.1]} />
            <primitive object={neonMaterial} attach="material" />
          </mesh>
          {/* Neon light effect on ground */}
          <pointLight
            position={[0, 0.1, 0]}
            color={neonColor}
            intensity={2}
            distance={3}
          />
        </>
      )}

      {/* Wheels */}
      <Wheel position={[0.9, 0.1, 0.7]} ref={(el) => (wheelsRef.current[0] = el)} />
      <Wheel position={[0.9, 0.1, -0.7]} ref={(el) => (wheelsRef.current[1] = el)} />
      <Wheel position={[-0.9, 0.1, 0.7]} ref={(el) => (wheelsRef.current[2] = el)} />
      <Wheel position={[-0.9, 0.1, -0.7]} ref={(el) => (wheelsRef.current[3] = el)} />
    </group>
  );
};

// Ground Grid component for NFS Unbound style
const GroundGrid = () => {
  return (
    <group position={[0, -0.01, 0]}>
      <gridHelper
        args={[20, 40, '#22c55e', '#1a1a1a']}
        rotation={[0, 0, 0]}
      />
    </group>
  );
};

// Loading spinner
const Loader = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 border-4 border-neon-green border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-zinc-400 font-mono text-sm">Loading 3D Model...</p>
    </div>
  </div>
);

// Main 3D Viewer Component
const Car3DViewer = ({
  color = '#22c55e',
  secondaryColor = '#000000',
  mods = {},
  height = '300px',
}) => {
  return (
    <div
      style={{ height, width: '100%' }}
      className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 overflow-hidden"
      data-testid="car-3d-viewer"
    >
      <Suspense fallback={<Loader />}>
        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[4, 2, 4]} fov={45} />
          
          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <spotLight
            position={[10, 10, 10]}
            angle={0.15}
            penumbra={1}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <spotLight
            position={[-10, 10, -10]}
            angle={0.15}
            penumbra={1}
            intensity={0.5}
          />
          
          {/* Key light for car */}
          <directionalLight
            position={[5, 5, 5]}
            intensity={1}
            castShadow
          />
          
          {/* Rim light */}
          <pointLight position={[-5, 3, -5]} intensity={0.5} color="#06b6d4" />

          {/* Environment for reflections */}
          <Environment preset="city" />

          {/* Car */}
          <Float
            speed={1.5}
            rotationIntensity={0.1}
            floatIntensity={0.3}
          >
            <SportsCar
              color={color}
              secondaryColor={secondaryColor}
              mods={mods}
            />
          </Float>

          {/* Ground shadow */}
          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.6}
            scale={10}
            blur={2}
            far={4}
          />

          {/* Grid */}
          <GroundGrid />

          {/* Controls */}
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.2}
            minDistance={3}
            maxDistance={8}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </Suspense>

      {/* Corner accents */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-neon-green/30 pointer-events-none" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-neon-green/30 pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-neon-green/30 pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-neon-green/30 pointer-events-none" />

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
          Drag to rotate • Scroll to zoom
        </p>
      </div>
    </div>
  );
};

export default Car3DViewer;
