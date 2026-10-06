# SPEC 03 — Página "Acerca de" con formulario de contacto por Resend

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-03
> **Objetivo:** Crear la página `/acerca` del template con su formulario de contacto, que envía cada mensaje por correo con Resend al destinatario configurado.

---

## Alcance

**Dentro:**

- Página `app/acerca/page.tsx` con el contenido del template (`about.jsx`): hero "ACERCA DE ARCADE VAULT", tres destacados, divisor de píxeles y sección "CONTÁCTANOS" con el formulario.
- Componente cliente `components/about/about-page.tsx` que replica el template: estado del formulario, validación, estado de envío, estado de éxito y estado de error.
- Iconos `HEART`, `BROWSER` y `PLANT` en `components/about/highlight-icon.tsx`.
- Envío de correo con Resend desde un route handler `POST /api/contact` (`app/api/contact/route.ts`).
- Validación compartida cliente y servidor en `lib/contact.ts`.
- Función de envío en `lib/send-contact-email.ts`, que solo se ejecuta en el servidor.
- Dependencia `resend` en `package.json` y `package-lock.json`.
- Variables de entorno documentadas en `.env.template`, el archivo que ya existe en el repo.
- Enlace "Acerca de" en la barra global (`components/nav.tsx`), en escritorio y en el menú móvil, apuntando a `/acerca`.
- Bloque "ABOUT PAGE" de `references/resources/templates/home-about/styles.css` copiado al final de `app/globals.css`, junto con las clases base que falten.

**Fuera de alcance (para specs futuras):**

- Guardar los mensajes en base de datos o en `localStorage`. El mensaje existe solo como correo.
- Respuesta automática al remitente.
- Protección anti-spam (honeypot, CAPTCHA, límite por IP). Ver decisiones.
- Autenticación del formulario. Es público, como en el template.
- Cambiar el dominio remitente a uno propio. Se hace al verificar el dominio en Resend, sin cambiar código.
- Internacionalización. El texto queda en español, tal como está en el template.
- Cualquier otra página o funcionalidad del template no listada aquí.

---

## Modelo de datos

Este feature introduce un tipo para el mensaje. No introduce estado global ni persistencia.

```ts
// lib/contact.ts
type ContactMessage = { name: string; email: string; msg: string };
type ContactErrors = Partial<Record<keyof ContactMessage, string>>;

// Exports: validateContact(input: unknown): { ok: true; data: ContactMessage } | { ok: false; errors: ContactErrors }
// Límites: name 1–80 caracteres, email 3–254 caracteres con formato válido, msg 1–2000 caracteres.
// Todos los valores se recortan con trim() antes de validar.
```

```ts
// Respuesta de POST /api/contact
type ContactResponse =
  | { ok: true }
  | { ok: false; error: "invalid" | "send_failed"; errors?: ContactErrors };
```

Variables de entorno (`.env.local`, no se versionan):

- `RESEND_API_KEY`: obligatoria. Clave de Resend. Solo se lee en el servidor.
- `CONTACT_TO_EMAIL`: obligatoria. Destinatario de los mensajes.
- `RESEND_FROM`: opcional. Remitente. Si falta, usa `onboarding@resend.dev`.

Conventions:

- El correo se envía como texto plano (`text`), nunca como HTML. El contenido del usuario no se interpreta como markup.
- `replyTo` es el correo que escribió la persona, para responder con un clic.
- El asunto es `Contacto Arcade Vault: <name>`.

---

## Plan de implementación

