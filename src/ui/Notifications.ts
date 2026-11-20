import { eventBus } from '../core/EventBus';
import { $ } from '../utils/dom';

export function initNotifications(): void {
  eventBus.on('notification', ({ message, type }) => {
    showNotification(message, type);
  });
}

export function showNotification(message: string, type: 'success' | 'reward' | 'info' = 'info'): void {
  const container = $('#notifications-container');
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  container.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}
