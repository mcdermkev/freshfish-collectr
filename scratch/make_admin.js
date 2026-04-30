const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function makeAdmin(email) {
  console.log(`Attempting to make ${email} an admin...`);

  // 1. Find user in auth.users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  const user = users.find(u => u.email === email);
  
  if (!user) {
    console.error(`User with email ${email} not found in auth.users`);
    return;
  }

  console.log(`Found user: ${user.id}`);

  // 2. Check profiles table columns
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error('Error checking profile:', profileError);
    return;
  }

  if (!profileData) {
    console.log('Profile not found, creating one...');
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        is_admin: true
      });
    
    if (insertError) {
      console.error('Error creating profile:', insertError);
    } else {
      console.log(`Successfully created admin profile for ${email}`);
    }
  } else {
    console.log('Profile found, updating...');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        is_admin: true,
        email: user.email
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
    } else {
      console.log(`Successfully made ${email} an admin`);
    }
  }
}

const targetEmail = 'ggsteve92@gmail.com';
makeAdmin(targetEmail);
