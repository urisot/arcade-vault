import { validateScore } from "@/lib/scores";
import { insertScore } from "@/lib/scores-db";

export async function POST(request: Request) {
  // Un cuerpo que no es JSON se trata como vacío: la validación responde 400
  const body: unknown = await request.json().catch(() => ({}));

  const result = validateScore(body);
  if (!result.ok) {
    return Response.json({ ok: false, error: "invalid", errors: result.errors }, { status: 400 });
  }

  const saved = await insertScore(result.data);
  if (saved.ok) {
    return Response.json({ ok: true });
  }

  if (saved.error === "invalid") {
    // Juego inexistente en la tabla games
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  // El detalle ya fue al log del servidor; la respuesta no revela clave ni error interno
  return Response.json({ ok: false, error: "db_failed" }, { status: 500 });
}
