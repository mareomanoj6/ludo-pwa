/**
 * Minimal Ludo — Main Application Controller
 * Connects Game Engine, Renderer, Audio, Theming, Modals, and PWA Installation.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('PWA Service Worker registered:', reg.scope))
      .catch(err => console.log('Service Worker registration failed:', err));
  }

  // PWA Install prompt handling
  let deferredPrompt = null;
  const installBtn = document.getElementById('install-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('User response to install:', outcome);
        deferredPrompt = null;
        installBtn.style.display = 'none';
      }
    });
  }

  // Theme Management (Dark mode default, light mode toggle)
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  function initTheme() {
    const savedTheme = localStorage.getItem('ludo_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('ludo_theme', newTheme);
    updateThemeIcon(newTheme);
  }

  function updateThemeIcon(theme) {
    if (!themeIcon) return;
    if (theme === 'light') {
      themeIcon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>`;
      if (themeColorMeta) themeColorMeta.setAttribute('content', '#f6f8fa');
    } else {
      themeIcon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>`;
      if (themeColorMeta) themeColorMeta.setAttribute('content', '#0d1117');
    }
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }
  initTheme();

  // Sound Management
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const soundIcon = document.getElementById('sound-icon');

  function updateSoundIcon() {
    if (!soundIcon || !window.soundController) return;
    const isMuted = window.soundController.isMuted();
    if (isMuted) {
      soundIcon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
        </svg>`;
    } else {
      soundIcon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>`;
    }
  }

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      window.soundController.toggleMute();
      updateSoundIcon();
    });
  }
  updateSoundIcon();

  // UI Element References
  const svgBoard = document.getElementById('ludo-board-svg');
  const gameArena = document.getElementById('game-arena');
  const hudBar = document.getElementById('hud-bar');
  const diceBox = document.getElementById('dice-box');
  const rollBtn = document.getElementById('roll-btn');
  const toast = document.getElementById('game-toast');
  const playerDot = document.getElementById('player-dot');
  const playerName = document.getElementById('player-name');
  const playerTypeTag = document.getElementById('player-type-tag');
  const playerSideTag = document.getElementById('player-side-tag');
  const turnActionHint = document.getElementById('turn-action-hint');

  // Modal References
  const setupModal = document.getElementById('setup-modal');
  const statsModal = document.getElementById('stats-modal');
  const rulesModal = document.getElementById('rules-modal');
  const victoryModal = document.getElementById('victory-modal');

  const newGameBtn = document.getElementById('new-game-btn');
  const statsBtn = document.getElementById('stats-btn');
  const rulesBtn = document.getElementById('rules-btn');

  // Initialize Game & Renderer
  const renderer = new LudoRenderer(svgBoard, {
    gameArena,
    hudBar,
    diceBox,
    rollBtn,
    toast,
    playerDot,
    playerName,
    playerTypeTag,
    playerSideTag,
    turnActionHint
  });

  let game = new LudoGame({ playerCount: 4 });

  // Bind Game Events to Renderer and Audio
  function attachGameListeners(g) {
    g.on('gameStart', ({ players, currentPlayer }) => {
      renderer.renderTokens(players);
      renderer.updateHUD(currentPlayer, g.state);
      renderer.renderDice(1, false, !currentPlayer.isAi, currentPlayer.color);
    });

    g.on('turnChanged', ({ player }) => {
      renderer.clearHighlights();
      renderer.updateHUD(player, g.state);
      renderer.renderDice(g.currentRoll || 1, false, !player.isAi, player.color);
    });

    g.on('diceRolled', ({ player, roll }) => {
      if (window.soundController) window.soundController.playDiceRoll();
      renderer.renderDice(roll, true, false, player.color);
      setTimeout(() => {
        renderer.renderDice(roll, false, false, player.color);
        renderer.updateHUD(player, g.state, roll);
      }, 450);
    });

    g.on('threeSixesPenalty', ({ player, roll }) => {
      if (window.soundController) window.soundController.playPenalty();
      renderer.showToast('3rd Six! Move skipped', 1500);
      renderer.updateHUD(player, 'SKIPPED', roll);
    });

    g.on('noValidMoves', ({ player, roll }) => {
      renderer.showToast(`Rolled ${roll} — No valid moves`, 1200);
      renderer.renderDice(roll, false, false, player.color);
    });

    g.on('validMovesAvailable', ({ player, roll, validMoves }) => {
      renderer.updateHUD(player, g.state, roll);
      if (!player.isAi) {
        renderer.highlightValidMoves(validMoves, (tokenIndex) => {
          g.makeMove(tokenIndex);
        });
      }
    });

    g.on('moveStart', async ({ player, token, move, stepsSequence }) => {
      renderer.clearHighlights();
      await renderer.animateStepByStep(token, stepsSequence, () => {
        g.completeMove(token.tokenIndex);
      });
    });

    g.on('moveCompleted', async ({ player, token, capturedTokens, extraTurn, extraReason }) => {
      // Re-cluster tokens on board
      renderer.updateClusteredTokens(g.players);

      if (capturedTokens && capturedTokens.length > 0) {
        if (window.soundController) window.soundController.playCapture();
        capturedTokens.forEach(captured => {
          renderer.animateCapture(captured);
          renderer.showToast(`Captured ${captured.player.name}'s piece! +1 roll`, 1600);
        });
      } else if (token.status === 'finished') {
        if (window.soundController) window.soundController.playHome();
        renderer.showToast(`${player.name}'s token reached Home! +1 roll`, 1600);
      } else if (extraReason === 'rolled_six') {
        renderer.showToast('Rolled a 6! Extra turn', 1200);
      }
    });

    g.on('bonusTurn', ({ player, reason }) => {
      renderer.updateHUD(player, g.state);
      renderer.renderDice(g.currentRoll || 6, false, !player.isAi, player.color);
    });

    g.on('gameOver', ({ winner, rankings }) => {
      if (window.soundController) window.soundController.playWin();
      showVictoryModal(winner, rankings);
    });
  }

  // Modal Open/Close Helpers
  function openModal(modal) {
    if (modal) modal.classList.add('active');
  }

  function closeModal(modal) {
    if (modal) modal.classList.remove('active');
  }

  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(setupModal);
      closeModal(statsModal);
      closeModal(rulesModal);
      closeModal(victoryModal);
      if (game && game.state === 'INIT') {
        startConfiguredGame();
      }
    });
  });

  // Dice Interaction
  function handleDiceClick() {
    if (game.state === 'WAITING_ROLL' && !game.getCurrentPlayer().isAi) {
      game.rollDice();
    }
  }

  if (diceBox) diceBox.addEventListener('click', handleDiceClick);
  if (rollBtn) rollBtn.addEventListener('click', handleDiceClick);

  // Keyboard Shortcuts: Space / Enter to roll dice, 1-4 to move token
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === 'Enter') {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
        e.preventDefault();
        handleDiceClick();
      }
    } else if (['1', '2', '3', '4'].includes(e.key)) {
      if (game.state === 'WAITING_MOVE' && !game.getCurrentPlayer().isAi) {
        const tokenIdx = parseInt(e.key, 10) - 1;
        const valid = game.validMoves.find(m => m.tokenIndex === tokenIdx);
        if (valid) {
          game.makeMove(tokenIdx);
        }
      }
    }
  });

  // Setup Modal Handling
  if (newGameBtn) {
    newGameBtn.addEventListener('click', () => {
      openModal(setupModal);
    });
  }

  // Setup State
  let selectedMode = 'ai'; // 'ai' or 'local'
  let selectedPlayerCount = 4; // 2, 3, or 4
  let selectedHumanColor = 'red'; // 'red', 'blue', 'green', 'yellow'

  const aiOptionsPanel = document.getElementById('ai-options-panel');
  const setupSummaryText = document.getElementById('setup-summary-text');

  function updateSetupSummary() {
    if (!setupSummaryText) return;
    const colorCapitalized = selectedHumanColor.charAt(0).toUpperCase() + selectedHumanColor.slice(1);

    if (selectedMode === 'ai') {
      const aiCount = selectedPlayerCount - 1;
      const aiLabel = aiCount === 1 ? '1 Computer player' : `${aiCount} Computer players`;
      setupSummaryText.textContent = `You (${colorCapitalized}) vs ${aiLabel}`;
    } else {
      let colorDesc = 'Red, Green, Yellow, Blue';
      if (selectedPlayerCount === 2) colorDesc = 'Red & Yellow';
      else if (selectedPlayerCount === 3) colorDesc = 'Red, Green & Yellow';
      setupSummaryText.textContent = `${selectedPlayerCount} Human players (${colorDesc}) sharing this device`;
    }
  }

  // Step 1: Mode Selection
  const modeCards = document.querySelectorAll('.mode-card');
  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      modeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedMode = card.dataset.mode;

      if (aiOptionsPanel) {
        aiOptionsPanel.style.display = selectedMode === 'ai' ? 'flex' : 'none';
      }
      updateSetupSummary();
    });
  });

  // Step 2: Player Count Selection
  const countButtons = document.querySelectorAll('#player-count-control .segment-btn');
  countButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      countButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPlayerCount = parseInt(btn.dataset.playerCount, 10);
      updateSetupSummary();
    });
  });

  // Human Color Selection (for vs AI mode)
  const colorButtons = document.querySelectorAll('#human-color-control .color-pick-btn');
  colorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      colorButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedHumanColor = btn.dataset.color;
      updateSetupSummary();
    });
  });

  updateSetupSummary();

  function startConfiguredGame() {
    let playerConfigs = [];
    let activeColors = [];

    if (selectedMode === 'ai') {
      const allColors = ['red', 'green', 'yellow', 'blue'];
      const oppositeMap = { red: 'yellow', yellow: 'red', blue: 'green', green: 'blue' };

      if (selectedPlayerCount === 2) {
        // Human color and opposite color
        const oppColor = oppositeMap[selectedHumanColor] || 'yellow';
        activeColors = [selectedHumanColor, oppColor];
      } else if (selectedPlayerCount === 3) {
        // Human color plus next 2 clockwise colors
        const startIdx = allColors.indexOf(selectedHumanColor);
        activeColors = [
          selectedHumanColor,
          allColors[(startIdx + 1) % 4],
          allColors[(startIdx + 2) % 4]
        ];
      } else {
        // All 4 colors
        activeColors = allColors;
      }

      playerConfigs = activeColors.map(c => {
        const isHuman = c === selectedHumanColor;
        const cCap = c.charAt(0).toUpperCase() + c.slice(1);
        return {
          id: c,
          name: isHuman ? `You (${cCap})` : `${cCap} (AI)`,
          isAi: !isHuman,
          difficulty: 'medium'
        };
      });
    } else {
      // Local Pass & Play (All Human)
      if (selectedPlayerCount === 2) {
        activeColors = ['red', 'yellow'];
      } else if (selectedPlayerCount === 3) {
        activeColors = ['red', 'green', 'yellow'];
      } else {
        activeColors = ['red', 'green', 'yellow', 'blue'];
      }

      playerConfigs = activeColors.map((c, idx) => {
        const cCap = c.charAt(0).toUpperCase() + c.slice(1);
        return {
          id: c,
          name: `Player ${idx + 1} (${cCap})`,
          isAi: false
        };
      });
    }

    closeModal(setupModal);

    game = new LudoGame({
      playerCount: selectedPlayerCount,
      selectedColors: activeColors,
      twoPlayerColors: activeColors.length === 2 ? activeColors : ['red', 'yellow'],
      playerConfigs
    });

    attachGameListeners(game);
    game.start();
  }

  // Start configured game button
  const startGameSubmitBtn = document.getElementById('start-game-submit-btn');
  if (startGameSubmitBtn) {
    startGameSubmitBtn.addEventListener('click', startConfiguredGame);
  }

  // Initialize preview board and ALWAYS OPEN SETUP MODAL ON LAUNCH
  renderer.renderTokens(game.players);
  renderer.updateHUD(game.getCurrentPlayer(), 'WAITING_ROLL');
  renderer.renderDice(1, false, false, game.getCurrentPlayer().color);
  openModal(setupModal);

  // Rules Modal
  if (rulesBtn) {
    rulesBtn.addEventListener('click', () => {
      openModal(rulesModal);
    });
  }

  // Fairness Stats Modal
  if (statsBtn) {
    statsBtn.addEventListener('click', () => {
      renderStatsModal();
      openModal(statsModal);
    });
  }

  function renderStatsModal() {
    const stats = game.dice.getStats();
    const statsContent = document.getElementById('stats-modal-body');
    if (!statsContent) return;

    statsContent.innerHTML = `
      <div class="stats-summary">
        <div class="stat-card">
          <span class="stat-label">Total Rolls</span>
          <span class="stat-value">${stats.totalRolls}</span>
          <span class="stat-sub">Cryptographic CSPRNG</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Fairness Status</span>
          <span class="stat-value" style="font-size:0.95rem; color:var(--color-green)">${stats.isFair}</span>
          <span class="stat-sub">χ² = ${stats.chiSquare} (ideal < 11.07)</span>
        </div>
      </div>

      <div class="distribution-grid">
        <div style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:4px;">
          Roll Frequency (White dashed line = 16.67% theoretical ideal)
        </div>
        ${[1, 2, 3, 4, 5, 6].map(num => `
          <div class="dice-stat-row">
            <div class="dice-num-badge">${num}</div>
            <div class="bar-track">
              <div class="target-line"></div>
              <div class="bar-fill" style="width: ${Math.min(parseFloat(stats.percentages[num]) * 2.5, 100)}%"></div>
            </div>
            <span class="pct-label">${stats.percentages[num]}%</span>
          </div>
        `).join('')}
      </div>

      <div style="font-size:0.75rem; color:var(--text-muted); line-height:1.4; margin-top:8px;">
        * Generated using Web Crypto CSPRNG with unbiased rejection sampling. Zero server interference, 100% mathematically uniform.
      </div>
    `;
  }

  const resetStatsBtn = document.getElementById('reset-stats-btn');
  if (resetStatsBtn) {
    resetStatsBtn.addEventListener('click', () => {
      game.dice.resetStats();
      renderStatsModal();
    });
  }

  // Victory Celebration Modal
  function showVictoryModal(winner, rankings) {
    const victoryBody = document.getElementById('victory-modal-body');
    if (!victoryBody) return;

    const cfg = window.BOARD_CONFIG.PLAYERS[winner.id];

    victoryBody.innerHTML = `
      <div style="text-align: center; margin-bottom: 16px;">
        <div style="font-size: 2.8rem; line-height: 1;">👑</div>
        <h2 style="font-size: 1.4rem; font-weight: 800; margin-top: 8px; color: ${cfg.color}">
          ${winner.name} Wins!
        </h2>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
          All 4 tokens reached the Center Finish!
        </p>
      </div>

      <div class="victory-podium">
        ${rankings.map((p, idx) => `
          <div class="rank-row ${idx === 0 ? 'winner' : ''}">
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="rank-number">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '4th'}</span>
              <div class="slot-dot" style="background-color: ${p.color}"></div>
              <span style="font-weight: 700;">${p.name}</span>
            </div>
            <span style="font-size: 0.78rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">
              ${p.isAi ? 'Computer' : 'Human'}
            </span>
          </div>
        `).join('')}
      </div>
    `;

    openModal(victoryModal);
  }

  const playAgainBtn = document.getElementById('play-again-btn');
  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
      closeModal(victoryModal);
      game = new LudoGame({
        playerCount: game.players.length,
        selectedColors: game.players.map(p => p.id),
        playerConfigs: game.players.map(p => ({
          id: p.id,
          name: p.name,
          isAi: p.isAi,
          difficulty: 'medium'
        }))
      });
      attachGameListeners(game);
      game.start();
    });
  }

  const victoryNewSetupBtn = document.getElementById('victory-new-setup-btn');
  if (victoryNewSetupBtn) {
    victoryNewSetupBtn.addEventListener('click', () => {
      closeModal(victoryModal);
      openModal(setupModal);
    });
  }
});
