import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

// Available 3D car models with their URLs
const CAR_MODELS = {
  // High quality sports cars - BMW M4 is default (no DRACO needed)
  bmw_m4: {
    url: 'https://raw.githubusercontent.com/harmasctl/3dmodel-car/main/bmw_m4_f82.glb',
    scale: 0.01,
    position: [0, 0, 0],
    draco: false,
    bodyParts: [],
    name: 'BMW M4'
  },
  bmw_1m: {
    url: 'https://raw.githubusercontent.com/harmasctl/3dmodel-car/main/ac_-_bmw_1m_free.glb',
    scale: 0.01,
    position: [0, 0, 0],
    draco: false,
    bodyParts: [],
    name: 'BMW 1M'
  },
  concept: {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb',
    scale: 0.5,
    position: [0, 0, 0],
    draco: false,
    bodyParts: [],
    name: 'Concept Car'
  },
  racing: {
    url: 'https://raw.githubusercontent.com/pmndrs/racing-game/main/public/models/chassis-draco.glb',
    scale: 1,
    position: [0, 0.3, 0],
    draco: true,
    bodyParts: [],
    name: 'Racing Chassis'
  },
  toycar: {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb',
    scale: 80,
    position: [0, 0, 0],
    draco: false,
    bodyParts: [],
    name: 'Toy Car'
  }
};

// Map car makes to available models
const MAKE_MODEL_MAP = {
  'Ferrari': 'concept',  // Use concept car for Ferrari (luxury/exotic)
  'BMW': 'bmw_m4',
  'Lamborghini': 'concept',
  'McLaren': 'concept',
  'Porsche': 'bmw_m4',
  'Mercedes': 'bmw_m4',
  'Audi': 'bmw_1m',
  'Nissan': 'bmw_m4',
  'Toyota': 'bmw_1m',
  'Honda': 'bmw_1m',
  'Mazda': 'bmw_1m',
  'Subaru': 'bmw_1m',
  'Mitsubishi': 'bmw_1m',
  'Lexus': 'bmw_m4',
  'Acura': 'bmw_m4',
  'Chevrolet': 'bmw_m4',
  'Ford': 'bmw_m4',
  'Dodge': 'bmw_m4',
  'default': 'bmw_m4'
};

