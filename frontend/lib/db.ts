// LocalStorage database simulator with active Supabase real-time cloud integration
import { supabase } from './supabase';

export interface Quota {
  allocated: number;
  used: number;
  remaining: number;
  percent: number;
  status: 'healthy' | 'warning' | 'blocked';
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobRole: string;
  teamId: string;
  companyId: string;
  vexelId: string;
  password?: string;
  role: 'ADMIN' | 'EMPLOYEE';
  status: 'invited' | 'active';
  quota: Quota;
  savings: {
    cacheHits: number;
    savedFromCaching: number;
    savedFromCompression: number;
    totalSaved: number;
  };
}

export interface Team {
  id: string;
  name: string;
  companyId: string;
}

export interface UsageLog {
  id: string;
  userId: string;
  modelUsed: string;
  totalTokens: number;
  costUsd: number;
  cached: boolean;
  compressed: boolean;
  taskType: string;
  timestamp: string;
}

// ─── Helpers ───
const isClient = typeof window !== 'undefined';

function getStorageItem<T>(key: string, defaultValue: T): T {
  if (!isClient) return defaultValue;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
}

function setStorageItem<T>(key: string, value: T): void {
  if (!isClient) return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Supabase Data Sync & Mapping Helpers ───
function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function mapMemberToSupabase(m: Member) {
  return {
    name: m.name,
    email: m.email,
    phone: m.phone || '',
    job_role: m.jobRole,
    team_id: m.teamId && isUuid(m.teamId) ? m.teamId : null,
    company_id: m.companyId && isUuid(m.companyId) ? m.companyId : null,
    vexel_id: m.vexelId,
    role: m.role,
    status: m.status,
    quota_allocated: m.quota.allocated,
    quota_used: m.quota.used,
    quota_remaining: m.quota.remaining,
    quota_percent: m.quota.percent,
    quota_status: m.quota.status,
    savings_cache_hits: m.savings.cacheHits,
    savings_saved_from_caching: m.savings.savedFromCaching,
    savings_saved_from_compression: m.savings.savedFromCompression,
    savings_total_saved: m.savings.totalSaved,
    ...(isUuid(m.id) ? { id: m.id } : {})
  };
}

function mapSupabaseToMember(m: any): Member {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    phone: m.phone || '',
    jobRole: m.job_role || 'Employee',
    teamId: m.team_id || '',
    companyId: m.company_id || '',
    vexelId: m.vexel_id || `VEX-${Math.floor(100000 + Math.random() * 900000)}`,
    role: m.role || 'EMPLOYEE',
    status: m.status || 'active',
    quota: {
      allocated: m.quota_allocated ?? 100000000,
      used: m.quota_used ?? 0,
      remaining: m.quota_remaining ?? 100000000,
      percent: m.quota_percent ?? 0,
      status: m.quota_status ?? 'healthy'
    },
    savings: {
      cacheHits: m.savings_cache_hits ?? 0,
      savedFromCaching: m.savings_saved_from_caching ?? 0,
      savedFromCompression: m.savings_saved_from_compression ?? 0,
      totalSaved: m.savings_total_saved ?? 0
    }
  };
}

// ─── Automated Supabase Sync Engine ───
export async function syncWithSupabase(companyId?: string): Promise<void> {
  if (!isClient) return;
  console.log('🔄 Syncing local state with live Supabase Database...');
  try {
    // 1. Sync Members
    let membersQuery = supabase.from('members').select('*');
    if (companyId && isUuid(companyId)) {
      membersQuery = membersQuery.eq('company_id', companyId);
    }
    const { data: dbMembers, error: memErr } = await membersQuery;
    if (!memErr && dbMembers) {
      const mapped = dbMembers.map(mapSupabaseToMember);
      // Merge with local storage (preserving non-conflicting offline values)
      const local = getMembers();
      const merged = [...mapped];
      local.forEach(l => {
        if (!merged.some(m => m.email.toLowerCase() === l.email.toLowerCase())) {
          merged.push(l);
        }
      });
      saveMembers(merged);
    }

    // 2. Sync Teams
    let teamsQuery = supabase.from('teams').select('*');
    if (companyId && isUuid(companyId)) {
      teamsQuery = teamsQuery.eq('company_id', companyId);
    }
    const { data: dbTeams, error: teamErr } = await teamsQuery;
    if (!teamErr && dbTeams) {
      const mappedTeams: Team[] = dbTeams.map(t => ({
        id: t.id,
        name: t.name,
        companyId: t.company_id || ''
      }));
      saveTeams(mappedTeams);
    }
  } catch (err) {
    console.warn('⚠️ Supabase background synchronization pending: offline or configuration delay.', err);
  }
}

