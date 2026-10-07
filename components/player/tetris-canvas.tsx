"use client";

import { useEffect, useRef, useState } from "react";
import { createGame, endGame, step, type GameState, type Input } from "@/lib/games/tetris/engine";
import { drawBoard, drawNext } from "@/lib/games/tetris/render";
import type { GameSnapshot } from "@/lib/games/types";

// Tablero COLS×BLOCK por ROWS×BLOCK (BLOCK = 30) y vista previa 4×4 de 30 px.
const BOARD_W = 300;
const BOARD_H = 600;
const NEXT_SIZE = 120;

// Teclas del juego. Las de movimiento se bloquean para que la página no se desplace.
const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "KeyX", "Space"];
const BLOCK_SCROLL = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"];

// Teclas que se muestran en el panel. Coinciden con GAME_KEYS: no hay tecla de pausa.
const CONTROLS: { keys: string[]; action: string }[] = [
  { keys: ["←", "→"], action: "mover" },
  { keys: ["↑", "X"], action: "rotar" },
  { keys: ["↓"], action: "bajar" },
  { keys: ["Espacio"], action: "caída" },
];

const EMPTY_SNAPSHOT: GameSnapshot = { score: 0, lives: 0, level: 1, status: "playing", lines: 0 };

type TetrisCanvasProps = {
  paused: boolean;        // PAUSA/REANUDAR del reproductor. Congela el bucle sin reiniciar nada.
  endRequest: number;     // FIN incrementa este contador. El juego pasa a "gameover" al verlo cambiar.
  restartRequest: number; // JUGAR DE NUEVO incrementa este contador. El juego reinicia con createGame().
  onChange: (s: GameSnapshot) => void; // notifica a React solo cuando cambia un valor
};

export default function TetrisCanvas({ paused, endRequest, restartRequest, onChange }: TetrisCanvasProps) {
  const boardRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const pausedRef = useRef(paused);
  const onChangeRef = useRef(onChange);
  const keysRef = useRef<Record<string, boolean>>({});
  // Acciones de una pulsación: se consumen en el frame que las lee
  const pendingRef = useRef({ rotate: false, drop: false });
  // Último snapshot para el panel lateral. Solo se actualiza cuando cambia un valor.
  const [panel, setPanel] = useState<GameSnapshot>(EMPTY_SNAPSHOT);

  // Props hacia refs: el bucle lee el valor actual sin reiniciarse
  useEffect(() => {
    pausedRef.current = paused;
    onChangeRef.current = onChange;
  }, [paused, onChange]);

  // Bucle, teclado y limpieza
  useEffect(() => {
    const board = boardRef.current;
    const next = nextRef.current;
    const ctx = board?.getContext("2d");
    const nextCtx = next?.getContext("2d");
    if (!ctx || !nextCtx) return;

    stateRef.current = createGame();
    keysRef.current = {};
    pendingRef.current = { rotate: false, drop: false };

    let last: GameSnapshot | null = null;
    let lastTime: number | null = null;
    let frame = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!GAME_KEYS.includes(e.code)) return;
      if (BLOCK_SCROLL.includes(e.code)) e.preventDefault();
      keysRef.current[e.code] = true;
      // Rotar y caer en seco: solo la primera pulsación, no la repetición automática
      if (!e.repeat) {
        if (e.code === "ArrowUp" || e.code === "KeyX") pendingRef.current.rotate = true;
        if (e.code === "Space") pendingRef.current.drop = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!GAME_KEYS.includes(e.code)) return;
      if (BLOCK_SCROLL.includes(e.code)) e.preventDefault();
      keysRef.current[e.code] = false;
    };

    // Al perder el foco no llega el keyup: se liberan todas las teclas
    const onBlur = () => {
      keysRef.current = {};
      pendingRef.current = { rotate: false, drop: false };
    };

    const readInput = (): Input => {
      const k = keysRef.current;
      const p = pendingRef.current;
      const input: Input = {
        left: !!k.ArrowLeft,
        right: !!k.ArrowRight,
        down: !!k.ArrowDown,
        rotate: p.rotate,
        drop: p.drop,
      };
      pendingRef.current = { rotate: false, drop: false };
      return input;
    };

    const loop = (ts: number) => {
      const state = stateRef.current;
      if (state) {
        const dt = lastTime === null ? 0 : (ts - lastTime) / 1000;
        if (pausedRef.current) {
          pendingRef.current = { rotate: false, drop: false }; // una acción durante la pausa no se guarda
        } else {
          step(state, readInput(), dt);
        }
        drawBoard(ctx, state);
        drawNext(nextCtx, state);

        const snap: GameSnapshot = {
          score: state.score,
          lives: state.lives,
          level: state.level,
          status: state.status,
          lines: state.lines,
        };
        if (
          !last ||
          last.score !== snap.score ||
          last.lives !== snap.lives ||
          last.level !== snap.level ||
          last.status !== snap.status ||
          last.lines !== snap.lines
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
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // FIN: el juego pasa a gameover. La puntuación se conserva.
  useEffect(() => {
    if (endRequest === 0 || !stateRef.current) return;
    endGame(stateRef.current);
  }, [endRequest]);

  // JUGAR DE NUEVO: tablero vacío, puntuación 0, nivel 1 y 0 líneas
  useEffect(() => {
    if (restartRequest === 0) return;
    stateRef.current = createGame();
  }, [restartRequest]);

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", justifyContent: "center", flexWrap: "wrap", padding: 16 }}>
      <canvas ref={boardRef} width={BOARD_W} height={BOARD_H} style={{ maxWidth: "100%", height: "auto" }} />

      <aside style={{ width: 170, display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="hud-stat">
          <div className="l">Puntuación</div>
          <div className="v">{panel.score.toLocaleString("es-ES")}</div>
        </div>
        <div className="hud-stat">
          <div className="l">Líneas</div>
          <div className="v">{panel.lines ?? 0}</div>
        </div>
        <div className="hud-stat level">
          <div className="l">Nivel</div>
          <div className="v">{String(panel.level).padStart(2, "0")}</div>
        </div>

        <div className="hud-stat">
          <div className="l">Siguiente</div>
          <div style={{ marginTop: 4, padding: 8, border: "1px solid var(--line)", background: "rgba(0,0,0,0.35)", width: "fit-content" }}>
            <canvas ref={nextRef} width={NEXT_SIZE} height={NEXT_SIZE} style={{ display: "block" }} />
          </div>
        </div>

        <div className="hud-stat">
          <div className="l">Controles</div>
          <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {CONTROLS.map((c) => (
              <li key={c.action} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-dim)" }}>
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
