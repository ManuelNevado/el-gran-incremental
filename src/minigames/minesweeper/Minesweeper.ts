import { MinigameBase } from '../MinigameBase';

const GRID_W = 9;
const GRID_H = 9;
const MINE_COUNT = 10;

type CellState = 'hidden' | 'revealed' | 'flagged';

interface Cell {
  mine: boolean;
  adjacent: number;
  state: CellState;
}

export class Minesweeper extends MinigameBase {
  readonly id = 'minesweeper';
  readonly name = 'Buscaminas';
  readonly icon = '💣';
  readonly baseRewardPerPoint = 3;

  private grid: Cell[][] = [];
  private cellSize = 0;
  private padding = 0;
  private gameOver = false;
  private won = false;
  private revealedCount = 0;
  private startTime = 0;
  private firstClick = true;

  init(): void {
    this.cellSize = Math.floor(Math.min(this.canvas.width, this.canvas.height) / (GRID_W + 1));
    this.padding = Math.floor((this.canvas.width - GRID_W * this.cellSize) / 2);
    this.gameOver = false;
    this.won = false;
    this.revealedCount = 0;
    this.firstClick = true;
    this.startTime = Date.now();

    this.initGrid();

    this.addListener(this.canvas, 'click', (e: MouseEvent) => {
      if (this.gameOver) return;
      const pos = this.getCellFromMouse(e);
      if (pos) this.revealCell(pos.x, pos.y);
    });

    this.addListener(this.canvas, 'contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      if (this.gameOver) return;
      const pos = this.getCellFromMouse(e);
      if (pos) this.toggleFlag(pos.x, pos.y);
    });
  }

  private initGrid(): void {
    this.grid = [];
    for (let y = 0; y < GRID_H; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_W; x++) {
        this.grid[y][x] = { mine: false, adjacent: 0, state: 'hidden' };
      }
    }
  }

  private placeMines(safeX: number, safeY: number): void {
    let placed = 0;
    while (placed < MINE_COUNT) {
      const x = Math.floor(Math.random() * GRID_W);
      const y = Math.floor(Math.random() * GRID_H);
      if (this.grid[y][x].mine) continue;
      if (Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1) continue;
      this.grid[y][x].mine = true;
      placed++;
    }

    // Calculate adjacency
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (this.grid[y][x].mine) continue;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < GRID_H && nx >= 0 && nx < GRID_W && this.grid[ny][nx].mine) {
              count++;
            }
          }
        }
        this.grid[y][x].adjacent = count;
      }
    }
  }

  private getCellFromMouse(e: MouseEvent): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const x = Math.floor((mx - this.padding) / this.cellSize);
    const y = Math.floor((my - this.padding) / this.cellSize);
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return null;
    return { x, y };
  }

  private revealCell(x: number, y: number): void {
    if (this.firstClick) {
      this.firstClick = false;
      this.placeMines(x, y);
    }

    const cell = this.grid[y][x];
    if (cell.state !== 'hidden') return;

    cell.state = 'revealed';
    this.revealedCount++;

    if (cell.mine) {
      this.gameOver = true;
      this.won = false;
      // Reveal all mines
      for (let gy = 0; gy < GRID_H; gy++) {
        for (let gx = 0; gx < GRID_W; gx++) {
          if (this.grid[gy][gx].mine) this.grid[gy][gx].state = 'revealed';
        }
      }
      this.score = Math.max(0, this.revealedCount - 1);
      setTimeout(() => {
        import('../MinigameManager').then(m => m.endMinigame());
      }, 1500);
      return;
    }

    // Flood fill for empty cells
    if (cell.adjacent === 0) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < GRID_H && nx >= 0 && nx < GRID_W) {
            this.revealCell(nx, ny);
          }
        }
      }
    }

    // Check win
    const totalSafe = GRID_W * GRID_H - MINE_COUNT;
    if (this.revealedCount >= totalSafe) {
      this.gameOver = true;
      this.won = true;
      const elapsed = (Date.now() - this.startTime) / 1000;
      const timeBonus = Math.max(0, Math.floor(50 - elapsed));
      this.score = this.revealedCount + timeBonus;
      setTimeout(() => {
        import('../MinigameManager').then(m => m.endMinigame());
      }, 2000);
    } else {
      this.score = this.revealedCount;
    }
  }

  private toggleFlag(x: number, y: number): void {
    const cell = this.grid[y][x];
    if (cell.state === 'hidden') cell.state = 'flagged';
    else if (cell.state === 'flagged') cell.state = 'hidden';
  }

  update(_dt: number): void {
    // Minesweeper is event-driven, no per-frame updates needed
  }

  render(): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const pad = this.padding;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    const NUMBER_COLORS: Record<number, string> = {
      1: '#3b82f6',
      2: '#22c55e',
      3: '#ef4444',
      4: '#7c3aed',
      5: '#dc2626',
      6: '#06b6d4',
      7: '#000',
      8: '#6b7280',
    };

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const cell = this.grid[y][x];
        const cx = pad + x * cs;
        const cy = pad + y * cs;

        if (cell.state === 'hidden' || cell.state === 'flagged') {
          // Hidden cell
          const grad = ctx.createLinearGradient(cx, cy, cx + cs, cy + cs);
          grad.addColorStop(0, '#2a3f6f');
          grad.addColorStop(1, '#1e2a4a');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(cx + 1, cy + 1, cs - 2, cs - 2, 3);
          ctx.fill();

          // Highlight edge
          ctx.strokeStyle = '#3a5090';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(cx + 1, cy + 1, cs - 2, cs - 2, 3);
          ctx.stroke();

          // Flag
          if (cell.state === 'flagged') {
            ctx.fillStyle = '#ef4444';
            ctx.font = `${cs * 0.5}px system-ui`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🚩', cx + cs / 2, cy + cs / 2);
          }
        } else {
          // Revealed cell
          ctx.fillStyle = cell.mine ? '#3c1414' : '#151525';
          ctx.beginPath();
          ctx.roundRect(cx + 1, cy + 1, cs - 2, cs - 2, 3);
          ctx.fill();

          if (cell.mine) {
            // Mine
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(cx + cs / 2, cy + cs / 2, cs * 0.25, 0, Math.PI * 2);
            ctx.fill();
            // Spikes
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
              ctx.beginPath();
              ctx.moveTo(
                cx + cs / 2 + Math.cos(angle) * cs * 0.15,
                cy + cs / 2 + Math.sin(angle) * cs * 0.15
              );
              ctx.lineTo(
                cx + cs / 2 + Math.cos(angle) * cs * 0.35,
                cy + cs / 2 + Math.sin(angle) * cs * 0.35
              );
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          } else if (cell.adjacent > 0) {
            ctx.fillStyle = NUMBER_COLORS[cell.adjacent] ?? '#fff';
            ctx.font = `bold ${cs * 0.55}px system-ui`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cell.adjacent.toString(), cx + cs / 2, cy + cs / 2 + 1);
          }
        }
      }
    }

    // Info
    ctx.fillStyle = '#fff';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const elapsed = this.gameOver ? '' : ` | ${Math.floor((Date.now() - this.startTime) / 1000)}s`;
    ctx.fillText(`Reveladas: ${this.revealedCount}${elapsed}`, pad, pad + GRID_H * cs + 10);

    // Win/lose
    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, w, h);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (this.won) {
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 32px system-ui';
        ctx.fillText('Victoria!', w / 2, h / 2 - 20);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 32px system-ui';
        ctx.fillText('Boom!', w / 2, h / 2 - 20);
      }

      ctx.fillStyle = '#ffd700';
      ctx.font = '20px system-ui';
      ctx.fillText(`Puntos: ${this.score}`, w / 2, h / 2 + 20);
    }
  }
}
