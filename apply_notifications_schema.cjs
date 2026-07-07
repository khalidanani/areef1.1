const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  const ddl = `
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

    DO $$ 
    BEGIN 
      EXECUTE 'DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications';
      EXECUTE 'DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications';
      EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications';
    EXCEPTION WHEN OTHERS THEN 
    END $$;

    CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
    CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
    CREATE POLICY "Authenticated users can insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
  `;

  await client.query(ddl);
  console.log('Notifications schema applied.');
  await client.end();
}

run().catch(console.error);
