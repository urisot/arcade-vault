// Motor de Arkanoid. Sin React ni DOM: solo datos y reglas.
// Portado de references/started-games/04-arkanoid/game.js con los mismos valores.

import type { GameStatus } from "@/lib/games/types";
import { LEVELS, type BlockColor } from "@/lib/games/arkanoid/levels";

export const CANVAS_W = 800;
export const CANVAS_H = 600;

const PADDLE_SPEED = 400;   // px/s con ← →
const PADDLE_Y = 560;
const PADDLE_W = 81;
const PADDLE_H = 14;
const BALL_SIZE = 16;
const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (CANVAS_W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;   // px/s, se multiplica por la velocidad del nivel
const BASE_BALL_VY = -300;
export const EXPLOSION_MS = 150;
const BLOCK_POINTS = 10;
const START_LIVES = 3;
const LAST_LEVEL = 5;
const MAX_DT = 0.05;        // s. Evita saltos al volver de otra pestaña

export type Input = {
  left: boolean;           // mantenido: mueve la paleta a la izquierda
  right: boolean;          // mantenido: mueve la paleta a la derecha
  pointerX: number | null; // X del puntero en unidades del canvas. null si el puntero no está sobre el canvas
};

export type Paddle = { x: number; y: number; w: number; h: number };
export type Ball = { x: number; y: number; w: number; h: number; vx: number; vy: number };

export type Block = {
  x: number; y: number; w: number; h: number;
  color: BlockColor;
  alive: boolean;
};

export type Explosion = {
  x: number; y: number; w: number; h: number;
  color: BlockColor;
  elapsed: number; // ms desde que explotó el bloque
};

export type GameState = {
  status: GameStatus;      // "playing" | "gameover". La victoria también es "gameover"
  score: number;           // puntos acumulados; es el valor que se guarda
  lives: number;           // 3 al empezar
  level: number;           // 1 al empezar, hasta 5
  paddle: Paddle;
  ball: Ball;
  blocks: Block[];         // bloques del nivel actual
  explosions: Explosion[];
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function initBall(state: GameState): void {
  const { paddle, ball } = state;
  const speed = LEVELS[state.level - 1].speed;
  ball.x = paddle.x + (paddle.w - ball.w) / 2;
  ball.y = paddle.y - ball.h;
  ball.vx = BASE_BALL_VX * speed;
  ball.vy = BASE_BALL_VY * speed;
}

function loadLevel(state: GameState, n: number): void {
  state.level = n;
  state.blocks = LEVELS[n - 1].blocks.map((b) => ({
    x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
    y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
    w: BLOCK_W,
    h: BLOCK_H,
    color: b.color,
    alive: true,
  }));
  state.explosions = [];
  initBall(state);
}

export function createGame(): GameState {
  const state: GameState = {
    status: "playing",
    score: 0,
    lives: START_LIVES,
    level: 1,
    paddle: { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H },
    ball: { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 },
    blocks: [],
    explosions: [],
  };
  state.paddle.x = (CANVAS_W - PADDLE_W) / 2;
  loadLevel(state, 1);
  return state;
}

function collideAABB(ball: Ball, block: Block): boolean {
  return (
    ball.x < block.x + block.w &&
    ball.x + ball.w > block.x &&
    ball.y < block.y + block.h &&
    ball.y + ball.h > block.y
  );
}

// Muta el estado recibido y lo devuelve. Mismo criterio que SPEC 05.
export function step(state: GameState, input: Input, dt: number): GameState {
  if (state.status !== "playing") return state;
  dt = Math.min(dt, MAX_DT);

  const { paddle, ball } = state;

  // Paleta: el puntero la centra; las teclas la mueven
  if (input.pointerX !== null) {
    paddle.x = clamp(input.pointerX - paddle.w / 2, 0, CANVAS_W - paddle.w);
  }
  if (input.left)  paddle.x = clamp(paddle.x - PADDLE_SPEED * dt, 0, CANVAS_W - paddle.w);
  if (input.right) paddle.x = clamp(paddle.x + PADDLE_SPEED * dt, 0, CANVAS_W - paddle.w);

  // Movimiento de la pelota
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Rebotes en paredes (izquierda, derecha, techo)
  if (ball.x <= 0) { ball.x = 0; ball.vx = Math.abs(ball.vx); }
  if (ball.x + ball.w >= CANVAS_W) { ball.x = CANVAS_W - ball.w; ball.vx = -Math.abs(ball.vx); }
  if (ball.y <= 0) { ball.y = 0; ball.vy = Math.abs(ball.vy); }

  // Rebote en la paleta
  if (
    ball.vy > 0 &&
    ball.x + ball.w > paddle.x &&
    ball.x < paddle.x + paddle.w &&
    ball.y + ball.h >= paddle.y &&
    ball.y + ball.h <= paddle.y + paddle.h + 8
  ) {
    ball.y = paddle.y - ball.h;
    ball.vy = -Math.abs(ball.vy);
  }

  // Colisión con bloques: como máximo uno por frame
  for (const block of state.blocks) {
    if (!block.alive) continue;
    if (collideAABB(ball, block)) {
      block.alive = false;
      state.explosions.push({ x: block.x, y: block.y, w: block.w, h: block.h, color: block.color, elapsed: 0 });
      state.score += BLOCK_POINTS;
      ball.vy = -ball.vy;
      if (state.blocks.every((b) => !b.alive)) {
        if (state.level < LAST_LEVEL) loadLevel(state, state.level + 1);
        else state.status = "gameover";
      }
      break;
    }
  }

  // Explosiones: avanzan y se retiran al terminar
  for (const exp of state.explosions) exp.elapsed += dt * 1000;
  state.explosions = state.explosions.filter((exp) => exp.elapsed < EXPLOSION_MS);

  // Pelota perdida: resta una vida y la pelota vuelve a la paleta
  if (ball.y > CANVAS_H) {
    state.lives--;
    if (state.lives <= 0) {
      state.lives = 0;
      state.status = "gameover";
    } else {
      initBall(state);
    }
  }

  return state;
}
