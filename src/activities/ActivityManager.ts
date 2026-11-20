import { gameState, type FarmPlot } from '../core/GameState';
import { eventBus } from '../core/EventBus';
import { addCoins } from '../core/CurrencyManager';

// ===== ORE / FISH / CROP DEFINITIONS =====

export interface OreType {
  id: string;
  name: string;
  value: number;
  minDepth: number;
  weight: number; // relative probability
  color: string;
  icon: string;
}

export const ORES: OreType[] = [
  { id: 'stone',   name: 'Piedra',    value: 1,   minDepth: 1, weight: 40, color: '#6b7280', icon: '' },
  { id: 'coal',    name: 'Carbon',    value: 3,   minDepth: 1, weight: 25, color: '#374151', icon: '' },
  { id: 'iron',    name: 'Hierro',    value: 8,   minDepth: 2, weight: 18, color: '#d97706', icon: '' },
  { id: 'gold',    name: 'Oro',       value: 20,  minDepth: 3, weight: 10, color: '#fbbf24', icon: '' },
  { id: 'diamond', name: 'Diamante',  value: 50,  minDepth: 4, weight: 5,  color: '#38bdf8', icon: '' },
  { id: 'ruby',    name: 'Rubi',      value: 100, minDepth: 5, weight: 2,  color: '#f43f5e', icon: '' },
];

export interface FishType {
  id: string;
  name: string;
  value: number;
  minRod: number;
  weight: number;
  color: string;
}

export const FISH: FishType[] = [
  { id: 'sardina',  name: 'Sardina',      value: 5,   minRod: 1, weight: 35, color: '#94a3b8' },
  { id: 'trucha',   name: 'Trucha',       value: 15,  minRod: 1, weight: 25, color: '#f97316' },
  { id: 'salmon',   name: 'Salmon',       value: 30,  minRod: 2, weight: 18, color: '#fb7185' },
  { id: 'atun',     name: 'Atun',         value: 60,  minRod: 3, weight: 12, color: '#3b82f6' },
  { id: 'espada',   name: 'Pez Espada',   value: 120, minRod: 4, weight: 7,  color: '#8b5cf6' },
  { id: 'dorado',   name: 'Pez Dorado',   value: 250, minRod: 5, weight: 3,  color: '#fbbf24' },
];

export interface CropType {
  id: string;
  name: string;
  growthTime: number; // seconds
  value: number;
  color: string;
  icon: string;
}

export const CROPS: CropType[] = [
  { id: 'trigo',   name: 'Trigo',       growthTime: 30,  value: 10,  color: '#eab308', icon: '' },
  { id: 'maiz',    name: 'Maiz',        growthTime: 60,  value: 25,  color: '#facc15', icon: '' },
  { id: 'tomate',  name: 'Tomate',      growthTime: 90,  value: 50,  color: '#ef4444', icon: '' },
  { id: 'fresa',   name: 'Fresa',       growthTime: 150, value: 100, color: '#f43f5e', icon: '' },
  { id: 'uva',     name: 'Uva',         growthTime: 240, value: 200, color: '#7c3aed', icon: '' },
  { id: 'orquidea', name: 'Orquidea Dorada', growthTime: 420, value: 500, color: '#ffd700', icon: '' },
];

// ===== MINING =====

function rollOre(depth: number): OreType {
  const available = ORES.filter(o => o.minDepth <= depth);
  let totalWeight = 0;
  for (const o of available) totalWeight += o.weight;
  let roll = Math.random() * totalWeight;
  for (const o of available) {
    roll -= o.weight;
    if (roll <= 0) return o;
  }
  return available[available.length - 1];
}

export function mineOnce(): { ore: OreType; reward: number } | null {
  const mining = gameState.activities.mining;
  if (!mining.unlocked) return null;

  const ore = rollOre(mining.depth);
  const mult = gameState.prestige.multiplier;
  const reward = Math.floor(ore.value * mult);

  if (reward > 0) {
    addCoins(reward, 'activity:mining');
  }
  mining.totalMined++;
  return { ore, reward };
}

