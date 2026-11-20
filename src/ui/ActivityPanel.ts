import { gameState } from '../core/GameState';
import { eventBus } from '../core/EventBus';
import { $ } from '../utils/dom';
import { formatNumber } from '../utils/numbers';
import {
  mineOnce, castLine, reelIn, plantCrop, harvestPlot,
  getPlotProgress, ORES, FISH, CROPS, getAvailableCrops,
  setLastResult,
  type OreType, type FishType,
} from '../activities/ActivityManager';

let isVisible = false;
let animFrame = 0;

// ===== MINING VISUAL STATE =====
interface MiningVisual {
  rocks: Array<{ x: number; y: number; hp: number; maxHp: number; ore: OreType; shake: number }>;
  particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>;
  floatingTexts: Array<{ x: number; y: number; text: string; life: number; color: string }>;
}
const miningVis: MiningVisual = { rocks: [], particles: [], floatingTexts: [] };

// ===== FISHING VISUAL STATE =====
interface FishingVisual {
  bobberY: number;
  bobberWobble: number;
  splashParticles: Array<{ x: number; y: number; vy: number; life: number }>;
  caughtFish: { fish: FishType; timer: number } | null;
  waterOffset: number;
}
const fishVis: FishingVisual = { bobberY: 0, bobberWobble: 0, splashParticles: [], caughtFish: null, waterOffset: 0 };

// ===== FARM VISUAL STATE =====
interface FarmVisual {
  harvestParticles: Array<{ x: number; y: number; vy: number; life: number; color: string }>;
  selectedCrop: string | null;
  showCropMenu: number; // plot index, -1 = hidden
}
const farmVis: FarmVisual = { harvestParticles: [], selectedCrop: null, showCropMenu: -1 };

// ===== CANVAS REFS =====
let miningCanvas: HTMLCanvasElement | null = null;
let fishingCanvas: HTMLCanvasElement | null = null;
let farmCanvas: HTMLCanvasElement | null = null;

const CANVAS_W = 400;
const CANVAS_H = 300;

export function initActivityPanel(): void {
  eventBus.on('tab:changed', ({ tab }) => {
    isVisible = tab === 'activities';
    if (isVisible) {
      renderPanel();
      startLoop();
    } else {
      stopLoop();
    }
  });

  eventBus.on('upgrade:purchased', () => {
    if (isVisible) renderPanel();
  });
}

function renderPanel(): void {
  const container = $('#tab-activities');
  container.innerHTML = '';

  const mining = gameState.activities.mining;
  const fishing = gameState.activities.fishing;
  const farm = gameState.activities.farm;

  const anyUnlocked = mining.unlocked || fishing.unlocked || farm.unlocked;

  if (!anyUnlocked) {
    container.innerHTML = `
      <div style="text-align:center; padding:60px 20px; color: var(--text-muted);">
        <div style="font-size:3rem; margin-bottom:16px;">&#x2692;&#xFE0F;</div>
        <h3 style="margin-bottom:8px; color: var(--text-secondary);">Produccion</h3>
        <p>Compra las licencias en la tienda para desbloquear la mina, la pesca y la granja.</p>
      </div>
    `;
    return;
  }

  // Build sections for each unlocked activity
  if (mining.unlocked) {
    const section = createSection('Mina', '&#x26CF;&#xFE0F;', `Profundidad: ${mining.depth} | Mineros auto: ${mining.autoMiners} | Total minado: ${mining.totalMined}`);
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    canvas.className = 'activity-canvas';
    canvas.addEventListener('click', (e) => onMiningClick(e, canvas));
    section.appendChild(canvas);
    miningCanvas = canvas;
    container.appendChild(section);
    initMiningRocks();
  }

  if (fishing.unlocked) {
    const section = createSection('Pesca', '&#x1F3A3;', `Cana nivel ${fishing.rodLevel} | Bots: ${fishing.autoFishers} | Pescados: ${fishing.totalCaught}`);
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    canvas.className = 'activity-canvas';
    canvas.addEventListener('click', (e) => onFishingClick(e, canvas));
    section.appendChild(canvas);
    fishingCanvas = canvas;
    container.appendChild(section);
  }

  if (farm.unlocked) {
    const section = createSection('Granja', '&#x1F33E;', `Parcelas: ${farm.plotCount} | Cosechas: ${farm.totalHarvested}${farm.autoHarvest ? ' | Auto-cosecha ON' : ''}`);
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    canvas.className = 'activity-canvas';
    canvas.addEventListener('click', (e) => onFarmClick(e, canvas));
    section.appendChild(canvas);
    farmCanvas = canvas;
    container.appendChild(section);
    farmVis.showCropMenu = -1;
  }
}

