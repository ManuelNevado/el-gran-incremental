import { gameState } from '../core/GameState';
import { eventBus } from '../core/EventBus';
import { $ } from '../utils/dom';
import { formatNumber } from '../utils/numbers';

const PRESTIGE_THRESHOLD = 1_000_000;

function getGemReward(): number {
  return Math.floor(Math.sqrt(gameState.stats.totalCoinsEarned / 1000));
}

export function initPrestigePanel(): void {
  renderPrestige();
  eventBus.on('tab:changed', ({ tab }) => {
    if (tab === 'prestige') renderPrestige();
  });
}

function renderPrestige(): void {
  const container = $('#tab-prestige');
  const gems = getGemReward();
  const canPrestige = gameState.stats.totalCoinsEarned >= PRESTIGE_THRESHOLD;

  container.innerHTML = `
    <div class="prestige-panel">
      <h2>Prestigio</h2>
      <p class="text-muted" style="margin-bottom: 16px;">
        Reinicia tu progreso a cambio de gemas y un multiplicador permanente.
      </p>

      <div style="margin: 24px 0;">
        <div class="text-muted" style="font-size: 0.85rem;">Gemas que obtendrias</div>
        <div class="prestige-potential">${formatNumber(gems)} 💎</div>
      </div>

      <div style="margin: 16px 0;">
        <div class="text-muted" style="font-size: 0.85rem;">Multiplicador actual</div>
        <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-gem);">
          x${gameState.prestige.multiplier.toFixed(1)}
        </div>
      </div>

      <div style="margin: 16px 0;">
        <div class="text-muted" style="font-size: 0.85rem;">Nuevo multiplicador</div>
        <div style="font-size: 1.2rem; font-weight: 700; color: var(--accent-green);">
          x${(1 + (gameState.prestige.count + 1) * 0.1).toFixed(1)}
        </div>
      </div>

      <div style="margin: 16px 0;">
        <div class="text-muted" style="font-size: 0.85rem;">Monedas totales ganadas</div>
        <div style="font-size: 1.1rem; color: var(--accent-gold);">
          ${formatNumber(gameState.stats.totalCoinsEarned)} / ${formatNumber(PRESTIGE_THRESHOLD)}
        </div>
      </div>

      ${canPrestige ? `
        <button class="btn btn-primary" id="btn-prestige" style="margin-top: 24px; padding: 12px 32px; font-size: 1rem;">
          Prestigiar (+${formatNumber(gems)} 💎)
        </button>
      ` : `
        <p class="text-muted" style="margin-top: 24px;">
          Necesitas ${formatNumber(PRESTIGE_THRESHOLD)} monedas totales para prestigiar
        </p>
      `}

      <div style="margin-top: 32px; padding: 16px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <div style="font-weight: 700; margin-bottom: 8px;">Al prestigiar:</div>
        <ul style="list-style: none; text-align: left; font-size: 0.85rem; color: var(--text-secondary);">
          <li style="margin-bottom: 4px;">❌ Pierdes todas las monedas</li>
          <li style="margin-bottom: 4px;">❌ Pierdes todas las mejoras</li>
          <li style="margin-bottom: 4px;">✅ Ganas gemas permanentes</li>
          <li style="margin-bottom: 4px;">✅ Multiplicador global aumenta</li>
          <li>✅ Records de mini-juegos se mantienen</li>
        </ul>
      </div>
    </div>
  `;

  document.getElementById('btn-prestige')?.addEventListener('click', () => {
    if (!canPrestige) return;
    if (!confirm('Vas a prestigiar. Perderas monedas y mejoras. Continuar?')) return;
    doPrestige(gems);
  });
}

function doPrestige(gems: number): void {
  gameState.prestige.count++;
  gameState.prestige.multiplier = 1 + gameState.prestige.count * 0.1;
  gameState.currencies.gems += gems;
  gameState.prestige.totalGemsEarned += gems;

  // Reset
  gameState.currencies.coins = 0;
  gameState.passive.coinsPerSecond = 0.1;
  gameState.passive.clickPower = 1;
  gameState.upgrades = {};
  gameState.stats.totalCoinsEarned = 0;
  gameState.stats.totalClicks = 0;

  // Re-lock minigames
  for (const key of Object.keys(gameState.minigames)) {
    gameState.minigames[key].unlocked = false;
    // Keep high scores and times played
  }

  eventBus.emit('prestige:triggered', { multiplier: gameState.prestige.multiplier, gemsEarned: gems });
  eventBus.emit('notification', {
    message: `⭐ Prestigio! +${formatNumber(gems)} gemas, x${gameState.prestige.multiplier.toFixed(1)} multiplicador`,
    type: 'reward',
  });

  // Force UI refresh
  import('./HUD').then(m => m.forceUpdateHUD());
  renderPrestige();
}
