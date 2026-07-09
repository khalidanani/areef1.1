const { Client } = require('pg');

const connectionString = "postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log("Applying RLS Fixes...");

    // Remove old policies if any to avoid errors
    try { await client.query(`DROP POLICY "Students can view their own data" ON students;`); } catch(e) {}
    try { await client.query(`DROP POLICY "Students can view their enrollments" ON class_enrollments;`); } catch(e) {}
    try { await client.query(`DROP POLICY "Teachers can view their class enrollments" ON class_enrollments;`); } catch(e) {}

    // Add students policy
    await client.query(`CREATE POLICY "Students can view their own data" ON students FOR SELECT USING (auth.uid() = id);`);
    console.log("Added student select policy");

    // Add class enrollments policy
    await client.query(`CREATE POLICY "Students can view their enrollments" ON class_enrollments FOR SELECT USING (auth.uid() = student_id);`);
    
    // Add class enrollments insert policy so students can join
    try { await client.query(`DROP POLICY "Students can insert their enrollments" ON class_enrollments;`); } catch(e) {}
    await client.query(`CREATE POLICY "Students can insert their enrollments" ON class_enrollments FOR INSERT WITH CHECK (auth.uid() = student_id);`);

    await client.query(`CREATE POLICY "Teachers can view their class enrollments" ON class_enrollments FOR SELECT USING (
      EXISTS (SELECT 1 FROM classes WHERE classes.id = class_enrollments.class_id AND classes.teacher_id = auth.uid())
    );`);
    console.log("Added class enrollments policies");

    console.log("RLS Fixes successful!");
  } catch (error) {
    console.error("Error applying DB changes:", error);
  } finally {
    await client.end();
  }
}

run();
