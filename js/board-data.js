/**
 * Ludo Board Geometry and Path Data Model
 * 15x15 standard grid mapped to 600x600 SVG coordinate system
 */

const BOARD_CONFIG = {
  GRID_SIZE: 15,
  SVG_SIZE: 600,
  CELL_SIZE: 40, // 600 / 15
  STEP_COUNT_TO_FINISH: 56, // Step 0 (start) to Step 56 (finish)
  
  PLAYERS: {
    red: {
      id: 'red',
      name: 'Red',
      color: '#ef4444',
      glow: '#f87171',
      bgDark: '#3b1215',
      bgLight: '#fee2e2',
      accentColor: '#dc2626',
      trackStartIndex: 0,
      yardArea: { rowStart: 0, colStart: 0, rowSpan: 6, colSpan: 6 },
      yardPockets: [
        { cx: 80, cy: 80 },
        { cx: 160, cy: 80 },
        { cx: 80, cy: 160 },
        { cx: 160, cy: 160 }
      ],
      homeColumn: [
        { row: 7, col: 1, cx: 60, cy: 300 },
        { row: 7, col: 2, cx: 100, cy: 300 },
        { row: 7, col: 3, cx: 140, cy: 300 },
        { row: 7, col: 4, cx: 180, cy: 300 },
        { row: 7, col: 5, cx: 220, cy: 300 }
      ],
      finishCenter: { cx: 265, cy: 300 }
    },
    green: {
      id: 'green',
      name: 'Green',
      color: '#10b981',
      glow: '#34d399',
      bgDark: '#093322',
      bgLight: '#d1fae5',
      accentColor: '#059669',
      trackStartIndex: 13,
      yardArea: { rowStart: 0, colStart: 9, rowSpan: 6, colSpan: 6 },
      yardPockets: [
        { cx: 440, cy: 80 },
        { cx: 520, cy: 80 },
        { cx: 440, cy: 160 },
        { cx: 520, cy: 160 }
      ],
      homeColumn: [
        { row: 1, col: 7, cx: 300, cy: 60 },
        { row: 2, col: 7, cx: 300, cy: 100 },
        { row: 3, col: 7, cx: 300, cy: 140 },
        { row: 4, col: 7, cx: 300, cy: 180 },
        { row: 5, col: 7, cx: 300, cy: 220 }
      ],
      finishCenter: { cx: 300, cy: 265 }
    },
    yellow: {
      id: 'yellow',
      name: 'Yellow',
      color: '#f59e0b',
      glow: '#fbbf24',
      bgDark: '#382506',
      bgLight: '#fef3c7',
      accentColor: '#d97706',
      trackStartIndex: 26,
      yardArea: { rowStart: 9, colStart: 9, rowSpan: 6, colSpan: 6 },
      yardPockets: [
        { cx: 440, cy: 440 },
        { cx: 520, cy: 440 },
        { cx: 440, cy: 520 },
        { cx: 520, cy: 520 }
      ],
      homeColumn: [
        { row: 7, col: 13, cx: 540, cy: 300 },
        { row: 7, col: 12, cx: 500, cy: 300 },
        { row: 7, col: 11, cx: 460, cy: 300 },
        { row: 7, col: 10, cx: 420, cy: 300 },
        { row: 7, col: 9, cx: 380, cy: 300 }
      ],
      finishCenter: { cx: 335, cy: 300 }
    },
    blue: {
      id: 'blue',
      name: 'Blue',
      color: '#3b82f6',
      glow: '#60a5fa',
      bgDark: '#0e2647',
      bgLight: '#dbeafe',
      accentColor: '#2563eb',
      trackStartIndex: 39,
      yardArea: { rowStart: 9, colStart: 0, rowSpan: 6, colSpan: 6 },
      yardPockets: [
        { cx: 80, cy: 440 },
        { cx: 160, cy: 440 },
        { cx: 80, cy: 520 },
        { cx: 160, cy: 520 }
      ],
      homeColumn: [
        { row: 13, col: 7, cx: 300, cy: 540 },
        { row: 12, col: 7, cx: 300, cy: 500 },
        { row: 11, col: 7, cx: 300, cy: 460 },
        { row: 10, col: 7, cx: 300, cy: 420 },
        { row: 9, col: 7, cx: 300, cy: 380 }
      ],
      finishCenter: { cx: 300, cy: 335 }
    }
  }
};

