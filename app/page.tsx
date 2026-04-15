'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileCheck2,
  Hammer,
  Home,
  Megaphone,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'

type Role = 'administrador' | 'encargado' | 'residente'
type PagoEstado = 'pendiente' | 'pagado' | 'vencido' | 'parcial'
type ComprobanteEstado = 'pendiente' | 'aprobado' | 'rechazado'
type IncidenciaEstado = 'pendiente' | 'en_revision' | 'en_reparacion' | 'resuelto' | 'cancelado'
type TareaEstado = 'pendiente' | 'completada' | 'vencida' | 'cancelada'
type Destinatario = 'todos' | 'residentes' | 'encargados' | 'individual'
type ModuleId =
  | 'dashboard'
  | 'pagos'
  | 'comprobantes'
  | 'gastos'
  | 'arreglos'
  | 'tareas'
  | 'avisos'
  | 'residentes'
  | 'habitaciones'

type Habitacion = { id: string; nombre: string }
type Espacio = { id: string; nombre: string }
type Categoria = { id: string; nombre: string }
type Residente = { id: string; user_id: string | null; nombre: string; apellido: string | null; estado: string; habitacion_id: string | null }
type Pago = { id: string; residente_id: string; periodo: string; monto: number; fecha_vencimiento: string; estado: PagoEstado }
type Comprobante = { id: string; pago_id: string; archivo_nombre: string | null; archivo_url: string; estado_validacion: ComprobanteEstado }
type Gasto = { id: string; categoria_id: string | null; monto: number; fecha: string; descripcion: string }
type Arreglo = { id: string; reportado_por: string; tipo: string; descripcion: string; estado: IncidenciaEstado; prioridad: string; habitacion_id: string | null; espacio_comun_id: string | null }
type Tarea = { id: string; titulo: string; estado: TareaEstado; residente_id: string | null; espacio_comun_id: string | null; fecha_limite: string | null }
type Aviso = { id: string; titulo: string; contenido: string; destinatario_tipo: Destinatario; destinatario_id: string | null; fecha: string }

type AppData = {
  habitaciones: Habitacion[]
  espacios: Espacio[]
  categorias: Categoria[]
  residentes: Residente[]
  pagos: Pago[]
  comprobantes: Comprobante[]
  gastos: Gasto[]
  arreglos: Arreglo[]
  tareas: Tarea[]
  avisos: Aviso[]
}

const EMPTY_DATA: AppData = {
  habitaciones: [],
  espacios: [],
  categorias: [],
  residentes: [],
  pagos: [],
  comprobantes: [],
  gastos: [],
  arreglos: [],
  tareas: [],
  avisos: [],
}

const ROLE_LABEL: Record<Role, string> = {
  administrador: 'Administrador',
  encargado: 'Encargado',
  residente: 'Residente',
}

const roleModules: Record<Role, ModuleId[]> = {
  administrador: ['dashboard', 'pagos', 'comprobantes', 'gastos', 'arreglos', 'tareas', 'avisos', 'residentes', 'habitaciones'],
  encargado: ['dashboard', 'pagos', 'comprobantes', 'gastos', 'arreglos', 'tareas', 'avisos', 'residentes', 'habitaciones'],
  residente: ['dashboard', 'pagos', 'comprobantes', 'arreglos', 'tareas', 'avisos'],
}

