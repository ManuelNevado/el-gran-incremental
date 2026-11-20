import { gameState } from '../core/GameState';
import { eventBus } from '../core/EventBus';
import { addCoins } from '../core/CurrencyManager';
import { getMinigameMultiplier } from '../upgrades/UpgradeManager';
import { formatNumber } from '../utils/numbers';
import { $ } from '../utils/dom';
import type { MinigameBase } from './MinigameBase';

let currentGame: MinigameBase | null = null;

export function startMinigame(game: MinigameBase): void {
  if (currentGame) return;

  const container = $('#minigame-canvas-container');
  container.classList.remove('hidden');
  container.innerHTML = '';

  // HUD bar
  const hud = document.createElement('div');
  hud.className = 'minigame-hud';
  hud.innerHTML = `
    <span class="minigame-score">Puntos: <span id="mg-score">0</span></span>
    <button class="minigame-exit-btn" id="mg-exit">Salir (Esc)</button>
  `;
  container.appendChild(hud);

  // Canvas
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 480;
  canvas.style.borderRadius = 'var(--radius-md)';
  canvas.style.border = '1px solid var(--border-color)';
  canvas.style.background = '#0a0a1a';
  container.appendChild(canvas);

  currentGame = game;
  game.start(canvas);

  eventBus.emit('minigame:started', { id: game.id });

  // Update score display
  const scoreInterval = setInterval(() => {
    const scoreEl = document.getElementById('mg-score');
    if (scoreEl && currentGame) {
      scoreEl.textContent = currentGame.getScore().toString();
    }
  }, 100);

  // Exit handlers
  const exitBtn = document.getElementById('mg-exit');
  const exitHandler = () => endMinigame();
  exitBtn?.addEventListener('click', exitHandler);

  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') endMinigame();
  };
  document.addEventListener('keydown', keyHandler);

  // Store cleanup
  const cleanup = () => {
    clearInterval(scoreInterval);
    exitBtn?.removeEventListener('click', exitHandler);
    document.removeEventListener('keydown', keyHandler);
  };
  (container as unknown as Record<string, () => void>)._cleanup = cleanup;
}

export function endMinigame(): void {
  if (!currentGame) return;

  const game = currentGame;
  const score = game.stop();
  currentGame = null;

  // Calculate reward
  const baseReward = score * game.baseRewardPerPoint;
  const multiplier = getMinigameMultiplier(game.id) * gameState.prestige.multiplier;
  const reward = Math.floor(baseReward * multiplier);

  // Update stats
  const stats = gameState.minigames[game.id];
  if (stats) {
    stats.timesPlayed++;
    stats.totalEarned += reward;
    if (score > stats.highScore) {
      stats.highScore = score;
    }
  }

  // Award coins
  if (reward > 0) {
    addCoins(reward, `minigame:${game.id}`);
  }

  // Hide canvas
  const container = $('#minigame-canvas-container');
  const cleanup = (container as unknown as Record<string, (() => void) | undefined>)._cleanup;
  if (cleanup) cleanup();
  container.classList.add('hidden');
  container.innerHTML = '';

  eventBus.emit('minigame:ended', { id: game.id, score, reward });
  eventBus.emit('notification', {
    message: `${game.icon} ${game.name}: ${score} pts = ${formatNumber(reward)} monedas!`,
    type: 'reward',
  });
}

export function isMinigameActive(): boolean {
  return currentGame !== null;
}
