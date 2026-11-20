import { MinigameBase } from '../MinigameBase';

const GRID_SIZE = 20;
const INITIAL_SPEED = 8; // moves per second
const SPEED_INCREMENT = 0.3;

interface Point {
  x: number;
  y: number;
}

export class SnakeGame extends MinigameBase {
  readonly id = 'snake';
  readonly name = 'Snake';
  readonly icon = '🐍';
  readonly baseRewardPerPoint = 5;

  private snake: Point[] = [];
  private direction: Point = { x: 1, y: 0 };
  private nextDirection: Point = { x: 1, y: 0 };
  private food: Point = { x: 0, y: 0 };
  private goldenFood: Point | null = null;
  private cellSize = 0;
  private moveTimer = 0;
  private speed = INITIAL_SPEED;
  private gameOver = false;
  private goldenTimer = 0;

  init(): void {
    this.cellSize = Math.floor(this.canvas.width / GRID_SIZE);
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.speed = INITIAL_SPEED;
    this.moveTimer = 0;
    this.gameOver = false;
    this.goldenFood = null;
    this.goldenTimer = 0;
    this.spawnFood();

    this.addListener(document, 'keydown', (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          if (this.direction.y !== 1) this.nextDirection = { x: 0, y: -1 };
          e.preventDefault();
          break;
        case 'ArrowDown': case 's': case 'S':
          if (this.direction.y !== -1) this.nextDirection = { x: 0, y: 1 };
          e.preventDefault();
          break;
        case 'ArrowLeft': case 'a': case 'A':
          if (this.direction.x !== 1) this.nextDirection = { x: -1, y: 0 };
          e.preventDefault();
          break;
        case 'ArrowRight': case 'd': case 'D':
          if (this.direction.x !== -1) this.nextDirection = { x: 1, y: 0 };
          e.preventDefault();
          break;
      }
    });
  }

  update(dt: number): void {
    if (this.gameOver) return;

    this.moveTimer += dt;
    this.goldenTimer += dt;

    // Spawn golden food periodically
    if (!this.goldenFood && this.goldenTimer > 10 && Math.random() < 0.02) {
      this.spawnGoldenFood();
      this.goldenTimer = 0;
    }

    // Despawn golden food after 5 seconds
    if (this.goldenFood && this.goldenTimer > 5) {
      this.goldenFood = null;
    }

    const moveInterval = 1 / this.speed;
    if (this.moveTimer < moveInterval) return;
    this.moveTimer -= moveInterval;

    this.direction = this.nextDirection;
    const head = this.snake[0];
    const newHead: Point = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y,
    };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      this.gameOver = true;
      this.isRunning = false;
      // Auto-end after showing game over
      setTimeout(() => {
        import('../MinigameManager').then(m => m.endMinigame());
      }, 1500);
      return;
    }

    // Self collision
    if (this.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
      this.gameOver = true;
      this.isRunning = false;
      setTimeout(() => {
        import('../MinigameManager').then(m => m.endMinigame());
      }, 1500);
      return;
    }

    this.snake.unshift(newHead);

    // Check food
    let ate = false;
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score += 1;
      this.speed += SPEED_INCREMENT;
      this.spawnFood();
      ate = true;
    }

    if (this.goldenFood && newHead.x === this.goldenFood.x && newHead.y === this.goldenFood.y) {
      this.score += 5;
      this.goldenFood = null;
      ate = true;
    }

    if (!ate) {
      this.snake.pop();
    }
  }

  render(): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines (subtle)
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cs, 0);
      ctx.lineTo(i * cs, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cs);
      ctx.lineTo(w, i * cs);
      ctx.stroke();
    }

    // Snake
    for (let i = 0; i < this.snake.length; i++) {
      const seg = this.snake[i];
      const t = i / this.snake.length;
      const r = Math.floor(34 + (1 - t) * 100);
      const g = Math.floor(197 + (1 - t) * 50);
      const b = Math.floor(94 - t * 60);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      const pad = i === 0 ? 1 : 2;
      ctx.beginPath();
      ctx.roundRect(seg.x * cs + pad, seg.y * cs + pad, cs - pad * 2, cs - pad * 2, 4);
      ctx.fill();

      // Eyes on head
      if (i === 0) {
        ctx.fillStyle = '#fff';
        const eyeSize = cs * 0.15;
        const ex1 = seg.x * cs + cs * 0.3;
        const ey1 = seg.y * cs + cs * 0.3;
        const ex2 = seg.x * cs + cs * 0.7;
        const ey2 = seg.y * cs + cs * 0.3;
        ctx.beginPath();
        ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2);
        ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(ex1 + this.direction.x * 2, ey1 + this.direction.y * 2, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.arc(ex2 + this.direction.x * 2, ey2 + this.direction.y * 2, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Food
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(
      this.food.x * cs + cs / 2,
      this.food.y * cs + cs / 2,
      cs * 0.35,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Food glow
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Golden food
    if (this.goldenFood) {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(
        this.goldenFood.x * cs + cs / 2,
        this.goldenFood.y * cs + cs / 2,
        cs * 0.4,
        0,
        Math.PI * 2
      );
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Star shape overlay
      ctx.fillStyle = '#fff8';
      ctx.font = `${cs * 0.5}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', this.goldenFood.x * cs + cs / 2, this.goldenFood.y * cs + cs / 2);
    }

    // Score on canvas
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Puntos: ${this.score}`, 8, 8);

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
      ctx.fillText(`Puntos: ${this.score}`, w / 2, h / 2 + 20);
    }
  }

  private spawnFood(): void {
    let pos: Point;
    do {
      pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (this.snake.some(s => s.x === pos.x && s.y === pos.y));
    this.food = pos;
  }

  private spawnGoldenFood(): void {
    let pos: Point;
    do {
      pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (
      this.snake.some(s => s.x === pos.x && s.y === pos.y) ||
      (pos.x === this.food.x && pos.y === this.food.y)
    );
    this.goldenFood = pos;
    this.goldenTimer = 0;
  }
}
