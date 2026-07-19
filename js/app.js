/* ==========================================================================
   NEON GRID // MAIN GAME CONTROLLER & ORCHESTRATOR
   ========================================================================== */

import { Audio } from './audio.js';
import { getAIMove, checkWin } from './ai.js';
import { Confetti } from './confetti.js';
import { showToast } from './toast.js';

const SETTINGS_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>`;

// SVG Coordinates for winning cells center points (within 100x100 viewBox)
const CELL_COORDS = [
  { x: 16.6, y: 16.6 }, { x: 50.0, y: 16.6 }, { x: 83.3, y: 16.6 },
  { x: 16.6, y: 50.0 }, { x: 50.0, y: 50.0 }, { x: 83.3, y: 50.0 },
  { x: 16.6, y: 83.3 }, { x: 50.0, y: 83.3 }, { x: 83.3, y: 83.3 }
];

class AppState {
  constructor() {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.gameMode = 'ai'; // 'ai' or 'pvp'
    this.aiDifficulty = 'unbeatable'; // 'easy' | 'medium' | 'unbeatable'
    
    // Player profiles
    this.players = {
      X: { name: 'USER_01', color: '#7c6cfc', symbol: 'X' },
      O: { name: 'SYSTEM AI', color: '#f9577a', symbol: 'O' }
    };
    
    // Score cards
    this.scores = { X: 0, O: 0, ties: 0 };
    this.streak = 0;
    this.maxStreak = 0;
    this.matchLogs = [];
    
    this.isSettingsOpen = false;
    this.isAITyping = false;
    this.isGameOver = false;
    this.moveCount = 0;
    this.currentView = 'main-menu';
  }

  // Load state from local storage
  loadFromStorage() {
    try {
      const savedScores = localStorage.getItem('neon_scores');
      const savedLogs = localStorage.getItem('neon_logs');
      const savedStreaks = localStorage.getItem('neon_streaks');
      const savedSettings = localStorage.getItem('neon_settings');

      if (savedScores) this.scores = JSON.parse(savedScores);
      if (savedLogs) this.matchLogs = JSON.parse(savedLogs);
      
      if (savedStreaks) {
        const streaks = JSON.parse(savedStreaks);
        this.streak = streaks.streak || 0;
        this.maxStreak = streaks.maxStreak || 0;
      }

      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // Apply theme
        const theme = settings.theme || 'cyberpunk';
        document.body.setAttribute('data-theme', theme);
        
        // Sync setting checkbox elements
        document.getElementById('sound-toggle').checked = settings.sfxEnabled ?? true;
        document.getElementById('sound-volume').value = settings.sfxVolume ?? 70;
        document.getElementById('sound-volume-val').textContent = `${settings.sfxVolume ?? 70}%`;
        
        document.getElementById('music-toggle').checked = settings.bgmEnabled ?? true;
        document.getElementById('music-volume').value = settings.bgmVolume ?? 40;
        document.getElementById('music-volume-val').textContent = `${settings.bgmVolume ?? 40}%`;
        
        document.getElementById('notifications-toggle').checked = settings.notificationsEnabled ?? true;
        
        // Push settings values into Audio Engine
        Audio.sfxEnabled = settings.sfxEnabled ?? true;
        Audio.setSfxVolume(settings.sfxVolume ?? 70);
        
        Audio.bgmEnabled = settings.bgmEnabled ?? true;
        Audio.setBgmVolume(settings.bgmVolume ?? 40);
        
        // Update active theme classes
        document.querySelectorAll('.theme-option').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.theme === theme);
        });
      }
    } catch (e) {
      console.warn("Failed to load match memory cache", e);
    }
  }

  // Save state to local storage
  saveToStorage() {
    try {
      localStorage.setItem('neon_scores', JSON.stringify(this.scores));
      localStorage.setItem('neon_logs', JSON.stringify(this.matchLogs));
      localStorage.setItem('neon_streaks', JSON.stringify({ streak: this.streak, maxStreak: this.maxStreak }));
      
      const theme = document.body.getAttribute('data-theme') || 'cyberpunk';
      const settings = {
        theme,
        sfxEnabled: document.getElementById('sound-toggle').checked,
        sfxVolume: parseInt(document.getElementById('sound-volume').value),
        bgmEnabled: document.getElementById('music-toggle').checked,
        bgmVolume: parseInt(document.getElementById('music-volume').value),
        notificationsEnabled: document.getElementById('notifications-toggle').checked
      };
      localStorage.setItem('neon_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn("Failed to cache match settings data", e);
    }
  }
}

const state = new AppState();

// Initialize all UI events and transitions
document.addEventListener('DOMContentLoaded', () => {
  state.loadFromStorage();
  runGameLoader();
  bindUIEvents();
  refreshStats();
});

// 1. GAME LOADER ROUTINE
function runGameLoader() {
  const loaderScreen = document.getElementById('game-loader');
  const appContainer = document.getElementById('app-container');
  const progressFill = document.getElementById('loader-progress');

  // Trigger CSS transition immediately
  if (progressFill) {
    setTimeout(() => {
      progressFill.style.width = '100%';
    }, 50);
  }

  // Wait 3 seconds, then hide loader
  setTimeout(() => {
    loaderScreen.style.opacity = '0';
    appContainer.classList.remove('hidden');
    setTimeout(() => {
      loaderScreen.remove();
    }, 500);
  }, 3000);
}

// 2. BIND DOM UI EVENTS
function bindUIEvents() {
  // Main Menu interactions
  document.getElementById('btn-play-ai').addEventListener('click', () => {
    document.getElementById('mode-ai').click();
    transitionView('setup-screen');
  });
  document.getElementById('btn-play-pvp').addEventListener('click', () => {
    document.getElementById('mode-pvp').click();
    transitionView('setup-screen');
  });
  document.getElementById('btn-main-settings').addEventListener('click', () => {
    Audio.playClick();
    document.getElementById('settings-modal').classList.remove('hidden');
    state.isSettingsOpen = true;
  });
  document.getElementById('btn-back-main').addEventListener('click', () => {
    transitionView('main-menu');
  });

  // How to Play modal
  const howToPlayModal = document.getElementById('how-to-play-modal');
  document.getElementById('btn-how-to-play').addEventListener('click', () => {
    howToPlayModal.classList.remove('hidden');
  });
  document.getElementById('close-how-to-play').addEventListener('click', () => {
    howToPlayModal.classList.add('hidden');
  });
  howToPlayModal.addEventListener('click', (e) => {
    if (e.target === howToPlayModal) howToPlayModal.classList.add('hidden');
  });

  // About modal
  const aboutModal = document.getElementById('about-modal');
  document.getElementById('btn-about').addEventListener('click', () => {
    aboutModal.classList.remove('hidden');
  });
  document.getElementById('close-about').addEventListener('click', () => {
    aboutModal.classList.add('hidden');
  });
  aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) aboutModal.classList.add('hidden');
  });

  // Lobby Recent Match Logs drawer toggle
  const lobbyDrawerHandle = document.getElementById('lobby-drawer-handle');
  const lobbyDrawer = document.getElementById('lobby-history-drawer');
  lobbyDrawerHandle.addEventListener('click', () => {
    const isOpen = lobbyDrawer.classList.toggle('open');
    lobbyDrawerHandle.setAttribute('aria-expanded', isOpen);
    Audio.playHover();
  });

  // Global click anywhere triggers AudioContext activation
  document.body.addEventListener('click', () => {
    Audio.init();
  }, { once: false });

  // Mode Selection tab toggle
  const modeAi = document.getElementById('mode-ai');
  const modePvp = document.getElementById('mode-pvp');
  const p2Tag = document.getElementById('p2-tag');
  const p2Avatar = document.getElementById('p2-avatar');
  const p2NameGroup = document.getElementById('p2-name-group');
  const difficultyGroup = document.getElementById('ai-difficulty-group');

  modeAi.addEventListener('click', () => {
    Audio.playHover();
    modeAi.classList.add('active');
    modePvp.classList.remove('active');
    difficultyGroup.style.display = 'block';
    p2NameGroup.style.display = 'none';
    p2Tag.textContent = "SYSTEM AI";
    p2Avatar.textContent = "O";
    state.gameMode = 'ai';
  });

  modePvp.addEventListener('click', () => {
    Audio.playHover();
    modePvp.classList.add('active');
    modeAi.classList.remove('active');
    difficultyGroup.style.display = 'none';
    p2NameGroup.style.display = 'block';
    p2Tag.textContent = "PLAYER 2";
    p2Avatar.textContent = "O";
    state.gameMode = 'pvp';
  });

  // Setup color pickers selection
  bindColorPicker('p1-card', 'X');
  bindColorPicker('p2-card', 'O');

  // Launch Arena Button Click
  const launchBtn = document.getElementById('launch-btn');
  launchBtn.addEventListener('click', () => {
    Audio.playLaunch();
    initializeArena();
  });


  // Header Logo click triggers home screen redirect
  const navLogo = document.getElementById('nav-logo');
  navLogo.addEventListener('click', () => {
    Audio.playClick();
    transitionView('setup-screen');
    Confetti.stop();
  });

  // Grid Cell interactions
  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach(cell => {
    cell.addEventListener('click', () => handleCellClick(cell));
    cell.addEventListener('mouseenter', () => handleCellHover(cell));
  });

  // Results overlay action clicks
  document.getElementById('next-round-btn').addEventListener('click', () => {
    Audio.playClick();
    document.getElementById('result-overlay').classList.add('hidden');
    resetBoard();
  });

  document.getElementById('reset-series-btn').addEventListener('click', () => {
    Audio.playClick();
    state.scores = { X: 0, O: 0, ties: 0 };
    state.saveToStorage();
    updateScoreboardDisplay();
    document.getElementById('result-overlay').classList.add('hidden');
    showToast("Match points reset");
    resetBoard();
  });

  // Settings & Pause Modal controls
  const settingsModal = document.getElementById('settings-modal');
  const pauseModal = document.getElementById('pause-modal');
  const settingsTrigger = document.getElementById('settings-trigger');

  settingsTrigger.addEventListener('click', () => {
    Audio.playClick();
    if (state.currentView === 'game-arena') {
      pauseModal.classList.remove('hidden');
    } else {
      settingsModal.classList.remove('hidden');
    }
  });

  const closeSettings = () => {
    Audio.playClick();
    settingsModal.classList.add('hidden');
    if (state.currentView === 'game-arena') {
      pauseModal.classList.remove('hidden');
    }
  };

  document.getElementById('settings-close').addEventListener('click', closeSettings);

  // Close Settings modal if clicked outside
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettings();
    }
  });

  // Pause Modal actions
  document.getElementById('pause-continue-btn').addEventListener('click', () => {
    Audio.playClick();
    pauseModal.classList.add('hidden');
  });

  document.getElementById('pause-replay-btn').addEventListener('click', () => {
    Audio.playClick();
    pauseModal.classList.add('hidden');
    resetBoard();
  });

  document.getElementById('pause-settings-btn').addEventListener('click', () => {
    Audio.playClick();
    pauseModal.classList.add('hidden');
    settingsModal.classList.remove('hidden');
  });

  document.getElementById('pause-exit-btn').addEventListener('click', () => {
    Audio.playClick();
    pauseModal.classList.add('hidden');
    transitionView('main-menu');
  });

  // Close Pause modal if clicked outside
  pauseModal.addEventListener('click', (e) => {
    if (e.target === pauseModal) {
      Audio.playClick();
      pauseModal.classList.add('hidden');
    }
  });

  // Theme Picker Option change
  const themes = document.querySelectorAll('.theme-option');
  themes.forEach(opt => {
    opt.addEventListener('click', () => {
      Audio.playClick();
      themes.forEach(t => t.classList.remove('active'));
      opt.classList.add('active');
      const targetTheme = opt.dataset.theme;
      document.body.setAttribute('data-theme', targetTheme);
      state.saveToStorage();
      showToast(`${targetTheme} theme activated`);
    });
  });

  // SFX controls
  const soundToggle = document.getElementById('sound-toggle');
  const soundVolume = document.getElementById('sound-volume');
  soundToggle.addEventListener('change', () => {
    Audio.playClick();
    Audio.setSfxEnabled(soundToggle.checked);
    state.saveToStorage();
  });
  soundVolume.addEventListener('input', () => {
    const val = parseInt(soundVolume.value);
    document.getElementById('sound-volume-val').textContent = `${val}%`;
    Audio.setSfxVolume(val);
  });
  soundVolume.addEventListener('change', () => {
    Audio.playClick();
    state.saveToStorage();
  });

  // BGM controls
  const musicToggle = document.getElementById('music-toggle');
  const musicVolume = document.getElementById('music-volume');
  musicToggle.addEventListener('change', () => {
    Audio.playClick();
    Audio.setBgmEnabled(musicToggle.checked);
    state.saveToStorage();
  });
  musicVolume.addEventListener('input', () => {
    const val = parseInt(musicVolume.value);
    document.getElementById('music-volume-val').textContent = `${val}%`;
    Audio.setBgmVolume(val);
    state.saveToStorage();
  });
  musicVolume.addEventListener('change', () => {
    Audio.playClick();
    state.saveToStorage();
  });

  // Toast Toggle
  document.getElementById('notifications-toggle').addEventListener('change', () => {
    Audio.playClick();
    state.saveToStorage();
  });

  // Reset Memory Button
  document.getElementById('clear-data-btn').addEventListener('click', () => {
    Audio.playWarning();
    
    // Clear storage
    localStorage.removeItem('neon_scores');
    localStorage.removeItem('neon_logs');
    localStorage.removeItem('neon_streaks');
    
    // Reset state values
    state.scores = { X: 0, O: 0, ties: 0 };
    state.streak = 0;
    state.maxStreak = 0;
    state.matchLogs = [];
    
    state.saveToStorage();
    refreshStats();
    updateScoreboardDisplay();
    settingsModal.classList.add('hidden');
    showToast("Memory cores fully wiped");
  });

  // Match history drawer toggle
  const drawer = document.getElementById('match-history-drawer');
  const drawerHandle = document.getElementById('drawer-handle');
  if (drawerHandle && drawer) {
    drawerHandle.addEventListener('click', () => {
      Audio.playClick();
      drawer.classList.toggle('open');
    });
  }
}

// Color Selector picker binding
function bindColorPicker(cardId, playerSymbol) {
  const dots = document.querySelectorAll(`#${cardId} .color-dot`);
  const avatar = document.querySelector(`#${cardId} .avatar-display`);
  
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      Audio.playHover();
      
      // Clear active dots on this specific picker
      dots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      
      // Save color
      const color = dot.dataset.color;
      state.players[playerSymbol].color = color;
      
      // Update visual theme
      avatar.style.setProperty('--curr-p-color', color);
      avatar.style.borderColor = color;
      avatar.style.color = color;
    });
  });
}

