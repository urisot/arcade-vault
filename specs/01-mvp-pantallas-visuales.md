# SPEC 01 — MVP de pantallas visuales de Arcade Vault

> **Estado:** implementado
> **Depende de:** ninguna
> **Fecha:** 2026-10-03
> **Objetivo:** Construir en Next.js las pantallas del template de Arcade Vault como parte visual, sin lógica de juego.

---

## Alcance

**Dentro:**

- Navegación global (barra superior, enlaces, botón de sesión, menú móvil) y pie de página.
- Pantalla de biblioteca en `/`: cabecera, buscador, filtros por categoría, cuadrícula de juegos y estado vacío.
- Pantalla de detalle en `/juegos/[id]`: portada, etiquetas, estadísticas, botones de acción y tabla de mejores puntuaciones.
- Pantalla de reproductor en `/juegos/[id]/jugar`: HUD, marco CRT con arena vacía, estado de pausa y modal de fin de partida con guardado de puntuación.
- Pantalla de acceso en `/login`: pestañas "Iniciar sesión" y "Crear cuenta", formulario, invitado y botones sociales visuales.
- Pantalla de Salón de la Fama en `/salon`: selector por juego, podio, tabla de 12 filas y fila "tu mejor marca" cuando hay sesión.
- Estilos del template (`styles.css`) portados al proyecto, con las mismas variables CSS, fuentes y capas de fondo.
- Datos de muestra del template (`data.jsx`) como módulo TypeScript.
- Sesión simulada y puntuaciones guardadas en `localStorage`, con las mismas claves del template (`av_user`, `av_scores`).

**Fuera de alcance (para specs futuras):**

- Cualquier juego: física, colisiones, entrada de teclado o táctil, enemigos, niveles, marcador real.
- Modo "Duelo Pixel" contra CPU o a dos jugadores.
- Autenticación real, contraseñas, backend, base de datos y OAuth con Google o GitHub. Los botones sociales son solo visuales.
- Mostrar en el Salón o en el detalle las puntuaciones guardadas en `av_scores`. En este MVP esas tablas siguen usando datos de muestra.
- Sistema de créditos. El contador "CRÉDITOS · 03" es estático.
- Internacionalización. La interfaz queda en español, tal como está en el template.
- Pruebas automatizadas. El proyecto no tiene runner configurado.

---

## Modelo de datos

Estructuras existentes en el template, pasadas a TypeScript sin cambiar sus campos.

```ts
// lib/data/games.ts
type Game = {
  id: string;        // "bloque-buster", slug de la ruta
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;     // clase CSS de portada, p. ej. "cover-bricks"
  color: "cyan" | "magenta" | "green" | "yellow";
  best: number;
  plays: string;     // "12.4K", texto tal cual
};

// lib/data/scores.ts
type ScoreRow = { rank: number; name: string; score: number; date: string };
// date con formato "dd/mm/2026"

// Sesión (localStorage, clave "av_user")
type SessionUser = { name: string };  // name en mayúsculas, máx. 10 caracteres

// Puntuación guardada (localStorage, clave "av_scores", array)
type SavedScore = { game: string; score: number; name: string; at: number };
```

Constantes: `GAMES` (8 juegos), `CATS` (`["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]`), `PLAYERS` (18 nombres) y la función `seededScores(seed, count)`, que es determinista.

Las claves de `localStorage` se leen y escriben solo en el cliente, dentro de `try/catch`.

---

## Plan de implementación

