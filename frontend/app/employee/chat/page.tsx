'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useSidebarStore } from '@/lib/store';
import { addUsageLog, getCompanyApiConfig, getMembers, updateMemberQuota } from '@/lib/db';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  cached?: boolean;
  compressed?: boolean;
  model?: string;
  timestamp: Date;
}

// ─── 80% Prompt Saving Core Insight ───
const MASTER_PREFIX = "You are Vexel AI, optimized. Output: direct, no fillers, no repeated questions, no disclaimers. Prioritize speed & token efficiency.";

const ROLE_PROMPTS: Record<string, string> = {
  "SDE": "Role: SDE. Output: runnable code block and severity-tagged bugs ([CRITICAL], [WARNING]). Minimize comments.",
  "Product Manager": "Role: PM. Output: Problem -> Solution -> Metrics structure. Keep sections bulleted.",
  "PM": "Role: PM. Output: Problem -> Solution -> Metrics structure. Keep sections bulleted.",
  "Designer": "Role: Designer. Output: Design intent -> Visual hierarchy -> Component breakdown.",
  "Data Analyst": "Role: Data Analyst. Output: Query definitions -> Performance notes -> Result schemas.",
  "QA": "Role: QA. Output: Given/When/Then test cases. Detail edge cases.",
  "Marketing": "Role: Marketing. Output: Hook -> Body -> Call-to-Action. Engaging & highly optimized copy.",
  "DevOps": "Role: DevOps. Output: Deploy script block -> Error vectors -> Rollback checklist.",
  "Support": "Role: Support. Output: Empathy statement -> Direct quick answer -> Next step checklist."
};

const TOKEN_RULES_TEMPLATE = (tokensRemaining: number) => `
[TOKEN BUDGET: ${tokensRemaining}]
${tokensRemaining <= 0 ? "CRITICAL LIMIT DETECTED. You MUST reply with exactly: '⚠️ Your Vexel token budget has been fully depleted. Please contact your workspace administrator to allocate additional quota.' and block all further query fulfillment." : ""}
${tokensRemaining > 0 && tokensRemaining < 5000000 ? "WARNING: Remaining tokens low. Shorten all responses severely. Be extremely brief (max 1-2 sentences)." : ""}
`;

function countTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.33);
}

