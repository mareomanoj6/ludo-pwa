/**
 * Comprehensive Automated Test Suite for Ludo Game Rules & Edge Cases
 * Verifies all 10 categories from the Ludo Logic & Edge Case Checklist
 */

const { BOARD_CONFIG, TRACK_CELLS, PLAYER_PATHS, SAFE_TRACK_INDICES } = require('./js/board-data.js');
const { FairDice } = require('./js/dice.js');
const { LudoGame } = require('./js/game.js');
const { LudoAI } = require('./js/ai.js');

// Setup globals needed by game.js if in node
global.BOARD_CONFIG = BOARD_CONFIG;
global.TRACK_CELLS = TRACK_CELLS;
global.PLAYER_PATHS = PLAYER_PATHS;
global.SAFE_TRACK_INDICES = SAFE_TRACK_INDICES;
global.FairDice = FairDice;
global.LudoAI = LudoAI;

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(message);
  }
}

function testSection(name, fn) {
  console.log(`\n=== Testing Section: ${name} ===`);
  try {
    fn();
  } catch (err) {
    console.error(`Error in section "${name}":`, err.message);
  }
}

// -------------------------------------------------------------
// Section 1: Game Setup & Turn Management
// -------------------------------------------------------------
testSection("1. Game Setup & Turn Management", () => {
  // 1.1 Player Count: 2, 3, 4 players
  const game2 = new LudoGame({ playerCount: 2 });
  assert(game2.players.length === 2, "Game supports 2 players");

  const game3 = new LudoGame({ playerCount: 3 });
  assert(game3.players.length === 3, "Game supports 3 players");

  const game4 = new LudoGame({ playerCount: 4 });
  assert(game4.players.length === 4, "Game supports 4 players");

  // 1.2 Token Allocation: Each player starts with 4 tokens in yard
  game4.players.forEach(p => {
    assert(p.tokens.length === 4, `Player ${p.id} has exactly 4 tokens`);
    const allYard = p.tokens.every(t => t.status === 'yard' && t.step === -1);
    assert(allYard, `Player ${p.id} all 4 tokens start in yard at step -1`);
  });

  // 1.3 Turn Order: Proceeds clockwise
  assert(game4.players[0].id === 'red', "Player 1 is Red");
  assert(game4.players[1].id === 'green', "Player 2 is Green");
  assert(game4.players[2].id === 'yellow', "Player 3 is Yellow");
  assert(game4.players[3].id === 'blue', "Player 4 is Blue");

  game4.start();
  assert(game4.getCurrentPlayer().id === 'red', "Starting player is Red");
  game4.nextTurn();
  assert(game4.getCurrentPlayer().id === 'green', "Turn advances clockwise to Green");
  game4.nextTurn();
  assert(game4.getCurrentPlayer().id === 'yellow', "Turn advances clockwise to Yellow");
  game4.nextTurn();
  assert(game4.getCurrentPlayer().id === 'blue', "Turn advances clockwise to Blue");
  game4.nextTurn();
  assert(game4.getCurrentPlayer().id === 'red', "Turn wraps around to Red");

  // 1.4 Initial State: No tokens on track
  let anyOnTrack = false;
  game4.players.forEach(p => {
    p.tokens.forEach(t => {
      if (t.status !== 'yard') anyOnTrack = true;
    });
  });
  assert(!anyOnTrack, "No tokens are on the track initially");

  // 1.5 Turn Skipping on no valid moves
  const gameSkip = new LudoGame({ playerCount: 4 });
  gameSkip.start();
  // Mock dice roll to 3 (all tokens in yard)
  gameSkip.dice.roll = () => 3;
  let noMovesEmitted = false;
  gameSkip.on('noValidMoves', () => { noMovesEmitted = true; });
  gameSkip.rollDice();
  assert(noMovesEmitted, "noValidMoves emitted when no token can move");
  assert(gameSkip.validMoves.length === 0, "validMoves is empty when rolling 3 with all in yard");
});

