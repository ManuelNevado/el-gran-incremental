import { MinigameBase } from '../MinigameBase';

const ALIEN_COLS = 8;
const ALIEN_ROWS = 4;
const ALIEN_SIZE = 28;
const ALIEN_PADDING = 8;
const PLAYER_WIDTH = 36;
const PLAYER_HEIGHT = 20;
const BULLET_SPEED = 400;
const ALIEN_BULLET_SPEED = 200;

interface Alien {
  x: number;
  y: number;
  alive: boolean;
  type: number; // 0-2 for different sprites
}

interface Bullet {
  x: number;
  y: number;
  dy: number;
}

export class SpaceInvaders extends MinigameBase {
  readonly id = 'invaders';
  readonly name = 'Space Invaders';
  readonly icon = '👾';
  readonly baseRewardPerPoint = 4;

  private playerX = 0;
  private aliens: Alien[] = [];
  private playerBullets: Bullet[] = [];
  private alienBullets: Bullet[] = [];
  private alienDir = 1;
  private alienSpeed = 30;
  private alienMoveTimer = 0;
  private alienShootTimer = 0;
  private wave = 1;
  private gameOver = false;
  private alienFrame = 0;
  private frameTimer = 0;
  private keysDown = new Set<string>();

  init(): void {
    this.playerX = this.canvas.width / 2 - PLAYER_WIDTH / 2;
    this.playerBullets = [];
    this.alienBullets = [];
    this.alienDir = 1;
    this.alienSpeed = 30;
    this.alienMoveTimer = 0;
    this.alienShootTimer = 0;
    this.wave = 1;
    this.gameOver = false;
    this.alienFrame = 0;
    this.frameTimer = 0;
    this.keysDown.clear();

    this.spawnWave();

    this.addListener(document, 'keydown', (e: KeyboardEvent) => {
      this.keysDown.add(e.key);
      if (e.key === ' ') {
        this.shoot();
        e.preventDefault();
      }
    });

    this.addListener(document, 'keyup', (e: KeyboardEvent) => {
      this.keysDown.delete(e.key);
    });
  }

