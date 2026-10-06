import type { BestScoreRow, GlobalRow } from "@/lib/data/scores";
import type { Category } from "@/lib/data/games";
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

// Mejor partida de cada nombre en el juego, desde la vista best_scores (ver migración leaderboard)
export async function getBestScores(gameId: string, limit = 10): Promise<BestScoreRow[]> {
  const { data, error } = await publicClient
    .from("best_scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`No se pudo leer el ranking de ${gameId}: ${error.message}`);

  return data.map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

// Partidas totales y mejor score real del juego, calculados desde scores (no desde el catálogo)
export type GameStats = { plays: number; best: number };

export async function getGameStats(gameId: string): Promise<GameStats> {
  const [count, top] = await Promise.all([
    publicClient.from("scores").select("id", { count: "exact", head: true }).eq("game_id", gameId),
    publicClient
      .from("scores")
      .select("score")
      .eq("game_id", gameId)
      .order("score", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (count.error) throw new Error(`No se pudo contar las partidas de ${gameId}: ${count.error.message}`);
  if (top.error) throw new Error(`No se pudo leer la mejor puntuación de ${gameId}: ${top.error.message}`);

  return { plays: count.count ?? 0, best: top.data?.score ?? 0 };
}

// Suma de mejores scores por nombre. cat null = TODAS las categorías.
export async function getGlobalRanking(cat: Category | null, limit = 10): Promise<GlobalRow[]> {
  const { data, error } = await publicClient.rpc("global_ranking", {
    p_cat: cat,
    p_limit: limit,
  });
  if (error) throw new Error(`No se pudo leer el ranking global: ${error.message}`);

  const rows: { name: string; total: number }[] = data;
  return rows.map((row, i) => ({
    rank: i + 1,
    name: row.name,
    total: row.total,
  }));
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
