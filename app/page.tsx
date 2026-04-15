'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  Bell,
  ClipboardList,
  FileCheck2,
  LogOut,
  Hammer,
  Home,
  Megaphone,
  Receipt,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Role = 'administrador' | 'encargado' | 'residente' | 'gerente'
type PagoEstado = 'pendiente' | 'pagado' | 'vencido' | 'parcial'
type ComprobanteEstado = 'pendiente' | 'aprobado' | 'rechazado'
type IncidenciaEstado = 'pendiente' | 'en_revision' | 'en_reparacion' | 'resuelto' | 'cancelado'
type Destinatario = 'todos' | 'residentes' | 'encargados' | 'individual'
type ModuleId =
  | 'inicio'
  | 'cuotas_envios'
  | 'archivo_documental'
  | 'gastos_internos'
  | 'incidencias'
  | 'residentes'
  | 'habitaciones'
  | 'reportes'
  | 'avisos'

type Habitacion = { id: string; nombre: string }
type Espacio = { id: string; nombre: string }
type Categoria = { id: string; nombre: string }
type Residente = { id: string; user_id: string | null; nombre: string; apellido: string | null; estado: string; habitacion_id: string | null }
type Cuota = { id: string; residente_id: string; periodo: string; monto: number; fecha_vencimiento: string; estado: PagoEstado }
type Envio = {
  id: string
  pago_id: string
  archivo_nombre: string | null
  archivo_url: string
  estado_validacion: ComprobanteEstado
  observacion: string | null
  fecha_subida: string | null
  fecha_validacion: string | null
  validado_por: string | null
}
type Gasto = {
  id: string
  categoria_id: string | null
  monto: number
  fecha: string
  descripcion: string
  archivo_factura: string | null
  nombre_factura: string | null
}
type Arreglo = { id: string; reportado_por: string; tipo: string; descripcion: string; estado: IncidenciaEstado; prioridad: string; habitacion_id: string | null; espacio_comun_id: string | null }
type Aviso = { id: string; titulo: string; contenido: string; destinatario_tipo: Destinatario; destinatario_id: string | null; fecha: string }
type Profile = { id: string; nombre: string | null; apellido: string | null; rol: string | null }

type AppData = {
  habitaciones: Habitacion[]
  espacios: Espacio[]
  categorias: Categoria[]
  residentes: Residente[]
  cuotas: Cuota[]
  envios: Envio[]
  gastos: Gasto[]
  arreglos: Arreglo[]
  avisos: Aviso[]
  profiles: Profile[]
}

type EstadoCuotaUI = 'emitida' | 'esperando_envio' | 'en_revision' | 'validada' | 'rechazada' | 'vencida'
type DocumentType = 'comprobante_residente' | 'factura_gasto' | 'constancia_admin'
type DocumentRow = {
  id: string
  tipo: DocumentType
  estado: string
  nombre: string
  archivo: string
  fecha: string | null
  residente_id: string | null
  habitacion_id: string | null
  periodo: string | null
  subido_por_tipo: 'residente' | 'administracion'
  cuota_id: string | null
}

const EMPTY_DATA: AppData = {
  habitaciones: [],
  espacios: [],
  categorias: [],
  residentes: [],
  cuotas: [],
  envios: [],
  gastos: [],
  arreglos: [],
  avisos: [],
  profiles: [],
}

const ROLE_LABEL: Record<Role, string> = {
  administrador: 'Administrador',
  encargado: 'Encargado',
  residente: 'Residente',
  gerente: 'Gerente',
}

const roleModules: Record<Role, ModuleId[]> = {
  administrador: ['inicio', 'cuotas_envios', 'archivo_documental', 'gastos_internos', 'residentes', 'habitaciones', 'incidencias', 'avisos', 'reportes'],
  encargado: ['inicio', 'cuotas_envios', 'archivo_documental', 'gastos_internos', 'incidencias', 'avisos'],
  gerente: ['inicio', 'cuotas_envios', 'archivo_documental', 'gastos_internos', 'incidencias', 'reportes', 'avisos'],
  residente: ['inicio', 'cuotas_envios', 'incidencias', 'avisos'],
}

const moduleMeta: Record<ModuleId, { label: string; subtitle: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  inicio: { label: 'Inicio', subtitle: 'Resumen rapido del sistema', icon: Home },
  cuotas_envios: { label: 'Cuotas y envios', subtitle: 'Proceso completo: cuota, envio y validacion', icon: ClipboardList },
  archivo_documental: { label: 'Archivo documental', subtitle: 'Consulta, visualizacion y trazabilidad de archivos', icon: FileCheck2 },
  gastos_internos: { label: 'Gastos internos', subtitle: 'Facturas y gastos operativos', icon: Receipt },
  incidencias: { label: 'Incidencias', subtitle: 'Arreglos y mantenimiento', icon: Wrench },
  residentes: { label: 'Residentes', subtitle: 'Estado y ocupacion', icon: Users },
  habitaciones: { label: 'Habitaciones', subtitle: 'Inventario fisico', icon: Hammer },
  reportes: { label: 'Reportes', subtitle: 'Vista de supervision global', icon: ShieldCheck },
  avisos: { label: 'Avisos', subtitle: 'Comunicacion interna', icon: Megaphone },
}

function cn(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(' ')
}

function toDateText(value: string | null | undefined) {
  if (!value) return '-'
  return value.slice(0, 10)
}

function StatusPill({ label, tone }: { label: string; tone: 'green' | 'red' | 'amber' | 'blue' | 'slate' }) {
  const colors: Record<'green' | 'red' | 'amber' | 'blue' | 'slate', string> = {
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    red: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    blue: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100',
  }
  return <span className={cn('inline-flex rounded-full px-2 py-1 text-xs font-semibold', colors[tone])}>{label}</span>
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn('h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none ring-0 focus:border-primary/70', props.className)} />
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn('h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none ring-0 focus:border-primary/70', props.className)} />
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function estadoCuota(cuota: Cuota, ultimoEnvio: Envio | undefined): EstadoCuotaUI {
  if (ultimoEnvio) {
    if (ultimoEnvio.estado_validacion === 'pendiente') return 'en_revision'
    if (ultimoEnvio.estado_validacion === 'aprobado') return 'validada'
    if (ultimoEnvio.estado_validacion === 'rechazado') return 'rechazada'
  }
  if (cuota.estado === 'vencido') return 'vencida'
  if (cuota.estado === 'pagado') return 'emitida'
  return 'esperando_envio'
}

