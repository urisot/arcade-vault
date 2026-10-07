# SPEC 07 — Tetris jugable en el reproductor

> **Estado:** implementado
> **Depende de:** SPEC 04, SPEC 05, SPEC 06
> **Fecha:** 2026-10-06
> **Objetivo:** Portar el Tetris de `references/started-games/03-tetris/` a un componente React jugable en `/juegos/tetris/jugar`, con la puntuación guardada en Supabase al terminar la partida.

---

## Alcance

**Dentro:**

- Motor de juego puro en `lib/games/tetris/engine.ts`: tablero 10×20, ocho piezas (las siete estándar y la tuerca N de `game.js`), rotación con wall kicks, puntuación por líneas, soft drop y hard drop, niveles cada 10 líneas y fin de partida al aparecer una pieza sin hueco. Sin React ni DOM.
- Render en `lib/games/tetris/render.ts`: `drawBoard(ctx, state)` dibuja el tablero, la pieza fantasma y la pieza activa; `drawNext(ctx, state)` dibuja la siguiente pieza. Colores y alfas de `game.js`.
- Componente cliente `components/player/tetris-canvas.tsx`: dueño del juego. Contiene el canvas del tablero 300×600 y un panel lateral a su derecha, centrado dentro de `.crt-screen`. Estado de partida en `useRef`, bucle con `requestAnimationFrame`, `onChange` solo al cambiar un valor.
- Panel lateral de Tetris (dentro de `tetris-canvas.tsx`): PUNTUACIÓN, LÍNEAS y NIVEL con los valores del último `onChange`; SIGUIENTE con el canvas 120×120 de `drawNext`; CONTROLES con la lista de teclas que el juego usa (`←` `→` mover, `↑` o `X` rotar, `↓` bajar, `Espacio` caída). No hay tecla de pausa: la pausa es el botón PAUSA.
- `GameSnapshot` gana el campo opcional `lines`. Tetris lo envía; Asteroides no, y sigue igual.
- Tipos compartidos en `lib/games/types.ts` (`GameSnapshot`, `GameStatus`) y registro `id → superficie` en `lib/games/registry.ts`, con `asteroides` y `tetris`. Ver SPEC 05.
- Integración en `components/player/game-player.tsx`: el reproductor renderiza la superficie registrada para el juego. El HUD muestra la vida solo si la superficie lo indica (`showLives`). Asteroides mantiene su HUD; los demás juegos conservan el placeholder.
- Guardado: al terminar la partida (game over o FIN), `POST /api/scores` con `{ game: "tetris", name, score }` (SPEC 04).
- Migración `supabase/migrations/20261006120000_tetris.sql`: renombra el juego `caida` a `tetris` y mueve sus puntuaciones. Cambia el título a `TETRIS`.

**Fuera de alcance (para specs futuras):**

- Audio (música y efectos).
- Tecla de pausa (P). La pausa es solo el botón PAUSA del HUD, igual que en SPEC 05.
- Pausa automática al perder el foco de la ventana.
- Alternador de tema claro/oscuro del juego original. El tema lo decide la plataforma.
- Ranking por nivel, líneas o tiempo de partida.
- Anti-trampas y validación de la puntuación según la jugada. Ver SPEC 04.
- Cambios en `lib/scores-db.ts`, `lib/scores.ts`, `/salon` o `app/api/scores/`.
- Cambios en `lib/games/asteroids/` y en el comportamiento de `asteroides`.
- Cambios en `references/`.
- Portada nueva. Se reutiliza `cover-tetro`.

---

## Modelo de datos

Sin persistencia nueva. La tabla `scores` se reutiliza de SPEC 04. La migración cambia una fila de `games` y las filas de `scores` de ese juego.

