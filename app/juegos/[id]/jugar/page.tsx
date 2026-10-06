import { notFound } from "next/navigation";
import GamePlayer from "@/components/player/game-player";
import { getGame } from "@/lib/games";

// Las lecturas de Supabase se cachean un minuto: los cambios aparecen en 60 s
export const revalidate = 60;

export default async function GamePlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
