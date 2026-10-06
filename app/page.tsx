import Landing from "@/components/home/landing";
import { getGames } from "@/lib/games";

// Las lecturas de Supabase se cachean un minuto: los cambios de catálogo aparecen en 60 s
export const revalidate = 60;

export default async function HomePage() {
  const games = await getGames();
  return <Landing games={games} />;
}
