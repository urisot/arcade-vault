# SPEC {{NN}} — {{Título del juego}}

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 06{{, SPEC 05 si comparte el reproductor de Asteroides}}
> **Fecha:** {{AAAA-MM-DD}}
> **Objetivo:** {{Una frase: qué juego, dónde se juega y que la puntuación llega al leaderboard.}}

---

## Alcance

**Dentro:**

- Motor puro en `lib/games/{{slug}}/engine.ts`: {{estado de partida, reglas, puntuación, vidas, niveles}}. Sin React ni DOM.
- Render en `lib/games/{{slug}}/render.ts`: dibuja el estado en un `CanvasRenderingContext2D`. {{Estilo visual: original / nuevo.}}
- Componente cliente `components/player/{{slug}}-canvas.tsx`: dueño del juego. Canvas {{ancho}}×{{alto}}, estado en `useRef`, bucle con `requestAnimationFrame`, `onChange` solo al cambiar un valor.
- Panel lateral dentro de `{{slug}}-canvas.tsx`, a la derecha del área de juego y centrado en `.crt-screen`: PUNTUACIÓN, {{LÍNEAS si aplica}}, NIVEL, {{vista previa del siguiente elemento, si aplica}}, CONTROLES con las teclas reales del juego ({{lista de teclas y acción}}). Estilo con las clases del HUD (`hud-stat`). Sin tecla de pausa salvo que el juego la implemente.
- Tipos compartidos en `lib/games/types.ts` (`GameSnapshot`, `GameStatus`) y registro `id → superficie` en `lib/games/registry.ts`. Si ya existen (por una spec anterior), se reutilizan.
- Integración en `components/player/game-player.tsx`: el reproductor renderiza la superficie registrada para `{{slug}}`. Los demás juegos conservan el HUD placeholder.
- Guardado: al terminar la partida (game over o FIN), `POST /api/scores` con `{ game: "{{slug}}", name, score }`.
- Migración `supabase/migrations/{{AAAAMMDDHHMMSS}}_{{slug}}.sql`: inserta la fila de `games`.
- Portada: clase `cover-{{slug}}` en `app/globals.css`.

**Fuera de alcance (para specs futuras):**

- Audio{{, salvo que se pida}}.
- Tecla de pausa (P o Esc). La pausa es solo el botón PAUSA del HUD.
- Pausa automática al perder el foco.
- Ranking por nivel o tiempo de partida.
- Anti-trampas y validación de la puntuación según la jugada (ver SPEC 04).
- Cambios en `lib/scores-db.ts`, `lib/scores.ts`, `/salon` o `app/api/scores/`.
- Cambios en `references/`.
{{- Otros puntos fuera de alcance.}}

---

## Modelo de datos

Sin persistencia nueva. La tabla `scores` se reutiliza de SPEC 04. La migración solo inserta una fila en `games`.

```ts
// lib/games/{{slug}}/engine.ts
type Input = { {{controles, p. ej. left: boolean; right: boolean; fire: boolean}} }; // fire = pulsación de un frame

type GameState = {
  status: GameStatus;
  score: number;      // puntos acumulados; es el valor que se guarda
  lives: number;      // {{valor inicial}}
  level: number;      // 1 al empezar
  {{resto del estado}}
};

// Exports: createGame(): GameState
// Exports: step(state: GameState, input: Input, dt: number): GameState
// dt se limita a {{0.05}} s para evitar saltos al volver de otra pestaña.
```

```ts
// lib/games/types.ts (compartido)
export type GameStatus = "playing" | "dead" | "gameover";
export type GameSnapshot = { score: number; lives: number; level: number; status: GameStatus };
```

```ts
// Props de {{Slug}}Canvas: comandos de React hacia el juego
type CanvasProps = {
  paused: boolean;             // PAUSA/REANUDAR. Congela el bucle sin reiniciar nada.
  endRequest: number;          // FIN incrementa este contador. El juego pasa a "gameover".
  restartRequest: number;      // JUGAR DE NUEVO incrementa este contador. Reinicia con createGame().
  onChange: (s: GameSnapshot) => void; // solo cuando cambia score, lives, level, lines o status
};
```

Migración:

```sql
-- supabase/migrations/{{AAAAMMDDHHMMSS}}_{{slug}}.sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays) values
  ('{{slug}}', '{{TÍTULO}}', '{{frase corta}}', '{{descripción larga}}', '{{ARCADE|PUZZLE|SHOOTER|VERSUS}}', 'cover-{{slug}}', '{{cyan|magenta|green|yellow}}', 0, '0');
```

Control del juego:

- Pausa, FIN y reinicio son comandos (props), no estado de partida. El reproductor no toca el estado del juego.
- SALIR es un `Link` a `/juegos/[id]`. Desmontar el canvas cancela el bucle.
- El estado de game over lo decide el juego (vidas en cero o FIN). El reproductor abre el modal con `status: "gameover"`.
- El guardado usa el `score` del último `onChange`.

Convenciones:

- `engine.ts` y `render.ts` no importan `react`, `next` ni nada del DOM.
- El estado del juego vive en un `useRef` dentro del canvas.

---

## Plan de implementación

