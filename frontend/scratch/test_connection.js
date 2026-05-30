const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dwbfdybkyjqspxppnrtf.supabase.co';
const supabaseAnonKey = 'sb_publishable_Nv1FGjrcHjffAdbViaupYw_FBQl7Mj3';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log('Inserting test row to verify schema...');
  
  const testMember = {
    name: 'Supabase Tester',
    email: 'tester@supabase.io',
    phone: '1234567890',
    job_role: 'QA Engineer',
    vexel_id: 'VEX-TEST-999',
    role: 'EMPLOYEE',
    status: 'active',
    quota_allocated: 50000000,
    quota_used: 0,
    quota_remaining: 50000000,
    quota_percent: 0,
    quota_status: 'healthy',
    savings_cache_hits: 0,
    savings_saved_from_caching: 0,
    savings_saved_from_compression: 0,
    savings_total_saved: 0
  };

  const { data, error } = await supabase
    .from('members')
    .insert([testMember])
    .select();

  if (error) {
    console.error('❌ Insert Error:', error.message, error.details);
  } else {
    console.log('✅ Insert Successful! Returned row:', data);
    const testId = data[0].id;
    
    // Clean up
    const { error: delErr } = await supabase
      .from('members')
      .delete()
      .eq('id', testId);
    console.log('🗑 Cleanup status:', delErr ? 'Failed' : 'Successful');
  }
}

testInsert();
