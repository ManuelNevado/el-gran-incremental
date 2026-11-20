import { eventBus } from '../core/EventBus';
import {
  getAllAutopilotConfigs,
  getAutopilotState,
  isAutopilotUnlocked,
  getAutopilotProgress,
  getLastRun,
  getAutopilotConfig,
} from '../core/AutopilotManager';
import { formatNumber } from '../utils/numbers';

const SIZE = 120;
let animFrame = 0;
let isVisible = false;

// Simulated visual state per game
interface SnakeVisual { segments: Array<{x: number; y: number}>; dir: {x: number; y: number}; food: {x: number; y: number}; timer: number }
interface FlappyVisual { birdY: number; birdVel: number; pipes: Array<{x: number; gapY: number}>; timer: number }
interface MineVisual { revealed: boolean[][]; timer: number; nextReveal: number }
interface DinoVisual { y: number; vel: number; obstacles: Array<{x: number; h: number}>; timer: number; groundOff: number }
interface CrossyVisual { row: number; col: number; cars: Array<{x: number; row: number; speed: number}>; timer: number }
interface InvadersVisual { playerX: number; aliens: Array<{x: number; y: number; alive: boolean}>; bullets: Array<{x: number; y: number}>; timer: number; dir: number }

const snakeVis: SnakeVisual = { segments: [], dir: {x:1,y:0}, food: {x:0,y:0}, timer: 0 };
const flappyVis: FlappyVisual = { birdY: 60, birdVel: 0, pipes: [], timer: 0 };
const mineVis: MineVisual = { revealed: [], timer: 0, nextReveal: 0 };
const dinoVis: DinoVisual = { y: 0, vel: 0, obstacles: [], timer: 0, groundOff: 0 };
const crossyVis: CrossyVisual = { row: 0, col: 6, cars: [], timer: 0 };
const invadersVis: InvadersVisual = { playerX: SIZE / 2, aliens: [], bullets: [], timer: 0, dir: 1 };
let visualsInited = false;

function initVisuals(): void {
  if (visualsInited) return;
  visualsInited = true;

  // Snake
  snakeVis.segments = [{x:5,y:5},{x:4,y:5},{x:3,y:5}];
  snakeVis.food = {x: Math.floor(Math.random()*12), y: Math.floor(Math.random()*12)};

  // Flappy
  flappyVis.pipes = [{x: 100, gapY: 50}, {x: 180, gapY: 70}];

  // Minesweeper
  mineVis.revealed = Array.from({length: 9}, () => Array.from({length: 9}, () => false));

  // Dino
  dinoVis.y = 0;
  dinoVis.vel = 0;
  dinoVis.obstacles = [{x: SIZE + 20, h: 15}, {x: SIZE + 80, h: 22}];
  dinoVis.groundOff = 0;

  // Crossy
  crossyVis.row = 0;
  crossyVis.col = 6;
  crossyVis.cars = [
    {x: 20, row: 2, speed: 40}, {x: 80, row: 2, speed: 40},
    {x: 50, row: 4, speed: -35}, {x: 110, row: 4, speed: -35},
    {x: 10, row: 6, speed: 50}, {x: 70, row: 6, speed: 50},
  ];

  // Invaders
  invadersVis.playerX = SIZE / 2;
  invadersVis.aliens = [];
  invadersVis.bullets = [];
  invadersVis.dir = 1;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      invadersVis.aliens.push({ x: 15 + c * 16, y: 8 + r * 14, alive: true });
    }
  }
}

export function initAutopilotVisuals(): void {
  eventBus.on('tab:changed', ({ tab }) => {
    isVisible = tab === 'minigames';
    if (isVisible) startLoop();
    else stopLoop();
  });
}

function startLoop(): void {
  stopLoop();
  initVisuals();
  function loop() {
    if (!isVisible) return;
    updateVisuals();
    renderVisuals();
    animFrame = requestAnimationFrame(loop);
  }
  animFrame = requestAnimationFrame(loop);
}

function stopLoop(): void {
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = 0;
  }
}

