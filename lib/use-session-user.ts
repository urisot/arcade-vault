import { useEffect, useState } from "react";

// Sesión (localStorage, clave "av_user")
export type SessionUser = { name: string }; // name en mayúsculas, máx. 10 caracteres

const SESSION_KEY = "av_user";
// Avisa a las demás instancias del hook (p. ej. la barra, que no se remonta al navegar)
const SESSION_EVENT = "av-session-change";

function readSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as SessionUser) : null;
    return parsed && typeof parsed.name === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSessionUser(user: SessionUser) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // localStorage no disponible: la sesión queda solo en memoria
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSessionUser() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // localStorage no disponible: la sesión se cierra solo en memoria
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

// Lee la sesión solo después de montar, para evitar discrepancias de hidratación.
export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(readSession());
    const onChange = () => setUser(readSession());
    window.addEventListener(SESSION_EVENT, onChange);
    return () => window.removeEventListener(SESSION_EVENT, onChange);
  }, []);

  return { user, signOut: clearSessionUser };
}
