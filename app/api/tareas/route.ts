import { NextRequest, NextResponse } from 'next/server'
import { badRequest, ensureRole, forbidden, getServerAuth, unauthorized } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  const { supabase, user, role } = await getServerAuth()
  if (!user) return unauthorized()
  if (!ensureRole(role, ['administrador', 'encargado'])) return forbidden()

  const body = await request.json()
  const { titulo, residente_id, espacio_comun_id, fecha_limite, observaciones } = body

  if (!titulo) {
    return badRequest('Falta el titulo de la tarea')
  }

  const { data, error } = await supabase
    .from('tareas')
    .insert({
      titulo,
      residente_id: residente_id ?? null,
      espacio_comun_id: espacio_comun_id ?? null,
      fecha_limite: fecha_limite ?? null,
      observaciones: observaciones ?? null,
      creado_por: user.id,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}
