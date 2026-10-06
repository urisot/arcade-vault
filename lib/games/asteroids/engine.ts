// Motor de Asteroids. Sin React ni DOM: solo datos y reglas.
// Portado de references/started-games/02-asteroids/game.js con los mismos valores.

export const W = 800;
export const H = 600;

const RADII = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];  // velocidad base por tamaño
export const POINTS = [0, 100, 50, 20]; // puntos por tamaño

const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_DURATION = 5;
const POWERUP_TTL = 12;
const TRIPLE_SPREAD = 0.18;
const MAX_DT = 0.05;

export type Input = { left: boolean; right: boolean; thrust: boolean; fire: boolean }; // fire = pulsación de un frame
export type GameStatus = "playing" | "dead" | "gameover";

export type Ship = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  thrusting: boolean;
  shootCooldown: number;
  tripleShot: number;
  dead: boolean;
};

export type Bullet = { x: number; y: number; vx: number; vy: number; ttl: number; radius: number; dead: boolean };

export type Asteroid = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  radius: number;
  rot: number;
  rotSpeed: number;
  verts: [number, number][];
  dead: boolean;
};

export type Particle = { x: number; y: number; vx: number; vy: number; life: number; ttl: number; dead: boolean };

export type PowerupDrop = { x: number; y: number; vx: number; vy: number; radius: number; ttl: number; dead: boolean };

export type GameState = {
  status: GameStatus;
  score: number;          // puntos acumulados; es el valor que se guarda
  lives: number;          // 3 al empezar
  level: number;          // 1 al empezar
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  particles: Particle[];
  powerups: PowerupDrop[];
  powerUpSpawned: boolean;
  killsSinceSpawn: number;
  deadTimer: number;      // segundos de espera tras morir
  invulnerable: number;   // segundos de invencibilidad restantes
};

export type GameSnapshot = { score: number; lives: number; level: number; status: GameStatus };

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

// ── Entidades ─────────────────────────────────────────────────────────────────
function newShip(): Ship {
  return {
    x: W / 2,
    y: H / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: 12,
    thrusting: false,
    shootCooldown: 0,
    tripleShot: 0,
    dead: false,
  };
}

function newBullet(x: number, y: number, angle: number): Bullet {
  const SPEED = 520;
  return {
    x,
    y,
    vx: Math.cos(angle) * SPEED,
    vy: Math.sin(angle) * SPEED,
    ttl: 1.1,
    radius: 2,
    dead: false,
  };
}

function newAsteroid(x: number, y: number, size: number): Asteroid {
  const radius = RADII[size];
  const angle = rand(0, Math.PI * 2);
  const speed = SPEEDS[size] + rand(-15, 15);

  // Polígono irregular
  const n = randInt(8, 13);
  const verts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = radius * rand(0.6, 1.0);
    verts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }

  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size,
    radius,
    rot: rand(0, Math.PI * 2),
    rotSpeed: rand(-1.2, 1.2),
    verts,
    dead: false,
  };
}

function newPowerup(x: number, y: number): PowerupDrop {
  const angle = rand(0, Math.PI * 2);
  const speed = rand(20, 40);
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 12,
    ttl: POWERUP_TTL,
    dead: false,
  };
}

function newParticle(x: number, y: number): Particle {
  const angle = rand(0, Math.PI * 2);
  const speed = rand(30, 130);
  const life = rand(0.4, 1.1);
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life,
    ttl: life,
    dead: false,
  };
}

// ── Estado ────────────────────────────────────────────────────────────────────
function spawnAsteroids(state: GameState, count: number) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    state.asteroids.push(newAsteroid(x, y, 3));
  }
}

function explode(state: GameState, x: number, y: number, count = 8) {
  for (let i = 0; i < count; i++) state.particles.push(newParticle(x, y));
}

function resetShip(state: GameState) {
  state.ship = newShip();
  state.invulnerable = 3;
}

export function createGame(): GameState {
  const state: GameState = {
    status: "playing",
    score: 0,
    lives: 3,
    level: 1,
    ship: newShip(),
    bullets: [],
    asteroids: [],
    particles: [],
    powerups: [],
    powerUpSpawned: false,
    killsSinceSpawn: 0,
    deadTimer: 0,
    invulnerable: 3,
  };
  spawnAsteroids(state, 4);
  return state;
}

// FIN desde el reproductor. Conserva puntuación, vidas y nivel.
export function endGame(state: GameState): GameState {
  state.status = "gameover";
  return state;
}

function nextLevel(state: GameState) {
  state.level++;
  state.bullets = [];
  state.particles = [];
  state.powerups = [];
  state.powerUpSpawned = false;
  state.killsSinceSpawn = 0;
  resetShip(state);
  spawnAsteroids(state, 3 + state.level);
}

