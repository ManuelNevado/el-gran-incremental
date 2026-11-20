import { gameState } from '../core/GameState';
import { eventBus } from '../core/EventBus';
import { $ } from '../utils/dom';
import { formatNumber } from '../utils/numbers';
import { startMinigame } from '../minigames/MinigameManager';
import {
  getAllAutopilotConfigs,
  getAutopilotState,
  isAutopilotUnlocked,
  toggleAutopilot,
  getAutopilotConfig,
} from '../core/AutopilotManager';
import { renderAutopilotCards } from './AutopilotVisuals';
import { SnakeGame } from '../minigames/snake/SnakeGame';
import { FlappyBird } from '../minigames/flappy/FlappyBird';
import { Minesweeper } from '../minigames/minesweeper/Minesweeper';

interface MinigameInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  factory: () => import('../minigames/MinigameBase').MinigameBase;
}

const MINIGAMES: MinigameInfo[] = [
  {
    id: 'snake',
    name: 'Snake',
    icon: '🐍',
    description: 'Come y crece. No te muerdas!',
    factory: () => new SnakeGame(),
  },
  {
    id: 'flappy',
    name: 'Flappy Bird',
    icon: '🐦',
    description: 'Vuela entre los tubos!',
    factory: () => new FlappyBird(),
  },
  {
    id: 'minesweeper',
    name: 'Buscaminas',
    icon: '💣',
    description: 'Encuentra todas las minas!',
    factory: () => new Minesweeper(),
  },
];

export function initMinigameSelector(): void {
  renderSelector();
  eventBus.on('upgrade:unlocked', () => renderSelector());
  eventBus.on('minigame:ended', () => renderSelector());
  eventBus.on('autopilot:completed', () => renderSelector());
  eventBus.on('upgrade:purchased', () => renderSelector());
}

function renderSelector(): void {
  const container = $('#tab-minigames');
  container.innerHTML = '';

  // Mini-games header + grid
  const header = document.createElement('h3');
  header.className = 'section-header';
  header.textContent = 'Mini-Juegos';
  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'minigame-grid';

  for (const info of MINIGAMES) {
    const stats = gameState.minigames[info.id];
    const unlocked = stats?.unlocked ?? false;

    const card = document.createElement('div');
    card.className = `minigame-card${unlocked ? '' : ' locked'}`;

    card.innerHTML = `
      <div class="minigame-icon">${info.icon}</div>
      <div class="minigame-name">${info.name}</div>
      <div class="minigame-desc" style="font-size: 0.8rem; color: var(--text-secondary);">
        ${unlocked ? info.description : 'Bloqueado - Compra la licencia'}
      </div>
      ${unlocked && stats ? `
        <div class="minigame-high-score">Record: ${stats.highScore}</div>
        <div class="minigame-reward">Total ganado: ${formatNumber(stats.totalEarned)}</div>
      ` : ''}
    `;

    if (unlocked) {
      card.addEventListener('click', () => {
        startMinigame(info.factory());
      });
    }

    grid.appendChild(card);
  }

  container.appendChild(grid);

  // Autopilots section
  const apConfigs = getAllAutopilotConfigs();
  const anyUnlocked = apConfigs.some(c => isAutopilotUnlocked(c.gameId));

  if (anyUnlocked) {
    const apHeader = document.createElement('h3');
    apHeader.className = 'section-header';
    apHeader.style.marginTop = '24px';
    apHeader.textContent = 'Pilotos Automaticos';
    container.appendChild(apHeader);

    const apGrid = document.createElement('div');
    apGrid.className = 'autopilot-grid';

    for (const config of apConfigs) {
      if (!isAutopilotUnlocked(config.gameId)) continue;
      const state = getAutopilotState(config.gameId);
      const apConfig = getAutopilotConfig(config.gameId)!;

      const card = document.createElement('div');
      card.className = `autopilot-card${state.enabled ? ' active' : ''}`;

      const interval = Math.max(5, apConfig.baseInterval * (1 - (state.speedLevel - 1) * 0.1));

      card.innerHTML = `
        <div class="autopilot-header">
          <span class="autopilot-icon">${config.icon}</span>
          <span class="autopilot-name">${config.name}</span>
        </div>
        <div class="autopilot-stats">
          <span>Habilidad: ${state.skillLevel}</span>
          <span>Velocidad: ${state.speedLevel}</span>
          <span>Intervalo: ${interval.toFixed(1)}s</span>
        </div>
        <div class="autopilot-status ${state.enabled ? 'on' : 'off'}">
          ${state.enabled ? 'ACTIVO' : 'INACTIVO'}
        </div>
      `;

      card.addEventListener('click', () => {
        toggleAutopilot(config.gameId);
        renderSelector();
      });

      apGrid.appendChild(card);
    }

    container.appendChild(apGrid);
  }

  // Autopilot live visuals
  renderAutopilotCards(container);
}
