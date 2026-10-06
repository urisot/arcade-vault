# SPEC 05 — Asteroides jugable en el reproductor

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02, SPEC 04
> **Fecha:** 2026-10-05
> **Objetivo:** Portar el juego Asteroids de `references/started-games/02-asteroids/` a un componente React jugable en `/juegos/asteroides/jugar`, con la puntuación guardada en Supabase al terminar la partida.

---

## Alcance

**Dentro:**

- Motor de juego puro en `lib/games/asteroids/engine.ts`: nave, asteroides en tres tamaños, balas, partículas, vidas con invencibilidad, niveles y power-ups de `game.js`. Sin React ni DOM.
- Render en `lib/games/asteroids/render.ts`: dibuja el estado en un `CanvasRenderingContext2D`. Mismo estilo visual que el original (trazos blancos sobre fondo negro).
- Componente cliente `components/player/asteroids-canvas.tsx`: es el dueño del juego. Contiene el canvas 800×600 y todo el estado de partida dentro de `useRef`. Corre el bucle con `requestAnimationFrame`, lee el teclado y notifica a React con `onChange` cuando cambian la puntuación, las vidas, el nivel o el estado. Ningún estado de partida vive en React.
- Integración en `components/player/game-player.tsx` (la página `/juegos/[id]/jugar` del juego `asteroides`): el reproductor renderiza `AsteroidsCanvas` y, por fuera del canvas, muestra el HUD con el nombre del jugador, la puntuación, las vidas y el nivel que recibe por `onChange`. Los botones PAUSA, FIN y SALIR del reproductor controlan el juego por props: el reproductor no toca el estado de partida. Los demás juegos conservan el HUD actual sin cambios.
- Guardado: al terminar la partida (game over o botón FIN), el reproductor envía la puntuación con el `POST /api/scores` de SPEC 04.
- Migración `supabase/migrations/20261005130000_asteroides.sql`: renombra el juego `rocas` a `asteroides` y mueve sus puntuaciones.
- Reglas CSS mínimas para el canvas en `app/globals.css`.

**Fuera de alcance (para specs futuras):**

- Audio (música y efectos).
- Tecla de pausa (P o Esc). La pausa es solo el botón PAUSA del HUD.
- Pausa automática al perder el foco de la ventana.
- Puntuación en tiempo real en el Salón. Sigue el caché de 60 s de SPEC 04.
- Redirección de `/juegos/rocas/jugar` a la nueva ruta.
- Portar los otros juegos de `references/started-games/` (03-tetris, 04-arkanoid) o los 7 juegos restantes del catálogo.
- Cambios en `references/started-games/02-asteroids/`. Es la fuente de referencia y no se toca.
- Rediseño visual. El canvas copia el aspecto del original.
- Anti-trampas y validación de la puntuación según la jugada. Ver SPEC 04.
- Ranking por nivel o tiempo de partida.

---

## Modelo de datos

Este feature introduce estado de partida en memoria. No introduce persistencia nueva. La tabla `scores` se reutiliza de SPEC 04. Cambia una fila de `games` y las filas de `scores` de ese juego.

```ts
// lib/games/asteroids/engine.ts
type Input = { left: boolean; right: boolean; thrust: boolean; fire: boolean }; // fire = pulsación de un frame

type GameStatus = "playing" | "dead" | "gameover";

type GameState = {
  status: GameStatus;
  score: number;          // puntos acumulados; es el valor que se guarda
  lives: number;          // 3 al empezar
  level: number;          // 1 al empezar
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  particles: Particle[];
  powerups: PowerupDrop[];
  deadTimer: number;      // segundos de espera tras morir
  invulnerable: number;   // segundos de invencibilidad restantes
};

// Exports: createGame(): GameState
// Exports: step(state: GameState, input: Input, dt: number): GameState
// dt se limita a 0.05 s, como en game.js, para evitar saltos al volver de otra pestaña.
```

Constantes de `game.js` que se conservan con los mismos valores: `RADII = [0, 16, 30, 50]`, `SPEEDS = [0, 85, 55, 32]`, `POINTS = [0, 100, 50, 20]` (indexado por tamaño 1 a 3), `POWERUP_DROP_CHANCE = 0.15`, `POWERUP_DURATION = 5`, `POWERUP_TTL = 12`, `TRIPLE_SPREAD = 0.18`. Canvas 800×600, toroidal.

