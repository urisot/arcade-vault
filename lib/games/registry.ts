// Registro de superficies de juego: id del juego → componente que lo ejecuta en el reproductor.
// Los juegos sin entrada conservan el HUD placeholder de game-player.tsx.

import type { ComponentType } from "react";
import AsteroidsCanvas from "@/components/player/asteroids-canvas";
import TetrisCanvas from "@/components/player/tetris-canvas";
import ArkanoidCanvas from "@/components/player/arkanoid-canvas";
import type { GameSnapshot } from "@/lib/games/types";

// Comandos de React hacia la superficie. Ver SPEC 05.
export type CanvasProps = {
  paused: boolean;       // PAUSA/REANUDAR. Congela el bucle sin reiniciar nada.
  endRequest: number;    // FIN incrementa este contador. El juego pasa a "gameover".
  restartRequest: number; // JUGAR DE NUEVO incrementa este contador. Reinicia la partida.
  onChange: (s: GameSnapshot) => void; // solo cuando cambia score, lives, level o status
};

export type Surface = {
  Canvas: ComponentType<CanvasProps>; // superficie del juego
  showLives: boolean;                 // el HUD muestra la vida solo si es true
};

export const SURFACES: Record<string, Surface> = {
  asteroides: { Canvas: AsteroidsCanvas, showLives: true },
  tetris: { Canvas: TetrisCanvas, showLives: false },
  arkanoid: { Canvas: ArkanoidCanvas, showLives: true },
};
