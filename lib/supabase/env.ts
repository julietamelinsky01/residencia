export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return { url, anonKey }
}

export function hasSupabaseEnv() {
  const { url, anonKey } = getSupabaseEnv()
  return Boolean(url && anonKey)
}

export function assertSupabaseEnv() {
  const { url, anonKey } = getSupabaseEnv()
  if (!url || !anonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY. Configuralas en .env.local y reinicia el servidor.',
    )
  }
  return { url, anonKey }
}
