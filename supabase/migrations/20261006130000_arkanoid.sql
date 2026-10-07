-- SPEC 08: renombra el juego 'bloque-buster' a 'arkanoid' y mueve sus puntuaciones.
-- El orden importa: scores.game_id tiene clave foránea, así que se quita antes del renombrado.
alter table public.scores drop constraint scores_game_id_fkey;
update public.games set id = 'arkanoid', title = 'ARKANOID' where id = 'bloque-buster';
update public.scores set game_id = 'arkanoid' where game_id = 'bloque-buster';
alter table public.scores add constraint scores_game_id_fkey
  foreign key (game_id) references public.games(id) on delete cascade;
