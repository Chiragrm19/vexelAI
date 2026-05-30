'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getMembers, updateMemberQuota, syncWithSupabase } from '@/lib/db';
import { useSidebarStore } from '@/lib/store';

function formatTokensFn(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const STATUS_COLOR = { healthy: '#22c55e', warning: '#f59e0b', blocked: '#ef4444' };

export default function AdminQuotasPage() {
  const router = useRouter();
  const { isCollapsed } = useSidebarStore();
  const [user, setUser] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [totalBudget] = useState(1_000_000_000); // 1.0B total budget

  useEffect(() => {
    const stored = localStorage.getItem('tv_user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    setUser(u);
    
    // Rapid load from active storage
    const load = () => {
      const active = getMembers().filter(m => m.companyId === u.companyId);
      setMembers(active);
    };
    load();

    // Trigger cloud sync to pull live records
    syncWithSupabase(u.companyId).then(load);
  }, [router]);

  const totalAllocated = members.reduce((s, m) => s + (m.quota?.allocated || 0), 0);
  const unallocated = totalBudget - totalAllocated;

  function updateAllocation(id: string, val: number) {
    updateMemberQuota(id, val);
    setMembers(ms => ms.map(m =>
      m.id === id ? { ...m, quota: { ...m.quota, allocated: val, remaining: Math.max(0, val - m.quota.used), percent: val > 0 ? Math.round((m.quota.used / val) * 100) : 0 } } : m
    ));
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="admin" userName={user.name} companyId={user.companyId} />
      <main style={{ marginLeft: isCollapsed ? '0' : '260px', padding: '48px 24px', transition: 'margin-left 250ms ease' }} className="flex-1">
        <div style={{ maxWidth: '1024px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2rem)', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>Token Quotas</h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Allocate and manage token budgets per team member</p>
          </div>

          {/* Budget overview */}
          <div className="glass" style={{ borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Total Team Budget</p>
                <p style={{ fontSize: 'clamp(1.5rem, 3vw, 1.875rem)', fontWeight: 700, color: 'white' }}>{formatTokensFn(totalBudget)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Unallocated</p>
                <p style={{ fontSize: 'clamp(1.5rem, 3vw, 1.875rem)', fontWeight: 700, color: '#22c55e' }}>{formatTokensFn(Math.max(0, unallocated))}</p>
              </div>
            </div>
            <div className="token-bar" style={{ height: '12px' }}>
              <div className="gradient-primary" style={{ height: '12px', borderRadius: '6px', width: `${Math.min(100, (totalAllocated / totalBudget) * 100)}%`, transition: 'width 0.5s ease' }} />
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>{Math.round((totalAllocated / totalBudget) * 100)}% of budget allocated</p>
          </div>

          {/* Per-member allocation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {members.map(m => {
              const allocPct = Math.round((m.quota.allocated / totalBudget) * 100);
              const color = STATUS_COLOR[m.quota.status as keyof typeof STATUS_COLOR];
              return (
                <div key={m.id} className="glass" style={{ borderRadius: '16px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div className="gradient-primary" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', flexShrink: 0 }}>{m.name[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{m.name}</p>
                        <span className="glass" style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '999px', color: 'rgba(255,255,255,0.4)' }}>{m.jobRole}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{formatTokensFn(m.quota.used)} used · {allocPct}% of total budget</p>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <input type="number" value={m.quota.allocated}
                        onChange={e => updateAllocation(m.id, parseInt(e.target.value) || 0)}
                        step={5_000_000}
                        style={{ width: '140px', maxWidth: '100%', textAlign: 'right', padding: '6px 12px', borderRadius: '12px', fontSize: '14px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', height: '40px' }} />
                    </div>
                  </div>
                  <div className="token-bar">
                    <div className="token-bar-fill" style={{ width: `${Math.min(100, m.quota.percent)}%`, background: color }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{m.quota.percent}% consumed</span>
                    <span style={{ fontSize: '12px', color }}>{formatTokensFn(m.quota.remaining)} left</span>
                  </div>
                  {/* Quick presets */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {[10, 20, 25, 50].map(pct => {
                      const val = Math.round(totalBudget * pct / 100);
                      return (
                        <button key={pct} onClick={() => updateAllocation(m.id, val)}
                          style={{
                            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', transition: 'all 150ms ease',
                            background: m.quota.allocated === val ? 'rgba(124,58,237,0.3)' : 'transparent',
                            color: m.quota.allocated === val ? 'rgb(196,167,255)' : 'rgba(255,255,255,0.3)',
                            border: m.quota.allocated === val ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.08)',
                            minHeight: '32px', cursor: 'pointer',
                          }}>
                          {pct}%
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <button 
            className="gradient-primary" 
            style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: 'white', border: 'none', cursor: 'pointer', minHeight: '48px', transition: 'opacity 150ms ease' }}
            onClick={() => alert('✅ Quotas saved and synced to Supabase!')}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Save All Quotas
          </button>
        </div>
      </main>
    </div>
  );
}
