
const { Client } = require('pg');

const connectionString = "postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log("Applying DB changes...");

    await client.query(`
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS max_classes INTEGER DEFAULT 1;
    `);
    console.log("Added max_classes to teachers");

    await client.query(`
      CREATE TABLE IF NOT EXISTS teacher_book_purchases (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
          book_id UUID NOT NULL,
          purchased_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          UNIQUE(teacher_id, book_id)
      );
    `);
    console.log("Created teacher_book_purchases table");

    await client.query(`
      CREATE TABLE IF NOT EXISTS coupons (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          code TEXT UNIQUE NOT NULL,
          discount_percentage INTEGER NOT NULL DEFAULT 100,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);
    console.log("Created coupons table");

    // Enable RLS
    await client.query(`ALTER TABLE teacher_book_purchases ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;`);

    // Add Policies (drop if exists to avoid errors)
    try { await client.query(`DROP POLICY "Teachers can view their own purchases" ON teacher_book_purchases;`); } catch(e) {}
    try { await client.query(`DROP POLICY "Teachers can insert purchases" ON teacher_book_purchases;`); } catch(e) {}
    try { await client.query(`DROP POLICY "Anyone can read active coupons" ON coupons;`); } catch(e) {}

    await client.query(`CREATE POLICY "Teachers can view their own purchases" ON teacher_book_purchases FOR SELECT USING (auth.uid() = teacher_id);`);
    await client.query(`CREATE POLICY "Teachers can insert purchases" ON teacher_book_purchases FOR INSERT WITH CHECK (auth.uid() = teacher_id);`);
    await client.query(`CREATE POLICY "Anyone can read active coupons" ON coupons FOR SELECT USING (is_active = true);`);

    // Insert the Free Coupon
    await client.query(`
      INSERT INTO coupons (code, discount_percentage)
      VALUES ('AREEF-FREE', 100)
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log("Inserted AREEF-FREE coupon");

    console.log("DB Update successful!");
  } catch (error) {
    console.error("Error applying DB changes:", error);
  } finally {
    await client.end();
  }
}

run();
