import { gameState } from './GameState';
import { eventBus } from './EventBus';
import { addCoins, getCoinsPerSecond } from './CurrencyManager';

let lastTime = 0;
let totalTime = 0;
let running = false;
let saveTimer = 0;
const SAVE_INTERVAL = 30; // seconds

export function startGameLoop(): void {
  if (running) return;
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(tick);
}

export function stopGameLoop(): void {
  running = false;
}

function tick(now: number): void {
  if (!running) return;

  const dt = Math.min((now - lastTime) / 1000, 0.1); // cap at 100ms to avoid spiral
  lastTime = now;
  totalTime += dt;

  // Passive income
  const cps = getCoinsPerSecond();
  if (cps > 0) {
    addCoins(cps * dt, 'passive');
  }

  // Track play time
  gameState.stats.totalTimePlayed += dt;
  gameState.meta.lastPlayed = Date.now();

  // Auto-save
  saveTimer += dt;
  if (saveTimer >= SAVE_INTERVAL) {
    saveTimer = 0;
    eventBus.emit('save:completed', undefined);
  }

  // Emit tick for other systems
  eventBus.emit('tick', { dt, totalTime });

  requestAnimationFrame(tick);
}
