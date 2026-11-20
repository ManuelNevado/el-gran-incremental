import { MinigameBase } from '../MinigameBase';

const GROUND_Y = 380;
const GRAVITY = 1800;
const JUMP_VELOCITY = -650;
const DUCK_GRAVITY = 6000;
const INITIAL_SPEED = 250;
const SPEED_INCREMENT = 0.3;

interface Obstacle {
  x: number;
  type: 'cactus_small' | 'cactus_tall' | 'bird';
  width: number;
  height: number;
  y: number;
}

export class DinoRunner extends MinigameBase {
  readonly id = 'dino';
  readonly name = 'Dino Runner';
  readonly icon = '🦕';
  readonly baseRewardPerPoint = 2;

  private dinoY = GROUND_Y;
  private dinoVel = 0;
  private isDucking = false;
  private isJumping = false;
  private obstacles: Obstacle[] = [];
  private speed = INITIAL_SPEED;
  private distance = 0;
  private spawnTimer = 0;
  private gameOver = false;
  private dinoFrame = 0;
  private frameTimer = 0;
  private groundOffset = 0;

  init(): void {
    this.dinoY = GROUND_Y;
    this.dinoVel = 0;
    this.isDucking = false;
    this.isJumping = false;
    this.obstacles = [];
    this.speed = INITIAL_SPEED;
    this.distance = 0;
    this.spawnTimer = 0;
    this.gameOver = false;
    this.dinoFrame = 0;
    this.frameTimer = 0;
    this.groundOffset = 0;

    this.addListener(document, 'keydown', (e: KeyboardEvent) => {
      if (this.gameOver) return;
      if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && !this.isJumping) {
        this.dinoVel = JUMP_VELOCITY;
        this.isJumping = true;
        this.isDucking = false;
        e.preventDefault();
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        if (!this.isDucking && this.isJumping) {
          this.dinoVel = Math.max(this.dinoVel, 400);
        }
        this.isDucking = true;
        e.preventDefault();
      }
    });