1. **Estilos y fuentes.** Copiar `styles.css` a `app/globals.css` y usar `next/font/google` para Press Start 2P, Courier Prime y JetBrains Mono. Añadir en `app/layout.tsx` las capas `av-bg` y `av-noise`. Verificación: `npm run build` pasa y la página en blanco muestra el fondo del template.
2. **Datos.** Crear `lib/data/games.ts` y `lib/data/scores.ts` con el contenido de `data.jsx`. Verificación: `npx tsc --noEmit` pasa.
3. **Shell global.** Crear `components/nav.tsx` (cliente) y el pie de página en el layout. Incluir un hook `useSessionUser` que lee `av_user` en `useEffect`, nunca en el inicializador de estado. Verificación: la barra aparece en todas las rutas, el enlace activo cambia y el menú móvil abre y cierra.
4. **Biblioteca.** Crear `app/page.tsx` con `components/library/` (buscador, chips y tarjetas con inclinación 3D). El filtrado vive en un componente cliente. Verificación: buscar "bloque" muestra solo BLOQUE BUSTER; elegir "SHOOTER" muestra INVASORES y ROCAS; sin resultados aparece "NO HAY RESULTADOS".
5. **Detalle.** Crear `app/juegos/[id]/page.tsx`. Hacer `await params`, llamar a `notFound()` si el id no existe y renderizar la tabla de 10 filas. Verificación: `/juegos/caida` muestra CAÍDA; `/juegos/no-existe` muestra la página 404 de Next.
6. **Acceso.** Crear `app/login/page.tsx` con las pestañas, el formulario y el botón de invitado. Al enviar, guardar `av_user` y volver a `/`. Verificación: tras entrar, el botón de la barra muestra el nombre en mayúsculas; al pulsarlo se cierra la sesión.
7. **Reproductor.** Crear `app/juegos/[id]/jugar/page.tsx` con HUD estático, marco CRT, arena vacía, botón PAUSA con su overlay y modal FIN. Guardar en `av_scores` al pulsar GUARDAR PUNTUACIÓN. Verificación: el modal aparece con FIN; guardar añade una entrada con `game`, `score`, `name` y `at` en `av_scores`; JUGAR DE NUEVO reinicia el modal.
8. **Salón.** Crear `app/salon/page.tsx` con selector de juego, podio, tabla y fila de usuario si hay sesión. Verificación: cambiar de pestaña cambia el podio y la tabla; con sesión aparece la fila amarilla "TU MEJOR MARCA".
9. **Pulido responsivo.** Revisar las cinco pantallas a 1280 px y 375 px contra `Arcade Vault.html` abierto en el navegador. Verificación: sin scroll horizontal a 375 px y sin diferencias visibles de layout.

Cada paso deja la aplicación construible. El último paso no es "probar todo"; esa verificación está en los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npx tsc --noEmit` termina sin errores.
- [ ] Las rutas `/`, `/juegos/bloque-buster`, `/juegos/bloque-buster/jugar`, `/login` y `/salon` responden con HTTP 200.
- [ ] `/juegos/no-existe` responde con la página 404.
- [ ] La URL usa rutas reales (`/juegos/...`). No aparece ningún `#` con JSON.
- [ ] La búsqueda no distingue mayúsculas y filtra por título.
- [ ] Elegir una categoría muestra solo los juegos de esa categoría. "TODOS" los muestra todos.
- [ ] Sin resultados, aparece "NO HAY RESULTADOS" y el texto "Intenta otra búsqueda o categoría.".
- [ ] El botón JUGAR de una tarjeta lleva a `/juegos/[id]` y no a la pantalla de jugar.
- [ ] JUGAR AHORA en el detalle lleva a `/juegos/[id]/jugar`.
- [ ] Tras iniciar sesión, `localStorage["av_user"]` contiene `{"name": "<USUARIO EN MAYÚSCULAS>"}`.
- [ ] Recargar la página con sesión iniciada mantiene el nombre en la barra.
- [ ] Como invitado, `av_user` no existe y la barra muestra "Iniciar Sesión".
- [ ] El campo de iniciales acepta como máximo 10 caracteres y los convierte a mayúsculas.
- [ ] GUARDAR PUNTUACIÓN añade exactamente una entrada a `av_scores` y muestra "PUNTUACIÓN GUARDADA_".
- [ ] PAUSA muestra el overlay "EN PAUSA" y REANUDAR lo quita.
- [ ] En el Salón, la fila "TU MEJOR MARCA" aparece solo con sesión iniciada.
- [ ] El menú móvil se abre con el botón ≡ y se cierra al pulsar un enlace o el fondo.
- [ ] A 375 px de ancho no hay scroll horizontal en ninguna de las cinco pantallas.
- [ ] No hay ninguna lógica de juego: la arena no tiene entrada de teclado y el marcador no cambia solo.
- [ ] Ningún archivo fuera de `app/`, `components/`, `lib/` y `public/` cambia, salvo `package.json` si hace falta añadir dependencias.

