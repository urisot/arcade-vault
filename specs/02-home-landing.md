# SPEC 02 — Landing page de Arcade Vault en `/`

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-03
> **Objetivo:** Convertir `/` en la landing page del template y mover la biblioteca a `/games`.

---

## Alcance

**Dentro:**

- Reemplazar `app/page.tsx` por la landing del template (`home.jsx`): hero, "¿Por qué Arcade Vault?", juegos disponibles, estadísticas, actividad en vivo, precios y FAQ, y llamada final.
- Mover la pantalla de biblioteca de SPEC 01 de `/` a `/games`, sin cambios de contenido ni de comportamiento.
- Ajustar la barra global (`components/nav.tsx`): "Inicio" apunta a `/` y "Biblioteca" apunta a `/games`.
- Datos de muestra del home en `lib/data/home.ts`.
- Componentes de la landing en `components/home/`: siluetas decorativas, iconos de funciones, tarjeta mini y el hook de revelado al hacer scroll.
- Reglas CSS `prefers-reduced-motion` añadidas al final de la sección HOME de `app/globals.css`.

**Fuera de alcance (para specs futuras):**

- Página "Acerca de" (`/acerca`), su formulario de contacto y su enlace en la barra. Va en una spec propia.
- Cualquier juego, lógica de juego o llamada de red.
- Datos en vivo. "ACTIVIDAD EN VIVO", "TOP JUGADORES" y las estadísticas son datos de muestra fijos.
- Mostrar en el home las puntuaciones guardadas en `av_scores`.
- Autenticación real. Los botones de "Crear cuenta" y "Empezar gratis" solo navegan a `/login`.
- Mover las páginas de detalle y jugar a `/games/[id]`. Siguen en `/juegos/[id]`.
- Internacionalización. El texto queda en español, tal como está en el template.
- Cambiar el contador "CRÉDITOS · 03", que sigue estático.

---

## Modelo de datos

Este feature introduce datos de muestra del home. No introduce estado ni persistencia.

```ts
// lib/data/home.ts
type Feature = { icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET"; title: string; desc: string; color: "cyan" | "yellow" | "magenta" | "green" };
type Activity = { player: string; game: string; score: number; ago: string; color: "cyan" | "magenta" | "yellow" | "green" };
type TopPlayer = { rank: number; player: string; score: number };
type Stat = { value: string; unit: string; sub: string };
type Faq = { q: string; a: string };

// Exports: FEATURES (4), ACTIVITY (7), TOP_PLAYERS (5), STATS (3), FAQS (3),
// y la función formatScore(n: number): string
```

Conventions:

- `formatScore` inserta puntos como separador de miles ("184220" → "184.220") con una función propia. No usa `toLocaleString`. Así servidor y cliente producen el mismo texto y no hay discrepancia de hidratación.
- `GAMES` no cambia. El home toma sus primeros 6 elementos con `GAMES.slice(0, 6)`.
- `lib/data/home.ts` no importa React.

---

## Plan de implementación

1. **Biblioteca a `/games`.** Crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (los componentes de `components/library/`). No tocar `app/page.tsx` todavía. Verificación: `npm run build` pasa y `/games` responde 200 con el buscador, los chips y la cuadrícula.
2. **Datos del home.** Crear `lib/data/home.ts` con `FEATURES`, `ACTIVITY`, `TOP_PLAYERS`, `STATS`, `FAQS` y `formatScore`, copiando los textos de `home.jsx`. Verificación: `npx tsc --noEmit` pasa.
3. **Componentes del home.** Crear en `components/home/`: `silhouettes.tsx` (SVG inline de las 8 siluetas), `feature-icon.tsx` (4 iconos de 16×16 con `rect`), `mini-card.tsx` (enlace a `/juegos/[id]`) y `use-reveal.ts` (hook cliente con `IntersectionObserver` dentro de `useEffect`). Verificación: `npx tsc --noEmit` pasa; ningún componente se monta todavía.
4. **Landing en `/`.** Reemplazar `app/page.tsx` por la landing que compone los componentes de los pasos 2 y 3. Marcar como cliente el componente que usa el hook. Los CTA usan `next/link`: "EXPLORAR JUEGOS" y "VER TODOS LOS JUEGOS →" a `/games`; "CREAR CUENTA" y "EMPEZAR GRATIS →" a `/login`; "VER SALÓN →" a `/salon`; "INSERTAR MONEDA →" a `/games`. Verificación: `/` muestra el hero con "INSERTA UNA MONEDA" y cada CTA lleva a la ruta indicada.
5. **Barra global.** En `components/nav.tsx`, "Inicio" apunta a `/` y "Biblioteca" apunta a `/games`. El estado activo de "Biblioteca" se mantiene también en `/juegos/[id]` y `/juegos/[id]/jugar`. No añadir "Acerca de". Verificación: en `/` está activo "Inicio"; en `/games` y `/juegos/bloque-buster` está activo "Biblioteca"; el menú móvil muestra los mismos enlaces.
6. **Movimiento reducido.** Añadir al final de la sección HOME de `app/globals.css` un bloque `@media (prefers-reduced-motion: reduce)` que quite las animaciones de `.home-silos .silo`, `.hero-scroll .arrow`, `.btn.pulse` y `.tick-row`, y deje `.reveal` visible sin transición. Verificación: con el emulador de movimiento reducido activo, las siluetas no se mueven y las secciones aparecen sin transición.
7. **Pulido responsivo.** Revisar `/` a 1280 px y 375 px contra `references/resources/templates/home-about/arcade-vault-standalone.html` abierto en el navegador. Verificación: sin scroll horizontal a 375 px y sin diferencias visibles de layout en el hero, el rail y los precios.

