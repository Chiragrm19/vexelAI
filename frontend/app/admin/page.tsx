'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useSidebarStore } from '@/lib/store';
import { getTeams, createTeam, getMembers, addInvitedMember, updateMemberQuota, getCompanyApiConfig, updateCompanyApiConfig } from '@/lib/db';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function formatTokensFn(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatCostFn(usd: number): string {
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}K`;
  return `$${usd.toFixed(2)}`;
}

const STATUS_COLOR = { healthy: '#22c55e', warning: '#f59e0b', blocked: '#ef4444' };
const STATUS_LABEL = { healthy: '🟢 Healthy', warning: '🟡 Warning', blocked: '🔴 Blocked' };

function StatCard({ title, value, sub, accent, icon }: any) {
  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-3 hover:border-white/15 transition-all">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{title}</p>
        <span className="text-white/20">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white count-up">{value}</p>
      {sub && <p className="text-xs text-white/30 truncate">{sub}</p>}
      {accent && <div className="h-px w-12 rounded-full" style={{ background: accent }} />}
    </div>
  );
}

function QuotaBar({ percent, status }: { percent: number; status: string }) {
  const color = STATUS_COLOR[status as keyof typeof STATUS_COLOR] || '#22c55e';
  return (
    <div className="token-bar flex-1">
      <div className="token-bar-fill animate-pulse-slow" style={{ width: `${Math.min(100, percent)}%`, background: color }} />
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl p-3 text-xs">
      <p className="text-white/60 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.name === 'cost' ? `$${p.value.toFixed(2)}` : formatTokensFn(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { isCollapsed } = useSidebarStore();
  const [user, setUser] = useState<any>(null);
  
  // State
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [members, setMembers] = useState<any[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  
  // Invite form state
  const [inviteForm, setInviteForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    jobRole: 'SDE', 
    quota: 100000000 
  });
  
  // Edit quota state
  const [editMember, setEditMember] = useState<any>(null);
  const [newAlloc, setNewAlloc] = useState(0);

  // AI subscription state
  const [apiProvider, setApiProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [isSavingApi, setIsSavingApi] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load configuration from database
  useEffect(() => {
    const stored = localStorage.getItem('tv_user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'ADMIN') { router.push('/employee'); return; }
    setUser(u);
    
    // Load existing API config if exists
    const config = getCompanyApiConfig(u.companyId);
    if (config) {
      setApiProvider(config.provider);
      setApiKey(config.apiKey);
    }

    refreshData(u.companyId);
  }, [router]);

  function handleSaveApi(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setIsSavingApi(true);
    setTimeout(() => {
      updateCompanyApiConfig(user.companyId, apiProvider, apiKey);
      setIsSavingApi(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  }

  function refreshData(companyId: string) {
    const allTeams = getTeams().filter(t => t.companyId === companyId);
    setTeams(allTeams);
    
    // Choose active team
    let activeTeamId = selectedTeamId;
    if (!activeTeamId && allTeams.length > 0) {
      activeTeamId = allTeams[0].id;
      setSelectedTeamId(allTeams[0].id);
    }
    
    const allMembers = getMembers().filter(m => m.companyId === companyId);
    if (activeTeamId) {
      setMembers(allMembers.filter(m => m.teamId === activeTeamId));
    } else {
      setMembers([]);
    }
  }

  // Handle selected team change
  useEffect(() => {
    if (user) {
      const allMembers = getMembers().filter(m => m.companyId === user.companyId);
      if (selectedTeamId) {
        setMembers(allMembers.filter(m => m.teamId === selectedTeamId));
      } else {
        setMembers([]);
      }
    }
  }, [selectedTeamId]);

  function handleCreateTeamSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    const team = createTeam(newTeamName.trim(), user.companyId);
    setSelectedTeamId(team.id);
    setNewTeamName('');
    setShowCreateTeam(false);
    refreshData(user.companyId);
  }

  function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email || !inviteForm.phone) return;
    
    addInvitedMember(
      inviteForm.name,
      inviteForm.email,
      inviteForm.phone,
      inviteForm.jobRole,
      selectedTeamId,
      user.companyId,
      inviteForm.quota
    );
    
    // Reset invite form
    setInviteForm({ name: '', email: '', phone: '', jobRole: 'SDE', quota: 100000000 });
    setShowInvite(false);
    refreshData(user.companyId);
  }

  function handleAdjustQuota() {
    if (!editMember) return;
    updateMemberQuota(editMember.id, newAlloc);
    setEditMember(null);
    refreshData(user.companyId);
  }

  if (!user) return null;

  // Calculate live stats based on loaded members of the selected team
  const totalAllocated = members.reduce((acc, m) => acc + (m.quota?.allocated || 0), 0);
  const totalUsed = members.reduce((acc, m) => acc + (m.quota?.used || 0), 0);
  const percentUsed = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;
  const totalCostUsd = (totalUsed / 1_000_000) * 3.0; // $3.00 per million tokens

  const totalSavedCaching = members.reduce((acc, m) => acc + (m.savings?.savedFromCaching || 0), 0);
  const totalSavedCompression = members.reduce((acc, m) => acc + (m.savings?.savedFromCompression || 0), 0);
  const totalSaved = totalSavedCaching + totalSavedCompression;
  const estCostSavings = (totalSaved / 1_000_000) * 3.0;

  // Create clean daily trend lines based on members' token usage
  const generateChartTrends = () => {
    const days = 14;
    const trends = [];
    const baseUsage = totalUsed / days;
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      // Distribute usage with some random variance
      const variance = 0.7 + Math.random() * 0.6;
      const tokensVal = Math.round(baseUsage * variance);
      trends.push({
        date: dateStr,
        tokens: totalUsed > 0 ? tokensVal : 0,
      });
    }
    return trends;
  };

  const trendData = generateChartTrends();
  const activeTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="admin" userName={user.name} companyId={user.companyId} />

      <main style={{ marginLeft: isCollapsed ? '0' : '260px', padding: '48px 24px', transition: 'margin-left 250ms ease' }} className="flex-1">
        <div style={{ maxWidth: '1024px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Header & Switcher */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2rem)', fontWeight: 700, color: 'white', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Admin Center</h1>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
                Live workspace governance
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {teams.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>Team:</span>
                  <select 
                    value={selectedTeamId} 
                    onChange={e => setSelectedTeamId(e.target.value)}
                    style={{ padding: '0 12px', height: '40px', borderRadius: '12px', fontSize: '12px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', cursor: 'pointer' }}
                  >
                    {teams.map(t => (
                      <option key={t.id} value={t.id} style={{ background: '#0f0f1b' }}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button 
                onClick={() => setShowCreateTeam(true)}
                className="glass"
                style={{ padding: '8px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '40px', transition: 'all 150ms ease' }}
              >
                + New Team
              </button>
            </div>
          </div>

          {/* If No Teams Exist -> Show Empty State Card */}
          {teams.length === 0 ? (
            <div className="glass rounded-[24px] p-8 lg:p-12 text-center border border-white/6 shadow-[0_0_50px_rgba(0,0,0,0.3)] max-w-lg mx-auto fade-in mt-10">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Create a team to begin</h2>
              <p className="text-sm text-white/40 mt-2 max-w-sm mx-auto mb-8">
                Organizations on TokenVault are structured around teams. Create your first team to allocate quotas and invite members.
              </p>
              
              <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
                <input 
                  value={newTeamName} 
                  onChange={e => setNewTeamName(e.target.value)} 
                  required 
                  placeholder="e.g. Engineering, Product, Marketing" 
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 bg-white/5 border border-white/10 focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/40 transition-all text-center" 
                />
                <button 
                  type="submit" 
                  className="w-full h-[44px] rounded-xl font-semibold text-sm text-white gradient-primary hover:opacity-90 active:scale-[0.99] transition-all"
                >
                  Create First Team →
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Controls bar (Invite Member) */}
              <div className="glass" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '16px', gap: '12px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, padding: '0 8px' }}>
                  Active Team: <span style={{ color: 'rgb(196,167,255)', fontWeight: 700 }}>{activeTeam?.name}</span>
                </div>
                <button 
                  onClick={() => setShowInvite(true)}
                  className="gradient-primary"
                  style={{ padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '40px', transition: 'opacity 150ms ease' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Invite Member to Team
                </button>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                <StatCard
                  title="Tokens Allocated"
                  value={formatTokensFn(totalAllocated)}
                  sub={`${percentUsed}% utilized`}
                  accent="linear-gradient(90deg, #7c3aed, #06b6d4)"
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
                />
                <StatCard
                  title="Total Cost (MTD)"
                  value={formatCostFn(totalCostUsd)}
                  sub={`${members.length} members cost`}
                  accent="#7c3aed"
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                />
                <StatCard
                  title="Tokens Saved"
                  value={formatTokensFn(totalSaved)}
                  sub={`$${estCostSavings.toFixed(2)} cost saved`}
                  accent="#22c55e"
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
                />
                <StatCard
                  title="Team Members"
                  value={members.length}
                  sub={`${members.filter(m => m.quota.status === 'invited').length} pending, ${members.filter(m => m.status === 'active').length} active`}
                  accent="#f59e0b"
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
                />
              </div>

              {/* Savings breakdown & Chart */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                <div className="glass" style={{ borderRadius: '16px', padding: '24px' }}>
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Savings Efficiency</p>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-white/60 mb-2">
                        <span>Semantic Cache</span>
                        <span className="text-green-400 font-medium">{formatTokensFn(totalSavedCaching)} saved</span>
                      </div>
                      <div className="token-bar"><div className="token-bar-fill healthy" style={{ width: totalSaved > 0 ? `${(totalSavedCaching/totalSaved)*100}%` : '0%' }} /></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-white/60 mb-2">
                        <span>Prompt Compression</span>
                        <span className="text-cyan-400 font-medium">{formatTokensFn(totalSavedCompression)} saved</span>
                      </div>
                      <div className="token-bar"><div className="token-bar-fill" style={{ width: totalSaved > 0 ? `${(totalSavedCompression/totalSaved)*100}%` : '0%', background: '#06b6d4' }} /></div>
                    </div>
                    <div className="pt-4 border-t border-white/6 flex justify-between items-center mt-4">
                      <span className="text-xs text-white/40">Total MTD savings</span>
                      <span className="text-sm font-bold text-green-400">~{formatCostFn(estCostSavings)}</span>
                    </div>
                  </div>
                </div>

                <div className="glass" style={{ borderRadius: '16px', padding: '24px', overflow: 'hidden', gridColumn: 'span 1 / -1' }}>
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Active usage stats (14 days)</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="tokGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={formatTokensFn} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="tokens" name="tokens" stroke="#7c3aed" fill="url(#tokGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Members List */}
              <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
                  <h2 className="text-sm font-semibold text-white">Team Members</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">{members.length} total</span>
                </div>
                <div className="divide-y divide-white/5">
                  {members.length === 0 ? (
                    <div className="py-12 text-center text-xs text-white/30 font-medium">
                      No members in this team. Invite someone below!
                    </div>
                  ) : (
                    members.map(m => (
                      <div key={m.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.01] transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-sm font-bold text-white shrink-0">
                            {m.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{m.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{m.jobRole}</span>
                              {m.status === 'invited' ? (
                                <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">Invited</span>
                              ) : (
                                <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded border border-green-400/20">Active</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-white/30">{m.email}</span>
                              {m.status === 'invited' && (
                                <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20 select-all" title="Share this VexelID with employee to join">
                                  ID: {m.vexelId}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 justify-between md:justify-end">
                          <div className="flex items-center gap-3 w-40">
                            <QuotaBar percent={m.quota.percent} status={m.quota.status} />
                            <span className="text-xs font-semibold w-8 text-right" style={{ color: STATUS_COLOR[m.quota.status as keyof typeof STATUS_COLOR] }}>
                              {m.quota.percent}%
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold text-white/80">{formatTokensFn(m.quota.used)} / {formatTokensFn(m.quota.allocated)}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: STATUS_COLOR[m.quota.status as keyof typeof STATUS_COLOR] }}>
                              {STATUS_LABEL[m.quota.status as keyof typeof STATUS_COLOR] || '🟢 Healthy'}
                            </p>
                          </div>

                          <button 
                            onClick={() => { setEditMember(m); setNewAlloc(m.quota.allocated); }}
                            className="text-xs px-3 py-1.5 rounded-xl glass text-purple-300 hover:text-white hover:bg-purple-500/20 transition-all font-semibold"
                          >
                            Adjust
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Workspace AI Subscription API configuration */}
              <div className="glass" style={{ borderRadius: '16px', padding: '24px' }}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="max-w-md">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      🔌 Workspace AI Subscription API
                    </h3>
                    <p className="text-xs text-white/40 mt-1 leading-relaxed">
                      Connect your team to a subscribed AI provider. When configured, employee prompts will route through this subscription and automatically count towards their individual token quotas.
                    </p>
                  </div>

                  <form onSubmit={handleSaveApi} className="flex-1 w-full space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-white/40 uppercase font-semibold mb-1">AI Provider</label>
                        <select 
                          value={apiProvider} 
                          onChange={e => setApiProvider(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs text-white bg-[#0f0f1b] border border-white/10 focus:border-purple-500/60 focus:outline-none"
                        >
                          <option value="openai" className="bg-[#0f0f1b]">OpenAI (GPT-4o)</option>
                          <option value="anthropic" className="bg-[#0f0f1b]">Anthropic (Claude 3.5)</option>
                          <option value="gemini" className="bg-[#0f0f1b]">Google Gemini Pro</option>
                          <option value="vexel" className="bg-[#0f0f1b]">Vexel Custom Endpoint</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-white/40 uppercase font-semibold mb-1">API Secret Key</label>
                        <input 
                          type="password"
                          value={apiKey} 
                          onChange={e => setApiKey(e.target.value)}
                          placeholder="e.g. sk-proj-..."
                          className="w-full px-3 py-2 rounded-xl text-xs text-white bg-[#0f0f1b] border border-white/10 focus:border-purple-500/60 focus:outline-none placeholder-white/20"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 items-center">
                      {saveSuccess && (
                        <span className="text-xs text-green-400 font-medium animate-pulse-slow">✓ Configuration saved successfully</span>
                      )}
                      <button 
                        type="submit" 
                        disabled={isSavingApi}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white gradient-primary hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                      >
                        {isSavingApi ? 'Saving...' : 'Save Config'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}

        </div>
      </main>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="modal-overlay">
          <form onSubmit={handleCreateTeamSubmit} className="glass-strong modal-content" style={{ maxWidth: '400px', padding: '32px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="text-lg font-bold text-white mb-2">Create New Team</h3>
            <p className="text-xs text-white/40 mb-6">Group your members together to control quotas collectively</p>
            <input 
              value={newTeamName} 
              onChange={e => setNewTeamName(e.target.value)} 
              required 
              placeholder="e.g. Engineering, Sales, Support" 
              className="w-full px-4 py-3 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-purple-500/60 focus:outline-none" 
            />
            <div className="flex gap-3 mt-6">
              <button 
                type="button" 
                onClick={() => setShowCreateTeam(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-white/50 glass hover:text-white transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-1 py-2.5 rounded-xl text-sm text-white font-semibold gradient-primary hover:opacity-90 transition-all"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInvite && (
        <div className="modal-overlay">
          <form onSubmit={handleInviteSubmit} className="glass-strong modal-content" style={{ maxWidth: '480px', padding: '32px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="text-lg font-bold text-white mb-1">Invite Team Member</h3>
            <p className="text-xs text-white/40 mb-6">Invited member will receive an invitation containing their unique VexelID</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-white/40 uppercase font-semibold mb-1">Full Name</label>
                <input 
                  value={inviteForm.name} 
                  onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                  required 
                  placeholder="e.g. Sarah Connor"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-purple-500/60 focus:outline-none" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] text-white/40 uppercase font-semibold mb-1">Work Email</label>
                <input 
                  type="email"
                  value={inviteForm.email} 
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  required 
                  placeholder="e.g. sarah@cyberdyne.com"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-purple-500/60 focus:outline-none" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] text-white/40 uppercase font-semibold mb-1">Phone Number</label>
                <input 
                  value={inviteForm.phone} 
                  onChange={e => setInviteForm(f => ({ ...f, phone: e.target.value }))}
                  required 
                  placeholder="e.g. +1 555-0199"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-purple-500/60 focus:outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-semibold mb-1">Job Role</label>
                  <select 
                    value={inviteForm.jobRole} 
                    onChange={e => setInviteForm(f => ({ ...f, jobRole: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white bg-[#0f0f1b] border border-white/10 focus:border-purple-500/60 focus:outline-none"
                  >
                    {['SDE', 'Product Manager', 'Designer', 'Marketing', 'Ops', 'QA'].map(r => (
                      <option key={r} value={r} className="bg-gray-900">{r}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-semibold mb-1">Token Quota</label>
                  <select 
                    value={inviteForm.quota} 
                    onChange={e => setInviteForm(f => ({ ...f, quota: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white bg-[#0f0f1b] border border-white/10 focus:border-purple-500/60 focus:outline-none"
                  >
                    <option value={25000000} className="bg-[#0f0f1b]">25M</option>
                    <option value={50000000} className="bg-[#0f0f1b]">50M</option>
                    <option value={100000000} className="bg-[#0f0f1b]">100M</option>
                    <option value={250000000} className="bg-[#0f0f1b]">250M</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                type="button" 
                onClick={() => setShowInvite(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-white/50 glass hover:text-white transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-1 py-2.5 rounded-xl text-sm text-white font-semibold gradient-primary hover:opacity-90 transition-all"
              >
                Send Invite
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quota Adjust Modal */}
      {editMember && (
        <div className="modal-overlay">
          <div className="glass-strong modal-content" style={{ maxWidth: '400px', padding: '32px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="text-lg font-bold text-white mb-1">Adjust Quota</h3>
            <p className="text-xs text-white/40 mb-6">{editMember.name} · {editMember.jobRole}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-2">New Token Allocation</label>
                <input type="number" value={newAlloc}
                  onChange={e => setNewAlloc(parseInt(e.target.value) || 0)}
                  step={5_000_000}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-purple-500/60 focus:outline-none" />
                <p className="text-xs text-white/30 mt-1">= {formatTokensFn(newAlloc)} tokens</p>
              </div>
              <div className="flex gap-2">
                {[25_000_000, 50_000_000, 100_000_000, 250_000_000].map(v => (
                  <button key={v} onClick={() => setNewAlloc(v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs transition-all ${newAlloc === v ? 'bg-purple-500/30 text-purple-300' : 'glass text-white/40 hover:text-white'}`}>
                    {formatTokensFn(v)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditMember(null)} className="flex-1 py-2.5 rounded-xl text-sm text-white/50 glass hover:text-white transition-all">Cancel</button>
              <button onClick={handleAdjustQuota} className="flex-1 py-2.5 rounded-xl text-sm text-white font-semibold gradient-primary hover:opacity-90 transition-all">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
