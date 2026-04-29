const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name');
    
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  console.log('Users in profiles table:');
  console.log(JSON.stringify(data, null, 2));
}

getUsers();
