import { gameState } from '../core/GameState';
import { eventBus } from '../core/EventBus';
import { $ } from '../utils/dom';
import { formatNumber, formatTime } from '../utils/numbers';
import { getSortedRates, getTotalRate, getSourceLabel, getSourceColor } from '../core/IncomeTracker';

let chartCanvas: HTMLCanvasElement | null = null;
let chartAnimFrame = 0;
let isStatsVisible = false;

export function initStatsPanel(): void {
  renderStats();
  eventBus.on('tab:changed', ({ tab }) => {
    isStatsVisible = tab === 'stats';
    if (isStatsVisible) {
      renderStats();
      startChartLoop();
    } else {
      stopChartLoop();
    }
  });
}

function startChartLoop(): void {
  stopChartLoop();
  function loop() {
    if (!isStatsVisible) return;
    renderChart();
    renderLegend();
    chartAnimFrame = requestAnimationFrame(loop);
  }
  chartAnimFrame = requestAnimationFrame(loop);
}

function stopChartLoop(): void {
  if (chartAnimFrame) {
    cancelAnimationFrame(chartAnimFrame);
    chartAnimFrame = 0;
  }
}

function renderStats(): void {
  const container = $('#tab-stats');
  const s = gameState;

  container.innerHTML = `
    <h3 class="section-header">Ingresos en tiempo real</h3>
    <div class="income-chart-wrapper">
      <canvas id="income-chart" width="600" height="260"></canvas>
      <div id="income-legend" class="income-legend"></div>
    </div>

    <h3 class="section-header" style="margin-top: 24px;">Estadisticas</h3>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${formatNumber(s.stats.totalCoinsEarned)}</div>
        <div class="stat-label">Monedas totales</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatNumber(s.stats.totalClicks)}</div>
        <div class="stat-label">Clicks totales</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatTime(s.stats.totalTimePlayed)}</div>
        <div class="stat-label">Tiempo jugado</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatNumber(s.passive.coinsPerSecond)}/s</div>
        <div class="stat-label">Monedas por segundo</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.prestige.count}</div>
        <div class="stat-label">Prestigios</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">x${s.prestige.multiplier.toFixed(1)}</div>
        <div class="stat-label">Multiplicador</div>
      </div>
    </div>

    <h3 class="section-header" style="margin-top: 24px;">Mini-Juegos</h3>
    <div class="stats-grid">
      ${Object.entries(s.minigames).map(([id, stats]) => `
        <div class="stat-card">
          <div class="stat-value">${stats.highScore}</div>
          <div class="stat-label">${id} record</div>
          <div class="text-muted" style="font-size: 0.7rem; margin-top: 4px;">
            Partidas: ${stats.timesPlayed} | Ganado: ${formatNumber(stats.totalEarned)}
          </div>
        </div>
      `).join('')}
    </div>

    <h3 class="section-header" style="margin-top: 24px;">Guardado</h3>
    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <button class="btn btn-secondary" id="btn-save">Guardar</button>
      <button class="btn btn-secondary" id="btn-export">Exportar a archivo</button>
      <button class="btn btn-secondary" id="btn-import">Importar archivo</button>
      <button class="btn btn-danger" id="btn-reset">Borrar partida</button>
    </div>
  `;

  chartCanvas = document.getElementById('income-chart') as HTMLCanvasElement;

  document.getElementById('btn-save')?.addEventListener('click', () => {
    import('../core/SaveManager').then(m => m.saveGame());
    eventBus.emit('notification', { message: 'Partida guardada!', type: 'success' });
  });

  document.getElementById('btn-export')?.addEventListener('click', () => {
    import('../core/SaveManager').then(m => m.exportToFile());
  });

  document.getElementById('btn-import')?.addEventListener('click', () => {
    import('../core/SaveManager').then(m => m.importFromFile());
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (confirm('Seguro que quieres borrar tu partida? No se puede deshacer.')) {
      import('../core/SaveManager').then(m => m.deleteSave());
      location.reload();
    }
  });
}

function renderChart(): void {
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d')!;
  const w = chartCanvas.width;
  const h = chartCanvas.height;

  const rates = getSortedRates();
  const total = getTotalRate();

  // Background
  ctx.fillStyle = '#0d0d1a';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 10);
  ctx.fill();

  if (rates.length === 0 || total < 0.001) {
    ctx.fillStyle = '#6a6a82';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sin ingresos todavia... empieza a ganar monedas!', w / 2, h / 2);
    return;
  }

  const padding = { top: 40, right: 20, bottom: 30, left: 70 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const barHeight = Math.min(32, (chartH - (rates.length - 1) * 6) / rates.length);
  const totalBarsHeight = rates.length * barHeight + (rates.length - 1) * 6;
  const startY = padding.top + (chartH - totalBarsHeight) / 2;

  // Title
  ctx.fillStyle = '#e8e8f0';
  ctx.font = 'bold 13px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Ingresos: ${formatNumber(total)}/s (ultimos 30s)`, padding.left, 12);

  // Max rate for scaling
  const maxRate = rates[0].rate;

  for (let i = 0; i < rates.length; i++) {
    const { source, rate } = rates[i];
    const y = startY + i * (barHeight + 6);
    const barW = Math.max(2, (rate / maxRate) * chartW);
    const pct = (rate / total) * 100;
    const color = getSourceColor(source);

    // Bar background
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(padding.left, y, chartW, barHeight, 4);
    ctx.fill();

    // Bar fill
    const grad = ctx.createLinearGradient(padding.left, y, padding.left + barW, y);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '88');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(padding.left, y, barW, barHeight, 4);
    ctx.fill();

    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color + '30';
    ctx.beginPath();
    ctx.roundRect(padding.left, y, barW, barHeight, 4);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label (left of bar)
    ctx.fillStyle = '#a0a0b8';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const label = getSourceLabel(source);
    // Truncate label if too long
    const shortLabel = label.length > 10 ? label.substring(0, 9) + '.' : label;
    ctx.fillText(shortLabel, padding.left - 6, y + barHeight / 2);

    // Value on bar
    ctx.fillStyle = '#e8e8f0';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const valueText = `${formatNumber(rate)}/s (${pct.toFixed(1)}%)`;
    const textX = padding.left + barW + 8;
    if (textX + 100 < w) {
      ctx.fillText(valueText, textX, y + barHeight / 2);
    } else {
      // Put text inside bar if bar is big enough
      ctx.fillStyle = '#000';
      ctx.fillText(valueText, padding.left + 8, y + barHeight / 2);
    }
  }
}

function renderLegend(): void {
  const container = document.getElementById('income-legend');
  if (!container) return;

  const rates = getSortedRates();
  const total = getTotalRate();

  if (rates.length === 0) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  for (const { source, rate } of rates) {
    const pct = (rate / total) * 100;
    const color = getSourceColor(source);
    const label = getSourceLabel(source);
    html += `
      <div class="income-legend-item">
        <span class="income-legend-dot" style="background: ${color};"></span>
        <span class="income-legend-label">${label}</span>
        <span class="income-legend-value">${formatNumber(rate)}/s</span>
        <span class="income-legend-pct">${pct.toFixed(1)}%</span>
      </div>
    `;
  }

  html += `
    <div class="income-legend-item income-legend-total">
      <span class="income-legend-dot" style="background: var(--accent-gold);"></span>
      <span class="income-legend-label">TOTAL</span>
      <span class="income-legend-value">${formatNumber(total)}/s</span>
      <span class="income-legend-pct">100%</span>
    </div>
  `;

  container.innerHTML = html;
}
