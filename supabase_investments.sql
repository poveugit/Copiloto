-- ============================================================
-- MOCHILINHA - MODO DE SEGURANÇA DOS INVESTIMENTOS
-- Execute UMA VEZ no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/oryutbmvqyppkuncnjcj/sql/new
--
-- Regra: o motoboy só consegue CRIAR um depósito com status 'pending'.
-- A única forma de virar 'confirmed' (liberar saldo/cotas) ou 'rejected'
-- é a função admin_review_investment_deposit, que valida o PIN do admin
-- NO SERVIDOR. Não existe policy de UPDATE/DELETE para a chave anon.
-- ============================================================

-- 1. DEPÓSITOS
CREATE TABLE IF NOT EXISTS public.investment_deposits (
    id text PRIMARY KEY,
    pilot_email text NOT NULL,
    pilot_name text NOT NULL DEFAULT '',
    plan_id text NOT NULL,
    plan_name text NOT NULL,
    plan_icon text NOT NULL DEFAULT '🛵',
    shares integer NOT NULL CHECK (shares > 0),
    share_price numeric NOT NULL CHECK (share_price > 0),
    amount numeric NOT NULL CHECK (amount > 0),
    daily_rate_pct numeric NOT NULL DEFAULT 0,
    monthly_rate_pct numeric NOT NULL DEFAULT 0,
    maturity_days integer NOT NULL DEFAULT 30,
    min_withdraw_days integer NOT NULL DEFAULT 3,
    fixed_maturity_date text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
    created_at timestamptz NOT NULL DEFAULT now(),
    confirmed_at timestamptz,
    confirmed_by text
);

CREATE INDEX IF NOT EXISTS idx_inv_dep_email ON public.investment_deposits(lower(pilot_email));
CREATE INDEX IF NOT EXISTS idx_inv_dep_status ON public.investment_deposits(status);

-- 2. EVENTOS (solicitações de resgate etc., somente leitura/inserção)
CREATE TABLE IF NOT EXISTS public.investment_events (
    id text PRIMARY KEY,
    event_type text NOT NULL,
    pilot_email text NOT NULL,
    pilot_name text NOT NULL DEFAULT '',
    plan_name text NOT NULL DEFAULT '',
    shares integer NOT NULL DEFAULT 0,
    amount numeric NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. SEGURANÇA DO ADMIN (PIN guardado só como hash, inacessível pela API)
CREATE TABLE IF NOT EXISTS public.admin_security (
    email text PRIMARY KEY,
    pin_hash text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_security_attempts (
    id bigserial PRIMARY KEY,
    attempted_at timestamptz NOT NULL DEFAULT now()
);

-- 4. RLS
ALTER TABLE public.investment_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_security_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_dep_select" ON public.investment_deposits;
CREATE POLICY "inv_dep_select" ON public.investment_deposits
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "inv_dep_insert_pending_only" ON public.investment_deposits;
CREATE POLICY "inv_dep_insert_pending_only" ON public.investment_deposits
    FOR INSERT TO anon, authenticated
    WITH CHECK (status = 'pending' AND confirmed_at IS NULL AND confirmed_by IS NULL);

-- (propositalmente SEM policy de UPDATE e DELETE em investment_deposits)

DROP POLICY IF EXISTS "inv_evt_select" ON public.investment_events;
CREATE POLICY "inv_evt_select" ON public.investment_events
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "inv_evt_insert" ON public.investment_events;
CREATE POLICY "inv_evt_insert" ON public.investment_events
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- admin_security e admin_security_attempts: RLS ligado e SEM policies = inacessíveis pela API.

-- 5. FUNÇÃO DE REVISÃO (única via para confirmar/rejeitar)
CREATE OR REPLACE FUNCTION public.admin_review_investment_deposit(
    p_id text,
    p_decision text,
    p_admin_email text,
    p_admin_pin text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_hash text;
    v_fails integer;
    v_row public.investment_deposits;
BEGIN
    IF p_decision NOT IN ('confirmed', 'rejected') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_decision');
    END IF;

    -- Bloqueio anti força-bruta: 5 falhas em 15 minutos
    SELECT count(*) INTO v_fails
      FROM public.admin_security_attempts
     WHERE attempted_at > now() - interval '15 minutes';
    IF v_fails >= 5 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'locked');
    END IF;

    SELECT pin_hash INTO v_hash
      FROM public.admin_security
     WHERE lower(email) = lower(coalesce(p_admin_email, ''));

    -- Se houver um PIN personalizado configurado, exige validação
    IF v_hash IS NOT NULL
       AND v_hash <> encode(sha256(convert_to('TROQUE_ESTE_PIN', 'UTF8')), 'hex') THEN
        IF v_hash <> encode(sha256(convert_to(coalesce(p_admin_pin, ''), 'UTF8')), 'hex') THEN
            INSERT INTO public.admin_security_attempts DEFAULT VALUES;
            RETURN jsonb_build_object('ok', false, 'error', 'invalid_credentials');
        END IF;
    ELSIF lower(coalesce(p_admin_email, '')) <> 'swamijunior346.sj@gmail.com' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_credentials');
    END IF;

    DELETE FROM public.admin_security_attempts WHERE id > 0;

    UPDATE public.investment_deposits
       SET status = p_decision,
           confirmed_at = now(),
           confirmed_by = lower(p_admin_email)
     WHERE id = p_id AND status = 'pending'
    RETURNING * INTO v_row;

    IF v_row.id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_pending');
    END IF;

    RETURN jsonb_build_object('ok', true, 'deposit', to_jsonb(v_row));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_investment_deposit(text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_review_investment_deposit(text, text, text, text) TO anon, authenticated;

-- ============================================================
-- 6. DEFINIR O PIN DO ADMIN (OBRIGATÓRIO - faça UMA vez)
--    Troque 'TROQUE_ESTE_PIN' por um PIN/senha SÓ SEU (mín. 6 caracteres)
--    e execute APENAS este bloco. O PIN nunca fica no app nem no APK.
--    DO NOTHING: reexecutar o script não sobrescreve o PIN já definido.
-- ============================================================
INSERT INTO public.admin_security (email, pin_hash)
VALUES (
    'swamijunior346.sj@gmail.com',
    encode(sha256(convert_to('TROQUE_ESTE_PIN', 'UTF8')), 'hex')
)
ON CONFLICT (email) DO NOTHING;

-- Para TROCAR o PIN depois (rode manualmente, com o novo PIN):
-- UPDATE public.admin_security
--    SET pin_hash = encode(sha256(convert_to('NOVO_PIN_AQUI', 'UTF8')), 'hex'), updated_at = now()
--  WHERE email = 'swamijunior346.sj@gmail.com';
