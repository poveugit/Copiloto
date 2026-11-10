import { useEffect, useRef } from 'react';
import {
  fetchMyDeposits,
  fetchPendingDeposits,
  fetchRecentEvents,
  type InvestmentDeposit,
} from '../services/investmentCloud';
import { sendNativeNotification } from '../services/nativeNotifications';

const POLL_INTERVAL_MS = 10000;

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

    const checkMyDeposits = async () => {
      const res = await fetchMyDeposits(emailClean);
      if (!res.ok || cancelled) return;

      const previous = readStatusMap(statusKey);
      const next: Record<string, string> = {};
      const toNotify: InvestmentDeposit[] = [];

      res.data.forEach(dep => {
        next[dep.id] = dep.status;
        // Primeira execução (sem histórico) apenas registra, sem notificar.
        if (previous && previous[dep.id] === 'pending' && dep.status !== 'pending') {
          toNotify.push(dep);
        }
      });

      try {
        localStorage.setItem(statusKey, JSON.stringify(next));
      } catch {
        // ignora
      }

      for (const dep of toNotify) {
        if (dep.status === 'confirmed') {
          await sendNativeNotification({
            tag: `dep_confirmed_${dep.id}`,
            channel: 'investments',
            title: '✅ PIX confirmado! Cotas liberadas',
            body: `Seu depósito de ${brl(dep.amount)} (${dep.shares} ${
              dep.shares === 1 ? 'cota' : 'cotas'
            } em ${dep.planName}) foi confirmado pelo Admin e já está ativo.`,
            targetTab: 'investments',
          });
        } else if (dep.status === 'rejected') {
          await sendNativeNotification({
            tag: `dep_rejected_${dep.id}`,
            channel: 'investments',
            title: '⚠️ Depósito não confirmado',
            body: `O Admin não confirmou o depósito de ${brl(dep.amount)} em ${dep.planName}. Fale com o administrador do fundo.`,
            targetTab: 'investments',
          });
        }
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
      const res = await fetchRecentEvents(30);
      if (!res.ok || cancelled) return;

      const seen = readSet(adminEvtKey);
      if (seen === null) {
        // Primeira execução: registra o histórico sem notificar eventos antigos.
        writeSet(adminEvtKey, new Set(res.data.map(e => e.id)));
        return;
      }
      const fresh = res.data.filter(e => !seen.has(e.id));
      for (const evt of fresh.slice(0, 5)) {
        if (evt.eventType === 'withdrawal_requested') {
          await sendNativeNotification({
            tag: `admin_evt_${evt.id}`,
            channel: 'investments',
            title: '🚨 Solicitação de resgate',
            body: `${evt.pilotName || evt.pilotEmail} solicitou o resgate de ${brl(evt.amount)} (${evt.shares} ${
              evt.shares === 1 ? 'cota' : 'cotas'
            }) do ${evt.planName}.`,
            targetTab: 'investments',
          });
        }
      }
      fresh.forEach(e => seen.add(e.id));
      writeSet(adminEvtKey, seen);
    };

    const tick = async () => {
      if (runningRef.current || cancelled) return;
      runningRef.current = true;
      try {
        await checkMyDeposits();
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
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [enabled, email, isAdmin]);
}