// Main 3D Car Viewer Component
const Car3DViewer = ({
  make = '',
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
  const carModelRef = useRef(null);
  const animationIdRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Determine which model to load based on make
  const modelKey = useMemo(() => {
    return MAKE_MODEL_MAP[make] || MAKE_MODEL_MAP['default'];
  }, [make]);

  const modelConfig = useMemo(() => CAR_MODELS[modelKey], [modelKey]);

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
    const containerHeight = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0a0a');
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / containerHeight, 0.1, 1000);
    camera.position.set(4, 2, 4);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, containerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 10;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.target.set(0, 0.5, 0);
    controlsRef.current = controls;

    // Lighting - Studio setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Back light (rim)
    const backLight = new THREE.SpotLight(0x06b6d4, 1);
    backLight.position.set(0, 5, -8);
    backLight.angle = Math.PI / 4;
    scene.add(backLight);

    // Ground reflection light
    const groundLight = new THREE.PointLight(0x22c55e, 0.3);
    groundLight.position.set(0, -0.5, 0);
    scene.add(groundLight);

    // Ground grid (NFS Underground style)
    const gridHelper = new THREE.GridHelper(20, 40, 0x22c55e, 0x1a1a1a);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Reflective ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: '#0a0a0a',
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Load the 3D model
    loadCarModel(scene, modelConfig, color, neonColor).then(() => {
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to load model:', err);
      setError('Failed to load 3D model');
      setLoading(false);
      // Fallback: create a simple car shape
      createFallbackCar(scene, color, neonColor);
    });

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      // Subtle floating animation
      if (carModelRef.current) {
        carModelRef.current.position.y = modelConfig.position[1] + Math.sin(Date.now() * 0.001) * 0.02;
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
  }, [modelConfig, color, neonColor]);

  const loadCarModel = async (scene, config, carColor, neonColor) => {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      
      // Always setup DRACO loader for models that may need it
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      dracoLoader.setDecoderConfig({ type: 'js' });
      loader.setDRACOLoader(dracoLoader);

      loader.load(
        config.url,
        (gltf) => {
          // Remove old model
          if (carModelRef.current) {
            scene.remove(carModelRef.current);
          }

          const model = gltf.scene;
          
          // Scale and position
          model.scale.setScalar(config.scale);
          model.position.set(...config.position);

          // Center the model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.x -= center.x;
          model.position.z -= center.z;

          // Apply color to body parts if specified
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;

              // Check if this is a body part to color
              const name = child.name.toLowerCase();
              const isBody = config.bodyParts.some(part => name.includes(part.toLowerCase())) ||
                            name.includes('body') || 
                            name.includes('paint') ||
                            name.includes('exterior') ||
                            name.includes('shell');

              if (isBody && child.material) {
                // Clone the material so we don't affect other instances
                child.material = child.material.clone();
                child.material.color.set(carColor);
                child.material.metalness = 0.8;
                child.material.roughness = 0.2;
              }
            }
          });

          // Add neon underglow effect
          if (neonColor) {
            addNeonUnderglow(model, neonColor, box);
          }

          scene.add(model);
          carModelRef.current = model;
          resolve();
        },
        (progress) => {
          // Loading progress
          console.log(`Loading: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
        },
        (error) => {
          console.error('Error loading model:', error);
          reject(error);
        }
      );
    });
  };

  const addNeonUnderglow = (model, neonColor, boundingBox) => {
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    // Create neon strips
    const neonMaterial = new THREE.MeshStandardMaterial({
      color: neonColor,
      emissive: neonColor,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 0.9,
    });

    // Front neon
    const frontNeon = new THREE.Mesh(
      new THREE.BoxGeometry(size.x * 0.8, 0.02, 0.05),
      neonMaterial
    );
    frontNeon.position.set(0, 0.05, size.z * 0.4);
    model.add(frontNeon);

    // Back neon
    const backNeon = new THREE.Mesh(
      new THREE.BoxGeometry(size.x * 0.8, 0.02, 0.05),
      neonMaterial
    );
    backNeon.position.set(0, 0.05, -size.z * 0.4);
    model.add(backNeon);

    // Side neons
    const sideNeonLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.02, size.z * 0.8),
      neonMaterial
    );
    sideNeonLeft.position.set(size.x * 0.4, 0.05, 0);
    model.add(sideNeonLeft);

    const sideNeonRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.02, size.z * 0.8),
      neonMaterial
    );
    sideNeonRight.position.set(-size.x * 0.4, 0.05, 0);
    model.add(sideNeonRight);

    // Add point light for glow effect
    const neonLight = new THREE.PointLight(neonColor, 2, 5);
    neonLight.position.set(0, 0.1, 0);
    model.add(neonLight);
  };

  const createFallbackCar = (scene, carColor, neonColor) => {
    // Simple but better looking fallback car
    const group = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: carColor,
      metalness: 0.8,
      roughness: 0.2,
    });

    // Main body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.4, 1),
      bodyMaterial
    );
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);

    // Cabin
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.35, 0.9),
      bodyMaterial
    );
    cabin.position.set(0, 0.75, 0);
    cabin.castShadow = true;
    group.add(cabin);

    // Wheels
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: '#1a1a1a',
      metalness: 0.3,
      roughness: 0.8,
    });
    const wheelPositions = [
      [0.65, 0.2, 0.55],
      [0.65, 0.2, -0.55],
      [-0.65, 0.2, 0.55],
      [-0.65, 0.2, -0.55]
    ];
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.15, 16),
        wheelMaterial
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(...pos);
      wheel.castShadow = true;
      group.add(wheel);
    });

    if (neonColor) {
      const neonMaterial = new THREE.MeshStandardMaterial({
        color: neonColor,
        emissive: neonColor,
        emissiveIntensity: 2,
      });
      const neon = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.02, 0.02),
        neonMaterial
      );
      neon.position.set(0, 0.15, 0);
      group.add(neon);
    }

    scene.add(group);
    carModelRef.current = group;
  };

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%' }}
      className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 overflow-hidden"
      data-testid="car-3d-viewer"
    >
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-20">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-3 border-neon-green border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-xs text-zinc-400 font-mono uppercase tracking-wider">
              Loading 3D Model...
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-2 left-2 right-2 bg-red-500/20 border border-red-500/50 px-3 py-1 text-xs text-red-400 font-mono z-20">
          {error}
        </div>
      )}

      {/* Corner accents */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-neon-green/30 pointer-events-none z-10" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-neon-green/30 pointer-events-none z-10" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-neon-green/30 pointer-events-none z-10" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-neon-green/30 pointer-events-none z-10" />

      {/* Model info */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider bg-zinc-900/50 px-2 py-1">
          {modelConfig?.name || 'Sports Car'}
        </p>
      </div>

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
          Drag to rotate • Scroll to zoom
        </p>
      </div>
    </div>
  );
};

export default Car3DViewer;
