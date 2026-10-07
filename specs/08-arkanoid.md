# SPEC 08 — Arkanoid jugable en el reproductor

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-10-06
> **Objetivo:** Portar el Arkanoid de `references/started-games/04-arkanoid/` a un componente React jugable en `/juegos/arkanoid/jugar`, reemplazando la entrada `bloque-buster` del catálogo, con la puntuación guardada en Supabase al terminar la partida.

---

## Alcance

**Dentro:**

- Motor de juego puro en `lib/games/arkanoid/engine.ts`: paleta, pelota, bloques, cinco niveles, vidas, puntuación por bloque, explosiones y fin de partida. Sin React ni DOM.
- Datos de niveles en `lib/games/arkanoid/levels.ts`: port de `levels.js` con los mismos cinco patrones y las mismas velocidades.
- Render en `lib/games/arkanoid/render.ts`: `draw(ctx, state, sheet)` dibuja el estado con los sprites del spritesheet. `sheet` es la imagen ya cargada; `render.ts` no la crea.
- Assets: `public/games/arkanoid/spritesheet-breakout.png`, copia binaria de `assets/spritesheet-breakout.png` del original. Las coordenadas de sprites y explosiones de `spritesheet.js` se copian a `render.ts`.
- Componente cliente `components/player/arkanoid-canvas.tsx`: dueño del juego. Contiene el canvas 800×600 y un panel lateral a su derecha, centrado dentro de `.crt-screen`. Estado de partida en `useRef`, bucle con `requestAnimationFrame`, `onChange` solo al cambiar un valor.
- Panel lateral de Arkanoid (dentro de `arkanoid-canvas.tsx`): PUNTUACIÓN y NIVEL con los valores del último `onChange`; CONTROLES con `←` `→` (mover la paleta) y `Ratón` (mover la paleta). No hay tecla de pausa: la pausa es el botón PAUSA. No hay vista previa ni línea de contador.
- Control de la paleta con teclado (`←` `→`, mantenidas) y con ratón (la paleta sigue la posición X del puntero sobre el canvas).
- Registro: añadir `arkanoid` a `SURFACES` en `lib/games/registry.ts`, con `showLives: true`. Ver SPEC 07.
- Reproductor: `components/player/game-player.tsx` no cambia. Ya busca la superficie en `SURFACES` (SPEC 07). El HUD de la plataforma muestra vidas, puntuación y nivel.
- Guardado: al terminar la partida (game over, victoria o FIN), `POST /api/scores` con `{ game: "arkanoid", name, score }` (SPEC 04). Sin cambios en el flujo de guardado.
- Migración `supabase/migrations/20261006130000_arkanoid.sql`: renombra el juego `bloque-buster` a `arkanoid`, cambia el título a `ARKANOID` y mueve sus puntuaciones.
- Portada: se reutiliza `cover-bricks`, que ya existe en `app/globals.css`. Sin CSS nuevo de portada.
- Regla CSS mínima en `app/globals.css` para el canvas: `width: 100%`, `height: auto`, con el mismo criterio que `.asteroids-canvas` de SPEC 05.

**Fuera de alcance (para specs futuras):**

- Audio. Los sonidos `ball-bounce.mp3` y `break-sound.mp3` no se portan.
- Tecla de pausa (P o Escape). La pausa es solo el botón PAUSA del HUD, igual que en SPEC 05 y SPEC 07.
- Pausa automática al perder el foco de la ventana.
- Selector de nivel en la pausa (botones 1–5 del original). Es una función de desarrollo del original; los niveles avanzan solo al limpiar el anterior.
- Texto "GAME OVER" o "¡Completaste el juego!" dibujado en el canvas. El modal de guardado de la plataforma muestra el final.
- HUD de puntuación, vidas y nivel dentro del canvas (`Score:`, `Nivel:` y las bolas de vida del original). Lo muestran el HUD de la plataforma y el panel.
- Ángulo de rebote según el punto de impacto en la paleta. El original no lo tiene; se porta tal cual.
- Ranking por nivel, tiempo de partida o bloques destruidos.
- Anti-trampas y validación de la puntuación según la jugada. Ver SPEC 04.
- Cambios en `lib/scores-db.ts`, `lib/scores.ts`, `/salon`, `app/api/scores/`, `lib/games/asteroids/` y `lib/games/tetris/`.
- Cambios en `references/`.

