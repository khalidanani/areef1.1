const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const ddl = `
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS page_number VARCHAR(50);
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS exercise_number VARCHAR(50);
  `;
  await client.query(ddl);
  console.log('Phase 8 schema applied (added page_number and exercise_number).');
  await client.end();
}

run().catch(console.error);