  private spawnWave(): void {
    this.aliens = [];
    const startX = (this.canvas.width - ALIEN_COLS * (ALIEN_SIZE + ALIEN_PADDING)) / 2;
    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        this.aliens.push({
          x: startX + col * (ALIEN_SIZE + ALIEN_PADDING),
          y: 40 + row * (ALIEN_SIZE + ALIEN_PADDING),
          alive: true,
          type: Math.min(row, 2),
        });
      }
    }
    this.alienDir = 1;
    this.alienSpeed = 30 + this.wave * 8;
    this.alienBullets = [];
  }

  private shoot(): void {
    if (this.gameOver) return;
    if (this.playerBullets.length >= 2) return; // Max 2 bullets
    this.playerBullets.push({
      x: this.playerX + PLAYER_WIDTH / 2,
      y: this.canvas.height - 40,
      dy: -BULLET_SPEED,
    });
  }

  update(dt: number): void {
    if (this.gameOver) return;

    // Player movement
    const moveSpeed = 250;
    if (this.keysDown.has('ArrowLeft') || this.keysDown.has('a') || this.keysDown.has('A')) {
      this.playerX -= moveSpeed * dt;
    }
    if (this.keysDown.has('ArrowRight') || this.keysDown.has('d') || this.keysDown.has('D')) {
      this.playerX += moveSpeed * dt;
    }
    this.playerX = Math.max(0, Math.min(this.canvas.width - PLAYER_WIDTH, this.playerX));

    // Animation
    this.frameTimer += dt;
    if (this.frameTimer > 0.5) {
      this.frameTimer = 0;
      this.alienFrame = (this.alienFrame + 1) % 2;
    }

    // Move aliens
    this.alienMoveTimer += dt;
    const moveInterval = Math.max(0.02, 0.5 - this.alienSpeed / 200);
    if (this.alienMoveTimer > moveInterval) {
      this.alienMoveTimer = 0;

      let hitEdge = false;
      for (const alien of this.aliens) {
        if (!alien.alive) continue;
        alien.x += this.alienDir * 8;
        if (alien.x < 10 || alien.x > this.canvas.width - ALIEN_SIZE - 10) {
          hitEdge = true;
        }
      }

      if (hitEdge) {
        this.alienDir *= -1;
        for (const alien of this.aliens) {
          if (alien.alive) alien.y += 12;
        }
      }
    }

    // Alien shooting
    this.alienShootTimer += dt;
    if (this.alienShootTimer > Math.max(0.5, 2 - this.wave * 0.2)) {
      this.alienShootTimer = 0;
      const alive = this.aliens.filter(a => a.alive);
      if (alive.length > 0) {
        const shooter = alive[Math.floor(Math.random() * alive.length)];
        this.alienBullets.push({
          x: shooter.x + ALIEN_SIZE / 2,
          y: shooter.y + ALIEN_SIZE,
          dy: ALIEN_BULLET_SPEED,
        });
      }
    }

    // Move bullets
    for (const b of this.playerBullets) b.y += b.dy * dt;
    for (const b of this.alienBullets) b.y += b.dy * dt;

    // Remove off-screen bullets
    this.playerBullets = this.playerBullets.filter(b => b.y > -10);
    this.alienBullets = this.alienBullets.filter(b => b.y < this.canvas.height + 10);

    // Player bullet -> alien collision
    for (const bullet of this.playerBullets) {
      for (const alien of this.aliens) {
        if (!alien.alive) continue;
        if (
          bullet.x > alien.x &&
          bullet.x < alien.x + ALIEN_SIZE &&
          bullet.y > alien.y &&
          bullet.y < alien.y + ALIEN_SIZE
        ) {
          alien.alive = false;
          bullet.y = -100; // Mark for removal
          this.score += (3 - alien.type) * 10; // Top rows worth more
          this.alienSpeed += 1;
          break;
        }
      }
    }
    this.playerBullets = this.playerBullets.filter(b => b.y > -10);

    // Alien bullet -> player collision
    for (const bullet of this.alienBullets) {
      if (
        bullet.x > this.playerX &&
        bullet.x < this.playerX + PLAYER_WIDTH &&
        bullet.y > this.canvas.height - 40 &&
        bullet.y < this.canvas.height - 40 + PLAYER_HEIGHT
      ) {
        this.die();
        return;
      }
    }

    // Aliens reached bottom
    for (const alien of this.aliens) {
      if (alien.alive && alien.y + ALIEN_SIZE > this.canvas.height - 50) {
        this.die();
        return;
      }
    }

    // Wave cleared
    if (this.aliens.every(a => !a.alive)) {
      this.wave++;
      this.score += this.wave * 20; // Wave bonus
      this.spawnWave();
    }
  }

  render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#05051a';
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = '#ffffff12';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 71 + 23) % w;
      const sy = (i * 43 + 7) % h;
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Aliens
    const COLORS = ['#ef4444', '#a855f7', '#22c55e'];
    for (const alien of this.aliens) {
      if (!alien.alive) continue;
      const color = COLORS[alien.type];

      // Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(alien.x + 2, alien.y + 4, ALIEN_SIZE - 4, ALIEN_SIZE - 8, 4);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(alien.x + ALIEN_SIZE * 0.3, alien.y + ALIEN_SIZE * 0.35, 4, 0, Math.PI * 2);
      ctx.arc(alien.x + ALIEN_SIZE * 0.7, alien.y + ALIEN_SIZE * 0.35, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(alien.x + ALIEN_SIZE * 0.3, alien.y + ALIEN_SIZE * 0.35, 2, 0, Math.PI * 2);
      ctx.arc(alien.x + ALIEN_SIZE * 0.7, alien.y + ALIEN_SIZE * 0.35, 2, 0, Math.PI * 2);
      ctx.fill();

      // Legs/tentacles (animated)
      ctx.fillStyle = color;
      const legOff = this.alienFrame === 0 ? 0 : 3;
      ctx.fillRect(alien.x + 4 + legOff, alien.y + ALIEN_SIZE - 6, 4, 6);
      ctx.fillRect(alien.x + ALIEN_SIZE - 8 - legOff, alien.y + ALIEN_SIZE - 6, 4, 6);
      if (alien.type > 0) {
        ctx.fillRect(alien.x + ALIEN_SIZE / 2 - 2, alien.y + ALIEN_SIZE - 4, 4, 4);
      }

      // Antenna for type 2
      if (alien.type === 2) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(alien.x + ALIEN_SIZE * 0.3, alien.y + 4);
        ctx.lineTo(alien.x + ALIEN_SIZE * 0.2, alien.y - 4);
        ctx.moveTo(alien.x + ALIEN_SIZE * 0.7, alien.y + 4);
        ctx.lineTo(alien.x + ALIEN_SIZE * 0.8, alien.y - 4);
        ctx.stroke();
      }
    }

    // Player ship
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(this.playerX + PLAYER_WIDTH / 2, h - 42);
    ctx.lineTo(this.playerX + PLAYER_WIDTH, h - 22);
    ctx.lineTo(this.playerX, h - 22);
    ctx.closePath();
    ctx.fill();

    // Ship body
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(this.playerX + 4, h - 28, PLAYER_WIDTH - 8, 8);

    // Cockpit
    ctx.fillStyle = '#93c5fd';
    ctx.beginPath();
    ctx.arc(this.playerX + PLAYER_WIDTH / 2, h - 34, 4, 0, Math.PI * 2);
    ctx.fill();

    // Player bullets
    ctx.fillStyle = '#fbbf24';
    for (const b of this.playerBullets) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 6;
      ctx.fillRect(b.x - 2, b.y, 4, 10);
    }
    ctx.shadowBlur = 0;

    // Alien bullets
    ctx.fillStyle = '#ef4444';
    for (const b of this.alienBullets) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 4;
      ctx.fillRect(b.x - 2, b.y, 4, 8);
    }
    ctx.shadowBlur = 0;

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Puntos: ${this.score}`, 10, 10);
    ctx.textAlign = 'right';
    ctx.fillText(`Oleada ${this.wave}`, w - 10, 10);

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
