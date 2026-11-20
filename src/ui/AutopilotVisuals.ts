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

const snakeVis: SnakeVisual = { segments: [], dir: {x:1,y:0}, food: {x:0,y:0}, timer: 0 };
const flappyVis: FlappyVisual = { birdY: 60, birdVel: 0, pipes: [], timer: 0 };
const mineVis: MineVisual = { revealed: [], timer: 0, nextReveal: 0 };
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
      // Reveal a random hidden cell
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
      // Reset when all revealed
      if (hidden.length <= 1) {
        mineVis.revealed = Array.from({length: 9}, () => Array.from({length: 9}, () => false));
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
