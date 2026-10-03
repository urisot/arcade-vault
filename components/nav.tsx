"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSessionUser } from "@/lib/use-session-user";

export default function Nav() {
  const pathname = usePathname();
  const { user, signOut } = useSessionUser();
  const [open, setOpen] = useState(false);

  const isLibrary = pathname === "/" || pathname.startsWith("/juegos");
  const isHallOfFame = pathname.startsWith("/salon");
  const isAuth = pathname.startsWith("/login");

  const closeMenu = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo">
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isLibrary ? "active" : ""}>Biblioteca</Link>
          <Link href="/salon" className={isHallOfFame ? "active" : ""}>Salón de la Fama</Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={signOut}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/login" className="btn auth-btn">Iniciar Sesión</Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={closeMenu}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>MENÚ</div>
        <Link href="/" className={isLibrary ? "active" : ""} onClick={closeMenu}>Biblioteca</Link>
        <Link href="/salon" className={isHallOfFame ? "active" : ""} onClick={closeMenu}>Salón de la Fama</Link>
        <Link href="/login" className={isAuth ? "active" : ""} onClick={closeMenu}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
