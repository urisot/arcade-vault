import HallOfFame from "@/components/hall/hall-of-fame";
import { getGames } from "@/lib/games";
import { getTopScoresByGame } from "@/lib/scores-db";

// Las lecturas de Supabase se cachean un minuto: una puntuación nueva aparece en 60 s
export const revalidate = 60;

export default async function SalonPage() {
  const [games, scoresByGame] = await Promise.all([getGames(), getTopScoresByGame(10)]);
  return <HallOfFame games={games} scoresByGame={scoresByGame} />;
}
