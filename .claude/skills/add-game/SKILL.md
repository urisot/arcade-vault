---
name: add-game
description: Crea la spec de un juego nuevo para Arcade Vault (portado de references/started-games/ o descrito desde cero) con motor puro, canvas jugable, guardado en el leaderboard y registro en el reproductor. Escribe la spec en Borrador; la implementación la hace /spec-impl tras la aprobación.
disable-model-invocation: true
argument-hint: <nombre-del-juego | 03-tetris | 04-arkanoid>
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(git status:*), Bash(git branch:*)
---

# /add-game — Spec de un juego nuevo para la plataforma

## Session context

Fecha de hoy (usar para la cabecera de la spec, nunca adivinar):
!`date +%F`

Specs que ya existen:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No hay references/started-games/"`

Estado del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

---

## Qué hace este skill

Escribe **una spec** en `specs/NN-<slug>.md`, en estado `Borrador`. No escribe código, no toca `references/`, no aplica migraciones y no crea ramas. La implementación la hace `/spec-impl` después de que una persona cambie el estado a `Aprobado`.

El patrón a seguir es el de `specs/05-asteroides-en-plataforma.md` (juego jugable) y `specs/06-leaderboard-jugadores.md` (ranking). Ambas están implementadas: el ranking ya es genérico, así que un juego nuevo no lo modifica.

Antes de escribir, lee las reglas de `/spec` (`.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md`) y las specs 05 y 06 como ejemplo. Plantilla propia del juego: `template.md` (en esta misma carpeta). Guía para portar JS vanilla: `porting.md`.

---

## Argumento

El argumento recibido es: `$ARGUMENTS`

- Si coincide con una carpeta de `references/started-games/` (`03-tetris`, `04-arkanoid`, `02-asteroids`, o el nombre completo), el juego es un **port**. Ir a Fase 1, modo port.
- Si es texto libre (una descripción del juego), el juego es **desde cero**. Ir a Fase 1, modo descripción.
- Si está vacío: listar los juegos de referencia y pedir a la persona que elija o describa uno. Parar y esperar.

---

## Fase 1 — Entender el juego

### Modo port

1. Leer `references/started-games/<carpeta>/CLAUDE.md`, `README.md`, `game.js` e `index.html`. Si hay `levels.js` o `assets/`, leerlos también.
2. Anotar, sin copiar código todavía:
   - Estado de partida (qué vive en memoria: posiciones, listas, contadores).
   - Constantes que definen la física o la dificultad, con sus valores exactos.
   - Reglas de puntuación, vidas, niveles y condición de fin.
   - Controles (teclas) y si hay pausa.
   - Assets (sonidos, sprites). Los sonidos quedan fuera de alcance salvo que la persona los pida.
3. Preguntar solo lo que el código no resuelve: nombre final del juego (`title`), categoría (`ARCADE`, `PUZZLE`, `SHOOTER`, `VERSUS`), color de acento (`cyan`, `magenta`, `green`, `yellow`), y si se conserva el título original.

### Modo descripción

1. Preguntar lo que falte, en una sola ronda con `AskUserQuestion` (máximo 4 preguntas):
   - Controles.
   - Cómo se gana puntos y cómo se pierde la partida.
   - Número de vidas, niveles o condición de fin.
   - Categoría y color.
2. Si la descripción es clara, no preguntar. Anotar las suposiciones en la sección de decisiones de la spec.

---

## Fase 2 — Leer /spec y escribir la spec

### Paso 2.0 — Leer la referencia de /spec (antes de crear nada)

Antes de escribir el archivo, leer con `Read`:

1. `.claude/skills/spec/SKILL.md`: reglas de escritura del método spec-driven. Interesa sobre todo:
   - Objetivo en **una frase**. Si no cabe, la feature es demasiado grande: partirla.
   - **Alcance** con dos bloques obligatorios: "Dentro" y "Fuera de alcance". El "fuera" debe ser explícito.
   - **Criterios de aceptación** verificables con sí o no. Prohibidos los vagos ("que funcione bien").
   - **Decisiones** con motivo, incluidas las descartadas. Es la sección de más valor a largo plazo.
   - Estado por defecto `Borrador` (equivalente a `Draft`). Nunca `Aprobado` por defecto.
   - Dependencias: comprobar que cada `SPEC NN` referenciado existe en `specs/`. Si no existe, decirlo; no dejar referencias colgando.
   - Fecha: solo la de la sección de contexto de este skill. Nunca inventarla.
   - No escribir código. No proponer implementar tras guardar. Parar al confirmar.
   - Si `specs/.spec-config.yml` falta, crearlo con el contenido por defecto de /spec. Si existe, no tocarlo.
   - Si el archivo de destino ya existe, parar y preguntar. No sobrescribir.
