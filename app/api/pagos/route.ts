import { NextRequest, NextResponse } from 'next/server'
import { badRequest, ensureRole, forbidden, getServerAuth, unauthorized } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  const { supabase, user, role } = await getServerAuth()
  if (!user) return unauthorized()
  if (!ensureRole(role, ['administrador', 'encargado'])) return forbidden()

  const body = await request.json()
  const { residente_id, periodo, monto, fecha_vencimiento, observaciones } = body

  if (!residente_id || !periodo || !monto || !fecha_vencimiento) {
    return badRequest('Faltan campos requeridos de pago')
  }

  const { data, error } = await supabase
    .from('pagos')
    .insert({
      residente_id,
      periodo,
      monto: Number(monto),
      fecha_vencimiento,
      observaciones: observaciones ?? null,
      registrado_por: user.id,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}