function updateVisuals(): void {
  const dt = 1 / 60;

  // Snake AI visual
  if (isAutopilotUnlocked('snake') && getAutopilotState('snake').enabled) {
    snakeVis.timer += dt;
    if (snakeVis.timer > 0.15) {
      snakeVis.timer = 0;
      const head = snakeVis.segments[0];
      // Simple AI: move toward food
      let dx = 0, dy = 0;
      if (Math.random() < 0.8) {
        // Smart move
        if (snakeVis.food.x > head.x) dx = 1;
        else if (snakeVis.food.x < head.x) dx = -1;
        else if (snakeVis.food.y > head.y) dy = 1;
        else dy = -1;
      } else {
        // Random move (simulates mistakes)
        const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        const d = dirs[Math.floor(Math.random() * 4)];
        dx = d.x; dy = d.y;
      }
      const nx = ((head.x + dx) % 12 + 12) % 12;
      const ny = ((head.y + dy) % 12 + 12) % 12;
      snakeVis.segments.unshift({x: nx, y: ny});
      if (nx === snakeVis.food.x && ny === snakeVis.food.y) {
        snakeVis.food = {x: Math.floor(Math.random()*12), y: Math.floor(Math.random()*12)};
      } else {
        snakeVis.segments.pop();
      }
      if (snakeVis.segments.length > 15) snakeVis.segments.pop();
    }
  }

  // Flappy AI visual
  if (isAutopilotUnlocked('flappy') && getAutopilotState('flappy').enabled) {
    flappyVis.timer += dt;
    flappyVis.birdVel += 300 * dt;
    flappyVis.birdY += flappyVis.birdVel * dt;

    // AI jumps when bird is below pipe gap
    for (const pipe of flappyVis.pipes) {
      if (pipe.x > 15 && pipe.x < 40 && flappyVis.birdY > pipe.gapY - 5) {
        flappyVis.birdVel = -120;
      }
    }

    // Keep in bounds
    if (flappyVis.birdY > SIZE - 10) { flappyVis.birdY = SIZE - 10; flappyVis.birdVel = -100; }
    if (flappyVis.birdY < 5) { flappyVis.birdY = 5; flappyVis.birdVel = 0; }

    // Move pipes
    for (const pipe of flappyVis.pipes) {
      pipe.x -= 50 * dt;
      if (pipe.x < -10) {
        pipe.x = SIZE + 20;
        pipe.gapY = 30 + Math.random() * (SIZE - 60);
      }
    }
  }

  // Minesweeper AI visual
  if (isAutopilotUnlocked('minesweeper') && getAutopilotState('minesweeper').enabled) {
    mineVis.timer += dt;
    if (mineVis.timer > mineVis.nextReveal) {
      mineVis.timer = 0;
      mineVis.nextReveal = 0.3 + Math.random() * 0.5;
      const hidden: Array<{x: number; y: number}> = [];
      for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 9; x++) {
          if (!mineVis.revealed[y][x]) hidden.push({x, y});
        }
      }
      if (hidden.length > 0) {
        const cell = hidden[Math.floor(Math.random() * hidden.length)];
        mineVis.revealed[cell.y][cell.x] = true;
      }
      if (hidden.length <= 1) {
        mineVis.revealed = Array.from({length: 9}, () => Array.from({length: 9}, () => false));
      }
    }
  }

  // Dino AI visual
  if (isAutopilotUnlocked('dino') && getAutopilotState('dino').enabled) {
    dinoVis.groundOff = (dinoVis.groundOff + 80 * dt) % 10;

    // Gravity
    dinoVis.vel += 500 * dt;
    dinoVis.y += dinoVis.vel * dt;
    if (dinoVis.y >= 0) { dinoVis.y = 0; dinoVis.vel = 0; }

    // Move obstacles
    for (const obs of dinoVis.obstacles) {
      obs.x -= 80 * dt;
      if (obs.x < -10) {
        obs.x = SIZE + 20 + Math.random() * 40;
        obs.h = 12 + Math.random() * 12;
      }
    }

    // AI: jump when obstacle is close
    for (const obs of dinoVis.obstacles) {
      if (obs.x > 10 && obs.x < 35 && dinoVis.y >= 0) {
        dinoVis.vel = -200;
      }
    }
  }

  // Crossy AI visual
  if (isAutopilotUnlocked('crossy') && getAutopilotState('crossy').enabled) {
    // Move cars
    for (const car of crossyVis.cars) {
      car.x += car.speed * dt;
      if (car.x > SIZE + 10) car.x = -20;
      if (car.x < -20) car.x = SIZE + 10;
    }

    // AI: hop forward periodically
    crossyVis.timer += dt;
    if (crossyVis.timer > 0.4) {
      crossyVis.timer = 0;
      // Check if safe to move forward
      const nextRow = crossyVis.row + 1;
      let safe = true;
      for (const car of crossyVis.cars) {
        if (car.row === nextRow) {
          const px = crossyVis.col * 10;
          if (Math.abs(car.x - px) < 18) safe = false;
        }
      }
      if (safe && Math.random() < 0.7) {
        crossyVis.row++;
        if (crossyVis.row > 8) { crossyVis.row = 0; crossyVis.col = 6; }
      } else if (Math.random() < 0.3) {
        // Dodge sideways
        crossyVis.col += Math.random() < 0.5 ? 1 : -1;
        crossyVis.col = Math.max(1, Math.min(11, crossyVis.col));
      }
    }
  }

  // Invaders AI visual
  if (isAutopilotUnlocked('invaders') && getAutopilotState('invaders').enabled) {
    invadersVis.timer += dt;

    // Move aliens
    let hitEdge = false;
    for (const a of invadersVis.aliens) {
      if (!a.alive) continue;
      a.x += invadersVis.dir * 15 * dt;
      if (a.x < 5 || a.x > SIZE - 15) hitEdge = true;
    }
    if (hitEdge) {
      invadersVis.dir *= -1;
      for (const a of invadersVis.aliens) { if (a.alive) a.y += 3; }
    }

    // AI: move toward nearest alive alien
    const alive = invadersVis.aliens.filter(a => a.alive);
    if (alive.length > 0) {
      let nearest = alive[0];
      for (const a of alive) {
        if (Math.abs(a.x - invadersVis.playerX) < Math.abs(nearest.x - invadersVis.playerX)) {
          nearest = a;
        }
      }
      if (invadersVis.playerX < nearest.x - 2) invadersVis.playerX += 60 * dt;
      else if (invadersVis.playerX > nearest.x + 2) invadersVis.playerX -= 60 * dt;
    }

    // Shoot periodically
    if (invadersVis.timer > 0.4) {
      invadersVis.timer = 0;
      invadersVis.bullets.push({ x: invadersVis.playerX, y: SIZE - 15 });
    }

    // Move bullets
    for (const b of invadersVis.bullets) b.y -= 120 * dt;
    invadersVis.bullets = invadersVis.bullets.filter(b => b.y > -5);

    // Hit detection
    for (const b of invadersVis.bullets) {
      for (const a of invadersVis.aliens) {
        if (!a.alive) continue;
        if (Math.abs(b.x - a.x - 5) < 8 && Math.abs(b.y - a.y - 5) < 8) {
          a.alive = false;
          b.y = -100;
          break;
        }
      }
    }

    // Reset wave when all dead
    if (alive.length <= 1) {
      invadersVis.aliens = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 6; c++) {
          invadersVis.aliens.push({ x: 15 + c * 16, y: 8 + r * 14, alive: true });
        }
      }
    }
  }
}

