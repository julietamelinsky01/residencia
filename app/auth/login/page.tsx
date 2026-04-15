'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, Lock, Mail, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)

      if (signInError) {
        setError(signInError.message)
        return
      }

      const params = new URLSearchParams(window.location.search)
      const next = params.get('next') || '/'
      router.replace(next)
      router.refresh()
    } catch (err: any) {
      setLoading(false)
      setError(err?.message ?? 'No se pudo iniciar sesión')
    }
  }

  return (
    <div className="app-shell min-h-[calc(100svh-56px)] px-4 py-8">
      <div className="mx-auto grid max-w-5xl items-stretch gap-4 lg:grid-cols-[1.1fr_1fr]">
        <section className="surface-card animate-enter p-8">
          <div className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
            <Building2 size={22} />
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Gestión de residencia estudiantil</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Plataforma unificada para pagos, comprobantes, gastos, arreglos, tareas de convivencia y avisos internos.
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
              <ShieldCheck size={18} className="text-emerald-600" />
              <div>
                <p className="text-sm font-medium">Acceso por rol</p>
                <p className="text-xs text-muted-foreground">Administrador, encargado y residente ven solo lo que corresponde.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
              <Lock size={18} className="text-sky-600" />
              <div>
                <p className="text-sm font-medium">Operación segura</p>
                <p className="text-xs text-muted-foreground">Sesión protegida y permisos aplicados en backend.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="surface-card animate-enter stagger-1 p-8">
          <h2 className="text-2xl font-semibold tracking-tight">Ingresar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Usá tu cuenta de la residencia para continuar.</p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Email</span>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/70"
                  type="email"
                  placeholder="usuario@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Contraseña</span>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/70"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </label>

            {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">{error}</p>}

            <button disabled={loading} className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-60">
              {loading ? 'Ingresando...' : 'Ingresar al sistema'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
