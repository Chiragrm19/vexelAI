// Central API client for all TokenVault backend calls
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tv_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────
export const auth = {
  signup: (data: { name: string; email: string; phone: string; companyName: string; password: string }) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  initOnboarding: (data: { name: string; email: string; phone: string; companyId: string; jobRole?: string }) =>
    request('/auth/onboarding/init', { method: 'POST', body: JSON.stringify(data) }),

  verifyOtp: (data: { userId: string; otp: string; password: string }) =>
    request('/auth/onboarding/verify', { method: 'POST', body: JSON.stringify(data) }),

  getMe: () => request('/auth/me'),
};

// ─── Teams ────────────────────────────────────────────────────────────────
export const teams = {
  getTeam: (id: string) => request(`/teams/${id}`),
  getStats: (id: string) => request(`/teams/${id}/stats`),
  getMembers: (id: string) => request(`/teams/${id}/members`),
  getTrends: (id: string, days = 30) => request(`/teams/${id}/trends?days=${days}`),
};

// ─── Users ────────────────────────────────────────────────────────────────
export const users = {
  inviteMember: (teamId: string, data: any) =>
    request(`/users/teams/${teamId}/invite`, { method: 'POST', body: JSON.stringify(data) }),
  getMembers: (teamId: string) => request(`/users/teams/${teamId}`),
  removeMember: (userId: string) => request(`/users/${userId}`, { method: 'DELETE' }),
};

// ─── Quotas ───────────────────────────────────────────────────────────────
export const quotas = {
  allocate: (userId: string, data: { tokensAllocated: number; hardLimit?: boolean; softLimitThreshold?: number }) =>
    request(`/quotas/users/${userId}/allocate`, { method: 'POST', body: JSON.stringify(data) }),
  getUserQuota: (userId: string) => request(`/quotas/users/${userId}`),
  getTeamQuotas: (teamId: string) => request(`/quotas/teams/${teamId}`),
};

// ─── Providers ────────────────────────────────────────────────────────────
export const providers = {
  add: (teamId: string, data: any) =>
    request(`/providers/teams/${teamId}`, { method: 'POST', body: JSON.stringify(data) }),
  getAll: (teamId: string) => request(`/providers/teams/${teamId}`),
  delete: (id: string) => request(`/providers/${id}`, { method: 'DELETE' }),
};

// ─── Usage ────────────────────────────────────────────────────────────────
export const usage = {
  getUserLogs: (userId: string, limit = 50) => request(`/usage/users/${userId}/logs?limit=${limit}`),
  getDailyUsage: (userId: string, days = 14) => request(`/usage/users/${userId}/daily?days=${days}`),
  getSavings: (userId: string) => request(`/usage/users/${userId}/savings`),
  getTopUsers: (teamId: string) => request(`/usage/teams/${teamId}/top-users`),
  getForecast: (teamId: string) => request(`/usage/teams/${teamId}/forecast`),
};

// ─── Mock data helpers (used when API is not connected) ────────────────────
export function getMockDashboardData() {
  return {
    stats: {
      memberCount: 12,
      tokensAllocated: 500_000_000,
      tokensUsed: 187_430_000,
      tokensRemaining: 312_570_000,
      percentUsed: 37,
      totalCostUsd: 562.29,
      totalRequests: 4821,
      savings: {
        tokensSavedCaching: 28_000_000,
        tokensSavedCompression: 14_200_000,
        totalTokensSaved: 42_200_000,
      },
    },
    members: [
      { id: '1', name: 'Arjun Sharma', email: 'arjun@acme.com', jobRole: 'SDE',
        quota: { allocated: 125_000_000, used: 98_000_000, remaining: 27_000_000, percent: 78, status: 'warning' } },
      { id: '2', name: 'Priya Mehta', email: 'priya@acme.com', jobRole: 'Product Manager',
        quota: { allocated: 100_000_000, used: 34_000_000, remaining: 66_000_000, percent: 34, status: 'healthy' } },
      { id: '3', name: 'Ravi Kumar', email: 'ravi@acme.com', jobRole: 'Designer',
        quota: { allocated: 50_000_000, used: 50_200_000, remaining: 0, percent: 100, status: 'blocked' } },
      { id: '4', name: 'Sneha Iyer', email: 'sneha@acme.com', jobRole: 'Marketing',
        quota: { allocated: 75_000_000, used: 5_230_000, remaining: 69_770_000, percent: 7, status: 'healthy' } },
      { id: '5', name: 'Dev Patel', email: 'dev@acme.com', jobRole: 'SDE',
        quota: { allocated: 125_000_000, used: 112_000_000, remaining: 13_000_000, percent: 90, status: 'warning' } },
    ],
    trends: Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return {
        date: d.toISOString().split('T')[0],
        tokens: Math.floor(4_000_000 + Math.random() * 8_000_000),
        cost: parseFloat((12 + Math.random() * 25).toFixed(2)),
        requests: Math.floor(100 + Math.random() * 300),
      };
    }),
  };
}

export function getMockUserData() {
  return {
    quota: { allocated: 125_000_000, used: 48_200_000, remaining: 76_800_000, percent: 39, status: 'healthy' },
    savings: { cacheHits: 43, savedFromCaching: 8_400_000, savedFromCompression: 3_200_000, totalSaved: 11_600_000 },
    daily: Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return {
        date: d.toISOString().split('T')[0],
        tokens: Math.floor(2_000_000 + Math.random() * 5_000_000),
        cost: parseFloat((6 + Math.random() * 15).toFixed(2)),
        requests: Math.floor(20 + Math.random() * 80),
      };
    }),
    logs: [
      { id: '1', modelUsed: 'claude-3.5-sonnet', totalTokens: 2340, costUsd: 0.007, cached: false, compressed: true, taskType: 'code', timestamp: new Date().toISOString() },
      { id: '2', modelUsed: 'claude-3-haiku', totalTokens: 890, costUsd: 0.001, cached: true, compressed: false, taskType: 'qa', timestamp: new Date(Date.now() - 300_000).toISOString() },
      { id: '3', modelUsed: 'gpt-4o-mini', totalTokens: 1560, costUsd: 0.002, cached: false, compressed: true, taskType: 'analysis', timestamp: new Date(Date.now() - 900_000).toISOString() },
    ],
  };
}
