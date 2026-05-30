'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useSidebarStore } from '@/lib/store';

const PROVIDERS = [
  { id: '1', name: 'Anthropic Claude', models: ['claude-3.5-sonnet', 'claude-3-haiku', 'claude-3-opus'], color: '#7c3aed', monthly: 500_000_000, cost: 3.00, isActive: true, requests: 2847 },
  { id: '2', name: 'OpenAI GPT', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'], color: '#22c55e', monthly: 200_000_000, cost: 5.00, isActive: true, requests: 1204 },
  { id: '3', name: 'Cohere', models: ['command-r-plus', 'command-r'], color: '#f472b6', monthly: 100_000_000, cost: 2.50, isActive: false, requests: 0 },
];

function formatTokensFn(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toString();
}

export default function AdminProvidersPage() {
  const router = useRouter();
  const { isCollapsed } = useSidebarStore();
  const [user, setUser] = useState<any>(null);
  const [providers, setProviders] = useState(PROVIDERS);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: 'Claude', apiKey: '', monthly: '500000000', cost: '3.00' });

  useEffect(() => {
    const stored = localStorage.getItem('tv_user');
    if (!stored) { router.push('/login'); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const newProv = {
      id: Date.now().toString(), name: form.name,
      models: ['default'], color: '#06b6d4',
      monthly: parseInt(form.monthly), cost: parseFloat(form.cost),
      isActive: true, requests: 0,
    };
    setProviders(p => [...p, newProv]);
    setShowAdd(false);
    setForm({ name: 'Claude', apiKey: '', monthly: '500000000', cost: '3.00' });
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="admin" userName={user.name} companyId={user.companyId} />
      <main style={{ marginLeft: isCollapsed ? '0' : '260px', padding: '48px 24px', transition: 'margin-left 250ms ease' }} className="flex-1">
        <div style={{ maxWidth: '1024px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2rem)', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>AI Providers</h1>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Manage enterprise API keys and token budgets</p>
            </div>
            <button onClick={() => setShowAdd(true)} className="gradient-primary"
              style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minHeight: '44px', transition: 'opacity 150ms ease' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Provider
            </button>
          </div>

          {/* Provider cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {providers.map(p => (
              <div key={p.id} className="glass" style={{ borderRadius: '16px', padding: '24px', opacity: p.isActive ? 1 : 0.5, transition: 'opacity 250ms ease' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0, background: p.color + '25', border: `1px solid ${p.color}40` }}>
                    {p.name.includes('Claude') ? '🟣' : p.name.includes('GPT') ? '🟢' : '🩷'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>{p.name}</h3>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '999px', background: p.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)', color: p.isActive ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
                        {p.isActive ? '● Active' : '● Inactive'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      {p.models.map(m => (
                        <span key={m} className="glass" style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '999px', color: 'rgba(255,255,255,0.5)' }}>{m}</span>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
                      <div>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>Monthly Budget</p>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{formatTokensFn(p.monthly)} tokens</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>Cost / 1M tokens</p>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>${p.cost.toFixed(2)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>Requests this month</p>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{p.requests.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignSelf: 'flex-start' }}>
                    <button onClick={() => setProviders(ps => ps.map(x => x.id === p.id ? { ...x, isActive: !x.isActive } : x))}
                      className="glass" style={{ padding: '8px 12px', borderRadius: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', cursor: 'pointer', minHeight: '36px', transition: 'all 150ms ease' }}>
                      {p.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => setProviders(ps => ps.filter(x => x.id !== p.id))}
                      className="glass" style={{ padding: '8px 12px', borderRadius: '12px', fontSize: '12px', color: 'rgba(239,68,68,0.7)', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', cursor: 'pointer', minHeight: '36px', transition: 'all 150ms ease' }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Model routing info */}
          <div className="glass" style={{ borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '16px' }}>🤖 Intelligent Model Routing</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {[
                { type: 'Code & Debug', model: 'claude-3.5-sonnet', reason: 'Best code quality', color: '#7c3aed' },
                { type: 'Q&A & Summaries', model: 'claude-3-haiku', reason: 'Fastest & cheapest', color: '#06b6d4' },
                { type: 'General Tasks', model: 'gpt-4o-mini', reason: 'Balanced cost/quality', color: '#22c55e' },
              ].map(r => (
                <div key={r.type} className="glass-strong" style={{ borderRadius: '12px', padding: '16px' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>{r.type}</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{r.model}</p>
                  <p style={{ fontSize: '12px', marginTop: '4px', color: r.color }}>{r.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Add Provider Modal */}
      {showAdd && (
        <div className="modal-overlay">
          <div className="glass-strong modal-content" style={{ maxWidth: '480px', padding: '32px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '24px' }}>Add AI Provider</h3>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Provider</label>
                <select value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '12px', fontSize: '14px', color: 'white', background: '#0f0f1b', border: '1px solid rgba(255,255,255,0.1)', height: '44px' }}>
                  {['Claude', 'GPT-4', 'GPT-4o-mini', 'Cohere', 'Llama', 'Gemini'].map(n => (
                    <option key={n} value={n} style={{ background: '#0f0f1b' }}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Enterprise API Key</label>
                <input type="password" value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                  placeholder="sk-ant-..." required
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '12px', fontSize: '14px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', height: '44px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Monthly Token Budget</label>
                  <input type="number" value={form.monthly} onChange={e => setForm(f => ({ ...f, monthly: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', fontSize: '14px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', height: '44px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Cost / 1M tokens ($)</label>
                  <input type="number" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', fontSize: '14px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', height: '44px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAdd(false)} className="glass" style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '14px', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', cursor: 'pointer', minHeight: '44px', transition: 'all 150ms ease' }}>Cancel</button>
                <button type="submit" className="gradient-primary" style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: 'white', border: 'none', cursor: 'pointer', minHeight: '44px', transition: 'opacity 150ms ease' }}>Add Provider</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
