export type UpgradeCategory = 'passive' | 'click' | 'minigame' | 'global' | 'unlock';

export type EffectType =
  | 'add_cps'       // Add coins per second
  | 'add_click'     // Add click power
  | 'mult_cps'      // Multiply coins per second
  | 'mult_click'    // Multiply click power
  | 'mult_minigame' // Multiply minigame reward for specific game
  | 'mult_all'      // Multiply all income
  | 'unlock_game';  // Unlock a minigame

export interface EffectDefinition {
  type: EffectType;
  value: number;
  target?: string; // minigame id for mult_minigame, etc.
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  category: UpgradeCategory;
  maxLevel: number;
  baseCost: number;
  costScaling: number;
  effects: EffectDefinition[];
  requires?: string[];
  icon: string;
}
