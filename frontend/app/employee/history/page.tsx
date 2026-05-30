'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getUsageLogs } from '@/lib/db';
import { useSidebarStore } from '@/lib/store';

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function HistoryPage() {
  const router = useRouter();
  const { isCollapsed } = useSidebarStore();
  const [user, setUser] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'cached' | 'compressed'>('all');

  useEffect(() => {
    const stored = localStorage.getItem('tv_user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    setUser(u);

    // Retrieve real database logs for this user
    const dbLogs = getUsageLogs().filter(l => l.userId === u.id);
    setLogs(dbLogs);
  }, [router]);

  const filtered = logs.filter(l =>
    filter === 'all' ? true : filter === 'cached' ? l.cached : l.compressed
  );

  if (!user) return null;

  const totalTokens = logs.reduce((s, l) => s + l.totalTokens, 0);
  const cacheHits = logs.filter(l => l.cached).length;
  const compressed = logs.filter(l => l.compressed).length;
  const cacheHitRate = logs.length > 0 ? Math.round((cacheHits / logs.length) * 100) : 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="employee" userName={user.name} companyId={user.companyId} />
      <main style={{ marginLeft: isCollapsed ? '0' : '260px', padding: '48px 24px', transition: 'margin-left 250ms ease' }} className="flex-1">
        <div style={{ maxWidth: '1024px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2rem)', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>Usage History</h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>All your AI requests and token usage</p>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div className="glass" style={{ borderRadius: '16px', padding: '20px' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Total Requests</p>
              <p style={{ fontSize: 'clamp(1.25rem, 2vw, 1.5rem)', fontWeight: 700, color: 'white' }}>{logs.length}</p>
            </div>
            <div className="glass" style={{ borderRadius: '16px', padding: '20px' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Cache Hit Rate</p>
              <p style={{ fontSize: 'clamp(1.25rem, 2vw, 1.5rem)', fontWeight: 700, color: '#22d3ee' }}>{cacheHitRate}%</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{cacheHits} hits</p>
            </div>
            <div className="glass" style={{ borderRadius: '16px', padding: '20px' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Compressed Prompts</p>
              <p style={{ fontSize: 'clamp(1.25rem, 2vw, 1.5rem)', fontWeight: 700, color: '#f472b6' }}>{compressed}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>~25% token reduction each</p>
            </div>
          </div>

          {/* Filter */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['all', 'cached', 'compressed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  padding: '8px 16px', borderRadius: '12px', fontSize: '14px', transition: 'all 150ms ease',
                  textTransform: 'capitalize', cursor: 'pointer', minHeight: '40px', border: 'none',
                  ...(filter === f
                    ? { background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: 'white', fontWeight: 500 }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' })
                }}>
                {f === 'all' ? 'All Requests' : f === 'cached' ? '⚡ Cached' : '🗜 Compressed'}
              </button>
            ))}
          </div>

          {/* Log list */}
          <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>
                  No requests found matching this filter.
                </div>
              ) : (
                filtered.map((log, i) => (
                  <div key={log.id} style={{
                    padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', transition: 'background 150ms ease',
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}>
                    <div style={{ fontSize: '20px', flexShrink: 0, width: '32px', textAlign: 'center' }}>{log.taskType === 'code' ? '💻' : log.taskType === 'qa' ? '💬' : '📊'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'white' }}>{log.modelUsed}</span>
                        {log.cached && <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '999px', background: 'rgba(34,211,238,0.15)', color: '#22d3ee' }}>⚡ Cached</span>}
                        {log.compressed && <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '999px', background: 'rgba(244,114,182,0.15)', color: '#f472b6' }}>🗜 Compressed</span>}
                      </div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textTransform: 'capitalize' }}>{log.taskType} · {timeAgo(log.timestamp)}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{log.totalTokens.toLocaleString()} tokens</p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>${log.costUsd.toFixed(5)}</p>
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
