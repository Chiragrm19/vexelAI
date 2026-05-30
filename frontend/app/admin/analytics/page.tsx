'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getMockDashboardData } from '@/lib/api';
import { useSidebarStore } from '@/lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

function formatTokensFn(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong" style={{ borderRadius: '12px', padding: '12px', fontSize: '12px' }}>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {
          p.name === 'cost' ? `$${p.value.toFixed(2)}` :
          p.name === 'requests' ? p.value :
          formatTokensFn(p.value)
        }</p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { isCollapsed } = useSidebarStore();
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('tv_user');
    if (!stored) { router.push('/login'); return; }
    setUser(JSON.parse(stored));
    setData(getMockDashboardData());
  }, [router]);

  if (!user || !data) return null;
  const { trends, members, stats } = data;

  const topUsers = [...members].sort((a, b) => b.quota.used - a.quota.used).slice(0, 5);
  const roleBreakdown = members.reduce((acc: any, m: any) => {
    acc[m.jobRole] = (acc[m.jobRole] || 0) + m.quota.used;
    return acc;
  }, {});
  const roleData = Object.entries(roleBreakdown).map(([name, value]) => ({ name, value }));

  return (
    <div className="flex min-h-screen">
      <Sidebar role="admin" userName={user.name} companyId={user.companyId} />
      <main style={{ marginLeft: isCollapsed ? '0' : '260px', padding: '48px 24px', transition: 'margin-left 250ms ease' }} className="flex-1">
        <div style={{ maxWidth: '1024px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2rem)', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>Analytics</h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Deep-dive into team AI usage patterns</p>
          </div>

          {/* Budget forecast */}
          <div className="glass" style={{ borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '16px' }}>📈 Month-End Budget Forecast</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Current Spend', value: `$${stats.totalCostUsd.toFixed(0)}`, color: '#7c3aed' },
                { label: 'Projected MTD', value: `$${(stats.totalCostUsd * 2.1).toFixed(0)}`, color: '#f59e0b' },
                { label: 'Budget Remaining', value: `$${(2000 - stats.totalCostUsd * 2.1).toFixed(0)}`, color: '#22c55e' },
                { label: 'Days Remaining', value: '14', color: '#06b6d4' },
              ].map(s => (
                <div key={s.label} className="glass-strong" style={{ borderRadius: '12px', padding: '16px' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>{s.label}</p>
                  <p style={{ fontSize: 'clamp(1.25rem, 2vw, 1.5rem)', fontWeight: 700, color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div className="glass" style={{ borderRadius: '16px', padding: '24px', overflow: 'hidden' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '16px' }}>Daily Requests</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trends.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="requests" name="requests" fill="#7c3aed" radius={[4, 4, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass" style={{ borderRadius: '16px', padding: '24px', overflow: 'hidden' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '16px' }}>Daily Cost Trend</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trends.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="cost" name="cost" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top users & role breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div className="glass" style={{ borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '16px' }}>🏆 Top Token Users</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {topUsers.map((m, i) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', width: '20px', textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <div className="gradient-primary" style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {m.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', flexShrink: 0, marginLeft: '8px' }}>{formatTokensFn(m.quota.used)}</span>
                      </div>
                      <div className="token-bar" style={{ height: '6px' }}>
                        <div style={{ height: '6px', borderRadius: '3px', width: `${m.quota.percent}%`, background: '#7c3aed', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass" style={{ borderRadius: '16px', padding: '24px', overflow: 'hidden' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '16px' }}>📊 Usage by Role</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={roleData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={formatTokensFn} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="tokens" fill="#06b6d4" radius={[0, 4, 4, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