function createSection(title: string, icon: string, subtitle: string): HTMLElement {
  const section = document.createElement('div');
  section.className = 'activity-section';
  section.innerHTML = `
    <div class="activity-header">
      <span class="activity-icon">${icon}</span>
      <div>
        <h3 class="activity-title">${title}</h3>
        <span class="activity-subtitle">${subtitle}</span>
      </div>
    </div>
  `;
  return section;
}

// ===== MINING LOGIC =====

function initMiningRocks(): void {
  miningVis.rocks = [];
  const depth = gameState.activities.mining.depth;
  const cols = 5;
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ore = rollOreForVisual(depth);
      miningVis.rocks.push({
        x: 30 + c * 74,
        y: 60 + r * 78,
        hp: 3,
        maxHp: 3,
        ore,
        shake: 0,
      });
    }
  }
}

function rollOreForVisual(depth: number): OreType {
  const available = ORES.filter(o => o.minDepth <= depth);
  let totalWeight = 0;
  for (const o of available) totalWeight += o.weight;
  let roll = Math.random() * totalWeight;
  for (const o of available) {
    roll -= o.weight;
    if (roll <= 0) return o;
  }
  return available[available.length - 1];
}

function onMiningClick(e: MouseEvent, canvas: HTMLCanvasElement): void {
  if (!gameState.activities.mining.unlocked) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);

  for (const rock of miningVis.rocks) {
    if (mx > rock.x && mx < rock.x + 60 && my > rock.y && my < rock.y + 60) {
      rock.hp--;
      rock.shake = 0.2;

      // Particles
      for (let i = 0; i < 5; i++) {
        miningVis.particles.push({
          x: rock.x + 30, y: rock.y + 30,
          vx: (Math.random() - 0.5) * 150,
          vy: (Math.random() - 0.5) * 150,
          life: 0.5,
          color: rock.ore.color,
        });
      }

      if (rock.hp <= 0) {
        // Mine it!
        const result = mineOnce();
        if (result) {
          miningVis.floatingTexts.push({
            x: rock.x + 30, y: rock.y,
            text: `+${formatNumber(result.reward)}`,
            life: 1.2,
            color: result.ore.color,
          });
          setLastResult('mining', result.ore.name, result.reward);
        }
        // Respawn rock
        const depth = gameState.activities.mining.depth;
        rock.ore = rollOreForVisual(depth);
        rock.hp = 3;
        rock.maxHp = 3;
      }
      break;
    }
  }
}

// ===== FISHING LOGIC =====

function onFishingClick(e: MouseEvent, canvas: HTMLCanvasElement): void {
  const fishing = gameState.activities.fishing;
  if (!fishing.unlocked) return;

  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (fishing.castState === 'idle') {
    // Cast button area (bottom center)
    if (mx > 140 && mx < 260 && my > 240 && my < 280) {
      castLine();
    }
  } else if (fishing.castState === 'bite') {
    // Click anywhere to reel
    const result = reelIn();
    if (result) {
      fishVis.caughtFish = { fish: result.fish, timer: 1.5 };
      setLastResult('fishing', result.fish.name, result.reward);
      // Splash
      for (let i = 0; i < 8; i++) {
        fishVis.splashParticles.push({
          x: 200 + (Math.random() - 0.5) * 20,
          y: 130,
          vy: -60 - Math.random() * 80,
          life: 0.8,
        });
      }
    }
  }
}