// 3. LAUNCH GAME ARENA AND SYNC DATA
function initializeArena() {
  // Bind player input names
  const p1NameVal = document.getElementById('p1-name').value.trim();
  state.players.X.name = p1NameVal !== '' ? p1NameVal : 'USER_01';

  if (state.gameMode === 'ai') {
    const diffSelector = document.getElementById('ai-difficulty');
    state.aiDifficulty = diffSelector.value;
    state.players.O.name = `SYS_AI_${state.aiDifficulty.toUpperCase().slice(0,4)}`;
    document.getElementById('arena-mode-badge').textContent = `VS SYSTEM [${state.aiDifficulty.toUpperCase()}]`;
  } else {
    const p2NameVal = document.getElementById('p2-name').value.trim();
    state.players.O.name = p2NameVal !== '' ? p2NameVal : 'USER_02';
    document.getElementById('arena-mode-badge').textContent = `VS PLAYER (LOCAL)`;
  }

  // Setup custom theme variables for symbols placement glow on CSS variables
  document.documentElement.style.setProperty('--p1-accent-color', state.players.X.color);
  document.documentElement.style.setProperty('--p2-accent-color', state.players.O.color);

  // Sync board scoreboard names labels
  document.getElementById('score-p1-label').textContent = `${state.players.X.name} (X)`;
  document.getElementById('score-p2-label').textContent = `${state.players.O.name} (O)`;

  // Reset match points scoreboards
  updateScoreboardDisplay();
  
  // Transition
  transitionView('game-arena');
  resetBoard();
}

