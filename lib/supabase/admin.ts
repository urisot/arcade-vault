import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente con la clave secreta. Salta RLS: usar solo en el servidor.
// Se crea en la primera llamada, no al importar, para que una clave vacía
// no rompa las páginas que solo leen con el cliente público.
let client: SupabaseClient | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export function getAdminClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SECRET_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}
