import type { Game } from "@/lib/data/games";
import { publicClient } from "@/lib/supabase/public";

const COLUMNS = "id, title, short, long, cat, cover, color, best, plays";

export async function getGames(): Promise<Game[]> {
  const { data, error } = await publicClient
    .from("games")
    .select(COLUMNS)
    .order("title");
  if (error) throw new Error(`No se pudo leer el catálogo: ${error.message}`);
  return data as Game[];
}

export async function getGame(id: string): Promise<Game | null> {
  const { data, error } = await publicClient
    .from("games")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer el juego ${id}: ${error.message}`);
  return (data as Game | null) ?? null;
}