// ===== FISHING =====

function rollFish(rodLevel: number): FishType {
  const available = FISH.filter(f => f.minRod <= rodLevel);
  let totalWeight = 0;
  for (const f of available) totalWeight += f.weight;
  let roll = Math.random() * totalWeight;
  for (const f of available) {
    roll -= f.weight;
    if (roll <= 0) return f;
  }
  return available[available.length - 1];
}

export function castLine(): void {
  const fishing = gameState.activities.fishing;
  if (!fishing.unlocked || fishing.castState !== 'idle') return;
  fishing.castState = 'waiting';
  fishing.castTimer = 0;
  fishing.biteWindow = 2 + Math.random() * 4; // 2-6 seconds to bite
}

export function reelIn(): { fish: FishType; reward: number } | null {
  const fishing = gameState.activities.fishing;
  if (fishing.castState !== 'bite') return null;

  const fish = rollFish(fishing.rodLevel);
  const mult = gameState.prestige.multiplier;
  const reward = Math.floor(fish.value * mult);

  if (reward > 0) {
    addCoins(reward, 'activity:fishing');
  }
  fishing.totalCaught++;
  fishing.castState = 'idle';
  fishing.castTimer = 0;
  return { fish, reward };
}

// ===== FARM =====

export function getAvailableCrops(): CropType[] {
  // All crops unlocked for now; could gate by upgrade later
  return CROPS;
}

export function plantCrop(plotIndex: number, cropId: string): boolean {
  const farm = gameState.activities.farm;
  if (!farm.unlocked) return false;
  if (plotIndex < 0 || plotIndex >= farm.plots.length) return false;
  const plot = farm.plots[plotIndex];
  if (plot.cropId !== null) return false;

  const crop = CROPS.find(c => c.id === cropId);
  if (!crop) return false;

  plot.cropId = cropId;
  plot.plantedAt = Date.now();
  plot.growthTime = crop.growthTime / farm.growthMultiplier;
  plot.value = crop.value;
  return true;
}

export function harvestPlot(plotIndex: number): { crop: CropType; reward: number } | null {
  const farm = gameState.activities.farm;
  if (plotIndex < 0 || plotIndex >= farm.plots.length) return null;
  const plot = farm.plots[plotIndex];
  if (!plot.cropId) return null;

  const elapsed = (Date.now() - plot.plantedAt) / 1000;
  if (elapsed < plot.growthTime) return null;

  const crop = CROPS.find(c => c.id === plot.cropId)!;
  const mult = gameState.prestige.multiplier;
  const reward = Math.floor(plot.value * mult);

  if (reward > 0) {
    addCoins(reward, 'activity:farm');
  }
  farm.totalHarvested++;

  // Clear plot
  plot.cropId = null;
  plot.plantedAt = 0;
  plot.growthTime = 0;
  plot.value = 0;

  return { crop, reward };
}

export function getPlotProgress(plot: FarmPlot): number {
  if (!plot.cropId) return 0;
  const elapsed = (Date.now() - plot.plantedAt) / 1000;
  return Math.min(elapsed / plot.growthTime, 1);
}

// ===== TICK (AUTO SYSTEMS) =====

function tickMining(dt: number): void {
  const mining = gameState.activities.mining;
  if (!mining.unlocked || mining.autoMiners <= 0) return;

  mining.autoTimer += dt;
  const interval = 3; // Auto-mine every 3 seconds per miner
  const minesPerTick = Math.floor(mining.autoTimer / interval);
  if (minesPerTick > 0) {
    mining.autoTimer -= minesPerTick * interval;
    for (let i = 0; i < Math.min(minesPerTick * mining.autoMiners, 10); i++) {
      const ore = rollOre(mining.depth);
      const mult = gameState.prestige.multiplier;
      const reward = Math.floor(ore.value * mult);
      if (reward > 0) addCoins(reward, 'activity:mining');
      mining.totalMined++;
    }
  }
}

