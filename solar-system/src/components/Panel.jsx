import { useState } from 'react';
import useStore, { PRESETS } from '../store/useStore';
import './Panel.css';

// ─── Objects Tab ──────────────────────────────────────
function ObjectsTab() {
  const bodies = useStore((s) => s.bodies);
  const addBody = useStore((s) => s.addBody);
  const removeBody = useStore((s) => s.removeBody);
  const updateBody = useStore((s) => s.updateBody);
  const selectBody = useStore((s) => s.selectBody);
  const selectedBodyId = useStore((s) => s.selectedBodyId);

  const [addType, setAddType] = useState('planet');

  const typeDefaults = {
    star: { name: 'New Star', mass: 300, radius: 2.5, color: '#ffaa22', type: 'star' },
    planet: { name: 'New Planet', mass: 1, radius: 0.6, color: '#4488ff', type: 'planet' },
    moon: { name: 'New Moon', mass: 0.1, radius: 0.25, color: '#cccccc', type: 'moon' },
    asteroid: { name: 'Asteroid', mass: 0.01, radius: 0.12, color: '#888888', type: 'moon' },
  };

  const handleAdd = () => {
    const defaults = typeDefaults[addType];
    // Place new body at a random offset so it's visible
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 15;
    addBody({
      ...defaults,
      position: [Math.cos(angle) * dist, 0, Math.sin(angle) * dist],
      velocity: [-Math.sin(angle) * 3, 0, Math.cos(angle) * 3],
    });
  };

  const selectedBody = bodies.find((b) => b.id === selectedBodyId);

  return (
    <div className="tab-content">
      {/* Add new body */}
      <div className="section">
        <div className="section-label">Add Object</div>
        <div className="add-row">
          <select value={addType} onChange={(e) => setAddType(e.target.value)} className="select">
            <option value="star">Star</option>
            <option value="planet">Planet</option>
            <option value="moon">Moon</option>
            <option value="asteroid">Asteroid</option>
          </select>
          <button onClick={handleAdd} className="btn btn-add">+ Add</button>
        </div>
      </div>

      {/* Object list */}
      <div className="section">
        <div className="section-label">Objects ({bodies.length})</div>
        <div className="body-list">
          {bodies.map((body) => (
            <div
              key={body.id}
              className={`body-item ${selectedBodyId === body.id ? 'selected' : ''}`}
              onClick={() => selectBody(body.id)}
            >
              <div className="body-dot" style={{ background: body.color }} />
              <span className="body-name">{body.name}</span>
              <span className="body-type">{body.type}</span>
              <button
                className="btn-remove"
                onClick={(e) => { e.stopPropagation(); removeBody(body.id); }}
              >
                x
              </button>
            </div>
          ))}
          {bodies.length === 0 && <div className="empty-msg">No objects. Add one above!</div>}
        </div>
      </div>

      {/* Selected body editor */}
      {selectedBody && (
        <div className="section">
          <div className="section-label">Edit: {selectedBody.name}</div>

          <label className="field">
            <span>Name</span>
            <input
              type="text"
              value={selectedBody.name}
              onChange={(e) => updateBody(selectedBody.id, { name: e.target.value })}
              className="input"
            />
          </label>

          <label className="field">
            <span>Mass</span>
            <input
              type="range"
              min={0.01}
              max={selectedBody.type === 'star' ? 1000 : 50}
              step={selectedBody.type === 'star' ? 5 : 0.1}
              value={selectedBody.mass}
              onChange={(e) => updateBody(selectedBody.id, { mass: parseFloat(e.target.value) })}
            />
            <span className="field-value">{selectedBody.mass.toFixed(1)}</span>
          </label>

          <label className="field">
            <span>Radius</span>
            <input
              type="range"
              min={0.1}
              max={selectedBody.type === 'star' ? 6 : 3}
              step={0.05}
              value={selectedBody.radius}
              onChange={(e) => updateBody(selectedBody.id, { radius: parseFloat(e.target.value) })}
            />
            <span className="field-value">{selectedBody.radius.toFixed(2)}</span>
          </label>

          <label className="field">
            <span>Color</span>
            <input
              type="color"
              value={selectedBody.color}
              onChange={(e) => updateBody(selectedBody.id, { color: e.target.value })}
              className="color-picker"
            />
          </label>

          <div className="section-label" style={{ marginTop: 8 }}>Velocity</div>
          {['x', 'y', 'z'].map((axis, i) => (
            <label className="field" key={axis}>
              <span>V{axis.toUpperCase()}</span>
              <input
                type="range"
                min={-15}
                max={15}
                step={0.1}
                value={selectedBody.velocity[i]}
                onChange={(e) => {
                  const newVel = [...selectedBody.velocity];
                  newVel[i] = parseFloat(e.target.value);
                  updateBody(selectedBody.id, { velocity: newVel });
                }}
              />
              <span className="field-value">{selectedBody.velocity[i].toFixed(1)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Simulation Tab ───────────────────────────────────
function SimulationTab() {
  const playing = useStore((s) => s.playing);
  const togglePlaying = useStore((s) => s.togglePlaying);
  const timeScale = useStore((s) => s.timeScale);
  const setTimeScale = useStore((s) => s.setTimeScale);
  const G = useStore((s) => s.G);
  const setG = useStore((s) => s.setG);
  const showTrails = useStore((s) => s.showTrails);
  const setShowTrails = useStore((s) => s.setShowTrails);
  const showGrid = useStore((s) => s.showGrid);
  const setShowGrid = useStore((s) => s.setShowGrid);
  const trailLength = useStore((s) => s.trailLength);
  const setTrailLength = useStore((s) => s.setTrailLength);
  const bodies = useStore((s) => s.bodies);

  const totalMass = bodies.reduce((sum, b) => sum + b.mass, 0);

  return (
    <div className="tab-content">
      <div className="section">
        <div className="section-label">Playback</div>
        <button onClick={togglePlaying} className={`btn btn-play ${playing ? 'playing' : ''}`}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>

        <label className="field">
          <span>Speed</span>
          <input
            type="range" min={0.1} max={10} step={0.1}
            value={timeScale}
            onChange={(e) => setTimeScale(parseFloat(e.target.value))}
          />
          <span className="field-value">{timeScale.toFixed(1)}x</span>
        </label>
      </div>

      <div className="section">
        <div className="section-label">Physics</div>
        <label className="field">
          <span>Gravity (G)</span>
          <input
            type="range" min={0} max={5} step={0.05}
            value={G}
            onChange={(e) => setG(parseFloat(e.target.value))}
          />
          <span className="field-value">{G.toFixed(2)}</span>
        </label>
      </div>

      <div className="section">
        <div className="section-label">Display</div>
        <label className="field toggle-field">
          <span>Trails</span>
          <input type="checkbox" checked={showTrails} onChange={(e) => setShowTrails(e.target.checked)} />
        </label>
        {showTrails && (
          <label className="field">
            <span>Trail Len</span>
            <input
              type="range" min={20} max={500} step={10}
              value={trailLength}
              onChange={(e) => setTrailLength(parseInt(e.target.value))}
            />
            <span className="field-value">{trailLength}</span>
          </label>
        )}
        <label className="field toggle-field">
          <span>Grid</span>
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
        </label>
      </div>

      <div className="section">
        <div className="section-label">Stats</div>
        <div className="stats">
          <div><span>Bodies:</span> <span>{bodies.length}</span></div>
          <div><span>Total Mass:</span> <span>{totalMass.toFixed(1)}</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── Presets Tab ──────────────────────────────────────
function PresetsTab() {
  const loadPreset = useStore((s) => s.loadPreset);

  return (
    <div className="tab-content">
      <div className="section">
        <div className="section-label">Load Preset</div>
        <div className="preset-grid">
          {Object.keys(PRESETS).map((name) => (
            <button
              key={name}
              className="btn btn-preset"
              onClick={() => loadPreset(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="preset-hint">
        Loading a preset will replace all current objects and pause the simulation.
        Press Play to start.
      </div>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────
const TABS = [
  { id: 'objects', label: 'Objects' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'presets', label: 'Presets' },
];

export default function Panel() {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);

  return (
    <div className="panel">
      <div className="panel-header">
        <h1 className="panel-title">SPACETIME</h1>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-body">
        {activeTab === 'objects' && <ObjectsTab />}
        {activeTab === 'simulation' && <SimulationTab />}
        {activeTab === 'presets' && <PresetsTab />}
      </div>
    </div>
  );
}
