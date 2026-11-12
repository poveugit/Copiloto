import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Clock,
  Calendar,
  Wallet,
  Lock,
  Unlock,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  X,
  Download,
  Pencil,
  Settings2,
  Trash2,
  RotateCcw,
  Save,
  Upload,
  Copy,
  Check,
  ShieldAlert,
  Bell,
  BellRing,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  PieChart,
  Coins,
  ShieldCheck,
  FileText,
  Sparkles,
  Calculator,
  Percent,
  Info,
  HelpCircle,
} from 'lucide-react';
import {
  createInvestmentEvent,
  createPendingDeposit,
  fetchMyDeposits,
  fetchPendingDeposits,
  reviewDeposit,
  type InvestmentDeposit,
} from '../services/investmentCloud';
import { sendNativeNotification } from '../services/nativeNotifications';

export interface AdminInvestmentNotification {
  id: string;
  type: 'deposit_intent' | 'deposit_confirmed' | 'withdrawal_requested';
  priority: 'high';
  title: string;
  message: string;
  pilotName: string;
  pilotEmail: string;
  planId: string;
  planName: string;
  shares: number;
  amount: number;
  timestamp: string;
  read: boolean;
}

export type FundThemeKey = 'orange' | 'emerald' | 'sky' | 'purple' | 'amber';

export interface MotoboyFundPlan {
  id: string;
  name: string;
  badge: string;
  icon: string;
  sharePrice: number; // Valor de 1 cota (R$)
  minShares?: number; // Mínimo de cotas por compra
  maxShares?: number; // Máximo de cotas por compra
  dailyRatePct: number; // Rendimento médio ao dia (%)
  monthlyRatePct: number; // Rendimento médio ao mês (%)
  annualRatePct: number; // Rendimento médio ao ano (%)
  cdiEquivalent: string; // Ex: "145% do CDI"
  maturityDays: number; // Prazo de vencimento em dias
  fixedMaturityDate?: string; // Data de vencimento fixa opcional (YYYY-MM-DD)
  minWithdrawDays: number; // Prazo mínimo para saque (ex: 3 dias)
  liquidityLabel?: string; // Ex: "Saque liberado após 72h do investimento"
  description: string;
  recommendedFor: string;
  themeKey?: FundThemeKey;
  accentColor: string;
  borderColor: string;
  bgSoft: string;
}

export interface MotoboyInvestmentPosition {
  id: string;
  planId: string;
  planName: string;
  planIcon: string;
  shares: number;
  sharePrice: number;
  investedAmount: number;
  dailyRatePct: number;
  monthlyRatePct: number;
  maturityDays: number;
  minWithdrawDays: number;
  createdAtIso: string; // YYYY-MM-DD
  unlockWithdrawDateIso: string; // YYYY-MM-DD (+minWithdrawDays)
  maturityDateIso: string; // YYYY-MM-DD (+maturityDays)
  status: 'active' | 'withdrawn';
}

export interface FundQrConfig {
  customQrImageUrl: string; // Data URL ou caminho configurado pelo Admin
  pixCopyPasteKey: string;
  recipientName: string;
  bankName: string;
}

export const THEME_PRESETS: Record<
  FundThemeKey,
  { label: string; accentColor: string; borderColor: string; bgSoft: string; dotClass: string }
> = {
  orange: {
    label: 'Laranja Mochilinha',
    accentColor: 'text-[#FF6A1A]',
    borderColor: 'border-[#FF6A1A]/40',
    bgSoft: 'bg-[#FF6A1A]/10',
    dotClass: 'bg-[#FF6A1A]',
  },
  emerald: {
    label: 'Verde Esmeralda',
    accentColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgSoft: 'bg-emerald-500/10',
    dotClass: 'bg-emerald-400',
  },
  sky: {
    label: 'Azul Céu',
    accentColor: 'text-sky-400',
    borderColor: 'border-sky-500/40',
    bgSoft: 'bg-sky-500/10',
    dotClass: 'bg-sky-400',
  },
  purple: {
    label: 'Roxo Premium',
    accentColor: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    bgSoft: 'bg-purple-500/10',
    dotClass: 'bg-purple-400',
  },
  amber: {
    label: 'Dourado / Âmbar',
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgSoft: 'bg-amber-500/10',
    dotClass: 'bg-amber-400',
  },
};

export const DEFAULT_MOTOBOY_FUND_PLANS: MotoboyFundPlan[] = [
  {
    id: 'cota_giro_rapido',
    name: 'Fundo Motoboy · Cota Giro Rápido',
    badge: 'Mais Popular · Liquidez Rápida',
    icon: '🛵',
    sharePrice: 25,
    minShares: 1,
    maxShares: 1000,
    dailyRatePct: 0.055,
    monthlyRatePct: 1.65,
    annualRatePct: 21.7,
    cdiEquivalent: '145% do CDI',
    maturityDays: 30,
    fixedMaturityDate: '',
    minWithdrawDays: 3,
    liquidityLabel: 'Saque liberado após 72h do investimento',
    description:
      'Ideal para guardar o lucro diário das corridas e a reserva de combustível/manutenção com rendimento todo dia.',
    recommendedFor: 'Reserva semanal, gasolina, óleo e imprevistos rápidos',
    themeKey: 'orange',
    accentColor: 'text-[#FF6A1A]',
    borderColor: 'border-[#FF6A1A]/40',
    bgSoft: 'bg-[#FF6A1A]/10',
  },
  {
    id: 'cota_blindagem_moto',
    name: 'Fundo Motoboy · Cota Blindagem & Oficina',
    badge: 'Rendimento Turbo · Médio Prazo',
    icon: '🛠️',
    sharePrice: 50,
    minShares: 1,
    maxShares: 1000,
    dailyRatePct: 0.068,
    monthlyRatePct: 2.05,
    annualRatePct: 27.6,
    cdiEquivalent: '175% do CDI',
    maturityDays: 90,
    fixedMaturityDate: '',
    minWithdrawDays: 3,
    liquidityLabel: 'Saque liberado após 72h do investimento',
    description:
      'Fundo coletivo voltado para cobrir troca de pneus, kit relação, IPVA anual e seguro da moto com alto retorno.',
    recommendedFor: 'Pneus, relação, IPVA, licenciamento e contas da casa',
    themeKey: 'emerald',
    accentColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgSoft: 'bg-emerald-500/10',
  },
  {
    id: 'cota_troca_moto',
    name: 'Fundo Motoboy · Cota Frota & Moto Zero',
    badge: 'Maior Rentabilidade · Patrimônio',
    icon: '🏆',
    sharePrice: 100,
    minShares: 1,
    maxShares: 1000,
    dailyRatePct: 0.082,
    monthlyRatePct: 2.48,
    annualRatePct: 34.2,
    cdiEquivalent: '210% do CDI',
    maturityDays: 180,
    fixedMaturityDate: '',
    minWithdrawDays: 3,
    liquidityLabel: 'Saque liberado após 72h do investimento',
    description:
      'Cotas de participação premium para quem quer juntar entrada de moto nova, quitar financiamento ou formar pé-de-meia.',
    recommendedFor: 'Trocar de moto, entrada de veículo ou reserva familiar',
    themeKey: 'sky',
    accentColor: 'text-sky-400',
    borderColor: 'border-sky-500/40',
    bgSoft: 'bg-sky-500/10',
  },
];

const DEFAULT_QR_CONFIG: FundQrConfig = {
  customQrImageUrl: '',
  pixCopyPasteKey: '00020126580014BR.GOV.BCB.PIX0136fundomotoboy@interempresas.com.br5204000053039865802BR5925FUNDO INVEST MOTOBOY LTDA6009SAO PAULO62070503***6304ABCD',
  recipientName: 'Fundo de Investimento Motoboy',
  bankName: 'Banco Inter Empresas',
};

const GLOBAL_PLANS_STORAGE_KEY = 'copilotrider_global_fund_plans_v1';
const GLOBAL_QR_STORAGE_KEY = 'copilotrider_global_fund_qr_v1';

const SIMULATION_PERIODS = [
  { days: 3, label: '3 Dias (Saque Mín.)' },
  { days: 7, label: '7 Dias (1 Semana)' },
  { days: 15, label: '15 Dias (Quinzena)' },
  { days: 30, label: '30 Dias (1 Mês)' },
  { days: 90, label: '90 Dias (3 Meses)' },
  { days: 180, label: '180 Dias (6 Meses)' },
  { days: 365, label: '365 Dias (1 Ano)' },
];

