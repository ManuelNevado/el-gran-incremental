export type UpgradeCategory = 'passive' | 'click' | 'minigame' | 'global' | 'unlock' | 'autopilot';

export type EffectType =
  | 'add_cps'            // Add coins per second
  | 'add_click'          // Add click power
  | 'mult_cps'           // Multiply coins per second
  | 'mult_click'         // Multiply click power
  | 'mult_minigame'      // Multiply minigame reward for specific game
  | 'mult_all'           // Multiply all income
  | 'unlock_game'        // Unlock a minigame
  | 'unlock_autopilot'   // Unlock autopilot for a minigame
  | 'autopilot_skill'    // Increase autopilot skill level
  | 'autopilot_speed';   // Increase autopilot speed

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