1. **Dependencia y variables.** Instalar `resend` con `npm install resend`. Añadir a `.env.template` las variables `RESEND_API_KEY=XXXX`, `CONTACT_TO_EMAIL=XXXX` y `RESEND_FROM=XXXX`, con el marcador `XXXX` que ya usa el archivo. No crear un archivo nuevo. Verificación: `npm run build` pasa y `package.json` lista `resend`.
2. **Validación compartida.** Crear `lib/contact.ts` con `validateContact`. No importa nada de `react` ni de `resend`. Verificación: `npx tsc --noEmit` pasa.
3. **Envío de correo.** Crear `lib/send-contact-email.ts` con una función que recibe un `ContactMessage`, crea el cliente de Resend y envía el correo con `text`, `replyTo` y el asunto indicado. Lanza error si falta `RESEND_API_KEY` o `CONTACT_TO_EMAIL`. Verificación: `npx tsc --noEmit` pasa.
4. **Route handler.** Crear `app/api/contact/route.ts` con `POST`. Lee el JSON, llama a `validateContact` y responde 400 con `{ ok: false, error: "invalid", errors }` si falla. Si valida, llama a `sendContactEmail`: responde 200 con `{ ok: true }`, o 500 con `{ ok: false, error: "send_failed" }` si lanza error (el detalle va al log del servidor, no a la respuesta). Verificación: `npm run dev` y `curl -X POST localhost:3000/api/contact -H "Content-Type: application/json" -d "{}"` responde 400.
5. **Iconos de destacados.** Crear `components/about/highlight-icon.tsx` con los tres SVG de `HighlightIcon` del template (`HEART`, `BROWSER`, `PLANT`), sin cambiar sus rectángulos. Verificación: `npx tsc --noEmit` pasa.
6. **Componente de la página.** Crear `components/about/about-page.tsx` como cliente (`"use client"`). Reproduce el JSX de `About` del template con estas diferencias, y solo estas: el formulario hace `fetch` a `/api/contact` en lugar de cambiar `sent` en memoria, y el hook de revelado es `useReveal` de `components/home/use-reveal.ts`. Verificación: `npx tsc --noEmit` pasa.
7. **Ruta `/acerca`.** Crear `app/acerca/page.tsx` que renderiza `AboutPage`. Verificación: `npm run build` lista la ruta `/acerca` y `/acerca` responde 200.
8. **Estilos.** Copiar las reglas `.about*`, `.highlight*`, `.div-*`, `.contact-*`, `.terminal-*`, `.term-*`, `.kicker`, `.caret` y el keyframe `shake` de `styles.css` al final de `app/globals.css`, en un bloque `/* ===== ABOUT PAGE ===== */`. No duplicar clases que ya existan (`.btn`, `.field`, `.reveal`, `.pixel`). Verificación: `/acerca` se ve igual que el template a 1280 px.
9. **Barra global.** En `components/nav.tsx`, añadir "Acerca de" con `href="/acerca"` después de "Salón de la Fama", en `.links` y en `.av-mobile-panel`. Activo cuando `pathname === "/acerca"`. Verificación: en `/acerca` está activo "Acerca de" y en `/` no lo está.
10. **Pulido responsivo.** Revisar `/acerca` a 375 px. Verificación: sin scroll horizontal a 375 px.

Cada paso deja la aplicación construible. El último paso no es "probar todo"; esa verificación está en los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores y lista `/acerca` y `/api/contact`.
- [ ] `npm run lint` termina sin errores.
- [ ] `npx tsc --noEmit` termina sin errores.
- [ ] `/acerca` responde con HTTP 200 y muestra "ACERCA DE ARCADE VAULT".
- [ ] `/acerca` muestra tres destacados con los textos "HECHO CON ❤️ PARA JUGADORES", "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR" y "PROYECTO EN CONSTANTE CRECIMIENTO".
- [ ] La sección "CONTÁCTANOS" muestra los tres campos "NOMBRE", "CORREO ELECTRÓNICO" y "MENSAJE", y el botón "▶  ENVIAR MENSAJE".
- [ ] Enviar el formulario con algún campo vacío no hace ninguna petición de red y sacude el formulario (clase `shake` durante 400 ms).
- [ ] Un correo con formato inválido (por ejemplo "abc") no hace petición de red y sacude el formulario.
- [ ] Mientras la petición está en curso, el botón está deshabilitado y no se puede enviar dos veces.
- [ ] Un envío exitoso muestra el bloque de terminal con "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, <NOMBRE EN MAYÚSCULAS>." y el botón "ENVIAR OTRO MENSAJE".
- [ ] "ENVIAR OTRO MENSAJE" vuelve al formulario vacío.
- [ ] `POST /api/contact` con cuerpo `{}` responde HTTP 400 y `error: "invalid"`.
- [ ] `POST /api/contact` con datos válidos y `RESEND_API_KEY` real responde HTTP 200, y el correo llega a `CONTACT_TO_EMAIL` con `replyTo` igual al correo escrito.
- [ ] `POST /api/contact` con datos válidos y sin `RESEND_API_KEY` responde HTTP 500 con `error: "send_failed"`, y la respuesta no contiene la clave ni el mensaje de error interno.
- [ ] Si el envío falla en la página, se muestra un bloque de terminal con una línea "[ERROR]" y el botón "REINTENTAR". Los datos del formulario se conservan.
- [ ] "REINTENTAR" vuelve al formulario con los datos escritos.
- [ ] La barra marca "Acerca de" como activo en `/acerca`, y el enlace aparece también en el menú móvil.
- [ ] Con `prefers-reduced-motion: reduce`, las secciones `.reveal` aparecen sin transición.
- [ ] A 375 px de ancho no hay scroll horizontal en `/acerca`.
- [ ] `lib/contact.ts` no importa nada de `react` ni de `resend`.
- [ ] `lib/send-contact-email.ts` es el único archivo que importa `resend`.
- [ ] Ninguna clave aparece en el código fuera de `process.env`, y `.env.local` está en `.gitignore`.
- [ ] Ningún archivo fuera de `app/`, `components/`, `lib/`, `specs/`, `.env.template` y `package.json`/`package-lock.json` cambia.

