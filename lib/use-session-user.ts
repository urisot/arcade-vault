import { useCallback, useEffect, useState } from "react";

// Sesión (localStorage, clave "av_user")
export type SessionUser = { name: string }; // name en mayúsculas, máx. 10 caracteres

const SESSION_KEY = "av_user";

// Lee la sesión solo después de montar, para evitar discrepancias de hidratación.
export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const parsed = raw ? (JSON.parse(raw) as SessionUser) : null;
      // Lectura de localStorage tras montar: lo exige la spec para evitar discrepancias de hidratación.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(parsed && typeof parsed.name === "string" ? parsed : null);
    } catch {
      setUser(null);
    }
  }, []);

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // localStorage no disponible: se cierra la sesión solo en memoria
    }
    setUser(null);
  }, []);

  return { user, signOut };
}