// -------------------------------------------------------------
// Section 2: Dice Rolling & Extra Turns
// -------------------------------------------------------------
testSection("2. Dice Rolling & Extra Turns", () => {
  const dice = new FairDice();
  let allInRange = true;
  for (let i = 0; i < 1000; i++) {
    const val = dice.roll();
    if (val < 1 || val > 6 || !Number.isInteger(val)) {
      allInRange = false;
      break;
    }
  }
  assert(allInRange, "FairDice generates only integers 1..6 over 1000 rolls");

  // Rolling a 6 grants extra turn
  const game = new LudoGame({ playerCount: 4 });
  game.start();
  game.dice.roll = () => 6;
  game.rollDice();
  assert(game.validMoves.length === 4, "Rolling 6 unlocks all 4 yard tokens to move");
  game.makeMove(0);
  // Complete move
  let extraTurnFired = false;
  game.on('bonusTurn', ({ reason }) => {
    extraTurnFired = true;
    assert(reason === 'rolled_six', "Bonus turn reason is rolled_six");
  });
  game.completeMove(0);
  assert(extraTurnFired, "Extra turn granted on rolling 6");
  assert(game.getCurrentPlayer().id === 'red', "Player gets to roll again (same current player)");

  // Three 6s Rule: 3rd six nullifies move and ends turn
  const game3Sixes = new LudoGame({ playerCount: 4 });
  game3Sixes.start();
  game3Sixes.dice.roll = () => 6;
  
  // Roll 1: 6
  game3Sixes.rollDice();
  assert(game3Sixes.consecutiveSixes === 1, "Consecutive sixes is 1");
  game3Sixes.makeMove(0);
  game3Sixes.completeMove(0);

  // Roll 2: 6
  game3Sixes.rollDice();
  assert(game3Sixes.consecutiveSixes === 2, "Consecutive sixes is 2");
  game3Sixes.makeMove(0);
  game3Sixes.completeMove(0);

  // Roll 3: 6 -> penalty
  let penaltyFired = false;
  game3Sixes.on('threeSixesPenalty', () => { penaltyFired = true; });
  game3Sixes.rollDice();
  assert(penaltyFired, "Three 6s penalty emitted on 3rd consecutive six");
  assert(game3Sixes.validMoves.length === 0, "3rd six generates no legal moves");
  assert(game3Sixes.consecutiveSixes === 0, "consecutiveSixes reset after 3rd six");

  // First two moves are preserved! Token 0 exited yard to 0 on 1st six, then moved 6 to step 6 on 2nd six
  assert(game3Sixes.players[0].tokens[0].step === 6, "First two 6 moves are preserved on board (step 6)");

  // Bonus turn on capture
  const gameCapture = new LudoGame({ playerCount: 2 });
  gameCapture.start();
  // Put Red token 0 at step 5
  gameCapture.players[0].tokens[0].status = 'track';
  gameCapture.players[0].tokens[0].step = 5;
  // Put Yellow token 0 on the same cell that Red step 6 lands on
  // Red step 6 trackIndex = (0 + 6) % 52 = 6
  // Yellow start is 26, so step = (6 - 26 + 52) % 52 = 32
  gameCapture.players[1].tokens[0].status = 'track';
  gameCapture.players[1].tokens[0].step = 32;

  gameCapture.dice.roll = () => 1; // 5 + 1 = 6
  gameCapture.rollDice();
  gameCapture.makeMove(0);

  let captureBonusFired = false;
  gameCapture.on('bonusTurn', ({ reason }) => {
    captureBonusFired = true;
    assert(reason === 'capture', "Bonus turn reason is capture");
  });
  gameCapture.completeMove(0);
  assert(captureBonusFired, "Bonus roll granted on capture");
  assert(gameCapture.players[1].tokens[0].status === 'yard', "Captured opponent returned to yard");
  assert(gameCapture.players[1].tokens[0].step === -1, "Captured opponent step reset to -1");

  // Bonus turn on Home finish
  const gameHome = new LudoGame({ playerCount: 2 });
  gameHome.start();
  gameHome.players[0].tokens[0].status = 'home_column';
  gameHome.players[0].tokens[0].step = 55; // 1 step from 56
  gameHome.dice.roll = () => 1;
  gameHome.rollDice();
  gameHome.makeMove(0);
  let homeBonusFired = false;
  gameHome.on('bonusTurn', ({ reason }) => {
    homeBonusFired = true;
    assert(reason === 'finish', "Bonus turn reason is finish");
  });
  gameHome.completeMove(0);
  assert(homeBonusFired, "Bonus roll granted when reaching Home");

  // Stacking Bonus Turns: Roll 6 + capture = exactly 1 extra turn
  const gameStack = new LudoGame({ playerCount: 2 });
  gameStack.start();
  gameStack.players[0].tokens[0].status = 'track';
  gameStack.players[0].tokens[0].step = 0;
  // Put opponent at step 6
  gameStack.players[1].tokens[0].status = 'track';
  gameStack.players[1].tokens[0].step = (6 - 26 + 52) % 52;
  gameStack.dice.roll = () => 6;
  gameStack.rollDice();
  gameStack.makeMove(0);
  let bonusTurnCount = 0;
  gameStack.on('bonusTurn', () => { bonusTurnCount++; });
  gameStack.completeMove(0);
  assert(bonusTurnCount === 1, "Rolling 6 AND capturing on same move grants exactly 1 extra roll (no stacking)");
});

