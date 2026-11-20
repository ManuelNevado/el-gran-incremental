import { gameState } from '../core/GameState';
import { eventBus } from '../core/EventBus';
import { getCoinsPerSecond } from '../core/CurrencyManager';
import { formatNumber, formatRate } from '../utils/numbers';
import { $ } from '../utils/dom';

let displayedCoins = 0;
let displayedGems = 0;

export function initHUD(): void {
  eventBus.on('tick', () => {
    updateCurrencyDisplays();
  });

  eventBus.on('currency:changed', () => {
    updateCurrencyDisplays();
  });

  eventBus.on('passive:updated', () => {
    updateRate();
  });

  updateCurrencyDisplays();
  updateRate();
}

function updateCurrencyDisplays(): void {
  // Smooth interpolation toward actual value
  const targetCoins = gameState.currencies.coins;
  const targetGems = gameState.currencies.gems;

  displayedCoins += (targetCoins - displayedCoins) * 0.3;
  if (Math.abs(targetCoins - displayedCoins) < 1) displayedCoins = targetCoins;

  displayedGems += (targetGems - displayedGems) * 0.3;
  if (Math.abs(targetGems - displayedGems) < 1) displayedGems = targetGems;

  $('#coins-amount').textContent = formatNumber(displayedCoins);
  $('#gems-amount').textContent = formatNumber(displayedGems);
}

function updateRate(): void {
  $('#coins-rate').textContent = formatRate(getCoinsPerSecond());
}

export function forceUpdateHUD(): void {
  displayedCoins = gameState.currencies.coins;
  displayedGems = gameState.currencies.gems;
  updateCurrencyDisplays();
  updateRate();
  $('#prestige-info').textContent = `x${gameState.prestige.multiplier.toFixed(1)}`;
}