// ===== FARM LOGIC =====

function onFarmClick(e: MouseEvent, canvas: HTMLCanvasElement): void {
  const farm = gameState.activities.farm;
  if (!farm.unlocked) return;

  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);

  // Farm layout: grid of plots
  const cols = Math.min(farm.plotCount, 4);
  const plotW = 80;
  const plotH = 70;
  const startX = (CANVAS_W - cols * plotW) / 2;
  const startY = 50;

  // Check crop menu clicks first
  if (farmVis.showCropMenu >= 0) {
    const crops = getAvailableCrops();
    const menuX = 10;
    const menuY = 30;
    for (let i = 0; i < crops.length; i++) {
      const iy = menuY + i * 32;
      if (mx > menuX && mx < menuX + CANVAS_W - 20 && my > iy && my < iy + 28) {
        plantCrop(farmVis.showCropMenu, crops[i].id);
        farmVis.showCropMenu = -1;
        return;
      }
    }
    farmVis.showCropMenu = -1;
    return;
  }

  for (let i = 0; i < farm.plots.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const px = startX + col * plotW;
    const py = startY + row * plotH;

    if (mx > px && mx < px + plotW - 4 && my > py && my < py + plotH - 4) {
      const plot = farm.plots[i];
      if (!plot.cropId) {
        // Show crop selection menu
        farmVis.showCropMenu = i;
      } else if (getPlotProgress(plot) >= 1) {
        // Harvest
        const result = harvestPlot(i);
        if (result) {
          setLastResult('farm', result.crop.name, result.reward);
          // Particles
          for (let j = 0; j < 6; j++) {
            farmVis.harvestParticles.push({
              x: px + 38, y: py + 30,
              vy: -40 - Math.random() * 60,
              life: 0.8,
              color: result.crop.color,
            });
          }
        }
      }
      break;
    }
  }
}

// ===== RENDER LOOP =====

