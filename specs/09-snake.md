# SPEC 09 — Snake jugable en el reproductor

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-10-06
> **Objetivo:** Crear el Snake jugable en `/juegos/snake/jugar`, con la serpiente, la fruta del sprite sheet de `references/source-assets/snake-assets/` y la puntuación guardada en Supabase al terminar la partida, reemplazando la entrada `serpentina` del catálogo.

---

## Alcance

**Dentro:**

- Motor de juego puro en `lib/games/snake/engine.ts`: grilla, serpiente, fruta, crecimiento, velocidad por nivel y fin de partida. Sin React ni DOM.
- Render en `lib/games/snake/render.ts`: `draw(ctx, state, sprites)` dibuja la grilla, la serpiente y la fruta. `sprites` es un mapa de imágenes ya cargadas (ver Modelo de datos); `render.ts` no crea imágenes.
- Assets: copia binaria de `references/source-assets/snake-assets/` a `public/games/snake/`: `apple.png` (fruta, 40 × 40) y los 14 PNG de serpiente (`head_*`, `body_*`, `tail_*`, 40 × 40). Los sprites se dibujan a 40 × 40 px, el tamaño de celda.
- Componente cliente `components/player/snake-canvas.tsx`: dueño del juego. Contiene el canvas 800×600 y un panel lateral a su derecha, centrado dentro de `.crt-screen`. Estado de partida en `useRef`, bucle con `requestAnimationFrame`, `onChange` solo al cambiar un valor.
- Panel lateral de Snake (dentro de `snake-canvas.tsx`): PUNTUACIÓN y NIVEL con los valores del último `onChange`; CONTROLES con `←` `→` `↑` `↓`. No hay tecla de pausa: la pausa es el botón PAUSA. No hay LÍNEAS ni vista previa (ver Decisiones).
- Registro: añadir `snake` a `SURFACES` en `lib/games/registry.ts`, con `showLives: false` (SPEC 07).
- Guardado: al terminar la partida (game over o FIN), `POST /api/scores` con `{ game: "snake", name, score }` (SPEC 04). Sin cambios en el flujo de guardado.
- Migración `supabase/migrations/20261006140000_snake.sql`: renombra el juego `serpentina` a `snake`, cambia el título a `SNAKE` y mueve sus puntuaciones.

**Fuera de alcance (para specs futuras):**

- Audio (música y efectos). El original no trae audio portado.
- Tecla de pausa (P o Esc). La pausa es solo el botón PAUSA del HUD.
- Modos de juego: paredes que dan la vuelta (toroidal), dos jugadores, obstáculos.
- Tipos de fruta con puntos distintos. Una sola fruta, 10 puntos.
- Ranking por nivel, longitud o tiempo de partida.
- Redirección de `/juegos/serpentina/jugar` a la nueva ruta.
- Reescribir `short` y `long` del catálogo. Se conservan los textos actuales (ver Decisiones).
- Cambiar `lib/data/home.ts`, que muestra "Serpentina" en datos estáticos de la portada.
- Cambios en `references/`.
- Anti-trampas y validación de la puntuación según la jugada. Ver SPEC 04.

---

## Modelo de datos

Este feature introduce estado de partida en memoria. No introduce persistencia nueva. La tabla `scores` se reutiliza de SPEC 04. Cambia una fila de `games` y las filas de `scores` de ese juego.

```ts
// lib/games/snake/engine.ts
type Dir = "up" | "down" | "left" | "right";
type Input = { dir: Dir | null };   // giro pedido en este frame; null = sin cambio

type GameStatus = "playing" | "gameover";

type Cell = { x: number; y: number }; // celda de la grilla, origen arriba-izquierda

type GameState = {
  status: GameStatus;
  score: number;        // 10 por fruta; es el valor que se guarda
  level: number;        // 1 al empezar; sube cada 5 frutas
  fruits: number;       // frutas comidas en la partida
  snake: Cell[];        // snake[0] es la cabeza; 3 celdas al empezar
  dir: Dir;             // dirección actual
  pendingDir: Dir | null; // giro pedido, se aplica en el siguiente paso
  fruit: Cell;          // posición de la fruta
  stepTimer: number;    // segundos acumulados desde el último paso
};

// Exports: createGame(random: () => number = Math.random): GameState
// Exports: step(state: GameState, input: Input, dt: number, random?: () => number): GameState
// dt se limita a 0.05 s, como en el resto de juegos, para evitar saltos al volver de otra pestaña.
```

