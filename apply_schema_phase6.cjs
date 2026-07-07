const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const ddl = `
    DROP TABLE IF EXISTS student_responses CASCADE;
    DROP TABLE IF EXISTS class_enrollments CASCADE;
    DROP TABLE IF EXISTS students CASCADE;

    CREATE TABLE students (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    CREATE TABLE class_enrollments (
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      PRIMARY KEY (student_id, class_id)
    );

    CREATE TABLE student_responses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
      homework_id UUID REFERENCES homeworks(id) ON DELETE CASCADE,
      question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
      student_id UUID REFERENCES students(id) ON DELETE CASCADE,
      conversation_log JSONB NOT NULL DEFAULT '[]'::jsonb,
      grade INTEGER,
      feedback TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(homework_id, question_id, student_id)
    );
  `;
  await client.query(ddl);
  console.log('Phase 6 schema applied.');
  await client.end();
}

run().catch(console.error);
