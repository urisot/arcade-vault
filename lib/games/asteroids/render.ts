// Dibujo de Asteroids sobre un CanvasRenderingContext2D recibido como argumento.
// Trazados copiados de draw() de cada clase de game.js. No crea elementos ni toca el DOM.
// El HUD (nombre, puntuación, vidas, nivel) vive en React, fuera del canvas.

import { H, W, type GameState, type Asteroid, type Bullet, type Particle, type PowerupDrop, type Ship } from "./engine";

export function draw(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  state.particles.forEach((p) => drawParticle(ctx, p));
  state.asteroids.forEach((a) => drawAsteroid(ctx, a));
  state.powerups.forEach((p) => drawPowerup(ctx, p));
  state.bullets.forEach((b) => drawBullet(ctx, b));
  drawShip(ctx, state.ship, state.invulnerable);

  // Indicador de disparo triple: no está en el HUD de React
  if (state.ship.tripleShot > 0) {
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#0ff";
    ctx.font = "15px monospace";
    ctx.fillText(`3x  ${state.ship.tripleShot.toFixed(1)}s`, 14, 26);
  }
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet) {
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rot);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(a.verts[0][0], a.verts[0][1]);
  for (let i = 1; i < a.verts.length; i++) ctx.lineTo(a.verts[i][0], a.verts[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawPowerup(ctx: CanvasRenderingContext2D, p: PowerupDrop) {
  if (p.ttl < 2 && Math.floor(p.ttl * 8) % 2 === 0) return;
  const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = "#0ff";
  ctx.lineWidth = 2;
  const r = p.radius * pulse;
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  ctx.restore();
  ctx.fillStyle = "#0ff";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("3x", p.x, p.y);
}

function drawShip(ctx: CanvasRenderingContext2D, ship: Ship, invulnerable: number) {
  if (ship.dead) return;
  // Parpadeo durante invencibilidad de reaparición
  if (invulnerable > 0 && Math.floor(invulnerable * 8) % 2 === 0) return;

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";

  // Silueta clásica: triángulo con muesca trasera
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -9);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-12, 9);
  ctx.closePath();
  ctx.stroke();

  // Llama del propulsor
  if (ship.thrusting && Math.random() > 0.35) {
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.lineTo(-8 - (6 + Math.random() * 8), 0);
    ctx.lineTo(-8, 4);
    ctx.strokeStyle = "rgba(255, 130, 0, 0.85)";
    ctx.stroke();
  }

  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const alpha = p.ttl / p.life;
  ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
  ctx.stroke();
}
