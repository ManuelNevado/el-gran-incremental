import { gameState } from './GameState';
import { addCoins, getCoinsPerSecond } from './CurrencyManager';
import { eventBus } from './EventBus';
import { formatNumber, formatTime } from '../utils/numbers';
import { $ } from '../utils/dom';

const MAX_OFFLINE_SECONDS = 24 * 3600; // 24 hours cap
const OFFLINE_EFFICIENCY = 0.5; // 50% efficiency while offline

export function calculateOfflineProgress(): void {
  const now = Date.now();
  const lastPlayed = gameState.meta.lastPlayed;
  const elapsedMs = now - lastPlayed;
  const elapsedSeconds = Math.min(elapsedMs / 1000, MAX_OFFLINE_SECONDS);

  // Need at least 60 seconds away
  if (elapsedSeconds < 60) return;

  const cps = getCoinsPerSecond();
  const earned = Math.floor(cps * elapsedSeconds * OFFLINE_EFFICIENCY);

  if (earned <= 0) return;

  addCoins(earned, 'offline');
  eventBus.emit('offline:calculated', { seconds: elapsedSeconds, earned });

  showWelcomeBackModal(elapsedSeconds, earned);
}

function showWelcomeBackModal(seconds: number, earned: number): void {
  const overlay = $('#modal-overlay');
  overlay.classList.remove('hidden');

  overlay.innerHTML = `
    <div class="modal">
      <h2>Bienvenido de vuelta!</h2>
      <p>Has estado fuera ${formatTime(seconds)}</p>
      <div class="big-number">+${formatNumber(earned)} 🪙</div>
      <p class="text-muted">Eficiencia offline: ${Math.round(OFFLINE_EFFICIENCY * 100)}%</p>
      <button class="btn btn-primary" id="btn-welcome-close">Genial!</button>
    </div>
  `;

  document.getElementById('btn-welcome-close')?.addEventListener('click', () => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
  });
}
