/**
 * AI Decision Engine for Minimal Ludo
 * Supports 3 Difficulty Levels: Easy, Medium, Hard
 */

const getAIPaths = () => (typeof window !== 'undefined' ? window.PLAYER_PATHS : (typeof global !== 'undefined' ? global.PLAYER_PATHS : {}));

class LudoAI {
  /**
   * Selects the best move for a computer player given the current game state and roll.
   * @param {Object} player - Current player state
   * @param {number} roll - Current dice roll (1-6)
   * @param {Array} validMoves - Array of { tokenIndex, currentStep, targetStep, type }
   * @param {Object} gameState - Full game state for board evaluation
   * @param {string} difficulty - 'easy', 'medium', or 'hard'
   * @returns {Object} Selected move { tokenIndex }
   */
  static selectMove(player, roll, validMoves, gameState, difficulty = 'medium') {
    if (!validMoves || validMoves.length === 0) return null;
    if (validMoves.length === 1) return validMoves[0];

    const diff = (difficulty || 'medium').toLowerCase();

    if (diff === 'easy') {
      return this._selectEasy(validMoves);
    } else if (diff === 'hard') {
      return this._selectHard(player, roll, validMoves, gameState);
    } else {
      return this._selectMedium(player, roll, validMoves, gameState);
    }
  }

  /**
   * Easy: Pure random selection among valid moves
   */
  static _selectEasy(validMoves) {
    const idx = Math.floor(Math.random() * validMoves.length);
    return validMoves[idx];
  }

  /**
   * Medium: Rule-of-thumb priority heuristic
   */
  static _selectMedium(player, roll, validMoves, gameState) {
    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    for (const move of validMoves) {
      let score = 0;
      const targetStep = move.targetStep;

      // 1. Capture opportunity
      if (this._willCaptureOpponent(player, move, gameState)) {
        score += 160;
      }

      // 2. Reach Home finish
      if (targetStep === 56) {
        score += 140;
      }

      // 3. Bring piece out of yard on 6
      if (move.currentStep === -1) {
        score += 95;
      }

      // 4. Enter safe home column or safe star/start cell
      if (targetStep >= 51) {
        score += 60;
      } else if (this._isSafeStep(player.id, targetStep)) {
        score += 45;
      }

      // 5. Escaping danger (currently on an unsafe cell with opponent behind)
      if (move.currentStep >= 0 && this._isUnderImmediateThreat(player, move.currentStep, gameState)) {
        score += 40;
      }

      // 6. Prefer moving pieces closer to home
      score += targetStep * 0.5;

      // Add small randomness to break ties naturally
      score += Math.random() * 2;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Hard: Deep tactical evaluation simulating threats, opponent positions, and capture value
   */
  static _selectHard(player, roll, validMoves, gameState) {
    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    for (const move of validMoves) {
      let score = 0;
      const currentStep = move.currentStep;
      const targetStep = move.targetStep;

      // Capture analysis: high reward, scaled by how far advanced the captured opponent was
      const captureInfo = this._getCaptureDetails(player, move, gameState);
      if (captureInfo.captured) {
        score += 200 + captureInfo.opponentStep * 2;
      }

      // Reaching home finish is the ultimate goal
      if (targetStep === 56) {
        score += 260;
      }

      // Entering home stretch (safe forever)
      if (currentStep < 51 && targetStep >= 51 && targetStep < 56) {
        score += 85;
      }

      // Exiting yard
      if (currentStep === -1) {
        const activeTokens = player.tokens.filter(t => t.status === 'track' || t.status === 'home_column').length;
        if (activeTokens === 0) {
          score += 150; // Must get onto board
        } else if (activeTokens === 1) {
          score += 90;
        } else {
          score += 65;
        }
      }

      // Safe landing
      if (this._isSafeStep(player.id, targetStep)) {
        score += 55;
      } else if (targetStep < 51) {
        // Landing on an unsafe cell: evaluate threat from opponents within 1..6 squares behind
        const threatSeverity = this._calculateThreatLevel(player, targetStep, gameState);
        score -= threatSeverity;
      }

      // Escape from current threat
      if (currentStep >= 0 && currentStep < 51 && !this._isSafeStep(player.id, currentStep)) {
        const currentThreat = this._calculateThreatLevel(player, currentStep, gameState);
        if (currentThreat > 0) {
          score += currentThreat * 0.85; // Escaping is rewarded
        }
      }

      // Progression reward
      score += targetStep * 0.8;

      // Break ties deterministically or with micro-jitter
      score += Math.random() * 0.5;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Checks if landing step is a safe cell (start cell or star cell, or home column)
   */
  static _isSafeStep(playerId, step) {
    if (step >= 51) return true; // Home stretch and finish are safe
    if (step < 0) return true;
    const paths = getAIPaths();
    const path = paths[playerId];
    if (!path || !path[step]) return false;
    return !!path[step].isSafe;
  }

  /**
   * Checks if this move will capture an opponent's token
   */
  static _willCaptureOpponent(player, move, gameState) {
    const details = this._getCaptureDetails(player, move, gameState);
    return details.captured;
  }

  /**
   * Detailed check for opponent capture on target cell
   */
  static _getCaptureDetails(player, move, gameState) {
    if (move.targetStep >= 51 || move.targetStep < 0) {
      return { captured: false };
    }

    const paths = getAIPaths();
    const path = paths[player.id];
    if (!path || !path[move.targetStep]) return { captured: false };

    const targetCell = path[move.targetStep];
    if (targetCell.isSafe) return { captured: false };

    const targetTrackIndex = targetCell.trackIndex;

    // Check all opponents' tokens on the same trackIndex
    for (const otherPlayer of gameState.players) {
      if (otherPlayer.id === player.id || !otherPlayer.active) continue;

      for (const token of otherPlayer.tokens) {
        if (token.status === 'track') {
          const otherPath = paths[otherPlayer.id];
          const otherCell = otherPath ? otherPath[token.step] : null;
          if (otherCell && otherCell.trackIndex === targetTrackIndex) {
            return {
              captured: true,
              opponentPlayer: otherPlayer.id,
              opponentStep: token.step
            };
          }
        }
      }
    }

    return { captured: false };
  }

  /**
   * Evaluates if any opponent on track is 1-6 steps behind this step
   */
  static _calculateThreatLevel(player, step, gameState) {
    if (step >= 51 || step < 0) return 0;
    const paths = getAIPaths();
    const path = paths[player.id];
    if (!path || !path[step] || path[step].isSafe) return 0;

    const trackIndex = path[step].trackIndex;
    let maxThreat = 0;

    for (const otherPlayer of gameState.players) {
      if (otherPlayer.id === player.id || !otherPlayer.active) continue;

      for (const token of otherPlayer.tokens) {
        if (token.status === 'track') {
          const otherPath = paths[otherPlayer.id];
          const otherCell = otherPath ? otherPath[token.step] : null;
          if (otherCell) {
            const otherTrackIndex = otherCell.trackIndex;
            // Calculate distance along track (clockwise)
            const distance = (trackIndex - otherTrackIndex + 52) % 52;
            if (distance >= 1 && distance <= 6) {
              // Higher threat if closer
              const threat = 90 - (distance * 6);
              if (threat > maxThreat) {
                maxThreat = threat;
              }
            }
          }
        }
      }
    }

    return maxThreat;
  }

  static _isUnderImmediateThreat(player, step, gameState) {
    return this._calculateThreatLevel(player, step, gameState) > 0;
  }
}

// Export
if (typeof window !== 'undefined') {
  window.LudoAI = LudoAI;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LudoAI };
}