    this.addListener(document, 'keyup', (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.isDucking = false;
      }
    });

    this.addListener(this.canvas, 'click', () => {
      if (!this.gameOver && !this.isJumping) {
        this.dinoVel = JUMP_VELOCITY;
        this.isJumping = true;
      }
    });
  }

  update(dt: number): void {
    if (this.gameOver) return;

    // Speed increases over time
    this.speed += SPEED_INCREMENT * dt * 60;
    this.distance += this.speed * dt;
    this.score = Math.floor(this.distance / 50);

    // Ground scroll
    this.groundOffset = (this.groundOffset + this.speed * dt) % 20;

    // Dino physics
    const grav = this.isDucking && this.isJumping ? DUCK_GRAVITY : GRAVITY;
    this.dinoVel += grav * dt;
    this.dinoY += this.dinoVel * dt;

    if (this.dinoY >= GROUND_Y) {
      this.dinoY = GROUND_Y;
      this.dinoVel = 0;
      this.isJumping = false;
    }

    // Animation
    this.frameTimer += dt;
    if (this.frameTimer > 0.1) {
      this.frameTimer = 0;
      this.dinoFrame = (this.dinoFrame + 1) % 2;
    }

    // Spawn obstacles
    this.spawnTimer += dt;
    const minSpawn = Math.max(0.6, 1.5 - this.speed / 800);
    if (this.spawnTimer > minSpawn + Math.random() * 0.8) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }

    // Move obstacles
    for (const obs of this.obstacles) {
      obs.x -= this.speed * dt;
    }
    this.obstacles = this.obstacles.filter(o => o.x > -60);

    // Collision
    const dinoW = this.isDucking ? 40 : 30;
    const dinoH = this.isDucking ? 20 : 40;
    const dinoX = 60;
    const dinoTop = this.dinoY - dinoH;

    for (const obs of this.obstacles) {
      if (
        dinoX + dinoW > obs.x + 4 &&
        dinoX < obs.x + obs.width - 4 &&
        dinoTop + dinoH > obs.y &&
        dinoTop < obs.y + obs.height
      ) {
        this.die();
        return;
      }
    }
  }

  render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background gradient (night sky feel)
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0f0f1a');
    bg.addColorStop(0.7, '#1a1a2e');
    bg.addColorStop(1, '#16213e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = '#ffffff15';
    for (let i = 0; i < 20; i++) {
      const sx = (i * 83 + 17) % w;
      const sy = (i * 47 + 11) % (GROUND_Y - 100);
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Ground line
    ctx.strokeStyle = '#3a3a5e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 2);
    ctx.lineTo(w, GROUND_Y + 2);
    ctx.stroke();

    // Ground texture
    ctx.fillStyle = '#2a2a44';
    for (let x = -this.groundOffset; x < w; x += 20) {
      ctx.fillRect(x, GROUND_Y + 4, 8, 1);
      ctx.fillRect(x + 12, GROUND_Y + 8, 5, 1);
    }

    // Obstacles
    for (const obs of this.obstacles) {
      if (obs.type === 'bird') {
        // Pterodactyl
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.ellipse(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, obs.height / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        const wingY = Math.sin(Date.now() / 100) * 5;
        ctx.beginPath();
        ctx.moveTo(obs.x + 5, obs.y + obs.height / 2);
        ctx.lineTo(obs.x + obs.width / 2, obs.y + wingY);
        ctx.lineTo(obs.x + obs.width - 5, obs.y + obs.height / 2);
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(obs.x + obs.width - 8, obs.y + obs.height / 2 - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Cactus
        const cx = obs.x;
        const cy = obs.y;
        ctx.fillStyle = '#22c55e';
        // Main trunk
        ctx.beginPath();
        ctx.roundRect(cx + obs.width / 2 - 6, cy, 12, obs.height, 3);
        ctx.fill();
        if (obs.type === 'cactus_tall') {
          // Arms
          ctx.beginPath();
          ctx.roundRect(cx, cy + 10, 8, 20, 3);
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(cx, cy + 10, 20, 8, 3);
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(cx + obs.width - 8, cy + 20, 8, 15, 3);
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(cx + obs.width - 20, cy + 20, 20, 8, 3);
          ctx.fill();
        }
        // Darker shade
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.roundRect(cx + obs.width / 2 - 3, cy, 6, obs.height, 2);
        ctx.fill();
      }
    }

    // Dino
    const dinoX = 60;
    const dinoH = this.isDucking ? 20 : 40;
    const dinoW = this.isDucking ? 40 : 30;
    const dinoTop = this.dinoY - dinoH;

    ctx.fillStyle = '#6b7280';
    if (this.isDucking) {
      // Ducking dino (wider, shorter)
      ctx.beginPath();
      ctx.roundRect(dinoX, dinoTop, dinoW, dinoH, 4);
      ctx.fill();
      // Tail
      ctx.fillRect(dinoX - 8, dinoTop + 2, 10, 8);
    } else {
      // Standing dino
      // Body
      ctx.beginPath();
      ctx.roundRect(dinoX, dinoTop + 8, dinoW - 2, dinoH - 8, 4);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.roundRect(dinoX + 8, dinoTop, 22, 16, 4);
      ctx.fill();
      // Eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(dinoX + 22, dinoTop + 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(dinoX + 23, dinoTop + 6, 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Legs
      ctx.fillStyle = '#6b7280';
      const legOffset = this.dinoFrame === 0 ? 0 : 5;
      ctx.fillRect(dinoX + 6, this.dinoY - 2 - legOffset, 5, 10 + legOffset);
      ctx.fillRect(dinoX + 18, this.dinoY - 2 - (5 - legOffset), 5, 10 + (5 - legOffset));
      // Tail
      ctx.fillRect(dinoX - 6, dinoTop + 14, 10, 6);
    }

    // Score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(this.score.toString().padStart(5, '0'), w - 16, 16);

    // HI score marker every 100
    if (this.score > 0 && this.score % 100 === 0) {
      ctx.fillStyle = '#ffd70080';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.score}!`, w / 2, 16);
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
      ctx.fillText(`Distancia: ${this.score}`, w / 2, h / 2 + 20);
    }
  }

  private spawnObstacle(): void {
    const r = Math.random();
    if (r < 0.4) {
      this.obstacles.push({
        x: this.canvas.width,
        type: 'cactus_small',
        width: 20,
        height: 30,
        y: GROUND_Y - 30,
      });
    } else if (r < 0.75) {
      this.obstacles.push({
        x: this.canvas.width,
        type: 'cactus_tall',
        width: 30,
        height: 45,
        y: GROUND_Y - 45,
      });
    } else if (this.score > 50) {
      // Birds only after some distance
      const birdY = Math.random() < 0.5 ? GROUND_Y - 60 : GROUND_Y - 30;
      this.obstacles.push({
        x: this.canvas.width,
        type: 'bird',
        width: 30,
        height: 20,
        y: birdY,
      });
    } else {
      this.obstacles.push({
        x: this.canvas.width,
        type: 'cactus_small',
        width: 20,
        height: 30,
        y: GROUND_Y - 30,
      });
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
