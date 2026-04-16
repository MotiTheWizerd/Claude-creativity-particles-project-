import { create } from 'zustand';
import { step } from '../physics/nbody';

let nextId = 1;

export function createBody({
  name = 'Body',
  type = 'planet',
  position = [0, 0, 0],
  velocity = [0, 0, 0],
  mass = 1,
  radius = 0.5,
  color = '#4488ff',
} = {}) {
  return {
    id: nextId++,
    name,
    type,
    position: [...position],
    velocity: [...velocity],
    mass,
    radius,
    color,
    trail: [],
  };
}

// ─── Presets ──────────────────────────────────────────────
export const PRESETS = {
  'Solar System': () => [
    createBody({ name: 'Sun', type: 'star', position: [0, 0, 0], velocity: [0, 0, 0], mass: 500, radius: 3, color: '#ffaa22' }),
    createBody({ name: 'Mercury', type: 'planet', position: [8, 0, 0], velocity: [0, 0, 7.5], mass: 0.2, radius: 0.3, color: '#aaaaaa' }),
    createBody({ name: 'Venus', type: 'planet', position: [12, 0, 0], velocity: [0, 0, 6.2], mass: 0.5, radius: 0.5, color: '#e8a735' }),
    createBody({ name: 'Earth', type: 'planet', position: [17, 0, 0], velocity: [0, 0, 5.3], mass: 0.6, radius: 0.55, color: '#3388ee' }),
    createBody({ name: 'Mars', type: 'planet', position: [22, 0, 0], velocity: [0, 0, 4.7], mass: 0.35, radius: 0.4, color: '#cc4422' }),
    createBody({ name: 'Jupiter', type: 'planet', position: [32, 0, 0], velocity: [0, 0, 3.8], mass: 15, radius: 1.8, color: '#cc9966' }),
    createBody({ name: 'Saturn', type: 'planet', position: [42, 0, 0], velocity: [0, 0, 3.3], mass: 10, radius: 1.5, color: '#ddbb77' }),
  ],
  'Binary Stars': () => [
    createBody({ name: 'Star A', type: 'star', position: [-8, 0, 0], velocity: [0, 0, 2.5], mass: 300, radius: 2.5, color: '#ff6644' }),
    createBody({ name: 'Star B', type: 'star', position: [8, 0, 0], velocity: [0, 0, -2.5], mass: 300, radius: 2.5, color: '#4488ff' }),
    createBody({ name: 'Planet', type: 'planet', position: [0, 0, 25], velocity: [3.5, 0, 0], mass: 0.5, radius: 0.5, color: '#44dd88' }),
  ],
  'Three-Body Chaos': () => [
    createBody({ name: 'Star A', type: 'star', position: [-10, 0, 5], velocity: [1, 0, -1], mass: 200, radius: 2, color: '#ff4466' }),
    createBody({ name: 'Star B', type: 'star', position: [10, 0, -5], velocity: [-1, 0, 0.5], mass: 200, radius: 2, color: '#44aaff' }),
    createBody({ name: 'Star C', type: 'star', position: [0, 0, -8], velocity: [0, 0, 0.5], mass: 200, radius: 2, color: '#ffcc22' }),
  ],
  'Moon Orbit': () => [
    createBody({ name: 'Planet', type: 'planet', position: [0, 0, 0], velocity: [0, 0, 0], mass: 100, radius: 2, color: '#3388ee' }),
    createBody({ name: 'Moon', type: 'moon', position: [6, 0, 0], velocity: [0, 0, 4], mass: 0.3, radius: 0.4, color: '#cccccc' }),
  ],
  'Empty': () => [],
};

const MAX_TRAIL_LENGTH = 200;

const useStore = create((set, get) => ({
  // ─── Simulation state ─────────────────
  bodies: PRESETS['Solar System'](),
  playing: false,
  timeScale: 1,
  G: 1,
  trailLength: MAX_TRAIL_LENGTH,
  showTrails: true,
  showGrid: true,
  selectedBodyId: null,

  // ─── UI state ─────────────────────────
  activeTab: 'objects',

  // ─── Actions ──────────────────────────
  setActiveTab: (tab) => set({ activeTab: tab }),
  setPlaying: (playing) => set({ playing }),
  togglePlaying: () => set((s) => ({ playing: !s.playing })),
  setTimeScale: (timeScale) => set({ timeScale }),
  setG: (G) => set({ G }),
  setTrailLength: (trailLength) => set({ trailLength }),
  setShowTrails: (showTrails) => set({ showTrails }),
  setShowGrid: (showGrid) => set({ showGrid }),
  selectBody: (id) => set({ selectedBodyId: id }),

  addBody: (config) => set((s) => ({
    bodies: [...s.bodies, createBody(config)],
  })),

  removeBody: (id) => set((s) => ({
    bodies: s.bodies.filter((b) => b.id !== id),
    selectedBodyId: s.selectedBodyId === id ? null : s.selectedBodyId,
  })),

  updateBody: (id, updates) => set((s) => ({
    bodies: s.bodies.map((b) => (b.id === id ? { ...b, ...updates } : b)),
  })),

  clearBodies: () => set({ bodies: [], selectedBodyId: null }),

  loadPreset: (name) => {
    nextId = 1;
    set({
      bodies: PRESETS[name](),
      playing: false,
      selectedBodyId: null,
    });
  },

  // ─── Physics tick ─────────────────────
  tick: (dt) => {
    const { bodies, G, timeScale, playing, trailLength } = get();
    if (!playing || bodies.length === 0) return;

    const scaledDt = dt * timeScale;

    // Run multiple sub-steps for stability at high time scales
    const subSteps = Math.max(1, Math.ceil(timeScale / 2));
    const subDt = scaledDt / subSteps;

    let currentBodies = bodies;
    for (let s = 0; s < subSteps; s++) {
      currentBodies = step(currentBodies, G, subDt);
    }

    // Update trails
    const withTrails = currentBodies.map((body) => {
      const existingBody = bodies.find((b) => b.id === body.id);
      const prevTrail = existingBody?.trail || [];
      const trail = [...prevTrail, [...body.position]];
      if (trail.length > trailLength) trail.splice(0, trail.length - trailLength);
      return { ...body, trail };
    });

    set({ bodies: withTrails });
  },
}));

export default useStore;
