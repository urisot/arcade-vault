// Validación de puntuaciones, compartida por el reproductor y la ruta /api/scores.
// No importa nada de react ni de supabase.
export type ScoreInput = { game: string; name: string; score: number };
export type ScoreErrors = Partial<Record<keyof ScoreInput, string>>;

export const SCORE_LIMITS = { name: 10, score: 99999999 } as const;

// Respuesta de POST /api/scores
export type ScoreResponse =
  | { ok: true }
  | { ok: false; error: "invalid" | "db_failed"; errors?: ScoreErrors };

function countChars(value: string): number {
  return Array.from(value).length;
}

export function validateScore(
  input: unknown,
): { ok: true; data: ScoreInput } | { ok: false; errors: ScoreErrors } {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};

  const game = typeof source.game === "string" ? source.game.trim() : "";
  const name = typeof source.name === "string" ? source.name.trim() : "";
  const score = source.score;

  const errors: ScoreErrors = {};

  if (game.length === 0) {
    errors.game = "Falta el juego.";
  }

  const nameLength = countChars(name);
  if (nameLength === 0) {
    errors.name = "Escribe tu nombre.";
  } else if (nameLength > SCORE_LIMITS.name) {
    errors.name = `Máximo ${SCORE_LIMITS.name} caracteres.`;
  }

  if (
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > SCORE_LIMITS.score
  ) {
    errors.score = `Escribe un número entero entre 0 y ${SCORE_LIMITS.score}.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { game, name, score: score as number } };
}
