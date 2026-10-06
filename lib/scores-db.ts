import type { ScoreRow } from "@/lib/data/scores";
import type { ScoreInput } from "@/lib/scores";
import { getAdminClient } from "@/lib/supabase/admin";
import { publicClient } from "@/lib/supabase/public";

// Código de Postgres para violación de clave foránea (juego inexistente)
const FOREIGN_KEY_VIOLATION = "23503";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

export async function getTopScores(gameId: string, limit = 10): Promise<ScoreRow[]> {
  const { data, error } = await publicClient
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`No se pudieron leer las puntuaciones de ${gameId}: ${error.message}`);

  return data.map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

export async function getTopScoresByGame(limit = 10): Promise<Record<string, ScoreRow[]>> {
  const { data, error } = await publicClient.from("games").select("id");
  if (error) throw new Error(`No se pudo leer el catálogo: ${error.message}`);

  const entries = await Promise.all(
    data.map(async (game) => [game.id, await getTopScores(game.id, limit)] as const),
  );
  return Object.fromEntries(entries);
}

export type InsertScoreResult = { ok: true } | { ok: false; error: "invalid" | "db_failed" };

export async function insertScore(input: ScoreInput): Promise<InsertScoreResult> {
  try {
    const { error } = await getAdminClient().from("scores").insert({
      game_id: input.game,
      name: input.name,
      score: input.score,
    });

    if (!error) return { ok: true };
    if (error.code === FOREIGN_KEY_VIOLATION) return { ok: false, error: "invalid" };

    console.error("[scores] Error al insertar puntuación:", error.message);
    return { ok: false, error: "db_failed" };
  } catch (err) {
    // Clave secreta ausente o cliente sin configurar: el detalle va al log, no a la respuesta
    console.error("[scores] Error del cliente administrador:", err);
    return { ok: false, error: "db_failed" };
  }
}