// ─── Teams ───
export function getTeams(): Team[] {
  return getStorageItem<Team[]>('tv_teams', []);
}

export function saveTeams(teams: Team[]): void {
  setStorageItem('tv_teams', teams);
}

export function createTeam(name: string, companyId: string): Team {
  const teams = getTeams();
  const newId = isUuid(companyId) ? undefined : `team-${Date.now()}`;
  
  const newTeam: Team = {
    id: newId || `team-${Date.now()}`,
    name,
    companyId,
  };
  teams.push(newTeam);
  saveTeams(teams);

  // Background Push to Supabase
  supabase
    .from('teams')
    .insert([{
      name,
      company_id: isUuid(companyId) ? companyId : null
    }])
    .select()
    .then(({ data, error }) => {
      if (!error && data && data[0]) {
        // Update local team with its real PostgreSQL UUID
        const updated = getTeams().map(t => t.name === name ? { ...t, id: data[0].id } : t);
        saveTeams(updated);
      }
    });

  return newTeam;
}

// ─── Members ───
export function getMembers(): Member[] {
  return getStorageItem<Member[]>('tv_members', []);
}

export function saveMembers(members: Member[]): void {
  setStorageItem('tv_members', members);
}

export function addInvitedMember(
  name: string,
  email: string,
  phone: string,
  jobRole: string,
  teamId: string,
  companyId: string,
  allocatedQuota: number
): Member {
  const members = getMembers();
  
  // Generate Vexel ID: VEX-XXXXXX
  const randNum = Math.floor(100000 + Math.random() * 900000);
  const vexelId = `VEX-${randNum}`;

  const newMember: Member = {
    id: `user-${Date.now()}`,
    name,
    email,
    phone,
    jobRole,
    teamId,
    companyId,
    vexelId,
    role: 'EMPLOYEE',
    status: 'invited',
    quota: {
      allocated: allocatedQuota,
      used: 0,
      remaining: allocatedQuota,
      percent: 0,
      status: 'healthy'
    },
    savings: {
      cacheHits: 0,
      savedFromCaching: 0,
      savedFromCompression: 0,
      totalSaved: 0
    }
  };

  members.push(newMember);
  saveMembers(members);

  // Background Push to Supabase
  supabase
    .from('members')
    .insert([mapMemberToSupabase(newMember)])
    .select()
    .then(({ data, error }) => {
      if (!error && data && data[0]) {
        // Update local cache member with real Postgres UUID
        const updated = getMembers().map(m => m.email.toLowerCase() === email.toLowerCase() ? mapSupabaseToMember(data[0]) : m);
        saveMembers(updated);
      } else if (error) {
        console.error('❌ Supabase Push Error:', error.message);
      }
    });

  return newMember;
}

export function updateMemberQuota(memberId: string, allocated: number): void {
  const members = getMembers();
  const updated = members.map(m => {
    if (m.id === memberId) {
      const used = m.quota.used;
      const remaining = Math.max(0, allocated - used);
      const percent = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
      const status: 'healthy' | 'warning' | 'blocked' = 
        percent >= 100 ? 'blocked' : percent >= 80 ? 'warning' : 'healthy';

      const updatedMember = {
        ...m,
        quota: { allocated, used, remaining, percent, status }
      };

      // Push Update to Supabase in Background
      supabase
        .from('members')
        .update(mapMemberToSupabase(updatedMember))
        .eq(isUuid(memberId) ? 'id' : 'email', isUuid(memberId) ? memberId : m.email)
        .then(({ error }) => {
          if (error) console.error('❌ Supabase Quota Update Error:', error.message);
        });

      return updatedMember;
    }
    return m;
  });
  saveMembers(updated);
}

