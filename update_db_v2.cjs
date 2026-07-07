const { Client } = require('pg');

const connectionString = "postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log("Applying Database Updates v2...");

    // 1. Update books table
    await client.query(`
      ALTER TABLE books 
      ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true;
    `);
    console.log("Updated books table");

    // 2. Update teachers table
    await client.query(`
      ALTER TABLE teachers 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS school_details TEXT;
    `);
    
    // Set the user Ahusam0271 (00003310@QM.EDU.SA) as Admin if exists, otherwise set first teacher
    await client.query(`UPDATE teachers SET is_admin = true WHERE email ILIKE '%QM.EDU.SA%' OR email = '00003310@qm.edu.sa';`);
    console.log("Updated teachers table & assigned admin");

    // 3. Update students table
    await client.query(`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS school_details TEXT;
    `);
    console.log("Updated students table");

    // 4. Create app_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );
    `);
    // Insert default settings
    await client.query(`
      INSERT INTO app_settings (key, value) VALUES ('class_price', '50') ON CONFLICT (key) DO NOTHING;
    `);
    console.log("Created app_settings table");

    // 5. Create support_tickets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          status TEXT DEFAULT 'open',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);
    console.log("Created support_tickets table");

    // 6. Enable RLS
    await client.query(`ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;`);

    // Add Policies
    try { await client.query(`DROP POLICY "Anyone can read app settings" ON app_settings;`); } catch(e) {}
    try { await client.query(`DROP POLICY "Admins can manage app settings" ON app_settings;`); } catch(e) {}
    try { await client.query(`DROP POLICY "Users can view own tickets" ON support_tickets;`); } catch(e) {}
    try { await client.query(`DROP POLICY "Users can create tickets" ON support_tickets;`); } catch(e) {}

    await client.query(`CREATE POLICY "Anyone can read app settings" ON app_settings FOR SELECT USING (true);`);
    await client.query(`CREATE POLICY "Admins can manage app settings" ON app_settings FOR ALL USING (
      EXISTS (SELECT 1 FROM teachers WHERE id = auth.uid() AND is_admin = true)
    );`);
    
    await client.query(`CREATE POLICY "Users can view own tickets" ON support_tickets FOR SELECT USING (auth.uid() = user_id);`);
    await client.query(`CREATE POLICY "Users can create tickets" ON support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);`);

    console.log("DB Update v2 successful!");
  } catch (error) {
    console.error("Error applying DB changes:", error);
  } finally {
    await client.end();
  }
}

run();
