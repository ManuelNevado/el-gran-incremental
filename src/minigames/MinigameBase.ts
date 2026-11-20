export abstract class MinigameBase {
  protected canvas!: HTMLCanvasElement;
  protected ctx!: CanvasRenderingContext2D;
  protected score = 0;
  protected isRunning = false;
  protected animFrameId = 0;
  private lastTime = 0;
  private boundListeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = [];

  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly icon: string;
  abstract readonly baseRewardPerPoint: number;

  abstract init(): void;
  abstract update(dt: number): void;
  abstract render(): void;

  start(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.score = 0;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.init();
    this.loop(performance.now());
  }

  stop(): number {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
    this.removeAllListeners();
    return this.score;
  }

  getScore(): number {
    return this.score;
  }

  protected addListener<K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    type: K,
    handler: (e: HTMLElementEventMap[K]) => void
  ): void {
    target.addEventListener(type, handler as EventListener);
    this.boundListeners.push({ target, type, handler: handler as EventListener });
  }

  private removeAllListeners(): void {
    for (const { target, type, handler } of this.boundListeners) {
      target.removeEventListener(type, handler);
    }
    this.boundListeners = [];
  }

  private loop(now: number): void {
    if (!this.isRunning) return;

    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame(t => this.loop(t));
  }
}
