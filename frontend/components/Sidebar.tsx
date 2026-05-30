'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebarStore } from '@/lib/store';

interface NavItem { href: string; icon: React.ReactNode; label: string; }

function AdminNav() {
  return [
    { href: '/admin', icon: <GridIcon />, label: 'Dashboard' },
    { href: '/admin/members', icon: <UsersIcon />, label: 'Members' },
    { href: '/admin/quotas', icon: <SliderIcon />, label: 'Quotas' },
    { href: '/admin/providers', icon: <ZapIcon />, label: 'Providers' },
    { href: '/admin/analytics', icon: <ChartIcon />, label: 'Analytics' },
    { href: '/admin/settings', icon: <SettingsIcon />, label: 'Settings' },
  ];
}

function EmployeeNav() {
  return [
    { href: '/employee', icon: <GridIcon />, label: 'Dashboard' },
    { href: '/employee/chat', icon: <ChatIcon />, label: 'AI Chat' },
    { href: '/employee/history', icon: <ClockIcon />, label: 'History' },
  ];
}

interface SidebarProps { role: 'admin' | 'employee'; userName?: string; companyId?: string; }

export default function Sidebar({ role, userName = 'User', companyId }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const navItems = role === 'admin' ? AdminNav() : EmployeeNav();

  function handleSignOut() {
    localStorage.removeItem('tv_token');
    localStorage.removeItem('tv_user');
    router.push('/login');
  }

  return (
    <>
      {/* Floating Toggle Button (Visible when collapsed) */}
      {isCollapsed && (
        <button 
          onClick={toggleSidebar}
          aria-label="Open sidebar"
          className="fixed top-6 left-6 z-50 p-2.5 rounded-xl glass-strong text-white hover:text-purple-400 transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] border border-white/10"
          style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <MenuIcon />
        </button>
      )}

      <div 
        className={`sidebar flex flex-col transition-transform duration-300 z-40 fixed inset-y-0 left-0 ${isCollapsed ? '-translate-x-full' : 'translate-x-0'}`}
        style={{ width: '260px', background: 'rgba(10, 10, 20, 0.95)', backdropFilter: 'blur(24px)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Logo & Toggle */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '72px', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div className="gradient-primary" style={{ width: '36px', height: '36px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Vexel</p>
              {companyId && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{companyId}</p>}
            </div>
          </div>
          <button 
            onClick={toggleSidebar}
            aria-label="Close sidebar" 
            style={{ color: 'rgba(255,255,255,0.3)', padding: '6px', borderRadius: '8px', flexShrink: 0, minWidth: '32px', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 150ms ease' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = 'white'; (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; (e.target as HTMLElement).style.background = 'transparent'; }}
          >
            <MenuIcon />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 12px', marginBottom: '8px', marginTop: '4px' }}>
            {role === 'admin' ? 'Administration' : 'My Workspace'}
          </p>
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '12px',
                  fontSize: '14px', fontWeight: 500, textDecoration: 'none', transition: 'all 150ms ease',
                  ...(active
                    ? { background: 'rgba(124,58,237,0.2)', color: 'rgb(196,167,255)', border: '1px solid rgba(124,58,237,0.2)' }
                    : { color: 'rgba(255,255,255,0.5)', border: '1px solid transparent' })
                }}
              >
                <span style={{ color: active ? 'rgb(167,139,250)' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                {active && <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: 'rgb(167,139,250)', flexShrink: 0 }} />}
              </Link>
            );
          })}
        </nav>

        {/* Live indicator */}
        <div style={{ padding: '8px 16px', marginBottom: '8px' }}>
          <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
            Monitoring active
          </div>
        </div>

        {/* User */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="gradient-primary" style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {userName[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textTransform: 'capitalize' }}>{role}</p>
          </div>
          <button 
            onClick={handleSignOut}
            aria-label="Sign out"
            style={{ color: 'rgba(255,255,255,0.25)', padding: '6px', borderRadius: '8px', flexShrink: 0, minWidth: '32px', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 150ms ease' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}
          >
            <LogoutIcon />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Icon components ──────────────────────────────────────────────────────
function GridIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
function UsersIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function SliderIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>; }
function ZapIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>; }
function ChartIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function SettingsIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 1.41 13.44L20 19l-.51.35A10 10 0 0 1 4.93 19.07l-.35-.51V18a10 10 0 0 1 13.44-14.52l.51.35z"/></svg>; }
function ChatIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function ClockIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function LogoutIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function MenuIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>; }