```ts
// lib/games/tetris/engine.ts
type Input = {
  left: boolean;   // mantenido: mueve una columna por pulsación y repite cada 0.05 s
  right: boolean;  // mantenido: igual que left
  down: boolean;   // mantenido: soft drop, +1 por fila, repite cada 0.05 s
  rotate: boolean; // pulsación de un frame (flanco)
  drop: boolean;   // pulsación de un frame (flanco). Hard drop
};

type Piece = {
  type: number;       // 1–8, índice de COLORS
  shape: number[][];  // matriz cuadrada, 0 = vacío, >0 = color
  x: number;          // columna de la esquina superior izquierda de shape
  y: number;          // fila de la esquina superior izquierda de shape
};

type GameState = {
  status: GameStatus;   // "playing" | "gameover"
  score: number;        // puntos acumulados; es el valor que se guarda
  lives: 0;             // fijo en 0: Tetris no tiene vidas
  level: number;        // 1 al empezar
  lines: number;        // líneas eliminadas; no se muestra en el HUD (ver Alcance)
  board: number[][];    // 20 filas × 10 columnas, 0 = vacío
  current: Piece;
  next: Piece;
  dropTimer: number;    // segundos acumulados desde la última caída automática
  repeatTimer: number;  // segundos desde la última repetición de left, right o down
};

// Exports: createGame(): GameState
// Exports: step(state: GameState, input: Input, dt: number): GameState
// dt se limita a 0.05 s para evitar saltos al volver de otra pestaña.
```

```ts
// lib/games/types.ts (compartido)
export type GameStatus = "playing" | "dead" | "gameover";
export type GameSnapshot = { score: number; lives: number; level: number; status: GameStatus; lines?: number };
```

```ts
// lib/games/registry.ts
type Surface = {
  Canvas: ComponentType<CanvasProps>; // superficie del juego
  showLives: boolean;                 // el HUD muestra la vida solo si es true
};
export const SURFACES: Record<string, Surface> = {
  asteroides: { Canvas: AsteroidsCanvas, showLives: true },
  tetris: { Canvas: TetrisCanvas, showLives: false },
};
```

```ts
// Props de TetrisCanvas: comandos de React hacia el juego
type CanvasProps = {
  paused: boolean;             // PAUSA/REANUDAR. Congela el bucle sin reiniciar nada.
  endRequest: number;          // FIN incrementa este contador. El juego pasa a "gameover".
  restartRequest: number;      // JUGAR DE NUEVO incrementa este contador. Reinicia con createGame().
  onChange: (s: GameSnapshot) => void; // solo cuando cambia score, lives, level, lines o status
};
```

Migración (el orden importa porque `scores.game_id` tiene clave foránea):

```sql
-- supabase/migrations/20261006120000_tetris.sql
alter table public.scores drop constraint scores_game_id_fkey;
update public.games set id = 'tetris', title = 'TETRIS' where id = 'caida';
update public.scores set game_id = 'tetris' where game_id = 'caida';
alter table public.scores add constraint scores_game_id_fkey
  foreign key (game_id) references public.games(id) on delete cascade;
```

`short`, `long`, `cat` (`PUZZLE`), `cover` (`cover-tetro`), `color` (`magenta`), `best` y `plays` de la fila se conservan.

Porte de constantes y reglas (valor en `game.js` → valor portado):

| Concepto | `game.js` | Portado |
| --- | --- | --- |
| Tablero | `COLS = 10`, `ROWS = 20` | igual |
| Tamaño de celda | `BLOCK = 30` px | igual. Canvas 300×600 y 120×120 |
| Piezas | `randomPiece()`: tipo 1–8 uniforme (8 = tuerca N) | igual: 8 tipos. El README dice "7 piezas", el código tiene 8 |
| Colores | `COLORS[1..8]` | igual, copiados a `render.ts` |
| Puntos por líneas | `LINE_SCORES = [0,100,300,500,800]` × `level` | igual |
| Hard drop | +2 por celda recorrida | igual |
| Soft drop | +1 por fila | igual |
| Nivel | `floor(lines/10) + 1` | igual |
| Velocidad | `dropInterval` ms = `max(100, 1000 − (level−1)×90)` | en segundos: `max(0.1, 1.0 − (level−1)×0.09)` |
| Wall kicks | `[0, −1, +1, −2, +2]` | igual |
| Pieza fantasma | `globalAlpha = 0.2` | igual |
| Brillo de bloque | franja de 4 px, `rgba(255,255,255,0.12)` | igual |
| Vista previa | `NB = 30` px por celda, cuadrícula 4×4 | igual |
| Rejilla | color de `--grid-line` leído del CSS | color fijo en `render.ts`. El tema lo decide la plataforma |

