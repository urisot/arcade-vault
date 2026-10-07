# SPEC 06 — Leaderboard por jugador y por juego

> **Estado:** Implementado
> **Depende de:** SPEC 04
> **Fecha:** 2026-10-05
> **Objetivo:** Mostrar un ranking por juego en `/juegos/[id]` y un ranking global por jugador en `/salon`, contando cada nombre una vez por juego con su mejor partida.

---

## Alcance

**Dentro:**

- Vista `best_scores` en Supabase: la mejor partida de cada nombre en cada juego. Las filas de `scores` no se borran ni se modifican; son el historial.
- Función `global_ranking(p_cat, p_limit)` en Supabase: suma, por nombre, los mejores scores de cada juego. Acepta una categoría opcional.
- Lectura en `lib/scores-db.ts`: `getBestScores(gameId, limit = 10)` para el ranking por juego y `getGlobalRanking(cat, limit = 10)` para el global. Reemplazan `getTopScores` y `getTopScoresByGame` de SPEC 04.
- Validación de la categoría en `lib/scores.ts` (`validateCategory`), con los valores `ARCADE`, `PUZZLE`, `SHOOTER` y `VERSUS`.
- `/juegos/[id]`: la tabla de puntuaciones muestra el ranking por juego de `getBestScores`.
- `/salon`: muestra solo el ranking global, con un selector de categoría por URL (`?cat=PUZZLE`). Las tablas por juego salen de esta página.
- `POST /api/scores` llama a `revalidatePath` tras insertar, para que la fila nueva aparezca en `/salon` y en `/juegos/[id]` sin esperar.
- Migración `supabase/migrations/20261005140000_leaderboard.sql`.

**Fuera de alcance (para specs futuras):**

- Autenticación y propiedad del nombre. Hasta entonces, dos personas con el mismo nombre son el mismo jugador.
- Pestañas por categoría en `/salon`. Solo hay selector.
- Paginación o botón "ver más". El límite es 10 puestos.
- Historial de partidas por jugador (página de perfil).
- Ranking por nivel o tiempo de partida.
- Tiempo real (suscripciones).
- Anti-trampas y validación de la puntuación según la jugada. Ver SPEC 04.
- Cambios en `best` y `plays` del catálogo. Siguen siendo columnas editables a mano (SPEC 04).
- Cambios en la interfaz visual más allá de las tablas y el selector. Si hace falta diseño nuevo, se usa `frontend-design`.

---

## Modelo de datos

Este feature no cambia la tabla `scores`. Introduce una vista y una función de lectura en la misma migración.

```sql
-- supabase/migrations/20261005140000_leaderboard.sql

create view public.best_scores with (security_invoker = true) as
select distinct on (game_id, name) game_id, name, score, created_at
from public.scores
order by game_id, name, score desc, created_at asc;

-- Un nombre por juego. Empate de score: gana la fila más antigua.
-- Distingue mayúsculas: "Ana" y "ana" son filas distintas.

create function public.global_ranking(p_cat text default null, p_limit int default 10)
returns table (name text, total bigint, first_at timestamptz)
language sql stable security invoker as $$
  select b.name, sum(b.score)::bigint, min(b.created_at)
  from public.best_scores b
  join public.games g on g.id = b.game_id
  where p_cat is null or g.cat = p_cat
  group by b.name
  order by 2 desc, 3 asc
  limit p_limit;
$$;
```

Reglas de desempate:

- Ranking por juego: score más alto primero. Empate: `created_at` más antiguo primero.
- Ranking global: total más alto primero. Empate: `first_at` más antiguo primero, es decir, el `created_at` más antiguo de las mejores partidas del nombre.

Tipos de lectura en `lib/data/scores.ts`:

```ts
type BestScoreRow = { rank: number; name: string; score: number; date: string };  // ranking por juego
type GlobalRow = { rank: number; name: string; total: number };                   // ranking global
```

La fecha se formatea "dd/mm/yyyy" desde `created_at`, como en SPEC 04. El ranking global no muestra fecha.

Conventions:

- `best_scores` y `global_ranking` se leen con el cliente público (`lib/supabase/public.ts`). No hay escritura nueva.
- La categoría llega por URL y se valida con `validateCategory`. Un valor no válido se trata como "TODAS".
- `revalidatePath` se llama solo tras una inserción correcta en `POST /api/scores`.

