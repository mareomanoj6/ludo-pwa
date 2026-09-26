/**
 * Ludo SVG Board Renderer & Animation Controller
 * Renders minimalist 600x600 SVG board, tokens, dice, previews, and step-by-step movement.
 */

class LudoRenderer {
  constructor(svgElement, uiElements = {}) {
    this.svg = svgElement;
    this.ui = uiElements;
    this.tokensMap = new Map(); // id -> svg element
    this.activeHighlights = [];
    this.previewGhost = null;
    this.isAnimating = false;

    this.renderBoard();
  }

  /**
   * Generates the complete 15x15 minimalist Ludo board in SVG
   */
  renderBoard() {
    const cfg = window.BOARD_CONFIG;
    const track = window.TRACK_CELLS;
    if (!cfg || !track) return;

    let svgHtml = `
      <defs>
        <!-- Gradients for 4 player colors -->
        <linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f87171"/>
          <stop offset="100%" stop-color="#dc2626"/>
        </linearGradient>
        <linearGradient id="grad-green" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#34d399"/>
          <stop offset="100%" stop-color="#059669"/>
        </linearGradient>
        <linearGradient id="grad-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24"/>
          <stop offset="100%" stop-color="#d97706"/>
        </linearGradient>
        <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#60a5fa"/>
          <stop offset="100%" stop-color="#2563eb"/>
        </linearGradient>

        <!-- Star Symbol for Safe Cells -->
        <g id="safe-star-icon">
          <polygon points="0,-9 2.7,-3.6 8.5,-2.8 4.3,1.4 5.3,7.3 0,4.5 -5.3,7.3 -4.3,1.4 -8.5,-2.8 -2.7,-3.6" 
                   fill="var(--star-color)" stroke="rgba(0,0,0,0.15)" stroke-width="0.7"/>
        </g>
      </defs>

      <!-- Board Background Base -->
      <rect x="0" y="0" width="600" height="600" fill="var(--board-bg)" rx="16"/>

      <!-- 4 Corner Yards (Bases) -->
      <g id="yards-layer">
        <!-- Red Yard: Top-Left (0..240, 0..240) -->
        <rect x="8" y="8" width="224" height="224" rx="14" fill="var(--color-red-bg)" stroke="var(--color-red)" stroke-width="2"/>
        <rect x="36" y="36" width="168" height="168" rx="12" fill="var(--cell-bg)" stroke="var(--border-subtle)" stroke-width="1.5"/>
        <circle cx="80" cy="80" r="22" fill="var(--bg-card)" stroke="var(--color-red)" stroke-width="2"/>
        <circle cx="160" cy="80" r="22" fill="var(--bg-card)" stroke="var(--color-red)" stroke-width="2"/>
        <circle cx="80" cy="160" r="22" fill="var(--bg-card)" stroke="var(--color-red)" stroke-width="2"/>
        <circle cx="160" cy="160" r="22" fill="var(--bg-card)" stroke="var(--color-red)" stroke-width="2"/>

        <!-- Green Yard: Top-Right (360..600, 0..240) -->
        <rect x="368" y="8" width="224" height="224" rx="14" fill="var(--color-green-bg)" stroke="var(--color-green)" stroke-width="2"/>
        <rect x="396" y="36" width="168" height="168" rx="12" fill="var(--cell-bg)" stroke="var(--border-subtle)" stroke-width="1.5"/>
        <circle cx="440" cy="80" r="22" fill="var(--bg-card)" stroke="var(--color-green)" stroke-width="2"/>
        <circle cx="520" cy="80" r="22" fill="var(--bg-card)" stroke="var(--color-green)" stroke-width="2"/>
        <circle cx="440" cy="160" r="22" fill="var(--bg-card)" stroke="var(--color-green)" stroke-width="2"/>
        <circle cx="520" cy="160" r="22" fill="var(--bg-card)" stroke="var(--color-green)" stroke-width="2"/>

        <!-- Yellow Yard: Bottom-Right (360..600, 360..600) -->
        <rect x="368" y="368" width="224" height="224" rx="14" fill="var(--color-yellow-bg)" stroke="var(--color-yellow)" stroke-width="2"/>
        <rect x="396" y="396" width="168" height="168" rx="12" fill="var(--cell-bg)" stroke="var(--border-subtle)" stroke-width="1.5"/>
        <circle cx="440" cy="440" r="22" fill="var(--bg-card)" stroke="var(--color-yellow)" stroke-width="2"/>
        <circle cx="520" cy="440" r="22" fill="var(--bg-card)" stroke="var(--color-yellow)" stroke-width="2"/>
        <circle cx="440" cy="520" r="22" fill="var(--bg-card)" stroke="var(--color-yellow)" stroke-width="2"/>
        <circle cx="520" cy="520" r="22" fill="var(--bg-card)" stroke="var(--color-yellow)" stroke-width="2"/>

        <!-- Blue Yard: Bottom-Left (0..240, 360..600) -->
        <rect x="8" y="368" width="224" height="224" rx="14" fill="var(--color-blue-bg)" stroke="var(--color-blue)" stroke-width="2"/>
        <rect x="36" y="396" width="168" height="168" rx="12" fill="var(--cell-bg)" stroke="var(--border-subtle)" stroke-width="1.5"/>
        <circle cx="80" cy="440" r="22" fill="var(--bg-card)" stroke="var(--color-blue)" stroke-width="2"/>
        <circle cx="160" cy="440" r="22" fill="var(--bg-card)" stroke="var(--color-blue)" stroke-width="2"/>
        <circle cx="80" cy="520" r="22" fill="var(--bg-card)" stroke="var(--color-blue)" stroke-width="2"/>
        <circle cx="160" cy="520" r="22" fill="var(--bg-card)" stroke="var(--color-blue)" stroke-width="2"/>
      </g>

      <!-- Main 52 Track Cells -->
      <g id="track-layer">
    `;

    // Render 52 track cells
    track.forEach((cell, idx) => {
      const x = cell.col * 40;
      const y = cell.row * 40;
      let fill = 'var(--cell-bg)';
      let extra = '';

      if (cell.color === 'red') {
        fill = 'var(--color-red)';
      } else if (cell.color === 'green') {
        fill = 'var(--color-green)';
      } else if (cell.color === 'yellow') {
        fill = 'var(--color-yellow)';
      } else if (cell.color === 'blue') {
        fill = 'var(--color-blue)';
      } else if (cell.isStar) {
        fill = 'var(--safe-cell-bg)';
      }

      svgHtml += `<rect class="svg-track-cell" data-track-index="${idx}" x="${x}" y="${y}" width="40" height="40" fill="${fill}"/>`;

      // Safe star cells (indices 8, 21, 34, 47)
      if (cell.isStar) {
        svgHtml += `<use href="#safe-star-icon" x="${cell.cx}" y="${cell.cy}"/>`;
      }
    });

    svgHtml += `</g>`;

    // 4 Colored Home Columns (5 cells each)
    svgHtml += `<g id="home-columns-layer">`;
    const players = cfg.PLAYERS;

    // Red home column (row 7, cols 1..5)
    players.red.homeColumn.forEach(hc => {
      svgHtml += `<rect class="svg-track-cell" x="${hc.col * 40}" y="${hc.row * 40}" width="40" height="40" fill="var(--color-red)"/>`;
    });

    // Green home column (cols 7, rows 1..5)
    players.green.homeColumn.forEach(hc => {
      svgHtml += `<rect class="svg-track-cell" x="${hc.col * 40}" y="${hc.row * 40}" width="40" height="40" fill="var(--color-green)"/>`;
    });

    // Yellow home column (row 7, cols 9..13)
    players.yellow.homeColumn.forEach(hc => {
      svgHtml += `<rect class="svg-track-cell" x="${hc.col * 40}" y="${hc.row * 40}" width="40" height="40" fill="var(--color-yellow)"/>`;
    });

    // Blue home column (col 7, rows 9..13)
    players.blue.homeColumn.forEach(hc => {
      svgHtml += `<rect class="svg-track-cell" x="${hc.col * 40}" y="${hc.row * 40}" width="40" height="40" fill="var(--color-blue)"/>`;
    });
    svgHtml += `</g>`;

    // Center Finish Triangle Area (x: 240..360, y: 240..360)
    svgHtml += `
      <g id="center-finish-layer">
        <!-- Center outline -->
        <rect x="240" y="240" width="120" height="120" fill="var(--bg-surface)" stroke="var(--board-grid-line)" stroke-width="1"/>
        <!-- Red triangle (Left) -->
        <polygon points="240,240 300,300 240,360" fill="var(--color-red)"/>
        <!-- Green triangle (Top) -->
        <polygon points="240,240 300,300 360,240" fill="var(--color-green)"/>
        <!-- Yellow triangle (Right) -->
        <polygon points="360,240 300,300 360,360" fill="var(--color-yellow)"/>
        <!-- Blue triangle (Bottom) -->
        <polygon points="240,360 300,300 360,360" fill="var(--color-blue)"/>
        <!-- Center circle cap -->
        <circle cx="300" cy="300" r="16" fill="var(--board-bg)" stroke="var(--border-subtle)" stroke-width="2"/>
        <circle cx="300" cy="300" r="8" fill="var(--text-main)" opacity="0.8"/>
      </g>

      <!-- Highlights / Preview Layer -->
      <g id="preview-layer"></g>

      <!-- Tokens Layer (Active pieces rendered on top) -->
      <g id="tokens-layer"></g>
    `;

    this.svg.innerHTML = svgHtml;
  }

