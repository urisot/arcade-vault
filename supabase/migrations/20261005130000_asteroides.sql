-- Renombra el juego 'rocas' a 'asteroides' y mueve sus puntuaciones.
-- Quita la clave foránea antes del renombrado y la vuelve a crear después.
alter table public.scores drop constraint scores_game_id_fkey;
update public.games set id = 'asteroides', title = 'ASTEROIDES' where id = 'rocas';
update public.scores set game_id = 'asteroides' where game_id = 'rocas';
alter table public.scores add constraint scores_game_id_fkey
  foreign key (game_id) references public.games(id) on delete cascade;
