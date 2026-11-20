const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatNumber(n: number, decimals = 1): string {
  if (n < 0) return '-' + formatNumber(-n, decimals);
  if (n < 1000) return Math.floor(n).toString();

  const tier = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1);
  if (tier === 0) return n.toLocaleString('es-ES', { maximumFractionDigits: 0 });

  const suffix = SUFFIXES[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = n / scale;

  return scaled.toFixed(decimals) + suffix;
}

export function formatRate(perSecond: number): string {
  if (perSecond < 0.01) return '+0/s';
  return '+' + formatNumber(perSecond) + '/s';
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