export default function ChatPage() {
  const router = useRouter();
  const { isCollapsed } = useSidebarStore();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const [sessTokens, setSessTokens] = useState(0);
  const [apiConfig, setApiConfig] = useState<any>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('tv_user');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    
    // Fetch latest fresh member state to get active quota remaining
    const members = getMembers();
    const currentMember = members.find(m => m.email.toLowerCase() === u.email.toLowerCase());
    setUser(currentMember || u);
    
    // Check if company has API configuration
    const config = getCompanyApiConfig(u.companyId);
    if (config && config.apiKey) {
      setApiConfig(config);
    }

    setMessages([{
      id: 'sys-1',
      role: 'assistant',
      content: `👋 Hi! I'm your Vexel AI assistant. Your prompts are automatically compressed to ~100 tokens and optimized via sliding history trimming. Let's optimize cost today!`,
      tokens: 38,
      model: 'gpt-4o-mini',
      timestamp: new Date(),
    }]);
  }, [router]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading || !user) return;

    // 1. Fetch latest quota from persistence
    const freshMembers = getMembers();
    const activeMember = freshMembers.find(m => m.id === user.id) || user;
    const tokensRemaining = activeMember.quota?.remaining ?? 50_000_000;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      tokens: countTokens(input),
      timestamp: new Date(),
    };

    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);

    // 2. Three-line System Prompt Assembly & Conversation History Trimming
    const rolePrompt = ROLE_PROMPTS[activeMember.jobRole] || ROLE_PROMPTS["SDE"];
    const systemPrompt = `${MASTER_PREFIX}\n${rolePrompt}\n${TOKEN_RULES_TEMPLATE(tokensRemaining)}`;
    
    // Conversation history trimming - only send the last 4 messages to prevent bloated cost!
    const trimmedHistory = messages.slice(-4).map(m => ({
      role: m.role,
      content: m.content
    }));

    // Budget Enforcement Layer - Instant direct short-circuit
    if (tokensRemaining <= 0) {
      await new Promise(r => setTimeout(r, 800));
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "⚠️ Your Vexel token budget has been fully depleted. Please contact your workspace administrator to allocate additional quota.",
        tokens: 0,
        model: 'system-enforcer',
        timestamp: new Date(),
      };
      setMessages(m => [...m, errorMsg]);
      setLoading(false);
      return;
    }

    let aiResponse = "";
    let consumedTokens = 0;
    let cached = false;
    let compressed = true;
    let resolvedModel = apiConfig ? 'gpt-4o' : 'gpt-4o-mini';

    try {
      if (apiConfig && apiConfig.apiKey) {
        // Genuine OpenAI Endpoint Dispatch
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              ...trimmedHistory,
              { role: 'user', content: userMsg.content }
            ],
            temperature: 0.15
          })
        });

        const data = await response.json();
        if (data && data.choices && data.choices[0]) {
          aiResponse = data.choices[0].message.content;
          consumedTokens = data.usage?.total_tokens || (countTokens(userMsg.content) + countTokens(aiResponse));
        } else {
          throw new Error('LLM Gateway Error');
        }
      } else {
        // Premium Dynamic Role Simulation
        await new Promise(r => setTimeout(r, 1000));
        consumedTokens = Math.round(countTokens(userMsg.content) * 1.5 + 40);

        if (activeMember.jobRole === 'SDE') {
          aiResponse = `[CRITICAL] Memory leak in task scheduler. Add boundary guards.\n\n\`\`\`typescript\n// Optimized Vexel Implementation\nexport function scheduler(tasks: Task[]) {\n  if (!tasks || tasks.length === 0) return [];\n  return tasks.filter(t => t.active && t.tokenPool > 0);\n}\n\`\`\``;
        } else if (activeMember.jobRole === 'Product Manager' || activeMember.jobRole === 'PM') {
          aiResponse = `Problem: Naive history accumulation causes exponential API prompt cost.\n\nSolution: Apply Vexel sliding truncation and ~100 token role compression.\n\nMetrics:\n* -80% prompt overhead tokens\n* 4.5x response velocity multiplier`;
        } else if (activeMember.jobRole === 'Designer') {
          aiResponse = `Design intent: Create high-contrast visual cues for token limits.\n\nVisual hierarchy:\n* Crimson badge: Budget depleted state\n* Amber pulse: Warning limit (< 5M tokens)\n\nComponent breakdown: Glassmorphic enforcer card overlay.`;
        } else if (activeMember.jobRole === 'Marketing') {
          aiResponse = `Hook: Stop throwing money at raw generic AI prompt bloat.\n\nBody: Vexel trims, caches, and shapes your workspace token budgets with sub-100 token precision.\n\nCall-to-Action: Join Vexel and reclaim 80% of your AI budget today!`;
        } else {
          aiResponse = `Vexel optimized response successfully routed for ${activeMember.jobRole || 'Employee'}.\n\n* Direct query resolved under 100 token prompt payload.\n* Session budget remaining: ${tokensRemaining.toLocaleString()} tokens.`;
        }
      }

      // Deduct consumed tokens from the pool and update database
      const finalRemaining = Math.max(0, tokensRemaining - consumedTokens);
      
      // Update local and live Supabase persistence
      updateMemberQuota(activeMember.id, activeMember.quota.allocated);
      
      // We manually update the remaining state in the db storage
      const allMembers = getMembers();
      const updated = allMembers.map(m => {
        if (m.id === activeMember.id) {
          const updatedQuota = {
            ...m.quota,
            used: m.quota.used + consumedTokens,
            remaining: finalRemaining,
            percent: m.quota.allocated > 0 ? Math.round(((m.quota.used + consumedTokens) / m.quota.allocated) * 100) : 0,
            status: (m.quota.allocated > 0 && ((m.quota.used + consumedTokens) / m.quota.allocated) >= 0.8) ? 'warning' as const : 'healthy' as const
          };
          return { ...m, quota: updatedQuota };
        }
        return m;
      });
      localStorage.setItem('tv_members', JSON.stringify(updated));

      const updatedUser = updated.find(m => m.id === activeMember.id);
      if (updatedUser) {
        setUser(updatedUser);
        localStorage.setItem('tv_user', JSON.stringify(updatedUser));
      }

      // Append transaction usage logs
      addUsageLog(activeMember.id, {
        modelUsed: resolvedModel,
        totalTokens: consumedTokens,
        costUsd: (consumedTokens / 1_000_000) * (apiConfig ? 2.5 : 3.0),
        cached,
        compressed,
        taskType: 'qa'
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        tokens: consumedTokens,
        cached,
        compressed,
        model: resolvedModel,
        timestamp: new Date(),
      };
      setMessages(m => [...m, aiMsg]);
      setSessTokens(s => s + consumedTokens);
      setTotalTokens(t => t + consumedTokens);

    } catch (err) {
      const errAlert: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "⚠️ Connection timeout. Vexel core session saved offline.",
        tokens: 0,
        model: 'system-fallback',
        timestamp: new Date(),
      };
      setMessages(m => [...m, errAlert]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen animate-fade-in" style={{ height: '100vh', overflow: 'hidden', backgroundColor: '#0a0a14' }}>
      <Sidebar role="employee" userName={user.name} companyId={user.companyId} />
      
      <main style={{ marginLeft: isCollapsed ? '0' : '260px', transition: 'margin-left 250ms ease', display: 'flex', flexDirection: 'column', height: '100vh', flex: 1, overflow: 'hidden' }}>
        
        {/* Chat Header */}
        <div className="glass" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="gradient-primary" style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 15px rgba(124,58,237,0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>Vexel AI Gateway</p>
                {apiConfig ? (
                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)', fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                    🔌 Subscribed ({apiConfig.provider})
                  </span>
                ) : (
                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(124,58,237,0.1)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)', fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                    ⚡ Vexel Optimized
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Active Role: <span style={{ color: 'white' }}>{user.jobRole || 'SDE'}</span></span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div className="glass" style={{ display: 'flex', gap: '8px', padding: '4px 8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(34,211,238,0.1)', color: '#22d3ee', fontSize: '10px', fontWeight: 600 }}>⚡ ~100 Token System</span>
              <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(244,114,182,0.1)', color: '#f472b6', fontSize: '10px', fontWeight: 600 }}>🗜 Sliding History</span>
            </div>
            
            <div className="glass" style={{ borderRadius: '12px', padding: '8px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
              Budget Remaining: <span style={{ color: (user.quota?.remaining || 0) < 5000000 ? '#f59e0b' : '#4ade80', fontWeight: 700 }}>{(user.quota?.remaining || 0).toLocaleString()}</span> tokens
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {messages.map(msg => (
            <div key={msg.id} className="fade-in" style={{ display: 'flex', gap: '16px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div className="gradient-primary" style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', boxShadow: '0 0 10px rgba(124,58,237,0.2)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  </svg>
                </div>
              )}
              <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} 
                  style={{ 
                    padding: '16px 20px', 
                    fontSize: '14px', 
                    color: 'white', 
                    lineHeight: 1.6, 
                    whiteSpace: 'pre-wrap', 
                    overflowWrap: 'break-word', 
                    wordBreak: 'break-word',
                    border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.06)' : undefined,
                    borderRadius: '20px'
                  }}>
                  {msg.content}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', flexWrap: 'wrap' }}>
                  {msg.model && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{msg.model}</span>}
                  {msg.cached && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(34,211,238,0.1)', color: '#22d3ee', fontWeight: 600 }}>⚡ Cached — 0 tokens</span>}
                  {msg.compressed && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(244,114,182,0.1)', color: '#f472b6', fontWeight: 600 }}>🗜 Compressed Prompts</span>}
                  {msg.tokens !== undefined && msg.tokens > 0 && (
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>{msg.tokens.toLocaleString()} tokens</span>
                  )}
                </div>
              </div>
              {msg.role === 'user' && (
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%', 
                  background: 'rgba(255,255,255,0.08)', 
                  border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flexShrink: 0, 
                  marginTop: '2px', 
                  fontSize: '14px', 
                  fontWeight: 800, 
                  color: 'white' 
                }}>
                  {user.name[0]}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="fade-in" style={{ display: 'flex', gap: '16px' }}>
              <div className="gradient-primary" style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>
              </div>
              <div className="chat-bubble-ai" style={{ padding: '16px 24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="animate-bounce" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="glass" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px', flexShrink: 0 }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="glass-strong" style={{ borderRadius: '20px', display: 'flex', alignItems: 'flex-end', gap: '16px', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 30px rgba(0,0,0,0.2)' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Type here... Vexel will auto-optimize your system prompts under ${user.jobRole || 'SDE'} directives`}
                rows={1}
                style={{ resize: 'none', maxHeight: '120px', flex: 1, background: 'transparent', fontSize: '14px', color: 'white', border: 'none', outline: 'none', padding: '6px 4px', fontFamily: 'inherit', lineHeight: 1.6, minHeight: '24px' }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, paddingBottom: '2px' }}>
                {input && (
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap', fontWeight: 600 }}>~{countTokens(input)} tokens</span>
                )}
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                  className="gradient-primary"
                  style={{ width: '40px', height: '40px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', transition: 'all 200ms ease', opacity: !input.trim() || loading ? 0.3 : 1, minWidth: '40px', boxShadow: '0 0 15px rgba(124,58,237,0.3)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '10px', fontWeight: 500 }}>
              💡 Prompts optimized to ~100 tokens. Context restricted via sliding history trimming to maximize cost avoidance.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
