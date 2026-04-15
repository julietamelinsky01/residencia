import { NextRequest, NextResponse } from 'next/server'
import { ensureRole, forbidden, getServerAuth, unauthorized } from '@/lib/auth/server'

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, role } = await getServerAuth()
  if (!user) return unauthorized()

  const { id } = await params

  if (ensureRole(role, ['administrador', 'encargado'])) {
    const { error } = await supabase
      .from('tareas')
      .update({ estado: 'completada', completada_en: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  const { data: residente, error: residenteError } = await supabase.from('residentes').select('id').eq('user_id', user.id).single()
  if (residenteError || !residente) return forbidden('No existe residente asociado al usuario')

  const { error } = await supabase
    .from('tareas')
    .update({ estado: 'completada', completada_en: new Date().toISOString() })
    .eq('id', id)
    .eq('residente_id', residente.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
