# SPEC 04 — Supabase: catálogo de juegos y puntuaciones

> **Estado:** Implemantado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-04
> **Objetivo:** Conectar la app a Supabase y mover el catálogo de juegos y las puntuaciones de localStorage y de datos de muestra a tablas con RLS.

---

## Alcance

**Dentro:**

- Cliente de Supabase con `@supabase/supabase-js`: cliente público (clave publicable, para el navegador y el servidor de lectura) y cliente administrador (clave secreta, solo servidor).
- Migración versionada en `supabase/migrations/` con las tablas `games` y `scores`, sus índices, RLS y la carga inicial de los 8 juegos de `GAMES`.
- Lectura del catálogo desde `games` en las páginas `/`, `/games`, `/juegos/[id]` y `/juegos/[id]/jugar`.
- Guardado de puntuaciones: `POST /api/scores` inserta en `scores`. El reproductor deja de usar `saveScore` y localStorage para puntuaciones.
- Salón (`/salon`) y detalle (`/juegos/[id]`) muestran el top 10 real por juego desde `scores`. Sin datos de muestra en esas vistas.
- Limpieza: se borran `GAMES`, `seededScores` y `lib/saved-scores.ts` cuando ya no tienen usos.
- Dependencias `@supabase/supabase-js` y `server-only` en `package.json` y `package-lock.json`.
- Variables de entorno documentadas en `.env.template`, el archivo que ya existe en el repo. No se crea ningún archivo nuevo de variables.

**Fuera de alcance (para specs futuras):**

- Autenticación con Supabase Auth, sesiones, middleware y rutas protegidas. Va en una spec propia. Hasta entonces, el nombre de la puntuación es texto libre tomado de la sesión simulada (`av_user`).
- Dependencia `@supabase/ssr`. No se necesita sin sesiones de usuario.
- Mensajes de contacto en base de datos. SPEC 03 sigue siendo solo correo.
- Datos de muestra del home (`ACTIVITY`, `TOP_PLAYERS`, `STATS` en `lib/data/home.ts`). Siguen fijos, como en SPEC 02.
- Recalcular `best` y `plays` del catálogo a partir de `scores`. Son columnas de catálogo, editables a mano.
- Migrar las puntuaciones que ya están en `av_scores` del navegador de cada persona.
- Anti-trampas, límites por IP o protección anti-spam.
- Tiempo real (suscripciones) en el Salón.
- Panel de administración para editar juegos. El catálogo se edita en el dashboard o con SQL.

---

## Modelo de datos

Este feature introduce dos tablas. No introduce estado global en el cliente.

```sql
-- supabase/migrations/<timestamp>_catalogo_y_puntuaciones.sql

create table public.games (
  id text primary key,                       -- "bloque-buster", slug de la ruta
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,                       -- clase CSS de portada, p. ej. "cover-bricks"
  color text not null check (color in ('cyan', 'magenta', 'green', 'yellow')),
  best integer not null default 0 check (best >= 0),
  plays text not null                        -- "12.4K", texto tal cual
);

create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null references public.games(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 10),
  score integer not null check (score between 0 and 99999999),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public" on public.games for select using (true);
create policy "scores_select_public" on public.scores for select using (true);

-- Sin políticas de insert, update ni delete para anon ni authenticated.
-- Las escrituras las hace solo el servidor con la clave secreta, que salta RLS.

insert into public.games (...) values (...);  -- 8 filas tomadas de lib/data/games.ts
```

```ts
// lib/scores.ts — validación compartida. No importa nada de react ni de supabase.
type ScoreInput = { game: string; name: string; score: number };
type ScoreErrors = Partial<Record<keyof ScoreInput, string>>;

// Exports: validateScore(input: unknown): { ok: true; data: ScoreInput } | { ok: false; errors: ScoreErrors }
// Límites: game no vacío; name 1–10 caracteres tras trim() (mismo límite que el nombre de sesión);
// score entero entre 0 y 99999999.
```