function tickFishing(dt: number): void {
  const fishing = gameState.activities.fishing;
  if (!fishing.unlocked) return;

  // Manual fishing state machine
  if (fishing.castState === 'waiting') {
    fishing.castTimer += dt;
    if (fishing.castTimer >= fishing.biteWindow) {
      fishing.castState = 'bite';
      fishing.castTimer = 0;
    }
  } else if (fishing.castState === 'bite') {
    fishing.castTimer += dt;
    // Bite window lasts 2 seconds, then fish escapes
    if (fishing.castTimer > 2) {
      fishing.castState = 'idle';
      fishing.castTimer = 0;
    }
  }

  // Auto-fishing
  if (fishing.autoFishers > 0) {
    fishing.autoTimer += dt;
    const interval = 5; // Auto-fish every 5 seconds per bot
    if (fishing.autoTimer >= interval) {
      fishing.autoTimer -= interval;
      for (let i = 0; i < fishing.autoFishers; i++) {
        const fish = rollFish(fishing.rodLevel);
        const mult = gameState.prestige.multiplier;
        const reward = Math.floor(fish.value * mult);
        if (reward > 0) addCoins(reward, 'activity:fishing');
        fishing.totalCaught++;
      }
    }
  }
}

function tickFarm(_dt: number): void {
  const farm = gameState.activities.farm;
  if (!farm.unlocked) return;

  // Ensure plots array matches plotCount
  while (farm.plots.length < farm.plotCount) {
    farm.plots.push({ cropId: null, plantedAt: 0, growthTime: 0, value: 0 });
  }

  // Auto-harvest + auto-replant
  if (farm.autoHarvest) {
    for (let i = 0; i < farm.plots.length; i++) {
      const plot = farm.plots[i];
      if (plot.cropId && getPlotProgress(plot) >= 1) {
        const crop = CROPS.find(c => c.id === plot.cropId);
        const mult = gameState.prestige.multiplier;
        const reward = Math.floor(plot.value * mult);
        if (reward > 0) addCoins(reward, 'activity:farm');
        farm.totalHarvested++;

        // Auto-replant same crop
        const cropId = plot.cropId;
        plot.cropId = cropId;
        plot.plantedAt = Date.now();
        plot.growthTime = (crop?.growthTime ?? 30) / farm.growthMultiplier;
        plot.value = crop?.value ?? 10;
      }
    }
  }
}

// ===== LAST RESULTS (for notifications) =====

export interface ActivityLastResult {
  type: string;
  name: string;
  reward: number;
  timestamp: number;
}
let lastMiningResult: ActivityLastResult | null = null;
let lastFishingResult: ActivityLastResult | null = null;
let lastFarmResult: ActivityLastResult | null = null;

export function getLastMiningResult() { return lastMiningResult; }
export function getLastFishingResult() { return lastFishingResult; }
export function getLastFarmResult() { return lastFarmResult; }

export function setLastResult(activity: 'mining' | 'fishing' | 'farm', name: string, reward: number): void {
  const result = { type: activity, name, reward, timestamp: Date.now() };
  switch (activity) {
    case 'mining': lastMiningResult = result; break;
    case 'fishing': lastFishingResult = result; break;
    case 'farm': lastFarmResult = result; break;
  }
}

// ===== INIT =====

export function initActivities(): void {
  // Ensure farm plots match plotCount on load
  const farm = gameState.activities.farm;
  while (farm.plots.length < farm.plotCount) {
    farm.plots.push({ cropId: null, plantedAt: 0, growthTime: 0, value: 0 });
  }

  eventBus.on('tick', ({ dt }) => {
    tickMining(dt);
    tickFishing(dt);
    tickFarm(dt);
  });
}
