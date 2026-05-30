'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useSidebarStore } from '@/lib/store';
import { getMembers, getTeams, getUsageLogs } from '@/lib/db';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function formatTokensFn(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

const STATUS_COLOR = { healthy: '#22c55e', warning: '#f59e0b', blocked: '#ef4444' };
const STATUS_LABEL = { healthy: '🟢 Healthy', warning: '🟡 Approaching Limit', blocked: '🔴 Blocked' };

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl p-3 text-xs">
      <p className="text-white/60 mb-1">{label}</p>
      <p className="text-purple-300">{formatTokensFn(payload[0]?.value || 0)} tokens</p>
    </div>
  );
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const { isCollapsed } = useSidebarStore();
  const [user, setUser] = useState<any>(null);
  const [teamName, setTeamName] = useState<string>('My Team');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('tv_user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role === 'ADMIN') { router.push('/admin'); return; }
    
    // Refresh employee info from DB
    const dbMembers = getMembers();
    const currentMember = dbMembers.find(m => m.id === u.id);
    if (!currentMember) {
      localStorage.removeItem('tv_user');
      localStorage.removeItem('tv_token');
      router.push('/login');
      return;
    }
    
    setUser(currentMember);

    // Get Team Name
    const dbTeams = getTeams();
    const currentTeam = dbTeams.find(t => t.id === currentMember.teamId);
    if (currentTeam) {
      setTeamName(currentTeam.name);
    }

    // Get fellow active team members (excluding self for cleaner list, or including)
    const teammates = dbMembers.filter(m => m.teamId === currentMember.teamId && m.id !== currentMember.id && m.status === 'active');
    setTeamMembers(teammates);

    // Get logs for this user
    const userLogs = getUsageLogs().filter(l => l.userId === currentMember.id);
    setLogs(userLogs);
  }, [router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  const { quota, savings } = user;
  const color = STATUS_COLOR[quota.status as keyof typeof STATUS_COLOR] || '#22c55e';

  // Generate trend points for the user
  const generateChartTrends = () => {
    const days = 14;
    const trends = [];
    const now = new Date();
    
    // Group logs by date
    const logsByDate: Record<string, number> = {};
    logs.forEach(l => {
      const dateStr = l.timestamp.split('T')[0];
      logsByDate[dateStr] = (logsByDate[dateStr] || 0) + l.totalTokens;
    });

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trends.push({
        date: dateStr,
        tokens: logsByDate[dateStr] || 0,
      });
    }
    return trends;
  };

  const chartData = generateChartTrends();

  return (
    <div className="flex min-h-screen">
      <Sidebar role="employee" userName={user.name} companyId={user.companyId} />
      <main style={{ marginLeft: isCollapsed ? '0' : '260px', padding: '48px 24px', transition: 'margin-left 250ms ease' }} className="flex-1">
        <div style={{ maxWidth: '1024px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2rem)', fontWeight: 700, color: 'white', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Workspace Dashboard</h1>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                {user.name} · <span style={{ color: 'rgb(196,167,255)', fontWeight: 600 }}>{teamName}</span> · <span style={{ color: 'rgba(255,255,255,0.3)' }}>{user.jobRole}</span>
              </p>
            </div>
            <button onClick={() => router.push('/employee/chat')}
              className="gradient-primary"
              style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px', transition: 'opacity 150ms ease' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              AI Playpen
            </button>
          </div>

          {/* Quota Card */}
          <div className="glass" style={{ borderRadius: '24px', padding: '24px', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 40px rgba(0,0,0,0.2)' }}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Token Quota Governance</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white tracking-tight">{quota.percent}%</span>
                  <span className="text-sm text-white/30">utilized</span>
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] text-white/40 uppercase font-semibold mb-1">Remaining Balance</p>
                <p className="text-2xl font-bold" style={{ color }}>{formatTokensFn(quota.remaining)}</p>
                <p className="text-xs text-white/30 mt-1">of {formatTokensFn(quota.allocated)} allocated</p>
              </div>
            </div>
            <div className="token-bar" style={{ height: '10px' }}>
              <div className="token-bar-fill transition-all duration-500" style={{
                width: `${quota.percent}%`,
                height: '10px',
                background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                boxShadow: `0 0 10px ${color}30`,
              }} />
            </div>
            <div className="flex justify-between mt-3">
              <span className="text-xs text-white/30">{formatTokensFn(quota.used)} used MTD</span>
              <span className="text-xs font-semibold" style={{ color }}>
                {STATUS_LABEL[quota.status as keyof typeof STATUS_LABEL] || '🟢 Healthy'}
              </span>
            </div>
          </div>

          {/* Metrics row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
            <div className="glass" style={{ borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Cache Hits</p>
              <p className="text-2xl font-bold text-cyan-400">{savings.cacheHits}</p>
              <p className="text-xs text-white/30 mt-1">{formatTokensFn(savings.savedFromCaching)} tokens saved</p>
            </div>
            <div className="glass" style={{ borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Compression savings</p>
              <p className="text-2xl font-bold text-pink-400">{formatTokensFn(savings.savedFromCompression)}</p>
              <p className="text-xs text-white/30 mt-1">tokens via compression</p>
            </div>
            <div className="glass" style={{ borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Est. Cost Avoided</p>
              <p className="text-2xl font-bold text-green-400">${((savings.totalSaved / 1_000_000) * 3).toFixed(2)}</p>
              <p className="text-xs text-white/30 mt-1">{formatTokensFn(savings.totalSaved)} total tokens saved</p>
            </div>
          </div>

          {/* Usage Chart & Team Members Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            
            {/* Daily Usage Chart */}
            <div className="glass" style={{ borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', gridColumn: 'span 1 / -1' }}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">My Token Usage (14 days)</p>
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} tickFormatter={formatTokensFn} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="tokens" stroke="#7c3aed" fill="url(#empGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Team Members List (Microsoft Teams style) */}
            <div className="glass" style={{ borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Team Members ({teamName})</p>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[170px] pr-1">
                {teamMembers.length === 0 ? (
                  <div className="text-xs text-white/30 py-6 text-center">
                    You are the only member in this team currently.
                  </div>
                ) : (
                  teamMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/15 flex items-center justify-center text-xs font-bold shrink-0">
                        {m.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{m.name}</p>
                        <p className="text-[10px] text-white/30 truncate">{m.jobRole} · {m.email}</p>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" title="Active" />
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Recent Activity */}
          <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Recent Activity Log</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40">{logs.length} logs</span>
            </div>
            
            <div className="divide-y divide-white/5">
              {logs.length === 0 ? (
                <div className="py-12 text-center text-xs text-white/30">
                  No requests sent yet. Start chatting using the "AI Playpen" button!
                </div>
              ) : (
                logs.map((log: any) => (
                  <div key={log.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm shrink-0">
                        {log.taskType === 'code' ? '💻' : log.taskType === 'qa' ? '💬' : '📊'}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-white">{log.modelUsed}</span>
                          {log.cached && <span className="text-[9px] px-1 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">⚡ Cache Hit</span>}
                          {log.compressed && <span className="text-[9px] px-1 rounded bg-pink-500/10 text-pink-400 font-bold border border-pink-500/20">🗜 Compressed</span>}
                        </div>
                        <p className="text-[10px] text-white/30 mt-0.5 capitalize">{log.taskType} · {timeAgo(log.timestamp)}</p>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-white">{log.totalTokens.toLocaleString()}</p>
                      <p className="text-[10px] text-white/30">${log.costUsd.toFixed(4)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
