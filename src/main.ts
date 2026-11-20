import './styles/main.css';
import { loadGame, initAutoSave, hasSave } from './core/SaveManager';
import { startGameLoop } from './core/GameLoop';
import { calculateOfflineProgress } from './core/OfflineProgress';
import { initHUD, forceUpdateHUD } from './ui/HUD';
import { initNotifications } from './ui/Notifications';
import { initShopPanel } from './ui/ShopPanel';
import { initTabManager } from './ui/TabManager';
import { initMinigameSelector } from './ui/MinigameSelector';
import { initStatsPanel } from './ui/StatsPanel';
import { initPrestigePanel } from './ui/PrestigePanel';
import { initAutopilots } from './core/AutopilotManager';
import { initIncomeTracker } from './core/IncomeTracker';

function boot(): void {
  // Load save if exists
  const hadSave = hasSave();
  if (hadSave) {
    loadGame();
  }

  // Init all systems
  initAutoSave();
  initHUD();
  initNotifications();
  initTabManager();
  initShopPanel();
  initMinigameSelector();
  initStatsPanel();
  initPrestigePanel();
  initAutopilots();
  initIncomeTracker();

  // Force initial render
  forceUpdateHUD();

  // Calculate offline progress (after UI is ready)
  if (hadSave) {
    calculateOfflineProgress();
  }

  // Start the game loop
  startGameLoop();

  console.log('🎮 El Gran Incremental loaded!');
}

// Boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