---

## Modelo de datos

Sin persistencia nueva. La tabla `scores` se reutiliza de SPEC 04. La migración cambia una fila de `games` y las filas de `scores` de ese juego.

```ts
// lib/games/arkanoid/engine.ts
type Input = {
  left: boolean;          // mantenido: mueve la paleta a la izquierda
  right: boolean;         // mantenido: mueve la paleta a la derecha
  pointerX: number | null; // X del puntero en unidades del canvas (0–800). null si el puntero no está sobre el canvas
};

type Paddle = { x: number; y: number; w: number; h: number };  // y = 560, w = 81, h = 14
type Ball = { x: number; y: number; w: number; h: number; vx: number; vy: number }; // w = h = 16

type Block = {
  x: number; y: number; w: number; h: number; // w = 64, h = 24
  color: BlockColor;                          // "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green"
  alive: boolean;
};

type Explosion = {
  x: number; y: number; w: number; h: number;
  color: BlockColor;
  elapsed: number;   // milisegundos desde que explotó el bloque
};

type GameState = {
  status: GameStatus;      // "playing" | "gameover". La victoria también es "gameover" (ver Decisiones)
  score: number;           // puntos acumulados; es el valor que se guarda. 10 por bloque
  lives: number;           // 3 al empezar
  level: number;           // 1 al empezar, hasta 5
  paddle: Paddle;
  ball: Ball;
  blocks: Block[];         // bloques del nivel actual
  explosions: Explosion[];
};

// Exports: createGame(): GameState
// Exports: step(state: GameState, input: Input, dt: number): GameState
// step muta el estado recibido y lo devuelve. Mismo criterio que SPEC 05.
// dt se limita a 0.05 s para evitar saltos al volver de otra pestaña.
```

```ts
// lib/games/arkanoid/levels.ts
type LevelDef = { speed: number; blocks: { col: number; row: number; color: BlockColor }[] };
export const LEVELS: LevelDef[]; // 5 niveles, generados como en levels.js
```

```ts
// lib/games/types.ts (compartido, ya existe desde SPEC 07)
export type GameStatus = "playing" | "dead" | "gameover";
export type GameSnapshot = { score: number; lives: number; level: number; status: GameStatus; lines?: number };
```

```ts
// lib/games/registry.ts (se añade la entrada; el resto ya existe)
arkanoid: { Canvas: ArkanoidCanvas, showLives: true },
```

```ts
// Props de ArkanoidCanvas: comandos de React hacia el juego
type CanvasProps = {
  paused: boolean;             // PAUSA/REANUDAR. Congela el bucle sin reiniciar nada.
  endRequest: number;          // FIN incrementa este contador. El juego pasa a "gameover".
  restartRequest: number;      // JUGAR DE NUEVO incrementa este contador. Reinicia con createGame().
  onChange: (s: GameSnapshot) => void; // solo cuando cambia score, lives, level o status
};
```

Migración (el orden importa porque `scores.game_id` tiene clave foránea):

```sql
-- supabase/migrations/20261006130000_arkanoid.sql
alter table public.scores drop constraint scores_game_id_fkey;
update public.games set id = 'arkanoid', title = 'ARKANOID' where id = 'bloque-buster';
update public.scores set game_id = 'arkanoid' where game_id = 'bloque-buster';
alter table public.scores add constraint scores_game_id_fkey
  foreign key (game_id) references public.games(id) on delete cascade;
```

`short`, `long`, `cat` (`ARCADE`), `cover` (`cover-bricks`), `color` (`cyan`), `best` (28450) y `plays` (`"12.4K"`) de la fila se conservan.

Porte de constantes y reglas (valor en `game.js` → valor portado). Todos los valores son iguales salvo que se indique.

