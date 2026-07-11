const { Client } = require('pg');
const connectionString = "postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";
const client = new Client({ connectionString });

client.connect().then(async () => {
  try {
    await client.query(`DROP POLICY IF EXISTS "Students can insert their own data" ON students;`);
    await client.query(`CREATE POLICY "Students can insert their own data" ON students FOR INSERT WITH CHECK (auth.uid() = id);`);
    
    // Also we need UPDATE policy for their own data if they change names later
    await client.query(`DROP POLICY IF EXISTS "Students can update their own data" ON students;`);
    await client.query(`CREATE POLICY "Students can update their own data" ON students FOR UPDATE USING (auth.uid() = id);`);
    
    console.log('Success');
  } catch(e) {
    console.error(e);
  }
  client.end();
});
