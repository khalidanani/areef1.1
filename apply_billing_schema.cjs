const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const ddl = `
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      plan_name VARCHAR(50) NOT NULL DEFAULT 'free',
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      period_end TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      UNIQUE(user_id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      amount DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'SAR',
      status VARCHAR(50) NOT NULL DEFAULT 'paid',
      payment_method VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `;
  await client.query(ddl);
  console.log('Phase 10 schema applied (subscriptions and invoices).');
  await client.end();
}

run().catch(console.error);
