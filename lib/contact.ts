// Validación del formulario de contacto, compartida por cliente y servidor
export type ContactMessage = { name: string; email: string; msg: string };
export type ContactErrors = Partial<Record<keyof ContactMessage, string>>;

export const CONTACT_LIMITS = { name: 80, email: 254, msg: 2000 } as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Cuenta caracteres (no unidades UTF-16), para que los emojis cuenten como uno
function countChars(value: string): number {
  return Array.from(value).length;
}

export function validateContact(
  input: unknown,
): { ok: true; data: ContactMessage } | { ok: false; errors: ContactErrors } {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};

  const data: ContactMessage = {
    name: readField(source.name),
    email: readField(source.email),
    msg: readField(source.msg),
  };

  const errors: ContactErrors = {};

  if (countChars(data.name) === 0) {
    errors.name = "Escribe tu nombre.";
  } else if (countChars(data.name) > CONTACT_LIMITS.name) {
    errors.name = `Máximo ${CONTACT_LIMITS.name} caracteres.`;
  }

  if (countChars(data.email) === 0) {
    errors.email = "Escribe tu correo.";
  } else if (countChars(data.email) > CONTACT_LIMITS.email) {
    errors.email = `Máximo ${CONTACT_LIMITS.email} caracteres.`;
  } else if (!EMAIL_PATTERN.test(data.email)) {
    errors.email = "Escribe un correo válido.";
  }

  if (countChars(data.msg) === 0) {
    errors.msg = "Escribe un mensaje.";
  } else if (countChars(data.msg) > CONTACT_LIMITS.msg) {
    errors.msg = `Máximo ${CONTACT_LIMITS.msg} caracteres.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data };
}
