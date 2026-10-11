import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

// ─── PALETTE ─────────────────────────────────────────────────────────
const C = {
  white: '#ffffff',
  offWhite: '#f1f5f9',
  glass: '#0ea5e9',
  glassDeep: '#0369a1',
  asphalt: '#1e293b',
  sidewalk: '#e2e8f0',
  red: '#ef4444',
  amber: '#f59e0b',
  green: '#10b981',
  violet: '#8b5cf6',
};

// ─── BUILDING ────────────────────────────────────────────────────────
function Building({ x, z, w, d, h, accent = false, glassRows = 0, delay = 0 }) {
  const ref = useRef();
  useFrame((state, delta) => {
    if (ref.current && state.clock.elapsedTime > delay && ref.current.scale.y < 0.999) {
      ref.current.scale.y = THREE.MathUtils.damp(ref.current.scale.y, 1, 3.5, delta);
    }
  });

  return (
    <group ref={ref} position={[x, 0.1, z]} scale={[1, 0.001, 1]}>
      {/* Body */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={C.white} roughness={0.15} metalness={0.02} />
      </mesh>
      {/* Glass accent band */}
      {accent && (
        <mesh position={[0, h * 0.6, 0]}>
          <boxGeometry args={[w + 0.01, h * 0.05, d + 0.01]} />
          <meshStandardMaterial
            color={C.glass} emissive={C.glass} emissiveIntensity={0.5}
            toneMapped={false} transparent opacity={0.9}
          />
        </mesh>
      )}
      {/* Window grid */}
      {glassRows > 0 && Array.from({ length: glassRows }).map((_, i) => {
        const y = (h / (glassRows + 1)) * (i + 1);
        return (
          <mesh key={i} position={[0, y, d / 2 + 0.005]}>
            <planeGeometry args={[w * 0.75, h / (glassRows + 1) * 0.45]} />
            <meshStandardMaterial
              color="#bae6fd" transparent opacity={0.35}
              metalness={0.9} roughness={0.05}
            />
          </mesh>
        );
      })}
      {/* Roof edge */}
      <mesh position={[0, h + 0.015, 0]}>
        <boxGeometry args={[w + 0.04, 0.03, d + 0.04]} />
        <meshStandardMaterial color={C.offWhite} roughness={0.3} />
      </mesh>
    </group>
  );
}

// ─── HOSPITAL ────────────────────────────────────────────────────────
function Hospital() {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current && ref.current.scale.y < 0.999)
      ref.current.scale.y = THREE.MathUtils.damp(ref.current.scale.y, 1, 2.5, delta);
  });

  return (
    <group position={[3, 0.1, -3]} ref={ref} scale={[1, 0.001, 1]}>
      {/* Base wing */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.0, 3.0]} />
        <meshStandardMaterial color={C.white} roughness={0.1} />
      </mesh>
      {/* Glass ribbon */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[3.21, 0.1, 3.01]} />
        <meshStandardMaterial color={C.glass} roughness={0.05} metalness={0.8} />
      </mesh>
      {/* Tower */}
      <mesh position={[-0.2, 2.0, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 2.6, 1.6]} />
        <meshStandardMaterial color={C.white} roughness={0.08} />
      </mesh>
      {/* Tower glass bands */}
      {[1.2, 1.8, 2.4].map((y, i) => (
        <mesh key={i} position={[-0.2, y, -0.2]}>
          <boxGeometry args={[1.81, 0.06, 1.61]} />
          <meshStandardMaterial
            color={C.glass} emissive={C.glass}
            emissiveIntensity={0.4} toneMapped={false}
          />
        </mesh>
      ))}
      {/* Helipad */}
      <mesh position={[-0.2, 3.35, -0.2]} castShadow>
        <cylinderGeometry args={[0.6, 0.65, 0.06, 32]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      <mesh position={[-0.2, 3.39, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.5, 32]} />
        <meshStandardMaterial color={C.amber} side={THREE.DoubleSide} />
      </mesh>
      {/* Floating cross */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0.3}>
        <group position={[1.0, 2.8, 0.8]}>
          <mesh><boxGeometry args={[0.18, 0.7, 0.18]} /><meshStandardMaterial color={C.red} emissive={C.red} emissiveIntensity={2.5} toneMapped={false} /></mesh>
          <mesh><boxGeometry args={[0.7, 0.18, 0.18]} /><meshStandardMaterial color={C.red} emissive={C.red} emissiveIntensity={2.5} toneMapped={false} /></mesh>
        </group>
      </Float>
      <pointLight position={[1.0, 2.8, 0.8]} intensity={2} distance={5} color={C.red} />
    </group>
  );
}