  /**
   * Render tokens on the board for the current game state
   */
  renderTokens(players) {
    const tokensLayer = this.svg.querySelector('#tokens-layer');
    if (!tokensLayer) return;

    tokensLayer.innerHTML = '';
    this.tokensMap.clear();

    players.forEach(player => {
      player.tokens.forEach(token => {
        const coords = this.getTokenCoordinates(player.id, token.tokenIndex, token.step, token.status);
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'ludo-token');
        group.setAttribute('id', `token-${token.id}`);
        group.setAttribute('data-token-id', token.id);
        group.setAttribute('data-player-id', player.id);
        group.setAttribute('data-token-index', token.tokenIndex);
        group.style.transform = `translate(${coords.cx}px, ${coords.cy}px)`;

        // SVG Token visual structure: Outer halo, main gradient circle, inner border, crown/number
        group.innerHTML = `
          <circle class="token-halo" cx="0" cy="0" r="18" fill="${player.color}" opacity="0"/>
          <circle class="token-base" cx="0" cy="0" r="14.5" fill="url(#grad-${player.id})" stroke="#ffffff" stroke-width="2.2" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/>
          <circle cx="0" cy="0" r="9" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.2"/>
          <text x="0" y="4" text-anchor="middle" font-size="10.5" font-weight="800" fill="#ffffff" font-family="sans-serif">${token.tokenIndex + 1}</text>
        `;

        tokensLayer.appendChild(group);
        this.tokensMap.set(token.id, group);
      });
    });

