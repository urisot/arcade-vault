// Motor de Snake. Sin React ni DOM: solo datos y reglas.
// Valores propios de SPEC 09 (no hay original de referencia).

export const COLS = 20;
export const ROWS = 15;

const MAX_DT = 0.05;
const BASE_SPEED = 4.096; // pasos por segundo en el nivel 1 (8 × 0.8³)
const MAX_SPEED = 7.168; // tope de pasos por segundo (14 × 0.8³)
const SPEED_STEP = 1.05; // +5 % de velocidad por nivel
const FRUIT_POINTS = 10;
const FRUITS_PER_LEVEL = 5;

export type Dir = "up" | "down" | "left" | "right";
export type Input = { dir: Dir | null }; // giro pedido en este frame; null = sin cambio

export type GameStatus = "playing" | "gameover";

export type Cell = { x: number; y: number }; // celda de la grilla, origen arriba-izquierda

export type GameState = {
  status: GameStatus;
  score: number;          // 10 por fruta; es el valor que se guarda
  level: number;          // 1 al empezar; sube cada 5 frutas
  fruits: number;         // frutas comidas en la partida
  snake: Cell[];          // snake[0] es la cabeza; 3 celdas al empezar
  dir: Dir;               // dirección actual
  pendingDir: Dir | null; // giro pedido, se aplica en el siguiente paso
  fruit: Cell;            // posición de la fruta
  stepTimer: number;      // segundos acumulados desde el último paso
};

const DELTA: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

// Celda libre elegida con random. Devuelve null si la grilla está llena.
function placeFruit(snake: Cell[], random: () => number): Cell | null {
  const free: Cell[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = { x, y };
      if (!snake.some((s) => sameCell(s, cell))) free.push(cell);
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(random() * free.length)];
}

// Pasos por segundo del nivel: 4,096 en el nivel 1, +5 % por nivel, tope de 7,168.
function speedFor(level: number): number {
  return Math.min(MAX_SPEED, BASE_SPEED * SPEED_STEP ** (level - 1));
}

export function createGame(random: () => number = Math.random): GameState {
  const snake: Cell[] = [
    { x: 10, y: 7 },
    { x: 9, y: 7 },
    { x: 8, y: 7 },
  ];
  return {
    status: "playing",
    score: 0,
    level: 1,
    fruits: 0,
    snake,
    dir: "right",
    pendingDir: null,
    fruit: placeFruit(snake, random) ?? { x: 0, y: 0 },
    stepTimer: 0,
  };
}

export function step(
  state: GameState,
  input: Input,
  dt: number,
  random: () => number = Math.random,
): GameState {
  if (state.status !== "playing") return state;

  // Un giro válido reemplaza al pendiente. La dirección opuesta a la actual se ignora.
  const pendingDir =
    input.dir && input.dir !== OPPOSITE[state.dir] ? input.dir : state.pendingDir;

  const timer = state.stepTimer + Math.min(dt, MAX_DT);
  const interval = 1 / speedFor(state.level);
  if (timer < interval) {
    return { ...state, pendingDir, stepTimer: timer };
  }

  // Con dt <= 0.05 y velocidad <= 7,168, nunca hace falta más de un paso por frame.
  const dir = pendingDir ?? state.dir;
  const d = DELTA[dir];
  const head = { x: state.snake[0].x + d.x, y: state.snake[0].y + d.y };

  const outside = head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS;
  const eats = sameCell(head, state.fruit);
  // La cola se libera en este paso, salvo que la serpiente crezca.
  const body = eats ? state.snake : state.snake.slice(0, -1);
  const hitsBody = body.some((s) => sameCell(s, head));

  if (outside || hitsBody) {
    return { ...state, status: "gameover", dir, pendingDir: null, stepTimer: 0 };
  }

  const snake = eats ? [head, ...state.snake] : [head, ...state.snake.slice(0, -1)];
  if (!eats) {
    return { ...state, snake, dir, pendingDir: null, stepTimer: timer - interval };
  }

  const fruits = state.fruits + 1;
  const level = 1 + Math.floor(fruits / FRUITS_PER_LEVEL);
  const fruit = placeFruit(snake, random);
  return {
    ...state,
    status: fruit ? "playing" : "gameover", // grilla llena: fin de partida
    score: state.score + FRUIT_POINTS,
    level,
    fruits,
    snake,
    dir,
    pendingDir: null,
    fruit: fruit ?? head,
    stepTimer: timer - interval,
  };
}