// ─── ROADS ───────────────────────────────────────────────────────────
function Roads() {
  const elements = [];
  const roads = [-6, 0, 6];

  // Road surfaces (lighter asphalt strips)
  roads.forEach((r) => {
    elements.push(
      <mesh key={`rv-${r}`} position={[r, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.0, 44]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>
    );
    elements.push(
      <mesh key={`rh-${r}`} position={[0, 0.006, r]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[44, 2.0]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>
    );
  });

  // Center dashes
  roads.forEach((rx) => {
    for (let z = -12; z <= 12; z += 1.6) {
      if (roads.some((rz) => Math.abs(z - rz) < 1.5)) continue;
      elements.push(
        <mesh key={`dv-${rx}-${z}`} position={[rx, 0.013, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.06, 0.6]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
      );
    }
  });
  roads.forEach((rz) => {
    for (let x = -12; x <= 12; x += 1.6) {
      if (roads.some((rx) => Math.abs(x - rx) < 1.5)) continue;
      elements.push(
        <mesh key={`dh-${rz}-${x}`} position={[x, 0.013, rz]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[0.06, 0.6]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
      );
    }
  });

  return <group>{elements}</group>;
}

// ─── AMBULANCE ───────────────────────────────────────────────────────
function AmbulanceModel({ lightRef, sirenRedRef, sirenBlueRef }) {
  return (
    <>
      {/* Chassis */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[0.44, 0.04, 1.05]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {/* Hood */}
      <mesh position={[0, 0.14, -0.36]} castShadow>
        <boxGeometry args={[0.44, 0.06, 0.28]} />
        <meshStandardMaterial color={C.white} roughness={0.12} />
      </mesh>
      {/* DRL strip */}
      <mesh position={[0, 0.14, -0.51]}>
        <boxGeometry args={[0.40, 0.015, 0.01]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {/* Headlights */}
      {[-0.15, 0.15].map(hx => (
        <mesh key={hx} position={[hx, 0.12, -0.52]}>
          <boxGeometry args={[0.06, 0.03, 0.01]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      ))}
      {/* Windshield */}
      <mesh position={[0, 0.24, -0.20]} rotation={[-0.4, 0, 0]} castShadow>
        <boxGeometry args={[0.42, 0.16, 0.015]} />
        <meshStandardMaterial color="#020617" metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.25, 0.14]} castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.24, 0.66]} />
        <meshStandardMaterial color={C.white} roughness={0.12} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 0.38, 0.12]}>
        <boxGeometry args={[0.44, 0.025, 0.66]} />
        <meshStandardMaterial color={C.offWhite} />
      </mesh>
      {/* Side windows */}
      {[-0.235, 0.235].map(sx => (
        <mesh key={`w${sx}`} position={[sx, 0.29, 0.10]}>
          <boxGeometry args={[0.01, 0.07, 0.50]} />
          <meshStandardMaterial color="#020617" metalness={0.9} roughness={0.05} />
        </mesh>
      ))}
      {/* Red stripe */}
      {[-0.235, 0.235].map(sx => (
        <mesh key={`s${sx}`} position={[sx, 0.19, 0.06]}>
          <boxGeometry args={[0.005, 0.025, 0.78]} />
          <meshStandardMaterial color={C.red} />
        </mesh>
      ))}
      {/* Side cross */}
      {[-0.237, 0.237].map(sx => (
        <group key={`c${sx}`} position={[sx, 0.30, 0]}>
          <mesh><boxGeometry args={[0.006, 0.09, 0.03]} /><meshStandardMaterial color={C.red} /></mesh>
          <mesh><boxGeometry args={[0.006, 0.03, 0.09]} /><meshStandardMaterial color={C.red} /></mesh>
        </group>
      ))}
      {/* Tail lights */}
      <mesh position={[0, 0.21, 0.505]}>
        <boxGeometry args={[0.42, 0.02, 0.01]} />
        <meshStandardMaterial color={C.red} emissive={C.red} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      {/* Rear chevron */}
      <mesh position={[0, 0.13, 0.505]}>
        <boxGeometry args={[0.36, 0.04, 0.01]} />
        <meshStandardMaterial color={C.amber} />
      </mesh>
      {/* Lightbar */}
      <group position={[0, 0.40, -0.04]}>
        <mesh>
          <boxGeometry args={[0.28, 0.012, 0.05]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[-0.08, 0.012, 0]}>
          <boxGeometry args={[0.10, 0.02, 0.04]} />
          <meshStandardMaterial ref={sirenRedRef} color={C.red} emissive={C.red} emissiveIntensity={4} toneMapped={false} />
        </mesh>
        <mesh position={[0.08, 0.012, 0]}>
          <boxGeometry args={[0.10, 0.02, 0.04]} />
          <meshStandardMaterial ref={sirenBlueRef} color="#2563eb" emissive="#2563eb" emissiveIntensity={4} toneMapped={false} />
        </mesh>
      </group>
      <pointLight ref={lightRef} position={[0, 0.6, 0]} intensity={4} distance={5} />
      {/* Wheels */}
      {[-0.21, 0.21].map(wx =>
        [-0.30, 0.30].map(wz => (
          <group key={`wh${wx}${wz}`} position={[wx, 0.065, wz]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.065, 0.065, 0.05, 16]} />
              <meshStandardMaterial color="#18181b" roughness={0.9} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.035, 0.035, 0.052, 10]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        ))
      )}
    </>
  );
}