export function activateMember(memberId: string, details: Partial<Member>): void {
  const members = getMembers();
  const updated = members.map(m => {
    if (m.id === memberId) {
      const updatedMember = {
        ...m,
        ...details,
        status: 'active' as const
      };

      // Push Update to Supabase in Background
      supabase
        .from('members')
        .update(mapMemberToSupabase(updatedMember))
        .eq(isUuid(memberId) ? 'id' : 'email', isUuid(memberId) ? memberId : m.email)
        .then(({ error }) => {
          if (error) console.error('❌ Supabase Onboarding Activation Error:', error.message);
        });

      return updatedMember;
    }
    return m;
  });
  saveMembers(updated);
}


// ─── Logs ───
export function getUsageLogs(): UsageLog[] {
  return getStorageItem<UsageLog[]>('tv_usage_logs', []);
}

export function saveUsageLogs(logs: UsageLog[]): void {
  setStorageItem('tv_usage_logs', logs);
}

export function addUsageLog(userId: string, log: Omit<UsageLog, 'id' | 'userId' | 'timestamp'>): void {
  const logs = getUsageLogs();
  const newLog: UsageLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    userId,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(newLog); // newest first
  saveUsageLogs(logs);

  // Update user quota used count locally
  const members = getMembers();
  const updated = members.map(m => {
    if (m.id === userId) {
      const used = m.quota.used + log.totalTokens;
      const allocated = m.quota.allocated;
      const remaining = Math.max(0, allocated - used);
      const percent = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
      const status: 'healthy' | 'warning' | 'blocked' = 
        percent >= 100 ? 'blocked' : percent >= 80 ? 'warning' : 'healthy';

      const savings = { ...m.savings };
      if (log.cached) {
        savings.cacheHits += 1;
        savings.savedFromCaching += Math.round(log.totalTokens * 0.4);
      }
      if (log.compressed) {
        savings.savedFromCompression += Math.round(log.totalTokens * 0.25);
      }
      savings.totalSaved = savings.savedFromCaching + savings.savedFromCompression;

      const updatedMember = {
        ...m,
        quota: { allocated, used, remaining, percent, status },
        savings
      };

      // Push Update to Supabase in Background
      supabase
        .from('members')
        .update(mapMemberToSupabase(updatedMember))
        .eq(isUuid(userId) ? 'id' : 'email', isUuid(userId) ? userId : m.email)
        .then(({ error }) => {
          if (error) console.error('❌ Supabase Member Stats Sync Error:', error.message);
        });

      return updatedMember;
    }
    return m;
  });
  saveMembers(updated);

  // Push Usage Log to Supabase in Background
  supabase
    .from('usage_logs')
    .insert([{
      user_id: isUuid(userId) ? userId : null,
      model_used: log.modelUsed,
      total_tokens: log.totalTokens,
      cost_usd: log.costUsd,
      cached: log.cached,
      compressed: log.compressed,
      task_type: log.taskType
    }])
    .then(({ error }) => {
      if (error) console.error('❌ Supabase Log Insert Error:', error.message);
    });
}

