import { NextRequest, NextResponse } from 'next/server'
import { badRequest, getServerAuth, unauthorized } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  const { supabase, user } = await getServerAuth()
  if (!user) return unauthorized()

  const body = await request.json()
  const { tipo, descripcion, prioridad, habitacion_id, espacio_comun_id } = body

  if (!tipo || !descripcion) {
    return badRequest('Faltan campos requeridos de incidencia')
  }

  const { data, error } = await supabase
    .from('arreglos')
    .insert({
      reportado_por: user.id,
      tipo,
      descripcion,
      prioridad: prioridad ?? 'media',
      habitacion_id: habitacion_id ?? null,
      espacio_comun_id: espacio_comun_id ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}