Convenciones:

- `engine.ts` y `render.ts` no importan `react`, `next` ni nada del DOM. `render.ts` recibe el contexto como argumento y no crea elementos.
- `Math.random` solo aparece dentro de `engine.ts`, en la generación de piezas.
- El estado del juego vive en un `useRef` dentro de `TetrisCanvas`, no en `useState` ni en el reproductor.
- El guardado usa el `score` del último `onChange`. No se recalcula.

---

## Plan de implementación

1. **Motor puro.** Crear `lib/games/tetris/engine.ts` con `createGame` y `step`: piezas, colisión, rotación con wall kicks, fijado, limpieza de líneas, puntuación, nivel, caída automática, soft drop, hard drop y `status: "gameover"` cuando una pieza nueva colisiona al aparecer. Verificación: `npx tsc --noEmit` pasa; `grep -rnE 'from "(react|next)|document\.' lib/games/tetris/` no devuelve resultados. El campo `next` del estado no cuenta: no es un import.
2. **Render.** Crear `lib/games/tetris/render.ts` con `drawBoard(ctx, state)` y `drawNext(ctx, state)`, copiando el trazado de `draw()`, `drawBlock()`, `drawGrid()` y `drawNext()` de `game.js`. Verificación: `npx tsc --noEmit` pasa.
3. **Tipos y registro.** Crear `lib/games/types.ts` con `GameStatus` y `GameSnapshot`. Crear `lib/games/registry.ts` con `asteroides` (`showLives: true`) y `tetris` (`showLives: false`). No se modifica `lib/games/asteroids/`. Verificación: `npx tsc --noEmit` pasa.
4. **Canvas, panel y bucle.** Crear `components/player/tetris-canvas.tsx` como cliente. Contiene el canvas del tablero, el canvas de SIGUIENTE y el panel lateral (PUNTUACIÓN, LÍNEAS, NIVEL, CONTROLES). El estado de partida vive en `useRef`; el panel muestra un `useState` con el último snapshot, nunca tablero ni pieza. Teclado: `keydown`/`keyup` en `window`, `preventDefault` en flechas, ↑ y espacio, limpieza de teclas en `blur`. Flancos para `rotate` (↑ y X) y `drop` (espacio). Bucle con `requestAnimationFrame`, cancelado en el cleanup. Aplica `paused`, `endRequest` y `restartRequest` desde props. Llama `onChange` al cambiar un valor. Verificación: `npx tsc --noEmit` y `npm run build` pasan.
5. **Reproductor.** En `components/player/game-player.tsx`, reemplazar la comparación con `"asteroides"` por la búsqueda en `SURFACES`. Mostrar la vida en el HUD solo si `showLives` es `true`. Guardar solo el `GameSnapshot` de `onChange`. PAUSA alterna `paused`. FIN incrementa `endRequest`. JUGAR DE NUEVO incrementa `restartRequest`. SALIR es el `Link` existente. Verificación en `npm run dev`: `/juegos/tetris/jugar` muestra el tablero; PAUSA congela; FIN abre el modal; `/juegos/asteroides/jugar` sigue igual.
6. **Guardado.** `save` envía `snapshot.score` del último `onChange`. El flujo GUARDAR / REINTENTAR queda igual. Verificación: al guardar, `scores` tiene una fila con `game_id = 'tetris'` y el `score` del HUD.
7. **Migración.** Crear `supabase/migrations/20261006120000_tetris.sql`. Antes de aplicarla, comprobar con `execute_sql` que `select count(*) from scores where game_id = 'caida'` y que `games` no tiene ya una fila `tetris`. Aplicar con `apply_migration` solo cuando el juego funcione en local; la aplicación la decide la persona. Verificación: `list_tables` muestra `games` con 8 filas y ninguna con `id = 'caida'`; `scores` no tiene filas con `game_id = 'caida'`.
8. **Verificación final.** Ejecutar `npm run build`, `npm run lint` y `npx tsc --noEmit`. Revisar en `npm run dev` las rutas de los criterios.