// 4. TRANSITION PAGE VIEWS
function transitionView(targetViewId) {
  state.currentView = targetViewId;
  const views = ['main-menu', 'setup-screen', 'game-arena'];
  
  const header = document.getElementById('game-header');
  if (header) {
    if (targetViewId === 'main-menu') {
      header.classList.add('hidden');
    } else {
      header.classList.remove('hidden');
    }
  }

  views.forEach(viewId => {
    const el = document.getElementById(viewId);
    if (viewId === targetViewId) {
      el.classList.remove('hidden');
      el.classList.add('active');
    } else {
      el.classList.add('hidden');
      el.classList.remove('active');
    }
  });

  // Swap header trigger button icon and labels dynamically
  const settingsTrigger = document.getElementById('settings-trigger');
  if (settingsTrigger) {
    if (targetViewId === 'game-arena') {
      settingsTrigger.innerHTML = PAUSE_SVG;
      settingsTrigger.setAttribute('aria-label', 'Pause Game');
    } else {
      settingsTrigger.innerHTML = SETTINGS_SVG;
      settingsTrigger.setAttribute('aria-label', 'Settings');
    }
  }

  // Close match history drawer and pause modal when changing views
  const drawer = document.getElementById('match-history-drawer');
  if (drawer) {
    drawer.classList.remove('open');
  }
  const lobbyDrawerEl = document.getElementById('lobby-history-drawer');
  if (lobbyDrawerEl) {
    lobbyDrawerEl.classList.remove('open');
  }
  const pauseModal = document.getElementById('pause-modal');
  if (pauseModal) {
    pauseModal.classList.add('hidden');
  }
}