function renderVisuals(): void {
  const configs = getAllAutopilotConfigs();

  for (const config of configs) {
    if (!isAutopilotUnlocked(config.gameId)) continue;
    const state = getAutopilotState(config.gameId);
    if (!state.enabled) continue;

    const canvas = document.getElementById(`ap-vis-${config.gameId}`) as HTMLCanvasElement | null;
    if (!canvas) continue;
    const ctx = canvas.getContext('2d')!;

    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Render game-specific visual
    switch (config.gameId) {
      case 'snake': renderSnakeVisual(ctx); break;
      case 'flappy': renderFlappyVisual(ctx); break;
      case 'minesweeper': renderMineVisual(ctx); break;
      case 'dino': renderDinoVisual(ctx); break;
      case 'crossy': renderCrossyVisual(ctx); break;
      case 'invaders': renderInvadersVisual(ctx); break;
    }

    // Progress bar at bottom
    const progress = getAutopilotProgress(config.gameId);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, SIZE - 4, SIZE, 4);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, SIZE - 4, SIZE * progress, 4);

    // Last result overlay
    const lastRun = getLastRun(config.gameId);
    if (lastRun && Date.now() - lastRun.timestamp < 2000) {
      const alpha = 1 - (Date.now() - lastRun.timestamp) / 2000;
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.9})`;
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`+${formatNumber(lastRun.reward)}`, SIZE / 2, SIZE / 2);
    }
  }
}

function renderSnakeVisual(ctx: CanvasRenderingContext2D): void {
  const cs = SIZE / 12;
  // Grid
  ctx.strokeStyle = '#111125';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 12; i++) {
    ctx.beginPath(); ctx.moveTo(i * cs, 0); ctx.lineTo(i * cs, SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * cs); ctx.lineTo(SIZE, i * cs); ctx.stroke();
  }
  // Snake
  for (let i = 0; i < snakeVis.segments.length; i++) {
    const s = snakeVis.segments[i];
    const t = i / snakeVis.segments.length;
    ctx.fillStyle = `rgb(${34 + (1-t)*80}, ${197 + (1-t)*40}, ${94 - t*50})`;
    ctx.fillRect(s.x * cs + 1, s.y * cs + 1, cs - 2, cs - 2);
  }
  // Food
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(snakeVis.food.x * cs + cs/2, snakeVis.food.y * cs + cs/2, cs * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function renderFlappyVisual(ctx: CanvasRenderingContext2D): void {
  // Sky
  ctx.fillStyle = '#0d0d2a';
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Stars
  ctx.fillStyle = '#ffffff20';
  for (let i = 0; i < 10; i++) {
    ctx.fillRect((i * 37 + 5) % SIZE, (i * 23 + 3) % (SIZE * 0.5), 1, 1);
  }
  // Pipes
  for (const pipe of flappyVis.pipes) {
    const gap = 35;
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(pipe.x, 0, 12, pipe.gapY - gap / 2);
    ctx.fillRect(pipe.x, pipe.gapY + gap / 2, 12, SIZE - pipe.gapY - gap / 2);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(pipe.x - 2, pipe.gapY - gap / 2 - 5, 16, 5);
    ctx.fillRect(pipe.x - 2, pipe.gapY + gap / 2, 16, 5);
  }
  // Bird
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.ellipse(25, flappyVis.birdY, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(28, flappyVis.birdY - 2, 2, 0, Math.PI * 2);
  ctx.fill();
}

function renderMineVisual(ctx: CanvasRenderingContext2D): void {
  const cs = SIZE / 9;
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const revealed = mineVis.revealed[y][x];
      if (revealed) {
        ctx.fillStyle = '#151525';
        ctx.fillRect(x * cs + 0.5, y * cs + 0.5, cs - 1, cs - 1);
        // Random number
        const num = ((x * 7 + y * 3) % 3) + 1;
        const colors = ['#3b82f6', '#22c55e', '#ef4444'];
        ctx.fillStyle = colors[num - 1];
        ctx.font = `bold ${cs * 0.5}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num.toString(), x * cs + cs / 2, y * cs + cs / 2);
      } else {
        ctx.fillStyle = '#1e2a4a';
        ctx.fillRect(x * cs + 0.5, y * cs + 0.5, cs - 1, cs - 1);
        ctx.strokeStyle = '#2a3f6f';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x * cs + 0.5, y * cs + 0.5, cs - 1, cs - 1);
      }
    }
  }
}

