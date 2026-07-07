const { Client } = require('pg');
const connectionString = 'postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

const client = new Client({ connectionString });

async function seed() {
  try {
    await client.connect();
    console.log('Connected. Creating homework tables...');
    
    // Create homework tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS homeworks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        due_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS homework_questions (
        homework_id UUID NOT NULL REFERENCES homeworks(id) ON DELETE CASCADE,
        question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        PRIMARY KEY (homework_id, question_id)
      );
      
      ALTER TABLE homeworks ENABLE ROW LEVEL SECURITY;
      ALTER TABLE homework_questions ENABLE ROW LEVEL SECURITY;
      
      -- Drop policies if they exist to avoid errors
      DROP POLICY IF EXISTS "Teachers can manage homeworks" ON homeworks;
      DROP POLICY IF EXISTS "Anyone can read homework_questions" ON homework_questions;
      
      CREATE POLICY "Teachers can manage homeworks" ON homeworks FOR ALL USING (true);
      CREATE POLICY "Anyone can read homework_questions" ON homework_questions FOR SELECT USING (true);
    `);
    console.log('Homework tables created.');

    console.log('Inserting mock curriculum data...');
    // Clean existing data for safety
    await client.query('DELETE FROM books');
    
    // Insert Book
    const bookRes = await client.query(`
      INSERT INTO books (title, subject, grade_level, term) 
      VALUES ('رياضيات الصف الثاني متوسط', 'الرياضيات', 'الثاني متوسط', 'الفصل الأول') 
      RETURNING id;
    `);
    const bookId = bookRes.rows[0].id;

    // Insert Chapter
    const chapterRes = await client.query(`
      INSERT INTO chapters (book_id, title, chapter_order) 
      VALUES ($1, 'الجبر والدوال', 1) 
      RETURNING id;
    `, [bookId]);
    const chapterId = chapterRes.rows[0].id;

    // Insert Lesson
    const lessonRes = await client.query(`
      INSERT INTO lessons (chapter_id, title, lesson_order) 
      VALUES ($1, 'المعادلات ذات الخطوتين', 1) 
      RETURNING id;
    `, [chapterId]);
    const lessonId = lessonRes.rows[0].id;

    // Insert Questions
    await client.query(`
      INSERT INTO questions (lesson_id, question_text, question_type, correct_answer, options, difficulty_level) 
      VALUES 
      ($1, 'حل المعادلة: 2س + 3 = 11', 'مقالي', 'س = 4', null, 'متوسط'),
      ($1, 'حل المعادلة: 5ص - 2 = 13', 'مقالي', 'ص = 3', null, 'سهل'),
      ($1, 'إذا كان 3م + 4 = 25 ، فما قيمة م؟', 'خيارات', '7', '["5", "6", "7", "8"]', 'متوسط');
    `, [lessonId]);

    console.log('✅ Mock curriculum seeded successfully!');
  } catch (err) {
    console.error('❌ Error seeding:', err);
  } finally {
    await client.end();
  }
}

seed();
