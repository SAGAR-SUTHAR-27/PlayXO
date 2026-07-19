/* ==========================================================================
   NEON GRID // MINIMAX AI ENGINE
   ========================================================================== */

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

/**
 * Checks if a player has won the game.
 * Returns the winning line array if won, or null.
 */
export function checkWin(board, symbol) {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] === symbol && board[b] === symbol && board[c] === symbol) {
      return line;
    }
  }
  return null;
}

/**
 * Evaluates the board score for minimax.
 * Returns +10 if AI wins, -10 if Player wins, 0 otherwise.
 */
function evaluate(board, aiSymbol, playerSymbol) {
  if (checkWin(board, aiSymbol)) return 10;
  if (checkWin(board, playerSymbol)) return -10;
  return 0;
}

/**
 * Minimax recursive utility to search game tree.
 */
function minimax(board, depth, isMax, aiSymbol, playerSymbol) {
  const score = evaluate(board, aiSymbol, playerSymbol);

  // If AI wins, return score. Subtract depth to favor faster wins.
  if (score === 10) return score - depth;
  // If player wins, return score. Add depth to favor longer survival.
  if (score === -10) return score + depth;
  // If draw, return 0
  if (!board.includes(null)) return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = aiSymbol;
        best = Math.max(best, minimax(board, depth + 1, false, aiSymbol, playerSymbol));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = playerSymbol;
        best = Math.min(best, minimax(board, depth + 1, true, aiSymbol, playerSymbol));
        board[i] = null;
      }
    }
    return best;
  }
}

/**
 * Returns the optimal index for the AI to play.
 */
export function getAIMove(board, difficulty, aiSymbol, playerSymbol) {
  const emptyCells = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
  
  if (emptyCells.length === 0) return null;

  // 1. EASY MODE: Pick a random spot
  if (difficulty === 'easy') {
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  // 2. MEDIUM MODE: Tactically block or win, otherwise pick random
  if (difficulty === 'medium') {
    // Check if AI can win this move
    for (const cell of emptyCells) {
      board[cell] = aiSymbol;
      const isWin = checkWin(board, aiSymbol);
      board[cell] = null;
      if (isWin) return cell;
    }

    // Check if player can win this move (block it!)
    for (const cell of emptyCells) {
      board[cell] = playerSymbol;
      const isLoss = checkWin(board, playerSymbol);
      board[cell] = null;
      if (isLoss) return cell;
    }

    // Target center square if open (highly strategic)
    if (emptyCells.includes(4)) return 4;

    // Otherwise, select a random empty square
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  // 3. UNBEATABLE (HARD) MODE: Minimax
  let bestVal = -Infinity;
  let bestMove = null;

  // Optimize first move speed: If board is entirely empty, pick corner/center immediately
  if (emptyCells.length === 9) {
    const openings = [0, 2, 4, 6, 8]; // Corners or center
    return openings[Math.floor(Math.random() * openings.length)];
  }

  for (const cell of emptyCells) {
    board[cell] = aiSymbol;
    // Calculate evaluation for this move
    const moveVal = minimax(board, 0, false, aiSymbol, playerSymbol);
    board[cell] = null;

    if (moveVal > bestVal) {
      bestVal = moveVal;
      bestMove = cell;
    }
  }

  return bestMove;
}
