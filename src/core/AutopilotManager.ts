import { gameState } from './GameState';
import { eventBus } from './EventBus';
import { addCoins } from './CurrencyManager';
import { getMinigameMultiplier } from '../upgrades/UpgradeManager';
import { formatNumber } from '../utils/numbers';

export interface AutopilotConfig {
  gameId: string;
  name: string;
  icon: string;
  /** Base score range the AI can achieve at skill level 1 */
  baseScoreMin: number;
  baseScoreMax: number;
  /** How much score improves per skill level */
  scorePerSkillLevel: number;
  /** Base reward per point (same as the minigame) */
  baseRewardPerPoint: number;
  /** Seconds between simulated games */
  baseInterval: number;
}

export interface AutopilotState {
  enabled: boolean;
  skillLevel: number;
  speedLevel: number;
}

const AUTOPILOT_CONFIGS: AutopilotConfig[] = [
  {
    gameId: 'snake',
    name: 'Bot Snake',
    icon: '🤖🐍',
    baseScoreMin: 2,
    baseScoreMax: 6,
    scorePerSkillLevel: 2,
    baseRewardPerPoint: 5,
    baseInterval: 15,
  },
  {
    gameId: 'flappy',
    name: 'Bot Flappy',
    icon: '🤖🐦',
    baseScoreMin: 1,
    baseScoreMax: 4,
    scorePerSkillLevel: 1.5,
    baseRewardPerPoint: 10,
    baseInterval: 12,
  },
  {
    gameId: 'minesweeper',
    name: 'Bot Buscaminas',
    icon: '🤖💣',
    baseScoreMin: 10,
    baseScoreMax: 25,
    scorePerSkillLevel: 5,
    baseRewardPerPoint: 3,
    baseInterval: 20,
  },
  {
    gameId: 'dino',
    name: 'Bot Dino',
    icon: '🤖🦕',
    baseScoreMin: 20,
    baseScoreMax: 60,
    scorePerSkillLevel: 15,
    baseRewardPerPoint: 2,
    baseInterval: 14,
  },
  {
    gameId: 'crossy',
    name: 'Bot Crossy',
    icon: '🤖🐔',
    baseScoreMin: 5,
    baseScoreMax: 15,
    scorePerSkillLevel: 4,
    baseRewardPerPoint: 3,
    baseInterval: 16,
  },
  {
    gameId: 'invaders',
    name: 'Bot Invaders',
    icon: '🤖👾',
    baseScoreMin: 30,
    baseScoreMax: 80,
    scorePerSkillLevel: 20,
    baseRewardPerPoint: 4,
    baseInterval: 18,
  },
];

// Timers per game
const timers: Record<string, number> = {};

// Last result per game (for mini-visualization)
export interface AutopilotLastRun {
  score: number;
  reward: number;
  timestamp: number;
}
const lastRuns: Record<string, AutopilotLastRun> = {};

export function getAutopilotProgress(gameId: string): number {
  const config = getAutopilotConfig(gameId);
  if (!config) return 0;
  const elapsed = timers[gameId] ?? 0;
  const interval = getInterval(config);
  return Math.min(elapsed / interval, 1);
}

export function getLastRun(gameId: string): AutopilotLastRun | undefined {
  return lastRuns[gameId];
}

export function getAutopilotConfig(gameId: string): AutopilotConfig | undefined {
  return AUTOPILOT_CONFIGS.find(c => c.gameId === gameId);
}

export function getAllAutopilotConfigs(): AutopilotConfig[] {
  return AUTOPILOT_CONFIGS;
}

export function getAutopilotState(gameId: string): AutopilotState {
  return gameState.autopilots[gameId] ?? { enabled: false, skillLevel: 1, speedLevel: 1 };
}

export function isAutopilotUnlocked(gameId: string): boolean {
  // Need the game unlocked + the autopilot upgrade purchased
  const gameUnlocked = gameState.minigames[gameId]?.unlocked ?? false;
  const apUpgrade = gameState.upgrades[`autopilot_${gameId}`];
  return gameUnlocked && (apUpgrade?.level ?? 0) > 0;
}

export function toggleAutopilot(gameId: string): void {
  if (!isAutopilotUnlocked(gameId)) return;
  const state = getAutopilotState(gameId);
  state.enabled = !state.enabled;
  gameState.autopilots[gameId] = state;

  if (state.enabled) {
    eventBus.emit('notification', {
      message: `${getAutopilotConfig(gameId)?.icon} Piloto automatico activado`,
      type: 'info',
    });
  }
}

function simulateGame(config: AutopilotConfig): void {
  const state = getAutopilotState(config.gameId);
  if (!state.enabled) return;

  const skill = state.skillLevel;

  // Score = random in range, scaled by skill
  const min = config.baseScoreMin + (skill - 1) * config.scorePerSkillLevel * 0.5;
  const max = config.baseScoreMax + (skill - 1) * config.scorePerSkillLevel;
  const score = Math.floor(min + Math.random() * (max - min));

  // Apply same reward formula as real minigames
  const baseReward = score * config.baseRewardPerPoint;
  const multiplier = getMinigameMultiplier(config.gameId) * gameState.prestige.multiplier;
  const reward = Math.floor(baseReward * multiplier);

  // Update minigame stats
  const mgStats = gameState.minigames[config.gameId];
  if (mgStats) {
    mgStats.timesPlayed++;
    mgStats.totalEarned += reward;
    if (score > mgStats.highScore) {
      mgStats.highScore = score;
    }
  }

  if (reward > 0) {
    addCoins(reward, `autopilot:${config.gameId}`);
  }

  lastRuns[config.gameId] = { score, reward, timestamp: Date.now() };

  eventBus.emit('autopilot:completed', {
    gameId: config.gameId,
    score,
    reward,
  });

  eventBus.emit('notification', {
    message: `${config.icon} ${score} pts = +${formatNumber(reward)} monedas`,
    type: 'reward',
  });
}

function getInterval(config: AutopilotConfig): number {
  const state = getAutopilotState(config.gameId);
  // Each speed level reduces interval by 10%, min 5 seconds
  const reduction = 1 - (state.speedLevel - 1) * 0.1;
  return Math.max(5, config.baseInterval * reduction);
}

export function initAutopilots(): void {
  // Tick-driven timers
  for (const config of AUTOPILOT_CONFIGS) {
    timers[config.gameId] = 0;
  }

  eventBus.on('tick', ({ dt }) => {
    for (const config of AUTOPILOT_CONFIGS) {
      if (!isAutopilotUnlocked(config.gameId)) continue;
      const state = getAutopilotState(config.gameId);
      if (!state.enabled) continue;

      timers[config.gameId] = (timers[config.gameId] ?? 0) + dt;
      const interval = getInterval(config);

      if (timers[config.gameId] >= interval) {
        timers[config.gameId] -= interval;
        simulateGame(config);
      }
    }
  });
}
