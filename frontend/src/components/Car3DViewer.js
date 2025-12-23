import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Main 3D Viewer Component using vanilla Three.js
const Car3DViewer = ({
  color = '#22c55e',
  secondaryColor = '#000000',
  mods = {},
  height = '300px',
}) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const carGroupRef = useRef(null);
  const wheelsRef = useRef([]);
  const animationIdRef = useRef(null);

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

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0a0a');
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(5, 3, 5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 4;
    controls.maxDistance = 10;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff, 1.5);
    spotLight.position.set(10, 10, 10);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 2048;
    spotLight.shadow.mapSize.height = 2048;
    scene.add(spotLight);

    const spotLight2 = new THREE.SpotLight(0xffffff, 0.8);
    spotLight2.position.set(-10, 10, -10);
    scene.add(spotLight2);

    // Rim light
    const rimLight = new THREE.PointLight(0x06b6d4, 0.5);
    rimLight.position.set(-5, 3, -5);
    scene.add(rimLight);

    // Ground grid
    const gridHelper = new THREE.GridHelper(20, 40, 0x22c55e, 0x1a1a1a);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Ground plane for shadow
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Build the car
    buildCar(scene, color, secondaryColor, mods, neonColor);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      // Rotate wheels
      wheelsRef.current.forEach(wheel => {
        if (wheel) wheel.rotation.x += 0.03;
      });

      // Float animation for car
      if (carGroupRef.current) {
        carGroupRef.current.position.y = 0.1 + Math.sin(Date.now() * 0.001) * 0.05;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [color, secondaryColor, mods, neonColor]);

  const buildCar = (scene, color, secondaryColor, mods, neonColor) => {
    // Remove old car if exists
    if (carGroupRef.current) {
      scene.remove(carGroupRef.current);
    }
    wheelsRef.current = [];

    const carGroup = new THREE.Group();
    carGroupRef.current = carGroup;

    // Materials
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.8,
      roughness: 0.2,
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: '#1a1a2e',
      transparent: true,
      opacity: 0.7,
      metalness: 0.9,
      roughness: 0.1,
    });

    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: '#1a1a1a',
      metalness: 0.3,
      roughness: 0.8,
    });

    const rimMaterial = new THREE.MeshStandardMaterial({
      color: '#888888',
      metalness: 0.9,
      roughness: 0.1,
    });

    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      metalness: 0.7,
      roughness: 0.3,
    });

    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#ffffff',
      emissiveIntensity: 2,
    });

    const taillightMaterial = new THREE.MeshStandardMaterial({
      color: '#ff0000',
      emissive: '#ff0000',
      emissiveIntensity: 1.5,
    });

    // Main body - lower section
    const bodyGeometry = new THREE.BoxGeometry(2.8, 0.5, 1.3);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.35;
    body.castShadow = true;
    body.receiveShadow = true;
    carGroup.add(body);

    // Front hood
    const hoodGeometry = new THREE.BoxGeometry(0.8, 0.3, 1.25);
    const hood = new THREE.Mesh(hoodGeometry, bodyMaterial);
    hood.position.set(1.1, 0.45, 0);
    hood.rotation.z = -0.15;
    hood.castShadow = true;
    carGroup.add(hood);

    // Rear trunk
    const trunkGeometry = new THREE.BoxGeometry(0.7, 0.35, 1.25);
    const trunk = new THREE.Mesh(trunkGeometry, bodyMaterial);
    trunk.position.set(-1.0, 0.45, 0);
    trunk.rotation.z = 0.1;
    trunk.castShadow = true;
    carGroup.add(trunk);

    // Cabin/roof
    const cabinGeometry = new THREE.BoxGeometry(1.4, 0.45, 1.2);
    const cabin = new THREE.Mesh(cabinGeometry, bodyMaterial);
    cabin.position.set(0.1, 0.75, 0);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Front windshield
    const frontWindowGeometry = new THREE.BoxGeometry(0.6, 0.02, 1.1);
    const frontWindow = new THREE.Mesh(frontWindowGeometry, glassMaterial);
    frontWindow.position.set(0.75, 0.75, 0);
    frontWindow.rotation.z = -0.45;
    carGroup.add(frontWindow);

    // Rear windshield
    const rearWindowGeometry = new THREE.BoxGeometry(0.5, 0.02, 1.1);
    const rearWindow = new THREE.Mesh(rearWindowGeometry, glassMaterial);
    rearWindow.position.set(-0.55, 0.75, 0);
    rearWindow.rotation.z = 0.35;
    carGroup.add(rearWindow);

    // Side windows
    const sideWindowGeometry = new THREE.BoxGeometry(1.2, 0.35, 0.02);
    const sideWindowLeft = new THREE.Mesh(sideWindowGeometry, glassMaterial);
    sideWindowLeft.position.set(0.15, 0.8, 0.59);
    carGroup.add(sideWindowLeft);

    const sideWindowRight = new THREE.Mesh(sideWindowGeometry, glassMaterial);
    sideWindowRight.position.set(0.15, 0.8, -0.59);
    carGroup.add(sideWindowRight);

    // Hood stripe
    const hoodStripeGeometry = new THREE.BoxGeometry(1.5, 0.02, 0.15);
    const hoodStripe = new THREE.Mesh(hoodStripeGeometry, stripeMaterial);
    hoodStripe.position.set(0.6, 0.62, 0);
    carGroup.add(hoodStripe);

    // Side stripes
    const sideStripeGeometry = new THREE.BoxGeometry(2.4, 0.08, 0.02);
    const sideStripeLeft = new THREE.Mesh(sideStripeGeometry, stripeMaterial);
    sideStripeLeft.position.set(0, 0.35, 0.66);
    carGroup.add(sideStripeLeft);

    const sideStripeRight = new THREE.Mesh(sideStripeGeometry, stripeMaterial);
    sideStripeRight.position.set(0, 0.35, -0.66);
    carGroup.add(sideStripeRight);

    // Headlights
    const headlightGeometry = new THREE.BoxGeometry(0.05, 0.12, 0.25);
    const headlightLeft = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightLeft.position.set(1.4, 0.35, 0.4);
    carGroup.add(headlightLeft);

    const headlightRight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightRight.position.set(1.4, 0.35, -0.4);
    carGroup.add(headlightRight);

    // Taillights
    const taillightGeometry = new THREE.BoxGeometry(0.05, 0.1, 0.35);
    const taillightLeft = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillightLeft.position.set(-1.35, 0.4, 0.45);
    carGroup.add(taillightLeft);

    const taillightRight = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillightRight.position.set(-1.35, 0.4, -0.45);
    carGroup.add(taillightRight);

    // Front grille
    const grilleGeometry = new THREE.BoxGeometry(0.02, 0.2, 0.6);
    const grilleMaterial = new THREE.MeshStandardMaterial({ color: '#111111', metalness: 0.5, roughness: 0.5 });
    const grille = new THREE.Mesh(grilleGeometry, grilleMaterial);
    grille.position.set(1.41, 0.25, 0);
    carGroup.add(grille);

    // Side mirrors
    const mirrorGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.08);
    const mirrorLeft = new THREE.Mesh(mirrorGeometry, bodyMaterial);
    mirrorLeft.position.set(0.6, 0.7, 0.7);
    carGroup.add(mirrorLeft);

    const mirrorRight = new THREE.Mesh(mirrorGeometry, bodyMaterial);
    mirrorRight.position.set(0.6, 0.7, -0.7);
    carGroup.add(mirrorRight);

    // Spoiler (if equipped)
    if (mods?.spoiler && mods.spoiler !== 'none') {
      const spoilerGroup = new THREE.Group();
      
      const spoilerWingGeometry = new THREE.BoxGeometry(0.25, 0.05, 1.2);
      const spoilerWing = new THREE.Mesh(spoilerWingGeometry, stripeMaterial);
      spoilerGroup.add(spoilerWing);

      const spoilerStandGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.05);
      const spoilerStandLeft = new THREE.Mesh(spoilerStandGeometry, stripeMaterial);
      spoilerStandLeft.position.set(0, -0.15, 0.4);
      spoilerGroup.add(spoilerStandLeft);

      const spoilerStandRight = new THREE.Mesh(spoilerStandGeometry, stripeMaterial);
      spoilerStandRight.position.set(0, -0.15, -0.4);
      spoilerGroup.add(spoilerStandRight);

      spoilerGroup.position.set(-1.15, 0.85, 0);
      carGroup.add(spoilerGroup);
    }

    // Neon underglow
    if (neonColor) {
      const neonMaterial = new THREE.MeshStandardMaterial({
        color: neonColor,
        emissive: neonColor,
        emissiveIntensity: 3,
        transparent: true,
        opacity: 0.8,
      });

      const neonGeometry = new THREE.BoxGeometry(0.1, 0.03, 1.0);
      const frontNeon = new THREE.Mesh(neonGeometry, neonMaterial);
      frontNeon.position.set(1.2, 0.08, 0);
      carGroup.add(frontNeon);

      const rearNeon = new THREE.Mesh(neonGeometry, neonMaterial);
      rearNeon.position.set(-1.2, 0.08, 0);
      carGroup.add(rearNeon);

      const sideNeonGeometry = new THREE.BoxGeometry(2.2, 0.03, 0.1);
      const sideNeonLeft = new THREE.Mesh(sideNeonGeometry, neonMaterial);
      sideNeonLeft.position.set(0, 0.08, 0.65);
      carGroup.add(sideNeonLeft);

      const sideNeonRight = new THREE.Mesh(sideNeonGeometry, neonMaterial);
      sideNeonRight.position.set(0, 0.08, -0.65);
      carGroup.add(sideNeonRight);

      // Neon point light
      const neonLight = new THREE.PointLight(neonColor, 2, 3);
      neonLight.position.set(0, 0.1, 0);
      carGroup.add(neonLight);
    }

    // Wheels
    const createWheel = (position) => {
      const wheelGroup = new THREE.Group();
      
      // Tire
      const tireGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 32);
      const tire = new THREE.Mesh(tireGeometry, wheelMaterial);
      tire.rotation.z = Math.PI / 2;
      wheelGroup.add(tire);
      
      // Rim
      const rimGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.26, 16);
      const rim = new THREE.Mesh(rimGeometry, rimMaterial);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      // Rim spokes
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 * Math.PI) / 180;
        const spokeGeometry = new THREE.BoxGeometry(0.02, 0.02, 0.2);
        const spoke = new THREE.Mesh(spokeGeometry, rimMaterial);
        spoke.position.set(
          Math.sin(angle) * 0.12,
          0.14,
          Math.cos(angle) * 0.12
        );
        spoke.rotation.z = Math.PI / 2;
        wheelGroup.add(spoke);
      }

      wheelGroup.position.set(...position);
      wheelsRef.current.push(wheelGroup);
      return wheelGroup;
    };

    carGroup.add(createWheel([0.9, 0.1, 0.7]));
    carGroup.add(createWheel([0.9, 0.1, -0.7]));
    carGroup.add(createWheel([-0.9, 0.1, 0.7]));
    carGroup.add(createWheel([-0.9, 0.1, -0.7]));

    // Scale the car
    carGroup.scale.set(1.2, 1.2, 1.2);
    
    scene.add(carGroup);
  };

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%' }}
      className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 overflow-hidden"
      data-testid="car-3d-viewer"
    >
      {/* Corner accents */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-neon-green/30 pointer-events-none z-10" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-neon-green/30 pointer-events-none z-10" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-neon-green/30 pointer-events-none z-10" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-neon-green/30 pointer-events-none z-10" />

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
        <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
          Drag to rotate • Scroll to zoom
        </p>
      </div>
    </div>
  );
};

export default Car3DViewer;
