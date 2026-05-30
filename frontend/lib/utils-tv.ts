// Format large token numbers to human-readable form
export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatCost(usd: number): string {
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}K`;
  return `$${usd.toFixed(2)}`;
}

export function formatPercent(n: number): string {
  return `${Math.min(100, Math.max(0, Math.round(n)))}%`;
}

export function getStatusColor(status: 'healthy' | 'warning' | 'blocked') {
  return {
    healthy: '#22c55e',
    warning: '#f59e0b',
    blocked: '#ef4444',
  }[status];
}

export function getStatusEmoji(status: 'healthy' | 'warning' | 'blocked') {
  return { healthy: '🟢', warning: '🟡', blocked: '🔴' }[status];
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function getModelBadgeColor(model: string) {
  if (model.includes('claude')) return 'rgba(168, 85, 247, 0.2)';
  if (model.includes('gpt')) return 'rgba(16, 185, 129, 0.2)';
  if (model.includes('haiku')) return 'rgba(6, 182, 212, 0.2)';
  return 'rgba(255, 255, 255, 0.1)';
}
