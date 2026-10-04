import { validateContact } from "@/lib/contact";
import { sendContactEmail } from "@/lib/send-contact-email";

export async function POST(request: Request) {
  // Un cuerpo que no es JSON se trata como vacío: la validación responde 400
  const body: unknown = await request.json().catch(() => ({}));

  const result = validateContact(body);
  if (!result.ok) {
    return Response.json({ ok: false, error: "invalid", errors: result.errors }, { status: 400 });
  }

  try {
    await sendContactEmail(result.data);
  } catch (err) {
    // El detalle va al log del servidor; la respuesta no debe revelar la clave ni el error interno
    console.error("[api/contact] Error al enviar el correo:", err);
    return Response.json({ ok: false, error: "send_failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