```ts
// Respuesta de POST /api/scores
type ScoreResponse =
  | { ok: true }
  | { ok: false; error: "invalid" | "db_failed"; errors?: ScoreErrors };
```

Tipos de lectura: `Game` (en `lib/data/games.ts`, sin cambios) y `ScoreRow` (en `lib/data/scores.ts`, con `rank`, `name`, `score` y `date`). La fecha se formatea "dd/mm/yyyy" desde `created_at`.

Variables de entorno (`.env.local`, no se versionan):

- `NEXT_PUBLIC_SUPABASE_URL`: obligatoria. URL del proyecto. Puede ir al navegador.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: obligatoria. Clave publicable. Puede ir al navegador, pero solo permite leer.
- `SUPABASE_SECRET_KEY`: obligatoria. Clave secreta. Solo se lee en el servidor. Nunca lleva prefijo `NEXT_PUBLIC_`.

Conventions:

- El proyecto es el de `project_ref` en `.mcp.json`. Las claves se consultan con el MCP (`get_project_url`, `get_publishable_keys`) y se pegan en `.env.local`, no en el repo.
- Los cambios de esquema van solo como archivos de `supabase/migrations/`. No se crean tablas a mano en el dashboard.
- Las lecturas de catálogo y de puntuaciones usan `revalidate = 60` en las páginas que las hacen. Así no se consulta la base en cada visita y los cambios aparecen en un minuto.
- `lib/data/games.ts` no importa React ni Supabase. Las funciones de lectura viven en `lib/games.ts` y `lib/scores.ts`.

---

## Plan de implementación

