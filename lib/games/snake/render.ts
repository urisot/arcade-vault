// Render de Snake. Recibe el contexto y las imágenes ya cargadas como argumentos; no crea elementos.
// Sprites en public/games/snake/, copiados de references/source-assets/snake-assets/.

import { COLS, ROWS, type Cell, type Dir, type GameState } from "@/lib/games/snake/engine";

export const CELL = 40;

// Claves = nombre de archivo sin extensión (p. ej. "head_up", "body_topleft", "apple").
export type SnakeSprites = Record<string, HTMLImageElement>;

// Dirección que va de a hacia b (b vecino de a).
function dirBetween(a: Cell, b: Cell): Dir {
  if (b.x > a.x) return "right";
  if (b.x < a.x) return "left";
  if (b.y > a.y) return "down";
  return "up";
}

// Sprite de un tramo del cuerpo según los dos lados que une.
function bodyKey(prev: Cell, cur: Cell, next: Cell): string {
  const a = dirBetween(cur, prev);
  const b = dirBetween(cur, next);
  const sides = new Set([a, b]);
  if (sides.has("up") && sides.has("down")) return "body_vertical";
  if (sides.has("left") && sides.has("right")) return "body_horizontal";
  const v = sides.has("up") ? "top" : "bottom";
  const h = sides.has("left") ? "left" : "right";
  return `body_${v}${h}`;
}

export function draw(ctx: CanvasRenderingContext2D, state: GameState, sprites: SnakeSprites): void {
  const width = COLS * CELL;
  const height = ROWS * CELL;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(0, 255, 120, 0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= COLS; x++) {
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, height);
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(width, y * CELL + 0.5);
  }
  ctx.stroke();

  const drawSprite = (key: string, cell: Cell) => {
    const img = sprites[key];
    if (img) ctx.drawImage(img, cell.x * CELL, cell.y * CELL, CELL, CELL);
  };

  drawSprite("apple", state.fruit);

  const { snake } = state;
  const last = snake.length - 1;
  snake.forEach((cell, i) => {
    if (i === 0) {
      drawSprite(`head_${state.dir}`, cell);
    } else if (i === last) {
      drawSprite(`tail_${dirBetween(snake[i - 1], cell)}`, cell);
    } else {
      drawSprite(bodyKey(snake[i - 1], cell, snake[i + 1]), cell);
    }
  });
}
