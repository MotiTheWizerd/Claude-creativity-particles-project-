import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useStore from '../store/useStore';

function Trail({ points, color }) {
  const lineRef = useRef();

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    if (points.length < 2) return geo;

    const positions = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      positions[i * 3] = points[i][0];
      positions[i * 3 + 1] = points[i][1];
      positions[i * 3 + 2] = points[i][2];
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [points]);

  if (points.length < 2) return null;

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.4} />
    </line>
  );
}

export default function CelestialBody({ body }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const selectBody = useStore((s) => s.selectBody);
  const selectedBodyId = useStore((s) => s.selectedBodyId);
  const showTrails = useStore((s) => s.showTrails);
  const isSelected = selectedBodyId === body.id;
  const isStar = body.type === 'star';

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.set(...body.position);
      // Slow rotation
      meshRef.current.rotation.y += delta * 0.3;
    }
    if (glowRef.current) {
      glowRef.current.position.set(...body.position);
      // Pulse glow for stars
      if (isStar) {
        const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.1;
        glowRef.current.scale.setScalar(pulse);
      }
    }
  });

  return (
    <group>
      {/* Trail */}
      {showTrails && body.trail && body.trail.length > 1 && (
        <Trail points={body.trail} color={body.color} />
      )}

      {/* Glow sphere for stars */}
      {isStar && (
        <mesh ref={glowRef} position={body.position}>
          <sphereGeometry args={[body.radius * 2, 16, 16]} />
          <meshBasicMaterial
            color={body.color}
            transparent
            opacity={0.08}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Main body */}
      <mesh
        ref={meshRef}
        position={body.position}
        onClick={(e) => {
          e.stopPropagation();
          selectBody(body.id);
        }}
      >
        <sphereGeometry args={[body.radius, isStar ? 32 : 24, isStar ? 32 : 24]} />
        {isStar ? (
          <meshBasicMaterial color={body.color} />
        ) : (
          <meshStandardMaterial
            color={body.color}
            roughness={0.6}
            metalness={0.2}
            emissive={body.color}
            emissiveIntensity={0.05}
          />
        )}
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={body.position} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[body.radius * 1.6, body.radius * 1.8, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Point light for stars */}
      {isStar && (
        <pointLight
          position={body.position}
          color={body.color}
          intensity={body.mass * 0.5}
          distance={100}
          decay={1.5}
        />
      )}
    </group>
  );
}
