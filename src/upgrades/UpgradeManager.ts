import { gameState } from '../core/GameState';
import { eventBus } from '../core/EventBus';
import { spendCoins, canAfford } from '../core/CurrencyManager';
import { UPGRADES, getUpgrade } from './UpgradeRegistry';
import type { UpgradeDefinition } from './types';

export function getUpgradeLevel(id: string): number {
  return gameState.upgrades[id]?.level ?? 0;
}

export function isUpgradeUnlocked(id: string): boolean {
  return gameState.upgrades[id]?.unlocked ?? false;
}

export function getUpgradeCost(def: UpgradeDefinition): number {
  const level = getUpgradeLevel(def.id);
  return Math.floor(def.baseCost * Math.pow(def.costScaling, level));
}

export function canPurchaseUpgrade(id: string): boolean {
  const def = getUpgrade(id);
  if (!def) return false;
  const level = getUpgradeLevel(id);
  if (level >= def.maxLevel) return false;
  if (!areRequirementsMet(def)) return false;
  return canAfford(getUpgradeCost(def));
}

export function areRequirementsMet(def: UpgradeDefinition): boolean {
  if (!def.requires) return true;
  return def.requires.every(reqId => getUpgradeLevel(reqId) > 0);
}

export function purchaseUpgrade(id: string): boolean {
  const def = getUpgrade(id);
  if (!def) return false;
  if (!canPurchaseUpgrade(id)) return false;

  const cost = getUpgradeCost(def);
  if (!spendCoins(cost)) return false;

  if (!gameState.upgrades[id]) {
    gameState.upgrades[id] = { level: 0, unlocked: true };
  }
  gameState.upgrades[id].level++;
  gameState.upgrades[id].unlocked = true;

  // Apply effects
  applyEffects(def);

  eventBus.emit('upgrade:purchased', { id, level: gameState.upgrades[id].level });
  eventBus.emit('notification', {
    message: `${def.icon} ${def.name} nivel ${gameState.upgrades[id].level}!`,
    type: 'success',
  });

  return true;
}

function applyEffects(def: UpgradeDefinition): void {
  for (const effect of def.effects) {
    switch (effect.type) {
      case 'add_cps':
        gameState.passive.coinsPerSecond += effect.value;
        eventBus.emit('passive:updated', { coinsPerSecond: gameState.passive.coinsPerSecond });
        break;
      case 'add_click':
        gameState.passive.clickPower += effect.value;
        break;
      case 'mult_all':
        // Stored as cumulative; recalculated on load
        // For now, just boost CPS and click
        gameState.passive.coinsPerSecond *= (1 + effect.value);
        gameState.passive.clickPower *= (1 + effect.value);
        eventBus.emit('passive:updated', { coinsPerSecond: gameState.passive.coinsPerSecond });
        break;
      case 'unlock_game':
        if (effect.target && gameState.minigames[effect.target]) {
          gameState.minigames[effect.target].unlocked = true;
          eventBus.emit('upgrade:unlocked', { id: effect.target });
        }
        break;
      case 'unlock_autopilot':
        if (effect.target) {
          if (!gameState.autopilots[effect.target]) {
            gameState.autopilots[effect.target] = { enabled: false, skillLevel: 1, speedLevel: 1 };
          }
        }
        break;
      case 'autopilot_skill':
        if (effect.target && gameState.autopilots[effect.target]) {
          gameState.autopilots[effect.target].skillLevel += effect.value;
        }
        break;
      case 'autopilot_speed':
        if (effect.target && gameState.autopilots[effect.target]) {
          gameState.autopilots[effect.target].speedLevel += effect.value;
        }
        break;
      case 'unlock_activity':
        if (effect.target && effect.target in gameState.activities) {
          (gameState.activities as unknown as Record<string, { unlocked: boolean }>)[effect.target].unlocked = true;
          eventBus.emit('upgrade:unlocked', { id: effect.target });
        }
        break;
      case 'mining_depth':
        gameState.activities.mining.depth += effect.value;
        break;
      case 'mining_auto':
        gameState.activities.mining.autoMiners += effect.value;
        break;
      case 'fishing_rod':
        gameState.activities.fishing.rodLevel += effect.value;
        break;
      case 'fishing_auto':
        gameState.activities.fishing.autoFishers += effect.value;
        break;
      case 'farm_plots':
        gameState.activities.farm.plotCount += effect.value;
        break;
      case 'farm_speed':
        gameState.activities.farm.growthMultiplier += effect.value;
        break;
      case 'farm_auto':
        gameState.activities.farm.autoHarvest = true;
        break;
      // mult_minigame, mult_cps, mult_click handled at reward calculation time
    }
  }
}

export function getMinigameMultiplier(gameId: string): number {
  let mult = 1;
  for (const def of UPGRADES) {
    for (const effect of def.effects) {
      if (effect.type === 'mult_minigame' && effect.target === gameId) {
        const level = getUpgradeLevel(def.id);
        mult += effect.value * level;
      }
    }
  }
  return mult;
}

export function getVisibleUpgrades(): UpgradeDefinition[] {
  return UPGRADES.filter(def => {
    // Show if requirements met or already purchased
    if (getUpgradeLevel(def.id) > 0) return true;
    return areRequirementsMet(def);
  });
}
