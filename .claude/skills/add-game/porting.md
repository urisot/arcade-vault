# Guía de port: JS vanilla → motor puro + canvas React

Usar esta guía cuando el juego fuente sea un `game.js` de `references/started-games/`. El ejemplo completo es `specs/05-asteroides-en-plataforma.md`, con su código en `lib/games/asteroids/` y `components/player/asteroids-canvas.tsx`.

## 1. Separar el `game.js` en tres partes

| En `game.js` | Va a | Regla |
| --- | --- | --- |
| Clases con estado y `update(dt)` | `engine.ts` (funciones puras sobre `GameState`) | Sin `document`, `window`, `Math` no determinista fuera de un generador que se pasa como argumento si hace falta. |
| Métodos `draw(ctx)` | `render.ts` | Recibe `ctx` como argumento. No crea elementos. |
| Listeners de `keydown`, `keyup`, `requestAnimationFrame`, `getElementById` | `<slug>-canvas.tsx` | Estado en `useRef`. Bucle cancelado en el cleanup. |

Los globals del original (`let score`, `let lives`, `const keys = {}`) pasan a campos de `GameState` o a un `useRef` del componente, nunca a módulo.

## 2. Estado como datos, no como clases con métodos

El original usa clases (`class Asteroid { update() {...} }`). En el motor, cada entidad es un objeto plano tipado y una función:

```ts
// Antes (game.js)
class Bullet { update(dt) { this.x += this.vx * dt; } }

// Después (engine.ts)
type Bullet = { x: number; y: number; vx: number; vy: number; life: number };
function stepBullet(b: Bullet, dt: number): Bullet {
  return { ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt, life: b.life - dt };
}
```

Regla práctica: `step(state, input, dt)` devuelve un estado nuevo o muta solo el que recibe. Elegir una y mantenerla en todo el motor. La spec 05 muta un estado creado por `createGame()` y devuelve el mismo objeto.

## 3. Tiempo

- Usar `dt` en segundos, no frames. El original puede usar frames; convertir con los valores de velocidad a segundos y anotar la conversión en la spec.
- Limitar `dt` a 0.05 s (como `game.js` de Asteroids). Así una pestaña en segundo plano no provoca saltos.
- El bucle calcula `dt = (now - last) / 1000` y lo pasa a `step`.

## 4. Teclado

- `keydown` y `keyup` en `window`. Guardar el estado en un objeto de `useRef`.
- `preventDefault` solo en las teclas de juego (flechas, espacio). No en todas.
- `blur` en `window` limpia todas las teclas: evita que una tecla quede pegada.
- Disparo "una bala por pulsación": el canvas calcula `fire` como flanco (true solo en el primer frame en que `Space` pasa a pulsado). Igual que `fire = pulsación de un frame` en la spec 05.

## 5. Bucle

```ts
useEffect(() => {
  let raf = 0;
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    if (!pausedRef.current) stateRef.current = step(stateRef.current, readInput(), dt);
    draw(ctx, stateRef.current);
    notifyIfChanged(stateRef.current);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}, []);
```

- Las props `paused`, `endRequest` y `restartRequest` se leen desde refs actualizados en un efecto aparte. El bucle no depende de ellas para no reiniciarse en cada render.
- `notifyIfChanged` compara `score`, `lives`, `level` y `status` con el último valor enviado. Solo llama a `onChange` si cambia alguno.

## 6. Cosas que el original hace y que no conviene portar tal cual

- `alert()` o `confirm()` para fin de partida: el modal de la plataforma reemplaza esto.
- Pintar el HUD en el canvas: el HUD vive en `game-player.tsx`. Excepción: textos dentro del juego (por ejemplo "PAUSA" sobre el campo), si la spec lo pide.
- Sonido: fuera de alcance salvo que la spec lo incluya.
- `localStorage` para la mejor puntuación: el ranking vive en Supabase.
- Globals `window.game = ...` para depurar: no portar.

## 7. Verificación antes de dar por bueno el port

- `grep -n "document\|window\|react" lib/games/<slug>/` no devuelve resultados. `window` solo puede aparecer en el componente, nunca en el motor.
- Valores de constantes idénticos al original (incluir una tabla en la spec con el valor fuente y el valor portado).
- `npx tsc --noEmit` pasa.
- En `npm run dev`, la partida se puede jugar de inicio a fin sin errores en consola.
