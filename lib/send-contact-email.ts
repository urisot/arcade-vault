// Envío del mensaje de contacto por Resend. Solo se ejecuta en el servidor:
// no importar este archivo desde componentes cliente (la clave vive en process.env).
import { Resend } from "resend";
import type { ContactMessage } from "@/lib/contact";

const DEFAULT_FROM = "onboarding@resend.dev";

export async function sendContactEmail(message: ContactMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;

  if (!apiKey) throw new Error("Falta RESEND_API_KEY");
  if (!to) throw new Error("Falta CONTACT_TO_EMAIL");

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || DEFAULT_FROM,
    to,
    subject: `Contacto Arcade Vault: ${message.name}`,
    text: message.msg,
    replyTo: message.email,
  });

  if (error) throw new Error(`Resend rechazó el envío: ${error.message}`);
}