// -------------------------------------------------------------
// Section 3: Entering the Active Board (Base Rules)
// -------------------------------------------------------------
testSection("3. Entering the Active Board (Base Rules)", () => {
  const game = new LudoGame({ playerCount: 4 });
  game.start();

  // Rolls 1..5 cannot unlock yard token
  for (let r = 1; r <= 5; r++) {
    const moves = game.calculateValidMoves(game.players[0], r);
    assert(moves.length === 0, `Roll ${r} cannot unlock token from yard`);
  }

  // Roll 6 unlocks yard token
  const moves6 = game.calculateValidMoves(game.players[0], 6);
  assert(moves6.length === 4, "Roll 6 unlocks yard tokens");
  assert(moves6[0].targetStep === 0, "Unlocked token placed at step 0");

  // Starting squares are designated player colored squares
  assert(PLAYER_PATHS.red[0].trackIndex === 0, "Red start is track index 0");
  assert(PLAYER_PATHS.green[0].trackIndex === 13, "Green start is track index 13");
  assert(PLAYER_PATHS.yellow[0].trackIndex === 26, "Yellow start is track index 26");
  assert(PLAYER_PATHS.blue[0].trackIndex === 39, "Blue start is track index 39");

  // Unlocking consumes the 6 roll
  game.dice.roll = () => 6;
  game.rollDice();
  game.makeMove(0);
  game.completeMove(0);
  assert(game.players[0].tokens[0].step === 0, "Token 0 moved to step 0");
  assert(game.players[0].tokens[0].status === 'track', "Token 0 is now on track");
});

// -------------------------------------------------------------
// Section 4: Movement Mechanics
// -------------------------------------------------------------
testSection("4. Movement Mechanics", () => {
  const game = new LudoGame({ playerCount: 4 });
  game.start();

  // Clockwise direction
  const redPath = PLAYER_PATHS.red;
  for (let s = 0; s < 50; s++) {
    const expected = (redPath[s].trackIndex + 1) % 52;
    assert(redPath[s + 1].trackIndex === expected, `Step ${s} to ${s+1} moves clockwise around perimeter`);
  }

  // Distance: moves exactly roll spaces
  game.players[0].tokens[0].status = 'track';
  game.players[0].tokens[0].step = 10;
  const moves4 = game.calculateValidMoves(game.players[0], 4);
  const m = moves4.find(m => m.tokenIndex === 0);
  assert(m.targetStep === 14, "Token advances exactly 4 squares (10 + 4 = 14)");

  // Split moves: can choose between multiple tokens
  game.players[0].tokens[1].status = 'track';
  game.players[0].tokens[1].step = 20;
  const movesSplit = game.calculateValidMoves(game.players[0], 4);
  assert(movesSplit.some(m => m.tokenIndex === 0 && m.targetStep === 14), "Token 0 can move 4");
  assert(movesSplit.some(m => m.tokenIndex === 1 && m.targetStep === 24), "Token 1 can move 4");
});

