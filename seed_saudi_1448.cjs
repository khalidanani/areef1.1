const { Client } = require('pg');
const connectionString = 'postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function seed() {
  try {
    await client.connect();
    console.log('Connected. Clearing old books and inserting Saudi Curriculum 1448 AH...');
    
    // We will not delete existing homeworks if they depend on old books, 
    // wait, if we delete books, CASCADE will delete chapters, lessons, questions, homework_questions!
    // Let's just insert them alongside or delete. The user asked to add the list. We can clear or append.
    // Let's clear to make it clean.
    await client.query('DELETE FROM books');

    const booksToInsert = [];
    
    const primaryGrades = ['الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي'];
    const primarySubjects = ['الرياضيات', 'العلوم', 'لغتي', 'الدراسات الإسلامية', 'الدراسات الاجتماعية', 'اللغة الإنجليزية', 'المهارات الرقمية', 'التربية الفنية', 'التربية البدنية'];
    
    const intermediateGrades = ['الأول متوسط', 'الثاني متوسط', 'الثالث متوسط'];
    const intermediateSubjects = ['الرياضيات', 'العلوم', 'لغتي الخالدة', 'الدراسات الإسلامية', 'الدراسات الاجتماعية', 'اللغة الإنجليزية (Super Goal)', 'المهارات الرقمية', 'التفكير الناقد'];

    const highschoolTracks = [
      { title: 'الرياضيات 1-1', subject: 'الرياضيات' },
      { title: 'الرياضيات 1-2', subject: 'الرياضيات' },
      { title: 'الرياضيات 2-1', subject: 'الرياضيات' },
      { title: 'فيزياء 1', subject: 'الفيزياء' },
      { title: 'فيزياء 2', subject: 'الفيزياء' },
      { title: 'كيمياء 1', subject: 'الكيمياء' },
      { title: 'كيمياء 2', subject: 'الكيمياء' },
      { title: 'أحياء 1', subject: 'الأحياء' },
      { title: 'علم البيئة 1-1', subject: 'علم البيئة' },
      { title: 'التقنية الرقمية 1-1', subject: 'الحاسب الآلي' },
      { title: 'التقنية الرقمية 1-2', subject: 'الحاسب الآلي' },
      { title: 'الكفايات اللغوية 1', subject: 'اللغة العربية' },
      { title: 'الكفايات اللغوية 2', subject: 'اللغة العربية' },
      { title: 'الدراسات الإسلامية 1', subject: 'الدراسات الإسلامية' },
      { title: 'اللغة الإنجليزية (Mega Goal 1)', subject: 'اللغة الإنجليزية' },
      { title: 'اللغة الإنجليزية (Mega Goal 2)', subject: 'اللغة الإنجليزية' },
      { title: 'المعرفة المالية', subject: 'الإدارة والمال' },
      { title: 'التفكير الناقد', subject: 'الفلسفة والتفكير' }
    ];

    let queryCount = 1;
    let values = [];
    let placeholders = [];

    // Helper to add
    const addBook = (title, subject, grade, term) => {
      values.push(title, subject, grade, term);
      placeholders.push(`($${queryCount}, $${queryCount+1}, $${queryCount+2}, $${queryCount+3})`);
      queryCount += 4;
    };

    // Primary
    for (const grade of primaryGrades) {
      for (const sub of primarySubjects) {
        addBook(`${sub} - الصف ${grade}`, sub, grade, 'الفصل الأول (1448)');
      }
    }

    // Intermediate
    for (const grade of intermediateGrades) {
      for (const sub of intermediateSubjects) {
        addBook(`${sub} - الصف ${grade}`, sub, grade, 'الفصل الأول (1448)');
      }
    }

    // High School (نظام المسارات)
    for (const hs of highschoolTracks) {
      addBook(`${hs.title} (مسارات)`, hs.subject, 'المرحلة الثانوية', 'الفصل الأول (1448)');
    }

    // Insert all
    const queryStr = `INSERT INTO books (title, subject, grade_level, term) VALUES ${placeholders.join(', ')} RETURNING id;`;
    
    console.log(`Inserting ${placeholders.length} books...`);
    const res = await client.query(queryStr, values);
    
    console.log('✅ 1448 AH Curriculums inserted successfully!');

    // Let's add at least one chapter and lesson to "الرياضيات - الصف الثاني متوسط" so the app is not completely empty of questions
    const math2ndIntId = res.rows.find((r, i) => values[i*4] === 'الرياضيات - الصف الثاني متوسط')?.id;
    
    if (math2ndIntId) {
      const chapterRes = await client.query(`INSERT INTO chapters (book_id, title, chapter_order) VALUES ($1, 'الجبر والدوال', 1) RETURNING id;`, [math2ndIntId]);
      const chapterId = chapterRes.rows[0].id;

      const lessonRes = await client.query(`INSERT INTO lessons (chapter_id, title, lesson_order) VALUES ($1, 'المعادلات ذات الخطوتين', 1) RETURNING id;`, [chapterId]);
      const lessonId = lessonRes.rows[0].id;

      await client.query(`
        INSERT INTO questions (lesson_id, question_text, question_type, correct_answer, options, difficulty_level) 
        VALUES 
        ($1, 'حل المعادلة: 2س + 3 = 11', 'مقالي', 'س = 4', null, 'متوسط'),
        ($1, 'حل المعادلة: 5ص - 2 = 13', 'مقالي', 'ص = 3', null, 'سهل'),
        ($1, 'إذا كان 3م + 4 = 25 ، فما قيمة م؟', 'خيارات', '7', '["5", "6", "7", "8"]', 'متوسط');
      `, [lessonId]);
      console.log('Added sample questions to Math 2nd Intermediate');
    }

  } catch (err) {
    console.error('❌ Error seeding:', err);
  } finally {
    await client.end();
  }
}

seed();
