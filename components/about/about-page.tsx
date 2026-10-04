"use client";

import { useState, type FormEvent } from "react";
import { useReveal } from "@/components/home/use-reveal";
import { HighlightIcon, type HighlightKind } from "@/components/about/highlight-icon";
import { validateContact, type ContactMessage } from "@/lib/contact";

type Status = "idle" | "sending" | "sent" | "error";

const EMPTY_FORM: ContactMessage = { name: "", email: "", msg: "" };

const HIGHLIGHTS: { i: HighlightKind; t: string; c: string }[] = [
  { i: "HEART", t: "HECHO CON ❤️ PARA JUGADORES", c: "magenta" },
  { i: "BROWSER", t: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", c: "cyan" },
  { i: "PLANT", t: "PROYECTO EN CONSTANTE CRECIMIENTO", c: "green" },
];

export default function AboutPage() {
  useReveal();

  const [form, setForm] = useState<ContactMessage>(EMPTY_FORM);
  const [status, setStatus] = useState<Status>("idle");
  const [sentName, setSentName] = useState("");
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;

    const result = validateContact(form);
    if (!result.ok) {
      triggerShake();
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      if (res.status === 400) {
        triggerShake();
        setStatus("idle");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSentName(result.data.name);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="about fade-in">
      {/* ABOUT */}
      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
        <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
        <p className="about-mission">
          ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra misión es preservar y celebrar
          los arcades que definieron una generación, haciéndolos accesibles para todos, en cualquier lugar
          y sin costo.
        </p>

        <div className="highlight-row">
          {HIGHLIGHTS.map((h, i) => (
            <div key={i} className={"highlight " + h.c} style={{ transitionDelay: i * 80 + "ms" }}>
              <HighlightIcon kind={h.i} />
              <div className="hl-text pixel">{h.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* divider banner */}
      <div className="about-divider reveal" aria-hidden="true">
        <div className="div-bar"></div>
        <div className="div-pixels">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} style={{ animationDelay: i * 80 + "ms" }}></span>
          ))}
        </div>
        <div className="div-bar"></div>
      </div>

      {/* CONTACT */}
      <section className="about-contact reveal">
        <div className="contact-grid">
          <div className="contact-intro">
            <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
            <h2 className="contact-title">CONTÁCTANOS</h2>
            <p className="contact-sub">
              ¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente quieres saludar?
              Escríbenos.
            </p>
            <div className="contact-tips">
              <div className="tip"><span className="tip-led"></span>RESPUESTA EN 24-48H</div>
              <div className="tip"><span className="tip-led y"></span>SUGERENCIAS BIENVENIDAS</div>
              <div className="tip"><span className="tip-led m"></span>SIN SPAM, JAMÁS</div>
            </div>
          </div>

          <form
            className={"contact-form" + (shake ? " shake" : "")}
            onSubmit={onSubmit}
            noValidate
          >
            {status === "sent" ? (
              <div className="terminal-success">
                <div className="term-bar">
                  <span className="dot r"></span><span className="dot y"></span><span className="dot g"></span>
                  <span className="term-title">VAULT-OS // TERMINAL</span>
                </div>
                <div className="term-body">
                  <div className="line"><span className="prompt">vault@arcade:~$</span> ./send_message --to=team</div>
                  <div className="line dim">[OK] Conectando con servidor…</div>
                  <div className="line dim">[OK] Validando contenido…</div>
                  <div className="line dim">[OK] Transmitiendo paquete…</div>
                  <div className="line success">&gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {sentName.toUpperCase()}.<span className="caret">_</span></div>
                  <div style={{ marginTop: 18 }}>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setStatus("idle");
                        setForm(EMPTY_FORM);
                      }}
                    >
                      ENVIAR OTRO MENSAJE
                    </button>
                  </div>
                </div>
              </div>
            ) : status === "error" ? (
              <div className="terminal-success">
                <div className="term-bar">
                  <span className="dot r"></span><span className="dot y"></span><span className="dot g"></span>
                  <span className="term-title">VAULT-OS // TERMINAL</span>
                </div>
                <div className="term-body">
                  <div className="line"><span className="prompt">vault@arcade:~$</span> ./send_message --to=team</div>
                  <div className="line error">[ERROR] No se pudo transmitir el mensaje. Tus datos siguen aquí.</div>
                  <div style={{ marginTop: 18 }}>
                    <button className="btn ghost" type="button" onClick={() => setStatus("idle")}>
                      REINTENTAR
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="field">
                  <label>NOMBRE</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="px_kai"
                  />
                </div>
                <div className="field">
                  <label>CORREO ELECTRÓNICO</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="jugador@vault.gg"
                  />
                </div>
                <div className="field">
                  <label>MENSAJE</label>
                  <textarea
                    rows={5}
                    value={form.msg}
                    onChange={(e) => setForm((f) => ({ ...f, msg: e.target.value }))}
                    placeholder="Cuéntanos qué tienes en mente…"
                  ></textarea>
                </div>
                <button
                  className="btn xl press"
                  type="submit"
                  disabled={status === "sending"}
                  style={{ width: "100%" }}
                >
                  ▶  ENVIAR MENSAJE
                </button>
              </>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
