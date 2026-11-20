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

export function exportToFile(): void {
  gameState.meta.lastSaved = Date.now();
  const json = JSON.stringify(gameState, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `el_gran_incremental_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  eventBus.emit('notification', { message: 'Partida exportada a archivo!', type: 'success' });
}

export function importFromFile(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Record<string, unknown>;
        const state = migrateState(parsed);
        setGameState(state);
        saveGame();
        eventBus.emit('save:loaded', undefined);
        eventBus.emit('notification', { message: 'Partida importada correctamente!', type: 'success' });
        // Reload to apply all state
        setTimeout(() => location.reload(), 500);
      } catch {
        eventBus.emit('notification', { message: 'Error: archivo de guardado invalido', type: 'info' });
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

export function loadFromJson(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const state = migrateState(parsed);
    setGameState(state);
    saveGame();
    eventBus.emit('save:loaded', undefined);
    return true;
  } catch {
    return false;
  }
}

export function initAutoSave(): void {
  eventBus.on('save:completed', () => {
    saveGame();
  });
}
