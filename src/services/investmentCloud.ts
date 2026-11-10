import { getSupabaseClient } from './supabaseSync';
import { sendNativeNotification } from './nativeNotifications';

export type DepositStatus = 'pending' | 'confirmed' | 'rejected';

export interface InvestmentDeposit {
  id: string;
  pilotEmail: string;
  pilotName: string;
  planId: string;
  planName: string;
  planIcon: string;
  shares: number;
  sharePrice: number;
  amount: number;
  dailyRatePct: number;
  monthlyRatePct: number;
  maturityDays: number;
  minWithdrawDays: number;
  fixedMaturityDate: string;
  status: DepositStatus;
  createdAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
}

export interface InvestmentEvent {
  id: string;
  eventType: string;
  pilotEmail: string;
  pilotName: string;
  planName: string;
  shares: number;
  amount: number;
  createdAt: string;
}

export type CloudResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error:
        | 'offline'
        | 'schema_missing'
        | 'failed'
        | 'invalid_credentials'
        | 'locked'
        | 'not_pending';
      message?: string;
    };

const LOCAL_DEPOSITS_FALLBACK_KEY = 'copilotrider_global_deposits_v1';
const LOCAL_EVENTS_FALLBACK_KEY = 'copilotrider_global_inv_events_v1';

function mapDeposit(r: any): InvestmentDeposit {
  return {
    id: String(r.id),
    pilotEmail: String(r.pilot_email || r.pilotEmail || '').trim().toLowerCase(),
    pilotName: String(r.pilot_name || r.pilotName || ''),
    planId: String(r.plan_id || r.planId || ''),
    planName: String(r.plan_name || r.planName || ''),
    planIcon: String(r.plan_icon || r.planIcon || '🛵'),
    shares: Number(r.shares) || 0,
    sharePrice: Number(r.share_price ?? r.sharePrice) || 0,
    amount: Number(r.amount) || 0,
    dailyRatePct: Number(r.daily_rate_pct ?? r.dailyRatePct) || 0,
    monthlyRatePct: Number(r.monthly_rate_pct ?? r.monthlyRatePct) || 0,
    maturityDays: Number(r.maturity_days ?? r.maturityDays) || 30,
    minWithdrawDays: Number(r.min_withdraw_days ?? r.minWithdrawDays) || 0,
    fixedMaturityDate: String(r.fixed_maturity_date ?? r.fixedMaturityDate ?? ''),
    status: (r.status as DepositStatus) || 'pending',
    createdAt: String(r.created_at || r.createdAt || new Date().toISOString()),
    confirmedAt: r.confirmed_at || r.confirmedAt ? String(r.confirmed_at || r.confirmedAt) : null,
    confirmedBy: r.confirmed_by || r.confirmedBy ? String(r.confirmed_by || r.confirmedBy) : null,
  };
}

