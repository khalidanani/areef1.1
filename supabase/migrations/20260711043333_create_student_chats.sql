create table if not exists public.student_chats (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references auth.users(id) on delete cascade not null,
    title text not null default 'محادثة جديدة',
    homework_id uuid references public.homeworks(id) on delete set null,
    question_id uuid references public.questions(id) on delete set null,
    messages jsonb not null default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.student_chats enable row level security;

-- Policies for student_chats
create policy "Students can view their own chats"
    on public.student_chats for select
    using (auth.uid() = student_id);

create policy "Students can insert their own chats"
    on public.student_chats for insert
    with check (auth.uid() = student_id);

create policy "Students can update their own chats"
    on public.student_chats for update
    using (auth.uid() = student_id);

create policy "Students can delete their own chats"
    on public.student_chats for delete
    using (auth.uid() = student_id);

-- Function to update updated_at timestamp
create trigger handle_updated_at before update on public.student_chats
  for each row execute procedure moddatetime (updated_at);
