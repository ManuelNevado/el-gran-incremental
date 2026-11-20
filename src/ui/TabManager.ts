import { $all } from '../utils/dom';
import { eventBus } from '../core/EventBus';

export function initTabManager(): void {
  const buttons = $all('.nav-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (!tab) return;
      switchTab(tab);
    });
  });
}

export function switchTab(tab: string): void {
  // Update buttons
  $all('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Update content
  $all('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tab}`);
  });

  eventBus.emit('tab:changed', { tab });
}
