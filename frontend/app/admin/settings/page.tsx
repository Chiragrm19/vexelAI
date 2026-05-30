'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useSidebarStore } from '@/lib/store';
import { deleteWorkspace } from '@/lib/db';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { isCollapsed } = useSidebarStore();
  const [user, setUser] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    softLimit: 80,
    hardLimit: true,
    alertEmail: true,
    defaultModel: 'claude-3-haiku',
    compressionEnabled: true,
    cacheEnabled: true,
    routingEnabled: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem('tv_user');
    if (!stored) { router.push('/login'); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!user) return null;

  const toggleBtnStyle = (isOn: boolean) => ({
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    position: 'relative' as const,
    cursor: 'pointer',
    transition: 'background 150ms ease',
    flexShrink: 0 as const,
    border: 'none',
    outline: 'none',
    padding: 0,
    background: isOn ? '#7c3aed' : 'rgba(255,255,255,0.1)',
  });

  const toggleKnobStyle = (isOn: boolean) => ({
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'white',
    position: 'absolute' as const,
    top: '2px',
    left: isOn ? '22px' : '2px',
    transition: 'left 150ms ease',
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar role="admin" userName={user.name} companyId={user.companyId} />
      <main style={{ marginLeft: isCollapsed ? '0' : '260px', padding: '48px 24px', transition: 'margin-left 250ms ease' }} className="flex-1">
        <div style={{ maxWidth: '768px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2rem)', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>Settings</h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Configure global platform behaviour</p>
          </div>

          {/* Team Info */}
          <div className="glass" style={{ borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Team Identity</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Company ID</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ fontSize: '14px', fontFamily: 'monospace', color: 'rgb(196,167,255)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.companyId || 'COMP-7X9K2M'}</span>
                  <button onClick={() => navigator.clipboard.writeText(user.companyId || 'COMP-7X9K2M')}
                    style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '4px', transition: 'color 150ms' }}>Copy</button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Admin Email</label>
                <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px', color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              </div>
            </div>
          </div>

          {/* Quota Settings */}
          <div className="glass" style={{ borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Quota Enforcement</h2>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                <label style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Soft Limit Warning Threshold</label>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b' }}>{settings.softLimit}%</span>
              </div>
              <input type="range" min="50" max="95" step="5" value={settings.softLimit}
                onChange={e => setSettings(s => ({ ...s, softLimit: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: '#7c3aed', height: '8px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>
                <span>50%</span><span>95%</span>
              </div>
            </div>

            {/* Toggle: Hard Limit */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Hard Limit (Block at 100%)</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Block AI requests when quota exhausted</p>
              </div>
              <button onClick={() => setSettings(s => ({ ...s, hardLimit: !s.hardLimit }))} style={toggleBtnStyle(settings.hardLimit)}>
                <div style={toggleKnobStyle(settings.hardLimit)} />
              </button>
            </div>

            {/* Toggle: Email Alerts */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Email Alerts</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Notify admin when members hit thresholds</p>
              </div>
              <button onClick={() => setSettings(s => ({ ...s, alertEmail: !s.alertEmail }))} style={toggleBtnStyle(settings.alertEmail)}>
                <div style={toggleKnobStyle(settings.alertEmail)} />
              </button>
            </div>
          </div>

          {/* AI Features */}
          <div className="glass" style={{ borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>AI Optimization Features</h2>
            {[
              { key: 'compressionEnabled', label: 'Prompt Compression', desc: '25–30% token reduction via intelligent shortening', badge: 'Saves tokens' },
              { key: 'cacheEnabled', label: 'Semantic Caching', desc: '30–40% cache hit rate for similar prompts', badge: 'Saves cost' },
              { key: 'routingEnabled', label: 'Model Auto-Routing', desc: 'Route to cheapest viable model per task type', badge: 'Saves cost' },
            ].map(f => (
              <div key={f.key} className="glass-strong" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '12px', padding: '16px', gap: '16px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '14px', color: 'white' }}>{f.label}</p>
                    <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '999px', background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>{f.badge}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{f.desc}</p>
                </div>
                <button onClick={() => setSettings(s => ({ ...s, [f.key]: !(s as any)[f.key] }))} style={toggleBtnStyle((settings as any)[f.key])}>
                  <div style={toggleKnobStyle((settings as any)[f.key])} />
                </button>
              </div>
            ))}
          </div>

          {/* Danger Zone */}
          <div className="glass" style={{ borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(239,68,68,0.2)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444' }}>Danger Zone</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Reset Workspace & Clear Mock Data</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>This will permanently erase all local members, teams, quotas, and logs to start completely fresh and clean.</p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you absolutely sure you want to purge all data, reset the workspace, and start fresh? This cannot be undone.')) {
                    localStorage.clear();
                    router.push('/login');
                  }
                }}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'white',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }}
              >
                Reset Workspace
              </button>
            </div>
            
            {/* Delete Workspace */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', paddingTop: '16px', borderTop: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Delete Workspace entirely</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>This will permanently delete the workspace and remove all members, teams, and data from both local storage and the cloud database.</p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you absolutely sure you want to delete this workspace entirely? This action is irreversible.')) {
                    deleteWorkspace(user.companyId);
                    localStorage.removeItem('tv_user');
                    router.push('/login');
                  }
                }}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'white',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }}
              >
                Delete Workspace
              </button>
            </div>
          </div>

          <button onClick={handleSave}
            className={saved ? '' : 'gradient-primary'}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: 'white',
              border: 'none', cursor: 'pointer', minHeight: '48px', transition: 'all 250ms ease',
              background: saved ? '#22c55e' : undefined,
            }}
          >
            {saved ? '✓ Settings Saved' : 'Save Settings'}
          </button>
        </div>
      </main>
    </div>
  );
}
