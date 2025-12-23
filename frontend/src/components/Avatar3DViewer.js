import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Mixamo-style 3D Avatar Component
const Avatar3DViewer = ({
  config = {},
  height = '300px',
  autoRotate = true,
  interactive = true,
}) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const avatarGroupRef = useRef(null);
  const animationIdRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());

  // Default avatar configuration
  const avatarConfig = useMemo(() => ({
    body_type: config.body_type || 'average',
    skin_tone: config.skin_tone || '#FFD5C8',
    hair_style: config.hair_style || 'short',
    hair_color: config.hair_color || '#2C1810',
    eye_color: config.eye_color || '#4A3728',
    outfit: config.outfit || 'racing_jacket',
    outfit_color: config.outfit_color || '#22c55e',
    pants: config.pants || 'jeans',
    pants_color: config.pants_color || '#1f2937',
    shoes: config.shoes || 'sneakers',
    shoes_color: config.shoes_color || '#ffffff',
    accessory: config.accessory || 'none',
    facial_hair: config.facial_hair || 'none',
    glasses: config.glasses || 'none',
  }), [config]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f0f10');
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 4);
    camera.lookAt(0, 0.8, 0);
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
    if (interactive) {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enablePan = false;
      controls.minDistance = 2.5;
      controls.maxDistance = 6;
      controls.minPolarAngle = Math.PI / 4;
      controls.maxPolarAngle = Math.PI / 1.8;
      controls.target.set(0, 0.8, 0);
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 1;
      controlsRef.current = controls;
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3, 5, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x06b6d4, 0.4);
    fillLight.position.set(-3, 3, -2);
    scene.add(fillLight);

    // Rim light for dramatic effect
    const rimLight = new THREE.PointLight(0x22c55e, 0.6);
    rimLight.position.set(0, 2, -3);
    scene.add(rimLight);

    // Ground grid
    const gridHelper = new THREE.GridHelper(10, 20, 0x22c55e, 0x1a1a1a);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Ground plane for shadow
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.4 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Build the avatar
    buildAvatar(scene, avatarConfig);

    // Animation loop with idle animation
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      const time = clockRef.current.getElapsedTime();
      
      // Idle breathing animation
      if (avatarGroupRef.current) {
        // Subtle breathing
        avatarGroupRef.current.scale.y = 1 + Math.sin(time * 2) * 0.01;
        // Subtle weight shift
        avatarGroupRef.current.position.x = Math.sin(time * 0.5) * 0.02;
      }

      if (controlsRef.current) {
        controlsRef.current.update();
      }
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
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [avatarConfig, autoRotate, interactive]);

  const buildAvatar = (scene, config) => {
    // Remove old avatar if exists
    if (avatarGroupRef.current) {
      scene.remove(avatarGroupRef.current);
    }

    const avatarGroup = new THREE.Group();
    avatarGroupRef.current = avatarGroup;

    // Materials
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: config.skin_tone,
      roughness: 0.7,
      metalness: 0.1,
    });

    const hairMaterial = new THREE.MeshStandardMaterial({
      color: config.hair_color,
      roughness: 0.9,
      metalness: 0.1,
    });

    const outfitMaterial = new THREE.MeshStandardMaterial({
      color: config.outfit_color,
      roughness: 0.4,
      metalness: 0.2,
    });

    const pantsMaterial = new THREE.MeshStandardMaterial({
      color: config.pants_color,
      roughness: 0.8,
      metalness: 0.1,
    });

    const shoesMaterial = new THREE.MeshStandardMaterial({
      color: config.shoes_color,
      roughness: 0.6,
      metalness: 0.2,
    });

    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: config.eye_color,
      roughness: 0.3,
      metalness: 0,
    });

    // ============ HEAD ============
    const headGroup = new THREE.Group();
    
    // Main head - oval shape
    const headGeometry = new THREE.SphereGeometry(0.18, 32, 32);
    headGeometry.scale(1, 1.15, 0.95);
    const head = new THREE.Mesh(headGeometry, skinMaterial);
    head.castShadow = true;
    headGroup.add(head);

    // Ears
    const earGeometry = new THREE.SphereGeometry(0.035, 16, 16);
    const leftEar = new THREE.Mesh(earGeometry, skinMaterial);
    leftEar.position.set(-0.17, 0, 0);
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeometry, skinMaterial);
    rightEar.position.set(0.17, 0, 0);
    headGroup.add(rightEar);

    // Eyes
    const eyeWhiteGeometry = new THREE.SphereGeometry(0.032, 16, 16);
    const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff' });
    
    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
    leftEyeWhite.position.set(-0.06, 0.03, 0.14);
    headGroup.add(leftEyeWhite);

    const rightEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
    rightEyeWhite.position.set(0.06, 0.03, 0.14);
    headGroup.add(rightEyeWhite);

    // Pupils
    const pupilGeometry = new THREE.SphereGeometry(0.016, 16, 16);
    const pupilMaterial = new THREE.MeshStandardMaterial({ color: '#1a1a1a' });
    
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.06, 0.03, 0.165);
    headGroup.add(leftPupil);

    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0.06, 0.03, 0.165);
    headGroup.add(rightPupil);

    // Iris (colored part)
    const irisGeometry = new THREE.CylinderGeometry(0.022, 0.022, 0.005, 16);
    const leftIris = new THREE.Mesh(irisGeometry, eyeMaterial);
    leftIris.rotation.x = Math.PI / 2;
    leftIris.position.set(-0.06, 0.03, 0.158);
    headGroup.add(leftIris);

    const rightIris = new THREE.Mesh(irisGeometry, eyeMaterial);
    rightIris.rotation.x = Math.PI / 2;
    rightIris.position.set(0.06, 0.03, 0.158);
    headGroup.add(rightIris);

    // Eyebrows
    const eyebrowGeometry = new THREE.BoxGeometry(0.06, 0.01, 0.015);
    const eyebrowMaterial = new THREE.MeshStandardMaterial({ color: config.hair_color });
    
    const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    leftEyebrow.position.set(-0.06, 0.08, 0.145);
    leftEyebrow.rotation.z = 0.1;
    headGroup.add(leftEyebrow);

    const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    rightEyebrow.position.set(0.06, 0.08, 0.145);
    rightEyebrow.rotation.z = -0.1;
    headGroup.add(rightEyebrow);

    // Nose
    const noseGeometry = new THREE.ConeGeometry(0.025, 0.05, 8);
    const nose = new THREE.Mesh(noseGeometry, skinMaterial);
    nose.position.set(0, -0.02, 0.17);
    nose.rotation.x = Math.PI / 2;
    headGroup.add(nose);

    // Mouth
    const mouthGeometry = new THREE.TorusGeometry(0.03, 0.008, 8, 16, Math.PI);
    const mouthMaterial = new THREE.MeshStandardMaterial({ color: '#8B4B5A' });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -0.08, 0.13);
    mouth.rotation.x = Math.PI / 2;
    headGroup.add(mouth);

    // Hair based on style
    if (config.hair_style !== 'bald') {
      const hairGroup = new THREE.Group();
      
      if (config.hair_style === 'short' || config.hair_style === 'buzz') {
        const hairGeometry = new THREE.SphereGeometry(0.19, 32, 32);
        hairGeometry.scale(1.02, 0.9, 0.98);
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.y = 0.05;
        hairGroup.add(hair);
      } else if (config.hair_style === 'long') {
        const hairTopGeometry = new THREE.SphereGeometry(0.2, 32, 32);
        hairTopGeometry.scale(1.05, 0.85, 1);
        const hairTop = new THREE.Mesh(hairTopGeometry, hairMaterial);
        hairTop.position.y = 0.05;
        hairGroup.add(hairTop);
        
        // Long hair sides
        const hairSideGeometry = new THREE.CylinderGeometry(0.06, 0.04, 0.3, 16);
        const hairLeft = new THREE.Mesh(hairSideGeometry, hairMaterial);
        hairLeft.position.set(-0.15, -0.1, 0);
        hairGroup.add(hairLeft);
        
        const hairRight = new THREE.Mesh(hairSideGeometry, hairMaterial);
        hairRight.position.set(0.15, -0.1, 0);
        hairGroup.add(hairRight);
      } else if (config.hair_style === 'mohawk') {
        const mohawkGeometry = new THREE.BoxGeometry(0.04, 0.15, 0.25);
        const mohawk = new THREE.Mesh(mohawkGeometry, hairMaterial);
        mohawk.position.set(0, 0.17, -0.02);
        hairGroup.add(mohawk);
      } else if (config.hair_style === 'curly') {
        for (let i = 0; i < 25; i++) {
          const curlGeometry = new THREE.SphereGeometry(0.04 + Math.random() * 0.02, 8, 8);
          const curl = new THREE.Mesh(curlGeometry, hairMaterial);
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI * 0.5;
          curl.position.set(
            Math.sin(theta) * Math.cos(phi) * 0.18,
            0.1 + Math.sin(phi) * 0.12,
            Math.cos(theta) * Math.cos(phi) * 0.17
          );
          hairGroup.add(curl);
        }
      }
      
      headGroup.add(hairGroup);
    }

    // Glasses (if accessory)
    if (config.accessory === 'glasses' || config.accessory === 'sunglasses') {
      const glassesGroup = new THREE.Group();
      const frameMaterial = new THREE.MeshStandardMaterial({ 
        color: config.accessory === 'sunglasses' ? '#1a1a1a' : '#555555',
        metalness: 0.8,
        roughness: 0.2
      });
      
      // Frames
      const frameGeometry = new THREE.TorusGeometry(0.04, 0.005, 8, 16);
      const leftFrame = new THREE.Mesh(frameGeometry, frameMaterial);
      leftFrame.position.set(-0.06, 0.03, 0.18);
      glassesGroup.add(leftFrame);
      
      const rightFrame = new THREE.Mesh(frameGeometry, frameMaterial);
      rightFrame.position.set(0.06, 0.03, 0.18);
      glassesGroup.add(rightFrame);
      
      // Bridge
      const bridgeGeometry = new THREE.CylinderGeometry(0.003, 0.003, 0.04, 8);
      const bridge = new THREE.Mesh(bridgeGeometry, frameMaterial);
      bridge.position.set(0, 0.03, 0.18);
      bridge.rotation.z = Math.PI / 2;
      glassesGroup.add(bridge);
      
      // Lenses
      if (config.accessory === 'sunglasses') {
        const lensGeometry = new THREE.CircleGeometry(0.035, 16);
        const lensMaterial = new THREE.MeshStandardMaterial({ 
          color: '#111111',
          transparent: true,
          opacity: 0.8
        });
        
        const leftLens = new THREE.Mesh(lensGeometry, lensMaterial);
        leftLens.position.set(-0.06, 0.03, 0.178);
        glassesGroup.add(leftLens);
        
        const rightLens = new THREE.Mesh(lensGeometry, lensMaterial);
        rightLens.position.set(0.06, 0.03, 0.178);
        glassesGroup.add(rightLens);
      }
      
      headGroup.add(glassesGroup);
    }

    // Cap (if accessory)
    if (config.accessory === 'cap') {
      const capGroup = new THREE.Group();
      const capMaterial = new THREE.MeshStandardMaterial({ color: config.outfit_color });
      
      const capTopGeometry = new THREE.SphereGeometry(0.2, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
      const capTop = new THREE.Mesh(capTopGeometry, capMaterial);
      capTop.position.y = 0.08;
      capGroup.add(capTop);
      
      const brimGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.02, 32, 1, false, 0, Math.PI);
      const brim = new THREE.Mesh(brimGeometry, capMaterial);
      brim.position.set(0, 0.08, 0.1);
      brim.rotation.x = Math.PI / 2;
      capGroup.add(brim);
      
      headGroup.add(capGroup);
    }

    headGroup.position.y = 1.55;
    avatarGroup.add(headGroup);

    // ============ NECK ============
    const neckGeometry = new THREE.CylinderGeometry(0.06, 0.08, 0.1, 16);
    const neck = new THREE.Mesh(neckGeometry, skinMaterial);
    neck.position.y = 1.4;
    neck.castShadow = true;
    avatarGroup.add(neck);

    // ============ TORSO ============
    const torsoGroup = new THREE.Group();
    
    // Upper body
    const upperTorsoGeometry = new THREE.CylinderGeometry(0.18, 0.2, 0.35, 16);
    const upperTorso = new THREE.Mesh(upperTorsoGeometry, outfitMaterial);
    upperTorso.position.y = 1.15;
    upperTorso.castShadow = true;
    torsoGroup.add(upperTorso);

    // Lower torso
    const lowerTorsoGeometry = new THREE.CylinderGeometry(0.16, 0.18, 0.2, 16);
    const lowerTorso = new THREE.Mesh(lowerTorsoGeometry, outfitMaterial);
    lowerTorso.position.y = 0.9;
    lowerTorso.castShadow = true;
    torsoGroup.add(lowerTorso);

    // Collar detail (for jacket)
    if (config.outfit === 'racing_jacket' || config.outfit === 'suit') {
      const collarGeometry = new THREE.TorusGeometry(0.12, 0.025, 8, 16, Math.PI);
      const collar = new THREE.Mesh(collarGeometry, outfitMaterial);
      collar.position.set(0, 1.32, 0.08);
      collar.rotation.x = Math.PI / 2;
      torsoGroup.add(collar);
    }

    avatarGroup.add(torsoGroup);

    // ============ ARMS ============
    // Left Arm
    const leftArmGroup = new THREE.Group();
    
    const leftUpperArmGeometry = new THREE.CylinderGeometry(0.05, 0.045, 0.25, 16);
    const leftUpperArm = new THREE.Mesh(leftUpperArmGeometry, outfitMaterial);
    leftUpperArm.position.set(-0.25, 1.15, 0);
    leftUpperArm.rotation.z = 0.2;
    leftUpperArm.castShadow = true;
    leftArmGroup.add(leftUpperArm);

    const leftForearmGeometry = new THREE.CylinderGeometry(0.04, 0.035, 0.22, 16);
    const leftForearm = new THREE.Mesh(leftForearmGeometry, skinMaterial);
    leftForearm.position.set(-0.32, 0.95, 0);
    leftForearm.rotation.z = 0.15;
    leftForearm.castShadow = true;
    leftArmGroup.add(leftForearm);

    // Left Hand
    const leftHandGeometry = new THREE.SphereGeometry(0.04, 16, 16);
    leftHandGeometry.scale(1, 0.8, 0.6);
    const leftHand = new THREE.Mesh(leftHandGeometry, skinMaterial);
    leftHand.position.set(-0.35, 0.82, 0);
    leftHand.castShadow = true;
    leftArmGroup.add(leftHand);

    avatarGroup.add(leftArmGroup);

    // Right Arm (mirrored)
    const rightArmGroup = new THREE.Group();
    
    const rightUpperArmGeometry = new THREE.CylinderGeometry(0.05, 0.045, 0.25, 16);
    const rightUpperArm = new THREE.Mesh(rightUpperArmGeometry, outfitMaterial);
    rightUpperArm.position.set(0.25, 1.15, 0);
    rightUpperArm.rotation.z = -0.2;
    rightUpperArm.castShadow = true;
    rightArmGroup.add(rightUpperArm);

    const rightForearmGeometry = new THREE.CylinderGeometry(0.04, 0.035, 0.22, 16);
    const rightForearm = new THREE.Mesh(rightForearmGeometry, skinMaterial);
    rightForearm.position.set(0.32, 0.95, 0);
    rightForearm.rotation.z = -0.15;
    rightForearm.castShadow = true;
    rightArmGroup.add(rightForearm);

    // Right Hand
    const rightHandGeometry = new THREE.SphereGeometry(0.04, 16, 16);
    rightHandGeometry.scale(1, 0.8, 0.6);
    const rightHand = new THREE.Mesh(rightHandGeometry, skinMaterial);
    rightHand.position.set(0.35, 0.82, 0);
    rightHand.castShadow = true;
    rightArmGroup.add(rightHand);

    avatarGroup.add(rightArmGroup);

    // ============ LEGS ============
    // Left Leg
    const leftLegGroup = new THREE.Group();
    
    const leftThighGeometry = new THREE.CylinderGeometry(0.08, 0.065, 0.35, 16);
    const leftThigh = new THREE.Mesh(leftThighGeometry, pantsMaterial);
    leftThigh.position.set(-0.1, 0.6, 0);
    leftThigh.castShadow = true;
    leftLegGroup.add(leftThigh);

    const leftCalfGeometry = new THREE.CylinderGeometry(0.055, 0.045, 0.35, 16);
    const leftCalf = new THREE.Mesh(leftCalfGeometry, pantsMaterial);
    leftCalf.position.set(-0.1, 0.28, 0);
    leftCalf.castShadow = true;
    leftLegGroup.add(leftCalf);

    // Left Foot/Shoe
    const leftShoeGeometry = new THREE.BoxGeometry(0.08, 0.06, 0.15);
    const leftShoe = new THREE.Mesh(leftShoeGeometry, shoesMaterial);
    leftShoe.position.set(-0.1, 0.03, 0.02);
    leftShoe.castShadow = true;
    leftLegGroup.add(leftShoe);

    avatarGroup.add(leftLegGroup);

    // Right Leg (mirrored)
    const rightLegGroup = new THREE.Group();
    
    const rightThighGeometry = new THREE.CylinderGeometry(0.08, 0.065, 0.35, 16);
    const rightThigh = new THREE.Mesh(rightThighGeometry, pantsMaterial);
    rightThigh.position.set(0.1, 0.6, 0);
    rightThigh.castShadow = true;
    rightLegGroup.add(rightThigh);

    const rightCalfGeometry = new THREE.CylinderGeometry(0.055, 0.045, 0.35, 16);
    const rightCalf = new THREE.Mesh(rightCalfGeometry, pantsMaterial);
    rightCalf.position.set(0.1, 0.28, 0);
    rightCalf.castShadow = true;
    rightLegGroup.add(rightCalf);

    // Right Foot/Shoe
    const rightShoeGeometry = new THREE.BoxGeometry(0.08, 0.06, 0.15);
    const rightShoe = new THREE.Mesh(rightShoeGeometry, shoesMaterial);
    rightShoe.position.set(0.1, 0.03, 0.02);
    rightShoe.castShadow = true;
    rightLegGroup.add(rightShoe);

    avatarGroup.add(rightLegGroup);

    scene.add(avatarGroup);
  };

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%' }}
      className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 overflow-hidden rounded-lg"
      data-testid="avatar-3d-viewer"
    >
      {/* Corner accents */}
      <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-neon-green/30 pointer-events-none z-10" />
      <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-neon-green/30 pointer-events-none z-10" />
      <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-neon-green/30 pointer-events-none z-10" />
      <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-neon-green/30 pointer-events-none z-10" />

      {/* Instructions overlay */}
      {interactive && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
            Drag to rotate
          </p>
        </div>
      )}
    </div>
  );
};

export default Avatar3DViewer;
