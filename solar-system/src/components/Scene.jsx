import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Grid } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../store/useStore';
import CelestialBody from './CelestialBody';

function PhysicsLoop() {
  const tick = useStore((s) => s.tick);

  useFrame((_, delta) => {
    // Clamp delta to prevent explosion after tab switch
    const clampedDt = Math.min(delta, 0.05);
    tick(clampedDt);
  });

  return null;
}

function Bodies() {
  const bodies = useStore((s) => s.bodies);
  return bodies.map((body) => <CelestialBody key={body.id} body={body} />);
}

function SceneGrid() {
  const showGrid = useStore((s) => s.showGrid);
  if (!showGrid) return null;

  return (
    <Grid
      args={[200, 200]}
      cellSize={5}
      cellThickness={0.3}
      cellColor="#1a1a3a"
      sectionSize={20}
      sectionThickness={0.6}
      sectionColor="#2a2a5a"
      fadeDistance={120}
      fadeStrength={1.5}
      infiniteGrid
      position={[0, -0.01, 0]}
    />
  );
}

export default function Scene() {
  const selectBody = useStore((s) => s.selectBody);

  return (
    <Canvas
      camera={{ position: [0, 35, 55], fov: 55, near: 0.1, far: 500 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.8 }}
      onPointerMissed={() => selectBody(null)}
      style={{ background: '#050510' }}
    >
      {/* Ambient light for non-star bodies */}
      <ambientLight intensity={0.15} />

      {/* Background stars */}
      <Stars radius={150} depth={80} count={3000} factor={3} saturation={0.2} fade speed={0.5} />

      {/* Grid */}
      <SceneGrid />

      {/* Physics simulation */}
      <PhysicsLoop />

      {/* Celestial bodies */}
      <Bodies />

      {/* Camera controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={200}
        makeDefault
      />
    </Canvas>
  );
}
