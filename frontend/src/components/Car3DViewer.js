import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// Simple stylized car model component
const CarModel = ({ color = '#22c55e', secondaryColor = '#000000', mods = {} }) => {
  const carRef = useRef();
  
  // Gentle rotation animation
  useFrame((state) => {
    if (carRef.current) {
      carRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.9,
    roughness: 0.1,
  });

  const secondaryMaterial = new THREE.MeshStandardMaterial({
    color: secondaryColor,
    metalness: 0.8,
    roughness: 0.2,
  });

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: '#1a1a2e',
    metalness: 0.9,
    roughness: 0.1,
    opacity: 0.7,
    transparent: true,
  });

  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: '#1f1f1f',
    metalness: 0.5,
    roughness: 0.3,
  });

  // Get neon color based on mod
  const getNeonColor = () => {
    switch(mods.neon) {
      case 'green': return '#22c55e';
      case 'cyan': return '#06b6d4';
      case 'red': return '#ef4444';
      case 'purple': return '#a855f7';
      case 'pink': return '#ec4899';
      case 'blue': return '#3b82f6';
      default: return null;
    }
  };
  
  const neonColor = getNeonColor();

  return (
    <group ref={carRef}>
      {/* Main body - lower part */}
      <mesh position={[0, 0.4, 0]} material={bodyMaterial}>
        <boxGeometry args={[4, 0.6, 1.8]} />
      </mesh>
      
      {/* Main body - cabin */}
      <mesh position={[0.2, 0.9, 0]} material={bodyMaterial}>
        <boxGeometry args={[2.2, 0.6, 1.6]} />
      </mesh>
      
      {/* Front hood slope */}
      <mesh position={[-1.2, 0.6, 0]} rotation={[0, 0, -0.3]} material={bodyMaterial}>
        <boxGeometry args={[1.2, 0.4, 1.7]} />
      </mesh>
      
      {/* Rear trunk slope */}
      <mesh position={[1.4, 0.6, 0]} rotation={[0, 0, 0.2]} material={bodyMaterial}>
        <boxGeometry args={[0.8, 0.4, 1.7]} />
      </mesh>
      
      {/* Windshield */}
      <mesh position={[-0.6, 1, 0]} rotation={[0, 0, 0.5]} material={glassMaterial}>
        <boxGeometry args={[0.8, 0.5, 1.4]} />
      </mesh>
      
      {/* Rear window */}
      <mesh position={[1.1, 1, 0]} rotation={[0, 0, -0.3]} material={glassMaterial}>
        <boxGeometry args={[0.6, 0.5, 1.4]} />
      </mesh>
      
      {/* Side windows */}
      <mesh position={[0.2, 1, 0.85]} material={glassMaterial}>
        <boxGeometry args={[1.8, 0.4, 0.1]} />
      </mesh>
      <mesh position={[0.2, 1, -0.85]} material={glassMaterial}>
        <boxGeometry args={[1.8, 0.4, 0.1]} />
      </mesh>
      
      {/* Headlights */}
      <mesh position={[-2, 0.4, 0.6]}>
        <boxGeometry args={[0.1, 0.2, 0.4]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-2, 0.4, -0.6]}>
        <boxGeometry args={[0.1, 0.2, 0.4]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Taillights */}
      <mesh position={[2, 0.4, 0.6]}>
        <boxGeometry args={[0.1, 0.2, 0.4]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[2, 0.4, -0.6]}>
        <boxGeometry args={[0.1, 0.2, 0.4]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
      
      {/* Wheels */}
      {[[-1.3, 0.15, 1], [-1.3, 0.15, -1], [1.3, 0.15, 1], [1.3, 0.15, -1]].map((pos, i) => (
        <group key={i} position={pos}>
          {/* Tire */}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={wheelMaterial}>
            <cylinderGeometry args={[0.35, 0.35, 0.3, 16]} />
          </mesh>
          {/* Rim */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, pos[2] > 0 ? 0.16 : -0.16]}>
            <cylinderGeometry args={[0.25, 0.25, 0.05, 8]} />
            <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      ))}
      
      {/* Spoiler (if equipped) */}
      {mods.spoiler && mods.spoiler !== 'none' && (
        <group position={[1.7, 1.2, 0]}>
          <mesh material={secondaryMaterial}>
            <boxGeometry args={[0.1, 0.4, 1.6]} />
          </mesh>
          <mesh position={[0, 0.25, 0]} material={secondaryMaterial}>
            <boxGeometry args={[0.4, 0.1, 1.8]} />
          </mesh>
        </group>
      )}
      
      {/* Neon underglow */}
      {neonColor && (
        <group>
          {/* Front */}
          <mesh position={[-1.5, 0.05, 0]}>
            <boxGeometry args={[0.5, 0.02, 1.5]} />
            <meshStandardMaterial color={neonColor} emissive={neonColor} emissiveIntensity={2} />
          </mesh>
          {/* Rear */}
          <mesh position={[1.5, 0.05, 0]}>
            <boxGeometry args={[0.5, 0.02, 1.5]} />
            <meshStandardMaterial color={neonColor} emissive={neonColor} emissiveIntensity={2} />
          </mesh>
          {/* Sides */}
          <mesh position={[0, 0.05, 0.9]}>
            <boxGeometry args={[3.5, 0.02, 0.1]} />
            <meshStandardMaterial color={neonColor} emissive={neonColor} emissiveIntensity={2} />
          </mesh>
          <mesh position={[0, 0.05, -0.9]}>
            <boxGeometry args={[3.5, 0.02, 0.1]} />
            <meshStandardMaterial color={neonColor} emissive={neonColor} emissiveIntensity={2} />
          </mesh>
        </group>
      )}
    </group>
  );
};

const Car3DViewer = ({ 
  color = '#22c55e', 
  secondaryColor = '#000000', 
  mods = {},
  autoRotate = true,
  height = '300px'
}) => {
  return (
    <div style={{ height, width: '100%' }} data-testid="car-3d-viewer">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[6, 3, 6]} fov={40} />
        <ambientLight intensity={0.3} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.3}
          penumbra={1}
          intensity={1}
          castShadow
        />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <Suspense fallback={null}>
          <CarModel color={color} secondaryColor={secondaryColor} mods={mods} />
          <ContactShadows
            position={[0, -0.2, 0]}
            opacity={0.5}
            scale={10}
            blur={2}
            far={4}
          />
          <Environment preset="city" />
        </Suspense>
        
        <OrbitControls
          autoRotate={autoRotate}
          autoRotateSpeed={1}
          enablePan={false}
          enableZoom={true}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.5}
          minDistance={5}
          maxDistance={15}
        />
      </Canvas>
    </div>
  );
};

export default Car3DViewer;
