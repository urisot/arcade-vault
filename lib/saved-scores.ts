// Puntuación guardada (localStorage, clave "av_scores", array)
export type SavedScore = { game: string; score: number; name: string; at: number };

const SCORES_KEY = "av_scores";

export function saveScore(entry: Omit<SavedScore, "at">) {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const all: SavedScore[] = Array.isArray(parsed) ? parsed : [];
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {
    // localStorage no disponible o JSON corrupto: la puntuación no se guarda
  }
}
