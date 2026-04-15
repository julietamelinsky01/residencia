-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.espacios_comunes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arreglos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Helper function to get user role
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT rol FROM public.profiles WHERE id = auth.uid()
$$;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Admin and Encargado can view all profiles
CREATE POLICY "profiles_select_admin_encargado" ON public.profiles
  FOR SELECT USING (public.get_user_role() IN ('administrador', 'encargado'));

-- Users can update their own profile (limited fields)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin can insert profiles
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (public.get_user_role() = 'administrador');

-- Admin can update any profile
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.get_user_role() = 'administrador');

-- =====================================================
-- HABITACIONES POLICIES
-- =====================================================

-- Everyone can view habitaciones
CREATE POLICY "habitaciones_select_all" ON public.habitaciones
  FOR SELECT USING (true);

-- Only admin can insert/update/delete
CREATE POLICY "habitaciones_insert_admin" ON public.habitaciones
  FOR INSERT WITH CHECK (public.get_user_role() = 'administrador');

CREATE POLICY "habitaciones_update_admin" ON public.habitaciones
  FOR UPDATE USING (public.get_user_role() = 'administrador');

CREATE POLICY "habitaciones_delete_admin" ON public.habitaciones
  FOR DELETE USING (public.get_user_role() = 'administrador');

-- =====================================================
-- ESPACIOS COMUNES POLICIES
-- =====================================================

-- Everyone can view espacios comunes
CREATE POLICY "espacios_comunes_select_all" ON public.espacios_comunes
  FOR SELECT USING (true);

-- Only admin can manage
CREATE POLICY "espacios_comunes_insert_admin" ON public.espacios_comunes
  FOR INSERT WITH CHECK (public.get_user_role() = 'administrador');

CREATE POLICY "espacios_comunes_update_admin" ON public.espacios_comunes
  FOR UPDATE USING (public.get_user_role() = 'administrador');

CREATE POLICY "espacios_comunes_delete_admin" ON public.espacios_comunes
  FOR DELETE USING (public.get_user_role() = 'administrador');

-- =====================================================
-- CATEGORIAS GASTO POLICIES
-- =====================================================

-- Admin and Encargado can view
CREATE POLICY "categorias_gasto_select" ON public.categorias_gasto
  FOR SELECT USING (public.get_user_role() IN ('administrador', 'encargado'));

-- Only admin can manage
CREATE POLICY "categorias_gasto_insert_admin" ON public.categorias_gasto
  FOR INSERT WITH CHECK (public.get_user_role() = 'administrador');

CREATE POLICY "categorias_gasto_update_admin" ON public.categorias_gasto
  FOR UPDATE USING (public.get_user_role() = 'administrador');

CREATE POLICY "categorias_gasto_delete_admin" ON public.categorias_gasto
  FOR DELETE USING (public.get_user_role() = 'administrador');

-- =====================================================
-- RESIDENTES POLICIES
-- =====================================================

-- Admin and Encargado can view all residentes
CREATE POLICY "residentes_select_admin_encargado" ON public.residentes
  FOR SELECT USING (public.get_user_role() IN ('administrador', 'encargado'));

-- Residentes can view their own record
CREATE POLICY "residentes_select_own" ON public.residentes
  FOR SELECT USING (user_id = auth.uid());

-- Admin can insert/update/delete
CREATE POLICY "residentes_insert_admin" ON public.residentes
  FOR INSERT WITH CHECK (public.get_user_role() = 'administrador');

CREATE POLICY "residentes_update_admin" ON public.residentes
  FOR UPDATE USING (public.get_user_role() = 'administrador');

CREATE POLICY "residentes_delete_admin" ON public.residentes
  FOR DELETE USING (public.get_user_role() = 'administrador');

-- =====================================================
-- PAGOS POLICIES
-- =====================================================

-- Admin and Encargado can view all pagos
CREATE POLICY "pagos_select_admin_encargado" ON public.pagos
  FOR SELECT USING (public.get_user_role() IN ('administrador', 'encargado'));

-- Residentes can view their own pagos
CREATE POLICY "pagos_select_own" ON public.pagos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.residentes 
      WHERE residentes.id = pagos.residente_id 
      AND residentes.user_id = auth.uid()
    )
  );

-- Admin and Encargado can manage pagos
CREATE POLICY "pagos_insert_admin_encargado" ON public.pagos
  FOR INSERT WITH CHECK (public.get_user_role() IN ('administrador', 'encargado'));

CREATE POLICY "pagos_update_admin_encargado" ON public.pagos
  FOR UPDATE USING (public.get_user_role() IN ('administrador', 'encargado'));

CREATE POLICY "pagos_delete_admin" ON public.pagos
  FOR DELETE USING (public.get_user_role() = 'administrador');

-- =====================================================
-- COMPROBANTES POLICIES
-- =====================================================

-- Admin and Encargado can view all comprobantes
CREATE POLICY "comprobantes_select_admin_encargado" ON public.comprobantes
  FOR SELECT USING (public.get_user_role() IN ('administrador', 'encargado'));

