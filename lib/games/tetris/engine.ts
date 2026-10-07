// Motor de Tetris. Sin React ni DOM: solo datos y reglas.
// Portado de references/started-games/03-tetris/game.js con los mismos valores.

export const COLS = 10;
export const ROWS = 20;

// Piezas 1–8 (8 = tuerca N). Índice = type. Ver render.ts para los colores.
const PIECES: number[][][] = [
  [],
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const KICKS = [0, -1, 1, -2, 2];
const MAX_DT = 0.05;
const REPEAT_INTERVAL = 0.05; // repetición de left, right y down mientras se mantienen

export type Input = {
  left: boolean;   // mantenido: mueve una columna y repite cada 0.05 s
  right: boolean;  // mantenido: igual que left
  down: boolean;   // mantenido: soft drop, +1 por fila, repite cada 0.05 s
  rotate: boolean; // pulsación de un frame (flanco)
  drop: boolean;   // pulsación de un frame (flanco). Hard drop
};

export type GameStatus = "playing" | "gameover";

export type Piece = {
  type: number;       // 1–8, índice de PIECES y de COLORS
  shape: number[][];  // matriz cuadrada, 0 = vacío, >0 = color
  x: number;          // columna de la esquina superior izquierda de shape
  y: number;          // fila de la esquina superior izquierda de shape
};

export type GameState = {
  status: GameStatus;
  score: number;        // puntos acumulados; es el valor que se guarda
  lives: 0;             // fijo en 0: Tetris no tiene vidas
  level: number;        // 1 al empezar
  lines: number;        // líneas eliminadas; no se muestra en el HUD
  board: number[][];    // ROWS filas × COLS columnas, 0 = vacío
  current: Piece;
  next: Piece;
  dropTimer: number;    // segundos desde la última caída automática
  repeatTimer: number;  // segundos hasta la siguiente repetición de left, right o down
};

function createBoard(): number[][] {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(board: number[][], shape: number[][], ox: number, oy: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate(state: GameState): void {
  const rotated = rotateCW(state.current.shape);
  for (const kick of KICKS) {
    if (!collide(state.board, rotated, state.current.x + kick, state.current.y)) {
      state.current.shape = rotated;
      state.current.x += kick;
      return;
    }
  }
}

function merge(state: GameState): void {
  const { shape, x, y } = state.current;
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c])
        state.board[y + r][x + c] = shape[r][c];
}

function clearLines(state: GameState): void {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (state.board[r].every(v => v !== 0)) {
      state.board.splice(r, 1);
      state.board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    state.lines += cleared;
    state.score += (LINE_SCORES[cleared] || 0) * state.level;
    state.level = Math.floor(state.lines / 10) + 1;
  }
}

// Fila donde aterrizaría la pieza actual. La usa render.ts para la pieza fantasma.
export function ghostY(state: GameState): number {
  const { board, current } = state;
  let gy = current.y;
  while (!collide(board, current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function dropInterval(level: number): number {
  return Math.max(0.1, 1.0 - (level - 1) * 0.09);
}

function spawn(state: GameState): void {
  state.current = state.next;
  state.next = randomPiece();
  if (collide(state.board, state.current.shape, state.current.x, state.current.y)) {
    endGame(state);
  }
}

function lockPiece(state: GameState): void {
  merge(state);
  clearLines(state);
  spawn(state);
}

function hardDrop(state: GameState): void {
  const gy = ghostY(state);
  state.score += (gy - state.current.y) * 2;
  state.current.y = gy;
  lockPiece(state);
}

function softDrop(state: GameState): void {
  if (!collide(state.board, state.current.shape, state.current.x, state.current.y + 1)) {
    state.current.y++;
    state.score += 1;
  } else {
    lockPiece(state);
  }
}

function moveHorizontal(state: GameState, dir: -1 | 1): void {
  if (!collide(state.board, state.current.shape, state.current.x + dir, state.current.y)) {
    state.current.x += dir;
  }
}

export function createGame(): GameState {
  return {
    status: "playing",
    score: 0,
    lives: 0,
    level: 1,
    lines: 0,
    board: createBoard(),
    current: randomPiece(),
    next: randomPiece(),
    dropTimer: 0,
    repeatTimer: 0,
  };
}

// FIN del jugador: termina la partida con la puntuación actual.
export function endGame(state: GameState): GameState {
  state.status = "gameover";
  return state;
}

export function step(state: GameState, input: Input, dt: number): GameState {
  if (state.status !== "playing") return state;
  const d = Math.min(dt, MAX_DT);

  if (input.rotate) tryRotate(state);

  // Repetición de left, right y down: actúa al instante y luego cada REPEAT_INTERVAL.
  const horizontal = input.left !== input.right;
  if (!input.left && !input.right && !input.down) {
    state.repeatTimer = 0;
  } else {
    state.repeatTimer -= d;
    if (state.repeatTimer <= 0) {
      state.repeatTimer += REPEAT_INTERVAL;
      if (horizontal) moveHorizontal(state, input.left ? -1 : 1);
      if (input.down && state.status === "playing") softDrop(state);
    }
  }

  if (input.drop && state.status === "playing") hardDrop(state);

  if (state.status === "playing") {
    state.dropTimer += d;
    if (state.dropTimer >= dropInterval(state.level)) {
      state.dropTimer = 0;
      if (!collide(state.board, state.current.shape, state.current.x, state.current.y + 1)) {
        state.current.y++;
      } else {
        lockPiece(state);
      }
    }
  }

  return state;
}
