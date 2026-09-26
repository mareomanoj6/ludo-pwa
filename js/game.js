/**
 * Ludo Game State Machine & Rules Engine
 * Implements 2-4 player Ludo with fair dice, captures, safe cells, AI support, and clean events.
 */

const getGlobalPaths = () => (typeof window !== 'undefined' ? window.PLAYER_PATHS : (typeof global !== 'undefined' ? global.PLAYER_PATHS : {}));
const getGlobalAI = () => (typeof window !== 'undefined' ? window.LudoAI : (typeof global !== 'undefined' ? global.LudoAI : null));

class LudoGame {
  constructor(config = {}) {
    this.dice = new FairDice();
    this.players = [];
    this.currentPlayerIndex = 0;
    this.consecutiveSixes = 0;
    this.currentRoll = null;
    this.validMoves = [];
    this.state = 'INIT'; // INIT, WAITING_ROLL, ROLLING, WAITING_MOVE, MOVING, GAME_OVER
    this.rankings = [];
    this.listeners = {};
    this.moveInProgress = false;

    this.configure(config);
  }

  /**
   * Configure and initialize a new game
   * @param {Object} config
   *   - playerCount: 2, 3, or 4
   *   - playerConfigs: array of { id, isAi, difficulty, name }
   */
  configure(config = {}) {
    const playerCount = config.playerCount || 4;
    let selectedColors = config.selectedColors;

    if (!selectedColors || selectedColors.length === 0) {
      if (playerCount === 2) {
        selectedColors = config.twoPlayerColors || ['red', 'yellow'];
      } else if (playerCount === 3) {
        selectedColors = ['red', 'green', 'yellow'];
      } else {
        selectedColors = ['red', 'green', 'yellow', 'blue'];
      }
    }

    const cfgObj = typeof window !== 'undefined' ? window.BOARD_CONFIG : (typeof global !== 'undefined' ? global.BOARD_CONFIG : null);
    const pathsObj = typeof window !== 'undefined' ? window.PLAYER_PATHS : (typeof global !== 'undefined' ? global.PLAYER_PATHS : null);

    this.players = selectedColors.map((colorId, idx) => {
      const customCfg = (config.playerConfigs && config.playerConfigs.find(p => p.id === colorId)) || {};
      const baseInfo = cfgObj ? cfgObj.PLAYERS[colorId] : { name: colorId };

      return {
        id: colorId,
        name: customCfg.name || baseInfo.name || colorId.toUpperCase(),
        color: baseInfo.color,
        isAi: customCfg.isAi !== undefined ? customCfg.isAi : (idx > 0), // Default: P1 human, rest AI
        difficulty: customCfg.difficulty || 'medium',
        active: true,
        finished: false,
        rank: null,
        tokens: [0, 1, 2, 3].map(tIdx => ({
          id: `${colorId}_${tIdx}`,
          playerId: colorId,
          tokenIndex: tIdx,
          status: 'yard', // yard, track, home_column, finished
          step: -1 // -1 = yard, 0..50 = track, 51..55 = home col, 56 = finished
        }))
      };
    });

    this.currentPlayerIndex = 0;
    this.consecutiveSixes = 0;
    this.currentRoll = null;
    this.validMoves = [];
    this.rankings = [];
    this.state = 'WAITING_ROLL';
    this.moveInProgress = false;
  }