// 5. GRID CELLS HANDLERS
function handleCellHover(cell) {
  if (state.isGameOver || state.isAITyping || cell.children.length > 0) {
    cell.removeAttribute('data-preview');
    return;
  }
  
  // Attach current symbol color glow hover indicator variables
  const currPlayerSymbol = state.currentPlayer;
  const currColor = state.players[currPlayerSymbol].color;
  cell.style.setProperty('--curr-glow-color', currColor);
  cell.setAttribute('data-preview', currPlayerSymbol);
}

function handleCellClick(cell) {
  const index = parseInt(cell.dataset.index);
  
  // Prevent clicks if occupied, AI is processing or game has finished
  if (state.board[index] !== null || state.isGameOver || state.isAITyping) {
    if (state.board[index] !== null && !state.isGameOver) Audio.playWarning();
    return;
  }

  placeSymbol(index, state.currentPlayer);
}

function placeSymbol(index, playerSymbol) {
  state.board[index] = playerSymbol;
  state.moveCount++;

  const cell = document.querySelector(`.grid-cell[data-index="${index}"]`);
  cell.removeAttribute('data-preview');

  // Insert neon glowing letter container
  const symbolElement = document.createElement('span');
  symbolElement.className = 'cell-symbol';
  symbolElement.textContent = playerSymbol;
  symbolElement.style.setProperty('--symbol-color', state.players[playerSymbol].color);
  cell.appendChild(symbolElement);

  Audio.playClick(playerSymbol === 'O');

  // Evaluate board rules logic
  const winLine = checkWin(state.board, playerSymbol);
  if (winLine) {
    handleWinOutcome(playerSymbol, winLine);
    return;
  }

  // Draw check
  if (!state.board.includes(null)) {
    handleDrawOutcome();
    return;
  }

  // Swap turns
  state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
  updateTurnDisplay();

  // Handle AI turn
  if (state.gameMode === 'ai' && state.currentPlayer === 'O') {
    triggerAIMovement();
  }
}