function AmbulanceUnit({ curve, timeOffset = 0, speed = 0.04 }) {
  const ref = useRef();
  const lightRef = useRef();
  const sirenRedRef = useRef();
  const sirenBlueRef = useRef();

  useFrame((state) => {
    if (!ref.current) return;
    const t = ((state.clock.elapsedTime * speed + timeOffset) % 1 + 1) % 1;
    const pos = curve.getPoint(t);
    const tan = curve.getTangent(t);
    ref.current.position.copy(pos);

    const target = pos.clone().sub(tan);
    if (ref.current.parent) {
      const wt = target.clone();
      ref.current.parent.localToWorld(wt);
      const wp = ref.current.position.clone();
      ref.current.parent.localToWorld(wp);
      wt.y = wp.y;
      ref.current.lookAt(wt);
    }

    const phase = (state.clock.elapsedTime * 8 + timeOffset * 5) % 4 < 2;
    if (lightRef.current) {
      lightRef.current.color.set(phase ? C.red : '#2563eb');
    }
    if (sirenRedRef.current && sirenBlueRef.current) {
      sirenRedRef.current.emissiveIntensity = phase ? 5 : 0.2;
      sirenBlueRef.current.emissiveIntensity = phase ? 0.2 : 5;
    }
  });

  return (
    <group ref={ref}>
      <AmbulanceModel lightRef={lightRef} sirenRedRef={sirenRedRef} sirenBlueRef={sirenBlueRef} />
    </group>
  );
}

function AmbulanceFleet() {
  const curve = useMemo(() => {
    const corners = [[-6, 6], [-6, -6], [0, -6], [0, 0], [6, 0], [6, 6]];
    const pts = [];
    for (let i = 0; i < corners.length; i++) {
      const [ax, az] = corners[i];
      const [bx, bz] = corners[(i + 1) % corners.length];
      const dx = bx - ax, dz = bz - az;
      const len = Math.sqrt(dx * dx + dz * dz);
      const nx = dx / len, nz = dz / len;
      pts.push(new THREE.Vector3(ax + nx * 0.5, 0.02, az + nz * 0.5));
      pts.push(new THREE.Vector3(ax + nx * 1.5, 0.02, az + nz * 1.5));
      pts.push(new THREE.Vector3(bx - nx * 1.5, 0.02, bz - nz * 1.5));
      pts.push(new THREE.Vector3(bx - nx * 0.5, 0.02, bz - nz * 0.5));
    }
    return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.1);
  }, []);

  return (
    <>
      <AmbulanceUnit curve={curve} timeOffset={0} speed={0.04} />
      <AmbulanceUnit curve={curve} timeOffset={0.5} speed={0.04} />
    </>
  );
}

// ─── TRAFFIC SIGNALS ─────────────────────────────────────────────────
function TrafficSignal({ position, rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.025, 0.8, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>
      <mesh position={[0.2, 0.75, 0]}>
        <boxGeometry args={[0.4, 0.025, 0.025]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>
      <mesh position={[0.38, 0.71, 0]}>
        <boxGeometry args={[0.06, 0.16, 0.05]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0.38, 0.66, 0.028]}>
        <circleGeometry args={[0.02, 16]} />
        <meshStandardMaterial color={C.green} emissive={C.green} emissiveIntensity={4} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ─── TREE ────────────────────────────────────────────────────────────
function Tree({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 0.24, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.32, 0]} castShadow>
        <icosahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial color={C.green} roughness={0.6} flatShading />
      </mesh>
    </group>
  );
}

