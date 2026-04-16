import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import {
  galaxyFormation,
  dnaFormation,
  tornadoFormation,
  heartFormation,
  sphereFormation,
  cubeFormation,
} from './shapes.js';

// ─── Config ───────────────────────────────────────────────
const PARTICLE_COUNT = 18000;
let morphDuration = 2.0;
let maxMouseInfluence = 0.5;

// ─── Scene Setup ──────────────────────────────────────────
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020108);
scene.fog = new THREE.FogExp2(0x020108, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 5, 20);
camera.lookAt(0, 0, 0);

// ─── Post-processing (Bloom) ─────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.6,   // strength
  0.4,   // radius
  0.85   // threshold
);
composer.addPass(bloomPass);

// ─── Custom Shaders ───────────────────────────────────────
const vertexShader = /* glsl */ `
  attribute vec3 targetPosition;
  attribute float randomSeed;
  attribute float size;

  uniform float uTime;
  uniform float uMorphProgress;
  uniform vec2 uMouse;
  uniform float uMouseInfluence;
  uniform float uRotationSpeed;
  uniform float uHueOffset;
  uniform float uSatBase;
  uniform float uSizeScale;
  uniform float uBrightness;
  uniform float uColorSpeed;

  varying float vDistance;
  varying float vRandom;
  varying vec3 vColor;

  // Simplex noise helper
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = 1.79284291400159 - 0.85373472095314 *
      vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vRandom = randomSeed;

    // Smooth morph with easing
    float t = smoothstep(0.0, 1.0, uMorphProgress);

    // Interpolate between current and target with noise turbulence during transition
    float midBulge = sin(t * 3.14159) * 2.0;
    vec3 noise = vec3(
      snoise(position * 0.3 + uTime * 0.2 + randomSeed),
      snoise(position * 0.3 + uTime * 0.2 + randomSeed + 100.0),
      snoise(position * 0.3 + uTime * 0.2 + randomSeed + 200.0)
    ) * midBulge;

    vec3 morphed = mix(position, targetPosition, t) + noise;

    // Gentle floating animation
    float floatOffset = sin(uTime * 0.5 + randomSeed * 6.28) * 0.15;
    morphed.y += floatOffset;

    // Slow rotation
    float angle = uTime * uRotationSpeed;
    float cosA = cos(angle);
    float sinA = sin(angle);
    vec3 rotated = vec3(
      morphed.x * cosA - morphed.z * sinA,
      morphed.y,
      morphed.x * sinA + morphed.z * cosA
    );

    // Mouse interaction — gravity well effect
    vec4 worldPos = modelMatrix * vec4(rotated, 1.0);
    vec4 viewPos = viewMatrix * worldPos;
    vec4 projected = projectionMatrix * viewPos;
    vec2 screenPos = projected.xy / projected.w;

    float mouseDistSq = dot(screenPos - uMouse, screenPos - uMouse);
    float mousePull = uMouseInfluence * exp(-mouseDistSq * 3.0);

    // Pull particles toward mouse in screen space
    vec2 pullDir = normalize(uMouse - screenPos + 0.001) * mousePull;
    rotated.x += pullDir.x * 1.5;
    rotated.y += pullDir.y * 1.5;

    // Color based on position and time
    float hue = fract(length(rotated.xz) * 0.05 + uTime * uColorSpeed + randomSeed * 0.3 + uHueOffset);
    float sat = uSatBase + sin(uTime + randomSeed * 6.28) * 0.3;
    float val = uBrightness + mousePull * 0.12;

    // HSV to RGB
    vec3 c = vec3(hue, sat, val);
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p_col = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    vColor = c.z * mix(K.xxx, clamp(p_col - K.xxx, 0.0, 1.0), c.y);

    vDistance = -viewPos.z;

    vec4 mvPosition = viewMatrix * modelMatrix * vec4(rotated, 1.0);

    // Size attenuation
    float sizeAtten = size * uSizeScale * (150.0 / -mvPosition.z);
    sizeAtten *= (1.0 + mousePull * 0.4); // subtle grow near mouse
    gl_PointSize = max(sizeAtten, 0.5);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;

  varying float vDistance;
  varying float vRandom;
  varying vec3 vColor;

  void main() {
    // Circular particle with soft glow
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    // Discard outside circle
    if (dist > 0.5) discard;

    // Soft glow falloff
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha *= alpha; // sharper center

    // Core brightness
    float core = 1.0 - smoothstep(0.0, 0.15, dist);

    vec3 color = vColor + core * 0.3;

    // Distance fade
    float distFade = 1.0 - smoothstep(10.0, 80.0, vDistance);
    alpha *= distFade * 0.5;

    gl_FragColor = vec4(color, alpha * uOpacity);
  }
`;