// -------------------------------------------------------------
// Section 5: Safe Zones
// -------------------------------------------------------------
testSection("5. Safe Zones", () => {
  // 4 start squares + 4 star squares
  assert(SAFE_TRACK_INDICES.has(0), "Red start (0) is safe");
  assert(SAFE_TRACK_INDICES.has(13), "Green start (13) is safe");
  assert(SAFE_TRACK_INDICES.has(26), "Yellow start (26) is safe");
  assert(SAFE_TRACK_INDICES.has(39), "Blue start (39) is safe");

  assert(SAFE_TRACK_INDICES.has(8), "Star cell (8) is safe");
  assert(SAFE_TRACK_INDICES.has(21), "Star cell (21) is safe");
  assert(SAFE_TRACK_INDICES.has(34), "Star cell (34) is safe");
  assert(SAFE_TRACK_INDICES.has(47), "Star cell (47) is safe");

  // Coexistence in safe zones: opponent is NOT captured
  const game = new LudoGame({ playerCount: 2 });
  game.start();
  // Red token 0 at step 7, Yellow token 0 at star cell track index 8
  // Red step 8 is star cell (track index 8)
  game.players[0].tokens[0].status = 'track';
  game.players[0].tokens[0].step = 7;

  // Yellow step for trackIndex 8: (8 - 26 + 52) % 52 = 34
  game.players[1].tokens[0].status = 'track';
  game.players[1].tokens[0].step = 34;

  game.dice.roll = () => 1; // Red moves 7 -> 8 (lands on Yellow on safe star)
  game.rollDice();
  game.makeMove(0);
  game.completeMove(0);

  assert(game.players[1].tokens[0].status === 'track', "Yellow token is NOT captured on safe cell");
  assert(game.players[0].tokens[0].step === 8, "Red token successfully coexists on safe cell");
});

// -------------------------------------------------------------
// Section 6: Capturing (Killing)
// -------------------------------------------------------------
testSection("6. Capturing (Killing)", () => {
  const game = new LudoGame({ playerCount: 2 });
  game.start();

  // Landing on opponent on non-safe square captures them
  game.players[0].tokens[0].status = 'track';
  game.players[0].tokens[0].step = 1; // track index 1 (not safe)
  
  game.players[1].tokens[0].status = 'track';
  // Yellow at track index 3: (3 - 26 + 52) % 52 = 29
  game.players[1].tokens[0].step = 29;

  game.dice.roll = () => 2; // Red lands on step 3 (track index 3)
  game.rollDice();
  game.makeMove(0);
  game.completeMove(0);

  assert(game.players[1].tokens[0].status === 'yard', "Opponent token sent back to base yard");
  assert(game.players[1].tokens[0].step === -1, "Opponent step reset to -1");

  // No self capture
  const gameSelf = new LudoGame({ playerCount: 2 });
  gameSelf.start();
  gameSelf.players[0].tokens[0].status = 'track';
  gameSelf.players[0].tokens[0].step = 1;
  gameSelf.players[0].tokens[1].status = 'track';
  gameSelf.players[0].tokens[1].step = 3;

  gameSelf.dice.roll = () => 2;
  gameSelf.rollDice();
  gameSelf.makeMove(0);
  gameSelf.completeMove(0);

  assert(gameSelf.players[0].tokens[1].status === 'track', "Player does NOT capture own token");
  assert(gameSelf.players[0].tokens[1].step === 3, "Own token remains on track");
});

// -------------------------------------------------------------
// Section 8: Home Column & Winning
// -------------------------------------------------------------
testSection("8. Home Column & Winning", () => {
  const redPath = PLAYER_PATHS.red;
  // Full circuit: steps 0 to 50 are track, 51 is home column
  assert(redPath[50].type === 'track', "Step 50 is track");
  assert(redPath[51].type === 'home_column', "Step 51 is home column");
  assert(redPath[55].type === 'home_column', "Step 55 is home column");
  assert(redPath[56].type === 'finish', "Step 56 is finish");

  // No capture in home column
  for (let s = 51; s <= 55; s++) {
    assert(redPath[s].isSafe === true, `Home column step ${s} is safe`);
  }

  // Exact roll required
  const game = new LudoGame({ playerCount: 2 });
  game.start();
  game.players[0].tokens[0].status = 'home_column';
  game.players[0].tokens[0].step = 54; // needs 2 to reach 56

  const moves3 = game.calculateValidMoves(game.players[0], 3); // 54 + 3 = 57 > 56
  assert(!moves3.some(m => m.tokenIndex === 0), "Overshoot (roll 3 when 2 needed) is illegal");

  const moves2 = game.calculateValidMoves(game.players[0], 2); // 54 + 2 = 56
  assert(moves2.some(m => m.tokenIndex === 0 && m.targetStep === 56), "Exact roll (2) reaches finish");

  const moves1 = game.calculateValidMoves(game.players[0], 1); // 54 + 1 = 55
  assert(moves1.some(m => m.tokenIndex === 0 && m.targetStep === 55), "Roll 1 moves along home column");

  // Winning Condition: All 4 finished
  game.players[0].tokens[0].status = 'finished';
  game.players[0].tokens[0].step = 56;
  game.players[0].tokens[1].status = 'finished';
  game.players[0].tokens[1].step = 56;
  game.players[0].tokens[2].status = 'finished';
  game.players[0].tokens[2].step = 56;
  game.players[0].tokens[3].status = 'home_column';
  game.players[0].tokens[3].step = 55;

  let playerWon = false;
  game.on('playerFinished', ({ player }) => {
    playerWon = true;
    assert(player.id === 'red', "Red finishes as winner");
  });

  game.dice.roll = () => 1;
  game.rollDice();
  game.makeMove(3);
  game.completeMove(3);

  assert(playerWon, "Player wins when 4th token reaches finish");
  assert(game.players[0].finished === true, "Player marked finished");
});

