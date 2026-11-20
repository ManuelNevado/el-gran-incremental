import { gameState } from '../core/GameState';
import { eventBus } from '../core/EventBus';
import { $ } from '../utils/dom';
import { formatNumber, formatTime } from '../utils/numbers';

export function initStatsPanel(): void {
  renderStats();
  eventBus.on('tab:changed', ({ tab }) => {
    if (tab === 'stats') renderStats();
  });
}

function renderStats(): void {
  const container = $('#tab-stats');
  const s = gameState;

  container.innerHTML = `
    <h3 class="section-header">Estadisticas</h3>
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
