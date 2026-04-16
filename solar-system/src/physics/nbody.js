/**
 * N-Body Gravitational Physics Engine
 * Uses Velocity Verlet integration for stable orbital mechanics.
 *
 * Each body: { id, position: [x,y,z], velocity: [x,y,z], mass, radius, type }
 * Forces computed pairwise: F = G * m1 * m2 / r²
 */

const SOFTENING = 0.5; // Prevents singularity when bodies overlap

export function computeAccelerations(bodies, G) {
  const n = bodies.length;
  const accelerations = bodies.map(() => [0, 0, 0]);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const bi = bodies[i];
      const bj = bodies[j];

      const dx = bj.position[0] - bi.position[0];
      const dy = bj.position[1] - bi.position[1];
      const dz = bj.position[2] - bi.position[2];

      const distSq = dx * dx + dy * dy + dz * dz + SOFTENING * SOFTENING;
      const dist = Math.sqrt(distSq);
      const force = G / (distSq * dist); // G * 1 / r³ (direction normalized by /dist)

      // F on i from j
      accelerations[i][0] += dx * force * bj.mass;
      accelerations[i][1] += dy * force * bj.mass;
      accelerations[i][2] += dz * force * bj.mass;

      // F on j from i (Newton's 3rd law)
      accelerations[j][0] -= dx * force * bi.mass;
      accelerations[j][1] -= dy * force * bi.mass;
      accelerations[j][2] -= dz * force * bi.mass;
    }
  }

  return accelerations;
}

/**
 * Velocity Verlet integration step.
 * Much better energy conservation than Euler — orbits stay stable.
 */
export function step(bodies, G, dt) {
  const n = bodies.length;
  if (n === 0) return bodies;

  // 1. Compute current accelerations
  const acc = computeAccelerations(bodies, G);

  // 2. Update positions: x += v*dt + 0.5*a*dt²
  const updated = bodies.map((body, i) => ({
    ...body,
    position: [
      body.position[0] + body.velocity[0] * dt + 0.5 * acc[i][0] * dt * dt,
      body.position[1] + body.velocity[1] * dt + 0.5 * acc[i][1] * dt * dt,
      body.position[2] + body.velocity[2] * dt + 0.5 * acc[i][2] * dt * dt,
    ],
    velocity: [...body.velocity], // clone for now
  }));

  // 3. Compute new accelerations at updated positions
  const newAcc = computeAccelerations(updated, G);

  // 4. Update velocities: v += 0.5*(a_old + a_new)*dt
  for (let i = 0; i < n; i++) {
    updated[i].velocity[0] += 0.5 * (acc[i][0] + newAcc[i][0]) * dt;
    updated[i].velocity[1] += 0.5 * (acc[i][1] + newAcc[i][1]) * dt;
    updated[i].velocity[2] += 0.5 * (acc[i][2] + newAcc[i][2]) * dt;
  }

  // 5. Check for collisions (merge bodies)
  return handleCollisions(updated);
}

function handleCollisions(bodies) {
  const merged = new Set();
  const result = [];

  for (let i = 0; i < bodies.length; i++) {
    if (merged.has(i)) continue;

    let body = { ...bodies[i] };

    for (let j = i + 1; j < bodies.length; j++) {
      if (merged.has(j)) continue;

      const dx = bodies[j].position[0] - body.position[0];
      const dy = bodies[j].position[1] - body.position[1];
      const dz = bodies[j].position[2] - body.position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const minDist = (body.radius + bodies[j].radius) * 0.5;

      if (dist < minDist) {
        // Merge: conserve momentum, combine mass
        const totalMass = body.mass + bodies[j].mass;
        body = {
          ...body,
          position: [
            (body.position[0] * body.mass + bodies[j].position[0] * bodies[j].mass) / totalMass,
            (body.position[1] * body.mass + bodies[j].position[1] * bodies[j].mass) / totalMass,
            (body.position[2] * body.mass + bodies[j].position[2] * bodies[j].mass) / totalMass,
          ],
          velocity: [
            (body.velocity[0] * body.mass + bodies[j].velocity[0] * bodies[j].mass) / totalMass,
            (body.velocity[1] * body.mass + bodies[j].velocity[1] * bodies[j].mass) / totalMass,
            (body.velocity[2] * body.mass + bodies[j].velocity[2] * bodies[j].mass) / totalMass,
          ],
          mass: totalMass,
          radius: Math.cbrt(body.radius ** 3 + bodies[j].radius ** 3), // conserve volume
          type: body.mass >= bodies[j].mass ? body.type : bodies[j].type,
          color: body.mass >= bodies[j].mass ? body.color : bodies[j].color,
          name: body.mass >= bodies[j].mass ? body.name : bodies[j].name,
        };
        merged.add(j);
      }
    }

    result.push(body);
  }

  return result;
}
