alter table public.scores drop constraint scores_game_id_fkey;
update public.games set id = 'snake', title = 'SNAKE' where id = 'serpentina';
update public.scores set game_id = 'snake' where game_id = 'serpentina';
alter table public.scores add constraint scores_game_id_fkey
  foreign key (game_id) references public.games(id) on delete cascade;