```ts
// Props de AsteroidsCanvas: comandos de React hacia el juego
type AsteroidsCanvasProps = {
  paused: boolean;             // PAUSA/REANUDAR del reproductor. Congela el bucle sin reiniciar nada.
  endRequest: number;          // FIN incrementa este contador. El juego pasa a "gameover" al verlo cambiar.
  restartRequest: number;      // JUGAR DE NUEVO incrementa este contador. El juego reinicia con createGame().
  onChange: (s: GameSnapshot) => void; // notifica a React solo cuando cambia un valor
};

// Snapshot que el juego envía a React. Solo datos, sin referencias al canvas.
type GameSnapshot = { score: number; lives: number; level: number; status: GameStatus };
```

Control del juego:

- Pausa, FIN y reinicio no son props de estado de partida. Son comandos. El reproductor guarda `paused` y contadores `endRequest` y `restartRequest`. El canvas los lee y actúa sobre su propio estado.
- SALIR es un `Link` a `/juegos/[id]`. Al desmontar, el cleanup del efecto cancela el bucle. No hay comando de salida.
- `onChange` se llama solo cuando cambia `score`, `lives`, `level` o `status`. Nunca en cada frame.
- El estado de game over lo decide el juego: vidas en cero o FIN. El reproductor abre el modal cuando recibe `status: "gameover"` en `onChange`.

Conventions:

- `engine.ts` no importa `react`, `next` ni nada del DOM. `render.ts` recibe el contexto como argumento y no crea elementos.
- El estado del juego vive en un `useRef` dentro de `AsteroidsCanvas`, no en `useState` ni en el reproductor. Así el bucle no re-renderiza React por frame.
- El guardado usa el `score` del último `onChange`. La puntuación final se toma al terminar y no se recalcula.

Migración (nombre del archivo y SQL; el orden importa porque `scores.game_id` tiene clave foránea):

```sql
-- supabase/migrations/20261005130000_asteroides.sql
alter table public.scores drop constraint scores_game_id_fkey;
update public.games set id = 'asteroides', title = 'ASTEROIDES' where id = 'rocas';
update public.scores set game_id = 'asteroides' where game_id = 'rocas';
alter table public.scores add constraint scores_game_id_fkey
  foreign key (game_id) references public.games(id) on delete cascade;
```

`short`, `long`, `cover` (`cover-rocas`), `color`, `best` y `plays` de la fila se conservan.

---

## Plan de implementación

1. **Motor puro.** Crear `lib/games/asteroids/engine.ts` con `createGame` y `step`, portando `Bullet`, `Asteroid`, `Ship`, `Particle` y los power-ups de `game.js`. Sin input ni render. Verificación: `npx tsc --noEmit` pasa; `grep` de `react` y `document` en el archivo no devuelve resultados.
2. **Render.** Crear `lib/games/asteroids/render.ts` con `draw(ctx, state)`, copiando el trazado de `draw()` de cada clase de `game.js`. Verificación: `npx tsc --noEmit` pasa.
3. **Canvas y bucle.** Crear `components/player/asteroids-canvas.tsx` como cliente. Contiene el `<canvas>` 800×600 y el estado en `useRef`. Lee el teclado (`keydown`/`keyup` en `window`, con `preventDefault` en flechas y espacio, y limpieza de teclas en `blur`), corre el bucle con `requestAnimationFrame` y lo cancela en el cleanup. Aplica `paused`, `endRequest` y `restartRequest` desde props. Llama `onChange` al cambiar un valor. Verificación: `npx tsc --noEmit` y `npm run build` pasan. Con un reproductor de prueba que solo muestre `onChange`, la nave se mueve dentro del canvas.
4. **Conexión al reproductor.** En `components/player/game-player.tsx`, si `game.id === "asteroides"`, renderizar `AsteroidsCanvas` en lugar del placeholder. Guardar en estado de React solo el `GameSnapshot` que llega por `onChange`, y mostrar nombre, puntuación, vidas y nivel. PAUSA alterna `paused`. FIN incrementa `endRequest`. JUGAR DE NUEVO incrementa `restartRequest`. SALIR es el `Link` existente. Verificación en `npm run dev`: la nave no sale del canvas, PAUSA congela el juego, FIN abre el modal, SALIR detiene el bucle.
5. **Guardado.** En `game-player.tsx`, `save` envía `snapshot.score` del último `onChange`, no el `0` fijo de hoy. El resto del flujo (GUARDAR, REINTENTAR, mensaje de éxito) queda igual. Verificación: al guardar, `scores` tiene una fila con `game_id = 'asteroides'` y el `score` del HUD.
6. **Migración y catálogo.** Crear `supabase/migrations/20261005130000_asteroides.sql` y aplicarla con `apply_migration`. Verificación: `list_tables` muestra `games` con 8 filas y ninguna con `id = 'rocas'`; `scores` no tiene filas con `game_id = 'rocas'`.
7. **Estilos del canvas.** Añadir en `app/globals.css` una regla para `.asteroids-canvas` con `width: 100%` y `height: auto`. Sin `max-width`: la pantalla CRT (`.crt-screen`) es más ancha que 800 px en escritorio y el canvas debe llenarla sin franjas vacías. Verificación: a 375 px el canvas cabe sin scroll horizontal; en escritorio no queda espacio negro vacío a la derecha de la pantalla.
8. **Verificación final.** Ejecutar `npm run build`, `npm run lint` y `npx tsc --noEmit`. Revisar en `npm run dev` las rutas de los criterios.

