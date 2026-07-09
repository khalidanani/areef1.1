import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lpyczfbiaoyaxuhnuacn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxweWN6ZmJpYW95YXh1aG51YWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNDA5MzQsImV4cCI6MjA5ODkxNjkzNH0.lme8PB2SFvc7AI9NRuXolrsvEAQ-gxukjhQW74JSOSE';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