// ─── Seed Admin Fallback (if storage is totally empty) ───
export function seedDefaultAdmin(email: string, name: string, companyId: string): Member {
  const members = getMembers();
  const adminExists = members.find(m => m.email === email);
  if (adminExists) return adminExists;

  const newAdmin: Member = {
    id: isUuid(companyId) ? `admin-${Date.now()}` : `admin-${Date.now()}`,
    name,
    email,
    phone: '1234567890',
    jobRole: 'Workspace Owner',
    teamId: '',
    companyId,
    vexelId: 'ADMIN-ID',
    password: 'demo1234',
    role: 'ADMIN',
    status: 'active',
    quota: { allocated: 0, used: 0, remaining: 0, percent: 0, status: 'healthy' },
    savings: { cacheHits: 0, savedFromCaching: 0, savedFromCompression: 0, totalSaved: 0 }
  };
  members.push(newAdmin);
  saveMembers(members);

  // Background Push to Supabase
  supabase
    .from('members')
    .insert([mapMemberToSupabase(newAdmin)])
    .then(({ error }) => {
      if (error) console.error('❌ Supabase Admin Seed Error:', error.message);
    });

  return newAdmin;
}

// ─── Workspace API Settings ───
export interface CompanyApiConfig {
  companyId: string;
  provider: string;
  apiKey: string;
}

export function getCompanyApiConfigs(): CompanyApiConfig[] {
  return getStorageItem<CompanyApiConfig[]>('tv_company_api_configs', []);
}

export function saveCompanyApiConfigs(configs: CompanyApiConfig[]): void {
  setStorageItem('tv_company_api_configs', configs);
}

export function getCompanyApiConfig(companyId: string): CompanyApiConfig | null {
  const configs = getCompanyApiConfigs();
  return configs.find(c => c.companyId === companyId) || null;
}

export function updateCompanyApiConfig(companyId: string, provider: string, apiKey: string): void {
  const configs = getCompanyApiConfigs();
  const index = configs.findIndex(c => c.companyId === companyId);
  const newConfig = { companyId, provider, apiKey };
  if (index >= 0) {
    configs[index] = newConfig;
  } else {
    configs.push(newConfig);
  }
  saveCompanyApiConfigs(configs);

  // Background Push to Supabase
  supabase
    .from('api_configs')
    .upsert({
      company_id: isUuid(companyId) ? companyId : undefined,
      provider,
      api_key: apiKey
    })
    .then(({ error }) => {
      if (error) console.error('❌ Supabase API Config Sync Error:', error.message);
    });
}

// ─── Deletion Helpers ───
export function removeMember(memberId: string): void {
  const members = getMembers();
  const updated = members.filter(m => m.id !== memberId);
  saveMembers(updated);
  
  supabase
    .from('members')
    .delete()
    .eq(isUuid(memberId) ? 'id' : 'email', isUuid(memberId) ? memberId : members.find(m => m.id === memberId)?.email)
    .then(({ error }) => {
      if (error) console.error('❌ Supabase Remove Member Error:', error.message);
    });
}

export function removeTeam(teamId: string): void {
  const teams = getTeams();
  const updated = teams.filter(t => t.id !== teamId);
  saveTeams(updated);

  supabase
    .from('teams')
    .delete()
    .eq(isUuid(teamId) ? 'id' : 'name', isUuid(teamId) ? teamId : teams.find(t => t.id === teamId)?.name)
    .then(({ error }) => {
      if (error) console.error('❌ Supabase Remove Team Error:', error.message);
    });
}

export function deleteWorkspace(companyId: string): void {
  const members = getMembers();
  const remainingMembers = members.filter(m => m.companyId !== companyId);
  saveMembers(remainingMembers);

  const teams = getTeams();
  const remainingTeams = teams.filter(t => t.companyId !== companyId);
  saveTeams(remainingTeams);
  
  const configs = getCompanyApiConfigs();
  const remainingConfigs = configs.filter(c => c.companyId !== companyId);
  saveCompanyApiConfigs(remainingConfigs);

  // Note: user must also handle logging out after workspace deletion
  // since the workspace data is gone.
  
  if (isUuid(companyId)) {
    supabase.from('members').delete().eq('company_id', companyId).then();
    supabase.from('teams').delete().eq('company_id', companyId).then();
    supabase.from('api_configs').delete().eq('company_id', companyId).then();
  }
}