Constantes de la partida (valores propios de esta spec, no vienen de un original):

- Grilla de 20 × 15 celdas de 40 px. Canvas 800 × 600.
- Serpiente inicial: 3 celdas en `(10, 7)`, `(9, 7)`, `(8, 7)`, dirección `right`.
- Velocidad: `4,096 × 1,05^(level − 1)` pasos por segundo, con tope de 7,168. Un paso por intervalo de `1 / velocidad` s.
- Nivel: `level = 1 + floor(fruits / 5)`.
- Fruta: `10` puntos. Aparece en una celda libre elegida con `random`.

Sprites (mapa `SnakeSprites`, claves = nombre de archivo sin extensión):

- Fruta: `apple`.
- Cabeza: `head_up`, `head_down`, `head_left`, `head_right`. Según `state.dir`.
- Cuerpo: `body_horizontal`, `body_vertical`, `body_topleft`, `body_topright`, `body_bottomleft`, `body_bottomright`. Para un tramo del cuerpo, `lados` son las direcciones desde ese tramo hacia su vecino anterior y hacia su vecino siguiente. Pares `{up, down}` → `body_vertical`; `{left, right}` → `body_horizontal`; esquinas por sus dos lados (p. ej. `{up, left}` → `body_topleft`).
- Cola: `tail_up`, `tail_down`, `tail_left`, `tail_right`. Según la dirección desde el penúltimo tramo hasta la cola (`cola − penúltimo`).

```ts
// Props de SnakeCanvas: comandos de React hacia el juego
type SnakeCanvasProps = {
  paused: boolean;             // PAUSA/REANUDAR del reproductor. Congela el bucle sin reiniciar nada.
  endRequest: number;          // FIN incrementa este contador. El juego pasa a "gameover" al verlo cambiar.
  restartRequest: number;      // JUGAR DE NUEVO incrementa este contador. El juego reinicia con createGame().
  onChange: (s: GameSnapshot) => void; // notifica a React solo cuando cambia un valor
};

// GameSnapshot viene de lib/games/types.ts (SPEC 07). Snake envía lives: 0 y no envía lines.
```

Control del juego:

- Pausa, FIN y reinicio son comandos, no estado de partida. El reproductor guarda `paused` y los contadores `endRequest` y `restartRequest`. El canvas los lee y actúa sobre su propio estado.
- SALIR es un `Link` a `/juegos/[id]`. Al desmontar, el cleanup del efecto cancela el bucle.
- `onChange` se llama solo cuando cambia `score`, `level` o `status`. Nunca en cada frame.
- El game over lo decide el juego: choque con pared o con el cuerpo, o FIN. El reproductor abre el modal cuando recibe `status: "gameover"`.

Teclado:

- `←` `→` `↑` `↓` piden un giro. Pedir la dirección opuesta a la actual se ignora: la serpiente no se da la vuelta sobre sí misma.
- Solo se guarda un giro pendiente. Si llegan dos antes del siguiente paso, gana el último válido.

Conventions:

- `engine.ts` no importa `react`, `next` ni nada del DOM. `render.ts` recibe el contexto y la imagen como argumentos y no crea elementos.
- El estado del juego vive en un `useRef` dentro de `SnakeCanvas`, no en `useState` ni en el reproductor.
- El guardado usa el `score` del último `onChange`. La puntuación final se toma al terminar y no se recalcula.

Migración (el orden importa porque `scores.game_id` tiene clave foránea):

```sql
-- supabase/migrations/20261006140000_snake.sql
alter table public.scores drop constraint scores_game_id_fkey;
update public.games set id = 'snake', title = 'SNAKE' where id = 'serpentina';
update public.scores set game_id = 'snake' where game_id = 'serpentina';
alter table public.scores add constraint scores_game_id_fkey
  foreign key (game_id) references public.games(id) on delete cascade;
```

`short`, `long`, `cat` (`ARCADE`), `cover` (`cover-snake`), `color` (`green`), `best` y `plays` de la fila se conservan. `cover-snake` ya existe en `app/globals.css`, así que no se toca CSS.

---

## Plan de implementación