| Concepto | `game.js` / `levels.js` | Portado |
| --- | --- | --- |
| Canvas | 800×600 | igual |
| Paleta | `w: 81`, `h: 14`, `y: 560`, velocidad `PADDLE_SPEED = 400` px/s con teclas | igual. El sprite de 162×14 se dibuja escalado a 81 px de ancho, como en el original |
| Pelota | 16×16 | igual |
| Velocidad base | `BASE_BALL_VX = 200`, `BASE_BALL_VY = -300` px/s, multiplicadas por `speed` del nivel | igual |
| Multiplicadores | `1.00, 1.10, 1.21, 1.33, 1.46` | igual |
| Bloques | 64×24 px, origen `(80, 80)`, 10 columnas × 6 filas | igual |
| Puntos por bloque | `score += 10` | igual |
| Vidas | 3 | igual |
| Pelota perdida | `ball.y > 600`: pierde una vida; si quedan vidas, la pelota vuelve a la paleta con la velocidad del nivel | igual |
| Niveles | 5. Al limpiar uno pasa al siguiente. Al limpiar el 5, fin | igual |
| Explosión | 150 ms, 4 frames del spritesheet | igual |
| Dt | sin límite en `game.js` | 0.05 s máximo |

---

## Plan de implementación

1. **Motor puro y niveles.** Crear `lib/games/arkanoid/levels.ts` con `LEVELS` (port de `levels.js`) y `lib/games/arkanoid/engine.ts` con `createGame` y `step`: paleta por puntero y teclas, movimiento de pelota, rebotes en paredes y paleta, colisión AABB con un bloque por frame, puntuación, explosiones, pérdida de vida, cambio de nivel y `status: "gameover"` al perder la última vida o al limpiar el nivel 5. Verificación: `npx tsc --noEmit` pasa; `grep -rnE 'from "(react|next)|document\.|window\.' lib/games/arkanoid/` no devuelve resultados.
2. **Assets.** Copiar `references/started-games/04-arkanoid/assets/spritesheet-breakout.png` a `public/games/arkanoid/spritesheet-breakout.png`. No se copian los sonidos ni `spritesheet.js`. Verificación: el archivo existe y `/games/arkanoid/spritesheet-breakout.png` responde HTTP 200 en `npm run dev`.
3. **Render.** Crear `lib/games/arkanoid/render.ts` con `draw(ctx, state, sheet)`: fondo negro, bloques vivos, explosiones, paleta y pelota. Copiar las coordenadas de `SPRITES` y `EXPLOSION_FRAMES` de `spritesheet.js` tal cual. Verificación: `npx tsc --noEmit` pasa.
4. **Registro.** En `lib/games/registry.ts`, añadir `arkanoid: { Canvas: ArkanoidCanvas, showLives: true }`. Verificación: `npx tsc --noEmit` pasa tras crear el paso 6 (si el canvas no existe aún, el registro no compila; hacer 4 y 6 en el mismo commit).
5. **Migración.** Crear `supabase/migrations/20261006130000_arkanoid.sql`. Antes de aplicarla, comprobar con `execute_sql` que `select count(*) from scores where game_id = 'bloque-buster'` devuelve el número esperado y que `games` no tiene ya una fila `arkanoid`. Aplicar con `apply_migration` antes de probar el paso 7, para que `/juegos/arkanoid/jugar` tenga fila en el catálogo; la decisión de aplicar es de la persona. Verificación: `list_tables` muestra `games` con 8 filas y ninguna con `id = 'bloque-buster'`; `scores` no tiene filas con `game_id = 'bloque-buster'`.
6. **Canvas, panel y bucle.** Crear `components/player/arkanoid-canvas.tsx` como cliente. Contiene el canvas 800×600, el panel lateral (PUNTUACIÓN, NIVEL, CONTROLES) y el estado en `useRef`. Carga `/games/arkanoid/spritesheet-breakout.png` en un efecto; mientras no cargue, no dibuja sprites. Teclado: `keydown`/`keyup` en `window`, `preventDefault` en flechas, limpieza de teclas en `blur`. Puntero: `mousemove` y `mouseleave` en el canvas, convertidos a unidades del canvas. Bucle con `requestAnimationFrame`, cancelado en el cleanup. Aplica `paused`, `endRequest` y `restartRequest` desde props. Llama `onChange` al cambiar un valor. Verificación: `npx tsc --noEmit` y `npm run build` pasan; `npm run dev` muestra la paleta y la pelota moviéndose.
7. **Reproductor y guardado.** Sin cambios en `components/player/game-player.tsx`. Verificación en `npm run dev`: `/juegos/arkanoid/jugar` muestra la superficie; PAUSA congela; FIN abre el modal con la puntuación actual; GUARDAR envía `snapshot.score` del último `onChange`. `/juegos/asteroides/jugar` y `/juegos/tetris/jugar` siguen igual.
8. **Estilos del canvas.** Añadir en `app/globals.css` la regla para `.arkanoid-canvas` con `width: 100%` y `height: auto`, y la distribución del panel dentro de `.crt-screen`. Verificación: a 375 px el panel baja debajo del canvas sin scroll horizontal; en escritorio el panel queda a la derecha del canvas.
9. **Verificación final.** Ejecutar `npm run build`, `npm run lint` y `npx tsc --noEmit`. Revisar en `npm run dev` las rutas de los criterios.

