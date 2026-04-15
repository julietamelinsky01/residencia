import { NextRequest, NextResponse } from 'next/server'
import { badRequest, getServerAuth, unauthorized } from '@/lib/auth/server'

export async function GET(request: NextRequest) {
  const { supabase, user } = await getServerAuth()
  if (!user) return unauthorized()

  const key = request.nextUrl.searchParams.get('key') ?? ''
  const shouldDownload = request.nextUrl.searchParams.get('download') === '1'
  if (!key || !key.includes('/')) return badRequest('Clave de archivo invalida')

  const [bucket, ...rest] = key.split('/')
  const path = rest.join('/')
  if (!bucket || !path) return badRequest('Ruta de archivo invalida')

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 10, shouldDownload ? { download: true } : undefined)

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? 'No se pudo firmar URL' }, { status: 400 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
