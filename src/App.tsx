/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Users, 
  Cpu, 
  RotateCcw, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Database, 
  Hash, 
  Clock, 
  Sparkles, 
  Code,
  Flame,
  Award,
  AlertCircle,
  Globe,
  Send,
  Loader2,
  ListOrdered,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';
import { Player, BoardCell, GameStats, GameMode, Difficulty, MoveLog } from './types';
import { checkWinner, isBoardFull, getComputerMove } from './utils/gameLogic';
import { playSound } from './utils/audio';

interface ScoreEntry {
  id: string;
  playerName: string;
  difficulty: "easy" | "medium" | "hard";
  movesCount: number;
  timestamp: string;
}

export default function App() {
  // Game state
  const [board, setBoard] = useState<BoardCell[]>(Array(9).fill(null));
  const [gameMode, setGameMode] = useState<GameMode>('pvc');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [playerSymbol, setPlayerSymbol] = useState<Player>('X'); // X starting first by default
  const [turn, setTurn] = useState<Player>('X');
  
  // Scoring
  const [stats, setStats] = useState<GameStats>({ winsX: 0, winsO: 0, draws: 0 });
  const [logs, setLogs] = useState<MoveLog[]>([]);
  
  // UI preferences
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isComputerThinking, setIsComputerThinking] = useState<boolean>(false);

  // Global scoreboard/database states
  const [globalScores, setGlobalScores] = useState<ScoreEntry[]>([]);
  const [loadingScores, setLoadingScores] = useState<boolean>(false);
  const [playerNameInput, setPlayerNameInput] = useState<string>(() => {
    return localStorage.getItem('playerName') || '';
  });
  const [hasSavedScore, setHasSavedScore] = useState<boolean>(false);
  const [submittingScore, setSubmittingScore] = useState<boolean>(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [rightSidebarTab, setRightSidebarTab] = useState<'leaderboards' | 'visualizer'>('leaderboards');
  const [leaderboardDiffTab, setLeaderboardDiffTab] = useState<Difficulty>('medium');

  // Check board status
  const winStatus = checkWinner(board);
  const winner = winStatus.winner;
  const winningPattern = winStatus.pattern;
  const isDraw = !winner && isBoardFull(board);

  const computerSymbol: Player = playerSymbol === 'X' ? 'O' : 'X';

  // Count player human moves
  const humanMovesPlayed = logs.filter(log => log.player === playerSymbol).length;

  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const [drawCountdown, setDrawCountdown] = useState<number | null>(null);
  const [isDrawResetPaused, setIsDrawResetPaused] = useState<boolean>(false);

  const handleCopyLogs = () => {
    if (logs.length === 0) return;
    
    let summary = `📝 [JOGO DO GALO - RESUMO DAS JOGADAS]\n`;
    summary += `Modo de Jogo: ${gameMode === 'pvc' ? `Computador (Dificuldade: ${difficulty === 'hard' ? 'Imbatível' : difficulty === 'medium' ? 'Médio' : 'Fácil'})` : 'Amigo (PvP)'}\n`;
    summary += `Data/Hora: ${new Date().toLocaleString('pt-PT')}\n`;
    summary += `-------------------------------------------\n`;
    
    logs.forEach((log) => {
      summary += `Jogada #${log.moveNumber} | Jogador: ${log.player} | Casa: [${log.index}] (Linha ${log.row}, Coluna ${log.col}) | Hora: ${log.timestamp}\n`;
    });
    
    summary += `-------------------------------------------\n`;
    if (winner) {
      summary += `🏆 Vencedor: Jogador "${winner}" !\n`;
    } else if (isDraw) {
      summary += `🤝 Resultado: Empate técnico!\n`;
    } else {
      summary += `🎮 Partida em curso | Próxima jogada: ${turn}\n`;
    }
    
    navigator.clipboard.writeText(summary)
      .then(() => {
        setCopiedLogs(true);
        setTimeout(() => setCopiedLogs(false), 2000);
      })
      .catch((err) => {
        console.error('Falha ao copiar:', err);
      });
  };

  // Retrieve global scores on load
  const fetchScores = async () => {
    setLoadingScores(true);
    try {
      const response = await fetch('/api/scores');
      if (response.ok) {
        const data = await response.json();
        setGlobalScores(data);
      }
    } catch (error) {
      console.error("Erro ao carregar classificações:", error);
    } finally {
      setLoadingScores(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, []);

  // Handle computer's move in PVC mode
  useEffect(() => {
    if (gameMode === 'pvc' && turn === computerSymbol && !winner && !isDraw) {
      setIsComputerThinking(true);
      const timer = setTimeout(() => {
        const move = getComputerMove(board, computerSymbol, difficulty);
        if (move !== -1) {
          const nextBoard = [...board];
          nextBoard[move] = computerSymbol;
          setBoard(nextBoard);

          const row = Math.floor(move / 3) + 1;
          const col = (move % 3) + 1;
          const newLog: MoveLog = {
            moveNumber: logs.length + 1,
            player: computerSymbol,
            index: move,
            row,
            col,
            timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };
          setLogs(prev => [...prev, newLog]);

          if (audioEnabled) {
            playSound(computerSymbol === 'X' ? 'click_x' : 'click_o');
          }

          const winCheck = checkWinner(nextBoard);
          if (winCheck.winner) {
            setStats(prev => ({
              ...prev,
              winsX: winCheck.winner === 'X' ? prev.winsX + 1 : prev.winsX,
              winsO: winCheck.winner === 'O' ? prev.winsO + 1 : prev.winsO,
            }));
            if (audioEnabled) playSound('win');
          } else if (isBoardFull(nextBoard)) {
            setStats(prev => ({ ...prev, draws: prev.draws + 1 }));
            if (audioEnabled) playSound('draw');
          } else {
            setTurn(playerSymbol);
          }
        }
        setIsComputerThinking(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [board, gameMode, turn, playerSymbol, difficulty, winner, isDraw, computerSymbol, audioEnabled, logs.length]);

  // Click handler for grid cells
  const handleCellClick = (index: number) => {
    if (board[index] !== null || winner || isDraw || isComputerThinking) return;

    // Prevent human clicking on computer's turn
    if (gameMode === 'pvc' && turn === computerSymbol) return;

    const currentToken = turn;
    const nextBoard = [...board];
    nextBoard[index] = currentToken;
    setBoard(nextBoard);

    const row = Math.floor(index / 3) + 1;
    const col = (index % 3) + 1;
    const newLog: MoveLog = {
      moveNumber: logs.length + 1,
      player: currentToken,
      index,
      row,
      col,
      timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setLogs(prev => [...prev, newLog]);

    if (audioEnabled) {
      playSound(currentToken === 'X' ? 'click_x' : 'click_o');
    }

    const winCheck = checkWinner(nextBoard);
    if (winCheck.winner) {
      setStats(prev => ({
        ...prev,
        winsX: winCheck.winner === 'X' ? prev.winsX + 1 : prev.winsX,
        winsO: winCheck.winner === 'O' ? prev.winsO + 1 : prev.winsO,
      }));
      // Auto-toggle tab to leaderboards so they see where to submit
      setRightSidebarTab('leaderboards');
      if (audioEnabled) playSound('win');
    } else if (isBoardFull(nextBoard)) {
      setStats(prev => ({ ...prev, draws: prev.draws + 1 }));
      if (audioEnabled) playSound('draw');
    } else {
      // Toggle player turn
      setTurn(currentToken === 'X' ? 'O' : 'X');
    }
  };

  // Submit modern high score to our backend/database
  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerNameInput.trim()) {
      setScoreError('Por favor introduza o seu nome');
      return;
    }

    setSubmittingScore(true);
    setScoreError(null);

    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: playerNameInput.trim(),
          difficulty: difficulty,
          movesCount: humanMovesPlayed
        }),
      });

      if (response.ok) {
        localStorage.setItem('playerName', playerNameInput.trim());
        setHasSavedScore(true);
        // Switch leaderboard diff sub-tab to current difficulty so they see it
        setLeaderboardDiffTab(difficulty);
        // Fetch new scores
        await fetchScores();
      } else {
        const errData = await response.json();
        setScoreError(errData.error || 'Erro ao comunicar com a base de dados');
      }
    } catch (err) {
      setScoreError('Erro de ligação à rede');
    } finally {
      setSubmittingScore(false);
    }
  };

  // Reset current board round
  const handleResetRound = () => {
    setBoard(Array(9).fill(null));
    setLogs([]);
    setIsComputerThinking(false);
    setHasSavedScore(false);
    setScoreError(null);
    setTurn('X');
    setDrawCountdown(null);
    setIsDrawResetPaused(false);
    if (audioEnabled) playSound('reset');
  };

  // Auto-clear board on draw with countdown
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null;

    if (isDraw && !isDrawResetPaused) {
      if (drawCountdown === null) {
        setDrawCountdown(5); // 5-second countdown to read/copy summary
      } else if (drawCountdown > 0) {
        countdownInterval = setInterval(() => {
          setDrawCountdown(prev => {
            if (prev !== null && prev > 1) {
              return prev - 1;
            }
            return 0;
          });
        }, 1000);
      } else if (drawCountdown === 0) {
        handleResetRound();
      }
    } else {
      if (!isDraw) {
        setDrawCountdown(null);
        setIsDrawResetPaused(false);
      }
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [isDraw, drawCountdown, isDrawResetPaused]);

  // Reset full game with scores
  const handleZerarScores = () => {
    setBoard(Array(9).fill(null));
    setLogs([]);
    setStats({ winsX: 0, winsO: 0, draws: 0 });
    setIsComputerThinking(false);
    setHasSavedScore(false);
    setScoreError(null);
    setTurn('X');
    if (audioEnabled) playSound('reset');
  };

  // Change active player symbol in PVC
  const handleToggleSymbol = (symbol: Player) => {
    if (logs.length > 0) return; // Prevent change mid-game
    setPlayerSymbol(symbol);
    setTurn('X'); // X always makes the first move
  };

  // Group or filter top scores per difficulty
  const getLeaderboardData = (diff: Difficulty) => {
    return globalScores
      .filter(item => item.difficulty === diff)
      // Sort primarily by fewest moves (efficiency), and secondarily by newest entry
      .sort((a, b) => {
        if (a.movesCount !== b.movesCount) {
          return a.movesCount - b.movesCount;
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(0, 10); // Display Top 10
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-6 px-4 md:px-8 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      
      {/* HEADER SECTION */}
      <header className="max-w-6xl mx-auto w-full text-center mb-4">
        <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-full text-xs font-mono tracking-wider text-emerald-400 uppercase mb-3">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Jogo do Galo Clássivo com Base de Dados Pública
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-200 to-blue-400">
          Jogo do Galo
        </h1>
        <p className="text-slate-400 text-sm md:text-base mt-2 max-w-lg mx-auto">
          Regista os teus recordes na base de dados global e compete contra jogadores de todo o mundo em 3 dificuldades!
        </p>
      </header>

      {/* CORE CONTENT */}
      <main className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 my-4">
        
        {/* LEFT COLUMN: CONTROLS & TABULEIRO */}
        <div className="lg:col-span-7 flex flex-col items-center gap-6">
          
          {/* CONTROL BAR */}
          <div className="w-full bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
            
            {/* Game Mode Picker */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                id="btn-mode-pvc"
                onClick={() => {
                  setGameMode('pvc');
                  handleResetRound();
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  gameMode === 'pvc' 
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" /> Computador
              </button>
              <button
                id="btn-mode-pvp"
                onClick={() => {
                  setGameMode('pvp');
                  handleResetRound();
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  gameMode === 'pvp' 
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Amigo (PvP)
              </button>
            </div>

            {/* Quick volume */}
            <div className="flex items-center gap-2">
              <button
                id="btn-audio-toggle"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`p-2 rounded-xl border transition-all ${
                  audioEnabled 
                    ? 'bg-slate-800 border-slate-700 text-emerald-400' 
                    : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-400'
                }`}
                title={audioEnabled ? "Sons ativados" : "Sons desativados"}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                id="btn-reload-scores"
                onClick={fetchScores}
                disabled={loadingScores}
                className="p-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-all disabled:opacity-50"
                title="Atualizar Classificações"
              >
                <Globe className={`w-4 h-4 ${loadingScores ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* ADDITIONAL SETTINGS PANEL (IF PVC ACTIVE OR TO SELECT FIRST MOVE) */}
          <AnimatePresence mode="popLayout">
            {gameMode === 'pvc' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full bg-slate-900/40 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {/* AI Difficulty Selector */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Dificuldade da IA:</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                      <button
                        key={diff}
                        id={`btn-diff-${diff}`}
                        onClick={() => {
                          setDifficulty(diff);
                          handleResetRound();
                        }}
                        className={`py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                          difficulty === diff
                            ? 'bg-slate-800 text-emerald-400 font-bold border border-emerald-800/30 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {diff === 'easy' ? 'Fácil' : diff === 'medium' ? 'Médio' : 'Imbatível'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Human Player Symbol Select (Only if no moves yet) */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-2">
                    Escolhe o teu Símbolo: <span className="text-[10px] text-slate-500">(só no início)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {(['X', 'O'] as Player[]).map((symbol) => (
                      <button
                        key={symbol}
                        id={`btn-symbol-${symbol}`}
                        disabled={logs.length > 0}
                        onClick={() => handleToggleSymbol(symbol)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                          playerSymbol === symbol
                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed'
                        }`}
                      >
                        Jogar como {symbol}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ACTIVE TURN & STATUS DISPLAY / OUTCOME CARD */}
          {winner || isDraw ? (
            <div className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border ${
              winner 
                ? (winner === 'X' ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-300' : 'bg-rose-500/5 border-rose-500/20 text-rose-300')
                : 'bg-amber-500/5 border-amber-500/20 text-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                {winner ? (
                  <>
                    <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div className="flex items-center gap-1.5 text-xs text-slate-200">
                      <span className="font-bold">Jogador</span>
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded font-black text-xs ${
                        winner === 'X' 
                          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' 
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {winner}
                      </span>
                      <span className="font-semibold text-slate-400">Venceu! ({logs.length} jogadas)</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-0.5 text-left">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Empate Técnico! ({logs.length} jogadas)</span>
                    </div>
                    {drawCountdown !== null && (
                      <span className="text-[10px] font-mono text-amber-400/90 animate-pulse">
                        {isDrawResetPaused 
                          ? '⏸ Limpeza automática parada' 
                          : `🧹 Limpando tabuleiro em ${drawCountdown}s...`
                        }
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  id="btn-copy-summary-outcome"
                  onClick={handleCopyLogs}
                  className={`flex items-center gap-1 text-[10px] uppercase font-mono tracking-wider font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                    copiedLogs
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-sm'
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white'
                  }`}
                  title="Copiar resumo de jogadas"
                >
                  {copiedLogs ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copiar resumo
                    </>
                  )}
                </button>

                {isDraw && drawCountdown !== null && (
                  <div className="flex items-center gap-1.5">
                    <button
                      id="btn-pause-resume-draw"
                      onClick={() => setIsDrawResetPaused(!isDrawResetPaused)}
                      className="flex items-center justify-center px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-all text-[10px] font-mono cursor-pointer"
                      title={isDrawResetPaused ? "Retomar temporizador" : "Pausar temporizador"}
                    >
                      {isDrawResetPaused ? "▶ Retomar" : "⏸ Pausar"}
                    </button>
                    <button
                      id="btn-instant-draw-clear"
                      onClick={handleResetRound}
                      className="flex items-center justify-center px-2 py-1 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                      title="Limpar tabuleiro agora"
                    >
                      Limpar já
                    </button>
                  </div>
                )}

                {winner && (
                  <button
                    id="btn-winner-clear"
                    onClick={handleResetRound}
                    className="flex items-center justify-center px-2.5 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Jogar Novamente
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-400">Vez de jogar:</span>
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-black text-sm ${
                    turn === 'X' 
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' 
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}>
                    {turn}
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    {gameMode === 'pvc' && turn === computerSymbol ? '(Computador a pensar...)' : '(É a tua vez!)'}
                  </span>
                </div>
              </div>

              {gameMode === 'pvc' && (
                <div className="text-xs text-slate-400 flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md font-mono">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
                  Dificuldade: <span className="text-indigo-300 capitalize">{difficulty === 'hard' ? 'Imbatível' : difficulty === 'medium' ? 'Médio' : 'Fácil'}</span>
                </div>
              )}
            </div>
          )}

          {/* THE 3x3 GAME BOARD GRID */}
          <div className="relative w-full aspect-square max-w-[360px] bg-slate-900/50 p-4 rounded-3xl border border-slate-800/80 shadow-2xl grid-glow overflow-hidden">
            
            {/* Background design accents */}
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-3 grid-rows-3 gap-3 h-full w-full relative z-10">
              {board.map((cellValue, idx) => {
                const isWinningCell = winningPattern?.includes(idx);
                const isCellHoverable = !cellValue && !winner && !isDraw && !isComputerThinking && !(gameMode === 'pvc' && turn === computerSymbol);
                
                return (
                  <button
                    key={idx}
                    id={`cell-${idx}`}
                    onClick={() => handleCellClick(idx)}
                    className={`relative rounded-2xl flex items-center justify-center transition-all duration-200 outline-none select-none group h-full w-full ${
                      isWinningCell 
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400 text-slate-950 scale-[1.03] shadow-lg shadow-emerald-500/20 z-10' 
                        : 'bg-slate-950 hover:bg-slate-900 border border-slate-800/80 focus:border-slate-700'
                    }`}
                  >
                    {/* Visual Coordinate helper displayed super subtly in a corner */}
                    <span className={`absolute top-1.5 left-2 text-[8px] font-mono select-none ${isWinningCell ? 'text-emerald-950 font-semibold' : 'text-slate-600'}`}>
                      {Math.floor(idx / 3) + 1},{ (idx % 3) + 1 }
                    </span>

                    {/* Outer visual highlight border */}
                    {isWinningCell && (
                      <span className="absolute inset-0 rounded-2xl border-2 border-emerald-300 animate-pulse pointer-events-none" />
                    )}

                    {/* Highlighted hover piece ghost watermark */}
                    {isCellHoverable && (
                      <span className="absolute text-2xl font-black opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none font-mono">
                        {turn}
                      </span>
                    )}

                    {/* Current Cell Piece */}
                    <AnimatePresence mode="popLayout">
                      {cellValue && (
                        <motion.div
                          initial={{ scale: 0.3, opacity: 0, rotate: cellValue === 'X' ? -45 : 45 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className={`text-4xl font-extrabold font-mono tracking-tight select-none ${
                            isWinningCell 
                              ? 'text-slate-950' 
                              : cellValue === 'X' 
                                ? 'text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-500' 
                                : 'text-transparent bg-clip-text bg-gradient-to-br from-rose-400 to-pink-500'
                          }`}
                        >
                          {cellValue}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          </div>

          {/* GAME ACTION CONTROL BUTTONS */}
          <div className="w-full grid grid-cols-2 gap-3 max-w-[360px]">
            <button
              id="btn-recomecar"
              onClick={handleResetRound}
              className="flex items-center justify-center gap-2 px-5 py-3 border border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:text-slate-200 rounded-2xl text-xs font-semibold tracking-wider uppercase transition-all shadow-md cursor-pointer text-slate-300 group"
            >
              <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" /> Recomeçar
            </button>
            <button
              id="btn-limpar-tudo"
              onClick={handleZerarScores}
              className="flex items-center justify-center gap-2 px-5 py-3 border border-red-950/40 bg-red-950/15 text-red-400 hover:bg-red-950/30 rounded-2xl text-xs font-semibold tracking-wider uppercase transition-all shadow-md cursor-pointer pointer-events-auto"
            >
              <Trash2 className="w-3.5 h-3.5" /> Zerar Placar
            </button>
          </div>

          {/* SCOREBOARD DISPLAY CARD */}
          <div className="w-full max-w-[360px] bg-slate-900/30 border border-slate-900 rounded-3xl p-4 mt-1">
            <h3 className="text-center text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
              <Trophy className="w-3 h-3 text-amber-500" /> Placar da Sessão Local
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              
              {/* Score X */}
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5">
                <p className="text-[10px] font-mono text-cyan-400 leading-none">Jogador X</p>
                <p className="text-xl font-bold mt-1 text-slate-100 font-mono">{stats.winsX}</p>
                <p className="text-[9px] text-slate-500 leading-none mt-0.5">{gameMode === 'pvc' && playerSymbol === 'X' ? 'Tu' : (gameMode === 'pvc' ? 'PC' : 'Turno 1')}</p>
              </div>

              {/* Score Draws */}
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5">
                <p className="text-[10px] font-mono text-slate-400 leading-none">Empates</p>
                <p className="text-xl font-bold mt-1 text-slate-100 font-mono">{stats.draws}</p>
                <div className="w-1.5 h-1.5 bg-slate-700 mx-auto rounded-full mt-1.5" />
              </div>

              {/* Score O */}
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5">
                <p className="text-[10px] font-mono text-rose-400 leading-none">Jogador O</p>
                <p className="text-xl font-bold mt-1 text-slate-100 font-mono">{stats.winsO}</p>
                <p className="text-[9px] text-slate-500 leading-none mt-0.5">{gameMode === 'pvc' && playerSymbol === 'O' ? 'Tu' : (gameMode === 'pvc' ? 'PC' : 'Turno 2')}</p>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: TABS SIDEBAR WITH DATABASE LEADERBOARD & VISUALIZATION */}
        <div className="lg:col-span-5 space-y-4 w-full">
          
          {/* TAB SELECTOR */}
          <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 flex w-full">
            <button
              id="btn-tab-leaderboards"
              onClick={() => setRightSidebarTab('leaderboards')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all ${
                rightSidebarTab === 'leaderboards'
                  ? 'bg-slate-950 text-emerald-400 border border-slate-800 shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Classificação Global (Web)
            </button>
            <button
              id="btn-tab-visualizer"
              onClick={() => setRightSidebarTab('visualizer')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all ${
                rightSidebarTab === 'visualizer'
                  ? 'bg-slate-950 text-cyan-400 border border-slate-800 shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" /> Estrutura de Dados
            </button>
          </div>

          <AnimatePresence mode="wait">
            
            {/* 1. PUBLIC WEB LEADERBOARD TAB */}
            {rightSidebarTab === 'leaderboards' && (
              <motion.div
                key="leaderboard-tab-content"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-slate-900 border border-slate-800 shadow-xl rounded-3xl p-5 space-y-4"
              >
                
                {/* DYNAMIC LEADERBOARD INPUT AND CONGRATS */}
                <AnimatePresence mode="popLayout">
                  {gameMode === 'pvc' && winner === playerSymbol && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-gradient-to-r from-emerald-950/40 to-teal-950/40 p-4 rounded-2xl border border-emerald-500/30 relative overflow-hidden"
                    >
                      <div className="absolute right-2 -bottom-4 opacity-10 pointer-events-none">
                        <Award className="w-24 h-24 text-emerald-400" />
                      </div>
                      
                      <div className="flex items-center gap-2 text-emerald-400 mb-1">
                        <Award className="w-5 h-5 text-amber-400 animate-bounce" />
                        <h4 className="text-xs font-bold uppercase tracking-wider font-mono">Sensacional! Venceste a IA!</h4>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        Gostarias de submeter e eternizar o teu recorde de <span className="font-bold text-amber-400 font-mono">{humanMovesPlayed} jogadas</span> na base de dados pública na Internet?
                      </p>

                      {!hasSavedScore ? (
                        <form onSubmit={handleScoreSubmit} className="space-y-2 relative z-10">
                          <div className="flex gap-2">
                            <input
                              id="inp-player-name"
                              type="text"
                              maxLength={20}
                              placeholder="Teu nome ou alcunha..."
                              value={playerNameInput}
                              onChange={(e) => setPlayerNameInput(e.target.value)}
                              className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 flex-1 outline-none transition-all placeholder:text-slate-600"
                            />
                            <button
                              id="btn-submeter-score"
                              type="submit"
                              disabled={submittingScore}
                              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                            >
                              {submittingScore ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              Registar
                            </button>
                          </div>
                          {scoreError && (
                            <p className="text-[10px] text-red-400 font-mono flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> {scoreError}
                            </p>
                          )}
                        </form>
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs font-semibold"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Pontuação guardada com sucesso! Procura o teu nome abaixo.</span>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* TAB SECTION FOR EACH DIFFICULTY */}
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-1.5">
                      <ListOrdered className="w-4 h-4 text-emerald-400" />
                      <span className="font-mono text-xs font-bold text-slate-300">TABELAS POR DIFICULDADE</span>
                    </div>
                    <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                      Base de Dados Ativa
                    </span>
                  </div>

                  {/* Horizontal pill navigators for standings difficulty */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                      <button
                        key={diff}
                        id={`tbl-diff-tab-${diff}`}
                        onClick={() => setLeaderboardDiffTab(diff)}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          leaderboardDiffTab === diff
                            ? 'bg-slate-800 text-emerald-400 font-bold border border-emerald-800/20'
                            : 'text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        {diff === 'easy' ? 'Fácil' : diff === 'medium' ? 'Médio' : 'Imbatível'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SCORES LIST VIEW */}
                <div className="space-y-2">
                  <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800/60 max-h-[340px] overflow-y-auto custom-scrollbar">
                    {loadingScores ? (
                      <div className="py-12 flex flex-col justify-center items-center text-slate-500 text-xs font-mono">
                        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
                        Carregando tabela mundial...
                      </div>
                    ) : getLeaderboardData(leaderboardDiffTab).length === 0 ? (
                      <div className="py-12 flex flex-col justify-center items-center text-slate-500 text-center px-4">
                        <Trophy className="w-8 h-8 text-slate-700 mb-2" />
                        <p className="text-xs font-mono font-semibold">Nenhuma vitória registada!</p>
                        <p className="text-[10px] text-slate-600 mt-1 max-w-[200px] mx-auto leading-relaxed">
                          Sê o primeiro a vencer a IA nesta dificuldade e publica o teu nome!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {/* Header helper */}
                        <div className="flex font-mono text-[9px] text-slate-500 px-2 py-1 uppercase tracking-wider justify-between border-b border-slate-900 mb-1">
                          <div className="flex gap-4">
                            <span>Pos</span>
                            <span>Jogador</span>
                          </div>
                          <div className="flex gap-6">
                            <span>Jogadas</span>
                            <span>Data</span>
                          </div>
                        </div>

                        {getLeaderboardData(leaderboardDiffTab).map((score, index) => {
                          const isTop1 = index === 0;
                          const isTop2 = index === 1;
                          const isTop3 = index === 2;
                          const formattedDate = new Date(score.timestamp).toLocaleDateString('pt-PT', { 
                            day: 'numeric', 
                            month: 'short' 
                          });

                          return (
                            <div 
                              key={score.id}
                              className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                                isTop1 
                                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200' 
                                  : isTop2 
                                    ? 'bg-slate-300/5 border border-slate-400/20 text-slate-300' 
                                    : isTop3 
                                      ? 'bg-amber-700/10 border border-amber-700/20 text-amber-600'
                                      : 'bg-slate-900/60 hover:bg-slate-900 border border-slate-800/10 text-slate-300'
                              }`}
                            >
                              {/* Left side info (Rank and Name) */}
                              <div className="flex items-center gap-3">
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[11px] font-bold ${
                                  isTop1 
                                    ? 'bg-amber-400 text-slate-950 font-black' 
                                    : isTop2 
                                      ? 'bg-slate-400 text-slate-950' 
                                      : isTop3 
                                        ? 'bg-amber-700 text-slate-100' 
                                        : 'text-slate-500'
                                }`}>
                                  {index + 1}
                                </span>
                                <span className="font-semibold text-xs truncate max-w-[120px] font-sans">
                                  {score.playerName}
                                </span>
                              </div>

                              {/* Right side info (Move counts and Date) */}
                              <div className="flex items-center gap-4 font-mono text-xs">
                                <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800/50 px-2 py-0.5 rounded-lg">
                                  <ChevronRight className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span className="font-bold text-emerald-400">{score.movesCount}</span>
                                  <span className="text-[10px] text-slate-500">jogadas</span>
                                </div>
                                <span className="text-[10px] text-slate-500 shrink-0" title={new Date(score.timestamp).toLocaleTimeString()}>
                                  {formattedDate}
                                </span>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* FOOTER METADATA ABOUT WEB CONNECTION */}
                  <div className="bg-slate-950 border border-slate-900 p-2.5 rounded-2xl flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-pulse" />
                    <span>Esta folha é gerada dinamicamente através de pedidos GET/POST sincronizados em memória com o servidor na Internet.</span>
                  </div>

                </div>

              </motion.div>
            )}

            {/* 2. REAL-TIME DATA STRUCTURE VISUALIZER TAB */}
            {rightSidebarTab === 'visualizer' && (
              <motion.div
                key="visualizer-tab-content"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-slate-900 border border-slate-800 shadow-xl rounded-3xl overflow-hidden flex flex-col h-full"
              >
                {/* Visualizer header */}
                <div className="bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="font-mono text-xs font-bold text-slate-200">INSPEÇÃO DE DATA STATE (3x3)</span>
                  </div>
                  <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                    Tempo Real
                  </span>
                </div>

                {/* Info summary */}
                <div className="p-4 border-b border-slate-800/80 bg-slate-950/20 text-xs text-slate-400 leading-relaxed">
                  Abaixo está a correspondência do tabuleiro com a estrutura de dados em memória. Cada quadrado começa <span className="text-slate-300 font-semibold font-mono">null</span> e é atualizado para <span className="text-cyan-400 font-mono font-semibold">"X"</span> ou <span className="text-rose-400 font-mono font-semibold">"O"</span> ao jogar.
                </div>

                <div className="p-5 space-y-6 flex-1">
                  
                  {/* DIAGRAM 1: ONE-DIMENSIONAL ARRAY VISUALIZATION */}
                  <div>
                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-cyan-400" /> 1. Lista Unidimensional (Array de 9 posições)
                    </h4>
                    
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/60 overflow-x-auto">
                      <div className="flex gap-2 min-w-[340px] py-1 justify-between font-mono">
                        {board.map((cell, index) => (
                          <div 
                            key={index} 
                            className={`flex flex-col items-center flex-1 min-w-[30px] border rounded-lg p-1.5 text-center ${
                              cell === 'X' 
                                ? 'bg-cyan-950/20 border-cyan-500/30' 
                                : cell === 'O' 
                                  ? 'bg-rose-950/20 border-rose-500/30' 
                                  : 'bg-slate-900 border-slate-800'
                            }`}
                          >
                            <span className="text-[9px] text-slate-500 leading-none mb-1">[{index}]</span>
                            <span className={`text-sm font-bold leading-none ${
                              cell === 'X' ? 'text-cyan-400' : cell === 'O' ? 'text-rose-400' : 'text-slate-600'
                            }`}>
                              {cell ? `"${cell}"` : 'null'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* DIAGRAM 2: 3x3 MATRIX VISUALIZER */}
                  <div>
                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-emerald-400" /> 2. Matriz Bidimensional Equivalente (3 × 3)
                    </h4>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/60 font-mono text-xs space-y-2 mt-2">
                      <div className="flex items-center justify-between border-b border-slate-900/60 pb-2">
                        <span className="text-slate-500 text-[10px]">Linha 1 (Índices 0,1,2):</span>
                        <div className="flex gap-1.5">
                          {board.slice(0, 3).map((val, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              val === 'X' ? 'bg-cyan-500/10 text-cyan-400' : val === 'O' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-900 text-slate-600'
                            }`}>
                              {val ? val : '·'}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-b border-slate-900/60 pb-2">
                        <span className="text-slate-500 text-[10px]">Linha 2 (Índices 3,4,5):</span>
                        <div className="flex gap-1.5">
                          {board.slice(3, 6).map((val, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              val === 'X' ? 'bg-cyan-500/10 text-cyan-400' : val === 'O' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-900 text-slate-600'
                            }`}>
                              {val ? val : '·'}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[10px]">Linha 3 (Índices 6,7,8):</span>
                        <div className="flex gap-1.5">
                          {board.slice(6, 9).map((val, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              val === 'X' ? 'bg-cyan-500/10 text-cyan-400' : val === 'O' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-900 text-slate-600'
                            }`}>
                              {val ? val : '·'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LOGS: ACTION MOVE DIARY */}
                  <div>
                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" /> 3. Registo de Eventos Ativos
                      </span>
                      <div className="flex items-center gap-2">
                        {logs.length > 0 && (
                          <button
                            id="btn-copy-history"
                            onClick={handleCopyLogs}
                            className={`flex items-center gap-1 text-[9px] uppercase font-mono tracking-wider font-semibold px-2 py-0.5 rounded-md border transition-all ${
                              copiedLogs
                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-sm'
                                : 'bg-slate-950 border-slate-805 hover:bg-slate-900 text-slate-400 hover:text-slate-300'
                            }`}
                            title="Copiar resumo de jogadas"
                          >
                            {copiedLogs ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" /> Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copiar resumo
                              </>
                            )}
                          </button>
                        )}
                        <span className="text-[10px] font-mono text-slate-500 font-normal">
                          Total: {logs.length} moves
                        </span>
                      </div>
                    </h4>

                    <div className="bg-slate-950 rounded-2xl border border-slate-800/60 h-44 overflow-y-auto custom-scrollbar p-1">
                      {logs.length === 0 ? (
                        <div className="h-full flex flex-col justify-center items-center text-slate-600 py-6 text-center">
                          <AlertCircle className="w-6 h-6 text-slate-700 mb-1" />
                          <p className="text-[11px] font-mono">Nenhum evento registado</p>
                          <p className="text-[9px] text-slate-705 mt-0.5">Clica numa casa para iniciar</p>
                        </div>
                      ) : (
                        <div className="space-y-1 p-1">
                          {logs.map((log) => (
                            <div 
                              key={log.moveNumber} 
                              className="font-mono text-[10px] bg-slate-900/60 hover:bg-slate-900/100 transition-colors p-2 rounded-xl flex items-center justify-between border border-slate-800/20"
                            >
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-md font-extrabold text-[10px] ${
                                  log.player === 'X' 
                                    ? 'bg-cyan-500/15 text-cyan-400' 
                                    : 'bg-rose-500/15 text-rose-400'
                                }`}>
                                  {log.player}
                                </span>
                                <span>
                                  marcou <span className="text-slate-300">[{log.index}]</span> <span className="text-slate-500">→ L{log.row}, C{log.col}</span>
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-600">{log.timestamp}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
        
      </main>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto w-full text-center border-t border-slate-900/60 pt-4 mt-6">
        <p className="text-[10px] font-mono text-slate-600">
          Jogo do Galo Clássivo 3x3 e Base de Dados expressiva em memória local no servidor de Cloud Run.
        </p>
      </footer>

    </div>
  );
}