1. **Motor puro.** Crear `lib/games/snake/engine.ts` con `createGame` y `step`: grilla, movimiento, giros, crecimiento, fruta, nivel y choques. Sin input de teclado ni render. Verificación: `npx tsc --noEmit` pasa; `grep` de `react`, `next` y `document` en `lib/games/snake/` no devuelve resultados.
2. **Render y assets.** Copiar a `public/games/snake/` `apple.png` y los 14 PNG de serpiente desde `references/source-assets/snake-assets/`. Crear `lib/games/snake/render.ts` con `draw(ctx, state, sprites)`. Dibuja grilla, fruta y serpiente con las reglas de selección de sprite de la sección Modelo de datos. Verificación: `npx tsc --noEmit` pasa; los 15 archivos existen en `public/games/snake/`.
3. **Tipos y registro.** Añadir `snake` (`showLives: false`) a `SURFACES` en `lib/games/registry.ts`. Se hace junto con el paso 4, porque la entrada importa `snake-canvas.tsx`. Verificación: `npx tsc --noEmit` pasa.
4. **Canvas y bucle.** Crear `components/player/snake-canvas.tsx` como cliente. Contiene el `<canvas>` 800×600, el panel lateral y el estado en `useRef`. Lee el teclado (`keydown`/`keyup` en `window`, con `preventDefault` en las flechas, y limpieza de teclas en `blur`), corre el bucle con `requestAnimationFrame` y lo cancela en el cleanup. Carga los 15 PNG de `public/games/snake/` en un mapa de `Image` y lo pasa a `draw`. Aplica `paused`, `endRequest` y `restartRequest` desde props. Llama `onChange` al cambiar un valor. Verificación: `npx tsc --noEmit` y `npm run build` pasan.
5. **Conexión al reproductor.** En `components/player/game-player.tsx`, el reproductor renderiza la superficie de `SURFACES` para `snake`. PAUSA alterna `paused`. FIN incrementa `endRequest`. JUGAR DE NUEVO incrementa `restartRequest`. SALIR es el `Link` existente. Verificación en `npm run dev`: `/juegos/snake/jugar` muestra la grilla; PAUSA congela; FIN abre el modal; SALIR detiene el bucle.
6. **Guardado.** `save` envía `snapshot.score` del último `onChange`. El resto del flujo (GUARDAR, REINTENTAR, mensaje de éxito) queda igual. Verificación: al guardar, `scores` tiene una fila con `game_id = 'snake'` y el `score` del HUD.
7. **Migración y catálogo.** Crear `supabase/migrations/20261006140000_snake.sql` y aplicarla con `apply_migration` solo cuando el juego funcione en local. Verificación: `list_tables` muestra `games` sin ninguna fila con `id = 'serpentina'`; `scores` no tiene filas con `game_id = 'serpentina'`.
8. **Verificación final.** Ejecutar `npm run build`, `npm run lint` y `npx tsc --noEmit`. Revisar en `npm run dev` las rutas de los criterios.

Cada paso deja la aplicación construible. El paso 5 es el primero en que el juego se ve. El paso 7 cambia datos y se hace después de que el juego funcione en local. El último paso no es "probar todo"; esa verificación está en los criterios de aceptación.

---

## Criterios de aceptación

