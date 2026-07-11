const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  const ddl = `
    -- 1. Classes Table Indices
    CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_classes_join_code ON classes(join_code);
    
    -- Ensure join_code is strictly unique
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classes_join_code_key') THEN
        ALTER TABLE classes ADD CONSTRAINT classes_join_code_key UNIQUE(join_code);
      END IF;
    END $$;

    -- 2. Class Enrollments Indices
    CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON class_enrollments(student_id);
    CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments(class_id);

    -- 3. Homeworks Indices
    CREATE INDEX IF NOT EXISTS idx_homeworks_class_id ON homeworks(class_id);

    -- 4. Homework Questions Indices
    CREATE INDEX IF NOT EXISTS idx_homework_questions_homework_id ON homework_questions(homework_id);

    -- 5. Student Responses Indices
    CREATE INDEX IF NOT EXISTS idx_student_responses_class_id ON student_responses(class_id);
    CREATE INDEX IF NOT EXISTS idx_student_responses_student_id ON student_responses(student_id);
    CREATE INDEX IF NOT EXISTS idx_student_responses_homework_id ON student_responses(homework_id);
    CREATE INDEX IF NOT EXISTS idx_student_responses_question_id ON student_responses(question_id);
  `;

  try {
    console.log("Applying database indices for scaling...");
    await client.query(ddl);
    console.log('Database indices and constraints successfully applied.');
  } catch (err) {
    console.error('Error applying indices:', err);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
