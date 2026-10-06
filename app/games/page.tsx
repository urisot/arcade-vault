import Library from "@/components/library/library";
import { getGames } from "@/lib/games";

// Las lecturas de Supabase se cachean un minuto: los cambios de catálogo aparecen en 60 s
export const revalidate = 60;

export default async function GamesPage() {
  const games = await getGames();
  return (
    <>
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>
      <Library games={games} />
    </>
  );
}
