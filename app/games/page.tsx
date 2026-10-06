import Library from "@/components/library/library";
import { getGames } from "@/lib/games";
import { getGameStats } from "@/lib/scores-db";

// Las lecturas de Supabase se cachean un minuto: los cambios de catálogo aparecen en 60 s
export const revalidate = 60;

export default async function GamesPage() {
  const games = await getGames();
  const stats = await Promise.all(games.map((g) => getGameStats(g.id)));
  const bestById = Object.fromEntries(games.map((g, i) => [g.id, stats[i].best]));
  return (
    <>
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>
      <Library games={games} bestById={bestById} />
    </>
  );
}
