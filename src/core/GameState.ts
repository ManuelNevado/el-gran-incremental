export interface MinigameStats {
  highScore: number;
  timesPlayed: number;
  totalEarned: number;
  unlocked: boolean;
}

export interface UpgradeState {
  level: number;
  unlocked: boolean;
}

export interface AutopilotState {
  enabled: boolean;
  skillLevel: number;
  speedLevel: number;
}

export interface GameState {
  currencies: {
    coins: number;
    gems: number;
  };
  passive: {
    coinsPerSecond: number;
    clickPower: number;
  };
  upgrades: Record<string, UpgradeState>;
  minigames: Record<string, MinigameStats>;
  autopilots: Record<string, AutopilotState>;
  prestige: {
    count: number;
    totalGemsEarned: number;
    multiplier: number;
  };
  stats: {
    totalCoinsEarned: number;
    totalClicks: number;
    totalTimePlayed: number;
    startedAt: number;
  };
  meta: {
    version: number;
    lastSaved: number;
    lastPlayed: number;
  };
}

const CURRENT_VERSION = 2;

export function createDefaultState(): GameState {
  return {
    currencies: {
      coins: 0,
      gems: 0,
    },
    passive: {
      coinsPerSecond: 0.1,
      clickPower: 1,
    },
    upgrades: {},
    autopilots: {},
    minigames: {
      snake: { highScore: 0, timesPlayed: 0, totalEarned: 0, unlocked: false },
      flappy: { highScore: 0, timesPlayed: 0, totalEarned: 0, unlocked: false },
      minesweeper: { highScore: 0, timesPlayed: 0, totalEarned: 0, unlocked: false },
      dino: { highScore: 0, timesPlayed: 0, totalEarned: 0, unlocked: false },
      crossy: { highScore: 0, timesPlayed: 0, totalEarned: 0, unlocked: false },
      invaders: { highScore: 0, timesPlayed: 0, totalEarned: 0, unlocked: false },
    },
    prestige: {
      count: 0,
      totalGemsEarned: 0,
      multiplier: 1,
    },
    stats: {
      totalCoinsEarned: 0,
      totalClicks: 0,
      totalTimePlayed: 0,
      startedAt: Date.now(),
    },
    meta: {
      version: CURRENT_VERSION,
      lastSaved: Date.now(),
      lastPlayed: Date.now(),
    },
  };
}

export function migrateState(save: Record<string, unknown>): GameState {
  const state = save as unknown as GameState;
  if (state.meta.version < 2) {
    state.autopilots = {};
  }
  state.meta.version = CURRENT_VERSION;
  return state;
}

// Global game state singleton
export let gameState: GameState = createDefaultState();

export function setGameState(state: GameState): void {
  gameState = state;
}