// ─── Particle System ──────────────────────────────────────
const shapeGenerators = {
  galaxy: galaxyFormation,
  dna: dnaFormation,
  tornado: tornadoFormation,
  heart: heartFormation,
  sphere: sphereFormation,
  cube: cubeFormation,
};

let currentShape = 'galaxy';
let morphing = false;
let morphStartTime = 0;

// Generate initial positions
const geometry = new THREE.BufferGeometry();
const initialPositions = galaxyFormation(PARTICLE_COUNT);
const targetPositions = new Float32Array(PARTICLE_COUNT * 3);
const randomSeeds = new Float32Array(PARTICLE_COUNT);
const sizes = new Float32Array(PARTICLE_COUNT);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  randomSeeds[i] = Math.random();
  sizes[i] = Math.random() * 1.8 + 0.3;
}

// Copy initial to target (no morph at start)
targetPositions.set(initialPositions);

geometry.setAttribute('position', new THREE.BufferAttribute(initialPositions, 3));
geometry.setAttribute('targetPosition', new THREE.BufferAttribute(targetPositions, 3));
geometry.setAttribute('randomSeed', new THREE.BufferAttribute(randomSeeds, 1));
geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uMorphProgress: { value: 1.0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uMouseInfluence: { value: 0.0 },
    uRotationSpeed: { value: 0.08 },
    uHueOffset: { value: 0.0 },
    uSatBase: { value: 0.7 },
    uSizeScale: { value: 1.0 },
    uBrightness: { value: 0.3 },
    uColorSpeed: { value: 0.03 },
    uOpacity: { value: 1.0 },
  },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

// ─── Background stars ─────────────────────────────────────
const starCount = 2000;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
const starSizes = new Float32Array(starCount);
for (let i = 0; i < starCount; i++) {
  starPos[i * 3] = (Math.random() - 0.5) * 150;
  starPos[i * 3 + 1] = (Math.random() - 0.5) * 150;
  starPos[i * 3 + 2] = (Math.random() - 0.5) * 150;
  starSizes[i] = Math.random() * 1.5;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

const starMat = new THREE.PointsMaterial({
  color: 0x888899,
  size: 0.15,
  transparent: true,
  opacity: 0.6,
  sizeAttenuation: true,
  blending: THREE.AdditiveBlending,
});
scene.add(new THREE.Points(starGeo, starMat));

// ─── Mouse Interaction ────────────────────────────────────
const mouse = { x: 0, y: 0, active: false };
let targetMouseInfluence = 0;

canvas.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  mouse.active = true;
  targetMouseInfluence = maxMouseInfluence;
});

canvas.addEventListener('mouseleave', () => {
  mouse.active = false;
  targetMouseInfluence = 0;
});

// ─── Camera Controls (simple orbit + zoom) ────────────────
let cameraAngle = 0;
let cameraRadius = 20;
let cameraY = 5;
let targetRadius = 20;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let cameraAngleVelocity = 0.002; // auto-rotation

canvas.addEventListener('wheel', (e) => {
  targetRadius = Math.max(8, Math.min(50, targetRadius + e.deltaY * 0.03));
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    isDragging = true;
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
  }
});

window.addEventListener('mouseup', () => { isDragging = false; });

canvas.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    cameraAngle += dx * 0.005;
    cameraY = Math.max(-10, Math.min(15, cameraY - dy * 0.05));
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    cameraAngleVelocity = 0; // stop auto-rotate while dragging
  }
});

canvas.addEventListener('mouseup', () => {
  // Resume slow auto-rotation after drag
  setTimeout(() => { cameraAngleVelocity = 0.002; }, 2000);
});

// ─── Shape Morphing ───────────────────────────────────────
function morphTo(shapeName) {
  if (shapeName === currentShape && !morphing) return;

  // Copy current (interpolated) positions to position attribute
  const posAttr = geometry.getAttribute('position');
  const targetAttr = geometry.getAttribute('targetPosition');

  if (morphing) {
    // If already morphing, snapshot current interpolated state
    const progress = material.uniforms.uMorphProgress.value;
    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
      posAttr.array[i] = posAttr.array[i] + (targetAttr.array[i] - posAttr.array[i]) * progress;
    }
  }

  // Set new target
  const newPositions = shapeGenerators[shapeName](PARTICLE_COUNT);
  targetAttr.array.set(newPositions);
  targetAttr.needsUpdate = true;

  // Reset morph
  material.uniforms.uMorphProgress.value = 0;
  posAttr.needsUpdate = true;

  morphing = true;
  morphStartTime = performance.now() / 1000;
  currentShape = shapeName;

  // Update rotation speed per shape
  const speeds = {
    galaxy: 0.08,
    dna: 0.12,
    tornado: 0.15,
    heart: 0.05,
    sphere: 0.06,
    cube: 0.04,
  };
  material.uniforms.uRotationSpeed.value = speeds[shapeName] || 0.08;
}

