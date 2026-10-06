-- Mejor partida de cada nombre en cada juego. Solo lectura: no toca scores.
-- Empate de score: gana la fila más antigua.
-- Distingue mayúsculas: "Ana" y "ana" son filas distintas.
create view public.best_scores with (security_invoker = true) as
select distinct on (game_id, name) game_id, name, score, created_at
from public.scores
order by game_id, name, score desc, created_at asc;

-- Suma de mejores scores por nombre, opcionalmente filtrada por categoría.
-- Empate de total: gana el nombre cuya mejor partida es más antigua.
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