Cada paso deja la aplicación construible. El paso 4 es el primero en que el juego se ve. El paso 6 cambia datos y se hace después de que el juego funcione en local. El último paso no es "probar todo"; esa verificación está en los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npx tsc --noEmit` termina sin errores.
- [ ] `/juegos/asteroides/jugar` responde HTTP 200 y muestra el título "ASTEROIDES" en el HUD.
- [ ] `/juegos/rocas/jugar` responde HTTP 404.
- [ ] `/games` muestra 8 juegos, y uno de ellos se llama "ASTEROIDES".
- [ ] `←` y `→` rotan la nave. `↑` la propulsa. `Espacio` dispara.
- [ ] Mantener `Espacio` pulsado dispara una sola bala por pulsación, no una ráfaga.
- [ ] Las teclas de flecha y `Espacio` no desplazan la página.
- [ ] Un asteroide grande, al ser destruido, se parte en dos medianos. Un mediano se parte en dos pequeños. Un pequeño desaparece.
- [ ] Destruir un asteroide suma 20 puntos (grande), 50 (mediano) o 100 (pequeño), como en el README del juego.
- [ ] Un choque con un asteroide resta una vida. La partida empieza con 3 vidas.
- [ ] Tras reaparecer, la nave parpadea y no recibe daño durante la invencibilidad.
- [ ] Al perder la tercera vida, el estado pasa a `gameover` y el modal de guardado se abre.
- [ ] PAUSA congela asteroides, balas y puntuación. REANUDAR continúa desde el mismo punto.
- [ ] FIN termina la partida y abre el modal de guardado con la puntuación actual.
- [ ] El HUD fuera del canvas muestra el nombre del jugador, la puntuación, las vidas y el nivel que están en el juego, y se actualiza sin recargar.
- [ ] La nave, los asteroides y las balas nunca se dibujan fuera del canvas. Al cruzar un borde, reaparecen por el lado opuesto.
- [ ] El estado de la partida vive en el canvas. `grep` de `useState` en `asteroids-canvas.tsx` no devuelve estado de posiciones, balas ni asteroides.
- [ ] `onChange` no se llama en frames en los que no cambia puntuación, vidas, nivel o estado.
- [ ] JUGAR DE NUEVO reinicia la partida con 3 vidas, nivel 1 y puntuación 0, sin recargar la página.
- [ ] Un guardado exitoso crea una fila en `scores` con `game_id = 'asteroides'` y `score` igual a la puntuación del HUD.
- [ ] Si el guardado falla, el modal muestra el error y REINTENTAR envía el mismo `score`.
- [ ] Al cambiar la ventana de foco, las teclas quedan liberadas: la nave deja de girar o acelerar.
- [ ] Salir de `/juegos/asteroides/jugar` a otra ruta detiene el bucle. No hay errores en consola.
- [ ] Los juegos distintos de `asteroides` siguen mostrando el HUD placeholder sin cambios.
- [ ] `grep` de `react` y `document` en `lib/games/asteroids/` no devuelve resultados.
- [ ] En `scores`, no hay filas con `game_id = 'rocas'`, y la clave foránea `scores_game_id_fkey` sigue existiendo con `on delete cascade`.
- [ ] `get_advisors` no reporta tablas sin RLS.
- [ ] A 375 px de ancho, `/juegos/asteroides/jugar` no tiene scroll horizontal.
- [ ] Ningún archivo fuera de `lib/games/asteroids/`, `components/player/`, `supabase/migrations/`, `app/globals.css` y `specs/` cambia.
- [ ] `references/started-games/02-asteroids/` no cambia.

---

## Decisiones tomadas y descartadas

- **Sí: componente React, no iframe ni script vanilla.** El HUD, el modal y el guardado ya son React. Descartado el iframe: obliga a `postMessage` y duplica el HUD. Descartado cargar `game.js` tal cual: sus globals y su DOM chocan con React y con el modo estricto.
- **Sí: "Max.js" se toma como la plataforma Next.js de este repo.** El repo no contiene ninguna librería llamada Max.js. Si se refería a otra cosa, esta spec se revisa antes de aprobarla.
- **Sí: motor puro en `lib/games/asteroids/`.** Sin React ni DOM, la lógica se puede revisar con `tsc` y leer sin un navegador. Descartado: lógica dentro del componente, porque mezcla el bucle con las reglas.
- **Sí: estado en `useRef` dentro de `AsteroidsCanvas` y `onChange` solo al cambiar.** El juego es dueño de su estado y React solo recibe snapshots. Evita que React re-renderice 60 veces por segundo. Descartado `useState` por frame y descartado que el reproductor guarde posiciones.
- **Sí: controles externos por comandos (`paused`, `endRequest`, `restartRequest`).** PAUSA, FIN y JUGAR DE NUEVO no tocan estado de partida desde React. Descartado `useImperativeHandle`: exige una ref y acopla el reproductor a métodos internos del canvas.
- **Sí: SALIR es navegación.** Desmontar el canvas detiene el bucle. No hace falta un comando de salida.
- **Sí: mecánicas completas de `game.js`, incluidos power-ups y niveles.** Así lo pediste. Se portan sin cambiar valores.
- **Sí: guardado al final de la partida.** Igual que el reproductor actual. Descartado guardar al morir: una fila por vida perdida, sin ventaja clara.
- **Sí: renombrar `rocas` a `asteroides`.** Lo elegiste sobre crear una fila nueva. Consecuencia: `/juegos/rocas/...` deja de existir y no hay redirección.
- **Sí: título "ASTEROIDES".** Coincide con el nombre del juego original. `short` y `long` se conservan de `rocas`.
- **Sí: `cover-rocas` y `color` se conservan.** Evita tocar la portada del catálogo. Si se quiere portada propia, es un cambio de CSS en una spec aparte.
- **No: fila duplicada `asteroides` junto a `rocas`.** Dos entradas casi iguales confunden a la persona en `/games`.
- **Sí: pausa solo por el botón PAUSA.** Usa el control que ya existe. Descartada la tecla P o Esc: es una decisión de controles nueva.
- **No: audio.** No es parte del original portado y añade archivos nuevos.
- **No: tocar `references/`.** Es la fuente de referencia. El código nuevo vive en `lib/` y `components/`.
- **Sí: canvas con el aspecto del original.** `CLAUDE.md` pide `frontend-design` para UI nueva. Aquí no hay UI nueva: el canvas copia el original, así que no aplica.
- **Sí: canvas fijo 800×600 escalado con CSS.** Mantiene la física del original. Descartado un canvas que se adapte al ancho: cambiaría las distancias de colisión.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Una tecla queda "pegada" si la ventana pierde el foco antes del `keyup`. | Limpiar `keys` en el evento `blur` de `window`. Criterio de foco en la lista. |
| El modo estricto de React monta el efecto dos veces y deja dos bucles activos. | El cleanup cancela el `requestAnimationFrame` pendiente. Criterio de salida de ruta. |
| La migración falla si `scores` tiene filas con `rocas` y la clave foránea no se quita antes del renombrado. | El SQL quita la clave, renombra, mueve las filas y la vuelve a crear, en ese orden. Revisar antes de `apply_migration`. |
| Si el proyecto de Supabase es de producción, renombrar afecta datos reales. | Revisar el SQL antes de aplicar. Si hay duda, probar primero con `create_branch`. |
| Enlaces o marcadores a `/juegos/rocas` dejan de funcionar. | Aceptado: sin redirección. Buscar referencias a `rocas` en `app/` y `components/` antes de cerrar el paso 6. |
| El HUD se re-renderiza demasiado si `onStatus` se llama en cada frame. | Llamarlo solo cuando cambia un valor. Criterio de HUD. |
| No hay test runner, así que la lógica del motor no tiene pruebas automáticas. | La verificación es manual en `npm run dev` y con `tsc`. Si la lógica crece, una spec propia añade tests. |

---

## Lo que **no** está en esta spec

- Audio.
- Tecla de pausa y pausa automática al perder el foco.
- Redirección de `/juegos/rocas`.
- Portar 03-tetris, 04-arkanoid o los 7 juegos restantes del catálogo.
- Cambios en `references/started-games/02-asteroids/`.
- Rediseño visual del canvas o de la portada.
- Ranking por nivel o tiempo, y puntuación en tiempo real en el Salón.
- Anti-trampas y validación de la puntuación según la jugada.
