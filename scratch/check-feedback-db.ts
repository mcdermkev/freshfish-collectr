import { createClient } from '@supabase/supabase-js';

async function checkTable() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Checking beta_feedback table...');
  
  // Try to select from the table
  const { data, error } = await supabase
    .from('beta_feedback')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error selecting from beta_feedback:', error);
    if (error.code === '42P01') {
      console.log('💡 Table "beta_feedback" does not exist.');
    }
  } else {
    console.log('✅ Table "beta_feedback" exists!');
    console.log('Sample data:', data);
    
    // Check columns by trying an insert with 'content'
    const { error: insertError } = await supabase
      .from('beta_feedback')
      .insert({
        type: 'Bug',
        content: 'Test column check',
        page_url: 'http://localhost:3000'
      });
      
    if (insertError) {
      console.error('❌ Insert with "content" failed:', insertError);
    } else {
      console.log('✅ Insert with "content" succeeded!');
    }
  }
}

checkTable();