function renderDinoVisual(ctx: CanvasRenderingContext2D): void {
  const groundY = SIZE - 20;

  // Ground
  ctx.strokeStyle = '#3a3a5e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 2);
  ctx.lineTo(SIZE, groundY + 2);
  ctx.stroke();

  // Ground texture
  ctx.fillStyle = '#2a2a44';
  for (let x = -dinoVis.groundOff; x < SIZE; x += 10) {
    ctx.fillRect(x, groundY + 4, 4, 1);
  }

  // Obstacles (cacti)
  ctx.fillStyle = '#22c55e';
  for (const obs of dinoVis.obstacles) {
    ctx.beginPath();
    ctx.roundRect(obs.x, groundY - obs.h, 6, obs.h, 2);
    ctx.fill();
  }

  // Dino
  ctx.fillStyle = '#6b7280';
  const dinoTop = groundY - 14 + dinoVis.y;
  ctx.beginPath();
  ctx.roundRect(15, dinoTop, 10, 14, 3);
  ctx.fill();
  // Head
  ctx.beginPath();
  ctx.roundRect(19, dinoTop - 6, 8, 8, 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(24, dinoTop - 3, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function renderCrossyVisual(ctx: CanvasRenderingContext2D): void {
  // Draw lanes
  for (let r = 0; r < 10; r++) {
    const y = SIZE - (r + 1) * 12;
    const isRoad = r === 2 || r === 4 || r === 6;
    ctx.fillStyle = isRoad ? '#1a1a2e' : '#1a3a1a';
    ctx.fillRect(0, y, SIZE, 12);
    if (isRoad) {
      ctx.strokeStyle = '#ffffff10';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y + 6);
      ctx.lineTo(SIZE, y + 6);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Cars
  for (const car of crossyVis.cars) {
    const y = SIZE - (car.row + 1) * 12;
    ctx.fillStyle = car.speed > 0 ? '#ef4444' : '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(car.x, y + 2, 16, 8, 2);
    ctx.fill();
  }

  // Chicken
  const py = SIZE - (crossyVis.row + 1) * 12;
  const px = crossyVis.col * 10;
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.roundRect(px, py + 1, 8, 10, 3);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(px + 3, py + 4, 1, 0, Math.PI * 2);
  ctx.arc(px + 6, py + 4, 1, 0, Math.PI * 2);
  ctx.fill();
}

function renderInvadersVisual(ctx: CanvasRenderingContext2D): void {
  // Stars
  ctx.fillStyle = '#ffffff10';
  for (let i = 0; i < 15; i++) {
    ctx.fillRect((i * 31 + 7) % SIZE, (i * 19 + 3) % (SIZE - 20), 1, 1);
  }

  // Aliens
  const colors = ['#ef4444', '#a855f7', '#22c55e'];
  for (const a of invadersVis.aliens) {
    if (!a.alive) continue;
    const row = Math.floor((a.y - 8) / 14);
    ctx.fillStyle = colors[Math.min(row, 2)];
    ctx.beginPath();
    ctx.roundRect(a.x, a.y, 10, 8, 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(a.x + 2, a.y + 2, 2, 2);
    ctx.fillRect(a.x + 6, a.y + 2, 2, 2);
  }

  // Player bullets
  ctx.fillStyle = '#fbbf24';
  for (const b of invadersVis.bullets) {
    ctx.fillRect(b.x - 1, b.y, 2, 5);
  }

  // Player ship
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.moveTo(invadersVis.playerX, SIZE - 14);
  ctx.lineTo(invadersVis.playerX + 8, SIZE - 6);
  ctx.lineTo(invadersVis.playerX - 8, SIZE - 6);
  ctx.closePath();
  ctx.fill();
}

export function renderAutopilotCards(container: HTMLElement): void {
  const configs = getAllAutopilotConfigs();
  const anyActive = configs.some(c =>
    isAutopilotUnlocked(c.gameId) && getAutopilotState(c.gameId).enabled
  );

  if (!anyActive) return;

  const header = document.createElement('h3');
  header.className = 'section-header';
  header.style.marginTop = '24px';
  header.textContent = 'IAs Jugando';
  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'ap-visual-grid';

  for (const config of configs) {
    if (!isAutopilotUnlocked(config.gameId)) continue;
    const state = getAutopilotState(config.gameId);
    if (!state.enabled) continue;

    const apConfig = getAutopilotConfig(config.gameId)!;
    const interval = Math.max(5, apConfig.baseInterval * (1 - (state.speedLevel - 1) * 0.1));

    const card = document.createElement('div');
    card.className = 'ap-visual-card';

    const canvas = document.createElement('canvas');
    canvas.id = `ap-vis-${config.gameId}`;
    canvas.width = SIZE;
    canvas.height = SIZE;
    canvas.className = 'ap-visual-canvas';

    const info = document.createElement('div');
    info.className = 'ap-visual-info';
    info.innerHTML = `
      <span class="ap-visual-name">${config.icon} ${config.name}</span>
      <span class="ap-visual-detail">Skill ${state.skillLevel} | ${interval.toFixed(1)}s</span>
    `;

    card.appendChild(canvas);
    card.appendChild(info);
    grid.appendChild(card);
  }

  container.appendChild(grid);
}
