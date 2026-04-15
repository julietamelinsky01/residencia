import { NextRequest, NextResponse } from 'next/server'
import { badRequest, ensureRole, forbidden, getServerAuth, unauthorized } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  const { supabase, user, role } = await getServerAuth()
  if (!user) return unauthorized()
  if (!ensureRole(role, ['administrador', 'encargado'])) return forbidden()

  const body = await request.json()
  const {
    categoria_id,
    monto,
    fecha,
    descripcion,
    habitacion_id,
    espacio_comun_id,
    archivo_factura,
    nombre_factura,
  } = body

  if (!monto || !fecha || !descripcion) {
    return badRequest('Faltan campos requeridos de gasto')
  }

  const { data, error } = await supabase
    .from('gastos')
    .insert({
      categoria_id: categoria_id ?? null,
      monto: Number(monto),
      fecha,
      descripcion,
      habitacion_id: habitacion_id ?? null,
      espacio_comun_id: espacio_comun_id ?? null,
      archivo_factura: archivo_factura ?? null,
      nombre_factura: nombre_factura ?? null,
      cargado_por: user.id,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}