2. `.claude/skills/spec/template.md`: forma de cada sección y orden. Usarlo como guía de estructura, no como texto a copiar.
3. `specs/05-asteroides-en-plataforma.md` y `specs/06-leaderboard-jugadores.md`: ejemplos reales del repo. Tomar de ellos el tono, el idioma y los encabezados en español.

Diferencia con /spec: **este skill no hace preguntas de diseño por bloques**. Las preguntas ya se hicieron en Fase 1. Aquí se escribe la spec completa de una vez y se guarda. Las reglas de forma y de contenido de /spec sí aplican.

Si `template.md` de este skill y el de /spec se contradicen, gana /spec para la forma general (encabezados, orden, criterios, decisiones). La **Fase 3** de este skill gana para el contenido específico de juegos. Dejar constancia de cualquier conflicto en la sección de decisiones de la spec.

### Paso 2.1 — Escribir

1. Número `NN`: siguiente al mayor de `specs/` (con dos dígitos). Slug: nombre del juego en minúsculas, sin acentos, con guiones. Archivo: `specs/NN-<slug>.md`.
2. Idioma: español, igual que las specs 05 y 06.
3. Cabecera (formato de las specs 05 y 06, con los estados en español de `specs/`):
   - `**Estado:** Borrador`
   - `**Depende de:**` SPEC 04 y SPEC 06, más SPEC 05 si el juego comparte algo con el reproductor de Asteroides. Verificar que existen.
   - `**Fecha:**` la de la sección de contexto.
   - `**Objetivo:**` una frase.
4. Secciones, en este orden (plantilla en `template.md`): Alcance (dentro / fuera), Modelo de datos, Plan de implementación, Criterios de aceptación, Decisiones tomadas y descartadas, Riesgos, Lo que no está en esta spec.
5. Rellenar la spec siguiendo la **Fase 3** de este skill. No dejar marcadores `{{...}}` ni `TODO`.

Si el archivo ya existe con ese nombre, parar y preguntar. No sobrescribir.

---

## Fase 3 — Contrato de integración (obligatorio)

Toda spec de juego debe cumplir estas reglas. Si una no aplica, la spec dice por qué.

**Motor y render**

- Motor puro en `lib/games/<slug>/engine.ts` con `createGame()` y `step(state, input, dt)`. `dt` se limita (por ejemplo 0.05 s) para evitar saltos al volver de otra pestaña.
- Render en `lib/games/<slug>/render.ts` con `draw(ctx, state)`. No crea elementos.
- Criterio verificable: `grep` de `react`, `next` y `document` en `lib/games/<slug>/` no devuelve resultados.

**Componente**

- `components/player/<slug>-canvas.tsx` es el dueño del juego. Estado de partida en `useRef`, nunca en `useState` ni en el reproductor.
- Bucle con `requestAnimationFrame`, cancelado en el cleanup del efecto (cubre el modo estricto de React).
- Teclado: `keydown`/`keyup` en `window`, `preventDefault` en las teclas de juego, limpieza de teclas en `blur`.
- Comandos por props, no métodos imperativos: `paused: boolean`, `endRequest: number`, `restartRequest: number`.
- `onChange(snapshot)` solo cuando cambia `score`, `lives`, `level`, `lines` o `status`. Nunca por frame.
- `GameSnapshot` y `GameStatus` viven en `lib/games/types.ts`, compartidos por todos los juegos. `lines?` es opcional: lo envían los juegos que lo tengan, los demás no.
- **Panel lateral (obligatorio en juegos con tablero o marcador).** El componente dibuja un panel a la derecha del área de juego, centrado dentro de `.crt-screen`, con: PUNTUACIÓN, LÍNEAS (si el juego envía `lines`), NIVEL, una vista previa o ayuda visual del siguiente elemento (si aplica) y CONTROLES. CONTROLES lista solo las teclas que el juego usa, con la misma nomenclatura que el teclado (`←` `→` `↑` `↓` `Espacio`, etc.). Sin tecla de pausa salvo que el juego la implemente. El panel usa las clases del HUD (`hud-stat`, `.l`, `.v`). Su estado es un `useState` con el último snapshot; nunca tablero, pieza ni estado de partida.
- En juegos sin panel natural (p. ej. una pantalla de un solo elemento), la spec lo justifica en Decisiones y lo deja fuera.

