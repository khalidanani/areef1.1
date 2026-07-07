const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const { Client } = require('pg');

require('dotenv').config();
const API_KEY = process.env.VITE_GEMINI_API_KEY;
const connectionString = "postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";
const EXTRACT_DIR = path.join(__dirname, 'curricula_extracted');

const genAI = new GoogleGenerativeAI(API_KEY);
const fileManager = new GoogleAIFileManager(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function findPdfs(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      findPdfs(path.join(dir, file), fileList);
    } else if (file.toLowerCase().endsWith('.pdf')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

async function processPdf(filePath, client) {
  console.log(`\n⏳ جاري معالجة: ${path.basename(filePath)}`);
  
  try {
    const uploadResult = await fileManager.uploadFile(filePath, {
      mimeType: 'application/pdf',
      displayName: path.basename(filePath),
    });
    
    console.log(`✅ تم الرفع للذكاء الاصطناعي بنجاح.`);

    const prompt = `
You are an expert educational curriculum extractor. Read the provided document (PDF/Text) and extract the curriculum structure, lessons, and multiple choice/essay questions.
Output valid JSON ONLY. Do not wrap with markdown. Just the raw JSON object.
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
              }
            ]
          }
        ]
      }
    ]
  }
}
Note: 
- 'question_type' must be 'خيارات' or 'مقالي'.
- 'difficulty_level' must be 'سهل' or 'متوسط' or 'صعب'.
Extract up to 2 chapters, 2 lessons per chapter, and 2 questions per lesson (to keep it fast).
`;

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResult.file.mimeType,
          fileUri: uploadResult.file.uri
        }
      },
      { text: prompt }
    ]);

    let responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(responseText);

    console.log(`✅ تم التحليل: ${data.book.title} - جاري الحفظ...`);
    
    // Check if book exists to avoid duplicates
    const checkRes = await client.query("SELECT id FROM books WHERE title = $1", [data.book.title]);
    if (checkRes.rows.length > 0) {
      console.log(`⚠️ الكتاب موجود مسبقاً، سيتم تخطيه.`);
      return;
    }

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
    console.log(`🎉 تم استخراج المنهج بنجاح: ${data.book.title}`);

  } catch (err) {
    console.error(`❌ خطأ في معالجة الملف: ${err.message}`);
  }
}

async function run() {
  console.log("🚀 بدء تشغيل سكريبت المعالجة الشاملة للمناهج...");

  // 1. Find all ZIP files
  const files = fs.readdirSync(__dirname);
  const zipFiles = files.filter(f => f.endsWith('.zip'));

  if (!fs.existsSync(EXTRACT_DIR)) {
    fs.mkdirSync(EXTRACT_DIR);
  }

  // 2. Extract ZIPs using PowerShell (ignoring errors if already extracted)
  for (const zip of zipFiles) {
    console.log(`📦 جاري فك ضغط: ${zip}`);
    try {
      execSync(`powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Expand-Archive -LiteralPath '${zip}' -DestinationPath '${EXTRACT_DIR}' -Force"`, { stdio: 'ignore' });
    } catch (e) {
      console.log(`⚠️ تم تخطي فك الضغط (ربما مفكوك مسبقاً).`);
    }
  }

  // 3. Find PDFs
  const pdfFiles = findPdfs(EXTRACT_DIR);
  console.log(`📚 تم العثور على ${pdfFiles.length} كتاب (PDF).`);

  if (pdfFiles.length === 0) {
    console.log("لم يتم العثور على ملفات لمعالجتها.");
    return;
  }

  const pgClient = new Client({ connectionString });
  await pgClient.connect();

  // 4. Process PDFs with Rate Limiting (5-6 seconds delay to respect 15 RPM limits)
  for (let i = 0; i < pdfFiles.length; i++) {
    const pdf = pdfFiles[i];
    console.log(`\n--- معالجة ملف ${i + 1} من ${pdfFiles.length} ---`);
    await processPdf(pdf, pgClient);
    
    if (i < pdfFiles.length - 1) {
      console.log("⏳ الانتظار 6 ثوانٍ لتفادي حظر (Gemini Rate Limit)...");
      await sleep(6000);
    }
  }

  await pgClient.end();
  console.log("\n✅ تمت معالجة جميع المناهج بنجاح!");
}

run();
