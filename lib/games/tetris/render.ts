// Render de Tetris. Sin React ni DOM: recibe el contexto y dibuja el estado.
// Portado de draw(), drawBlock(), drawGrid() y drawNext() de references/started-games/03-tetris/game.js.

import { COLS, ROWS, ghostY, type GameState } from "./engine";

const BLOCK = 30;
const NEXT_BLOCK = 30;
const GRID_LINE = "#22222e"; // --grid-line del tema oscuro del original

// Índice = type. 0 no se usa.
const COLORS = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha = 1,
): void {
  if (!colorIndex) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS[colorIndex] ?? "#ffffff";
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // brillo superior
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  ctx.globalAlpha = 1;
}

function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

// Tablero, pieza fantasma y pieza activa. El canvas del tablero mide COLS×BLOCK por ROWS×BLOCK.
export function drawBoard(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { board, current } = state;
  ctx.clearRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
  drawGrid(ctx);

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  const gy = ghostY(state);
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

// Vista previa de la siguiente pieza, centrada en una cuadrícula de 4×4.
export function drawNext(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { shape } = state.next;
  ctx.clearRect(0, 0, 4 * NEXT_BLOCK, 4 * NEXT_BLOCK);
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(ctx, offX + c, offY + r, shape[r][c], NEXT_BLOCK);
}
