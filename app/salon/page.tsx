import HallOfFame from "@/components/hall/hall-of-fame";
import { validateCategory } from "@/lib/scores";
import { getGlobalRanking } from "@/lib/scores-db";

// Sin revalidate: la página depende de ?cat= y se lee en cada visita. Las puntuaciones nuevas
// se ven al instante porque POST /api/scores llama a revalidatePath("/salon").
export default async function SalonPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string | string[] }>;
}) {
  const { cat } = await searchParams;
  const category = validateCategory(cat);
  const rows = await getGlobalRanking(category, 10);
  return <HallOfFame category={category} rows={rows} />;
}