Cada paso deja la aplicación construible. El paso 5 es el primero en que el juego se ve. El paso 7 cambia datos y se hace después de que el juego funcione en local. El último paso no es "probar todo"; esa verificación está en los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npx tsc --noEmit` termina sin errores.
- [ ] `grep -rnE 'from "(react|next)|document\.' lib/games/tetris/` no devuelve resultados. El campo `next` del estado no cuenta: no es un import.
- [ ] `grep` de `useState` en `components/player/tetris-canvas.tsx` solo devuelve el snapshot del panel. No hay estado de tablero ni de pieza.
- [ ] `/juegos/tetris/jugar` responde HTTP 200 y muestra "TETRIS" en el HUD.
- [ ] `/juegos/caida/jugar` responde HTTP 404.
- [ ] `/games` muestra 8 juegos, y uno de ellos se llama "TETRIS".
- [ ] El juego usa 8 tipos de pieza, incluida la tuerca N de color `#9e9e9e`.
- [ ] `←` y `→` mueven la pieza una columna por pulsación. Mantenerlas la repite.
- [ ] `↑` y `X` rotan la pieza en sentido horario. Si la rotación choca contra una pared, prueba desplazamientos de 1 y 2 columnas.
- [ ] `↓` baja una fila y suma 1 punto. Mantenerla repite la bajada.
- [ ] `Espacio` deja caer la pieza hasta el fondo, suma 2 puntos por celda recorrida y fija la pieza. Mantener `Espacio` pulsado dispara una sola caída por pulsación.
- [ ] Las teclas de flecha, `↑` y `Espacio` no desplazan la página.
- [ ] Completar 1, 2, 3 o 4 líneas en una sola fijación suma 100, 300, 500 u 800 puntos, multiplicados por el nivel actual.
- [ ] Al llegar a 10 líneas, el nivel pasa a 2 y la caída automática se acelera de 1.00 s a 0.91 s por fila.
- [ ] La pieza fantasma se dibuja con alfa 0.2 en la posición de aterrizaje.
- [ ] El panel SIGUIENTE muestra la siguiente pieza y se actualiza tras cada fijación.
- [ ] El panel muestra PUNTUACIÓN, LÍNEAS y NIVEL con los valores de la partida actual, sin recargar.
- [ ] El panel CONTROLES lista `←` `→` mover, `↑` o `X` rotar, `↓` bajar y `Espacio` caída. No lista pausa por tecla.
- [ ] En `/juegos/tetris/jugar`, el panel está a la derecha del tablero y centrado dentro de la pantalla CRT. A 375 px, el panel baja debajo del tablero sin scroll horizontal.
- [ ] Una pieza nueva que colisiona al aparecer pone `status` en `gameover` y el modal de guardado se abre con la puntuación actual.
- [ ] PAUSA congela el tablero y la puntuación. REANUDAR continúa desde el mismo punto.
- [ ] FIN termina la partida y abre el modal de guardado con la puntuación actual.
- [ ] JUGAR DE NUEVO reinicia con tablero vacío, puntuación 0, nivel 1 y 0 líneas, sin recargar la página.
- [ ] El HUD de `tetris` no muestra vidas. El HUD de `asteroides` sigue mostrando vidas.
- [ ] Al cambiar el foco de la ventana, las teclas quedan liberadas: la pieza deja de moverse.
- [ ] `P` no pausa el juego.
- [ ] Salir de `/juegos/tetris/jugar` a otra ruta detiene el bucle. No hay errores en consola.
- [ ] `onChange` no se llama en frames en los que no cambia puntuación, vidas, nivel o estado.
- [ ] Un guardado exitoso crea una fila en `scores` con `game_id = 'tetris'` y `score` igual a la puntuación del HUD.
- [ ] Si el guardado falla, el modal muestra el error y REINTENTAR envía el mismo `score`.
- [ ] `POST /api/scores` con `{}` sigue respondiendo HTTP 400 `invalid`.
- [ ] `/juegos/asteroides/jugar` sigue igual: mismo HUD con vidas, mismos controles y mismo guardado.
- [ ] Los juegos sin superficie registrada siguen mostrando el HUD placeholder sin cambios.
- [ ] `/salon` y `/juegos/[id]` muestran el ranking sin cambios de código.
- [ ] En `scores`, no hay filas con `game_id = 'caida'`, y `scores_game_id_fkey` sigue existiendo con `on delete cascade`.
- [ ] `get_advisors` no reporta tablas sin RLS.
- [ ] A 375 px de ancho, `/juegos/tetris/jugar` no tiene scroll horizontal.
- [ ] Ningún archivo fuera de `lib/games/tetris/`, `lib/games/types.ts`, `lib/games/registry.ts`, `components/player/`, `supabase/migrations/` y `specs/` cambia. `app/globals.css` no cambia.
- [ ] `references/started-games/03-tetris/` no cambia.