function estadoMeta(estado: EstadoCuotaUI): { label: string; tone: 'green' | 'red' | 'amber' | 'blue' | 'slate' } {
  if (estado === 'validada') return { label: 'Validada', tone: 'green' }
  if (estado === 'rechazada') return { label: 'Rechazada', tone: 'red' }
  if (estado === 'en_revision') return { label: 'En revision', tone: 'blue' }
  if (estado === 'vencida') return { label: 'Vencida', tone: 'slate' }
  if (estado === 'emitida') return { label: 'Emitida', tone: 'slate' }
  return { label: 'Esperando envio', tone: 'amber' }
}

function tipoDocumentoLabel(tipo: DocumentType) {
  if (tipo === 'comprobante_residente') return 'Comprobante residente'
  if (tipo === 'factura_gasto') return 'Factura gasto interno'
  return 'Constancia administrativa'
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [role, setRole] = useState<Role>('residente')
  const [activeModule, setActiveModule] = useState<ModuleId>('inicio')
  const [data, setData] = useState<AppData>(EMPTY_DATA)

  const [cuotaForm, setCuotaForm] = useState({ residente_id: '', periodo: '', monto: '', fecha_vencimiento: '' })
  const [envioForm, setEnvioForm] = useState({ pago_id: '', archivo_nombre: '' })
  const [validacionForm, setValidacionForm] = useState({ id: '', estado_validacion: 'aprobado' as ComprobanteEstado, observacion: '' })
  const [gastoForm, setGastoForm] = useState({ categoria_id: '', monto: '', fecha: '', descripcion: '' })
  const [arregloForm, setArregloForm] = useState({ tipo: '', descripcion: '', prioridad: 'media' })
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  const [facturaFile, setFacturaFile] = useState<File | null>(null)
  const [selectedCuotaId, setSelectedCuotaId] = useState<string>('')
  const [docFilterResidente, setDocFilterResidente] = useState('')
  const [docFilterHabitacion, setDocFilterHabitacion] = useState('')
  const [docFilterPeriodo, setDocFilterPeriodo] = useState('')
  const [docFilterTipo, setDocFilterTipo] = useState<'todos' | DocumentType>('todos')
  const [docFilterEstado, setDocFilterEstado] = useState('todos')
  const [docSelectedId, setDocSelectedId] = useState('')
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError) throw userError

      if (!user) {
        setAuthUserId(null)
        setData(EMPTY_DATA)
        return
      }

      setAuthUserId(user.id)

      const { data: profile, error: profileError } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
      if (profileError) throw profileError
      const roleValue = profile?.rol as Role | null
      if (roleValue && ['administrador', 'encargado', 'residente', 'gerente'].includes(roleValue)) {
        setRole(roleValue)
      }

      const [habitaciones, espacios, categorias, residentes, cuotas, envios, gastos, arreglos, avisos, profiles] = await Promise.all([
        supabase.from('habitaciones').select('id,nombre').order('nombre'),
        supabase.from('espacios_comunes').select('id,nombre').order('nombre'),
        supabase.from('categorias_gasto').select('id,nombre').order('nombre'),
        supabase.from('residentes').select('id,user_id,nombre,apellido,estado,habitacion_id').order('nombre'),
        supabase.from('pagos').select('id,residente_id,periodo,monto,fecha_vencimiento,estado').order('fecha_vencimiento', { ascending: false }),
        supabase.from('comprobantes').select('id,pago_id,archivo_url,archivo_nombre,estado_validacion,observacion,fecha_subida,fecha_validacion,validado_por').order('fecha_subida', { ascending: false }),
        supabase.from('gastos').select('id,categoria_id,monto,fecha,descripcion,archivo_factura,nombre_factura').order('fecha', { ascending: false }),
        supabase.from('arreglos').select('id,reportado_por,tipo,descripcion,estado,prioridad,habitacion_id,espacio_comun_id').order('fecha_reporte', { ascending: false }),
        supabase.from('avisos').select('id,titulo,contenido,destinatario_tipo,destinatario_id,fecha').order('fecha', { ascending: false }),
        supabase.from('profiles').select('id,nombre,apellido,rol'),
      ])

      const errors = [habitaciones.error, espacios.error, categorias.error, residentes.error, cuotas.error, envios.error, gastos.error, arreglos.error, avisos.error, profiles.error].filter(Boolean)
      if (errors.length > 0) throw errors[0]

      setData({
        habitaciones: (habitaciones.data ?? []) as Habitacion[],
        espacios: (espacios.data ?? []) as Espacio[],
        categorias: (categorias.data ?? []) as Categoria[],
        residentes: (residentes.data ?? []) as Residente[],
        cuotas: ((cuotas.data ?? []) as any[]).map((x) => ({ ...x, monto: Number(x.monto) })) as Cuota[],
        envios: (envios.data ?? []) as Envio[],
        gastos: ((gastos.data ?? []) as any[]).map((x) => ({ ...x, monto: Number(x.monto) })) as Gasto[],
        arreglos: (arreglos.data ?? []) as Arreglo[],
        avisos: (avisos.data ?? []) as Aviso[],
        profiles: (profiles.data ?? []) as Profile[],
      })
    } catch (err: any) {
      setError(err?.message ?? 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const callApi = async (url: string, body: unknown, method: 'POST' | 'PATCH' = 'POST') => {
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error ?? `Error ${res.status}`)
      setOk('Operacion realizada correctamente')
      await reload()
    } catch (err: any) {
      setError(err?.message ?? 'Operacion fallida')
    } finally {
      setBusy(false)
    }
  }

  const uploadFile = async (kind: 'comprobante' | 'factura', file: File) => {
    const payload = new FormData()
    payload.append('kind', kind)
    payload.append('file', file)

    const res = await fetch('/api/uploads', {
      method: 'POST',
      body: payload,
    })

    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body?.error ?? 'No se pudo subir el archivo')
    return body as { storage_key: string; original_name: string }
  }

  const visibleModules = roleModules[role]

  useEffect(() => {
    if (!visibleModules.includes(activeModule)) setActiveModule('inicio')
  }, [activeModule, visibleModules])

  const viewerResidentId = data.residentes.find((x) => x.user_id === authUserId)?.id
  const cuotas = role === 'residente' ? data.cuotas.filter((x) => x.residente_id === viewerResidentId) : data.cuotas
  const cuotaIds = new Set(cuotas.map((x) => x.id))
  const envios = role === 'residente' ? data.envios.filter((x) => cuotaIds.has(x.pago_id)) : data.envios
  const gastos = role === 'residente' ? [] : data.gastos
  const incidencias = role === 'residente' ? data.arreglos.filter((x) => x.reportado_por === authUserId) : data.arreglos
  const avisos = data.avisos.filter((a) => {
    if (a.destinatario_tipo === 'todos') return true
    if (role === 'residente') return a.destinatario_tipo === 'residentes' || (a.destinatario_tipo === 'individual' && a.destinatario_id === authUserId)
    if (role === 'encargado') return a.destinatario_tipo === 'encargados' || a.destinatario_tipo === 'residentes'
    return true
  })

  const enviosPorCuota = useMemo(() => {
    const map = new Map<string, Envio[]>()
    envios.forEach((e) => {
      const list = map.get(e.pago_id) ?? []
      list.push(e)
      map.set(e.pago_id, list)
    })
    return map
  }, [envios])

  const cuotasConEstado = useMemo(() => {
    return cuotas.map((cuota) => {
      const list = enviosPorCuota.get(cuota.id) ?? []
      const ultimoEnvio = [...list].sort((a, b) => (b.fecha_subida ?? '').localeCompare(a.fecha_subida ?? ''))[0]
      return {
        cuota,
        envios: list,
        ultimoEnvio,
        estado: estadoCuota(cuota, ultimoEnvio),
      }
    })
  }, [cuotas, enviosPorCuota])

  useEffect(() => {
    if (!selectedCuotaId && cuotasConEstado[0]) {
      setSelectedCuotaId(cuotasConEstado[0].cuota.id)
      setEnvioForm((v) => ({ ...v, pago_id: cuotasConEstado[0].cuota.id }))
    }
  }, [selectedCuotaId, cuotasConEstado])

  const selected = cuotasConEstado.find((x) => x.cuota.id === selectedCuotaId)
  const selectedEnvios = selected?.envios ?? []
  const ultimoEnvio = selected?.ultimoEnvio

  const pendientes = cuotasConEstado.filter((x) => x.estado === 'esperando_envio').length
  const enRevision = cuotasConEstado.filter((x) => x.estado === 'en_revision').length
  const validadas = cuotasConEstado.filter((x) => x.estado === 'validada').length
  const rechazadas = cuotasConEstado.filter((x) => x.estado === 'rechazada').length

  const residenteNombre = (id: string | null) => {
    const r = data.residentes.find((x) => x.id === id)
    return r ? `${r.nombre} ${r.apellido ?? ''}`.trim() : '-'
  }
  const categoriaNombre = (id: string | null) => data.categorias.find((x) => x.id === id)?.nombre ?? '-'
  const habitacionNombre = (id: string | null) => data.habitaciones.find((x) => x.id === id)?.nombre ?? '-'
  const espacioNombre = (id: string | null) => data.espacios.find((x) => x.id === id)?.nombre ?? '-'
  const profileNombre = (id: string | null) => {
    const p = data.profiles.find((x) => x.id === id)
    if (!p) return '-'
    return `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() || '-'
  }

  const documentoRows = useMemo(() => {
    const docs: DocumentRow[] = []
    data.envios.forEach((envio) => {
      const cuota = data.cuotas.find((c) => c.id === envio.pago_id)
      const residente = data.residentes.find((r) => r.id === cuota?.residente_id)
      docs.push({
        id: `envio-${envio.id}`,
        tipo: 'comprobante_residente',
        estado: envio.estado_validacion,
        nombre: envio.archivo_nombre ?? envio.archivo_url,
        archivo: envio.archivo_url,
        fecha: envio.fecha_subida,
        residente_id: cuota?.residente_id ?? null,
        habitacion_id: residente?.habitacion_id ?? null,
        periodo: cuota?.periodo ?? null,
        subido_por_tipo: 'residente',
        cuota_id: cuota?.id ?? null,
      })
      if (envio.estado_validacion === 'aprobado' || envio.estado_validacion === 'rechazado') {
        docs.push({
          id: `constancia-${envio.id}`,
          tipo: 'constancia_admin',
          estado: envio.estado_validacion,
          nombre: `Constancia ${envio.estado_validacion === 'aprobado' ? 'aprobacion' : 'rechazo'} · ${cuota?.periodo ?? 'sin periodo'}`,
          archivo: envio.archivo_url,
          fecha: envio.fecha_validacion,
          residente_id: cuota?.residente_id ?? null,
          habitacion_id: residente?.habitacion_id ?? null,
          periodo: cuota?.periodo ?? null,
          subido_por_tipo: 'administracion',
          cuota_id: cuota?.id ?? null,
        })
      }
    })
    data.gastos.forEach((gasto) => {
      if (!gasto.archivo_factura) return
      docs.push({
        id: `gasto-${gasto.id}`,
        tipo: 'factura_gasto',
        estado: 'registrado',
        nombre: gasto.nombre_factura ?? gasto.archivo_factura,
        archivo: gasto.archivo_factura,
        fecha: gasto.fecha,
        residente_id: null,
        habitacion_id: null,
        periodo: gasto.fecha.slice(0, 7),
        subido_por_tipo: 'administracion',
        cuota_id: null,
      })
    })
    return docs.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
  }, [data.envios, data.cuotas, data.residentes, data.gastos])

  const filteredDocuments = useMemo(() => {
    return documentoRows.filter((doc) => {
      if (docFilterResidente && doc.residente_id !== docFilterResidente) return false
      if (docFilterHabitacion && doc.habitacion_id !== docFilterHabitacion) return false
      if (docFilterPeriodo && doc.periodo !== docFilterPeriodo) return false
      if (docFilterTipo !== 'todos' && doc.tipo !== docFilterTipo) return false
      if (docFilterEstado !== 'todos' && doc.estado !== docFilterEstado) return false
      return true
    })
  }, [documentoRows, docFilterResidente, docFilterHabitacion, docFilterPeriodo, docFilterTipo, docFilterEstado])

  useEffect(() => {
    if (!docSelectedId && filteredDocuments[0]) setDocSelectedId(filteredDocuments[0].id)
    if (docSelectedId && !filteredDocuments.find((doc) => doc.id === docSelectedId)) {
      setDocSelectedId(filteredDocuments[0]?.id ?? '')
      setDocPreviewUrl(null)
    }
  }, [docSelectedId, filteredDocuments])

  const selectedDoc = filteredDocuments.find((doc) => doc.id === docSelectedId)

  const getSignedUrl = async (storageKey: string, download = false) => {
    const params = new URLSearchParams({ key: storageKey, download: download ? '1' : '0' })
    const res = await fetch(`/api/files/signed-url?${params.toString()}`)
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body?.error ?? 'No se pudo obtener acceso al archivo')
    return body.url as string
  }

  const handlePreview = async (doc: DocumentRow) => {
    try {
      setBusy(true)
      const url = await getSignedUrl(doc.archivo, false)
      setDocSelectedId(doc.id)
      setDocPreviewUrl(url)
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo previsualizar')
    } finally {
      setBusy(false)
    }
  }

  const handleDownload = async (doc: DocumentRow) => {
    try {
      setBusy(true)
      const url = await getSignedUrl(doc.archivo, true)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo descargar')
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' })
    } finally {
      window.location.href = '/auth/login'
    }
  }

  const currentProfile = data.profiles.find((p) => p.id === authUserId)
  const currentUserName = `${currentProfile?.nombre ?? ''} ${currentProfile?.apellido ?? ''}`.trim() || 'Usuario'

  const monthlyEvolution = useMemo(() => {
    const byPeriod = new Map<string, { period: string; cuotas: number; validadas: number }>()
    data.cuotas.forEach((cuota) => {
      const current = byPeriod.get(cuota.periodo) ?? { period: cuota.periodo, cuotas: 0, validadas: 0 }
      current.cuotas += 1
      const lastEnvio = data.envios
        .filter((x) => x.pago_id === cuota.id)
        .sort((a, b) => (b.fecha_subida ?? '').localeCompare(a.fecha_subida ?? ''))[0]
      if (lastEnvio?.estado_validacion === 'aprobado') current.validadas += 1
      byPeriod.set(cuota.periodo, current)
    })
    return [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period)).slice(-6)
  }, [data.cuotas, data.envios])

  const stateDistribution = useMemo(
    () => [
      { name: 'Pendientes', value: pendientes, color: '#D97706' },
      { name: 'En revision', value: enRevision, color: '#2563EB' },
      { name: 'Validadas', value: validadas, color: '#16A34A' },
      { name: 'Rechazadas', value: rechazadas, color: '#DC2626' },
    ],
    [pendientes, enRevision, validadas, rechazadas]
  )

  const lastMovements = useMemo(() => {
    const quotaMoves = data.cuotas.map((c) => ({
      id: `cuota-${c.id}`,
      date: c.fecha_vencimiento,
      label: `Cuota ${c.periodo} emitida para ${residenteNombre(c.residente_id)}`,
    }))
    const envioMoves = data.envios.map((e) => {
      const cuota = data.cuotas.find((c) => c.id === e.pago_id)
      return {
        id: `envio-${e.id}`,
        date: e.fecha_subida ?? '',
        label: `Envio ${e.estado_validacion} de ${residenteNombre(cuota?.residente_id ?? null)}`,
      }
    })
    const all = [...quotaMoves, ...envioMoves].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    return all.slice(0, 6)
  }, [data.cuotas, data.envios, data.residentes])

  const recentComprobantes = useMemo(() => {
    return data.envios.slice(0, 5).map((envio) => {
      const cuota = data.cuotas.find((x) => x.id === envio.pago_id)
      return {
        id: envio.id,
        file: envio.archivo_nombre ?? envio.archivo_url,
        residente: residenteNombre(cuota?.residente_id ?? null),
        estado: envio.estado_validacion,
        fecha: envio.fecha_subida,
      }
    })
  }, [data.envios, data.cuotas, data.residentes])

  const openIncidencias = useMemo(() => incidencias.filter((x) => x.estado !== 'resuelto').slice(0, 5), [incidencias])

  const activeMeta = moduleMeta[activeModule]

  return (
    <div className="app-shell min-h-[calc(100svh-56px)] text-foreground">
      <div className="mx-auto grid min-h-[calc(100svh-56px)] max-w-[1400px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr] lg:gap-6 lg:p-6">
        <aside className="surface-card hidden overflow-hidden p-4 lg:block">
          <div className="brand-gradient -mx-4 -mt-4 mb-4 h-1.5" />
          <div className="mb-4 border-b border-border/70 pb-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="relative h-8 w-8 overflow-hidden rounded-full border border-border/70">
                <Image src="/branding/logo-main.jpg" alt="La Meli" fill className="object-cover" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">LA MELI</p>
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">Gestion de cobros</h1>
            <p className="mt-1 text-sm text-muted-foreground">{ROLE_LABEL[role]}</p>
          </div>

          <nav className="space-y-1">
            {visibleModules.map((module) => {
              const meta = moduleMeta[module]
              const Icon = meta.icon
              const active = activeModule === module
              return (
                <button
                  key={module}
                  onClick={() => setActiveModule(module)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition',
                    active ? 'bg-secondary text-secondary-foreground shadow-sm ring-1 ring-primary/25' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon size={16} />
                  <span className="font-medium">{meta.label}</span>
                </button>
              )
            })}
          </nav>
          <div className="mt-4 border-t border-border/70 pt-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-left text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <LogOut size={16} />
              Cerrar sesion
            </button>
          </div>
        </aside>

        <main className="space-y-4">
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1 lg:hidden">
            {visibleModules.map((module) => {
              const meta = moduleMeta[module]
              const Icon = meta.icon
              const active = activeModule === module
              return (
                <button
                  key={module}
                  onClick={() => setActiveModule(module)}
                  className={cn(
                    'inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon size={13} />
                  {meta.label}
                </button>
              )
            })}
          </div>

          <header className="surface-card animate-enter overflow-hidden px-5 py-4 brand-glow">
            <div className="brand-gradient -mx-5 -mt-4 mb-4 h-1.5" />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{activeMeta.label}</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{activeMeta.subtitle}</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden rounded-xl border border-border/70 bg-card px-3 py-2 text-right sm:block">
                  <p className="text-xs font-semibold text-foreground">{currentUserName}</p>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{ROLE_LABEL[role]}</p>
                </div>
                <StatusPill label={loading ? 'Cargando' : 'Sincronizado'} tone={loading ? 'amber' : 'green'} />
                {busy && <StatusPill label="Procesando" tone="slate" />}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 rounded-lg border border-border/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <LogOut size={14} />
                  Cerrar sesion
                </button>
              </div>
            </div>
            {ok && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{ok}</p>}
            {error && <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
          </header>

          {activeModule === 'inicio' && (
            <div className="space-y-4">
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="surface-card p-4">
                  <p className="text-sm text-muted-foreground">Cuotas pendientes</p>
                  <p className="mt-2 text-2xl font-semibold">{pendientes}</p>
                </div>
                <div className="surface-card p-4">
                  <p className="text-sm text-muted-foreground">En revision</p>
                  <p className="mt-2 text-2xl font-semibold">{enRevision}</p>
                </div>
                <div className="surface-card p-4">
                  <p className="text-sm text-muted-foreground">Validadas</p>
                  <p className="mt-2 text-2xl font-semibold">{validadas}</p>
                </div>
                <div className="surface-card p-4">
                  <p className="text-sm text-muted-foreground">Rechazadas</p>
                  <p className="mt-2 text-2xl font-semibold">{rechazadas}</p>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
                <Panel title="Evolucion de cuotas por mes" subtitle="Comparativo entre cuotas emitidas y validadas">
                  {monthlyEvolution.length === 0 ? (
                    <EmptyState title="Sin datos mensuales" description="Todavia no hay informacion para graficar." />
                  ) : (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyEvolution}>
                          <XAxis dataKey="period" stroke="#6B6680" />
                          <YAxis stroke="#6B6680" allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cuotas" name="Cuotas emitidas" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="validadas" name="Cuotas validadas" fill="#6D28D9" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Panel>

                <Panel title="Distribucion de estados" subtitle="Situacion actual del flujo de cobros">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stateDistribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96}>
                          {stateDistribution.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </section>

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Panel title="Ultimos movimientos" subtitle="Actividad reciente del sistema">
                  <div className="space-y-2">
                    {lastMovements.length === 0 && <EmptyState title="Sin movimientos" description="No hay actividad reciente." />}
                    {lastMovements.map((move) => (
                      <div key={move.id} className="rounded-xl border border-border/70 px-3 py-2">
                        <p className="text-sm font-medium">{move.label}</p>
                        <p className="text-xs text-muted-foreground">{toDateText(move.date)}</p>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title="Comprobantes recientes" subtitle="Ultimos archivos subidos por residentes">
                  <div className="space-y-2">
                    {recentComprobantes.length === 0 && <EmptyState title="Sin comprobantes" description="No hay envios recientes." />}
                    {recentComprobantes.map((item) => (
                      <div key={item.id} className="rounded-xl border border-border/70 px-3 py-2">
                        <p className="truncate text-sm font-medium">{item.file}</p>
                        <p className="text-xs text-muted-foreground">{item.residente}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <StatusPill label={item.estado} tone={item.estado === 'aprobado' ? 'green' : item.estado === 'rechazado' ? 'red' : 'blue'} />
                          <p className="text-xs text-muted-foreground">{toDateText(item.fecha)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title="Incidencias abiertas" subtitle="Requieren seguimiento operativo">
                  <div className="space-y-2">
                    {openIncidencias.length === 0 && <EmptyState title="Sin incidencias abiertas" description="No hay pendientes activos." />}
                    {openIncidencias.map((item) => (
                      <div key={item.id} className="rounded-xl border border-border/70 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{item.tipo}</p>
                          <StatusPill label={item.estado} tone={item.estado === 'pendiente' ? 'amber' : 'blue'} />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{item.descripcion}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
              </section>

              <Panel title="Flujo de trabajo" subtitle="Secuencia operativa del sistema">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  <div className="rounded-xl border border-border/70 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">1</p>
                    <p className="mt-1 text-sm font-semibold">Cuota emitida</p>
                  </div>
                  <div className="rounded-xl border border-border/70 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">2</p>
                    <p className="mt-1 text-sm font-semibold">Envio residente</p>
                  </div>
                  <div className="rounded-xl border border-border/70 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">3</p>
                    <p className="mt-1 text-sm font-semibold">Validacion admin</p>
                  </div>
                  <div className="rounded-xl border border-border/70 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">4</p>
                    <p className="mt-1 text-sm font-semibold">Constancia final</p>
                  </div>
                </div>
              </Panel>
            </div>
          )}

          {activeModule === 'cuotas_envios' && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
              <Panel title="Cuotas" subtitle="Estado por flujo administrativo">
                {cuotasConEstado.length === 0 ? (
                  <EmptyState title="Sin cuotas" description="No hay cuotas visibles para este perfil." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b border-border/70 text-left text-muted-foreground">
                          <th className="pb-2 pr-3">Residente</th>
                          <th className="pb-2 pr-3">Periodo</th>
                          <th className="pb-2 pr-3">Monto</th>
                          <th className="pb-2 pr-3">Vencimiento</th>
                          <th className="pb-2 pr-3">Envio</th>
                          <th className="pb-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cuotasConEstado.map((row) => {
                          const meta = estadoMeta(row.estado)
                          return (
                            <tr
                              key={row.cuota.id}
                              className={cn('cursor-pointer border-b border-border/60', selectedCuotaId === row.cuota.id && 'bg-muted/40')}
                              onClick={() => {
                                setSelectedCuotaId(row.cuota.id)
                                setEnvioForm((v) => ({ ...v, pago_id: row.cuota.id }))
                              }}
                            >
                              <td className="py-3 pr-3">{residenteNombre(row.cuota.residente_id)}</td>
                              <td className="py-3 pr-3">{row.cuota.periodo}</td>
                              <td className="py-3 pr-3">${row.cuota.monto.toLocaleString('es-AR')}</td>
                              <td className="py-3 pr-3">{toDateText(row.cuota.fecha_vencimiento)}</td>
                              <td className="py-3 pr-3">{row.ultimoEnvio ? 'Recibido' : 'Sin envio'}</td>
                              <td className="py-3"><StatusPill label={meta.label} tone={meta.tone} /></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              <div className="space-y-4">
                <Panel title="Detalle" subtitle="Trazabilidad cuota -> envio -> constancia">
                  {!selected ? (
                    <EmptyState title="Selecciona una cuota" description="Elegi una fila para ver el detalle." />
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="rounded-xl border border-border/70 p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Cuota</p>
                        <p className="mt-1 font-semibold">{selected.cuota.periodo} · ${selected.cuota.monto.toLocaleString('es-AR')}</p>
                        <p className="text-muted-foreground">Vence: {toDateText(selected.cuota.fecha_vencimiento)}</p>
                      </div>

                      <div className="rounded-xl border border-border/70 p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Ultimo envio</p>
                        {ultimoEnvio ? (
                          <>
                            <p className="mt-1 font-semibold">{ultimoEnvio.archivo_nombre ?? ultimoEnvio.archivo_url}</p>
                            <p className="text-muted-foreground">Subido: {toDateText(ultimoEnvio.fecha_subida)}</p>
                            <StatusPill label={ultimoEnvio.estado_validacion} tone={ultimoEnvio.estado_validacion === 'aprobado' ? 'green' : ultimoEnvio.estado_validacion === 'rechazado' ? 'red' : 'blue'} />
                          </>
                        ) : (
                          <p className="mt-1 text-muted-foreground">Todavia no se envio ningun archivo.</p>
                        )}
                      </div>

                      <div className="rounded-xl border border-border/70 p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Constancia administrativa</p>
                        {ultimoEnvio?.estado_validacion === 'aprobado' || ultimoEnvio?.estado_validacion === 'rechazado' ? (
                          <>
                            <p className="mt-1 font-semibold">{ultimoEnvio.estado_validacion === 'aprobado' ? 'Aprobacion emitida' : 'Rechazo emitido'}</p>
                            <p className="text-muted-foreground">Fecha: {toDateText(ultimoEnvio.fecha_validacion)}</p>
                            <p className="text-muted-foreground">Responsable: {profileNombre(ultimoEnvio.validado_por)}</p>
                            <p className="text-muted-foreground">Observacion: {ultimoEnvio.observacion ?? '-'}</p>
                          </>
                        ) : (
                          <p className="mt-1 text-muted-foreground">Aun no hay constancia final emitida.</p>
                        )}
                      </div>
                    </div>
                  )}
                </Panel>

                {(role === 'administrador' || role === 'encargado') && (
                  <Panel title="Emitir cuota" subtitle="Alta mensual por residente">
                    <form className="space-y-3" onSubmit={(e: FormEvent) => {
                      e.preventDefault()
                      void callApi('/api/pagos', { ...cuotaForm, monto: Number(cuotaForm.monto) })
                    }}>
                      <SelectInput value={cuotaForm.residente_id} onChange={(e) => setCuotaForm((v) => ({ ...v, residente_id: e.target.value }))} required>
                        <option value="">Residente</option>
                        {data.residentes.map((r) => <option key={r.id} value={r.id}>{`${r.nombre} ${r.apellido ?? ''}`.trim()}</option>)}
                      </SelectInput>
                      <TextInput placeholder="Periodo (ej: 2026-04)" value={cuotaForm.periodo} onChange={(e) => setCuotaForm((v) => ({ ...v, periodo: e.target.value }))} required />
                      <div className="grid grid-cols-2 gap-2">
                        <TextInput type="number" placeholder="Monto" value={cuotaForm.monto} onChange={(e) => setCuotaForm((v) => ({ ...v, monto: e.target.value }))} required />
                        <TextInput type="date" value={cuotaForm.fecha_vencimiento} onChange={(e) => setCuotaForm((v) => ({ ...v, fecha_vencimiento: e.target.value }))} required />
                      </div>
                      <button className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Guardar cuota</button>
                    </form>
                  </Panel>
                )}

                {role === 'residente' && (
                  <Panel title="Subir envio" subtitle="Comprobante, factura o captura">
                    <form className="space-y-3" onSubmit={(e: FormEvent) => {
                      e.preventDefault()
                      if (!envioForm.pago_id) return setError('Selecciona una cuota')
                      if (!comprobanteFile) return setError('Selecciona un archivo')
                      void (async () => {
                        try {
                          setBusy(true)
                          const uploaded = await uploadFile('comprobante', comprobanteFile)
                          await callApi('/api/comprobantes', {
                            pago_id: envioForm.pago_id,
                            archivo_url: uploaded.storage_key,
                            archivo_nombre: envioForm.archivo_nombre || uploaded.original_name,
                          })
                          setComprobanteFile(null)
                          setEnvioForm((v) => ({ ...v, archivo_nombre: '' }))
                        } catch (err: any) {
                          setError(err?.message ?? 'No se pudo enviar el archivo')
                        } finally {
                          setBusy(false)
                        }
                      })()
                    }}>
                      <SelectInput value={envioForm.pago_id} onChange={(e) => setEnvioForm((v) => ({ ...v, pago_id: e.target.value }))} required>
                        <option value="">Cuota</option>
                        {cuotasConEstado.map((x) => <option key={x.cuota.id} value={x.cuota.id}>{`${x.cuota.periodo} · $${x.cuota.monto.toLocaleString('es-AR')}`}</option>)}
                      </SelectInput>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => setComprobanteFile(e.target.files?.[0] ?? null)}
                        className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        required
                      />
                      <TextInput placeholder="Nombre visible (opcional)" value={envioForm.archivo_nombre} onChange={(e) => setEnvioForm((v) => ({ ...v, archivo_nombre: e.target.value }))} />
                      <button className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Enviar archivo</button>
                      <p className="text-xs text-muted-foreground">Una vez enviado, no se puede editar ni borrar.</p>
                    </form>
                  </Panel>
                )}

                {(role === 'administrador' || role === 'encargado') && (
                  <Panel title="Emitir validacion" subtitle="Aprobar o rechazar envio">
                    <form className="space-y-3" onSubmit={(e: FormEvent) => {
                      e.preventDefault()
                      if (!validacionForm.id) return setError('Selecciona un envio')
                      void callApi(`/api/comprobantes/${validacionForm.id}`, validacionForm, 'PATCH')
                    }}>
                      <SelectInput value={validacionForm.id} onChange={(e) => setValidacionForm((v) => ({ ...v, id: e.target.value }))} required>
                        <option value="">Envio</option>
                        {selectedEnvios.map((x) => <option key={x.id} value={x.id}>{x.archivo_nombre ?? x.archivo_url}</option>)}
                      </SelectInput>
                      <SelectInput value={validacionForm.estado_validacion} onChange={(e) => setValidacionForm((v) => ({ ...v, estado_validacion: e.target.value as ComprobanteEstado }))}>
                        <option value="aprobado">Aprobar</option>
                        <option value="rechazado">Rechazar</option>
                        <option value="pendiente">Mantener en revision</option>
                      </SelectInput>
                      <TextInput placeholder="Observacion administrativa" value={validacionForm.observacion} onChange={(e) => setValidacionForm((v) => ({ ...v, observacion: e.target.value }))} />
                      <button className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Emitir constancia</button>
                    </form>
                  </Panel>
                )}
              </div>
            </div>
          )}

          {activeModule === 'archivo_documental' && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
              <Panel title="Archivo documental" subtitle="Comprobantes, facturas y constancias en una sola vista">
                <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
                  <SelectInput value={docFilterResidente} onChange={(e) => setDocFilterResidente(e.target.value)}>
                    <option value="">Residente</option>
                    {data.residentes.map((r) => <option key={r.id} value={r.id}>{`${r.nombre} ${r.apellido ?? ''}`.trim()}</option>)}
                  </SelectInput>
                  <SelectInput value={docFilterHabitacion} onChange={(e) => setDocFilterHabitacion(e.target.value)}>
                    <option value="">Habitacion</option>
                    {data.habitaciones.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
                  </SelectInput>
                  <SelectInput value={docFilterPeriodo} onChange={(e) => setDocFilterPeriodo(e.target.value)}>
                    <option value="">Periodo</option>
                    {[...new Set(documentoRows.map((d) => d.periodo).filter(Boolean) as string[])].sort().map((periodo) => (
                      <option key={periodo} value={periodo}>{periodo}</option>
                    ))}
                  </SelectInput>
                  <SelectInput value={docFilterTipo} onChange={(e) => setDocFilterTipo(e.target.value as 'todos' | DocumentType)}>
                    <option value="todos">Tipo documento</option>
                    <option value="comprobante_residente">Comprobante residente</option>
                    <option value="factura_gasto">Factura gasto interno</option>
                    <option value="constancia_admin">Constancia administrativa</option>
                  </SelectInput>
                  <SelectInput value={docFilterEstado} onChange={(e) => setDocFilterEstado(e.target.value)}>
                    <option value="todos">Estado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
                    <option value="registrado">Registrado</option>
                  </SelectInput>
                </div>

                {filteredDocuments.length === 0 ? (
                  <EmptyState title="Sin documentos" description="No hay documentos para los filtros seleccionados." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] text-sm">
                      <thead>
                        <tr className="border-b border-border/70 text-left text-muted-foreground">
                          <th className="pb-2 pr-3">Tipo</th>
                          <th className="pb-2 pr-3">Residente</th>
                          <th className="pb-2 pr-3">Habitacion</th>
                          <th className="pb-2 pr-3">Periodo</th>
                          <th className="pb-2 pr-3">Estado</th>
                          <th className="pb-2 pr-3">Archivo</th>
                          <th className="pb-2 pr-3">Subido por</th>
                          <th className="pb-2 pr-3">Fecha</th>
                          <th className="pb-2">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDocuments.map((doc) => (
                          <tr key={doc.id} className={cn('border-b border-border/60', doc.id === docSelectedId && 'bg-muted/40')}>
                            <td className="py-3 pr-3">{tipoDocumentoLabel(doc.tipo)}</td>
                            <td className="py-3 pr-3">{residenteNombre(doc.residente_id)}</td>
                            <td className="py-3 pr-3">{habitacionNombre(doc.habitacion_id)}</td>
                            <td className="py-3 pr-3">{doc.periodo ?? '-'}</td>
                            <td className="py-3 pr-3">
                              <StatusPill label={doc.estado} tone={doc.estado === 'aprobado' ? 'green' : doc.estado === 'rechazado' ? 'red' : doc.estado === 'pendiente' ? 'blue' : 'slate'} />
                            </td>
                            <td className="py-3 pr-3">{doc.nombre}</td>
                            <td className="py-3 pr-3">{doc.subido_por_tipo === 'residente' ? 'Residente' : 'Administracion'}</td>
                            <td className="py-3 pr-3">{toDateText(doc.fecha)}</td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <button onClick={() => void handlePreview(doc)} className="rounded-lg border border-border/70 px-2 py-1 text-xs font-semibold hover:bg-muted">Ver</button>
                                <button onClick={() => void handleDownload(doc)} className="rounded-lg border border-border/70 px-2 py-1 text-xs font-semibold hover:bg-muted">Descargar</button>
                                {doc.cuota_id && (
                                  <button
                                    onClick={() => {
                                      setActiveModule('cuotas_envios')
                                      setSelectedCuotaId(doc.cuota_id ?? '')
                                    }}
                                    className="rounded-lg border border-border/70 px-2 py-1 text-xs font-semibold hover:bg-muted"
                                  >
                                    Ir a cuota
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              <Panel title="Preview de archivo" subtitle="Visualizacion y metadatos del documento">
                {!selectedDoc ? (
                  <EmptyState title="Selecciona un documento" description="Usa el boton Ver para abrir una previsualizacion." />
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/70 p-3 text-sm">
                      <p className="font-semibold">{selectedDoc.nombre}</p>
                      <p className="text-muted-foreground">{tipoDocumentoLabel(selectedDoc.tipo)}</p>
                      <p className="text-muted-foreground">Residente: {residenteNombre(selectedDoc.residente_id)}</p>
                      <p className="text-muted-foreground">Habitacion: {habitacionNombre(selectedDoc.habitacion_id)}</p>
                      <p className="text-muted-foreground">Periodo: {selectedDoc.periodo ?? '-'}</p>
                      <p className="text-muted-foreground">Subido por: {selectedDoc.subido_por_tipo === 'residente' ? 'Residente' : 'Administracion'}</p>
                    </div>
                    {docPreviewUrl ? (
                      selectedDoc.nombre.toLowerCase().endsWith('.pdf') || selectedDoc.archivo.toLowerCase().endsWith('.pdf') ? (
                        <iframe title="preview-pdf" src={docPreviewUrl} className="h-[520px] w-full rounded-xl border border-border/70 bg-muted/20" />
                      ) : (
                        <img src={docPreviewUrl} alt={selectedDoc.nombre} className="max-h-[520px] w-full rounded-xl border border-border/70 object-contain bg-muted/20" />
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">Haz clic en Ver para cargar la previsualizacion.</p>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => void handlePreview(selectedDoc)} className="rounded-lg border border-border/70 px-3 py-1.5 text-xs font-semibold hover:bg-muted">Ver</button>
                      <button onClick={() => void handleDownload(selectedDoc)} className="rounded-lg border border-border/70 px-3 py-1.5 text-xs font-semibold hover:bg-muted">Descargar</button>
                    </div>
                  </div>
                )}
              </Panel>
            </div>
          )}

          {activeModule === 'gastos_internos' && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
              <Panel title="Gastos internos" subtitle="Seccion separada del flujo de cuotas">
                {gastos.length === 0 ? (
                  <EmptyState title="Sin gastos" description="No hay gastos cargados." />
                ) : (
                  <div className="space-y-2">
                    {gastos.map((g) => (
                      <div key={g.id} className="flex items-center justify-between rounded-xl border border-border/70 p-3">
                        <div>
                          <p className="text-sm font-medium">{g.descripcion}</p>
                          <p className="text-xs text-muted-foreground">{categoriaNombre(g.categoria_id)} · {toDateText(g.fecha)}</p>
                          {g.nombre_factura && <p className="text-xs text-muted-foreground">Factura: {g.nombre_factura}</p>}
                        </div>
                        <p className="text-sm font-semibold">${g.monto.toLocaleString('es-AR')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              {(role === 'administrador' || role === 'encargado') && (
                <Panel title="Cargar gasto" subtitle="Solo administrador y encargado">
                  <form className="space-y-3" onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    void (async () => {
                      try {
                        let factura: { storage_key: string; original_name: string } | null = null
                        if (facturaFile) factura = await uploadFile('factura', facturaFile)
                        await callApi('/api/gastos', {
                          ...gastoForm,
                          monto: Number(gastoForm.monto),
                          archivo_factura: factura?.storage_key ?? null,
                          nombre_factura: factura?.original_name ?? null,
                        })
                        setFacturaFile(null)
                      } catch (err: any) {
                        setError(err?.message ?? 'No se pudo guardar el gasto')
                      }
                    })()
                  }}>
                    <SelectInput value={gastoForm.categoria_id} onChange={(e) => setGastoForm((v) => ({ ...v, categoria_id: e.target.value }))}>
                      <option value="">Categoria</option>
                      {data.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </SelectInput>
                    <div className="grid grid-cols-2 gap-2">
                      <TextInput type="number" placeholder="Monto" value={gastoForm.monto} onChange={(e) => setGastoForm((v) => ({ ...v, monto: e.target.value }))} required />
                      <TextInput type="date" value={gastoForm.fecha} onChange={(e) => setGastoForm((v) => ({ ...v, fecha: e.target.value }))} required />
                    </div>
                    <TextInput placeholder="Descripcion" value={gastoForm.descripcion} onChange={(e) => setGastoForm((v) => ({ ...v, descripcion: e.target.value }))} required />
                    <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFacturaFile(e.target.files?.[0] ?? null)} className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                    <button className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Guardar gasto</button>
                  </form>
                </Panel>
              )}
            </div>
          )}

          {activeModule === 'incidencias' && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
              <Panel title="Incidencias" subtitle="Seccion independiente del modulo de cuotas">
                {incidencias.length === 0 ? (
                  <EmptyState title="Sin incidencias" description="No hay incidencias reportadas." />
                ) : (
                  <div className="space-y-2">
                    {incidencias.map((a) => (
                      <div key={a.id} className="rounded-xl border border-border/70 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{a.tipo}</p>
                          <StatusPill label={a.estado} tone={a.estado === 'resuelto' ? 'green' : a.estado === 'pendiente' ? 'amber' : 'blue'} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{a.descripcion}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Prioridad: {a.prioridad} · Hab: {habitacionNombre(a.habitacion_id)} · Espacio: {espacioNombre(a.espacio_comun_id)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Reportar incidencia">
                <form className="space-y-3" onSubmit={(e: FormEvent) => {
                  e.preventDefault()
                  void callApi('/api/arreglos', arregloForm)
                }}>
                  <TextInput placeholder="Tipo" value={arregloForm.tipo} onChange={(e) => setArregloForm((v) => ({ ...v, tipo: e.target.value }))} required />
                  <TextInput placeholder="Descripcion" value={arregloForm.descripcion} onChange={(e) => setArregloForm((v) => ({ ...v, descripcion: e.target.value }))} required />
                  <SelectInput value={arregloForm.prioridad} onChange={(e) => setArregloForm((v) => ({ ...v, prioridad: e.target.value }))}>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </SelectInput>
                  <button className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Guardar incidencia</button>
                </form>
              </Panel>
            </div>
          )}

          {activeModule === 'residentes' && (
            <Panel title="Residentes" subtitle="Vista administrativa de ocupacion">
              {data.residentes.length === 0 ? (
                <EmptyState title="Sin residentes" description="No hay residentes cargados." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b border-border/70 text-left text-muted-foreground">
                        <th className="pb-2 pr-3">Nombre</th>
                        <th className="pb-2 pr-3">Estado</th>
                        <th className="pb-2 pr-3">Habitacion</th>
                        <th className="pb-2">Usuario vinculado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.residentes.map((r) => (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="py-3 pr-3">{`${r.nombre} ${r.apellido ?? ''}`.trim()}</td>
                          <td className="py-3 pr-3"><StatusPill label={r.estado} tone={r.estado === 'activo' ? 'green' : r.estado === 'pendiente' ? 'amber' : 'slate'} /></td>
                          <td className="py-3 pr-3">{habitacionNombre(r.habitacion_id)}</td>
                          <td className="py-3">{r.user_id ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}

          {activeModule === 'habitaciones' && (
            <Panel title="Habitaciones" subtitle="Inventario fisico de la residencia">
              {data.habitaciones.length === 0 ? (
                <EmptyState title="Sin habitaciones" description="No hay habitaciones cargadas." />
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {data.habitaciones.map((h) => (
                    <div key={h.id} className="rounded-xl border border-border/70 p-3">
                      <p className="text-sm font-medium">{h.nombre}</p>
                      <p className="mt-1 text-xs text-muted-foreground">ID: {h.id}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {activeModule === 'reportes' && (
            <Panel title="Reportes" subtitle="Supervision global para gerencia y administracion">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/70 p-3"><p className="text-xs text-muted-foreground">Cuotas totales</p><p className="mt-1 text-xl font-semibold">{cuotasConEstado.length}</p></div>
                <div className="rounded-xl border border-border/70 p-3"><p className="text-xs text-muted-foreground">Envios recibidos</p><p className="mt-1 text-xl font-semibold">{envios.length}</p></div>
                <div className="rounded-xl border border-border/70 p-3"><p className="text-xs text-muted-foreground">Validadas</p><p className="mt-1 text-xl font-semibold">{validadas}</p></div>
                <div className="rounded-xl border border-border/70 p-3"><p className="text-xs text-muted-foreground">Rechazadas</p><p className="mt-1 text-xl font-semibold">{rechazadas}</p></div>
              </div>
            </Panel>
          )}

          {activeModule === 'avisos' && (
            <Panel title="Avisos" subtitle="Comunicacion interna">
              {avisos.length === 0 ? (
                <EmptyState title="Sin avisos" description="No hay avisos para mostrar." />
              ) : (
                <div className="space-y-2">
                  {avisos.map((a) => (
                    <div key={a.id} className="rounded-xl border border-border/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{a.titulo}</p>
                        <StatusPill label={a.destinatario_tipo} tone="blue" />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{a.contenido}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Bell size={12} />{toDateText(a.fecha)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}
        </main>
      </div>
    </div>
  )
}