Cada paso deja la aplicación construible. El paso 6 es el primero en que el juego se ve. El paso 5 cambia datos: se aplica antes de probar el juego, y la aplicación la decide la persona. El último paso no es "probar todo"; esa verificación está en los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npx tsc --noEmit` termina sin errores.
- [ ] `grep -rnE 'from "(react|next)|document\.|window\.' lib/games/arkanoid/` no devuelve resultados.
- [ ] `grep` de `useState` en `components/player/arkanoid-canvas.tsx` solo devuelve el snapshot del panel. No hay estado de paleta, pelota ni bloques.
- [ ] `/juegos/arkanoid/jugar` responde HTTP 200 y muestra "ARKANOID" en el HUD.
- [ ] `/juegos/bloque-buster/jugar` responde HTTP 404.
- [ ] `/games` muestra 8 juegos, y uno de ellos se llama "ARKANOID".
- [ ] `←` y `→` mueven la paleta mientras la tecla está pulsada. La paleta no sale del canvas.
- [ ] Mover el ratón sobre el canvas centra la paleta en la X del puntero, sin salir del canvas. Sacar el ratón del canvas no mueve la paleta.
- [ ] Las flechas no desplazan la página.
- [ ] La partida empieza con 3 vidas, nivel 1 y puntuación 0. La pelota sale de la paleta con velocidad `(200, -300)` px/s.
- [ ] En el nivel 5 la pelota va a `(292, -438)` px/s: multiplicador 1.46.
- [ ] Cada bloque destruido suma exactamente 10 puntos.
- [ ] Un bloque destruido muestra la explosión de 4 frames durante 150 ms y después desaparece.
- [ ] La pelota que cae por debajo del canvas resta una vida y vuelve a la paleta. Con 0 vidas, `status` pasa a `gameover` y el modal de guardado se abre.
- [ ] Limpiar los bloques del nivel 1 al 4 carga el siguiente nivel, con su patrón y su velocidad. Limpiar el nivel 5 pone `status` en `gameover` y abre el modal con la puntuación.
- [ ] Los cinco niveles de `levels.ts` tienen 60, 40, 30, 39 y 39 bloques, igual que `levels.js` ejecutado con Node, y las velocidades son 1.00, 1.10, 1.21, 1.33 y 1.46.
- [ ] El panel muestra PUNTUACIÓN y NIVEL con los valores de la partida actual, sin recargar, y CONTROLES con `←` `→` y `Ratón`. No lista tecla de pausa.
- [ ] PAUSA congela la pelota, la paleta y la puntuación. REANUDAR continúa desde el mismo punto.
- [ ] `P` y `Escape` no pausan el juego.
- [ ] FIN termina la partida y abre el modal de guardado con la puntuación actual.
- [ ] JUGAR DE NUEVO reinicia con 3 vidas, nivel 1, puntuación 0 y los bloques del nivel 1, sin recargar la página.
- [ ] El HUD de `arkanoid` muestra vidas. El HUD de `tetris` sigue sin vidas.
- [ ] Al cambiar el foco de la ventana, las teclas quedan liberadas: la paleta deja de moverse.
- [ ] Salir de `/juegos/arkanoid/jugar` a otra ruta detiene el bucle. No hay errores en consola.
- [ ] `onChange` no se llama en frames en los que no cambia puntuación, vidas, nivel o estado.
- [ ] Un guardado exitoso crea una fila en `scores` con `game_id = 'arkanoid'` y `score` igual a la puntuación del HUD.
- [ ] Si el guardado falla, el modal muestra el error y REINTENTAR envía el mismo `score`.
- [ ] `POST /api/scores` con `{}` sigue respondiendo HTTP 400 `invalid`.
- [ ] `/juegos/asteroides/jugar` y `/juegos/tetris/jugar` siguen igual.
- [ ] `/salon` y `/juegos/[id]` muestran el ranking sin cambios de código.
- [ ] En `scores`, no hay filas con `game_id = 'bloque-buster'`, y `scores_game_id_fkey` sigue existiendo con `on delete cascade`.
- [ ] `get_advisors` no reporta tablas sin RLS.
- [ ] A 375 px de ancho, `/juegos/arkanoid/jugar` no tiene scroll horizontal.
- [ ] `public/games/arkanoid/spritesheet-breakout.png` existe y su tamaño en bytes coincide con el de `references/started-games/04-arkanoid/assets/spritesheet-breakout.png`.
- [ ] Ningún archivo fuera de `lib/games/arkanoid/`, `lib/games/registry.ts`, `components/player/arkanoid-canvas.tsx`, `public/games/arkanoid/`, `app/globals.css`, `supabase/migrations/` y `specs/` cambia. `components/player/game-player.tsx` no cambia.
- [ ] `references/started-games/04-arkanoid/` no cambia.

---

## Decisiones tomadas y descartadas

- **Sí: renombrar `bloque-buster` a `arkanoid`.** Lo elegiste. El catálogo ya tenía este juego con otro nombre, con la misma descripción de bloques y pelota. Igual que SPEC 05 con `rocas` y SPEC 07 con `caida`. Descartado: fila nueva `arkanoid`, porque deja dos entradas casi iguales en `/games`. Consecuencia: `/juegos/bloque-buster/...` deja de existir y no hay redirección.
- **Sí: título "ARKANOID".** Lo elegiste. Es el nombre del juego de referencia. Riesgo: "Arkanoid" es una marca registrada (ver Riesgos). Descartado: conservar "BLOQUE BUSTER", que era la otra opción ofrecida.
- **Sí: categoría ARCADE y color cyan.** Se conservan del catálogo. Lo elegiste.
- **Sí: `cover-bricks` se conserva.** Ya existe en `app/globals.css`. Igual que `cover-tetro` en SPEC 07: no se añade CSS de portada.
- **Sí: panel lateral.** `CLAUDE.md` y la guía de `/add-game` piden panel en juegos con tablero o marcador. Arkanoid tiene tablero. El canvas 800×600 queda a la izquierda y el panel a la derecha; en 375 px el panel baja. Descartado: panel debajo del canvas en escritorio, porque rompe el contrato de SPEC 07.
- **Sí: el panel no lista vidas.** El HUD de la plataforma ya las muestra (`showLives: true`). Repetirlas en el panel añade una fuente de verdad más.
- **Sí: victoria como `status: "gameover"`.** `GameStatus` no tiene `win`. El modal de la plataforma muestra la puntuación final y guarda igual. Descartado: añadir `win` a `GameStatus`, porque cambia el contrato compartido por todos los juegos.
- **Sí: sin texto "GAME OVER" ni "¡Completaste el juego!" en el canvas.** El modal de la plataforma reemplaza esos textos (guía de port, sección 6). Descartado: dibujarlos debajo del modal, porque el modal los tapa y no aportan nada.
- **Sí: ratón incluido.** El README pone el ratón como primer control del juego. Se porta con la X del puntero sobre el canvas. Descartado: solo teclado, porque quita el control principal del original.
- **Sí: sin tecla P ni Escape.** Igual que SPEC 05 y 07. La pausa es el botón PAUSA. Descartado: mantener P como pausa, porque es una decisión de controles nueva.
- **No: selector de nivel en la pausa.** Es una función de desarrollo del original (botones 1–5). Se deja fuera para no añadir controles nuevos sin pedirlos. Si se quiere, es una spec aparte.
- **Sí: `step` muta el estado recibido.** Mismo criterio que SPEC 05: `createGame()` crea el estado y `step` lo actualiza en sitio.
- **Sí: sin ángulo de rebote en la paleta.** El original rebota siempre con la misma X. Cambiarlo cambia la física del juego. Descartado: rebote por posición de impacto, por ahora.
- **Sí: paleta de 81 px, no 162.** El sprite de `spritesheet.js` mide 162×14, pero `game.js` usa `w: 81`. Se juega con 81. `CLAUDE.md` del original cita 162 como ancho del sprite, no de la paleta.
- **Sí: `dt` limitado a 0.05 s.** Mismo criterio que SPEC 05 y 07. El original no lo limita y puede dar saltos al volver de otra pestaña.
- **Sí: motor determinista.** No usa `Math.random`: el saque es siempre el mismo, como en el original. Solo usa `Math.abs`, `Math.min` y `Math.max`.
- **Sí: `game-player.tsx` no cambia.** El registro de SPEC 07 ya resuelve la superficie. Descartado: añadir una excepción para Arkanoid, porque rompe el contrato de registro.
- **Sí: sprites en `public/games/arkanoid/`.** Next sirve los archivos estáticos desde `public/`. Descartado: importar el PNG desde `lib/`, porque el canvas necesita una URL pública.
- **No: audio.** Fuera de alcance, como en SPEC 05 y 07.
- **No: tocar `references/`.** Es la fuente de referencia.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| "Arkanoid" es una marca registrada. El título del juego puede chocar con ella. | Título "ARKANOID" elegido por la persona. Si se quiere cambiar, es un `update` de `title` en la migración antes de aplicarla. Revisar antes de `apply_migration`. |
| La migración falla si `scores` tiene filas con `bloque-buster` y la clave foránea no se quita antes del renombrado. | El SQL quita la clave, renombra, mueve las filas y la vuelve a crear, en ese orden. Comprobar el conteo antes de aplicar. |
| `best` de `bloque-buster` (28450) y `plays` ("12.4K") quedan como números antiguos. | Son columnas editables a mano (SPEC 04). Se conservan. Si se quieren poner a cero, es un cambio aparte. |
| El sprite del spritesheet se escala de 162 a 81 px y pierde nitidez. | Aceptado: es el mismo escalado que hace el original. Revisar en `npm run dev`. |
| La imagen no carga y el canvas queda negro sin aviso. | Sin sprites no hay juego visible. Se muestra el panel igual y el error va a consola. Criterio de imagen en el paso 2. |
| Una tecla queda pegada si la ventana pierde el foco antes del `keyup`. | Limpiar teclas en `blur`. Criterio de foco. |
| El modo estricto de React monta el efecto dos veces y deja dos bucles. | El cleanup cancela el `requestAnimationFrame`. Criterio de salida de ruta. |
| No hay test runner; la lógica del motor no tiene pruebas automáticas. | Verificación manual con `npm run dev` y `tsc`. |

---

## Lo que **no** está en esta spec

- Audio.
- Tecla de pausa y pausa automática.
- Selector de nivel en la pausa.
- Texto "GAME OVER" o de victoria dentro del canvas.
- HUD dentro del canvas.
- Ángulo de rebote según el impacto en la paleta.
- Redirección de `/juegos/bloque-buster`.
- Ranking por nivel, tiempo o bloques.
- Anti-trampas y validación de la puntuación según la jugada.
- Cambios en `references/started-games/04-arkanoid/`.