// -------------------------------------------------------------
// Section 9: Critical Edge Cases
// -------------------------------------------------------------
testSection("9. Critical Edge Cases", () => {
  // Dead roll: no legal moves auto-detected
  const game = new LudoGame({ playerCount: 2 });
  game.start();
  game.players[0].tokens[0].status = 'home_column';
  game.players[0].tokens[0].step = 55; // needs 1
  // all other tokens in yard
  game.dice.roll = () => 4; // 55 + 4 = 59 > 56, yard needs 6
  let noMovesCalled = false;
  game.on('noValidMoves', () => { noMovesCalled = true; });
  game.rollDice();
  assert(noMovesCalled, "Dead roll accurately triggers noValidMoves");

  // Mandatory 6 Consumption: tokens at step 54 cannot move on 6, but yard tokens can!
  const game6 = new LudoGame({ playerCount: 2 });
  game6.start();
  game6.players[0].tokens[0].status = 'home_column';
  game6.players[0].tokens[0].step = 54; // needs 2
  // tokens 1, 2, 3 in yard
  const movesYard = game6.calculateValidMoves(game6.players[0], 6);
  assert(movesYard.length === 3, "Only the 3 yard tokens can move on 6; blocked active token cannot");
  assert(movesYard.every(m => m.type === 'exit_yard'), "All valid moves are exit_yard");
});

// -------------------------------------------------------------
// Section 7: Blockades / Doubling
// -------------------------------------------------------------
testSection("7. Blockades / Doubling (Configurable Rule)", () => {
  // Test with blockades disabled (default)
  const gameNoBlock = new LudoGame({ playerCount: 2, rules: { blockades: false } });
  gameNoBlock.start();
  // Yellow puts 2 tokens on track cell (Red step 6)
  const redStep6TrackIdx = PLAYER_PATHS.red[6].trackIndex;
  const yellowStepForRed6 = (redStep6TrackIdx - 26 + 52) % 52;
  gameNoBlock.players[1].tokens[0].status = 'track';
  gameNoBlock.players[1].tokens[0].step = yellowStepForRed6;
  gameNoBlock.players[1].tokens[1].status = 'track';
  gameNoBlock.players[1].tokens[1].step = yellowStepForRed6;

  // Red is at step 4
  gameNoBlock.players[0].tokens[0].status = 'track';
  gameNoBlock.players[0].tokens[0].step = 4;

  // With blockades disabled, Red can move 4 + 4 = 8 (passes through step 6)
  const movesPassing = gameNoBlock.calculateValidMoves(gameNoBlock.players[0], 4);
  assert(movesPassing.some(m => m.tokenIndex === 0 && m.targetStep === 8), "When blockades disabled, player can pass through square with 2 opponents");

  // Now test with blockades enabled!
  const gameBlock = new LudoGame({ playerCount: 2, rules: { blockades: true } });
  gameBlock.start();
  gameBlock.players[1].tokens[0].status = 'track';
  gameBlock.players[1].tokens[0].step = yellowStepForRed6;
  gameBlock.players[1].tokens[1].status = 'track';
  gameBlock.players[1].tokens[1].step = yellowStepForRed6;

  // Red is at step 4
  gameBlock.players[0].tokens[0].status = 'track';
  gameBlock.players[0].tokens[0].step = 4;

  // 7.1 Impassable: Opposing tokens cannot pass a blockade
  const movesBlockedPassing = gameBlock.calculateValidMoves(gameBlock.players[0], 4); // 4 + 4 = 8 crosses step 6
  assert(!movesBlockedPassing.some(m => m.tokenIndex === 0), "Opposing token CANNOT pass through an opponent blockade");

  // 7.2 Cannot land on it to capture it
  const movesBlockedLanding = gameBlock.calculateValidMoves(gameBlock.players[0], 2); // 4 + 2 = 6 lands on blockade
  assert(!movesBlockedLanding.some(m => m.tokenIndex === 0), "Opposing token CANNOT land on an opponent blockade");

  // 7.3 Token CAN stop before the blockade
  const movesBeforeBlockade = gameBlock.calculateValidMoves(gameBlock.players[0], 1); // 4 + 1 = 5
  assert(movesBeforeBlockade.some(m => m.tokenIndex === 0 && m.targetStep === 5), "Opposing token CAN move up to the cell before the blockade");

  // 7.4 Moving a Blockade: Owner CAN move their own token away (breaking the blockade)
  const yellowMoves = gameBlock.calculateValidMoves(gameBlock.players[1], 3);
  assert(yellowMoves.some(m => m.tokenIndex === 0), "Owner CAN move token away to break the blockade");

  // 7.5 Base exit with 1 or 6 rule variation
  const game1or6 = new LudoGame({ playerCount: 2, rules: { exitYardOn: '1_or_6' } });
  game1or6.start();
  const movesOn1 = game1or6.calculateValidMoves(game1or6.players[0], 1);
  assert(movesOn1.length === 4, "Configurable rule '1_or_6' allows tokens to exit base on a roll of 1");
  const movesOn6 = game1or6.calculateValidMoves(game1or6.players[0], 6);
  assert(movesOn6.length === 4, "Configurable rule '1_or_6' allows tokens to exit base on a roll of 6");
});

