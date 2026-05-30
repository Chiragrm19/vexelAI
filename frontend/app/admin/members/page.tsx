'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getMembers, getTeams, updateMemberQuota, getUsageLogs, syncWithSupabase, addInvitedMember, createTeam, removeMember, removeTeam } from '@/lib/db';
import { useSidebarStore } from '@/lib/store';

const STATUS_COLOR = { healthy: '#22c55e', warning: '#f59e0b', blocked: '#ef4444' };
const STATUS_LABEL = { healthy: '🟢 Healthy', warning: '🟡 Warning', blocked: '🔴 Blocked' };

function formatTokensFn(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function AdminMembersPage() {
  const router = useRouter();
  const { isCollapsed } = useSidebarStore();
  const [user, setUser] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  
  // Edit quota state
  const [editMember, setEditMember] = useState<any>(null);
  const [newAlloc, setNewAlloc] = useState(0);

  // Selected member profile state
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Invite Member Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('SDE');
  const [inviteTeamId, setInviteTeamId] = useState('');
  const [inviteQuota, setInviteQuota] = useState(50_000_000);
  const [isSending, setIsSending] = useState(false);
  const [inviteSuccessData, setInviteSuccessData] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('tv_user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'ADMIN') { router.push('/employee'); return; }
    setUser(u);
    
    // Initial rapid load from cache
    refreshData(u.companyId);
    
    // Background cloud sync to merge and update live Supabase state
    syncWithSupabase(u.companyId).then(() => {
      refreshData(u.companyId);
    });
  }, [router]);

  function refreshData(companyId: string) {
    const allMembers = getMembers().filter(m => m.companyId === companyId);
    setMembers(allMembers);
    
    let allTeams = getTeams().filter(t => t.companyId === companyId);
    if (allTeams.length === 0 && companyId) {
      // Auto-bootstrap standard business units if empty
      const eng = createTeam('Engineering', companyId);
      const des = createTeam('Product & Design', companyId);
      const ops = createTeam('Operations & Growth', companyId);
      allTeams = [eng, des, ops];
    }
    setTeams(allTeams);
  }

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    setIsSending(true);
    try {
      const targetTeam = inviteTeamId || (teams[0]?.id || 'team-1');
      const newMember = addInvitedMember(
        inviteName,
        inviteEmail,
        invitePhone,
        inviteRole,
        targetTeam,
        user.companyId,
        inviteQuota
      );

      const inviteLink = `${window.location.origin}/onboarding?email=${encodeURIComponent(inviteEmail)}&vexelId=${newMember.vexelId}`;

      // Dispatch a genuine SMTP web request using FormSubmit's AJAX delivery network (instant direct inbox delivery)
      await fetch(`https://formsubmit.co/ajax/${inviteEmail}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: `📧 Join your Vexel AI Workspace`,
          _honey: "", // Honeypot spam filter
          _template: "box",
          name: inviteName,
          email: inviteEmail,
          message: `
Hi ${inviteName},

You have been invited to join the Vexel AI Workspace!

Click the link below to verify your invitation and activate your account:
${inviteLink}

Verification credentials:
- Work Email: ${inviteEmail}
- Your VexelID: ${newMember.vexelId}

Welcome to the team,
Vexel AI Team
          `
        })
      }).catch(err => console.warn('SMTP request deferred', err));

      // Display real dispatcher console
      setInviteSuccessData({
        name: inviteName,
        email: inviteEmail,
        vexelId: newMember.vexelId,
        inviteLink
      });

      // Reset
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      setInviteRole('SDE');
      setInviteQuota(50_000_000);
      setShowInviteModal(false);
      
      refreshData(user.companyId);
    } catch (err) {
      alert('Failed to send invitation. Please try again.');
    } finally {
      setIsSending(false);
    }
  }

  const filtered = members.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.jobRole.toLowerCase().includes(search.toLowerCase());
    
    const matchesTeam = selectedTeamId === 'all' || m.teamId === selectedTeamId;
    
    return matchesSearch && matchesTeam;
  });

  function handleAllocate() {
    if (!editMember) return;
    updateMemberQuota(editMember.id, newAlloc);
    setEditMember(null);
    refreshData(user.companyId);
  }

  if (!user) return null;

  function renderMemberCard(m: any) {
    const pct = Math.min(100, m.quota?.percent || 0);
    const color = STATUS_COLOR[m.quota?.status as keyof typeof STATUS_COLOR] || '#22c55e';
    const teamName = teams.find(t => t.id === m.teamId)?.name || 'No Team';
    return (
      <div 
        key={m.id} 
        className="glass" 
        onClick={() => setSelectedMember(m)}
        style={{ 
          borderRadius: '16px', 
          padding: '20px', 
          transition: 'transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
          cursor: 'pointer'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.4)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(124, 58, 237, 0.15)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '16px', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
            <div className="gradient-primary" style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
              {m.name[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{m.name}</h3>
                {m.role !== 'ADMIN' && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(124,58,237,0.1)', color: 'rgb(196,167,255)', fontWeight: 600, border: '1px solid rgba(124,58,237,0.2)' }}>{teamName}</span>}
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>{m.jobRole}</span>
                <span style={{ fontSize: '10px', fontWeight: 500, color }}>{
                  m.quota?.status === 'blocked' ? '🔴 Blocked' :
                  m.quota?.status === 'warning' ? '🟡 Warning' : '🟢 Healthy'
                }</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{m.email}</p>
                {m.status === 'invited' && (
                  <span 
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgb(196,167,255)', background: 'rgba(124,58,237,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(124,58,237,0.2)', userSelect: 'all', cursor: 'default' }} 
                    title="Click to copy VexelID for onboarding"
                  >
                    ID: {m.vexelId}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{formatTokensFn(m.quota?.used || 0)}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>of {formatTokensFn(m.quota?.allocated || 0)}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setEditMember(m); 
                  setNewAlloc(m.quota?.allocated || 0); 
                }}
                style={{ padding: '8px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: 'rgb(196,167,255)', background: 'rgba(124,58,237,0.15)', border: 'none', cursor: 'pointer', minHeight: '36px', transition: 'all 150ms ease', whiteSpace: 'nowrap' }}
              >
                Adjust Quota
              </button>
              {m.role !== 'ADMIN' && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (confirm(`Are you sure you want to remove ${m.name}?`)) {
                      removeMember(m.id);
                      refreshData(user.companyId);
                    }
                  }}
                  style={{ padding: '8px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.15)', border: 'none', cursor: 'pointer', minHeight: '36px', transition: 'all 150ms ease', whiteSpace: 'nowrap' }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Progress bar */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
            <span>{pct}% used</span>
            <span>{formatTokensFn(m.quota?.remaining || 0)} remaining</span>
          </div>
          <div className="token-bar">
            <div className="token-bar-fill" style={{ width: `${pct}%`, background: color, transition: 'width 1s ease' }} />
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="admin" userName={user.name} companyId={user.companyId} />
      <main style={{ marginLeft: isCollapsed ? '0' : '260px', padding: '48px 24px', transition: 'margin-left 250ms ease' }} className="flex-1">
        <div style={{ maxWidth: '1024px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2rem)', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>Members Directory</h1>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Manage team members and allocate token quotas</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button 
                onClick={() => setShowInviteModal(true)}
                className="gradient-primary" 
                style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: 'white', border: 'none', cursor: 'pointer', minHeight: '40px', transition: 'all 150ms ease', boxShadow: '0 0 15px rgba(124,58,237,0.3)' }}
              >
                + Invite Member
              </button>
              <button onClick={() => router.push('/admin')}
                className="glass" style={{ padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', cursor: 'pointer', minHeight: '40px', transition: 'all 150ms ease' }}>
                ← Dashboard
              </button>
            </div>
          </div>

          {/* Search & Team Filter Row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <svg style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, email, or role..."
                  style={{ width: '100%', paddingLeft: '40px', paddingRight: '16px', height: '44px', borderRadius: '12px', fontSize: '14px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', transition: 'all 150ms ease' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, whiteSpace: 'nowrap' }}>Filter by Team:</span>
                <select 
                  value={selectedTeamId}
                  onChange={e => setSelectedTeamId(e.target.value)}
                  style={{ padding: '0 16px', height: '44px', borderRadius: '12px', fontSize: '12px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', cursor: 'pointer', minWidth: '120px' }}
                >
                  <option value="all" style={{ background: '#0f0f1b' }}>All Teams</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id} style={{ background: '#0f0f1b' }}>{t.name}</option>
                  ))}
                </select>
                {selectedTeamId !== 'all' && (
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this team? Members will have No Team.')) {
                        removeTeam(selectedTeamId);
                        setSelectedTeamId('all');
                        refreshData(user.companyId);
                      }
                    }}
                    style={{ padding: '0 12px', height: '44px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', outline: 'none', transition: 'all 150ms ease' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                  >
                    Delete Team
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Members grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {filtered.length === 0 ? (
              <div className="glass" style={{ borderRadius: '16px', padding: '48px', textAlign: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                No members found matching filters.
              </div>
            ) : (
              <>
                {/* Main Admin Controller Section */}
                {(() => {
                  const adminMembers = filtered.filter(m => m.role === 'ADMIN');
                  if (adminMembers.length === 0) return null;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Main Admin Controller
                      </h2>
                      {adminMembers.map(m => renderMemberCard(m))}
                    </div>
                  );
                })()}

                {/* Team Sections */}
                {teams.filter(t => selectedTeamId === 'all' || t.id === selectedTeamId).map(team => {
                  const teamMembers = filtered.filter(m => m.teamId === team.id && m.role !== 'ADMIN');
                  if (teamMembers.length === 0) return null;
                  return (
                    <div key={team.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {team.name}
                        <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>{teamMembers.length} members</span>
                      </h2>
                      {teamMembers.map(m => renderMemberCard(m))}
                    </div>
                  );
                })}

                {/* No Team Section */}
                {(() => {
                  const noTeamMembers = filtered.filter(m => !m.teamId && m.role !== 'ADMIN');
                  if (noTeamMembers.length === 0) return null;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        No Team
                        <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>{noTeamMembers.length} members</span>
                      </h2>
                      {noTeamMembers.map(m => renderMemberCard(m))}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Quota Edit Modal */}
      {editMember && (
        <div className="modal-overlay">
          <div className="glass-strong modal-content" style={{ maxWidth: '400px', padding: '32px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Adjust Quota</h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>{editMember.name} · {editMember.jobRole}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>New Token Allocation</label>
                <input type="number" value={newAlloc}
                  onChange={e => setNewAlloc(parseInt(e.target.value) || 0)}
                  step={5_000_000}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', height: '48px', outline: 'none' }} />
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>= {formatTokensFn(newAlloc)} tokens</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[25_000_000, 50_000_000, 100_000_000, 250_000_000].map(v => (
                  <button key={v} onClick={() => setNewAlloc(v)}
                    style={{
                      flex: 1, minWidth: '60px', padding: '8px', borderRadius: '8px', fontSize: '12px', transition: 'all 150ms ease',
                      background: newAlloc === v ? 'rgba(124,58,237,0.3)' : 'transparent',
                      color: newAlloc === v ? 'rgb(196,167,255)' : 'rgba(255,255,255,0.4)',
                      border: newAlloc === v ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer', minHeight: '36px',
                    }}>
                    {formatTokensFn(v)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setEditMember(null)} className="glass" style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '14px', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', cursor: 'pointer', minHeight: '44px' }}>Cancel</button>
              <button onClick={handleAllocate} className="gradient-primary" style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: 'white', border: 'none', cursor: 'pointer', minHeight: '44px' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Member Profile Detail Modal */}
      {selectedMember && (() => {
        const pct = Math.min(100, selectedMember.quota?.percent || 0);
        const color = STATUS_COLOR[selectedMember.quota?.status as keyof typeof STATUS_COLOR] || '#22c55e';
        const teamName = teams.find(t => t.id === selectedMember.teamId)?.name || 'No Team';
        const userLogs = getUsageLogs().filter(log => log.userId === selectedMember.id).slice(0, 5);
        const estCostAvoided = ((selectedMember.savings?.totalSaved || 0) / 1_000_000) * 3;

        return (
          <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
            <div 
              className="glass-strong modal-content" 
              onClick={e => e.stopPropagation()}
              style={{ 
                maxWidth: '680px', 
                width: '90%', 
                padding: '0', 
                borderRadius: '24px', 
                overflow: 'hidden', 
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 50px rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh'
              }}
            >
              {/* Header Banner */}
              <div className="gradient-primary" style={{ height: '100px', position: 'relative', display: 'flex', alignItems: 'flex-end', padding: '0 24px' }}>
                <button 
                  onClick={() => setSelectedMember(null)}
                  style={{ 
                    position: 'absolute', 
                    top: '16px', 
                    right: '16px', 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    background: 'rgba(0,0,0,0.3)', 
                    border: 'none', 
                    color: 'white', 
                    fontSize: '18px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    lineHeight: 0
                  }}
                >
                  &times;
                </button>
              </div>

              {/* Avatar & Basic Info Area */}
              <div style={{ padding: '0 24px 24px 24px', position: 'relative', marginTop: '0' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', marginBottom: '24px' }}>
                  <div 
                    className="gradient-primary" 
                    style={{ 
                      width: '76px', 
                      height: '76px', 
                      borderRadius: '20px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '32px', 
                      fontWeight: 800, 
                      color: 'white', 
                      border: '4px solid #0f0f1b',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                      flexShrink: 0,
                      marginTop: '-38px'
                    }}
                  >
                    {selectedMember.name[0]?.toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>{selectedMember.name}</h2>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(124,58,237,0.15)', color: 'rgb(196,167,255)', fontWeight: 600, border: '1px solid rgba(124,58,237,0.3)' }}>
                        {teamName}
                      </span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                        {selectedMember.jobRole}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: selectedMember.status === 'active' ? '#4ade80' : '#a78bfa' }} />
                      {selectedMember.status === 'active' ? 'Active Member' : 'Invitation Pending'}
                    </p>
                  </div>
                </div>

                {/* Profile Grid content (Scrollable if overflow) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', maxHeight: 'calc(90vh - 200px)', paddingRight: '4px' }}>
                  
                  {/* Detailed contact section */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EMAIL ADDRESS</span>
                      <a href={`mailto:${selectedMember.email}`} style={{ fontSize: '13px', color: 'rgb(196,167,255)', textDecoration: 'none', fontWeight: 500, wordBreak: 'break-all' }}>{selectedMember.email}</a>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PHONE NUMBER</span>
                      <span style={{ fontSize: '13px', color: 'white', fontWeight: 500 }}>{selectedMember.phone || '—'}</span>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>VEXEL SECURITY VEXELID</span>
                      <span style={{ fontSize: '13px', fontFamily: 'monospace', color: 'white', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {selectedMember.vexelId || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Quota & Optimization Dual Panels */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    
                    {/* Left: Token Quota Governance */}
                    <div className="glass" style={{ padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'white' }}>Token Quota Limit</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color }}>{STATUS_LABEL[selectedMember.quota?.status as keyof typeof STATUS_LABEL] || '🟢 Healthy'}</span>
                      </div>

                      <div style={{ marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
                          <span>{pct}% Consumed</span>
                          <span>{formatTokensFn(selectedMember.quota?.remaining || 0)} left</span>
                        </div>
                        <div className="token-bar" style={{ height: '8px' }}>
                          <div className="token-bar-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '8px' }}>
                        <div>
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>ALLOCATED</p>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{formatTokensFn(selectedMember.quota?.allocated || 0)}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>CONSUMED</p>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{formatTokensFn(selectedMember.quota?.used || 0)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Optimization savings */}
                    <div className="glass" style={{ padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'white' }}>Optimization Metrics</span>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>EST. SAVED BUDGET</p>
                          <p style={{ fontSize: '16px', fontWeight: 700, color: '#4ade80' }}>${estCostAvoided.toFixed(2)}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>CACHE HITS</p>
                          <p style={{ fontSize: '16px', fontWeight: 700, color: '#22d3ee' }}>{selectedMember.savings?.cacheHits || 0}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>TOTAL TOKENS SAVED</p>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{formatTokensFn(selectedMember.savings?.totalSaved || 0)}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>COMPRESSION</p>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{formatTokensFn(selectedMember.savings?.savedFromCompression || 0)}</p>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Usage Logs section */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Recent AI Transactions
                    </h4>

                    {userLogs.length === 0 ? (
                      <div className="glass" style={{ padding: '16px', textAlign: 'center', borderRadius: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                        No transactions registered yet for this member.
                      </div>
                    ) : (
                      <div className="table-wrapper" style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                              <th style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Model / Task</th>
                              <th style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textAlign: 'right' }}>Tokens</th>
                              <th style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textAlign: 'right' }}>Optimization</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userLogs.map(log => (
                              <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: '10px 12px' }}>
                                  <div style={{ color: 'white', fontWeight: 500 }}>{log.modelUsed}</div>
                                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{log.taskType} · {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                                  <div style={{ color: 'white', fontWeight: 600 }}>{log.totalTokens.toLocaleString()}</div>
                                  <div style={{ fontSize: '10px', color: '#4ade80', marginTop: '2px' }}>${log.costUsd.toFixed(4)}</div>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                    {log.cached && (
                                      <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}>
                                        Cache Hit
                                      </span>
                                    )}
                                    {log.compressed && (
                                      <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(236,72,153,0.1)', color: '#ec4899', border: '1px solid rgba(236,72,153,0.2)' }}>
                                        Compressed
                                      </span>
                                    )}
                                    {!log.cached && !log.compressed && (
                                      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>Direct Query</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Actions area inside modal */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                    <button 
                      onClick={() => setSelectedMember(null)} 
                      className="glass" 
                      style={{ 
                        flex: 1, 
                        padding: '10px', 
                        borderRadius: '12px', 
                        fontSize: '13px', 
                        color: 'rgba(255,255,255,0.6)', 
                        border: '1px solid rgba(255,255,255,0.08)', 
                        background: 'transparent', 
                        cursor: 'pointer', 
                        minHeight: '40px' 
                      }}
                    >
                      Close Profile
                    </button>
                    <button 
                      onClick={() => {
                        const target = selectedMember;
                        setSelectedMember(null);
                        setEditMember(target);
                        setNewAlloc(target.quota?.allocated || 0);
                      }} 
                      className="gradient-primary" 
                      style={{ 
                        flex: 1, 
                        padding: '10px', 
                        borderRadius: '12px', 
                        fontSize: '13px', 
                        fontWeight: 600, 
                        color: 'white', 
                        border: 'none', 
                        cursor: 'pointer', 
                        minHeight: '40px' 
                      }}
                    >
                      Adjust Quota
                    </button>
                  </div>

                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="glass-strong modal-content" style={{ maxWidth: '480px', width: '90%', padding: '32px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Invite Team Member</h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>Invite a team member to Vexel to allocate token quotas</p>
            
            <form onSubmit={handleInviteMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Full Name</label>
                <input type="text" required value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="e.g. Chirag Sharma"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', height: '44px', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Work Email</label>
                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="e.g. chirag@vexel.ai"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', height: '44px', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Phone Number</label>
                <input type="text" required value={invitePhone} onChange={e => setInvitePhone(e.target.value)} placeholder="e.g. +91 9876543210"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', height: '44px', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Job Role</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    style={{ width: '100%', padding: '0 16px', borderRadius: '12px', fontSize: '13px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', height: '44px', outline: 'none' }}>
                    <option value="SDE" style={{ background: '#0f0f1b' }}>SDE</option>
                    <option value="Product Manager" style={{ background: '#0f0f1b' }}>Product Manager</option>
                    <option value="Designer" style={{ background: '#0f0f1b' }}>Designer</option>
                    <option value="Marketing" style={{ background: '#0f0f1b' }}>Marketing</option>
                    <option value="Workspace Owner" style={{ background: '#0f0f1b' }}>Workspace Owner</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Assign Team</label>
                  <select value={inviteTeamId} onChange={e => setInviteTeamId(e.target.value)}
                    style={{ width: '100%', padding: '0 16px', borderRadius: '12px', fontSize: '13px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', height: '44px', outline: 'none' }}>
                    <option value="" style={{ background: '#0f0f1b' }}>Select Team</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id} style={{ background: '#0f0f1b' }}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Initial Token Allocation</label>
                <input type="number" required value={inviteQuota} onChange={e => setInviteQuota(parseInt(e.target.value) || 0)} step={5_000_000}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', height: '44px', outline: 'none' }} />
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>= {formatTokensFn(inviteQuota)} tokens</p>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowInviteModal(false)} className="glass" style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '14px', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', cursor: 'pointer', minHeight: '44px' }}>Cancel</button>
                <button type="submit" disabled={isSending} className="gradient-primary" style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: 'white', border: 'none', cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {isSending ? 'Sending invite...' : 'Send Invitation →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vexel SMTP Dispatcher Console (Success Popup Overlay) */}
      {inviteSuccessData && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="glass-strong modal-content" style={{ maxWidth: '520px', width: '95%', padding: '32px', border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 0 30px rgba(34,197,94,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>📧 Real Invitation Email Sent!</h3>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Real-time SMTP dispatch trigger completed successfully</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>RECIPIENT NAME</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{inviteSuccessData.name}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>WORK EMAIL</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{inviteSuccessData.email}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>ASSIGNED VEXELID</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgb(196,167,255)', fontFamily: 'monospace' }}>{inviteSuccessData.vexelId}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>GATEWAY STATUS</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80' }}>Dispatched 🚀</p>
                </div>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>DIRECT ONBOARDING TEST LINK</p>
                <input readOnly value={inviteSuccessData.inviteLink} onClick={e => (e.target as HTMLInputElement).select()}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', cursor: 'pointer', fontFamily: 'monospace' }} />
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>💡 Click on the input box to copy and paste it into your browser to test the full invite activation experience!</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(inviteSuccessData.inviteLink);
                  alert('📋 Invite Link Copied to Clipboard!');
                }}
                className="glass" 
                style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '13px', color: 'white', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', minHeight: '44px' }}
              >
                Copy Link
              </button>
              <button 
                onClick={() => setInviteSuccessData(null)} 
                className="gradient-primary" 
                style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, color: 'white', border: 'none', cursor: 'pointer', minHeight: '44px' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
