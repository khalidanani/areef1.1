import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lpyczfbiaoyaxuhnuacn.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxweWN6ZmJpYW95YXh1aG51YWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNDA5MzQsImV4cCI6MjA5ODkxNjkzNH0.lme8PB2SFvc7AI9NRuXolrsvEAQ-gxukjhQW74JSOSE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: teacherData, error: tErr } = await supabase.from('teachers').select('*');
  console.log('Teachers:', teacherData, tErr?.message);
  
  const { data: studentData, error: sErr } = await supabase.from('students').select('*');
  console.log('Students:', studentData, sErr?.message);
}

check();
