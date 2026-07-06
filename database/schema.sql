-- =========================================
-- عريف: بناء جداول قاعدة البيانات (المرحلة 1 و 2)
-- نسخة Supabase (PostgreSQL) المحدثة لدعم تعدد المعلمين
-- =========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. جدول المعلمين (Teachers)
CREATE TABLE teachers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    school_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. جدول الطلاب (Students)
-- هوية مستقلة للطالب ليدخل عبرها لجميع مواده
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    student_code TEXT UNIQUE NOT NULL, -- كود الدخول الخاص بالطالب
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. جدول الفصول (Classes)
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    join_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. الانضمام للفصول (Class Enrollments) - Many-to-Many
-- يربط الطالب الواحد بعدة فصول (وبالتالي بعدة معلمين)
CREATE TABLE class_enrollments (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (student_id, class_id)
);

-- 5. بنك المناهج: الكتب (Books)
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    term TEXT NOT NULL
);

-- 6. بنك المناهج: الوحدات (Chapters)
CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    chapter_order INTEGER NOT NULL
);

-- 7. بنك المناهج: الدروس (Lessons)
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    lesson_order INTEGER NOT NULL
);

-- 8. بنك المناهج: الأسئلة (Questions)
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    options JSONB,
    difficulty_level TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- إعدادات الأمان (Row Level Security)
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own data" ON teachers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Teachers can manage their own classes" ON classes FOR ALL USING (auth.uid() = teacher_id);
