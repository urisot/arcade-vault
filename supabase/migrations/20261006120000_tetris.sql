-- SPEC 07: renombra el juego 'caida' a 'tetris' y mueve sus puntuaciones.
-- El orden importa: scores.game_id tiene clave foránea, así que se quita antes del renombrado.
alter table public.scores drop constraint scores_game_id_fkey;
update public.games set id = 'tetris', title = 'TETRIS' where id = 'caida';
update public.scores set game_id = 'tetris' where game_id = 'caida';
alter table public.scores add constraint scores_game_id_fkey
  foreign key (game_id) references public.games(id) on delete cascade;
