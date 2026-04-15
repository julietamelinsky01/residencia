'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const current = theme === 'system' ? systemTheme : theme
  const isDark = current === 'dark'

  if (!mounted) return <div className="h-9 w-9 rounded-lg border border-border/60" />

  return (
    <button
      type="button"
      aria-label="Cambiar tema"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-card shadow-sm transition hover:border-border"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