-- Residentes can view their own comprobantes
CREATE POLICY "comprobantes_select_own" ON public.comprobantes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pagos
      JOIN public.residentes ON residentes.id = pagos.residente_id
      WHERE pagos.id = comprobantes.pago_id 
      AND residentes.user_id = auth.uid()
    )
  );

-- Authenticated users can insert comprobantes for their own pagos
CREATE POLICY "comprobantes_insert_own" ON public.comprobantes
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('administrador', 'encargado') OR
    EXISTS (
      SELECT 1 FROM public.pagos
      JOIN public.residentes ON residentes.id = pagos.residente_id
      WHERE pagos.id = comprobantes.pago_id 
      AND residentes.user_id = auth.uid()
    )
  );

-- Admin and Encargado can update (validate) comprobantes
CREATE POLICY "comprobantes_update_admin_encargado" ON public.comprobantes
  FOR UPDATE USING (public.get_user_role() IN ('administrador', 'encargado'));

-- =====================================================
-- GASTOS POLICIES (Solo Admin y Encargado)
-- =====================================================

CREATE POLICY "gastos_select_admin_encargado" ON public.gastos
  FOR SELECT USING (public.get_user_role() IN ('administrador', 'encargado'));

CREATE POLICY "gastos_insert_admin_encargado" ON public.gastos
  FOR INSERT WITH CHECK (public.get_user_role() IN ('administrador', 'encargado'));

CREATE POLICY "gastos_update_admin_encargado" ON public.gastos
  FOR UPDATE USING (public.get_user_role() IN ('administrador', 'encargado'));

CREATE POLICY "gastos_delete_admin" ON public.gastos
  FOR DELETE USING (public.get_user_role() = 'administrador');

-- =====================================================
-- ARREGLOS POLICIES
-- =====================================================

-- Admin and Encargado can view all arreglos
CREATE POLICY "arreglos_select_admin_encargado" ON public.arreglos
  FOR SELECT USING (public.get_user_role() IN ('administrador', 'encargado'));

-- Residentes can view their own arreglos
CREATE POLICY "arreglos_select_own" ON public.arreglos
  FOR SELECT USING (reportado_por = auth.uid());

-- Anyone authenticated can create arreglos
CREATE POLICY "arreglos_insert_authenticated" ON public.arreglos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Admin and Encargado can update arreglos
CREATE POLICY "arreglos_update_admin_encargado" ON public.arreglos
  FOR UPDATE USING (public.get_user_role() IN ('administrador', 'encargado'));

-- Users can update their own pending arreglos
CREATE POLICY "arreglos_update_own_pending" ON public.arreglos
  FOR UPDATE USING (
    reportado_por = auth.uid() AND estado = 'pendiente'
  );

-- =====================================================
-- TAREAS POLICIES
-- =====================================================

-- Admin and Encargado can view all tareas
CREATE POLICY "tareas_select_admin_encargado" ON public.tareas
  FOR SELECT USING (public.get_user_role() IN ('administrador', 'encargado'));

-- Residentes can view tareas assigned to them
CREATE POLICY "tareas_select_assigned" ON public.tareas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.residentes 
      WHERE residentes.id = tareas.residente_id 
      AND residentes.user_id = auth.uid()
    )
  );

-- Admin and Encargado can manage tareas
CREATE POLICY "tareas_insert_admin_encargado" ON public.tareas
  FOR INSERT WITH CHECK (public.get_user_role() IN ('administrador', 'encargado'));

CREATE POLICY "tareas_update_admin_encargado" ON public.tareas
  FOR UPDATE USING (public.get_user_role() IN ('administrador', 'encargado'));

-- Residentes can mark their own tasks as complete
CREATE POLICY "tareas_update_assigned" ON public.tareas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.residentes 
      WHERE residentes.id = tareas.residente_id 
      AND residentes.user_id = auth.uid()
    )
  );

CREATE POLICY "tareas_delete_admin" ON public.tareas
  FOR DELETE USING (public.get_user_role() = 'administrador');

-- =====================================================
-- AVISOS POLICIES
-- =====================================================

-- Admin and Encargado can view all avisos
CREATE POLICY "avisos_select_admin_encargado" ON public.avisos
  FOR SELECT USING (public.get_user_role() IN ('administrador', 'encargado'));

-- Residentes can view avisos directed to them
CREATE POLICY "avisos_select_residentes" ON public.avisos
  FOR SELECT USING (
    public.get_user_role() = 'residente' AND
    activo = true AND (
      destinatario_tipo = 'todos' OR
      destinatario_tipo = 'residentes' OR
      (destinatario_tipo = 'individual' AND destinatario_id = auth.uid())
    )
  );

-- Admin and Encargado can manage avisos
CREATE POLICY "avisos_insert_admin_encargado" ON public.avisos
  FOR INSERT WITH CHECK (public.get_user_role() IN ('administrador', 'encargado'));

CREATE POLICY "avisos_update_admin_encargado" ON public.avisos
  FOR UPDATE USING (public.get_user_role() IN ('administrador', 'encargado'));

CREATE POLICY "avisos_delete_admin" ON public.avisos
  FOR DELETE USING (public.get_user_role() = 'administrador');
