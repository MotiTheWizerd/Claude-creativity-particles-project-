// Shape formation generators
// Each returns Float32Array of [x, y, z] positions for N particles

export function galaxyFormation(count) {
  const positions = new Float32Array(count * 3);
  const arms = 5;
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const radius = Math.random() * 12 + 0.5;
    const arm = i % arms;
    const armAngle = (arm / arms) * Math.PI * 2;
    const spin = radius * 0.6;
    const angle = armAngle + spin;

    // Add randomness that increases with distance
    const scatter = radius * 0.15;

    positions[i3] = Math.cos(angle) * radius + (Math.random() - 0.5) * scatter;
    positions[i3 + 1] = (Math.random() - 0.5) * (0.3 + radius * 0.05);
    positions[i3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * scatter;
  }
  return positions;
}

export function dnaFormation(count) {
  const positions = new Float32Array(count * 3);
  const height = 20;
  const radius = 3;
  const twists = 4;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const t = (i / count) * height - height / 2;
    const angle = (i / count) * Math.PI * 2 * twists;

    // Decide which strand or connector
    const type = Math.random();
    if (type < 0.4) {
      // Strand 1
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = t;
      positions[i3 + 2] = Math.sin(angle) * radius;
    } else if (type < 0.8) {
      // Strand 2
      positions[i3] = Math.cos(angle + Math.PI) * radius;
      positions[i3 + 1] = t;
      positions[i3 + 2] = Math.sin(angle + Math.PI) * radius;
    } else {
      // Connector bars between strands
      const lerp = Math.random();
      const a1 = angle;
      const a2 = angle + Math.PI;
      positions[i3] = Math.cos(a1) * radius * (1 - lerp) + Math.cos(a2) * radius * lerp;
      positions[i3 + 1] = t + (Math.random() - 0.5) * 0.2;
      positions[i3 + 2] = Math.sin(a1) * radius * (1 - lerp) + Math.sin(a2) * radius * lerp;
    }
  }
  return positions;
}

export function tornadoFormation(count) {
  const positions = new Float32Array(count * 3);
  const height = 18;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const t = Math.random();
    const y = t * height - height / 2;

    // Radius grows with height (wider at top)
    const baseRadius = 0.5 + t * 6;
    const angle = Math.random() * Math.PI * 2 + t * Math.PI * 6;

    // Add turbulence
    const turbulence = Math.sin(t * 10) * 0.5;

    positions[i3] = Math.cos(angle) * (baseRadius + turbulence);
    positions[i3 + 1] = y;
    positions[i3 + 2] = Math.sin(angle) * (baseRadius + turbulence);
  }
  return positions;
}

export function heartFormation(count) {
  const positions = new Float32Array(count * 3);
  const scale = 0.6;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    // 3D heart parametric surface
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI;
    const r = 1 + Math.random() * 0.1; // slight randomness

    // Heart shape equation
    const x = r * Math.sin(v) * (15 * Math.sin(u) - 4 * Math.sin(3 * u));
    const y = r * (13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u));
    const z = r * Math.cos(v) * (15 * Math.sin(u) - 4 * Math.sin(3 * u));

    positions[i3] = x * scale * 0.4;
    positions[i3 + 1] = y * scale * 0.4 - 2;
    positions[i3 + 2] = z * scale * 0.4;
  }
  return positions;
}

export function sphereFormation(count) {
  const positions = new Float32Array(count * 3);
  const radius = 7;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    // Fibonacci sphere for even distribution
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

    const r = radius * (0.95 + Math.random() * 0.1);

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);
  }
  return positions;
}

export function cubeFormation(count) {
  const positions = new Float32Array(count * 3);
  const size = 8;
  const half = size / 2;
  const perFace = Math.floor(count / 6);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const face = Math.floor(i / perFace) % 6;
    const u = (Math.random() - 0.5) * size;
    const v = (Math.random() - 0.5) * size;

    switch (face) {
      case 0: positions[i3] = u; positions[i3+1] = v; positions[i3+2] = half; break;
      case 1: positions[i3] = u; positions[i3+1] = v; positions[i3+2] = -half; break;
      case 2: positions[i3] = half; positions[i3+1] = u; positions[i3+2] = v; break;
      case 3: positions[i3] = -half; positions[i3+1] = u; positions[i3+2] = v; break;
      case 4: positions[i3] = u; positions[i3+1] = half; positions[i3+2] = v; break;
      case 5: positions[i3] = u; positions[i3+1] = -half; positions[i3+2] = v; break;
    }
  }
  return positions;
}
