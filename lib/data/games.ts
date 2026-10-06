export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export type GameColor = "cyan" | "magenta" | "green" | "yellow";

export type Game = {
  id: string; // "bloque-buster", slug de la ruta
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string; // clase CSS de portada, p. ej. "cover-bricks"
  color: GameColor;
  best: number;
  plays: string; // "12.4K", texto tal cual
};

export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