const moduleMeta: Record<ModuleId, { label: string; subtitle: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  dashboard: { label: 'Dashboard', subtitle: 'Resumen operativo de la residencia', icon: Home },
  pagos: { label: 'Pagos', subtitle: 'Control de cuotas, vencimientos y deuda', icon: Wallet },
  comprobantes: { label: 'Comprobantes', subtitle: 'Carga y validación de comprobantes', icon: FileCheck2 },
  gastos: { label: 'Gastos', subtitle: 'Facturas y costos internos', icon: Receipt },
  arreglos: { label: 'Arreglos', subtitle: 'Incidencias y mantenimiento', icon: Wrench },
  tareas: { label: 'Tareas', subtitle: 'Convivencia y espacios comunes', icon: ClipboardList },
  avisos: { label: 'Avisos', subtitle: 'Comunicación interna', icon: Megaphone },
  residentes: { label: 'Residentes', subtitle: 'Ocupación y estado de residentes', icon: Users },
  habitaciones: { label: 'Habitaciones', subtitle: 'Inventario de habitaciones/deptos', icon: Hammer },
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

function Panel({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [role, setRole] = useState<Role>('residente')
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard')
  const [data, setData] = useState<AppData>(EMPTY_DATA)

  const [pagoForm, setPagoForm] = useState({ residente_id: '', periodo: '', monto: '', fecha_vencimiento: '' })
  const [comprobanteForm, setComprobanteForm] = useState({ pago_id: '', archivo_url: '', archivo_nombre: '' })
  const [validarForm, setValidarForm] = useState({ id: '', estado_validacion: 'aprobado' as ComprobanteEstado, observacion: '' })
  const [gastoForm, setGastoForm] = useState({ categoria_id: '', monto: '', fecha: '', descripcion: '' })
  const [arregloForm, setArregloForm] = useState({ tipo: '', descripcion: '', prioridad: 'media', habitacion_id: '', espacio_comun_id: '' })
  const [arregloEstadoForm, setArregloEstadoForm] = useState({ id: '', estado: 'en_revision' as IncidenciaEstado })
  const [tareaForm, setTareaForm] = useState({ titulo: '', residente_id: '', espacio_comun_id: '', fecha_limite: '' })
  const [completeTaskId, setCompleteTaskId] = useState('')
  const [avisoForm, setAvisoForm] = useState({ titulo: '', contenido: '', destinatario_tipo: 'residentes' as Destinatario, destinatario_id: '' })

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
      if (profile?.rol) setRole(profile.rol as Role)

      const [habitaciones, espacios, categorias, residentes, pagos, comprobantes, gastos, arreglos, tareas, avisos] = await Promise.all([
        supabase.from('habitaciones').select('id,nombre').order('nombre'),
        supabase.from('espacios_comunes').select('id,nombre').order('nombre'),
        supabase.from('categorias_gasto').select('id,nombre').order('nombre'),
        supabase.from('residentes').select('id,user_id,nombre,apellido,estado,habitacion_id').order('nombre'),
        supabase.from('pagos').select('id,residente_id,periodo,monto,fecha_vencimiento,estado').order('fecha_vencimiento', { ascending: false }),
        supabase.from('comprobantes').select('id,pago_id,archivo_url,archivo_nombre,estado_validacion').order('fecha_subida', { ascending: false }),
        supabase.from('gastos').select('id,categoria_id,monto,fecha,descripcion').order('fecha', { ascending: false }),
        supabase.from('arreglos').select('id,reportado_por,tipo,descripcion,estado,prioridad,habitacion_id,espacio_comun_id').order('fecha_reporte', { ascending: false }),
        supabase.from('tareas').select('id,titulo,estado,residente_id,espacio_comun_id,fecha_limite').order('fecha_limite', { ascending: true }),
        supabase.from('avisos').select('id,titulo,contenido,destinatario_tipo,destinatario_id,fecha').order('fecha', { ascending: false }),
      ])

      const errors = [habitaciones.error, espacios.error, categorias.error, residentes.error, pagos.error, comprobantes.error, gastos.error, arreglos.error, tareas.error, avisos.error].filter(Boolean)
      if (errors.length > 0) throw errors[0]

      setData({
        habitaciones: (habitaciones.data ?? []) as Habitacion[],
        espacios: (espacios.data ?? []) as Espacio[],
        categorias: (categorias.data ?? []) as Categoria[],
        residentes: (residentes.data ?? []) as Residente[],
        pagos: ((pagos.data ?? []) as any[]).map((p) => ({ ...p, monto: Number(p.monto) })) as Pago[],
        comprobantes: (comprobantes.data ?? []) as Comprobante[],
        gastos: ((gastos.data ?? []) as any[]).map((g) => ({ ...g, monto: Number(g.monto) })) as Gasto[],
        arreglos: (arreglos.data ?? []) as Arreglo[],
        tareas: (tareas.data ?? []) as Tarea[],
        avisos: (avisos.data ?? []) as Aviso[],
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
      setOk('Operación realizada correctamente')
      await reload()
    } catch (err: any) {
      setError(err?.message ?? 'Operación fallida')
    } finally {
      setBusy(false)
    }
  }

  const visibleModules = roleModules[role]

  useEffect(() => {
    if (!visibleModules.includes(activeModule)) {
      setActiveModule('dashboard')
    }
  }, [visibleModules, activeModule])

  const viewerResidentId = data.residentes.find((r) => r.user_id === authUserId)?.id

  const pagos = role === 'residente' && viewerResidentId ? data.pagos.filter((p) => p.residente_id === viewerResidentId) : role === 'residente' ? [] : data.pagos
  const pagoMap = new Map(data.pagos.map((p) => [p.id, p]))
  const pagosVisibles = new Set(pagos.map((p) => p.id))
  const comprobantes = role === 'residente' ? data.comprobantes.filter((c) => pagosVisibles.has(c.pago_id)) : data.comprobantes
  const gastos = role === 'residente' ? [] : data.gastos
  const arreglos = role === 'residente' ? data.arreglos.filter((a) => a.reportado_por === authUserId) : data.arreglos
  const tareas = role === 'residente' && viewerResidentId ? data.tareas.filter((t) => t.residente_id === viewerResidentId) : role === 'residente' ? [] : data.tareas
  const avisos = data.avisos.filter((a) => {
    if (a.destinatario_tipo === 'todos') return true
    if (role === 'residente') return a.destinatario_tipo === 'residentes' || (a.destinatario_tipo === 'individual' && a.destinatario_id === authUserId)
    if (role === 'encargado') return a.destinatario_tipo === 'encargados' || a.destinatario_tipo === 'residentes'
    return true
  })

  const pagosPendientes = pagos.filter((p) => p.estado === 'pendiente').length
  const deudaTotal = pagos.filter((p) => p.estado !== 'pagado').reduce((acc, p) => acc + p.monto, 0)
  const comprobantesPendientes = comprobantes.filter((c) => c.estado_validacion === 'pendiente').length
  const arreglosAbiertos = arreglos.filter((a) => a.estado !== 'resuelto').length

  const residenteNombre = (id: string | null) => {
    const r = data.residentes.find((x) => x.id === id)
    return r ? `${r.nombre} ${r.apellido ?? ''}`.trim() : '-'
  }

  const categoriaNombre = (id: string | null) => data.categorias.find((c) => c.id === id)?.nombre ?? '-'
  const habitacionNombre = (id: string | null) => data.habitaciones.find((h) => h.id === id)?.nombre ?? '-'
  const espacioNombre = (id: string | null) => data.espacios.find((e) => e.id === id)?.nombre ?? '-'

  const activeMeta = moduleMeta[activeModule]

  const jumpTo = (module: ModuleId) => {
    if (visibleModules.includes(module)) setActiveModule(module)
  }

  return (
    <div className="app-shell min-h-[calc(100svh-56px)] text-foreground">
      <div className="mx-auto grid min-h-[calc(100svh-56px)] max-w-[1400px] grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_1fr] lg:gap-6 lg:p-6">
        <aside className="surface-card hidden p-4 lg:block">
          <div className="mb-4 border-b border-border/70 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Residencia</p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">Panel de gestión</h1>
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
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon size={16} />
                  <span className="font-medium">{meta.label}</span>
                </button>
              )
            })}
          </nav>
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
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon size={13} />
                  {meta.label}
                </button>
              )
            })}
          </div>

          <header className="surface-card animate-enter px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{activeMeta.label}</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{activeMeta.subtitle}</h2>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill label={loading ? 'Cargando' : 'Datos sincronizados'} tone={loading ? 'amber' : 'green'} />
                <StatusPill label={ROLE_LABEL[role]} tone="blue" />
                {busy && <StatusPill label="Procesando" tone="slate" />}
              </div>
            </div>
            {ok && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{ok}</p>}
            {error && <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
          </header>

          {activeModule === 'dashboard' && (
            <div className="space-y-4">
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="surface-card animate-enter p-4">
                  <p className="text-sm text-muted-foreground">Pagos pendientes</p>
                  <div className="mt-2 flex items-center gap-2 text-2xl font-semibold"><Wallet size={18} />{pagosPendientes}</div>
                </div>
                <div className="surface-card animate-enter stagger-1 p-4">
                  <p className="text-sm text-muted-foreground">Comprobantes por validar</p>
                  <div className="mt-2 flex items-center gap-2 text-2xl font-semibold"><FileCheck2 size={18} />{comprobantesPendientes}</div>
                </div>
                <div className="surface-card animate-enter stagger-2 p-4">
                  <p className="text-sm text-muted-foreground">Deuda total</p>
                  <div className="mt-2 flex items-center gap-2 text-2xl font-semibold"><ShieldCheck size={18} />${deudaTotal.toLocaleString('es-AR')}</div>
                </div>
                <div className="surface-card animate-enter stagger-3 p-4">
                  <p className="text-sm text-muted-foreground">Arreglos abiertos</p>
                  <div className="mt-2 flex items-center gap-2 text-2xl font-semibold"><Wrench size={18} />{arreglosAbiertos}</div>
                </div>
              </section>

              <Panel title="Acciones rápidas" subtitle="Atajos operativos por prioridad">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <button onClick={() => jumpTo('pagos')} className="rounded-xl border border-border/70 bg-background px-3 py-3 text-left transition hover:border-primary/70">
                    <p className="text-sm font-semibold">Revisar pagos</p>
                    <p className="mt-1 text-xs text-muted-foreground">Ver pendientes y vencimientos</p>
                  </button>
                  <button onClick={() => jumpTo('comprobantes')} className="rounded-xl border border-border/70 bg-background px-3 py-3 text-left transition hover:border-primary/70">
                    <p className="text-sm font-semibold">Validar comprobantes</p>
                    <p className="mt-1 text-xs text-muted-foreground">Aprobar o rechazar archivos</p>
                  </button>
                  {(role === 'administrador' || role === 'encargado') && (
                    <button onClick={() => jumpTo('gastos')} className="rounded-xl border border-border/70 bg-background px-3 py-3 text-left transition hover:border-primary/70">
                      <p className="text-sm font-semibold">Cargar gasto</p>
                      <p className="mt-1 text-xs text-muted-foreground">Registrar facturas internas</p>
                    </button>
                  )}
                  <button onClick={() => jumpTo('arreglos')} className="rounded-xl border border-border/70 bg-background px-3 py-3 text-left transition hover:border-primary/70">
                    <p className="text-sm font-semibold">Gestionar arreglos</p>
                    <p className="mt-1 text-xs text-muted-foreground">Resolver incidencias activas</p>
                  </button>
                </div>
              </Panel>

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Panel title="Pendientes críticos" subtitle="Elementos que requieren atención hoy">
                  <div className="space-y-2 text-sm">
                    {pagos.filter((p) => p.estado === 'pendiente').slice(0, 4).map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                        <span>{residenteNombre(p.residente_id)} · {p.periodo}</span>
                        <StatusPill label="Pendiente" tone="amber" />
                      </div>
                    ))}
                    {arreglos.filter((a) => a.estado !== 'resuelto').slice(0, 4).map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                        <span>{a.tipo}</span>
                        <StatusPill label={a.estado} tone={a.estado === 'pendiente' ? 'amber' : 'blue'} />
                      </div>
                    ))}
                    {pagos.filter((p) => p.estado === 'pendiente').length === 0 && arreglos.filter((a) => a.estado !== 'resuelto').length === 0 && (
                      <EmptyState title="Sin pendientes" description="No hay tareas urgentes para este rol." />
                    )}
                  </div>
                </Panel>

                <Panel title="Actividad reciente" subtitle="Avisos y tareas más recientes">
                  <div className="space-y-2 text-sm">
                    {avisos.slice(0, 5).map((a) => (
                      <div key={a.id} className="rounded-lg border border-border/70 p-3">
                        <p className="font-medium">{a.titulo}</p>
                        <p className="text-muted-foreground">{a.contenido}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Bell size={12} />{toDateText(a.fecha)}</div>
                      </div>
                    ))}
                    {avisos.length === 0 && <EmptyState title="Sin avisos" description="Todavía no se publicaron avisos internos." />}
                  </div>
                </Panel>
              </section>
            </div>
          )}

          {activeModule === 'pagos' && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
              <Panel title="Listado de pagos" subtitle="Control de estado por residente y período">
                {pagos.length === 0 ? (
                  <EmptyState title="Sin pagos registrados" description="Cuando crees pagos mensuales aparecerán en esta tabla." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="border-b border-border/70 text-left text-muted-foreground">
                          <th className="pb-2 pr-3">Residente</th>
                          <th className="pb-2 pr-3">Período</th>
                          <th className="pb-2 pr-3">Monto</th>
                          <th className="pb-2 pr-3">Vencimiento</th>
                          <th className="pb-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagos.map((p) => (
                          <tr key={p.id} className="border-b border-border/60">
                            <td className="py-3 pr-3">{residenteNombre(p.residente_id)}</td>
                            <td className="py-3 pr-3">{p.periodo}</td>
                            <td className="py-3 pr-3">${p.monto.toLocaleString('es-AR')}</td>
                            <td className="py-3 pr-3">{toDateText(p.fecha_vencimiento)}</td>
                            <td className="py-3">
                              <StatusPill
                                label={p.estado}
                                tone={p.estado === 'pagado' ? 'green' : p.estado === 'vencido' ? 'red' : p.estado === 'parcial' ? 'blue' : 'amber'}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              {(role === 'administrador' || role === 'encargado') && (
                <Panel title="Nuevo pago" subtitle="Alta de cuota mensual">
                  <form className="space-y-3" onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    void callApi('/api/pagos', { ...pagoForm, monto: Number(pagoForm.monto) })
                  }}>
                    <SelectInput value={pagoForm.residente_id} onChange={(e) => setPagoForm((v) => ({ ...v, residente_id: e.target.value }))} required>
                      <option value="">Residente</option>
                      {data.residentes.map((r) => <option key={r.id} value={r.id}>{`${r.nombre} ${r.apellido ?? ''}`.trim()}</option>)}
                    </SelectInput>
                    <TextInput placeholder="Período (ej: 2026-04)" value={pagoForm.periodo} onChange={(e) => setPagoForm((v) => ({ ...v, periodo: e.target.value }))} required />
                    <div className="grid grid-cols-2 gap-2">
                      <TextInput type="number" placeholder="Monto" value={pagoForm.monto} onChange={(e) => setPagoForm((v) => ({ ...v, monto: e.target.value }))} required />
                      <TextInput type="date" value={pagoForm.fecha_vencimiento} onChange={(e) => setPagoForm((v) => ({ ...v, fecha_vencimiento: e.target.value }))} required />
                    </div>
                    <button className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Guardar pago</button>
                  </form>
                </Panel>
              )}
            </div>
          )}

          {activeModule === 'comprobantes' && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
              <Panel title="Comprobantes" subtitle="Carga y seguimiento de validación">
                {comprobantes.length === 0 ? (
                  <EmptyState title="Sin comprobantes" description="No hay comprobantes disponibles para este perfil." />
                ) : (
                  <div className="space-y-2">
                    {comprobantes.map((c) => {
                      const pago = pagoMap.get(c.pago_id)
                      return (
                        <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 p-3">
                          <div>
                            <p className="text-sm font-medium">{c.archivo_nombre ?? c.archivo_url}</p>
                            <p className="text-xs text-muted-foreground">{pago ? `${pago.periodo} · ${residenteNombre(pago.residente_id)}` : 'Sin pago asociado'}</p>
                          </div>
                          <StatusPill
                            label={c.estado_validacion}
                            tone={c.estado_validacion === 'aprobado' ? 'green' : c.estado_validacion === 'rechazado' ? 'red' : 'amber'}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </Panel>

              <div className="space-y-4">
                <Panel title="Subir comprobante">
                  <form className="space-y-3" onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    void callApi('/api/comprobantes', comprobanteForm)
                  }}>
                    <SelectInput value={comprobanteForm.pago_id} onChange={(e) => setComprobanteForm((v) => ({ ...v, pago_id: e.target.value }))} required>
                      <option value="">Pago</option>
                      {pagos.map((p) => <option key={p.id} value={p.id}>{`${p.periodo} · $${p.monto.toLocaleString('es-AR')}`}</option>)}
                    </SelectInput>
                    <TextInput placeholder="URL del archivo" value={comprobanteForm.archivo_url} onChange={(e) => setComprobanteForm((v) => ({ ...v, archivo_url: e.target.value }))} required />
                    <TextInput placeholder="Nombre visible" value={comprobanteForm.archivo_nombre} onChange={(e) => setComprobanteForm((v) => ({ ...v, archivo_nombre: e.target.value }))} />
                    <button className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Enviar comprobante</button>
                  </form>
                </Panel>

                {(role === 'administrador' || role === 'encargado') && (
                  <Panel title="Validar comprobante">
                    <form className="space-y-3" onSubmit={(e: FormEvent) => {
                      e.preventDefault()
                      if (!validarForm.id) return
                      void callApi(`/api/comprobantes/${validarForm.id}`, validarForm, 'PATCH')
                    }}>
                      <SelectInput value={validarForm.id} onChange={(e) => setValidarForm((v) => ({ ...v, id: e.target.value }))} required>
                        <option value="">Comprobante</option>
                        {data.comprobantes.map((c) => <option key={c.id} value={c.id}>{c.archivo_nombre ?? c.archivo_url}</option>)}
                      </SelectInput>
                      <SelectInput value={validarForm.estado_validacion} onChange={(e) => setValidarForm((v) => ({ ...v, estado_validacion: e.target.value as ComprobanteEstado }))}>
                        <option value="aprobado">Aprobar</option>
                        <option value="rechazado">Rechazar</option>
                        <option value="pendiente">Pendiente</option>
                      </SelectInput>
                      <TextInput placeholder="Observación" value={validarForm.observacion} onChange={(e) => setValidarForm((v) => ({ ...v, observacion: e.target.value }))} />
                      <button className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Guardar validación</button>
                    </form>
                  </Panel>
                )}
              </div>
            </div>
          )}

          {activeModule === 'gastos' && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
              <Panel title="Gastos internos" subtitle="Servicios, mantenimiento y compras">
                {gastos.length === 0 ? (
                  <EmptyState title="Sin gastos" description="Todavía no hay gastos cargados." />
                ) : (
                  <div className="space-y-2">
                    {gastos.map((g) => (
                      <div key={g.id} className="flex items-center justify-between rounded-xl border border-border/70 p-3">
                        <div>
                          <p className="text-sm font-medium">{g.descripcion}</p>
                          <p className="text-xs text-muted-foreground">{categoriaNombre(g.categoria_id)} · {toDateText(g.fecha)}</p>
                        </div>
                        <p className="text-sm font-semibold">${g.monto.toLocaleString('es-AR')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Nuevo gasto" subtitle="Sólo administrador y encargado">
                <form className="space-y-3" onSubmit={(e: FormEvent) => {
                  e.preventDefault()
                  void callApi('/api/gastos', { ...gastoForm, monto: Number(gastoForm.monto) })
                }}>
                  <SelectInput value={gastoForm.categoria_id} onChange={(e) => setGastoForm((v) => ({ ...v, categoria_id: e.target.value }))}>
                    <option value="">Categoría</option>
                    {data.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </SelectInput>
                  <div className="grid grid-cols-2 gap-2">
                    <TextInput type="number" placeholder="Monto" value={gastoForm.monto} onChange={(e) => setGastoForm((v) => ({ ...v, monto: e.target.value }))} required />
                    <TextInput type="date" value={gastoForm.fecha} onChange={(e) => setGastoForm((v) => ({ ...v, fecha: e.target.value }))} required />
                  </div>
                  <TextInput placeholder="Descripción" value={gastoForm.descripcion} onChange={(e) => setGastoForm((v) => ({ ...v, descripcion: e.target.value }))} required />
                  <button className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Guardar gasto</button>
                </form>
              </Panel>
            </div>
          )}

          {activeModule === 'arreglos' && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
              <Panel title="Incidencias" subtitle="Seguimiento de mantenimiento">
                {arreglos.length === 0 ? (
                  <EmptyState title="Sin incidencias" description="No hay incidencias reportadas." />
                ) : (
                  <div className="space-y-2">
                    {arreglos.map((a) => (
                      <div key={a.id} className="rounded-xl border border-border/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">{a.tipo}</p>
                          <StatusPill label={a.estado} tone={a.estado === 'resuelto' ? 'green' : a.estado === 'pendiente' ? 'amber' : 'blue'} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{a.descripcion}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Prioridad: {a.prioridad} · Habitación: {habitacionNombre(a.habitacion_id)} · Espacio: {espacioNombre(a.espacio_comun_id)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <div className="space-y-4">
                <Panel title="Reportar incidencia">
                  <form className="space-y-3" onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    void callApi('/api/arreglos', arregloForm)
                  }}>
                    <TextInput placeholder="Tipo" value={arregloForm.tipo} onChange={(e) => setArregloForm((v) => ({ ...v, tipo: e.target.value }))} required />
                    <TextInput placeholder="Descripción" value={arregloForm.descripcion} onChange={(e) => setArregloForm((v) => ({ ...v, descripcion: e.target.value }))} required />
                    <SelectInput value={arregloForm.prioridad} onChange={(e) => setArregloForm((v) => ({ ...v, prioridad: e.target.value }))}>
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </SelectInput>
                    <SelectInput value={arregloForm.habitacion_id} onChange={(e) => setArregloForm((v) => ({ ...v, habitacion_id: e.target.value }))}>
                      <option value="">Habitación</option>
                      {data.habitaciones.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
                    </SelectInput>
                    <SelectInput value={arregloForm.espacio_comun_id} onChange={(e) => setArregloForm((v) => ({ ...v, espacio_comun_id: e.target.value }))}>
                      <option value="">Espacio común</option>
                      {data.espacios.map((esp) => <option key={esp.id} value={esp.id}>{esp.nombre}</option>)}
                    </SelectInput>
                    <button className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Guardar incidencia</button>
                  </form>
                </Panel>

                {(role === 'administrador' || role === 'encargado') && (
                  <Panel title="Actualizar estado">
                    <form className="space-y-3" onSubmit={(e: FormEvent) => {
                      e.preventDefault()
                      if (!arregloEstadoForm.id) return
                      void callApi(`/api/arreglos/${arregloEstadoForm.id}`, { estado: arregloEstadoForm.estado }, 'PATCH')
                    }}>
                      <SelectInput value={arregloEstadoForm.id} onChange={(e) => setArregloEstadoForm((v) => ({ ...v, id: e.target.value }))} required>
                        <option value="">Incidencia</option>
                        {arreglos.map((a) => <option key={a.id} value={a.id}>{`${a.tipo} · ${a.estado}`}</option>)}
                      </SelectInput>
                      <SelectInput value={arregloEstadoForm.estado} onChange={(e) => setArregloEstadoForm((v) => ({ ...v, estado: e.target.value as IncidenciaEstado }))}>
                        <option value="pendiente">Pendiente</option>
                        <option value="en_revision">En revisión</option>
                        <option value="en_reparacion">En reparación</option>
                        <option value="resuelto">Resuelto</option>
                        <option value="cancelado">Cancelado</option>
                      </SelectInput>
                      <button className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Guardar estado</button>
                    </form>
                  </Panel>
                )}
              </div>
            </div>
          )}

          {activeModule === 'tareas' && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
              <Panel title="Tareas de convivencia" subtitle="Asignadas por residente y espacio común">
                {tareas.length === 0 ? (
                  <EmptyState title="Sin tareas" description="No hay tareas asignadas por ahora." />
                ) : (
                  <div className="space-y-2">
                    {tareas.map((t) => (
                      <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 p-3">
                        <div>
                          <p className="text-sm font-medium">{t.titulo}</p>
                          <p className="text-xs text-muted-foreground">{residenteNombre(t.residente_id)} · {espacioNombre(t.espacio_comun_id)} · {toDateText(t.fecha_limite)}</p>
                        </div>
                        <StatusPill label={t.estado} tone={t.estado === 'completada' ? 'green' : t.estado === 'vencida' ? 'red' : 'amber'} />
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <div className="space-y-4">
                {(role === 'administrador' || role === 'encargado') && (
                  <Panel title="Crear tarea">
                    <form className="space-y-3" onSubmit={(e: FormEvent) => {
                      e.preventDefault()
                      void callApi('/api/tareas', tareaForm)
                    }}>
                      <TextInput placeholder="Título" value={tareaForm.titulo} onChange={(e) => setTareaForm((v) => ({ ...v, titulo: e.target.value }))} required />
                      <SelectInput value={tareaForm.residente_id} onChange={(e) => setTareaForm((v) => ({ ...v, residente_id: e.target.value }))}>
                        <option value="">Residente</option>
                        {data.residentes.map((r) => <option key={r.id} value={r.id}>{`${r.nombre} ${r.apellido ?? ''}`.trim()}</option>)}
                      </SelectInput>
                      <SelectInput value={tareaForm.espacio_comun_id} onChange={(e) => setTareaForm((v) => ({ ...v, espacio_comun_id: e.target.value }))}>
                        <option value="">Espacio común</option>
                        {data.espacios.map((esp) => <option key={esp.id} value={esp.id}>{esp.nombre}</option>)}
                      </SelectInput>
                      <TextInput type="date" value={tareaForm.fecha_limite} onChange={(e) => setTareaForm((v) => ({ ...v, fecha_limite: e.target.value }))} />
                      <button className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Guardar tarea</button>
                    </form>
                  </Panel>
                )}

                <Panel title="Completar tarea">
                  <form className="space-y-3" onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    if (!completeTaskId) return
                    void callApi(`/api/tareas/${completeTaskId}/complete`, {}, 'PATCH')
                  }}>
                    <SelectInput value={completeTaskId} onChange={(e) => setCompleteTaskId(e.target.value)} required>
                      <option value="">Tarea</option>
                      {tareas.filter((t) => t.estado !== 'completada').map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
                    </SelectInput>
                    <button className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Marcar completada</button>
                  </form>
                </Panel>
              </div>
            </div>
          )}

          {activeModule === 'avisos' && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
              <Panel title="Feed de avisos" subtitle="Comunicaciones activas de la residencia">
                {avisos.length === 0 ? (
                  <EmptyState title="Sin avisos" description="No hay avisos para mostrar en este momento." />
                ) : (
                  <div className="space-y-2">
                    {avisos.map((a) => (
                      <div key={a.id} className="rounded-xl border border-border/70 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{a.titulo}</p>
                          <StatusPill label={a.destinatario_tipo} tone="blue" />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{a.contenido}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{toDateText(a.fecha)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              {(role === 'administrador' || role === 'encargado') && (
                <Panel title="Publicar aviso">
                  <form className="space-y-3" onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    void callApi('/api/avisos', avisoForm)
                  }}>
                    <TextInput placeholder="Título" value={avisoForm.titulo} onChange={(e) => setAvisoForm((v) => ({ ...v, titulo: e.target.value }))} required />
                    <TextInput placeholder="Contenido" value={avisoForm.contenido} onChange={(e) => setAvisoForm((v) => ({ ...v, contenido: e.target.value }))} required />
                    <SelectInput value={avisoForm.destinatario_tipo} onChange={(e) => setAvisoForm((v) => ({ ...v, destinatario_tipo: e.target.value as Destinatario }))}>
                      <option value="todos">Todos</option>
                      <option value="residentes">Residentes</option>
                      <option value="encargados">Encargados</option>
                      <option value="individual">Individual</option>
                    </SelectInput>
                    <SelectInput
                      value={avisoForm.destinatario_id}
                      onChange={(e) => setAvisoForm((v) => ({ ...v, destinatario_id: e.target.value }))}
                      disabled={avisoForm.destinatario_tipo !== 'individual'}
                    >
                      <option value="">Usuario destino</option>
                      {data.residentes.map((r) => <option key={r.user_id ?? r.id} value={r.user_id ?? ''}>{`${r.nombre} ${r.apellido ?? ''}`.trim()}</option>)}
                    </SelectInput>
                    <button className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Publicar aviso</button>
                  </form>
                </Panel>
              )}
            </div>
          )}

          {activeModule === 'residentes' && (
            <Panel title="Residentes" subtitle="Vista administrativa de ocupación y estado">
              {data.residentes.length === 0 ? (
                <EmptyState title="Sin residentes" description="Todavía no hay residentes cargados." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b border-border/70 text-left text-muted-foreground">
                        <th className="pb-2 pr-3">Nombre</th>
                        <th className="pb-2 pr-3">Estado</th>
                        <th className="pb-2 pr-3">Habitación</th>
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
            <Panel title="Habitaciones y departamentos" subtitle="Inventario físico de la residencia">
              {data.habitaciones.length === 0 ? (
                <EmptyState title="Sin habitaciones" description="No hay habitaciones configuradas todavía." />
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
        </main>
      </div>
    </div>
  )
}