// ─── CITY LAYOUT ─────────────────────────────────────────────────────
const BLOCKS = [
  { x:-9, z:-9, bs:[{ w:1.4,d:1.4,h:4.5,accent:true,gR:4 },{ w:1.1,d:1.1,h:2.0,ox:1.3,oz:1.3 }] },
  { x:-3, z:-9, bs:[{ w:1.2,d:1.2,h:1.6,ox:-1,oz:-1 },{ w:1.2,d:1.2,h:2.4,ox:1,oz:-1,accent:true,gR:2 },{ w:1.2,d:1.2,h:1.8,ox:-1,oz:1 },{ w:1.2,d:1.2,h:1.2,ox:1,oz:1 }] },
  { x: 3, z:-9, bs:[{ w:1.8,d:1.8,h:3.6,accent:true,gR:3 }] },
  { x: 9, z:-9, bs:[{ w:1.2,d:1.2,h:2.0,ox:-1,oz:-1,accent:true },{ w:1.2,d:1.2,h:1.4,ox:1,oz:1 }] },

  { x:-9, z:-3, bs:[{ w:2.0,d:1.6,h:3.2,accent:true,gR:3 }] },
  { x:-3, z:-3, bs:[{ w:1.2,d:1.2,h:2.6,ox:-1,oz:-1,accent:true,gR:2 },{ w:1.2,d:1.2,h:1.9,ox:1,oz:-1 },{ w:1.2,d:1.2,h:1.4,ox:1,oz:1 }] },
  { x: 9, z:-3, bs:[{ w:1.4,d:1.4,h:5.0,accent:true,gR:5 },{ w:0.9,d:0.9,h:2.2,ox:1.2,oz:1.2 }] },

  { x:-9, z: 3, bs:[{ w:1.2,d:1.2,h:2.8,ox:-1,oz:-1,accent:true,gR:2 },{ w:1.2,d:1.2,h:2.0,ox:1,oz:-1 },{ w:1.2,d:1.2,h:1.5,ox:-1,oz:1 },{ w:1.2,d:1.2,h:1.0,ox:1,oz:1 }] },
  { x:-3, z: 3, bs:[{ w:2.0,d:2.0,h:2.2,gR:2 }] },
  { x: 3, z: 3, bs:[{ w:1.5,d:1.5,h:3.8,accent:true,gR:3 },{ w:1.0,d:1.0,h:1.6,ox:1.2,oz:-1.2 }] },
  { x: 9, z: 3, bs:[{ w:1.2,d:1.2,h:1.8,ox:-1,oz:-1 },{ w:1.2,d:1.2,h:3.0,ox:1,oz:-1,accent:true,gR:3 },{ w:1.2,d:1.2,h:1.2,ox:1,oz:1 }] },

  { x:-9, z: 9, bs:[{ w:1.6,d:1.6,h:4.2,accent:true,gR:4 }] },
  { x:-3, z: 9, bs:[{ w:1.2,d:1.2,h:2.2,ox:-1,oz:-1,accent:true },{ w:1.2,d:1.2,h:1.6,ox:1,oz:-1 }] },
  { x: 3, z: 9, bs:[{ w:2.0,d:2.0,h:2.8,gR:2 }] },
  { x: 9, z: 9, bs:[{ w:1.2,d:1.2,h:1.4,ox:-1,oz:-1 },{ w:1.2,d:1.2,h:1.0,ox:1,oz:1 }] },
];

export default function CityScene() {
  return (
    <>
      <Environment preset="city" />

      <ContactShadows
        resolution={2048} scale={45} blur={2.5}
        opacity={0.35} far={12} color="#0f172a"
      />

      <group position={[0, -0.5, 0]}>
        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[44, 44]} />
          <meshStandardMaterial color={C.asphalt} roughness={0.85} />
        </mesh>

        <Roads />

        {/* Traffic signals */}
        <TrafficSignal position={[-0.7, 0.05, -0.7]} />
        <TrafficSignal position={[6.7, 0.05, -0.7]} rotation={[0, Math.PI / 2, 0]} />
        <TrafficSignal position={[-0.7, 0.05, 6.7]} rotation={[0, -Math.PI / 2, 0]} />

        {/* Blocks */}
        {BLOCKS.map((block, bi) => (
          <group key={bi} position={[block.x, 0, block.z]}>
            <mesh position={[0, 0.05, 0]} receiveShadow>
              <boxGeometry args={[4.2, 0.1, 4.2]} />
              <meshStandardMaterial color={C.sidewalk} roughness={0.6} />
            </mesh>
            {block.bs.map((b, j) => (
              <Building
                key={j}
                x={b.ox || 0} z={b.oz || 0}
                w={b.w} d={b.d} h={b.h}
                accent={b.accent} glassRows={b.gR || 0}
                delay={bi * 0.06 + j * 0.12}
              />
            ))}
            {/* Corner trees */}
            <Tree position={[1.6, 0.1, 1.6]} />
            <Tree position={[-1.6, 0.1, -1.6]} />
          </group>
        ))}

        {/* Hospital */}
        <mesh position={[3, 0.05, -3]} receiveShadow>
          <boxGeometry args={[4.2, 0.1, 4.2]} />
          <meshStandardMaterial color={C.sidewalk} roughness={0.6} />
        </mesh>
        <Hospital />

        <AmbulanceFleet />
      </group>
    </>
  );
}
