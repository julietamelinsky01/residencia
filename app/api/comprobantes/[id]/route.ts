import { NextRequest, NextResponse } from 'next/server'
import { ensureRole, forbidden, getServerAuth, unauthorized } from '@/lib/auth/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, role } = await getServerAuth()
  if (!user) return unauthorized()
  if (!ensureRole(role, ['administrador', 'encargado'])) return forbidden()

  const { id } = await params
  const body = await request.json()
  const { estado_validacion, observacion } = body

  const { error } = await supabase
    .from('comprobantes')
    .update({
      estado_validacion,
      observacion: observacion ?? null,
      validado_por: user.id,
      fecha_validacion: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
