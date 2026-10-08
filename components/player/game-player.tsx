"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { Game } from "@/lib/data/games";
import type { GameSnapshot } from "@/lib/games/types";
import { SURFACES } from "@/lib/games/registry";
import type { ScoreResponse } from "@/lib/scores";
import { useSessionUser } from "@/lib/use-session-user";

const INITIAL_SNAPSHOT: GameSnapshot = { score: 0, lives: 3, level: 1, status: "playing" };

// Reproductor. Los juegos registrados en SURFACES corren dentro de su superficie; los demás siguen con el HUD estático.
export default function GamePlayer({ game }: { game: Game }) {
  const { user } = useSessionUser();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  // Superficie registrada: el juego notifica sus cambios y React manda comandos con contadores
  const surface = SURFACES[game.id];
  const [snapshot, setSnapshot] = useState<GameSnapshot>(INITIAL_SNAPSHOT);
  const [endRequest, setEndRequest] = useState(0);
  const [restartRequest, setRestartRequest] = useState(0);
  const handleChange = useCallback((s: GameSnapshot) => setSnapshot(s), []);

  const score = surface ? snapshot.score : 0;
  const lives = surface ? snapshot.lives : 3;
  const level = surface ? snapshot.level : 1;
  const isOver = surface ? snapshot.status === "gameover" : over;
  const name = nameDraft ?? user?.name ?? "INVITADO";

  const finish = () => {
    if (surface) setEndRequest((n) => n + 1);
    else setOver(true);
  };

  const restart = () => {
    setPaused(false);
    setOver(false);
    if (surface) setRestartRequest((n) => n + 1);
    setSaved(false);
    setSaveFailed(false);
  };

  // La puntuación sigue en memoria si falla: REINTENTAR la envía de nuevo
  const save = async () => {
    setSaving(true);
    setSaveFailed(false);
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: game.id, score, name }),
      });
      const body = (await res.json()) as ScoreResponse;
      if (body.ok) {
        setSaved(true);
      } else {
        setSaveFailed(true);
      }
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>{name}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          {(!surface || surface.showLives) && (
            <div className="hud-stat lives">
              <div className="l">Vidas</div>
              <div className="v">{surface ? Array.from({ length: lives }, () => "♥").join(" ") : "♥ ♥ ♥"}</div>
            </div>
          )}
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={finish}>FIN</button>
          <Link href={`/juegos/${game.id}`} className="btn ghost">SALIR</Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {surface ? (
            <surface.Canvas
              paused={paused}
              endRequest={endRequest}
              restartRequest={restartRequest}
              onChange={handleChange}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>EN PAUSA</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.16em" }}>
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {isOver && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  maxLength={10}
                  onChange={(e) => setNameDraft(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={save} disabled={saving}>
                  {saveFailed ? "REINTENTAR" : "GUARDAR PUNTUACIÓN"}
                </button>
                {saveFailed && (
                  <div className="mono" style={{ color: "var(--magenta)", fontSize: 11, letterSpacing: "0.12em" }}>
                    [ERROR] NO SE PUDO GUARDAR
                  </div>
                )}
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>JUGAR DE NUEVO</button>
              <Link href={`/juegos/${game.id}`} className="btn yellow">VER PUNTUACIONES</Link>
              <Link href="/" className="btn magenta">VOLVER AL VAULT</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
