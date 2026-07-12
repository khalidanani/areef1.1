import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: policies, error } = await supabaseClient.rpc('get_policies') // wait, there isn't a get_policies rpc.
    // Let's just run a raw query via postgres. Wait, we can't do that easily via JS without pg library.

    return new Response(JSON.stringify({ message: "dummy" }), { headers: { 'Content-Type': 'application/json' }})
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
