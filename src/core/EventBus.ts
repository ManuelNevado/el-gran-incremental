type Listener<T = unknown> = (data: T) => void;

export interface GameEvents {
  'currency:changed': { type: 'coins' | 'gems'; amount: number; total: number };
  'currency:earned': { type: 'coins' | 'gems'; amount: number; source: string };
  'currency:spent': { type: 'coins' | 'gems'; amount: number };
  'upgrade:purchased': { id: string; level: number };
  'upgrade:unlocked': { id: string };
  'minigame:started': { id: string };
  'minigame:ended': { id: string; score: number; reward: number };
  'prestige:triggered': { multiplier: number; gemsEarned: number };
  'passive:updated': { coinsPerSecond: number };
  'save:completed': undefined;
  'save:loaded': undefined;
  'offline:calculated': { seconds: number; earned: number };
  'tick': { dt: number; totalTime: number };
  'tab:changed': { tab: string };
  'notification': { message: string; type: 'success' | 'reward' | 'info' };
}

class EventBusImpl {
  private listeners = new Map<string, Set<Listener>>();

  on<K extends keyof GameEvents>(event: K, listener: Listener<GameEvents[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener);
    return () => set.delete(listener as Listener);
  }

  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        listener(data);
      }
    }
  }

  off<K extends keyof GameEvents>(event: K, listener: Listener<GameEvents[K]>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener as Listener);
    }
  }
}

export const eventBus = new EventBusImpl();
