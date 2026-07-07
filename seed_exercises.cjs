const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  
  // Get Math 1st Intermediate Book ID
  const bookRes = await client.query(`SELECT id FROM books WHERE title = 'الرياضيات - الصف الأول متوسط' LIMIT 1`);
  if (bookRes.rows.length === 0) {
    console.log('Book not found.');
    return;
  }
  const bookId = bookRes.rows[0].id;

  // Clear existing chapters for this book to avoid duplicates
  await client.query(`DELETE FROM chapters WHERE book_id = $1`, [bookId]);

  // Insert Chapter 1
  const chapRes = await client.query(`INSERT INTO chapters (book_id, title, chapter_order) VALUES ($1, 'الفصل الأول: الجبر والدوال', 1) RETURNING id`, [bookId]);
  const chapId = chapRes.rows[0].id;

  // Insert Lesson 1
  const less1Res = await client.query(`INSERT INTO lessons (chapter_id, title, lesson_order) VALUES ($1, '1-1 الخطوات الأربع لحل المسألة', 1) RETURNING id`, [chapId]);
  const less1Id = less1Res.rows[0].id;

  // Insert questions for Lesson 1
  await client.query(`
    INSERT INTO questions (lesson_id, question_text, question_type, correct_answer, difficulty_level, page_number, exercise_number) VALUES 
    ($1, 'استعمل الخطوات الأربع لحل المسألة: إذا كان ثمن تذكرة الدخول لحديقة الحيوان 10 ريالات للبالغ و 5 ريالات للطفل، فما الثمن الكلي لتذاكر عائلة مكونة من والدين و 3 أطفال؟', 'مقالي', '35 ريال', 'متوسط', '14', '1'),
    ($1, 'يبين الجدول أدناه أسعار تذاكر الدخول لمتحف. ما الثمن الكلي لتذاكر 4 بالغين وطفلين؟', 'مقالي', 'الثمن 60 ريالاً', 'سهل', '14', '2'),
    ($1, 'لدى خالد 50 ريالاً، اشترى 3 وجبات بسعر 12 ريالاً للوجبة. كم ريالاً بقي معه؟', 'مقالي', '14 ريال', 'متوسط', '15', '5')
  `, [less1Id]);

  // Insert Lesson 2
  const less2Res = await client.query(`INSERT INTO lessons (chapter_id, title, lesson_order) VALUES ($1, '1-2 القوى والأسس', 2) RETURNING id`, [chapId]);
  const less2Id = less2Res.rows[0].id;

  // Insert questions for Lesson 2
  await client.query(`
    INSERT INTO questions (lesson_id, question_text, question_type, correct_answer, options, difficulty_level, page_number, exercise_number) VALUES 
    ($1, 'اكتب كل قوة على صورة ضرب العامل في نفسه: 7²', 'مقالي', '7 × 7', null, 'سهل', '18', '1'),
    ($1, 'اكتب كل قوة على صورة ضرب العامل في نفسه: 5⁴', 'مقالي', '5 × 5 × 5 × 5', null, 'سهل', '18', '2'),
    ($1, 'احسب قيمة القوة: 2³', 'خيارات', '8', '["4", "6", "8", "16"]', 'متوسط', '18', '6')
  `, [less2Id]);

  console.log('Seed sample exercises for Math 1st Intermediate completed.');
  await client.end();
}

run().catch(console.error);
