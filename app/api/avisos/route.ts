import { NextRequest, NextResponse } from 'next/server'
import { badRequest, ensureRole, forbidden, getServerAuth, unauthorized } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  const { supabase, user, role } = await getServerAuth()
  if (!user) return unauthorized()
  if (!ensureRole(role, ['administrador', 'encargado'])) return forbidden()

  const body = await request.json()
  const { titulo, contenido, destinatario_tipo, destinatario_id } = body

  if (!titulo || !contenido || !destinatario_tipo) {
    return badRequest('Faltan campos requeridos de aviso')
  }

  const { data, error } = await supabase
    .from('avisos')
    .insert({
      titulo,
      contenido,
      destinatario_tipo,
      destinatario_id: destinatario_tipo === 'individual' ? destinatario_id : null,
      creado_por: user.id,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}
