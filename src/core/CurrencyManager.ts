import { gameState } from './GameState';
import { eventBus } from './EventBus';

export function addCoins(amount: number, source: string): void {
  const actual = amount * gameState.prestige.multiplier;
  gameState.currencies.coins += actual;
  gameState.stats.totalCoinsEarned += actual;
  eventBus.emit('currency:earned', { type: 'coins', amount: actual, source });
  eventBus.emit('currency:changed', { type: 'coins', amount: actual, total: gameState.currencies.coins });
}

export function spendCoins(amount: number): boolean {
  if (gameState.currencies.coins < amount) return false;
  gameState.currencies.coins -= amount;
  eventBus.emit('currency:spent', { type: 'coins', amount });
  eventBus.emit('currency:changed', { type: 'coins', amount: -amount, total: gameState.currencies.coins });
  return true;
}

export function canAfford(amount: number): boolean {
  return gameState.currencies.coins >= amount;
}

export function addGems(amount: number): void {
  gameState.currencies.gems += amount;
  gameState.prestige.totalGemsEarned += amount;
  eventBus.emit('currency:earned', { type: 'gems', amount, source: 'prestige' });
  eventBus.emit('currency:changed', { type: 'gems', amount, total: gameState.currencies.gems });
}

export function getCoinsPerSecond(): number {
  return gameState.passive.coinsPerSecond * gameState.prestige.multiplier;
}

export function getClickPower(): number {
  return gameState.passive.clickPower * gameState.prestige.multiplier;
}
