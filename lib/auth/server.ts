import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export type AppRole = 'administrador' | 'encargado' | 'residente'

export async function getServerAuth() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { supabase, user: null, role: null as AppRole | null }
  }

  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  const role = (profile?.rol ?? null) as AppRole | null
  return { supabase, user, role }
}

export function ensureRole(role: AppRole | null, allowed: AppRole[]) {
  return role !== null && allowed.includes(role)
}

export function unauthorized(message = 'No autorizado') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Permisos insuficientes') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function badRequest(message = 'Solicitud invalida') {
  return NextResponse.json({ error: message }, { status: 400 })
}