function readLocalDeposits(): InvestmentDeposit[] {
  try {
    const raw = localStorage.getItem(LOCAL_DEPOSITS_FALLBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(mapDeposit) : [];
  } catch {
    return [];
  }
}

function writeLocalDeposits(list: InvestmentDeposit[]): void {
  try {
    localStorage.setItem(LOCAL_DEPOSITS_FALLBACK_KEY, JSON.stringify(list));
  } catch {
    // ignore storage write error
  }
}

function mergeDepositLists(primary: InvestmentDeposit[], secondary: InvestmentDeposit[]): InvestmentDeposit[] {
  const byId = new Map<string, InvestmentDeposit>();
  for (const item of [...secondary, ...primary]) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
    } else {
      // Status 'confirmed' ou 'rejected' sempre prevalece sobre 'pending'
      if (existing.status === 'pending' && item.status !== 'pending') {
        byId.set(item.id, item);
      } else if (item.status === 'pending' && existing.status !== 'pending') {
        byId.set(item.id, existing);
      } else {
        byId.set(item.id, item);
      }
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function fmtBrl(v: number): string {
  return (
    'R$ ' +
    (Number(v) || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export async function createPendingDeposit(input: {
  pilotEmail: string;
  pilotName: string;
  planId: string;
  planName: string;
  planIcon: string;
  shares: number;
  sharePrice: number;
  amount: number;
  dailyRatePct: number;
  monthlyRatePct: number;
  maturityDays: number;
  minWithdrawDays: number;
  fixedMaturityDate: string;
}): Promise<CloudResult<InvestmentDeposit>> {
  const id = 'dep_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const nowIso = new Date().toISOString();
  const rowPayload = {
    id,
    pilot_email: input.pilotEmail.trim().toLowerCase(),
    pilot_name: input.pilotName,
    plan_id: input.planId,
    plan_name: input.planName,
    plan_icon: input.planIcon,
    shares: input.shares,
    share_price: input.sharePrice,
    amount: input.amount,
    daily_rate_pct: input.dailyRatePct,
    monthly_rate_pct: input.monthlyRatePct,
    maturity_days: input.maturityDays,
    min_withdraw_days: input.minWithdrawDays,
    fixed_maturity_date: input.fixedMaturityDate || null,
    status: 'pending' as const,
    created_at: nowIso,
    confirmed_at: null,
    confirmed_by: null,
  };

  const localMapped = mapDeposit(rowPayload);
  const currentLocal = readLocalDeposits();
  writeLocalDeposits([localMapped, ...currentLocal.filter(d => d.id !== id)]);

  // Sincroniza com servidor Express local/ambiente se disponível
  try {
    await fetch('/api/investment-deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deposit: rowPayload }),
    });
  } catch {
    // ignore offline server
  }

  // Sincroniza com Supabase oficial se tabela existir
  const client = getSupabaseClient();
  if (client && isOnline()) {
    try {
      const { data, error } = await client
        .from('investment_deposits')
        .insert(rowPayload)
        .select()
        .single();
      if (!error && data) {
        const saved = mapDeposit(data);
        writeLocalDeposits(mergeDepositLists([saved], readLocalDeposits()));
        return { ok: true, data: saved };
      }
    } catch {
      // usa fallback sincronizado
    }
  }

  return { ok: true, data: localMapped };
}

export async function fetchMyDeposits(pilotEmail: string): Promise<CloudResult<InvestmentDeposit[]>> {
  const cleanEmail = pilotEmail.trim().toLowerCase();
  let combined = readLocalDeposits().filter(d => d.pilotEmail === cleanEmail);

  // Busca do servidor Express
  try {
    const res = await fetch(`/api/investment-deposits?email=${encodeURIComponent(cleanEmail)}`);
    if (res.ok) {
      const json = await res.json();
      if (json?.ok && Array.isArray(json.data)) {
        const serverList = json.data.map(mapDeposit);
        combined = mergeDepositLists(serverList, combined);
      }
    }
  } catch {
    // ignore
  }

  // Busca do Supabase
  const client = getSupabaseClient();
  if (client && isOnline()) {
    try {
      const { data, error } = await client
        .from('investment_deposits')
        .select('*')
        .eq('pilot_email', cleanEmail)
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        const supaList = data.map(mapDeposit);
        combined = mergeDepositLists(supaList, combined);
      }
    } catch {
      // ignore
    }
  }

  // Atualiza cache local mesclado
  const allLocal = readLocalDeposits();
  writeLocalDeposits(mergeDepositLists(combined, allLocal));

  return { ok: true, data: combined };
}

export async function fetchPendingDeposits(): Promise<CloudResult<InvestmentDeposit[]>> {
  let combined = readLocalDeposits();

  // Busca do servidor Express
  try {
    const res = await fetch('/api/investment-deposits?status=pending');
    if (res.ok) {
      const json = await res.json();
      if (json?.ok && Array.isArray(json.data)) {
        const serverList = json.data.map(mapDeposit);
        combined = mergeDepositLists(serverList, combined);
      }
    }
  } catch {
    // ignore
  }

  // Busca do Supabase
  const client = getSupabaseClient();
  if (client && isOnline()) {
    try {
      const { data, error } = await client
        .from('investment_deposits')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        const supaList = data.map(mapDeposit);
        combined = mergeDepositLists(supaList, combined);
      }
    } catch {
      // ignore
    }
  }

  const allMerged = mergeDepositLists(combined, readLocalDeposits());
  writeLocalDeposits(allMerged);

  return {
    ok: true,
    data: allMerged.filter(d => d.status === 'pending'),
  };
}

/**
 * Única via para confirmar/rejeitar um depósito e liberar saldo/cotas:
 * Exclusivo para o Administrador.
 */
export async function reviewDeposit(
  depositId: string,
  decision: 'confirmed' | 'rejected',
  adminEmail: string,
  adminPin: string = ''
): Promise<CloudResult<InvestmentDeposit>> {
  const cleanAdmin = adminEmail.trim().toLowerCase();
  if (cleanAdmin !== 'swamijunior346.sj@gmail.com') {
    return { ok: false, error: 'invalid_credentials', message: 'Apenas o administrador pode confirmar depósitos.' };
  }

  let confirmedDeposit: InvestmentDeposit | null = null;

  // 1. Tenta via RPC no Supabase se disponível
  const client = getSupabaseClient();
  if (client && isOnline()) {
    try {
      const { data, error } = await client.rpc('admin_review_investment_deposit', {
        p_id: depositId,
        p_decision: decision,
        p_admin_email: cleanAdmin,
        p_admin_pin: adminPin,
      });
      if (!error && data?.ok && data?.deposit) {
        confirmedDeposit = mapDeposit(data.deposit);
      } else if (!error && data && !data.ok) {
        const code = String(data.error || '');
        if (code === 'invalid_credentials' || code === 'locked') {
          return { ok: false, error: code };
        }
      }
    } catch {
      // fallback para servidor/local
    }
  }

  // 2. Atualiza no Servidor Express
  try {
    const res = await fetch('/api/investment-deposits/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        depositId,
        decision,
        adminEmail: cleanAdmin,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.ok && json.data && !confirmedDeposit) {
        confirmedDeposit = mapDeposit(json.data);
      }
    }
  } catch {
    // ignore
  }

  // 3. Atualiza no armazenamento local sincronizado
  const allLocal = readLocalDeposits();
  const nowIso = new Date().toISOString();
  const updatedLocal = allLocal.map(d => {
    if (d.id === depositId) {
      const updated: InvestmentDeposit = {
        ...d,
        status: decision,
        confirmedAt: nowIso,
        confirmedBy: cleanAdmin,
      };
      if (!confirmedDeposit) confirmedDeposit = updated;
      return updated;
    }
    return d;
  });
  writeLocalDeposits(updatedLocal);

  if (!confirmedDeposit) {
    return { ok: false, error: 'not_pending' };
  }

  // Dispara notificação nativa imediata de confirmação/rejeição
  void sendNativeNotification({
    tag: `dep_review_${confirmedDeposit.id}_${decision}`,
    channel: 'investments',
    title:
      decision === 'confirmed'
        ? '✅ PIX confirmado! Cotas liberadas'
        : '⚠️ Depósito PIX rejeitado',
    body:
      decision === 'confirmed'
        ? `Depósito de ${fmtBrl(confirmedDeposit.amount)} (${confirmedDeposit.shares} ${
            confirmedDeposit.shares === 1 ? 'cota' : 'cotas'
          } em ${confirmedDeposit.planName}) confirmado pelo Admin e liberado.`
        : `O depósito de ${fmtBrl(confirmedDeposit.amount)} em ${confirmedDeposit.planName} foi marcado como não confirmado.`,
    targetTab: 'investments',
  });

  return { ok: true, data: confirmedDeposit };
}

export async function createInvestmentEvent(input: {
  eventType: string;
  pilotEmail: string;
  pilotName: string;
  planName: string;
  shares: number;
  amount: number;
}): Promise<CloudResult<true>> {
  const evt: InvestmentEvent = {
    id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    eventType: input.eventType,
    pilotEmail: input.pilotEmail.trim().toLowerCase(),
    pilotName: input.pilotName,
    planName: input.planName,
    shares: input.shares,
    amount: input.amount,
    createdAt: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem(LOCAL_EVENTS_FALLBACK_KEY);
    const list: InvestmentEvent[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(LOCAL_EVENTS_FALLBACK_KEY, JSON.stringify([evt, ...list].slice(0, 100)));
  } catch {
    // ignore
  }

  const client = getSupabaseClient();
  if (client && isOnline()) {
    try {
      await client.from('investment_events').insert({
        id: evt.id,
        event_type: evt.eventType,
        pilot_email: evt.pilotEmail,
        pilot_name: evt.pilotName,
        plan_name: evt.planName,
        shares: evt.shares,
        amount: evt.amount,
      });
    } catch {
      // ignore
    }
  }

  return { ok: true, data: true };
}

export async function fetchRecentEvents(limit = 30): Promise<CloudResult<InvestmentEvent[]>> {
  let localEvents: InvestmentEvent[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_EVENTS_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) localEvents = parsed;
    }
  } catch {
    // ignore
  }

  const client = getSupabaseClient();
  if (client && isOnline()) {
    try {
      const { data, error } = await client
        .from('investment_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!error && Array.isArray(data)) {
        const supaEvents: InvestmentEvent[] = data.map((r: any) => ({
          id: String(r.id),
          eventType: String(r.event_type || ''),
          pilotEmail: String(r.pilot_email || ''),
          pilotName: String(r.pilot_name || ''),
          planName: String(r.plan_name || ''),
          shares: Number(r.shares) || 0,
          amount: Number(r.amount) || 0,
          createdAt: String(r.created_at || ''),
        }));
        const byId = new Map<string, InvestmentEvent>();
        for (const e of [...localEvents, ...supaEvents]) {
          byId.set(e.id, e);
        }
        return {
          ok: true,
          data: Array.from(byId.values())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit),
        };
      }
    } catch {
      // ignore
    }
  }

  return { ok: true, data: localEvents.slice(0, limit) };
}
