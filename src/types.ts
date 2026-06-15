export type Player = 'X' | 'O';
export type BoardCell = Player | null;

export interface GameStats {
  winsX: number;
  winsO: number;
  draws: number;
}

export type GameMode = 'pvp' | 'pvc';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface MoveLog {
  moveNumber: number;
  player: Player;
  index: number; // 0..8
  row: number; // 1..3
  col: number; // 1..3
  timestamp: string;
}
