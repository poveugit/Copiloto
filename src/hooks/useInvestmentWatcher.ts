import { useEffect, useRef } from 'react';
import {
  ADMIN_INVESTMENT_NTFY_TOPIC,
  buildWithdrawalRequestsList,
  fetchMyDeposits,
  fetchPendingDeposits,
  fetchRecentEvents,
  getPilotInvestmentNtfyTopic,
  type InvestmentDeposit,
} from '../services/investmentCloud';
import { sendNativeNotification } from '../services/nativeNotifications';
import { getSupabaseClient } from '../services/supabaseSync';

const POLL_INTERVAL_MS = 5000;
const STALE_PENDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function brl(v: number): string {
  return (
    'R$ ' +
    (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

function readSet(key: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return null;
  }
}

function writeSet(key: string, set: Set<string>): void {
  try {
    // Mantém só os 300 mais recentes para não crescer indefinidamente.
    localStorage.setItem(key, JSON.stringify(Array.from(set).slice(-300)));
  } catch {
    // ignora
  }
}

function readStatusMap(key: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return null;
  }
}

/**
 * Observa o Supabase e dispara NOTIFICAÇÕES NATIVAS:
 * - Motoboy/Admin: quando um depósito dele é confirmado ou rejeitado pelo admin.
 * - Admin: novo depósito aguardando confirmação do PIX e novas solicitações de resgate.
 * Funciona enquanto o app está em execução (primeiro ou segundo plano ativo).
 */
export function useInvestmentWatcher(params: {
  enabled: boolean;
  email: string;
  isAdmin: boolean;
}): void {
  const { enabled, email, isAdmin } = params;
  const runningRef = useRef(false);

  useEffect(() => {
    const emailClean = email.trim().toLowerCase();
    if (!enabled || !emailClean) return;

    let cancelled = false;
    const statusKey = `mochilinha_dep_status_v1_${emailClean}`;
    const adminDepKey = 'mochilinha_admin_seen_deposits_v1';
    const adminEvtKey = 'mochilinha_admin_seen_events_v1';
    const withdrawStatusKey = `mochilinha_withdraw_status_v1_${emailClean}`;

    const checkMyDeposits = async () => {
      const res = await fetchMyDeposits(emailClean);
      if (!res.ok || cancelled) return;

      const previous = readStatusMap(statusKey);
      const next: Record<string, string> = {};
      const toNotify: InvestmentDeposit[] = [];

      res.data.forEach(dep => {
        next[dep.id] = dep.status;
        if (previous && previous[dep.id] === 'pending' && dep.status !== 'pending') {
          toNotify.push(dep);
        }
      });

      for (const dep of toNotify) {
        let ok = true;
        if (dep.status === 'confirmed') {
          ok = await sendNativeNotification({
            tag: `dep_confirmed_${dep.id}`,
            channel: 'investments',
            title: '✅ PIX confirmado! Cotas liberadas',
            body: `Seu depósito de ${brl(dep.amount)} (${dep.shares} ${
              dep.shares === 1 ? 'cota' : 'cotas'
            } em ${dep.planName}) foi confirmado pelo Admin e já está ativo.`,
            targetTab: 'investments',
          });
        } else if (dep.status === 'rejected') {
          ok = await sendNativeNotification({
            tag: `dep_rejected_${dep.id}`,
            channel: 'investments',
            title: '⚠️ Depósito não confirmado',
            body: `O Admin não confirmou o depósito de ${brl(dep.amount)} em ${dep.planName}. Fale com o administrador do fundo.`,
            targetTab: 'investments',
          });
        }
        if (!ok) {
          next[dep.id] = 'pending';
        }
      }

      try {
        localStorage.setItem(statusKey, JSON.stringify(next));
      } catch {
        // ignora
      }
    };

    const checkMyWithdrawals = async () => {
      const res = await fetchRecentEvents(80);
      if (!res.ok || cancelled) return;

      const myReqs = buildWithdrawalRequestsList(res.data).filter(
        r => r.pilotEmail === emailClean
      );
      const previous = readStatusMap(withdrawStatusKey) || {};
      const next: Record<string, string> = {};

      for (const req of myReqs) {
        next[req.id] = req.status;
        const wasResolved = previous[req.id] === 'paid' || previous[req.id] === 'rejected';
        if (req.status !== 'pending' && !wasResolved) {
          const isRecent =
            !req.reviewedAt || Date.now() - new Date(req.reviewedAt).getTime() < STALE_PENDING_WINDOW_MS;
          if (!isRecent) continue;

          const ok = await sendNativeNotification({
            tag: `withdraw_resolved_${req.id}_${req.status}`,
            channel: 'investments',
            title:
              req.status === 'paid'
                ? '✅ Resgate PIX pago pelo Admin!'
                : '⚠️ Solicitação de resgate recusada',
            body:
              req.status === 'paid'
                ? `Seu resgate de ${brl(req.amount)} (${req.receiptCode}) foi transferido para sua chave PIX ${
                    req.pixKey || ''
                  }.`.trim()
                : `O pedido de resgate de ${brl(req.amount)} (${req.receiptCode}) foi recusado.${
                    req.reviewNote ? ' Motivo: ' + req.reviewNote : ''
                  }`,
            targetTab: 'investments',
          });
          if (!ok) {
            // Mantém pendente de notificação se a entrega falhou (ex.: permissão ainda não aceita)
            next[req.id] = 'pending';
          }
        }
      }

      try {
        localStorage.setItem(withdrawStatusKey, JSON.stringify(next));
      } catch {
        // ignora
      }
    };

    const checkAdminPending = async () => {
      const res = await fetchPendingDeposits();
      if (!res.ok || cancelled) return;

      const seen = readSet(adminDepKey) || new Set<string>();
      const fresh = res.data.filter(d => !seen.has(d.id));
      if (fresh.length === 0) return;

      if (fresh.length > 3) {
        const ok = await sendNativeNotification({
          tag: 'admin_pending_summary',
          channel: 'investments',
          title: `🚨 ${fresh.length} depósitos aguardando confirmação`,
          body: 'Confira os PIX recebidos e confirme para liberar as cotas dos motoboys.',
          targetTab: 'investments',
        });
        if (ok) {
          fresh.forEach(d => seen.add(d.id));
          writeSet(adminDepKey, seen);
        }
      } else {
        for (const dep of fresh) {
          const ok = await sendNativeNotification({
            tag: `admin_pending_${dep.id}`,
            channel: 'investments',
            title: '🚨 Novo depósito aguardando confirmação',
            body: `${dep.pilotName || dep.pilotEmail} informou ${brl(dep.amount)} (${dep.shares} ${
              dep.shares === 1 ? 'cota' : 'cotas'
            } em ${dep.planName}). Confirme o PIX para liberar.`,
            targetTab: 'investments',
          });
          if (ok) {
            seen.add(dep.id);
          }
        }
        writeSet(adminDepKey, seen);
      }
    };

    const checkAdminEvents = async () => {
      const res = await fetchRecentEvents(80);
      if (!res.ok || cancelled) return;

      const seen = readSet(adminEvtKey) || new Set<string>();
      const pendingWithdrawals = buildWithdrawalRequestsList(res.data).filter(
        w =>
          w.status === 'pending' &&
          (!w.createdAt || Date.now() - new Date(w.createdAt).getTime() < STALE_PENDING_WINDOW_MS)
      );

      const unnotified = pendingWithdrawals.filter(w => !seen.has(w.id));
      if (unnotified.length === 0) return;

      for (const req of unnotified.slice(0, 5)) {
        const ok = await sendNativeNotification({
          tag: `admin_evt_${req.id}`,
          channel: 'investments',
          title: '🚨 Solicitação de resgate PIX',
          body: `${req.pilotName || req.pilotEmail} solicitou ${brl(req.amount)} (${req.shares} ${
            req.shares === 1 ? 'cota' : 'cotas'
          })${req.pixKey ? ` · PIX: ${req.pixKey}` : ''} em ${req.planName}.`,
          targetTab: 'investments',
        });
        if (ok) {
          seen.add(req.id);
        }
      }
      writeSet(adminEvtKey, seen);
    };

    const tick = async () => {
      if (runningRef.current || cancelled) return;
      runningRef.current = true;
      try {
        await checkMyDeposits();
        await checkMyWithdrawals();
        if (isAdmin) {
          await checkAdminPending();
          await checkAdminEvents();
        }
      } catch {
        // falha de rede não interrompe o monitoramento
      } finally {
        runningRef.current = false;
      }
    };

    void tick();
    const interval = setInterval(() => void tick(), POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick();
    };
    const onSyncSignal = () => {
      void tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onSyncSignal);
    window.addEventListener('mochilinha:investment-sync', onSyncSignal);

    // Subscrição instantânea via Supabase Realtime (< 300ms)
    const client = getSupabaseClient();
    const realtimeChannel = client
      ? client
          .channel(`inv_realtime_${emailClean}_${isAdmin ? 'adm' : 'usr'}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'investment_deposits' },
            () => void tick()
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'investment_events' },
            () => void tick()
          )
          .subscribe()
      : null;

    // Canal push instantâneo via SSE ntfy.sh (dispara em < 200ms entre dispositivos)
    const sseSources: EventSource[] = [];
    if (typeof EventSource !== 'undefined') {
      const topics = isAdmin
        ? [ADMIN_INVESTMENT_NTFY_TOPIC, getPilotInvestmentNtfyTopic(emailClean)]
        : [getPilotInvestmentNtfyTopic(emailClean)];
      for (const topic of topics) {
        try {
          const es = new EventSource(`https://ntfy.sh/${encodeURIComponent(topic)}/sse`);
          es.onmessage = () => void tick();
          sseSources.push(es);
        } catch {
          // ignora erro de SSE
        }
      }
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onSyncSignal);
      window.removeEventListener('mochilinha:investment-sync', onSyncSignal);
      if (realtimeChannel && client) {
        void client.removeChannel(realtimeChannel);
      }
      for (const es of sseSources) {
        try {
          es.close();
        } catch {
          // ignora
        }
      }
    };
  }, [enabled, email, isAdmin]);
}
