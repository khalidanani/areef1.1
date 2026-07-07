const { Client } = require('pg');
const connectionString = "postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

async function cleanup() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log("🧹 جاري فحص قاعدة البيانات للمواد الفارغة...");
  
  try {
    // Delete books that have no corresponding lessons with questions
    const res = await client.query(`
      DELETE FROM books 
      WHERE id NOT IN (
        SELECT c.book_id 
        FROM chapters c 
        JOIN lessons l ON l.chapter_id = c.id 
        JOIN questions q ON q.lesson_id = l.id
      )
      RETURNING id, title;
    `);

    if (res.rows.length === 0) {
      console.log("✅ لم يتم العثور على أي مواد فارغة للحذف.");
    } else {
      console.log(`🗑️ تم حذف ${res.rows.length} مادة ليس لها بنك أسئلة:`);
      res.rows.forEach(r => console.log(`- ${r.title}`));
    }
  } catch (err) {
    console.error("❌ خطأ أثناء الحذف:", err.message);
  } finally {
    await client.end();
  }
}

cleanup();
