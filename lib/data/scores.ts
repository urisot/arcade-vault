export type BestScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string; // formato "dd/mm/yyyy", desde created_at
};

export type GlobalRow = {
  rank: number;
  name: string;
  total: number;
};