// 52 Main Track Squares in clockwise perimeter order
const TRACK_CELLS = [
  /* 0  Red start */ { id: 'T0', row: 6, col: 1, isSafe: true, color: 'red' },
  /* 1             */ { id: 'T1', row: 6, col: 2 },
  /* 2             */ { id: 'T2', row: 6, col: 3 },
  /* 3             */ { id: 'T3', row: 6, col: 4 },
  /* 4             */ { id: 'T4', row: 6, col: 5 },
  /* 5             */ { id: 'T5', row: 5, col: 6 },
  /* 6             */ { id: 'T6', row: 4, col: 6 },
  /* 7             */ { id: 'T7', row: 3, col: 6 },
  /* 8  Star       */ { id: 'T8', row: 2, col: 6, isSafe: true, isStar: true },
  /* 9             */ { id: 'T9', row: 1, col: 6 },
  /* 10            */ { id: 'T10', row: 0, col: 6 },
  /* 11            */ { id: 'T11', row: 0, col: 7 },
  /* 12            */ { id: 'T12', row: 0, col: 8 },
  /* 13 Green start*/ { id: 'T13', row: 1, col: 8, isSafe: true, color: 'green' },
  /* 14            */ { id: 'T14', row: 2, col: 8 },
  /* 15            */ { id: 'T15', row: 3, col: 8 },
  /* 16            */ { id: 'T16', row: 4, col: 8 },
  /* 17            */ { id: 'T17', row: 5, col: 8 },
  /* 18            */ { id: 'T18', row: 6, col: 9 },
  /* 19            */ { id: 'T19', row: 6, col: 10 },
  /* 20            */ { id: 'T20', row: 6, col: 11 },
  /* 21 Star       */ { id: 'T21', row: 6, col: 12, isSafe: true, isStar: true },
  /* 22            */ { id: 'T22', row: 6, col: 13 },
  /* 23            */ { id: 'T23', row: 6, col: 14 },
  /* 24            */ { id: 'T24', row: 7, col: 14 },
  /* 25            */ { id: 'T25', row: 8, col: 14 },
  /* 26 Yellow start*/{ id: 'T26', row: 8, col: 13, isSafe: true, color: 'yellow' },
  /* 27            */ { id: 'T27', row: 8, col: 12 },
  /* 28            */ { id: 'T28', row: 8, col: 11 },
  /* 29            */ { id: 'T29', row: 8, col: 10 },
  /* 30            */ { id: 'T30', row: 8, col: 9 },
  /* 31            */ { id: 'T31', row: 9, col: 8 },
  /* 32            */ { id: 'T32', row: 10, col: 8 },
  /* 33            */ { id: 'T33', row: 11, col: 8 },
  /* 34 Star       */ { id: 'T34', row: 12, col: 8, isSafe: true, isStar: true },
  /* 35            */ { id: 'T35', row: 13, col: 8 },
  /* 36            */ { id: 'T36', row: 14, col: 8 },
  /* 37            */ { id: 'T37', row: 14, col: 7 },
  /* 38            */ { id: 'T38', row: 14, col: 6 },
  /* 39 Blue start */ { id: 'T39', row: 13, col: 6, isSafe: true, color: 'blue' },
  /* 40            */ { id: 'T40', row: 12, col: 6 },
  /* 41            */ { id: 'T41', row: 11, col: 6 },
  /* 42            */ { id: 'T42', row: 10, col: 6 },
  /* 43            */ { id: 'T43', row: 9, col: 6 },
  /* 44            */ { id: 'T44', row: 8, col: 5 },
  /* 45            */ { id: 'T45', row: 8, col: 4 },
  /* 46            */ { id: 'T46', row: 8, col: 3 },
  /* 47 Star       */ { id: 'T47', row: 8, col: 2, isSafe: true, isStar: true },
  /* 48            */ { id: 'T48', row: 8, col: 1 },
  /* 49            */ { id: 'T49', row: 8, col: 0 },
  /* 50            */ { id: 'T50', row: 7, col: 0 },
  /* 51            */ { id: 'T51', row: 6, col: 0 }
];

// Precompute center coordinates (cx, cy) for all 52 track cells
TRACK_CELLS.forEach((cell, idx) => {
  cell.trackIndex = idx;
  cell.cx = cell.col * BOARD_CONFIG.CELL_SIZE + BOARD_CONFIG.CELL_SIZE / 2;
  cell.cy = cell.row * BOARD_CONFIG.CELL_SIZE + BOARD_CONFIG.CELL_SIZE / 2;
});

// Precompute complete 57-step paths for each color (steps 0 to 56)
const PLAYER_PATHS = {};

['red', 'green', 'yellow', 'blue'].forEach((color) => {
  const pConfig = BOARD_CONFIG.PLAYERS[color];
  const startIndex = pConfig.trackStartIndex;
  const path = [];

  // Steps 0 to 50: 51 steps around the outer track loop
  for (let s = 0; s <= 50; s++) {
    const tIndex = (startIndex + s) % 52;
    const tCell = TRACK_CELLS[tIndex];
    path.push({
      step: s,
      type: 'track',
      trackIndex: tIndex,
      row: tCell.row,
      col: tCell.col,
      cx: tCell.cx,
      cy: tCell.cy,
      isSafe: !!tCell.isSafe
    });
  }

  // Steps 51 to 55: 5 steps along their colored home stretch
  pConfig.homeColumn.forEach((hCell, hIdx) => {
    path.push({
      step: 51 + hIdx,
      type: 'home_column',
      color: color,
      row: hCell.row,
      col: hCell.col,
      cx: hCell.cx,
      cy: hCell.cy,
      isSafe: true // Home column is always safe
    });
  });

  // Step 56: Reaches Center Finish
  path.push({
    step: 56,
    type: 'finish',
    color: color,
    cx: pConfig.finishCenter.cx,
    cy: pConfig.finishCenter.cy,
    isSafe: true,
    isFinish: true
  });

  PLAYER_PATHS[color] = path;
});

// Safe track indices for rapid lookup
const SAFE_TRACK_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Export for ES modules and window global
if (typeof window !== 'undefined') {
  window.BOARD_CONFIG = BOARD_CONFIG;
  window.TRACK_CELLS = TRACK_CELLS;
  window.PLAYER_PATHS = PLAYER_PATHS;
  window.SAFE_TRACK_INDICES = SAFE_TRACK_INDICES;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BOARD_CONFIG, TRACK_CELLS, PLAYER_PATHS, SAFE_TRACK_INDICES };
}