1. **Motor puro.** Crear `lib/games/{{slug}}/engine.ts` con `createGame` y `step`. Verificación: `npx tsc --noEmit` pasa; `grep` de `react`, `next` y `document` en `lib/games/{{slug}}/` no devuelve resultados.
2. **Render.** Crear `lib/games/{{slug}}/render.ts` con `draw(ctx, state)`. Verificación: `npx tsc --noEmit` pasa.
3. **Tipos y registro.** Crear `lib/games/types.ts` y `lib/games/registry.ts` (si no existen) y registrar `{{slug}}`. Verificación: `npx tsc --noEmit` pasa.
4. **Canvas y bucle.** Crear `components/player/{{slug}}-canvas.tsx`. Teclado con `preventDefault` y limpieza en `blur`; `paused`, `endRequest`, `restartRequest` desde props; `onChange` al cambiar un valor. Verificación: `npx tsc --noEmit` y `npm run build` pasan.
5. **Reproductor.** En `components/player/game-player.tsx`, reemplazar la comparación con `"asteroides"` por el registro. Guardar solo el `GameSnapshot` de `onChange`. Verificación en `npm run dev`: la superficie se muestra; PAUSA congela; FIN abre el modal; SALIR detiene el bucle.
6. **Guardado.** `save` envía `snapshot.score`. El flujo GUARDAR / REINTENTAR queda igual. Verificación: al guardar, `scores` tiene una fila con `game_id = '{{slug}}'`.
7. **Migración y portada.** Crear el SQL en `supabase/migrations/` y la clase `cover-{{slug}}` en `app/globals.css` (diseño con `frontend-design`). Verificación: el SQL revisado; la aplicación con `apply_migration` la hace la persona.
8. **Verificación final.** `npm run build`, `npm run lint`, `npx tsc --noEmit`. Revisar en `npm run dev` los criterios.

Cada paso deja la aplicación construible. El paso 5 es el primero en que el juego se ve. El paso 7 cambia datos y se hace después de que el juego funcione en local.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npx tsc --noEmit` termina sin errores.
- [ ] `grep` de `react`, `next` y `document` en `lib/games/{{slug}}/` no devuelve resultados.
- [ ] `grep` de `useState` en `components/player/{{slug}}-canvas.tsx` solo devuelve el snapshot del panel. No hay estado de partida.
- [ ] El panel lateral muestra PUNTUACIÓN, NIVEL y los valores propios del juego, y CONTROLES con las teclas reales del juego.
- [ ] `/juegos/{{slug}}/jugar` responde HTTP 200 y muestra "{{TÍTULO}}" en el HUD.
- [ ] `onChange` no se llama en frames sin cambio de puntuación, vidas, nivel o estado.
- [ ] PAUSA congela el juego; REANUDAR continúa desde el mismo punto.
- [ ] FIN termina la partida y abre el modal con la puntuación actual.
- [ ] JUGAR DE NUEVO reinicia la partida sin recargar la página.
- [ ] Al cambiar el foco de la ventana, las teclas quedan liberadas.
- [ ] Salir de `/juegos/{{slug}}/jugar` detiene el bucle. Sin errores en consola.
- [ ] Un guardado exitoso crea una fila en `scores` con `game_id = '{{slug}}'` y `score` igual al HUD.
- [ ] Si el guardado falla, el modal muestra el error y REINTENTAR envía el mismo `score`.
- [ ] `POST /api/scores` con `{}` sigue respondiendo HTTP 400 `invalid`.
- [ ] `/juegos/asteroides/jugar` y los demás juegos siguen igual.
- [ ] `/salon` y `/juegos/[id]` muestran el ranking sin cambios de código.
- [ ] Ningún archivo fuera de la lista de alcance cambia. `references/` no cambia.

---

## Decisiones tomadas y descartadas

- **Sí: motor puro en `lib/games/{{slug}}/`.** Sin React ni DOM, se revisa con `tsc` y sin navegador.
- **Sí: estado en `useRef` y `onChange` solo al cambiar.** Evita re-renders de React por frame.
- **Sí: controles externos por comandos.** Descartado `useImperativeHandle`: acopla el reproductor a métodos internos.
- **Sí: guardado al final de la partida.** Descartado guardar al morir.
- **Sí: el ranking no cambia.** SPEC 06 ya es genérico para cualquier juego con fila en `games`.
{{- Decisiones propias del juego, con su motivo.}}

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Una tecla queda pegada si la ventana pierde el foco antes del `keyup`. | Limpiar teclas en `blur`. Criterio de foco. |
| El modo estricto de React monta el efecto dos veces y deja dos bucles. | El cleanup cancela el `requestAnimationFrame`. Criterio de salida de ruta. |
| La migración inserta una fila con `id` ya existente. | `id` es clave primaria: revisar antes de `apply_migration`. |
| El registro de superficies cambia `game-player.tsx` y puede romper Asteroides. | Criterio de regresión de `/juegos/asteroides/jugar`. |
| No hay test runner; la lógica del motor no tiene pruebas automáticas. | Verificación manual con `npm run dev` y `tsc`. |
{{- Riesgos propios del juego.}}

---

## Lo que **no** está en esta spec

- Audio{{, salvo que se pida}}.
- Tecla de pausa y pausa automática.
- Ranking por nivel o tiempo.
- Anti-trampas y validación de la puntuación según la jugada.
- Cambios en `references/`.
{{- Otros puntos.}}