  /**
   * Subscribe to game events
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return this;
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  /**
   * Start or restart the game
   */
  start() {
    this.state = 'WAITING_ROLL';
    this.emit('gameStart', {
      players: this.players,
      currentPlayer: this.getCurrentPlayer()
    });
    this.checkAiTurn();
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  /**
   * Trigger dice roll for current player
   */
  rollDice() {
    if (this.state !== 'WAITING_ROLL' || this.moveInProgress) {
      return null;
    }

    this.state = 'ROLLING';
    const player = this.getCurrentPlayer();
    const roll = this.dice.roll();
    this.currentRoll = roll;

    // Track consecutive sixes
    if (roll === 6) {
      this.consecutiveSixes++;
    } else {
      this.consecutiveSixes = 0;
    }

    this.emit('diceRolled', {
      player,
      roll,
      consecutiveSixes: this.consecutiveSixes
    });

    // Rule: 3 consecutive sixes skips move and passes turn
    if (this.consecutiveSixes >= 3) {
      this.state = 'SKIPPED';
      this.validMoves = [];
      this.consecutiveSixes = 0;
      this.emit('threeSixesPenalty', { player, roll });
      setTimeout(() => {
        this.nextTurn();
      }, 1500);
      return roll;
    }

    // Evaluate valid moves
    const validMoves = this.calculateValidMoves(player, roll);
    this.validMoves = validMoves;

    if (validMoves.length === 0) {
      this.state = 'WAITING_MOVE';
      this.emit('noValidMoves', { player, roll });
      setTimeout(() => {
        this.nextTurn();
      }, 1100);
    } else {
      this.state = 'WAITING_MOVE';
      this.emit('validMovesAvailable', { player, roll, validMoves });

      // If current player is AI, schedule automated move
      if (player.isAi) {
        this.handleAiMove(player, roll, validMoves);
      }
    }

    return roll;
  }

  /**
   * Calculate all legal moves for player with the given roll
   */
  calculateValidMoves(player, roll) {
    const moves = [];

    player.tokens.forEach(token => {
      // 1. Token in yard: requires a 6 to enter step 0
      if (token.status === 'yard') {
        if (roll === 6) {
          moves.push({
            token,
            tokenIndex: token.tokenIndex,
            currentStep: -1,
            targetStep: 0,
            type: 'exit_yard'
          });
        }
      } 
      // 2. Token already on track or home column
      else if (token.status === 'track' || token.status === 'home_column') {
        const targetStep = token.step + roll;
        // Exactly reaches finish or within home stretch
        if (targetStep <= 56) {
          moves.push({
            token,
            tokenIndex: token.tokenIndex,
            currentStep: token.step,
            targetStep: targetStep,
            type: targetStep === 56 ? 'finish' : (targetStep >= 51 ? 'home_column' : 'track')
          });
        }
        // If targetStep > 56: overshoot, illegal move
      }
    });

    return moves;
  }

  /**
   * Execute move for a selected token
   */
  makeMove(tokenIndex) {
    if (this.state !== 'WAITING_MOVE' || this.moveInProgress) {
      return false;
    }

    const player = this.getCurrentPlayer();
    const move = this.validMoves.find(m => m.tokenIndex === tokenIndex);
    if (!move) return false;

    this.moveInProgress = true;
    this.state = 'MOVING';

    const token = player.tokens[tokenIndex];
    const paths = getGlobalPaths();
    const path = paths[player.id];

    // Compute step sequence for animation
    const stepsSequence = [];
    if (move.currentStep === -1) {
      // Yard to Step 0
      stepsSequence.push(path[0]);
    } else {
      for (let s = move.currentStep + 1; s <= move.targetStep; s++) {
        stepsSequence.push(path[s]);
      }
    }

    this.emit('moveStart', {
      player,
      token,
      move,
      stepsSequence
    });

    return true;
  }

  /**
   * Called by renderer when step-by-step movement animation completes
   */
  completeMove(tokenIndex) {
    const player = this.getCurrentPlayer();
    const token = player.tokens[tokenIndex];
    const move = this.validMoves.find(m => m.tokenIndex === tokenIndex);
    if (!move) return;

    // Update token state
    token.step = move.targetStep;
    if (token.step === 56) {
      token.status = 'finished';
    } else if (token.step >= 51) {
      token.status = 'home_column';
    } else {
      token.status = 'track';
    }

    let extraTurn = false;
    let extraReason = null;
    const capturedTokens = [];

    // 1. Check capture on landing cell (only if on track and not a safe cell)
    if (token.status === 'track') {
      const paths = getGlobalPaths();
      const landingCell = paths[player.id] ? paths[player.id][token.step] : null;
      if (landingCell && !landingCell.isSafe) {
        const landingTrackIndex = landingCell.trackIndex;

        // Check if opponent tokens are on this same track index
        this.players.forEach(otherPlayer => {
          if (otherPlayer.id === player.id || !otherPlayer.active) return;

          otherPlayer.tokens.forEach(otherToken => {
            if (otherToken.status === 'track') {
              const otherCell = paths[otherPlayer.id] ? paths[otherPlayer.id][otherToken.step] : null;
              if (otherCell && otherCell.trackIndex === landingTrackIndex) {
                // Captured! Send back to yard
                otherToken.status = 'yard';
                otherToken.step = -1;
                capturedTokens.push({
                  player: otherPlayer,
                  token: otherToken
                });
              }
            }
          });
        });

        if (capturedTokens.length > 0) {
          extraTurn = true;
          extraReason = 'capture';
        }
      }
    }

    // 2. Check token reached home finish
    if (token.status === 'finished') {
      extraTurn = true;
      extraReason = 'finish';
    }

    // 3. Check rolled 6 bonus (unless 3rd consecutive)
    if (this.currentRoll === 6 && this.consecutiveSixes < 3) {
      extraTurn = true;
      if (!extraReason) extraReason = 'rolled_six';
    }

    // Check if player has won (all 4 tokens finished)
    const hasWon = player.tokens.every(t => t.status === 'finished');
    if (hasWon && !player.finished) {
      player.finished = true;
      this.rankings.push(player);
      player.rank = this.rankings.length;

      this.emit('playerFinished', {
        player,
        rank: player.rank,
        rankings: this.rankings
      });

      // Check if game is completely over
      const activeRemaining = this.players.filter(p => !p.finished);
      if (activeRemaining.length <= 1) {
        if (activeRemaining.length === 1) {
          const lastPlayer = activeRemaining[0];
          lastPlayer.finished = true;
          this.rankings.push(lastPlayer);
          lastPlayer.rank = this.rankings.length;
        }

        this.state = 'GAME_OVER';
        this.moveInProgress = false;
        this.emit('gameOver', {
          winner: this.rankings[0],
          rankings: this.rankings
        });
        return;
      }
    }

    this.emit('moveCompleted', {
      player,
      token,
      capturedTokens,
      extraTurn,
      extraReason
    });

    this.moveInProgress = false;

    // Next turn or repeat turn
    if (extraTurn && !player.finished) {
      this.state = 'WAITING_ROLL';
      this.emit('bonusTurn', { player, reason: extraReason });
      this.checkAiTurn();
    } else {
      this.nextTurn();
    }
  }

  /**
   * Advance turn to the next active player
   */
  nextTurn() {
    this.consecutiveSixes = 0;
    this.currentRoll = null;
    this.validMoves = [];

    // Find next unfinished player
    let attempts = 0;
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      attempts++;
    } while (this.players[this.currentPlayerIndex].finished && attempts < this.players.length);

    this.state = 'WAITING_ROLL';
    const nextPlayer = this.getCurrentPlayer();

    this.emit('turnChanged', {
      player: nextPlayer,
      playerIndex: this.currentPlayerIndex
    });

    this.checkAiTurn();
  }

  /**
   * Automated turn scheduling for AI computer players
   */
  checkAiTurn() {
    const player = this.getCurrentPlayer();
    if (player && player.isAi && this.state === 'WAITING_ROLL' && !this.moveInProgress) {
      // Natural human-like pause before rolling
      setTimeout(() => {
        if (this.state === 'WAITING_ROLL' && this.getCurrentPlayer().id === player.id) {
          this.rollDice();
        }
      }, 750);
    }
  }

  handleAiMove(player, roll, validMoves) {
    // Slight pause to let human player register the roll result
    setTimeout(() => {
      if (this.state !== 'WAITING_MOVE') return;

      const aiEngine = getGlobalAI();
      const selectedMove = aiEngine
        ? aiEngine.selectMove(player, roll, validMoves, this, player.difficulty)
        : validMoves[0];

      if (selectedMove) {
        this.makeMove(selectedMove.tokenIndex);
      }
    }, 650);
  }
}

// Export
if (typeof window !== 'undefined') {
  window.LudoGame = LudoGame;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LudoGame };
}
