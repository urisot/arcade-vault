"use client";

import { useEffect, useRef, useState } from "react";
import { COLS, ROWS, createGame, step, type Dir, type GameState } from "@/lib/games/snake/engine";
import { CELL, draw, type SnakeSprites } from "@/lib/games/snake/render";
import type { GameSnapshot } from "@/lib/games/types";

// Sprites de public/games/snake/. Claves = nombre de archivo sin extensión.
const SPRITE_KEYS = [
  "apple",
  "head_up", "head_down", "head_left", "head_right",
  "body_horizontal", "body_vertical", "body_topleft", "body_topright", "body_bottomleft", "body_bottomright",
  "tail_up", "tail_down", "tail_left", "tail_right",
];

// Flechas que giran la serpiente. Las flechas se bloquean para que la página no se desplace.
const KEY_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

// Controles que se muestran en el panel. Solo las teclas que usa el juego: no hay tecla de pausa.
const CONTROLS: { keys: string[]; action: string }[] = [
  { keys: ["←", "→", "↑", "↓"], action: "girar" },
];

const INITIAL_SNAPSHOT: GameSnapshot = { score: 0, lives: 0, level: 1, status: "playing" };

type SnakeCanvasProps = {
  paused: boolean;        // PAUSA/REANUDAR del reproductor. Congela el bucle sin reiniciar nada.
  endRequest: number;     // FIN incrementa este contador. El juego pasa a "gameover" al verlo cambiar.
  restartRequest: number; // JUGAR DE NUEVO incrementa este contador. El juego reinicia con createGame().
  onChange: (s: GameSnapshot) => void; // notifica a React solo cuando cambia un valor
};

export default function SnakeCanvas({ paused, endRequest, restartRequest, onChange }: SnakeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const pausedRef = useRef(paused);
  const onChangeRef = useRef(onChange);
  // Giro pedido por una flecha desde el último paso. Se consume al aplicarlo.
  const dirRequestRef = useRef<Dir | null>(null);
  // Último snapshot para el panel lateral. Solo se actualiza cuando cambia un valor.
  const [panel, setPanel] = useState<GameSnapshot>(INITIAL_SNAPSHOT);

  // Props hacia refs: el bucle lee el valor actual sin reiniciarse
  useEffect(() => {
    pausedRef.current = paused;
    onChangeRef.current = onChange;
  }, [paused, onChange]);

  // Bucle, teclado y limpieza
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Las imágenes se cargan una vez. Mientras no estén listas, drawImage no pinta nada.
    const sprites: SnakeSprites = {};
    for (const key of SPRITE_KEYS) {
      const img = new Image();
      img.src = `/games/snake/${key}.png`;
      sprites[key] = img;
    }

    stateRef.current = createGame();
    dirRequestRef.current = null;

    let last: GameSnapshot | null = null;
    let lastTime: number | null = null;
    let frame = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_DIR[e.code];
      if (!dir) return;
      e.preventDefault();
      dirRequestRef.current = dir;
    };

    // Al perder el foco no llega el keyup: se descarta el giro pendiente
    const onBlur = () => {
      dirRequestRef.current = null;
    };

    const loop = (ts: number) => {
      let state = stateRef.current;
      if (state) {
        const dt = lastTime === null ? 0 : (ts - lastTime) / 1000;
        if (!pausedRef.current) {
          const dir = dirRequestRef.current;
          dirRequestRef.current = null;
          state = step(state, { dir }, dt);
          stateRef.current = state;
        }
        draw(ctx, state, sprites);

        const snap: GameSnapshot = {
          score: state.score,
          lives: 0,
          level: state.level,
          status: state.status,
        };
        if (
          !last ||
          last.score !== snap.score ||
          last.level !== snap.level ||
          last.status !== snap.status
        ) {
          last = snap;
          onChangeRef.current(snap);
          setPanel(snap);
        }
      }
      lastTime = ts;
      frame = requestAnimationFrame(loop);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onBlur);
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // FIN: el juego pasa a gameover. La puntuación se conserva.
  useEffect(() => {
    if (endRequest === 0 || !stateRef.current) return;
    stateRef.current = { ...stateRef.current, status: "gameover" };
  }, [endRequest]);

  // JUGAR DE NUEVO: serpiente de 3 celdas, nivel 1, puntuación 0
  useEffect(() => {
    if (restartRequest === 0) return;
    stateRef.current = createGame();
    dirRequestRef.current = null;
  }, [restartRequest]);

  return (
    <div className="arkanoid-layout">
      <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} className="arkanoid-canvas" />

      <aside style={{ width: 170, display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="hud-stat">
          <div className="l">Puntuación</div>
          <div className="v">{panel.score.toLocaleString("es-ES")}</div>
        </div>
        <div className="hud-stat level">
          <div className="l">Nivel</div>
          <div className="v">{String(panel.level).padStart(2, "0")}</div>
        </div>

        <div className="hud-stat">
          <div className="l">Controles</div>
          <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {CONTROLS.map((c) => (
              <li key={c.keys.join()} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-dim)" }}>
                <span style={{ display: "flex", gap: 4 }}>
                  {c.keys.map((k) => (
                    <kbd
                      key={k}
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "var(--ink)",
                        border: "1px solid var(--line)",
                        padding: "2px 6px",
                        minWidth: 24,
                        textAlign: "center",
                      }}
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
                {c.action}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
