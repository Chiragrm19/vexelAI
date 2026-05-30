'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { seedDefaultAdmin, getMembers, saveMembers } from '@/lib/db';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', company: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await new Promise(r => setTimeout(r, 1000));
      
      const compSlug = form.company.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
      const randNum = Math.floor(100 + Math.random() * 900);
      const companyId = `COMP-${compSlug}-${randNum}`;

      // Register the admin in local storage DB
      const adminMember = seedDefaultAdmin(form.email, form.name, companyId);
      adminMember.password = form.password;
      adminMember.companyId = companyId;
      adminMember.jobRole = 'Founder / Admin';

      const allMembers = getMembers();
      const updated = allMembers.map(m => m.id === adminMember.id ? adminMember : m);
      saveMembers(updated);

      localStorage.setItem('tv_token', 'demo-token-new');
      localStorage.setItem('tv_user', JSON.stringify(adminMember));
      router.push('/admin');
    } catch (err: any) {
      setError('Failed to create workspace. Please try again.');
    } finally {
      setForm({ name: '', company: '', email: '', password: '' });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a14] relative overflow-hidden">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-cyan-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[20%] w-[600px] h-[600px] bg-indigo-900/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      {/* Main Centered Signup Card */}
      <div style={{ maxWidth: '420px', width: '100%' }} className="relative z-10 glass-strong rounded-[24px] p-8 sm:p-10 fade-in border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        {/* Header Centered */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.15)] mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Create Workspace</h2>
          <p className="text-sm text-white/50">
            Already have a workspace?{' '}
            <Link href="/login" className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[20px]">
          <div className="space-y-1">
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Full Name"
              required
              className="w-full h-[44px] px-[16px] bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-cyan-500/50 focus:bg-white/10 focus:outline-none transition-all text-[0.9375rem]"
            />
          </div>
          
          <div className="space-y-1">
            <input
              type="text"
              value={form.company}
              onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              placeholder="Company Name"
              required
              className="w-full h-[44px] px-[16px] bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-cyan-500/50 focus:bg-white/10 focus:outline-none transition-all text-[0.9375rem]"
            />
          </div>

          <div className="space-y-1">
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Work Email"
              required
              className="w-full h-[44px] px-[16px] bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-cyan-500/50 focus:bg-white/10 focus:outline-none transition-all text-[0.9375rem]"
            />
          </div>

          <div className="space-y-1">
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Password"
              required
              className="w-full h-[44px] px-[16px] bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-cyan-500/50 focus:bg-white/10 focus:outline-none transition-all text-[0.9375rem]"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[44px] px-[20px] rounded-xl font-semibold text-[0.9375rem] text-white gradient-primary hover:opacity-90 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Workspace...
                </span>
              ) : 'Get Started'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
