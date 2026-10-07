// Render de Arkanoid. Recibe el contexto y la imagen del spritesheet como argumentos; no crea elementos.
// Coordenadas copiadas de references/started-games/04-arkanoid/assets/spritesheet.js.

import type { BlockColor } from "@/lib/games/arkanoid/levels";
import { EXPLOSION_MS, type GameState } from "@/lib/games/arkanoid/engine";

type Rect = { sx: number; sy: number; sw: number; sh: number };

const SPRITES: Record<"paddle" | "ball", Rect> = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
};

const BLOCK_SPRITES: Record<BlockColor, Rect> = {
  gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
  red: { sx: 32, sy: 176, sw: 32, sh: 16 },
  yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
  cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
  magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
  hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
  green: { sx: 32, sy: 208, sw: 32, sh: 16 },
};

const EXPLOSION_FRAMES: Record<BlockColor, Rect[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 }, { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 }, { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 }, { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 }, { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 }, { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 }, { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 }, { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 }, { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 }, { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 }, { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 }, { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 }, { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  // El original usa los frames de rojo para gris.
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 }, { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 }, { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

function drawRect(ctx: CanvasRenderingContext2D, sheet: CanvasImageSource, r: Rect, x: number, y: number, w: number, h: number): void {
  ctx.drawImage(sheet, r.sx, r.sy, r.sw, r.sh, x, y, w, h);
}

// Dibuja el estado completo sobre fondo negro, como draw() de game.js.
export function draw(ctx: CanvasRenderingContext2D, state: GameState, sheet: CanvasImageSource): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (const block of state.blocks) {
    if (block.alive) drawRect(ctx, sheet, BLOCK_SPRITES[block.color], block.x, block.y, block.w, block.h);
  }

  for (const exp of state.explosions) {
    const frames = EXPLOSION_FRAMES[exp.color];
    const index = Math.min(Math.floor((exp.elapsed / EXPLOSION_MS) * frames.length), frames.length - 1);
    drawRect(ctx, sheet, frames[index], exp.x, exp.y, exp.w, exp.h);
  }

  const { paddle, ball } = state;
  drawRect(ctx, sheet, SPRITES.paddle, paddle.x, paddle.y, paddle.w, paddle.h);
  drawRect(ctx, sheet, SPRITES.ball, ball.x, ball.y, ball.w, ball.h);
}
