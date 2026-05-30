'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMembers, seedDefaultAdmin, saveMembers } from '@/lib/db';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Google SSO states
  const [showGoogleSso, setShowGoogleSso] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleError, setGoogleError] = useState('');

  async function handleGoogleLoginSubmit(email: string) {
    if (!email) return;
    setGoogleError('');
    try {
      const members = getMembers();
      let user = members.find(m => m.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        throw new Error('Email address not registered in any workspace. Ask your admin to invite you first.');
      }

      // Automatically activate invited employee upon Google verification
      if (user.status === 'invited') {
        user.status = 'active';
        user.password = 'sso-managed'; // place holder password
        
        const updated = members.map(m => m.id === user.id ? user : m);
        saveMembers(updated);
      }

      localStorage.setItem('tv_token', 'google-sso-token');
      localStorage.setItem('tv_user', JSON.stringify(user));
      setShowGoogleSso(false);
      router.push(user.role === 'ADMIN' ? '/admin' : '/employee');
    } catch (err: any) {
      setGoogleError(err.message || 'SSO authentication failed');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 600));

      const members = getMembers();
      let user = members.find(m => m.email.toLowerCase() === form.email.toLowerCase());

      // Seed default admin if first time logging in with admin@demo.com
      if (!user && form.email.toLowerCase() === 'admin@demo.com') {
        user = seedDefaultAdmin('admin@demo.com', 'Alex Johnson', 'COMP-7X9K2M');
      }

      if (!user) {
        throw new Error('Invalid email or password');
      }

      if (user.status === 'invited') {
        throw new Error('Please complete onboarding first by using your VexelID to set your password.');
      }

      if (user.password !== form.password) {
        throw new Error('Invalid email or password');
      }

      localStorage.setItem('tv_token', 'demo-token');
      localStorage.setItem('tv_user', JSON.stringify(user));
      router.push(user.role === 'ADMIN' ? '/admin' : '/employee');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a14] relative overflow-hidden">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-purple-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[20%] w-[600px] h-[600px] bg-indigo-900/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      {/* Main Centered Login Card */}
      <div style={{ maxWidth: '420px', width: '100%' }} className="relative z-10 glass-strong rounded-[24px] p-8 sm:p-10 fade-in border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        {/* Header Centered */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.15)] mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4c1d95" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Welcome Back</h2>
          <p className="text-sm text-white/50">
            Need a new workspace?{' '}
            <Link href="/signup" className="text-purple-400 font-semibold hover:text-purple-300 transition-colors">
              Create workspace
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[20px]">
          <div className="space-y-1">
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Email address"
              required
              className="w-full h-[44px] px-[16px] bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-purple-500/50 focus:bg-white/10 focus:outline-none transition-all text-[0.9375rem]"
            />
          </div>
          
          <div className="space-y-1">
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Password"
              required
              className="w-full h-[44px] px-[16px] bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-purple-500/50 focus:bg-white/10 focus:outline-none transition-all text-[0.9375rem]"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <div className="pt-2 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[44px] px-[20px] rounded-xl font-semibold text-[0.9375rem] text-white gradient-primary hover:opacity-90 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : 'Login'}
            </button>

            <div className="flex items-center my-1 text-white/20 text-[10px] gap-3">
              <div className="h-px bg-white/10 flex-1" />
              <span className="uppercase tracking-widest font-semibold">or</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            <button
              type="button"
              onClick={() => { setShowGoogleSso(true); setGoogleEmail(''); setGoogleError(''); }}
              className="w-full h-[44px] px-[20px] rounded-xl font-semibold text-sm bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center gap-3 transition-all cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.87-4.53-5.85-4.53z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </form>

        {/* Quick Actions */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest text-center mb-3">Demo Access</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setForm({ email: 'admin@demo.com', password: 'demo1234' }); handleSubmit(new Event('submit') as any); }}
              className="flex-1 flex items-center justify-center gap-2 h-[40px] rounded-xl font-semibold text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all cursor-pointer"
            >
              👑 Admin
            </button>
            <button
              onClick={() => { setForm({ email: 'emp@demo.com', password: 'demo1234' }); handleSubmit(new Event('submit') as any); }}
              className="flex-1 flex items-center justify-center gap-2 h-[40px] rounded-xl font-semibold text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all cursor-pointer"
            >
              👤 Employee
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-white/40">
            Got an invite?{' '}
            <Link href="/onboarding" className="text-white hover:text-purple-300 transition-colors underline decoration-white/20 underline-offset-4 font-medium">
              Join workspace
            </Link>
          </p>
        </div>
      </div>

      {/* Google Sign-in Modal */}
      {showGoogleSso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="glass-strong rounded-3xl p-8 w-full max-w-sm mx-4 border border-white/10 relative text-center shadow-[0_0_50px_rgba(0,0,0,0.6)]">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.87-4.53-5.85-4.53z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <h3 className="text-base font-bold text-white mb-1">Sign in with Google</h3>
            <p className="text-xs text-white/40 mb-6">Choose an account to continue to TokenVault</p>
            
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {/* Filter out empty admin default records if email is demo, else show all */}
              {getMembers().filter(m => m.email.includes('@')).map(m => (
                <button
                  key={m.id}
                  onClick={() => handleGoogleLoginSubmit(m.email)}
                  className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center gap-3 transition-all text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl gradient-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {m.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{m.name}</p>
                    <p className="text-[10px] text-white/30 truncate">{m.email}</p>
                  </div>
                  <span className="text-[9px] font-bold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 uppercase tracking-wider shrink-0">{m.role}</span>
                </button>
              ))}

              <div className="pt-2 border-t border-white/5">
                <input 
                  type="email"
                  value={googleEmail}
                  onChange={e => setGoogleEmail(e.target.value)}
                  placeholder="Or enter work Gmail address"
                  className="w-full px-3 py-2.5 rounded-xl text-xs text-white bg-white/5 border border-white/10 focus:border-purple-500/60 focus:outline-none placeholder-white/20 text-center"
                />
              </div>

              {googleError && (
                <p className="text-xs text-red-400 mt-2">{googleError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                type="button" 
                onClick={() => setShowGoogleSso(false)}
                className="flex-1 py-2.5 rounded-xl text-xs text-white/50 glass hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => handleGoogleLoginSubmit(googleEmail)}
                className="flex-1 py-2.5 rounded-xl text-xs text-white font-semibold gradient-primary hover:opacity-90 transition-all cursor-pointer"
              >
                Sign In
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