---

## Plan de implementación

1. **Migración.** Crear `supabase/migrations/20261005140000_leaderboard.sql` con la vista `best_scores` y la función `global_ranking`. Revisar el SQL y aplicarlo con `apply_migration`. Verificación: `execute_sql` con `select * from best_scores limit 1` devuelve filas; `select * from global_ranking(null, 10)` devuelve hasta 10 filas; `list_tables` muestra `scores` con el mismo número de filas que antes de la migración.
2. **Lectura en servidor.** En `lib/scores-db.ts`, añadir `getBestScores` y `getGlobalRanking` con el cliente público. En `lib/scores.ts`, añadir `validateCategory`. Quitar `getTopScores` y `getTopScoresByGame`. Verificación: `npx tsc --noEmit` pasa.
3. **Revalidación.** En `app/api/scores/route.ts`, tras un `insertScore` correcto, llamar a `revalidatePath("/salon")` y `revalidatePath("/juegos/[id]", "page")`. Leer `node_modules/next/dist/docs/` para la forma correcta de `revalidatePath` en Next 16 antes de escribir. Verificación: `npx tsc --noEmit` pasa; `POST /api/scores` válido responde 200.
4. **Detalle del juego.** En `app/juegos/[id]/page.tsx`, reemplazar la lectura de puntuaciones por `getBestScores(id, 10)`. Verificación: `/juegos/bloque-buster` muestra una fila por nombre, con el mejor score de ese nombre.
5. **Salón global.** En `app/salon/page.tsx`, leer `searchParams` (Promise en Next 16), validar `cat` con `validateCategory` y pasar `getGlobalRanking(cat, 10)` a `components/hall/hall-of-fame.tsx`. Reescribir `hall-of-fame.tsx` para mostrar una sola tabla GLOBAL con el selector TODAS / ARCADE / PUZZLE / SHOOTER / VERSUS como enlaces a `?cat=`. Quitar `export const revalidate = 60` de la página. Si no hay filas, mostrar "SIN PUNTUACIONES AÚN". Verificación: `/salon` muestra la tabla global; `/salon?cat=PUZZLE` solo suma juegos de PUZZLE.
6. **Limpieza.** Quitar de `lib/scores-db.ts` y `hall-of-fame.tsx` el código de SPEC 04 que ya no se usa. Verificación: `grep` de `getTopScores`, `getTopScoresByGame` y `revalidate = 60` en `app/` y `components/` no devuelve resultados.
7. **Verificación final.** Ejecutar `npm run build`, `npm run lint` y `npx tsc --noEmit`. Revisar en `npm run dev` las rutas de los criterios.

