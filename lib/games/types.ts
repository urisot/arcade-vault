// Tipos compartidos por todos los juegos de la plataforma.
// Cada motor puede tener su propio GameStatus; mientras tenga la misma forma, encaja aquí.

export type GameStatus = "playing" | "dead" | "gameover";

// Snapshot que el juego envía a React. Solo datos, sin referencias al canvas.
// lines es opcional: solo Tetris lo envía. Asteroides no lo usa.
export type GameSnapshot = { score: number; lives: number; level: number; status: GameStatus; lines?: number };