function fmtBRL(v: number): string {
  return (
    'R$ ' +
    (Number(v) || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function addDaysToIso(baseIso: string, daysToAdd: number): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  dt.setDate(dt.getDate() + daysToAdd);
  return dt.toISOString().slice(0, 10);
}

function formatIsoToPtBr(iso: string): string {
  if (!iso) return '--/--/----';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function diffDaysBetweenIso(startIso: string, endIso: string): number {
  const [y1, m1, d1] = startIso.split('-').map(Number);
  const [y2, m2, d2] = endIso.split('-').map(Number);
  const dt1 = new Date(y1, (m1 || 1) - 1, d1 || 1, 12, 0, 0);
  const dt2 = new Date(y2, (m2 || 1) - 1, d2 || 1, 12, 0, 0);
  return Math.max(0, Math.round((dt2.getTime() - dt1.getTime()) / (1000 * 60 * 60 * 24)));
}

function calculateCompoundYield(
  principal: number,
  dailyRatePct: number,
  days: number
): {
  yieldAmount: number;
  finalAmount: number;
  totalPct: number;
} {
  const r = (Number(dailyRatePct) || 0) / 100;
  const finalAmount = principal * Math.pow(1 + r, Math.max(0, days));
  const yieldAmount = Math.max(0, finalAmount - principal);
  const totalPct = principal > 0 ? (yieldAmount / principal) * 100 : 0;
  return {
    yieldAmount,
    finalAmount,
    totalPct,
  };
}

// High-definition deterministic PIX QR Code SVG renderer when no custom image is uploaded
function PixQrCodeSvg({ size = 224 }: { size?: number }) {
  const matrix = [
    '1111111010010110011111111',
    '1000001001101011001000001',
    '1011101011010100101011101',
    '1011101000111011001011101',
    '1011101010100101101011101',
    '1000001001011010001000001',
    '1111111010101010101111111',
    '0000000001100101100000000',
    '1011011110011010111010110',
    '0110100011010101000101101',
    '1101011001101110110110101',
    '0100110110100011001001010',
    '1011001011011100101110111',
    '0110110100101011010001001',
    '1101011011010100111010110',
    '0010100101101011000101001',
    '1011101110010111111011101',
    '0000000010110010100010010',
    '1111111001011101101011011',
    '1000001011100010100000101',
    '1011101000111011111110110',
    '1011101011000100100010011',
    '1011101010111010111011101',
    '1000001001100110001000110',
    '1111111010011001101101011',
  ];
  const cells = matrix.length;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${cells} ${cells}`}
      shapeRendering="crispEdges"
      className="mx-auto select-none"
    >
      <rect width={cells} height={cells} fill="#FFFFFF" />
      {matrix.map((row, y) =>
        row.split('').map((bit, x) =>
          bit === '1' ? (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000000" />
          ) : null
        )
      )}
    </svg>
  );
}

interface InvestimentosScreenProps {
  isDark: boolean;
  userStorageKey: string;
  currentBalance?: number;
  isAdmin?: boolean;
  currentUserEmail?: string;
  currentUserName?: string;
}

export function InvestimentosScreen({
  isDark,
  userStorageKey,
  isAdmin = false,
  currentUserEmail = '',
  currentUserName = '',
}: InvestimentosScreenProps) {
  // Global Fund Plans state (editable by Admin, shared across all users)
  const [fundPlans, setFundPlans] = useState<MotoboyFundPlan[]>(() => {
    try {
      const raw = localStorage.getItem(GLOBAL_PLANS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore read error
    }
    return DEFAULT_MOTOBOY_FUND_PLANS;
  });

  const [qrConfig, setQrConfig] = useState<FundQrConfig>(() => {
    try {
      const raw = localStorage.getItem(GLOBAL_QR_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_QR_CONFIG, ...parsed };
        }
      }
    } catch {
      // ignore read error
    }
    return DEFAULT_QR_CONFIG;
  });

  // ================= SEGURANÇA: DEPÓSITOS SÓ LIBERAM APÓS O ADMIN CONFIRMAR O PIX =================
  // Fonte da verdade = Supabase (investment_deposits). O motoboy só cria depósitos 'pending';
  // quem confirma/rejeita é o Admin, via função do banco que valida o PIN no servidor.
  const [myDeposits, setMyDeposits] = useState<InvestmentDeposit[]>([]);
  const [depositsLoaded, setDepositsLoaded] = useState<boolean>(false);
  const [schemaMissing, setSchemaMissing] = useState<boolean>(false);
  const [pendingForAdmin, setPendingForAdmin] = useState<InvestmentDeposit[]>([]);
  const [reviewTarget, setReviewTarget] = useState<{
    deposit: InvestmentDeposit;
    decision: 'confirmed' | 'rejected';
  } | null>(null);
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [adminPinError, setAdminPinError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState<boolean>(false);
  const withdrawnKey = `copilotrider_withdrawn_deposits_v1_${userStorageKey}`;
  const [withdrawnIds, setWithdrawnIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(withdrawnKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  });

  const refreshMyDeposits = React.useCallback(async () => {
    const email = currentUserEmail.trim().toLowerCase();
    if (!email) return;
    const res = await fetchMyDeposits(email);
    if (res.ok) {
      setMyDeposits(res.data);
      setSchemaMissing(false);
      setDepositsLoaded(true);
    } else if (res.error === 'schema_missing') {
      setSchemaMissing(true);
      setDepositsLoaded(true);
    }
  }, [currentUserEmail]);

  const refreshPendingForAdmin = React.useCallback(async () => {
    if (!isAdmin) return;
    const res = await fetchPendingDeposits();
    if (res.ok) setPendingForAdmin(res.data);
  }, [isAdmin]);

  useEffect(() => {
    void refreshMyDeposits();
    void refreshPendingForAdmin();
    const interval = setInterval(() => {
      void refreshMyDeposits();
      void refreshPendingForAdmin();
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshMyDeposits, refreshPendingForAdmin]);

  const registerInvestmentEvent = (
    eventType: string,
    plan: { planName: string; shares: number; amount: number }
  ) => {
    void createInvestmentEvent({
      eventType,
      pilotEmail: currentUserEmail,
      pilotName: currentUserName || currentUserEmail.split('@')[0] || 'Motoboy Parceiro',
      planName: plan.planName,
      shares: plan.shares,
      amount: plan.amount,
    });
  };

  // PIN do admin mantido apenas em memória durante a sessão (nunca em disco)
  const adminPinCacheRef = React.useRef<string>('');

  const executeReview = async (
    deposit: InvestmentDeposit,
    decision: 'confirmed' | 'rejected',
    pin: string
  ) => {
    setIsReviewing(true);
    setAdminPinError(null);
    const res = await reviewDeposit(deposit.id, decision, currentUserEmail, pin);
    setIsReviewing(false);

    if (res.ok) {
      adminPinCacheRef.current = pin;
      setReviewTarget(null);
      setAdminPinInput('');
      setPendingForAdmin(prev => prev.filter(d => d.id !== deposit.id));
      void refreshMyDeposits();
      setInvestSuccessBanner(
        decision === 'confirmed'
          ? `✅ PIX de ${fmtBRL(deposit.amount)} confirmado. Cotas de ${
              deposit.pilotName || deposit.pilotEmail
            } liberadas.`
          : `Depósito de ${fmtBRL(deposit.amount)} de ${
              deposit.pilotName || deposit.pilotEmail
            } rejeitado.`
      );
      return;
    }

    adminPinCacheRef.current = '';
    if (res.error === 'invalid_credentials') {
      setReviewTarget({ deposit, decision });
      setAdminPinError('PIN incorreto. Tente novamente.');
    } else if (res.error === 'locked') {
      setReviewTarget({ deposit, decision });
      setAdminPinError('Muitas tentativas incorretas. Aguarde 15 minutos.');
    } else if (res.error === 'not_pending') {
      setReviewTarget(null);
      void refreshPendingForAdmin();
      setWithdrawFeedback('Este depósito já foi analisado.');
    } else if (res.error === 'schema_missing') {
      setReviewTarget(null);
      setWithdrawFeedback(
        '⚠️ Banco de segurança não configurado. Execute o arquivo supabase_investments.sql no Supabase.'
      );
    } else {
      setReviewTarget({ deposit, decision });
      setAdminPinError('Não foi possível concluir. Verifique a conexão e tente novamente.');
    }
  };

  const handleRequestReview = (deposit: InvestmentDeposit, decision: 'confirmed' | 'rejected') => {
    if (!isAdmin) return;
    setAdminPinError(null);
    void executeReview(deposit, decision, adminPinCacheRef.current || '');
  };

  const handleSubmitPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget || isReviewing || adminPinInput.trim().length === 0) return;
    void executeReview(reviewTarget.deposit, reviewTarget.decision, adminPinInput);
  };

  // Load global investment plans from server on mount so all users get admin updates
  useEffect(() => {
    let active = true;
    fetch('/api/investment-plans')
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (!active || !json?.ok || !json?.data) return;
        if (Array.isArray(json.data.plans) && json.data.plans.length > 0) {
          setFundPlans(json.data.plans);
          localStorage.setItem(GLOBAL_PLANS_STORAGE_KEY, JSON.stringify(json.data.plans));
        }
        if (json.data.qrConfig) {
          const mergedQr = { ...DEFAULT_QR_CONFIG, ...json.data.qrConfig };
          setQrConfig(mergedQr);
          localStorage.setItem(GLOBAL_QR_STORAGE_KEY, JSON.stringify(mergedQr));
        }
      })
      .catch(() => {
        // fallback to localStorage
      });
    return () => {
      active = false;
    };
  }, []);

  const persistGlobalFundConfig = (nextPlans: MotoboyFundPlan[], nextQrConfig: FundQrConfig = qrConfig) => {
    setFundPlans(nextPlans);
    setQrConfig(nextQrConfig);
    try {
      localStorage.setItem(GLOBAL_PLANS_STORAGE_KEY, JSON.stringify(nextPlans));
      localStorage.setItem(GLOBAL_QR_STORAGE_KEY, JSON.stringify(nextQrConfig));
    } catch {
      // ignore storage quota errors
    }
    void fetch('/api/investment-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plans: nextPlans,
        qrConfig: nextQrConfig,
        updatedBy: currentUserEmail || 'admin',
      }),
    }).catch(() => {
      // ignore offline error
    });
  };

  // Cotas ativas = SOMENTE depósitos confirmados pelo Admin (e ainda não resgatados).
  // Depósitos pendentes/rejeitados nunca viram saldo.
  const positions = useMemo<MotoboyInvestmentPosition[]>(() => {
    return myDeposits
      .filter(dep => dep.status === 'confirmed' && !withdrawnIds.includes(dep.id))
      .map(dep => {
        // A carência e o vencimento contam a partir da CONFIRMAÇÃO do PIX pelo Admin
        const activationIso = (dep.confirmedAt || dep.createdAt || new Date().toISOString()).slice(0, 10);
        const unlockIso = addDaysToIso(activationIso, dep.minWithdrawDays);
        const maturityIso =
          dep.fixedMaturityDate && dep.fixedMaturityDate >= activationIso
            ? dep.fixedMaturityDate
            : addDaysToIso(activationIso, dep.maturityDays);
        return {
          id: dep.id,
          planId: dep.planId,
          planName: dep.planName,
          planIcon: dep.planIcon,
          shares: dep.shares,
          sharePrice: dep.sharePrice,
          investedAmount: dep.amount,
          dailyRatePct: dep.dailyRatePct,
          monthlyRatePct: dep.monthlyRatePct,
          maturityDays: dep.maturityDays,
          minWithdrawDays: dep.minWithdrawDays,
          createdAtIso: activationIso,
          unlockWithdrawDateIso: unlockIso,
          maturityDateIso: maturityIso,
          status: 'active' as const,
        };
      });
  }, [myDeposits, withdrawnIds]);

  const myPendingDeposits = useMemo(
    () => myDeposits.filter(dep => dep.status === 'pending'),
    [myDeposits]
  );
  const myRejectedDeposits = useMemo(
    () => myDeposits.filter(dep => dep.status === 'rejected').slice(0, 3),
    [myDeposits]
  );

  // Simulator state
  const [selectedSimPlanId, setSelectedSimPlanId] = useState<string>(
    () => fundPlans[0]?.id || DEFAULT_MOTOBOY_FUND_PLANS[0].id
  );
  const [simShares, setSimShares] = useState<number>(4);
  const [simDays, setSimDays] = useState<number>(30);

  // Investment Modal & Pop-up Confirmation Flow state
  const [showInvestModal, setShowInvestModal] = useState<boolean>(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState<boolean>(false);
  const [isQrCodeGenerated, setIsQrCodeGenerated] = useState<boolean>(false);

  // Withdrawal Confirmation Pop-up state (individual fast action)
  const [withdrawingPosition, setWithdrawingPosition] = useState<MotoboyInvestmentPosition | null>(null);

  // ================= ONE-CLICK TOP CARDS MODAL FLOWS =================
  const [showActiveInvestmentsModal, setShowActiveInvestmentsModal] = useState<boolean>(false);
  const [showYieldBreakdownModal, setShowYieldBreakdownModal] = useState<boolean>(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState<boolean>(false);
  const [showFundRulesModal, setShowFundRulesModal] = useState<boolean>(false);

  // Dedicated Withdrawal Modal form state
  const [withdrawTargetId, setWithdrawTargetId] = useState<string>('all_eligible');
  const [withdrawPixType, setWithdrawPixType] = useState<'cpf' | 'celular' | 'email' | 'aleatoria'>('cpf');
  const [withdrawPixKeyInput, setWithdrawPixKeyInput] = useState<string>(() => {
    try {
      return localStorage.getItem(`copilotrider_saved_pix_${userStorageKey}`) || '';
    } catch {
      return '';
    }
  });
  const [withdrawAccountHolder, setWithdrawAccountHolder] = useState<string>(() => currentUserName || '');
  const [withdrawBankName, setWithdrawBankName] = useState<string>('');
  const [withdrawReceipt, setWithdrawReceipt] = useState<{
    id: string;
    amount: number;
    shares: number;
    pixKey: string;
    pixType: string;
    holder: string;
    bank: string;
    planNames: string;
    date: string;
  } | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const [modalPlan, setModalPlan] = useState<MotoboyFundPlan>(
    () => fundPlans[0] || DEFAULT_MOTOBOY_FUND_PLANS[0]
  );
  const [modalShares, setModalShares] = useState<number>(2);
  const [customExtraAmount, setCustomExtraAmount] = useState<string>('');
  const [investSuccessBanner, setInvestSuccessBanner] = useState<string | null>(null);
  const [withdrawFeedback, setWithdrawFeedback] = useState<string | null>(null);
  const [zoomQrModal, setZoomQrModal] = useState<boolean>(false);
  const [copiedPixKey, setCopiedPixKey] = useState<boolean>(false);

  // ================= ADMIN-ONLY EDIT MODAL STATE =================
  const [editingPlan, setEditingPlan] = useState<MotoboyFundPlan | null>(null);
  const [isCreatingNewPlan, setIsCreatingNewPlan] = useState<boolean>(false);
  const [confirmDeletePlanId, setConfirmDeletePlanId] = useState<string | null>(null);
  const [showQrAdminModal, setShowQrAdminModal] = useState<boolean>(false);
  const [draftQrConfig, setDraftQrConfig] = useState<FundQrConfig>(qrConfig);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const surfaceCard = isDark
    ? 'bg-[#12141C] border border-slate-800/80 text-slate-100'
    : 'bg-white border border-slate-200/90 text-slate-900 shadow-xs';
  const surfaceSubtle = isDark
    ? 'bg-[#181B26] border border-slate-800/60'
    : 'bg-slate-100/80 border border-slate-200/70';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';
  const primaryText = isDark ? 'text-slate-100' : 'text-slate-900';
  const secondaryText = isDark ? 'text-slate-200' : 'text-slate-800';
  const subText = isDark ? 'text-slate-300' : 'text-slate-700';
  const cardBorder = isDark ? 'border-slate-800/80' : 'border-slate-200';
  const borderSubtle = isDark ? 'border-slate-800/60' : 'border-slate-200';
  const dividerBorder = isDark ? 'border-slate-800' : 'border-slate-200';
  const inputSurface = isDark
    ? 'bg-[#090A0F] border border-slate-700/80 text-white focus:border-[#FF6A1A]'
    : 'bg-slate-50 border border-slate-300 text-slate-900 focus:border-[#FF6A1A]';

  // Selected simulator plan
  const activeSimPlan = useMemo(
    () => fundPlans.find(p => p.id === selectedSimPlanId) || fundPlans[0] || DEFAULT_MOTOBOY_FUND_PLANS[0],
    [fundPlans, selectedSimPlanId]
  );

  const simInvestedAmount = simShares * activeSimPlan.sharePrice;
  const simProjection = useMemo(
    () => calculateCompoundYield(simInvestedAmount, activeSimPlan.dailyRatePct, simDays),
    [simInvestedAmount, activeSimPlan.dailyRatePct, simDays]
  );

  const minSharePriceAcrossPlans = useMemo(() => {
    if (fundPlans.length === 0) return 25;
    return Math.min(...fundPlans.map(p => Number(p.sharePrice) || 25));
  }, [fundPlans]);

  // Portfolio totals
  const portfolioStats = useMemo(() => {
    const activeList = positions.filter(p => p.status === 'active');
    let totalInvested = 0;
    let totalShares = 0;
    let currentYield = 0;
    let projectedMaturityYield = 0;
    let availableToWithdraw = 0;
    let lockedInGracePeriod = 0;

    activeList.forEach(pos => {
      totalInvested += pos.investedAmount;
      totalShares += pos.shares;
      const elapsedDays = Math.max(1, diffDaysBetweenIso(pos.createdAtIso, todayIso));
      const { yieldAmount, finalAmount } = calculateCompoundYield(
        pos.investedAmount,
        pos.dailyRatePct,
        elapsedDays
      );
      const { yieldAmount: matYield } = calculateCompoundYield(
        pos.investedAmount,
        pos.dailyRatePct,
        pos.maturityDays
      );

      currentYield += yieldAmount;
      projectedMaturityYield += matYield;

      if (elapsedDays >= pos.minWithdrawDays) {
        availableToWithdraw += finalAmount;
      } else {
        lockedInGracePeriod += finalAmount;
      }
    });

    return {
      activeCount: activeList.length,
      totalInvested,
      totalShares,
      currentYield,
      totalPatrimony: totalInvested + currentYield,
      projectedMaturityYield,
      availableToWithdraw,
      lockedInGracePeriod,
    };
  }, [positions, todayIso]);

  // Detalhamento do valor investido em cada fundo pelo motoboy
  const fundInvestmentsBreakdown = useMemo(() => {
    const activeList = positions.filter(p => p.status === 'active');
    const map: Record<
      string,
      {
        planId: string;
        planName: string;
        planIcon: string;
        totalInvested: number;
        totalShares: number;
        currentYield: number;
        totalPatrimony: number;
        eligibleShares: number;
        eligibleAmount: number;
        lockedShares: number;
        lockedAmount: number;
        positions: MotoboyInvestmentPosition[];
      }
    > = {};

    activeList.forEach(pos => {
      const key = pos.planId || pos.planName;
      if (!map[key]) {
        map[key] = {
          planId: pos.planId,
          planName: pos.planName,
          planIcon: pos.planIcon,
          totalInvested: 0,
          totalShares: 0,
          currentYield: 0,
          totalPatrimony: 0,
          eligibleShares: 0,
          eligibleAmount: 0,
          lockedShares: 0,
          lockedAmount: 0,
          positions: [],
        };
      }
      const elapsedDays = Math.max(1, diffDaysBetweenIso(pos.createdAtIso, todayIso));
      const { yieldAmount, finalAmount } = calculateCompoundYield(
        pos.investedAmount,
        pos.dailyRatePct,
        elapsedDays
      );
      map[key].totalInvested += pos.investedAmount;
      map[key].totalShares += pos.shares;
      map[key].currentYield += yieldAmount;
      map[key].totalPatrimony += finalAmount;
      map[key].positions.push(pos);

      if (elapsedDays >= pos.minWithdrawDays) {
        map[key].eligibleShares += pos.shares;
        map[key].eligibleAmount += finalAmount;
      } else {
        map[key].lockedShares += pos.shares;
        map[key].lockedAmount += finalAmount;
      }
    });

    return Object.values(map);
  }, [positions, todayIso]);

  const openBuySharesModal = (plan: MotoboyFundPlan, defaultShares = 2) => {
    const minS = Math.max(1, Number(plan.minShares) || 1);
    setModalPlan(plan);
    setModalShares(Math.max(minS, defaultShares));
    setCustomExtraAmount('');
    setIsQrCodeGenerated(false);
    setShowConfirmPopup(false);
    setShowInvestModal(true);
  };

  const modalTotalDeposit = useMemo(() => {
    const base = Math.max(1, modalShares) * modalPlan.sharePrice;
    const extra = Math.max(0, parseFloat(customExtraAmount.replace(',', '.')) || 0);
    return base + extra;
  }, [modalShares, modalPlan, customExtraAmount]);

  const modalProjectionByTime = useMemo(() => {
    return SIMULATION_PERIODS.map(period => {
      const calc = calculateCompoundYield(modalTotalDeposit, modalPlan.dailyRatePct, period.days);
      return {
        ...period,
        ...calc,
      };
    });
  }, [modalTotalDeposit, modalPlan]);

  // Click on "Confirmar Investimento" triggers the Confirmation Pop-up first
  const handleRequestInvestmentConfirmation = () => {
    if (modalTotalDeposit <= 0) return;
    setShowConfirmPopup(true);
  };

  // Motoboy confirmou: registra o depósito como PENDENTE no banco/servidor e só então exibe o QR Code.
  // As cotas NÃO são liberadas aqui: dependem da confirmação do PIX pelo Admin.
  const handleProceedWithInvestmentConfirmation = async () => {
    if (isSubmittingDeposit) return;
    setIsSubmittingDeposit(true);

    const pilotIdentifier = currentUserName || currentUserEmail.split('@')[0] || 'Motoboy Parceiro';
    const res = await createPendingDeposit({
      pilotEmail: currentUserEmail,
      pilotName: pilotIdentifier,
      planId: modalPlan.id,
      planName: modalPlan.name,
      planIcon: modalPlan.icon,
      shares: modalShares,
      sharePrice: modalPlan.sharePrice,
      amount: modalTotalDeposit,
      dailyRatePct: modalPlan.dailyRatePct,
      monthlyRatePct: modalPlan.monthlyRatePct,
      maturityDays: modalPlan.maturityDays,
      minWithdrawDays: modalPlan.minWithdrawDays,
      fixedMaturityDate: modalPlan.fixedMaturityDate || '',
    });
    setIsSubmittingDeposit(false);
    setShowConfirmPopup(false);

    if (!res.ok) {
      setWithdrawFeedback(
        res.error === 'schema_missing'
          ? '⚠️ O sistema de investimentos seguro ainda não foi ativado pelo Admin. Tente novamente mais tarde.'
          : res.error === 'offline'
          ? '⚠️ Sem conexão. Conecte-se à internet para registrar o investimento.'
          : '⚠️ Não foi possível registrar o investimento. Tente novamente.'
      );
      return;
    }

    setIsQrCodeGenerated(true);
    void refreshMyDeposits();
    void refreshPendingForAdmin();

    // Dispara notificação nativa de registro da intenção/depósito pendente
    void sendNativeNotification({
      tag: `dep_pending_${res.data.id}`,
      channel: 'investments',
      title: isAdmin
        ? '🚨 Novo depósito aguardando confirmação de PIX'
        : '⏳ Investimento registrado · Aguardando PIX',
      body: isAdmin
        ? `${pilotIdentifier} iniciou o depósito de ${fmtBRL(modalTotalDeposit)} (${modalShares} ${
            modalShares === 1 ? 'cota' : 'cotas'
          } em ${modalPlan.name}). Confirme o PIX para liberar as cotas.`
        : `Realize o PIX de ${fmtBRL(modalTotalDeposit)}. Suas cotas serão liberadas assim que o Admin confirmar o depósito.`,
      targetTab: 'investments',
    });
  };

  // Etapa final do motoboy: encerra o modal e aguarda a confirmação do Admin (não libera cotas).
  const handleFinishAwaitingAdmin = () => {
    setShowInvestModal(false);
    setIsQrCodeGenerated(false);
    void refreshMyDeposits();
    void refreshPendingForAdmin();
    setInvestSuccessBanner(
      `⏳ Depósito de ${fmtBRL(modalTotalDeposit)} enviado para conferência! Suas cotas serão liberadas somente após o Admin confirmar o recebimento do PIX.`
    );
  };

  const handleWithdrawPosition = (pos: MotoboyInvestmentPosition) => {
    const elapsedDays = diffDaysBetweenIso(pos.createdAtIso, todayIso);
    if (elapsedDays < pos.minWithdrawDays) {
      const remaining = pos.minWithdrawDays - elapsedDays;
      setWithdrawFeedback(
        `🔒 Carência mínima de ${pos.minWithdrawDays} dias ativa: faltam ${remaining} ${
          remaining === 1 ? 'dia' : 'dias'
        } para liberar o saque (libera em ${formatIsoToPtBr(pos.unlockWithdrawDateIso)}).`
      );
      return;
    }

    setWithdrawingPosition(pos);
  };

  const handleConfirmWithdrawal = () => {
    if (!withdrawingPosition) return;
    const pos = withdrawingPosition;

    const nextWithdrawn = [...withdrawnIds, pos.id];
    setWithdrawnIds(nextWithdrawn);
    try {
      localStorage.setItem(withdrawnKey, JSON.stringify(nextWithdrawn));
    } catch {
      // ignore storage write error
    }
    setWithdrawingPosition(null);

    // O Admin recebe uma notificação nativa a partir deste registro
    registerInvestmentEvent('withdrawal_requested', {
      planName: pos.planName,
      shares: pos.shares,
      amount: pos.investedAmount,
    });

    void sendNativeNotification({
      tag: `withdraw_req_${pos.id}`,
      channel: 'investments',
      title: '📤 Solicitação de resgate enviada',
      body: `Pedido de resgate de ${fmtBRL(pos.investedAmount)} (${pos.shares} ${
        pos.shares === 1 ? 'cota' : 'cotas'
      } em ${pos.planName}) encaminhado ao Administrador.`,
      targetTab: 'investments',
    });

    setWithdrawFeedback(
      `✅ Solicitação de resgate de ${fmtBRL(pos.investedAmount)} (${pos.shares} cotas) realizada com sucesso! O Admin foi notificado para efetuar o pagamento.`
    );
  };

  // Processa o resgate completo pelo Modal de Saque / Resgate
  const handleExecuteDedicatedWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);

    const pixTrimmed = withdrawPixKeyInput.trim();
    if (!pixTrimmed) {
      setWithdrawError('Informe a chave PIX onde você deseja receber o valor do resgate.');
      return;
    }

    const activeList = positions.filter(p => p.status === 'active');
    let targetPositions: MotoboyInvestmentPosition[] = [];

    if (withdrawTargetId === 'all_eligible') {
      targetPositions = activeList.filter(p => {
        const elapsed = diffDaysBetweenIso(p.createdAtIso, todayIso);
        return elapsed >= p.minWithdrawDays;
      });
    } else {
      const found = activeList.find(p => p.id === withdrawTargetId);
      if (found) {
        const elapsed = diffDaysBetweenIso(found.createdAtIso, todayIso);
        if (elapsed < found.minWithdrawDays) {
          setWithdrawError(
            `Esta cota ainda está sob prazo de carência (${found.minWithdrawDays} dias). O saque será liberado em ${formatIsoToPtBr(
              found.unlockWithdrawDateIso
            )}.`
          );
          return;
        }
        targetPositions = [found];
      }
    }

    if (targetPositions.length === 0) {
      setWithdrawError('Nenhuma cota liberada foi selecionada para resgate.');
      return;
    }

    let totalAmount = 0;
    let totalShares = 0;
    const posIds: string[] = [];
    const planNamesSet = new Set<string>();

    targetPositions.forEach(p => {
      posIds.push(p.id);
      totalShares += p.shares;
      const elapsed = Math.max(1, diffDaysBetweenIso(p.createdAtIso, todayIso));
      const { finalAmount } = calculateCompoundYield(p.investedAmount, p.dailyRatePct, elapsed);
      totalAmount += finalAmount;
      planNamesSet.add(p.planName);
    });

    try {
      localStorage.setItem(`copilotrider_saved_pix_${userStorageKey}`, pixTrimmed);
    } catch {
      // ignore
    }

    const nextWithdrawn = Array.from(new Set([...withdrawnIds, ...posIds]));
    setWithdrawnIds(nextWithdrawn);
    try {
      localStorage.setItem(withdrawnKey, JSON.stringify(nextWithdrawn));
    } catch {
      // ignore
    }

    const planNamesStr = Array.from(planNamesSet).join(', ');
    registerInvestmentEvent('withdrawal_requested', {
      planName: `${planNamesStr} · PIX: ${pixTrimmed} (${withdrawPixType.toUpperCase()})`,
      shares: totalShares,
      amount: totalAmount,
    });

    void sendNativeNotification({
      tag: `withdraw_req_${Date.now()}`,
      channel: 'investments',
      title: '📤 Solicitação de resgate PIX enviada',
      body: `Pedido de resgate de ${fmtBRL(totalAmount)} (${totalShares} ${
        totalShares === 1 ? 'cota' : 'cotas'
      }) para PIX ${pixTrimmed} encaminhado ao Administrador.`,
      targetTab: 'investments',
    });

    const receipt = {
      id: 'SAQ-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      amount: totalAmount,
      shares: totalShares,
      pixKey: pixTrimmed,
      pixType: withdrawPixType,
      holder: withdrawAccountHolder.trim() || currentUserName || 'Motoboy Parceiro',
      bank: withdrawBankName.trim() || 'Conta Bancária informada',
      planNames: planNamesStr,
      date: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setWithdrawReceipt(receipt);
    setWithdrawFeedback(
      `✅ Solicitação de resgate de ${fmtBRL(totalAmount)} enviada com sucesso! O Administrador já recebeu a notificação para fazer o PIX.`
    );
  };

  // ================= ADMIN HANDLERS FOR EDITING PLANS =================
  const handleOpenAdminEditPlan = (plan: MotoboyFundPlan) => {
    if (!isAdmin) return;
    setIsCreatingNewPlan(false);
    setConfirmDeletePlanId(null);
    setEditingPlan({
      ...plan,
      minShares: plan.minShares ?? 1,
      maxShares: plan.maxShares ?? 1000,
      fixedMaturityDate: plan.fixedMaturityDate ?? '',
      liquidityLabel: plan.liquidityLabel ?? `Saque liberado após ${plan.minWithdrawDays * 24}h do investimento`,
      themeKey: plan.themeKey ?? 'orange',
    });
  };

  const handleOpenAdminCreatePlan = () => {
    if (!isAdmin) return;
    setIsCreatingNewPlan(true);
    setConfirmDeletePlanId(null);
    const preset = THEME_PRESETS.orange;
    setEditingPlan({
      id: 'cota_custom_' + Date.now(),
      name: 'Fundo Motoboy · Nova Cota Especial',
      badge: 'Novo Plano · Alta Rentabilidade',
      icon: '🚀',
      sharePrice: 50,
      minShares: 1,
      maxShares: 1000,
      dailyRatePct: 0.065,
      monthlyRatePct: 1.97,
      annualRatePct: 26.4,
      cdiEquivalent: '165% do CDI',
      maturityDays: 60,
      fixedMaturityDate: '',
      minWithdrawDays: 3,
      liquidityLabel: 'Saque liberado após 72h do investimento',
      description: 'Cota configurada pela administração do fundo para motoboys parceiros.',
      recommendedFor: 'Reserva de curto, médio ou longo prazo do motoboy',
      themeKey: 'orange',
      accentColor: preset.accentColor,
      borderColor: preset.borderColor,
      bgSoft: preset.bgSoft,
    });
  };

  const handleSaveAdminPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !editingPlan) return;

    const themeKey: FundThemeKey = editingPlan.themeKey || 'orange';
    const preset = THEME_PRESETS[themeKey] || THEME_PRESETS.orange;

    const normalizedPlan: MotoboyFundPlan = {
      ...editingPlan,
      name: editingPlan.name.trim() || 'Fundo Motoboy',
      badge: editingPlan.badge.trim() || 'Cota Exclusiva',
      icon: editingPlan.icon.trim() || '🛵',
      sharePrice: Math.max(1, Number(editingPlan.sharePrice) || 25),
      minShares: Math.max(1, Number(editingPlan.minShares) || 1),
      maxShares: Math.max(1, Number(editingPlan.maxShares) || 1000),
      dailyRatePct: Math.max(0.001, Number(editingPlan.dailyRatePct) || 0.05),
      monthlyRatePct: Math.max(0.01, Number(editingPlan.monthlyRatePct) || 1.5),
      annualRatePct: Math.max(0.1, Number(editingPlan.annualRatePct) || 18),
      cdiEquivalent: editingPlan.cdiEquivalent.trim() || '140% do CDI',
      maturityDays: Math.max(1, Math.round(Number(editingPlan.maturityDays) || 30)),
      fixedMaturityDate: editingPlan.fixedMaturityDate || '',
      minWithdrawDays: Math.max(0, Math.round(Number(editingPlan.minWithdrawDays) ?? 3)),
      liquidityLabel:
        (editingPlan.liquidityLabel || '').trim() ||
        `Saque liberado após ${Math.max(0, Math.round(Number(editingPlan.minWithdrawDays) ?? 3))} dias`,
      description: editingPlan.description.trim(),
      recommendedFor: editingPlan.recommendedFor.trim(),
      themeKey,
      accentColor: preset.accentColor,
      borderColor: preset.borderColor,
      bgSoft: preset.bgSoft,
    };

    const nextPlans = isCreatingNewPlan
      ? [...fundPlans, normalizedPlan]
      : fundPlans.map(p => (p.id === normalizedPlan.id ? normalizedPlan : p));

    persistGlobalFundConfig(nextPlans);
    setEditingPlan(null);
    setIsCreatingNewPlan(false);
    setInvestSuccessBanner(
      `✅ Configurações de "${normalizedPlan.name}" atualizadas pelo Admin com sucesso!`
    );
  };

  const handleDeleteAdminPlan = (planId: string) => {
    if (!isAdmin) return;
    if (fundPlans.length <= 1) {
      setWithdrawFeedback('⚠️ É necessário manter pelo menos 1 card de investimento ativo.');
      return;
    }
    const nextPlans = fundPlans.filter(p => p.id !== planId);
    persistGlobalFundConfig(nextPlans);
    setEditingPlan(null);
    setConfirmDeletePlanId(null);
    setInvestSuccessBanner('✅ Card de investimento removido pelo Admin.');
  };

  const handleQrImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraftQrConfig(prev => ({
          ...prev,
          customQrImageUrl: reader.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* BANNER DE FEEDBACK DE INVESTIMENTO / SAQUE */}
      {investSuccessBanner && (
        <div className="rounded-2xl p-3.5 sm:p-4 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{investSuccessBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setInvestSuccessBanner(null)}
            className="p-1 rounded-lg hover:bg-black/20 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {withdrawFeedback && (
        <div className="rounded-2xl p-3.5 sm:p-4 bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{withdrawFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setWithdrawFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/20 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BARRA EXCLUSIVA DO ADMIN (Visível SOMENTE para o Administrador) */}
      {isAdmin && (
        <div
          className={`rounded-2xl p-3.5 sm:p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDark
              ? 'bg-[#FF6A1A]/10 border-[#FF6A1A]/40 text-slate-100'
              : 'bg-orange-50 border-orange-300 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF6A1A] text-black flex items-center justify-center shrink-0">
              <Settings2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-[#FF6A1A]">
                  Painel Gestor do Fundo (Exclusivo Admin)
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#FF6A1A] text-black">
                  Admin Verificado
                </span>
              </div>
              <p className={`text-[11px] ${mutedText}`}>
                Você pode editar <strong>todos os dados</strong> dos cards abaixo (valor da cota, taxas de rendimento, vencimento, carência de saque e QR Code PIX).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleOpenAdminCreatePlan}
              className="px-3 py-2 rounded-xl text-xs font-black bg-[#FF6A1A] text-black hover:bg-[#ff7b33] cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Novo Card / Cota</span>
            </button>

            {/* INDICADOR DE PIX PENDENTES DE CONFIRMAÇÃO DO ADMIN */}
            <button
              type="button"
              onClick={() => {
                void refreshPendingForAdmin();
                const el = document.getElementById('admin-pending-pix-section');
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="relative px-3 py-2 rounded-xl text-xs font-black bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Confirmar PIX Pendentes</span>
              {pendingForAdmin.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-black text-[10px] flex items-center justify-center ml-0.5">
                  {pendingForAdmin.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setDraftQrConfig(qrConfig);
                setShowQrAdminModal(true);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 ${surfaceSubtle} hover:border-[#FF6A1A]`}
            >
              <QrCode className="w-4 h-4 text-[#FF6A1A]" />
              <span>Editar QR Code PIX</span>
            </button>

            <button
              type="button"
              onClick={() => {
                persistGlobalFundConfig(DEFAULT_MOTOBOY_FUND_PLANS, DEFAULT_QR_CONFIG);
                setInvestSuccessBanner('✅ Planos de investimento restaurados para os valores padrão.');
              }}
              title="Restaurar valores originais dos 3 planos"
              className={`px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 ${surfaceSubtle} hover:border-rose-500/50`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Padrão</span>
            </button>
          </div>
        </div>
      )}

      {/* PAINEL DE SEGURANÇA DO ADMIN: LIBERAÇÃO DE COTAS APÓS CONFIRMAÇÃO DO PIX */}
      {isAdmin && (
        <div
          id="admin-pending-pix-section"
          className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 border ${
            pendingForAdmin.length > 0
              ? isDark
                ? 'bg-amber-950/25 border-amber-500/50 text-slate-100'
                : 'bg-amber-50/90 border-amber-300 text-slate-900'
              : surfaceCard
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/50">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-black flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black">
                    Modo de Segurança · Depósitos PIX Aguardando Confirmação do Admin
                  </h2>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    {pendingForAdmin.length}{' '}
                    {pendingForAdmin.length === 1 ? 'Pendente' : 'Pendentes'}
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${mutedText}`}>
                  O saldo e as cotas do entregador só são liberados após você conferir o PIX na conta e clicar em <strong>Confirmar PIX e Liberar Cotas</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void refreshPendingForAdmin()}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer self-start sm:self-center shrink-0 ${surfaceSubtle} hover:border-amber-500/50`}
            >
              🔄 Atualizar Lista
            </button>
          </div>

          {pendingForAdmin.length === 0 ? (
            <div className={`mt-3 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${surfaceSubtle} ${mutedText}`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Nenhum depósito PIX pendente de confirmação no momento.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 mt-3">
              {pendingForAdmin.map(dep => (
                <div
                  key={dep.id}
                  className={`p-3.5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${surfaceSubtle} border-amber-500/40`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-xl flex items-center justify-center shrink-0">
                      {dep.planIcon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-black">
                          {dep.pilotName || dep.pilotEmail || 'Motoboy Parceiro'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {dep.pilotEmail}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ⏳ Aguardando Confirmação PIX
                        </span>
                      </div>
                      <div className="text-xs font-bold mt-1 text-[#FF6A1A]">
                        {dep.planName} · {dep.shares} {dep.shares === 1 ? 'Cota' : 'Cotas'} · Valor PIX:{' '}
                        <span className="text-sm font-black">{fmtBRL(dep.amount)}</span>
                      </div>
                      <div className={`text-[10px] mt-0.5 ${mutedText}`}>
                        Solicitado em:{' '}
                        {dep.createdAt
                          ? new Date(dep.createdAt).toLocaleString('pt-BR')
                          : 'Agora'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/50">
                    <button
                      type="button"
                      disabled={isReviewing}
                      onClick={() => handleRequestReview(dep, 'rejected')}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 cursor-pointer transition-colors"
                    >
                      Rejeitar
                    </button>
                    <button
                      type="button"
                      disabled={isReviewing}
                      onClick={() => handleRequestReview(dep, 'confirmed')}
                      className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Confirmar PIX e Liberar Cotas</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 1. HERO HEADER & RESUMO DA CARTEIRA DE COTAS DO MOTOBOY */}
      <div
        className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 border relative overflow-hidden ${
          isDark
            ? 'bg-gradient-to-br from-[#151925] via-[#12141C] to-[#1A1410] border-[#FF6A1A]/40'
            : 'bg-gradient-to-br from-white via-orange-50/40 to-amber-50/60 border-orange-300 shadow-sm'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/50">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#FF6A1A] text-black flex items-center justify-center shrink-0 shadow-lg shadow-[#FF6A1A]/25">
              <TrendingUp className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight">
                  Fundo de Investimentos para Motoboys
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Cotas a partir de {fmtBRL(minSharePriceAcrossPlans)}
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${mutedText}`}>
                Compre cotas do fundo exclusivo para entregadores, acompanhe seu rendimento diário e resgate após o prazo mínimo configurado em cada cota.
              </p>
            </div>
          </div>
        </div>

        {/* KPIs da Carteira do Motoboy - CARDS ONE-CLICK INTERATIVOS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-4">
          {/* Card 1: Patrimônio em Cotas -> Abre Modal de Investimentos Ativos do Motoboy */}
          <button
            type="button"
            onClick={() => setShowActiveInvestmentsModal(true)}
            title="Clique para ver seus investimentos ativos e o detalhamento por fundo"
            className={`w-full text-left rounded-2xl p-3 sm:p-4 transition-all duration-200 cursor-pointer group hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:border-[#FF6A1A]/70 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#FF6A1A]/40 ${surfaceSubtle}`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className={`flex items-center gap-1 ${primaryText}`}>
                <span>Patrimônio em Cotas</span>
              </span>
              <div className="flex items-center gap-1">
                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded transition-all ${
                  isDark ? 'bg-[#FF6A1A]/20 text-[#FF6A1A]' : 'bg-orange-100 text-orange-900 border border-orange-200'
                }`}>
                  Ver Cotas ↗
                </span>
                <Wallet className="w-4 h-4 text-[#FF6A1A] group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black tabular-nums mt-1 text-[#FF6A1A]">
              {fmtBRL(portfolioStats.totalPatrimony)}
            </div>
            <div className={`text-[10px] font-semibold mt-0.5 flex items-center justify-between ${mutedText}`}>
              <span>
                {portfolioStats.totalShares}{' '}
                {portfolioStats.totalShares === 1 ? 'cota ativa' : 'cotas ativas'} · {fmtBRL(portfolioStats.totalInvested)}
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#FF6A1A]" />
            </div>
          </button>

          {/* Card 2: Rendimento no Vencimento -> Abre Modal de Rendimentos & Projeções */}
          <button
            type="button"
            onClick={() => setShowYieldBreakdownModal(true)}
            title="Clique para ver o extrato de rendimento diário e projeção de vencimento"
            className={`w-full text-left rounded-2xl p-3 sm:p-4 transition-all duration-200 cursor-pointer group hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:border-emerald-500/70 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${surfaceSubtle}`}
          >
            <div className={`flex items-center justify-between text-[11px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              <span className={primaryText}>Rendimento Projetado</span>
              <div className="flex items-center gap-1">
                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded transition-all ${
                  isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                }`}>
                  Extrato ↗
                </span>
                <TrendingUp className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-700'} group-hover:scale-110 transition-transform`} />
              </div>
            </div>
            <div className={`text-lg sm:text-2xl font-black tabular-nums mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              + {fmtBRL(portfolioStats.projectedMaturityYield)}
            </div>
            <div className={`text-[10px] font-semibold mt-0.5 flex items-center justify-between ${mutedText}`}>
              <span>Acumulado hoje: + {fmtBRL(portfolioStats.currentYield)}</span>
              <ChevronRight className={`w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
            </div>
          </button>

          {/* Card 3: Liberado p/ Saque -> Abre Modal de Solicitação de Resgate / Saque */}
          <button
            type="button"
            onClick={() => {
              setWithdrawReceipt(null);
              setWithdrawError(null);
              setShowWithdrawalModal(true);
            }}
            title="Clique para solicitar resgate / saque imediato via PIX"
            className={`w-full text-left rounded-2xl p-3 sm:p-4 transition-all duration-200 cursor-pointer group hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:border-sky-500/70 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-sky-500/40 ${surfaceSubtle}`}
          >
            <div className={`flex items-center justify-between text-[11px] font-bold ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
              <span className={primaryText}>Liberado p/ Saque</span>
              <div className="flex items-center gap-1">
                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded transition-all ${
                  isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-900 border border-sky-200'
                }`}>
                  Sacar ↗
                </span>
                <Unlock className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-sky-700'} group-hover:scale-110 transition-transform`} />
              </div>
            </div>
            <div className={`text-lg sm:text-2xl font-black tabular-nums mt-1 ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
              {fmtBRL(portfolioStats.availableToWithdraw)}
            </div>
            <div className={`text-[10px] font-semibold mt-0.5 flex items-center justify-between ${mutedText}`}>
              <span>
                {portfolioStats.availableToWithdraw > 0 ? 'Disponível p/ PIX imediato' : 'Carência mínima ativa'}
              </span>
              <ChevronRight className={`w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ${isDark ? 'text-sky-400' : 'text-sky-700'}`} />
            </div>
          </button>

          {/* Card 4: Regra de Saque & Liquidez -> Abre Modal de Regras do Fundo e Liquidez */}
          <button
            type="button"
            onClick={() => setShowFundRulesModal(true)}
            title="Clique para ver todas as regras de saque, liquidez e regulamento do fundo"
            className={`w-full text-left rounded-2xl p-3 sm:p-4 transition-all duration-200 cursor-pointer group hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:border-amber-500/70 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${surfaceSubtle}`}
          >
            <div className={`flex items-center justify-between text-[11px] font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              <span className={primaryText}>Regra de Saque & Liquidez</span>
              <div className="flex items-center gap-1">
                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded transition-all ${
                  isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-900 border border-amber-200'
                }`}>
                  Regras ↗
                </span>
                <Clock className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-700'} group-hover:scale-110 transition-transform`} />
              </div>
            </div>
            <div className={`text-sm sm:text-base font-black mt-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              Mínimo de {fundPlans[0]?.minWithdrawDays ?? 3} Dias (72h)
            </div>
            <div className={`text-[10px] font-semibold mt-0.5 flex items-center justify-between ${mutedText}`}>
              <span className="truncate pr-1">
                {fundPlans[0]?.liquidityLabel || 'Saque liberado após 72h'}
              </span>
              <ChevronRight className={`w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* 2. ESCOLHA SUA COTA DO FUNDO DE INVESTIMENTOS (CARDS DETALHADOS COM BOTÃO EDITAR PARA ADMIN) */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div>
            <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
              <span>📦</span>
              <span>Cotas Disponíveis do Fundo para Motoboys</span>
            </h2>
            <p className={`text-xs ${mutedText}`}>
              Escolha a cota ideal para o seu objetivo, veja o prazo de vencimento e clique em{' '}
              <strong>Investir</strong> para gerar o QR Code de depósito
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {fundPlans.map(plan => {
            const minW = Math.max(0, Number(plan.minWithdrawDays) ?? 3);
            const oneShareMinDays = calculateCompoundYield(
              plan.sharePrice,
              plan.dailyRatePct,
              Math.max(1, minW)
            );
            const oneShare30Days = calculateCompoundYield(plan.sharePrice, plan.dailyRatePct, 30);
            const oneShareMaturity = calculateCompoundYield(
              plan.sharePrice,
              plan.dailyRatePct,
              plan.maturityDays
            );
            const maturityDateStr =
              plan.fixedMaturityDate && plan.fixedMaturityDate >= todayIso
                ? formatIsoToPtBr(plan.fixedMaturityDate)
                : formatIsoToPtBr(addDaysToIso(todayIso, plan.maturityDays));
            const unlockDateStr = formatIsoToPtBr(addDaysToIso(todayIso, minW));

            return (
              <div
                key={plan.id}
                className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between border transition-all ${surfaceCard} ${plan.borderColor}`}
              >
                <div>
                  {/* Topo do Card com Botão Editar (Exclusivo Admin) */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${plan.bgSoft}`}
                      >
                        {plan.icon}
                      </span>
                      <div className="min-w-0">
                        <span
                          className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${plan.bgSoft} ${plan.accentColor}`}
                        >
                          {plan.badge}
                        </span>
                        <h3 className="text-sm sm:text-base font-black mt-1 leading-snug">
                          {plan.name}
                        </h3>
                      </div>
                    </div>

                    {/* BOTÃO DE EDIÇÃO EXCLUSIVO PARA ADMIN */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenAdminEditPlan(plan)}
                        title="Editar todos os detalhes deste investimento (Exclusivo Admin)"
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-black bg-[#FF6A1A]/15 hover:bg-[#FF6A1A] text-[#FF6A1A] hover:text-black border border-[#FF6A1A]/40 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                    )}
                  </div>

                  <p className={`text-xs mt-2.5 leading-relaxed ${mutedText}`}>
                    {plan.description}
                  </p>

                  {plan.recommendedFor && (
                    <div className={`mt-2 text-[11px] font-semibold ${mutedText}`}>
                      🎯 <span className="font-bold">Indicado para:</span> {plan.recommendedFor}
                    </div>
                  )}

                  {/* Preço da Cota & Rentabilidade */}
                  <div className={`mt-3.5 p-3 rounded-2xl ${surfaceSubtle} grid grid-cols-2 gap-2`}>
                    <div>
                      <span className={`block text-[10px] font-bold uppercase ${mutedText}`}>
                        Valor de 1 Cota
                      </span>
                      <span className="text-lg sm:text-xl font-black tabular-nums">
                        {fmtBRL(plan.sharePrice)}
                      </span>
                      <span className={`block text-[10px] font-semibold ${mutedText}`}>
                        Mín. {plan.minShares || 1} {Number(plan.minShares || 1) === 1 ? 'cota' : 'cotas'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`block text-[10px] font-bold uppercase ${mutedText}`}>
                        Rendimento Médio
                      </span>
                      <span className={`text-lg sm:text-xl font-black tabular-nums ${plan.accentColor}`}>
                        {Number(plan.monthlyRatePct).toFixed(2)}% a.m.
                      </span>
                      <span className="block text-[10px] font-bold text-emerald-400">
                        {plan.dailyRatePct}% ao dia ({plan.cdiEquivalent})
                      </span>
                    </div>
                  </div>

                  {/* Prazos: Vencimento e Carência Mínima para Saque */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                      <span className={`flex items-center gap-1.5 font-semibold ${mutedText}`}>
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Prazo p/ Sacar após Investir:</span>
                      </span>
                      <span className="font-black text-amber-400">
                        Mínimo {minW} {minW === 1 ? 'dia' : 'dias'} ({unlockDateStr})
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                      <span className={`flex items-center gap-1.5 font-semibold ${mutedText}`}>
                        <Calendar className="w-3.5 h-3.5 text-sky-400" />
                        <span>Prazo de Vencimento:</span>
                      </span>
                      <span className="font-black text-sky-400">
                        {plan.maturityDays} dias ({maturityDateStr})
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className={`flex items-center gap-1.5 font-semibold ${mutedText}`}>
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Taxa Anual Estimada:</span>
                      </span>
                      <span className="font-black text-emerald-400">
                        {Number(plan.annualRatePct).toFixed(1)}% ao ano
                      </span>
                    </div>
                  </div>

                  {/* Rendimento Médio por Tempo (Por 1 Cota) */}
                  <div
                    className={`mt-3 p-2.5 rounded-xl border border-slate-800/60 ${
                      isDark ? 'bg-slate-950/60' : 'bg-slate-50'
                    }`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Rendimento médio de 1 cota ({fmtBRL(plan.sharePrice)}) por tempo:
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className={`p-1.5 rounded-lg ${surfaceSubtle}`}>
                        <div className="text-[9px] font-bold text-amber-400">
                          Em {Math.max(1, minW)} Dias
                        </div>
                        <div className="text-[11px] font-black text-emerald-400 tabular-nums">
                          +{fmtBRL(oneShareMinDays.yieldAmount)}
                        </div>
                        <div className={`text-[9px] tabular-nums ${mutedText}`}>
                          Total {fmtBRL(oneShareMinDays.finalAmount)}
                        </div>
                      </div>

                      <div className={`p-1.5 rounded-lg ${surfaceSubtle}`}>
                        <div className="text-[9px] font-bold text-sky-400">Em 30 Dias</div>
                        <div className="text-[11px] font-black text-emerald-400 tabular-nums">
                          +{fmtBRL(oneShare30Days.yieldAmount)}
                        </div>
                        <div className={`text-[9px] tabular-nums ${mutedText}`}>
                          Total {fmtBRL(oneShare30Days.finalAmount)}
                        </div>
                      </div>

                      <div className={`p-1.5 rounded-lg ${surfaceSubtle}`}>
                        <div className="text-[9px] font-bold text-purple-400">
                          Venc. ({plan.maturityDays}d)
                        </div>
                        <div className="text-[11px] font-black text-emerald-400 tabular-nums">
                          +{fmtBRL(oneShareMaturity.yieldAmount)}
                        </div>
                        <div className={`text-[9px] tabular-nums ${mutedText}`}>
                          Total {fmtBRL(oneShareMaturity.finalAmount)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação do Card */}
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => openBuySharesModal(plan, Math.max(2, plan.minShares || 1))}
                    className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-[#FF6A1A] hover:bg-[#ff7b33] text-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[#FF6A1A]/20 active:scale-98"
                  >
                    <QrCode className="w-4 h-4 stroke-[2.5]" />
                    <span>Investir nesta Cota</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleOpenAdminEditPlan(plan)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${surfaceSubtle} hover:border-[#FF6A1A] text-[#FF6A1A]`}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>Editar Detalhes do Investimento (Admin)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SIMULADOR DE RENDIMENTO MÉDIO DE ACORDO COM O TEMPO DE CADA INVESTIMENTO */}
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800/50">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg">🧮</span>
              <h2 className="text-base sm:text-lg font-black">
                Simulador de Rendimento por Tempo de Investimento
              </h2>
            </div>
            <p className={`text-xs mt-0.5 ${mutedText}`}>
              Veja quanto suas cotas rendem de acordo com o prazo escolhido em cada modalidade
            </p>
          </div>
          <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 self-start sm:self-center">
            🔒 Carência Mínima para Saque: {activeSimPlan.minWithdrawDays} Dias
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
          {/* Controles do Simulador */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${mutedText}`}>
                1. Escolha o Fundo / Cota:
              </label>
              <div className="grid grid-cols-1 gap-2">
                {fundPlans.map(p => {
                  const selected = p.id === activeSimPlan.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedSimPlanId(p.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        selected
                          ? 'bg-[#FF6A1A]/15 border-[#FF6A1A]'
                          : `${surfaceSubtle} hover:border-slate-700`
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">{p.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-black truncate">{p.name}</div>
                          <div className={`text-[10px] ${mutedText}`}>
                            1 Cota = {fmtBRL(p.sharePrice)} · Vencimento: {p.maturityDays} dias
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-400 shrink-0">
                        {p.monthlyRatePct}%/mês
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantidade de Cotas */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-xs font-bold ${mutedText}`}>
                  2. Quantidade de Cotas:
                </label>
                <span className="text-xs font-black text-[#FF6A1A]">
                  {simShares} {simShares === 1 ? 'cota' : 'cotas'} = {fmtBRL(simInvestedAmount)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSimShares(prev => Math.max(1, prev - 1))}
                  className={`p-2.5 rounded-xl font-black cursor-pointer ${surfaceSubtle} hover:border-[#FF6A1A]`}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={simShares}
                  onChange={e => setSimShares(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className={`w-full px-3 py-2 rounded-xl text-center text-base font-black tabular-nums outline-none ${inputSurface}`}
                />
                <button
                  type="button"
                  onClick={() => setSimShares(prev => prev + 1)}
                  className={`p-2.5 rounded-xl font-black cursor-pointer ${surfaceSubtle} hover:border-[#FF6A1A]`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[1, 2, 4, 10, 20, 40].map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setSimShares(q)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                      simShares === q ? 'bg-[#FF6A1A] text-black' : surfaceSubtle
                    }`}
                  >
                    {q} {q === 1 ? 'cota' : 'cotas'} ({fmtBRL(q * activeSimPlan.sharePrice)})
                  </button>
                ))}
              </div>
            </div>

            {/* Tempo do Investimento */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${mutedText}`}>
                3. Tempo de Investimento Simulado:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {SIMULATION_PERIODS.map(p => (
                  <button
                    key={p.days}
                    type="button"
                    onClick={() => setSimDays(p.days)}
                    className={`px-2.5 py-2 rounded-xl text-[11px] font-black cursor-pointer transition-all ${
                      simDays === p.days
                        ? 'bg-emerald-500 text-black shadow-sm'
                        : `${surfaceSubtle} hover:border-emerald-500/40`
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resultado da Simulação & Tabela Completa por Tempo */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-3">
            <div
              className={`rounded-2xl p-4 border ${
                isDark
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-emerald-50/80 border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-black uppercase text-emerald-400">
                  Projeção em {simDays} Dias ({activeSimPlan.name})
                </span>
                <span className="text-[11px] font-bold text-amber-400">
                  Saque liberado em:{' '}
                  {formatIsoToPtBr(addDaysToIso(todayIso, activeSimPlan.minWithdrawDays))} (
                  {activeSimPlan.minWithdrawDays} dias)
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 mt-3">
                <div className={`p-2.5 rounded-xl ${surfaceSubtle}`}>
                  <span className={`block text-[10px] font-bold ${mutedText}`}>Valor Aplicado</span>
                  <span className="text-sm sm:text-lg font-black tabular-nums block mt-0.5">
                    {fmtBRL(simInvestedAmount)}
                  </span>
                  <span className={`text-[9px] ${mutedText}`}>{simShares} cotas</span>
                </div>

                <div className={`p-2.5 rounded-xl ${surfaceSubtle}`}>
                  <span className="block text-[10px] font-bold text-emerald-400">
                    Rendimento ({simDays}d)
                  </span>
                  <span className="text-sm sm:text-lg font-black tabular-nums text-emerald-400 block mt-0.5">
                    + {fmtBRL(simProjection.yieldAmount)}
                  </span>
                  <span className="text-[9px] text-emerald-400 font-bold">
                    +{simProjection.totalPct.toFixed(2)}% no período
                  </span>
                </div>

                <div className={`p-2.5 rounded-xl ${surfaceSubtle}`}>
                  <span className="block text-[10px] font-bold text-[#FF6A1A]">
                    Valor Total Final
                  </span>
                  <span className="text-sm sm:text-lg font-black tabular-nums text-[#FF6A1A] block mt-0.5">
                    {fmtBRL(simProjection.finalAmount)}
                  </span>
                  <span className={`text-[9px] ${mutedText}`}>
                    Venc.: {formatIsoToPtBr(addDaysToIso(todayIso, activeSimPlan.maturityDays))}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabela Comparativa de Rendimento de Acordo com o Tempo */}
            <div className={`rounded-2xl p-3.5 ${surfaceSubtle}`}>
              <div className="text-xs font-black mb-2 flex items-center justify-between">
                <span>📈 Rendimento Médio de {fmtBRL(simInvestedAmount)} por Tempo:</span>
                <span className={`text-[10px] ${mutedText}`}>
                  Taxa: {activeSimPlan.dailyRatePct}%/dia ({activeSimPlan.monthlyRatePct}%/mês)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
                {SIMULATION_PERIODS.map(period => {
                  const res = calculateCompoundYield(
                    simInvestedAmount,
                    activeSimPlan.dailyRatePct,
                    period.days
                  );
                  const isActive = period.days === simDays;
                  return (
                    <div
                      key={period.days}
                      onClick={() => setSimDays(period.days)}
                      className={`p-2 rounded-xl border cursor-pointer transition-all ${
                        isActive
                          ? 'bg-[#FF6A1A]/15 border-[#FF6A1A]'
                          : isDark
                          ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="text-[10px] font-black text-[#FF6A1A]">
                        {period.days} dias
                      </div>
                      <div className="text-xs font-black text-emerald-400 tabular-nums mt-0.5">
                        +{fmtBRL(res.yieldAmount)}
                      </div>
                      <div className={`text-[9px] font-bold tabular-nums mt-0.5 ${mutedText}`}>
                        {fmtBRL(res.finalAmount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => openBuySharesModal(activeSimPlan, simShares)}
              className="w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-black bg-[#FF6A1A] hover:bg-[#ff7b33] text-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#FF6A1A]/20"
            >
              <QrCode className="w-4 h-4 stroke-[2.5]" />
              <span>
                Investir {fmtBRL(simInvestedAmount)} ({simShares}{' '}
                {simShares === 1 ? 'Cota' : 'Cotas'}) via QR Code PIX
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. MINHAS COTAS COMPRADAS & CONTROLE DE SAQUE */}
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800/50">
          <div>
            <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
              <span>💼</span>
              <span>Minhas Cotas Ativas & Controle de Saque</span>
            </h2>
            <p className={`text-xs mt-0.5 ${mutedText}`}>
              Acompanhe o vencimento de cada aplicação e solicite o saque assim que completar o prazo mínimo de carência
            </p>
          </div>
          <button
            type="button"
            onClick={() => openBuySharesModal(fundPlans[0] || DEFAULT_MOTOBOY_FUND_PLANS[0], 2)}
            className="px-3.5 py-2 rounded-xl text-xs font-black bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-center shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Comprar Mais Cotas</span>
          </button>
        </div>

        {/* DEPÓSITOS PENDENTES DE CONFIRMAÇÃO PELO ADMIN (VISÃO DO MOTOBOY) */}
        {myPendingDeposits.length > 0 && (
          <div className="mt-4 flex flex-col gap-2.5">
            <div className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Depósitos Aguardando Confirmação do PIX pelo Admin ({myPendingDeposits.length})</span>
            </div>
            {myPendingDeposits.map(dep => (
              <div
                key={dep.id}
                className="rounded-2xl p-3.5 sm:p-4 border border-amber-500/40 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-xl flex items-center justify-center shrink-0">
                    {dep.planIcon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-black">{dep.planName}</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {dep.shares} {dep.shares === 1 ? 'Cota' : 'Cotas'} · {fmtBRL(dep.amount)}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-1 ${mutedText}`}>
                      🔒 <strong>Modo de Segurança:</strong> Suas cotas e rendimentos serão liberados automaticamente assim que o Administrador confirmar o recebimento do seu PIX.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-black px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 self-start sm:self-center shrink-0 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Aguardando Admin</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {myRejectedDeposits.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {myRejectedDeposits.map(dep => (
              <div
                key={dep.id}
                className="rounded-xl p-3 border border-rose-500/30 bg-rose-500/10 flex items-center justify-between gap-2 text-xs text-rose-300"
              >
                <span>
                  ⚠️ Depósito de <strong>{fmtBRL(dep.amount)}</strong> ({dep.shares}{' '}
                  {dep.shares === 1 ? 'cota' : 'cotas'} em {dep.planName}) não confirmado pelo Admin.
                </span>
              </div>
            ))}
          </div>
        )}

        {positions.filter(p => p.status === 'active').length === 0 ? (
          <div
            className={`mt-4 p-8 rounded-2xl border border-dashed border-slate-700/60 text-center flex flex-col items-center justify-center gap-3 ${surfaceSubtle}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FF6A1A]/15 text-[#FF6A1A] flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black">Você ainda não possui cotas ativas</h3>
              <p className={`text-xs mt-1 max-w-md ${mutedText}`}>
                Clique em <strong>Investir</strong> em qualquer um dos planos acima para escolher suas cotas e realizar o depósito via QR Code PIX.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openBuySharesModal(fundPlans[0] || DEFAULT_MOTOBOY_FUND_PLANS[0], 2)}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4" />
              <span>Investir Primeiras Cotas</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-4">
            {positions
              .filter(p => p.status === 'active')
              .map(pos => {
                const elapsedDays = diffDaysBetweenIso(pos.createdAtIso, todayIso);
                const canWithdraw = elapsedDays >= pos.minWithdrawDays;
                const daysLeftToUnlock = Math.max(0, pos.minWithdrawDays - elapsedDays);
                const maturityCalc = calculateCompoundYield(
                  pos.investedAmount,
                  pos.dailyRatePct,
                  pos.maturityDays
                );

                return (
                  <div
                    key={pos.id}
                    className={`rounded-2xl p-3.5 sm:p-4 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${surfaceSubtle}`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#FF6A1A]/15 text-xl flex items-center justify-center shrink-0">
                        {pos.planIcon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black">{pos.planName}</span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FF6A1A]/15 text-[#FF6A1A]">
                            {pos.shares} {pos.shares === 1 ? 'Cota' : 'Cotas'}
                          </span>
                          {canWithdraw ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Unlock className="w-3 h-3" />
                              Saque Liberado ({pos.minWithdrawDays}+ dias)
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Saque libera em {daysLeftToUnlock}{' '}
                              {daysLeftToUnlock === 1 ? 'dia' : 'dias'} (
                              {formatIsoToPtBr(pos.unlockWithdrawDateIso)})
                            </span>
                          )}
                        </div>

                        <div
                          className={`text-[11px] font-semibold mt-1 flex items-center gap-2 flex-wrap ${mutedText}`}
                        >
                          <span>📅 Aplicado: {formatIsoToPtBr(pos.createdAtIso)}</span>
                          <span>·</span>
                          <span>
                            🔓 Liberação Saque (Mín. {pos.minWithdrawDays}d):{' '}
                            <strong className="text-amber-400">
                              {formatIsoToPtBr(pos.unlockWithdrawDateIso)}
                            </strong>
                          </span>
                          <span>·</span>
                          <span>
                            🏁 Vencimento ({pos.maturityDays}d):{' '}
                            <strong className="text-sky-400">
                              {formatIsoToPtBr(pos.maturityDateIso)}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/50 shrink-0">
                      <div className="text-left md:text-right">
                        <div className="text-sm sm:text-base font-black tabular-nums">
                          Aplicado: {fmtBRL(pos.investedAmount)}
                        </div>
                        <div className="text-[11px] font-bold text-emerald-400 tabular-nums">
                          No vencimento: {fmtBRL(maturityCalc.finalAmount)} (+
                          {fmtBRL(maturityCalc.yieldAmount)})
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleWithdrawPosition(pos)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 ${
                          canWithdraw
                            ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                            : 'bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-slate-700'
                        }`}
                      >
                        {canWithdraw ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Sacar</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Carência {pos.minWithdrawDays}d</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* ================= MODAL DE EDIÇÃO COMPLETA DO INVESTIMENTO (EXCLUSIVO ADMIN) ================= */}
      {isAdmin && editingPlan && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setEditingPlan(null)}
        >
          <div
            className={`w-full max-w-2xl rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto shadow-2xl border ${surfaceCard}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FF6A1A] text-black flex items-center justify-center text-lg font-black shrink-0">
                  <Settings2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-black">
                      {isCreatingNewPlan
                        ? 'Criar Novo Card de Investimento (Admin)'
                        : 'Editar Todos os Detalhes do Investimento (Admin)'}
                    </h3>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#FF6A1A]/15 text-[#FF6A1A] border border-[#FF6A1A]/40">
                      Acesso Exclusivo Admin
                    </span>
                  </div>
                  <p className={`text-[11px] ${mutedText}`}>
                    Altere nome, valor da cota, taxas diária/mensal/anual, CDI, prazo de vencimento e carência mínima de saque
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className={`p-1.5 sm:p-2 rounded-xl ${surfaceSubtle} cursor-pointer hover:border-[#FF6A1A]`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdminPlan} className="mt-4 flex flex-col gap-4">
              {/* 1. Identificação, Selo, Ícone e Cor */}
              <div className={`p-3.5 rounded-2xl ${surfaceSubtle} flex flex-col gap-3`}>
                <div className="text-xs font-black uppercase tracking-wider text-[#FF6A1A]">
                  1. Identificação & Visual do Card
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                      Ícone
                    </label>
                    <input
                      type="text"
                      value={editingPlan.icon}
                      onChange={e =>
                        setEditingPlan(prev => (prev ? { ...prev, icon: e.target.value } : null))
                      }
                      className={`w-full px-3 py-2 rounded-xl text-center text-lg font-black outline-none ${inputSurface}`}
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['🛵', '🛠️', '🏆', '💎', '🚀', '💰', '📈', '🛡️'].map(emo => (
                        <button
                          key={emo}
                          type="button"
                          onClick={() =>
                            setEditingPlan(prev => (prev ? { ...prev, icon: emo } : null))
                          }
                          className={`w-6 h-6 rounded-md text-xs flex items-center justify-center cursor-pointer ${
                            editingPlan.icon === emo ? 'bg-[#FF6A1A] text-black' : surfaceCard
                          }`}
                        >
                          {emo}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-9 flex flex-col gap-2.5">
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                        Nome do Fundo / Cota
                      </label>
                      <input
                        type="text"
                        required
                        value={editingPlan.name}
                        onChange={e =>
                          setEditingPlan(prev => (prev ? { ...prev, name: e.target.value } : null))
                        }
                        placeholder="Ex: Fundo Motoboy · Cota Giro Rápido"
                        className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-black outline-none ${inputSurface}`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                          Selo / Etiqueta Superior (Badge)
                        </label>
                        <input
                          type="text"
                          value={editingPlan.badge}
                          onChange={e =>
                            setEditingPlan(prev =>
                              prev ? { ...prev, badge: e.target.value } : null
                            )
                          }
                          placeholder="Ex: Mais Popular · Liquidez Rápida"
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                        />
                      </div>

                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                          Cor do Card
                        </label>
                        <div className="flex items-center gap-1.5">
                          {(Object.keys(THEME_PRESETS) as FundThemeKey[]).map(tKey => {
                            const preset = THEME_PRESETS[tKey];
                            const active = (editingPlan.themeKey || 'orange') === tKey;
                            return (
                              <button
                                key={tKey}
                                type="button"
                                onClick={() =>
                                  setEditingPlan(prev =>
                                    prev ? { ...prev, themeKey: tKey } : null
                                  )
                                }
                                title={preset.label}
                                className={`flex-1 py-2 rounded-xl border flex items-center justify-center gap-1 text-[10px] font-black cursor-pointer ${
                                  active
                                    ? 'border-white bg-white/10'
                                    : 'border-slate-700/60 opacity-60 hover:opacity-100'
                                }`}
                              >
                                <span className={`w-3 h-3 rounded-full ${preset.dotClass}`} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                      Descrição do Investimento
                    </label>
                    <textarea
                      rows={2}
                      value={editingPlan.description}
                      onChange={e =>
                        setEditingPlan(prev =>
                          prev ? { ...prev, description: e.target.value } : null
                        )
                      }
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none resize-none ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                      Recomendado Para (Objetivo do Motoboy)
                    </label>
                    <textarea
                      rows={2}
                      value={editingPlan.recommendedFor}
                      onChange={e =>
                        setEditingPlan(prev =>
                          prev ? { ...prev, recommendedFor: e.target.value } : null
                        )
                      }
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none resize-none ${inputSurface}`}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Valor da Cota & Taxas de Rendimento */}
              <div className={`p-3.5 rounded-2xl ${surfaceSubtle} flex flex-col gap-3`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    2. Valor da Cota & Taxas de Rendimento
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const daily = Number(editingPlan.dailyRatePct) || 0.055;
                      const monthly =
                        Math.round((Math.pow(1 + daily / 100, 30) - 1) * 100 * 100) / 100;
                      const annual =
                        Math.round((Math.pow(1 + daily / 100, 365) - 1) * 100 * 10) / 10;
                      setEditingPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              monthlyRatePct: monthly,
                              annualRatePct: annual,
                            }
                          : null
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black cursor-pointer hover:bg-emerald-500/25"
                  >
                    ⚡ Recalcular Mês/Ano pela Taxa Diária
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>
                      Valor de 1 Cota (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={editingPlan.sharePrice}
                      onChange={e =>
                        setEditingPlan(prev =>
                          prev
                            ? { ...prev, sharePrice: parseFloat(e.target.value) || 0 }
                            : null
                        )
                      }
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-black tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>
                      Rendimento ao Dia (%)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      required
                      value={editingPlan.dailyRatePct}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setEditingPlan(prev => {
                          if (!prev) return null;
                          const daily = isNaN(val) ? 0 : val;
                          if (daily > 0) {
                            const monthly = Math.round((Math.pow(1 + daily / 100, 30) - 1) * 100 * 100) / 100;
                            const annual = Math.round((Math.pow(1 + daily / 100, 365) - 1) * 100 * 10) / 10;
                            return {
                              ...prev,
                              dailyRatePct: daily,
                              monthlyRatePct: monthly,
                              annualRatePct: annual,
                            };
                          }
                          return { ...prev, dailyRatePct: daily };
                        });
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-black tabular-nums text-emerald-400 outline-none ${inputSurface}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold mb-1 text-emerald-400 font-black`}>
                      Rendimento ao Mês (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={editingPlan.monthlyRatePct}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setEditingPlan(prev => {
                          if (!prev) return null;
                          const monthly = isNaN(val) ? 0 : val;
                          if (monthly > 0) {
                            // taxa ao dia equivalente em juros compostos: (1 + i_m)^(1/30) - 1
                            const daily = Math.round((Math.pow(1 + monthly / 100, 1 / 30) - 1) * 100 * 1000) / 1000;
                            // taxa anual equivalente em juros compostos: (1 + i_m)^12 - 1
                            const annual = Math.round((Math.pow(1 + monthly / 100, 12) - 1) * 100 * 10) / 10;
                            return {
                              ...prev,
                              monthlyRatePct: monthly,
                              dailyRatePct: daily,
                              annualRatePct: annual,
                            };
                          }
                          return {
                            ...prev,
                            monthlyRatePct: monthly,
                            dailyRatePct: 0,
                            annualRatePct: 0,
                          };
                        });
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-black tabular-nums text-emerald-400 outline-none border-emerald-500/60 focus:border-emerald-400 ${inputSurface}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>
                      Taxa Anual (% a.a.)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={editingPlan.annualRatePct}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setEditingPlan(prev => (prev ? { ...prev, annualRatePct: isNaN(val) ? 0 : val } : null));
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-black tabular-nums text-emerald-400 outline-none ${inputSurface}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>
                      Equivalência CDI / Benchmark
                    </label>
                    <input
                      type="text"
                      value={editingPlan.cdiEquivalent}
                      onChange={e =>
                        setEditingPlan(prev =>
                          prev ? { ...prev, cdiEquivalent: e.target.value } : null
                        )
                      }
                      placeholder="Ex: 145% do CDI"
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>
                      Mínimo de Cotas por Compra
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingPlan.minShares ?? 1}
                      onChange={e =>
                        setEditingPlan(prev =>
                          prev
                            ? { ...prev, minShares: Math.max(1, parseInt(e.target.value, 10) || 1) }
                            : null
                        )
                      }
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>
                      Máximo de Cotas por Compra
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingPlan.maxShares ?? 1000}
                      onChange={e =>
                        setEditingPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                maxShares: Math.max(1, parseInt(e.target.value, 10) || 1000),
                              }
                            : null
                        )
                      }
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Prazos, Vencimento e Carência de Saque */}
              <div className={`p-3.5 rounded-2xl ${surfaceSubtle} flex flex-col gap-3`}>
                <div className="text-xs font-black uppercase tracking-wider text-sky-400">
                  3. Prazos, Vencimento e Regra de Saque
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>
                      Prazo de Vencimento (em dias)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editingPlan.maturityDays}
                      onChange={e =>
                        setEditingPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                maturityDays: Math.max(1, parseInt(e.target.value, 10) || 30),
                              }
                            : null
                        )
                      }
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-black tabular-nums text-sky-400 outline-none ${inputSurface}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>
                      Data de Vencimento Fixa (Opcional)
                    </label>
                    <input
                      type="date"
                      value={editingPlan.fixedMaturityDate || ''}
                      onChange={e =>
                        setEditingPlan(prev =>
                          prev ? { ...prev, fixedMaturityDate: e.target.value } : null
                        )
                      }
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>
                      Prazo Mínimo p/ Sacar (dias)
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editingPlan.minWithdrawDays}
                      onChange={e =>
                        setEditingPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                minWithdrawDays: Math.max(0, parseInt(e.target.value, 10) || 0),
                              }
                            : null
                        )
                      }
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-black tabular-nums text-amber-400 outline-none ${inputSurface}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>
                    Texto Descritivo da Regra de Liquidez / Saque
                  </label>
                  <input
                    type="text"
                    value={editingPlan.liquidityLabel || ''}
                    onChange={e =>
                      setEditingPlan(prev =>
                        prev ? { ...prev, liquidityLabel: e.target.value } : null
                      )
                    }
                    placeholder="Ex: Saque liberado após 72h do investimento"
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                  />
                </div>
              </div>

              {/* Cards Pequenos e Separados de Prévia de Rendimento (1 Cota) */}
              {(() => {
                const pPrice = Math.max(1, Number(editingPlan.sharePrice) || 25);
                const pDaily = Math.max(0, Number(editingPlan.dailyRatePct) || 0);
                const pMinW = Math.max(0, Number(editingPlan.minWithdrawDays) ?? 0);
                const pMat = Math.max(1, Math.round(Number(editingPlan.maturityDays) || 30));
                const c1 = calculateCompoundYield(pPrice, pDaily, 1);
                const cMin = calculateCompoundYield(pPrice, pDaily, pMinW);
                const c30 = calculateCompoundYield(pPrice, pDaily, 30);
                const cMat = calculateCompoundYield(pPrice, pDaily, pMat);
                return (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Simulação de Rendimento (1 Cota = {fmtBRL(pPrice)})</span>
                      </span>
                      <span className={`text-[10px] font-bold ${mutedText} tabular-nums`}>
                        Juros Compostos ({pDaily.toFixed(3)}%/dia)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {/* Card 1: Cota Unitária */}
                      <div className={`p-2.5 rounded-2xl border flex flex-col justify-between ${surfaceSubtle}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                          Cota Base
                        </span>
                        <div className="text-sm sm:text-base font-black tabular-nums my-1">
                          {fmtBRL(pPrice)}
                        </div>
                        <span className={`text-[10px] font-semibold truncate ${mutedText}`}>
                          Valor por cota
                        </span>
                      </div>

                      {/* Card 2: Rendimento Diário */}
                      <div className="p-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            Por Dia
                          </span>
                          <span className="text-[9px] font-black px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            +{pDaily.toFixed(2)}%
                          </span>
                        </div>
                        <div className="text-sm sm:text-base font-black text-emerald-400 tabular-nums my-1">
                          +{fmtBRL(c1.yieldAmount)}
                        </div>
                        <span className={`text-[10px] font-semibold truncate ${mutedText}`}>
                          A cada 24h
                        </span>
                      </div>

                      {/* Card 3: 1º Saque (Carência) */}
                      <div className="p-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            1º Saque
                          </span>
                          <span className="text-[9px] font-black px-1 py-0.5 rounded bg-amber-500/20 text-amber-300">
                            {pMinW === 0 ? 'Imediato' : `${pMinW}d`}
                          </span>
                        </div>
                        <div className="text-sm sm:text-base font-black text-amber-400 tabular-nums my-1">
                          +{fmtBRL(cMin.yieldAmount)}
                        </div>
                        <span className={`text-[10px] font-semibold truncate ${mutedText}`}>
                          Saldo: {fmtBRL(cMin.finalAmount)}
                        </span>
                      </div>

                      {/* Card 4: 30 Dias */}
                      <div className="p-2.5 rounded-2xl border border-sky-500/30 bg-sky-500/5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                            30 Dias
                          </span>
                          <span className="text-[9px] font-black px-1 py-0.5 rounded bg-sky-500/20 text-sky-300">
                            +{c30.totalPct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-sm sm:text-base font-black text-sky-400 tabular-nums my-1">
                          +{fmtBRL(c30.yieldAmount)}
                        </div>
                        <span className={`text-[10px] font-semibold truncate ${mutedText}`}>
                          Saldo: {fmtBRL(c30.finalAmount)}
                        </span>
                      </div>

                      {/* Card 5: Vencimento */}
                      <div className="col-span-2 sm:col-span-1 p-2.5 rounded-2xl border border-purple-500/30 bg-purple-500/5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                            Vencimento
                          </span>
                          <span className="text-[9px] font-black px-1 py-0.5 rounded bg-purple-500/20 text-purple-300">
                            {pMat}d
                          </span>
                        </div>
                        <div className="text-sm sm:text-base font-black text-purple-400 tabular-nums my-1">
                          +{fmtBRL(cMat.yieldAmount)}
                        </div>
                        <span className={`text-[10px] font-semibold truncate ${mutedText}`}>
                          Total: {fmtBRL(cMat.finalAmount)} (+{cMat.totalPct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Botões do Modal Admin */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
                {!isCreatingNewPlan ? (
                  confirmDeletePlanId === editingPlan.id ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleDeleteAdminPlan(editingPlan.id)}
                        className="px-3 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-black cursor-pointer"
                      >
                        Confirmar Exclusão
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeletePlanId(null)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle}`}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeletePlanId(editingPlan.id)}
                      className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir Card</span>
                    </button>
                  )
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle}`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#FF6A1A] hover:bg-[#ff7b33] text-black text-xs sm:text-sm font-black cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-[#FF6A1A]/20"
                  >
                    <Save className="w-4 h-4 stroke-[2.5]" />
                    <span>Salvar Dados do Investimento</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL ADMIN DE CONFIGURAÇÃO DO QR CODE PIX ================= */}
      {isAdmin && showQrAdminModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowQrAdminModal(false)}
        >
          <div
            className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border ${surfaceCard}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#FF6A1A]" />
                <h3 className="text-sm sm:text-base font-black">
                  Configurar QR Code PIX do Fundo (Admin)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrAdminModal(false)}
                className={`p-1.5 rounded-xl ${surfaceSubtle} cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                  Enviar Imagem do QR Code PIX (PNG/JPG)
                </label>
                <label className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#FF6A1A]/50 bg-[#FF6A1A]/10 text-[#FF6A1A] text-xs font-black cursor-pointer flex items-center justify-center gap-2 hover:bg-[#FF6A1A]/20">
                  <Upload className="w-4 h-4" />
                  <span>Selecionar Imagem do QR Code no Aparelho</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrImageFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                    Nome do Recebedor
                  </label>
                  <input
                    type="text"
                    value={draftQrConfig.recipientName}
                    onChange={e =>
                      setDraftQrConfig(prev => ({ ...prev, recipientName: e.target.value }))
                    }
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                    Instituição / Banco
                  </label>
                  <input
                    type="text"
                    value={draftQrConfig.bankName}
                    onChange={e =>
                      setDraftQrConfig(prev => ({ ...prev, bankName: e.target.value }))
                    }
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                  Chave PIX ou Código PIX Copia e Cola
                </label>
                <textarea
                  rows={2}
                  value={draftQrConfig.pixCopyPasteKey}
                  onChange={e =>
                    setDraftQrConfig(prev => ({ ...prev, pixCopyPasteKey: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono outline-none resize-none ${inputSurface}`}
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowQrAdminModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle}`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    persistGlobalFundConfig(fundPlans, draftQrConfig);
                    setShowQrAdminModal(false);
                    setInvestSuccessBanner('✅ QR Code PIX e dados de recebimento atualizados pelo Admin!');
                  }}
                  className="px-5 py-2 rounded-xl bg-[#FF6A1A] text-black text-xs font-black cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar QR Code PIX</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE INVESTIMENTO COM O QR CODE PIX ================= */}
      {showInvestModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowInvestModal(false)}
        >
          <div
            className={`w-full max-w-xl rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto shadow-2xl border ${surfaceCard}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FF6A1A] text-black flex items-center justify-center text-xl font-black shrink-0">
                  {modalPlan.icon}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm sm:text-base font-black">
                      Investir no {modalPlan.name}
                    </h3>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Depósito via QR Code PIX
                    </span>
                  </div>
                  <p className={`text-[11px] ${mutedText}`}>
                    1 Cota = {fmtBRL(modalPlan.sharePrice)} · Rendimento: {modalPlan.monthlyRatePct}% ao mês · Saque após {modalPlan.minWithdrawDays} dias
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInvestModal(false)}
                className={`p-1.5 sm:p-2 rounded-xl ${surfaceSubtle} cursor-pointer hover:border-[#FF6A1A]`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Seletor de Cota e Valor a Ser Investido */}
            <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`p-3 rounded-2xl ${surfaceSubtle}`}>
                <label className={`block text-[10px] font-bold uppercase ${mutedText}`}>
                  Quantidade de Cotas ({fmtBRL(modalPlan.sharePrice)}/cota)
                </label>
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setModalShares(prev => Math.max(modalPlan.minShares || 1, prev - 1))
                    }
                    className={`p-2 rounded-xl font-black cursor-pointer ${surfaceCard}`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={modalPlan.minShares || 1}
                    max={modalPlan.maxShares || 1000}
                    value={modalShares}
                    onChange={e =>
                      setModalShares(
                        Math.max(
                          modalPlan.minShares || 1,
                          parseInt(e.target.value, 10) || 1
                        )
                      )
                    }
                    className={`w-full px-2 py-1.5 rounded-xl text-center text-base font-black tabular-nums outline-none ${inputSurface}`}
                  />
                  <button
                    type="button"
                    onClick={() => setModalShares(prev => prev + 1)}
                    className={`p-2 rounded-xl font-black cursor-pointer ${surfaceCard}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {[1, 2, 4, 8, 10, 20].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setModalShares(n);
                        setCustomExtraAmount('');
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black cursor-pointer ${
                        modalShares === n && !customExtraAmount
                          ? 'bg-[#FF6A1A] text-black'
                          : surfaceCard
                      }`}
                    >
                      {n}x ({fmtBRL(n * modalPlan.sharePrice)})
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-3 rounded-2xl ${surfaceSubtle} flex flex-col justify-between`}>
                <div>
                  <label className={`block text-[10px] font-bold uppercase ${mutedText}`}>
                    Valor Total a Depositar no QR Code
                  </label>
                  <div className="text-2xl sm:text-3xl font-black text-[#FF6A1A] tabular-nums mt-1">
                    {fmtBRL(modalTotalDeposit)}
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-[10px] font-bold">
                  <div className="flex justify-between">
                    <span className={mutedText}>
                      🔓 Liberação p/ Saque (Mín. {modalPlan.minWithdrawDays}d):
                    </span>
                    <span className="text-amber-400">
                      {formatIsoToPtBr(addDaysToIso(todayIso, modalPlan.minWithdrawDays))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={mutedText}>
                      🏁 Data de Vencimento ({modalPlan.maturityDays}d):
                    </span>
                    <span className="text-sky-400">
                      {modalPlan.fixedMaturityDate && modalPlan.fixedMaturityDate >= todayIso
                        ? formatIsoToPtBr(modalPlan.fixedMaturityDate)
                        : formatIsoToPtBr(addDaysToIso(todayIso, modalPlan.maturityDays))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumo Rápido de Rendimento deste Valor por Tempo */}
            <div className={`mt-3 p-3 rounded-2xl ${surfaceSubtle}`}>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-2">
                📊 Quanto seus {fmtBRL(modalTotalDeposit)} vão render de acordo com o tempo:
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[
                  modalProjectionByTime.find(p => p.days === 3)!,
                  modalProjectionByTime.find(p => p.days === 30)!,
                  modalProjectionByTime.find(p => p.days === 90)!,
                  modalProjectionByTime.find(p => p.days === 180)!,
                ].map(item => (
                  <div
                    key={item.days}
                    className={`p-2 rounded-xl border ${
                      isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="text-[10px] font-black text-[#FF6A1A]">
                      {item.days === 3 ? '3 Dias (Mín.)' : `${item.days} Dias`}
                    </div>
                    <div className="text-xs font-black text-emerald-400 tabular-nums mt-0.5">
                      +{fmtBRL(item.yieldAmount)}
                    </div>
                    <div className={`text-[9px] font-bold tabular-nums ${mutedText}`}>
                      {fmtBRL(item.finalAmount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ÁREA DE QR CODE OU ETAPA DE CONFIRMAÇÃO PRÉVIA */}
            {!isQrCodeGenerated ? (
              /* ETAPA 1: Antes da Confirmação -> QR Code NÃO APARECE */
              <div className="mt-4 flex flex-col gap-3">
                <div className={`w-full p-3 rounded-xl border text-[11px] font-semibold flex items-center justify-between gap-2 ${
                  isDark ? 'bg-slate-900/60 border-slate-800/80 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}>
                  <span className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Carência de Saque:</span>
                  </span>
                  <span className={`font-black ${primaryText}`}>
                    Liberado após {modalPlan.minWithdrawDays} dias
                  </span>
                </div>

                {/* Botões da Etapa 1 */}
                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInvestModal(false)}
                    className={`py-3 px-4 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle}`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestInvestmentConfirmation}
                    className="flex-1 py-3.5 px-4 rounded-xl text-xs sm:text-sm font-black bg-[#FF6A1A] hover:bg-[#ff7b33] text-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#FF6A1A]/20"
                  >
                    <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                    <span>Confirmar Investimento</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ETAPA 2: Depósito registrado como PENDENTE -> QR Code exibido; cotas só liberam após o Admin confirmar */
              <div className="mt-3.5 flex flex-col gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                  <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-black text-amber-300">
                      Solicitação registrada · Aguardando seu PIX
                    </div>
                    <p className={mutedText}>
                      Faça o PIX de <strong>{fmtBRL(modalTotalDeposit)}</strong> abaixo. Suas cotas só serão liberadas depois que o Admin confirmar o recebimento.
                    </p>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border-2 border-[#FF6A1A]/50 flex flex-col items-center text-center ${
                    isDark ? 'bg-[#0b0d13]' : 'bg-orange-50/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-[#FF6A1A]">
                    <QrCode className="w-4 h-4" />
                    <span>Escaneie o QR Code PIX Abaixo para Depositar {fmtBRL(modalTotalDeposit)}</span>
                  </div>
                  <p className={`text-[11px] mt-0.5 max-w-md ${mutedText}`}>
                    Abra o aplicativo do seu banco, escolha <strong>Pagar com QR Code PIX</strong>, aponte a câmera e confirme o valor de{' '}
                    <strong className="text-current">{fmtBRL(modalTotalDeposit)}</strong>.
                  </p>

                  {/* QR Code Image or Crisp SVG */}
                  <div
                    onClick={() => setZoomQrModal(true)}
                    title="Clique para ampliar o QR Code"
                    className="mt-3 p-3 bg-white rounded-2xl shadow-xl border-4 border-white cursor-pointer hover:scale-102 transition-transform"
                  >
                    {qrConfig.customQrImageUrl ? (
                      <img
                        src={qrConfig.customQrImageUrl}
                        alt="QR Code PIX para Depósito do Investimento"
                        className="w-52 h-52 sm:w-60 sm:h-60 object-contain mx-auto select-none"
                      />
                    ) : (
                      <PixQrCodeSvg size={220} />
                    )}
                  </div>

                  <div className="mt-2 text-[11px] font-bold text-slate-400">
                    {qrConfig.recipientName} · {qrConfig.bankName}
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 flex-wrap justify-center">
                    <button
                      type="button"
                      onClick={() => setZoomQrModal(true)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer ${surfaceSubtle} hover:border-[#FF6A1A]`}
                    >
                      🔍 Ampliar QR Code
                    </button>

                    {qrConfig.pixCopyPasteKey && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(qrConfig.pixCopyPasteKey);
                          setCopiedPixKey(true);
                          setTimeout(() => setCopiedPixKey(false), 2500);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer flex items-center gap-1 ${surfaceSubtle} hover:border-[#FF6A1A]`}
                      >
                        {copiedPixKey ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">PIX Copia e Cola Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Código PIX</span>
                          </>
                        )}
                      </button>
                    )}

                    {qrConfig.customQrImageUrl && (
                      <a
                        href={qrConfig.customQrImageUrl}
                        download="qrcode-investimento-motoboy.png"
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer flex items-center gap-1 ${surfaceSubtle} hover:border-[#FF6A1A]`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar QR Code</span>
                      </a>
                    )}
                  </div>

                  <div className="mt-3 w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 font-semibold flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Lembrete: O prazo mínimo para solicitar saque após investir é de{' '}
                      <strong>{modalPlan.minWithdrawDays} dias corridos</strong>.
                    </span>
                  </div>
                </div>

                {/* Botão da Etapa 2: NÃO libera cotas; apenas encerra e aguarda a confirmação do Admin */}
                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleFinishAwaitingAdmin}
                    className="flex-1 py-3.5 px-4 rounded-xl text-xs sm:text-sm font-black bg-[#FF6A1A] hover:bg-[#ff7b33] text-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#FF6A1A]/20"
                  >
                    <Clock className="w-4 h-4 stroke-[2.5]" />
                    <span>Já fiz o PIX · Aguardar confirmação do Admin</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= POP-UP DE CONFIRMAÇÃO DO INVESTIMENTO ================= */}
      {showConfirmPopup && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowConfirmPopup(false)}
        >
          <div
            className={`w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border ${surfaceCard} flex flex-col gap-4 animate-in fade-in duration-150`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FF6A1A]/15 border border-[#FF6A1A]/30 flex items-center justify-center text-[#FF6A1A] shrink-0">
                <AlertCircle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black">
                  Confirmar Investimento?
                </h3>
                <p className={`text-xs ${mutedText}`}>
                  Confirmação prévia para emissão do QR Code PIX
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl ${surfaceSubtle} space-y-2 text-xs`}>
              <div className={`flex justify-between items-center pb-2 border-b ${dividerBorder}`}>
                <span className={mutedText}>Plano Selecionado:</span>
                <span className={`font-black ${primaryText} flex items-center gap-1.5`}>
                  <span>{modalPlan.icon}</span>
                  <span>{modalPlan.name}</span>
                </span>
              </div>
              <div className={`flex justify-between items-center pb-2 border-b ${dividerBorder}`}>
                <span className={mutedText}>Quantidade de Cotas:</span>
                <span className={`font-black ${primaryText}`}>
                  {modalShares} {modalShares === 1 ? 'cota' : 'cotas'} ({fmtBRL(modalPlan.sharePrice)}/cota)
                </span>
              </div>
              <div className={`flex justify-between items-center pb-2 border-b ${dividerBorder}`}>
                <span className={mutedText}>Valor Total a Depositar:</span>
                <span className="text-base font-black text-[#FF6A1A]">
                  {fmtBRL(modalTotalDeposit)}
                </span>
              </div>
              <div className={`flex justify-between items-center pb-2 border-b ${dividerBorder}`}>
                <span className={mutedText}>Rendimento Mensal:</span>
                <span className="font-black text-emerald-500 dark:text-emerald-400">
                  {modalPlan.monthlyRatePct}% ao mês
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={mutedText}>Carência Mínima p/ Saque:</span>
                <span className="font-bold text-amber-500 dark:text-amber-400">
                  {modalPlan.minWithdrawDays} dias
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowConfirmPopup(false)}
                className={`py-3 px-4 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle}`}
              >
                Não, Voltar
              </button>
              <button
                type="button"
                onClick={handleProceedWithInvestmentConfirmation}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-black bg-[#FF6A1A] hover:bg-[#ff7b33] text-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#FF6A1A]/20"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Sim, Confirmar Investimento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= POP-UP DE CONFIRMAÇÃO DE RESGATE / SAQUE ================= */}
      {withdrawingPosition && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setWithdrawingPosition(null)}
        >
          <div
            className={`w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border ${surfaceCard} flex flex-col gap-4 animate-in fade-in duration-150`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black">
                  Confirmar Solicitação de Resgate?
                </h3>
                <p className={`text-xs ${mutedText}`}>
                  Resgate das cotas e envio de notificação ao Admin
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl ${surfaceSubtle} space-y-2 text-xs`}>
              <div className={`flex justify-between items-center pb-2 border-b ${dividerBorder}`}>
                <span className={mutedText}>Plano:</span>
                <span className={`font-black ${primaryText} flex items-center gap-1.5`}>
                  <span>{withdrawingPosition.planIcon}</span>
                  <span>{withdrawingPosition.planName}</span>
                </span>
              </div>
              <div className={`flex justify-between items-center pb-2 border-b ${dividerBorder}`}>
                <span className={mutedText}>Cotas a Resgatar:</span>
                <span className={`font-black ${primaryText}`}>
                  {withdrawingPosition.shares} cotas
                </span>
              </div>
              <div className={`flex justify-between items-center pb-2 border-b ${dividerBorder}`}>
                <span className={mutedText}>Valor Original Investido:</span>
                <span className="font-black text-[#FF6A1A]">
                  {fmtBRL(withdrawingPosition.investedAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={mutedText}>Data de Início da Aplicação:</span>
                <span className={`font-bold ${secondaryText}`}>
                  {formatIsoToPtBr(withdrawingPosition.createdAtIso)}
                </span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-[11px] ${
              isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}>
              <BellRing className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <span>
                <strong>Aviso de Alta Prioridade:</strong> Ao confirmar, uma <strong>notificação imediata de resgate será enviada ao administrador</strong> para processar a transferência do valor para você.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <button
                type="button"
                onClick={() => setWithdrawingPosition(null)}
                className={`py-3 px-4 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmWithdrawal}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-black bg-rose-500 hover:bg-rose-400 text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
              >
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                <span>Sim, Confirmar Resgate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ZOOM DO QR CODE EM TELA CHEIA */}
      {zoomQrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setZoomQrModal(false)}
        >
          <div
            className="bg-white p-5 rounded-3xl shadow-2xl max-w-sm w-full flex flex-col items-center gap-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-slate-900 font-black text-sm text-center">
              QR Code Oficial · Depósito de {fmtBRL(modalTotalDeposit)}
            </div>
            {qrConfig.customQrImageUrl ? (
              <img
                src={qrConfig.customQrImageUrl}
                alt="QR Code PIX Ampliado"
                className="w-72 h-72 sm:w-80 sm:h-80 object-contain"
              />
            ) : (
              <PixQrCodeSvg size={280} />
            )}
            <button
              type="button"
              onClick={() => setZoomQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black cursor-pointer"
            >
              Fechar Zoom
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MODAL DE INVESTIMENTOS ATIVOS & DETALHAMENTO DO VALOR POR CADA FUNDO */}
      {/* ========================================================================= */}
      {showActiveInvestmentsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowActiveInvestmentsModal(false)}
        >
          <div
            className={`w-full max-w-3xl rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto shadow-2xl border flex flex-col gap-4 animate-in fade-in duration-200 ${surfaceCard}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-start justify-between gap-3 pb-3 border-b ${borderSubtle}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FF6A1A]/15 text-[#FF6A1A] flex items-center justify-center shrink-0">
                  <Wallet className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`text-base sm:text-lg font-black ${primaryText}`}>
                      Meus Investimentos Ativos
                    </h3>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                      isDark ? 'bg-[#FF6A1A]/20 text-[#FF6A1A] border-[#FF6A1A]/30' : 'bg-orange-100 text-orange-950 border-orange-200'
                    }`}>
                      {portfolioStats.totalShares}{' '}
                      {portfolioStats.totalShares === 1 ? 'Cota Ativa' : 'Cotas Ativas'}
                    </span>
                  </div>
                  <p className={`text-xs ${mutedText}`}>
                    Detalhamento do valor investido em cada fundo, rendimentos e posições ativas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowActiveInvestmentsModal(false)}
                className={`p-1.5 sm:p-2 rounded-xl ${surfaceSubtle} cursor-pointer hover:border-[#FF6A1A]`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resumo Consolidado no Topo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className={`p-3 rounded-2xl ${surfaceSubtle}`}>
                <span className={`text-[10px] font-bold uppercase block ${mutedText}`}>
                  Total Investido
                </span>
                <span className={`text-base sm:text-lg font-black tabular-nums ${primaryText}`}>
                  {fmtBRL(portfolioStats.totalInvested)}
                </span>
              </div>
              <div className={`p-3 rounded-2xl ${surfaceSubtle}`}>
                <span className={`text-[10px] font-bold uppercase block ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  Lucro Acumulado
                </span>
                <span className={`text-base sm:text-lg font-black tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  + {fmtBRL(portfolioStats.currentYield)}
                </span>
              </div>
              <div className={`p-3 rounded-2xl ${surfaceSubtle}`}>
                <span className="text-[10px] font-bold uppercase block text-[#FF6A1A]">
                  Patrimônio Atual
                </span>
                <span className="text-base sm:text-lg font-black text-[#FF6A1A] tabular-nums">
                  {fmtBRL(portfolioStats.totalPatrimony)}
                </span>
              </div>
              <div className={`p-3 rounded-2xl ${surfaceSubtle}`}>
                <span className={`text-[10px] font-bold uppercase block ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                  Liberado p/ Saque
                </span>
                <span className={`text-base sm:text-lg font-black tabular-nums ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                  {fmtBRL(portfolioStats.availableToWithdraw)}
                </span>
              </div>
            </div>

            {/* SEÇÃO 1: VALOR INVESTIDO EM CADA FUNDO */}
            <div className="flex flex-col gap-2.5 mt-1">
              <div className="flex items-center justify-between">
                <h4 className={`text-xs sm:text-sm font-black flex items-center gap-1.5 ${primaryText}`}>
                  <PieChart className="w-4 h-4 text-[#FF6A1A]" />
                  <span>Valor Investido em Cada Fundo</span>
                </h4>
                <span className={`text-[11px] font-semibold ${mutedText}`}>
                  {fundInvestmentsBreakdown.length}{' '}
                  {fundInvestmentsBreakdown.length === 1 ? 'fundo com cotas' : 'fundos com cotas'}
                </span>
              </div>

              {fundInvestmentsBreakdown.length === 0 ? (
                <div className={`p-4 rounded-2xl text-center text-xs ${surfaceSubtle} ${mutedText}`}>
                  <p className={`font-bold ${primaryText}`}>Você ainda não possui cotas ativas no Fundo Motoboy.</p>
                  <p className="text-[11px] mt-1">
                    Escolha um dos fundos abaixo para aplicar e começar a receber rendimentos diários.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowActiveInvestmentsModal(false);
                      openBuySharesModal(fundPlans[0] || DEFAULT_MOTOBOY_FUND_PLANS[0], 2);
                    }}
                    className="mt-3 px-4 py-2 rounded-xl text-xs font-black bg-[#FF6A1A] text-black hover:bg-[#ff7b33] cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Investir nas Primeiras Cotas</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fundInvestmentsBreakdown.map(fund => {
                    const sharePct =
                      portfolioStats.totalPatrimony > 0
                        ? Math.round((fund.totalPatrimony / portfolioStats.totalPatrimony) * 100)
                        : 0;
                    return (
                      <div
                        key={fund.planId}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${surfaceSubtle} ${
                          isDark ? 'border-slate-700/60 hover:border-[#FF6A1A]/50' : 'border-slate-300 hover:border-[#FF6A1A] shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-2xl">{fund.planIcon}</span>
                            <div className="min-w-0">
                              <div className={`text-xs sm:text-sm font-black truncate ${primaryText}`}>
                                {fund.planName}
                              </div>
                              <div className={`text-[10px] font-semibold ${mutedText}`}>
                                {fund.totalShares} {fund.totalShares === 1 ? 'cota ativa' : 'cotas ativas'} · {sharePct}% da carteira
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bloco de Valores Investidos e Rendimento */}
                        <div className={`mt-3 pt-2.5 border-t ${dividerBorder} grid grid-cols-2 gap-2 text-xs`}>
                          <div>
                            <span className={`text-[10px] uppercase font-bold block ${mutedText}`}>
                              Valor Investido no Fundo:
                            </span>
                            <span className={`text-sm font-black tabular-nums ${primaryText}`}>
                              {fmtBRL(fund.totalInvested)}
                            </span>
                          </div>
                          <div>
                            <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                              Rendimento Gerado:
                            </span>
                            <span className={`text-sm font-black tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                              + {fmtBRL(fund.currentYield)}
                            </span>
                          </div>
                        </div>

                        <div className={`mt-2.5 pt-2 border-t ${dividerBorder} flex items-center justify-between text-[11px] font-semibold`}>
                          <span className={mutedText}>Saldo Total Acumulado:</span>
                          <span className="text-xs font-black text-[#FF6A1A] tabular-nums">
                            {fmtBRL(fund.totalPatrimony)}
                          </span>
                        </div>

                        {/* Status de Saque e Carência */}
                        <div className={`mt-2 pt-2 border-t ${dividerBorder} flex items-center justify-between text-[10px]`}>
                          {fund.eligibleShares > 0 ? (
                            <span className={`font-bold flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                              <Unlock className="w-3 h-3" />
                              {fund.eligibleShares} {fund.eligibleShares === 1 ? 'cota liberada' : 'cotas liberadas'} ({fmtBRL(fund.eligibleAmount)})
                            </span>
                          ) : (
                            <span className={`font-bold flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                              <Lock className="w-3 h-3" />
                              Em carência de 72h
                            </span>
                          )}

                          {fund.eligibleShares > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowActiveInvestmentsModal(false);
                                setWithdrawTargetId(fund.positions[0]?.id || 'all_eligible');
                                setWithdrawReceipt(null);
                                setWithdrawError(null);
                                setShowWithdrawalModal(true);
                              }}
                              className={`px-2 py-0.5 rounded font-black cursor-pointer transition-colors ${
                                isDark ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                              }`}
                            >
                              Sacar deste fundo ↗
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SEÇÃO 2: LISTA DETALHADA DE TODAS AS APLICAÇÕES ATIVAS */}
            {positions.filter(p => p.status === 'active').length > 0 && (
              <div className="flex flex-col gap-2.5 mt-2">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs sm:text-sm font-black flex items-center gap-1.5 ${primaryText}`}>
                    <Coins className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
                    <span>Todas as Aplicações Individuais em Andamento</span>
                  </h4>
                  <span className={`text-[11px] ${mutedText}`}>
                    {positions.filter(p => p.status === 'active').length} aplicações
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {positions
                    .filter(p => p.status === 'active')
                    .map(pos => {
                      const elapsed = diffDaysBetweenIso(pos.createdAtIso, todayIso);
                      const canWithdraw = elapsed >= pos.minWithdrawDays;
                      const daysLeft = Math.max(0, pos.minWithdrawDays - elapsed);
                      const { yieldAmount, finalAmount } = calculateCompoundYield(
                        pos.investedAmount,
                        pos.dailyRatePct,
                        Math.max(1, elapsed)
                      );
                      const matCalc = calculateCompoundYield(
                        pos.investedAmount,
                        pos.dailyRatePct,
                        pos.maturityDays
                      );

                      return (
                        <div
                          key={pos.id}
                          className={`p-3 rounded-2xl border ${surfaceSubtle} ${dividerBorder} flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="text-2xl mt-0.5">{pos.planIcon}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-black ${primaryText}`}>{pos.planName}</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                  isDark ? 'bg-[#FF6A1A]/15 text-[#FF6A1A]' : 'bg-orange-100 text-orange-950 border border-orange-200'
                                }`}>
                                  {pos.shares} {pos.shares === 1 ? 'Cota' : 'Cotas'}
                                </span>
                                {canWithdraw ? (
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border flex items-center gap-1 ${
                                    isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  }`}>
                                    <Unlock className="w-3 h-3" />
                                    Liberado para Saque
                                  </span>
                                ) : (
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border flex items-center gap-1 ${
                                    isDark ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-900 border-amber-300'
                                  }`}>
                                    <Lock className="w-3 h-3" />
                                    Carência: libera em {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
                                  </span>
                                )}
                              </div>

                              <div className={`text-[11px] font-semibold mt-1 flex items-center gap-2 flex-wrap ${mutedText}`}>
                                <span>📅 Início: {formatIsoToPtBr(pos.createdAtIso)}</span>
                                <span>·</span>
                                <span>🔓 Liberação Saque: <strong className={isDark ? 'text-amber-400' : 'text-amber-700'}>{formatIsoToPtBr(pos.unlockWithdrawDateIso)}</strong></span>
                                <span>·</span>
                                <span>🏁 Vencimento ({pos.maturityDays}d): <strong className={isDark ? 'text-sky-400' : 'text-sky-700'}>{formatIsoToPtBr(pos.maturityDateIso)}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className={`flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 ${dividerBorder} shrink-0`}>
                            <div className="text-left md:text-right">
                              <div className={`font-bold ${secondaryText}`}>
                                Aplicado: {fmtBRL(pos.investedAmount)}
                              </div>
                              <div className={`text-[11px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                Acumulado hoje: {fmtBRL(finalAmount)} (+{fmtBRL(yieldAmount)})
                              </div>
                              <div className={`text-[10px] ${mutedText}`}>
                                No vencimento: {fmtBRL(matCalc.finalAmount)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setShowActiveInvestmentsModal(false);
                                if (canWithdraw) {
                                  setWithdrawTargetId(pos.id);
                                  setWithdrawReceipt(null);
                                  setWithdrawError(null);
                                  setShowWithdrawalModal(true);
                                } else {
                                  handleWithdrawPosition(pos);
                                }
                              }}
                              className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-1 ${
                                canWithdraw
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/20'
                                  : isDark
                                  ? 'bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-slate-700'
                                  : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                              }`}
                            >
                              {canWithdraw ? (
                                <>
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Sacar</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Carência {pos.minWithdrawDays}d</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Ações do Rodapé do Modal */}
            <div className={`flex flex-col sm:flex-row gap-2.5 pt-3 border-t ${borderSubtle}`}>
              <button
                type="button"
                onClick={() => {
                  setShowActiveInvestmentsModal(false);
                  setWithdrawTargetId('all_eligible');
                  setWithdrawReceipt(null);
                  setWithdrawError(null);
                  setShowWithdrawalModal(true);
                }}
                disabled={portfolioStats.availableToWithdraw <= 0}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  portfolioStats.availableToWithdraw > 0
                    ? 'bg-sky-500 hover:bg-sky-400 text-black shadow-lg shadow-sky-500/20'
                    : isDark
                    ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-slate-700/50'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
              >
                <Unlock className="w-4 h-4" />
                <span>
                  {portfolioStats.availableToWithdraw > 0
                    ? `Solicitar Resgate / Saque (${fmtBRL(portfolioStats.availableToWithdraw)})`
                    : 'Nenhuma Cota Liberada para Saque'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowActiveInvestmentsModal(false);
                  openBuySharesModal(fundPlans[0] || DEFAULT_MOTOBOY_FUND_PLANS[0], 2);
                }}
                className="py-3 px-4 rounded-xl text-xs font-black bg-[#FF6A1A] hover:bg-[#ff7b33] text-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-[#FF6A1A]/20"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Investir em Novas Cotas</span>
              </button>

              <button
                type="button"
                onClick={() => setShowActiveInvestmentsModal(false)}
                className={`py-3 px-4 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle} hover:border-slate-400 ${secondaryText}`}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MODAL DE RENDIMENTOS & PROJEÇÃO FUTURA (ONE-CLICK NO CARD DE RENDIMENTO) */}
      {/* ========================================================================= */}
      {showYieldBreakdownModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowYieldBreakdownModal(false)}
        >
          <div
            className={`w-full max-w-2xl rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto shadow-2xl border flex flex-col gap-4 animate-in fade-in duration-200 ${surfaceCard}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-start justify-between gap-3 pb-3 border-b ${borderSubtle}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg font-black ${primaryText}`}>
                    Extrato de Rendimentos & Projeções
                  </h3>
                  <p className={`text-xs ${mutedText}`}>
                    Acompanhe o ganho diário composto e a estimativa no vencimento das suas cotas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowYieldBreakdownModal(false)}
                className={`p-1.5 sm:p-2 rounded-xl ${surfaceSubtle} cursor-pointer hover:border-emerald-500`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className={`p-3.5 rounded-2xl border ${surfaceSubtle} ${isDark ? 'border-emerald-500/30' : 'border-emerald-200 shadow-xs'}`}>
                <span className={`text-[10px] font-bold uppercase block ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  Rendimento Hoje (Acumulado)
                </span>
                <div className={`text-xl font-black tabular-nums mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  + {fmtBRL(portfolioStats.currentYield)}
                </div>
                <span className={`text-[10px] block mt-0.5 ${mutedText}`}>
                  Incidência diária sobre o principal
                </span>
              </div>

              <div className={`p-3.5 rounded-2xl border ${surfaceSubtle} ${isDark ? 'border-sky-500/30' : 'border-sky-200 shadow-xs'}`}>
                <span className={`text-[10px] font-bold uppercase block ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                  Projeção no Vencimento
                </span>
                <div className={`text-xl font-black tabular-nums mt-1 ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                  + {fmtBRL(portfolioStats.projectedMaturityYield)}
                </div>
                <span className={`text-[10px] block mt-0.5 ${mutedText}`}>
                  Total final estimado:{' '}
                  {fmtBRL(portfolioStats.totalInvested + portfolioStats.projectedMaturityYield)}
                </span>
              </div>

              <div className={`p-3.5 rounded-2xl border ${surfaceSubtle} ${isDark ? 'border-[#FF6A1A]/30' : 'border-orange-200 shadow-xs'}`}>
                <span className="text-[10px] font-bold text-[#FF6A1A] uppercase block">
                  Equivalente ao CDI
                </span>
                <div className="text-xl font-black text-[#FF6A1A] tabular-nums mt-1">
                  145% a 210%
                </div>
                <span className={`text-[10px] block mt-0.5 ${mutedText}`}>
                  Mais que o dobro da Poupança
                </span>
              </div>
            </div>

            {/* Como é calculado o rendimento */}
            <div className={`p-3.5 rounded-2xl ${surfaceSubtle} border ${borderSubtle} text-xs space-y-2`}>
              <div className={`font-black flex items-center gap-1.5 ${primaryText}`}>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Como funciona a fórmula de juros diários</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${mutedText}`}>
                O Fundo Motoboy remunera as cotas com <strong>juros compostos creditados diariamente</strong>.
                Diferente de bancos tradicionais que só pagam após 30 dias (aniversário da poupança), no Fundo Motoboy seu saldo cresce a cada 24 horas, inclusive em sábados, domingos e feriados.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <div className={`text-[10px] ${mutedText}`}>Poupança Tradicional</div>
                  <div className={`text-xs font-bold mt-0.5 ${secondaryText}`}>~0,55% /mês</div>
                </div>
                <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <div className={`text-[10px] ${mutedText}`}>CDI de Banco 100%</div>
                  <div className={`text-xs font-bold mt-0.5 ${secondaryText}`}>~0,85% /mês</div>
                </div>
                <div className={`p-2 rounded-xl border ${isDark ? 'bg-emerald-500/15 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300'}`}>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>Fundo Motoboy</div>
                  <div className={`text-xs font-black mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>1,65% a 2,48% /mês</div>
                </div>
              </div>
            </div>

            {/* Tabela de Fundos Ativos e Rendimentos */}
            {fundInvestmentsBreakdown.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className={`text-xs font-black uppercase tracking-wider ${primaryText}`}>
                  Rendimentos Acumulados por Fundo Ativo
                </h4>
                <div className="flex flex-col gap-2">
                  {fundInvestmentsBreakdown.map(fund => {
                    return (
                      <div
                        key={fund.planId}
                        className={`p-3 rounded-xl border ${surfaceSubtle} ${dividerBorder} flex items-center justify-between gap-3 text-xs`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{fund.planIcon}</span>
                          <div>
                            <div className={`font-black ${primaryText}`}>{fund.planName}</div>
                            <div className={`text-[10px] ${mutedText}`}>
                              {fund.totalShares} cotas · Aplicado: {fmtBRL(fund.totalInvested)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-black tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            + {fmtBRL(fund.currentYield)}
                          </div>
                          <div className={`text-[10px] font-semibold ${secondaryText}`}>
                            Total: {fmtBRL(fund.totalPatrimony)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botão de Fechar */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowYieldBreakdownModal(false)}
                className="w-full py-3 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-black transition-all cursor-pointer"
              >
                Entendido / Fechar Extrato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL DE SOLICITAÇÃO DE RESGATE / SAQUE VIA PIX (ONE-CLICK NO CARD SAQUE) */}
      {/* ========================================================================= */}
      {showWithdrawalModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowWithdrawalModal(false)}
        >
          <div
            className={`w-full max-w-xl rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto shadow-2xl border flex flex-col gap-4 animate-in fade-in duration-200 ${surfaceCard}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-start justify-between gap-3 pb-3 border-b ${borderSubtle}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                  <Unlock className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg font-black ${primaryText}`}>
                    Solicitação de Resgate de Investimentos (Saque)
                  </h3>
                  <p className={`text-xs ${mutedText}`}>
                    Resgate suas cotas liberadas e receba via PIX na sua conta bancária
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawalModal(false)}
                className={`p-1.5 sm:p-2 rounded-xl ${surfaceSubtle} cursor-pointer hover:border-sky-500`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SE RESGATE FOI CONCLUÍDO: COMPROVANTE */}
            {withdrawReceipt ? (
              <div className="flex flex-col gap-3 py-2 animate-in zoom-in-95 duration-200">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 text-center flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center text-xl font-black">
                    <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className={`text-base font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      Solicitação de Resgate Enviada ao Administrador!
                    </h4>
                    <p className={`text-xs mt-1 ${mutedText}`}>
                      Protocolo: <strong className={primaryText}>{withdrawReceipt.id}</strong> · {withdrawReceipt.date}
                    </p>
                  </div>
                </div>

                {/* Detalhes do comprovante */}
                <div className={`p-4 rounded-2xl ${surfaceSubtle} space-y-2.5 text-xs`}>
                  <div className={`flex justify-between items-center pb-2 border-b ${dividerBorder}`}>
                    <span className={mutedText}>Valor Total a Receber via PIX:</span>
                    <span className={`text-base font-black tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      {fmtBRL(withdrawReceipt.amount)}
                    </span>
                  </div>
                  <div className={`flex justify-between items-center pb-2 border-b ${dividerBorder}`}>
                    <span className={mutedText}>Quantidade de Cotas Resgatadas:</span>
                    <span className={`font-black ${primaryText}`}>
                      {withdrawReceipt.shares} {withdrawReceipt.shares === 1 ? 'cota' : 'cotas'}
                    </span>
                  </div>
                  <div className={`flex justify-between items-center pb-2 border-b ${dividerBorder}`}>
                    <span className={mutedText}>Chave PIX de Recebimento:</span>
                    <span className="font-mono font-black text-[#FF6A1A]">
                      {withdrawReceipt.pixKey} ({withdrawReceipt.pixType.toUpperCase()})
                    </span>
                  </div>
                  <div className={`flex justify-between items-center pb-2 border-b ${dividerBorder}`}>
                    <span className={mutedText}>Titular da Conta:</span>
                    <span className={`font-bold ${secondaryText}`}>{withdrawReceipt.holder}</span>
                  </div>
                  <div className={`flex justify-between items-center pb-2 border-b ${dividerBorder}`}>
                    <span className={mutedText}>Banco / Instituição:</span>
                    <span className={`font-bold ${secondaryText}`}>{withdrawReceipt.bank}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={mutedText}>Previsão de Pagamento:</span>
                    <span className={`font-black ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>Até 24h úteis (D+0/D+1)</span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-[11px] ${
                  isDark ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' : 'bg-sky-50 border-sky-300 text-sky-900'
                }`}>
                  <BellRing className={`w-4 h-4 shrink-0 mt-0.5 animate-pulse ${isDark ? 'text-sky-400' : 'text-sky-700'}`} />
                  <span>
                    O Administrador recebeu uma notificação prioritária no sistema. O comprovante PIX ficará disponível assim que a transferência for efetivada.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowWithdrawalModal(false)}
                  className="w-full py-3 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-black transition-all cursor-pointer mt-1"
                >
                  Concluir / Fechar
                </button>
              </div>
            ) : (
              /* FORMULÁRIO DE SOLICITAÇÃO DE RESGATE */
              <form onSubmit={handleExecuteDedicatedWithdrawal} className="flex flex-col gap-3.5">
                {/* Banner de Saldo Disponível */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className={`p-3 rounded-2xl border ${surfaceSubtle} ${isDark ? 'border-sky-500/40' : 'border-sky-300 shadow-xs'}`}>
                    <span className={`text-[10px] font-bold uppercase block ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                      Disponível para Saque
                    </span>
                    <span className={`text-lg font-black tabular-nums ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                      {fmtBRL(portfolioStats.availableToWithdraw)}
                    </span>
                    <span className={`text-[10px] block ${mutedText}`}>Carência cumprida</span>
                  </div>

                  <div className={`p-3 rounded-2xl border ${surfaceSubtle} ${isDark ? 'border-amber-500/40' : 'border-amber-300 shadow-xs'}`}>
                    <span className={`text-[10px] font-bold uppercase block ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      Em Carência de 72h
                    </span>
                    <span className={`text-lg font-black tabular-nums ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      {fmtBRL(portfolioStats.lockedInGracePeriod)}
                    </span>
                    <span className={`text-[10px] block ${mutedText}`}>Bloqueado temporariamente</span>
                  </div>
                </div>

                {portfolioStats.availableToWithdraw <= 0 ? (
                  <div className={`p-4 rounded-2xl border text-center ${surfaceSubtle} space-y-2 ${
                    isDark ? 'border-amber-500/40' : 'border-amber-300'
                  }`}>
                    <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto text-lg">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className={`text-xs font-black ${primaryText}`}>
                      Você ainda não tem cotas com carência cumprida para saque imediato.
                    </div>
                    <p className={`text-[11px] max-w-sm mx-auto ${mutedText}`}>
                      Cada cota comprada possui um prazo de carência mínima de <strong>3 dias (72 horas)</strong> para alocação dos rendimentos. Assim que esse prazo terminar, o botão de resgate será liberado.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowWithdrawalModal(false);
                        setShowFundRulesModal(true);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer mt-1 ${
                        isDark ? 'text-amber-400 border-amber-500/40 hover:bg-amber-500/10' : 'text-amber-800 border-amber-300 hover:bg-amber-100 bg-white shadow-xs'
                      }`}
                    >
                      Ver Regras de Liquidez e Prazos ↗
                    </button>
                  </div>
                ) : (
                  <>
                    {/* 1. SELEÇÃO DE COTAS A RESGATAR */}
                    <div className={`p-3.5 rounded-2xl ${surfaceSubtle} flex flex-col gap-2.5`}>
                      <label className={`text-xs font-black flex items-center gap-1.5 ${primaryText}`}>
                        <Wallet className="w-4 h-4 text-[#FF6A1A]" />
                        <span>1. Selecione o que deseja resgatar</span>
                      </label>

                      <div className="flex flex-col gap-2">
                        {/* Opção Resgatar Tudo */}
                        <label
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            withdrawTargetId === 'all_eligible'
                              ? isDark
                                ? 'bg-sky-500/15 border-sky-500'
                                : 'bg-sky-50 border-sky-500 shadow-xs'
                              : isDark
                              ? 'border-slate-700/60 hover:border-slate-600'
                              : 'border-slate-300 hover:border-slate-400 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="withdrawTarget"
                              checked={withdrawTargetId === 'all_eligible'}
                              onChange={() => setWithdrawTargetId('all_eligible')}
                              className="accent-sky-500"
                            />
                            <div>
                              <div className={`text-xs font-black ${primaryText}`}>
                                Resgatar TODAS as Cotas Liberadas
                              </div>
                              <div className={`text-[10px] ${mutedText}`}>
                                Saque total do saldo liberado da sua carteira
                              </div>
                            </div>
                          </div>
                          <span className={`text-xs font-black tabular-nums ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                            {fmtBRL(portfolioStats.availableToWithdraw)}
                          </span>
                        </label>

                        {/* Cotas individuais liberadas */}
                        {positions
                          .filter(
                            p =>
                              p.status === 'active' &&
                              diffDaysBetweenIso(p.createdAtIso, todayIso) >= p.minWithdrawDays
                          )
                          .map(pos => {
                            const elapsed = Math.max(1, diffDaysBetweenIso(pos.createdAtIso, todayIso));
                            const { finalAmount, yieldAmount } = calculateCompoundYield(
                              pos.investedAmount,
                              pos.dailyRatePct,
                              elapsed
                            );
                            const isSelected = withdrawTargetId === pos.id;

                            return (
                              <label
                                key={pos.id}
                                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                  isSelected
                                    ? isDark
                                      ? 'bg-sky-500/15 border-sky-500'
                                      : 'bg-sky-50 border-sky-500 shadow-xs'
                                    : isDark
                                    ? 'border-slate-700/60 hover:border-slate-600'
                                    : 'border-slate-300 hover:border-slate-400 bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="radio"
                                    name="withdrawTarget"
                                    checked={isSelected}
                                    onChange={() => setWithdrawTargetId(pos.id)}
                                    className="accent-sky-500"
                                  />
                                  <div>
                                    <div className={`text-xs font-black flex items-center gap-1.5 ${primaryText}`}>
                                      <span>{pos.planIcon}</span>
                                      <span>{pos.planName}</span>
                                      <span className={`text-[10px] px-1.5 py-0.2 rounded ${
                                        isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                                      }`}>
                                        {pos.shares} {pos.shares === 1 ? 'cota' : 'cotas'}
                                      </span>
                                    </div>
                                    <div className={`text-[10px] ${mutedText}`}>
                                      Aplicado: {fmtBRL(pos.investedAmount)} · Lucro: +{fmtBRL(yieldAmount)}
                                    </div>
                                  </div>
                                </div>
                                <span className={`text-xs font-black tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                  {fmtBRL(finalAmount)}
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    </div>

                    {/* 2. CHAVE PIX DE DESTINO */}
                    <div className={`p-3.5 rounded-2xl ${surfaceSubtle} flex flex-col gap-2.5`}>
                      <label className={`text-xs font-black flex items-center gap-1.5 ${primaryText}`}>
                        <QrCode className="w-4 h-4 text-[#FF6A1A]" />
                        <span>2. Onde deseja receber seu PIX?</span>
                      </label>

                      {/* Tipo de chave */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 'cpf', label: 'CPF/CNPJ' },
                          { id: 'celular', label: 'Celular' },
                          { id: 'email', label: 'E-mail' },
                          { id: 'aleatoria', label: 'Aleatória' },
                        ].map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setWithdrawPixType(t.id as any)}
                            className={`py-1.5 text-[11px] font-bold rounded-xl border cursor-pointer transition-all ${
                              withdrawPixType === t.id
                                ? isDark
                                  ? 'bg-sky-500 text-black border-sky-400'
                                  : 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                : isDark
                                ? 'border-slate-700/60 text-slate-300 hover:border-slate-500'
                                : 'border-slate-300 text-slate-700 hover:border-slate-400 bg-white shadow-xs'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {/* Input da Chave */}
                      <div>
                        <input
                          type="text"
                          required
                          value={withdrawPixKeyInput}
                          onChange={e => setWithdrawPixKeyInput(e.target.value)}
                          placeholder={
                            withdrawPixType === 'cpf'
                              ? 'Digite seu CPF (apenas números)'
                              : withdrawPixType === 'celular'
                              ? 'Digite seu celular com DDD (ex: 11999998888)'
                              : withdrawPixType === 'email'
                              ? 'Digite seu e-mail do PIX'
                              : 'Cole a chave aleatória EVP'
                          }
                          className={`w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold outline-none ${inputSurface}`}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        <div>
                          <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>
                            Nome do Titular da Conta
                          </label>
                          <input
                            type="text"
                            value={withdrawAccountHolder}
                            onChange={e => setWithdrawAccountHolder(e.target.value)}
                            placeholder="Seu nome completo"
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>
                            Banco / Instituição (Opcional)
                          </label>
                          <input
                            type="text"
                            value={withdrawBankName}
                            onChange={e => setWithdrawBankName(e.target.value)}
                            placeholder="Ex: Nubank, Inter, Caixa..."
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Alerta de erro se houver */}
                    {withdrawError && (
                      <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>{withdrawError}</span>
                      </div>
                    )}

                    {/* Aviso de Confirmação & Alta Prioridade */}
                    <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-[11px] ${
                      isDark ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' : 'bg-sky-50 border-sky-300 text-sky-900'
                    }`}>
                      <BellRing className={`w-4 h-4 shrink-0 mt-0.5 animate-pulse ${isDark ? 'text-sky-400' : 'text-sky-700'}`} />
                      <span>
                        <strong>Aviso de Notificação Instantânea:</strong> Ao enviar, o <strong>Administrador recebe um alerta prioritário imediato</strong> com sua chave PIX para efetuar o pagamento.
                      </span>
                    </div>

                    {/* Botões do Formulário */}
                    <div className="flex flex-col sm:flex-row gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setShowWithdrawalModal(false)}
                        className={`py-3 px-4 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle} ${secondaryText}`}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3 px-4 rounded-xl text-xs font-black bg-sky-500 hover:bg-sky-400 text-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
                      >
                        <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                        <span>Confirmar Solicitação de Resgate PIX</span>
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL / TELA DE REGRAS DO FUNDO, SAQUE & LIQUIDEZ (ONE-CLICK NO CARD 4) */}
      {/* ========================================================================= */}
      {showFundRulesModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowFundRulesModal(false)}
        >
          <div
            className={`w-full max-w-3xl rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto shadow-2xl border flex flex-col gap-4 animate-in fade-in duration-200 ${surfaceCard}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-start justify-between gap-3 pb-3 border-b ${borderSubtle}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg font-black ${primaryText}`}>
                    Regulamento, Prazos de Saque & Liquidez do Fundo
                  </h3>
                  <p className={`text-xs ${mutedText}`}>
                    Entenda detalhadamente como funciona a carência mínima de 72h, liquidação PIX e garantias
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFundRulesModal(false)}
                className={`p-1.5 sm:p-2 rounded-xl ${surfaceSubtle} cursor-pointer hover:border-amber-500`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid de Regras em Destaque */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Regra 1: Carência Mínima */}
              <div className={`p-4 rounded-2xl border ${surfaceSubtle} ${isDark ? 'border-amber-500/30' : 'border-amber-200 shadow-xs'} flex flex-col gap-2`}>
                <div className={`flex items-center gap-2 font-black ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                  <Lock className="w-4 h-4" />
                  <span>1. Prazo de Carência Mínima (72h / 3 Dias)</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${mutedText}`}>
                  Cada aporte confirmado possui um período mínimo de carência de <strong>3 dias (72 horas)</strong>.
                  Esse prazo é indispensável para viabilizar as operações de rentabilidade de até <strong>210% do CDI</strong> do Fundo Coletivo de Entregadores. Após as 72h, o saque fica liberado instantaneamente.
                </p>
              </div>

              {/* Regra 2: Liquidação PIX */}
              <div className={`p-4 rounded-2xl border ${surfaceSubtle} ${isDark ? 'border-sky-500/30' : 'border-sky-200 shadow-xs'} flex flex-col gap-2`}>
                <div className={`flex items-center gap-2 font-black ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                  <ArrowUpRight className="w-4 h-4" />
                  <span>2. Liquidação via PIX (D+0 / D+1)</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${mutedText}`}>
                  Ao solicitar o resgate pelo aplicativo, o Administrador recebe uma <strong>notificação de alta prioridade</strong> em tempo real. Os pedidos solicitados em horário comercial são processados no mesmo dia (D+0) ou em até 24h úteis (D+1).
                </p>
              </div>

              {/* Regra 3: Juros Diários */}
              <div className={`p-4 rounded-2xl border ${surfaceSubtle} ${isDark ? 'border-emerald-500/30' : 'border-emerald-200 shadow-xs'} flex flex-col gap-2`}>
                <div className={`flex items-center gap-2 font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  <TrendingUp className="w-4 h-4" />
                  <span>3. Rendimento Diário Composto</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${mutedText}`}>
                  O rendimento incide diariamente sobre o saldo aplicado + lucros acumulados. Você ganha todo dia (inclusive sábados, domingos e feriados), sem o travamento de 30 dias característico da poupança convencional.
                </p>
              </div>

              {/* Regra 4: Resgate Parcial ou Total */}
              <div className={`p-4 rounded-2xl border ${surfaceSubtle} ${isDark ? 'border-[#FF6A1A]/30' : 'border-orange-200 shadow-xs'} flex flex-col gap-2`}>
                <div className="flex items-center gap-2 text-[#FF6A1A] font-black">
                  <ShieldCheck className="w-4 h-4" />
                  <span>4. Autonomia de Resgate Parcial</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${mutedText}`}>
                  Você não precisa resgatar todo o seu investimento para cobrir um imprevisto! Pode sacar uma cota específica para trocar o óleo ou pneu da moto e manter o restante rendendo normalmente.
                </p>
              </div>
            </div>

            {/* TABELA COMPARATIVA DE TODOS OS PLANOS */}
            <div className="flex flex-col gap-2 mt-1">
              <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${primaryText}`}>
                <FileText className="w-4 h-4 text-[#FF6A1A]" />
                <span>Tabela Comparativa de Cotas & Liquidez do Fundo</span>
              </h4>

              <div className={`overflow-x-auto rounded-2xl border ${cardBorder}`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`${isDark ? 'bg-slate-900/90 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'} text-[10px] uppercase font-black border-b`}>
                      <th className="p-3">Cota / Fundo</th>
                      <th className="p-3 text-center">Valor Cota</th>
                      <th className="p-3 text-center">Taxa Diária</th>
                      <th className="p-3 text-center">Taxa Mensal</th>
                      <th className="p-3 text-center">Carência Saque</th>
                      <th className="p-3 text-center">Vencimento</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'} font-semibold`}>
                    {fundPlans.map(plan => (
                      <tr key={plan.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'} transition-colors`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{plan.icon}</span>
                            <div>
                              <div className={`font-black ${primaryText}`}>{plan.name}</div>
                              <div className={`text-[10px] ${mutedText}`}>{plan.badge}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center font-black text-[#FF6A1A]">
                          {fmtBRL(plan.sharePrice)}
                        </td>
                        <td className={`p-3 text-center ${isDark ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-black'}`}>
                          {plan.dailyRatePct}% /dia
                        </td>
                        <td className={`p-3 text-center ${isDark ? 'text-emerald-400 font-black' : 'text-emerald-700 font-black'}`}>
                          {plan.monthlyRatePct}% /mês
                        </td>
                        <td className={`p-3 text-center ${isDark ? 'text-amber-400 font-bold' : 'text-amber-700 font-black'}`}>
                          {plan.minWithdrawDays} Dias (72h)
                        </td>
                        <td className={`p-3 text-center ${isDark ? 'text-sky-400 font-bold' : 'text-sky-700 font-black'}`}>
                          {plan.maturityDays} Dias
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dúvidas Frequentes FAQ */}
            <div className={`p-4 rounded-2xl ${surfaceSubtle} border ${borderSubtle} space-y-2.5 text-xs`}>
              <div className={`font-black flex items-center gap-1.5 ${primaryText}`}>
                <HelpCircle className="w-4 h-4 text-[#FF6A1A]" />
                <span>Dúvidas Frequentes sobre o Fundo do Motoboy</span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div>
                  <strong className={`block ${secondaryText}`}>Posso sacar antes dos 3 dias (72h)?</strong>
                  <span className={mutedText}>
                    Não. O sistema bloqueia saques antecipados para preservar o rendimento acordado das operações coletivas.
                  </span>
                </div>
                <div>
                  <strong className={`block ${secondaryText}`}>Tem desconto de imposto ou taxas ocultas?</strong>
                  <span className={mutedText}>
                    Zero taxas administrativas para entregadores parceiros. O valor líquido acumulado é o valor creditado na sua conta.
                  </span>
                </div>
                <div>
                  <strong className={`block ${secondaryText}`}>Quem realiza a transferência do meu PIX?</strong>
                  <span className={mutedText}>
                    A tesouraria da plataforma / Administrador do Fundo recebe o alerta em tempo real e realiza o PIX diretamente para a chave informada.
                  </span>
                </div>
              </div>
            </div>

            {/* Botão de Fechar */}
            <div className={`flex gap-2 pt-1 border-t ${borderSubtle}`}>
              <button
                type="button"
                onClick={() => {
                  setShowFundRulesModal(false);
                  setShowWithdrawalModal(true);
                }}
                className="flex-1 py-3 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Unlock className="w-4 h-4" />
                <span>Ir para Solicitação de Saque</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFundRulesModal(false)}
                className={`py-3 px-5 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle} ${secondaryText} hover:border-slate-400`}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
