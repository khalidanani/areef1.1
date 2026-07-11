const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  const ddl = `
    -- Delete users from 'teachers' table if they are also in 'students' table 
    -- AND they have never created a class (meaning they are just students who accidentally visited the teacher dashboard).
    DELETE FROM teachers 
    WHERE id IN (
      SELECT t.id FROM teachers t 
      JOIN students s ON t.id = s.id 
      LEFT JOIN classes c ON c.teacher_id = t.id 
      WHERE c.id IS NULL
    );
  `;

  try {
    console.log("Cleaning up accidentally mixed roles...");
    const result = await client.query(ddl);
    console.log(`Cleanup complete. Removed ${result.rowCount} accidental teacher records.`);
  } catch (err) {
    console.error('Error cleaning up roles:', err);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