// ─── UI Buttons ───────────────────────────────────────────
document.querySelectorAll('.shape-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelector('.shape-btn.active')?.classList.remove('active');
    btn.classList.add('active');
    morphTo(btn.dataset.shape);
  });
});

// ─── Animation Loop ───────────────────────────────────────
const timer = new THREE.Timer();

function animate() {
  requestAnimationFrame(animate);

  timer.update();
  const elapsed = timer.getElapsed();
  material.uniforms.uTime.value = elapsed;

  // Morph progress
  if (morphing) {
    const morphElapsed = performance.now() / 1000 - morphStartTime;
    const progress = Math.min(morphElapsed / morphDuration, 1.0);
    material.uniforms.uMorphProgress.value = progress;

    if (progress >= 1.0) {
      morphing = false;
      // Bake final positions
      const posAttr = geometry.getAttribute('position');
      const targetAttr = geometry.getAttribute('targetPosition');
      posAttr.array.set(targetAttr.array);
      posAttr.needsUpdate = true;
    }
  }

  // Smooth mouse influence
  const currentInfluence = material.uniforms.uMouseInfluence.value;
  material.uniforms.uMouseInfluence.value += (targetMouseInfluence - currentInfluence) * 0.05;
  material.uniforms.uMouse.value.set(mouse.x, mouse.y);

  // Camera orbit
  cameraAngle += cameraAngleVelocity;
  cameraRadius += (targetRadius - cameraRadius) * 0.05;
  camera.position.x = Math.sin(cameraAngle) * cameraRadius;
  camera.position.z = Math.cos(cameraAngle) * cameraRadius;
  camera.position.y += (cameraY - camera.position.y) * 0.05;
  camera.lookAt(0, 0, 0);

  // Fade mouse influence when inactive
  if (!mouse.active) {
    targetMouseInfluence *= 0.98;
  }

  composer.render();
}

// ─── Resize Handler ───────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloomPass.resolution.set(w, h);
});

// ─── Dashboard ────────────────────────────────────────────
const dashboard = document.getElementById('dashboard');
const dashToggle = document.getElementById('dashboard-toggle');

dashToggle.addEventListener('click', () => {
  dashboard.classList.toggle('closed');
  dashToggle.classList.toggle('open');
});

// Default values for reset
const defaults = {
  'bloom-strength': 0.6, 'bloom-radius': 0.4, 'bloom-threshold': 0.85,
  'particle-size': 1, 'particle-brightness': 0.3, 'particle-opacity': 1,
  'color-hue': 0, 'color-saturation': 0.7, 'color-speed': 0.03,
  'motion-rotation': 0.08, 'motion-mouse': 0.5, 'motion-morph': 2,
  'scene-exposure': 0.5, 'scene-fog': 0.015,
};

// Update value display for all sliders
function updateValueDisplay(input) {
  const display = document.querySelector(`.dash-value[data-for="${input.id}"]`);
  if (display) display.textContent = parseFloat(input.value).toFixed(2);
}

// Apply a slider value to the scene
function applySlider(id, val) {
  switch (id) {
    case 'bloom-strength': bloomPass.strength = val; break;
    case 'bloom-radius': bloomPass.radius = val; break;
    case 'bloom-threshold': bloomPass.threshold = val; break;
    case 'particle-size': material.uniforms.uSizeScale.value = val; break;
    case 'particle-brightness': material.uniforms.uBrightness.value = val; break;
    case 'particle-opacity': material.uniforms.uOpacity.value = val; break;
    case 'color-hue': material.uniforms.uHueOffset.value = val; break;
    case 'color-saturation': material.uniforms.uSatBase.value = val; break;
    case 'color-speed': material.uniforms.uColorSpeed.value = val; break;
    case 'motion-rotation': material.uniforms.uRotationSpeed.value = val; break;
    case 'motion-mouse': maxMouseInfluence = val; break;
    case 'motion-morph': morphDuration = val; break;
    case 'scene-exposure': renderer.toneMappingExposure = val; break;
    case 'scene-fog': scene.fog.density = val; break;
  }
}

// Wire up all sliders
document.querySelectorAll('.dash-slider input[type="range"]').forEach((input) => {
  updateValueDisplay(input);
  input.addEventListener('input', () => {
    const val = parseFloat(input.value);
    updateValueDisplay(input);
    applySlider(input.id, val);
  });
});

// Reset button
document.getElementById('dash-reset').addEventListener('click', () => {
  for (const [id, val] of Object.entries(defaults)) {
    const input = document.getElementById(id);
    if (input) {
      input.value = val;
      updateValueDisplay(input);
      applySlider(id, val);
    }
  }
});

// ─── Start ────────────────────────────────────────────────
animate();

console.log(`Particle Universe initialized — ${PARTICLE_COUNT} particles`);