    this.updateClusteredTokens(players);
  }

  /**
   * Resolves token coordinates based on status & step
   */
  getTokenCoordinates(playerId, tokenIndex, step, status) {
    const cfg = window.BOARD_CONFIG.PLAYERS[playerId];

    if (status === 'yard' || step === -1) {
      return cfg.yardPockets[tokenIndex];
    } else if (status === 'finished' || step === 56) {
      return cfg.finishCenter;
    } else {
      const path = window.PLAYER_PATHS[playerId];
      const cell = path[step];
      return { cx: cell.cx, cy: cell.cy };
    }
  }

  /**
   * Handles multiple tokens occupying the same square by clustering them neatly
   */
  updateClusteredTokens(players) {
    const cellGroups = new Map(); // key -> array of tokens

    players.forEach(player => {
      player.tokens.forEach(token => {
        if (token.status === 'track' || token.status === 'home_column') {
          const path = window.PLAYER_PATHS[player.id];
          const cell = path[token.step];
          const key = `cell_${cell.row}_${cell.col}`;
          if (!cellGroups.has(key)) cellGroups.set(key, []);
          cellGroups.get(key).push({ player, token, baseCx: cell.cx, baseCy: cell.cy });
        }
      });
    });

    // Apply offset offsets for stacked pieces
    cellGroups.forEach(group => {
      if (group.length === 1) {
        const item = group[0];
        const el = this.tokensMap.get(item.token.id);
        if (el) el.style.transform = `translate(${item.baseCx}px, ${item.baseCy}px)`;
      } else if (group.length === 2) {
        const offsets = [{ dx: -6, dy: -6 }, { dx: 6, dy: 6 }];
        group.forEach((item, idx) => {
          const el = this.tokensMap.get(item.token.id);
          if (el) el.style.transform = `translate(${item.baseCx + offsets[idx].dx}px, ${item.baseCy + offsets[idx].dy}px)`;
        });
      } else if (group.length === 3) {
        const offsets = [{ dx: 0, dy: -7 }, { dx: -7, dy: 6 }, { dx: 7, dy: 6 }];
        group.forEach((item, idx) => {
          const el = this.tokensMap.get(item.token.id);
          if (el) el.style.transform = `translate(${item.baseCx + offsets[idx].dx}px, ${item.baseCy + offsets[idx].dy}px)`;
        });
      } else if (group.length >= 4) {
        const offsets = [{ dx: -7, dy: -7 }, { dx: 7, dy: -7 }, { dx: -7, dy: 7 }, { dx: 7, dy: 7 }];
        group.forEach((item, idx) => {
          const el = this.tokensMap.get(item.token.id);
          if (el) el.style.transform = `translate(${item.baseCx + offsets[idx % 4].dx}px, ${item.baseCy + offsets[idx % 4].dy}px)`;
        });
      }
    });
  }

  /**
   * Highlights movable tokens and attaches click/touch handlers
   */
  highlightValidMoves(validMoves, onSelect) {
    this.clearHighlights();

    validMoves.forEach(move => {
      const el = this.tokensMap.get(move.token.id);
      if (!el) return;

      el.classList.add('can-move');

      const clickHandler = (e) => {
        e.stopPropagation();
        this.clearHighlights();
        this.clearPreviewGhost();
        onSelect(move.tokenIndex);
      };

      const hoverEnterHandler = () => {
        this.showPreviewGhost(move);
      };

      const hoverLeaveHandler = () => {
        this.clearPreviewGhost();
      };

      el.addEventListener('click', clickHandler);
      el.addEventListener('mouseenter', hoverEnterHandler);
      el.addEventListener('mouseleave', hoverLeaveHandler);

      this.activeHighlights.push({
        el,
        clickHandler,
        hoverEnterHandler,
        hoverLeaveHandler
      });
    });
  }

  clearHighlights() {
    this.activeHighlights.forEach(h => {
      h.el.classList.remove('can-move');
      h.el.removeEventListener('click', h.clickHandler);
      h.el.removeEventListener('mouseenter', h.hoverEnterHandler);
      h.el.removeEventListener('mouseleave', h.hoverLeaveHandler);
    });
    this.activeHighlights = [];
    this.clearPreviewGhost();
  }

  /**
   * Displays ghost preview of destination cell on hover/focus
   */
  showPreviewGhost(move) {
    this.clearPreviewGhost();
    const previewLayer = this.svg.querySelector('#preview-layer');
    if (!previewLayer) return;

    const path = window.PLAYER_PATHS[move.token.playerId];
    const targetCell = path[move.targetStep];
    if (!targetCell) return;

    const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ghost.setAttribute('class', 'preview-ghost');
    ghost.setAttribute('cx', targetCell.cx);
    ghost.setAttribute('cy', targetCell.cy);
    ghost.setAttribute('r', '17');
    ghost.setAttribute('fill', 'none');
    ghost.setAttribute('stroke', '#ffffff');
    ghost.setAttribute('stroke-width', '3');
    ghost.setAttribute('stroke-dasharray', '4 3');

    previewLayer.appendChild(ghost);
    this.previewGhost = ghost;
  }

  clearPreviewGhost() {
    if (this.previewGhost && this.previewGhost.parentNode) {
      this.previewGhost.parentNode.removeChild(this.previewGhost);
      this.previewGhost = null;
    }
  }

  /**
   * Step-by-step movement animation
   */
  async animateStepByStep(token, stepsSequence, onComplete) {
    this.isAnimating = true;
    const el = this.tokensMap.get(token.id);
    if (!el) {
      this.isAnimating = false;
      onComplete();
      return;
    }

    const sound = window.soundController;
    const stepDuration = 115; // ms per step

    for (let i = 0; i < stepsSequence.length; i++) {
      const step = stepsSequence[i];
      el.style.transition = `transform ${stepDuration}ms cubic-bezier(0.25, 1, 0.5, 1)`;
      el.style.transform = `translate(${step.cx}px, ${step.cy}px)`;

      if (sound) {
        sound.playStep(step.step || i);
      }

      await new Promise(r => setTimeout(r, stepDuration));
    }

    el.style.transition = 'transform 180ms ease';
    this.isAnimating = false;
    onComplete();
  }

  /**
   * Animate a captured piece returning to its base pocket
   */
  async animateCapture(capturedItem) {
    const { player, token } = capturedItem;
    const el = this.tokensMap.get(token.id);
    if (!el) return;

    const cfg = window.BOARD_CONFIG.PLAYERS[player.id];
    const pocket = cfg.yardPockets[token.tokenIndex];

    el.style.transition = 'transform 380ms cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    el.style.transform = `translate(${pocket.cx}px, ${pocket.cy}px)`;
  }

  /**
   * Renders the 3D-styled animated dice widget
   */
  renderDice(value, isRolling, canRoll, activeColor) {
    const diceBox = this.ui.diceBox;
    const rollBtn = this.ui.rollBtn;

    if (!diceBox) return;

    if (activeColor) {
      diceBox.style.setProperty('--active-glow', activeColor);
    }

    if (canRoll) {
      diceBox.classList.add('can-roll');
      if (rollBtn) rollBtn.disabled = false;
    } else {
      diceBox.classList.remove('can-roll');
      if (rollBtn) rollBtn.disabled = true;
    }

    if (isRolling) {
      diceBox.classList.add('rolling');
    } else {
      diceBox.classList.remove('rolling');
    }

    // Update pips layout (1-6)
    const pips = diceBox.querySelectorAll('.dice-pip');
    pips.forEach(p => p.classList.remove('visible'));

    const pipMap = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8]
    };

    const activePips = pipMap[value] || pipMap[1];
    activePips.forEach(idx => {
      if (pips[idx]) pips[idx].classList.add('visible');
    });
  }

  /**
   * Floating toast notification on board
   */
  showToast(text, duration = 1800) {
    const toast = this.ui.toast;
    if (!toast) return;

    toast.textContent = text;
    toast.classList.add('show');

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  /**
   * Updates HUD active player status pill
   */
  updateHUD(player, state, roll = null) {
    const dot = this.ui.playerDot;
    const name = this.ui.playerName;
    const tag = this.ui.playerTypeTag;
    const hint = this.ui.turnActionHint;

    if (!player) return;

    if (dot) {
      dot.style.backgroundColor = player.color;
      dot.style.color = player.color;
    }
    if (name) name.textContent = player.name;
    if (tag) tag.textContent = player.isAi ? 'COMPUTER' : 'HUMAN';

    if (hint) {
      if (state === 'WAITING_ROLL') {
        hint.textContent = player.isAi ? 'Rolling dice...' : 'Your turn: Roll the dice';
      } else if (state === 'WAITING_MOVE') {
        hint.textContent = player.isAi ? 'Moving piece...' : `Rolled ${roll}! Select a piece`;
      } else if (state === 'MOVING') {
        hint.textContent = 'Moving...';
      } else if (state === 'SKIPPED') {
        hint.textContent = '3rd Six! Move skipped';
      } else if (state === 'GAME_OVER') {
        hint.textContent = 'Game Complete!';
      }
    }
  }
}

// Export
if (typeof window !== 'undefined') {
  window.LudoRenderer = LudoRenderer;
}