function killShip(state: GameState) {
  explode(state, state.ship.x, state.ship.y, 14);
  state.ship.dead = true;
  state.lives--;
  if (state.lives <= 0) {
    state.status = "gameover";
  } else {
    state.status = "dead";
    state.deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function updateParticles(state: GameState, dt: number) {
  state.particles.forEach((p) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.ttl -= dt;
    if (p.ttl <= 0) p.dead = true;
  });
  state.particles = state.particles.filter((p) => !p.dead);
}

function updateShip(state: GameState, input: Input, dt: number) {
  const ship = state.ship;
  if (state.invulnerable > 0) state.invulnerable -= dt;
  if (ship.shootCooldown > 0) ship.shootCooldown -= dt;
  if (ship.tripleShot > 0) ship.tripleShot -= dt;

  const ROT = 3.5;     // rad/s
  const THRUST = 260;  // px/s²
  const DRAG = 0.987;

  if (input.left) ship.angle -= ROT * dt;
  if (input.right) ship.angle += ROT * dt;

  ship.thrusting = input.thrust;
  if (ship.thrusting) {
    ship.vx += Math.cos(ship.angle) * THRUST * dt;
    ship.vy += Math.sin(ship.angle) * THRUST * dt;
  }

  ship.vx *= DRAG;
  ship.vy *= DRAG;
  ship.x = wrap(ship.x + ship.vx * dt, W);
  ship.y = wrap(ship.y + ship.vy * dt, H);
}

function tryShoot(state: GameState): Bullet[] {
  const ship = state.ship;
  if (ship.shootCooldown > 0 || ship.dead) return [];
  ship.shootCooldown = 0.2;
  const NOSE = 21;
  const ox = ship.x + Math.cos(ship.angle) * NOSE;
  const oy = ship.y + Math.sin(ship.angle) * NOSE;
  if (ship.tripleShot > 0) {
    return [
      newBullet(ox, oy, ship.angle - TRIPLE_SPREAD),
      newBullet(ox, oy, ship.angle),
      newBullet(ox, oy, ship.angle + TRIPLE_SPREAD),
    ];
  }
  return [newBullet(ox, oy, ship.angle)];
}

// Avanza el juego un paso. Muta y devuelve el mismo estado.
export function step(state: GameState, input: Input, dt: number): GameState {
  const h = Math.min(dt, MAX_DT);

  if (state.status === "gameover") {
    updateParticles(state, h);
    return state;
  }

  if (state.status === "dead") {
    state.deadTimer -= h;
    updateParticles(state, h);
    state.asteroids.forEach((a) => updateAsteroid(a, h));
    if (state.deadTimer <= 0) {
      state.status = "playing";
      resetShip(state);
    }
    return state;
  }

  if (input.fire) state.bullets.push(...tryShoot(state));

  updateShip(state, input, h);
  state.bullets.forEach((b) => updateBullet(b, h));
  state.asteroids.forEach((a) => updateAsteroid(a, h));
  updateParticles(state, h);
  state.powerups.forEach((p) => updatePowerup(p, h));

  state.bullets = state.bullets.filter((b) => !b.dead);
  state.powerups = state.powerups.filter((p) => !p.dead);

  // Recoger power-up
  for (const p of state.powerups) {
    if (!p.dead && dist(state.ship, p) < state.ship.radius + p.radius) {
      p.dead = true;
      state.ship.tripleShot = POWERUP_DURATION;
    }
  }

  // Bala vs asteroide
  const newAsteroids: Asteroid[] = [];
  for (const b of state.bullets) {
    for (const a of state.asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        state.score += POINTS[a.size];
        explode(state, a.x, a.y, a.size * 5);
        newAsteroids.push(...splitAsteroid(a));
        if (!state.powerUpSpawned) {
          state.killsSinceSpawn++;
          const guaranteed = state.killsSinceSpawn >= 5;
          if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
            state.powerups.push(newPowerup(a.x, a.y));
            state.powerUpSpawned = true;
          }
        }
      }
    }
  }
  state.asteroids = state.asteroids.filter((a) => !a.dead).concat(newAsteroids);
  state.bullets = state.bullets.filter((b) => !b.dead);

  // Nave vs asteroide
  if (state.invulnerable <= 0) {
    for (const a of state.asteroids) {
      if (dist(state.ship, a) < state.ship.radius + a.radius * 0.82) {
        killShip(state);
        break;
      }
    }
  }

  // Nivel completado. Solo si la nave sigue viva: no avanza en game over ni durante la muerte.
  if (state.status === "playing" && state.asteroids.length === 0) nextLevel(state);

  return state;
}

function updateBullet(b: Bullet, dt: number) {
  b.x = wrap(b.x + b.vx * dt, W);
  b.y = wrap(b.y + b.vy * dt, H);
  b.ttl -= dt;
  if (b.ttl <= 0) b.dead = true;
}

function updateAsteroid(a: Asteroid, dt: number) {
  a.x = wrap(a.x + a.vx * dt, W);
  a.y = wrap(a.y + a.vy * dt, H);
  a.rot += a.rotSpeed * dt;
}

function updatePowerup(p: PowerupDrop, dt: number) {
  p.x = wrap(p.x + p.vx * dt, W);
  p.y = wrap(p.y + p.vy * dt, H);
  p.ttl -= dt;
  if (p.ttl <= 0) p.dead = true;
}

function splitAsteroid(a: Asteroid): Asteroid[] {
  if (a.size <= 1) return [];
  return [newAsteroid(a.x, a.y, a.size - 1), newAsteroid(a.x, a.y, a.size - 1)];
}
