import { eventBus } from './EventBus';

interface SourceEntry {
  amount: number;
  timestamp: number;
}

const WINDOW_SECONDS = 30;
const SOURCE_LABELS: Record<string, string> = {
  'passive': 'Ingreso pasivo',
  'click': 'Clicks',
  'offline': 'Offline',
  'minigame:snake': 'Snake (manual)',
  'minigame:flappy': 'Flappy (manual)',
  'minigame:minesweeper': 'Buscaminas (manual)',
  'minigame:dino': 'Dino (manual)',
  'minigame:crossy': 'Crossy (manual)',
  'minigame:invaders': 'Invaders (manual)',
  'autopilot:snake': 'Bot Snake',
  'autopilot:flappy': 'Bot Flappy',
  'autopilot:minesweeper': 'Bot Buscaminas',
  'autopilot:dino': 'Bot Dino',
  'autopilot:crossy': 'Bot Crossy',
  'autopilot:invaders': 'Bot Invaders',
};

const SOURCE_COLORS: Record<string, string> = {
  'passive': '#3b82f6',
  'click': '#f97316',
  'offline': '#6b7280',
  'minigame:snake': '#22c55e',
  'minigame:flappy': '#eab308',
  'minigame:minesweeper': '#ef4444',
  'minigame:dino': '#a855f7',
  'minigame:crossy': '#14b8a6',
  'minigame:invaders': '#ec4899',
  'autopilot:snake': '#16a34a',
  'autopilot:flappy': '#ca8a04',
  'autopilot:minesweeper': '#dc2626',
  'autopilot:dino': '#7c3aed',
  'autopilot:crossy': '#0d9488',
  'autopilot:invaders': '#db2777',
};

// Rolling log of earnings per source
const earningsLog: Map<string, SourceEntry[]> = new Map();

// Computed rates (coins/sec over the window)
const rates: Map<string, number> = new Map();

export function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

export function getSourceColor(source: string): string {
  return SOURCE_COLORS[source] ?? '#888';
}

/** Returns map of source -> coins per second, only sources with > 0 rate */
export function getIncomeRates(): Map<string, number> {
  return rates;
}

/** Returns all rates sorted descending by value */
export function getSortedRates(): Array<{ source: string; rate: number }> {
  const result: Array<{ source: string; rate: number }> = [];
  for (const [source, rate] of rates) {
    if (rate > 0.001) {
      result.push({ source, rate });
    }
  }
  result.sort((a, b) => b.rate - a.rate);
  return result;
}

export function getTotalRate(): number {
  let total = 0;
  for (const rate of rates.values()) {
    total += rate;
  }
  return total;
}

function pruneOldEntries(now: number): void {
  const cutoff = now - WINDOW_SECONDS * 1000;
  for (const [source, entries] of earningsLog) {
    // Remove entries older than the window
    while (entries.length > 0 && entries[0].timestamp < cutoff) {
      entries.shift();
    }
    if (entries.length === 0) {
      earningsLog.delete(source);
      rates.delete(source);
    }
  }
}

function recalculateRates(): void {
  const now = Date.now();
  pruneOldEntries(now);

  for (const [source, entries] of earningsLog) {
    let total = 0;
    for (const entry of entries) {
      total += entry.amount;
    }
    rates.set(source, total / WINDOW_SECONDS);
  }
}

export function initIncomeTracker(): void {
  eventBus.on('currency:earned', ({ type, amount, source }) => {
    if (type !== 'coins') return;
    if (source === 'offline') return; // Don't count offline lump sums

    if (!earningsLog.has(source)) {
      earningsLog.set(source, []);
    }
    earningsLog.get(source)!.push({
      amount,
      timestamp: Date.now(),
    });
  });

  // Recalculate every second
  setInterval(recalculateRates, 1000);
}