1. **Dependencias y variables.** Instalar con `npm install @supabase/supabase-js server-only`. Añadir a `.env.template` las variables `NEXT_PUBLIC_SUPABASE_URL=XXXX`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=XXXX` y `SUPABASE_SECRET_KEY=XXXX`, con el mismo formato de marcador `XXXX` que ya usa el archivo. Conservar las líneas existentes (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `SUPABASE_DB_PASSWORD`) sin cambios. Verificación: `npm run build` pasa y `package.json` lista ambas dependencias.
2. **Conexión a Supabase.** Crear `lib/supabase/public.ts` (clave publicable) y `lib/supabase/admin.ts` (clave secreta, con `import "server-only"`). Cada uno lanza error si falta su variable de entorno. Crear `.env.local` con los valores de `get_project_url` y `get_publishable_keys` y la clave secreta del dashboard. Verificación: `npx tsc --noEmit` pasa.
3. **Migración.** Crear `supabase/migrations/<timestamp>_catalogo_y_puntuaciones.sql` con el SQL del modelo de datos, incluida la carga de los 8 juegos de `GAMES` con los mismos textos y valores. Revisar el SQL antes de aplicarlo. Aplicarlo con `apply_migration` al proyecto de `.mcp.json`. Verificación: `list_tables` muestra `games` con 8 filas y `scores` vacía; `get_advisors` no reporta tablas sin RLS. Prueba de conexión: con `.env.local` completo, una consulta `select id from games limit 1` con el cliente público devuelve una fila del proyecto real. Con `SUPABASE_SECRET_KEY` incorrecta, una consulta con el cliente administrador falla con error de autenticación.
4. **Lectura de catálogo.** Crear `lib/games.ts` con `getGames(): Promise<Game[]>` y `getGame(id: string): Promise<Game | null>`, usando el cliente público. Leer `node_modules/next/dist/docs/` para la forma correcta de `revalidate` en Next 16 antes de escribir las páginas. Verificación: `npx tsc --noEmit` pasa.
5. **Puntuaciones en servidor.** Crear `lib/scores.ts` con `validateScore`, `getTopScores(gameId, limit = 10)` y `getTopScoresByGame(limit = 10)` (lectura con cliente público) e `insertScore(input)` (escritura con cliente administrador). Crear `app/api/scores/route.ts` con `POST`: valida con `validateScore` y responde 400 `{ ok: false, error: "invalid", errors }` si falla. Si `insertScore` falla por clave foránea (juego inexistente), responde 400 `invalid`. Si falla por otra causa, responde 500 `{ ok: false, error: "db_failed" }` y registra el detalle en el log del servidor. Verificación: `curl -X POST localhost:3000/api/scores -H "Content-Type: application/json" -d "{}"` responde 400; con un juego válido responde 200 y la fila aparece en `scores`.
6. **Reproductor.** En `components/player/game-player.tsx`, reemplazar `saveScore` por un `fetch` `POST /api/scores`. Mientras la petición corre, el botón GUARDAR PUNTUACIÓN queda deshabilitado. Si responde `ok: true`, se muestra "PUNTUACIÓN GUARDADA_" como hoy. Si falla, se muestra una línea "[ERROR] NO SE PUDO GUARDAR" con botón "REINTENTAR" en el mismo modal, y la puntuación no se pierde en memoria. Borrar `lib/saved-scores.ts`. Verificación: guardar crea una fila en `scores`; con `SUPABASE_SECRET_KEY` vacía, el modal muestra el error y no crea fila.
7. **Catálogo en `/` y `/games`.** Hacer que `app/page.tsx` y `app/games/page.tsx` sean server components que llaman a `getGames()` y pasan los juegos como prop a `components/home/landing.tsx` y `components/library/library.tsx`. Ninguno de esos componentes importa `GAMES`. Ambas páginas exportan `revalidate = 60`. Verificación: `/games` muestra 8 juegos; `/` muestra 6 tarjetas en el rail.
8. **Detalle y jugar.** En `app/juegos/[id]/page.tsx` y `app/juegos/[id]/jugar/page.tsx`, reemplazar `GAMES.find` por `getGame(id)`. Si devuelve `null`, la página responde con el mismo comportamiento de "no encontrado" que tiene hoy. En el detalle, reemplazar `seededScores` por `getTopScores(id, 10)`. Verificación: `/juegos/bloque-buster` muestra el título desde la tabla y la tabla de puntuaciones desde `scores`.
9. **Salón.** En `app/salon/page.tsx`, pasar a `components/hall/hall-of-fame.tsx` los juegos y el resultado de `getTopScoresByGame(10)`. Quitar de `hall-of-fame.tsx` el `useMemo` con `seededScores` y el comentario que lo menciona. Si un juego no tiene filas, su tabla muestra "SIN PUNTUACIONES AÚN". La página exporta `revalidate = 60`. Verificación: `/salon` muestra las filas insertadas en el paso 6 y el estado vacío en los juegos sin puntuaciones.
10. **Limpieza.** Quitar la constante `GAMES` de `lib/data/games.ts` y conservar los tipos y `CATS`. Quitar `seededScores` de `lib/data/scores.ts`; borrar el archivo si queda sin usos. Verificación: `npx tsc --noEmit` pasa y `grep` de `GAMES`, `seededScores` y `saveScore` en `app/`, `components/` y `lib/` no devuelve resultados fuera de tipos o de `CATS`.
11. **Verificación final.** Ejecutar `npm run build`, `npm run lint` y `npx tsc --noEmit`. Revisar en `npm run dev` las rutas listadas en los criterios.

Cada paso deja la aplicación construible. Los pasos 4 a 9 cambian una fuente de datos a la vez, y el paso 10 solo borra código que ya no se usa. El último paso no es "probar todo"; esa verificación está en los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npx tsc --noEmit` termina sin errores.
- [ ] La app se conecta al proyecto real de Supabase: con `.env.local` completo, la consulta de prueba del paso 3 devuelve una fila de `games`.
- [ ] Con `SUPABASE_SECRET_KEY` incorrecta, el cliente administrador falla con error de autenticación y no devuelve datos locales de respaldo.
- [ ] `list_tables` muestra `games` con 8 filas y `scores` con las columnas de la sección de modelo de datos.
- [ ] En `pg_class`, `relrowsecurity` es `true` para `games` y para `scores`.
- [ ] En `pg_policies`, no existe ninguna política de `insert`, `update` ni `delete` en `games` ni en `scores`.
- [ ] Una petición directa a la API REST de Supabase con la clave publicable, para insertar en `scores`, responde error de permisos y no crea fila.
- [ ] `POST /api/scores` con cuerpo `{}` responde HTTP 400 y `error: "invalid"`.
- [ ] `POST /api/scores` con un `game` que no existe en `games` responde HTTP 400 y `error: "invalid"`.
- [ ] `POST /api/scores` con datos válidos responde HTTP 200 y la fila aparece en `scores` con el `name` recortado y el `score` entero.
- [ ] `POST /api/scores` con datos válidos y `SUPABASE_SECRET_KEY` incorrecta responde HTTP 500 con `error: "db_failed"`, y la respuesta no contiene la clave ni el mensaje interno.
- [ ] GUARDAR PUNTUACIÓN en el reproductor crea una fila en `scores` y muestra "PUNTUACIÓN GUARDADA_".
- [ ] Si el guardado falla, el modal muestra "[ERROR] NO SE PUDO GUARDAR" y "REINTENTAR". Al reintentar con la red restaurada, la fila se crea.
- [ ] `/games` muestra los 8 juegos leídos de `games`.
- [ ] `/` muestra exactamente 6 tarjetas en el rail "JUEGOS DISPONIBLES AHORA", leídas de `games`.
- [ ] Cambiar `best` de un juego en la tabla se refleja en `/games` en 60 segundos o menos, sin redeploy.
- [ ] `/juegos/[id]` muestra el top 10 de `scores` para ese juego.
- [ ] `/salon` muestra el top 10 real por juego y "SIN PUNTUACIONES AÚN" en los juegos sin filas.
- [ ] No aparece ningún dato de `seededScores` en `/salon` ni en `/juegos/[id]`.
- [ ] `grep` de `saveScore`, `lib/saved-scores`, `seededScores` y `av_scores` en `app/`, `components/` y `lib/` no devuelve resultados.
- [ ] `grep` de `GAMES` en `app/` y `components/` no devuelve imports. `lib/data/games.ts` ya no exporta `GAMES`.
- [ ] `SUPABASE_SECRET_KEY` aparece solo en `lib/supabase/admin.ts` y en `.env.template`. Ningún archivo de `components/` la usa.
- [ ] `lib/supabase/admin.ts` importa `server-only`.
- [ ] No hay `@supabase/ssr` en `package.json` ni ningún login en el código.
- [ ] `.env.local` está en `.gitignore`.
- [ ] Ningún archivo fuera de `app/`, `components/`, `lib/`, `supabase/`, `specs/`, `.env.template`, `package.json` y `package-lock.json` cambia.

