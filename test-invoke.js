async function invoke() {
  const r = await fetch('https://lpyczfbiaoyaxuhnuacn.supabase.co/functions/v1/update_role', { method: 'POST' });
  console.log(await r.text());
}
invoke();
