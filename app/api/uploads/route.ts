import { NextRequest, NextResponse } from 'next/server'
import { badRequest, ensureRole, forbidden, getServerAuth, unauthorized } from '@/lib/auth/server'

const MAX_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_COMPROBANTE = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const ALLOWED_FACTURA = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

function fileExtension(name: string) {
  const parts = name.split('.')
  if (parts.length < 2) return 'bin'
  return parts[parts.length - 1].toLowerCase()
}

export async function POST(request: NextRequest) {
  const { supabase, user, role } = await getServerAuth()
  if (!user) return unauthorized()

  const formData = await request.formData()
  const kind = String(formData.get('kind') ?? '')
  const file = formData.get('file')

  if (!(file instanceof File)) return badRequest('Archivo invalido')
  if (!kind || !['comprobante', 'factura'].includes(kind)) {
    return badRequest('Tipo de archivo invalido')
  }
  if (file.size <= 0) return badRequest('El archivo esta vacio')
  if (file.size > MAX_SIZE_BYTES) return badRequest('El archivo supera 10MB')

  const isFactura = kind === 'factura'
  if (isFactura && !ensureRole(role, ['administrador', 'encargado'])) {
    return forbidden('Solo administrador o encargado pueden cargar facturas')
  }

  const allowed = isFactura ? ALLOWED_FACTURA : ALLOWED_COMPROBANTE
  if (!allowed.includes(file.type)) {
    return badRequest('Formato no permitido. Usa JPG, PNG, WEBP o PDF')
  }

  const bucket = isFactura ? 'facturas' : 'comprobantes'
  const ext = fileExtension(file.name)
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    bucket,
    path,
    storage_key: `${bucket}/${path}`,
    original_name: safeName,
    mime_type: file.type,
  })
}