---

## Decisiones tomadas y descartadas

- **Sí: alcance limitado a catálogo y puntuaciones.** Auth, mensajes de contacto y datos de la home quedan fuera. La respuesta inicial "solo conexión" se aclaró en el diálogo: entran catálogo y puntuaciones, nada más.
- **No: autenticación en esta spec.** Introduce sesiones, middleware y rutas protegidas. Es una spec por sí sola, y sin ella no hay `@supabase/ssr`.
- **Sí: `@supabase/supabase-js` sin `@supabase/ssr`.** Sin cookies de sesión, el cliente simple basta.
- **Sí: migraciones en `supabase/migrations/`.** El esquema queda en git y se revisa en PR. Descartado: SQL directo en el dashboard, porque no es reproducible.
- **Sí: RLS en `games` y `scores`, escritura solo desde el servidor.** Lectura pública con la clave publicable; escrituras con la clave secreta en `lib/supabase/admin.ts`.
- **No: escritura anónima con la clave publicable.** Cualquier visitante podría alterar puntuaciones desde el navegador.
- **Sí: reemplazar localStorage por Supabase en las puntuaciones.** Descartado: doble escritura. Dos fuentes de verdad complican el Salón y no aportan nada con la base disponible.
- **No: migrar las puntuaciones de `av_scores` del navegador.** Son datos locales de prueba de SPEC 01 y no tienen identidad real. Se pierden. Si se quieren conservar, es una decisión aparte.
- **Sí: Salón y detalle con top 10 real, sin relleno de muestra.** Descartado: completar con `seededScores`. Mezcla datos falsos con reales y oculta el estado vacío.
- **Sí: catálogo solo desde `games`, sin respaldo estático.** Descartado: respaldo en `lib/data/games.ts`. Dos fuentes pueden divergir. La consecuencia es que una caída de Supabase deja `/`, `/games` y `/juegos` sin datos (ver riesgos).
- **Sí: `best` y `plays` quedan como columnas de catálogo.** No se recalculan desde `scores`. Recalcularlos es una decisión de producto aparte.
- **Sí: `revalidate = 60` en páginas con datos de Supabase.** Evita consultar en cada visita. Descartado: sin caché, cada visita consulta la base; con caché indefinida, los cambios no se verían.
- **Sí: límites de `name` (1–10) y `score` (0–99999999).** `name` usa el mismo límite que el nombre de sesión. El tope de `score` es un valor de esta spec; el template no lo define.
- **Sí: `POST /api/scores` como route handler.** Igual que SPEC 03: códigos HTTP claros y prueba con `curl`.
- **Sí: `server-only` en el cliente administrador.** Si alguien importa `lib/supabase/admin.ts` desde un componente cliente, el build falla en vez de filtrar la clave.
- **Sí: estado vacío "SIN PUNTUACIONES AÚN".** Texto nuevo, en español, como el resto de la página. Si el diseño cambia, se ajusta en `hall-of-fame.tsx`.
- **Sí: el catálogo no se edita desde la app.** Se edita en el dashboard o con SQL. Un panel de administración es spec propia.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Sin auth, cualquiera puede insertar puntuaciones falsas con `curl` a `/api/scores`. | Aceptado para este MVP. La validación limita nombre y rango. Anti-trampas y propiedad de la puntuación van en la spec de auth. |
| La clave secreta se filtra si un componente cliente la importa. | `server-only` en `lib/supabase/admin.ts` y una verificación con `grep` en los criterios. |
| Aplicar la migración en un proyecto con datos reales afecta producción. | Revisar el SQL antes de `apply_migration`. Si el proyecto es de producción, probar primero en un branch con `create_branch`. |
| Si Supabase no responde, `/`, `/games`, `/salon` y `/juegos/[id]` no tienen datos. | Aceptado por la decisión de no tener respaldo estático. Las páginas muestran el error de Next. Un respaldo se evalúa si el servicio es inestable. |
| Con `revalidate = 60`, el Salón tarda hasta un minuto en mostrar una puntuación nueva. | Aceptado. Se documenta en el criterio de caché. Si se necesita inmediatez, se usa `revalidatePath` en el route handler. |
| `best` del catálogo puede no coincidir con la mejor puntuación real en `scores`. | Aceptado. Son campos distintos por decisión de esta spec. Se unifican en una spec de producto. |
| Las puntuaciones de `av_scores` del navegador se pierden al cambiar de fuente. | Decisión tomada: no migrar datos de prueba. Ver decisiones. |

---

## Lo que **no** está en esta spec

- Autenticación, sesiones, middleware y `@supabase/ssr`.
- Anti-trampas, límites por IP y protección anti-spam.
- Mensajes de contacto en base de datos (SPEC 03 sigue siendo solo correo).
- Datos de la home desde Supabase (`ACTIVITY`, `TOP_PLAYERS`, `STATS`).
- Recalcular `best` y `plays` desde `scores`.
- Migrar `av_scores` de localStorage.
- Panel de administración del catálogo.
- Tiempo real en el Salón.
