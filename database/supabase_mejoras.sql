-- ==============================================================================
-- Vive+ · Mejoras de Base de Datos para Supabase
-- ==============================================================================
-- Este script agrega las tablas y políticas de seguridad para:
-- 1. Historial de peso, altura e Índice de Masa Corporal (IMC) diario.
-- 2. Sistema de solicitudes de amistad (pendientes, aceptadas, rechazadas).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLA: weight_records (Seguimiento diario de métricas corporales)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weight_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC(5,2) NOT NULL CHECK (weight > 0 AND weight < 500),
  height NUMERIC(4,2) NOT NULL CHECK (height > 0 AND height < 3.0),
  bmi NUMERIC(5,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.weight_records ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS: Cada usuario solo puede ver y gestionar sus propios registros
DROP POLICY IF EXISTS "weight_records_select_policy" ON public.weight_records;
CREATE POLICY "weight_records_select_policy" ON public.weight_records
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "weight_records_insert_policy" ON public.weight_records;
CREATE POLICY "weight_records_insert_policy" ON public.weight_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "weight_records_update_policy" ON public.weight_records;
CREATE POLICY "weight_records_update_policy" ON public.weight_records
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "weight_records_delete_policy" ON public.weight_records;
CREATE POLICY "weight_records_delete_policy" ON public.weight_records
  FOR DELETE USING (auth.uid() = user_id);


-- ------------------------------------------------------------------------------
-- 2. TABLA: friend_requests (Solicitudes de amistad con aceptación)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_sender_receiver UNIQUE (sender_id, receiver_id),
  CONSTRAINT no_self_friend_request CHECK (sender_id != receiver_id)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "friend_requests_select_policy" ON public.friend_requests;
CREATE POLICY "friend_requests_select_policy" ON public.friend_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "friend_requests_insert_policy" ON public.friend_requests;
CREATE POLICY "friend_requests_insert_policy" ON public.friend_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "friend_requests_update_policy" ON public.friend_requests;
CREATE POLICY "friend_requests_update_policy" ON public.friend_requests
  FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = sender_id)
  WITH CHECK (auth.uid() = receiver_id OR auth.uid() = sender_id);

DROP POLICY IF EXISTS "friend_requests_delete_policy" ON public.friend_requests;
CREATE POLICY "friend_requests_delete_policy" ON public.friend_requests
  FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Índices para optimizar búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_weight_records_user_date ON public.weight_records(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id, status);
