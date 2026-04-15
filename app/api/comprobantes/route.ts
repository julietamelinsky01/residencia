import { NextRequest, NextResponse } from 'next/server'
import { badRequest, getServerAuth, unauthorized } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  const { supabase, user } = await getServerAuth()
  if (!user) return unauthorized()

  const body = await request.json()
  const { pago_id, archivo_url, archivo_nombre, observacion } = body

  if (!pago_id || !archivo_url) {
    return badRequest('Faltan campos requeridos de comprobante')
  }

  const { data, error } = await supabase
    .from('comprobantes')
    .insert({
      pago_id,
      archivo_url,
      archivo_nombre: archivo_nombre ?? null,
      observacion: observacion ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}
