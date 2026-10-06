"use client";

import { useEffect, useRef } from "react";
import { H, W, createGame, endGame, step, type GameSnapshot, type GameState, type Input } from "@/lib/games/asteroids/engine";
import { draw } from "@/lib/games/asteroids/render";

// Teclas del juego. Se bloquean para que la página no se desplace.
const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"];

type AsteroidsCanvasProps = {
  paused: boolean;        // PAUSA/REANUDAR del reproductor. Congela el bucle sin reiniciar nada.
  endRequest: number;     // FIN incrementa este contador. El juego pasa a "gameover" al verlo cambiar.
  restartRequest: number; // JUGAR DE NUEVO incrementa este contador. El juego reinicia con createGame().
  onChange: (s: GameSnapshot) => void; // notifica a React solo cuando cambia un valor
};

export default function AsteroidsCanvas({ paused, endRequest, restartRequest, onChange }: AsteroidsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const pausedRef = useRef(paused);
  const onChangeRef = useRef(onChange);
  const keysRef = useRef<Record<string, boolean>>({});
  const fireRef = useRef(false);

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

    stateRef.current = createGame();
    keysRef.current = {};
    fireRef.current = false;

    let last: GameSnapshot | null = null;
    let lastTime: number | null = null;
    let frame = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!GAME_KEYS.includes(e.code)) return;
      e.preventDefault();
      // Disparo: solo la primera pulsación, no la repetición automática
      if (e.code === "Space" && !e.repeat && !keysRef.current.Space) fireRef.current = true;
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
      fireRef.current = false;
    };

    const readInput = (): Input => {
      const k = keysRef.current;
      const fire = fireRef.current;
      fireRef.current = false;
      return { left: !!k.ArrowLeft, right: !!k.ArrowRight, thrust: !!k.ArrowUp, fire };
    };

    const loop = (ts: number) => {
      const state = stateRef.current;
      if (state) {
        const dt = lastTime === null ? 0 : (ts - lastTime) / 1000;
        if (pausedRef.current) {
          fireRef.current = false; // un disparo durante la pausa no se guarda
        } else {
          step(state, readInput(), dt);
        }
        draw(ctx, state);

        const snap: GameSnapshot = { score: state.score, lives: state.lives, level: state.level, status: state.status };
        if (!last || last.score !== snap.score || last.lives !== snap.lives || last.level !== snap.level || last.status !== snap.status) {
          last = snap;
          onChangeRef.current(snap);
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

  // JUGAR DE NUEVO: partida nueva con 3 vidas, nivel 1 y puntuación 0
  useEffect(() => {
    if (restartRequest === 0) return;
    stateRef.current = createGame();
  }, [restartRequest]);

  return <canvas ref={canvasRef} width={W} height={H} className="asteroids-canvas" />;
}
