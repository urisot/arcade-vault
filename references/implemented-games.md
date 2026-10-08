# Juegos implementados

Juegos con motor jugable registrado en `lib/games/registry.ts` (`SURFACES`). Datos leídos de la tabla `public.games`. El resto del catálogo (`duelo-pixel`, `gloton`, `invasores`, `ranaria`) todavía muestra el HUD placeholder.

## ASTEROIDES

- **id:** `asteroides`
- **Categoría:** SHOOTER · **Color:** yellow
- **Short:** Pulveriza asteroides en gravedad cero.
- **Long:** Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.
- **Best:** 41200 · **Plays:** 15.6K
- **Spec:** `specs/05-asteroides-en-plataforma.md`
- **Motor:** `lib/games/asteroids/engine.ts`, `render.ts` · **Canvas:** `components/player/asteroids-canvas.tsx`

## TETRIS

- **id:** `tetris`
- **Categoría:** PUZZLE · **Color:** magenta
- **Short:** Encaja las piezas antes de que el techo te aplaste.
- **Long:** Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.
- **Best:** 184220 · **Plays:** 31.8K
- **Spec:** `specs/07-tetris.md`
- **Motor:** `lib/games/tetris/engine.ts`, `render.ts` · **Canvas:** `components/player/tetris-canvas.tsx`

## ARKANOID

- **id:** `arkanoid`
- **Categoría:** ARCADE · **Color:** cyan
- **Short:** Rebota la pelota y destruye muros de neón.
- **Long:** Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?
- **Best:** 28450 · **Plays:** 12.4K
- **Spec:** `specs/08-arkanoid.md`
- **Motor:** `lib/games/arkanoid/engine.ts`, `render.ts`, `levels.ts` · **Canvas:** `components/player/arkanoid-canvas.tsx`

## SNAKE

- **id:** `snake`
- **Categoría:** ARCADE · **Color:** green
- **Short:** Crece sin morder tu propia cola.
- **Long:** Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.
- **Best:** 7820 · **Plays:** 9.1K
- **Spec:** `specs/09-snake.md`
- **Motor:** `lib/games/snake/engine.ts`, `render.ts` · **Canvas:** `components/player/snake-canvas.tsx`