- [x] `npm run build` termina sin errores.
- [x] `npm run lint` termina sin errores.
- [x] `npx tsc --noEmit` termina sin errores.
- [x] `/juegos/snake/jugar` responde HTTP 200 y muestra el título "SNAKE" en el HUD.
- [x] `/juegos/serpentina/jugar` responde HTTP 404.
- [ ] `/games` muestra el juego con el título "SNAKE" y categoría ARCADE.
- [ ] `←` `→` `↑` `↓` cambian la dirección de la serpiente.
- [ ] Pedir la dirección opuesta a la actual no hace girar la serpiente sobre sí misma.
- [ ] Las flechas no desplazan la página.
- [ ] Comer una fruta suma 10 puntos y la serpiente crece una celda.
- [ ] La fruta nunca aparece sobre el cuerpo de la serpiente.
- [ ] Cada 5 frutas comidas, el NIVEL sube en 1 y la serpiente se mueve un 5 % más rápido, sin pasar de 7,168 pasos por segundo.
- [ ] Chocar con una pared termina la partida: el estado pasa a `gameover` y el modal de guardado se abre.
- [ ] Chocar con el propio cuerpo termina la partida. Pisar la celda que la cola libera en el mismo paso no termina la partida.
- [ ] PAUSA congela la serpiente y la puntuación. REANUDAR continúa desde el mismo punto.
- [ ] FIN termina la partida y abre el modal de guardado con la puntuación actual.
- [ ] El HUD fuera del canvas muestra PUNTUACIÓN y NIVEL, se actualiza sin recargar y no muestra vidas.
- [ ] El panel CONTROLES lista `←` `→` `↑` `↓` y no lista ninguna tecla de pausa.
- [ ] JUGAR DE NUEVO reinicia la partida con 3 celdas de serpiente, nivel 1 y puntuación 0, sin recargar la página.
- [ ] `onChange` no se llama en frames en los que no cambia puntuación, nivel o estado.
- [ ] El estado de la partida vive en el canvas. `grep` de `useState` en `snake-canvas.tsx` no devuelve estado de la serpiente, la fruta ni la grilla.
- [ ] Un guardado exitoso crea una fila en `scores` con `game_id = 'snake'` y `score` igual a la puntuación del HUD.
- [ ] Si el guardado falla, el modal muestra el error y REINTENTAR envía el mismo `score`.
- [ ] Al cambiar la ventana de foco, las teclas quedan liberadas: la serpiente deja de girar.
- [ ] Salir de `/juegos/snake/jugar` a otra ruta detiene el bucle. No hay errores en consola.
- [ ] Los juegos distintos de `snake` siguen con su superficie o HUD placeholder sin cambios.
- [ ] La fruta se dibuja con `public/games/snake/apple.png`, no con un círculo de respaldo.
- [ ] La cabeza usa `head_<dirección actual>.png`. Cada tramo del cuerpo usa `body_*` según los dos lados que une. La cola usa `tail_<dirección>.png` según el tramo anterior. Ningún tramo queda sin sprite.
- [ ] `grep` de `react`, `next` y `document` en `lib/games/snake/` no devuelve resultados.
- [ ] En `scores`, no hay filas con `game_id = 'serpentina'`, y la clave foránea `scores_game_id_fkey` sigue existiendo con `on delete cascade`.
- [ ] `get_advisors` no reporta tablas sin RLS.
- [ ] A 375 px de ancho, `/juegos/snake/jugar` no tiene scroll horizontal.
- [ ] Ningún archivo fuera de `lib/games/snake/`, `lib/games/registry.ts`, `components/player/`, `public/games/snake/`, `supabase/migrations/` y `specs/` cambia.
- [x] `references/` no cambia.

---

## Decisiones tomadas y descartadas

- **Sí: motor puro en `lib/games/snake/`.** Igual que Asteroides, Tetris y Arkanoid. La lógica se revisa con `tsc` sin navegador. Descartado: lógica dentro del componente, porque mezcla el bucle con las reglas.
- **Sí: estado en `useRef` y `onChange` solo al cambiar.** Evita que React re-renderice por frame. Igual que SPEC 05 y 07.
- **Sí: controles por comandos (`paused`, `endRequest`, `restartRequest`).** Igual que SPEC 05 y 07.
- **Sí: controles de teclado solo con flechas y pausa por el botón PAUSA.** Pedido en la definición. Descartada la tecla P: es un control nuevo que no se pidió.
- **Sí: una vida, fin al chocar.** Snake clásico. Pedido en la definición. Descartadas 3 vidas: con la serpiente, la vuelta al centro no tiene sentido de juego.
- **Sí: `showLives: false` y `lives: 0` en el snapshot.** Snake no tiene vidas. Mismo criterio que Tetris (SPEC 07), sin cambiar `GameSnapshot`.
- **Sí: 10 puntos por fruta, sin tipos de fruta.** Pedido en la definición. Descartado el valor por tipo: exige saber cuántas frutas hay en el sprite sheet, y ese archivo no está en el repo.
- **Sí: paredes que matan.** Pedido en la definición. Descartado el modo toroidal, que se usa en Asteroides, porque en Snake es otra mecánica.
- **Sí: categoría ARCADE y color `green`.** Pedido en la definición. Son los valores que ya tiene `serpentina` en el catálogo.
- **Sí: renombrar `serpentina` a `snake`, con título `SNAKE`.** Mismo criterio que SPEC 05 (`rocas` → `asteroides`) y SPEC 08 (`bloque-buster` → `arkanoid`): el id y el título pasan al nombre del juego original. Descartada una fila nueva, porque dejaría dos entradas casi iguales en `/games`.
- **Sí: conservar `short`, `long`, `cover` (`cover-snake`), `best` y `plays`.** Evita tocar la portada y los datos de muestra del catálogo.
- **No: cambiar `short` y `long` en esta spec.** El texto actual habla de "núcleos magenta" y no de frutas. Descartado reescribirlo aquí: es copy de catálogo, y debe ir en una spec o cambio propio.
- **No: tocar `lib/data/home.ts`.** Muestra "Serpentina" en datos estáticos de la portada. Descartado cambiarlo aquí: está fuera del reproductor. Queda como pendiente de copy.
- **No: panel con LÍNEAS ni vista previa.** Snake no tiene líneas ni una pieza siguiente. El panel del contrato de SPEC 07 se cumple con PUNTUACIÓN, NIVEL y CONTROLES.
- **Sí: reanudar el registro con `SURFACES`, sin tocar `game-player.tsx` más allá de la conexión.** Igual que SPEC 07.
- **Sí: el generador de frutas recibe `random`.** `createGame` y `step` usan `Math.random` por defecto. Así una prueba puede fijar la semilla sin cambiar el motor.
- **Sí: guardado al final de la partida.** Igual que SPEC 05 y 08.
- **Sí: `cover-snake` ya existe en `app/globals.css`.** No se añade CSS en esta spec.
- **Sí: celda de 40 px, grilla de 20 × 15, canvas sin cambio.** Pedido tras la prueba manual: la grilla y la serpiente del doble de tamaño. Con el canvas fijo en 800 × 600, la única forma de duplicar la celda es bajar el número de celdas. Descartado 40 × 30 celdas de 40 px: el canvas pasaría a 1600 × 1200 y en pantalla se vería igual de pequeño.
- **Sí: velocidad −20 % y +5 % por nivel.** Pedido tras la prueba manual: nivel 1 de 8 a 6,4 pasos/s, tope de 14 a 11,2. Segunda ronda, pedido tras probar: otro −20 %, nivel 1 de 6,4 a 5,12 pasos/s y tope de 11,2 a 8,96. Tercera ronda: otro −20 %, nivel 1 de 5,12 a 4,096 pasos/s y tope de 8,96 a 7,168. El aumento por nivel pasa de +1 paso/s a ×1,05 por nivel, con el mismo cambio de nivel cada 5 frutas.

