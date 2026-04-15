import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import Image from 'next/image'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export const metadata: Metadata = {
  title: 'Residencia - Gestion Integral',
  description: 'Sistema web de gestion para residencia estudiantil en Cordoba',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="min-h-screen">
            <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
              <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 lg:px-6">
                <div className="flex items-center gap-2">
                  <div className="relative h-8 w-8 overflow-hidden rounded-full border border-border/70">
                    <Image src="/branding/logo-main.jpg" alt="La Meli" fill className="object-cover" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">La Meli · Residencia</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden rounded-full border border-border/70 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:inline-flex">Cordoba</span>
                  <ThemeToggle />
                </div>
              </div>
            </header>
            {children}
          </div>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
