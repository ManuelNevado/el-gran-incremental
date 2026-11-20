import { MinigameBase } from '../MinigameBase';

const GRAVITY = 800;
const JUMP_VELOCITY = -300;
const PIPE_SPEED = 150;
const PIPE_GAP = 130;
const PIPE_WIDTH = 50;
const PIPE_SPACING = 200;
const BIRD_SIZE = 20;

interface Pipe {
  x: number;
  gapY: number;
  scored: boolean;
}

export class FlappyBird extends MinigameBase {
  readonly id = 'flappy';
  readonly name = 'Flappy Bird';
  readonly icon = '🐦';
  readonly baseRewardPerPoint = 10;

  private birdY = 0;
  private birdVelocity = 0;
  private pipes: Pipe[] = [];
  private pipeTimer = 0;
  private gameOver = false;
  private started = false;
  private birdAngle = 0;
  private wingFrame = 0;
  private wingTimer = 0;

  init(): void {
    this.birdY = this.canvas.height / 2;
    this.birdVelocity = 0;
    this.pipes = [];
    this.pipeTimer = 0;
    this.gameOver = false;
    this.started = false;
    this.birdAngle = 0;
    this.wingFrame = 0;
    this.wingTimer = 0;

    const jump = (e: Event) => {
      e.preventDefault();
      if (this.gameOver) return;
      if (!this.started) this.started = true;
      this.birdVelocity = JUMP_VELOCITY;
    };

    this.addListener(document, 'keydown', (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') jump(e);
    });
    this.addListener(this.canvas, 'click', jump);
    this.addListener(this.canvas, 'touchstart', jump);
  }

  update(dt: number): void {
    if (this.gameOver || !this.started) return;

    // Bird physics
    this.birdVelocity += GRAVITY * dt;
    this.birdY += this.birdVelocity * dt;
    this.birdAngle = Math.min(Math.max(this.birdVelocity / 400, -0.5), 1.0);

    // Wing animation
    this.wingTimer += dt;
    if (this.wingTimer > 0.1) {
      this.wingTimer = 0;
      this.wingFrame = (this.wingFrame + 1) % 3;
    }

    // Floor/ceiling
    if (this.birdY < 0 || this.birdY > this.canvas.height - BIRD_SIZE) {
      this.die();
      return;
    }

    // Spawn pipes
    this.pipeTimer += PIPE_SPEED * dt;
    if (this.pipeTimer > PIPE_SPACING) {
      this.pipeTimer = 0;
      const minGapY = 80;
      const maxGapY = this.canvas.height - 80;
      const gapY = minGapY + Math.random() * (maxGapY - minGapY);
      this.pipes.push({ x: this.canvas.width, gapY, scored: false });
    }

    // Move pipes
    for (const pipe of this.pipes) {
      pipe.x -= PIPE_SPEED * dt;

      // Score
      if (!pipe.scored && pipe.x + PIPE_WIDTH < this.canvas.width / 4) {
        pipe.scored = true;
        this.score++;
      }

      // Collision
      const birdLeft = this.canvas.width / 4 - BIRD_SIZE / 2;
      const birdRight = birdLeft + BIRD_SIZE;
      const birdTop = this.birdY;
      const birdBottom = this.birdY + BIRD_SIZE;

      if (birdRight > pipe.x && birdLeft < pipe.x + PIPE_WIDTH) {
        if (birdTop < pipe.gapY - PIPE_GAP / 2 || birdBottom > pipe.gapY + PIPE_GAP / 2) {
          this.die();
          return;
        }
      }
    }

    // Remove off-screen pipes
    this.pipes = this.pipes.filter(p => p.x > -PIPE_WIDTH);
  }

  render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#1a1a3e');
    sky.addColorStop(1, '#0a0a2a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = '#ffffff30';
    for (let i = 0; i < 30; i++) {
      const sx = (i * 97 + 13) % w;
      const sy = (i * 61 + 7) % (h * 0.6);
      ctx.fillRect(sx, sy, 2, 2);
    }

    // Pipes
    for (const pipe of this.pipes) {
      const topHeight = pipe.gapY - PIPE_GAP / 2;
      const bottomY = pipe.gapY + PIPE_GAP / 2;

      // Top pipe
      const topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      topGrad.addColorStop(0, '#16a34a');
      topGrad.addColorStop(0.5, '#22c55e');
      topGrad.addColorStop(1, '#16a34a');
      ctx.fillStyle = topGrad;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topHeight);

      // Top pipe cap
      ctx.fillStyle = '#15803d';
      ctx.fillRect(pipe.x - 4, topHeight - 20, PIPE_WIDTH + 8, 20);

      // Bottom pipe
      ctx.fillStyle = topGrad;
      ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, h - bottomY);

      // Bottom pipe cap
      ctx.fillStyle = '#15803d';
      ctx.fillRect(pipe.x - 4, bottomY, PIPE_WIDTH + 8, 20);
    }

    // Bird
    const birdX = w / 4;
    const birdY = this.started ? this.birdY : h / 2 + Math.sin(Date.now() / 300) * 10;

    ctx.save();
    ctx.translate(birdX, birdY + BIRD_SIZE / 2);
    ctx.rotate(this.birdAngle);

    // Body
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_SIZE * 0.6, BIRD_SIZE * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.fillStyle = '#f59e0b';
    const wingY = [-3, -1, -4][this.wingFrame];
    ctx.beginPath();
    ctx.ellipse(-2, wingY, BIRD_SIZE * 0.35, BIRD_SIZE * 0.25, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(BIRD_SIZE * 0.25, -BIRD_SIZE * 0.15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(BIRD_SIZE * 0.3, -BIRD_SIZE * 0.15, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(BIRD_SIZE * 0.5, -2);
    ctx.lineTo(BIRD_SIZE * 0.8, 2);
    ctx.lineTo(BIRD_SIZE * 0.5, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(this.score.toString(), w / 2, 20);
    ctx.shadowBlur = 0;

    // Start text
    if (!this.started) {
      ctx.fillStyle = '#ffffffcc';
      ctx.font = '18px system-ui';
      ctx.fillText('Click o Espacio para volar', w / 2, h / 2 + 50);
    }

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

  private die(): void {
    this.gameOver = true;
    this.isRunning = false;
    setTimeout(() => {
      import('../MinigameManager').then(m => m.endMinigame());
    }, 1500);
  }
}
