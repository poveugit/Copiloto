-- ============================================================
-- MOCHILINHA / COPILOTO - SUPABASE SCHEMA MIGRATION
-- Execute este script no SQL Editor do seu Dashboard Supabase:
-- https://supabase.com/dashboard/project/oryutbmvqyppkuncnjcj/sql/new
-- ============================================================

-- 1. TABELA: pilots (Usuários e Pilotos Cadastrados)
CREATE TABLE IF NOT EXISTS public.pilots (
    id text PRIMARY KEY,
    email text UNIQUE NOT NULL,
    name text NOT NULL,
    phone text,
    bike_model text DEFAULT 'Minha Moto',
    password_hash text NOT NULL,
    is_admin boolean DEFAULT false,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pilots_email ON public.pilots(email);

-- 2. TABELA: moto_settings (Configurações, Metas, Perfil e Manutenções)
CREATE TABLE IF NOT EXISTS public.moto_settings (
    device_id text PRIMARY KEY,
    daily_goal numeric DEFAULT 150,
    maintenance jsonb DEFAULT '{}'::jsonb,
    app_overrides jsonb DEFAULT '{}'::jsonb,
    custom_apps jsonb DEFAULT '[]'::jsonb,
    custom_categories jsonb DEFAULT '[]'::jsonb,
    custom_maints jsonb DEFAULT '[]'::jsonb,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA: moto_entries (Lançamentos de Corridas e Ganhos)
CREATE TABLE IF NOT EXISTS public.moto_entries (
    id text PRIMARY KEY,
    device_id text NOT NULL,
    entry_date text NOT NULL,
    app text NOT NULL,
    shift text DEFAULT 'almoco',
    km numeric DEFAULT 0,
    revenue numeric DEFAULT 0,
    hours numeric DEFAULT 0,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_moto_entries_device_id ON public.moto_entries(device_id);
CREATE INDEX IF NOT EXISTS idx_moto_entries_date ON public.moto_entries(entry_date);

-- 4. TABELA: moto_expenses (Lançamentos de Despesas e Gastos)
CREATE TABLE IF NOT EXISTS public.moto_expenses (
    id text PRIMARY KEY,
    device_id text NOT NULL,
    expense_date text NOT NULL,
    category text NOT NULL,
    amount numeric DEFAULT 0,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_moto_expenses_device_id ON public.moto_expenses(device_id);
CREATE INDEX IF NOT EXISTS idx_moto_expenses_date ON public.moto_expenses(expense_date);

-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.pilots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moto_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moto_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moto_expenses ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS DE ACESSO (Permitir leitura/escrita para chaves anon/publishable)
DROP POLICY IF EXISTS "Anon full access on pilots" ON public.pilots;
CREATE POLICY "Anon full access on pilots"
    ON public.pilots
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anon full access on moto_settings" ON public.moto_settings;
CREATE POLICY "Anon full access on moto_settings"
    ON public.moto_settings
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anon full access on moto_entries" ON public.moto_entries;
CREATE POLICY "Anon full access on moto_entries"
    ON public.moto_entries
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anon full access on moto_expenses" ON public.moto_expenses;
CREATE POLICY "Anon full access on moto_expenses"
    ON public.moto_expenses
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 7. REGISTRO OFICIAL DO PILOTO ADMIN (Swami Junior)
INSERT INTO public.pilots (id, email, name, phone, bike_model, password_hash, is_admin)
VALUES (
    'usr_1792618634013',
    'swamijunior346.sj@gmail.com',
    'Swami Junior',
    '31995610728',
    'SHI 175',
    '9ac4dbf2',
    true
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    bike_model = EXCLUDED.bike_model,
    password_hash = EXCLUDED.password_hash,
    is_admin = true,
    updated_at = now();