function startLoop(): void {
  stopLoop();
  function loop() {
    if (!isVisible) return;
    updateVisuals(1 / 60);
    renderAll();
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

function updateVisuals(dt: number): void {
  // Mining particles
  for (const p of miningVis.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  miningVis.particles = miningVis.particles.filter(p => p.life > 0);

  for (const t of miningVis.floatingTexts) {
    t.y -= 40 * dt;
    t.life -= dt;
  }
  miningVis.floatingTexts = miningVis.floatingTexts.filter(t => t.life > 0);

  for (const rock of miningVis.rocks) {
    if (rock.shake > 0) rock.shake -= dt;
  }

  // Fishing
  fishVis.waterOffset += dt * 20;
  const fishing = gameState.activities.fishing;
  if (fishing.castState === 'waiting' || fishing.castState === 'bite') {
    fishVis.bobberWobble += dt * 4;
    fishVis.bobberY = fishing.castState === 'bite'
      ? 125 + Math.sin(fishVis.bobberWobble * 3) * 8
      : 130 + Math.sin(fishVis.bobberWobble) * 2;
  }

  if (fishVis.caughtFish) {
    fishVis.caughtFish.timer -= dt;
    if (fishVis.caughtFish.timer <= 0) fishVis.caughtFish = null;
  }

  for (const p of fishVis.splashParticles) {
    p.y += p.vy * dt;
    p.vy += 200 * dt;
    p.life -= dt;
  }
  fishVis.splashParticles = fishVis.splashParticles.filter(p => p.life > 0);

  // Farm particles
  for (const p of farmVis.harvestParticles) {
    p.y += p.vy * dt;
    p.vy += 100 * dt;
    p.life -= dt;
  }
  farmVis.harvestParticles = farmVis.harvestParticles.filter(p => p.life > 0);
}

function renderAll(): void {
  if (miningCanvas && gameState.activities.mining.unlocked) {
    renderMining(miningCanvas.getContext('2d')!);
  }
  if (fishingCanvas && gameState.activities.fishing.unlocked) {
    renderFishing(fishingCanvas.getContext('2d')!);
  }
  if (farmCanvas && gameState.activities.farm.unlocked) {
    renderFarm(farmCanvas.getContext('2d')!);
  }
}

// ===== RENDER: MINING =====

function renderMining(ctx: CanvasRenderingContext2D): void {
  const depth = gameState.activities.mining.depth;

  // Background gradient based on depth
  const depthColors = ['#2a1810', '#1a1215', '#10101a', '#0a0a1e', '#0d0520', '#1a0010'];
  const bg = depthColors[Math.min(depth - 1, depthColors.length - 1)];
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Ambient texture
  ctx.fillStyle = '#ffffff05';
  for (let i = 0; i < 20; i++) {
    const sx = (i * 53 + 11) % CANVAS_W;
    const sy = (i * 37 + 7) % CANVAS_H;
    ctx.fillRect(sx, sy, 2, 1);
  }

  // Depth label
  ctx.fillStyle = '#ffffff50';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Profundidad: Nivel ${depth}`, 10, 10);

  // Auto-miners info
  const mining = gameState.activities.mining;
  ctx.textAlign = 'right';
  ctx.fillText(`Mineros: ${mining.autoMiners} | Total: ${mining.totalMined}`, CANVAS_W - 10, 10);

  // Rocks
  for (const rock of miningVis.rocks) {
    const shakeX = rock.shake > 0 ? (Math.random() - 0.5) * 4 : 0;
    const shakeY = rock.shake > 0 ? (Math.random() - 0.5) * 4 : 0;
    const rx = rock.x + shakeX;
    const ry = rock.y + shakeY;

    // Rock body
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.roundRect(rx, ry, 60, 60, 8);
    ctx.fill();

    // Ore vein color
    ctx.fillStyle = rock.ore.color + '80';
    ctx.beginPath();
    ctx.roundRect(rx + 10, ry + 10, 40, 40, 6);
    ctx.fill();

    // Ore core
    ctx.fillStyle = rock.ore.color;
    ctx.beginPath();
    ctx.arc(rx + 30, ry + 30, 12, 0, Math.PI * 2);
    ctx.fill();

    // HP bar
    const hpPct = rock.hp / rock.maxHp;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(rx + 5, ry + 52, 50, 4);
    ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(rx + 5, ry + 52, 50 * hpPct, 4);

    // Ore name
    ctx.fillStyle = rock.ore.color;
    ctx.font = 'bold 9px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(rock.ore.name, rx + 30, ry - 2);
  }

  // Particles
  for (const p of miningVis.particles) {
    ctx.fillStyle = p.color + Math.floor(p.life * 2 * 255).toString(16).padStart(2, '0');
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }

  // Floating texts
  for (const t of miningVis.floatingTexts) {
    const alpha = Math.min(t.life, 1);
    ctx.fillStyle = t.color;
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.text, t.x, t.y);
    ctx.globalAlpha = 1;
  }

  // Instruction
  ctx.fillStyle = '#ffffff30';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Haz click en las rocas para minar', CANVAS_W / 2, CANVAS_H - 8);
}

// ===== RENDER: FISHING =====

function renderFishing(ctx: CanvasRenderingContext2D): void {
  const fishing = gameState.activities.fishing;

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, 140);
  sky.addColorStop(0, '#0c1445');
  sky.addColorStop(1, '#1a3a5c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, 140);

  // Stars
  ctx.fillStyle = '#ffffff15';
  for (let i = 0; i < 15; i++) {
    ctx.fillRect((i * 61 + 13) % CANVAS_W, (i * 29 + 5) % 100, 1.5, 1.5);
  }

  // Moon
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(340, 40, 20, 0, Math.PI * 2);
  ctx.fill();

  // Water
  const water = ctx.createLinearGradient(0, 140, 0, CANVAS_H);
  water.addColorStop(0, '#0c4a6e');
  water.addColorStop(1, '#082f49');
  ctx.fillStyle = water;
  ctx.fillRect(0, 140, CANVAS_W, CANVAS_H - 140);

  // Water surface ripples
  ctx.strokeStyle = '#38bdf830';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const rx = (i * 55 + fishVis.waterOffset) % (CANVAS_W + 40) - 20;
    ctx.beginPath();
    ctx.moveTo(rx, 140);
    ctx.quadraticCurveTo(rx + 12, 137, rx + 24, 140);
    ctx.stroke();
  }

  // Dock
  ctx.fillStyle = '#78350f';
  ctx.fillRect(50, 100, 120, 10);
  ctx.fillStyle = '#92400e';
  ctx.fillRect(70, 100, 8, 50);
  ctx.fillRect(142, 100, 8, 50);

  // Fishing rod on dock
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, 100);
  ctx.lineTo(200, 60);
  ctx.stroke();

  // Line from rod
  if (fishing.castState !== 'idle') {
    ctx.strokeStyle = '#ffffff40';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(200, 60);
    ctx.lineTo(200, fishVis.bobberY);
    ctx.stroke();

    // Bobber
    const bobberX = 200;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(bobberX, fishVis.bobberY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(bobberX, fishVis.bobberY - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Bite indicator
    if (fishing.castState === 'bite') {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 18px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      const pulse = Math.sin(Date.now() / 150) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
      ctx.fillText('!! PICA !! Click!', CANVAS_W / 2, 50);
      ctx.globalAlpha = 1;

      // Ripples around bobber
      const rippleR = (Date.now() % 500) / 500 * 20;
      ctx.strokeStyle = '#fbbf2460';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bobberX, fishVis.bobberY, rippleR, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (fishing.castState === 'waiting') {
      ctx.fillStyle = '#ffffff40';
      ctx.font = '13px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Esperando...', CANVAS_W / 2, 50);
    }
  }

  // Splash particles
  for (const p of fishVis.splashParticles) {
    ctx.fillStyle = `rgba(56, 189, 248, ${p.life})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Caught fish display
  if (fishVis.caughtFish) {
    const alpha = Math.min(fishVis.caughtFish.timer, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fishVis.caughtFish.fish.color;
    ctx.font = 'bold 20px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fy = 80 - (1.5 - fishVis.caughtFish.timer) * 20;
    ctx.fillText(fishVis.caughtFish.fish.name, CANVAS_W / 2, fy);
    ctx.globalAlpha = 1;
  }

  // Cast button (only when idle)
  if (fishing.castState === 'idle') {
    ctx.fillStyle = '#1e40af';
    ctx.beginPath();
    ctx.roundRect(140, 240, 120, 40, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Lanzar!', 200, 260);
  }

  // Info
  ctx.fillStyle = '#ffffff50';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Cana: Nv.${fishing.rodLevel} | Bots: ${fishing.autoFishers} | Pescados: ${fishing.totalCaught}`, 10, 10);
}

// ===== RENDER: FARM =====

function renderFarm(ctx: CanvasRenderingContext2D): void {
  const farm = gameState.activities.farm;

  // Background - field
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bg.addColorStop(0, '#1a2e1a');
  bg.addColorStop(1, '#0f1a0f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Info
  ctx.fillStyle = '#ffffff50';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Parcelas: ${farm.plotCount} | Cosechas: ${farm.totalHarvested}${farm.autoHarvest ? ' | Auto' : ''}`, 10, 10);

  const cols = Math.min(farm.plotCount, 4);
  const plotW = 80;
  const plotH = 70;
  const startX = (CANVAS_W - cols * plotW) / 2;
  const startY = 50;

  for (let i = 0; i < farm.plots.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const px = startX + col * plotW;
    const py = startY + row * plotH;
    const plot = farm.plots[i];

    // Soil
    ctx.fillStyle = '#3d2b1f';
    ctx.beginPath();
    ctx.roundRect(px, py, plotW - 4, plotH - 4, 6);
    ctx.fill();

    // Dirt rows
    ctx.strokeStyle = '#2a1f15';
    ctx.lineWidth = 1;
    for (let dr = 0; dr < 3; dr++) {
      ctx.beginPath();
      ctx.moveTo(px + 8, py + 20 + dr * 15);
      ctx.lineTo(px + plotW - 12, py + 20 + dr * 15);
      ctx.stroke();
    }

    if (!plot.cropId) {
      // Empty plot
      ctx.fillStyle = '#ffffff20';
      ctx.font = '20px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', px + plotW / 2 - 2, py + plotH / 2 - 2);
    } else {
      const progress = getPlotProgress(plot);
      const crop = CROPS.find(c => c.id === plot.cropId);
      const color = crop?.color ?? '#22c55e';

      if (progress < 1) {
        // Growing stages
        const stage = Math.floor(progress * 4); // 0-3

        ctx.fillStyle = color;
        if (stage === 0) {
          // Seed
          ctx.beginPath();
          ctx.arc(px + plotW / 2 - 2, py + plotH / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (stage === 1) {
          // Sprout
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(px + plotW / 2 - 3, py + plotH / 2 - 8, 2, 12);
          ctx.beginPath();
          ctx.ellipse(px + plotW / 2 + 2, py + plotH / 2 - 8, 6, 3, 0.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (stage === 2) {
          // Growing
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(px + plotW / 2 - 3, py + plotH / 2 - 15, 3, 20);
          ctx.fillStyle = color + '80';
          ctx.beginPath();
          ctx.ellipse(px + plotW / 2 - 2, py + plotH / 2 - 15, 10, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Almost ready
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(px + plotW / 2 - 3, py + plotH / 2 - 20, 3, 25);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.ellipse(px + plotW / 2 - 2, py + plotH / 2 - 18, 14, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Progress bar
        ctx.fillStyle = '#1a1a1a80';
        ctx.fillRect(px + 8, py + plotH - 12, plotW - 20, 5);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(px + 8, py + plotH - 12, (plotW - 20) * progress, 5);
      } else {
        // Ready to harvest!
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(px + plotW / 2 - 3, py + plotH / 2 - 22, 3, 28);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(px + plotW / 2 - 2, py + plotH / 2 - 20, 16, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glow
        const pulse = Math.sin(Date.now() / 300) * 0.2 + 0.8;
        ctx.strokeStyle = color + Math.floor(pulse * 180).toString(16).padStart(2, '0');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(px + 2, py + 2, plotW - 8, plotH - 8, 6);
        ctx.stroke();
      }

      // Crop name
      ctx.fillStyle = color;
      ctx.font = '9px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(crop?.name ?? '', px + plotW / 2 - 2, py + 3);
    }
  }

  // Harvest particles
  for (const p of farmVis.harvestParticles) {
    ctx.fillStyle = p.color + Math.floor(Math.min(p.life, 1) * 200).toString(16).padStart(2, '0');
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crop selection menu overlay
  if (farmVis.showCropMenu >= 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Elige un cultivo', CANVAS_W / 2, 8);

    const crops = getAvailableCrops();
    const menuY = 30;
    for (let i = 0; i < crops.length; i++) {
      const iy = menuY + i * 32;
      ctx.fillStyle = '#1e2a4a';
      ctx.beginPath();
      ctx.roundRect(10, iy, CANVAS_W - 20, 28, 4);
      ctx.fill();

      ctx.fillStyle = crops[i].color;
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(crops[i].name, 20, iy + 14);

      ctx.fillStyle = '#ffffff80';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`${crops[i].growthTime}s | ${formatNumber(crops[i].value)} monedas`, CANVAS_W - 20, iy + 14);
    }
  }
}

// ===== Unused var workaround
void FISH;
