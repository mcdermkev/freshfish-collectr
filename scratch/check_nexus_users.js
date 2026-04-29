const { Client } = require('pg');

async function run() {
  const password = encodeURIComponent('Fu+3y@%?a$7-MSR');
  const connectionString = `postgresql://postgres:${password}@db.ebhasyabxlfskwyvtvhq.supabase.co:5432/postgres`;
  
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    const { rows: users } = await client.query('SELECT id, email FROM auth.users');
    console.log('Users in Nexus auth:', JSON.stringify(users, null, 2));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
