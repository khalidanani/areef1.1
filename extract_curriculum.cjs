const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const { Client } = require('pg');

require('dotenv').config();
const API_KEY = process.env.VITE_GEMINI_API_KEY;
const connectionString = "postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("الرجاء تحديد مسار ملف الـ PDF! مثال:");
    console.error("node extract_curriculum.cjs book.pdf");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`الملف غير موجود: ${filePath}`);
    process.exit(1);
  }

  console.log("⏳ جاري رفع الملف إلى Google Gemini...");
  const fileManager = new GoogleAIFileManager(API_KEY);
  
  // Detect mime type simply from extension
  const mimeType = filePath.toLowerCase().endsWith('.txt') ? 'text/plain' : 'application/pdf';

  const uploadResult = await fileManager.uploadFile(filePath, {
    mimeType: mimeType,
    displayName: "Curriculum Document",
  });
  console.log(`✅ تم الرفع بنجاح!`);

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
You are an expert educational curriculum extractor. Read the provided document (PDF/Text) and extract the curriculum structure, lessons, and multiple choice/essay questions.
Output valid JSON ONLY. Do not wrap with markdown (like \`\`\`json). Just the raw JSON object.
The JSON MUST perfectly match this structure:
{
  "book": {
    "title": "Book Name (e.g. رياضيات الصف الأول)",
    "subject": "Subject Name",
    "grade_level": "Grade (e.g. الأول متوسط)",
    "term": "Term (e.g. الفصل الأول)",
    "chapters": [
      {
        "title": "Chapter Name",
        "chapter_order": 1,
        "lessons": [
          {
            "title": "Lesson Name",
            "lesson_order": 1,
            "questions": [
              {
                "question_text": "The actual question",
                "question_type": "خيارات", 
                "correct_answer": "The correct answer as a string",
                "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                "difficulty_level": "متوسط"
              },
              {
                "question_text": "An essay question",
                "question_type": "مقالي", 
                "correct_answer": "The expected answer",
                "options": null,
                "difficulty_level": "سهل"
              }
            ]
          }
        ]
      }
    ]
  }
}
Note: 
- 'question_type' must be exactly 'خيارات' or 'مقالي'.
- 'difficulty_level' must be 'سهل' or 'متوسط' or 'صعب'.
Extract up to 3 chapters, 3 lessons per chapter, and 3-5 questions per lesson.
`;

  console.log("🧠 جاري تحليل المحتوى بواسطة الذكاء الاصطناعي (قد يستغرق الأمر دقيقة)...");
  
  try {
    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResult.file.mimeType,
          fileUri: uploadResult.file.uri
        }
      },
      { text: prompt }
    ]);

    let responseText = result.response.text();
    // Clean markdown if Gemini accidentally included it
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("❌ فشل الذكاء الاصطناعي في إخراج JSON صالح. النص المخرج كان:");
      console.log(responseText);
      process.exit(1);
    }

    console.log(`✅ تم تحليل الكتاب: ${data.book.title}`);
    console.log(`📡 جاري الحفظ في قاعدة البيانات (Supabase)...`);
    
    const client = new Client({ connectionString });
    await client.connect();

    try {
      const bookRes = await client.query(
        "INSERT INTO books (title, subject, grade_level, term) VALUES ($1, $2, $3, $4) RETURNING id",
        [data.book.title, data.book.subject, data.book.grade_level, data.book.term || 'الفصل الأول']
      );
      const bookId = bookRes.rows[0].id;

      for (const chapter of data.book.chapters) {
        const chapterRes = await client.query(
          "INSERT INTO chapters (book_id, title, chapter_order) VALUES ($1, $2, $3) RETURNING id",
          [bookId, chapter.title, chapter.chapter_order]
        );
        const chapterId = chapterRes.rows[0].id;
        
        for (const lesson of chapter.lessons) {
          const lessonRes = await client.query(
            "INSERT INTO lessons (chapter_id, title, lesson_order) VALUES ($1, $2, $3) RETURNING id",
            [chapterId, lesson.title, lesson.lesson_order]
          );
          const lessonId = lessonRes.rows[0].id;
          
          if (lesson.questions) {
            for (const q of lesson.questions) {
               await client.query(
                 "INSERT INTO questions (lesson_id, question_text, question_type, correct_answer, options, difficulty_level) VALUES ($1, $2, $3, $4, $5, $6)",
                 [lessonId, q.question_text, q.question_type, q.correct_answer, q.options ? JSON.stringify(q.options) : null, q.difficulty_level || 'متوسط']
               );
            }
          }
        }
      }
      console.log("🎉 تمت العملية بنجاح! تم استخراج جميع الفصول، الدروس، والأسئلة وحفظها في النظام.");
    } catch (err) {
      console.error("❌ خطأ أثناء الحفظ في قاعدة البيانات:", err.message);
    } finally {
      await client.end();
    }
  } catch (aiError) {
    console.error("❌ خطأ في الاتصال بالذكاء الاصطناعي:", aiError.message);
  }
}

run();