---

## Decisiones tomadas y descartadas

- **Sí: ruta `/acerca`.** Es la ruta que SPEC 02 reservó para esta página. Coincide con el texto "Acerca" del template.
- **Sí: enlace "Acerca de" en la barra.** Cierra el pendiente de SPEC 02. Va después de "Salón de la Fama", igual que en el template.
- **Sí: route handler `POST /api/contact`.** Devuelve códigos HTTP claros y se puede probar con `curl`. Una Server Action oculta el error en un objeto de acción.
- **No: clave de Resend en el cliente.** Se lee solo en el servidor. Así la clave nunca llega al navegador.
- **Sí: `CONTACT_TO_EMAIL` por variable de entorno.** Cambiar el destinatario no requiere editar código ni publicar un cambio.
- **No: destinatario fijo en el código.** Obliga a editar fuente para cambiar el correo de contacto.
- **Sí: remitente `onboarding@resend.dev` por defecto, sobrescribible con `RESEND_FROM`.** Es el remitente de prueba de Resend y no requiere verificar dominio. Para producción se configura `RESEND_FROM` con un dominio verificado.
- **No: correo personal como destino fijo.** Mezcla datos personales con código. El valor real va solo en `CONTACT_TO_EMAIL` dentro de `.env.local`.
- **Sí: validación de formato de correo en cliente y servidor.** Usa la misma función `validateContact`, para que las reglas no diverjan. El template solo revisa campos vacíos, pero un correo inválido no sirve para responder.
- **Sí: límites de longitud (80, 254 y 2000 caracteres).** Evitan mensajes de tamaño arbitrario. Los valores son decisión de esta spec; el template no los define.
- **Sí: el estado de error reutiliza la terminal del template.** Mantiene el estilo visual sin inventar un componente nuevo. La línea "[ERROR]" y el botón "REINTENTAR" son texto nuevo, en el mismo tono.
- **Sí: el formulario conserva los datos tras un error.** Evita que la persona vuelva a escribir el mensaje.
- **Sí: correo en texto plano.** Evita inyección de HTML desde el formulario.
- **No: honeypot ni CAPTCHA en esta spec.** Añade fricción o campos ocultos que requieren decisión propia. Se anota en riesgos y va en su spec.
- **Sí: estilos en `app/globals.css`.** Es el mismo criterio de SPEC 02 para el home. Evita un segundo sistema de estilos.
- **Sí: `useReveal` existente.** Ya implementa el mismo `IntersectionObserver` del template. No se duplica la lógica.
- **Sí: copiar el JSX del template sin rediseño.** `CLAUDE.md` pide `frontend-design` para UI nueva. Aquí no hay UI nueva: el diseño ya viene del template, así que no aplica.
- **Sí: variables documentadas en `.env.template`.** Es el archivo de variables que ya existe en el repo. Documenta las variables necesarias sin exponer valores. No se crea ningún archivo nuevo fuera de `app/`, `components/` y `lib/`.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Con `onboarding@resend.dev` Resend solo entrega al correo dueño de la cuenta. Un mensaje a otro destinatario falla en silencio para la persona. | En desarrollo, `CONTACT_TO_EMAIL` debe ser el correo de la cuenta de Resend. Para producción, `RESEND_FROM` con dominio verificado. Se documenta en `.env.template`. |
| Sin protección anti-spam, el formulario público recibe bots. | Aceptado para este MVP. Límites de longitud reducen el daño. Va en spec propia si el volumen lo exige. |
| La clave `RESEND_API_KEY` se filtra si alguien la importa en un componente cliente. | Solo `lib/send-contact-email.ts` y el route handler la usan. Ningún componente cliente importa esos archivos. |
| `.reveal` empieza en `opacity: 0`. Sin JavaScript, las secciones no se ven. | Mismo riesgo aceptado en SPEC 02. El hero y la barra no dependen del revelado. |
| El texto "[ERROR]" y "REINTENTAR" no están en el template. | Decisión documentada arriba. Si el diseño cambia, se ajusta en `about-page.tsx` sin cambiar la lógica. |

---

## Lo que **no** está en esta spec

- Guardado de mensajes en base de datos o en el navegador.
- Respuesta automática al remitente.
- Honeypot, CAPTCHA o límite por IP.
- Dominio propio de envío configurado en Resend (solo la variable `RESEND_FROM`).
- Cambios en las páginas de SPEC 01 y SPEC 02, salvo el enlace de la barra.