Cada paso deja la aplicación construible. El paso 1 cambia solo lectura de la base; no altera filas de `scores`. El paso 5 es el primero en que el cambio se ve. El último paso no es "probar todo"; esa verificación está en los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npx tsc --noEmit` termina sin errores.
- [ ] La vista `best_scores` y la función `global_ranking` existen en el proyecto, tras `apply_migration`.
- [ ] El número de filas de `scores` es el mismo antes y después de la migración.
- [ ] Un nombre con tres partidas en el mismo juego aparece una sola vez en ese ranking, con el score más alto de las tres.
- [ ] Dos partidas con el mismo score en el mismo juego: la fila con `created_at` más antiguo aparece primero.
- [ ] "Ana" y "ana" aparecen como filas distintas en el mismo ranking.
- [ ] Un nombre con mejores partidas en dos juegos aparece en `/salon` con la suma de ambos mejores.
- [ ] `/salon` muestra una sola tabla GLOBAL, con como máximo 10 filas.
- [ ] `/salon` no muestra tablas por juego.
- [ ] `/salon?cat=PUZZLE` suma solo los juegos con `cat = 'PUZZLE'`.
- [ ] `/salon?cat=NOEXISTE` muestra el ranking TODAS, como un valor sin categoría.
- [ ] Un ranking sin filas muestra "SIN PUNTUACIONES AÚN".
- [ ] `/juegos/[id]` muestra como máximo 10 filas, sin nombres repetidos, con el mejor score de cada nombre.
- [ ] Tras un `POST /api/scores` válido, la fila nueva aparece en `/salon` y en `/juegos/[id]` al recargar, sin esperar 60 s.
- [ ] `POST /api/scores` con `{}` sigue respondiendo HTTP 400 `invalid`.
- [ ] `POST /api/scores` con `SUPABASE_SECRET_KEY` incorrecta sigue respondiendo HTTP 500 `db_failed`.
- [ ] Con la clave publicable, un `insert` directo en `scores` sigue fallando (sin cambio de RLS).
- [ ] `get_advisors` no reporta tablas sin RLS ni la vista como `SECURITY DEFINER`.
- [ ] `grep` de `getTopScores`, `getTopScoresByGame` y `revalidate = 60` en `app/` y `components/` no devuelve resultados.
- [ ] Ningún archivo fuera de `app/`, `components/`, `lib/`, `supabase/migrations/` y `specs/` cambia.

---

## Decisiones tomadas y descartadas

- **Sí: ranking por juego en `/juegos/[id]` y global en `/salon`.** Lo elegiste. Descartado: dos páginas nuevas, porque `/salon` ya existe y el ranking global encaja ahí.
- **Sí: un nombre por juego, con su mejor partida.** Sin autenticación, el nombre es lo único que identifica al jugador. Descartado: todas las partidas, porque un nombre llena el ranking. Las filas de `scores` se conservan como historial.
- **Sí: ranking global como suma de mejores por juego.** Descartado: suma de todas las partidas (premia jugar mucho, no jugar bien) y mejor partida global (compara juegos con escalas de puntos distintas).
- **Sí: categoría como filtro por URL en la vista global.** Descartado: pestañas por categoría, por ahora. El filtro basta y no añade rutas. Por URL la página se puede compartir y no necesita estado de React.
- **Sí: SPEC 04 se reemplaza en `/salon`.** El criterio de SPEC 04 "`/salon` muestra el top 10 real por juego" queda sin efecto. Las tablas por juego pasan a `/juegos/[id]`.
- **Sí: `revalidatePath` tras guardar, sin `revalidate = 60`.** Lo elegiste: la fila aparece al instante. Descartado: mantener la caché de 60 s de SPEC 04, porque el retraso de un minuto ya no se acepta.
- **Sí: top 10.** Lo elegiste. Descartado: top 50 con "ver más", por ahora. Cabe en pantalla y no pide paginación.
- **Sí: distinguir mayúsculas en el nombre.** Lo elegiste. Descartado: ignorar mayúsculas, que obligaría a normalizar al guardar y cambia el dato guardado.
- **Sí: empates por fecha, la más antigua gana.** Es la regla más simple que no depende de datos del jugador.
- **Sí: vista con `security_invoker = true`.** Así las políticas de RLS de `scores` aplican a la vista. Descartado: vista con permisos del dueño, que saltaría RLS.
- **Sí: esperar a que SPEC 04 cierre antes de implementar.** Lo elegiste. SPEC 04 tiene pendientes la clave secreta y las pruebas de escritura, y esta spec depende de la escritura.
- **No: autenticación ni propiedad del nombre.** Es una spec propia, como en SPEC 04.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Dos personas con el mismo nombre se suman en el ranking. | Aceptado sin autenticación. Se resuelve con la spec de auth. |
| La función `global_ranking` se vuelve lenta con muchas filas. | Usa el índice `scores_game_score_idx` en la vista. Si hace falta, se evalúa una tabla de totales en una spec propia. |
| Un nombre con espacios distintos se cuenta como otro jugador. | El límite de `name` ya hace `trim()` en la validación de SPEC 04. Sin cambio. |
| Si SPEC 04 cambia la clave o las políticas antes de implementar, la vista hereda el cambio. | Esta spec se implementa después de cerrar SPEC 04. Revisar la migración antes de `apply_migration`. |
| `revalidatePath` no refresca una página que ya está en caché del navegador. | Aceptado. Al recargar la página, el servidor responde con datos nuevos. |

---

## Lo que **no** está en esta spec

- Autenticación, sesiones y propiedad del nombre.
- Pestañas por categoría y paginación.
- Historial o página de perfil del jugador.
- Ranking por nivel o tiempo.
- Tiempo real en `/salon`.
- Anti-trampas y validación de la puntuación según la jugada.