---

## Decisiones tomadas y descartadas

- **Sí: renombrar `caida` a `tetris`.** El catálogo ya tiene `caida` (PUZZLE, magenta, `cover-tetro`) con la descripción de este juego. Lo elegiste sobre crear una fila nueva. Igual que SPEC 05 con `rocas`. Descartado: fila nueva `tetris`, porque deja dos entradas casi iguales en `/games`. Consecuencia: `/juegos/caida/...` deja de existir y no hay redirección.
- **Sí: título "TETRIS".** Lo elegiste. Es el nombre del juego de referencia. Riesgo: "Tetris" es una marca registrada; ver Riesgos.
- **Sí: categoría PUZZLE y color magenta.** Se conservan del catálogo. Lo elegiste.
- **Sí: `cover-tetro` se conserva.** Ya existe en `app/globals.css`. Evita tocar CSS de portada, como con `cover-rocas` en SPEC 05. Descartado: `cover-tetris` nueva, porque añade diseño sin necesidad.
- **Sí: 8 tipos de pieza, incluida la tuerca N.** `game.js` genera tipos 1–8. El README dice 7, pero el código tiene 8. Se porta el código, que es lo que se juega.
- **Sí: `lives` fijo en 0 y `showLives: false` en el registro.** Tetris no tiene vidas. Descartado: añadir `lives` opcional a `GameSnapshot`, porque cambia el contrato compartido por todos los juegos.
- **Sí: líneas en el panel de Tetris, vía `lines` opcional en `GameSnapshot`.** Lo pediste con el panel. Es un campo opcional: Asteroides no lo envía y su HUD no cambia. Descartado: `lines` obligatorio, porque obligaría a Asteroides a cambiar.
- **Sí: PUNTUACIÓN y NIVEL en el HUD superior y en el panel.** El HUD superior es el de la plataforma y se mantiene igual para todos los juegos. Descartado: ocultarlos en el HUD solo para Tetris, porque añade una excepción en `game-player.tsx`.
- **Sí: panel con las teclas reales del juego.** La imagen de referencia tenía `P` para pausa, pero este juego no tiene tecla P (ver SPEC 05 y decisión de arriba). Descartado: listar `P` sin que funcione.
- **Sí: `lib/games/types.ts` nuevo y `asteroids` sin tocar.** Los tipos de SPEC 05 viven en el canvas de asteroides, no en `types.ts`. Descartado: refactor de asteroides para importar el tipo compartido. Los dos tipos son estructuralmente iguales y no cambia el comportamiento.
- **Sí: teclas mantenidas con repetición de 0.05 s.** `game.js` depende de la repetición del sistema operativo en `keydown`. El motor recibe estado por frame, así que la repetición se hace en el motor, sin retardo inicial.
- **Sí: rotar y hard drop por flanco.** Igual que el disparo de SPEC 05: una acción por pulsación.
- **Sí: `dt` limitado a 0.05 s y velocidad en segundos.** Mismo criterio que SPEC 05. Evita saltos al volver de otra pestaña.
- **Sí: colores fijos en `render.ts`.** `game.js` lee `--grid-line` del CSS de su propia página. En la plataforma el tema lo decide `globals.css`; el juego usa colores fijos. Descartado: leer variables CSS desde el canvas, porque acopla el render al DOM.
- **Sí: `Math.random` dentro del motor.** Igual que SPEC 05. Descartado: inyectar un generador, porque no hay tests automáticos que lo necesiten.
- **Sí: sin tecla P.** Igual que SPEC 05. La pausa es el botón PAUSA.
- **Sí: sin alternador de tema.** La plataforma tiene su propio tema. Descartado: portar el botón del original.
- **Sí: el ranking no cambia.** SPEC 06 ya es genérico para cualquier juego con fila en `games`.
- **Sí: guardado al final de la partida.** Igual que SPEC 05. Descartado guardar en cada fijación.
- **No: audio.** Fuera de alcance, como en SPEC 05.
- **No: tocar `references/`.** Es la fuente de referencia.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| "Tetris" es una marca registrada. El título del juego puede chocar con ella. | Título "TETRIS" elegido por la persona. Si se quiere cambiar, es un `update` de `title` en la migración antes de aplicarla. Revisar antes de `apply_migration`. |
| La migración falla si `scores` tiene filas con `caida` y la clave foránea no se quita antes del renombrado. | El SQL quita la clave, renombra, mueve las filas y la vuelve a crear, en ese orden. Comprobar el conteo antes de aplicar. |
| `best` de `caida` (184220) queda como número antiguo. | `best` y `plays` son columnas editables a mano (SPEC 04). Se conservan. Si se quieren poner a cero, es un cambio aparte. |
| Una tecla queda pegada si la ventana pierde el foco antes del `keyup`. | Limpiar teclas en `blur`. Criterio de foco. |
| El modo estricto de React monta el efecto dos veces y deja dos bucles. | El cleanup cancela el `requestAnimationFrame`. Criterio de salida de ruta. |
| El registro de superficies cambia `game-player.tsx` y puede romper Asteroides. | Criterio de regresión de `/juegos/asteroides/jugar`. |
| Mantener una tecla de movimiento genera demasiadas repeticiones por segundo. | Repetición fija de 0.05 s. Revisar la sensación en `npm run dev`. Ajustar la constante si hace falta. |
| No hay test runner; la lógica del motor no tiene pruebas automáticas. | Verificación manual con `npm run dev` y `tsc`. |

---

## Lo que **no** está en esta spec

- Audio.
- Tecla de pausa y pausa automática.
- Alternador de tema del juego original.
- Redirección de `/juegos/caida`.
- Portar 04-arkanoid, 02-asteroids (ya portado) u otros juegos del catálogo.
- Ranking por nivel, líneas o tiempo.
- Anti-trampas y validación de la puntuación según la jugada.
- Cambios en `references/started-games/03-tetris/`.