// Trigger AI simulated calculation thinking delay
function triggerAIMovement() {
  state.isAITyping = true;
  
  // Visual active pulse turn indicator coloring
  const turnPulse = document.querySelector('.turn-pulse');
  turnPulse.style.setProperty('--curr-glow-color', state.players.O.color);

  // Compute best grid move index
  const bestMove = getAIMove([...state.board], state.aiDifficulty, 'O', 'X');

  // 450ms - 800ms natural breathing delay to simulate computing AI
  const delay = Math.random() * 350 + 450;
  
  setTimeout(() => {
    state.isAITyping = false;
    if (bestMove !== null && !state.isGameOver) {
      placeSymbol(bestMove, 'O');
    }
  }, delay);
}

// 6. PROCESS MATCH END STATE CONDITIONS
function handleWinOutcome(winnerSymbol, winLine) {
  state.isGameOver = true;
  
  // Play Victory audio sweeps
  Audio.playWin();
  
  // Launch celebration confetti
  Confetti.trigger();

  // SVG WINNING VECTOR LINE DRAWING CALCULATION
  const svgLine = document.getElementById('winning-vector');
  const gridBoard = document.getElementById('grid-board');
  const startCoords = CELL_COORDS[winLine[0]];
  const endCoords = CELL_COORDS[winLine[2]];

  // Set line coordinates
  svgLine.setAttribute('x1', startCoords.x);
  svgLine.setAttribute('y1', startCoords.y);
  svgLine.setAttribute('x2', endCoords.x);
  svgLine.setAttribute('y2', endCoords.y);
  svgLine.style.setProperty('--win-line-color', state.players[winnerSymbol].color);

  // Trigger win line animation
  gridBoard.classList.add('win-line-active');

  // Update Score counters
  state.scores[winnerSymbol]++;
  updateScoreboardDisplay();

  // Streak adjustments (Applies if Winner is Human USER_01 (X))
  if (state.gameMode === 'ai') {
    if (winnerSymbol === 'X') {
      state.streak++;
      if (state.streak > state.maxStreak) state.maxStreak = state.streak;
      showToast(`Win streak: ${state.streak}`);
    } else {
      state.streak = 0;
    }
  }

  // Log result entry
  addMatchLog(winnerSymbol, state.players[winnerSymbol].name, state.moveCount);

  // Render Result Overlay Modal
  setTimeout(() => {
    const resultTitle = document.getElementById('result-banner-title');
    const resultWinner = document.getElementById('result-winner-name');
    const resultDetails = document.getElementById('result-details-text');
    
    resultTitle.textContent = "VICTORY DETECTED";
    resultTitle.style.color = state.players[winnerSymbol].color;
    resultTitle.style.textShadow = `0 0 10px ${state.players[winnerSymbol].color}`;
    
    resultWinner.textContent = `${state.players[winnerSymbol].name} WINS!`;
    resultDetails.textContent = `Defeated in ${state.moveCount} moves.`;
    
    document.getElementById('result-overlay').classList.remove('hidden');
  }, 1200);
}

