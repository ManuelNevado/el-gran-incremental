import { MinigameBase } from '../MinigameBase';

const TILE = 32;
const COLS = 15;
const VISIBLE_ROWS = 15;

type LaneType = 'grass' | 'road' | 'river';

interface Lane {
  type: LaneType;
  speed: number; // positive = right, negative = left
  objects: number[]; // x positions of cars/logs
  objectWidth: number;
  color: string;
}

export class CrossyRoad extends MinigameBase {
  readonly id = 'crossy';
  readonly name = 'Crossy Road';
  readonly icon = '🐔';
  readonly baseRewardPerPoint = 3;

  private playerCol = 7;
  private playerRow = 0;
  private maxRow = 0;
  private lanes: Lane[] = [];
  private cameraY = 0;
  private gameOver = false;
  private hopAnim = 0;
  private deathTimer = 0;

  init(): void {
    this.playerCol = Math.floor(COLS / 2);
    this.playerRow = 0;
    this.maxRow = 0;
    this.cameraY = 0;
    this.gameOver = false;
    this.hopAnim = 0;
    this.deathTimer = 0;

    // Generate initial lanes
    this.lanes = [];
    for (let i = -2; i < 50; i++) {
      this.lanes.push(this.generateLane(i));
    }

    this.addListener(document, 'keydown', (e: KeyboardEvent) => {
      if (this.gameOver) return;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          this.move(0, 1); e.preventDefault(); break;
        case 'ArrowDown': case 's': case 'S':
          this.move(0, -1); e.preventDefault(); break;
        case 'ArrowLeft': case 'a': case 'A':
          this.move(-1, 0); e.preventDefault(); break;
        case 'ArrowRight': case 'd': case 'D':
          this.move(1, 0); e.preventDefault(); break;
      }
    });
  }

  private move(dx: number, dy: number): void {
    const newCol = this.playerCol + dx;
    const newRow = this.playerRow + dy;

    if (newCol < 0 || newCol >= COLS) return;
    if (newRow < this.playerRow - 1) return; // Can only go back 1

    this.playerCol = newCol;
    this.playerRow = newRow;
    this.hopAnim = 1;

    if (newRow > this.maxRow) {
      this.maxRow = newRow;
      this.score = this.maxRow;
    }

    // Generate more lanes if needed
    while (this.lanes.length < this.playerRow + 30) {
      this.lanes.push(this.generateLane(this.lanes.length - 2));
    }
  }

  private generateLane(row: number): Lane {
    if (row <= 0) {
      return { type: 'grass', speed: 0, objects: [], objectWidth: 0, color: '#1a3a1a' };
    }

    const r = Math.random();
    const difficulty = Math.min(row / 30, 1);

    if (r < 0.3) {
      // Grass (safe)
      return { type: 'grass', speed: 0, objects: [], objectWidth: 0, color: row % 2 === 0 ? '#1a3a1a' : '#1d401d' };
    } else if (r < 0.75) {
      // Road
      const dir = Math.random() < 0.5 ? 1 : -1;
      const speed = dir * (60 + Math.random() * 80 + difficulty * 60);
      const cars: number[] = [];
      const numCars = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numCars; i++) {
        cars.push(Math.random() * COLS * TILE);
      }
      const carWidth = 30 + Math.random() * 20;
      return { type: 'road', speed, objects: cars, objectWidth: carWidth, color: '#1a1a2e' };
    } else {
      // River
      const dir = Math.random() < 0.5 ? 1 : -1;
      const speed = dir * (40 + Math.random() * 50);
      const logs: number[] = [];
      const numLogs = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numLogs; i++) {
        logs.push(Math.random() * COLS * TILE);
      }
      return { type: 'river', speed, objects: logs, objectWidth: 50 + Math.random() * 30, color: '#0d2847' };
    }
  }

  update(dt: number): void {
    if (this.gameOver) {
      this.deathTimer += dt;
      if (this.deathTimer > 1.5) {
        import('../MinigameManager').then(m => m.endMinigame());
      }
      return;
    }

    // Hop animation
    if (this.hopAnim > 0) {
      this.hopAnim = Math.max(0, this.hopAnim - dt * 8);
    }

    // Smooth camera
    const targetCameraY = this.playerRow * TILE - this.canvas.height / 2 + TILE * 3;
    this.cameraY += (targetCameraY - this.cameraY) * 5 * dt;

    // Move lane objects
    for (const lane of this.lanes) {
      for (let i = 0; i < lane.objects.length; i++) {
        lane.objects[i] += lane.speed * dt;
        // Wrap around
        if (lane.objects[i] > COLS * TILE + lane.objectWidth) {
          lane.objects[i] = -lane.objectWidth;
        }
        if (lane.objects[i] < -lane.objectWidth) {
          lane.objects[i] = COLS * TILE + lane.objectWidth;
        }
      }
    }

    // Check collisions with current lane
    const laneIdx = this.playerRow + 2; // offset because lanes start at -2
    if (laneIdx >= 0 && laneIdx < this.lanes.length) {
      const lane = this.lanes[laneIdx];
      const px = this.playerCol * TILE;

      if (lane.type === 'road') {
        // Check car collision
        for (const carX of lane.objects) {
          if (px + TILE > carX && px < carX + lane.objectWidth) {
            this.gameOver = true;
            return;
          }
        }
      } else if (lane.type === 'river') {
        // Must be on a log
        let onLog = false;
        for (const logX of lane.objects) {
          if (px + TILE > logX && px < logX + lane.objectWidth) {
            onLog = true;
            // Move with log
            this.playerCol += (lane.speed * dt) / TILE;
            this.playerCol = Math.round(this.playerCol * 10) / 10;
            break;
          }
        }
        if (!onLog) {
          this.gameOver = true;
          return;
        }
        // Fell off edge
        if (this.playerCol < 0 || this.playerCol >= COLS) {
          this.gameOver = true;
          return;
        }
      }
    }
  }

  render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    const offsetX = (w - COLS * TILE) / 2;

    // Draw lanes
    for (let screenRow = -2; screenRow < VISIBLE_ROWS + 3; screenRow++) {
      const worldRow = Math.floor(this.cameraY / TILE) + screenRow;
      const laneIdx = worldRow + 2;
      if (laneIdx < 0 || laneIdx >= this.lanes.length) continue;

      const lane = this.lanes[laneIdx];
      const y = h - (worldRow * TILE - this.cameraY) - TILE;

      // Lane background
      ctx.fillStyle = lane.color;
      ctx.fillRect(0, y, w, TILE + 1);

      if (lane.type === 'grass') {
        // Grass texture
        ctx.fillStyle = '#2a5a2a20';
        for (let gx = 0; gx < COLS; gx += 2) {
          ctx.fillRect(offsetX + gx * TILE + 5, y + 8, 3, 8);
          ctx.fillRect(offsetX + gx * TILE + 20, y + 4, 2, 6);
        }
      }

      if (lane.type === 'road') {
        // Road markings
        ctx.strokeStyle = '#ffffff15';
        ctx.lineWidth = 1;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(0, y + TILE / 2);
        ctx.lineTo(w, y + TILE / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cars
        for (const carX of lane.objects) {
          const cx = offsetX + carX;
          const color = lane.speed > 0 ? '#ef4444' : '#3b82f6';
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(cx, y + 4, lane.objectWidth, TILE - 8, 4);
          ctx.fill();
          // Windows
          ctx.fillStyle = '#ffffff40';
          ctx.fillRect(cx + 6, y + 8, 8, TILE - 16);
          ctx.fillRect(cx + lane.objectWidth - 14, y + 8, 8, TILE - 16);
          // Headlights
          ctx.fillStyle = '#fbbf24';
          if (lane.speed > 0) {
            ctx.fillRect(cx + lane.objectWidth - 3, y + 8, 3, 4);
            ctx.fillRect(cx + lane.objectWidth - 3, y + TILE - 12, 3, 4);
          } else {
            ctx.fillRect(cx, y + 8, 3, 4);
            ctx.fillRect(cx, y + TILE - 12, 3, 4);
          }
        }
      }

      if (lane.type === 'river') {
        // Water ripples
        ctx.strokeStyle = '#1e4070';
        ctx.lineWidth = 1;
        const rippleOffset = (Date.now() / 500) % 20;
        for (let rx = -10; rx < w; rx += 20) {
          ctx.beginPath();
          ctx.moveTo(rx + rippleOffset, y + TILE / 2);
          ctx.quadraticCurveTo(rx + 5 + rippleOffset, y + TILE / 2 - 3, rx + 10 + rippleOffset, y + TILE / 2);
          ctx.stroke();
        }

        // Logs
        for (const logX of lane.objects) {
          const lx = offsetX + logX;
          ctx.fillStyle = '#8B4513';
          ctx.beginPath();
          ctx.roundRect(lx, y + 4, lane.objectWidth, TILE - 8, 6);
          ctx.fill();
          ctx.fillStyle = '#6d3410';
          ctx.beginPath();
          ctx.roundRect(lx + 4, y + 8, lane.objectWidth - 8, TILE - 16, 3);
          ctx.fill();
          // Bark lines
          ctx.strokeStyle = '#5a2d0e';
          ctx.lineWidth = 1;
          for (let bx = lx + 10; bx < lx + lane.objectWidth - 5; bx += 12) {
            ctx.beginPath();
            ctx.moveTo(bx, y + 6);
            ctx.lineTo(bx, y + TILE - 6);
            ctx.stroke();
          }
        }
      }
    }

    // Player
    const py = h - (this.playerRow * TILE - this.cameraY) - TILE;
    const px = offsetX + this.playerCol * TILE;
    const hopY = this.hopAnim > 0 ? -Math.sin(this.hopAnim * Math.PI) * 8 : 0;

    if (!this.gameOver) {
      // Shadow
      ctx.fillStyle = '#00000030';
      ctx.beginPath();
      ctx.ellipse(px + TILE / 2, py + TILE - 2, TILE * 0.4, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chicken body
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.roundRect(px + 4, py + 4 + hopY, TILE - 8, TILE - 8, 6);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(px + TILE / 2 - 4, py + 10 + hopY, 2, 0, Math.PI * 2);
      ctx.arc(px + TILE / 2 + 4, py + 10 + hopY, 2, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(px + TILE / 2, py + 14 + hopY);
      ctx.lineTo(px + TILE / 2 - 3, py + 18 + hopY);
      ctx.lineTo(px + TILE / 2 + 3, py + 18 + hopY);
      ctx.closePath();
      ctx.fill();

      // Comb
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(px + TILE / 2 - 3, py + 4 + hopY, 3, 0, Math.PI * 2);
      ctx.arc(px + TILE / 2 + 3, py + 4 + hopY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(this.score.toString(), w / 2, 12);
    ctx.shadowBlur = 0;

    // Game over
    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 32px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Game Over', w / 2, h / 2 - 20);
      ctx.fillStyle = '#ffd700';
      ctx.font = '20px system-ui';
      ctx.fillText(`Distancia: ${this.score}`, w / 2, h / 2 + 20);
    }
  }
}
