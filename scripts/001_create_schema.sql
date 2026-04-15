-- =====================================================
-- Sistema de Gestión de Residencia Estudiantil
-- Esquema de Base de Datos
-- =====================================================

-- 1. Tabla de Perfiles (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('administrador', 'encargado', 'residente')),
  telefono TEXT,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Habitaciones/Departamentos
CREATE TABLE IF NOT EXISTS public.habitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT DEFAULT 'habitacion' CHECK (tipo IN ('habitacion', 'departamento', 'cama')),
  capacidad INT DEFAULT 1,
  piso TEXT,
  precio_mensual DECIMAL(10,2),
  estado TEXT DEFAULT 'disponible' CHECK (estado IN ('disponible', 'ocupada', 'mantenimiento', 'reservada')),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de Espacios Comunes
CREATE TABLE IF NOT EXISTS public.espacios_comunes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'mantenimiento')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabla de Categorías de Gasto
CREATE TABLE IF NOT EXISTS public.categorias_gasto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabla de Residentes
CREATE TABLE IF NOT EXISTS public.residentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT UNIQUE,
  telefono TEXT,
  email TEXT,
  fecha_ingreso DATE NOT NULL,
  fecha_egreso DATE,
  habitacion_id UUID REFERENCES public.habitaciones(id) ON DELETE SET NULL,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'pendiente')),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabla de Pagos
CREATE TABLE IF NOT EXISTS public.pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  residente_id UUID NOT NULL REFERENCES public.residentes(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL, -- '2026-04'
  concepto TEXT DEFAULT 'Alquiler mensual',
  monto DECIMAL(10,2) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  fecha_pago DATE,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'vencido', 'parcial')),
  observaciones TEXT,
  registrado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Tabla de Comprobantes
CREATE TABLE IF NOT EXISTS public.comprobantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id UUID NOT NULL REFERENCES public.pagos(id) ON DELETE CASCADE,
  archivo_url TEXT NOT NULL,
  archivo_nombre TEXT,
  fecha_subida TIMESTAMPTZ DEFAULT now(),
  estado_validacion TEXT DEFAULT 'pendiente' CHECK (estado_validacion IN ('pendiente', 'aprobado', 'rechazado')),
  observacion TEXT,
  validado_por UUID REFERENCES auth.users(id),
  fecha_validacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Tabla de Gastos
CREATE TABLE IF NOT EXISTS public.gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID REFERENCES public.categorias_gasto(id),
  monto DECIMAL(10,2) NOT NULL,
  fecha DATE NOT NULL,
  descripcion TEXT NOT NULL,
  archivo_factura TEXT,
  nombre_factura TEXT,
  habitacion_id UUID REFERENCES public.habitaciones(id) ON DELETE SET NULL,
  espacio_comun_id UUID REFERENCES public.espacios_comunes(id) ON DELETE SET NULL,
  cargado_por UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Tabla de Arreglos/Incidencias
CREATE TABLE IF NOT EXISTS public.arreglos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reportado_por UUID NOT NULL REFERENCES auth.users(id),
  habitacion_id UUID REFERENCES public.habitaciones(id) ON DELETE SET NULL,
  espacio_comun_id UUID REFERENCES public.espacios_comunes(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  foto_url TEXT,
  prioridad TEXT DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_revision', 'en_reparacion', 'resuelto', 'cancelado')),
  fecha_reporte TIMESTAMPTZ DEFAULT now(),
  fecha_resolucion TIMESTAMPTZ,
  costo DECIMAL(10,2),
  observaciones TEXT,
  atendido_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Tabla de Tareas
CREATE TABLE IF NOT EXISTS public.tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  espacio_comun_id UUID REFERENCES public.espacios_comunes(id) ON DELETE SET NULL,
  residente_id UUID REFERENCES public.residentes(id) ON DELETE SET NULL,
  fecha_limite DATE,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completada', 'vencida', 'cancelada')),
  completada_en TIMESTAMPTZ,
  observaciones TEXT,
  creado_por UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Tabla de Avisos
CREATE TABLE IF NOT EXISTS public.avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  destinatario_tipo TEXT NOT NULL CHECK (destinatario_tipo IN ('todos', 'residentes', 'encargados', 'individual')),
  destinatario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  creado_por UUID NOT NULL REFERENCES auth.users(id),
  fecha TIMESTAMPTZ DEFAULT now(),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_residentes_user_id ON public.residentes(user_id);
CREATE INDEX IF NOT EXISTS idx_residentes_habitacion_id ON public.residentes(habitacion_id);
CREATE INDEX IF NOT EXISTS idx_residentes_estado ON public.residentes(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_residente_id ON public.pagos(residente_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON public.pagos(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_periodo ON public.pagos(periodo);
CREATE INDEX IF NOT EXISTS idx_comprobantes_pago_id ON public.comprobantes(pago_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON public.gastos(fecha);
CREATE INDEX IF NOT EXISTS idx_arreglos_estado ON public.arreglos(estado);
CREATE INDEX IF NOT EXISTS idx_tareas_estado ON public.tareas(estado);
CREATE INDEX IF NOT EXISTS idx_avisos_activo ON public.avisos(activo);
