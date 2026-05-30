'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMembers, activateMember } from '@/lib/db';

type Step = 'details' | 'password' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [form, setForm] = useState({ name: '', email: '', phone: '', vexelId: '' });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matchedMember, setMatchedMember] = useState<any>(null);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Autodetect query parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      const vexelIdParam = params.get('vexelId');
      if (emailParam) update('email', emailParam);
      if (vexelIdParam) update('vexelId', vexelIdParam);
    }
  }, []);

  async function handleDetails(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await new Promise(r => setTimeout(r, 1000));
      const members = getMembers();
      
      const member = members.find(m => 
        m.email.toLowerCase() === form.email.toLowerCase().trim() &&
        m.vexelId.toUpperCase().trim() === form.vexelId.toUpperCase().trim()
      );

      if (!member) {
        throw new Error('Verification failed. Invalid Work Email or VexelID. Please contact your workspace administrator.');
      }

      if (member.status === 'active') {
        throw new Error('This user has already completed onboarding. Please sign in directly.');
      }

      // Found the pending invite! Cache user details
      setMatchedMember({
        ...member,
        name: form.name.trim() || member.name,
        phone: form.phone.trim() || member.phone
      });
      setStep('password');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await new Promise(r => setTimeout(r, 1000));
      if (!matchedMember) {
        throw new Error('Session expired. Please restart onboarding.');
      }

      // Activate locally and sync to live Supabase Postgres
      activateMember(matchedMember.id, {
        name: matchedMember.name,
        phone: matchedMember.phone,
        password: password
      });

      const members = getMembers();
      const finalUser = members.find(m => m.id === matchedMember.id);
      
      localStorage.setItem('tv_token', 'demo-token');
      localStorage.setItem('tv_user', JSON.stringify(finalUser));
      
      setStep('done');
      setTimeout(() => router.push('/employee'), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to complete setup.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 bg-white/5 border border-white/10 focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/40 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a14] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-cyan-900/10 blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md z-10 fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(255,255,255,0.15)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4c1d95" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Join Your Team</h1>
          <p className="text-sm text-white/40 mt-1">Vexel Employee Verification</p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['details', 'password', 'done'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step === s ? 'gradient-primary text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]' : 
                  ['done', 'password', 'details'].indexOf(s) > ['done', 'password', 'details'].indexOf(step)
                    ? 'bg-white/5 text-white/30' : 'bg-green-500/20 text-green-400 border border-green-500/20'}`}>
                {i + 1}
              </div>
              {i < 2 && <div className="w-12 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        <div className="glass rounded-[24px] p-8 sm:p-10 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {step === 'details' && (
            <form onSubmit={handleDetails} className="space-y-4">
              
              {/* Premium Welcome Alert if query params matched */}
              {form.email && form.vexelId && (
                <div className="glass" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', marginBottom: '20px' }}>
                  <p className="text-xs text-purple-300 font-semibold flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    Vexel Invitation Link Detected!
                  </p>
                  <p className="text-[11px] text-white/50 mt-1">Your administrator has pre-configured your account for {form.email}. Just confirm your VexelID below to set your password.</p>
                </div>
              )}

              <h2 className="text-lg font-semibold text-white mb-4">Verification Details</h2>
              <input value={form.name} onChange={e => update('name', e.target.value)} required placeholder="Full Name" className={inputCls} />
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)} required placeholder="Work Email" className={inputCls} />
              <input value={form.phone} onChange={e => update('phone', e.target.value)} required placeholder="Phone Number" className={inputCls} />
              
              <div className="space-y-1">
                <input 
                  value={form.vexelId} 
                  onChange={e => update('vexelId', e.target.value.toUpperCase())} 
                  required 
                  placeholder="VexelID (e.g. VEX-123456)" 
                  className={inputCls + " font-mono tracking-wider focus:border-purple-400"} 
                />
              </div>

              {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{error}</p>}
              
              <button type="submit" disabled={loading} className="w-full h-[44px] rounded-xl font-semibold text-sm text-white gradient-primary hover:opacity-90 transition-all disabled:opacity-50 mt-6">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying VexelID...
                  </span>
                ) : 'Verify Invitation →'}
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handlePassword} className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-1">Set Your Password</h2>
              <p className="text-xs text-white/40 mb-4">Set password for {matchedMember?.email}</p>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Create a strong password (min 8 chars)" minLength={8} className={inputCls} />
              
              {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{error}</p>}
              
              <button type="submit" disabled={loading} className="w-full h-[44px] rounded-xl font-semibold text-sm text-white gradient-primary hover:opacity-90 transition-all disabled:opacity-50 mt-6">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving password...
                  </span>
                ) : 'Complete Setup & Log In →'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Workspace Joined! 🎉</h2>
              <p className="text-sm text-white/50 mt-2">Redirecting to your team workspace...</p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-white/40 mt-6">
          <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