**Sprites (resuelto):**

- **Fuente de los sprites.** El sprite sheet `fruits.png` de la versión original no estaba en el repo. El usuario reemplazó los archivos por PNG sueltos de 40 × 40 (`apple.png`, `head_*`, `body_*`, `tail_*`), obtenidos de internet. El usuario confirmó que tienen licencia libre para usar y guardar en el repo.
- **Fruta.** `apple.png` en lugar de un recorte de sprite sheet. Una sola fruta, sin coordenadas.
- **Serpiente con sprites.** Se usan los 14 PNG de serpiente, que la versión inicial de esta spec no pedía. Reglas de selección en Modelo de datos.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Los PNG vienen de internet y su licencia depende de la fuente. | El usuario confirmó licencia libre. Anotar la fuente exacta de cada PNG antes de commitear. |
| Velocidad demasiado alta en el nivel 3 o superior, injugable. | Tope de 7,168 pasos por segundo. Ajustable en la constante, con criterio de nivel verificable. |
| La cola libera celda en el mismo paso y el choque con el cuerpo da falsos positivos. | Criterio explícito: pisar la celda que la cola libera no termina la partida. |
| Tecla de flecha pegada si la ventana pierde el foco antes del `keyup`. | Limpiar las teclas en el evento `blur` de `window`. Criterio de foco en la lista. |
| El modo estricto de React monta el efecto dos veces y deja dos bucles activos. | El cleanup cancela el `requestAnimationFrame` pendiente. Criterio de salida de ruta. |
| La migración falla si `scores` tiene filas con `serpentina` y la clave foránea no se quita antes del renombrado. | El SQL quita la clave, renombra, mueve las filas y la vuelve a crear, en ese orden. Revisar antes de `apply_migration`. |
| Si el proyecto de Supabase es de producción, renombrar afecta datos reales. | Revisar el SQL antes de aplicar. Si hay duda, probar primero con `create_branch`. |
| El texto `long` del catálogo no describe el juego (habla de núcleos, no de frutas). | Aceptado en esta spec. Se corrige en un cambio de copy. |

---

## Lo que **no** está en esta spec

- Audio.
- Tecla de pausa y pausa automática al perder el foco.
- Modos de juego (paredes toroidales, obstáculos, dos jugadores).
- Tipos de fruta con puntos distintos.
- Redirección de `/juegos/serpentina`.
- Cambios de copy en `short`, `long` o `lib/data/home.ts`.
- Ranking por nivel, longitud o tiempo.
- Anti-trampas y validación de la puntuación según la jugada.
