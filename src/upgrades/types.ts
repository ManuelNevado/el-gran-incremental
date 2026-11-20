export type UpgradeCategory = 'passive' | 'click' | 'minigame' | 'global' | 'unlock' | 'autopilot' | 'activity';

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
  | 'autopilot_speed'    // Increase autopilot speed
  | 'unlock_activity'    // Unlock an activity (mining/fishing/farm)
  | 'mining_depth'       // Increase mining depth
  | 'mining_auto'        // Add auto-miners
  | 'fishing_rod'        // Upgrade fishing rod
  | 'fishing_auto'       // Add auto-fishers
  | 'farm_plots'         // Add farm plots
  | 'farm_speed'         // Increase growth speed
  | 'farm_auto';         // Enable auto-harvest

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
