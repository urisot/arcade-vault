import { createClient } from "@supabase/supabase-js";

// Cliente con la clave publicable. Solo lee: RLS no da permisos de escritura.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export const publicClient = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
);
