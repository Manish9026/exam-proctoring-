import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshWobbleMaterial, Sphere, Box, Torus, Icosahedron } from '@react-three/drei';
import * as THREE from 'three';

const ParticleField = ({ count = 200 }) => {
  const mesh = useRef();
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * 0.02;
      mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#60a5fa"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
};

const GlowingSphere = ({ position, color, speed = 1, distort = 0.4, size = 1 }) => {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed) * 0.3;
    }
  });

  return (
    <Float speed={speed} rotationIntensity={0.5} floatIntensity={0.5}>
      <Sphere ref={meshRef} args={[size, 64, 64]} position={position}>
        <MeshDistortMaterial
          color={color}
          distort={distort}
          speed={2}
          roughness={0.1}
          metalness={0.8}
          transparent
          opacity={0.7}
        />
      </Sphere>
    </Float>
  );
};

const ShieldMesh = () => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3}>
      <Icosahedron ref={meshRef} args={[1.5, 1]} position={[0, 0, 0]}>
        <meshPhongMaterial
          color="#3b82f6"
          wireframe
          transparent
          opacity={0.3}
        />
      </Icosahedron>
    </Float>
  );
};

const FloatingRing = ({ position, color, size = 1 }) => {
  const ref = useRef();

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.5;
      ref.current.rotation.z = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1}>
      <Torus ref={ref} args={[size, 0.05, 16, 100]} position={position}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.6}
        />
      </Torus>
    </Float>
  );
};

const HeroScene = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 60 }}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#60a5fa" />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#8b5cf6" />
      <pointLight position={[0, 5, 0]} intensity={0.3} color="#22d3ee" />

      <ParticleField count={300} />
      <ShieldMesh />
      
      <GlowingSphere position={[-3, 1.5, -2]} color="#3b82f6" speed={0.8} size={0.6} distort={0.6} />
      <GlowingSphere position={[3.5, -1, -3]} color="#8b5cf6" speed={1.2} size={0.5} distort={0.5} />
      <GlowingSphere position={[-2, -2, -1]} color="#22d3ee" speed={0.6} size={0.4} distort={0.3} />
      <GlowingSphere position={[2, 2, -2]} color="#22c55e" speed={1} size={0.35} distort={0.4} />

      <FloatingRing position={[0, 0, -1]} color="#3b82f6" size={2.5} />
      <FloatingRing position={[1, -0.5, -2]} color="#8b5cf6" size={1.2} />
    </Canvas>
  );
};

export default HeroScene;
