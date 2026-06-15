import { Player, BoardCell, Difficulty } from '../types';

export const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas horizontais
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas verticais
  [0, 4, 8], [2, 4, 6]             // Diagonais
];

/**
 * Verifica se há um vencedor no tabuleiro atual.
 */
export function checkWinner(board: BoardCell[]): { winner: Player | null; pattern: number[] | null } {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as Player, pattern: line };
    }
  }
  return { winner: null, pattern: null };
}

/**
 * Verifica se todas as células do tabuleiro estão preenchidas.
 */
export function isBoardFull(board: BoardCell[]): boolean {
  return board.every((cell) => cell !== null);
}

/**
 * Retorna os índices de todas as células vazias.
 */
function getEmptyIndices(board: BoardCell[]): number[] {
  const list: number[] = [];
  board.forEach((cell, idx) => {
    if (cell === null) {
      list.push(idx);
    }
  });
  return list;
}

/**
 * Implementação recursiva do algoritmo Minimax com limite de profundidade teórico de 9.
 */
function minimax(
  board: BoardCell[],
  depth: number,
  isMaximizing: boolean,
  aiPlayer: Player,
  humanPlayer: Player
): number {
  const result = checkWinner(board);
  if (result.winner === aiPlayer) {
    return 10 - depth;
  }
  if (result.winner === humanPlayer) {
    return depth - 10;
  }
  if (isBoardFull(board)) {
    return 0;
  }

  const emptyIndices = getEmptyIndices(board);

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (const index of emptyIndices) {
      board[index] = aiPlayer;
      const score = minimax(board, depth + 1, false, aiPlayer, humanPlayer);
      board[index] = null; // Backtrack
      bestScore = Math.max(bestScore, score);
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (const index of emptyIndices) {
      board[index] = humanPlayer;
      const score = minimax(board, depth + 1, true, aiPlayer, humanPlayer);
      board[index] = null; // Backtrack
      bestScore = Math.min(bestScore, score);
    }
    return bestScore;
  }
}

/**
 * Determina a jogada do computador com base no nível de dificuldade selecionado.
 */
export function getComputerMove(
  board: BoardCell[],
  computerPlayer: Player,
  difficulty: Difficulty
): number {
  const humanPlayer: Player = computerPlayer === 'X' ? 'O' : 'X';
  const emptyIndices = getEmptyIndices(board);
  
  if (emptyIndices.length === 0) {
    return -1;
  }

  // 1. Dificuldade FÁCIL: Escolhe uma jogada aleatória pura
  if (difficulty === 'easy') {
    const randomIndex = Math.floor(Math.random() * emptyIndices.length);
    return emptyIndices[randomIndex];
  }

  // 2. Dificuldade MÉDIA: Joga estrategicamente para vencer ou bloquear de imediato.
  // Senão, tem 50% de chance de jogar perfeitamente (Minimax) ou 50% aleatório.
  if (difficulty === 'medium') {
    // 2.1 Se puder vencer na próxima jogada, vence.
    for (const index of emptyIndices) {
      board[index] = computerPlayer;
      const willWin = checkWinner(board).winner === computerPlayer;
      board[index] = null;
      if (willWin) {
        return index;
      }
    }

    // 2.2 Se o oponente puder vencer na próxima jogada, bloqueia-o.
    for (const index of emptyIndices) {
      board[index] = humanPlayer;
      const opponentWins = checkWinner(board).winner === humanPlayer;
      board[index] = null;
      if (opponentWins) {
        return index;
      }
    }

    // 2.3 Caso contrário, decide aleatoriamente se faz jogada otimizada ou ao acaso.
    if (Math.random() < 0.4) {
      const randomIndex = Math.floor(Math.random() * emptyIndices.length);
      return emptyIndices[randomIndex];
    }
  }

  // 3. Dificuldade IMBATÍVEL (HARD): Minimax completo.
  // Se for o primeiro lance e o tabuleiro estiver vazio, acelera para reduzir tempo de resposta.
  if (emptyIndices.length === 9) {
    const primaryOptions = [4, 0, 2, 6, 8]; // Centro ou Cantos
    return primaryOptions[Math.floor(Math.random() * primaryOptions.length)];
  }

  let bestScore = -Infinity;
  let bestMove = emptyIndices[0];

  for (const index of emptyIndices) {
    const tempBoard = [...board];
    tempBoard[index] = computerPlayer;
    const score = minimax(tempBoard, 0, false, computerPlayer, humanPlayer);

    if (score > bestScore) {
      bestScore = score;
      bestMove = index;
    }
  }

  return bestMove;
}
