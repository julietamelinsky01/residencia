import { NextRequest, NextResponse } from 'next/server'
import { ensureRole, forbidden, getServerAuth, unauthorized } from '@/lib/auth/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, role } = await getServerAuth()
  if (!user) return unauthorized()

  const { id } = await params
  const body = await request.json()
  const { estado, prioridad, costo, observaciones } = body

  const updateBody: Record<string, unknown> = {}

  if (ensureRole(role, ['administrador', 'encargado'])) {
    if (estado) updateBody.estado = estado
    if (prioridad) updateBody.prioridad = prioridad
    if (typeof costo === 'number') updateBody.costo = costo
    if (typeof observaciones === 'string') updateBody.observaciones = observaciones
    if (estado === 'resuelto') updateBody.fecha_resolucion = new Date().toISOString()
    updateBody.atendido_por = user.id
  } else {
    const { data: own, error: ownError } = await supabase.from('arreglos').select('reportado_por,estado').eq('id', id).single()
    if (ownError || !own || own.reportado_por !== user.id || own.estado !== 'pendiente') {
      return forbidden('Solo podes editar tus incidencias pendientes')
    }
    if (typeof observaciones === 'string') updateBody.observaciones = observaciones
  }

  const { error } = await supabase.from('arreglos').update(updateBody).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
