import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: usersData, error: usersError } = await supabaseClient.auth.admin.listUsers()
    if (usersError) throw usersError

    const targetUser = usersData.users.find(u => u.email === 'ahusam.sh@gmail.com')
    if (!targetUser) throw new Error('User not found')

    const { data: teacher } = await supabaseClient.from('teachers').select('*').eq('id', targetUser.id).single()
    const { data: student } = await supabaseClient.from('students').select('*').eq('id', targetUser.id).single()

    return new Response(JSON.stringify({ 
      user_id: targetUser.id,
      in_teachers: !!teacher,
      in_students: !!student
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