---

## Decisiones tomadas y descartadas

- **Sí: Next.js App Router con componentes TSX.** Coincide con `CLAUDE.md`. El template usa React por CDN con Babel en el navegador, y eso no sirve para la siguiente fase.
- **No: HTML estático separado.** Obligaría a rehacerlo al pasar a la lógica real.
- **Sí: rutas reales de Next.** Permiten enlaces compartibles y evitan el routing por hash del template.
- **No: routing por hash.** Es un atajo del template y no lo espera Next.
- **Sí: localStorage simulado con las claves del template.** Permite que la sesión y las puntuaciones sobrevivan a una recarga sin backend.
- **No: sin persistencia.** Dejaría el flujo de login y guardado sin verificación posible.
- **Sí: arena vacía con HUD estático en `/jugar`.** Respeta "no hay que implementar ningún juego".
- **No: marcador animado del template.** El `setInterval` que suma puntos al azar es simulación de juego.
- **Sí: el template es la referencia de diseño.** Se conserva su aspecto y no se rediseña con `frontend-design`. Lo que sí se aplica es la regla de `CLAUDE.md` de usar esa skill cuando haya UI nueva fuera del template.
- **Sí: textos de interfaz en español, tal como están en el template.** `CLAUDE.md` indica que el texto visible va en el idioma del contenido existente. El template es español y el README también, aunque el scaffold tenga textos en inglés.
- **Sí: `next/font/google` en lugar de los `<link>` del template.** Es la forma recomendada en Next y evita un FOUT innecesario.
- **Sí: `styles.css` portado sin reescribir a Tailwind.** Mantiene la paridad visual con el template con el menor riesgo.
- **Sí: sesión y puntuaciones leídas tras montar el componente.** Leerlas en el inicializador de estado produce discrepancias de hidratación entre servidor y cliente.
- **Sí: Salón y detalle con datos de muestra (`seededScores`).** Las puntuaciones guardadas en `av_scores` no se muestran aún. Mostrarlas es trabajo de una spec posterior.
- **Sí: HUD del reproductor con puntuación 0.** Como no hay juego, FIN muestra 0 y guardar 0 es válido. Esto es consecuencia de la decisión de arena vacía.
- **No: botones de Google y GitHub funcionales.** Son visuales, sin acción, igual que en el template.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| El template usa React 18 global y el proyecto usa React 19. | Revisar la documentación de Next 16 en `node_modules/next/dist/docs/` antes de escribir código (lo exige `AGENTS.md`). Probar la build tras cada paso. |
| Discrepancias de hidratación al leer `localStorage` durante el render. | Leer `av_user` y `av_scores` solo en `useEffect`. Mostrar el estado de invitado hasta que el efecto corra. |
| En Next 16, `params` es asíncrono. | Usar `await params` en las páginas dinámicas. |
| `toLocaleString("es-ES")` puede dar resultados distintos en servidor y cliente. | Formatear números solo en componentes cliente cuando la diferencia sea visible, o confirmar que el servidor usa ICU completo. |
| Se pierde el aspecto del template al migrar el CSS. | Comparar contra `Arcade Vault.html` en el paso 9. |

---

## Lo que **no** está en esta spec

- Lógica de juego de ningún tipo.
- Autenticación real, backend y OAuth.
- Mostrar `av_scores` en el Salón o en el detalle.
- Modo Duelo Pixel y multijugador.
- Sistema de créditos.
- Internacionalización.