// -------------------------------------------------------------
// Section 10: Web / Multiplayer / State Persistence
// -------------------------------------------------------------
testSection("10. Web / Multiplayer / Reconnection / State Persistence", () => {
  const game = new LudoGame({
    playerCount: 2,
    rules: { blockades: true, turnTimerSeconds: 15, autoMoveSingle: true }
  });
  game.start();

  // Move token 0 to step 10
  game.players[0].tokens[0].status = 'track';
  game.players[0].tokens[0].step = 10;
  game.currentPlayerIndex = 1;

  // 10.1 Serialization: toJSON captures board state perfectly
  const savedState = game.toJSON();
  assert(savedState.players.length === 2, "State captures 2 players");
  assert(savedState.players[0].tokens[0].step === 10, "State captures token step 10");
  assert(savedState.currentPlayerIndex === 1, "State captures current player index 1");
  assert(savedState.rules.blockades === true, "State captures rules configuration");

  // 10.2 Reconnection / State Restore: loadFromJSON restores game state
  const newGame = new LudoGame();
  const loaded = newGame.loadFromJSON(savedState);
  assert(loaded === true, "loadFromJSON successfully restores state");
  assert(newGame.players[0].tokens[0].step === 10, "Restored player token is at step 10");
  assert(newGame.currentPlayerIndex === 1, "Restored player turn is 1");
  assert(newGame.rules.blockades === true, "Restored rules match saved configuration");

  // 10.3 AI Takeover / Auto-play toggle
  assert(newGame.players[0].isAi === false, "Player 0 initially human");
  let aiToggled = false;
  newGame.on('playerAiChanged', ({ player, isAi }) => {
    aiToggled = isAi;
  });
  newGame.setPlayerAi('red', true);
  assert(aiToggled === true, "playerAiChanged event fired");
  assert(newGame.players[0].isAi === true, "Player 0 successfully taken over by AI");
  newGame.setPlayerAi('red', false);
  assert(newGame.players[0].isAi === false, "Player 0 successfully returned to human control");

  // 10.4 Turn Timer
  let timerTickCount = 0;
  newGame.on('turnTimerTick', () => { timerTickCount++; });
  newGame.startTurnTimer();
  assert(newGame.turnTimeRemaining === 15, "Turn timer initialized with 15 seconds");
  newGame.clearTurnTimer();
  assert(newGame.turnTimerInterval === null, "Turn timer cleanly cleared");
});

console.log(`\n========================================`);
console.log(`Test Results: ${passedTests}/${totalTests} tests passed!`);
console.log(`========================================\n`);