**Leaderboard**

- Guardado con `POST /api/scores` con cuerpo `{ game, name, score }`. `score` es el del último `onChange`, no se recalcula al guardar.
- Respuesta 400 `invalid` con `{}`; 500 `db_failed` con clave incorrecta. Estas respuestas no cambian.
- No se toca `lib/scores-db.ts`, `lib/scores.ts` ni `/salon`. El ranking por juego sale de `getBestScores(id)` sin cambios.

**Base de datos**

- Migración en `supabase/migrations/<AAAAMMDDHHMMSS>_<slug>.sql`, con un `insert into public.games (...)` de las columnas `id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`.
- `cat` debe estar en `ARCADE`, `PUZZLE`, `SHOOTER`, `VERSUS`. `color` en `cyan`, `magenta`, `green`, `yellow`. Ambos tienen `check` en la base.
- `best` empieza en 0 y `plays` como texto (`"0"`).
- La migración **no** modifica `scores`. Aplicarla es decisión de la persona con `apply_migration`, no de este skill.
- Columna `cover` = nombre de clase nueva, por ejemplo `cover-<slug>`, con su regla en `app/globals.css`. Diseñar la portada con `frontend-design`, según `CLAUDE.md`.

**Reproductor (cambio compartido)**

- `components/player/game-player.tsx` hoy compara `game.id === "asteroides"`. La spec incluye generalizarlo: un registro `id → superficie de juego` (por ejemplo en `lib/games/registry.ts`) con los componentes `<slug>-canvas` y `asteroids-canvas`.
- Los juegos sin superficie registrada siguen con el HUD placeholder, sin cambios.
- El botón PAUSA alterna `paused`; FIN incrementa `endRequest`; JUGAR DE NUEVO incrementa `restartRequest`; SALIR es el `Link` existente.

**Alcance de archivos**

- La spec lista los archivos que puede cambiar. Lo normal: `lib/games/<slug>/`, `lib/games/types.ts`, `lib/games/registry.ts`, `components/player/`, `components/player/game-player.tsx`, `supabase/migrations/`, `app/globals.css`, `specs/`.
- Fuera de alcance siempre: `references/`, `lib/scores*`, `app/salon/`, `app/api/scores/`.

**Criterios de aceptación obligatorios** (además de los propios del juego):

- `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- `/juegos/<slug>/jugar` responde 200 y muestra el título en el HUD.
- Un juego distinto de `<slug>` sigue con el HUD placeholder.
- Tras un guardado exitoso, aparece una fila en `scores` con `game_id = '<slug>'` y el `score` del HUD.
- Si el guardado falla, el modal muestra el error y REINTENTAR envía el mismo `score`.
- Salir de la ruta detiene el bucle, sin errores en consola.
- `references/` no cambia.

---

## Fase 4 — Reproductor

Cubierto por la Fase 3, pero la spec debe describirlo como paso propio del plan, con su verificación: al abrir `/juegos/<slug>/jugar` se renderiza la superficie del registro; `/juegos/asteroides/jugar` sigue igual.

---

## Fase 5 — Cierre

Mostrar al usuario:

```
✅ Spec escrita: specs/NN-<slug>.md (Estado: Borrador)

Resumen:
  Juego:      <title> (<cat>, <color>)
  Origen:     references/started-games/<carpeta> | descripción
  Motor:      lib/games/<slug>/engine.ts, render.ts
  Canvas:     components/player/<slug>-canvas.tsx
  Migración:  supabase/migrations/<archivo>.sql (no aplicada)

Siguiente paso:
  1. Revisa la spec. Si hay que cambiar algo, dilo y la ajusto.
  2. Cuando esté lista, cambia su estado a "Aprobado" tú mismo.
  3. Ejecuta /spec-impl NN-<slug>.
  4. Aplica la migración con apply_migration cuando el juego funcione en local.
```

Decisiones tomadas sin preguntar (listarlas en la spec y aquí si las hay). No implementar nada en este skill.