Cada paso deja la aplicación construible. El último paso no es "probar todo"; esa verificación está en los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npx tsc --noEmit` termina sin errores.
- [ ] `/` responde con HTTP 200 y muestra "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA".
- [ ] `/games` responde con HTTP 200 y muestra el buscador, los chips y la cuadrícula de SPEC 01.
- [ ] `/` no muestra el buscador ni la cuadrícula de la biblioteca.
- [ ] "EXPLORAR JUEGOS" y "VER TODOS LOS JUEGOS →" llevan a `/games`.
- [ ] "CREAR CUENTA" y "EMPEZAR GRATIS →" llevan a `/login`.
- [ ] "VER SALÓN →" lleva a `/salon`.
- [ ] El rail "JUEGOS DISPONIBLES AHORA" muestra exactamente 6 tarjetas.
- [ ] Hacer clic en una tarjeta del rail lleva a `/juegos/[id]` de ese juego.
- [ ] La tabla "ÚLTIMAS PUNTUACIONES" muestra 7 filas y "TOP JUGADORES · HOY" muestra 5.
- [ ] Las puntuaciones se muestran con punto de miles: "NEONFOX" muestra "+184.220".
- [ ] La sección de precios muestra 1 tarjeta de plan y 3 preguntas en la FAQ.
- [ ] La barra marca "Inicio" como activo en `/`.
- [ ] La barra marca "Biblioteca" como activo en `/games` y en `/juegos/bloque-buster`.
- [ ] La barra no contiene ningún enlace "Acerca de".
- [ ] Al entrar en el viewport, una sección `.reveal` recibe la clase `in`.
- [ ] Con `prefers-reduced-motion: reduce`, las siluetas no se animan y las secciones aparecen sin transición.
- [ ] A 375 px de ancho no hay scroll horizontal en `/`.
- [ ] `lib/data/home.ts` no importa nada de `react`.
- [ ] No hay ningún formulario de contacto ni llamada de red en el home.
- [ ] Ningún archivo fuera de `app/`, `components/`, `lib/` y `specs/` cambia, salvo `package.json` si hace falta una dependencia.

---

## Decisiones tomadas y descartadas

- **Sí: `/` es la landing y la biblioteca vive en `/games`.** Lo pidió el usuario y así lo muestra el template. Cambia la ruta de la biblioteca de SPEC 01.
- **No: home en `/inicio`.** Obligaría a que la raíz siga siendo la biblioteca, contra la plantilla.
- **Sí: SPEC 01 queda como registro histórico.** Sus criterios que dicen "`/` es la biblioteca" se leen como `/games` a partir de esta spec. No se edita `specs/01-mvp-pantallas-visuales.md`.
- **No: mover el detalle a `/games/[id]`.** El usuario pidió `/games` solo para la biblioteca. Mantener `/juegos/[id]` evita tocar las páginas de SPEC 01. Si se quiere unificar, va en una spec propia.
- **Sí: datos del home en `lib/data/home.ts`.** Separa datos de UI y deja el componente solo con render. Es coherente con `lib/data/games.ts` de SPEC 01.
- **No: datos del home dentro del componente.** Mezcla datos con presentación y dificulta cambiarlos después.
- **Sí: `formatScore` propio en lugar de `toLocaleString("es-ES")`.** Evita discrepancias de hidratación entre servidor y cliente. Es el riesgo que SPEC 01 ya anotó para números.
- **Sí: `next/link` en lugar de `navigate()` del template.** Mantiene rutas reales, como en SPEC 01.
- **Sí: revelado al hacer scroll con `IntersectionObserver` dentro de `useEffect`.** Es la forma del template y no toca el render del servidor.
- **Sí: animaciones conservadas, con regla `prefers-reduced-motion`.** Mantiene la paridad visual y respeta a usuarios que piden menos movimiento.
- **No: quitar las siluetas o el ticker.** Son parte del look del template que SPEC 01 ya fijó como referencia.
- **No: página "Acerca de" ni su enlace en la barra.** Tiene formulario y contenido propios. Va en su spec.
- **No: contenido vivo.** El ticker y los rankings son datos fijos de muestra, como en el template.
- **Sí: el template es la referencia de diseño.** No se rediseña. `CLAUDE.md` pide usar `frontend-design` en UI nueva; aquí no hay UI nueva fuera del template, así que no aplica.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| `.reveal` empieza en `opacity: 0`. Si el JavaScript no corre, las secciones no se ven. | Aceptado para este MVP. El hero y la barra no dependen del revelado. Se revisa si el proyecto exige render sin JavaScript. |
| Los enlaces de la barra cambian de `/` a `/games`. Enlaces guardados a `/` ahora muestran la landing. | Es el cambio pedido. Se documenta en las decisiones y en el criterio de `/games`. |
| `/juegos/[id]` no sigue el patrón `/games/...`. | Decisión tomada: se mantiene `/juegos/[id]`. Ver decisiones. |
| Las siluetas usan `filter: drop-shadow` y animaciones continuas, costosas en móviles. | Regla `prefers-reduced-motion` en el paso 6. Revisión visual en el paso 7. |

---

## Lo que **no** está en esta spec

- Página "Acerca de" y formulario de contacto.
- Enlace "Acerca de" en la barra.
- Datos en vivo o conexión a backend.
- Mover las páginas de juego a `/games/[id]`.
- Cualquier lógica de juego.
- Mostrar `av_scores` en el home.
