const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const ddl = `
    CREATE TABLE IF NOT EXISTS student_responses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
      homework_id UUID REFERENCES homeworks(id) ON DELETE CASCADE,
      question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
      student_name TEXT NOT NULL,
      conversation_log JSONB NOT NULL DEFAULT '[]'::jsonb,
      grade INTEGER,
      feedback TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(homework_id, question_id, student_name)
    );
  `;
  await client.query(ddl);
  console.log('Table student_responses created.');
  await client.end();
}

run().catch(console.error);
