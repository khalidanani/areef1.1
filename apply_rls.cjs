const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.lpyczfbiaoyaxuhnuacn:OTqSNrJGo15fWpzt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  const ddl = `
    -- Enable Row Level Security (RLS) on all tables
    ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
    ALTER TABLE students ENABLE ROW LEVEL SECURITY;
    ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE books ENABLE ROW LEVEL SECURITY;
    ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
    ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
    ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE homeworks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE homework_questions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE student_responses ENABLE ROW LEVEL SECURITY;
    ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

    -- Helper function: Is User a Teacher?
    CREATE OR REPLACE FUNCTION is_teacher() RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (SELECT 1 FROM teachers WHERE id = auth.uid());
      END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Drop existing policies if any to avoid errors on rerun
    DO $$ 
    DECLARE 
      pol RECORD;
    BEGIN 
      FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
      END LOOP;
    END $$;

    ---------------------------------------------------------------------------
    -- 1. Profiles (Teachers & Students)
    ---------------------------------------------------------------------------
    -- Anyone logged in can read profiles (needed for showing names in classes)
    CREATE POLICY "Users can read all teachers" ON teachers FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Users can read all students" ON students FOR SELECT TO authenticated USING (true);
    
    -- Users can only update their own profile
    CREATE POLICY "Users can update own teacher profile" ON teachers FOR UPDATE TO authenticated USING (auth.uid() = id);
    CREATE POLICY "Users can update own student profile" ON students FOR UPDATE TO authenticated USING (auth.uid() = id);
    
    -- Users can insert their own profile during signup
    CREATE POLICY "Users can insert own teacher profile" ON teachers FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
    CREATE POLICY "Users can insert own student profile" ON students FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

    ---------------------------------------------------------------------------
    -- 2. Classes & Enrollments
    ---------------------------------------------------------------------------
    -- Anyone authenticated can view classes (to join by code)
    CREATE POLICY "Anyone can view classes" ON classes FOR SELECT TO authenticated USING (true);
    -- Only teachers can create/update/delete their own classes
    CREATE POLICY "Teachers can manage own classes" ON classes FOR ALL TO authenticated USING (teacher_id = auth.uid());

    -- Anyone can view enrollments
    CREATE POLICY "Anyone can view enrollments" ON class_enrollments FOR SELECT TO authenticated USING (true);
    -- Students can join classes (insert)
    CREATE POLICY "Students can join classes" ON class_enrollments FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
    -- Students can leave classes, or teachers can remove them
    CREATE POLICY "Students leave or Teachers remove" ON class_enrollments FOR DELETE TO authenticated USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));

    ---------------------------------------------------------------------------
    -- 3. Curriculum (Books, Chapters, Lessons, Questions)
    ---------------------------------------------------------------------------
    -- Anyone authenticated can read the curriculum
    CREATE POLICY "Anyone can read curriculum" ON books FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Anyone can read curriculum" ON chapters FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Anyone can read curriculum" ON lessons FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Anyone can read curriculum" ON questions FOR SELECT TO authenticated USING (true);

    -- Only teachers can modify the curriculum (AI Extractor uses this)
    CREATE POLICY "Teachers can modify books" ON books FOR ALL TO authenticated USING (is_teacher());
    CREATE POLICY "Teachers can modify chapters" ON chapters FOR ALL TO authenticated USING (is_teacher());
    CREATE POLICY "Teachers can modify lessons" ON lessons FOR ALL TO authenticated USING (is_teacher());
    CREATE POLICY "Teachers can modify questions" ON questions FOR ALL TO authenticated USING (is_teacher());

    ---------------------------------------------------------------------------
    -- 4. Homeworks & Questions
    ---------------------------------------------------------------------------
    -- Anyone can see homeworks and their questions
    CREATE POLICY "Anyone can view homeworks" ON homeworks FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Anyone can view homework_questions" ON homework_questions FOR SELECT TO authenticated USING (true);

    -- Only teachers can create/manage homeworks for their classes
    CREATE POLICY "Teachers manage homeworks" ON homeworks FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));
    -- Teachers manage homework questions if they own the homework
    CREATE POLICY "Teachers manage homework_questions" ON homework_questions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM homeworks h JOIN classes c ON h.class_id = c.id WHERE h.id = homework_id AND c.teacher_id = auth.uid()));

    ---------------------------------------------------------------------------
    -- 5. Student Responses & Grades
    ---------------------------------------------------------------------------
    -- Students can view their own responses. Teachers can view responses for their classes.
    CREATE POLICY "Students read own, Teachers read class responses" ON student_responses FOR SELECT TO authenticated 
      USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));
    
    -- Students can insert and update their own responses
    CREATE POLICY "Students insert own responses" ON student_responses FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
    CREATE POLICY "Students update own responses" ON student_responses FOR UPDATE TO authenticated USING (student_id = auth.uid());

    ---------------------------------------------------------------------------
    -- 6. Billing (Subscriptions & Invoices)
    ---------------------------------------------------------------------------
    -- Users can only view and manage their own billing data
    CREATE POLICY "Users read own subscriptions" ON subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
    CREATE POLICY "Users manage own subscriptions" ON subscriptions FOR ALL TO authenticated USING (user_id = auth.uid());

    CREATE POLICY "Users read own invoices" ON invoices FOR SELECT TO authenticated USING (user_id = auth.uid());
    CREATE POLICY "Users manage own invoices" ON invoices FOR ALL TO authenticated USING (user_id = auth.uid());

  `;

  await client.query(ddl);
  console.log('Row Level Security (RLS) policies successfully applied to all tables.');
  await client.end();
}

run().catch(console.error);
