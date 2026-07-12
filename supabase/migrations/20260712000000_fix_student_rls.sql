-- Fix students table RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students can view their own profile" ON public.students;
CREATE POLICY "Students can view their own profile" 
ON public.students FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Fix class_enrollments RLS
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students can view their enrollments" ON public.class_enrollments;
CREATE POLICY "Students can view their enrollments" 
ON public.class_enrollments FOR SELECT 
TO authenticated 
USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert their enrollments" ON public.class_enrollments;
CREATE POLICY "Students can insert their enrollments" 
ON public.class_enrollments FOR INSERT 
TO authenticated 
WITH CHECK (student_id = auth.uid());

-- Fix classes RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view classes" ON public.classes;
CREATE POLICY "Anyone can view classes" 
ON public.classes FOR SELECT 
TO authenticated 
USING (true);
