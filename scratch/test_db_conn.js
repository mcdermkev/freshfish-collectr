const { Client } = require('pg');

async function run() {
  const password = encodeURIComponent('Fu+3y@%?a$7-MSR');
  const connectionString = `postgresql://postgres:${password}@db.eybxazurluxacahrqubm.supabase.co:5432/postgres`;
  
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to Supabase DB successfully.');
    
    // 1. Check for users in profiles
    const { rows: profiles } = await client.query('SELECT id, display_name FROM public.profiles');
    console.log('Profiles:', JSON.stringify(profiles, null, 2));
    
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

run();
