"use client";

import { useEffect, useRef, useState } from "react";
import { CANVAS_W, CANVAS_H, createGame, step, type GameState, type Input } from "@/lib/games/arkanoid/engine";
import { draw } from "@/lib/games/arkanoid/render";
import type { GameSnapshot } from "@/lib/games/types";

const SHEET_URL = "/games/arkanoid/spritesheet-breakout.png";

// Teclas del juego. Las flechas se bloquean para que la página no se desplace.
const GAME_KEYS = ["ArrowLeft", "ArrowRight"];

// Controles que se muestran en el panel. Coinciden con GAME_KEYS más el ratón: no hay tecla de pausa.
const CONTROLS: { keys: string[]; action: string }[] = [
  { keys: ["←", "→"], action: "mover paleta" },
  { keys: ["Ratón"], action: "mover paleta" },
];

const INITIAL_SNAPSHOT: GameSnapshot = { score: 0, lives: 3, level: 1, status: "playing" };

type ArkanoidCanvasProps = {
  paused: boolean;        // PAUSA/REANUDAR del reproductor. Congela el bucle sin reiniciar nada.
  endRequest: number;     // FIN incrementa este contador. El juego pasa a "gameover" al verlo cambiar.
  restartRequest: number; // JUGAR DE NUEVO incrementa este contador. El juego reinicia con createGame().
  onChange: (s: GameSnapshot) => void; // notifica a React solo cuando cambia un valor
};

export default function ArkanoidCanvas({ paused, endRequest, restartRequest, onChange }: ArkanoidCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const pausedRef = useRef(paused);
  const onChangeRef = useRef(onChange);
  const keysRef = useRef<Record<string, boolean>>({});
  // null cuando el puntero no está sobre el canvas
  const pointerXRef = useRef<number | null>(null);
  // Último snapshot para el panel lateral. Solo se actualiza cuando cambia un valor.
  const [panel, setPanel] = useState<GameSnapshot>(INITIAL_SNAPSHOT);

  // Props hacia refs: el bucle lee el valor actual sin reiniciarse
  useEffect(() => {
    pausedRef.current = paused;
    onChangeRef.current = onChange;
  }, [paused, onChange]);

  // Bucle, teclado, ratón y limpieza
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // La imagen se carga una vez. Mientras no esté lista, drawImage no pinta nada.
    const sheet = new Image();
    sheet.src = SHEET_URL;

    stateRef.current = createGame();
    keysRef.current = {};
    pointerXRef.current = null;

    let last: GameSnapshot | null = null;
    let lastTime: number | null = null;
    let frame = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!GAME_KEYS.includes(e.code)) return;
      e.preventDefault();
      keysRef.current[e.code] = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!GAME_KEYS.includes(e.code)) return;
      e.preventDefault();
      keysRef.current[e.code] = false;
    };

    // Al perder el foco no llega el keyup: se liberan todas las teclas
    const onBlur = () => {
      keysRef.current = {};
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerXRef.current = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    };

    const onMouseLeave = () => {
      pointerXRef.current = null;
    };

    const readInput = (): Input => {
      const k = keysRef.current;
      return {
        left: !!k.ArrowLeft,
        right: !!k.ArrowRight,
        pointerX: pointerXRef.current,
      };
    };

    const loop = (ts: number) => {
      const state = stateRef.current;
      if (state) {
        const dt = lastTime === null ? 0 : (ts - lastTime) / 1000;
        if (!pausedRef.current) step(state, readInput(), dt);
        draw(ctx, state, sheet);

        const snap: GameSnapshot = {
          score: state.score,
          lives: state.lives,
          level: state.level,
          status: state.status,
        };
        if (
          !last ||
          last.score !== snap.score ||
          last.lives !== snap.lives ||
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
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  // FIN: el juego pasa a gameover. La puntuación se conserva.
  useEffect(() => {
    if (endRequest === 0 || !stateRef.current) return;
    stateRef.current.status = "gameover";
  }, [endRequest]);

  // JUGAR DE NUEVO: bloques del nivel 1, 3 vidas, puntuación 0
  useEffect(() => {
    if (restartRequest === 0) return;
    stateRef.current = createGame();
  }, [restartRequest]);

  return (
    <div className="arkanoid-layout">
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="arkanoid-canvas" />

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
