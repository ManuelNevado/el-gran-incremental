import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { gameState, setGameState, migrateState, createDefaultState } from './GameState';
import { eventBus } from './EventBus';

const SAVE_KEY = 'el_gran_incremental_save';

export function saveGame(): void {
  gameState.meta.lastSaved = Date.now();
  const json = JSON.stringify(gameState);
  const compressed = compressToUTF16(json);
  localStorage.setItem(SAVE_KEY, compressed);
}

export function loadGame(): boolean {
  const compressed = localStorage.getItem(SAVE_KEY);
  if (!compressed) return false;

  try {
    const json = decompressFromUTF16(compressed);
    if (!json) return false;
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const state = migrateState(parsed);
    setGameState(state);
    eventBus.emit('save:loaded', undefined);
    return true;
  } catch {
    console.warn('Failed to load save, starting fresh');
    return false;
  }
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
  setGameState(createDefaultState());
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function initAutoSave(): void {
  eventBus.on('save:completed', () => {
    saveGame();
  });
}