function handleDrawOutcome() {
  state.isGameOver = true;
  
  // Play draw chord
  Audio.playDraw();
  
  // Update scores
  state.scores.ties++;
  updateScoreboardDisplay();

  if (state.gameMode === 'ai') {
    state.streak = 0; // Streak breaks on ties
  }

  // Log result
  addMatchLog('TIE', 'GRID DRAW', state.moveCount);

  // Render modal
  setTimeout(() => {
    const resultTitle = document.getElementById('result-banner-title');
    const resultWinner = document.getElementById('result-winner-name');
    const resultDetails = document.getElementById('result-details-text');
    
    resultTitle.textContent = "DRAW ENCOUNTERED";
    resultTitle.style.color = "#fff";
    resultTitle.style.textShadow = `0 0 8px rgba(255, 255, 255, 0.4)`;
    
    resultWinner.textContent = "MATCH PROTOCOL DOCKED";
    resultDetails.textContent = `All spaces filled in 9 moves.`;
    
    document.getElementById('result-overlay').classList.remove('hidden');
  }, 1000);
}

// Add logs registry
function addMatchLog(outcome, winnerName, moves) {
  const opponentName = state.gameMode === 'ai' ? `AI (${state.aiDifficulty})` : state.players.O.name;
  
  state.matchLogs.unshift({
    outcome, // 'X' | 'O' | 'TIE'
    winnerName,
    moves,
    opponent: opponentName,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  // Limit match logs length
  if (state.matchLogs.length > 8) state.matchLogs.pop();
  
  state.saveToStorage();
  refreshStats();
}

// 7. STATS AND SCOREBOARDS UPDATING
function updateScoreboardDisplay() {
  document.getElementById('score-p1-val').textContent = state.scores.X;
  document.getElementById('score-p2-val').textContent = state.scores.O;
  document.getElementById('score-ties-val').textContent = state.scores.ties;
}

function updateTurnDisplay() {
  const turnText = document.getElementById('turn-text');
  const turnPulse = document.querySelector('.turn-pulse');
  const activeName = state.players[state.currentPlayer].name;
  
  turnText.textContent = `TURN: ${activeName.toUpperCase()}`;
  
  // Sync turn indicator color variables
  const activeColor = state.players[state.currentPlayer].color;
  turnPulse.style.setProperty('--curr-glow-color', activeColor);
}

function refreshStats() {
  const totalRounds = state.scores.X + state.scores.O + state.scores.ties;
  
  const winRateX = totalRounds > 0 ? Math.round((state.scores.X / totalRounds) * 100) : 0;
  const winRateO = totalRounds > 0 ? Math.round((state.scores.O / totalRounds) * 100) : 0;

  document.getElementById('stat-win-rate-x').textContent = `${winRateX}%`;
  document.getElementById('stat-win-rate-o').textContent = `${winRateO}%`;
  document.getElementById('stat-streak').textContent = state.streak;
  document.getElementById('stat-max-streak').textContent = state.maxStreak;

  // Render logs elements
  const listEl = document.getElementById('logs-list');
  const homeListEl = document.getElementById('home-logs-list');

  if (listEl) listEl.innerHTML = '';
  if (homeListEl) homeListEl.innerHTML = '';

  if (state.matchLogs.length === 0) {
    const emptyMsg = '<div class="log-empty">No records found. Play a round!</div>';
    if (listEl) listEl.innerHTML = emptyMsg;
    if (homeListEl) homeListEl.innerHTML = emptyMsg;
    return;
  }

  state.matchLogs.forEach((log, index) => {
    // Helper to create a log element
    const createLogItem = () => {
      const item = document.createElement('div');
      item.className = 'log-item';
      
      const logColor = log.outcome === 'TIE' ? '#8c82ab' : state.players[log.outcome]?.color || '#fff';
      item.style.setProperty('--log-border-color', logColor);

      const logTitle = log.outcome === 'TIE' 
        ? `DRAW vs ${log.opponent}` 
        : `${log.winnerName} beat ${log.opponent}`;

      item.innerHTML = `
        <span>${logTitle.toUpperCase()}</span>
        <span style="opacity: 0.5;">${log.moves} MOVES @ ${log.timestamp}</span>
      `;
      return item;
    };

    // Render to arena list
    if (listEl) {
      listEl.appendChild(createLogItem());
    }

    // Render to home list (limit to 5 latest matches)
    if (homeListEl && index < 5) {
      homeListEl.appendChild(createLogItem());
    }
  });
}

// 8. RESET GAME ARENA BOARD
function resetBoard() {
  state.board = Array(9).fill(null);
  state.moveCount = 0;
  state.isGameOver = false;
  state.isAITyping = false;
  
  // Select first turn (X starts first by default)
  state.currentPlayer = 'X';
  
  // Clear HTML cells
  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach(cell => {
    cell.innerHTML = '';
    cell.removeAttribute('data-preview');
  });

  // Reset win SVG laser lines overlay classes
  const gridBoard = document.getElementById('grid-board');
  gridBoard.classList.remove('win-line-active');
  
  const svgLine = document.getElementById('winning-vector');
  svgLine.setAttribute('x1', '0');
  svgLine.setAttribute('y1', '0');
  svgLine.setAttribute('x2', '0');
  svgLine.setAttribute('y2', '0');

  updateTurnDisplay();

  // Stop any running confetti from a previous round
  Confetti.stop();
}
