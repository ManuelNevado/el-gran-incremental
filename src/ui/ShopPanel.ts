import { eventBus } from '../core/EventBus';
import { $ } from '../utils/dom';
import { formatNumber } from '../utils/numbers';
import {
  getVisibleUpgrades,
  getUpgradeLevel,
  getUpgradeCost,
  purchaseUpgrade,
  areRequirementsMet,
} from '../upgrades/UpgradeManager';
import { canAfford } from '../core/CurrencyManager';
import { getClickPower, addCoins } from '../core/CurrencyManager';
import type { UpgradeCategory, UpgradeDefinition } from '../upgrades/types';

interface CategoryInfo {
  key: UpgradeCategory;
  label: string;
  icon: string;
}

const CATEGORIES: CategoryInfo[] = [
  { key: 'unlock',    label: 'Desbloqueos',       icon: '🔓' },
  { key: 'passive',   label: 'Ingreso Pasivo',    icon: '💰' },
  { key: 'click',     label: 'Poder de Click',    icon: '👆' },
  { key: 'global',    label: 'Multiplicadores',    icon: '📈' },
  { key: 'minigame',  label: 'Maestria Juegos',   icon: '🎮' },
  { key: 'autopilot', label: 'Pilotos Automaticos', icon: '🤖' },
  { key: 'activity',  label: 'Produccion',        icon: '⛏️' },
];

const collapsedCategories = new Set<UpgradeCategory>();

export function initShopPanel(): void {
  renderShop();

  eventBus.on('upgrade:purchased', () => renderShop());
  eventBus.on('currency:changed', () => updateAffordability());

  // Re-render every second to catch new unlocks
  setInterval(renderShop, 2000);
}

function renderShop(): void {
  const container = $('#tab-upgrades');

  // Work button
  const workSection = container.querySelector('.work-section') ?? createWorkSection(container);
  updateWorkButton(workSection as HTMLElement);

  // Remove old content (keep work section)
  const oldSections = container.querySelectorAll('.upgrade-category-section');
  oldSections.forEach(s => s.remove());

  const visible = getVisibleUpgrades();

  // Group by category
  const grouped = new Map<UpgradeCategory, UpgradeDefinition[]>();
  for (const def of visible) {
    if (!grouped.has(def.category)) {
      grouped.set(def.category, []);
    }
    grouped.get(def.category)!.push(def);
  }

  // Render each category that has visible upgrades
  for (const cat of CATEGORIES) {
    const upgrades = grouped.get(cat.key);
    if (!upgrades || upgrades.length === 0) continue;

    const section = document.createElement('div');
    section.className = 'upgrade-category-section';
    if (collapsedCategories.has(cat.key)) section.classList.add('collapsed');

    // Count stats for this category
    const totalMaxed = upgrades.filter(d => getUpgradeLevel(d.id) >= d.maxLevel).length;
    const allMaxed = totalMaxed === upgrades.length;

    const header = document.createElement('div');
    header.className = `upgrade-category-header${allMaxed ? ' all-maxed' : ''}`;
    header.innerHTML = `
      <div class="upgrade-category-title">
        <span class="upgrade-category-icon">${cat.icon}</span>
        <span>${cat.label}</span>
        <span class="upgrade-category-count">${totalMaxed}/${upgrades.length}</span>
      </div>
      <span class="upgrade-category-chevron">▾</span>
    `;

    const grid = document.createElement('div');
    grid.className = 'upgrade-grid';

    for (const def of upgrades) {
      grid.appendChild(createUpgradeCard(def));
    }

    // Collapse/expand
    const catKey = cat.key;
    header.addEventListener('click', () => {
      section.classList.toggle('collapsed');
      if (collapsedCategories.has(catKey)) collapsedCategories.delete(catKey);
      else collapsedCategories.add(catKey);
    });

    section.appendChild(header);
    section.appendChild(grid);
    container.appendChild(section);
  }
}

function createWorkSection(container: HTMLElement): HTMLElement {
  const section = document.createElement('div');
  section.className = 'work-section';

  const btn = document.createElement('button');
  btn.className = 'work-btn';
  btn.innerHTML = `<span class="work-btn-label">Trabajar +${formatNumber(getClickPower())}</span>`;

  btn.addEventListener('click', (e) => {
    addCoins(getClickPower(), 'click');
    import('../core/GameState').then(m => m.gameState.stats.totalClicks++);

    // Ripple effect
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    ripple.style.left = (e.clientX - rect.left) + 'px';
    ripple.style.top = (e.clientY - rect.top) + 'px';
    ripple.style.width = ripple.style.height = '20px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 400);

    // Floating coin
    const coin = document.createElement('span');
    coin.className = 'float-coin';
    coin.textContent = `+${formatNumber(getClickPower())}`;
    coin.style.left = e.clientX + 'px';
    coin.style.top = e.clientY + 'px';
    document.body.appendChild(coin);
    setTimeout(() => coin.remove(), 800);
  });

  section.appendChild(btn);
  container.prepend(section);
  return section;
}

function updateWorkButton(section: HTMLElement): void {
  const label = section.querySelector('.work-btn-label');
  if (label) {
    label.textContent = `Trabajar +${formatNumber(getClickPower())}`;
  }
}

function createUpgradeCard(def: UpgradeDefinition): HTMLElement {
  const level = getUpgradeLevel(def.id);
  const isMaxed = level >= def.maxLevel;
  const meetsReqs = areRequirementsMet(def);
  const cost = getUpgradeCost(def);
  const affordable = canAfford(cost);

  const card = document.createElement('div');
  card.className = 'upgrade-card';
  if (isMaxed) card.classList.add('maxed');
  else if (!meetsReqs) card.classList.add('locked');
  else if (affordable) card.classList.add('affordable');

  card.innerHTML = `
    <div class="upgrade-header">
      <span class="upgrade-name">${def.icon} ${def.name}</span>
      <span class="upgrade-level">${level}/${def.maxLevel}</span>
    </div>
    <div class="upgrade-desc">${def.description}</div>
    ${!isMaxed ? `<div class="upgrade-cost">&#x1FA99; ${formatNumber(cost)}</div>` : ''}
  `;

  if (!isMaxed && meetsReqs) {
    card.addEventListener('click', () => {
      if (purchaseUpgrade(def.id)) {
        renderShop();
      }
    });
  }

  return card;
}

function updateAffordability(): void {
  const cards = document.querySelectorAll('.upgrade-card:not(.maxed):not(.locked)');
  cards.forEach(card => {
    const nameEl = card.querySelector('.upgrade-name');
    if (!nameEl) return;
    const visible = getVisibleUpgrades();
    for (const def of visible) {
      if (nameEl.textContent?.includes(def.name)) {
        const cost = getUpgradeCost(def);
        const affordable = canAfford(cost);
        card.classList.toggle('affordable', affordable && getUpgradeLevel(def.id) < def.maxLevel);
        break;
      }
    }
  });
}
