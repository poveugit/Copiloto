import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Home,
  Wrench,
  BarChart3,
  History,
  Trophy,
  Settings,
  Plus,
  Edit3,
  Trash2,
  Ban,
  RotateCcw,
  Check,
  X,
  Sun,
  Moon,
  RefreshCw,
  Database,
  Wifi,
  WifiOff,
  Code2,
  Copy,
  Download,
  Upload,
  Flame,
  MessageSquare,
  Send,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Fuel,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Bell,
  BellOff,
  BellRing,
  User,
  LogOut,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  UserPlus,
  LogIn,
  Search,
  Calendar,
  CalendarDays,
  Clock,
  Hourglass,
  Mic,
  MicOff,
  Zap,
  Printer,
  Play,
  Square,
  Calculator,
  FileText,
  Target,
  Sparkles,
  Navigation,
  MapPin,
  ShieldCheck,
  Info,
  Wallet,
  CreditCard,
  Receipt,
  Shield,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Sector,
} from 'recharts';
import {
  RideEntry,
  ExpenseEntry,
  MaintenanceItem,
  MaintenanceHistoryRecord,
  FuelDiagnosticsConfig,
  FinancialPlanningConfig,
  DEFAULT_FINANCIAL_PLAN,
  BikeExpenseItem,
  BikeExpenseCategory,
  DEFAULT_BIKE_EXPENSES,
  HouseholdExpenseItem,
  HouseholdCategory,
  DEFAULT_HOUSEHOLD_EXPENSES,
  ProjectedRevenueItem,
  computeProjectedRevenueBalance,
  ExpenseRecurrenceType,
  AppDefinition,
  CategoryDefinition,
  ShiftDefinition,
  LocalRoomDatabaseState,
  UserProfile,
  RememberedCredentials,
  getActiveSessionUser,
  saveActiveSessionUser,
  getRememberedCredentials,
  saveRememberedCredentials,
  getSavedLoginAccounts,
  removeSavedLoginAccount,
  registerPilotAccount,
  loginPilotAccount,
  resetPilotPassword,
  runWorkManagerCloudSync,
  uploadLocalDataToCloud,
  downloadCloudDataToLocal,
  exportCloudBackupCode,
  importCloudBackupCode,
  clearRemoteCloudData,
  isLegacyDemoEntry,
  isLegacyDemoExpense,
} from './services/supabaseSync';
import {
  evaluateShiftWorthiness,
  evaluateBikeDiagnostics,
  askCopilotAssistant,
  askFinancialAdvisorAI,
} from './services/copilotService';
import { KOTLIN_NATIVE_FILES } from './data/kotlinSourceCode';
import { RadarCorridaModal } from './components/RadarCorridaModal';
import {
  ControleTurnoModal,
  ShiftSession,
  getStoredShiftSession,
  saveStoredShiftSession,
} from './components/ControleTurnoModal';
import { RelatorioMeiModal } from './components/RelatorioMeiModal';
import { MetaReversaModal } from './components/MetaReversaModal';
import { InvestimentosScreen } from './components/InvestimentosScreen';
import { QuickCalculatorModal } from './components/QuickCalculatorModal';
import { AdjustBalanceModal } from './components/AdjustBalanceModal';
import {
  getNotificationPermission,
  initNativeNotifications,
  isNativePlatform,
  onNotificationTap,
  requestNotificationPermission,
  sendNativeNotification,
  type NotificationPermissionState,
} from './services/nativeNotifications';
import { useInvestmentWatcher } from './hooks/useInvestmentWatcher';
import {
  startSpeechRecognition,
  isSpeechRecognitionSupported,
  checkMicrophonePermissionStatus,
  requestDeviceMicrophonePermission,
  MicPermissionState,
  ParsedVoiceEntry,
} from './services/voiceRecognition';
import {
  checkGpsPermissionStatus,
  requestDeviceGpsPermission,
  startGpsShiftWatcher,
  GpsPermissionState,
} from './services/gpsOdometerService';

const BASE_APPS: AppDefinition[] = [
  { id: 'ifood', name: 'iFood', icon: '🛍️' },
  { id: '99moto', name: '99 Moto', icon: '🛵' },
  { id: 'lalamove', name: 'Lalamove', icon: '📦' },
  { id: 'ze_delivery', name: 'Zé Delivery', icon: '🍺' },
  { id: 'rappi', name: 'Rappi', icon: '🍔' },
  { id: 'keeta', name: 'Keeta', icon: '🛵' },
  { id: 'particular', name: 'Particular / Fixo', icon: '💼' },
  { id: 'ajuste', name: 'Ajuste de Saldo', icon: '⚖️' },
];

const BASE_EXPENSE_CATEGORIES: CategoryDefinition[] = [
  { id: 'combustivel', name: 'Combustível' },
  { id: 'manutencao', name: 'Manutenção' },
  { id: 'pecas', name: 'Peças/Pneus' },
  { id: 'seguro', name: 'Seguro' },
  { id: 'documentacao', name: 'Documentação' },
  { id: 'lavagem', name: 'Lavagem' },
  { id: 'outros', name: 'Outros' },
  { id: 'ajuste', name: 'Ajuste de Saldo' },
];

const BASE_SHIFTS: ShiftDefinition[] = [
  { id: 'almoco', name: 'Almoço (11h-15h)' },
  { id: 'jantar', name: 'Jantar (18h-23h)' },
  { id: 'madrugada', name: 'Madrugada (23h-06h)' },
  { id: 'manha', name: 'Manhã (06h-11h)' },
  { id: 'tarde', name: 'Tarde (15h-18h)' },
  { id: 'ajuste', name: 'Ajuste Automático' },
];

interface FreeNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | string | undefined | null;
  onValueChange: (numericValue: number, rawString: string) => void;
}

const FreeNumberInput: React.FC<FreeNumberInputProps> = ({
  value,
  onValueChange,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localStr, setLocalStr] = useState<string>(() =>
    value === undefined || value === null ? '' : String(value)
  );

  useEffect(() => {
    if (!isFocused) {
      const currentNum = localStr.trim() === '' ? 0 : Number(localStr);
      const propNum = value === undefined || value === null || value === '' ? 0 : Number(value);
      if (currentNum !== propNum) {
        setLocalStr(value === undefined || value === null ? '' : String(value));
      }
    }
  }, [value, isFocused, localStr]);

  return (
    <input
      {...rest}
      type="number"
      value={localStr}
      onFocus={e => {
        setIsFocused(true);
        onFocus?.(e);
      }}
      onBlur={e => {
        setIsFocused(false);
        onBlur?.(e);
      }}
      onChange={e => {
        const raw = e.target.value;
        setLocalStr(raw);
        if (raw.trim() === '') {
          onValueChange(0, '');
        } else {
          const parsed = Number(raw);
          onValueChange(Number.isFinite(parsed) ? parsed : 0, raw);
        }
      }}
    />
  );
};

interface AnimatedNumberProps {
  value: number;
  formatter?: (val: number) => string;
  duration?: number;
  className?: string;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  formatter,
  duration = 650,
  className = '',
}) => {
  const [displayVal, setDisplayVal] = useState<number>(0);

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    let startTimestamp: number | null = null;
    let rafId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = target * eased;
      setDisplayVal(progress >= 1 ? target : current);
      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [value, duration]);

  const formatted = formatter ? formatter(displayVal) : displayVal.toLocaleString('pt-BR');
  return <span className={`dashboard-number-anim tabular-nums ${className}`}>{formatted}</span>;
};

const LEVEL_NAMES = [
  'Estreante',
  'Rota Conhecida',
  'Piloto de Rua',
  'Veterano do Asfalto',
  'Mestre das Entregas',
  'Lenda da Estrada',
];
const LEVEL_SPAN = 500;

const DEFAULT_MAINTENANCE_ITEMS: MaintenanceItem[] = [
  {
    id: 'oil',
    name: 'Troca de Óleo',
    icon: '🛢️',
    lastChangeKm: 0,
    intervalKm: 1000,
    costEstimate: 0,
    notes: 'Óleo 10W30 Semissintético',
    isDefault: true,
    alertThresholdPct: 85,
  },
  {
    id: 'tire',
    name: 'Pneus Dianteiro/Traseiro',
    icon: '🛞',
    lastChangeKm: 0,
    intervalKm: 10000,
    costEstimate: 0,
    notes: 'Calibrar semanalmente (29/33 PSI)',
    isDefault: true,
    alertThresholdPct: 90,
  },
  {
    id: 'chain',
    name: 'Kit Relação',
    icon: '⚙️',
    lastChangeKm: 0,
    intervalKm: 8000,
    costEstimate: 0,
    notes: 'Lubrificar corrente a cada 500 km',
    isDefault: true,
    alertThresholdPct: 80,
  },
  {
    id: 'brake',
    name: 'Pastilhas de Freio',
    icon: '🛑',
    lastChangeKm: 0,
    intervalKm: 5000,
    costEstimate: 0,
    notes: 'Conferir fluído DOT 4 e disco',
    isDefault: true,
    alertThresholdPct: 85,
  },
];

const DEFAULT_FUEL_CONFIG: FuelDiagnosticsConfig = {
  kmPerLiter: 35,
  fuelPrice: 5.8,
  tankCapacityLiters: 16.1,
  bikeModelName: 'Minha Moto',
  odometerBaseKm: 0,
};

function getStorageKeyForUser(user: UserProfile | null): string {
  if (user && !user.isGuest && user.email) {
    return 'copilotrider_room_user_v3_' + user.email.trim().toLowerCase();
  }
  return 'copilotrider_room_guest_v3';
}

const ADMIN_EMAILS = new Set([
  'swamijunior346.sj@gmail.com',
  'junior2026izi@gmail.com',
  'parceirosizi@gmail.com',
  'admin@mochilinha.com',
  'admin@gmail.com',
]);

function isUserAdmin(user: UserProfile | null): boolean {
  if (!user || user.isGuest) return false;
  if ((user as any).isAdmin === true || (user as any).is_admin === true) return true;
  const emailClean = (user.email || '').trim().toLowerCase();
  if (!emailClean) return false;
  if (ADMIN_EMAILS.has(emailClean)) return true;
  if (emailClean.startsWith('admin@') || emailClean.includes('.admin@')) return true;
  if (user.id === 'usr_1793065121511') return true;
  return false;
}

function createCleanDatabaseState(bikeModelName?: string): LocalRoomDatabaseState {
  const cleanBike = (bikeModelName || '').trim() || DEFAULT_FUEL_CONFIG.bikeModelName;
  return {
    entries: [],
    expenses: [],
    dailyGoal: 0,
    weeklyGoal: 0,
    customGoalTarget: 0,
    customGoalDays: 20,
    customGoalTitle: 'Meta Personalizada de Ganhos',
    customGoalMode: 'date',
    customGoalTargetDate: getDefaultFutureDate(20),
    customGoalScope: 'month',
    maintenanceNotificationsEnabled: true,
    maintenanceItems: DEFAULT_MAINTENANCE_ITEMS.map(item => ({ ...item })),
    fuelConfig: {
      ...DEFAULT_FUEL_CONFIG,
      bikeModelName: cleanBike,
    },
    financialPlan: { ...DEFAULT_FINANCIAL_PLAN },
    bikeExpenses: DEFAULT_BIKE_EXPENSES.map(item => ({ ...item })),
    householdExpenses: DEFAULT_HOUSEHOLD_EXPENSES.map(item => ({ ...item })),
    projectedRevenues: [],
    customApps: [],
    customCategories: [],
    appOverrides: {},
    customShifts: [],
    shiftOverrides: {},
    deletedShiftIds: [],
    deletedAppIds: [],
    deletedEntryIds: [],
    deletedExpenseIds: [],
    deletedBikeExpenseIds: [],
    deletedHouseholdExpenseIds: [],
    deletedProjectedRevenueIds: [],
  };
}

function loadDatabaseForUser(user: UserProfile | null): LocalRoomDatabaseState {
  try {
    // Purge legacy shared demo keys so hardcoded demo records never leak
    localStorage.removeItem('moto-room-native-db-v2');
    localStorage.removeItem('moto-dash-data_guest');
    localStorage.removeItem('moto-dash-data');

    const storageKey = getStorageKeyForUser(user);
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      const maintItems: MaintenanceItem[] =
        Array.isArray(parsed.maintenanceItems) && parsed.maintenanceItems.length > 0
          ? parsed.maintenanceItems
          : DEFAULT_MAINTENANCE_ITEMS.map(item => ({ ...item }));

      const fuelCfg: FuelDiagnosticsConfig = parsed.fuelConfig || {
        ...DEFAULT_FUEL_CONFIG,
        bikeModelName: user?.bikeModel || DEFAULT_FUEL_CONFIG.bikeModelName,
      };

      const deletedBikeIds: string[] = Array.isArray(parsed.deletedBikeExpenseIds)
        ? parsed.deletedBikeExpenseIds.map(String)
        : [];
      const deletedHouseholdIds: string[] = Array.isArray(parsed.deletedHouseholdExpenseIds)
        ? parsed.deletedHouseholdExpenseIds.map(String)
        : [];
      const deletedBikeSet = new Set(deletedBikeIds);
      const deletedHouseholdSet = new Set(deletedHouseholdIds);
      const deletedProjectedIds: string[] = Array.isArray(parsed.deletedProjectedRevenueIds)
        ? parsed.deletedProjectedRevenueIds.map(String)
        : [];
      const deletedProjectedSet = new Set(deletedProjectedIds);
      const projectedList: ProjectedRevenueItem[] = Array.isArray(parsed.projectedRevenues)
        ? parsed.projectedRevenues.filter(
            (p: ProjectedRevenueItem) => p && !deletedProjectedSet.has(String(p.id))
          )
        : [];

      const bikeExpensesList: BikeExpenseItem[] =
        Array.isArray(parsed.bikeExpenses)
          ? parsed.bikeExpenses
              .filter((item: BikeExpenseItem) => item && !deletedBikeSet.has(String(item.id)))
              .map((item: BikeExpenseItem) => {
              const defaultMatch = DEFAULT_BIKE_EXPENSES.find(d => d.id === item.id);
              let merged: BikeExpenseItem = defaultMatch
                ? {
                    ...defaultMatch,
                    ...item,
                    recurrenceType: item.recurrenceType || defaultMatch.recurrenceType,
                    intervalDays: item.intervalDays ?? defaultMatch.intervalDays,
                    totalCost: item.totalCost ?? defaultMatch.totalCost,
                  }
                : { ...item, isCustomEdited: true };

              // Se o card de combustível ficou salvo com 745 / 745.17 ou intervalo de 1 dia com valor sobrescrito, restaura para R$ 30/dia (R$ 900/mês)
              if (
                merged.id === 'combustivel_mensal' ||
                merged.category === 'combustivel'
              ) {
                const mRounded = Math.round(Number(merged.monthlyAmount) || 0);
                const tRounded = Math.round(Number(merged.totalCost) || 0);
                if (mRounded === 745 || tRounded === 745 || (Number(merged.intervalDays) === 1 && Number(merged.totalCost) === 30)) {
                  merged = {
                    ...merged,
                    recurrenceType: 'interval_days',
                    intervalDays: 1,
                    totalCost: 30,
                    monthlyAmount: 900,
                    isCustomEdited: true,
                  };
                }
              }

              // Detecta se o usuário já personalizou este item em relação ao padrão
              if (
                merged.isCustomEdited ||
                !defaultMatch ||
                merged.intervalDays !== defaultMatch.intervalDays ||
                merged.totalCost !== defaultMatch.totalCost ||
                merged.monthlyAmount !== defaultMatch.monthlyAmount ||
                merged.recurrenceType !== defaultMatch.recurrenceType
              ) {
                merged.isCustomEdited = true;
              }

              return merged;
            })
          : DEFAULT_BIKE_EXPENSES.filter(item => !deletedBikeSet.has(String(item.id))).map(item => ({ ...item }));

      const houseExpenses: HouseholdExpenseItem[] =
        Array.isArray(parsed.householdExpenses)
          ? parsed.householdExpenses.filter(
              (item: HouseholdExpenseItem) => item && !deletedHouseholdSet.has(String(item.id))
            )
          : DEFAULT_HOUSEHOLD_EXPENSES.filter(item => !deletedHouseholdSet.has(String(item.id))).map(item => ({
              ...item,
            }));

      const cleanEntries = Array.isArray(parsed.entries)
        ? parsed.entries
            .filter((e: any) => !isLegacyDemoEntry(e))
            .map((e: any) => {
              if (e.app === 'uber' || e.app === '99') return { ...e, app: '99moto' };
              if (e.app === 'ze') return { ...e, app: 'ze_delivery' };
              return e;
            })
        : [];
      const cleanExpenses = Array.isArray(parsed.expenses)
        ? parsed.expenses.filter((e: any) => !isLegacyDemoExpense(e))
        : [];

      return {
        entries: cleanEntries,
        expenses: cleanExpenses,
        dailyGoal: Math.max(0, Number(parsed.dailyGoal) || 0),
        weeklyGoal: Math.max(0, Number(parsed.weeklyGoal) || 0),
        customGoalTarget: Math.max(0, Number(parsed.customGoalTarget) || 0),
        customGoalDays: Number(parsed.customGoalDays) || 20,
        customGoalTitle: parsed.customGoalTitle || 'Meta Personalizada de Ganhos',
        customGoalMode: 'date',
        customGoalTargetDate: parsed.customGoalTargetDate || getDefaultFutureDate(Number(parsed.customGoalDays) || 20),
        customGoalScope: (parsed.customGoalScope === 'all' ? 'all' : 'month') as 'month' | 'all',
        maintenanceNotificationsEnabled:
          typeof parsed.maintenanceNotificationsEnabled === 'boolean'
            ? parsed.maintenanceNotificationsEnabled
            : true,
        maintenanceItems: maintItems,
        fuelConfig: fuelCfg,
        financialPlan: {
          ...DEFAULT_FINANCIAL_PLAN,
          ...(parsed.financialPlan || {}),
        },
        bikeExpenses: bikeExpensesList,
        householdExpenses: houseExpenses,
        projectedRevenues: projectedList,
        customApps: Array.isArray(parsed.customApps) ? parsed.customApps : [],
        customCategories: Array.isArray(parsed.customCategories) ? parsed.customCategories : [],
        appOverrides: parsed.appOverrides || {},
        customShifts: Array.isArray(parsed.customShifts) ? parsed.customShifts : [],
        shiftOverrides: parsed.shiftOverrides || {},
        deletedShiftIds: Array.isArray(parsed.deletedShiftIds) ? parsed.deletedShiftIds : [],
        deletedAppIds: Array.isArray(parsed.deletedAppIds) ? parsed.deletedAppIds : [],
        deletedEntryIds: Array.isArray(parsed.deletedEntryIds) ? parsed.deletedEntryIds : [],
        deletedExpenseIds: Array.isArray(parsed.deletedExpenseIds) ? parsed.deletedExpenseIds : [],
        deletedBikeExpenseIds: deletedBikeIds,
        deletedHouseholdExpenseIds: deletedHouseholdIds,
        deletedProjectedRevenueIds: Array.isArray(parsed.deletedProjectedRevenueIds)
          ? parsed.deletedProjectedRevenueIds.map(String)
          : [],
        lastSyncedAt: parsed.lastSyncedAt,
      };
    }
  } catch {
    // Ignore parse errors and return clean state
  }
  return createCleanDatabaseState(user?.bikeModel);
}

const PT_BR_MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getCurrentMonthName(): string {
  const d = new Date();
  return `${PT_BR_MONTH_NAMES[d.getMonth()]} de ${d.getFullYear()}`;
}

function getDaysRemainingInMonth(): number {
  const d = new Date();
  const totalDays = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.max(1, totalDays - d.getDate() + 1);
}

function getDefaultFutureDate(daysAhead: number = 20): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, daysAhead));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function calculateDaysDifference(fromDateStr: string, toDateStr: string): number {
  if (!fromDateStr || !toDateStr) return 0;
  const [y1, m1, d1] = fromDateStr.split('-').map(Number);
  const [y2, m2, d2] = toDateStr.split('-').map(Number);
  const dFrom = new Date(y1, m1 - 1, d1);
  const dTo = new Date(y2, m2 - 1, d2);
  const diffTime = dTo.getTime() - dFrom.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function formatPtBrDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function addDaysToDateStr(dateStr: string, daysToAdd: number): string {
  if (!dateStr) return todayStr();
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() + Number(daysToAdd || 0));
  const nextY = dateObj.getFullYear();
  const nextM = String(dateObj.getMonth() + 1).padStart(2, '0');
  const nextD = String(dateObj.getDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

export function matchesHouseholdExpense(expense: ExpenseEntry, item: HouseholdExpenseItem): boolean {
  if (expense.householdExpenseId) {
    return expense.householdExpenseId === item.id;
  }
  const expCat = (expense.category || '').toLowerCase().trim();
  const itemName = (item.name || '').toLowerCase().trim();
  const itemId = (item.id || '').toLowerCase().trim();

  if (expCat === itemName || expCat === itemId) return true;

  const isCopy = itemName.includes('(cópia)') || itemName.includes('(copia)');
  if (!isCopy) {
    if (expCat.includes(itemName) || itemName.includes(expCat)) return true;
  }

  // Casos específicos dos itens padrão
  if (itemId === 'aluguel' && (expCat.includes('aluguel') || expCat.includes('habita'))) return true;
  if (itemId === 'energia_luz' && (expCat.includes('luz') || expCat.includes('energia') || expCat.includes('enel') || expCat.includes('cpfl') || expCat.includes('eletric'))) return true;
  if (itemId === 'agua_saneamento' && (expCat.includes('água') || expCat.includes('agua') || expCat.includes('saneamento') || expCat.includes('sabesp') || expCat.includes('sanepar'))) return true;
  if (itemId === 'internet_fibra' && (expCat.includes('internet') || expCat.includes('fibra') || expCat.includes('celular') || expCat.includes('telefone') || expCat.includes('conectividade'))) return true;
  if (itemId === 'supermercado_feira' && (expCat.includes('supermercado') || expCat.includes('feira') || expCat.includes('mercado') || expCat.includes('alimenta'))) return true;
  if (itemId === 'gas_cozinha' && (expCat.includes('gás') || expCat.includes('gas') || expCat.includes('botijão') || expCat.includes('botijao'))) return true;

  if (expense.description) {
    const desc = expense.description.toLowerCase();
    if (isCopy) {
      if (desc.includes(itemName)) return true;
    } else {
      if (desc.includes(itemName) || desc.includes(itemId)) return true;
    }
  }

  return false;
}

export function matchesBikeExpense(expense: ExpenseEntry, item: BikeExpenseItem): boolean {
  if ((expense as any).bikeExpenseId) {
    return (expense as any).bikeExpenseId === item.id;
  }
  const expCat = (expense.category || '').toLowerCase().trim();
  const itemName = (item.name || '').toLowerCase().trim();
  const itemId = (item.id || '').toLowerCase().trim();

  if (expCat === itemName || expCat === itemId) return true;

  const isCopy = itemName.includes('(cópia)') || itemName.includes('(copia)');
  if (!isCopy) {
    if (expCat.includes(itemName) || itemName.includes(expCat)) return true;
  }

  if (itemId === 'combustivel_mensal' && (expCat === 'combustivel' || expCat.includes('gasolina') || expCat.includes('etanol') || expCat.includes('combustível') || expCat.includes('abastecimento'))) return true;
  if (itemId === 'oleo_filtro' && (expCat.includes('óleo') || expCat.includes('oleo'))) return true;
  if (itemId === 'pneus_camaras' && expCat.includes('pneu')) return true;
  if (itemId === 'kit_transmissao' && (expCat.includes('relação') || expCat.includes('relacao') || expCat.includes('corrente') || expCat.includes('transmissão') || expCat.includes('transmissao'))) return true;
  if (itemId === 'freios_pastilhas' && (expCat.includes('freio') || expCat.includes('pastilha') || expCat.includes('lona'))) return true;
  if (itemId === 'seguro_rastreador' && (expCat.includes('seguro') || expCat.includes('rastreador') || expCat.includes('proteção') || expCat.includes('protecao'))) return true;
  if (itemId === 'ipva_licenciamento' && (expCat.includes('ipva') || expCat.includes('licenciamento') || expCat.includes('dpvat') || expCat.includes('crlv'))) return true;

  if (expense.description) {
    const desc = expense.description.toLowerCase();
    if (isCopy) {
      if (desc.includes(itemName)) return true;
    } else {
      if (desc.includes(itemName) || desc.includes(itemId)) return true;
    }
  }

  return false;
}

interface ExpenseDueInfo {
  label: string;
  daysRemaining: number;
  status: 'today' | 'near' | 'overdue' | 'future' | 'paid' | 'partial';
  targetDateStr: string;
  badgeClass: string;
  detailNote?: string;
  timelineSortKey: number;
  paidAmount?: number;
  remainingAmount?: number;
  isPaid?: boolean;
}

function getExpenseDueInfo(
  item: {
    id?: string;
    name?: string;
    recurrenceType?: ExpenseRecurrenceType;
    dueDay?: number;
    intervalDays?: number;
    totalCost?: number;
    monthlyAmount?: number;
    lastPaidDate?: string;
    nextDueDate?: string;
    paidMonths?: string[];
    unpaidMonths?: string[];
  },
  paidInMonth: number = 0,
  targetYM?: string
): ExpenseDueInfo {
  const today = todayStr();
  const currentDay = new Date().getDate();
  const currentYM = today.slice(0, 7);
  const ym = targetYM || currentYM;
  const recType = item.recurrenceType || 'monthly';
  const expectedVal = Math.max(0, Number(item.totalCost || item.monthlyAmount) || 0);

  // CRITÉRIO DE DEFINIÇÃO DE QUITAÇÃO & OVERRIDE MANUAL:
  // Se o usuário marcou explicitamente como "A PAGAR" (pendente) para este mês:
  const isExplicitlyUnpaid = Boolean(item.unpaidMonths && item.unpaidMonths.includes(ym));
  // Se o usuário marcou explicitamente como "QUITADO" para este mês:
  const isExplicitlyPaid = Boolean(item.paidMonths && item.paidMonths.includes(ym));
  const hasPaidDateInMonth = Boolean(item.lastPaidDate && item.lastPaidDate.startsWith(ym));
  const hasCoveredExpected = expectedVal > 0 ? paidInMonth >= expectedVal : paidInMonth > 0;

  if (!isExplicitlyUnpaid && (isExplicitlyPaid || hasPaidDateInMonth || hasCoveredExpected)) {
    const displayPaid = paidInMonth > 0 ? paidInMonth : expectedVal;
    return {
      label: `✅ Quitado no mês${displayPaid > 0 ? ` (${fmtMoney(displayPaid)})` : ''}`,
      daysRemaining: 999,
      status: 'paid',
      targetDateStr: item.lastPaidDate || today,
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
      detailNote: `Quitado${displayPaid > 0 ? ` · ${fmtMoney(displayPaid)}` : ''}`,
      timelineSortKey: 1000,
      paidAmount: displayPaid,
      remainingAmount: 0,
      isPaid: true,
    };
  }

  // 2. SE FOI PAGO PARCIALMENTE:
  if (!isExplicitlyUnpaid && paidInMonth > 0 && expectedVal > 0 && paidInMonth < expectedVal) {
    const remaining = expectedVal - paidInMonth;
    return {
      label: `⏳ Parcial: ${fmtMoney(paidInMonth)} pago (resta ${fmtMoney(remaining)})`,
      daysRemaining: 3,
      status: 'partial',
      targetDateStr: today,
      badgeClass: 'bg-sky-50 text-sky-700 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30',
      detailNote: `Falta ${fmtMoney(remaining)}`,
      timelineSortKey: 10,
      paidAmount: paidInMonth,
      remainingAmount: remaining,
      isPaid: false,
    };
  }

  // Se targetYM for um mês futuro ou passado em relação ao mês atual do relógio
  const isFutureMonth = Boolean(targetYM && targetYM > currentYM);
  const isPastMonth = Boolean(targetYM && targetYM < currentYM);

  if (isFutureMonth && targetYM) {
    const [fy, fm] = targetYM.split('-').map(Number);
    const futureDueDay = Math.max(1, Math.min(31, Number(item.dueDay) || 10));
    const targetDate = `${fy}-${String(fm).padStart(2, '0')}-${String(futureDueDay).padStart(2, '0')}`;
    const daysDiff = calculateDaysDifference(today, targetDate);
    const mName = PT_BR_MONTH_NAMES[fm - 1] || `${fm}`;
    return {
      label: `📅 Previsão: dia ${futureDueDay} de ${mName} (${daysDiff > 0 ? `em ${daysDiff} dias` : 'próximo'})`,
      daysRemaining: daysDiff,
      status: 'future',
      targetDateStr: targetDate,
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-transparent dark:text-slate-300 dark:border-neutral-800',
      detailNote: `Previsão ${mName}`,
      timelineSortKey: daysDiff,
      paidAmount: 0,
      remainingAmount: expectedVal,
      isPaid: false,
    };
  }

  if (isPastMonth) {
    return {
      label: `⚠️ Mês Encerrado sem Pagamento Registrado`,
      daysRemaining: -99,
      status: 'overdue',
      targetDateStr: today,
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
      detailNote: `Pendente no mês anterior`,
      timelineSortKey: -99,
      paidAmount: 0,
      remainingAmount: expectedVal,
      isPaid: false,
    };
  }

  // 3. Regras para o Mês Atual em Andamento
  if (recType === 'interval_days' && item.intervalDays && item.intervalDays > 0) {
    const targetDate = item.nextDueDate || (item.lastPaidDate ? addDaysToDateStr(item.lastPaidDate, item.intervalDays) : addDaysToDateStr(today, item.intervalDays));
    const daysDiff = calculateDaysDifference(today, targetDate);

    if (daysDiff === 0) {
      return {
        label: `🚨 Vencimento Hoje (${formatPtBrDate(targetDate)})!`,
        daysRemaining: 0,
        status: 'today',
        targetDateStr: targetDate,
        badgeClass: 'bg-rose-50 text-rose-700 animate-pulse border border-rose-300 dark:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/40',
        detailNote: `A cada ${item.intervalDays} dias`,
        timelineSortKey: daysDiff,
        paidAmount: 0,
        remainingAmount: expectedVal,
        isPaid: false,
      };
    }
    if (daysDiff < 0) {
      return {
        label: `🚨 Venceu há ${Math.abs(daysDiff)} dias (${formatPtBrDate(targetDate)})`,
        daysRemaining: daysDiff,
        status: 'overdue',
        targetDateStr: targetDate,
        badgeClass: 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
        detailNote: `A cada ${item.intervalDays} dias`,
        timelineSortKey: daysDiff,
        paidAmount: 0,
        remainingAmount: expectedVal,
        isPaid: false,
      };
    }
    if (daysDiff <= 7) {
      return {
        label: `⚠️ Vencimento Próximo: faltam ${daysDiff} dias (${formatPtBrDate(targetDate)})`,
        daysRemaining: daysDiff,
        status: 'near',
        targetDateStr: targetDate,
        badgeClass: 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
        detailNote: `A cada ${item.intervalDays} dias`,
        timelineSortKey: daysDiff,
        paidAmount: 0,
        remainingAmount: expectedVal,
        isPaid: false,
      };
    }
    return {
      label: `🔄 A cada ${item.intervalDays} dias · Faltam ${daysDiff} dias (${formatPtBrDate(targetDate)})`,
      daysRemaining: daysDiff,
      status: 'future',
      targetDateStr: targetDate,
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-transparent dark:text-slate-300 dark:border-neutral-800',
      detailNote: `A cada ${item.intervalDays} dias`,
      timelineSortKey: daysDiff,
      paidAmount: 0,
      remainingAmount: expectedVal,
      isPaid: false,
    };
  }

  if (recType === 'specific_date' && item.nextDueDate) {
    const daysDiff = calculateDaysDifference(today, item.nextDueDate);
    if (daysDiff === 0) {
      return {
        label: `🚨 Vence Hoje (${formatPtBrDate(item.nextDueDate)})!`,
        daysRemaining: 0,
        status: 'today',
        targetDateStr: item.nextDueDate,
        badgeClass: 'bg-rose-50 text-rose-700 animate-pulse border border-rose-300 dark:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/40',
        detailNote: 'Data específica',
        timelineSortKey: daysDiff,
        paidAmount: 0,
        remainingAmount: expectedVal,
        isPaid: false,
      };
    }
    if (daysDiff < 0) {
      return {
        label: `🚨 Venceu em ${formatPtBrDate(item.nextDueDate)} (${Math.abs(daysDiff)} dias atrás)`,
        daysRemaining: daysDiff,
        status: 'overdue',
        targetDateStr: item.nextDueDate,
        badgeClass: 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
        detailNote: 'Data específica',
        timelineSortKey: daysDiff,
        paidAmount: 0,
        remainingAmount: expectedVal,
        isPaid: false,
      };
    }
    if (daysDiff <= 7) {
      return {
        label: `⚠️ Vence em ${daysDiff} dias (${formatPtBrDate(item.nextDueDate)})`,
        daysRemaining: daysDiff,
        status: 'near',
        targetDateStr: item.nextDueDate,
        badgeClass: 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
        detailNote: 'Data específica',
        timelineSortKey: daysDiff,
        paidAmount: 0,
        remainingAmount: expectedVal,
        isPaid: false,
      };
    }
    return {
      label: `📅 Vencimento em ${daysDiff} dias (${formatPtBrDate(item.nextDueDate)})`,
      daysRemaining: daysDiff,
      status: 'future',
      targetDateStr: item.nextDueDate,
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-transparent dark:text-slate-300 dark:border-neutral-800',
      detailNote: 'Data específica',
      timelineSortKey: daysDiff,
      paidAmount: 0,
      remainingAmount: expectedVal,
      isPaid: false,
    };
  }

  // Monthly default
  const dueDay = Math.max(1, Math.min(31, Number(item.dueDay) || 10));
  const daysUntilDue = dueDay - currentDay;
  if (daysUntilDue === 0) {
    return {
      label: `🚨 Vence Hoje (todo dia ${dueDay})!`,
      daysRemaining: 0,
      status: 'today',
      targetDateStr: today,
      badgeClass: 'bg-rose-50 text-rose-700 animate-pulse border border-rose-300 dark:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/40',
      detailNote: `Todo dia ${dueDay}`,
      timelineSortKey: 0,
      paidAmount: 0,
      remainingAmount: expectedVal,
      isPaid: false,
    };
  }
  if (daysUntilDue > 0 && daysUntilDue <= 4) {
    return {
      label: `⚠️ Vence em ${daysUntilDue} dias (dia ${dueDay})`,
      daysRemaining: daysUntilDue,
      status: 'near',
      targetDateStr: today,
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
      detailNote: `Todo dia ${dueDay}`,
      timelineSortKey: daysUntilDue,
      paidAmount: 0,
      remainingAmount: expectedVal,
      isPaid: false,
    };
  }
  if (daysUntilDue < 0 && daysUntilDue >= -5) {
    return {
      label: `🚨 Venceu há ${Math.abs(daysUntilDue)} dias (dia ${dueDay})`,
      daysRemaining: daysUntilDue,
      status: 'overdue',
      targetDateStr: today,
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
      detailNote: `Todo dia ${dueDay}`,
      timelineSortKey: daysUntilDue + 30,
      paidAmount: 0,
      remainingAmount: expectedVal,
      isPaid: false,
    };
  }
  return {
    label: `Vencimento: todo dia ${dueDay}`,
    daysRemaining: daysUntilDue > 0 ? daysUntilDue : 30 + daysUntilDue,
    status: 'future',
    targetDateStr: today,
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-transparent dark:text-slate-400 dark:border-neutral-800',
    detailNote: `Todo dia ${dueDay}`,
    timelineSortKey: daysUntilDue > 0 ? daysUntilDue : 30 + daysUntilDue,
    paidAmount: 0,
    remainingAmount: expectedVal,
    isPaid: false,
  };
}

interface CustomGoalCountdownInfo {
  isDateMode: boolean;
  effectiveDays: number;
  countdownDays: number;
  targetDateStr: string;
  isExpired: boolean;
  isToday: boolean;
  countdownLabel: string;
  countdownBadgeText: string;
}

function getCustomGoalCountdown(
  mode: 'days' | 'date' | undefined,
  daysParam: number | undefined,
  targetDateParam: string | undefined
): CustomGoalCountdownInfo {
  const isDateMode = mode === 'date';
  const defaultDays = Math.max(1, Number(daysParam) || 20);

  if (!isDateMode) {
    return {
      isDateMode: false,
      effectiveDays: defaultDays,
      countdownDays: defaultDays,
      targetDateStr: '',
      isExpired: false,
      isToday: false,
      countdownLabel: `${defaultDays} ${defaultDays === 1 ? 'dia' : 'dias'}`,
      countdownBadgeText: `${defaultDays} ${defaultDays === 1 ? 'dia' : 'dias'}`,
    };
  }

  const today = todayStr();
  const targetDateStr = targetDateParam && targetDateParam.trim() ? targetDateParam.trim() : getDefaultFutureDate(defaultDays);
  const diffDays = calculateDaysDifference(today, targetDateStr);

  if (diffDays < 0) {
    const passed = Math.abs(diffDays);
    return {
      isDateMode: true,
      effectiveDays: 1,
      countdownDays: diffDays,
      targetDateStr,
      isExpired: true,
      isToday: false,
      countdownLabel: `Prazo encerrou há ${passed} ${passed === 1 ? 'dia' : 'dias'} (${formatPtBrDate(targetDateStr)})`,
      countdownBadgeText: `Expirou há ${passed}d`,
    };
  }

  if (diffDays === 0) {
    return {
      isDateMode: true,
      effectiveDays: 1,
      countdownDays: 0,
      targetDateStr,
      isExpired: false,
      isToday: true,
      countdownLabel: `Último dia da meta! (Prazo hoje: ${formatPtBrDate(targetDateStr)})`,
      countdownBadgeText: 'Último dia hoje!',
    };
  }

  return {
    isDateMode: true,
    effectiveDays: diffDays,
    countdownDays: diffDays,
    targetDateStr,
    isExpired: false,
    isToday: false,
    countdownLabel: `Faltam ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} (até ${formatPtBrDate(targetDateStr)})`,
    countdownBadgeText: `Faltam ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`,
  };
}

function fmtMoney(v: number): string {
  return 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtCurrencyExact(v: number): string {
  return 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type NavTab = 'dashboard' | 'maintenance' | 'billing' | 'investments' | 'history' | 'progress' | 'settings';

export default function App() {
  // Theme State (Dark Mode / Light Mode)
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('copilotrider_theme');
    const dark = saved ? saved === 'dark' : true;
    if (typeof document !== 'undefined') {
      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    return dark;
  });

  useEffect(() => {
    localStorage.setItem('copilotrider_theme', isDark ? 'dark' : 'light');
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDark]);

  // Navigation & Architecture Inspector State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [billingSubTab, setBillingSubTab] = useState<'mensal' | 'projecao' | 'despesas_moto' | 'despesas_casa' | 'planejamento' | 'ganhos' | 'gastos'>('mensal');

  // Estados de Faturamento Futuro Previsto
  const [showProjectedModal, setShowProjectedModal] = useState<boolean>(false);
  const [showProjectedCalendarModal, setShowProjectedCalendarModal] = useState<boolean>(false);
  const [projectedCalendarMonth, setProjectedCalendarMonth] = useState<string>(() => todayStr().slice(0, 7));
  const [projectedSelectedDates, setProjectedSelectedDates] = useState<string[]>([]);
  const [editingProjectedId, setEditingProjectedId] = useState<string | null>(null);
  const [projectedDailyRate, setProjectedDailyRate] = useState<string>('');
  const [projectedAmount, setProjectedAmount] = useState<string>('');
  const [projectedDescription, setProjectedDescription] = useState<string>('');
  const [projectedApp, setProjectedApp] = useState<string>('Particular');
  const [projectedNotes, setProjectedNotes] = useState<string>('');
  const [projectedStatusFilter, setProjectedStatusFilter] = useState<'all' | 'pending' | 'realized' | 'cancelled'>('all');
  const [deletingProjectedId, setDeletingProjectedId] = useState<string | null>(null);
  const [bikeCategoryFilter, setBikeCategoryFilter] = useState<string>('all');
  const [bikeStatusFilter, setBikeStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [showBikeModal, setShowBikeModal] = useState<boolean>(false);
  const [editingBikeItem, setEditingBikeItem] = useState<BikeExpenseItem | null>(null);
  const [deletingBikeId, setDeletingBikeId] = useState<string | null>(null);
  const [bikeDraft, setBikeDraft] = useState<BikeExpenseItem>({
    id: '',
    name: '',
    category: 'manutencao',
    monthlyAmount: 0,
    dueDay: 15,
    icon: '🏍️',
    isActive: true,
  });
  const [householdCategoryFilter, setHouseholdCategoryFilter] = useState<string>('all');
  const [householdStatusFilter, setHouseholdStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [showHouseholdModal, setShowHouseholdModal] = useState<boolean>(false);
  const [editingHouseholdItem, setEditingHouseholdItem] = useState<HouseholdExpenseItem | null>(null);
  const [deletingHouseholdId, setDeletingHouseholdId] = useState<string | null>(null);
  const [householdDraft, setHouseholdDraft] = useState<HouseholdExpenseItem>({
    id: '',
    name: '',
    category: 'moradia',
    monthlyAmount: 0,
    dueDay: 10,
    icon: '🏠',
    isActive: true,
  });
  const [showNewBikeCatInput, setShowNewBikeCatInput] = useState<boolean>(false);
  const [newBikeCatName, setNewBikeCatName] = useState<string>('');
  const [showNewHouseholdCatInput, setShowNewHouseholdCatInput] = useState<boolean>(false);
  const [newHouseholdCatName, setNewHouseholdCatName] = useState<string>('');
  const [selectedFinanceMonth, setSelectedFinanceMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [financeAppFilter, setFinanceAppFilter] = useState<string>('all');
  const [financeSortOrder, setFinanceSortOrder] = useState<'date_desc' | 'val_desc' | 'val_asc'>('date_desc');
  const [dashboardSaldoScope, setDashboardSaldoScope] = useState<'month' | 'all' | 'custom'>('month');
  const [dashboardCustomStartDate, setDashboardCustomStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [dashboardCustomEndDate, setDashboardCustomEndDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [isEditingCustomGoalInFinance, setIsEditingCustomGoalInFinance] = useState<boolean>(false);
  const [tempFinanceGoalTarget, setTempFinanceGoalTarget] = useState<number>(0);
  const [tempFinanceGoalDate, setTempFinanceGoalDate] = useState<string>(() => getDefaultFutureDate(20));
  const [selectedRaioXCategory, setSelectedRaioXCategory] = useState<string>('fuel');
  const [showFormulaExplanation, setShowFormulaExplanation] = useState<boolean>(false);
  const [seasonalityFilter, setSeasonalityFilter] = useState<'3m' | '6m' | '12m' | 'ytd' | 'custom'>('6m');
  const [seasonalityCustomStart, setSeasonalityCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [seasonalityCustomEnd, setSeasonalityCustomEnd] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showKotlinInspector, setShowKotlinInspector] = useState<boolean>(false);
  const [selectedKotlinFileIndex, setSelectedKotlinFileIndex] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [showReserveBreakdown, setShowReserveBreakdown] = useState<boolean>(false);

  // ================= CALCULADORA INTEGRADA PARA CAMPOS DE VALOR E DESPESAS =================
  const [quickCalcState, setQuickCalcState] = useState<{
    isOpen: boolean;
    title: string;
    initialValue: string | number;
    onApply: (val: string) => void;
  }>({
    isOpen: false,
    title: 'Calculadora de Valores',
    initialValue: '',
    onApply: () => {},
  });

  const openQuickCalculator = useCallback((title: string, initialValue: string | number, onApply: (val: string) => void) => {
    setQuickCalcState({
      isOpen: true,
      title: title || 'Calculadora Rápida',
      initialValue: initialValue ?? '',
      onApply,
    });
  }, []);

  // ================= AUTHENTICATION (LOGIN, CADASTRO, REDEFINIR SENHA & LEMBRAR DADOS) STATE =================
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getActiveSessionUser());
  const [showAuthScreen, setShowAuthScreen] = useState<boolean>(() => !getActiveSessionUser());
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recover'>('login');
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    const rem = getRememberedCredentials();
    return rem ? rem.rememberMe : true;
  });
  const [savedAccounts, setSavedAccounts] = useState<RememberedCredentials[]>(() => getSavedLoginAccounts());
  const [authName, setAuthName] = useState<string>('');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPhone, setAuthPhone] = useState<string>('');
  const [authBikeModel, setAuthBikeModel] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  // Offline / WorkManager Simulation State
  const [simulateOffline, setSimulateOffline] = useState<boolean>(false);
  const [workManagerStatus, setWorkManagerStatus] = useState<string>('WorkManager: Conectado · Room DB Ativo');
  const [lastSyncTime, setLastSyncTime] = useState<string>(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [syncFeedbackBanner, setSyncFeedbackBanner] = useState<string | null>(null);

  // Local Room DB State (isolated per user account, starting 100% clean with zero demo data)
  const [dbState, setDbState] = useState<LocalRoomDatabaseState>(() =>
    loadDatabaseForUser(getActiveSessionUser())
  );

  // Trigger Room Persistence + WorkManager Sync
  const persistAndEnqueueWorkManager = useCallback(
    async (nextState: LocalRoomDatabaseState, overrideUser?: UserProfile | null) => {
      const targetUser = overrideUser !== undefined ? overrideUser : currentUser;
      const stampedState: LocalRoomDatabaseState = {
        ...nextState,
        lastSyncedAt: new Date().toISOString(),
      };
      setDbState(stampedState);
      const storageKey = getStorageKeyForUser(targetUser);
      localStorage.setItem(storageKey, JSON.stringify(stampedState));

      if (simulateOffline) {
        setPendingSyncCount(prev => prev + 1);
        setWorkManagerStatus('Offline · Salvo no Room SQLite (WorkManager aguardando rede)');
        return;
      }

      setIsSyncing(true);
      const res = await runWorkManagerCloudSync(stampedState, targetUser?.email ?? null, simulateOffline);
      setIsSyncing(false);
      setLastSyncTime(res.timestamp);
      setWorkManagerStatus(res.status);
      if (res.success) {
        setPendingSyncCount(0);
      }
    },
    [simulateOffline, currentUser]
  );

  const [syncActionType, setSyncActionType] = useState<'upload' | 'download' | null>(null);
  const [showBackupCodePanel, setShowBackupCodePanel] = useState<boolean>(false);
  const [backupInputCode, setBackupInputCode] = useState<string>('');

  // BOTÃO 1: ENVIAR DADOS PARA A NUVEM (Upload Local -> Cloud)
  const handleUploadToCloud = useCallback(
    async (showFeedback = true) => {
      if (!currentUser || !currentUser.email) return;
      setIsSyncing(true);
      setSyncActionType('upload');
      if (showFeedback) {
        setSyncFeedbackBanner('Enviando seus dados atuais (corridas, gastos, KM e configurações) para a nuvem...');
      }

      const res = await uploadLocalDataToCloud(dbState, currentUser.email);

      setDbState(res.mergedState);
      localStorage.setItem(getStorageKeyForUser(currentUser), JSON.stringify(res.mergedState));
      setIsSyncing(false);
      setSyncActionType(null);
      setLastSyncTime(res.timestamp);
      setWorkManagerStatus(res.status);
      if (res.success) {
        setPendingSyncCount(0);
      }

      if (showFeedback) {
        if (res.success) {
          setSyncFeedbackBanner(
            `✅ Dados enviados para a nuvem às ${res.timestamp}! (${res.stats.entries} corridas, ${res.stats.expenses} gastos, ${res.stats.totalKm.toLocaleString('pt-BR')} km totais e ${res.stats.maintCards} cards de manutenção salvos no banco)`
          );
        } else {
          setSyncFeedbackBanner(
            `⚠️ Dados salvos neste aparelho às ${res.timestamp}. Verifique sua conexão para enviar à nuvem.`
          );
        }
      }
    },
    [currentUser, dbState]
  );

  // BOTÃO 2: BAIXAR / SINCRONIZAR DA NUVEM (Download Cloud -> Local)
  const handleDownloadFromCloud = useCallback(
    async (showFeedback = true) => {
      if (!currentUser || !currentUser.email) return;
      setIsSyncing(true);
      setSyncActionType('download');
      if (showFeedback) {
        setSyncFeedbackBanner('Buscando e baixando seus dados salvos na nuvem...');
      }

      const res = await downloadCloudDataToLocal(dbState, currentUser.email);

      setDbState(res.mergedState);
      localStorage.setItem(getStorageKeyForUser(currentUser), JSON.stringify(res.mergedState));
      setIsSyncing(false);
      setSyncActionType(null);
      setLastSyncTime(res.timestamp);
      setWorkManagerStatus(res.status);
      if (res.success) {
        setPendingSyncCount(0);
      }

      if (showFeedback) {
        if (res.foundRemoteData) {
          setSyncFeedbackBanner(
            `✅ Dados baixados da nuvem às ${res.timestamp}! (${res.stats.entries} corridas, ${res.stats.expenses} gastos, ${res.stats.totalKm.toLocaleString('pt-BR')} km rodados e ${res.stats.maintCards} manutenções sincronizados neste aparelho)`
          );
        } else {
          setSyncFeedbackBanner(
            `⚠️ Nenhum backup encontrado na nuvem para ${currentUser.email} ainda. No aparelho onde seus dados estão cadastrados, clique em "Enviar Dados para a Nuvem" ou use o Código de Transferência abaixo.`
          );
        }
      }
    },
    [currentUser, dbState]
  );

  // Automatic cloud download on initial mount and window focus (never overwrites cloud with empty local state!)
  useEffect(() => {
    let active = true;
    const pullFromRemoteOnLoad = async () => {
      if (!currentUser || currentUser.isGuest || !currentUser.email) return;
      const currentLocal = loadDatabaseForUser(currentUser);
      setIsSyncing(true);
      const res = await downloadCloudDataToLocal(currentLocal, currentUser.email);
      if (!active) return;
      if (res.foundRemoteData) {
        setDbState(res.mergedState);
        localStorage.setItem(getStorageKeyForUser(currentUser), JSON.stringify(res.mergedState));
        setLastSyncTime(res.timestamp);
        setWorkManagerStatus(res.status);
        setPendingSyncCount(0);
      }
      setIsSyncing(false);
    };

    pullFromRemoteOnLoad();

    const onWindowFocus = () => {
      if (active && currentUser?.email) {
        pullFromRemoteOnLoad();
      }
    };
    window.addEventListener('focus', onWindowFocus);
    return () => {
      active = false;
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [currentUser]);

  // Helper to complete login immediately and download user database from Cloud in background
  const completeUserSessionLogin = async (
    user: UserProfile,
    plainPassword: string,
    shouldRemember: boolean
  ) => {
    if (shouldRemember) {
      saveRememberedCredentials({
        email: user.email,
        password: plainPassword.trim(),
        name: user.name,
        bikeModel: user.bikeModel,
        rememberMe: true,
        updatedAt: new Date().toISOString(),
      });
    } else {
      saveRememberedCredentials(null);
    }
    setSavedAccounts(getSavedLoginAccounts());

    // Transition into the app immediately using local state
    const localUserDb = loadDatabaseForUser(user);
    setCurrentUser(user);
    setShowAuthScreen(false);
    setIsAuthLoading(false);
    if (!shouldRemember) {
      setAuthPassword('');
    }
    setDbState(localUserDb);
    localStorage.setItem(getStorageKeyForUser(user), JSON.stringify(localUserDb));
    setWorkManagerStatus('Sincronizando nuvem em segundo plano...');

    // Sync cloud data non-blockingly in the background
    void downloadCloudDataToLocal(localUserDb, user.email)
      .then((downRes) => {
        if (downRes.foundRemoteData) {
          setDbState(downRes.mergedState);
          localStorage.setItem(getStorageKeyForUser(user), JSON.stringify(downRes.mergedState));
          setLastSyncTime(downRes.timestamp);
          setWorkManagerStatus(downRes.status);
        } else {
          setWorkManagerStatus('Banco Local Carregado');
        }
      })
      .catch(() => {
        setWorkManagerStatus('Banco Local Carregado');
      });
  };

  // 1-Click Quick Login for Remembered Account
  const handleQuickSavedLogin = async (cred: RememberedCredentials) => {
    setAuthError(null);
    setAuthSuccess(null);
    setAuthEmail(cred.email);
    setAuthPassword(cred.password);
    setRememberMe(true);
    setIsAuthLoading(true);

    const res = await loginPilotAccount({
      email: cred.email,
      password: cred.password,
    });

    if (!res.ok || !res.user) {
      setIsAuthLoading(false);
      setAuthError(
        res.error || 'A senha desta conta foi alterada ou está incorreta. Digite sua senha atual ou clique em Redefinir Senha.'
      );
      return;
    }

    await completeUserSessionLogin(res.user, cred.password, true);
  };

  // ================= LOGIN, CADASTRO & RECOVERY HANDLERS =================
  const handleAuthSubmit = async (e: React.FormEvent, autoLoginOnRecover = true) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (authMode === 'login') {
      setIsAuthLoading(true);
      const res = await loginPilotAccount({
        email: authEmail,
        password: authPassword,
      });
      if (!res.ok || !res.user) {
        setIsAuthLoading(false);
        setAuthError(res.error || 'E-mail ou senha incorretos.');
        return;
      }

      await completeUserSessionLogin(res.user, authPassword, rememberMe);
      return;
    }

    if (authMode === 'register') {
      if (authPassword.trim() !== authConfirmPassword.trim()) {
        setAuthError('As senhas digitadas não coincidem.');
        return;
      }
      setIsAuthLoading(true);
      const res = await registerPilotAccount({
        name: authName,
        email: authEmail,
        password: authPassword,
        phone: authPhone,
        bikeModel: authBikeModel,
      });
      setIsAuthLoading(false);
      if (!res.ok || !res.user) {
        setAuthError(res.error || 'Não foi possível criar sua conta.');
        return;
      }

      if (rememberMe) {
        saveRememberedCredentials({
          email: res.user.email,
          password: authPassword.trim(),
          name: res.user.name,
          bikeModel: res.user.bikeModel,
          rememberMe: true,
          updatedAt: new Date().toISOString(),
        });
      } else {
        saveRememberedCredentials(null);
      }
      setSavedAccounts(getSavedLoginAccounts());

      // Brand-new account ALWAYS starts 100% clean (zero entries, zero expenses, zero demo data, zero goals, zero reserves)
      const freshUserDb = createCleanDatabaseState(res.user.bikeModel);
      setActiveShiftSession(null);
      setCurrentUser(res.user);
      setShowAuthScreen(false);
      setAuthName('');
      setAuthEmail('');
      setAuthPhone('');
      setAuthBikeModel('');
      setAuthPassword('');
      setAuthConfirmPassword('');
      const createdUser = res.user;
      void clearRemoteCloudData(createdUser.email).then(() =>
        persistAndEnqueueWorkManager(freshUserDb, createdUser)
      );
      return;
    }

    if (authMode === 'recover') {
      if (authPassword.trim() !== authConfirmPassword.trim()) {
        setAuthError('As senhas digitadas não coincidem.');
        return;
      }
      setIsAuthLoading(true);
      const res = await resetPilotPassword({
        email: authEmail,
        newPassword: authPassword,
      });
      if (!res.ok) {
        setIsAuthLoading(false);
        setAuthError(res.error || 'Erro ao redefinir a senha.');
        return;
      }

      const newPassClean = authPassword.trim();
      setAuthConfirmPassword('');

      if (autoLoginOnRecover && res.user) {
        await completeUserSessionLogin(res.user, newPassClean, rememberMe);
        setIsAuthLoading(false);
        return;
      }

      if (rememberMe && res.user) {
        saveRememberedCredentials({
          email: res.user.email,
          password: newPassClean,
          name: res.user.name,
          bikeModel: res.user.bikeModel,
          rememberMe: true,
          updatedAt: new Date().toISOString(),
        });
        setSavedAccounts(getSavedLoginAccounts());
      }

      setIsAuthLoading(false);
      setAuthSuccess(res.message || 'Senha redefinida com sucesso! Você já pode entrar.');
      setAuthPassword(rememberMe ? newPassClean : '');
      setAuthMode('login');
    }
  };

  const handleLogout = () => {
    saveActiveSessionUser(null);
    setActiveShiftSession(null);
    setCurrentUser(null);
    setDbState(createCleanDatabaseState());
    setAuthError(null);
    setAuthSuccess(null);
    setSavedAccounts(getSavedLoginAccounts());
    setAuthName('');
    setAuthEmail('');
    setAuthPhone('');
    setAuthBikeModel('');
    setAuthPassword('');
    setAuthConfirmPassword('');
    setAuthMode('login');
    setShowAuthScreen(true);
  };

  // All Apps, Shifts & Categories
  const allApps = useMemo(() => {
    const deleted = new Set(dbState.deletedAppIds || []);
    const overrides = dbState.appOverrides || {};
    const base = BASE_APPS.filter(a => !deleted.has(a.id) && a.id !== 'uber').map(a =>
      overrides[a.id] ? { ...a, ...overrides[a.id] } : a
    );
    const custom = (dbState.customApps || [])
      .filter(a => !deleted.has(a.id) && a.id !== 'uber' && a.name?.toLowerCase() !== 'uber')
      .map(a => (overrides[a.id] ? { ...a, ...overrides[a.id] } : a));
    const combined = [...base, ...custom];
    return combined.length > 0 ? combined : BASE_APPS;
  }, [dbState.appOverrides, dbState.customApps, dbState.deletedAppIds]);

  const allShifts = useMemo(() => {
    const deleted = new Set(dbState.deletedShiftIds || []);
    const overrides = dbState.shiftOverrides || {};
    const base = BASE_SHIFTS.filter(s => !deleted.has(s.id)).map(s =>
      overrides[s.id] ? { ...s, ...overrides[s.id] } : s
    );
    const custom = (dbState.customShifts || [])
      .filter(s => !deleted.has(s.id))
      .map(s => (overrides[s.id] ? { ...s, ...overrides[s.id] } : s));
    const combined = [...base, ...custom];
    return combined.length > 0 ? combined : BASE_SHIFTS;
  }, [dbState.shiftOverrides, dbState.customShifts, dbState.deletedShiftIds]);

  const motoCategories = useMemo(() => {
    return [...BASE_EXPENSE_CATEGORIES, ...dbState.customCategories];
  }, [dbState.customCategories]);

  const allCategories = useMemo(() => {
    const list: CategoryDefinition[] = [...BASE_EXPENSE_CATEGORIES, ...dbState.customCategories];
    if (Array.isArray(dbState.householdExpenses)) {
      dbState.householdExpenses.forEach(h => {
        if (!list.some(c => c.id === h.name || c.id === h.id || c.name.toLowerCase() === h.name.toLowerCase())) {
          list.push({ id: h.name, name: h.name });
        }
      });
    }
    dbState.expenses.forEach(e => {
      if (e.category && !list.some(c => c.id === e.category || c.name.toLowerCase() === e.category.toLowerCase())) {
        list.push({ id: e.category, name: e.category });
      }
    });
    return list;
  }, [dbState.customCategories, dbState.householdExpenses, dbState.expenses]);

  // Active Shift Session State (persisted in localStorage, tracks real-time GPS odometer)
  const [activeShiftSession, setActiveShiftSession] = useState<ShiftSession | null>(() => getStoredShiftSession());

  // Computed MVVM Totals (includes live GPS shift distance in real time when shift is active)
  const totals = useMemo(() => {
    const activeEntries = dbState.entries.filter(e => !e.isCancelled);
    const activeExpenses = dbState.expenses.filter(e => !e.isCancelled);

    const ridesKm = activeEntries.reduce((s, e) => s + Number(e.km || 0), 0);
    const baseTotalKm = (Number(dbState.fuelConfig.odometerBaseKm) || 0) + ridesKm;
    const liveShiftGpsKm =
      activeShiftSession?.isActive && activeShiftSession?.gpsEnabled !== false
        ? Number(activeShiftSession.gpsDistanceKm || 0)
        : 0;
    const totalKm = Math.round((baseTotalKm + liveShiftGpsKm) * 10) / 10;
    const totalHours = activeEntries.reduce((s, e) => s + Number(e.hours || 0), 0);

    const revenueByApp: Record<string, number> = {};
    allApps.forEach(a => (revenueByApp[a.id] = 0));
    activeEntries.forEach(e => {
      revenueByApp[e.app] = (revenueByApp[e.app] || 0) + Number(e.revenue || 0);
    });
    const totalRevenue = Object.values(revenueByApp).reduce((a, b) => a + b, 0);

    const expenseByCat: Record<string, number> = {};
    allCategories.forEach(c => (expenseByCat[c.id] = 0));
    activeExpenses.forEach(e => {
      expenseByCat[e.category] = (expenseByCat[e.category] || 0) + Number(e.amount || 0);
    });
    const totalExpense = Object.values(expenseByCat).reduce((a, b) => a + b, 0);

    return {
      ridesKm,
      baseTotalKm,
      liveShiftGpsKm,
      totalKm,
      totalHours,
      revenueByApp,
      totalRevenue,
      expenseByCat,
      totalExpense,
      lucro: totalRevenue - totalExpense,
    };
  }, [
    dbState.entries,
    dbState.expenses,
    dbState.fuelConfig.odometerBaseKm,
    allApps,
    allCategories,
    activeShiftSession?.isActive,
    activeShiftSession?.gpsEnabled,
    activeShiftSession?.gpsDistanceKm,
  ]);

  // Level info
  const level = useMemo(() => {
    const km = totals.totalKm;
    const idx = Math.floor(km / LEVEL_SPAN);
    const name =
      idx < LEVEL_NAMES.length
        ? LEVEL_NAMES[idx]
        : `${LEVEL_NAMES[LEVEL_NAMES.length - 1]} ${idx - LEVEL_NAMES.length + 2}`;
    const start = idx * LEVEL_SPAN;
    const end = start + LEVEL_SPAN;
    const pct = Math.max(0, Math.min(100, ((km - start) / LEVEL_SPAN) * 100));
    return { name, start, end, pct };
  }, [totals.totalKm]);

  // Period Totals
  const periodTotals = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
    const currentMonthName = PT_BR_MONTH_NAMES[now.getMonth()];
    const daysRemainingInMonth = getDaysRemainingInMonth();
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    let revWeek = 0;
    let revMonth = 0;
    let revYear = 0;

    let expWeek = 0;
    let expMonth = 0;
    let expYear = 0;

    dbState.entries.forEach(e => {
      if (e.isCancelled || !e.date) return;
      const rev = Number(e.revenue || 0);
      const entryDate = new Date(e.date + 'T12:00:00');
      if (entryDate.getFullYear() === currentYear) revYear += rev;
      if (e.date.startsWith(currentMonthStr)) revMonth += rev;
      if (entryDate >= monday && entryDate <= sunday) revWeek += rev;
    });

    dbState.expenses.forEach(ex => {
      if (ex.isCancelled || !ex.date) return;
      const amt = Number(ex.amount || 0);
      const expDate = new Date(ex.date + 'T12:00:00');
      if (expDate.getFullYear() === currentYear) expYear += amt;
      if (ex.date.startsWith(currentMonthStr)) expMonth += amt;
      if (expDate >= monday && expDate <= sunday) expWeek += amt;
    });

    const saldoWeek = revWeek - expWeek;
    const saldoMonth = revMonth - expMonth;
    const saldoYear = revYear - expYear;

    return {
      revWeek,
      expWeek,
      saldoWeek,
      revMonth,
      expMonth,
      saldoMonth,
      revYear,
      expYear,
      saldoYear,
      currentMonthStr,
      currentMonthName,
      daysRemainingInMonth,
    };
  }, [dbState.entries, dbState.expenses]);

  // Lista de meses disponíveis para o filtro de finanças (mês atual + meses anteriores)
  const availableFinanceMonths = useMemo(() => {
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const set = new Set<string>();
    set.add(currentYM);
    dbState.entries.forEach(e => {
      if (e.date && e.date.length >= 7) set.add(e.date.slice(0, 7));
    });
    dbState.expenses.forEach(ex => {
      if (ex.date && ex.date.length >= 7) set.add(ex.date.slice(0, 7));
    });
    (dbState.projectedRevenues || []).forEach(p => {
      if (p.date && p.date.length >= 7) set.add(p.date.slice(0, 7));
      if (p.startDate && p.startDate.length >= 7) set.add(p.startDate.slice(0, 7));
      if (Array.isArray(p.selectedDates)) {
        p.selectedDates.forEach(d => {
          if (d && d.length >= 7) set.add(d.slice(0, 7));
        });
      }
    });
    // Adiciona os próximos 6 meses futuros e os últimos 12 meses anteriores
    const [cy, cm] = currentYM.split('-').map(Number);
    for (let i = -6; i <= 12; i++) {
      const d = new Date(cy, cm - 1 - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      set.add(ym);
    }
    return Array.from(set).sort().reverse();
  }, [dbState.entries, dbState.expenses, dbState.projectedRevenues]);

  // Finanças completas do mês selecionado na Central de Finanças
  const selectedMonthFinancials = useMemo(() => {
    const mEntries = dbState.entries.filter(
      e => !e.isCancelled && e.date && e.date.startsWith(selectedFinanceMonth)
    );
    const mExpenses = dbState.expenses.filter(
      ex => !ex.isCancelled && ex.date && ex.date.startsWith(selectedFinanceMonth)
    );

    const totalRevenue = mEntries.reduce((s, e) => s + (Number(e.revenue) || 0), 0);
    const totalExpenses = mExpenses.reduce((s, ex) => s + (Number(ex.amount) || 0), 0);
    const currentBalance = totalRevenue - totalExpenses;
    const netMarginPct = totalRevenue > 0 ? Math.round((currentBalance / totalRevenue) * 100) : 0;

    const totalKm = mEntries.reduce((s, e) => s + (Number(e.km) || 0), 0);
    const totalHours = mEntries.reduce((s, e) => s + (Number(e.hours) || 0), 0);
    const activeDays = new Set(mEntries.map(e => e.date)).size;
    const avgPerKm = totalKm > 0 ? totalRevenue / totalKm : 0;
    const avgPerHour = totalHours > 0 ? totalRevenue / totalHours : 0;
    const avgPerRide = mEntries.length > 0 ? totalRevenue / mEntries.length : 0;

    // Resumo de faturamento por aplicativo no mês
    const appMap: Record<string, { id: string; name: string; icon: string; count: number; rev: number; km: number }> = {};
    mEntries.forEach(e => {
      const appInfo = allApps.find(
        a => a.id === e.app || a.name.toLowerCase() === (e.app || '').toLowerCase()
      ) || { id: e.app || 'outros', name: e.app || 'Outros', icon: '🛵' };

      const key = appInfo.name;
      if (!appMap[key]) {
        appMap[key] = { id: appInfo.id, name: appInfo.name, icon: appInfo.icon || '🛵', count: 0, rev: 0, km: 0 };
      }
      appMap[key].count += 1;
      appMap[key].rev += Number(e.revenue || 0);
      appMap[key].km += Number(e.km || 0);
    });

    const byApp = Object.values(appMap).sort((a, b) => b.rev - a.rev);

    // Mês formatado (ex: "Outubro de 2026")
    const [y, m] = selectedFinanceMonth.split('-');
    const monthName = PT_BR_MONTH_NAMES[parseInt(m, 10) - 1] || m;
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isCurrentMonth = selectedFinanceMonth === currentYM;

    // Faturamento Futuro Previsto do mês selecionado (com débito diário automático conforme os dias passam)
    const today = todayStr();
    const rawProjectedList: ProjectedRevenueItem[] = Array.isArray(dbState.projectedRevenues)
      ? dbState.projectedRevenues
      : [];
    const doesProjectedMatchMonth = (p: ProjectedRevenueItem, ym: string) => {
      if (Array.isArray(p.selectedDates) && p.selectedDates.length > 0) {
        return p.selectedDates.some(d => d && d.startsWith(ym));
      }
      if (p.date && p.date.startsWith(ym)) return true;
      if (p.startDate && p.startDate.startsWith(ym)) return true;
      if (p.startDate && p.date && p.startDate.length >= 7 && p.date.length >= 7) {
        return p.startDate.slice(0, 7) <= ym && p.date.slice(0, 7) >= ym;
      }
      return false;
    };
    const mProjected = rawProjectedList.filter(
      p => p.status !== 'cancelled' && doesProjectedMatchMonth(p, selectedFinanceMonth)
    );
    const mProjectedPending = mProjected.filter(p => p.status === 'pending');
    const projectedBalances = mProjectedPending.map(p => computeProjectedRevenueBalance(p, today));
    const projectedPendingRevenue = projectedBalances.reduce((s, b) => s + b.remainingAmount, 0);
    const projectedInitialRevenue = projectedBalances.reduce((s, b) => s + b.totalAmount, 0);
    const projectedDebitedRevenue = projectedBalances.reduce((s, b) => s + b.debitedAmount, 0);

    const allPendingProjected = rawProjectedList.filter(p => p.status === 'pending');
    const allProjectedBalances = allPendingProjected.map(p => computeProjectedRevenueBalance(p, today));
    const allProjectedPendingRevenue = allProjectedBalances.reduce((s, b) => s + b.remainingAmount, 0);
    const allProjectedInitialRevenue = allProjectedBalances.reduce((s, b) => s + b.totalAmount, 0);
    const allProjectedDebitedRevenue = allProjectedBalances.reduce((s, b) => s + b.debitedAmount, 0);
    const firstOtherProjectedMonth =
      allPendingProjected.find(p => !doesProjectedMatchMonth(p, selectedFinanceMonth))?.date?.slice(0, 7) ||
      null;

    // Média diária real do histórico de corridas (para sugestão no lançamento futuro)
    const dailyTotalsMap = new Map<string, number>();
    dbState.entries.forEach(e => {
      if (!e.isCancelled && e.date) {
        dailyTotalsMap.set(e.date, (dailyTotalsMap.get(e.date) || 0) + (Number(e.revenue) || 0));
      }
    });
    const historicalDailyAvg =
      dailyTotalsMap.size > 0
        ? Math.round(
            (Array.from(dailyTotalsMap.values()).reduce((a, b) => a + b, 0) / dailyTotalsMap.size) * 100
          ) / 100
        : 0;

    const projectedTotalRevenue = totalRevenue + projectedPendingRevenue;
    const projectedBalance = projectedTotalRevenue - totalExpenses;

    return {
      entries: mEntries,
      expenses: mExpenses,
      projectedList: mProjected,
      projectedPendingRevenue,
      projectedInitialRevenue,
      projectedDebitedRevenue,
      allProjectedPendingRevenue,
      allProjectedInitialRevenue,
      allProjectedDebitedRevenue,
      allProjectedPendingCount: allPendingProjected.length,
      firstOtherProjectedMonth,
      historicalDailyAvg,
      projectedTotalRevenue,
      projectedBalance,
      totalRevenue,
      totalExpenses,
      currentBalance,
      netMarginPct,
      totalKm,
      totalHours,
      activeDays,
      avgPerKm,
      avgPerHour,
      avgPerRide,
      byApp,
      monthName,
      year: y,
      formattedLabel: `${monthName} de ${y}`,
      isCurrentMonth,
    };
  }, [dbState.entries, dbState.expenses, dbState.projectedRevenues, selectedFinanceMonth, allApps]);

  // Shift & Bike Diagnostics
  const shiftEval = useMemo(() => {
    const today = todayStr();
    const activeEntries = dbState.entries.filter(e => !e.isCancelled);
    const todayEntries = activeEntries.filter(e => e.date === today);
    return evaluateShiftWorthiness(todayEntries, dbState.dailyGoal, activeEntries);
  }, [dbState.entries, dbState.dailyGoal]);

  const bikeDiagnostics = useMemo(() => {
    return evaluateBikeDiagnostics(dbState.maintenanceItems, dbState.fuelConfig, totals.totalKm);
  }, [dbState.maintenanceItems, dbState.fuelConfig, totals.totalKm]);

  // ================= NOTIFICAÇÕES NATIVAS (ALERTAS DE MANUTENÇÃO) =================
  // Todas as notificações do app são do sistema (Android). Nada é desenhado dentro do app.
  interface MaintAlertPayload {
    cycleKey: string;
    itemId: string;
    itemName: string;
    severity: 'alert' | 'overdue';
    wearPct: number;
    thresholdPct: number;
    kmRemaining: number;
  }

  const [notifPermission, setNotifPermission] = useState<NotificationPermissionState>('prompt');
  const [notifTestFeedback, setNotifTestFeedback] = useState<string | null>(null);

  const isMaintNotificationsEnabled = dbState.maintenanceNotificationsEnabled !== false;

  const maintAlertStats = useMemo(() => {
    let overdueCount = 0;
    let alertCount = 0;
    dbState.maintenanceItems.forEach(item => {
      const kmUsed = Math.max(0, totals.totalKm - (item.lastChangeKm || 0));
      const interval = Math.max(100, item.intervalKm || 1000);
      const wearPct = Math.round((kmUsed / interval) * 100);
      const thresholdPct = item.alertThresholdPct ?? 85;
      if (wearPct >= 100) {
        overdueCount += 1;
      } else if (wearPct >= thresholdPct) {
        alertCount += 1;
      }
    });
    return { overdueCount, alertCount };
  }, [dbState.maintenanceItems, totals.totalKm]);

  const dispatchMaintenanceNotification = useCallback((alert: MaintAlertPayload) => {
    const title =
      alert.severity === 'overdue'
        ? `🚨 Manutenção Vencida: ${alert.itemName}`
        : `⚠️ Ponto de Alerta (${alert.wearPct}%): ${alert.itemName}`;
    const body =
      alert.severity === 'overdue'
        ? `O limite de quilometragem foi atingido (${alert.wearPct}% de uso). Agende a troca agora.`
        : `Atingiu o ponto de alerta de ${alert.thresholdPct}%! Restam ${alert.kmRemaining.toLocaleString('pt-BR')} km para a revisão.`;
    return sendNativeNotification({
      tag: `maint_${alert.cycleKey}`,
      title,
      body,
      channel: 'maintenance',
      targetTab: 'maintenance',
    });
  }, []);

  // Inicializa canais nativos, lê a permissão atual e trata o toque na notificação
  useEffect(() => {
    void initNativeNotifications();
    void getNotificationPermission().then(setNotifPermission);
    onNotificationTap(target => {
      if (target === 'maintenance' || target === 'investments' || target === 'dashboard') {
        setShowAuthScreen(false);
        setActiveTab(target);
      }
    });
    return () => onNotificationTap(null);
  }, []);

  // Pede a permissão de notificações (Android 13+) assim que o usuário está logado
  useEffect(() => {
    if (showAuthScreen || !currentUser || currentUser.isGuest) return;
    void (async () => {
      const current = await getNotificationPermission();
      if (current !== 'granted' && isNativePlatform()) {
        setNotifPermission(await requestNotificationPermission());
      } else {
        setNotifPermission(current);
      }
    })();
  }, [showAuthScreen, currentUser]);

  // Monitora depósitos e resgates de investimentos e notifica de forma nativa
  useInvestmentWatcher({
    enabled: !showAuthScreen && !!currentUser && !currentUser.isGuest,
    email: currentUser?.email || '',
    isAdmin: isUserAdmin(currentUser),
  });

  // Watch maintenance items against totalKm and fire native notification when alertThresholdPct is reached
  useEffect(() => {
    if (!isMaintNotificationsEnabled || showAuthScreen) return;

    const notifiedStorageKey = `${getStorageKeyForUser(currentUser)}_notified_alerts_v1`;
    let notifiedMap: Record<string, boolean> = {};
    try {
      const raw = localStorage.getItem(notifiedStorageKey);
      if (raw) notifiedMap = JSON.parse(raw) || {};
    } catch {
      notifiedMap = {};
    }

    let updatedMap = false;

    dbState.maintenanceItems.forEach(item => {
      const kmUsed = Math.max(0, totals.totalKm - (item.lastChangeKm || 0));
      const interval = Math.max(100, item.intervalKm || 1000);
      const kmRemaining = Math.max(0, interval - kmUsed);
      const wearPct = Math.round((kmUsed / interval) * 100);
      const thresholdPct = item.alertThresholdPct ?? 85;

      if (wearPct >= thresholdPct) {
        const severity: 'alert' | 'overdue' = wearPct >= 100 ? 'overdue' : 'alert';
        const cycleKey = `${item.id}_${item.lastChangeKm || 0}_${severity}`;
        if (!notifiedMap[cycleKey]) {
          notifiedMap[cycleKey] = true;
          updatedMap = true;
          void dispatchMaintenanceNotification({
            cycleKey,
            itemId: item.id,
            itemName: item.name,
            severity,
            wearPct,
            thresholdPct,
            kmRemaining,
          });
        }
      }
    });

    if (updatedMap) {
      try {
        localStorage.setItem(notifiedStorageKey, JSON.stringify(notifiedMap));
      } catch {
        // Ignore storage quota errors
      }
    }
  }, [
    dbState.maintenanceItems,
    totals.totalKm,
    isMaintNotificationsEnabled,
    showAuthScreen,
    currentUser,
    dispatchMaintenanceNotification,
  ]);

  const handleToggleMaintenanceNotifications = async (nextEnabled: boolean) => {
    if (nextEnabled) {
      const current = await getNotificationPermission();
      setNotifPermission(current === 'prompt' ? await requestNotificationPermission() : current);
      // Limpa o cache de avisos para notificar de imediato itens que já estejam no ponto de alerta
      const notifiedStorageKey = `${getStorageKeyForUser(currentUser)}_notified_alerts_v1`;
      localStorage.removeItem(notifiedStorageKey);
    }

    await persistAndEnqueueWorkManager({
      ...dbState,
      maintenanceNotificationsEnabled: nextEnabled,
    });
  };

  const handleSendTestNotification = async () => {
    let perm = await getNotificationPermission();
    if (perm === 'prompt') perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm !== 'granted') {
      setNotifTestFeedback(
        'Permissão negada. Ative as notificações do Mochilinha nas configurações do Android.'
      );
      return;
    }
    const ok = await sendNativeNotification({
      tag: 'mochilinha_test',
      title: '🔔 Notificações ativas',
      body: 'Tudo certo! Você receberá alertas de manutenção e investimentos aqui.',
      channel: 'maintenance',
      targetTab: 'dashboard',
    });
    setNotifTestFeedback(ok ? 'Notificação de teste enviada.' : 'Não foi possível enviar a notificação.');
  };

  // ================= EDITABLE MOTO CARDS STATE (100% EDITABLE) =================
  const [editingMaintId, setEditingMaintId] = useState<string | null>(null);
  const [maintDraft, setMaintDraft] = useState<MaintenanceItem | null>(null);
  const [isAddingNewMaint, setIsAddingNewMaint] = useState<boolean>(false);
  const [maintSortBy, setMaintSortBy] = useState<'urgency' | 'name' | 'updatedAt'>('urgency');
  const [maintSearchQuery, setMaintSearchQuery] = useState<string>('');

  const sortedMaintenanceItems = useMemo(() => {
    const rawQuery = maintSearchQuery.trim();
    const normalizeText = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const filtered = dbState.maintenanceItems.filter(item => {
      if (!rawQuery) return true;
      if (editingMaintId === item.id) return true;

      const kmUsed = Math.max(0, totals.totalKm - (item.lastChangeKm || 0));
      const interval = Math.max(100, item.intervalKm || 1000);
      const kmRemaining = Math.max(0, interval - kmUsed);

      const normQuery = normalizeText(rawQuery);
      const normName = normalizeText(item.name || '');
      const normNotes = normalizeText(item.notes || '');

      // 1. Match by maintenance name (or notes)
      if (normName.includes(normQuery) || normNotes.includes(normQuery)) {
        return true;
      }

      // 2. Support comparison operators for remaining mileage (e.g., "<= 500", "< 1000", ">= 2000")
      const opMatch = normQuery.match(/^(<=|>=|<|>|=)\s*([\d.]+)\s*(km)?$/);
      if (opMatch) {
        const op = opMatch[1];
        const targetKm = Number(opMatch[2].replace(/\./g, ''));
        if (!Number.isNaN(targetKm)) {
          if (op === '<=') return kmRemaining <= targetKm;
          if (op === '<') return kmRemaining < targetKm;
          if (op === '>=') return kmRemaining >= targetKm;
          if (op === '>') return kmRemaining > targetKm;
          if (op === '=') return kmRemaining === targetKm;
        }
      }

      // 3. Match by remaining mileage (raw digits or formatted pt-BR string)
      const remainingRawStr = String(kmRemaining);
      const remainingFormattedStr = kmRemaining.toLocaleString('pt-BR');
      const cleanedKmQuery = normQuery
        .replace(/restam|restante|faltam|km/g, '')
        .trim();
      const digitsOnlyQuery = cleanedKmQuery.replace(/\./g, '');

      if (
        remainingRawStr.includes( normQuery ) ||
        remainingFormattedStr.includes( normQuery ) ||
        (digitsOnlyQuery !== '' &&
          /^\d+$/.test(digitsOnlyQuery) &&
          (remainingRawStr.includes(digitsOnlyQuery) ||
            remainingFormattedStr.replace(/\./g, '').includes(digitsOnlyQuery)))
      ) {
        return true;
      }

      return false;
    });

    return filtered.sort((a, b) => {
      if (maintSortBy === 'urgency') {
        const kmUsedA = Math.max(0, totals.totalKm - (a.lastChangeKm || 0));
        const pctA = (kmUsedA / Math.max(100, a.intervalKm || 1000)) * 100;
        const kmUsedB = Math.max(0, totals.totalKm - (b.lastChangeKm || 0));
        const pctB = (kmUsedB / Math.max(100, b.intervalKm || 1000)) * 100;
        return pctB - pctA;
      }
      if (maintSortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
      }
      if (maintSortBy === 'updatedAt') {
        const timeA = Number(a.updatedAt) || 0;
        const timeB = Number(b.updatedAt) || 0;
        return timeB - timeA;
      }
      return 0;
    });
  }, [dbState.maintenanceItems, maintSortBy, maintSearchQuery, totals.totalKm, editingMaintId]);

  const [isEditingFuelCard, setIsEditingFuelCard] = useState<boolean>(false);
  const [fuelDraft, setFuelDraft] = useState<FuelDiagnosticsConfig>(dbState.fuelConfig);

  const startEditMaintenanceCard = (item: MaintenanceItem) => {
    setIsAddingNewMaint(false);
    setEditingMaintId(item.id);
    setMaintDraft({ ...item });
  };

  const startCreateMaintenanceCard = (preset?: {
    name: string;
    icon: string;
    intervalKm: number;
    costEstimate: number;
    notes: string;
    alertThresholdPct?: number;
  }) => {
    const newCard: MaintenanceItem = {
      id: 'maint_' + Date.now(),
      name: preset?.name ?? '',
      icon: preset?.icon ?? '🔧',
      lastChangeKm: totals.totalKm,
      intervalKm: preset?.intervalKm ?? 5000,
      costEstimate: preset?.costEstimate ?? 65,
      notes: preset?.notes ?? '',
      isDefault: false,
      updatedAt: Date.now(),
      alertThresholdPct: preset?.alertThresholdPct ?? 85,
    };
    setIsAddingNewMaint(true);
    setEditingMaintId(newCard.id);
    setMaintDraft(newCard);
  };

  const saveMaintenanceCardEdit = () => {
    if (!maintDraft || !maintDraft.name.trim()) return;
    const sanitized: MaintenanceItem = {
      ...maintDraft,
      name: maintDraft.name.trim(),
      icon: maintDraft.icon.trim() || '🔧',
      lastChangeKm: Math.max(0, Number(maintDraft.lastChangeKm) || 0),
      intervalKm: Math.max(100, Number(maintDraft.intervalKm) || 1000),
      costEstimate: Math.max(0, Number(maintDraft.costEstimate) || 0),
      notes: (maintDraft.notes || '').trim(),
      updatedAt: Date.now(),
      alertThresholdPct: Math.min(99, Math.max(50, Number(maintDraft.alertThresholdPct) || 85)),
    };

    const exists = dbState.maintenanceItems.some(m => m.id === sanitized.id);
    const updatedList = exists
      ? dbState.maintenanceItems.map(m => (m.id === sanitized.id ? sanitized : m))
      : [...dbState.maintenanceItems, sanitized];

    persistAndEnqueueWorkManager({
      ...dbState,
      maintenanceItems: updatedList,
    });
    setEditingMaintId(null);
    setMaintDraft(null);
    setIsAddingNewMaint(false);
  };

  const deleteMaintenanceCard = (id: string) => {
    const updatedList = dbState.maintenanceItems.filter(m => m.id !== id);
    persistAndEnqueueWorkManager({
      ...dbState,
      maintenanceItems: updatedList,
    });
    if (editingMaintId === id) {
      setEditingMaintId(null);
      setMaintDraft(null);
    }
  };

  const duplicateMaintenanceCard = (item: MaintenanceItem) => {
    const newId = 'maint_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const source = maintDraft && editingMaintId === item.id ? maintDraft : item;
    const duplicatedItem: MaintenanceItem = {
      ...source,
      id: newId,
      name: `${(source.name || item.name).trim()} (Cópia)`,
      isDefault: false,
      history: [],
      updatedAt: Date.now(),
    };
    const updatedList = [...dbState.maintenanceItems, duplicatedItem];
    persistAndEnqueueWorkManager({
      ...dbState,
      maintenanceItems: updatedList,
    });
    setEditingMaintId(newId);
    setMaintDraft({ ...duplicatedItem });
  };

  // Maintenance Component Replacement History Pop-up Modal State
  const [selectedMaintHistoryId, setSelectedMaintHistoryId] = useState<string | null>(null);
  const [showAddMaintHistoryForm, setShowAddMaintHistoryForm] = useState<boolean>(false);
  const [editingMaintHistoryRecordId, setEditingMaintHistoryRecordId] = useState<string | null>(null);
  const [maintHistoryDate, setMaintHistoryDate] = useState<string>(todayStr());
  const [maintHistoryKm, setMaintHistoryKm] = useState<string>('');
  const [maintHistoryAmount, setMaintHistoryAmount] = useState<string>('');
  const [maintHistoryNotes, setMaintHistoryNotes] = useState<string>('');
  const [maintHistoryAddToExpenses, setMaintHistoryAddToExpenses] = useState<boolean>(false);

  const openMaintenanceHistoryModal = (item: MaintenanceItem, openFormDirectly = false) => {
    setSelectedMaintHistoryId(item.id);
    setEditingMaintHistoryRecordId(null);
    setMaintHistoryDate(todayStr());
    setMaintHistoryKm(String(totals.totalKm));
    setMaintHistoryAmount(String(item.costEstimate || 0));
    setMaintHistoryNotes(item.notes || '');
    setMaintHistoryAddToExpenses(false);
    setShowAddMaintHistoryForm(openFormDirectly);
  };

  const quickResetMaintenanceCard = (id: string) => {
    const newRecordId = 'mh_' + Date.now();
    const today = todayStr();
    const updatedList = dbState.maintenanceItems.map(m => {
      if (m.id !== id) return m;
      const newEntry: MaintenanceHistoryRecord = {
        id: newRecordId,
        date: today,
        km: totals.totalKm,
        amount: Math.max(0, Number(m.costEstimate) || 0),
        notes: m.notes || 'Troca registrada no painel',
      };
      const prevHistory = Array.isArray(m.history) ? m.history : [];
      return {
        ...m,
        lastChangeKm: totals.totalKm,
        updatedAt: Date.now(),
        history: [newEntry, ...prevHistory],
      };
    });
    persistAndEnqueueWorkManager({
      ...dbState,
      maintenanceItems: updatedList,
    });
  };

  const handleSaveMaintenanceHistoryRecord = () => {
    if (!selectedMaintHistoryId) return;
    const targetItem = dbState.maintenanceItems.find(m => m.id === selectedMaintHistoryId);
    if (!targetItem) return;

    const dateVal = maintHistoryDate || todayStr();
    const kmVal = Math.max(0, Number(maintHistoryKm) || 0);
    const amountVal = Math.max(0, Number(maintHistoryAmount) || 0);
    const notesVal = maintHistoryNotes.trim();
    const prevHistory = Array.isArray(targetItem.history) ? targetItem.history : [];

    let nextHistory: MaintenanceHistoryRecord[];
    if (editingMaintHistoryRecordId) {
      nextHistory = prevHistory.map(r =>
        r.id === editingMaintHistoryRecordId
          ? { ...r, date: dateVal, km: kmVal, amount: amountVal, notes: notesVal }
          : r
      );
    } else {
      const newRecord: MaintenanceHistoryRecord = {
        id: 'mh_' + Date.now(),
        date: dateVal,
        km: kmVal,
        amount: amountVal,
        notes: notesVal,
      };
      nextHistory = [newRecord, ...prevHistory];
    }

    // Sort newest first by date, then by KM descending
    nextHistory.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.km || 0) - (a.km || 0);
    });

    const highestRecordedKm = nextHistory.reduce(
      (maxKm, rec) => Math.max(maxKm, Number(rec.km) || 0),
      targetItem.lastChangeKm || 0
    );

    const updatedItems = dbState.maintenanceItems.map(m =>
      m.id === selectedMaintHistoryId
        ? {
            ...m,
            lastChangeKm: !editingMaintHistoryRecordId
              ? Math.max(m.lastChangeKm || 0, kmVal)
              : highestRecordedKm,
            updatedAt: Date.now(),
            history: nextHistory,
          }
        : m
    );

    const nextExpenses =
      !editingMaintHistoryRecordId && maintHistoryAddToExpenses && amountVal > 0
        ? [
            ...dbState.expenses,
            {
              id: Date.now(),
              date: dateVal,
              category: 'manutencao',
              amount: amountVal,
            },
          ]
        : dbState.expenses;

    persistAndEnqueueWorkManager({
      ...dbState,
      maintenanceItems: updatedItems,
      expenses: nextExpenses,
    });

    setEditingMaintHistoryRecordId(null);
    setShowAddMaintHistoryForm(false);
  };

  const handleDeleteMaintenanceHistoryRecord = (maintId: string, recordId: string) => {
    const updatedItems = dbState.maintenanceItems.map(m => {
      if (m.id !== maintId) return m;
      const filteredHistory = (m.history || []).filter(r => r.id !== recordId);
      return {
        ...m,
        history: filteredHistory,
        updatedAt: Date.now(),
      };
    });
    persistAndEnqueueWorkManager({
      ...dbState,
      maintenanceItems: updatedItems,
    });
    if (editingMaintHistoryRecordId === recordId) {
      setEditingMaintHistoryRecordId(null);
      setShowAddMaintHistoryForm(false);
    }
  };

  const startEditFuelCard = () => {
    setFuelDraft({ ...dbState.fuelConfig });
    setIsEditingFuelCard(true);
  };

  const saveFuelCardEdit = () => {
    const sanitized: FuelDiagnosticsConfig = {
      bikeModelName: fuelDraft.bikeModelName.trim() || 'Moto Principal',
      kmPerLiter: Math.max(5, Number(fuelDraft.kmPerLiter) || 35),
      fuelPrice: Math.max(0.5, Number(fuelDraft.fuelPrice) || 5.8),
      tankCapacityLiters: Math.max(3, Number(fuelDraft.tankCapacityLiters) || 16.1),
      odometerBaseKm: Math.max(0, Number(fuelDraft.odometerBaseKm) || 0),
    };
    persistAndEnqueueWorkManager({
      ...dbState,
      fuelConfig: sanitized,
    });
    setIsEditingFuelCard(false);
  };

  // ================= BIKE / DESPESAS DA MOTO HANDLERS =================
  const handleAddBikeCategory = () => {
    const trimmed = newBikeCatName.trim();
    if (!trimmed) return;
    const existing = (dbState.customCategories || []).find(
      c => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      setBikeDraft(prev => ({ ...prev, category: existing.id as any }));
      setNewBikeCatName('');
      setShowNewBikeCatInput(false);
      return;
    }
    const id = 'cat_' + Date.now();
    const nextCats = [...(dbState.customCategories || []), { id, name: trimmed }];
    persistAndEnqueueWorkManager({ ...dbState, customCategories: nextCats });
    setBikeDraft(prev => ({ ...prev, category: id as any }));
    setNewBikeCatName('');
    setShowNewBikeCatInput(false);
  };

  const openNewBikeExpenseModal = () => {
    setEditingBikeItem(null);
    setShowNewBikeCatInput(false);
    setNewBikeCatName('');
    const today = todayStr();
    setBikeDraft({
      id: 'bike_' + Date.now(),
      name: '',
      category: 'manutencao',
      monthlyAmount: 0,
      recurrenceType: 'interval_days',
      intervalDays: 90,
      totalCost: 0,
      lastPaidDate: today,
      nextDueDate: addDaysToDateStr(today, 90),
      dueDay: 15,
      icon: '🏍️',
      isActive: true,
    });
    setShowBikeModal(true);
  };

  const openEditBikeExpenseModal = (item: BikeExpenseItem) => {
    setShowNewBikeCatInput(false);
    setNewBikeCatName('');
    const rawList =
      Array.isArray(dbState.bikeExpenses)
        ? dbState.bikeExpenses
        : DEFAULT_BIKE_EXPENSES;
    const rawItem = rawList.find(b => b.id === item.id) || item;

    setEditingBikeItem(rawItem);
    const today = todayStr();
    const recType: ExpenseRecurrenceType =
      rawItem.recurrenceType || (rawItem.intervalDays ? 'interval_days' : 'monthly');
    const intDays = Math.max(1, Number(rawItem.intervalDays) || 30);
    const rawMonthly = Math.max(0, Number(rawItem.monthlyAmount) || 0);
    const tCost =
      rawItem.totalCost !== undefined && Number(rawItem.totalCost) > 0
        ? Number(rawItem.totalCost)
        : Math.round((rawMonthly * (intDays / 30)) * 100) / 100;
    const mAmt =
      recType === 'interval_days' && tCost > 0
        ? Math.round(((tCost / intDays) * 30) * 100) / 100
        : rawMonthly;
    const lastPaid = rawItem.lastPaidDate || today;
    const nextDue = rawItem.nextDueDate || addDaysToDateStr(lastPaid, intDays);

    setBikeDraft({
      ...rawItem,
      monthlyAmount: mAmt,
      recurrenceType: recType,
      intervalDays: intDays,
      totalCost: tCost,
      lastPaidDate: lastPaid,
      nextDueDate: nextDue,
      dueDay: rawItem.dueDay || 15,
      isCustomEdited: true,
    });
    setShowBikeModal(true);
  };

  const saveBikeExpense = () => {
    const list = Array.isArray(dbState.bikeExpenses)
      ? [...dbState.bikeExpenses]
      : DEFAULT_BIKE_EXPENSES.map(b => ({ ...b }));

    const recType: ExpenseRecurrenceType = bikeDraft.recurrenceType || 'monthly';
    const intDays = Math.max(1, Number(bikeDraft.intervalDays) || 30);
    const totalCostVal = Math.max(0, Number(bikeDraft.totalCost) || 0);
    const computedMonthly =
      recType === 'interval_days' && totalCostVal > 0
        ? Math.round(((totalCostVal / intDays) * 30) * 100) / 100
        : Math.max(0, Number(bikeDraft.monthlyAmount) || 0);

    const sanitized: BikeExpenseItem = {
      id: bikeDraft.id || 'bike_' + Date.now(),
      name: bikeDraft.name.trim() || 'Despesa da Moto',
      category: bikeDraft.category || 'outros',
      monthlyAmount: computedMonthly,
      recurrenceType: recType,
      dueDay: Math.max(1, Math.min(31, Number(bikeDraft.dueDay) || 15)),
      intervalDays: intDays,
      totalCost: recType === 'interval_days' ? (totalCostVal > 0 ? totalCostVal : computedMonthly) : totalCostVal,
      lastPaidDate: bikeDraft.lastPaidDate || todayStr(),
      nextDueDate:
        recType === 'interval_days'
          ? bikeDraft.nextDueDate || addDaysToDateStr(bikeDraft.lastPaidDate || todayStr(), intDays)
          : bikeDraft.nextDueDate || addDaysToDateStr(todayStr(), 30),
      icon: bikeDraft.icon?.trim() || '🏍️',
      isActive: bikeDraft.isActive !== false,
      isCustomEdited: true,
    };

    const existingIndex = list.findIndex(b => b.id === sanitized.id);
    if (existingIndex >= 0) {
      list[existingIndex] = sanitized;
    } else {
      list.push(sanitized);
    }

    // Sincronização bidirecional com o planejamento financeiro e itens de manutenção preventiva
    let updatedPlan = { ...finPlan };
    let planChanged = false;
    let updatedMaintItems = Array.isArray(dbState.maintenanceItems) ? [...dbState.maintenanceItems] : [];
    let maintChanged = false;

    const lowerName = sanitized.name.toLowerCase();
    const effectiveCost = totalCostVal > 0 ? totalCostVal : computedMonthly;

    // Sincronizar IPVA
    if (sanitized.id === 'ipva_licenciamento' || lowerName.includes('ipva')) {
      const annualVal = totalCostVal > 0 ? totalCostVal : Math.round(computedMonthly * 12);
      if (annualVal > 0) {
        updatedPlan.ipvaAnnual = annualVal;
        planChanged = true;
      }
    }
    // Sincronizar Licenciamento
    if (lowerName.includes('licenciamento')) {
      const licVal = totalCostVal > 0 ? totalCostVal : Math.round(computedMonthly * 12);
      if (licVal > 0) {
        updatedPlan.licensingAnnual = licVal;
        planChanged = true;
      }
    }
    // Sincronizar Seguro / MEI
    if (sanitized.id === 'seguro_rastreador' || lowerName.includes('seguro') || lowerName.includes('rastreador')) {
      const insMonthly = computedMonthly > 0 ? computedMonthly : Math.round(totalCostVal / 12);
      if (insMonthly > 0) {
        updatedPlan.insuranceOrMeiMonthly = insMonthly;
        planChanged = true;
      }
    }

    // Sincronizar estimativas de custo de manutenção por peça
    if (sanitized.id === 'oleo_motor' || lowerName.includes('óleo')) {
      const idx = updatedMaintItems.findIndex(m => m.id === 'oil');
      if (idx >= 0 && effectiveCost > 0) {
        updatedMaintItems[idx] = { ...updatedMaintItems[idx], costEstimate: effectiveCost };
        maintChanged = true;
      }
    }
    if (sanitized.id === 'pneus_camaras' || lowerName.includes('pneu')) {
      const idx = updatedMaintItems.findIndex(m => m.id === 'tire');
      if (idx >= 0 && effectiveCost > 0) {
        updatedMaintItems[idx] = { ...updatedMaintItems[idx], costEstimate: effectiveCost };
        maintChanged = true;
      }
    }
    if (sanitized.id === 'kit_transmissao' || lowerName.includes('relação') || lowerName.includes('corrente')) {
      const idx = updatedMaintItems.findIndex(m => m.id === 'chain');
      if (idx >= 0 && effectiveCost > 0) {
        updatedMaintItems[idx] = { ...updatedMaintItems[idx], costEstimate: effectiveCost };
        maintChanged = true;
      }
    }
    if (sanitized.id === 'freios_pastilhas' || lowerName.includes('freio') || lowerName.includes('pastilha')) {
      const idx = updatedMaintItems.findIndex(m => m.id === 'brake');
      if (idx >= 0 && effectiveCost > 0) {
        updatedMaintItems[idx] = { ...updatedMaintItems[idx], costEstimate: effectiveCost };
        maintChanged = true;
      }
    }

    persistAndEnqueueWorkManager({
      ...dbState,
      bikeExpenses: list,
      deletedBikeExpenseIds: (dbState.deletedBikeExpenseIds || []).filter(id => id !== sanitized.id),
      ...(planChanged ? { financialPlan: updatedPlan } : {}),
      ...(maintChanged ? { maintenanceItems: updatedMaintItems } : {}),
    });
    setShowBikeModal(false);
    setEditingBikeItem(null);
  };

  const deleteBikeExpense = (id: string) => {
    const currentList = Array.isArray(dbState.bikeExpenses)
      ? dbState.bikeExpenses
      : DEFAULT_BIKE_EXPENSES;
    const list = currentList.filter(b => b.id !== id);
    const nextDeletedIds = Array.from(
      new Set([...(dbState.deletedBikeExpenseIds || []).map(String), String(id)])
    );
    persistAndEnqueueWorkManager({
      ...dbState,
      bikeExpenses: list,
      deletedBikeExpenseIds: nextDeletedIds,
    });
  };

  const toggleBikeExpense = (id: string) => {
    const currentList = Array.isArray(dbState.bikeExpenses)
      ? dbState.bikeExpenses
      : DEFAULT_BIKE_EXPENSES;
    const list = currentList.map(b =>
      b.id === id ? { ...b, isActive: !b.isActive } : b
    );
    persistAndEnqueueWorkManager({
      ...dbState,
      bikeExpenses: list,
    });
  };

  const resetDefaultBikeExpenses = () => {
    const defaultIds = new Set(DEFAULT_BIKE_EXPENSES.map(b => b.id));
    persistAndEnqueueWorkManager({
      ...dbState,
      bikeExpenses: DEFAULT_BIKE_EXPENSES.map(b => ({ ...b })),
      deletedBikeExpenseIds: (dbState.deletedBikeExpenseIds || []).filter(id => !defaultIds.has(String(id))),
    });
  };

  const duplicateBikeExpense = (item: BikeExpenseItem) => {
    const currentList = Array.isArray(dbState.bikeExpenses)
      ? dbState.bikeExpenses
      : DEFAULT_BIKE_EXPENSES;

    const newId = 'bike_' + Date.now();
    const duplicatedItem: BikeExpenseItem = {
      ...item,
      id: newId,
      name: `${item.name} (Cópia)`,
      isCustomEdited: true,
      lastPaidDate: undefined,
      paidMonths: [], // A cópia nasce pendente!
      unpaidMonths: [],
    };

    const nextList = [...currentList, duplicatedItem];
    persistAndEnqueueWorkManager({
      ...dbState,
      bikeExpenses: nextList,
    });
  };

  const duplicateHouseholdExpense = (item: HouseholdExpenseItem) => {
    const currentList = Array.isArray(dbState.householdExpenses)
      ? dbState.householdExpenses
      : DEFAULT_HOUSEHOLD_EXPENSES;

    const newId = 'house_' + Date.now();
    const duplicatedItem: HouseholdExpenseItem = {
      ...item,
      id: newId,
      name: `${item.name} (Cópia)`,
      isCustomEdited: true,
      lastPaidDate: undefined,
      paidMonths: [], // A cópia nasce pendente!
      unpaidMonths: [],
    };

    const nextList = [...currentList, duplicatedItem];
    persistAndEnqueueWorkManager({
      ...dbState,
      householdExpenses: nextList,
    });
  };

  const getHouseholdExpenseMonthPayments = useCallback(
    (item: HouseholdExpenseItem, targetYM: string) => {
      const matching = (dbState.expenses || []).filter(
        e => !e.isCancelled && e.date && e.date.startsWith(targetYM) && matchesHouseholdExpense(e, item)
      );
      const totalPaid = matching.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return { matching, totalPaid };
    },
    [dbState.expenses]
  );

  const getBikeExpenseMonthPayments = useCallback(
    (item: BikeExpenseItem, targetYM: string) => {
      const matching = (dbState.expenses || []).filter(
        e => !e.isCancelled && e.date && e.date.startsWith(targetYM) && matchesBikeExpense(e, item)
      );
      const totalPaid = matching.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return { matching, totalPaid };
    },
    [dbState.expenses]
  );

  const toggleBikeExpensePaidStatus = (itemId: string, targetYM?: string) => {
    const ym = targetYM || selectedFinanceMonth || todayStr().slice(0, 7);
    const currentList = Array.isArray(dbState.bikeExpenses)
      ? dbState.bikeExpenses
      : DEFAULT_BIKE_EXPENSES;

    const list = currentList.map(b => {
      if (b.id !== itemId) return b;
      const currentPaidMonths = Array.isArray(b.paidMonths) ? [...b.paidMonths] : [];
      const currentUnpaidMonths = Array.isArray(b.unpaidMonths) ? [...b.unpaidMonths] : [];

      const { totalPaid } = getBikeExpenseMonthPayments(b, ym);
      const currentDueInfo = getExpenseDueInfo(b, totalPaid, ym);
      const isCurrentlyPaid = currentDueInfo.status === 'paid';

      if (isCurrentlyPaid) {
        // Estava Quitado -> Usuário quer alternar para "A Pagar"
        const nextPaidMonths = currentPaidMonths.filter(m => m !== ym);
        const nextUnpaidMonths = Array.from(new Set([...currentUnpaidMonths, ym]));
        return {
          ...b,
          paidMonths: nextPaidMonths,
          unpaidMonths: nextUnpaidMonths,
          lastPaidDate: b.lastPaidDate?.startsWith(ym) ? undefined : b.lastPaidDate,
        };
      } else {
        // Estava A Pagar -> Usuário quer alternar para "Quitado"
        const nextPaidMonths = Array.from(new Set([...currentPaidMonths, ym]));
        const nextUnpaidMonths = currentUnpaidMonths.filter(m => m !== ym);
        return {
          ...b,
          paidMonths: nextPaidMonths,
          unpaidMonths: nextUnpaidMonths,
          lastPaidDate: todayStr(),
        };
      }
    });

    persistAndEnqueueWorkManager({
      ...dbState,
      bikeExpenses: list,
    });
  };

  const toggleHouseholdExpensePaidStatus = (itemId: string, targetYM?: string) => {
    const ym = targetYM || selectedFinanceMonth || todayStr().slice(0, 7);
    const currentList = Array.isArray(dbState.householdExpenses)
      ? dbState.householdExpenses
      : DEFAULT_HOUSEHOLD_EXPENSES;

    const list = currentList.map(h => {
      if (h.id !== itemId) return h;
      const currentPaidMonths = Array.isArray(h.paidMonths) ? [...h.paidMonths] : [];
      const currentUnpaidMonths = Array.isArray(h.unpaidMonths) ? [...h.unpaidMonths] : [];

      const { totalPaid } = getHouseholdExpenseMonthPayments(h, ym);
      const currentDueInfo = getExpenseDueInfo(h, totalPaid, ym);
      const isCurrentlyPaid = currentDueInfo.status === 'paid';

      if (isCurrentlyPaid) {
        // Estava Quitado -> Usuário quer alternar para "A Pagar"
        const nextPaidMonths = currentPaidMonths.filter(m => m !== ym);
        const nextUnpaidMonths = Array.from(new Set([...currentUnpaidMonths, ym]));
        return {
          ...h,
          paidMonths: nextPaidMonths,
          unpaidMonths: nextUnpaidMonths,
          lastPaidDate: h.lastPaidDate?.startsWith(ym) ? undefined : h.lastPaidDate,
        };
      } else {
        // Estava A Pagar -> Usuário quer alternar para "Quitado"
        const nextPaidMonths = Array.from(new Set([...currentPaidMonths, ym]));
        const nextUnpaidMonths = currentUnpaidMonths.filter(m => m !== ym);
        return {
          ...h,
          paidMonths: nextPaidMonths,
          unpaidMonths: nextUnpaidMonths,
          lastPaidDate: todayStr(),
        };
      }
    });

    persistAndEnqueueWorkManager({
      ...dbState,
      householdExpenses: list,
    });
  };

  const openNewBikePaymentModal = (item: BikeExpenseItem) => {
    setEditingEntryId(null);
    setEntryMode('gasto');
    setExpenseType('moto');
    setSelectedBikeExpenseId(item.id);
    setSelectedHouseholdExpenseId('');
    setSelectedCategory(item.name);
    setEntryDate(todayStr());

    const targetYM = selectedFinanceMonth || todayStr().slice(0, 7);
    const { totalPaid } = getBikeExpenseMonthPayments(item, targetYM);
    const fullVal = item.recurrenceType === 'interval_days' && item.totalCost && item.totalCost > 0
      ? item.totalCost
      : ((item as any).monthlyCost || item.monthlyAmount);
    const isExplicitlyUnpaid = Boolean(item.unpaidMonths && item.unpaidMonths.includes(targetYM));
    const remainingVal = isExplicitlyUnpaid ? fullVal : Math.max(0, fullVal - totalPaid);
    const payVal = remainingVal > 0 ? remainingVal : fullVal;

    setExpenseAmount(payVal > 0 ? String(payVal) : '');
    setExpenseDescription(`Pagamento / Manutenção: ${item.name}`);
    setShowNewHouseholdInModal(false);
    setNewHouseholdNameInModal('');
    setEntryModalFeedback(null);
    setIsEntryModeDedicated(true);
    setShowEntryModal(true);
  };

  // ================= HOUSEHOLD / CUSTO DE VIDA DA CASA HANDLERS =================
  const handleAddHouseholdCategory = () => {
    const trimmed = newHouseholdCatName.trim();
    if (!trimmed) return;
    const existing = (dbState.customCategories || []).find(
      c => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      setHouseholdDraft(prev => ({ ...prev, category: existing.id as any }));
      setNewHouseholdCatName('');
      setShowNewHouseholdCatInput(false);
      return;
    }
    const id = 'cat_h_' + Date.now();
    const nextCats = [...(dbState.customCategories || []), { id, name: trimmed }];
    persistAndEnqueueWorkManager({ ...dbState, customCategories: nextCats });
    setHouseholdDraft(prev => ({ ...prev, category: id as any }));
    setNewHouseholdCatName('');
    setShowNewHouseholdCatInput(false);
  };

  const openNewHouseholdExpenseModal = () => {
    setEditingHouseholdItem(null);
    setShowNewHouseholdCatInput(false);
    setNewHouseholdCatName('');
    const today = todayStr();
    setHouseholdDraft({
      id: 'house_' + Date.now(),
      name: '',
      category: 'moradia',
      monthlyAmount: 0,
      recurrenceType: 'monthly',
      intervalDays: 30,
      totalCost: 0,
      lastPaidDate: today,
      nextDueDate: addDaysToDateStr(today, 30),
      dueDay: 10,
      icon: '🏠',
      isActive: true,
    });
    setShowHouseholdModal(true);
  };

  const openEditHouseholdExpenseModal = (item: HouseholdExpenseItem) => {
    setEditingHouseholdItem(item);
    setShowNewHouseholdCatInput(false);
    setNewHouseholdCatName('');
    const today = todayStr();
    const recType: ExpenseRecurrenceType = item.recurrenceType || (item.intervalDays ? 'interval_days' : 'monthly');
    const intDays = Math.max(1, Number(item.intervalDays) || 30);
    const mAmt = Math.max(0, Number(item.monthlyAmount) || 0);
    const tCost = item.totalCost !== undefined ? Number(item.totalCost) : Math.round((mAmt * (intDays / 30)) * 100) / 100;
    const lastPaid = item.lastPaidDate || today;
    const nextDue = item.nextDueDate || addDaysToDateStr(lastPaid, intDays);

    setHouseholdDraft({
      ...item,
      recurrenceType: recType,
      intervalDays: intDays,
      totalCost: tCost,
      lastPaidDate: lastPaid,
      nextDueDate: nextDue,
      dueDay: item.dueDay || 10,
    });
    setShowHouseholdModal(true);
  };

  const saveHouseholdExpense = () => {
    const list = Array.isArray(dbState.householdExpenses)
      ? [...dbState.householdExpenses]
      : DEFAULT_HOUSEHOLD_EXPENSES.map(h => ({ ...h }));

    const recType: ExpenseRecurrenceType = householdDraft.recurrenceType || 'monthly';
    const intDays = Math.max(1, Number(householdDraft.intervalDays) || 30);
    const totalCostVal = Math.max(0, Number(householdDraft.totalCost) || 0);
    const computedMonthly =
      recType === 'interval_days' && totalCostVal > 0
        ? Math.round(((totalCostVal / intDays) * 30) * 100) / 100
        : Math.max(0, Number(householdDraft.monthlyAmount) || 0);

    const sanitized: HouseholdExpenseItem = {
      id: householdDraft.id || 'house_' + Date.now(),
      name: householdDraft.name.trim() || 'Despesa Doméstica',
      category: householdDraft.category || 'outros',
      monthlyAmount: computedMonthly,
      recurrenceType: recType,
      dueDay: Math.max(1, Math.min(31, Number(householdDraft.dueDay) || 10)),
      intervalDays: intDays,
      totalCost: recType === 'interval_days' ? (totalCostVal > 0 ? totalCostVal : computedMonthly) : totalCostVal,
      lastPaidDate: householdDraft.lastPaidDate || todayStr(),
      nextDueDate:
        recType === 'interval_days'
          ? householdDraft.nextDueDate || addDaysToDateStr(householdDraft.lastPaidDate || todayStr(), intDays)
          : householdDraft.nextDueDate || addDaysToDateStr(todayStr(), 30),
      icon: householdDraft.icon?.trim() || '🏠',
      isActive: householdDraft.isActive !== false,
      isCustomEdited: true,
    };

    const existingIndex = list.findIndex(h => h.id === sanitized.id);
    if (existingIndex >= 0) {
      list[existingIndex] = sanitized;
    } else {
      list.push(sanitized);
    }

    persistAndEnqueueWorkManager({
      ...dbState,
      householdExpenses: list,
      deletedHouseholdExpenseIds: (dbState.deletedHouseholdExpenseIds || []).filter(
        id => id !== sanitized.id
      ),
    });
    setShowHouseholdModal(false);
    setEditingHouseholdItem(null);
  };

  const deleteHouseholdExpense = (id: string) => {
    const currentList = Array.isArray(dbState.householdExpenses)
      ? dbState.householdExpenses
      : DEFAULT_HOUSEHOLD_EXPENSES;
    const list = currentList.filter(h => h.id !== id);
    const nextDeletedIds = Array.from(
      new Set([...(dbState.deletedHouseholdExpenseIds || []).map(String), String(id)])
    );
    persistAndEnqueueWorkManager({
      ...dbState,
      householdExpenses: list,
      deletedHouseholdExpenseIds: nextDeletedIds,
    });
  };

  const toggleHouseholdExpense = (id: string) => {
    const currentList = Array.isArray(dbState.householdExpenses)
      ? dbState.householdExpenses
      : DEFAULT_HOUSEHOLD_EXPENSES;
    const list = currentList.map(h =>
      h.id === id ? { ...h, isActive: !h.isActive } : h
    );
    persistAndEnqueueWorkManager({
      ...dbState,
      householdExpenses: list,
    });
  };

  const resetDefaultHouseholdExpenses = () => {
    const defaultIds = new Set(DEFAULT_HOUSEHOLD_EXPENSES.map(h => h.id));
    persistAndEnqueueWorkManager({
      ...dbState,
      householdExpenses: DEFAULT_HOUSEHOLD_EXPENSES.map(h => ({ ...h })),
      deletedHouseholdExpenseIds: (dbState.deletedHouseholdExpenseIds || []).filter(
        id => !defaultIds.has(String(id))
      ),
    });
  };

  // ================= PROJEÇÃO / FATURAMENTO FUTURO PREVISTO HANDLERS =================
  const openNewProjectedRevenueModal = (defaultDate?: string) => {
    setEditingProjectedId(null);
    const today = todayStr();
    const initialDates = defaultDate ? [defaultDate] : [];
    const suggestedDaily =
      selectedMonthFinancials.historicalDailyAvg > 0
        ? selectedMonthFinancials.historicalDailyAvg
        : 0;
    setProjectedCalendarMonth((defaultDate || today).slice(0, 7));
    setProjectedSelectedDates(initialDates);
    setProjectedDailyRate(suggestedDaily > 0 ? String(suggestedDaily) : '');
    setProjectedAmount(
      initialDates.length > 0 && suggestedDaily > 0
        ? String(Math.round(initialDates.length * suggestedDaily * 100) / 100)
        : ''
    );
    setProjectedDescription('');
    setProjectedApp('Particular');
    setProjectedNotes('');
    setShowProjectedCalendarModal(false);
    setShowProjectedModal(true);
  };

  const openEditProjectedRevenueModal = (item: ProjectedRevenueItem) => {
    const bal = computeProjectedRevenueBalance(item, todayStr());
    setEditingProjectedId(item.id);
    const initialDates =
      bal.selectedDates.length > 0
        ? bal.selectedDates
        : item.date
        ? [item.date]
        : [todayStr()];
    setProjectedCalendarMonth((initialDates[0] || todayStr()).slice(0, 7));
    setProjectedSelectedDates(initialDates);
    setProjectedDailyRate(String(item.dailyRate || bal.dailyRate || item.amount));
    setProjectedAmount(String(item.amount));
    setProjectedDescription(item.description);
    setProjectedApp(item.app || 'Particular');
    setProjectedNotes(item.notes || '');
    setShowProjectedCalendarModal(false);
    setShowProjectedModal(true);
  };

  const handleSaveProjectedRevenue = () => {
    const sortedDates = Array.from(
      new Set(projectedSelectedDates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))
    ).sort();
    if (sortedDates.length === 0) {
      alert('Por favor, selecione no calendário pelo menos 1 dia que irá rodar.');
      return;
    }

    const workDaysVal = sortedDates.length;
    const dailyRateVal = parseFloat(projectedDailyRate.replace(',', '.')) || 0;
    const explicitTotal = parseFloat(projectedAmount.replace(',', '.')) || 0;
    const totalVal =
      dailyRateVal > 0
        ? Math.round(workDaysVal * dailyRateVal * 100) / 100
        : Math.round(explicitTotal * 100) / 100;

    if (!totalVal || totalVal <= 0) {
      alert('Por favor, informe o valor da diária prevista (ou o valor total) maior que zero.');
      return;
    }
    const finalDailyRate =
      dailyRateVal > 0
        ? Math.round(dailyRateVal * 100) / 100
        : Math.round((totalVal / workDaysVal) * 100) / 100;
    const desc = projectedDescription.trim() || 'Faturamento Previsto';
    const startStr = sortedDates[0];
    const dateStr = sortedDates[sortedDates.length - 1];

    const currentList: ProjectedRevenueItem[] = Array.isArray(dbState.projectedRevenues)
      ? dbState.projectedRevenues
      : [];

    let savedId = editingProjectedId;
    let updatedList: ProjectedRevenueItem[];
    if (editingProjectedId) {
      updatedList = currentList.map(p =>
        p.id === editingProjectedId
          ? {
              ...p,
              startDate: startStr,
              date: dateStr,
              selectedDates: sortedDates,
              workDays: workDaysVal,
              dailyRate: finalDailyRate,
              amount: totalVal,
              description: desc,
              app: projectedApp,
              notes: projectedNotes.trim() || undefined,
            }
          : p
      );
    } else {
      savedId = 'proj_' + Date.now();
      const newItem: ProjectedRevenueItem = {
        id: savedId,
        startDate: startStr,
        date: dateStr,
        selectedDates: sortedDates,
        workDays: workDaysVal,
        dailyRate: finalDailyRate,
        amount: totalVal,
        description: desc,
        app: projectedApp,
        status: 'pending',
        notes: projectedNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      updatedList = [newItem, ...currentList];
    }

    persistAndEnqueueWorkManager({
      ...dbState,
      projectedRevenues: updatedList,
      deletedProjectedRevenueIds: (dbState.deletedProjectedRevenueIds || []).filter(
        id => id !== savedId
      ),
    });

    setShowProjectedCalendarModal(false);
    setShowProjectedModal(false);
    setEditingProjectedId(null);
  };

  const handleConvertProjectedToReal = (item: ProjectedRevenueItem) => {
    const bal = computeProjectedRevenueBalance(item, todayStr());
    const realizedAmt = bal.remainingAmount > 0 ? bal.remainingAmount : Number(item.amount) || 0;
    const newEntry: RideEntry = {
      id: Date.now(),
      date: item.date || todayStr(),
      app: item.app || 'Particular',
      shift: 'integral',
      km: 0,
      revenue: realizedAmt,
      hours: 1,
    };

    const currentProjected: ProjectedRevenueItem[] = Array.isArray(dbState.projectedRevenues)
      ? dbState.projectedRevenues
      : [];

    const updatedProjected = currentProjected.map(p =>
      p.id === item.id
        ? { ...p, status: 'realized' as const, realizedEntryId: newEntry.id }
        : p
    );

    persistAndEnqueueWorkManager({
      ...dbState,
      entries: [newEntry, ...dbState.entries],
      projectedRevenues: updatedProjected,
    });
  };

  const handleToggleProjectedCancelled = (id: string) => {
    const currentList: ProjectedRevenueItem[] = Array.isArray(dbState.projectedRevenues)
      ? dbState.projectedRevenues
      : [];
    const updatedList = currentList.map(p => {
      if (p.id !== id) return p;
      const nextStatus = p.status === 'cancelled' ? 'pending' : 'cancelled';
      return { ...p, status: nextStatus as 'pending' | 'cancelled' };
    });
    persistAndEnqueueWorkManager({
      ...dbState,
      projectedRevenues: updatedList,
    });
  };

  const handleDeleteProjectedRevenue = (id: string) => {
    const currentList: ProjectedRevenueItem[] = Array.isArray(dbState.projectedRevenues)
      ? dbState.projectedRevenues
      : [];
    const updatedList = currentList.filter(p => p.id !== id);
    const nextDeletedProjectedIds = Array.from(
      new Set([...(dbState.deletedProjectedRevenueIds || []).map(String), String(id)])
    );
    persistAndEnqueueWorkManager({
      ...dbState,
      projectedRevenues: updatedList,
      deletedProjectedRevenueIds: nextDeletedProjectedIds,
    });
    setDeletingProjectedId(null);
  };

  // ================= MENU COCKPIT & ADD / EDIT RIDE OR EXPENSE MODAL STATE =================
  const [showQuickRegisterCockpit, setShowQuickRegisterCockpit] = useState<boolean>(false);
  const [isQuickRegisterClosing, setIsQuickRegisterClosing] = useState<boolean>(false);
  const quickRegisterCloseTimerRef = useRef<number | null>(null);
  const [showEntryModal, setShowEntryModal] = useState<boolean>(false);
  const [entryMode, setEntryMode] = useState<'ganho' | 'gasto'>('ganho');
  const [isEntryModeDedicated, setIsEntryModeDedicated] = useState<boolean>(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [selectedApp, setSelectedApp] = useState<string>(BASE_APPS[0].id);
  const [selectedShift, setSelectedShift] = useState<string>(BASE_SHIFTS[0].id);
  const [selectedCategory, setSelectedCategory] = useState<string>(BASE_EXPENSE_CATEGORIES[0].id);
  const [entryDate, setEntryDate] = useState<string>(todayStr());
  const [entryKm, setEntryKm] = useState<string>('');
  const [entryRev, setEntryRev] = useState<string>('');
  const [entryHours, setEntryHours] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [fuelLiters, setFuelLiters] = useState<string>('');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState<string>('');
  const [expenseType, setExpenseType] = useState<'moto' | 'casa'>('moto');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [selectedHouseholdExpenseId, setSelectedHouseholdExpenseId] = useState<string>('');
  const [selectedBikeExpenseId, setSelectedBikeExpenseId] = useState<string>('');
  const [showNewHouseholdInModal, setShowNewHouseholdInModal] = useState<boolean>(false);
  const [newHouseholdNameInModal, setNewHouseholdNameInModal] = useState<string>('');
  const [newHouseholdCatInModal, setNewHouseholdCatInModal] = useState<HouseholdCategory>('outros');
  const [entryModalFeedback, setEntryModalFeedback] = useState<string | null>(null);

  // App / Local Add & Edit States
  const [newCustomAppName, setNewCustomAppName] = useState<string>('');
  const [newCustomAppIcon, setNewCustomAppIcon] = useState<string>('🛵');
  const [showNewAppInput, setShowNewAppInput] = useState<boolean>(false);
  const [isEditingApps, setIsEditingApps] = useState<boolean>(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editingAppName, setEditingAppName] = useState<string>('');
  const [editingAppIcon, setEditingAppIcon] = useState<string>('🛵');

  // Shift (Turno) Add & Edit States
  const [newCustomShiftName, setNewCustomShiftName] = useState<string>('');
  const [showNewShiftInput, setShowNewShiftInput] = useState<boolean>(false);
  const [isEditingShifts, setIsEditingShifts] = useState<boolean>(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editingShiftName, setEditingShiftName] = useState<string>('');

  // Expense Category Add State
  const [newCustomCatName, setNewCustomCatName] = useState<string>('');
  const [showNewCatInput, setShowNewCatInput] = useState<boolean>(false);

  // ================= MODAL AJUSTAR SALDO ATUAL =================
  const [showAdjustBalanceModal, setShowAdjustBalanceModal] = useState<boolean>(false);
  const [adjustBaseBalance, setAdjustBaseBalance] = useState<number>(0);

  const handleOpenAdjustBalance = (currentBal: number) => {
    setAdjustBaseBalance(currentBal);
    setShowAdjustBalanceModal(true);
  };

  const handleConfirmAdjustBalance = ({
    targetBalance,
    diff,
    date,
    notes,
  }: {
    targetBalance: number;
    diff: number;
    date: string;
    notes: string;
  }) => {
    if (Math.abs(diff) < 0.01) return;

    let nextDb: LocalRoomDatabaseState = { ...dbState };
    const txDate = date || todayStr();
    const txNote = notes.trim() || 'Ajuste de Saldo';

    if (diff > 0) {
      // Excedente -> Criar transação de Ganho (RideEntry)
      const newEntry: RideEntry = {
        id: Date.now(),
        date: txDate,
        app: 'ajuste',
        shift: 'ajuste',
        km: 0,
        revenue: Math.round(diff * 100) / 100,
        hours: 0,
      };
      nextDb.entries = [...(nextDb.entries || []), newEntry];
    } else {
      // Faltante -> Criar transação de Despesa (ExpenseEntry)
      const newExpense: ExpenseEntry = {
        id: Date.now(),
        date: txDate,
        category: 'ajuste',
        amount: Math.round(Math.abs(diff) * 100) / 100,
        expenseType: 'moto',
        description: txNote,
      };
      nextDb.expenses = [...(nextDb.expenses || []), newExpense];
    }

    persistAndEnqueueWorkManager(nextDb);
  };

  // ================= NEW FEATURES MODALS & SHIFT / VOICE / GPS STATE =================
  const [showRadarModal, setShowRadarModal] = useState<boolean>(false);
  const [showTurnoModal, setShowTurnoModal] = useState<boolean>(false);
  const [showRelatorioMeiModal, setShowRelatorioMeiModal] = useState<boolean>(false);
  const [showMetaReversaModal, setShowMetaReversaModal] = useState<boolean>(false);
  const [showCockpitMenu, setShowCockpitMenu] = useState<boolean>(false);
  const [showOdometerCostDetails, setShowOdometerCostDetails] = useState<boolean>(false);
  const [isEditingFoodMaintPlan, setIsEditingFoodMaintPlan] = useState<boolean>(false);
  const [isEditingDocsPlan, setIsEditingDocsPlan] = useState<boolean>(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [voiceSpeechFeedback, setVoiceSpeechFeedback] = useState<string | null>(null);
  const [micPermissionStatus, setMicPermissionStatus] = useState<MicPermissionState>('prompt');
  const [showMicPermissionModal, setShowMicPermissionModal] = useState<boolean>(false);
  const [isRequestingMicPermission, setIsRequestingMicPermission] = useState<boolean>(false);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [autoRecordAfterPermission, setAutoRecordAfterPermission] = useState<boolean>(true);

  // GPS Real-Time & Background Odometer State
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState<GpsPermissionState>('prompt');
  const [showGpsPermissionModal, setShowGpsPermissionModal] = useState<boolean>(false);
  const [isRequestingGpsPermission, setIsRequestingGpsPermission] = useState<boolean>(false);
  const [gpsPermissionError, setGpsPermissionError] = useState<string | null>(null);

  useEffect(() => {
    checkMicrophonePermissionStatus().then(status => {
      setMicPermissionStatus(status);
    });
    checkGpsPermissionStatus().then(status => {
      setGpsPermissionStatus(status);
    });
  }, []);

  const handleRequestDeviceGpsPermission = useCallback(async (): Promise<boolean> => {
    setIsRequestingGpsPermission(true);
    setGpsPermissionError(null);
    const res = await requestDeviceGpsPermission();
    setIsRequestingGpsPermission(false);
    setGpsPermissionStatus(res.status);

    if (res.granted) {
      setShowGpsPermissionModal(false);
      if (res.coords) {
        setActiveShiftSession(prev => {
          if (!prev || !prev.isActive) return prev;
          const updated: ShiftSession = {
            ...prev,
            gpsEnabled: true,
            lastLat: prev.lastLat ?? res.coords!.lat,
            lastLng: prev.lastLng ?? res.coords!.lng,
            lastTimestamp: prev.lastTimestamp ?? res.coords!.timestamp,
            gpsAccuracyMeters: res.coords!.accuracy,
            currentSpeedKmh: res.coords!.speedKmh,
          };
          saveStoredShiftSession(updated);
          return updated;
        });
      }
      setVoiceSpeechFeedback('🛰️ GPS em Tempo Real e 2º Plano ativado no dispositivo!');
      setTimeout(() => setVoiceSpeechFeedback(null), 4000);
      return true;
    } else {
      setGpsPermissionError(
        res.error ||
          'Permissão de localização necessária. Selecione "Permitir o tempo todo" nas configurações do aparelho.'
      );
      return false;
    }
  }, []);

  // Continuous Real-Time & Background GPS Watcher when Shift is Active
  useEffect(() => {
    if (!activeShiftSession?.isActive || activeShiftSession.gpsEnabled === false) {
      return;
    }

    const isFreshShift =
      (Number(activeShiftSession.gpsDistanceKm) || 0) === 0 && !activeShiftSession.lastTimestamp;

    const watcher = startGpsShiftWatcher(
      {
        lat: activeShiftSession.lastLat,
        lng: activeShiftSession.lastLng,
        timestamp: activeShiftSession.lastTimestamp,
        resetNativeAccumulator: isFreshShift,
      },
      update => {
        setGpsPermissionStatus('granted');
        setActiveShiftSession(prev => {
          if (!prev || !prev.isActive) return prev;
          // Preserva precisão de centímetros (0.00001 km) sem truncar deslocamentos curtos a cada atualização
          const nextDistance =
            Math.round(((Number(prev.gpsDistanceKm) || 0) + update.deltaKm) * 100000) / 100000;
          const nextSession: ShiftSession = {
            ...prev,
            gpsDistanceKm: nextDistance,
            lastLat: update.currentCoords.lat,
            lastLng: update.currentCoords.lng,
            lastTimestamp: update.currentCoords.timestamp,
            currentSpeedKmh: update.currentCoords.speedKmh,
            gpsAccuracyMeters: update.currentCoords.accuracy,
            gpsPointsCount: (prev.gpsPointsCount || 0) + (update.deltaKm > 0 ? 1 : 0),
          };
          saveStoredShiftSession(nextSession);
          return nextSession;
        });
      },
      (errMessage, isPermissionDenied) => {
        if (isPermissionDenied) {
          setGpsPermissionStatus('denied');
          setGpsPermissionError(errMessage);
        }
      }
    );

    return () => {
      watcher.stop();
    };
  }, [activeShiftSession?.isActive, activeShiftSession?.gpsEnabled]);

  const handleStartShift = (startKm: number, gpsEnabled = true) => {
    const session: ShiftSession = {
      isActive: true,
      startKm,
      startTime: new Date().toISOString(),
      startRevenue: totals.totalRevenue,
      gpsEnabled,
      gpsDistanceKm: 0,
      currentSpeedKmh: 0,
      gpsPointsCount: 0,
    };
    saveStoredShiftSession(session);
    setActiveShiftSession(session);
  };

  const handleEndShift = (data: {
    startKm: number;
    endKm: number;
    kmDelta: number;
    durationHours: number;
    shiftRevenue: number;
    syncOdometer: boolean;
  }) => {
    saveStoredShiftSession(null);
    setActiveShiftSession(null);

    if (data.kmDelta > 0 || data.shiftRevenue > 0) {
      const today = todayStr();
      const roundedKmDelta = Math.round(data.kmDelta * 10) / 10;
      const newEntry: RideEntry = {
        id: Date.now(),
        date: today,
        app: 'turno',
        shift: 'integral',
        km: roundedKmDelta,
        revenue: data.shiftRevenue,
        hours: Number(data.durationHours.toFixed(1)) || 1,
      };

      const totalKmAfterEntry = totals.baseTotalKm + roundedKmDelta;
      const extraBaseOffset =
        data.syncOdometer && data.endKm > totalKmAfterEntry
          ? Math.round((data.endKm - totalKmAfterEntry) * 10) / 10
          : 0;

      const nextFuelConfig =
        extraBaseOffset > 0
          ? {
              ...dbState.fuelConfig,
              odometerBaseKm: (Number(dbState.fuelConfig.odometerBaseKm) || 0) + extraBaseOffset,
            }
          : dbState.fuelConfig;

      persistAndEnqueueWorkManager({
        ...dbState,
        entries: [newEntry, ...dbState.entries],
        fuelConfig: nextFuelConfig,
      });
    }
  };

  const handleAcceptRideFromRadar = (rideData: { revenue: number; km: number; hours: number }) => {
    setShowRadarModal(false);
    setEditingEntryId(null);
    setEntryMode('ganho');
    setIsEntryModeDedicated(true);
    setEntryDate(todayStr());
    if (allApps.length > 0) setSelectedApp(allApps[0].id);
    setEntryRev(String(rideData.revenue));
    setEntryKm(String(rideData.km));
    setEntryHours(String(rideData.hours > 0 ? rideData.hours : 0.5));
    setShowEntryModal(true);
    setEntryModalFeedback(`Corrida do Radar (R$ ${rideData.revenue.toFixed(2)} · ${rideData.km} km) carregada!`);
  };

  const startVoiceCaptureSession = () => {
    if (isRecordingVoice) return;
    setIsRecordingVoice(true);
    setVoiceSpeechFeedback('Ouvindo... Fale por exemplo: "Ganho 25 reais no iFood 8 km" ou "Gasto 40 reais gasolina"');

    startSpeechRecognition(
      (parsed: ParsedVoiceEntry) => {
        setIsRecordingVoice(false);
        setMicPermissionStatus('granted');
        setEntryMode(parsed.mode);
        setEntryDate(todayStr());
        setEditingEntryId(null);

        if (parsed.mode === 'ganho') {
          if (parsed.amount > 0) setEntryRev(String(parsed.amount));
          if (parsed.km > 0) setEntryKm(String(parsed.km));
          if (parsed.hours && parsed.hours > 0) setEntryHours(String(parsed.hours));
          if (parsed.appOrCategoryName) {
            const matchedApp = allApps.find(
              a =>
                a.name.toLowerCase().includes(parsed.appOrCategoryName!.toLowerCase()) ||
                parsed.appOrCategoryName!.toLowerCase().includes(a.name.toLowerCase())
            );
            if (matchedApp) setSelectedApp(matchedApp.id);
          }
        } else {
          if (parsed.amount > 0) setExpenseAmount(String(parsed.amount));
          if (parsed.appOrCategoryName) {
            const matchedCat = allCategories.find(
              c =>
                c.name.toLowerCase().includes(parsed.appOrCategoryName!.toLowerCase()) ||
                parsed.appOrCategoryName!.toLowerCase().includes(c.name.toLowerCase())
            );
            if (matchedCat) setSelectedCategory(matchedCat.id);
          }
        }

        setVoiceSpeechFeedback(`Entendido: "${parsed.rawTranscript}"`);
        setIsEntryModeDedicated(false);
        setShowEntryModal(true);
        setTimeout(() => setVoiceSpeechFeedback(null), 5000);
      },
      (err: string) => {
        setIsRecordingVoice(false);
        if (err.toLowerCase().includes('permissão') || err.toLowerCase().includes('bloquead') || err.toLowerCase().includes('negad')) {
          setMicPermissionStatus('denied');
          setMicPermissionError(err);
          setShowMicPermissionModal(true);
        }
        setVoiceSpeechFeedback(err);
        setTimeout(() => setVoiceSpeechFeedback(null), 5000);
      },
      () => setIsRecordingVoice(true),
      () => setIsRecordingVoice(false)
    );
  };

  const handleRequestDeviceMicPermission = async (startRecordingAfter = true) => {
    setIsRequestingMicPermission(true);
    setMicPermissionError(null);
    const res = await requestDeviceMicrophonePermission();
    setIsRequestingMicPermission(false);
    setMicPermissionStatus(res.status);

    if (res.granted) {
      setShowMicPermissionModal(false);
      if (startRecordingAfter) {
        startVoiceCaptureSession();
      } else {
        setVoiceSpeechFeedback('✅ Permissão de microfone ativada no dispositivo! O modo de voz está pronto.');
        setTimeout(() => setVoiceSpeechFeedback(null), 4000);
      }
    } else {
      setMicPermissionError(
        res.error || 'Permissão de voz não concedida. Autorize o uso do microfone nas configurações do navegador/aparelho.'
      );
    }
  };

  const handleTriggerVoiceDictation = async () => {
    if (isRecordingVoice) return;

    const currentPerm = await checkMicrophonePermissionStatus();
    setMicPermissionStatus(currentPerm);

    if (currentPerm !== 'granted') {
      setMicPermissionError(null);
      setAutoRecordAfterPermission(true);
      setShowMicPermissionModal(true);
      return;
    }

    startVoiceCaptureSession();
  };

  const openQuickRegisterCockpit = useCallback(() => {
    if (quickRegisterCloseTimerRef.current !== null) {
      window.clearTimeout(quickRegisterCloseTimerRef.current);
      quickRegisterCloseTimerRef.current = null;
    }
    setIsQuickRegisterClosing(false);
    setShowQuickRegisterCockpit(true);
  }, []);

  const closeQuickRegisterCockpit = useCallback((immediate = false) => {
    if (quickRegisterCloseTimerRef.current !== null) {
      window.clearTimeout(quickRegisterCloseTimerRef.current);
      quickRegisterCloseTimerRef.current = null;
    }
    if (immediate) {
      setIsQuickRegisterClosing(false);
      setShowQuickRegisterCockpit(false);
      return;
    }
    setIsQuickRegisterClosing(true);
    quickRegisterCloseTimerRef.current = window.setTimeout(() => {
      setShowQuickRegisterCockpit(false);
      setIsQuickRegisterClosing(false);
      quickRegisterCloseTimerRef.current = null;
    }, 200);
  }, []);

  useEffect(() => {
    if (!showQuickRegisterCockpit) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeQuickRegisterCockpit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showQuickRegisterCockpit, closeQuickRegisterCockpit]);

  useEffect(() => {
    return () => {
      if (quickRegisterCloseTimerRef.current !== null) {
        window.clearTimeout(quickRegisterCloseTimerRef.current);
      }
    };
  }, []);

  // PWA Shortcuts action detection (?action=novo_registro | ?action=radar | ?action=turno)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get('action');
      if (action === 'novo_registro') {
        openQuickRegisterCockpit();
      } else if (action === 'radar') {
        setShowRadarModal(true);
      } else if (action === 'turno') {
        setShowTurnoModal(true);
      }
    } catch {
      // ignore url error
    }
  }, [openQuickRegisterCockpit]);

  const openNewEntryModal = (initialMode: 'ganho' | 'gasto' = 'ganho', dedicated = false) => {
    setEditingEntryId(null);
    setEntryMode(initialMode);
    setIsEntryModeDedicated(dedicated);
    setEntryDate(todayStr());
    setEntryKm('');
    setEntryRev('');
    setEntryHours('');
    setExpenseAmount('');
    setFuelLiters('');
    setFuelPricePerLiter(String(dbState.fuelConfig.fuelPrice || 5.8));
    setExpenseType('moto');
    setExpenseDescription('');
    setSelectedHouseholdExpenseId('');
    setShowNewHouseholdInModal(false);
    setNewHouseholdNameInModal('');
    setEntryModalFeedback(null);
    setShowNewAppInput(false);
    setNewCustomAppName('');
    setNewCustomAppIcon('🛵');
    setIsEditingApps(false);
    setEditingAppId(null);
    setShowNewShiftInput(false);
    setNewCustomShiftName('');
    setIsEditingShifts(false);
    setEditingShiftId(null);
    setShowNewCatInput(false);
    setNewCustomCatName('');
    if (!allApps.some(a => a.id === selectedApp) && allApps.length > 0) {
      setSelectedApp(allApps[0].id);
    }
    if (!allShifts.some(s => s.id === selectedShift) && allShifts.length > 0) {
      setSelectedShift(allShifts[0].id);
    }
    setShowEntryModal(true);
  };

  const openNewFuelModal = () => {
    setEditingEntryId(null);
    setEntryMode('gasto');
    setIsEntryModeDedicated(true);
    setExpenseType('moto');
    setExpenseDescription('');
    setSelectedHouseholdExpenseId('');
    setShowNewHouseholdInModal(false);
    setNewHouseholdNameInModal('');
    setSelectedCategory('combustivel');
    setEntryDate(todayStr());
    setExpenseAmount('');
    setFuelLiters('');
    setFuelPricePerLiter(String(dbState.fuelConfig.fuelPrice || 5.8));
    setEntryModalFeedback(null);
    setShowNewCatInput(false);
    setNewCustomCatName('');
    setShowEntryModal(true);
  };

  const openNewHouseholdPaymentModal = (item: HouseholdExpenseItem) => {
    setEditingEntryId(null);
    setEntryMode('gasto');
    setIsEntryModeDedicated(true);
    setExpenseType('casa');
    setSelectedHouseholdExpenseId(item.id);
    setSelectedBikeExpenseId('');
    setSelectedCategory(item.name);
    setEntryDate(todayStr());

    const targetYM = selectedFinanceMonth || todayStr().slice(0, 7);
    const { totalPaid } = getHouseholdExpenseMonthPayments(item, targetYM);
    const fullVal = item.recurrenceType === 'interval_days' && item.totalCost && item.totalCost > 0
      ? item.totalCost
      : item.monthlyAmount;
    const isExplicitlyUnpaid = Boolean(item.unpaidMonths && item.unpaidMonths.includes(targetYM));
    const remainingVal = isExplicitlyUnpaid ? fullVal : Math.max(0, fullVal - totalPaid);
    const payVal = remainingVal > 0 ? remainingVal : fullVal;

    setExpenseAmount(payVal > 0 ? String(payVal) : '');
    setExpenseDescription(`Pagamento: ${item.name}`);
    setShowNewHouseholdInModal(false);
    setNewHouseholdNameInModal('');
    setEntryModalFeedback(null);
    setShowEntryModal(true);
  };

  const openEditHistoryItem = (item: any, type: 'ganho' | 'gasto') => {
    setEditingEntryId(item.id);
    setEntryMode(type);
    setEntryDate(item.date || todayStr());
    setEntryModalFeedback(null);
    setShowNewAppInput(false);
    setNewCustomAppName('');
    setIsEditingApps(false);
    setEditingAppId(null);
    setShowNewShiftInput(false);
    setNewCustomShiftName('');
    setIsEditingShifts(false);
    setEditingShiftId(null);
    setShowNewHouseholdInModal(false);
    setNewHouseholdNameInModal('');
    if (type === 'ganho') {
      setSelectedApp(item.app);
      setSelectedShift(item.shift || (allShifts[0]?.id ?? BASE_SHIFTS[0].id));
      setEntryKm(String(item.km || ''));
      setEntryRev(String(item.revenue || ''));
      setEntryHours(String(item.hours || ''));
    } else {
      setSelectedCategory(item.category);
      setExpenseAmount(String(item.amount || ''));
      setFuelLiters(item.liters !== undefined && item.liters !== null ? String(item.liters) : '');
      setFuelPricePerLiter(
        item.pricePerLiter !== undefined && item.pricePerLiter !== null
          ? String(item.pricePerLiter)
          : item.liters && item.amount
          ? (item.amount / item.liters).toFixed(2)
          : String(dbState.fuelConfig.fuelPrice || 5.8)
      );
      const isHousehold =
        item.expenseType === 'casa' ||
        Boolean(item.householdExpenseId) ||
        Boolean(
          item.category &&
            (item.category.toLowerCase().includes('(casa)') ||
              item.category.toLowerCase().includes('casa') ||
              item.category.toLowerCase().includes('supermercado') ||
              item.category.toLowerCase().includes('feira') ||
              item.category.toLowerCase().includes('mercado') ||
              item.category.toLowerCase().includes('aluguel') ||
              item.category.toLowerCase().includes('energia') ||
              item.category.toLowerCase().includes('luz') ||
              item.category.toLowerCase().includes('água') ||
              item.category.toLowerCase().includes('internet'))
        ) ||
        (dbState.householdExpenses || []).some(
          (h: HouseholdExpenseItem) =>
            h.id === item.householdExpenseId ||
            h.name.toLowerCase() === (item.category || '').toLowerCase()
        );
      setExpenseType(item.expenseType || (isHousehold ? 'casa' : 'moto'));
      setExpenseDescription(item.description || '');
      setSelectedHouseholdExpenseId(item.householdExpenseId || '');
    }
    setShowEntryModal(true);
  };

  // Dedicated helper to save a new Custom App / Local immediately to Room DB
  const handleCreateCustomApp = () => {
    const trimmedName = newCustomAppName.trim();
    if (!trimmedName) return;
    const iconVal = newCustomAppIcon.trim() || '🛵';
    const existing = allApps.find(a => a.name.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      setSelectedApp(existing.id);
      setNewCustomAppName('');
      setShowNewAppInput(false);
      setEntryModalFeedback(`Aplicativo/Local "${existing.name}" selecionado.`);
      return;
    }
    const id = 'app_' + Date.now();
    const nextCustomApps = [...(dbState.customApps || []), { id, name: trimmedName, icon: iconVal }];
    persistAndEnqueueWorkManager({
      ...dbState,
      customApps: nextCustomApps,
    });
    setSelectedApp(id);
    setNewCustomAppName('');
    setNewCustomAppIcon('🛵');
    setShowNewAppInput(false);
    setEntryModalFeedback(`Novo Aplicativo/Local "${trimmedName}" salvo e selecionado!`);
  };

  // Dedicated helper to save inline edits to an existing App / Local
  const handleSaveEditedApp = () => {
    if (!editingAppId || !editingAppName.trim()) return;
    const trimmed = editingAppName.trim();
    const iconVal = editingAppIcon.trim() || '🛵';
    const isCustom = (dbState.customApps || []).some(a => a.id === editingAppId);
    const nextCustomApps = isCustom
      ? (dbState.customApps || []).map(a => (a.id === editingAppId ? { ...a, name: trimmed, icon: iconVal } : a))
      : dbState.customApps || [];
    const nextAppOverrides = {
      ...(dbState.appOverrides || {}),
      [editingAppId]: { name: trimmed, icon: iconVal },
    };
    persistAndEnqueueWorkManager({
      ...dbState,
      customApps: nextCustomApps,
      appOverrides: nextAppOverrides,
    });
    setEditingAppId(null);
    setEntryModalFeedback(`Aplicativo/Local "${trimmed}" atualizado!`);
  };

  const handleDeleteApp = (idToDelete: string) => {
    if (allApps.length <= 1) return;
    const nextCustomApps = (dbState.customApps || []).filter(a => a.id !== idToDelete);
    const nextDeletedAppIds = Array.from(new Set([...(dbState.deletedAppIds || []), idToDelete]));
    persistAndEnqueueWorkManager({
      ...dbState,
      customApps: nextCustomApps,
      deletedAppIds: nextDeletedAppIds,
    });
    if (selectedApp === idToDelete) {
      const remaining = allApps.filter(a => a.id !== idToDelete);
      if (remaining.length > 0) setSelectedApp(remaining[0].id);
    }
    if (editingAppId === idToDelete) {
      setEditingAppId(null);
    }
  };

  // Dedicated helper to save a new Custom Shift (Turno) immediately to Room DB
  const handleCreateCustomShift = () => {
    const trimmedName = newCustomShiftName.trim();
    if (!trimmedName) return;
    const existing = allShifts.find(s => s.name.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      setSelectedShift(existing.id);
      setNewCustomShiftName('');
      setShowNewShiftInput(false);
      setEntryModalFeedback(`Turno "${existing.name}" selecionado.`);
      return;
    }
    const id = 'shift_' + Date.now();
    const nextCustomShifts = [...(dbState.customShifts || []), { id, name: trimmedName }];
    persistAndEnqueueWorkManager({
      ...dbState,
      customShifts: nextCustomShifts,
    });
    setSelectedShift(id);
    setNewCustomShiftName('');
    setShowNewShiftInput(false);
    setEntryModalFeedback(`Novo Turno "${trimmedName}" salvo e selecionado!`);
  };

  // Dedicated helper to save inline edits to an existing Shift (Turno)
  const handleSaveEditedShift = () => {
    if (!editingShiftId || !editingShiftName.trim()) return;
    const trimmed = editingShiftName.trim();
    const isCustom = (dbState.customShifts || []).some(s => s.id === editingShiftId);
    const nextCustomShifts = isCustom
      ? (dbState.customShifts || []).map(s => (s.id === editingShiftId ? { ...s, name: trimmed } : s))
      : dbState.customShifts || [];
    const nextShiftOverrides = {
      ...(dbState.shiftOverrides || {}),
      [editingShiftId]: { name: trimmed },
    };
    persistAndEnqueueWorkManager({
      ...dbState,
      customShifts: nextCustomShifts,
      shiftOverrides: nextShiftOverrides,
    });
    setEditingShiftId(null);
    setEntryModalFeedback(`Turno "${trimmed}" atualizado!`);
  };

  const handleDeleteShift = (idToDelete: string) => {
    if (allShifts.length <= 1) return;
    const nextCustomShifts = (dbState.customShifts || []).filter(s => s.id !== idToDelete);
    const nextDeletedShiftIds = Array.from(new Set([...(dbState.deletedShiftIds || []), idToDelete]));
    persistAndEnqueueWorkManager({
      ...dbState,
      customShifts: nextCustomShifts,
      deletedShiftIds: nextDeletedShiftIds,
    });
    if (selectedShift === idToDelete) {
      const remaining = allShifts.filter(s => s.id !== idToDelete);
      if (remaining.length > 0) setSelectedShift(remaining[0].id);
    }
    if (editingShiftId === idToDelete) {
      setEditingShiftId(null);
    }
  };

  const handleSaveEntryOrExpense = () => {
    let nextDb: LocalRoomDatabaseState = {
      ...dbState,
      customApps: [...(dbState.customApps || [])],
      appOverrides: { ...(dbState.appOverrides || {}) },
      customShifts: [...(dbState.customShifts || [])],
      shiftOverrides: { ...(dbState.shiftOverrides || {}) },
      customCategories: [...(dbState.customCategories || [])],
    };

    let finalAppId = selectedApp;
    let finalShiftId = selectedShift;
    let finalCategoryId = selectedCategory;
    let savedPendingMeta = false;

    // 1. Auto-save pending new custom App/Local if user typed it and clicked main Save button directly
    if (showNewAppInput && newCustomAppName.trim()) {
      const trimmedApp = newCustomAppName.trim();
      const iconVal = newCustomAppIcon.trim() || '🛵';
      const existingApp = allApps.find(a => a.name.toLowerCase() === trimmedApp.toLowerCase());
      if (existingApp) {
        finalAppId = existingApp.id;
      } else {
        const newAppId = 'app_' + Date.now();
        nextDb.customApps = [...nextDb.customApps, { id: newAppId, name: trimmedApp, icon: iconVal }];
        finalAppId = newAppId;
      }
      setSelectedApp(finalAppId);
      setNewCustomAppName('');
      setNewCustomAppIcon('🛵');
      setShowNewAppInput(false);
      savedPendingMeta = true;
    }

    // 2. Auto-save pending edited App/Local if user left inline app editor open
    if (editingAppId && editingAppName.trim()) {
      const trimmedEditApp = editingAppName.trim();
      const iconVal = editingAppIcon.trim() || '🛵';
      nextDb.customApps = nextDb.customApps.map(a =>
        a.id === editingAppId ? { ...a, name: trimmedEditApp, icon: iconVal } : a
      );
      nextDb.appOverrides = {
        ...nextDb.appOverrides,
        [editingAppId]: { name: trimmedEditApp, icon: iconVal },
      };
      setEditingAppId(null);
      savedPendingMeta = true;
    }

    // 3. Auto-save pending new custom Shift (Turno) if user typed it and clicked main Save button directly
    if (showNewShiftInput && newCustomShiftName.trim()) {
      const trimmedShift = newCustomShiftName.trim();
      const existingShift = allShifts.find(s => s.name.toLowerCase() === trimmedShift.toLowerCase());
      if (existingShift) {
        finalShiftId = existingShift.id;
      } else {
        const newShiftId = 'shift_' + (Date.now() + 1);
        nextDb.customShifts = [...(nextDb.customShifts || []), { id: newShiftId, name: trimmedShift }];
        finalShiftId = newShiftId;
      }
      setSelectedShift(finalShiftId);
      setNewCustomShiftName('');
      setShowNewShiftInput(false);
      savedPendingMeta = true;
    }

    // 4. Auto-save pending edited Shift (Turno) if user left inline shift editor open
    if (editingShiftId && editingShiftName.trim()) {
      const trimmedEditShift = editingShiftName.trim();
      nextDb.customShifts = (nextDb.customShifts || []).map(s =>
        s.id === editingShiftId ? { ...s, name: trimmedEditShift } : s
      );
      nextDb.shiftOverrides = {
        ...(nextDb.shiftOverrides || {}),
        [editingShiftId]: { name: trimmedEditShift },
      };
      setEditingShiftId(null);
      savedPendingMeta = true;
    }

    // 5. Auto-save pending new Expense Category if user typed it and clicked main Save button directly
    if (showNewCatInput && newCustomCatName.trim()) {
      const trimmedCat = newCustomCatName.trim();
      const existingCat = allCategories.find(c => c.name.toLowerCase() === trimmedCat.toLowerCase());
      if (existingCat) {
        finalCategoryId = existingCat.id;
      } else {
        const newCatId = 'cat_' + (Date.now() + 2);
        nextDb.customCategories = [...nextDb.customCategories, { id: newCatId, name: trimmedCat }];
        finalCategoryId = newCatId;
      }
      setSelectedCategory(finalCategoryId);
      setNewCustomCatName('');
      setShowNewCatInput(false);
      savedPendingMeta = true;
    }

    if (entryMode === 'ganho') {
      const kmVal = Number(entryKm) || 0;
      const revVal = Number(entryRev) || 0;
      const hrsVal = Number(entryHours) || 0;
      if (kmVal <= 0 && revVal <= 0) {
        if (savedPendingMeta) {
          persistAndEnqueueWorkManager(nextDb);
          setEntryModalFeedback(
            'Novo aplicativo/turno salvo com sucesso! Informe KM Rodados ou Faturamento (R$) para registrar a corrida.'
          );
        } else {
          setEntryModalFeedback('Informe pelo menos KM Rodados ou Faturamento (R$) para registrar a corrida.');
        }
        return;
      }

      const updatedEntries =
        editingEntryId !== null
          ? nextDb.entries.map(e =>
              e.id === editingEntryId
                ? {
                    ...e,
                    date: entryDate,
                    app: finalAppId,
                    shift: finalShiftId,
                    km: kmVal,
                    revenue: revVal,
                    hours: hrsVal,
                  }
                : e
            )
          : [
              ...nextDb.entries,
              {
                id: Date.now(),
                date: entryDate,
                app: finalAppId,
                shift: finalShiftId,
                km: kmVal,
                revenue: revVal,
                hours: hrsVal,
              },
            ];

      persistAndEnqueueWorkManager({ ...nextDb, entries: updatedEntries });
    } else {
      // Auto-save pending new custom household account if user typed it in modal
      if (expenseType === 'casa' && showNewHouseholdInModal && newHouseholdNameInModal.trim()) {
        const trimmedHName = newHouseholdNameInModal.trim();
        const existingH = (nextDb.householdExpenses || []).find(
          h => h.name.toLowerCase() === trimmedHName.toLowerCase()
        );
        if (existingH) {
          finalCategoryId = existingH.name;
          setSelectedHouseholdExpenseId(existingH.id);
        } else {
          const newHId = 'house_' + Date.now();
          const iconMap: Record<HouseholdCategory, string> = {
            moradia: '🏠',
            utilidades: '⚡',
            alimentacao: '🛒',
            conectividade: '📶',
            saude: '💊',
            outros: '📋',
          };
          const newHItem: HouseholdExpenseItem = {
            id: newHId,
            name: trimmedHName,
            category: newHouseholdCatInModal,
            monthlyAmount: Number(expenseAmount) || 0,
            dueDay: 10,
            isActive: true,
            icon: iconMap[newHouseholdCatInModal] || '🏠',
          };
          nextDb.householdExpenses = [...(nextDb.householdExpenses || []), newHItem];
          finalCategoryId = trimmedHName;
          setSelectedHouseholdExpenseId(newHId);
        }
        setShowNewHouseholdInModal(false);
        setNewHouseholdNameInModal('');
        savedPendingMeta = true;
      }

      const amountVal = Number(expenseAmount) || 0;
      if (amountVal <= 0) {
        if (savedPendingMeta) {
          persistAndEnqueueWorkManager(nextDb);
          setEntryModalFeedback('Nova conta/categoria salva! Informe o Valor (R$) para registrar a despesa.');
        } else {
          setEntryModalFeedback('Informe o Valor (R$) da despesa para salvar.');
        }
        return;
      }

      const isFuel = expenseType === 'moto' && finalCategoryId === 'combustivel';
      let litersVal: number | undefined = undefined;
      let pricePerLiterVal: number | undefined = undefined;

      if (isFuel) {
        pricePerLiterVal = Number(fuelPricePerLiter) || Number(nextDb.fuelConfig.fuelPrice) || 5.8;
        litersVal = Number(fuelLiters) || 0;
        if (litersVal <= 0 && pricePerLiterVal > 0) {
          litersVal = Math.round((amountVal / pricePerLiterVal) * 100) / 100;
        } else if (litersVal > 0 && pricePerLiterVal <= 0) {
          pricePerLiterVal = Math.round((amountVal / litersVal) * 100) / 100;
        }
      }

      const updatedExpenses: ExpenseEntry[] =
        editingEntryId !== null
          ? nextDb.expenses.map(e =>
              e.id === editingEntryId
                ? {
                    ...e,
                    date: entryDate,
                    category: finalCategoryId,
                    amount: amountVal,
                    expenseType: expenseType,
                    description: expenseDescription.trim() || undefined,
                    householdExpenseId:
                      expenseType === 'casa'
                        ? selectedHouseholdExpenseId || undefined
                        : undefined,
                    bikeExpenseId:
                      expenseType === 'moto'
                        ? selectedBikeExpenseId || undefined
                        : undefined,
                    ...(isFuel
                      ? {
                          liters: litersVal,
                          pricePerLiter: pricePerLiterVal,
                          odometerKm: e.odometerKm !== undefined ? e.odometerKm : totals.totalKm,
                        }
                      : {
                          liters: undefined,
                          pricePerLiter: undefined,
                        }),
                  }
                : e
            )
          : [
              ...nextDb.expenses,
              {
                id: Date.now(),
                date: entryDate,
                category: finalCategoryId,
                amount: amountVal,
                expenseType: expenseType,
                description: expenseDescription.trim() || undefined,
                householdExpenseId:
                  expenseType === 'casa'
                    ? selectedHouseholdExpenseId || undefined
                    : undefined,
                bikeExpenseId:
                  expenseType === 'moto'
                    ? selectedBikeExpenseId || undefined
                    : undefined,
                ...(isFuel
                  ? {
                      liters: litersVal,
                      pricePerLiter: pricePerLiterVal,
                      odometerKm: totals.totalKm,
                    }
                  : {}),
              },
            ];

      let nextFuelConfig = nextDb.fuelConfig;
      if (isFuel && pricePerLiterVal && pricePerLiterVal > 0) {
        nextFuelConfig = {
          ...nextDb.fuelConfig,
          fuelPrice: pricePerLiterVal,
        };
      }

      if (expenseType === 'casa') {
        const targetHId = selectedHouseholdExpenseId;
        const entryYM = entryDate.slice(0, 7);
        nextDb.householdExpenses = (nextDb.householdExpenses || []).map(h => {
          const isTarget = targetHId ? h.id === targetHId : h.name.toLowerCase() === finalCategoryId.toLowerCase();
          if (isTarget) {
            const intDays = Math.max(1, Number(h.intervalDays) || 30);
            return {
              ...h,
              lastPaidDate: entryDate,
              unpaidMonths: (h.unpaidMonths || []).filter(m => m !== entryYM),
              nextDueDate:
                h.recurrenceType === 'interval_days'
                  ? addDaysToDateStr(entryDate, intDays)
                  : addDaysToDateStr(entryDate, 30),
            };
          }
          return h;
        });
      }

      if (expenseType === 'moto') {
        const targetBId = selectedBikeExpenseId;
        const entryYM = entryDate.slice(0, 7);
        nextDb.bikeExpenses = (nextDb.bikeExpenses || []).map(b => {
          const isTarget = targetBId ? b.id === targetBId : b.name.toLowerCase() === finalCategoryId.toLowerCase();
          if (isTarget) {
            const intDays = Math.max(1, Number(b.intervalDays) || 30);
            return {
              ...b,
              lastPaidDate: entryDate,
              unpaidMonths: (b.unpaidMonths || []).filter(m => m !== entryYM),
              nextDueDate:
                b.recurrenceType === 'interval_days'
                  ? addDaysToDateStr(entryDate, intDays)
                  : addDaysToDateStr(entryDate, 30),
            };
          }
          return b;
        });
      }

      persistAndEnqueueWorkManager({
        ...nextDb,
        expenses: updatedExpenses,
        fuelConfig: nextFuelConfig,
      });
    }

    setEntryModalFeedback(null);
    setShowEntryModal(false);
    setEditingEntryId(null);
    setSelectedHouseholdExpenseId('');
    setSelectedBikeExpenseId('');
    setShowNewHouseholdInModal(false);
    setNewHouseholdNameInModal('');
  };

  // History Filters
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'ganho' | 'gasto'>('all');
  const [historySubFilter, setHistorySubFilter] = useState<string>('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all');

  const toggleEntryOrExpenseCancelled = (id: number, type: 'ganho' | 'gasto') => {
    let nextDb: LocalRoomDatabaseState = { ...dbState };
    if (type === 'ganho') {
      nextDb.entries = (nextDb.entries || []).map(e =>
        e.id === id ? { ...e, isCancelled: !e.isCancelled } : e
      );
    } else {
      nextDb.expenses = (nextDb.expenses || []).map(ex =>
        ex.id === id ? { ...ex, isCancelled: !ex.isCancelled } : ex
      );
    }
    persistAndEnqueueWorkManager(nextDb);
  };

  // Mochilinha Chat Modal
  const [showCopilotModal, setShowCopilotModal] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'bot' | 'user'; text: string }[]>([
    {
      role: 'bot',
      text: 'Olá! Sou a Mochilinha, sua IA assistente. Analiso em tempo real seus dados locais, custos por KM e metas do turno. Como posso ajudar hoje?',
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isAskingAi, setIsAskingAi] = useState<boolean>(false);

  const handleSendChat = async (promptText?: string) => {
    const q = (promptText ?? chatInput).trim();
    if (!q) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: q }]);
    setIsAskingAi(true);

    const today = todayStr();
    const todayEntries = dbState.entries.filter(e => e.date === today);
    const todayRev = todayEntries.reduce((s, e) => s + Number(e.revenue || 0), 0);
    const todayHours = todayEntries.reduce((s, e) => s + Number(e.hours || 0), 0);
    const todayKm = todayEntries.reduce((s, e) => s + Number(e.km || 0), 0);

    const answer = await askCopilotAssistant(q, {
      todayRev,
      todayHours,
      todayKm,
      revPerHour: todayHours > 0 ? (todayRev / todayHours).toFixed(2) : '0.00',
      dailyGoal: dbState.dailyGoal,
      totalEntries: dbState.entries.length,
      kmPerLiter: dbState.fuelConfig.kmPerLiter,
      fuelPrice: dbState.fuelConfig.fuelPrice,
      totalKm: totals.totalKm,
      todayEntries,
      allEntries: dbState.entries,
    });

    setIsAskingAi(false);
    setChatMessages(prev => [...prev, { role: 'bot', text: answer }]);
  };

  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Theme surface classes (Minimalist AllBlack & Light mode)
  const bgCanvas = isDark ? 'bg-black text-slate-100' : 'bg-[#F8FAFC] text-slate-900';
  const surfaceCard = isDark
    ? 'bg-transparent border border-neutral-800/80 text-slate-100'
    : 'bg-transparent border border-slate-200/90 text-slate-900';
  const surfaceSubtle = isDark
    ? 'bg-transparent border border-neutral-800/60'
    : 'bg-transparent border border-slate-200/80';
  const modalSurface = isDark
    ? 'bg-black border border-neutral-800 text-slate-100 shadow-2xl'
    : 'bg-white border border-slate-200 text-slate-900 shadow-xl';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';
  const primaryText = isDark ? 'text-slate-100' : 'text-slate-900';
  const secondaryText = isDark ? 'text-slate-200' : 'text-slate-800';
  const dividerBorder = isDark ? 'border-neutral-800/70' : 'border-slate-200';
  const inputSurface = isDark
    ? 'bg-black border border-neutral-800 text-white focus:border-[#FF6A1A]'
    : 'bg-transparent border border-slate-300 text-slate-900 focus:border-[#FF6A1A]';

  // Last 7 days chart data
  const chart7Days = useMemo(() => {
    const days: { date: string; label: string; km: number; rev: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const [, m, dd] = iso.split('-');
      const dayEntries = dbState.entries.filter(e => !e.isCancelled && e.date === iso);
      days.push({
        date: iso,
        label: `${dd}/${m}`,
        km: dayEntries.reduce((s, e) => s + Number(e.km || 0), 0),
        rev: dayEntries.reduce((s, e) => s + Number(e.revenue || 0), 0),
      });
    }
    return days;
  }, [dbState.entries]);

  // Streak calculation
  const streakCount = useMemo(() => {
    let streak = 0;
    const d = new Date();
    while (true) {
      const ds = d.toISOString().slice(0, 10);
      const has = dbState.entries.some(e => !e.isCancelled && e.date === ds) || dbState.expenses.some(e => !e.isCancelled && e.date === ds);
      if (has) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [dbState.entries, dbState.expenses]);

  // Comprehensive Progress, Performance & Statistics Analytics
  const progressAnalytics = useMemo(() => {
    const today = todayStr();
    const dailyGoal = Math.max(0, Number(dbState.dailyGoal) || 0);
    const weeklyGoal = Math.max(0, Number(dbState.weeklyGoal) || 0);
    const customGoalTarget = Math.max(0, Number(dbState.customGoalTarget) || 0);
    const customGoalTargetDate = dbState.customGoalTargetDate || getDefaultFutureDate(dbState.customGoalDays || 20);
    const customGoalCountdown = getCustomGoalCountdown(
      'date',
      dbState.customGoalDays,
      customGoalTargetDate
    );
    const customGoalDays = customGoalCountdown.effectiveDays;
    const customGoalTitle = (dbState.customGoalTitle || '').trim() || 'Meta Personalizada de Ganhos';

    // Today stats
    const todayEntries = dbState.entries.filter(e => !e.isCancelled && e.date === today);
    const revToday = todayEntries.reduce((s, e) => s + Number(e.revenue || 0), 0);
    const kmToday = todayEntries.reduce((s, e) => s + Number(e.km || 0), 0);
    const hoursToday = todayEntries.reduce((s, e) => s + Number(e.hours || 0), 0);
    const dailyPct = dailyGoal > 0 ? Math.min(100, Math.round((revToday / dailyGoal) * 100)) : 0;
    const dailyRemaining = Math.max(0, dailyGoal - revToday);

    // Weekly stats
    const now = new Date();
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekEntries = dbState.entries.filter(e => {
      if (e.isCancelled || !e.date) return false;
      const dt = new Date(e.date + 'T12:00:00');
      return dt >= monday && dt <= sunday;
    });
    const revWeek = periodTotals.revWeek;
    const kmWeek = weekEntries.reduce((s, e) => s + Number(e.km || 0), 0);
    const hoursWeek = weekEntries.reduce((s, e) => s + Number(e.hours || 0), 0);
    const weekActiveDays = new Set(weekEntries.map(e => e.date)).size;
    const weeklyPct = weeklyGoal > 0 ? Math.min(100, Math.round((revWeek / weeklyGoal) * 100)) : 0;
    const weeklyRemaining = Math.max(0, weeklyGoal - revWeek);
    const remainingDaysInWeek = Math.max(1, 8 - dayOfWeek);
    const weeklyDailyNeeded = weeklyRemaining > 0 ? weeklyRemaining / remainingDaysInWeek : 0;

    // Custom Goal stats: Acompanha o SALDO ATUAL do usuário (Lucro Líquido Real = Ganhos - Gastos)
    const customScope = dbState.customGoalScope || 'month';
    const customCurrent = customScope === 'all' ? totals.lucro : periodTotals.saldoMonth;
    const customGross = customScope === 'all' ? totals.totalRevenue : periodTotals.revMonth;
    const customExpenses = customScope === 'all' ? totals.totalExpense : periodTotals.expMonth;
    const customPct = customGoalTarget > 0 ? Math.min(100, Math.max(0, Math.round((customCurrent / customGoalTarget) * 100))) : 0;
    const customRemaining = Math.max(0, customGoalTarget - customCurrent);
    const customDailyNeeded = customRemaining > 0 ? customRemaining / customGoalDays : 0;

    // Group entries by date for work days, records, goal hit rate, and max streak
    const byDateMap: Record<
      string,
      { date: string; rev: number; km: number; hours: number; count: number; exp: number }
    > = {};

    dbState.entries.forEach(e => {
      if (e.isCancelled || !e.date) return;
      if (!byDateMap[e.date]) {
        byDateMap[e.date] = { date: e.date, rev: 0, km: 0, hours: 0, count: 0, exp: 0 };
      }
      byDateMap[e.date].rev += Number(e.revenue || 0);
      byDateMap[e.date].km += Number(e.km || 0);
      byDateMap[e.date].hours += Number(e.hours || 0);
      byDateMap[e.date].count += 1;
    });

    dbState.expenses.forEach(ex => {
      if (ex.isCancelled || !ex.date) return;
      if (!byDateMap[ex.date]) {
        byDateMap[ex.date] = { date: ex.date, rev: 0, km: 0, hours: 0, count: 0, exp: 0 };
      }
      byDateMap[ex.date].exp += Number(ex.amount || 0);
    });

    const allDaysList = Object.values(byDateMap).sort((a, b) => a.date.localeCompare(b.date));
    const workDaysList = allDaysList.filter(d => d.rev > 0 || d.km > 0 || d.count > 0);
    const uniqueWorkDays = workDaysList.length;

    // Max historical streak
    let maxStreak = streakCount;
    let currentRun = 0;
    let prevDateObj: Date | null = null;
    allDaysList.forEach(d => {
      const currObj = new Date(d.date + 'T12:00:00');
      if (!prevDateObj) {
        currentRun = 1;
      } else {
        const diffDays = Math.round((currObj.getTime() - prevDateObj.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentRun += 1;
        } else if (diffDays > 1) {
          currentRun = 1;
        }
      }
      if (currentRun > maxStreak) maxStreak = currentRun;
      prevDateObj = currObj;
    });

    // Days that met or exceeded dailyGoal
    const daysMetDailyGoal = dailyGoal > 0 ? workDaysList.filter(d => d.rev >= dailyGoal).length : 0;
    const goalHitRatePct = uniqueWorkDays > 0 && dailyGoal > 0 ? Math.round((daysMetDailyGoal / uniqueWorkDays) * 100) : 0;

    // Averages per work day
    const avgRevPerDay = uniqueWorkDays > 0 ? totals.totalRevenue / uniqueWorkDays : 0;
    const avgNetPerDay = uniqueWorkDays > 0 ? totals.lucro / uniqueWorkDays : 0;
    const avgKmPerDay = uniqueWorkDays > 0 ? totals.ridesKm / uniqueWorkDays : 0;
    const avgHoursPerDay = uniqueWorkDays > 0 ? totals.totalHours / uniqueWorkDays : 0;

    // Hourly & Per-KM productivity
    const grossPerHour = totals.totalHours > 0 ? totals.totalRevenue / totals.totalHours : 0;
    const netPerHour = totals.totalHours > 0 ? totals.lucro / totals.totalHours : 0;
    const kmPerHour = totals.totalHours > 0 ? totals.ridesKm / totals.totalHours : 0;

    const grossPerKm = totals.ridesKm > 0 ? totals.totalRevenue / totals.ridesKm : 0;
    const netPerKm = totals.ridesKm > 0 ? totals.lucro / totals.ridesKm : 0;
    const expensePerKm = totals.ridesKm > 0 ? totals.totalExpense / totals.ridesKm : 0;

    const kmPerLiter = Math.max(5, Number(dbState.fuelConfig.kmPerLiter) || 35);
    const fuelPrice = Math.max(0.5, Number(dbState.fuelConfig.fuelPrice) || 5.8);
    const estimatedFuelLiters = totals.ridesKm > 0 ? totals.ridesKm / kmPerLiter : 0;
    const estimatedFuelCost = estimatedFuelLiters * fuelPrice;
    const profitMarginPct =
      totals.totalRevenue > 0 ? Math.round((totals.lucro / totals.totalRevenue) * 100) : 0;

    // Estimated days to finish Custom Goal at current daily average
    const estimatedDaysToCustomGoal =
      customRemaining <= 0
        ? 0
        : avgRevPerDay > 0
        ? Math.ceil(customRemaining / avgRevPerDay)
        : customGoalDays;

    // Best day record
    const bestDayByRev =
      workDaysList.length > 0
        ? [...workDaysList].sort((a, b) => b.rev - a.rev)[0]
        : null;

    const bestDayByHourly =
      workDaysList.filter(d => d.hours > 0).length > 0
        ? [...workDaysList.filter(d => d.hours > 0)].sort(
            (a, b) => b.rev / b.hours - a.rev / a.hours
          )[0]
        : null;

    // Performance by App
    const appStatsMap: Record<
      string,
      { id: string; name: string; icon: string; rev: number; km: number; hours: number; count: number }
    > = {};
    allApps.forEach(a => {
      appStatsMap[a.id] = { id: a.id, name: a.name, icon: a.icon, rev: 0, km: 0, hours: 0, count: 0 };
    });
    dbState.entries.forEach(e => {
      if (e.isCancelled) return;
      if (!appStatsMap[e.app]) {
        appStatsMap[e.app] = {
          id: e.app,
          name: e.app,
          icon: '🛵',
          rev: 0,
          km: 0,
          hours: 0,
          count: 0,
        };
      }
      appStatsMap[e.app].rev += Number(e.revenue || 0);
      appStatsMap[e.app].km += Number(e.km || 0);
      appStatsMap[e.app].hours += Number(e.hours || 0);
      appStatsMap[e.app].count += 1;
    });
    const appPerformance = Object.values(appStatsMap)
      .filter(a => a.rev > 0 || a.count > 0)
      .map(a => ({
        ...a,
        sharePct: totals.totalRevenue > 0 ? Math.round((a.rev / totals.totalRevenue) * 100) : 0,
        revPerKm: a.km > 0 ? a.rev / a.km : 0,
        revPerHour: a.hours > 0 ? a.rev / a.hours : 0,
      }))
      .sort((a, b) => b.rev - a.rev);

    const bestApp = appPerformance.length > 0 ? appPerformance[0] : null;

    // Performance by Shift
    const shiftStatsMap: Record<
      string,
      { id: string; name: string; rev: number; km: number; hours: number; count: number }
    > = {};
    allShifts.forEach(s => {
      shiftStatsMap[s.id] = { id: s.id, name: s.name, rev: 0, km: 0, hours: 0, count: 0 };
    });
    dbState.entries.forEach(e => {
      if (e.isCancelled) return;
      const shId = e.shift || 'almoco';
      if (!shiftStatsMap[shId]) {
        shiftStatsMap[shId] = { id: shId, name: shId, rev: 0, km: 0, hours: 0, count: 0 };
      }
      shiftStatsMap[shId].rev += Number(e.revenue || 0);
      shiftStatsMap[shId].km += Number(e.km || 0);
      shiftStatsMap[shId].hours += Number(e.hours || 0);
      shiftStatsMap[shId].count += 1;
    });
    const shiftPerformance = Object.values(shiftStatsMap)
      .filter(s => s.rev > 0 || s.count > 0)
      .map(s => ({
        ...s,
        sharePct: totals.totalRevenue > 0 ? Math.round((s.rev / totals.totalRevenue) * 100) : 0,
        revPerKm: s.km > 0 ? s.rev / s.km : 0,
        revPerHour: s.hours > 0 ? s.rev / s.hours : 0,
      }))
      .sort((a, b) => b.rev - a.rev);

    const bestShift = shiftPerformance.length > 0 ? shiftPerformance[0] : null;

    // Maintenance health summary
    const totalMaintItems = dbState.maintenanceItems.length;
    const healthyMaintCount = Math.max(
      0,
      totalMaintItems - maintAlertStats.overdueCount - maintAlertStats.alertCount
    );
    const totalMaintHistorySpent = dbState.maintenanceItems.reduce((sum, item) => {
      const hist = Array.isArray(item.history) ? item.history : [];
      return sum + hist.reduce((s, r) => s + Number(r.amount || 0), 0);
    }, 0);

    // Last 7 days detailed evolution
    const last7DaysDetailed = chart7Days.map(d => {
      const dayEntries = dbState.entries.filter(e => !e.isCancelled && e.date === d.date);
      const hours = dayEntries.reduce((s, e) => s + Number(e.hours || 0), 0);
      const goalPct = dailyGoal > 0 ? Math.min(100, Math.round((d.rev / dailyGoal) * 100)) : 0;
      const revPerHour = hours > 0 ? d.rev / hours : 0;
      const revPerKm = d.km > 0 ? d.rev / d.km : 0;
      return {
        ...d,
        hours,
        goalPct,
        metGoal: dailyGoal > 0 && d.rev >= dailyGoal,
        revPerHour,
        revPerKm,
        count: dayEntries.length,
      };
    });

    // 12 Progressive Achievements with individual progress bars
    const uniqueAppsUsedCount = appPerformance.length;
    const achievements = [
      {
        id: 'km_100',
        icon: '🏁',
        title: 'Primeiros 100 km',
        desc: 'Complete seus primeiros 100 km registrados',
        current: totals.totalKm,
        target: 100,
        unit: 'km',
        unlocked: totals.totalKm >= 100,
        pct: Math.min(100, Math.round((totals.totalKm / 100) * 100)),
      },
      {
        id: 'km_500',
        icon: '🛣️',
        title: 'Piloto de Rota (500 km)',
        desc: 'Alcance 500 km acumulados no odômetro/corridas',
        current: totals.totalKm,
        target: 500,
        unit: 'km',
        unlocked: totals.totalKm >= 500,
        pct: Math.min(100, Math.round((totals.totalKm / 500) * 100)),
      },
      {
        id: 'km_1000',
        icon: '🏍️',
        title: '1.000 km no Asfalto',
        desc: 'Supere a marca de 1.000 km monitorados no app',
        current: totals.totalKm,
        target: 1000,
        unit: 'km',
        unlocked: totals.totalKm >= 1000,
        pct: Math.min(100, Math.round((totals.totalKm / 1000) * 100)),
      },
      {
        id: 'km_5000',
        icon: '⚡',
        title: 'Veterano 5.000 km',
        desc: 'Atinja 5.000 km de rodagem acompanhada',
        current: totals.totalKm,
        target: 5000,
        unit: 'km',
        unlocked: totals.totalKm >= 5000,
        pct: Math.min(100, Math.round((totals.totalKm / 5000) * 100)),
      },
      {
        id: 'rev_500',
        icon: '💵',
        title: 'Primeiros R$ 500',
        desc: 'Acumule R$ 500 em faturamento bruto registrado',
        current: totals.totalRevenue,
        target: 500,
        unit: 'R$',
        unlocked: totals.totalRevenue >= 500,
        pct: Math.min(100, Math.round((totals.totalRevenue / 500) * 100)),
      },
      {
        id: 'rev_1000',
        icon: '💰',
        title: 'R$ 1.000 Faturados',
        desc: 'Chegue ao primeiro milhar em ganhos brutos',
        current: totals.totalRevenue,
        target: 1000,
        unit: 'R$',
        unlocked: totals.totalRevenue >= 1000,
        pct: Math.min(100, Math.round((totals.totalRevenue / 1000) * 100)),
      },
      {
        id: 'rev_5000',
        icon: '💎',
        title: 'R$ 5.000 Faturados',
        desc: 'Alcance R$ 5.000 de faturamento acumulado',
        current: totals.totalRevenue,
        target: 5000,
        unit: 'R$',
        unlocked: totals.totalRevenue >= 5000,
        pct: Math.min(100, Math.round((totals.totalRevenue / 5000) * 100)),
      },
      {
        id: 'rev_10000',
        icon: '👑',
        title: 'Elite R$ 10.000',
        desc: 'Fature R$ 10.000 registrados no Mochilinha',
        current: totals.totalRevenue,
        target: 10000,
        unit: 'R$',
        unlocked: totals.totalRevenue >= 10000,
        pct: Math.min(100, Math.round((totals.totalRevenue / 10000) * 100)),
      },
      {
        id: 'streak_7',
        icon: '🔥',
        title: '7 Dias Seguidos',
        desc: 'Registre corridas ou gastos por 7 dias consecutivos',
        current: maxStreak,
        target: 7,
        unit: 'dias',
        unlocked: maxStreak >= 7,
        pct: Math.min(100, Math.round((maxStreak / 7) * 100)),
      },
      {
        id: 'goal_hunter',
        icon: '🎯',
        title: 'Batedor de Metas (5x)',
        desc: 'Bata sua Meta Diária em pelo menos 5 dias diferentes',
        current: daysMetDailyGoal,
        target: 5,
        unit: 'dias',
        unlocked: daysMetDailyGoal >= 5,
        pct: Math.min(100, Math.round((daysMetDailyGoal / 5) * 100)),
      },
      {
        id: 'multi_app',
        icon: '🗺️',
        title: 'Estrategista Multi-App',
        desc: 'Registre corridas em pelo menos 3 aplicativos diferentes',
        current: uniqueAppsUsedCount,
        target: 3,
        unit: 'apps',
        unlocked: uniqueAppsUsedCount >= 3,
        pct: Math.min(100, Math.round((uniqueAppsUsedCount / 3) * 100)),
      },
      {
        id: 'positive_profit',
        icon: '📊',
        title: 'Gestão no Azul',
        desc: 'Mantenha lucro líquido positivo acima de R$ 500',
        current: Math.max(0, totals.lucro),
        target: 500,
        unit: 'R$',
        unlocked: totals.lucro >= 500,
        pct: Math.min(100, Math.round((Math.max(0, totals.lucro) / 500) * 100)),
      },
    ];

    // Last 30 days daily earnings evolution for Recharts LineChart
    const last30DaysEvolution: {
      date: string;
      fullDateLabel: string;
      label: string;
      ganhos: number;
      metaDiaria: number;
      km: number;
      hours: number;
      metGoal: boolean;
    }[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const [yyyy, mm, dd] = iso.split('-');
      const dayEntries = dbState.entries.filter(e => e.date === iso);
      const rev = dayEntries.reduce((s, e) => s + Number(e.revenue || 0), 0);
      const km = dayEntries.reduce((s, e) => s + Number(e.km || 0), 0);
      const hours = dayEntries.reduce((s, e) => s + Number(e.hours || 0), 0);
      last30DaysEvolution.push({
        date: iso,
        fullDateLabel: `${dd}/${mm}/${yyyy}`,
        label: `${dd}/${mm}`,
        ganhos: Math.round(rev * 100) / 100,
        metaDiaria: dailyGoal,
        km: Math.round(km * 10) / 10,
        hours: Math.round(hours * 10) / 10,
        metGoal: dailyGoal > 0 && rev >= dailyGoal,
      });
    }

    const total30DaysRev = last30DaysEvolution.reduce((s, d) => s + d.ganhos, 0);
    const activeDaysIn30 = last30DaysEvolution.filter(d => d.ganhos > 0 || d.km > 0).length;
    const avg30DaysActiveRev = activeDaysIn30 > 0 ? total30DaysRev / activeDaysIn30 : 0;
    const daysMetGoalIn30 = last30DaysEvolution.filter(d => d.metGoal).length;

    const unlockedCount = achievements.filter(a => a.unlocked).length;

    return {
      dailyGoal,
      weeklyGoal,
      customGoalTarget,
      customGoalDays,
      customGoalTitle,
      customGoalMode: dbState.customGoalMode || 'days',
      customGoalTargetDate: customGoalCountdown.targetDateStr,
      customGoalCountdown,
      customScope,
      currentMonthName: periodTotals.currentMonthName,
      revToday,
      kmToday,
      hoursToday,
      dailyPct,
      dailyRemaining,
      revWeek,
      kmWeek,
      hoursWeek,
      weekActiveDays,
      weeklyPct,
      weeklyRemaining,
      weeklyDailyNeeded,
      customCurrent,
      customGross,
      customExpenses,
      customPct,
      customRemaining,
      customDailyNeeded,
      estimatedDaysToCustomGoal,
      uniqueWorkDays,
      maxStreak,
      daysMetDailyGoal,
      goalHitRatePct,
      avgRevPerDay,
      avgNetPerDay,
      avgKmPerDay,
      avgHoursPerDay,
      grossPerHour,
      netPerHour,
      kmPerHour,
      grossPerKm,
      netPerKm,
      expensePerKm,
      estimatedFuelLiters,
      estimatedFuelCost,
      profitMarginPct,
      bestDayByRev,
      bestDayByHourly,
      appPerformance,
      bestApp,
      shiftPerformance,
      bestShift,
      totalMaintItems,
      healthyMaintCount,
      totalMaintHistorySpent,
      last7DaysDetailed,
      last30DaysEvolution,
      total30DaysRev,
      activeDaysIn30,
      avg30DaysActiveRev,
      daysMetGoalIn30,
      achievements,
      unlockedCount,
    };
  }, [
    dbState,
    periodTotals.revWeek,
    periodTotals.revMonth,
    periodTotals.currentMonthName,
    totals,
    streakCount,
    allApps,
    allShifts,
    maintAlertStats,
    chart7Days,
  ]);

  // ================= AI FINANCIAL INTELLIGENCE & MOTOBOY RESERVES ENGINE =================
  const finPlan: FinancialPlanningConfig = useMemo(
    () => ({
      ...DEFAULT_FINANCIAL_PLAN,
      ...(dbState.financialPlan || {}),
    }),
    [dbState.financialPlan]
  );

  const updateFinancialPlan = (patch: Partial<FinancialPlanningConfig>) => {
    persistAndEnqueueWorkManager({
      ...dbState,
      financialPlan: {
        ...finPlan,
        ...patch,
      },
    });
  };

  const financialIntelligence = useMemo(() => {
    const workDaysPerMonth = Math.max(1, Math.min(31, Number(finPlan.workDaysPerMonth) || 24));
    const hasLoggedDays = progressAnalytics.uniqueWorkDays > 0;

    let dailyGross = Math.max(0, Number(dbState.dailyGoal) || 0);
    let dailyKm = dailyGross > 0 ? Math.max(20, Math.round(dailyGross / 1.65)) : 0;
    let baseLabel = 'Meta Diária Configurada';

    if (finPlan.revenueBaseMode === 'actual_or_goal') {
      if (hasLoggedDays && progressAnalytics.avgRevPerDay > 0) {
        dailyGross = progressAnalytics.avgRevPerDay;
        dailyKm = progressAnalytics.avgKmPerDay > 0 ? progressAnalytics.avgKmPerDay : Math.max(30, Math.round(dailyGross / 1.65));
        baseLabel = `Sua Média Real (${progressAnalytics.uniqueWorkDays} dias registrados)`;
      } else {
        dailyGross = Math.max(0, Number(dbState.dailyGoal) || 0);
        dailyKm = dailyGross > 0 ? Math.max(30, Math.round(dailyGross / 1.65)) : 0;
        baseLabel = 'Sua Meta Diária (Sem corridas salvas ainda)';
      }
    } else if (finPlan.revenueBaseMode === 'daily_goal') {
      dailyGross = Math.max(0, Number(dbState.dailyGoal) || 0);
      dailyKm = progressAnalytics.avgKmPerDay > 0 ? progressAnalytics.avgKmPerDay : (dailyGross > 0 ? Math.max(30, Math.round(dailyGross / 1.65)) : 0);
      baseLabel = 'Meta Diária do Painel';
    } else if (finPlan.revenueBaseMode === 'custom_daily') {
      dailyGross = Math.max(0, Number(finPlan.customDailyGrossBase) || Number(dbState.dailyGoal) || 0);
      dailyKm = Math.max(0, Number(finPlan.customDailyKmBase) || 0);
      baseLabel = 'Simulação Personalizada';
    }

    const monthlyGross = dailyGross * workDaysPerMonth;
    const weeklyGross = dailyGross * Math.min(7, Math.round(workDaysPerMonth / 4));

    // 1. Combustível Diário (Inicialmente pelo consumo KM/L, atualizado abaixo caso o usuário personalize o card de Combustível)
    const kmPerLiter = Math.max(5, Number(dbState.fuelConfig.kmPerLiter) || 35);
    const fuelPrice = Math.max(1, Number(dbState.fuelConfig.fuelPrice) || 5.8);
    const fuelCostPerKm = fuelPrice / kmPerLiter;
    let dailyFuelCost = dailyKm * fuelCostPerKm;
    let monthlyFuelCost = dailyFuelCost * workDaysPerMonth;
    let fuelPctOfGross = dailyGross > 0 ? Math.round((dailyFuelCost / dailyGross) * 100) : 0;

    // 2. Reserva Diária para Manutenção da Moto (Desgaste real por KM de cada peça + margem preventiva)
    const maintBreakdown = dbState.maintenanceItems.map(item => {
      const interval = Math.max(100, Number(item.intervalKm) || 1000);
      const cost = Math.max(0, Number(item.costEstimate) || 0);
      const costPerKm = cost / interval;
      const dailyReserve = costPerKm * dailyKm;
      const monthlyReserve = dailyReserve * workDaysPerMonth;
      return {
        id: item.id,
        name: item.name,
        icon: item.icon,
        intervalKm: interval,
        costEstimate: cost,
        costPerKm,
        dailyReserve,
        monthlyReserve,
      };
    });

    const baseMaintCostPerKm = maintBreakdown.reduce((s, m) => s + m.costPerKm, 0);
    const baseDailyMaintWear = baseMaintCostPerKm * dailyKm;
    const extraBufferPct = Math.max(0, Math.min(25, Number(finPlan.maintenanceExtraBufferPct) || 0));
    const extraDailyMaintBuffer = dailyGross * (extraBufferPct / 100);
    let dailyMaintReserve = baseDailyMaintWear + extraDailyMaintBuffer;
    let monthlyMaintReserve = dailyMaintReserve * workDaysPerMonth;
    let maintPctOfGross = dailyGross > 0 ? Math.round((dailyMaintReserve / dailyGross) * 100) : 0;

    // 3. Alimentação na Rua (Almoço + Lanche / Água / Café)
    const dailyLunch = Math.max(0, Number(finPlan.dailyLunchBudget) || 0);
    const dailySnack = Math.max(0, Number(finPlan.dailySnackBudget) || 0);
    const dailyFoodCost = dailyLunch + dailySnack;
    const monthlyFoodCost = dailyFoodCost * workDaysPerMonth;
    const foodPctOfGross = dailyGross > 0 ? Math.round((dailyFoodCost / dailyGross) * 100) : 0;

    // 4. Documentação da Moto (IPVA, Licenciamento, MEI/Seguro, CNH/Taxas)
    const ipvaAnnual = Math.max(0, Number(finPlan.ipvaAnnual) || 0);
    const licensingAnnual = Math.max(0, Number(finPlan.licensingAnnual) || 0);
    const otherDocsAnnual = Math.max(0, Number(finPlan.otherDocsAnnual) || 0);
    const insuranceMonthly = Math.max(0, Number(finPlan.insuranceOrMeiMonthly) || 0);
    const docsTargetMonths = Math.max(1, Math.min(12, Number(finPlan.docsTargetMonths) || 12));

    const annualStateDocsTotal = ipvaAnnual + licensingAnnual + otherDocsAnnual;
    const workDaysUntilDocsDue = Math.max(1, docsTargetMonths * workDaysPerMonth);

    const dailyIpvaReserve = ipvaAnnual / workDaysUntilDocsDue;
    const dailyLicensingReserve = licensingAnnual / workDaysUntilDocsDue;
    const dailyOtherDocsReserve = otherDocsAnnual / workDaysUntilDocsDue;
    const dailyMeiInsuranceReserve = insuranceMonthly / workDaysPerMonth;

    let dailyDocsReserve =
      dailyIpvaReserve + dailyLicensingReserve + dailyOtherDocsReserve + dailyMeiInsuranceReserve;
    let weeklyDocsReserve = dailyDocsReserve * Math.min(7, Math.round(workDaysPerMonth / 4));
    let monthlyDocsReserve = dailyDocsReserve * workDaysPerMonth;
    const totalAnnualDocsWithInsurance = annualStateDocsTotal + insuranceMonthly * 12;
    let docsPctOfGross = dailyGross > 0 ? Math.round((dailyDocsReserve / dailyGross) * 100) : 0;

    // Despesas Cadastradas da Moto & Peças (Respeita 100% qualquer edição feita pelo usuário + cálculo proporcional nos itens padrão)
    const rawBikeExpenses: BikeExpenseItem[] =
      Array.isArray(dbState.bikeExpenses)
        ? dbState.bikeExpenses
        : DEFAULT_BIKE_EXPENSES;

    const enrichedBikeExpenses = rawBikeExpenses.map(item => {
      const lowerName = item.name.toLowerCase();
      const lowerCat = (item.category || '').toLowerCase();
      const defaultMatch = DEFAULT_BIKE_EXPENSES.find(d => d.id === item.id);
      const isUserCustom = Boolean(
        item.isCustomEdited ||
          !defaultMatch ||
          item.intervalDays !== defaultMatch.intervalDays ||
          item.totalCost !== defaultMatch.totalCost ||
          item.monthlyAmount !== defaultMatch.monthlyAmount ||
          item.recurrenceType !== defaultMatch.recurrenceType
      );

      let dailyRateio = 0;
      let monthlyCost = 0;
      let totalCost = item.totalCost || 0;
      let calculationNote = '';
      let isProportional = false;

      // SE O USUÁRIO EDITOU OU PERSONALIZOU ESTE CARD, RESPEITA EXATAMENTE O VALOR SALVO POR ELE!
      if (isUserCustom) {
        const intDays = Math.max(1, Number(item.intervalDays) || 30);
        if (item.recurrenceType === 'interval_days' && Number(item.totalCost) > 0) {
          totalCost = Number(item.totalCost);
          monthlyCost = Math.round(((totalCost / intDays) * 30) * 100) / 100;
        } else {
          monthlyCost = Math.max(0, Number(item.monthlyAmount) || 0);
          totalCost = Number(item.totalCost) > 0 ? Number(item.totalCost) : monthlyCost;
        }
        dailyRateio = monthlyCost / workDaysPerMonth;
        calculationNote =
          item.recurrenceType === 'interval_days'
            ? `${fmtCurrencyExact(totalCost)} a cada ${intDays} ${intDays === 1 ? 'dia' : 'dias'} → ${fmtCurrencyExact(dailyRateio)}/dia (${workDaysPerMonth}d úteis)`
            : `Rateio em ${workDaysPerMonth} dias úteis: ${fmtCurrencyExact(dailyRateio)}/dia`;
        isProportional = false;
      }
      // CASO CONTRÁRIO (Item padrão ainda não editado manualmente), usa o cálculo proporcional da IA:
      // 1. IPVA
      else if (item.id === 'ipva_licenciamento' || lowerName.includes('ipva')) {
        dailyRateio = dailyIpvaReserve;
        monthlyCost = dailyIpvaReserve * workDaysPerMonth;
        totalCost = ipvaAnnual;
        calculationNote = `Rateio IA: ${fmtCurrencyExact(dailyIpvaReserve)}/dia (${docsTargetMonths} meses p/ quitar ${fmtCurrencyExact(ipvaAnnual)})`;
        isProportional = true;
      }
      // 2. Licenciamento CRLV-e
      else if (lowerName.includes('licenciamento')) {
        dailyRateio = dailyLicensingReserve;
        monthlyCost = dailyLicensingReserve * workDaysPerMonth;
        totalCost = licensingAnnual;
        calculationNote = `Rateio IA: ${fmtCurrencyExact(dailyLicensingReserve)}/dia (${docsTargetMonths} meses)`;
        isProportional = true;
      }
      // 3. Seguro / Proteção Veicular / MEI
      else if (item.id === 'seguro_rastreador' || lowerCat === 'seguro' || lowerName.includes('seguro') || lowerName.includes('rastreador')) {
        dailyRateio = dailyMeiInsuranceReserve;
        monthlyCost = insuranceMonthly;
        totalCost = insuranceMonthly;
        calculationNote = `Rateio IA: ${fmtCurrencyExact(dailyMeiInsuranceReserve)}/dia (${fmtCurrencyExact(insuranceMonthly)}/mês)`;
        isProportional = true;
      }
      // 4. Combustível (Padrão por KM/L quando não editado manualmente)
      else if (item.id === 'combustivel_mensal' || item.id === 'combustivel_semanal' || lowerCat === 'combustivel' || lowerName.includes('combustível') || lowerName.includes('gasolina')) {
        dailyRateio = dailyFuelCost;
        monthlyCost = monthlyFuelCost;
        const intDays = Math.max(1, Number(item.intervalDays) || 7);
        totalCost = Math.round(((monthlyFuelCost / 30) * intDays) * 100) / 100;
        calculationNote = `Consumo real: ~${Math.round(dailyKm)} km/dia a ${kmPerLiter} km/L`;
        isProportional = true;
      }
      // 5. Óleo do Motor
      else if (item.id === 'oleo_filtro' || item.id === 'oleo_motor' || lowerName.includes('óleo')) {
        const oilObj = maintBreakdown.find(m => m.id === 'oil');
        const wearDaily = oilObj ? oilObj.dailyReserve : 0;
        const bufferShare = baseDailyMaintWear > 0 ? (wearDaily / baseDailyMaintWear) * extraDailyMaintBuffer : 0;
        dailyRateio = wearDaily + bufferShare;
        monthlyCost = dailyRateio * workDaysPerMonth;
        totalCost = oilObj ? oilObj.costEstimate : (item.totalCost || 0);
        calculationNote = `Desgaste mecânico: ${fmtCurrencyExact(dailyRateio)}/dia (~${Math.round(dailyKm)} km/dia)`;
        isProportional = true;
      }
      // 6. Pneus
      else if (item.id === 'pneus_camaras' || lowerName.includes('pneu')) {
        const tireObj = maintBreakdown.find(m => m.id === 'tire');
        const wearDaily = tireObj ? tireObj.dailyReserve : 0;
        const bufferShare = baseDailyMaintWear > 0 ? (wearDaily / baseDailyMaintWear) * extraDailyMaintBuffer : 0;
        dailyRateio = wearDaily + bufferShare;
        monthlyCost = dailyRateio * workDaysPerMonth;
        totalCost = tireObj ? tireObj.costEstimate : (item.totalCost || 0);
        calculationNote = `Desgaste mecânico: ${fmtCurrencyExact(dailyRateio)}/dia (~${Math.round(dailyKm)} km/dia)`;
        isProportional = true;
      }
      // 7. Kit Relação
      else if (item.id === 'kit_transmissao' || lowerName.includes('relação') || lowerName.includes('corrente')) {
        const chainObj = maintBreakdown.find(m => m.id === 'chain');
        const wearDaily = chainObj ? chainObj.dailyReserve : 0;
        const bufferShare = baseDailyMaintWear > 0 ? (wearDaily / baseDailyMaintWear) * extraDailyMaintBuffer : 0;
        dailyRateio = wearDaily + bufferShare;
        monthlyCost = dailyRateio * workDaysPerMonth;
        totalCost = chainObj ? chainObj.costEstimate : (item.totalCost || 0);
        calculationNote = `Desgaste mecânico: ${fmtCurrencyExact(dailyRateio)}/dia (~${Math.round(dailyKm)} km/dia)`;
        isProportional = true;
      }
      // 8. Freios e Pastilhas
      else if (item.id === 'freios_pastilhas' || lowerName.includes('freio') || lowerName.includes('pastilha')) {
        const brakeObj = maintBreakdown.find(m => m.id === 'brake');
        const wearDaily = brakeObj ? brakeObj.dailyReserve : 0;
        const bufferShare = baseDailyMaintWear > 0 ? (wearDaily / baseDailyMaintWear) * extraDailyMaintBuffer : 0;
        dailyRateio = wearDaily + bufferShare;
        monthlyCost = dailyRateio * workDaysPerMonth;
        totalCost = brakeObj ? brakeObj.costEstimate : (item.totalCost || 0);
        calculationNote = `Desgaste mecânico: ${fmtCurrencyExact(dailyRateio)}/dia (~${Math.round(dailyKm)} km/dia)`;
        isProportional = true;
      }
      // 9. Revisão Geral e Outros
      else {
        const itemMonthly = Math.max(0, Number(item.monthlyAmount) || 0);
        dailyRateio = itemMonthly / workDaysPerMonth;
        monthlyCost = itemMonthly;
        calculationNote = `Rateio fixo em ${workDaysPerMonth} dias úteis`;
        isProportional = false;
      }

      return {
        ...item,
        monthlyAmount: monthlyCost,
        dailyRateio,
        monthlyCost,
        totalCost: totalCost > 0 ? totalCost : monthlyCost,
        calculationNote,
        isProportional,
      };
    });

    const activeBikeExpenses = rawBikeExpenses.filter(b => b.isActive);
    const activeEnrichedBikeExpenses = enrichedBikeExpenses.filter(b => b.isActive);

    // Sincroniza Combustível, Documentação/Seguro e Manutenção/Peças diretamente com os cards ativos da moto para que a soma bata 100%
    if (activeEnrichedBikeExpenses.length > 0) {
      const isFuelItem = (b: typeof activeEnrichedBikeExpenses[number]) =>
        b.id === 'combustivel_mensal' ||
        b.id === 'combustivel_semanal' ||
        b.category === 'combustivel' ||
        b.name.toLowerCase().includes('combustível') ||
        b.name.toLowerCase().includes('gasolina');

      const isDocsItem = (b: typeof activeEnrichedBikeExpenses[number]) =>
        !isFuelItem(b) &&
        (b.category === 'documentacao' ||
          b.category === 'seguro' ||
          b.id === 'ipva_licenciamento' ||
          b.id === 'seguro_rastreador' ||
          b.name.toLowerCase().includes('ipva') ||
          b.name.toLowerCase().includes('licenciamento') ||
          b.name.toLowerCase().includes('seguro'));

      const fuelItems = activeEnrichedBikeExpenses.filter(isFuelItem);
      const docsItems = activeEnrichedBikeExpenses.filter(isDocsItem);
      const maintItems = activeEnrichedBikeExpenses.filter(b => !isFuelItem(b) && !isDocsItem(b));

      if (fuelItems.length > 0) {
        dailyFuelCost = fuelItems.reduce((sum, f) => sum + f.dailyRateio, 0);
        monthlyFuelCost = fuelItems.reduce((sum, f) => sum + f.monthlyCost, 0);
        fuelPctOfGross = dailyGross > 0 ? Math.round((dailyFuelCost / dailyGross) * 100) : 0;
      }

      if (docsItems.length > 0) {
        dailyDocsReserve = docsItems.reduce((sum, d) => sum + d.dailyRateio, 0);
        monthlyDocsReserve = docsItems.reduce((sum, d) => sum + d.monthlyCost, 0);
        weeklyDocsReserve = dailyDocsReserve * Math.min(7, Math.round(workDaysPerMonth / 4));
        docsPctOfGross = dailyGross > 0 ? Math.round((dailyDocsReserve / dailyGross) * 100) : 0;
      }

      if (maintItems.length > 0) {
        dailyMaintReserve = maintItems.reduce((sum, m) => sum + m.dailyRateio, 0);
        monthlyMaintReserve = maintItems.reduce((sum, m) => sum + m.monthlyCost, 0);
        maintPctOfGross = dailyGross > 0 ? Math.round((dailyMaintReserve / dailyGross) * 100) : 0;
      }
    }

    // Rateio diário e mensal unificado das despesas da moto
    const unifiedDailyBikeReserve = activeEnrichedBikeExpenses.reduce(
      (sum, b) => sum + b.dailyRateio,
      0
    );
    const unifiedMonthlyBikeTotal = activeEnrichedBikeExpenses.reduce(
      (sum, b) => sum + b.monthlyCost,
      0
    );
    const unifiedWeeklyBikeReserve = unifiedDailyBikeReserve * Math.min(7, Math.round(workDaysPerMonth / 4));
    const unifiedBikePctOfGross = dailyGross > 0 ? Math.round((unifiedDailyBikeReserve / dailyGross) * 100) : 0;

    const monthlyBikeExpensesTotal = unifiedMonthlyBikeTotal;
    const dailyBikeExpensesReserve = unifiedDailyBikeReserve;
    const weeklyBikeExpensesReserve = unifiedWeeklyBikeReserve;
    const bikeExpensesPctOfGross = unifiedBikePctOfGross;

    // 5. Despesas da Casa & Família (Fora da Moto: Aluguel, Luz, Água, Mercado, Internet, etc.)
    const rawHouseholdExpenses: HouseholdExpenseItem[] =
      Array.isArray(dbState.householdExpenses)
        ? dbState.householdExpenses
        : DEFAULT_HOUSEHOLD_EXPENSES;
    const activeHouseholdExpenses = rawHouseholdExpenses.filter(h => h.isActive);
    const monthlyHouseholdCost = activeHouseholdExpenses.reduce(
      (sum, h) => sum + Math.max(0, Number(h.monthlyAmount) || 0),
      0
    );

    // Mês de referência para conferência de pagamentos realizados e dedução do orçamento
    const currentYM = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const targetFinanceYM = selectedFinanceMonth || currentYM;

    // Calcula pagamentos efetuados e saldo restante a quitar das contas da casa
    let monthlyHouseholdPaid = 0;
    let monthlyHouseholdRemaining = 0;
    let householdPaidCount = 0;
    let householdPendingCount = 0;

    activeHouseholdExpenses.forEach(h => {
      const matching = (dbState.expenses || []).filter(
        e => !e.isCancelled && e.date && e.date.startsWith(targetFinanceYM) && matchesHouseholdExpense(e, h)
      );
      const paid = matching.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const budget =
        h.recurrenceType === 'interval_days' && h.totalCost && h.totalCost > 0
          ? Number(h.totalCost)
          : Math.max(0, Number(h.monthlyAmount) || 0);
      monthlyHouseholdPaid += paid;
      const isExplicitlyUnpaid = Boolean(h.unpaidMonths && h.unpaidMonths.includes(targetFinanceYM));
      const isPaidHouse =
        !isExplicitlyUnpaid &&
        (Boolean(h.paidMonths && h.paidMonths.includes(targetFinanceYM)) ||
          Boolean(h.lastPaidDate && h.lastPaidDate.startsWith(targetFinanceYM)) ||
          (paid >= budget && budget > 0) ||
          (paid > 0 && budget === 0));

      const rem = isPaidHouse ? 0 : isExplicitlyUnpaid ? budget : Math.max(0, budget - paid);
      monthlyHouseholdRemaining += rem;
      if (isPaidHouse) {
        householdPaidCount++;
      } else {
        householdPendingCount++;
      }
    });

    // Calcula pagamentos efetuados e saldo restante a quitar das contas da moto
    let monthlyBikePaid = 0;
    let monthlyBikeRemaining = 0;
    let bikePaidCount = 0;
    let bikePendingCount = 0;

    activeEnrichedBikeExpenses.forEach(b => {
      const matching = (dbState.expenses || []).filter(
        e => !e.isCancelled && e.date && e.date.startsWith(targetFinanceYM) && matchesBikeExpense(e, b)
      );
      const paid = matching.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const budget = (b as any).monthlyCost ?? Number(b.monthlyAmount || 0);
      monthlyBikePaid += paid;
      const isExplicitlyUnpaid = Boolean(b.unpaidMonths && b.unpaidMonths.includes(targetFinanceYM));
      const isPaidBike =
        !isExplicitlyUnpaid &&
        (Boolean(b.paidMonths && b.paidMonths.includes(targetFinanceYM)) ||
          Boolean(b.lastPaidDate && b.lastPaidDate.startsWith(targetFinanceYM)) ||
          (paid >= budget && budget > 0) ||
          (paid > 0 && budget === 0));

      const rem = isPaidBike ? 0 : isExplicitlyUnpaid ? budget : Math.max(0, budget - paid);
      monthlyBikeRemaining += rem;
      if (isPaidBike) {
        bikePaidCount++;
      } else {
        bikePendingCount++;
      }
    });

    // Rateio diário obrigatório das despesas da moto considerando o que resta pagar (deduzido dos gastos já lançados)
    const dailyBikeRemainingReserve = monthlyBikeRemaining > 0
      ? monthlyBikeRemaining / workDaysPerMonth
      : 0;
    const weeklyBikeRemainingReserve = dailyBikeRemainingReserve * Math.min(7, Math.round(workDaysPerMonth / 4));

    // Rateio diário obrigatório das despesas da casa considerando o que resta pagar (deduzido dos gastos já lançados)
    const dailyHouseholdReserve = monthlyHouseholdRemaining > 0
      ? monthlyHouseholdRemaining / workDaysPerMonth
      : 0;
    const weeklyHouseholdReserve = dailyHouseholdReserve * Math.min(7, Math.round(workDaysPerMonth / 4));
    const housePctOfGross = dailyGross > 0 ? Math.round((dailyHouseholdReserve / dailyGross) * 100) : 0;

    // Subtotal Moto & Operação (Custos Operacionais da Moto + Alimentação no Turno de Rua)
    const dailyBikeCostsTotal = unifiedDailyBikeReserve + dailyFoodCost;
    const monthlyBikeCostsTotal = unifiedMonthlyBikeTotal + monthlyFoodCost;
    const bikePctOfGross = dailyGross > 0 ? Math.round((dailyBikeCostsTotal / dailyGross) * 100) : 0;

    // 6. Reserva de Emergência (Fundo de Segurança Pessoal / Imprevistos / Dias Parados)
    const emergencyPct = Math.max(0, Math.min(40, Number(finPlan.emergencyReservePct) || 0));
    const dailyEmergencyReserve = dailyGross * (emergencyPct / 100);
    const monthlyEmergencyReserve = dailyEmergencyReserve * workDaysPerMonth;
    const emergencyIn6Months = monthlyEmergencyReserve * 6;
    const emergencyIn12Months = monthlyEmergencyReserve * 12;

    // 7. Consolidação das Reservas Totais (Tudo o que deve reservar: Moto + Casa + Emergência)
    const totalDailyCostsAndReserves =
      dailyBikeCostsTotal + dailyHouseholdReserve + dailyEmergencyReserve;
    const totalMonthlyCostsAndReserves =
      monthlyBikeCostsTotal + monthlyHouseholdRemaining + monthlyEmergencyReserve;
    const totalReservesPctOfGross =
      dailyGross > 0 ? Math.round((totalDailyCostsAndReserves / dailyGross) * 100) : 0;

    // 8. Lucro Líquido Real 100% Livre (O Que Sobra de Fato Limpo no Bolso do Piloto)
    const dailyNetProfit = dailyGross - totalDailyCostsAndReserves;
    const weeklyNetProfit = dailyNetProfit * Math.min(7, Math.round(workDaysPerMonth / 4));
    const monthlyNetProfit = dailyNetProfit * workDaysPerMonth;
    const netMarginPct = dailyGross > 0 ? Math.round((dailyNetProfit / dailyGross) * 100) : 0;

    // Pontos de Equilíbrio (Break-Even Real)
    // Nível 1: Break-even da Moto (R$/dia para não pagar para trabalhar)
    const breakEvenBikeDaily = dailyBikeCostsTotal;
    // Nível 2: Break-even Total (Moto + Casa: R$/dia para pagar trabalho e contas da casa)
    const breakEvenDaily = dailyBikeCostsTotal + dailyHouseholdReserve;
    const breakEvenMonthly = monthlyBikeCostsTotal + monthlyHouseholdRemaining;
    // Nível 3: Ponto de Blindagem (Moto + Casa + Emergência)
    const shieldDaily = totalDailyCostsAndReserves;

    const avgDailyHours = progressAnalytics.avgHoursPerDay > 0 ? progressAnalytics.avgHoursPerDay : 8;
    const realNetPerHour = avgDailyHours > 0 ? dailyNetProfit / avgDailyHours : 0;
    const realNetPerKm = dailyKm > 0 ? dailyNetProfit / dailyKm : 0;

    // Quando o usuário também tem gastos reais lançados no histórico, comparativo real
    const totalRealLoggedRev = totals.totalRevenue;
    const totalRealLoggedExp = totals.totalExpense;
    const totalRealLoggedProfit = totals.lucro;

    return {
      workDaysPerMonth,
      baseLabel,
      dailyGross,
      weeklyGross,
      monthlyGross,
      dailyKm,
      kmPerLiter,
      fuelPrice,
      fuelCostPerKm,
      dailyFuelCost,
      monthlyFuelCost,
      fuelPctOfGross,
      maintBreakdown,
      baseMaintCostPerKm,
      baseDailyMaintWear,
      extraBufferPct,
      extraDailyMaintBuffer,
      dailyMaintReserve,
      monthlyMaintReserve,
      maintPctOfGross,
      dailyLunch,
      dailySnack,
      dailyFoodCost,
      monthlyFoodCost,
      foodPctOfGross,
      ipvaAnnual,
      licensingAnnual,
      otherDocsAnnual,
      insuranceMonthly,
      docsTargetMonths,
      annualStateDocsTotal,
      totalAnnualDocsWithInsurance,
      dailyIpvaReserve,
      dailyLicensingReserve,
      dailyOtherDocsReserve,
      dailyMeiInsuranceReserve,
      dailyDocsReserve,
      weeklyDocsReserve,
      monthlyDocsReserve,
      docsPctOfGross,
      // Despesas Cadastradas da Moto
      rawBikeExpenses,
      activeBikeExpenses,
      enrichedBikeExpenses,
      activeEnrichedBikeExpenses,
      monthlyBikeExpensesTotal,
      monthlyBikePaid,
      monthlyBikeRemaining,
      bikePaidCount,
      bikePendingCount,
      dailyBikeExpensesReserve,
      weeklyBikeExpensesReserve,
      dailyBikeRemainingReserve,
      weeklyBikeRemainingReserve,
      bikeExpensesPctOfGross,
      // Despesas da Casa & Família
      rawHouseholdExpenses,
      activeHouseholdExpenses,
      monthlyHouseholdCost,
      monthlyHouseholdPaid,
      monthlyHouseholdRemaining,
      householdPaidCount,
      householdPendingCount,
      dailyHouseholdReserve,
      weeklyHouseholdReserve,
      housePctOfGross,
      // Subtotais Moto e Totais Consolidados
      dailyBikeCostsTotal,
      monthlyBikeCostsTotal,
      bikePctOfGross,
      emergencyPct,
      dailyEmergencyReserve,
      monthlyEmergencyReserve,
      emergencyIn6Months,
      emergencyIn12Months,
      totalDailyCostsAndReserves,
      totalMonthlyCostsAndReserves,
      totalReservesPctOfGross,
      dailyNetProfit,
      weeklyNetProfit,
      monthlyNetProfit,
      netMarginPct,
      breakEvenBikeDaily,
      breakEvenDaily,
      breakEvenMonthly,
      shieldDaily,
      avgDailyHours,
      realNetPerHour,
      realNetPerKm,
      totalRealLoggedRev,
      totalRealLoggedExp,
      totalRealLoggedProfit,
    };
  }, [dbState, finPlan, progressAnalytics, totals, selectedFinanceMonth]);

  // ================= TELEMETRIA REAL DO COMBUSTÍVEL & AUTONOMIA BASEADA EM ABASTECIMENTO =================
  const fuelTelemetry = useMemo(() => {
    const kmPerLiter = Math.max(5, Number(dbState.fuelConfig.kmPerLiter) || 35);
    const fuelExpenses = dbState.expenses
      .filter(ex => !ex.isCancelled && ex.category === 'combustivel')
      .sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return (b.id || 0) - (a.id || 0);
      });

    const latestFuel = fuelExpenses.length > 0 ? fuelExpenses[0] : null;

    if (latestFuel) {
      const amountPaid = Number(latestFuel.amount) || 0;
      const pricePerL = Number(latestFuel.pricePerLiter) || Number(dbState.fuelConfig.fuelPrice) || 5.8;
      const liters = Number(latestFuel.liters) || (pricePerL > 0 ? amountPaid / pricePerL : 0);
      const totalAutonomyKm = Math.round(liters * kmPerLiter);

      const odoAtFuel = latestFuel.odometerKm !== undefined && latestFuel.odometerKm !== null ? Number(latestFuel.odometerKm) : totals.totalKm;
      const kmSinceFuel = Math.max(0, totals.totalKm - odoAtFuel);
      const remainingAutonomyKm = Math.max(0, totalAutonomyKm - kmSinceFuel);
      const fuelPercentage = totalAutonomyKm > 0 ? Math.min(100, Math.max(0, Math.round((remainingAutonomyKm / totalAutonomyKm) * 100))) : 0;

      return {
        hasLoggedFuel: true,
        latestFuel,
        liters: Math.round(liters * 10) / 10,
        amountPaid,
        pricePerL,
        totalAutonomyKm,
        kmSinceFuel: Math.round(kmSinceFuel * 10) / 10,
        remainingAutonomyKm,
        fuelPercentage,
        fuelDate: latestFuel.date,
      };
    }

    const tankLiters = Number(dbState.fuelConfig.tankCapacityLiters) || 16.1;
    const defaultAutonomy = Math.round(tankLiters * kmPerLiter);
    return {
      hasLoggedFuel: false,
      latestFuel: null,
      liters: tankLiters,
      amountPaid: tankLiters * (Number(dbState.fuelConfig.fuelPrice) || 5.8),
      pricePerL: Number(dbState.fuelConfig.fuelPrice) || 5.8,
      totalAutonomyKm: defaultAutonomy,
      kmSinceFuel: 0,
      remainingAutonomyKm: defaultAutonomy,
      fuelPercentage: 100,
      fuelDate: null,
    };
  }, [dbState.expenses, dbState.fuelConfig, totals.totalKm]);

  // ================= 30-DAY REAL NET PROFIT EVOLUTION (RECHARTS AREA CHART) =================
  const realProfitEvolution30Days = useMemo(() => {
    const list: {
      date: string;
      fullDateLabel: string;
      label: string;
      lucroReal: number;
      faturamento: number;
      gastosDiretos: number;
      deducoesTotais: number;
      km: number;
      isActive: boolean;
    }[] = [];

    const fuelCostPerKm = financialIntelligence.fuelCostPerKm;
    const baseMaintCostPerKm = financialIntelligence.baseMaintCostPerKm;
    const extraBufferPct = financialIntelligence.extraBufferPct;
    const dailyFoodCost = financialIntelligence.dailyFoodCost;
    const dailyDocsReserve = financialIntelligence.dailyDocsReserve;
    const emergencyPct = financialIntelligence.emergencyPct;

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const [yyyy, mm, dd] = iso.split('-');

      const dayEntries = dbState.entries.filter(e => !e.isCancelled && e.date === iso);
      const dayExpenses = dbState.expenses.filter(e => !e.isCancelled && e.date === iso);

      const rev = dayEntries.reduce((s, e) => s + (Number(e.revenue) || 0), 0);
      const km = dayEntries.reduce((s, e) => s + (Number(e.km) || 0), 0);
      const directExp = dayExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

      const hasActivity = rev > 0 || km > 0 || directExp > 0;

      let lucroReal = 0;
      let deducoesTotais = 0;

      if (hasActivity) {
        const effectiveKm = km > 0 ? km : (rev > 0 ? Math.max(10, Math.round(rev / 1.65)) : 0);
        const fuel = effectiveKm * fuelCostPerKm;
        const maint = (effectiveKm * baseMaintCostPerKm) + (rev * (extraBufferPct / 100));
        const food = rev > 0 ? dailyFoodCost : 0;
        const docs = rev > 0 ? dailyDocsReserve : 0;
        const emergency = rev * (emergencyPct / 100);

        deducoesTotais = directExp + fuel + maint + food + docs + emergency;
        lucroReal = rev - deducoesTotais;
      }

      list.push({
        date: iso,
        fullDateLabel: `${dd}/${mm}/${yyyy}`,
        label: `${dd}/${mm}`,
        lucroReal: Math.round(lucroReal * 100) / 100,
        faturamento: Math.round(rev * 100) / 100,
        gastosDiretos: Math.round(directExp * 100) / 100,
        deducoesTotais: Math.round(deducoesTotais * 100) / 100,
        km: Math.round(km * 10) / 10,
        isActive: hasActivity,
      });
    }

    const total30DaysProfit = list.reduce((s, d) => s + d.lucroReal, 0);
    const total30DaysRev = list.reduce((s, d) => s + d.faturamento, 0);
    const activeDays = list.filter(d => d.isActive);
    const activeDaysCount = activeDays.length;
    const avgDailyProfit = activeDaysCount > 0 ? total30DaysProfit / activeDaysCount : 0;
    const positiveDaysCount = list.filter(d => d.lucroReal > 0).length;

    const profitableDays = list.filter(d => d.lucroReal > 0);
    const bestDay = profitableDays.length > 0
      ? [...profitableDays].sort((a, b) => b.lucroReal - a.lucroReal)[0]
      : null;

    return {
      data: list,
      total30DaysProfit: Math.round(total30DaysProfit * 100) / 100,
      total30DaysRev: Math.round(total30DaysRev * 100) / 100,
      avgDailyProfit: Math.round(avgDailyProfit * 100) / 100,
      activeDaysCount,
      positiveDaysCount,
      bestDay,
    };
  }, [dbState.entries, dbState.expenses, financialIntelligence]);

  // ================= REVENUE SEASONALITY ANALYTICS (DYNAMIC DATE FILTER + RECHARTS BAR CHART) =================
  const sixMonthSeasonality = useMemo(() => {
    const monthShortNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthFullNames = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];

    const now = new Date();
    const targetMonths: { year: number; month: number }[] = [];

    if (seasonalityFilter === '3m') {
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        targetMonths.push({ year: d.getFullYear(), month: d.getMonth() });
      }
    } else if (seasonalityFilter === '6m') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        targetMonths.push({ year: d.getFullYear(), month: d.getMonth() });
      }
    } else if (seasonalityFilter === '12m') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        targetMonths.push({ year: d.getFullYear(), month: d.getMonth() });
      }
    } else if (seasonalityFilter === 'ytd') {
      const curYear = now.getFullYear();
      const curMonth = now.getMonth();
      for (let m = 0; m <= curMonth; m++) {
        targetMonths.push({ year: curYear, month: m });
      }
    } else if (seasonalityFilter === 'custom') {
      const startParts = (seasonalityCustomStart || '').split('-').map(Number);
      const endParts = (seasonalityCustomEnd || '').split('-').map(Number);
      if (
        startParts.length === 2 &&
        endParts.length === 2 &&
        !isNaN(startParts[0]) &&
        !isNaN(startParts[1]) &&
        !isNaN(endParts[0]) &&
        !isNaN(endParts[1])
      ) {
        let cur = new Date(startParts[0], startParts[1] - 1, 1);
        const end = new Date(endParts[0], endParts[1] - 1, 1);
        let guard = 0;
        while (cur <= end && guard < 36) {
          targetMonths.push({ year: cur.getFullYear(), month: cur.getMonth() });
          cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
          guard++;
        }
      }
      if (targetMonths.length === 0) {
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          targetMonths.push({ year: d.getFullYear(), month: d.getMonth() });
        }
      }
    }

    const monthsData = targetMonths.map(tm => {
      const yyyy = tm.year;
      const mmIndex = tm.month;
      const mmStr = String(mmIndex + 1).padStart(2, '0');
      const yearMonth = `${yyyy}-${mmStr}`;
      const shortYear = String(yyyy).slice(-2);

      const monthEntries = dbState.entries.filter(e => !e.isCancelled && (e.date || '').startsWith(yearMonth));
      const monthExpenses = dbState.expenses.filter(ex => !ex.isCancelled && (ex.date || '').startsWith(yearMonth));

      const rev = monthEntries.reduce((acc, e) => acc + (Number(e.revenue) || 0), 0);
      const exp = monthExpenses.reduce((acc, ex) => acc + (Number(ex.amount) || 0), 0);
      const km = monthEntries.reduce((acc, e) => acc + (Number(e.km) || 0), 0);

      const isCurrent = yyyy === now.getFullYear() && mmIndex === now.getMonth();

      return {
        yearMonth,
        label: `${monthShortNames[mmIndex]}/${shortYear}`,
        fullLabel: `${monthFullNames[mmIndex]} de ${yyyy}`,
        faturamento: Math.round(rev * 100) / 100,
        gastos: Math.round(exp * 100) / 100,
        lucro: Math.round((rev - exp) * 100) / 100,
        km: Math.round(km * 10) / 10,
        corridas: monthEntries.length,
        isPeak: false,
        isCurrent,
      };
    });

    const total6MonthsRev = monthsData.reduce((s, m) => s + m.faturamento, 0);
    const activeMonths = monthsData.filter(m => m.faturamento > 0);
    const avgMonthlyRev =
      activeMonths.length > 0
        ? total6MonthsRev / activeMonths.length
        : monthsData.length > 0
        ? total6MonthsRev / monthsData.length
        : 0;

    let peakMonth: (typeof monthsData)[0] | null = null;
    let lowActiveMonth: (typeof monthsData)[0] | null = null;

    if (activeMonths.length > 0) {
      peakMonth = [...activeMonths].sort((a, b) => b.faturamento - a.faturamento)[0];
      lowActiveMonth = [...activeMonths].sort((a, b) => a.faturamento - b.faturamento)[0];
    }

    const enrichedMonths = monthsData.map(m => ({
      ...m,
      isPeak: Boolean(peakMonth && m.faturamento > 0 && m.yearMonth === peakMonth.yearMonth),
    }));

    const currentMonthObj = enrichedMonths[enrichedMonths.length - 1];
    const prevMonthObj = enrichedMonths[enrichedMonths.length - 2];
    const momGrowthPct =
      prevMonthObj && prevMonthObj.faturamento > 0
        ? Math.round(((currentMonthObj.faturamento - prevMonthObj.faturamento) / prevMonthObj.faturamento) * 100)
        : null;

    let filterLabel = 'Últimos 6 Meses';
    if (seasonalityFilter === '3m') filterLabel = 'Últimos 3 Meses';
    else if (seasonalityFilter === '6m') filterLabel = 'Últimos 6 Meses';
    else if (seasonalityFilter === '12m') filterLabel = 'Últimos 12 Meses (1 Ano)';
    else if (seasonalityFilter === 'ytd') filterLabel = `Ano Atual (${now.getFullYear()})`;
    else if (seasonalityFilter === 'custom') filterLabel = 'Período Personalizado';

    let seasonalitySummary =
      'Registre seus ganhos ao longo dos meses para identificar os períodos de alta demanda e planejar reservas para meses mais fracos.';
    if (peakMonth && activeMonths.length >= 2 && lowActiveMonth) {
      const diffPct =
        lowActiveMonth.faturamento > 0
          ? Math.round(((peakMonth.faturamento - lowActiveMonth.faturamento) / lowActiveMonth.faturamento) * 100)
          : 0;
      seasonalitySummary = `Pico sazonal em ${peakMonth.fullLabel} (${fmtMoney(
        peakMonth.faturamento
      )}), enquanto ${lowActiveMonth.fullLabel} teve ${fmtMoney(
        lowActiveMonth.faturamento
      )} (${diffPct > 0 ? `+${diffPct}% no pico` : 'estável'}). Aproveite os meses de alta para reforçar sua reserva de emergência.`;
    } else if (peakMonth && activeMonths.length === 1) {
      seasonalitySummary = `Mês ativo identificado: ${peakMonth.fullLabel} com ${fmtMoney(
        peakMonth.faturamento
      )} acumulados. Continue lançando suas corridas para comparar a evolução sazonal mês a mês.`;
    }

    return {
      months: enrichedMonths,
      total6MonthsRev,
      avgMonthlyRev,
      peakMonth,
      lowActiveMonth,
      activeMonthsCount: activeMonths.length,
      momGrowthPct,
      filterLabel,
      seasonalitySummary,
    };
  }, [dbState.entries, dbState.expenses, seasonalityFilter, seasonalityCustomStart, seasonalityCustomEnd]);

  const [aiFinancialAdvice, setAiFinancialAdvice] = useState<string>('');
  const [isAiFinancialLoading, setIsAiFinancialLoading] = useState<boolean>(false);
  const [aiFinancialPrompt, setAiFinancialPrompt] = useState<string>('');

  const handleAskFinancialAI = useCallback(
    async (customPrompt?: string) => {
      const promptToUse = (customPrompt ?? aiFinancialPrompt).trim();
      setIsAiFinancialLoading(true);
      const answer = await askFinancialAdvisorAI(promptToUse, {
        bikeModel: dbState.fuelConfig.bikeModelName,
        kmPerLiter: financialIntelligence.kmPerLiter,
        fuelPrice: financialIntelligence.fuelPrice,
        workDaysPerMonth: financialIntelligence.workDaysPerMonth,
        dailyGross: financialIntelligence.dailyGross,
        monthlyGross: financialIntelligence.monthlyGross,
        dailyKm: financialIntelligence.dailyKm,
        dailyFuelCost: financialIntelligence.dailyFuelCost,
        dailyMaintReserve: financialIntelligence.dailyMaintReserve,
        maintCostPerKm: financialIntelligence.baseMaintCostPerKm,
        dailyLunch: financialIntelligence.dailyLunch,
        dailySnack: financialIntelligence.dailySnack,
        dailyFoodCost: financialIntelligence.dailyFoodCost,
        ipvaAnnual: financialIntelligence.ipvaAnnual,
        licensingAnnual: financialIntelligence.licensingAnnual,
        insuranceMonthly: financialIntelligence.insuranceMonthly,
        dailyDocsReserve: financialIntelligence.dailyDocsReserve,
        dailyHouseholdReserve: financialIntelligence.dailyHouseholdReserve,
        monthlyHouseholdCost: financialIntelligence.monthlyHouseholdCost,
        dailyBikeCostsTotal: financialIntelligence.dailyBikeCostsTotal,
        breakEvenDaily: financialIntelligence.breakEvenDaily,
        emergencyPct: financialIntelligence.emergencyPct,
        dailyEmergencyReserve: financialIntelligence.dailyEmergencyReserve,
        dailyNetProfit: financialIntelligence.dailyNetProfit,
        monthlyNetProfit: financialIntelligence.monthlyNetProfit,
        netMarginPct: financialIntelligence.netMarginPct,
      });
      setAiFinancialAdvice(answer);
      setIsAiFinancialLoading(false);
    },
    [aiFinancialPrompt, dbState.fuelConfig.bikeModelName, financialIntelligence]
  );

  // Auto-generate initial AI financial diagnosis when opening Financeiro tab if empty
  useEffect(() => {
    if (activeTab === 'billing' && !aiFinancialAdvice && !isAiFinancialLoading) {
      handleAskFinancialAI('Faça um diagnóstico completo das minhas reservas diárias, gastos com almoço/lanche, documentação (IPVA e Licenciamento) e meu lucro líquido real.');
    }
  }, [activeTab, aiFinancialAdvice, isAiFinancialLoading, handleAskFinancialAI]);

  // ================= DEDICATED LOGIN & CADASTRO SCREEN =================
  if (showAuthScreen || !currentUser) {
    return (
      <div
        className={`min-h-screen transition-colors duration-200 ${bgCanvas} flex flex-col justify-between p-4 sm:p-6 lg:p-10`}
        style={{
          paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Top Minimal Brand + Theme Switcher */}
        <header className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-transparent border border-[#FF6A1A]/50 text-[#FF6A1A] font-black flex items-center justify-center text-lg">
              🎒
            </div>
            <div>
              <span className="text-base sm:text-lg font-black tracking-tight block leading-none">
                Mochilinha
              </span>
              <span className={`text-[11px] font-semibold ${mutedText}`}>
                Gestão Financeira & Manutenção para Motoboys
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDark(prev => !prev)}
              aria-label="Alternar tema claro ou escuro"
              className={`p-2.5 rounded-xl cursor-pointer transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center bg-transparent border ${dividerBorder}`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </header>

        {/* Main Responsive Split Container (Desktop 2-Column | Mobile 1-Column Minimalist) */}
        <main className="w-full max-w-6xl mx-auto my-6 sm:my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          {/* Left Hero / Value Proposition (Visible on Desktop, compact header on Mobile) */}
          <div className="lg:col-span-6 flex flex-col gap-4 sm:gap-6">
            <div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                Controle seus ganhos, turnos e a saúde da sua moto.
              </h1>
            </div>

            <div className={`hidden sm:grid grid-cols-3 gap-4 pt-4 border-t ${dividerBorder}`}>
              <div className={`rounded-xl p-3.5 bg-transparent border ${dividerBorder}`}>
                <div className="text-lg font-black text-[#FF6A1A] tabular-nums dashboard-number-anim">100%</div>
                <div className={`text-xs font-semibold mt-1 ${mutedText}`}>Funciona Offline no Room DB</div>
              </div>
              <div className={`rounded-xl p-3.5 bg-transparent border ${dividerBorder}`}>
                <div className={`text-lg font-black tabular-nums dashboard-number-anim ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>R$/KM</div>
                <div className={`text-xs font-semibold mt-1 ${mutedText}`}>Lucro Real por Turno e App</div>
              </div>
              <div className={`rounded-xl p-3.5 bg-transparent border ${dividerBorder}`}>
                <div className={`text-lg font-black tabular-nums dashboard-number-anim ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Alertas</div>
                <div className={`text-xs font-semibold mt-1 ${mutedText}`}>Aviso Preventivo de Manutenção</div>
              </div>
            </div>
          </div>

          {/* Right Column: Login, Cadastro & Redefinir Senha Section */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto lg:max-w-none">
            <div className={`rounded-2xl p-5 sm:p-8 bg-transparent border ${dividerBorder}`}>
              {/* 2-Tab Segmented Switcher (Entrar | Criar Conta) */}
              {authMode !== 'recover' && (
                <div className={`grid grid-cols-2 gap-2 pb-5 mb-6 border-b ${dividerBorder}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError(null);
                      setAuthSuccess(null);
                      setAuthPassword('');
                      setAuthConfirmPassword('');
                    }}
                    className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black cursor-pointer transition-all flex items-center justify-center gap-2 min-h-[44px] bg-transparent border ${
                      authMode === 'login'
                        ? 'border-[#FF6A1A] text-[#FF6A1A]'
                        : `${dividerBorder} ${mutedText} hover:text-current`
                    }`}
                  >
                    <LogIn className="w-4 h-4 shrink-0" />
                    <span>Entrar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setAuthError(null);
                      setAuthSuccess(null);
                      setAuthName('');
                      setAuthEmail('');
                      setAuthPhone('');
                      setAuthBikeModel('');
                      setAuthPassword('');
                      setAuthConfirmPassword('');
                    }}
                    className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black cursor-pointer transition-all flex items-center justify-center gap-2 min-h-[44px] bg-transparent border ${
                      authMode === 'register'
                        ? 'border-[#FF6A1A] text-[#FF6A1A]'
                        : `${dividerBorder} ${mutedText} hover:text-current`
                    }`}
                  >
                    <UserPlus className="w-4 h-4 shrink-0" />
                    <span>Criar Conta</span>
                  </button>
                </div>
              )}

              {/* Contextual Header for Redefinir Senha Mode */}
              {authMode === 'recover' && (
                <div className={`mb-5 p-3.5 rounded-2xl bg-transparent border ${
                  isDark ? 'border-[#FF6A1A]/40' : 'border-orange-300'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-black text-[#FF6A1A] flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4" />
                      Redefinição de Senha Sincronizada
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer bg-transparent border ${dividerBorder}`}
                    >
                      Voltar ao Login
                    </button>
                  </div>
                  <p className={`text-[11px] mt-1 leading-relaxed ${mutedText}`}>
                    Informe o e-mail da sua conta e escolha uma nova senha. Ela será atualizada no dispositivo e na nuvem imediatamente.
                  </p>
                </div>
              )}

              {/* Saved Accounts Quick Login ("Lembrar meus dados" active accounts) */}
              {authMode === 'login' && savedAccounts.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-extrabold uppercase tracking-wider text-[#FF6A1A]`}>
                      Acesso Rápido (Dados Lembrados)
                    </span>
                    <span className={`text-[10px] font-semibold ${mutedText}`}>
                      1 toque para entrar
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {savedAccounts.map(acc => (
                      <div
                        key={acc.email}
                        className={`rounded-xl p-2.5 flex items-center justify-between gap-2 bg-transparent border transition-colors ${
                          isDark
                            ? 'border-neutral-800 hover:border-[#FF6A1A]/50'
                            : 'border-slate-200 hover:border-[#FF6A1A]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleQuickSavedLogin(acc)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-xl bg-transparent border border-[#FF6A1A]/40 text-[#FF6A1A] font-black text-xs flex items-center justify-center shrink-0">
                            {(acc.name || acc.email).slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black truncate">
                              {acc.name || acc.email.split('@')[0]}
                            </div>
                            <div className={`text-[11px] truncate ${mutedText}`}>
                              {acc.email}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-transparent border border-[#FF6A1A]/50 text-[#FF6A1A] text-[11px] font-black shrink-0">
                            Entrar
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            removeSavedLoginAccount(acc.email);
                            setSavedAccounts(getSavedLoginAccounts());
                          }}
                          title="Esquecer esta conta salva"
                          className={`p-2 rounded-lg cursor-pointer hover:text-rose-400 ${mutedText}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback Banners */}
              {authError && (
                <div className={`mb-4 p-3.5 rounded-2xl bg-transparent border text-xs font-bold flex flex-col gap-2 ${
                  isDark
                    ? 'border-rose-500/40 text-rose-300'
                    : 'border-rose-300 text-rose-800'
                }`}>
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                    <span>{authError}</span>
                  </div>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('recover');
                        setAuthError(null);
                        setAuthSuccess(null);
                        setAuthPassword('');
                        setAuthConfirmPassword('');
                      }}
                      className={`self-start px-3 py-1.5 rounded-xl text-[11px] font-black cursor-pointer flex items-center gap-1.5 bg-transparent border ${
                        isDark ? 'border-rose-500/40 text-rose-300 hover:bg-rose-500/10' : 'border-rose-300 text-rose-800 hover:bg-rose-50'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Redefinir Senha Agora</span>
                    </button>
                  )}
                </div>
              )}

              {authSuccess && (
                <div className={`mb-4 p-3.5 rounded-2xl bg-transparent border text-xs font-bold flex items-start gap-2.5 ${
                  isDark
                    ? 'border-emerald-500/40 text-emerald-300'
                    : 'border-emerald-300 text-emerald-800'
                }`}>
                  <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span>{authSuccess}</span>
                </div>
              )}

              <form onSubmit={e => handleAuthSubmit(e, true)} className="flex flex-col gap-4">
                {authMode === 'register' && (
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${mutedText}`}>
                      Seu Nome ou Apelido
                    </label>
                    <div className="relative">
                      <User className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
                      <input
                        type="text"
                        required
                        value={authName}
                        onChange={e => setAuthName(e.target.value)}
                        placeholder="Ex: Carlos Motoboy"
                        className={`w-full pl-10 pr-3.5 py-3 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${mutedText}`}>
                    E-mail da Conta
                  </label>
                  <div className="relative">
                    <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      value={authEmail}
                      onChange={e => setAuthEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className={`w-full pl-10 pr-3.5 py-3 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                    />
                  </div>
                </div>

                {authMode === 'register' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${mutedText}`}>
                          WhatsApp / Celular (Opcional)
                        </label>
                        <div className="relative">
                          <Phone className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
                          <input
                            type="tel"
                            value={authPhone}
                            onChange={e => setAuthPhone(e.target.value)}
                            placeholder="(11) 99999-9999"
                            className={`w-full pl-10 pr-3.5 py-3 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${mutedText}`}>
                          Modelo da Sua Moto
                        </label>
                        <input
                          type="text"
                          value={authBikeModel}
                          onChange={e => setAuthBikeModel(e.target.value)}
                          placeholder="Ex: Honda CG 160 Titan"
                          className={`w-full px-3.5 py-3 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                        />
                      </div>
                    </div>

                    {/* Quick Bike Model Selector Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Honda CG 160 Titan',
                        'Honda CG 160 Fan',
                        'Yamaha Factor 150',
                        'Mottu Sport 110i',
                        'Honda Bros 160',
                      ].map(model => (
                        <button
                          key={model}
                          type="button"
                          onClick={() => setAuthBikeModel(model)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors bg-transparent border ${
                            authBikeModel === model
                              ? 'border-[#FF6A1A] text-[#FF6A1A]'
                              : `${dividerBorder} ${mutedText} hover:border-[#FF6A1A]`
                          }`}
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`text-xs font-bold ${mutedText}`}>
                      {authMode === 'recover' ? 'Nova Senha (mín. 4 caracteres)' : 'Senha'}
                    </label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('recover');
                          setAuthError(null);
                          setAuthSuccess(null);
                          setAuthPassword('');
                          setAuthConfirmPassword('');
                        }}
                        className="text-xs font-black text-[#FF6A1A] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Redefinir Senha</span>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={authPassword}
                      onChange={e => setAuthPassword(e.target.value)}
                      placeholder="Mínimo de 4 caracteres"
                      className={`w-full pl-10 pr-11 py-3 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg cursor-pointer ${mutedText}`}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {(authMode === 'register' || authMode === 'recover') && (
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${mutedText}`}>
                      Confirmar {authMode === 'recover' ? 'Nova Senha' : 'Senha'}
                    </label>
                    <div className="relative">
                      <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={authConfirmPassword}
                        onChange={e => setAuthConfirmPassword(e.target.value)}
                        placeholder="Repita a senha"
                        className={`w-full pl-10 pr-3.5 py-3 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                      />
                    </div>
                  </div>
                )}

                {/* MODO "LEMBRAR MEUS DADOS" */}
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !rememberMe;
                    setRememberMe(nextVal);
                    if (!nextVal) {
                      saveRememberedCredentials(null);
                    }
                  }}
                  className={`w-full p-3 rounded-xl bg-transparent border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    rememberMe
                      ? 'border-[#FF6A1A]/50'
                      : dividerBorder
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors bg-transparent border ${
                        rememberMe
                          ? 'border-[#FF6A1A] text-[#FF6A1A]'
                          : dividerBorder
                      }`}
                    >
                      {rememberMe && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black">Lembrar meus dados</div>
                      <div className={`text-[11px] truncate ${mutedText}`}>
                        Facilitar o próximo acesso mantendo e-mail e senha salvos
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 bg-transparent border ${
                      rememberMe
                        ? 'border-[#FF6A1A]/50 text-[#FF6A1A]'
                        : `${dividerBorder} ${mutedText}`
                    }`}
                  >
                    {rememberMe ? 'Ativo' : 'Off'}
                  </span>
                </button>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="mt-1 w-full py-3.5 px-5 rounded-xl bg-transparent border border-[#FF6A1A] text-[#FF6A1A] font-black text-sm hover:bg-[#FF6A1A]/10 transition-colors cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <span>
                    {isAuthLoading
                      ? 'Autenticando...'
                      : authMode === 'login'
                      ? 'Entrar'
                      : authMode === 'register'
                      ? 'Criar Conta de Piloto'
                      : 'Redefinir Senha e Entrar Agora'}
                  </span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            </div>
          </div>
        </main>

        <footer className={`w-full max-w-6xl mx-auto text-center text-xs ${mutedText} py-2`}>
          Mochilinha · Seus dados permanecem salvos no banco local e sincronizados na nuvem com segurança.
        </footer>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${bgCanvas}`}
      style={{
        paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* TOP BAR CONTRACT: 3 ZONES (Brand | Nav Links | Primary Action) */}
      <header
        className={`sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-8 px-3 sm:px-6 lg:px-8 border-b backdrop-blur-md ${
          isDark ? 'bg-black/95 border-neutral-800/80' : 'bg-white/95 border-slate-200'
        }`}
        style={{
          paddingTop: 'calc(0.625rem + env(safe-area-inset-top, 0px))',
          paddingBottom: '0.625rem',
        }}
      >
        <a
          href="#painel"
          onClick={e => {
            e.preventDefault();
            setActiveTab('dashboard');
          }}
          className="text-base sm:text-lg font-black tracking-tight whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <span>🎒</span>
          <span>Mochilinha</span>
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
          {[
            { id: 'dashboard', label: 'Painel' },
            { id: 'maintenance', label: 'Moto' },
            { id: 'billing', label: 'Financeiro' },
            { id: 'investments', label: 'Investimentos' },
            { id: 'history', label: 'Histórico' },
            { id: 'progress', label: 'Progresso' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavTab)}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 border-b-2 ${
                activeTab === item.id
                  ? 'border-[#FF6A1A] text-[#FF6A1A]'
                  : `border-transparent ${mutedText} hover:text-[#FF6A1A]`
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative">
          {/* Botão de Acesso Rápido ao Modal de Extrato MEI na Barra Superior */}
          <button
            type="button"
            onClick={() => setShowRelatorioMeiModal(true)}
            aria-label="Extrato MEI"
            title="Emitir Extrato MEI (Relatório Mensal)"
            className={`p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center gap-1.5 bg-transparent border border-transparent ${
              isDark
                ? 'text-purple-400 hover:text-purple-300 hover:bg-white/5'
                : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
            }`}
          >
            <Printer className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
            <span className={`hidden lg:inline ${isDark ? 'text-purple-300' : 'text-purple-800 font-bold'}`}>Extrato MEI</span>
          </button>

          {/* Botão de Acesso Rápido ao Modal de Meta Reversa na Barra Superior */}
          <button
            type="button"
            onClick={() => setShowMetaReversaModal(true)}
            aria-label="Meta Reversa"
            title="Simulador de Meta Reversa (Custos Fixos & Metas)"
            className={`p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center gap-1.5 bg-transparent border border-transparent ${
              isDark
                ? 'text-[#FF6A1A] hover:text-[#ff7b33] hover:bg-white/5'
                : 'text-[#ea580c] hover:text-[#c2410c] hover:bg-orange-50 font-bold'
            }`}
          >
            <Target className="w-4 h-4 text-[#FF6A1A] shrink-0" />
            <span className="hidden lg:inline">Meta Reversa</span>
          </button>

          {/* Menu Cockpit Hub (Radar de Lucro, Iniciar Turno, Extrato MEI, Meta Reversa) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCockpitMenu(prev => !prev)}
              aria-label="Menu Cockpit de Operações"
              title="Menu Cockpit: Radar de Lucro, Turno GPS, Extrato MEI, Meta Reversa"
              className={`p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center relative border ${
                activeShiftSession?.isActive
                  ? isDark
                    ? 'bg-transparent border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'
                    : 'bg-transparent border-emerald-500 text-emerald-700 hover:bg-emerald-50'
                  : showCockpitMenu
                  ? isDark
                    ? 'bg-transparent border-[#FF6A1A]/50 text-[#FF6A1A]'
                    : 'bg-transparent border-[#FF6A1A] text-[#ea580c]'
                  : isDark
                  ? 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                  : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-black/5'
              }`}
            >
              <Gauge className={`w-4 h-4 shrink-0 ${activeShiftSession?.isActive ? 'text-emerald-400 animate-pulse' : 'text-[#FF6A1A]'}`} />
              {activeShiftSession?.isActive && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </button>

            {/* Dropdown / Popover do Menu Cockpit */}
            {showCockpitMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowCockpitMenu(false)}
                />
                <div
                  className={`fixed left-3 right-3 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 md:w-96 max-w-full rounded-2xl p-4 shadow-2xl z-50 border ${
                    isDark
                      ? 'bg-black border-neutral-800 text-slate-100'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                  style={{
                    top: 'calc(3.75rem + env(safe-area-inset-top, 0px))',
                  }}
                >
                  <div className={`flex items-center justify-between gap-2 pb-3 border-b ${dividerBorder}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Gauge className="w-4 h-4 text-[#FF6A1A] shrink-0" />
                      <span className="text-xs font-black uppercase tracking-wider truncate">
                        Menu Cockpit do Piloto
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCockpitMenu(false)}
                      className={`p-1.5 rounded-lg shrink-0 bg-transparent border ${dividerBorder} cursor-pointer hover:text-current`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 mt-3">
                    {/* 1. Radar de Lucro */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCockpitMenu(false);
                        setShowRadarModal(true);
                      }}
                      className={`p-3 rounded-xl flex flex-col items-start gap-2 transition-all cursor-pointer text-left bg-transparent border ${
                        isDark
                          ? 'border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/5'
                          : 'border-amber-300 hover:bg-amber-50/50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-transparent border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black leading-tight">Radar de Lucro</div>
                        <div className={`text-[10px] mt-0.5 leading-tight ${mutedText}`}>
                          Aceito ou recuso a corrida?
                        </div>
                      </div>
                    </button>

                    {/* 2. Iniciar Turno / Turno GPS Ativo */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCockpitMenu(false);
                        setShowTurnoModal(true);
                      }}
                      className={`p-3 rounded-xl flex flex-col items-start gap-2 transition-all cursor-pointer text-left bg-transparent border ${
                        activeShiftSession?.isActive
                          ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
                          : isDark
                          ? 'border-sky-500/30 hover:border-sky-500/60 hover:bg-sky-500/5'
                          : 'border-sky-300 hover:bg-sky-50/50'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-transparent border ${
                          activeShiftSession?.isActive
                            ? 'border-emerald-500/40 text-emerald-400'
                            : 'border-sky-500/30 text-sky-400'
                        }`}
                      >
                        {activeShiftSession?.isActive ? (
                          <Navigation className="w-4 h-4 text-emerald-400 animate-pulse" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-sky-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-black leading-tight">
                          {activeShiftSession?.isActive ? 'Turno GPS Ativo' : 'Iniciar Turno'}
                        </div>
                        <div className={`text-[10px] mt-0.5 leading-tight ${mutedText}`}>
                          {activeShiftSession?.isActive
                            ? `+${(Number(activeShiftSession.gpsDistanceKm) || 0).toFixed(1)} km rodados`
                            : 'Odômetro GPS 2º plano'}
                        </div>
                      </div>
                    </button>

                    {/* 3. Extrato MEI */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCockpitMenu(false);
                        setShowRelatorioMeiModal(true);
                      }}
                      className={`p-3 rounded-xl flex flex-col items-start gap-2 transition-all cursor-pointer text-left bg-transparent border ${
                        isDark
                          ? 'border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5'
                          : 'border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-transparent border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                        <Printer className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black leading-tight">Extrato MEI</div>
                        <div className={`text-[10px] mt-0.5 leading-tight ${mutedText}`}>
                          Relatório em PDF
                        </div>
                      </div>
                    </button>

                    {/* 4. Meta Reversa */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCockpitMenu(false);
                        setShowMetaReversaModal(true);
                      }}
                      className={`p-3 rounded-xl flex flex-col items-start gap-2 transition-all cursor-pointer text-left bg-transparent border ${
                        isDark
                          ? 'border-[#FF6A1A]/30 hover:border-[#FF6A1A]/60 hover:bg-[#FF6A1A]/5'
                          : 'border-[#FF6A1A]/40 hover:bg-orange-50/50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-transparent border border-[#FF6A1A]/30 flex items-center justify-center text-[#FF6A1A] shrink-0">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black leading-tight">Meta Reversa</div>
                        <div className={`text-[10px] mt-0.5 leading-tight ${mutedText}`}>
                          Quanto faturar por dia?
                        </div>
                      </div>
                    </button>

                    {/* 5. Fundo de Investimentos Motoboy */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCockpitMenu(false);
                        setActiveTab('investments');
                      }}
                      className={`col-span-2 p-3 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer text-left bg-transparent border ${
                        isDark
                          ? 'border-emerald-500/40 hover:border-emerald-500/70 hover:bg-emerald-500/5'
                          : 'border-emerald-300 hover:bg-emerald-50/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-transparent border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className={`text-xs font-black leading-tight ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            Fundo de Investimentos (Comprar Cotas)
                          </div>
                          <div className={`text-[10px] mt-0.5 leading-tight ${mutedText}`}>
                            Rendimento diário · Saque após 3 dias · QR Code PIX
                          </div>
                        </div>
                      </div>
                      <ArrowRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Botão de Conta / Login Rápido */}
          <button
            type="button"
            onClick={() => {
              setAuthPassword('');
              setAuthConfirmPassword('');
              setShowAuthScreen(true);
            }}
            title={currentUser.isGuest ? 'Entrar ou Criar Conta' : `Conta: ${currentUser.name} (${currentUser.email})`}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[40px] flex items-center gap-1.5 bg-transparent border border-transparent ${
              isDark
                ? 'text-slate-300 hover:text-white hover:bg-white/5'
                : 'text-slate-700 hover:text-slate-900 hover:bg-black/5'
            }`}
          >
            <User className="w-3.5 h-3.5 text-[#FF6A1A] shrink-0" />
            <span className="hidden sm:inline max-w-[110px] truncate">
              {currentUser.isGuest ? 'Entrar / Conta' : currentUser.name.split(' ')[0]}
            </span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER (Responsive Mobile + Multi-Column Desktop) */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6">
        {/* ================= ABA 1: PAINEL (DASHBOARD) ================= */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-5 sm:gap-7">
            {/* BANNER MINIMALISTA DE TURNO ATIVO */}
            {activeShiftSession?.isActive && (
              <div className={`pb-4 border-b ${dividerBorder} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <span className="relative flex h-2.5 w-2.5 shrink-0 mt-1.5 sm:mt-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        Turno Ativo · Odômetro GPS Automático
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md bg-transparent border ${
                        isDark ? 'text-emerald-300 border-emerald-500/40' : 'text-emerald-800 border-emerald-500/50'
                      }`}>
                        +{(Number(activeShiftSession.gpsDistanceKm) || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        km no GPS
                      </span>
                      {(activeShiftSession.currentSpeedKmh || 0) > 0 && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md bg-transparent border ${
                          isDark ? 'text-sky-300 border-sky-500/40' : 'text-sky-800 border-sky-500/50'
                        }`}>
                          {activeShiftSession.currentSpeedKmh} km/h
                        </span>
                      )}
                    </div>
                    <div className={`text-xs sm:text-sm font-bold mt-1 flex items-center gap-2 flex-wrap ${primaryText}`}>
                      <span>
                        Início: <strong>{activeShiftSession.startKm.toLocaleString('pt-BR')} km</strong>
                      </span>
                      <span className={mutedText}>·</span>
                      <span>
                        Ganhos no turno:{' '}
                        <strong className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-black`}>
                          <AnimatedNumber
                            value={Math.max(0, totals.totalRevenue - (activeShiftSession.startRevenue || 0))}
                            formatter={fmtMoney}
                          />
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {gpsPermissionStatus !== 'granted' && (
                    <button
                      type="button"
                      onClick={() => setShowGpsPermissionModal(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-transparent border border-[#FF6A1A]/50 text-[#FF6A1A] hover:border-[#FF6A1A] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Permitir GPS 2º Plano</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowTurnoModal(true)}
                    className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold bg-transparent border transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      isDark
                        ? 'border-emerald-500/50 text-emerald-400 hover:border-emerald-400'
                        : 'border-emerald-600/60 text-emerald-700 hover:border-emerald-700'
                    }`}
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Ver / Encerrar</span>
                  </button>
                </div>
              </div>
            )}

            {/* HERO DO TOPO (MINIMALISTA SEM CARDS PESADOS): ODÔMETRO TOTAL + SALDO ATUAL DO MOTOBOY */}
            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch pb-6 border-b ${dividerBorder}`}>
              {/* 1. ODÔMETRO TOTAL NO TOPO */}
              <div className={`lg:col-span-7 flex flex-col justify-between pb-6 lg:pb-0 border-b lg:border-b-0 lg:border-r lg:pr-8 ${dividerBorder}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className={`text-[11px] sm:text-xs font-bold tracking-wider uppercase ${mutedText}`}>
                    Odômetro Total · {dbState.fuelConfig.bikeModelName}
                  </div>
                  {activeShiftSession?.isActive && activeShiftSession.gpsEnabled !== false && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-transparent text-emerald-500 dark:text-emerald-400 border border-emerald-500/40">
                      <Navigation className="w-3 h-3 animate-pulse" />
                      <span>
                        GPS em Tempo Real (+
                        {(Number(activeShiftSession.gpsDistanceKm) || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        km)
                      </span>
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-2 sm:gap-3 flex-wrap">
                  <AnimatedNumber
                    value={totals.totalKm}
                    formatter={v =>
                      v.toLocaleString('pt-BR', {
                        minimumFractionDigits: activeShiftSession?.isActive && totals.liveShiftGpsKm > 0 ? 1 : 0,
                        maximumFractionDigits: 1,
                      })
                    }
                    className={`text-4xl sm:text-6xl md:text-7xl font-black tracking-tight ${primaryText}`}
                  />
                  <span className="text-xs sm:text-sm font-extrabold text-[#FF6A1A] uppercase tracking-wider">
                    KM Rodados
                  </span>
                </div>
                <div className={`mt-1.5 sm:mt-2 text-xs sm:text-sm font-semibold ${mutedText}`}>
                  Nível: <span className="text-[#FF6A1A] font-extrabold">{level.name}</span> · Próxima meta aos{' '}
                  {level.end.toLocaleString('pt-BR')} km
                </div>

                {/* Road Progress Bar Animada */}
                <div className="mt-5 sm:mt-6 pt-1 relative">
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-slate-200/80'}`}>
                    <div
                      className="h-full bg-gradient-to-r from-[#FF7B31] to-[#FF5000] rounded-full dashboard-progress-fill"
                      style={{ width: `${level.pct}%` }}
                    />
                  </div>
                  <div className={`flex justify-between text-[11px] sm:text-xs font-bold mt-2 tabular-nums ${mutedText}`}>
                    <span>{level.start.toLocaleString('pt-BR')} km</span>
                    <span className="text-[#FF6A1A]">
                      <AnimatedNumber value={Math.round(level.pct)} formatter={v => `${Math.round(v)}% do nível`} />
                    </span>
                    <span className="text-[#FF6A1A]">{level.end.toLocaleString('pt-BR')} km</span>
                  </div>
                </div>

                {/* RAIO-X OPERACIONAL DO ODÔMETRO: CUSTO REAL POR KM, AUTONOMIA & MARGEM LIMPA */}
                <div className={`mt-5 sm:mt-6 pt-5 border-t ${dividerBorder}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <Gauge className="w-4 h-4 text-[#FF6A1A] shrink-0" />
                      <div>
                        <h3 className={`text-xs sm:text-sm font-black tracking-tight ${primaryText}`}>
                          Custo Operacional & Autonomia da Moto
                        </h3>
                        <p className={`text-[10px] sm:text-[11px] font-medium ${mutedText}`}>
                          Telemetria em tempo real baseada nos abastecimentos
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-stretch sm:self-auto">
                      {/* Botão de Abastecer (Sem fundo, borda fina e suave) */}
                      <button
                        type="button"
                        onClick={openNewFuelModal}
                        title="Registrar novo abastecimento com preço pago e litros"
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-transparent border border-[#FF6A1A]/50 hover:border-[#FF6A1A] text-[#FF6A1A] flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
                      >
                        <Fuel className="w-3.5 h-3.5 stroke-[2.2]" />
                        <span>+ Abastecer</span>
                      </button>

                      {/* Botão de Ver Detalhes do KM (Sem fundo, borda fina e suave) */}
                      <button
                        type="button"
                        onClick={() => setShowOdometerCostDetails(prev => !prev)}
                        className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold bg-transparent border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          showOdometerCostDetails
                            ? 'border-[#FF6A1A] text-[#FF6A1A]'
                            : isDark
                            ? 'border-slate-800 hover:border-slate-600 text-slate-200'
                            : 'border-slate-300 hover:border-slate-400 text-slate-800'
                        }`}
                      >
                        <span>{showOdometerCostDetails ? 'Ocultar Detalhes' : 'Ver Detalhes do KM'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showOdometerCostDetails ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
                    {/* 1. Custo Real por KM (Sem fundo, borda fina e suave) */}
                    <div className={`rounded-xl p-2.5 sm:p-3.5 min-w-0 bg-transparent border ${dividerBorder}`}>
                      <div className={`text-[10px] sm:text-xs font-semibold truncate ${mutedText}`}>Custo Real / KM</div>
                      <div className="text-xs sm:text-lg lg:text-xl font-black mt-1 tabular-nums text-amber-500 dark:text-amber-400 truncate">
                        <AnimatedNumber
                          value={financialIntelligence.fuelCostPerKm + financialIntelligence.baseMaintCostPerKm}
                          formatter={v =>
                            `R$ ${v.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          }
                        />
                      </div>
                      <div className={`text-[9px] sm:text-[11px] mt-0.5 truncate ${mutedText}`}>
                        Gasolina + Peças
                      </div>
                    </div>

                    {/* 2. Autonomia Baseada no Abastecimento Real (Sem fundo, borda fina e suave) */}
                    <div className={`rounded-xl p-2.5 sm:p-3.5 min-w-0 bg-transparent border ${
                      fuelTelemetry.hasLoggedFuel && fuelTelemetry.remainingAutonomyKm <= 35
                        ? 'border-rose-500/40'
                        : fuelTelemetry.hasLoggedFuel && fuelTelemetry.remainingAutonomyKm <= 70
                        ? 'border-amber-500/40'
                        : dividerBorder
                    }`}>
                      <div className="flex items-center justify-between gap-1">
                        <div className={`text-[10px] sm:text-xs font-semibold truncate ${
                          fuelTelemetry.hasLoggedFuel && fuelTelemetry.remainingAutonomyKm <= 35 ? 'text-rose-500 dark:text-rose-400 font-bold' : mutedText
                        }`}>
                          {fuelTelemetry.hasLoggedFuel ? 'Autonomia Restante' : 'Autonomia Tanque'}
                        </div>
                        {fuelTelemetry.hasLoggedFuel && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded bg-transparent border ${
                            fuelTelemetry.remainingAutonomyKm <= 35
                              ? 'border-rose-500/40 text-rose-500 dark:text-rose-400 animate-pulse'
                              : 'border-sky-500/30 text-sky-600 dark:text-sky-400'
                          }`}>
                            {fuelTelemetry.remainingAutonomyKm <= 35 ? 'Reserva' : `${fuelTelemetry.fuelPercentage}%`}
                          </span>
                        )}
                      </div>
                      <div className={`text-xs sm:text-lg lg:text-xl font-black mt-1 tabular-nums truncate ${
                        fuelTelemetry.hasLoggedFuel && fuelTelemetry.remainingAutonomyKm <= 35
                          ? 'text-rose-500 dark:text-rose-400'
                          : fuelTelemetry.hasLoggedFuel && fuelTelemetry.remainingAutonomyKm <= 70
                          ? 'text-amber-500 dark:text-amber-400'
                          : 'text-sky-600 dark:text-sky-400'
                      }`}>
                        <AnimatedNumber
                          value={fuelTelemetry.remainingAutonomyKm}
                          formatter={v => Math.round(v).toLocaleString('pt-BR')}
                        />{' '}
                        <span className="text-[10px] sm:text-xs font-bold">km</span>
                      </div>
                      <div className={`text-[9px] sm:text-[11px] mt-0.5 truncate ${mutedText}`}>
                        {fuelTelemetry.hasLoggedFuel
                          ? `${fuelTelemetry.liters}L abastecidos (${fuelTelemetry.kmSinceFuel} km rodados)`
                          : `Tanque padrão ${fuelTelemetry.liters}L`}
                      </div>
                    </div>

                    {/* 3. Margem Limpa por KM (Sem fundo, borda fina e suave) */}
                    {(() => {
                      const totalCostKm = financialIntelligence.fuelCostPerKm + financialIntelligence.baseMaintCostPerKm;
                      const grossKm = totals.ridesKm > 0 ? totals.totalRevenue / totals.ridesKm : (progressAnalytics.grossPerKm > 0 ? progressAnalytics.grossPerKm : 0);
                      const netKm = grossKm > 0 ? Math.max(0, grossKm - totalCostKm) : 0;
                      return (
                        <div className={`rounded-xl p-2.5 sm:p-3.5 min-w-0 bg-transparent border ${dividerBorder}`}>
                          <div className={`text-[10px] sm:text-xs font-semibold truncate ${netKm > 0 ? 'text-emerald-600 dark:text-emerald-400' : mutedText}`}>
                            Lucro Limpo / KM
                          </div>
                          <div className={`text-xs sm:text-lg lg:text-xl font-black mt-1 tabular-nums truncate ${
                            netKm > 0 ? 'text-emerald-600 dark:text-emerald-400' : mutedText
                          }`}>
                            {netKm > 0 ? (
                              <AnimatedNumber
                                value={netKm}
                                formatter={v =>
                                  `+ R$ ${v.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`
                                }
                              />
                            ) : (
                              '—'
                            )}
                          </div>
                          <div className={`text-[9px] sm:text-[11px] mt-0.5 truncate ${mutedText}`}>
                            {netKm > 0 ? 'Livre no bolso' : 'Sem corridas'}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Detalhamento Expansível do Custo Operacional e Telemetria de Combustível (Minimalista sem fundo) */}
                  {showOdometerCostDetails && (
                    <div className={`mt-4 pt-4 border-t ${dividerBorder} text-xs space-y-3`}>
                      <div className={`flex items-center justify-between font-bold pb-2 border-b ${dividerBorder} flex-wrap gap-2`}>
                        <span className={`flex items-center gap-2 text-xs sm:text-sm font-black ${primaryText}`}>
                          <Fuel className="w-4 h-4 text-[#FF6A1A]" />
                          <span>Telemetria do Combustível & Custo ({dbState.fuelConfig.bikeModelName})</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={openNewFuelModal}
                            className="text-xs font-black text-[#FF6A1A] hover:underline cursor-pointer flex items-center gap-1 bg-transparent"
                          >
                            + Abastecer Agora
                          </button>
                          <span className={mutedText}>·</span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('maintenance');
                              startEditFuelCard();
                            }}
                            className={`text-xs font-bold ${secondaryText} hover:text-[#FF6A1A] hover:underline cursor-pointer bg-transparent`}
                          >
                            Configurar Moto →
                          </button>
                        </div>
                      </div>

                      {/* Grid de estatísticas minimalista (sem fundo, apenas borda fina e suave) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                        <div className={`p-2.5 sm:p-3 rounded-xl bg-transparent border ${dividerBorder}`}>
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                            Consumo Médio
                          </div>
                          <div className={`text-xs sm:text-sm font-black mt-1 tabular-nums ${primaryText}`}>
                            {financialIntelligence.kmPerLiter} km/L
                          </div>
                        </div>

                        <div className={`p-2.5 sm:p-3 rounded-xl bg-transparent border ${dividerBorder}`}>
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                            Preço Gasolina
                          </div>
                          <div className={`text-xs sm:text-sm font-black mt-1 tabular-nums ${primaryText}`}>
                            {fmtCurrencyExact(fuelTelemetry.pricePerL)}/L
                          </div>
                        </div>

                        <div className={`p-2.5 sm:p-3 rounded-xl bg-transparent border ${dividerBorder}`}>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Combustível / KM
                          </div>
                          <div className="text-xs sm:text-sm font-black mt-1 text-amber-600 dark:text-amber-400 tabular-nums">
                            {fmtCurrencyExact(financialIntelligence.fuelCostPerKm)}/km
                          </div>
                        </div>

                        <div className={`p-2.5 sm:p-3 rounded-xl bg-transparent border ${dividerBorder}`}>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Desgaste Peças / KM
                          </div>
                          <div className="text-xs sm:text-sm font-black mt-1 text-amber-600 dark:text-amber-400 tabular-nums">
                            {fmtCurrencyExact(financialIntelligence.baseMaintCostPerKm)}/km
                          </div>
                        </div>

                        <div className={`p-2.5 sm:p-3 rounded-xl bg-transparent border ${dividerBorder}`}>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                            Último Abastecimento
                          </div>
                          <div className="text-xs sm:text-sm font-black mt-1 text-sky-600 dark:text-sky-400 tabular-nums truncate">
                            {fuelTelemetry.fuelDate
                              ? `${fuelTelemetry.fuelDate.split('-').reverse().join('/')} (${fuelTelemetry.liters}L)`
                              : `Padrão (${fuelTelemetry.liters}L)`}
                          </div>
                        </div>

                        <div className={`p-2.5 sm:p-3 rounded-xl bg-transparent border ${dividerBorder}`}>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                            Valor Pago
                          </div>
                          <div className="text-xs sm:text-sm font-black mt-1 text-sky-600 dark:text-sky-400 tabular-nums">
                            {fmtMoney(fuelTelemetry.amountPaid)}
                          </div>
                        </div>

                        <div className={`p-2.5 sm:p-3 rounded-xl bg-transparent border ${dividerBorder}`}>
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                            KM Rodados no Tanque
                          </div>
                          <div className={`text-xs sm:text-sm font-black mt-1 tabular-nums ${primaryText}`}>
                            {fuelTelemetry.kmSinceFuel} km
                          </div>
                        </div>

                        <div className={`p-2.5 sm:p-3 rounded-xl bg-transparent border ${
                          fuelTelemetry.remainingAutonomyKm <= 35
                            ? 'border-rose-500/40'
                            : 'border-emerald-500/40'
                        }`}>
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${
                            fuelTelemetry.remainingAutonomyKm <= 35 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            Autonomia Restante
                          </div>
                          <div className={`text-xs sm:text-sm font-black mt-1 tabular-nums ${
                            fuelTelemetry.remainingAutonomyKm <= 35 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {fuelTelemetry.remainingAutonomyKm} km ({fuelTelemetry.fuelPercentage}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. SALDO ATUAL DO MOTOBOY (MINIMALISTA SEM CARD DE FUNDO) */}
              {(() => {
                const isMonthScope = dashboardSaldoScope === 'month';
                const isCustomScope = dashboardSaldoScope === 'custom';

                let curGross = 0;
                let curExpenses = 0;

                if (isMonthScope) {
                  curGross = periodTotals.revMonth;
                  curExpenses = periodTotals.expMonth;
                } else if (isCustomScope) {
                  const start = dashboardCustomStartDate || '1970-01-01';
                  const end = dashboardCustomEndDate || '2099-12-31';
                  dbState.entries.forEach(e => {
                    if (e.date && e.date >= start && e.date <= end) {
                      curGross += Number(e.revenue || 0);
                    }
                  });
                  dbState.expenses.forEach(ex => {
                    if (ex.date && ex.date >= start && ex.date <= end) {
                      curExpenses += Number(ex.amount || 0);
                    }
                  });
                } else {
                  curGross = totals.totalRevenue;
                  curExpenses = totals.totalExpense;
                }

                const curBalance = curGross - curExpenses;
                const isPositive = curBalance >= 0;
                const monthlyObligations = financialIntelligence.totalMonthlyCostsAndReserves || 0;
                const reserveProgress = monthlyObligations > 0 ? Math.min(100, Math.max(0, Math.round((curBalance / monthlyObligations) * 100))) : (curBalance > 0 ? 100 : 0);

                const periodSubtitle = isMonthScope
                  ? `Livre em ${periodTotals.currentMonthName}`
                  : isCustomScope
                  ? `Período: ${formatPtBrDate(dashboardCustomStartDate)} até ${formatPtBrDate(dashboardCustomEndDate)}`
                  : 'Livre acumulado total';

                const periodSaldoLabel = isMonthScope
                  ? `Saldo Líquido · ${periodTotals.currentMonthName}`
                  : isCustomScope
                  ? `Saldo Líquido · Período Personalizado`
                  : 'Saldo Líquido Total';

                const entriesScopeLabel = isMonthScope
                  ? 'Corridas do mês'
                  : isCustomScope
                  ? 'Corridas no período'
                  : 'Todas as corridas';

                return (
                  <div className="lg:col-span-5 flex flex-col justify-between">
                    <div>
                      {/* Header do Saldo com Toggle de Período (Minimalista) */}
                      <div className={`flex items-center justify-between gap-2 flex-wrap pb-3 mb-3 border-b ${dividerBorder}`}>
                        <div className="flex items-center gap-2">
                          <Wallet className={`w-5 h-5 shrink-0 ${
                            isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                          }`} />
                          <div>
                            <span className={`text-xs sm:text-sm font-black tracking-tight flex items-center gap-1.5 ${primaryText}`}>
                              <span>Saldo Atual do Motoboy</span>
                            </span>
                            <p className={`text-[10px] font-semibold ${mutedText}`}>
                              {periodSubtitle}
                            </p>
                          </div>
                        </div>

                        {/* Toggle Este Mês / Geral / Personalizado (Sem fundo nos botões) */}
                        <div className={`flex items-center p-0.5 rounded-xl bg-transparent border ${dividerBorder} text-[11px] font-bold`}>
                          <button
                            type="button"
                            onClick={() => setDashboardSaldoScope('month')}
                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer bg-transparent border ${
                              isMonthScope
                                ? 'border-[#FF6A1A] text-[#FF6A1A] font-black'
                                : `border-transparent ${mutedText} hover:${primaryText}`
                            }`}
                          >
                            Este Mês
                          </button>
                          <button
                            type="button"
                            onClick={() => setDashboardSaldoScope('all')}
                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer bg-transparent border ${
                              dashboardSaldoScope === 'all'
                                ? 'border-[#FF6A1A] text-[#FF6A1A] font-black'
                                : `border-transparent ${mutedText} hover:${primaryText}`
                            }`}
                          >
                            Geral
                          </button>
                          <button
                            type="button"
                            onClick={() => setDashboardSaldoScope('custom')}
                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 bg-transparent border ${
                              isCustomScope
                                ? 'border-[#FF6A1A] text-[#FF6A1A] font-black'
                                : `border-transparent ${mutedText} hover:${primaryText}`
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Personalizado</span>
                          </button>
                        </div>
                      </div>

                      {/* Seletor de Datas quando Personalizado está ativo */}
                      {isCustomScope && (
                        <div className={`mb-3.5 pb-3 border-b ${dividerBorder} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs`}>
                          <span className="text-[10px] font-bold text-[#FF6A1A] uppercase tracking-wider flex items-center gap-1 shrink-0">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Filtrar Período:</span>
                          </span>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="flex items-center gap-1 flex-1 sm:flex-initial">
                              <span className={`text-[10px] font-bold ${mutedText}`}>De:</span>
                              <input
                                type="date"
                                value={dashboardCustomStartDate}
                                onChange={e => setDashboardCustomStartDate(e.target.value)}
                                className={`w-full sm:w-auto px-2 py-1 rounded-lg text-xs font-bold outline-none bg-transparent border ${dividerBorder} ${primaryText}`}
                              />
                            </div>
                            <div className="flex items-center gap-1 flex-1 sm:flex-initial">
                              <span className={`text-[10px] font-bold ${mutedText}`}>Até:</span>
                              <input
                                type="date"
                                value={dashboardCustomEndDate}
                                onChange={e => setDashboardCustomEndDate(e.target.value)}
                                className={`w-full sm:w-auto px-2 py-1 rounded-lg text-xs font-bold outline-none bg-transparent border ${dividerBorder} ${primaryText}`}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Saldo Principal em Destaque */}
                      <div className="mt-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${mutedText}`}>
                            {periodSaldoLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenAdjustBalance(curBalance)}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-transparent text-[#FF6A1A] border border-[#FF6A1A]/40 hover:border-[#FF6A1A] transition-colors cursor-pointer flex items-center gap-1 active:scale-95"
                            title="Ajustar Saldo Atual e Gerar Transação Automática"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Ajustar Saldo</span>
                          </button>
                        </div>

                        <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                          <AnimatedNumber
                            value={curBalance}
                            formatter={fmtMoney}
                            className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight ${
                              isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Entradas x Saídas (Sem fundo, apenas borda fina e suave) */}
                      <div className="grid grid-cols-2 gap-2.5 mt-4">
                        <div className={`p-2.5 sm:p-3 rounded-xl bg-transparent border ${dividerBorder} min-w-0`}>
                          <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <span>+ FATURAMENTO</span>
                            <span>↗</span>
                          </div>
                          <div className="text-sm sm:text-base font-black mt-0.5 text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
                            <AnimatedNumber value={curGross} formatter={fmtMoney} />
                          </div>
                          <div className={`text-[9px] mt-0.5 truncate ${mutedText}`}>
                            {entriesScopeLabel}
                          </div>
                        </div>

                        <div className={`p-2.5 sm:p-3 rounded-xl bg-transparent border ${dividerBorder} min-w-0`}>
                          <div className="flex items-center justify-between text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            <span>- GASTOS TOTAIS</span>
                            <span>↘</span>
                          </div>
                          <div className="text-sm sm:text-base font-black mt-0.5 text-rose-600 dark:text-rose-400 tabular-nums truncate">
                            <AnimatedNumber value={curExpenses} formatter={fmtMoney} />
                          </div>
                          <div className={`text-[9px] mt-0.5 truncate ${mutedText}`}>
                            Moto + Despesas Casa
                          </div>
                        </div>
                      </div>

                      {/* ========================================================================= */}
                      {/* VENCIMENTO DE HOJE & IMPACTO NO SALDO ATUAL DO MOTOBOY                    */}
                      {/* REGRA: SÓ DEVE APARECER QUANDO HOUVER VENCIMENTO NO DIA, CASO CONTRÁRIO OCULTO */}
                      {/* ========================================================================= */}
                      {(() => {
                        const today = todayStr();
                        const curDay = new Date().getDate();
                        const curMonthStr = today.slice(0, 7);

                        const rawHouseList: HouseholdExpenseItem[] = Array.isArray(dbState.householdExpenses)
                          ? dbState.householdExpenses
                          : DEFAULT_HOUSEHOLD_EXPENSES;
                        const activeHouse = rawHouseList.filter(h => h.isActive !== false);

                        const isHousePaidThisMonth = (h: HouseholdExpenseItem) => {
                          const inExpenses = dbState.expenses.some(e => {
                            if (!e.date || !e.date.startsWith(curMonthStr) || e.isCancelled) return false;
                            return (
                              e.householdExpenseId === h.id ||
                              (e.description && e.description.toLowerCase().includes(h.name.toLowerCase())) ||
                              (e.category && e.category.toLowerCase() === h.name.toLowerCase())
                            );
                          });
                          if (inExpenses) return true;
                          if (h.lastPaidDate && h.lastPaidDate.startsWith(curMonthStr)) return true;
                          return false;
                        };

                        const houseDueToday = activeHouse.filter(h => {
                          const due = getExpenseDueInfo(h);
                          const day = Number(h.dueDay) || 10;
                          return due.status === 'today' || day === curDay;
                        });
                        const pendingHouseDueToday = houseDueToday.filter(h => !isHousePaidThisMonth(h));

                        const rawBikeList: BikeExpenseItem[] = Array.isArray(dbState.bikeExpenses)
                          ? dbState.bikeExpenses
                          : DEFAULT_BIKE_EXPENSES;
                        const activeBike = rawBikeList.filter(b => b.isActive !== false);

                        const isBikePaidThisMonth = (b: BikeExpenseItem) => {
                          const inExpenses = dbState.expenses.some(e => {
                            if (!e.date || !e.date.startsWith(curMonthStr) || e.isCancelled) return false;
                            return (
                              e.bikeExpenseId === b.id ||
                              (e.description && e.description.toLowerCase().includes(b.name.toLowerCase())) ||
                              (e.category && e.category.toLowerCase() === b.name.toLowerCase())
                            );
                          });
                          if (inExpenses) return true;
                          if (b.lastPaidDate && b.lastPaidDate.startsWith(curMonthStr)) return true;
                          return false;
                        };

                        const bikeDueToday = activeBike.filter(b => {
                          const due = getExpenseDueInfo(b);
                          const day = Number(b.dueDay) || 10;
                          return due.status === 'today' || (b.recurrenceType === 'monthly' && day === curDay);
                        });
                        const pendingBikeDueToday = bikeDueToday.filter(b => !isBikePaidThisMonth(b));

                        const allPendingDueToday = [
                          ...pendingHouseDueToday.map(h => ({
                            id: h.id,
                            name: h.name,
                            amount: Number(h.monthlyAmount) || Number(h.totalCost) || 0,
                            icon: h.icon || '🏠',
                            type: 'casa' as const,
                            raw: h,
                          })),
                          ...pendingBikeDueToday.map(b => ({
                            id: b.id,
                            name: b.name,
                            amount: Number(b.monthlyAmount) || Number(b.totalCost) || 0,
                            icon: b.icon || '🏍️',
                            type: 'moto' as const,
                            raw: b,
                          })),
                        ];

                        if (allPendingDueToday.length === 0) {
                          return null;
                        }

                        const totalAmountDueToday = allPendingDueToday.reduce(
                          (sum, item) => sum + item.amount,
                          0
                        );

                        const isBalanceSufficient = curBalance >= totalAmountDueToday && totalAmountDueToday > 0;
                        const sobraSaldo = curBalance - totalAmountDueToday;
                        const faltaCompletar = Math.max(0, totalAmountDueToday - Math.max(0, curBalance));
                        const coveragePct = totalAmountDueToday > 0
                          ? Math.min(100, Math.max(0, Math.round((Math.max(0, curBalance) / totalAmountDueToday) * 100)))
                          : 0;

                        const firstPending = allPendingDueToday[0];

                        return (
                          <div className={`mt-4 pt-4 border-t ${dividerBorder} space-y-3`}>
                            {/* Header do Bloco */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                {firstPending?.type === 'moto' ? (
                                  <Zap className={`w-4 h-4 shrink-0 ${isBalanceSufficient ? 'text-emerald-500' : 'text-rose-500 animate-pulse'}`} />
                                ) : (
                                  <Home className={`w-4 h-4 shrink-0 ${isBalanceSufficient ? 'text-emerald-500' : 'text-rose-500 animate-pulse'}`} />
                                )}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-xs sm:text-sm font-black tracking-tight ${primaryText}`}>
                                    Vencimento de Hoje (Dia {curDay})
                                  </span>
                                  {isBalanceSufficient ? (
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-transparent text-emerald-600 dark:text-emerald-400 border border-emerald-500/40">
                                      ✅ Saldo Suficiente
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-transparent text-rose-600 dark:text-rose-400 border border-rose-500/40 animate-pulse">
                                      🚨 Vence Hoje · Falta Completar
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('billing');
                                  if (firstPending?.type === 'moto') {
                                    setBillingSubTab('despesas_moto');
                                  } else {
                                    setBillingSubTab('despesas_casa');
                                  }
                                }}
                                className="text-[11px] font-black text-[#FF6A1A] hover:underline cursor-pointer flex items-center gap-1 bg-transparent"
                              >
                                <span>Ver no Financeiro</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Lista de Contas que Vencem Hoje */}
                            <div className="flex flex-wrap gap-2">
                              {allPendingDueToday.map(item => (
                                <div
                                  key={`${item.type}_${item.id}`}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-transparent border ${dividerBorder} ${primaryText}`}
                                >
                                  <span className="text-base">{item.icon}</span>
                                  <span className="font-black">{item.name}</span>
                                  <span className="text-xs font-black text-rose-500 dark:text-rose-400 tabular-nums">
                                    {item.amount > 0 ? fmtMoney(item.amount) : 'A definir'}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Comparativo Minimalista: Saldo Atual vs. Vencimento de Hoje vs. Sobra / Falta */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className={`p-2.5 rounded-xl bg-transparent border ${dividerBorder}`}>
                                <div className={`text-[10px] font-bold uppercase ${mutedText}`}>
                                  1. Saldo Atual
                                </div>
                                <div className={`text-xs sm:text-sm font-black tabular-nums mt-1 ${
                                  curBalance >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                }`}>
                                  {fmtMoney(curBalance)}
                                </div>
                              </div>

                              <div className={`p-2.5 rounded-xl bg-transparent border ${dividerBorder}`}>
                                <div className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">
                                  2. Vence Hoje
                                </div>
                                <div className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums mt-1">
                                  {totalAmountDueToday > 0 ? fmtMoney(totalAmountDueToday) : 'R$ 0,00'}
                                </div>
                              </div>

                              <div className={`p-2.5 rounded-xl bg-transparent border ${
                                isBalanceSufficient ? 'border-emerald-500/40' : 'border-rose-500/40'
                              }`}>
                                <div className={`text-[10px] font-bold uppercase tracking-wider ${
                                  isBalanceSufficient
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}>
                                  {isBalanceSufficient ? '3. Vai Ficar' : '3. Falta Pagar'}
                                </div>
                                <div className={`text-xs sm:text-sm font-black tabular-nums mt-1 ${
                                  isBalanceSufficient
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}>
                                  {isBalanceSufficient ? fmtMoney(sobraSaldo) : fmtMoney(faltaCompletar)}
                                </div>
                              </div>
                            </div>

                            {/* Barra de Progresso e Diagnóstico */}
                            {totalAmountDueToday > 0 ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                  <span className={secondaryText}>
                                    Cobertura da conta com o Saldo Atual:
                                  </span>
                                  <span className={`tabular-nums font-black ${isBalanceSufficient ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                    {coveragePct}% coberto
                                  </span>
                                </div>
                                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-slate-200/80'}`}>
                                  <div
                                    className={`h-full rounded-full dashboard-progress-fill ${
                                      isBalanceSufficient ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${coveragePct}%` }}
                                  />
                                </div>

                                <div className={`pt-1 flex items-start gap-2 text-xs leading-relaxed ${secondaryText}`}>
                                  {isBalanceSufficient ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                                  ) : (
                                    <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                                  )}
                                  <div>
                                    {isBalanceSufficient ? (
                                      <span>
                                        Seu saldo atual cobre integralmente a conta de hoje e ainda{' '}
                                        <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                                          vai ficar {fmtMoney(sobraSaldo)} limpo
                                        </strong>.
                                      </span>
                                    ) : (
                                      <span>
                                        Para quitar a conta do dia,{' '}
                                        <strong className="text-rose-600 dark:text-rose-400 font-black">
                                          falta completar {fmtMoney(faltaCompletar)}
                                        </strong>{' '}
                                        nas próximas corridas.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            {/* Botão de Lançar Pagamento da Conta de Hoje (Sem fundo) */}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (firstPending) {
                                    if (firstPending.type === 'casa') {
                                      setSelectedHouseholdExpenseId(firstPending.id);
                                      setBillingSubTab('despesas_casa');
                                    } else {
                                      setSelectedBikeExpenseId(firstPending.id);
                                      setBillingSubTab('despesas_moto');
                                    }
                                    setSelectedCategory(firstPending.name);
                                    if (firstPending.amount > 0) {
                                      setExpenseAmount(String(firstPending.amount));
                                    }
                                  }
                                  setActiveTab('billing');
                                }}
                                className="flex-1 py-2 px-4 rounded-xl bg-transparent border border-[#FF6A1A]/60 hover:border-[#FF6A1A] text-[#FF6A1A] text-xs font-black cursor-pointer flex items-center justify-center gap-2 transition-all"
                              >
                                <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Registrar Pagamento ({firstPending?.name || 'Conta'})</span>
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Barra de Cobertura das Obrigações do Mês (Sem card com fundo, separado por linha sutil) */}
                      <div className={`mt-4 pt-4 border-t ${dividerBorder}`}>
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1.5 flex-wrap gap-1">
                          <span className={`flex items-center gap-1.5 ${primaryText} font-black`}>
                            <Shield className="w-3.5 h-3.5 text-[#FF6A1A]" />
                            <span>Cobertura das Reservas do Mês</span>
                          </span>
                          <span className="text-[#FF6A1A] font-black tabular-nums">
                            <AnimatedNumber value={reserveProgress} formatter={v => `${Math.round(v)}% coberto`} />
                          </span>
                        </div>
                        <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-slate-200/80'}`}>
                          <div
                            className={`h-full rounded-full dashboard-progress-fill ${
                              reserveProgress >= 100
                                ? 'bg-emerald-500'
                                : reserveProgress >= 50
                                ? 'bg-[#FF6A1A]'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${reserveProgress}%` }}
                          />
                        </div>
                        <div className={`flex items-center justify-between text-[10px] font-bold mt-2 tabular-nums ${mutedText}`}>
                          <span>Saldo: {fmtMoney(Math.max(0, curBalance))}</span>
                          <button
                            type="button"
                            onClick={() => setShowReserveBreakdown(prev => !prev)}
                            className="text-[#FF6A1A] hover:underline cursor-pointer flex items-center gap-1 font-black bg-transparent"
                            title="Ver detalhes de como esta meta de reservas foi calculada"
                          >
                            <span>Meta Reservas: {fmtMoney(monthlyObligations)}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-transparent border border-[#FF6A1A]/40 text-[#FF6A1A]">
                              {showReserveBreakdown ? '▲ fechar' : '▼ de onde vem?'}
                            </span>
                          </button>
                        </div>

                        {/* Breakdown Explicativo das 3 Caixinhas de Blindagem */}
                        {showReserveBreakdown && (
                          <div className={`mt-2.5 pt-2.5 border-t ${dividerBorder} text-[10px] space-y-1.5 ${secondaryText}`}>
                            <div className="font-black text-[#FF6A1A] flex items-center justify-between">
                              <span>Composição da Meta de Blindagem do Mês:</span>
                              <span className={`text-[9px] font-normal ${mutedText}`}>3 Caixinhas</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                              <span className="flex items-center gap-1">
                                <span>🏍️</span>
                                <span>Moto & Operação:</span>
                              </span>
                              <span className="font-extrabold text-orange-500 dark:text-orange-400 tabular-nums">
                                {fmtCurrencyExact(financialIntelligence.monthlyBikeCostsTotal)}
                              </span>
                            </div>
                            <div className={`text-[9px] ${mutedText} pl-4 pb-0.5`}>
                              Peças ({fmtCurrencyExact(financialIntelligence.monthlyMaintReserve)}) + Gasolina ({fmtCurrencyExact(financialIntelligence.monthlyFuelCost)}) + IPVA/Docs ({fmtCurrencyExact(financialIntelligence.monthlyDocsReserve)}) + Marmita ({fmtCurrencyExact(financialIntelligence.monthlyFoodCost)})
                            </div>

                            <div className={`flex justify-between items-center py-0.5 border-t ${dividerBorder}`}>
                              <span className="flex items-center gap-1">
                                <span>🏠</span>
                                <span>Despesas da Casa & Família:</span>
                              </span>
                              <span className="font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                                {fmtCurrencyExact(financialIntelligence.monthlyHouseholdCost)}
                              </span>
                            </div>
                            <div className={`text-[9px] ${mutedText} pl-4 pb-0.5`}>
                              Aluguel, Luz, Água, Mercado, Internet e Gás
                            </div>

                            <div className={`flex justify-between items-center py-0.5 border-t ${dividerBorder}`}>
                              <span className="flex items-center gap-1">
                                <span>🛡️</span>
                                <span>Reserva de Emergência ({financialIntelligence.emergencyPct}%):</span>
                              </span>
                              <span className="font-extrabold text-purple-600 dark:text-purple-400 tabular-nums">
                                {fmtCurrencyExact(financialIntelligence.monthlyEmergencyReserve)}
                              </span>
                            </div>

                            <div className={`pt-1.5 border-t ${dividerBorder} flex justify-between items-center font-black text-xs text-[#FF6A1A]`}>
                              <span>= Meta Total para o Mês:</span>
                              <span className="tabular-nums">{fmtCurrencyExact(monthlyObligations)}</span>
                            </div>

                            <div className="pt-1 text-center">
                              <button
                                type="button"
                                onClick={() => setActiveTab('billing')}
                                className="text-[9px] text-[#FF6A1A] hover:underline font-bold cursor-pointer bg-transparent"
                              >
                                Personalizar contas na Central de Finanças ➔
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação Rápida (Sem fundo, borda fina e suave) */}
                    <div className={`flex items-center gap-2 mt-4 pt-3 border-t ${dividerBorder}`}>
                      <button
                        type="button"
                        onClick={() => openNewEntryModal('ganho', false)}
                        className="flex-1 py-2 sm:py-2.5 px-3 rounded-xl text-xs font-black bg-transparent text-[#FF6A1A] border border-[#FF6A1A]/60 hover:border-[#FF6A1A] transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>+ Corrida / Gasto</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('billing');
                          setBillingSubTab('ganhos');
                        }}
                        className={`py-2 sm:py-2.5 px-3 rounded-xl text-xs font-bold bg-transparent border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          isDark
                            ? 'border-slate-800 hover:border-slate-600 text-slate-200'
                            : 'border-slate-300 hover:border-slate-400 text-slate-800'
                        }`}
                      >
                        <span>Extrato</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* RESERVAS FINANCEIRAS OBRIGATÓRIAS (SEÇÃO MINIMALISTA SEM CARD DE FUNDO) */}
            <div className={`pb-6 border-b ${dividerBorder}`}>
              <div className={`flex flex-row items-center justify-between gap-2 pb-3 mb-4 border-b ${dividerBorder}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">🛡️</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className={`text-xs sm:text-sm font-black truncate ${primaryText}`}>
                        Reservas Financeiras Obrigatórias
                      </h2>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-transparent text-[#FF6A1A] border border-[#FF6A1A]/40">
                        Blindagem
                      </span>
                    </div>
                    <p className={`text-[10px] truncate ${mutedText}`}>
                      Valores diários para separar antes de gastar seu lucro
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('billing');
                    setBillingSubTab('planejamento');
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-transparent text-[#FF6A1A] border border-[#FF6A1A]/40 hover:border-[#FF6A1A] transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span className="hidden xs:inline">Ajustar</span>
                </button>
              </div>

              {/* Grid Compacto Lado a Lado das 6 Reservas Individuais (Sem fundo, apenas borda fina e suave) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
                {/* 1. Reserva Combustível */}
                <div
                  onClick={() => {
                    setActiveTab('billing');
                    setBillingSubTab('despesas_moto');
                  }}
                  className={`rounded-xl p-2.5 sm:p-3 bg-transparent border ${dividerBorder} hover:border-rose-500/50 transition-all cursor-pointer flex flex-col justify-between`}
                  title="Clique para ajustar o gasto com combustível"
                >
                  <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                    <span className="flex items-center gap-1 text-rose-500 dark:text-rose-400 font-black min-w-0">
                      <span className="shrink-0">⛽</span>
                      <span className="truncate">Combustível</span>
                    </span>
                    <span className="text-[9px] font-black px-1 py-0.2 rounded bg-transparent border border-rose-500/30 text-rose-500 dark:text-rose-400 shrink-0">
                      {financialIntelligence.fuelPctOfGross}%
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-rose-500 dark:text-rose-400 tabular-nums mt-1.5 leading-tight">
                    <AnimatedNumber value={financialIntelligence.dailyFuelCost} formatter={fmtCurrencyExact} />
                    <span className={`text-[10px] font-semibold ml-0.5 ${mutedText}`}>/dia</span>
                  </div>
                  <div className={`text-[10px] mt-0.5 font-semibold truncate ${mutedText}`}>
                    {fmtCurrencyExact(financialIntelligence.monthlyFuelCost)}/mês
                  </div>
                </div>

                {/* 2. Reserva Manutenção da Moto */}
                <div
                  onClick={() => {
                    setActiveTab('billing');
                    setBillingSubTab('despesas_moto');
                  }}
                  className={`rounded-xl p-2.5 sm:p-3 bg-transparent border ${dividerBorder} hover:border-amber-500/50 transition-all cursor-pointer flex flex-col justify-between`}
                  title="Clique para ver as peças e manutenções da moto"
                >
                  <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                    <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-black min-w-0">
                      <span className="shrink-0">🛠️</span>
                      <span className="truncate">Manutenção</span>
                    </span>
                    <span className="text-[9px] font-black px-1 py-0.2 rounded bg-transparent border border-amber-500/30 text-amber-500 dark:text-amber-400 shrink-0">
                      {financialIntelligence.maintPctOfGross}%
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-amber-500 dark:text-amber-400 tabular-nums mt-1.5 leading-tight">
                    <AnimatedNumber value={financialIntelligence.dailyMaintReserve} formatter={fmtCurrencyExact} />
                    <span className={`text-[10px] font-semibold ml-0.5 ${mutedText}`}>/dia</span>
                  </div>
                  <div className={`text-[10px] mt-0.5 font-semibold truncate ${mutedText}`}>
                    {fmtCurrencyExact(financialIntelligence.monthlyMaintReserve)}/mês
                  </div>
                </div>

                {/* 3. Reserva Documentos & Seguro da Moto */}
                <div
                  onClick={() => {
                    setActiveTab('billing');
                    setBillingSubTab('despesas_moto');
                  }}
                  className={`rounded-xl p-2.5 sm:p-3 bg-transparent border ${dividerBorder} hover:border-sky-500/50 transition-all cursor-pointer flex flex-col justify-between`}
                  title="Clique para ver IPVA, licenciamento e seguro"
                >
                  <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                    <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-black min-w-0">
                      <span className="shrink-0">📄</span>
                      <span className="truncate">Docs & IPVA</span>
                    </span>
                    <span className="text-[9px] font-black px-1 py-0.2 rounded bg-transparent border border-sky-500/30 text-sky-600 dark:text-sky-400 shrink-0">
                      {financialIntelligence.docsPctOfGross}%
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-sky-600 dark:text-sky-400 tabular-nums mt-1.5 leading-tight">
                    <AnimatedNumber value={financialIntelligence.dailyDocsReserve} formatter={fmtCurrencyExact} />
                    <span className={`text-[10px] font-semibold ml-0.5 ${mutedText}`}>/dia</span>
                  </div>
                  <div className={`text-[10px] mt-0.5 font-semibold truncate ${mutedText}`}>
                    {fmtCurrencyExact(financialIntelligence.monthlyDocsReserve)}/mês
                  </div>
                </div>

                {/* 4. Reserva Alimentação na Rua */}
                <div
                  onClick={() => {
                    setActiveTab('billing');
                    setBillingSubTab('planejamento');
                  }}
                  className={`rounded-xl p-2.5 sm:p-3 bg-transparent border ${dividerBorder} hover:border-orange-500/50 transition-all cursor-pointer flex flex-col justify-between`}
                  title="Clique para ajustar o orçamento de alimentação na rua"
                >
                  <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                    <span className="flex items-center gap-1 text-orange-500 dark:text-orange-400 font-black min-w-0">
                      <span className="shrink-0">🍱</span>
                      <span className="truncate">Alimentação</span>
                    </span>
                    <span className="text-[9px] font-black px-1 py-0.2 rounded bg-transparent border border-orange-500/30 text-orange-500 dark:text-orange-400 shrink-0">
                      {financialIntelligence.foodPctOfGross}%
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-orange-500 dark:text-orange-400 tabular-nums mt-1.5 leading-tight">
                    <AnimatedNumber value={financialIntelligence.dailyFoodCost} formatter={fmtCurrencyExact} />
                    <span className={`text-[10px] font-semibold ml-0.5 ${mutedText}`}>/dia</span>
                  </div>
                  <div className={`text-[10px] mt-0.5 font-semibold truncate ${mutedText}`}>
                    {fmtCurrencyExact(financialIntelligence.monthlyFoodCost)}/mês
                  </div>
                </div>

                {/* 5. Reserva Despesas da Casa & Família */}
                <div
                  onClick={() => {
                    setActiveTab('billing');
                    setBillingSubTab('despesas_casa');
                  }}
                  className={`rounded-xl p-2.5 sm:p-3 bg-transparent border ${dividerBorder} hover:border-blue-500/50 transition-all cursor-pointer group flex flex-col justify-between`}
                  title="Clique para gerenciar suas contas de casa"
                >
                  <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-black min-w-0">
                      <span className="shrink-0">🏠</span>
                      <span className="truncate">Contas Casa</span>
                    </span>
                    <span className="text-[9px] font-black px-1 py-0.2 rounded bg-transparent border border-blue-500/30 text-blue-600 dark:text-blue-400 shrink-0">
                      {financialIntelligence.housePctOfGross}%
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 tabular-nums mt-1.5 leading-tight">
                    <AnimatedNumber value={financialIntelligence.dailyHouseholdReserve} formatter={fmtCurrencyExact} />
                    <span className={`text-[10px] font-semibold ml-0.5 ${mutedText}`}>/dia</span>
                  </div>
                  <div className={`text-[10px] mt-0.5 font-semibold truncate ${mutedText}`}>
                    {fmtCurrencyExact(financialIntelligence.monthlyHouseholdCost)}/mês ↗
                  </div>
                </div>

                {/* 6. Reserva de Emergência */}
                <div
                  onClick={() => {
                    setActiveTab('billing');
                    setBillingSubTab('planejamento');
                  }}
                  className={`rounded-xl p-2.5 sm:p-3 bg-transparent border ${dividerBorder} hover:border-purple-500/50 transition-all cursor-pointer flex flex-col justify-between`}
                  title="Clique para ajustar a reserva de emergência"
                >
                  <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                    <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-black min-w-0">
                      <span className="shrink-0">🛡️</span>
                      <span className="truncate">Emergência</span>
                    </span>
                    <span className="text-[9px] font-black px-1 py-0.2 rounded bg-transparent border border-purple-500/30 text-purple-600 dark:text-purple-400 shrink-0">
                      {financialIntelligence.emergencyPct}%
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-purple-600 dark:text-purple-400 tabular-nums mt-1.5 leading-tight">
                    <AnimatedNumber value={financialIntelligence.dailyEmergencyReserve} formatter={fmtCurrencyExact} />
                    <span className={`text-[10px] font-semibold ml-0.5 ${mutedText}`}>/dia</span>
                  </div>
                  <div className={`text-[10px] mt-0.5 font-semibold truncate ${mutedText}`}>
                    {fmtCurrencyExact(financialIntelligence.monthlyEmergencyReserve)}/mês
                  </div>
                </div>
              </div>

              {/* RESUMO DA DIVISÃO POR CAIXINHA (MINIMALISTA SEM FUNDO, APENAS LINHAS E BORDAS FINAS) */}
              <div className={`mt-5 pt-4 border-t ${dividerBorder}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">📊</span>
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-wide text-[#FF6A1A]">
                      Resumo da Divisão por Caixinha
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold ${mutedText}`}>
                    Cálculo para <strong className={`${primaryText} font-black`}>{financialIntelligence.workDaysPerMonth} dias úteis/mês</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Caixinha 1: Giro da Moto + Rua */}
                  <div
                    onClick={() => {
                      setActiveTab('billing');
                      setBillingSubTab('despesas_moto');
                    }}
                    className={`p-3 rounded-xl bg-transparent border ${dividerBorder} hover:border-rose-500/50 cursor-pointer transition-colors`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px] font-black text-rose-500 dark:text-rose-400">
                      <span className="truncate">🏍️ 1. Moto & Rua</span>
                      <span className="text-[9px] opacity-80">↗</span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-rose-500 dark:text-rose-400 tabular-nums mt-1">
                      <AnimatedNumber value={financialIntelligence.dailyBikeCostsTotal} formatter={fmtCurrencyExact} />
                      <span className={`text-[10px] font-semibold ml-0.5 ${mutedText}`}>/dia</span>
                    </div>
                    <div className={`text-[10px] font-bold tabular-nums mt-0.5 ${mutedText}`}>
                      {fmtCurrencyExact(financialIntelligence.monthlyBikeCostsTotal)}/mês
                    </div>
                    <div className={`text-[9px] mt-0.5 truncate ${mutedText}`}>
                      Gasolina + Manut. + Docs + Marmita
                    </div>
                  </div>

                  {/* Caixinha 2: Contas da Casa */}
                  <div
                    onClick={() => {
                      setActiveTab('billing');
                      setBillingSubTab('despesas_casa');
                    }}
                    className={`p-3 rounded-xl bg-transparent border ${dividerBorder} hover:border-blue-500/50 cursor-pointer transition-colors`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px] font-black text-blue-600 dark:text-blue-400">
                      <span className="truncate">🏠 2. Contas Casa</span>
                      <span className="text-[9px] opacity-80">↗</span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 tabular-nums mt-1">
                      <AnimatedNumber value={financialIntelligence.dailyHouseholdReserve} formatter={fmtCurrencyExact} />
                      <span className={`text-[10px] font-semibold ml-0.5 ${mutedText}`}>/dia</span>
                    </div>
                    <div className={`text-[10px] font-bold tabular-nums mt-0.5 ${mutedText}`}>
                      {fmtCurrencyExact(financialIntelligence.monthlyHouseholdCost)}/mês
                    </div>
                    <div className={`text-[9px] mt-0.5 truncate ${mutedText}`}>
                      Aluguel, luz, água e mercado
                    </div>
                  </div>

                  {/* Caixinha 3: Reserva de Emergência */}
                  <div
                    onClick={() => {
                      setActiveTab('billing');
                      setBillingSubTab('planejamento');
                    }}
                    className={`p-3 rounded-xl bg-transparent border ${dividerBorder} hover:border-purple-500/50 cursor-pointer transition-colors`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px] font-black text-purple-600 dark:text-purple-400">
                      <span className="truncate">🛡️ 3. Emergência</span>
                      <span className="text-[9px] opacity-80">{financialIntelligence.emergencyPct}%</span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-purple-600 dark:text-purple-400 tabular-nums mt-1">
                      <AnimatedNumber value={financialIntelligence.dailyEmergencyReserve} formatter={fmtCurrencyExact} />
                      <span className={`text-[10px] font-semibold ml-0.5 ${mutedText}`}>/dia</span>
                    </div>
                    <div className={`text-[10px] font-bold tabular-nums mt-0.5 ${mutedText}`}>
                      {fmtCurrencyExact(financialIntelligence.monthlyEmergencyReserve)}/mês
                    </div>
                    <div className={`text-[9px] mt-0.5 truncate ${mutedText}`}>
                      Fundo de imprevistos pessoal
                    </div>
                  </div>

                  {/* Caixinha 4: Total Diário a Separar (Soma das 3 Caixinhas) */}
                  <div className="p-3 rounded-xl bg-transparent border border-emerald-500/40">
                    <div className="flex items-center justify-between gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                      <span className="truncate">🔒 Total a Guardar</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-transparent border border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                        1+2+3
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                      <AnimatedNumber value={financialIntelligence.totalDailyCostsAndReserves} formatter={fmtCurrencyExact} />
                      <span className={`text-[10px] font-semibold ml-0.5 ${mutedText}`}>/dia</span>
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600/90 dark:text-emerald-400/90 tabular-nums mt-0.5">
                      {fmtCurrencyExact(financialIntelligence.totalMonthlyCostsAndReserves)}/mês
                    </div>
                    <div className={`text-[9px] mt-0.5 truncate ${mutedText}`}>
                      Meta p/ cobrir Moto + Casa + Emerg.
                    </div>
                  </div>
                </div>

                {/* Barra Inferior Explicativa: Piso Mínimo vs Saldo Livre */}
                <div className={`mt-3 pt-2.5 border-t ${dividerBorder} flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[10px]`}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`font-bold ${mutedText}`}>
                      🎯 Piso Mínimo (só Moto + Casa):
                    </span>
                    <strong className="text-amber-500 dark:text-amber-400 font-black tabular-nums">
                      {fmtCurrencyExact(financialIntelligence.breakEvenDaily)}/dia
                    </strong>
                    <span className={`${mutedText} hidden sm:inline`}>•</span>
                    <span className={mutedText}>
                      Sua base atual: <strong className={`tabular-nums ${primaryText} font-black`}>{fmtCurrencyExact(financialIntelligence.dailyGross)}/dia</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {financialIntelligence.dailyNetProfit >= 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-black tabular-nums">
                        💵 Sobra Livre: +{fmtCurrencyExact(financialIntelligence.dailyNetProfit)}/dia ({financialIntelligence.netMarginPct}%)
                      </span>
                    ) : (
                      <span className="text-amber-500 dark:text-amber-400 font-bold tabular-nums">
                        💡 Para cobrir tudo, fature <strong>{fmtCurrencyExact(financialIntelligence.totalDailyCostsAndReserves)}/dia</strong> (+{fmtCurrencyExact(Math.abs(financialIntelligence.dailyNetProfit))}/dia na base)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* GRID INFERIOR MINIMALISTA (SEM CARDS PRINCIPAIS PESADOS, SEPARADO POR LINHAS SUTIS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Coluna Esquerda: Metas, Produtividade & Gráfico dos Últimos 7 Dias */}
              <div className={`lg:col-span-7 flex flex-col gap-6 pb-6 lg:pb-0 border-b lg:border-b-0 lg:border-r lg:pr-8 ${dividerBorder}`}>
                {/* Ganhos por Período & Produtividade (Minimalista) */}
                <div className={`pb-6 border-b ${dividerBorder}`}>
                  <div className={`flex items-center justify-between gap-2 pb-3 mb-2 border-b ${dividerBorder}`}>
                    <h2 className={`text-sm sm:text-base font-extrabold ${primaryText}`}>Ganhos por Período & Produtividade</h2>
                    <button
                      onClick={() => setActiveTab('billing')}
                      className="text-xs font-bold text-[#FF6A1A] hover:underline cursor-pointer shrink-0 bg-transparent"
                    >
                      Ver completo
                    </button>
                  </div>

                  {/* 1. Meta Diária de Hoje (Minimalista sem fundo) */}
                  {(() => {
                    const dailyTarget = Math.max(0, Number(dbState.dailyGoal) || 0);
                    const dailyEarned = progressAnalytics.revToday;
                    const dailyRawPct = dailyTarget > 0 ? Math.round((dailyEarned / dailyTarget) * 100) : 0;
                    const dailyBarPct = Math.min(100, Math.max(0, dailyRawPct));
                    const dailyRemaining = Math.max(0, dailyTarget - dailyEarned);
                    const isDailyGoalReached = dailyTarget > 0 && dailyEarned >= dailyTarget;

                    return (
                      <div className={`py-3.5 border-b ${dividerBorder}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Target
                              className={`w-4 h-4 shrink-0 ${
                                isDailyGoalReached ? 'text-emerald-500 dark:text-emerald-400' : 'text-[#FF6A1A]'
                              }`}
                            />
                            <span className={`text-xs sm:text-sm font-extrabold ${primaryText}`}>Meta Diária de Hoje</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs sm:text-sm font-black tabular-nums ${
                                isDailyGoalReached ? 'text-emerald-500 dark:text-emerald-400' : 'text-[#FF6A1A]'
                              }`}
                            >
                              <AnimatedNumber value={dailyEarned} formatter={fmtMoney} /> / {fmtMoney(dailyTarget)} ({dailyRawPct}%)
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('settings')}
                              title="Ajustar Meta Diária nas Configurações"
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors bg-transparent border ${dividerBorder} ${secondaryText} hover:border-[#FF6A1A] hover:text-[#FF6A1A]`}
                            >
                              Ajustar
                            </button>
                          </div>
                        </div>

                        <div
                          className={`mt-2.5 h-2 rounded-full overflow-hidden ${
                            isDark ? 'bg-neutral-800' : 'bg-slate-200/80'
                          }`}
                        >
                          <div
                            className={`h-full rounded-full dashboard-progress-fill ${
                              isDailyGoalReached
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-[#FF7B31] to-[#FF5000]'
                            }`}
                            style={{ width: `${dailyBarPct}%` }}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px] sm:text-xs font-semibold tabular-nums">
                          <span className={isDailyGoalReached ? 'text-emerald-500 dark:text-emerald-400 font-bold' : mutedText}>
                            {isDailyGoalReached
                              ? `🎉 Meta diária batida! (+${fmtMoney(dailyEarned - dailyTarget)} acima da meta)`
                              : `Faltam ${fmtMoney(dailyRemaining)} para atingir o objetivo de hoje`}
                          </span>
                          <span className={isDailyGoalReached ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : mutedText}>
                            {dailyRawPct}% concluído
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. Meta de Faturamento Semanal (Minimalista sem fundo) */}
                  {(() => {
                    const weeklyTarget = Math.max(0, Number(dbState.weeklyGoal) || 0);
                    const weeklyEarned = periodTotals.revWeek;
                    const weeklyRawPct = weeklyTarget > 0 ? Math.round((weeklyEarned / weeklyTarget) * 100) : 0;
                    const weeklyBarPct = Math.min(100, Math.max(0, weeklyRawPct));
                    const weeklyRemaining = Math.max(0, weeklyTarget - weeklyEarned);
                    const isWeeklyGoalReached = weeklyTarget > 0 && weeklyEarned >= weeklyTarget;

                    return (
                      <div className={`py-3.5 border-b ${dividerBorder}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Trophy
                              className={`w-4 h-4 shrink-0 ${
                                isWeeklyGoalReached ? 'text-emerald-500 dark:text-emerald-400' : 'text-[#FF6A1A]'
                              }`}
                            />
                            <span className={`text-xs sm:text-sm font-extrabold ${primaryText}`}>
                              Meta de Faturamento Semanal
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs sm:text-sm font-black tabular-nums ${
                                isWeeklyGoalReached ? 'text-emerald-500 dark:text-emerald-400' : 'text-[#FF6A1A]'
                              }`}
                            >
                              <AnimatedNumber value={weeklyEarned} formatter={fmtMoney} /> / {fmtMoney(weeklyTarget)} ({weeklyRawPct}%)
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('settings')}
                              title="Ajustar Meta Semanal nas Configurações"
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors bg-transparent border ${dividerBorder} ${secondaryText} hover:border-[#FF6A1A] hover:text-[#FF6A1A]`}
                            >
                              Ajustar
                            </button>
                          </div>
                        </div>

                        <div
                          className={`mt-2.5 h-2 rounded-full overflow-hidden ${
                            isDark ? 'bg-neutral-800' : 'bg-slate-200/80'
                          }`}
                        >
                          <div
                            className={`h-full rounded-full dashboard-progress-fill ${
                              isWeeklyGoalReached
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-[#FF7B31] to-[#FF5000]'
                            }`}
                            style={{ width: `${weeklyBarPct}%` }}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px] sm:text-xs font-semibold tabular-nums">
                          <span className={mutedText}>
                            {isWeeklyGoalReached
                              ? `🎉 Meta semanal batida! (+${fmtMoney(weeklyEarned - weeklyTarget)} acima da meta)`
                              : `Faltam ${fmtMoney(weeklyRemaining)} para atingir a meta da semana`}
                          </span>
                          <span className={isWeeklyGoalReached ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : mutedText}>
                            {weeklyRawPct}% concluído
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3. Meta Personalizada de Ganhos (Minimalista sem fundo) */}
                  {(() => {
                    const customTarget = Math.max(0, Number(dbState.customGoalTarget) || 0);
                    const targetDate = dbState.customGoalTargetDate || getDefaultFutureDate(dbState.customGoalDays || 20);
                    const countdown = getCustomGoalCountdown('date', dbState.customGoalDays, targetDate);
                    const customDays = Math.max(1, countdown.effectiveDays);
                    const customTitle = (dbState.customGoalTitle || '').trim() || 'Meta Personalizada de Saldo';
                    const currentBalance = periodTotals.saldoMonth;
                    const currentGross = periodTotals.revMonth;
                    const currentExpenses = periodTotals.expMonth;
                    const rawPct = customTarget > 0 ? Math.round((currentBalance / customTarget) * 100) : 0;
                    const barPct = Math.min(100, Math.max(0, rawPct));
                    const remainingToGoal = Math.max(0, customTarget - currentBalance);
                    const isGoalReached = customTarget > 0 && currentBalance >= customTarget;
                    const requiredDailyToReachGoal = isGoalReached ? 0 : remainingToGoal / customDays;

                    return (
                      <div className={`py-3.5 border-b ${dividerBorder}`}>
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <Trophy className={`w-4 h-4 shrink-0 ${
                              isGoalReached ? 'text-emerald-500 dark:text-emerald-400' : 'text-[#FF6A1A]'
                            }`} />
                            <div>
                              <span className={`text-xs sm:text-sm font-extrabold block leading-tight ${primaryText}`}>
                                {customTitle}
                              </span>
                              <span className={`text-[10px] sm:text-[11px] ${mutedText}`}>
                                Acompanhando seu Saldo Atual (Lucro Líquido = Ganhos - Gastos)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs sm:text-sm font-black tabular-nums ${
                                isGoalReached ? 'text-emerald-500 dark:text-emerald-400' : currentBalance < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-[#FF6A1A]'
                              }`}
                            >
                              Saldo: <AnimatedNumber value={currentBalance} formatter={fmtMoney} /> / {fmtMoney(customTarget)} ({rawPct}%)
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('settings')}
                              title="Ajustar Meta e Data Término nas Configurações"
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors bg-transparent border ${dividerBorder} ${secondaryText} hover:border-[#FF6A1A] hover:text-[#FF6A1A]`}
                            >
                              Ajustar
                            </button>
                          </div>
                        </div>

                        {/* Sub-itens Minimalistas Sem Fundo, Apenas Borda Fina e Suave */}
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className={`rounded-xl p-2.5 flex flex-col justify-between bg-transparent border ${dividerBorder}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                              Data Término
                            </span>
                            <div className="mt-1 flex items-center justify-between gap-1 flex-wrap">
                              <span className={`text-xs sm:text-sm font-black tabular-nums ${primaryText}`}>
                                {formatPtBrDate(countdown.targetDateStr)}
                              </span>
                              <span className="text-[10px] font-black text-[#FF6A1A] bg-transparent px-1.5 py-0.5 rounded-md border border-[#FF6A1A]/30">
                                ⏳ {countdown.countdownBadgeText}
                              </span>
                            </div>
                          </div>

                          <div className={`rounded-xl p-2.5 flex flex-col justify-between bg-transparent border ${dividerBorder}`}>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF6A1A]">
                              Saldo Diário Necessário
                            </span>
                            <div className="mt-1 flex items-baseline justify-between gap-1">
                              <span
                                className={`text-sm sm:text-base font-black tabular-nums ${
                                  isGoalReached ? 'text-emerald-500 dark:text-emerald-400' : 'text-[#FF6A1A]'
                                }`}
                              >
                                {isGoalReached ? (
                                  'Objetivo Batido!'
                                ) : (
                                  <>
                                    <AnimatedNumber value={requiredDailyToReachGoal} formatter={fmtCurrencyExact} />/dia
                                  </>
                                )}
                              </span>
                              {!isGoalReached && (
                                <span className={`text-[10px] font-bold tabular-nums ${mutedText}`}>
                                  {countdown.isToday ? 'hoje' : `por ${customDays} ${customDays === 1 ? 'dia' : 'dias'}`}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className={`rounded-xl p-2.5 flex flex-col justify-between bg-transparent border ${dividerBorder}`}>
                            <span
                              className={`text-[10px] font-extrabold uppercase tracking-wider ${
                                isGoalReached ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                              }`}
                            >
                              Falta de Saldo Líquido
                            </span>
                            <div className="mt-1 flex items-baseline justify-between gap-1">
                              <span
                                className={`text-sm sm:text-base font-black tabular-nums ${
                                  isGoalReached ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {isGoalReached ? (
                                  '100% Batida!'
                                ) : (
                                  <AnimatedNumber value={remainingToGoal} formatter={fmtMoney} />
                                )}
                              </span>
                              <span className={`text-[10px] font-bold ${mutedText}`}>
                                {isGoalReached ? 'Sucesso' : `${Math.max(0, 100 - rawPct)}% restante`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar Animada */}
                        <div
                          className={`mt-3 h-2 rounded-full overflow-hidden ${
                            isDark ? 'bg-neutral-800' : 'bg-slate-200/80'
                          }`}
                        >
                          <div
                            className={`h-full rounded-full dashboard-progress-fill ${
                              isGoalReached
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-[#FF6A1A] to-amber-400'
                            }`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>

                        {/* Feedback Visual Direto */}
                        <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] sm:text-xs font-semibold tabular-nums">
                          <span className={mutedText}>
                            Saldo no bolso: <span className={currentBalance >= 0 ? 'text-emerald-500 dark:text-emerald-400 font-bold' : 'text-rose-500 dark:text-rose-400 font-bold'}>{fmtMoney(currentBalance)}</span> <span className="opacity-75">(Ganhos: {fmtMoney(currentGross)} · Gastos: {fmtMoney(currentExpenses)})</span>
                          </span>
                          <span className={isGoalReached ? 'text-emerald-500 dark:text-emerald-400 font-extrabold' : `${primaryText} font-bold`}>
                            {isGoalReached ? (
                              `🎉 Meta atingida (+${fmtMoney(currentBalance - customTarget)} de sobra)`
                            ) : (
                              <>
                                Faltam <strong className="text-rose-500 dark:text-rose-400 font-black">{fmtMoney(remainingToGoal)}</strong> de saldo
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 4 Métricas de Produtividade (Sem fundo, apenas borda fina e suave) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
                    <div className={`rounded-xl p-2.5 sm:p-3.5 bg-transparent border ${dividerBorder}`}>
                      <div className={`text-[10px] sm:text-xs font-medium truncate ${mutedText}`}>Ganhos / Hora</div>
                      <div className={`text-xs sm:text-base font-black mt-0.5 sm:mt-1 tabular-nums truncate ${primaryText}`}>
                        <AnimatedNumber
                          value={totals.totalHours > 0 ? totals.totalRevenue / totals.totalHours : 0}
                          formatter={v => `${fmtCurrencyExact(v)}/h`}
                        />
                      </div>
                    </div>
                    <div className={`rounded-xl p-2.5 sm:p-3.5 bg-transparent border ${dividerBorder}`}>
                      <div className={`text-[10px] sm:text-xs font-medium truncate ${mutedText}`}>Lucro / Hora</div>
                      <div className="text-xs sm:text-base font-black mt-0.5 sm:mt-1 tabular-nums text-emerald-500 dark:text-emerald-400 truncate">
                        <AnimatedNumber
                          value={totals.totalHours > 0 ? totals.lucro / totals.totalHours : 0}
                          formatter={v => `${fmtCurrencyExact(v)}/h`}
                        />
                      </div>
                    </div>
                    <div className={`rounded-xl p-2.5 sm:p-3.5 bg-transparent border ${dividerBorder}`}>
                      <div className={`text-[10px] sm:text-xs font-medium truncate ${mutedText}`}>Ganhos / KM</div>
                      <div className="text-xs sm:text-base font-black mt-0.5 sm:mt-1 tabular-nums text-[#FF6A1A] truncate">
                        <AnimatedNumber
                          value={totals.ridesKm > 0 ? totals.totalRevenue / totals.ridesKm : 0}
                          formatter={v => `${fmtCurrencyExact(v)}/km`}
                        />
                      </div>
                    </div>
                    <div className={`rounded-xl p-2.5 sm:p-3.5 bg-transparent border ${dividerBorder}`}>
                      <div className={`text-[10px] sm:text-xs font-medium truncate ${mutedText}`}>Horas Rodadas</div>
                      <div className={`text-xs sm:text-base font-black mt-0.5 sm:mt-1 tabular-nums truncate ${primaryText}`}>
                        <AnimatedNumber
                          value={totals.totalHours}
                          formatter={v => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desempenho nos Últimos 7 Dias (Gráfico Minimalista Animado) */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                    <div>
                      <h2 className={`text-sm sm:text-base font-extrabold ${primaryText}`}>Desempenho nos Últimos 7 Dias</h2>
                      <p className={`text-[11px] sm:text-xs ${mutedText}`}>Faturamento diário e evolução na semana</p>
                    </div>
                    <span className="text-xs sm:text-sm font-black text-[#FF6A1A] tabular-nums shrink-0">
                      <AnimatedNumber
                        value={chart7Days.reduce((a, b) => a + b.rev, 0)}
                        formatter={fmtMoney}
                      />
                    </span>
                  </div>

                  <div className={`grid grid-cols-7 gap-1.5 sm:gap-2.5 items-end h-40 sm:h-44 pt-4 pb-2 border-b ${dividerBorder}`}>
                    {chart7Days.map((day, idx) => {
                      const maxRev = Math.max(100, ...chart7Days.map(d => d.rev));
                      const barHeightPct = Math.max(8, Math.round((day.rev / maxRev) * 100));
                      const isPeak = day.rev > 0 && day.rev === maxRev;
                      return (
                        <div key={day.date} className="flex flex-col items-center gap-1 sm:gap-1.5 h-full justify-end group">
                          <span className={`text-[9px] sm:text-[10px] font-bold tabular-nums truncate max-w-full transition-transform group-hover:-translate-y-0.5 ${
                            day.rev > 0 ? 'text-[#FF6A1A]' : mutedText
                          }`}>
                            {day.rev > 0 ? `R$${Math.round(day.rev)}` : '—'}
                          </span>
                          <div
                            className={`w-full max-w-[32px] rounded-t-lg dashboard-chart-bar relative ${
                              day.rev > 0
                                ? isPeak
                                  ? 'bg-gradient-to-t from-[#FF5000] via-[#FF6A1A] to-amber-400 shadow-[0_0_12px_rgba(255,106,26,0.3)]'
                                  : 'bg-gradient-to-t from-[#FF5000]/80 to-[#FF8533]'
                                : isDark
                                ? 'bg-neutral-800/70'
                                : 'bg-slate-200/80'
                            }`}
                            style={{
                              height: `${barHeightPct}%`,
                              animationDelay: `${idx * 75}ms`,
                            }}
                          />
                          <span className={`text-[10px] sm:text-[11px] font-bold tabular-nums ${mutedText}`}>{day.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Análise de Turno (Mochilinha), Saúde da Moto & Ranking por Aplicativo */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* 1. Análise de Turno · Mochilinha (Minimalista sem card de fundo) */}
                <div className={`pb-6 border-b ${dividerBorder}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#FF6A1A]">
                      Análise de Turno · {shiftEval.badge}
                    </span>
                    <button
                      onClick={() => setShowCopilotModal(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-transparent text-[#FF6A1A] border border-[#FF6A1A]/50 hover:border-[#FF6A1A] transition-colors cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Perguntar à Mochilinha</span>
                    </button>
                  </div>
                  <h3 className={`text-sm sm:text-base font-extrabold ${primaryText}`}>{shiftEval.title}</h3>
                  <p className={`text-xs sm:text-sm mt-1.5 leading-relaxed ${mutedText}`}>{shiftEval.summary}</p>
                  <p className={`text-xs sm:text-sm mt-1.5 font-medium leading-relaxed ${secondaryText}`}>{shiftEval.recommendation}</p>
                  <div className={`mt-3 pt-2.5 border-t ${dividerBorder} text-xs font-bold text-[#FF6A1A]`}>
                    {shiftEval.projectedExtra}
                  </div>
                </div>

                {/* 2. Saúde da Moto & Manutenção (Minimalista sem fundo) */}
                <div className={`pb-6 border-b ${dividerBorder}`}>
                  <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                    <h2 className={`text-sm sm:text-base font-extrabold ${primaryText}`}>Saúde da Moto & Manutenção</h2>
                    <button
                      onClick={() => setActiveTab('maintenance')}
                      className="text-xs font-bold text-[#FF6A1A] hover:underline flex items-center gap-1 cursor-pointer shrink-0 bg-transparent"
                    >
                      <span>Ver na aba Moto</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {dbState.maintenanceItems.slice(0, 3).map((item, idx) => {
                      const kmUsed = Math.max(0, totals.totalKm - (item.lastChangeKm || 0));
                      const rawPct = Math.round((kmUsed / (item.intervalKm || 1000)) * 100);
                      const pct = Math.min(100, Math.max(0, rawPct));
                      const alertThreshold = Math.min(99, Math.max(50, item.alertThresholdPct ?? 85));
                      const isDanger = rawPct >= 100;
                      const isWarn = rawPct >= alertThreshold && rawPct < 100;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setActiveTab('maintenance');
                            startEditMaintenanceCard(item);
                          }}
                          className={`rounded-xl p-3 bg-transparent border cursor-pointer transition-all ${
                            isDanger
                              ? 'border-rose-500/50 hover:border-rose-500'
                              : isWarn
                              ? 'border-amber-500/50 hover:border-amber-500'
                              : `${dividerBorder} hover:border-[#FF6A1A]/50`
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="text-xl shrink-0">{item.icon}</span>
                              <div className="min-w-0 flex-1">
                                <div className={`text-xs sm:text-sm font-bold truncate flex items-center gap-1.5 ${primaryText}`}>
                                  <span className="truncate">{item.name}</span>
                                  {isDanger ? (
                                    <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-transparent text-rose-500 dark:text-rose-400 border border-rose-500/40 shrink-0">
                                      Vencido
                                    </span>
                                  ) : isWarn ? (
                                    <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-transparent text-amber-500 dark:text-amber-400 border border-amber-500/40 shrink-0">
                                      Alerta {alertThreshold}%
                                    </span>
                                  ) : null}
                                </div>
                                <div className={`text-[11px] tabular-nums ${mutedText}`}>
                                  {kmUsed.toLocaleString('pt-BR')} / {item.intervalKm.toLocaleString('pt-BR')} km ({rawPct}%)
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  openMaintenanceHistoryModal(item);
                                }}
                                title={`Ver histórico de trocas de ${item.name}`}
                                className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors bg-transparent border ${dividerBorder} hover:border-[#FF6A1A] text-[#FF6A1A]`}
                              >
                                <History className="w-3.5 h-3.5 shrink-0" />
                                {(item.history?.length || 0) > 0 && (
                                  <span className="tabular-nums text-[10px] font-black">{item.history?.length}</span>
                                )}
                              </button>
                              <span
                                className={`text-[11px] sm:text-xs font-black whitespace-nowrap shrink-0 ${
                                  isDanger
                                    ? 'text-rose-500 dark:text-rose-400 animate-pulse'
                                    : isWarn
                                    ? 'text-amber-500 dark:text-amber-400 animate-pulse'
                                    : 'text-emerald-500 dark:text-emerald-400'
                                }`}
                              >
                                {isDanger ? '⚠️ Trocar Já' : isWarn ? `⚠️ Alerta` : 'Em Dia'}
                              </span>
                            </div>
                          </div>

                          {/* Mini Barra de Desgaste Animada */}
                          <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-slate-200/80'}`}>
                            <div
                              className={`h-full rounded-full dashboard-progress-fill ${
                                isDanger
                                  ? 'bg-rose-500'
                                  : isWarn
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{
                                width: `${pct}%`,
                                animationDelay: `${idx * 80}ms`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Faturamento por Aplicativo (Minimalista com barras animadas) */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h2 className={`text-sm sm:text-base font-extrabold ${primaryText}`}>Faturamento por Aplicativo</h2>
                    <button
                      onClick={() => setActiveTab('billing')}
                      className="text-xs font-bold text-[#FF6A1A] hover:underline cursor-pointer shrink-0 bg-transparent"
                    >
                      Ver todos
                    </button>
                  </div>

                  <div className="flex flex-col">
                    {allApps
                      .map(a => ({ ...a, val: totals.revenueByApp[a.id] || 0 }))
                      .sort((a, b) => b.val - a.val)
                      .slice(0, 4)
                      .map((app, idx) => {
                        const pct = totals.totalRevenue > 0 ? Math.round((app.val / totals.totalRevenue) * 100) : 0;
                        return (
                          <div key={app.id} className={`py-2.5 border-b last:border-b-0 ${dividerBorder}`}>
                            <div className={`flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5 ${primaryText}`}>
                              <span className="flex items-center gap-2">
                                <span>{app.icon}</span>
                                <span className="truncate">{app.name}</span>
                              </span>
                              <span className="tabular-nums whitespace-nowrap">
                                <AnimatedNumber value={app.val} formatter={fmtMoney} />{' '}
                                <span className={`text-[11px] font-normal ${mutedText}`}>· {pct}%</span>
                              </span>
                            </div>
                            <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-slate-200/80'}`}>
                              <div
                                className="h-full bg-gradient-to-r from-[#FF6A1A] to-amber-400 rounded-full dashboard-progress-fill"
                                style={{
                                  width: `${pct}%`,
                                  animationDelay: `${idx * 90}ms`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 2: MOTO (100% EDITABLE MINIMALIST) ================= */}
        {activeTab === 'maintenance' && (
          <div className="flex flex-col gap-5 sm:gap-6">
            {/* Header & Action Bar (Minimalista sem card de fundo) */}
            <div className={`pb-5 border-b ${dividerBorder} flex flex-col gap-3.5 sm:gap-4`}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <div className="py-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-transparent border border-[#FF6A1A]/40 text-[#FF6A1A] flex items-center justify-center shrink-0">
                      <Wrench className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <h1 className="text-lg sm:text-2xl font-black tracking-tight">
                      Garagem & Manutenção da Moto
                    </h1>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  <button
                    onClick={startEditFuelCard}
                    className={`flex-1 sm:flex-initial justify-center px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors min-h-[44px] bg-transparent border ${dividerBorder} hover:border-[#FF6A1A]`}
                  >
                    <SlidersHorizontal className="w-4 h-4 text-[#FF6A1A]" />
                    <span>Dados da Moto</span>
                  </button>
                  <button
                    onClick={() => startCreateMaintenanceCard()}
                    className="flex-1 sm:flex-initial justify-center px-3.5 py-2.5 rounded-xl text-xs font-bold bg-transparent border border-[#FF6A1A]/60 text-[#FF6A1A] hover:bg-[#FF6A1A]/10 transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Nova Manutenção</span>
                  </button>
                </div>
              </div>

              {/* Search Bar in Maintenance Header */}
              <div className="relative flex items-center">
                <Search className={`w-4 h-4 absolute left-3.5 pointer-events-none ${mutedText}`} />
                <input
                  type="text"
                  value={maintSearchQuery}
                  onChange={e => setMaintSearchQuery(e.target.value)}
                  placeholder="Buscar por nome da manutenção ou KM restante (ex: Óleo, Relação, 500, <= 1000)..."
                  aria-label="Buscar manutenção pelo nome ou quilometragem restante"
                  className={`w-full pl-10 pr-24 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold outline-none transition-colors ${inputSurface}`}
                />
                {maintSearchQuery.trim() !== '' && (
                  <div className="absolute right-2.5 flex items-center gap-1.5">
                    <span className="text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-transparent text-[#FF6A1A] border border-[#FF6A1A]/40 tabular-nums">
                      {sortedMaintenanceItems.length}/{dbState.maintenanceItems.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMaintSearchQuery('')}
                      title="Limpar busca"
                      className={`p-1.5 rounded-lg cursor-pointer transition-colors bg-transparent border ${dividerBorder} hover:border-[#FF6A1A]`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Aviso de Destaque Urgente se houver manutenções >= 100% */}
            {(() => {
              const overdueItems = dbState.maintenanceItems.filter(item => {
                const used = Math.max(0, totals.totalKm - (item.lastChangeKm || 0));
                return used >= (item.intervalKm || 1000);
              });
              if (overdueItems.length === 0) return null;
              return (
                <div className="rounded-2xl p-4 sm:p-5 bg-transparent border border-rose-500/35 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-3.5">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-transparent border border-rose-500/35 flex items-center justify-center text-rose-500 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className={`text-xs sm:text-sm font-black ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                        {overdueItems.length === 1
                          ? `Atenção: 1 manutenção atingiu 100% ou mais do intervalo!`
                          : `Atenção: ${overdueItems.length} manutenções atingiram 100% ou mais do intervalo!`}
                      </h4>
                      <p className={`text-[11px] sm:text-xs mt-0.5 ${mutedText}`}>
                        Cards com alerta vermelho precisam de troca imediata ({overdueItems.map(o => o.name).join(', ')}).
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-transparent border border-rose-500/40 shrink-0 self-start sm:self-auto ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                    Troca Obrigatória
                  </span>
                </div>
              );
            })()}

            {/* Aviso de Alerta Preventivo Configurável (ex: atingiu 90% do intervalo) */}
            {(() => {
              const warningItems = dbState.maintenanceItems.filter(item => {
                const used = Math.max(0, totals.totalKm - (item.lastChangeKm || 0));
                const interval = Math.max(100, item.intervalKm || 1000);
                const pct = (used / interval) * 100;
                const threshold = Math.min(99, Math.max(50, item.alertThresholdPct ?? 85));
                return pct >= threshold && pct < 100;
              });
              if (warningItems.length === 0) return null;
              return (
                <div className="rounded-2xl p-4 sm:p-5 bg-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-3.5">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-transparent border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className={`text-xs sm:text-sm font-black ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                        {warningItems.length === 1
                          ? `Aviso Preventivo: 1 manutenção atingiu a porcentagem de alerta configurada!`
                          : `Aviso Preventivo: ${warningItems.length} manutenções atingiram a porcentagem de alerta configurada!`}
                      </h4>
                      <p className={`text-[11px] sm:text-xs mt-0.5 ${mutedText}`}>
                        Cards com alerta preventivo ({warningItems.map(w => `${w.name} aos ${w.alertThresholdPct ?? 85}%`).join(', ')}).
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-transparent border border-amber-500/40 shrink-0 self-start sm:self-auto ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                    Alerta Preventivo
                  </span>
                </div>
              );
            })()}

            {/* ALL MAINTENANCE CARDS GRID (100% EDITABLE INLINE MINIMALIST) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {sortedMaintenanceItems.map((item, idx) => {
                const isEditingThis = editingMaintId === item.id && !isAddingNewMaint && maintDraft !== null;
                const kmUsed = Math.max(0, totals.totalKm - (item.lastChangeKm || 0));
                const interval = Math.max(100, item.intervalKm || 1000);
                const rawPct = Math.round((kmUsed / interval) * 100);
                const pct = Math.min(100, rawPct);
                const alertThreshold = Math.min(99, Math.max(50, item.alertThresholdPct ?? 85));
                const kmRemaining = Math.max(0, interval - kmUsed);
                const kmOverdue = kmUsed > interval ? kmUsed - interval : 0;
                const isDanger = rawPct >= 100;
                const isWarn = rawPct >= alertThreshold && rawPct < 100;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl p-4 sm:p-5 transition-all relative overflow-hidden bg-transparent border ${
                      isDanger && !isEditingThis
                        ? 'border-rose-500/45'
                        : isWarn && !isEditingThis
                        ? 'border-amber-500/30'
                        : dividerBorder
                    } ${isEditingThis ? 'border-[#FF6A1A]' : ''}`}
                  >
                    {isEditingThis && maintDraft ? (
                      /* 100% EDITABLE FORM MODE FOR THIS CARD */
                      <div className="flex flex-col gap-3.5 sm:gap-4">
                        <div className={`flex items-center justify-between border-b ${dividerBorder} pb-2.5`}>
                          <span className="text-xs font-extrabold uppercase tracking-wider text-[#FF6A1A] truncate">
                            Editando · {item.name}
                          </span>
                          <button
                            onClick={() => {
                              setEditingMaintId(null);
                              setMaintDraft(null);
                            }}
                            className={`p-1.5 rounded-lg bg-transparent border ${dividerBorder} cursor-pointer`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
                          <div className="col-span-1">
                            <label className={`block text-[10px] sm:text-[11px] font-bold mb-1 ${mutedText}`}>Ícone</label>
                            <input
                              type="text"
                              value={maintDraft.icon}
                              onChange={e => setMaintDraft({ ...maintDraft, icon: e.target.value })}
                              className={`w-full px-2.5 py-2 rounded-xl text-center text-base font-bold outline-none ${inputSurface}`}
                            />
                          </div>
                          <div className="col-span-3">
                            <label className={`block text-[10px] sm:text-[11px] font-bold mb-1 ${mutedText}`}>Título do Card</label>
                            <input
                              type="text"
                              value={maintDraft.name}
                              onChange={e => setMaintDraft({ ...maintDraft, name: e.target.value })}
                              className={`w-full px-3 py-2 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                          <div>
                            <label className={`block text-[10px] sm:text-[11px] font-bold mb-1 ${mutedText}`}>
                              Última Troca (KM)
                            </label>
                            <FreeNumberInput
                              step="10"
                              value={maintDraft.lastChangeKm}
                              onValueChange={val =>
                                setMaintDraft({ ...maintDraft, lastChangeKm: Math.max(0, val) })
                              }
                              className={`w-full px-3 py-2 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                            />
                          </div>
                          <div>
                            <label className={`block text-[10px] sm:text-[11px] font-bold mb-1 ${mutedText}`}>
                              Intervalo Revisão (KM)
                            </label>
                            <FreeNumberInput
                              step="100"
                              value={maintDraft.intervalKm}
                              onValueChange={val =>
                                setMaintDraft({ ...maintDraft, intervalKm: Math.max(0, val) })
                              }
                              className={`w-full px-3 py-2 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                            />
                          </div>
                          <div>
                            <label className={`block text-[10px] sm:text-[11px] font-bold mb-1 ${mutedText}`}>
                              Custo Estimado (R$)
                            </label>
                            <FreeNumberInput
                              step="5"
                              value={maintDraft.costEstimate}
                              onValueChange={val =>
                                setMaintDraft({ ...maintDraft, costEstimate: Math.max(0, val) })
                              }
                              className={`w-full px-3 py-2 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[10px] sm:text-[11px] font-bold mb-1 ${mutedText}`}>
                            Notas / Especificação da Peça
                          </label>
                          <input
                            type="text"
                            value={maintDraft.notes || ''}
                            onChange={e => setMaintDraft({ ...maintDraft, notes: e.target.value })}
                            placeholder="Ex: Óleo 10W30, Pastilha Cobreq, Relação DID"
                            className={`w-full px-3 py-2 rounded-xl text-sm font-semibold outline-none ${inputSurface}`}
                          />
                        </div>

                        {/* Configuração de Porcentagem de Alerta (Room DB) */}
                        <div className="rounded-xl p-3 bg-transparent border border-amber-500/35">
                          <div className="flex items-center justify-between gap-2.5 mb-1.5">
                            <div>
                              <label className={`block text-[11px] font-black ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                                🔔 Porcentagem de Alerta Preventivo (% do intervalo)
                              </label>
                              <p className={`text-[10px] mt-0.5 ${mutedText}`}>
                                Dispara alerta visual e notificação ao atingir essa porcentagem.
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <FreeNumberInput
                                step="1"
                                value={maintDraft.alertThresholdPct ?? 85}
                                onValueChange={val =>
                                  setMaintDraft({
                                    ...maintDraft,
                                    alertThresholdPct: Math.max(0, val),
                                  })
                                }
                                className={`w-16 px-2 py-1 rounded-lg text-center text-xs font-black tabular-nums outline-none ${isDark ? 'text-amber-300' : 'text-amber-700'} ${inputSurface}`}
                              />
                              <span className={`text-xs font-black ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>%</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            {[75, 80, 85, 90, 95].map(pctVal => {
                              const isSelected = (maintDraft.alertThresholdPct ?? 85) === pctVal;
                              return (
                                <button
                                  key={pctVal}
                                  type="button"
                                  onClick={() => setMaintDraft({ ...maintDraft, alertThresholdPct: pctVal })}
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-black cursor-pointer transition-colors bg-transparent border ${
                                    isSelected
                                      ? 'border-amber-500 text-amber-500'
                                      : `${dividerBorder} hover:border-amber-400 ${isDark ? 'text-amber-300' : 'text-amber-700'}`
                                  }`}
                                >
                                  {pctVal}%
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => deleteMaintenanceCard(item.id)}
                              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold text-rose-500 bg-transparent border border-rose-500/40 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir Card</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => duplicateMaintenanceCard(item)}
                              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold bg-transparent border transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] ${
                                isDark
                                  ? 'border-sky-500/40 text-sky-400 hover:bg-sky-500/10'
                                  : 'border-sky-300 text-sky-700 hover:bg-sky-50'
                              }`}
                              title="Duplicar esta manutenção para criar uma cópia independente"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Duplicar</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMaintId(null);
                                setMaintDraft(null);
                              }}
                              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer min-h-[40px] text-center bg-transparent border ${dividerBorder}`}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={saveMaintenanceCardEdit}
                              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold bg-transparent border border-[#FF6A1A] text-[#FF6A1A] hover:bg-[#FF6A1A]/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
                            >
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span>Salvar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* DISPLAY MODE WITH DIRECT EDIT & RESET TRIGGERS */
                      <div className="flex flex-col h-full justify-between">
                        <div>
                          {/* Feedback visual de alerta: Linha de status elegante com LED pulsante sem cobrir o texto */}
                          {isDanger && (
                            <div className={`mb-3 sm:mb-4 pb-2.5 flex items-center justify-between gap-2 border-b ${
                              isDark ? 'border-rose-500/25' : 'border-rose-200'
                            }`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="relative flex h-2.5 w-2.5 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600 dark:bg-rose-500"></span>
                                </span>
                                <span className="tracking-wide uppercase font-black truncate text-xs text-rose-600 dark:text-rose-400">
                                  Troca Obrigatória ({rawPct}%)
                                </span>
                              </div>
                              <span className={`text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md tabular-nums shrink-0 bg-transparent border ${
                                isDark
                                  ? 'text-rose-300 border-rose-500/40'
                                  : 'text-rose-700 border-rose-300'
                              }`}>
                                {kmOverdue > 0 ? `+${kmOverdue.toLocaleString('pt-BR')} km além` : '100% atingido'}
                              </span>
                            </div>
                          )}

                          {isWarn && !isDanger && (
                            <div className={`mb-3 sm:mb-4 pb-2.5 flex items-center justify-between gap-2 border-b ${
                              isDark ? 'border-amber-500/25' : 'border-amber-200'
                            }`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="relative flex h-2.5 w-2.5 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600 dark:bg-amber-400"></span>
                                </span>
                                <span className="tracking-wide uppercase font-black truncate text-xs text-amber-600 dark:text-amber-400">
                                  Alerta Preventivo ({rawPct}%)
                                </span>
                              </div>
                              <span className={`text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md tabular-nums shrink-0 bg-transparent border ${
                                isDark
                                  ? 'text-amber-300 border-amber-500/40'
                                  : 'text-amber-800 border-amber-300'
                              }`}>
                                Gatilho {alertThreshold}% atingido
                              </span>
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                              <span className="text-2xl sm:text-3xl shrink-0 mt-0.5">{item.icon}</span>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-sm sm:text-base font-extrabold leading-snug flex items-center gap-1.5 flex-wrap">
                                  <span className="break-words">{item.name}</span>
                                  {isDanger ? (
                                    <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 bg-transparent border ${
                                      isDark
                                        ? 'text-rose-300 border-rose-500/40'
                                        : 'text-rose-700 border-rose-300'
                                    }`}>
                                      {rawPct}%
                                    </span>
                                  ) : isWarn ? (
                                    <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 bg-transparent border ${
                                      isDark
                                        ? 'text-amber-300 border-amber-500/40'
                                        : 'text-amber-800 border-amber-300'
                                    }`}>
                                      {rawPct}% ({alertThreshold}%)
                                    </span>
                                  ) : null}
                                </h3>
                                <p className={`text-[11px] sm:text-xs mt-0.5 tabular-nums ${mutedText}`}>
                                  Troca aos {(item.lastChangeKm || 0).toLocaleString('pt-BR')} km ·{' '}
                                  {isDanger ? (
                                    <strong className="text-rose-600 dark:text-rose-400 font-extrabold">
                                      +{kmOverdue.toLocaleString('pt-BR')} km além
                                    </strong>
                                  ) : isWarn ? (
                                    <strong className="text-amber-600 dark:text-amber-400 font-extrabold">
                                      Restam {kmRemaining.toLocaleString('pt-BR')} km
                                    </strong>
                                  ) : (
                                    `Restam ${kmRemaining.toLocaleString('pt-BR')} km`
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => openMaintenanceHistoryModal(item)}
                                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 min-h-[38px] sm:min-h-[40px] bg-transparent border ${dividerBorder} hover:border-[#FF6A1A] ${secondaryText}`}
                                title={`Ver histórico de datas e valores pagos de ${item.name}`}
                              >
                                <History className="w-3.5 h-3.5 text-[#FF6A1A] shrink-0" />
                                <span className="hidden sm:inline">Histórico</span>
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums bg-transparent text-[#FF6A1A] border border-[#FF6A1A]/40">
                                  {(item.history || []).length}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => startEditMaintenanceCard(item)}
                                className={`p-2 sm:p-2.5 rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0 min-h-[38px] sm:min-h-[40px] min-w-[38px] sm:min-w-[40px] bg-transparent border ${dividerBorder} hover:border-[#FF6A1A] text-[#FF6A1A]`}
                                title="Editar dados deste card"
                                aria-label="Editar card de manutenção"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Metadata Line */}
                          <div className={`mt-3 sm:mt-4 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs tabular-nums ${mutedText}`}>
                            <span>
                              Desgaste: <strong className="text-current dashboard-number-anim">{kmUsed.toLocaleString('pt-BR')}</strong> /{' '}
                              {interval.toLocaleString('pt-BR')} km ({rawPct}%)
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Custo est.: <strong className="text-current">{fmtMoney(item.costEstimate || 0)}</strong>
                            </span>
                            {item.updatedAt && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>
                                  Atualizado:{' '}
                                  <strong className="text-current">
                                    {new Date(item.updatedAt).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </strong>
                                </span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span
                              className={`font-black ${
                                isDanger
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : isWarn
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-500 dark:text-emerald-400'
                              }`}
                            >
                              {isDanger
                                ? '⚠️ Vencido (Troca Imediata)'
                                : isWarn
                                ? `⚠️ Atenção (Alerta aos ${alertThreshold}%)`
                                : `Status OK (Alerta aos ${alertThreshold}%)`}
                            </span>
                          </div>

                          {item.notes && (
                            <p className={`mt-1.5 sm:mt-2 text-[11px] sm:text-xs italic ${mutedText}`}>
                              Especificação: {item.notes}
                            </p>
                          )}

                          {/* Wear Progress Bar with Threshold Marker (Animada) */}
                          <div className={`mt-3 sm:mt-4 h-2 rounded-full overflow-hidden ${isDark ? 'bg-neutral-900' : 'bg-slate-200'} relative`}>
                            {/* Marcador visual da porcentagem de alerta configurada */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-amber-400/90 z-10 shadow-[0_0_4px_rgba(245,158,11,0.8)]"
                              style={{ left: `${alertThreshold}%` }}
                              title={`Ponto de Alerta Configurado: ${alertThreshold}%`}
                            />
                            <div
                              className={`h-full rounded-full dashboard-progress-fill ${
                                isDanger
                                  ? 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-600'
                                  : isWarn
                                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500'
                                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              }`}
                              style={{
                                width: `${pct}%`,
                                animationDelay: `${idx * 70}ms`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Card Footer Actions (Botões sem fundo, borda fina) */}
                        <div className={`mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t ${dividerBorder} flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5`}>
                          <button
                            type="button"
                            onClick={() => quickResetMaintenanceCard(item.id)}
                            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all min-h-[44px] text-center bg-transparent border ${
                              isDanger
                                ? isDark
                                  ? 'border-rose-500/70 text-rose-300 hover:bg-rose-500/10'
                                  : 'border-rose-500/60 text-rose-700 hover:bg-rose-50'
                                : `${dividerBorder} hover:border-emerald-500/60`
                            }`}
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Registrar Troca Agora ({totals.totalKm.toLocaleString('pt-BR')} km)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openMaintenanceHistoryModal(item)}
                            className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all min-h-[44px] shrink-0 bg-transparent border ${dividerBorder} hover:border-[#FF6A1A] text-[#FF6A1A]`}
                            title="Abrir pop-up com histórico de datas e valores pagos"
                          >
                            <History className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Ver Histórico {(item.history || []).length > 0 ? `(${(item.history || []).length})` : ''}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {sortedMaintenanceItems.length === 0 && maintSearchQuery.trim() !== '' && (
                <div
                  className={`col-span-1 md:col-span-2 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-3 bg-transparent border ${dividerBorder}`}
                >
                  <Search className="w-8 h-8 text-[#FF6A1A] opacity-80" />
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold">
                      Nenhuma manutenção encontrada para "{maintSearchQuery}"
                    </h3>
                    <p className={`text-xs mt-1 ${mutedText}`}>
                      Tente buscar por outro nome de peça/serviço ou por outra quilometragem restante.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMaintSearchQuery('')}
                    className="mt-1 px-4 py-2 rounded-xl text-xs font-bold bg-transparent border border-[#FF6A1A] text-[#FF6A1A] hover:bg-[#FF6A1A]/10 transition-colors cursor-pointer"
                  >
                    Limpar filtro de busca
                  </button>
                </div>
              )}
            </div>

            {/* 100% EDITABLE FUEL & DIAGNOSTICS SECTION (Minimalista sem card pesado externo) */}
            <div className={`pt-5 border-t ${dividerBorder}`}>
              <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b ${dividerBorder}`}>
                <div className="flex items-center gap-3">
                  <Fuel className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF6A1A] shrink-0" />
                  <div>
                    <h2 className="text-base sm:text-lg font-black">
                      Diagnóstico de Combustível, Consumo & Odômetro
                    </h2>
                    <p className={`text-xs ${mutedText}`}>
                      Modelo: <strong className="text-current">{dbState.fuelConfig.bikeModelName}</strong> · Score:{' '}
                      <strong className="text-[#FF6A1A]">{bikeDiagnostics.efficiencyScore}/100</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startEditFuelCard}
                  className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors min-h-[40px] sm:min-h-[44px] bg-transparent border ${dividerBorder} hover:border-[#FF6A1A] text-[#FF6A1A] self-start sm:self-auto`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Dados da Moto</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 mt-4">
                <div
                  onClick={startEditFuelCard}
                  className={`rounded-xl p-3 sm:p-4 cursor-pointer transition-colors bg-transparent border ${dividerBorder} hover:border-[#FF6A1A]/50`}
                >
                  <div className={`text-[11px] sm:text-xs font-semibold ${mutedText}`}>Consumo Total</div>
                  <div className="text-base sm:text-xl font-black mt-1 tabular-nums truncate">
                    <AnimatedNumber
                      value={totals.totalKm / (dbState.fuelConfig.kmPerLiter || 35)}
                      formatter={v =>
                        `${v.toLocaleString('pt-BR', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })} L`
                      }
                    />
                  </div>
                </div>
                <div
                  onClick={startEditFuelCard}
                  className={`rounded-xl p-3 sm:p-4 cursor-pointer transition-colors bg-transparent border ${dividerBorder} hover:border-[#FF6A1A]/50`}
                >
                  <div className={`text-[11px] sm:text-xs font-semibold ${mutedText}`}>Gasto Estimado</div>
                  <div className="text-base sm:text-xl font-black mt-1 tabular-nums text-[#FF6A1A] truncate">
                    <AnimatedNumber
                      value={
                        (totals.totalKm / (dbState.fuelConfig.kmPerLiter || 35)) *
                        (dbState.fuelConfig.fuelPrice || 5.8)
                      }
                      formatter={fmtCurrencyExact}
                    />
                  </div>
                </div>
                <div
                  onClick={startEditFuelCard}
                  className={`rounded-xl p-3 sm:p-4 cursor-pointer transition-colors bg-transparent border ${dividerBorder} hover:border-[#FF6A1A]/50`}
                >
                  <div className={`text-[11px] sm:text-xs font-semibold ${mutedText}`}>Custo / KM</div>
                  <div className="text-base sm:text-xl font-black mt-1 tabular-nums text-emerald-500 dark:text-emerald-400 truncate">
                    <AnimatedNumber
                      value={bikeDiagnostics.costPerKm}
                      formatter={v => `R$ ${v.toFixed(2)}/km`}
                    />
                  </div>
                </div>
                <div
                  onClick={startEditFuelCard}
                  className={`rounded-xl p-3 sm:p-4 cursor-pointer transition-colors bg-transparent border ${dividerBorder} hover:border-[#FF6A1A]/50`}
                >
                  <div className={`text-[11px] sm:text-xs font-semibold ${mutedText}`}>Média & Preço</div>
                  <div className="text-xs sm:text-base font-black mt-1 tabular-nums truncate">
                    {dbState.fuelConfig.kmPerLiter} km/L · R$ {dbState.fuelConfig.fuelPrice.toFixed(2)}
                  </div>
                </div>
                <div
                  onClick={startEditFuelCard}
                  className={`rounded-xl p-3 sm:p-4 cursor-pointer transition-colors bg-transparent border ${dividerBorder} hover:border-[#FF6A1A]/50 col-span-2 sm:col-span-1`}
                >
                  <div className={`text-[11px] sm:text-xs font-semibold ${mutedText}`}>Autonomia / Tanque</div>
                  <div className="text-base sm:text-xl font-black mt-1 tabular-nums text-sky-500 dark:text-sky-400 truncate">
                    <AnimatedNumber
                      value={bikeDiagnostics.autonomyKm}
                      formatter={v => `~${Math.round(v)} km`}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {bikeDiagnostics.tips.map((tip, idx) => (
                  <div key={idx} className={`rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium leading-relaxed bg-transparent border ${dividerBorder}`}>
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 3: FINANCEIRO (INTELIGÊNCIA FINANCEIRA COM IA, RESERVAS & DOCUMENTAÇÃO) ================= */}
        {activeTab === 'billing' && (
          <div className="flex flex-col gap-5 sm:gap-6">
            {/* TOP HEADER + SUB-NAVIGATION (Minimalista sem fundo nos botões) */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${dividerBorder}`}>
              <div>
                <h1 className="text-xl sm:text-2xl font-black">
                  Central de Finanças
                </h1>
                <p className={`text-xs mt-0.5 ${mutedText}`}>
                  Planejamento de reservas diárias, custos e lucro real que sobra no seu bolso
                </p>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar py-0.5">
                {[
                  { id: 'mensal', label: 'Ganhos do Mês & Saldo' },
                  { id: 'projecao', label: '🔮 Faturamento Previsto' },
                  { id: 'despesas_moto', label: '🏍️ Despesas da Moto' },
                  { id: 'despesas_casa', label: '🏠 Despesas da Casa' },
                  { id: 'planejamento', label: 'Planejamento & IA' },
                  { id: 'ganhos', label: 'Ganhos por App' },
                  { id: 'gastos', label: 'Gastos por Categoria' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setBillingSubTab(tab.id as any)}
                    className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 bg-transparent border ${
                      billingSubTab === tab.id
                        ? 'border-[#FF6A1A] text-[#FF6A1A]'
                        : `${dividerBorder} ${mutedText} hover:text-current hover:border-[#FF6A1A]/50`
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {billingSubTab === 'mensal' && (
              <div className="flex flex-col gap-5 sm:gap-6">
                {/* 1. BARRA DE CONTROLE: SELETOR DE MÊS, FILTRO DE MESES ANTERIORES & ATALHOS (Sem card externo) */}
                <div className={`pb-5 border-b ${dividerBorder}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-black flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-[#FF6A1A]" />
                          <span>Extrato Mensal & Filtro de Meses</span>
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-transparent border ${
                            selectedMonthFinancials.isCurrentMonth
                              ? 'text-emerald-500 dark:text-emerald-400 border-emerald-500/40'
                              : 'text-sky-500 dark:text-sky-400 border-sky-500/40'
                          }`}
                        >
                          {selectedMonthFinancials.isCurrentMonth
                            ? 'Mês Atual em Andamento'
                            : 'Mês Fechado / Histórico'}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${mutedText}`}>
                        Navegue entre os meses para comparar seus faturamentos brutos, gastos operacionais e saldo real
                      </p>
                    </div>

                    {/* Controles de Navegação de Mês */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const [y, m] = selectedFinanceMonth.split('-').map(Number);
                          const d = new Date(y, m - 2, 1);
                          setSelectedFinanceMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                        }}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 bg-transparent border ${dividerBorder} hover:border-[#FF6A1A]`}
                        title="Mês Anterior"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        <span className="hidden sm:inline">Anterior</span>
                      </button>

                      <div className="relative">
                        <select
                          value={selectedFinanceMonth}
                          onChange={e => setSelectedFinanceMonth(e.target.value)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black outline-none cursor-pointer appearance-none pr-8 ${inputSurface}`}
                        >
                          {availableFinanceMonths.map(ym => {
                            const [y, m] = ym.split('-');
                            const name = PT_BR_MONTH_NAMES[parseInt(m, 10) - 1] || m;
                            const now = new Date();
                            const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                            return (
                              <option key={ym} value={ym}>
                                {name} de {y} {ym === nowYM ? '· (Atual)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-70" />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const [y, m] = selectedFinanceMonth.split('-').map(Number);
                          const d = new Date(y, m, 1);
                          setSelectedFinanceMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                        }}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 bg-transparent border ${dividerBorder} hover:border-[#FF6A1A]`}
                        title="Próximo Mês"
                      >
                        <span className="hidden sm:inline">Próximo</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {!selectedMonthFinancials.isCurrentMonth && (
                        <button
                          type="button"
                          onClick={() => {
                            const now = new Date();
                            setSelectedFinanceMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                          }}
                          className="px-2.5 py-2 rounded-xl text-xs font-black bg-transparent text-[#FF6A1A] hover:bg-[#FF6A1A]/10 border border-[#FF6A1A]/50 cursor-pointer transition-colors"
                        >
                          Ir p/ Mês Atual
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. OS 4 CARDS PRINCIPAIS: GANHOS TOTAIS, GASTOS, SALDO ATUAL E META PERSONALIZADA (Sem fundo, apenas bordas finas) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Card 1: Ganhos Totais do Mês */}
                  <div className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between bg-transparent border ${dividerBorder}`}>
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${mutedText}`}>
                          1. Ganhos Totais
                        </span>
                        <span className="text-[10px] font-bold text-sky-500 dark:text-sky-400 bg-transparent border border-sky-500/35 px-1.5 py-0.5 rounded">
                          {selectedMonthFinancials.entries.length} corridas
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black tabular-nums text-[#FF6A1A] mt-1">
                        <AnimatedNumber value={selectedMonthFinancials.totalRevenue} formatter={fmtMoney} />
                      </div>
                    </div>
                    <div className={`mt-3 pt-2.5 border-t ${dividerBorder} text-[11px] font-semibold ${mutedText} flex items-center justify-between`}>
                      <span>Média/corrida:</span>
                      <span className={`font-bold tabular-nums ${secondaryText}`}>
                        {fmtMoney(selectedMonthFinancials.avgPerRide)}
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Gastos do Mês */}
                  <div className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between bg-transparent border ${dividerBorder}`}>
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${mutedText}`}>
                          2. Gastos do Mês
                        </span>
                        <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 bg-transparent border border-rose-500/35 px-1.5 py-0.5 rounded">
                          {selectedMonthFinancials.expenses.length} lançamentos
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black tabular-nums text-rose-500 dark:text-rose-400 mt-1">
                        <AnimatedNumber value={selectedMonthFinancials.totalExpenses} formatter={v => `- ${fmtMoney(v)}`} />
                      </div>
                    </div>
                    <div className={`mt-3 pt-2.5 border-t ${dividerBorder} text-[11px] font-semibold ${mutedText} flex items-center justify-between`}>
                      <span>Custos operacionais:</span>
                      <span className="font-bold tabular-nums text-rose-500 dark:text-rose-400">
                        Gasolina + Manutenção
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Saldo Atual / Lucro Líquido Real */}
                  <div
                    className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between bg-transparent border ${
                      selectedMonthFinancials.currentBalance >= 0
                        ? 'border-emerald-500/40'
                        : 'border-rose-500/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 dark:text-emerald-400">
                          3. Saldo Atual (Lucro Real)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenAdjustBalance(selectedMonthFinancials.currentBalance)}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-transparent hover:bg-[#FF6A1A]/10 text-[#FF6A1A] border border-[#FF6A1A]/40 transition-colors cursor-pointer flex items-center gap-1 active:scale-95"
                            title="Ajustar Saldo Atual e Gerar Transação Automática"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Ajustar Saldo</span>
                          </button>
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded bg-transparent border ${
                              selectedMonthFinancials.currentBalance >= 0
                                ? 'border-emerald-500/40 text-emerald-500 dark:text-emerald-300'
                                : 'border-rose-500/40 text-rose-500 dark:text-rose-300'
                            }`}
                          >
                            {selectedMonthFinancials.netMarginPct}% livre
                          </span>
                        </div>
                      </div>
                      <div
                        className={`text-xl sm:text-2xl font-black tabular-nums mt-1 ${
                          selectedMonthFinancials.currentBalance >= 0
                            ? 'text-emerald-500 dark:text-emerald-400'
                            : 'text-rose-500 dark:text-rose-400'
                        }`}
                      >
                        <AnimatedNumber value={selectedMonthFinancials.currentBalance} formatter={fmtMoney} />
                      </div>
                    </div>
                    <div className={`mt-3 pt-2.5 border-t ${dividerBorder} text-[11px] font-semibold ${mutedText} flex items-center justify-between`}>
                      <span>Dinheiro limpo:</span>
                      <button
                        type="button"
                        onClick={() => handleOpenAdjustBalance(selectedMonthFinancials.currentBalance)}
                        className="text-[11px] font-bold text-[#FF6A1A] hover:underline flex items-center gap-1 cursor-pointer bg-transparent"
                      >
                        <span>Ajustar Saldo Real</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Card 4: Meta Personalizada Acompanhando o Saldo Atual do Usuário */}
                  {(() => {
                    const customTarget = Math.max(0, Number(dbState.customGoalTarget) || 0);
                    const targetDate = dbState.customGoalTargetDate || getDefaultFutureDate(dbState.customGoalDays || 20);
                    const countdown = getCustomGoalCountdown('date', dbState.customGoalDays, targetDate);
                    const customDays = Math.max(1, countdown.effectiveDays);
                    const customTitle = (dbState.customGoalTitle || '').trim() || 'Meta Personalizada de Saldo';

                    // O campo de meta personalizada acompanha o saldo atual do usuário!
                    const currentBalance = selectedMonthFinancials.currentBalance;
                    const rawPct = customTarget > 0 ? Math.round((currentBalance / customTarget) * 100) : 0;
                    const barPct = Math.min(100, Math.max(0, rawPct));
                    const remainingToGoal = Math.max(0, customTarget - currentBalance);
                    const isGoalReached = customTarget > 0 && currentBalance >= customTarget;
                    const requiredDailyToReachGoal = isGoalReached ? 0 : remainingToGoal / customDays;

                    return (
                      <div className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between bg-transparent border ${dividerBorder}`}>
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6A1A] truncate">
                              4. {customTitle}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setTempFinanceGoalTarget(customTarget);
                                setTempFinanceGoalDate(targetDate);
                                setIsEditingCustomGoalInFinance(prev => !prev);
                              }}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg cursor-pointer transition-colors bg-transparent border ${
                                isEditingCustomGoalInFinance
                                  ? 'border-emerald-500 text-emerald-500 font-black'
                                  : 'border-[#FF6A1A]/40 text-[#FF6A1A] hover:border-[#FF6A1A]'
                              }`}
                            >
                              {isEditingCustomGoalInFinance ? 'Fechar' : 'Ajustar'}
                            </button>
                          </div>

                          <div className="flex items-baseline justify-between gap-1 mt-1">
                            <div className={`text-base sm:text-lg font-black tabular-nums ${currentBalance >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                              <AnimatedNumber value={currentBalance} formatter={fmtMoney} />
                            </div>
                            <div className={`text-xs font-bold tabular-nums ${mutedText}`}>
                              de {fmtMoney(customTarget)} ({rawPct}%)
                            </div>
                          </div>

                          {/* Barra de Progresso da Meta com Saldo Atual (Animada) */}
                          <div className={`w-full h-2 rounded-full overflow-hidden mt-2 ${isDark ? 'bg-neutral-900' : 'bg-slate-200'}`}>
                            <div
                              className={`h-full rounded-full dashboard-progress-fill ${
                                isGoalReached
                                  ? 'bg-emerald-400'
                                  : 'bg-gradient-to-r from-[#FF6A1A] to-amber-400'
                              }`}
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Editor Rápido Inline se acionado */}
                        {isEditingCustomGoalInFinance ? (
                          <div className={`mt-2.5 pt-2 border-t ${dividerBorder} flex flex-col gap-2`}>
                            <div>
                              <label className={`text-[10px] font-bold ${mutedText}`}>Valor da Meta (R$):</label>
                              <FreeNumberInput
                                step="50"
                                value={tempFinanceGoalTarget}
                                onValueChange={v => setTempFinanceGoalTarget(Math.max(50, v))}
                                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-black tabular-nums outline-none ${inputSurface}`}
                              />
                            </div>
                            <div>
                              <label className={`text-[10px] font-bold ${mutedText}`}>Data Término:</label>
                              <input
                                type="date"
                                min={todayStr()}
                                value={tempFinanceGoalDate}
                                onChange={e => setTempFinanceGoalDate(e.target.value)}
                                className={`w-full px-2.5 py-1 rounded-lg text-xs font-black tabular-nums outline-none ${inputSurface}`}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                persistAndEnqueueWorkManager({
                                  ...dbState,
                                  customGoalTarget: tempFinanceGoalTarget,
                                  customGoalTargetDate: tempFinanceGoalDate,
                                  customGoalMode: 'date',
                                });
                                setIsEditingCustomGoalInFinance(false);
                              }}
                              className="w-full py-1.5 rounded-lg text-xs font-black bg-transparent border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                            >
                              Salvar Meta
                            </button>
                          </div>
                        ) : (
                          <div className={`mt-2.5 pt-2 border-t ${dividerBorder} text-[10px] font-semibold ${mutedText} flex items-center justify-between`}>
                            <span>
                              {isGoalReached
                                ? '🎉 Meta batida com saldo positivo!'
                                : `Falta ${fmtMoney(remainingToGoal)} de saldo`}
                            </span>
                            {!isGoalReached && (
                              <span className="font-bold text-[#FF6A1A]">
                                {fmtCurrencyExact(requiredDailyToReachGoal)}/dia
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* SEÇÃO DE PROJEÇÃO / FATURAMENTO FUTURO PREVISTO DO MÊS (Minimalista sem fundo) */}
                <div className="rounded-2xl p-4 sm:p-5 bg-transparent border border-sky-500/35 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-transparent border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs sm:text-sm font-black ${primaryText}`}>
                            Faturamento Futuro Previsto ({selectedMonthFinancials.formattedLabel})
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-transparent text-sky-500 dark:text-sky-400 border border-sky-500/40">
                            {selectedMonthFinancials.projectedList.filter(p => p.status === 'pending').length} agendado{selectedMonthFinancials.projectedList.filter(p => p.status === 'pending').length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${mutedText}`}>
                          Ganhos reais ({fmtMoney(selectedMonthFinancials.totalRevenue)}) + Previsto ({fmtMoney(selectedMonthFinancials.projectedPendingRevenue)}) ={' '}
                          <strong className="text-sky-500 dark:text-sky-400 font-black">
                            Projeção Total: {fmtMoney(selectedMonthFinancials.projectedTotalRevenue)}
                          </strong>
                          {selectedMonthFinancials.projectedDebitedRevenue > 0 && (
                            <span className="block text-[11px] mt-0.5 text-amber-500 dark:text-amber-300">
                              Já debitado pelos dias passados: -{fmtMoney(selectedMonthFinancials.projectedDebitedRevenue)} (de {fmtMoney(selectedMonthFinancials.projectedInitialRevenue)} criados)
                            </span>
                          )}
                          {selectedMonthFinancials.projectedPendingRevenue === 0 &&
                            selectedMonthFinancials.allProjectedPendingCount > 0 && (
                              <span className="block text-[11px] mt-0.5 text-sky-500 dark:text-sky-300">
                                Saldo futuro ativo em outros meses: {fmtMoney(selectedMonthFinancials.allProjectedPendingRevenue)} ({selectedMonthFinancials.allProjectedPendingCount} agendado{selectedMonthFinancials.allProjectedPendingCount === 1 ? '' : 's'})
                              </span>
                            )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openNewProjectedRevenueModal()}
                        className="px-3 py-2 rounded-xl text-xs font-black bg-transparent border border-[#FF6A1A]/60 text-[#FF6A1A] hover:bg-[#FF6A1A]/10 cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        <span>Lançar Faturamento Futuro</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingSubTab('projecao')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold bg-transparent border ${dividerBorder} hover:border-sky-500 text-sky-500 dark:text-sky-400 cursor-pointer transition-all flex items-center gap-1`}
                      >
                        <span>Ver Previsões</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. FAIXA OPERACIONAL RESUMIDA DO MÊS */}
                <div className={`rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-around gap-2 text-xs bg-transparent border ${dividerBorder}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={mutedText}>Dias Trabalhados:</span>
                    <strong className={`${primaryText} font-black`}>{selectedMonthFinancials.activeDays} dias</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={mutedText}>Total Rodado:</span>
                    <strong className={`${primaryText} font-black`}>{selectedMonthFinancials.totalKm.toLocaleString('pt-BR')} km</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={mutedText}>Horas em Rota:</span>
                    <strong className={`${primaryText} font-black`}>{selectedMonthFinancials.totalHours.toFixed(1)}h</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={mutedText}>Rendimento/KM:</span>
                    <strong className="text-[#FF6A1A] font-black">{fmtMoney(selectedMonthFinancials.avgPerKm)}/km</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={mutedText}>Rendimento/Hora:</span>
                    <strong className="text-emerald-500 dark:text-emerald-400 font-black">{fmtMoney(selectedMonthFinancials.avgPerHour)}/h</strong>
                  </div>
                </div>

                {/* SEÇÃO DETALHADA DE RECONCILIAÇÃO FINANCEIRA: SALDO DO MÊS VS. PROVISÃO DA CASA E MOTO (Sem card pesado externo) */}
                {(() => {
                  const houseMonthly = financialIntelligence.monthlyHouseholdCost;
                  const houseRemaining = financialIntelligence.monthlyHouseholdRemaining;
                  const housePaid = financialIntelligence.monthlyHouseholdPaid;
                  const bikeMonthly = financialIntelligence.monthlyBikeExpensesTotal;
                  const curBal = selectedMonthFinancials.currentBalance;
                  const netAfterHouse = curBal - houseRemaining;
                  const isCovered = netAfterHouse >= 0;
                  const missingForHouse = Math.max(0, houseRemaining - curBal);
                  const houseCoveragePct = houseMonthly > 0
                    ? Math.min(100, Math.max(0, Math.round(((housePaid + Math.max(0, curBal)) / houseMonthly) * 100)))
                    : 100;
                  const remainingWorkDays = Math.max(
                    1,
                    financialIntelligence.workDaysPerMonth - selectedMonthFinancials.activeDays
                  );
                  const dailyNeededToCoverHouse = missingForHouse > 0 ? missingForHouse / remainingWorkDays : 0;

                  return (
                    <div className={`py-5 border-y ${dividerBorder} text-xs flex flex-col gap-4`}>
                      {/* Topo da Seção: Título, Status e Botões de Atalho */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-start sm:items-center gap-2.5 flex-wrap">
                          <span className="w-8 h-8 rounded-xl bg-transparent text-blue-400 border border-blue-500/40 flex items-center justify-center text-base shrink-0">
                            🏠
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-blue-500 dark:text-blue-400">
                                Provisão das Contas da Casa & Saldo 100% Livre
                              </h3>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md bg-transparent border ${
                                isCovered
                                  ? 'text-emerald-500 dark:text-emerald-400 border-emerald-500/40'
                                  : 'text-amber-500 dark:text-amber-400 border-amber-500/40'
                              }`}>
                                {isCovered
                                  ? (houseRemaining === 0 ? '✅ Contas da Casa 100% Quitadas no Mês!' : '✅ Contas Restantes da Casa Cobertas!')
                                  : `⏳ ${houseCoveragePct}% das Contas da Casa Coberto`}
                              </span>
                            </div>
                            <p className={`text-[11px] mt-0.5 ${mutedText}`}>
                              Mostra quanto sobra livre no seu bolso após descontar do seu <strong>Saldo Atual do Mês</strong> as contas fixas que ainda restam pagar neste mês.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => setBillingSubTab('despesas_casa')}
                            className="px-2.5 py-1.5 rounded-xl text-[10px] font-black bg-transparent text-blue-500 dark:text-blue-400 hover:bg-blue-500/10 border border-blue-500/40 transition-colors cursor-pointer"
                          >
                            🏠 Editar Contas da Casa ↗
                          </button>
                          <button
                            type="button"
                            onClick={() => setBillingSubTab('despesas_moto')}
                            className="px-2.5 py-1.5 rounded-xl text-[10px] font-black bg-transparent text-[#FF6A1A] hover:bg-[#FF6A1A]/10 border border-[#FF6A1A]/40 transition-colors cursor-pointer"
                          >
                            🏍️ Despesas da Moto ↗
                          </button>
                        </div>
                      </div>

                      {/* Grid da Equação Matemática Passo a Passo (Sub-cards sem fundo) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                        {/* Bloco 1: Saldo Atual do Mês */}
                        <div className={`rounded-xl p-3 bg-transparent border ${dividerBorder}`}>
                          <div className={`text-[10px] font-bold uppercase ${mutedText}`}>
                            1. Saldo Atual em {selectedMonthFinancials.formattedLabel}
                          </div>
                          <div className={`text-base sm:text-lg font-black tabular-nums mt-0.5 ${
                            curBal >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                          }`}>
                            <AnimatedNumber value={curBal} formatter={fmtMoney} />
                          </div>
                          <div className={`text-[10px] mt-1 ${mutedText}`}>
                            Ganhos ({fmtMoney(selectedMonthFinancials.totalRevenue)}) − Gastos lançados ({fmtMoney(selectedMonthFinancials.totalExpenses)})
                          </div>
                        </div>

                        {/* Bloco 2: Provisão Mensal das Contas da Casa Restantes */}
                        <div className="rounded-xl p-3 bg-transparent border border-blue-500/35">
                          <div className="text-[10px] font-bold uppercase text-blue-500 dark:text-blue-400 flex items-center justify-between">
                            <span>2. (−) Contas da Casa a Pagar</span>
                            <span>{financialIntelligence.householdPaidCount}/{financialIntelligence.activeHouseholdExpenses.length} quitadas</span>
                          </div>
                          <div className="text-base sm:text-lg font-black tabular-nums text-blue-500 dark:text-blue-400 mt-0.5">
                            <AnimatedNumber value={houseRemaining} formatter={v => `- ${fmtCurrencyExact(v)}`} />
                          </div>
                          <div className={`text-[10px] mt-1 ${mutedText}`}>
                            {housePaid > 0
                              ? `${fmtMoney(housePaid)} já quitado no mês · Orçamento total: ${fmtMoney(houseMonthly)}`
                              : `Rateio: ${fmtCurrencyExact(financialIntelligence.dailyHouseholdReserve)}/dia útil (${financialIntelligence.workDaysPerMonth} dias)`}
                          </div>
                        </div>

                        {/* Bloco 3: Resultado = Saldo 100% Livre (Após Moto + Casa) */}
                        <div className={`rounded-xl p-3 bg-transparent border ${
                          isCovered
                            ? 'border-emerald-500/40'
                            : 'border-rose-500/40'
                        }`}>
                          <div className={`text-[10px] font-black uppercase ${
                            isCovered ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                          }`}>
                            3. (=) Saldo 100% Livre no Bolso
                          </div>
                          <div className={`text-base sm:text-lg font-black tabular-nums mt-0.5 ${
                            isCovered ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                          }`}>
                            <AnimatedNumber value={netAfterHouse} formatter={fmtMoney} />
                          </div>
                          <div className={`text-[10px] mt-1 font-semibold ${
                            isCovered ? 'text-emerald-600 dark:text-emerald-300/90' : 'text-rose-600 dark:text-rose-300/90'
                          }`}>
                            {isCovered
                              ? (houseRemaining === 0
                                  ? '🎉 Todas as contas da casa do mês estão pagas! Saldo 100% livre!'
                                  : 'Saldo suficiente para quitar todas as contas restantes da casa!')
                              : `Faltam ${fmtMoney(missingForHouse)} para quitar as contas restantes da casa`}
                          </div>
                        </div>

                        {/* Bloco 4: Ritmo Necessário & Reserva da Moto */}
                        <div className={`rounded-xl p-3 bg-transparent border ${dividerBorder}`}>
                          <div className={`text-[10px] font-bold uppercase ${mutedText}`}>
                            4. Meta p/ Quitar Casa no Mês
                          </div>
                          <div className="text-base sm:text-lg font-black tabular-nums text-[#FF6A1A] mt-0.5">
                            {houseRemaining === 0 ? 'R$ 0,00/dia' : `${fmtCurrencyExact(dailyNeededToCoverHouse)}/dia`}
                          </div>
                          <div className={`text-[10px] mt-1 ${mutedText}`}>
                            {houseRemaining === 0
                              ? 'Contas da casa 100% concluídas neste mês!'
                              : `Nos próximos ~${remainingWorkDays} dias úteis (${fmtCurrencyExact(houseRemaining)} restante)`}
                          </div>
                        </div>
                      </div>

                      {/* Barra de Progresso da Cobertura das Contas da Casa (Animada) */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                          <span className={mutedText}>
                            Progresso para cobrir o custo de vida da casa ({fmtMoney(Math.max(0, curBal))} de {fmtMoney(houseMonthly)})
                          </span>
                          <span className={isCovered ? 'text-emerald-500 dark:text-emerald-400 font-black' : 'text-blue-500 dark:text-blue-400 font-black'}>
                            {houseCoveragePct}%
                          </span>
                        </div>
                        <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-neutral-900' : 'bg-slate-200'}`}>
                          <div
                            className={`h-full rounded-full dashboard-progress-fill ${
                              isCovered ? 'bg-emerald-400' : 'bg-gradient-to-r from-blue-500 to-sky-400'
                            }`}
                            style={{ width: `${houseCoveragePct}%` }}
                          />
                        </div>
                      </div>

                      {/* Lista Rápida das Contas da Casa que compõem a Provisão + Explicação do Valor */}
                      <div className={`pt-2 border-t ${dividerBorder} flex flex-col gap-2`}>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${mutedText}`}>
                            Contas da Casa incluídas nesta provisão ({fmtCurrencyExact(houseMonthly)}/mês · + Reserva Moto {fmtCurrencyExact(bikeMonthly)}/mês):
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {financialIntelligence.activeHouseholdExpenses.map(item => (
                            <button
                              key={'pill_house_' + item.id}
                              type="button"
                              onClick={() => {
                                setBillingSubTab('despesas_casa');
                                openEditHouseholdExpenseModal(item);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold bg-transparent border flex items-center gap-1.5 cursor-pointer transition-colors hover:border-blue-400 ${dividerBorder} ${secondaryText}`}
                              title="Clique para editar o valor desta conta da casa"
                            >
                              <span>{item.icon || '🏠'}</span>
                              <span>{item.name}:</span>
                              <strong className="text-blue-500 dark:text-blue-400 tabular-nums">{fmtMoney(item.monthlyAmount)}</strong>
                            </button>
                          ))}
                        </div>

                        {!isCovered && (
                          <div className={`p-2.5 rounded-xl bg-transparent border text-[11px] leading-relaxed ${
                            isDark ? 'border-amber-500/30 text-amber-200/90' : 'border-amber-300 text-amber-900'
                          }`}>
                            💡 <strong>Por que o Saldo 100% Livre está em {fmtMoney(netAfterHouse)}?</strong> Porque o aplicativo já abate antecipadamente todas as suas contas fixas da casa do mês inteiro (<strong>{fmtMoney(houseMonthly)}</strong>) sobre o seu Saldo Atual acumulado até hoje (<strong>{fmtMoney(curBal)}</strong>). À medida que você lançar novas corridas ao longo do mês, esse valor negativo vai subindo até zerar e virar lucro positivo 100% livre!
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 4. CAMPO PRINCIPAL: TODOS OS GANHOS DO MÊS (LISTA ABERTA COM FILTROS SEM CARD PESADO) */}
                <div>
                  {/* Cabeçalho da Lista */}
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${dividerBorder}`}>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                          <span>Todos os Ganhos de {selectedMonthFinancials.formattedLabel}</span>
                        </h2>
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-transparent text-[#FF6A1A] border border-[#FF6A1A]/40 tabular-nums">
                          {selectedMonthFinancials.entries.length} registro(s)
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${mutedText}`}>
                        Extrato detalhado de cada corrida ou entrega lançada neste mês
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openNewEntryModal('ganho', true)}
                        className="px-3.5 py-2 rounded-xl text-xs font-black bg-transparent border border-[#FF6A1A]/60 text-[#FF6A1A] hover:bg-[#FF6A1A]/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Novo Ganho</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowRelatorioMeiModal(true)}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-transparent text-purple-500 dark:text-purple-300 border border-purple-500/40 hover:bg-purple-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                        <span>PDF / MEI</span>
                      </button>
                    </div>
                  </div>

                  {/* Filtro por App e Ordenação */}
                  <div className="my-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    {/* Filtro por Aplicativo */}
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar pb-1">
                      <button
                        type="button"
                        onClick={() => setFinanceAppFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 bg-transparent border ${
                          financeAppFilter === 'all'
                            ? 'border-[#FF6A1A] text-[#FF6A1A]'
                            : `${dividerBorder} ${mutedText} hover:text-current`
                        }`}
                      >
                        Todos ({selectedMonthFinancials.entries.length})
                      </button>
                      {allApps.map(app => {
                        const countInMonth = selectedMonthFinancials.entries.filter(
                          e => e.app === app.id || e.app?.toLowerCase() === app.name.toLowerCase()
                        ).length;
                        if (countInMonth === 0) return null;
                        return (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => setFinanceAppFilter(app.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 bg-transparent border ${
                              financeAppFilter === app.id
                                ? 'border-[#FF6A1A] text-[#FF6A1A]'
                                : `${dividerBorder} ${mutedText} hover:text-current`
                            }`}
                          >
                            <span>{app.icon}</span>
                            <span>{app.name}</span>
                            <span className="opacity-70 text-[10px]">({countInMonth})</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Ordenação */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      <span className={`text-[11px] font-bold ${mutedText}`}>Ordenar:</span>
                      <select
                        value={financeSortOrder}
                        onChange={e => setFinanceSortOrder(e.target.value as any)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold outline-none cursor-pointer ${inputSurface}`}
                      >
                        <option value="date_desc">Mais Recentes</option>
                        <option value="val_desc">Maior Valor</option>
                        <option value="val_asc">Menor Valor</option>
                      </select>
                    </div>
                  </div>

                  {/* Lista de Ganhos Filtrados */}
                  {(() => {
                    const filtered = selectedMonthFinancials.entries.filter(e => {
                      if (financeAppFilter === 'all') return true;
                      return e.app === financeAppFilter || e.app?.toLowerCase() === financeAppFilter.toLowerCase();
                    });

                    const sorted = [...filtered].sort((a, b) => {
                      if (financeSortOrder === 'val_desc') {
                        return (Number(b.revenue) || 0) - (Number(a.revenue) || 0);
                      }
                      if (financeSortOrder === 'val_asc') {
                        return (Number(a.revenue) || 0) - (Number(b.revenue) || 0);
                      }
                      return (b.date || '').localeCompare(a.date || '') || Number(b.id) - Number(a.id);
                    });

                    if (sorted.length === 0) {
                      return (
                        <div className={`p-8 rounded-2xl bg-transparent border border-dashed ${dividerBorder} text-center flex flex-col items-center justify-center gap-3 my-2`}>
                          <div className="w-12 h-12 rounded-2xl bg-transparent border border-[#FF6A1A]/40 text-[#FF6A1A] flex items-center justify-center">
                            <Fuel className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold">
                              Nenhum ganho encontrado para {selectedMonthFinancials.formattedLabel}
                            </h3>
                            <p className={`text-xs mt-1 max-w-sm ${mutedText}`}>
                              {financeAppFilter !== 'all'
                                ? 'Nenhum ganho cadastrado para este aplicativo neste mês.'
                                : 'Você ainda não registrou nenhuma corrida ou entrega neste mês.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openNewEntryModal('ganho', true)}
                            className="px-4 py-2 rounded-xl text-xs font-black bg-transparent border border-[#FF6A1A] text-[#FF6A1A] hover:bg-[#FF6A1A]/10 transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Lançar Corrida Neste Mês</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-2.5 mt-2">
                        {sorted.map(entry => {
                          const appInfo = allApps.find(
                            a => a.id === entry.app || a.name.toLowerCase() === (entry.app || '').toLowerCase()
                          ) || { id: entry.app || 'outros', name: entry.app || 'Outros', icon: '🛵' };

                          const shiftInfo = allShifts.find(s => s.id === entry.shift);
                          const rev = Number(entry.revenue || 0);
                          const km = Number(entry.km || 0);
                          const hours = Number(entry.hours || 0);
                          const ratePerKm = km > 0 ? rev / km : 0;

                          const avgKmBase = Math.max(20, financialIntelligence.dailyKm || 90);
                          const bikeCostPerKmRide =
                            (financialIntelligence.dailyFuelCost +
                              financialIntelligence.dailyMaintReserve +
                              financialIntelligence.dailyDocsReserve) /
                            avgKmBase;
                          const housePersonalPerKmRide =
                            (financialIntelligence.dailyHouseholdReserve +
                              financialIntelligence.dailyFoodCost) /
                            avgKmBase;

                          const rideBikeCost = km > 0 ? km * bikeCostPerKmRide : 0;
                          const rideHousePersonalCost = km > 0 ? km * housePersonalPerKmRide : 0;
                          const netAfterBike = rev - rideBikeCost;
                          const netAfterBikeAndHouse = netAfterBike - rideHousePersonalCost;

                          return (
                            <div
                              key={entry.id}
                              className={`rounded-2xl p-3 sm:p-4 bg-transparent border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${dividerBorder} hover:border-[#FF6A1A]/50`}
                            >
                              {/* Lado Esquerdo: App, Data, Turno */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-xl bg-transparent border ${dividerBorder} flex items-center justify-center text-xl shrink-0`}>
                                  {appInfo.icon}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs sm:text-sm font-black truncate">
                                      {appInfo.name}
                                    </span>
                                    {shiftInfo && (
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-transparent border ${dividerBorder} ${mutedText}`}>
                                        {shiftInfo.name.split(' ')[0]}
                                      </span>
                                    )}
                                  </div>
                                  <div className={`text-[11px] font-semibold mt-0.5 ${mutedText} flex items-center gap-2 flex-wrap`}>
                                    <span>📅 {formatPtBrDate(entry.date)}</span>
                                    {km > 0 && <span>· {km} km</span>}
                                    {hours > 0 && <span>· {hours}h</span>}
                                    {ratePerKm > 0 && <span>· {fmtMoney(ratePerKm)}/km bruto</span>}
                                  </div>
                                  {km > 0 && (
                                    <div className="flex items-center gap-2 flex-wrap mt-1 text-[10px] font-bold">
                                      <span className="px-1.5 py-0.5 rounded bg-transparent border border-amber-500/35 text-amber-500 dark:text-amber-400 tabular-nums">
                                        🏍️ Após Moto: {fmtCurrencyExact(netAfterBike)}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded bg-transparent border tabular-nums ${
                                          netAfterBikeAndHouse >= 0
                                            ? 'border-emerald-500/35 text-emerald-500 dark:text-emerald-400'
                                            : 'border-rose-500/35 text-rose-500 dark:text-rose-400'
                                        }`}
                                      >
                                        🏠 Livre (após Moto + Casa/Pessoal): {fmtCurrencyExact(netAfterBikeAndHouse)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Lado Direito: Valor e Ações */}
                              <div className={`flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 ${dividerBorder}`}>
                                <div className="text-right">
                                  <div className="text-base sm:text-lg font-black text-emerald-500 dark:text-emerald-400 tabular-nums dashboard-number-anim">
                                    + {fmtMoney(rev)}
                                  </div>
                                  <span className={`text-[10px] block ${mutedText}`}>Faturamento bruto</span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditHistoryItem(entry, 'ganho')}
                                    className={`p-2 rounded-xl ${mutedText} hover:text-current cursor-pointer transition-colors bg-transparent border ${dividerBorder}`}
                                    title="Editar corrida"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      persistAndEnqueueWorkManager({
                                        ...dbState,
                                        entries: dbState.entries.filter(e => e.id !== entry.id),
                                        deletedEntryIds: Array.from(
                                          new Set([...(dbState.deletedEntryIds || []), Number(entry.id)])
                                        ),
                                      });
                                    }}
                                    className={`p-2 rounded-xl text-rose-500 dark:text-rose-400 hover:text-rose-300 cursor-pointer transition-colors bg-transparent border ${dividerBorder}`}
                                    title="Excluir corrida"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ================= SUB-ABA: FATURAMENTO FUTURO PREVISTO & PROJEÇÃO (Minimalista AllBlack) ================= */}
            {billingSubTab === 'projecao' && (
              <div className="flex flex-col gap-5 sm:gap-6">
                {/* 1. BARRA DE NAVEGAÇÃO DE MÊS DA PROJEÇÃO (Sem card pesado) */}
                <div className={`pb-5 border-b ${dividerBorder}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-black flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-sky-400" />
                          <span>Mês de Projeção: {selectedMonthFinancials.formattedLabel}</span>
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-transparent border ${
                            selectedMonthFinancials.isCurrentMonth
                              ? 'text-emerald-500 dark:text-emerald-400 border-emerald-500/40'
                              : 'text-sky-500 dark:text-sky-400 border-sky-500/40'
                          }`}
                        >
                          {selectedMonthFinancials.isCurrentMonth ? 'Mês Atual' : 'Competência Selecionada'}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${mutedText}`}>
                        Acompanhe quanto você já faturou e quanto ainda tem previsto para entrar neste mês
                      </p>
                    </div>

                    {/* Controles de Navegação */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const [y, m] = selectedFinanceMonth.split('-').map(Number);
                          const d = new Date(y, m - 2, 1);
                          setSelectedFinanceMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                        }}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 bg-transparent border ${dividerBorder} hover:border-[#FF6A1A]`}
                        title="Mês Anterior"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        <span className="hidden sm:inline">Anterior</span>
                      </button>

                      <div className="relative">
                        <select
                          value={selectedFinanceMonth}
                          onChange={e => setSelectedFinanceMonth(e.target.value)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black outline-none cursor-pointer appearance-none pr-8 ${inputSurface}`}
                        >
                          {availableFinanceMonths.map(ym => {
                            const [y, m] = ym.split('-');
                            const name = PT_BR_MONTH_NAMES[parseInt(m, 10) - 1] || m;
                            const now = new Date();
                            const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                            return (
                              <option key={ym} value={ym}>
                                {name} de {y} {ym === nowYM ? '· (Atual)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-70" />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const [y, m] = selectedFinanceMonth.split('-').map(Number);
                          const d = new Date(y, m, 1);
                          setSelectedFinanceMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                        }}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 bg-transparent border ${dividerBorder} hover:border-[#FF6A1A]`}
                        title="Próximo Mês"
                      >
                        <span className="hidden sm:inline">Próximo</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {!selectedMonthFinancials.isCurrentMonth && (
                        <button
                          type="button"
                          onClick={() => {
                            const now = new Date();
                            setSelectedFinanceMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                          }}
                          className="px-2.5 py-2 rounded-xl text-xs font-black bg-transparent text-[#FF6A1A] hover:bg-[#FF6A1A]/10 border border-[#FF6A1A]/50 cursor-pointer transition-colors"
                        >
                          Ir p/ Mês Atual
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. OS 4 CARDS DE MÉTRICAS DA PROJEÇÃO (Sem fundo, apenas bordas finas e números animados) */}
                {(() => {
                  const totalExpensesMonth = (financialIntelligence.monthlyBikeCostsTotal || 0) + (financialIntelligence.monthlyHouseholdCost || 0);
                  const lucroProjetado = selectedMonthFinancials.projectedTotalRevenue - totalExpensesMonth;
                  const cobriuDespesas = selectedMonthFinancials.projectedTotalRevenue >= totalExpensesMonth && totalExpensesMonth > 0;

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      {/* Card 1: Previsto a Receber */}
                      <div className="rounded-2xl p-4 sm:p-5 flex flex-col justify-between bg-transparent border border-sky-500/40">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-sky-500 dark:text-sky-400">
                              1. Previsto a Receber
                            </span>
                            <span className="text-[10px] font-bold text-sky-500 dark:text-sky-400 bg-transparent border border-sky-500/35 px-1.5 py-0.5 rounded">
                              {selectedMonthFinancials.projectedList.filter(p => p.status === 'pending').length} agendados
                            </span>
                          </div>
                          <div className="text-xl sm:text-2xl font-black tabular-nums text-sky-500 dark:text-sky-400 mt-1">
                            <AnimatedNumber value={selectedMonthFinancials.projectedPendingRevenue} formatter={fmtMoney} />
                          </div>
                        </div>
                        <div className={`mt-3 pt-2.5 border-t ${dividerBorder} text-[11px] font-semibold ${mutedText}`}>
                          {selectedMonthFinancials.projectedDebitedRevenue > 0 ? (
                            <span>
                              Criado: {fmtMoney(selectedMonthFinancials.projectedInitialRevenue)} · Debitado: -{fmtMoney(selectedMonthFinancials.projectedDebitedRevenue)}
                            </span>
                          ) : selectedMonthFinancials.projectedPendingRevenue === 0 &&
                            selectedMonthFinancials.allProjectedPendingCount > 0 ? (
                            <span className="text-sky-500 dark:text-sky-300">
                              Total geral pendente: {fmtMoney(selectedMonthFinancials.allProjectedPendingRevenue)} ({selectedMonthFinancials.allProjectedPendingCount} em outros meses)
                            </span>
                          ) : (
                            <span>Saldo futuro aguardando realização</span>
                          )}
                        </div>
                      </div>

                      {/* Card 2: Faturamento Já Realizado */}
                      <div className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between bg-transparent border ${dividerBorder}`}>
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${mutedText}`}>
                              2. Já Realizado no Mês
                            </span>
                            <span className="text-[10px] font-bold text-[#FF6A1A] bg-transparent border border-[#FF6A1A]/35 px-1.5 py-0.5 rounded">
                              {selectedMonthFinancials.entries.length} corridas
                            </span>
                          </div>
                          <div className="text-xl sm:text-2xl font-black tabular-nums text-[#FF6A1A] mt-1">
                            <AnimatedNumber value={selectedMonthFinancials.totalRevenue} formatter={fmtMoney} />
                          </div>
                        </div>
                        <div className={`mt-3 pt-2.5 border-t ${dividerBorder} text-[11px] font-semibold ${mutedText}`}>
                          Corridas e ganhos confirmados
                        </div>
                      </div>

                      {/* Card 3: Projeção Total do Mês (Real + Previsto) */}
                      <div className="rounded-2xl p-4 sm:p-5 flex flex-col justify-between bg-transparent border border-emerald-500/40">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 dark:text-emerald-400">
                              3. Projeção Total
                            </span>
                            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-transparent border border-emerald-500/40 text-emerald-500 dark:text-emerald-300">
                              Real + Previsto
                            </span>
                          </div>
                          <div className="text-xl sm:text-2xl font-black tabular-nums text-emerald-500 dark:text-emerald-400 mt-1">
                            <AnimatedNumber value={selectedMonthFinancials.projectedTotalRevenue} formatter={fmtMoney} />
                          </div>
                        </div>
                        <div className={`mt-3 pt-2.5 border-t ${dividerBorder} text-[11px] font-semibold ${mutedText}`}>
                          Potencial de faturamento do mês
                        </div>
                      </div>

                      {/* Card 4: Balanço Projetado vs. Despesas do Mês */}
                      <div className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between bg-transparent border ${
                        lucroProjetado >= 0
                          ? 'border-emerald-500/40'
                          : 'border-rose-500/40'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 dark:text-emerald-400">
                              4. Lucro Limpo Projetado
                            </span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded bg-transparent border ${
                              cobriuDespesas ? 'border-emerald-500/40 text-emerald-500 dark:text-emerald-300' : 'border-amber-500/40 text-amber-500 dark:text-amber-300'
                            }`}>
                              {cobriuDespesas ? '✅ Cobre Contas' : '⏳ A Cobrir'}
                            </span>
                          </div>
                          <div className={`text-xl sm:text-2xl font-black tabular-nums mt-1 ${
                            lucroProjetado >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                          }`}>
                            <AnimatedNumber value={lucroProjetado} formatter={fmtMoney} />
                          </div>
                        </div>
                        <div className={`mt-3 pt-2.5 border-t ${dividerBorder} text-[11px] font-semibold ${mutedText}`}>
                          Após pagar R$ {fmtMoney(totalExpensesMonth).replace('R$', '').trim()} (Casa + Moto)
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 4. BARRA DE FILTROS DE STATUS DAS PREVISÕES */}
                {(() => {
                  const rawList: ProjectedRevenueItem[] = Array.isArray(dbState.projectedRevenues)
                    ? dbState.projectedRevenues
                    : [];

                  const monthList = rawList.filter(p => {
                    if (Array.isArray(p.selectedDates) && p.selectedDates.length > 0) {
                      return p.selectedDates.some(d => d && d.startsWith(selectedFinanceMonth));
                    }
                    if (p.date && p.date.startsWith(selectedFinanceMonth)) return true;
                    if (p.startDate && p.startDate.startsWith(selectedFinanceMonth)) return true;
                    if (p.startDate && p.date && p.startDate.length >= 7 && p.date.length >= 7) {
                      return p.startDate.slice(0, 7) <= selectedFinanceMonth && p.date.slice(0, 7) >= selectedFinanceMonth;
                    }
                    return false;
                  });

                  const pendingCount = monthList.filter(p => p.status === 'pending').length;
                  const realizedCount = monthList.filter(p => p.status === 'realized').length;
                  const cancelledCount = monthList.filter(p => p.status === 'cancelled').length;

                  const displayedList = monthList.filter(p => {
                    if (projectedStatusFilter === 'all') return true;
                    return p.status === projectedStatusFilter;
                  }).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

                  const today = todayStr();

                  return (
                    <div className="space-y-3">
                      {/* Filtros em Pílulas Sem Fundo */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            { id: 'all', label: 'Todas as Previsões', count: monthList.length },
                            { id: 'pending', label: '⏳ Pendentes', count: pendingCount },
                            { id: 'realized', label: '✅ Recebidas / Realizadas', count: realizedCount },
                            { id: 'cancelled', label: '🚫 Canceladas', count: cancelledCount },
                          ].map(f => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setProjectedStatusFilter(f.id as any)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-transparent border ${
                                projectedStatusFilter === f.id
                                  ? 'border-sky-400 text-sky-500 dark:text-sky-400 font-black'
                                  : `${dividerBorder} ${mutedText} hover:text-current`
                              }`}
                            >
                              <span>{f.label}</span>
                              <span className="ml-1.5 opacity-80 font-normal">({f.count})</span>
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => openNewProjectedRevenueModal()}
                          className="px-3 py-1.5 rounded-xl text-xs font-black bg-transparent hover:bg-[#FF6A1A]/10 text-[#FF6A1A] border border-[#FF6A1A]/50 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Nova Previsão</span>
                        </button>
                      </div>

                      {/* 5. LISTA DE CARDS DE FATURAMENTO PREVISTO (Minimalista sem fundo) */}
                      {displayedList.length === 0 ? (
                        <div className={`p-8 text-center rounded-2xl bg-transparent border border-dashed ${dividerBorder}`}>
                          <div className="w-12 h-12 rounded-2xl bg-transparent border border-sky-500/40 text-sky-400 mx-auto flex items-center justify-center text-2xl mb-3">
                            🔮
                          </div>
                          <div className={`text-sm font-black ${secondaryText}`}>
                            Nenhum faturamento futuro previsto encontrado para {selectedMonthFinancials.formattedLabel}
                          </div>
                          {selectedMonthFinancials.allProjectedPendingCount > 0 && selectedMonthFinancials.firstOtherProjectedMonth ? (
                            <div className="mt-2 space-y-2">
                              <p className={`text-xs max-w-md mx-auto ${mutedText}`}>
                                Você possui {selectedMonthFinancials.allProjectedPendingCount} lançamento(s) futuro(s) somando{' '}
                                <strong className="text-sky-400">{fmtMoney(selectedMonthFinancials.allProjectedPendingRevenue)}</strong>{' '}
                                programado(s) em outro mês.
                              </p>
                              <button
                                type="button"
                                onClick={() => setSelectedFinanceMonth(selectedMonthFinancials.firstOtherProjectedMonth!)}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-transparent border border-sky-500/50 text-sky-400 hover:bg-sky-500/10 cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Ir para mês com lançamentos ({selectedMonthFinancials.firstOtherProjectedMonth})</span>
                              </button>
                            </div>
                          ) : (
                            <p className={`text-xs mt-1 max-w-md mx-auto ${mutedText}`}>
                              Defina quantos dias vai trabalhar e o valor da diária prevista para acompanhar o saldo futuro sendo debitado automaticamente a cada dia que passa!
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => openNewProjectedRevenueModal()}
                            className="mt-4 px-4 py-2 rounded-xl text-xs font-black bg-transparent border border-[#FF6A1A] text-[#FF6A1A] hover:bg-[#FF6A1A]/10 cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                            <span>Lançar Primeiro Faturamento Previsto</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                          {displayedList.map(item => {
                            const bal = computeProjectedRevenueBalance(item, today);
                            const daysDiff = calculateDaysDifference(today, item.date);
                            const isToday = item.date === today;
                            const isPast = item.date < today;
                            const isCancelled = item.status === 'cancelled';
                            const isRealized = item.status === 'realized';
                            const isPending = item.status === 'pending';
                            const headlineAmount = isPending ? bal.remainingAmount : bal.totalAmount;

                            return (
                              <div
                                key={item.id}
                                className={`rounded-2xl p-4 sm:p-5 bg-transparent border transition-all flex flex-col justify-between gap-3 ${
                                  isRealized
                                    ? 'border-emerald-500/40'
                                    : isCancelled
                                    ? `${dividerBorder} opacity-60`
                                    : isToday
                                    ? 'border-amber-500/70'
                                    : 'border-sky-500/35'
                                }`}
                              >
                                {/* Header do Card: App, Descrição, Data & Status */}
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base font-black bg-transparent border ${
                                        isRealized
                                          ? 'border-emerald-500/40 text-emerald-400'
                                          : isCancelled
                                          ? `${dividerBorder} text-slate-400`
                                          : 'border-sky-500/40 text-sky-400'
                                      }`}>
                                        {item.app === 'iFood'
                                          ? '🔴'
                                          : item.app === '99Moto'
                                          ? '🟡'
                                          : item.app === 'Uber Flash'
                                          ? '⚫'
                                          : item.app === 'Rappi'
                                          ? '🟠'
                                          : item.app === 'Frete'
                                          ? '📦'
                                          : '🛵'}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className={`text-xs sm:text-sm font-black truncate ${isCancelled ? 'line-through' : ''}`}>
                                            {item.description}
                                          </span>
                                          {item.app && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-transparent border ${dividerBorder} ${mutedText}`}>
                                              {item.app}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-[11px] font-bold flex-wrap">
                                          <span className={mutedText}>
                                            📅 {bal.selectedDates.length > 1
                                              ? `${bal.selectedDates.length} dias (${bal.selectedDates.slice(0, 3).map(d => d.slice(8, 10) + '/' + d.slice(5, 7)).join(', ')}${bal.selectedDates.length > 3 ? ` +${bal.selectedDates.length - 3}` : ''})`
                                              : bal.hasDailySchedule && bal.startDate !== item.date
                                              ? `${formatPtBrDate(bal.startDate)} → ${formatPtBrDate(item.date)}`
                                              : formatPtBrDate(item.date)}
                                          </span>
                                          {isPending && (
                                            isToday ? (
                                              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-transparent text-amber-500 dark:text-amber-300 border border-amber-500/40 animate-pulse">
                                                🚨 Hoje
                                              </span>
                                            ) : daysDiff === 1 ? (
                                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-transparent text-sky-500 dark:text-sky-300 border border-sky-500/40">
                                                📅 Amanhã
                                              </span>
                                            ) : daysDiff > 1 ? (
                                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold bg-transparent border ${dividerBorder} ${secondaryText}`}>
                                                em {daysDiff} dias
                                              </span>
                                            ) : isPast ? (
                                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-transparent text-rose-500 dark:text-rose-300 border border-rose-500/40">
                                                ⚠️ Data passou
                                              </span>
                                            ) : null
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Status Badge & Saldo */}
                                    <div className="shrink-0 text-right">
                                      {isRealized ? (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-transparent text-emerald-500 dark:text-emerald-400 border border-emerald-500/40">
                                          ✅ Recebido
                                        </span>
                                      ) : isCancelled ? (
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-transparent ${mutedText} border ${dividerBorder}`}>
                                          🚫 Cancelado
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-transparent text-sky-500 dark:text-sky-400 border border-sky-500/40">
                                          {bal.hasDailySchedule ? `⏳ Restam ${bal.remainingDays}d` : '⏳ Previsto'}
                                        </span>
                                      )}
                                      <div className={`text-base sm:text-lg font-black tabular-nums mt-1 dashboard-number-anim ${
                                        isCancelled
                                          ? 'line-through text-slate-500'
                                          : isRealized
                                          ? 'text-emerald-500 dark:text-emerald-400'
                                          : 'text-[#FF6A1A]'
                                      }`}>
                                        {fmtMoney(headlineAmount)}
                                      </div>
                                      {isPending && bal.hasDailySchedule && bal.debitedAmount > 0 && (
                                        <div className={`text-[10px] font-bold ${mutedText}`}>
                                          de {fmtMoney(bal.totalAmount)}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {bal.hasDailySchedule && (
                                    <div className={`mt-2.5 p-2.5 rounded-xl bg-transparent border ${dividerBorder} space-y-1.5`}>
                                      <div className="flex items-center justify-between gap-2 text-[11px] font-bold flex-wrap">
                                        <span className={secondaryText}>
                                          {bal.workDays} dias × {fmtMoney(bal.dailyRate)}/dia ={' '}
                                          <strong className={primaryText}>{fmtMoney(bal.totalAmount)}</strong>
                                        </span>
                                        {isPending && (
                                          <span className={bal.debitedAmount > 0 ? 'text-amber-500 dark:text-amber-300 font-black' : mutedText}>
                                            {bal.debitedAmount > 0
                                              ? `Debitado (${bal.elapsedDays}d): -${fmtMoney(bal.debitedAmount)}`
                                              : 'Débito diário automático ativo'}
                                          </span>
                                        )}
                                      </div>
                                      {isPending && (
                                        <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                                          <div
                                            className="h-full rounded-full bg-sky-500 dashboard-progress-fill"
                                            style={{ width: `${Math.max(4, 100 - bal.progressPct)}%` }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {item.notes && (
                                    <div className={`mt-2 p-2 rounded-xl text-xs font-medium bg-transparent border ${dividerBorder}`}>
                                      <span className={mutedText}>Obs: </span>
                                      <span>{item.notes}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Rodapé com Ações Rápidas (Botões sem fundo) */}
                                <div className={`pt-2.5 border-t ${dividerBorder} flex items-center justify-between gap-2 flex-wrap`}>
                                  {isPending && (
                                    <button
                                      type="button"
                                      onClick={() => handleConvertProjectedToReal(item)}
                                      className="py-1.5 px-3 rounded-xl text-xs font-black bg-transparent border border-emerald-500/60 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer transition-colors flex items-center gap-1.5"
                                      title="Confirmar que o ganho foi recebido e lançar nos seus ganhos reais do mês"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Confirmar Recebimento (Lançar Ganho)</span>
                                    </button>
                                  )}

                                  {isRealized && (
                                    <span className="text-[11px] font-bold text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Já computado no seu faturamento real</span>
                                    </span>
                                  )}

                                  <div className="flex items-center gap-1.5 ml-auto">
                                    <button
                                      type="button"
                                      onClick={() => openEditProjectedRevenueModal(item)}
                                      className={`p-1.5 rounded-lg text-xs font-bold bg-transparent border ${dividerBorder} hover:text-current cursor-pointer transition-colors`}
                                      title="Editar previsão"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleToggleProjectedCancelled(item.id)}
                                      className={`p-1.5 rounded-lg text-xs font-bold bg-transparent border ${dividerBorder} ${
                                        isCancelled ? 'text-emerald-500 dark:text-emerald-400' : `${mutedText} hover:text-current`
                                      } cursor-pointer transition-colors`}
                                      title={isCancelled ? 'Reativar previsão' : 'Anular previsão'}
                                    >
                                      {isCancelled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteProjectedRevenue(item.id)}
                                      className={`p-1.5 rounded-lg text-xs font-bold bg-transparent border ${dividerBorder} text-rose-500 dark:text-rose-400 hover:text-rose-300 cursor-pointer transition-colors`}
                                      title="Excluir previsão"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ================= SUB-ABA: DESPESAS DA MOTO & CUSTOS OPERACIONAIS ================= */}
            {billingSubTab === 'despesas_moto' && (
              <div className="flex flex-col gap-4 sm:gap-6">
                {/* TOPO: CARDS DE RESUMO DOS CUSTOS OPERACIONAIS DA MOTO */}
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/50">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-8 h-8 rounded-xl bg-[#FF6A1A]/15 text-[#FF6A1A] flex items-center justify-center text-lg">
                          🏍️
                        </span>
                        <h2 className="text-base sm:text-lg font-black">
                          Despesas da Moto & Custos Operacionais
                        </h2>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#FF6A1A]/15 text-[#FF6A1A] border border-[#FF6A1A]/30">
                          Manutenção, Gasolina & Oficina
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${mutedText}`}>
                        Cadastre combustível, óleo, pneus, kit relação, freios, seguro, IPVA e revisões. O app rateia o valor pelos seus dias de trabalho para você nunca ser pego de surpresa na oficina!
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={openNewBikeExpenseModal}
                        className="px-3.5 py-2 rounded-xl text-xs font-black bg-[#FF6A1A] hover:bg-[#ff7b33] text-black transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#FF6A1A]/20"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Nova Despesa da Moto</span>
                      </button>
                      <button
                        type="button"
                        onClick={resetDefaultBikeExpenses}
                        className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${surfaceSubtle} hover:border-slate-700`}
                        title="Restaurar lista sugerida com peças, combustível e manutenção padrão"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline ml-1">Restaurar Padrão</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Cards de Métricas da Moto */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
                    {/* 1. Total Mensal da Moto */}
                    <div className={`rounded-2xl p-3.5 sm:p-4 border-l-4 border-l-[#FF6A1A] ${surfaceSubtle}`}>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-[#FF6A1A] flex items-center gap-1.5 font-black">
                          <span>🏍️</span>
                          <span>Total Custos Moto a Pagar</span>
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#FF6A1A]/15 text-[#FF6A1A]">
                          {financialIntelligence.bikePaidCount}/{financialIntelligence.activeBikeExpenses.length} quitadas
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-[#FF6A1A] tabular-nums">
                        {fmtCurrencyExact(financialIntelligence.monthlyBikeRemaining)}
                      </div>
                      <div className={`text-xs mt-1 font-semibold ${mutedText}`}>
                        {financialIntelligence.monthlyBikePaid > 0
                          ? `${fmtMoney(financialIntelligence.monthlyBikePaid)} já quitado · Orçamento: ${fmtMoney(financialIntelligence.monthlyBikeExpensesTotal)}`
                          : `Orçamento total definido: ${fmtMoney(financialIntelligence.monthlyBikeExpensesTotal)}`}
                      </div>
                    </div>

                    {/* 2. Rateio Diário Obrigatório */}
                    <div className={`rounded-2xl p-3.5 sm:p-4 border-l-4 border-l-amber-500 ${surfaceSubtle}`}>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-amber-400 flex items-center gap-1.5 font-black">
                          <span>📅</span>
                          <span>Separar por Dia (Restante)</span>
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                          {financialIntelligence.workDaysPerMonth} dias úteis
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                        {fmtCurrencyExact(financialIntelligence.dailyBikeRemainingReserve)}
                        <span className="text-xs font-semibold ml-1 text-slate-400">/dia</span>
                      </div>
                      <div className={`text-xs mt-1 font-semibold ${mutedText}`}>
                        {financialIntelligence.monthlyBikeRemaining === 0
                          ? '🎉 100% dos custos da moto quitados no mês!'
                          : `${fmtCurrencyExact(financialIntelligence.weeklyBikeRemainingReserve)}/semana restante`}
                      </div>
                    </div>

                    {/* 3. % do Faturamento Comprometido */}
                    <div className={`rounded-2xl p-3.5 sm:p-4 border-l-4 border-l-orange-500 ${surfaceSubtle}`}>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-orange-400 flex items-center gap-1.5 font-black">
                          <span>📊</span>
                          <span>Impacto no Ganho</span>
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400">
                          Operação Moto
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-orange-400 tabular-nums">
                        {financialIntelligence.bikeExpensesPctOfGross}%
                        <span className="text-xs font-semibold ml-1 text-slate-400">do bruto</span>
                      </div>
                      <div className={`text-xs mt-1 font-semibold ${mutedText}`}>
                        Base de {fmtCurrencyExact(financialIntelligence.dailyGross)}/dia
                      </div>
                    </div>

                    {/* 4. Ponto de Equilíbrio da Moto (Break-Even da Moto) */}
                    <div className="rounded-2xl p-3.5 sm:p-4 border-2 border-amber-500/40 bg-amber-500/10">
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-amber-400 flex items-center gap-1.5 font-black">
                          <span>⚖️</span>
                          <span>Ponto de Equilíbrio Moto</span>
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          Mínimo
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                        {fmtCurrencyExact(financialIntelligence.breakEvenBikeDaily)}
                        <span className="text-xs font-semibold ml-1 text-amber-300">/dia</span>
                      </div>
                      <div className="text-xs mt-1 font-semibold text-amber-300/90 truncate">
                        Para não pagar para trabalhar
                      </div>
                    </div>
                  </div>

                  {/* Banner Explicativo */}
                  <div className={`mt-4 p-3.5 sm:p-4 rounded-2xl border text-xs leading-relaxed flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-transparent ${dividerBorder}`}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">💡</span>
                      <div>
                        <strong className="text-[#FF6A1A] block font-black mb-0.5">
                          O Segredo da Moto Sem Dívidas: Blindagem da Máquina de Fazer Dinheiro
                        </strong>
                        <p className={mutedText}>
                          1. <strong>Combustível & Abastecimento</strong> · 2. <strong>Peças de Desgaste (Óleo, Pneus, Relação, Freios)</strong> · 3. <strong>Documentos & Seguro</strong>. Separando diariamente a reserva da moto de <strong>{fmtCurrencyExact(financialIntelligence.dailyBikeExpensesReserve)}/dia</strong>, você troca peças no prazo correto e nunca para de rodar por falta de dinheiro!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FILTRO POR CATEGORIA, MÊS, STATUS E LISTAGEM DAS CONTAS DA MOTO */}
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                  <div className={`flex flex-col gap-3 mb-4 pb-4 border-b ${dividerBorder}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black">
                          Suas Contas e Despesas da Moto
                        </h3>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-transparent border ${dividerBorder} ${secondaryText}`}>
                          {financialIntelligence.rawBikeExpenses.length} cadastradas
                        </span>
                      </div>

                      {/* Seletor / Navegação de Mês de Competência */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const [y, m] = selectedFinanceMonth.split('-').map(Number);
                            const d = new Date(y, m - 2, 1);
                            setSelectedFinanceMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 ${surfaceSubtle} hover:border-[#FF6A1A]`}
                          title="Mês Anterior"
                        >
                          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                          <span className="hidden sm:inline">Anterior</span>
                        </button>

                        <div className="relative">
                          <select
                            value={selectedFinanceMonth}
                            onChange={e => setSelectedFinanceMonth(e.target.value)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black outline-none cursor-pointer appearance-none pr-7 ${inputSurface}`}
                          >
                            {availableFinanceMonths.map(ym => {
                              const [y, m] = ym.split('-');
                              const name = PT_BR_MONTH_NAMES[parseInt(m, 10) - 1] || m;
                              const now = new Date();
                              const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                              const isFuture = ym > nowYM;
                              return (
                                <option key={ym} value={ym}>
                                  {name} de {y} {ym === nowYM ? '· (Atual)' : isFuture ? '· (Futuro)' : ''}
                                </option>
                              );
                            })}
                          </select>
                          <ChevronDown className="w-3 h-3 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70" />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const [y, m] = selectedFinanceMonth.split('-').map(Number);
                            const d = new Date(y, m, 1);
                            setSelectedFinanceMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 ${surfaceSubtle} hover:border-[#FF6A1A]`}
                          title="Próximo Mês"
                        >
                          <span className="hidden sm:inline">Próximo</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        {selectedFinanceMonth !== `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` && (
                          <button
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              setSelectedFinanceMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-[#FF6A1A]/15 text-[#FF6A1A] hover:bg-[#FF6A1A]/25 border border-[#FF6A1A]/30 cursor-pointer transition-colors"
                          >
                            Mês Atual
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filtros de Status (Todas, A Pagar, Quitadas, Vencidas) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/30">
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full pb-0.5">
                        <span className={`text-[10px] font-bold uppercase mr-1 ${mutedText}`}>Status:</span>
                        {[
                          { id: 'all', label: 'Todas' },
                          { id: 'pending', label: `⏳ A Pagar (${financialIntelligence.bikePendingCount})` },
                          { id: 'paid', label: `✅ Quitadas (${financialIntelligence.bikePaidCount})` },
                          { id: 'overdue', label: '🚨 Vencidas' },
                        ].map(st => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setBikeStatusFilter(st.id as any)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                              bikeStatusFilter === st.id
                                ? st.id === 'paid'
                                  ? 'bg-emerald-600 text-white font-black'
                                  : st.id === 'overdue'
                                  ? 'bg-rose-600 text-white font-black'
                                  : 'bg-[#FF6A1A] text-black font-black'
                                : `${surfaceSubtle} ${mutedText} hover:text-current`
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>

                      {/* Filtros Rápidos de Categoria */}
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full pb-0.5">
                        <span className={`text-[10px] font-bold uppercase mr-1 ${mutedText}`}>Categoria:</span>
                        {[
                          { id: 'all', label: 'Todas' },
                          { id: 'combustivel', label: '⛽ Combustível' },
                          { id: 'manutencao', label: '🔧 Peças' },
                          { id: 'documentacao', label: '📄 Docs/IPVA' },
                          { id: 'seguro', label: '🛡️ Seguro' },
                          { id: 'equipamento', label: '🪖 Equipamentos' },
                          { id: 'outros', label: 'Outros' },
                        ].map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setBikeCategoryFilter(cat.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                              bikeCategoryFilter === cat.id
                                ? 'bg-[#FF6A1A] text-black font-black'
                                : `${surfaceSubtle} ${mutedText} hover:text-current`
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Grid das Contas da Moto Cadastradas */}
                  {(() => {
                    const sourceList = financialIntelligence.enrichedBikeExpenses || financialIntelligence.rawBikeExpenses;
                    const filteredList = sourceList.filter(item => {
                      if (bikeCategoryFilter !== 'all' && item.category !== bikeCategoryFilter) return false;
                      if (bikeStatusFilter !== 'all') {
                        const { totalPaid } = getBikeExpenseMonthPayments(item, selectedFinanceMonth);
                        const dueInfo = getExpenseDueInfo(item, totalPaid, selectedFinanceMonth);
                        if (bikeStatusFilter === 'paid') return dueInfo.status === 'paid';
                        if (bikeStatusFilter === 'pending') return dueInfo.status !== 'paid';
                        if (bikeStatusFilter === 'overdue') return dueInfo.status === 'overdue';
                      }
                      return true;
                    });

                    if (filteredList.length === 0) {
                      return (
                        <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                          <span className="text-3xl">🏍️</span>
                          <p className={`text-xs ${mutedText}`}>
                            Nenhuma despesa encontrada para os filtros selecionados.
                          </p>
                          <button
                            type="button"
                            onClick={openNewBikeExpenseModal}
                            className="px-4 py-2 rounded-xl text-xs font-black bg-[#FF6A1A] text-black cursor-pointer"
                          >
                            + Cadastrar Despesa da Moto
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {filteredList.map(item => {
                          const { totalPaid } = getBikeExpenseMonthPayments(item, selectedFinanceMonth);
                          const dueInfo = getExpenseDueInfo(item, totalPaid, selectedFinanceMonth);
                          const isPaid = dueInfo.status === 'paid';
                          const dailyShare = (item as any).dailyRateio ?? (Number(item.monthlyAmount || 0) / financialIntelligence.workDaysPerMonth);
                          const monthlyCost = (item as any).monthlyCost ?? Number(item.monthlyAmount || 0);
                          const totalCost = (item as any).totalCost ?? (item.totalCost || monthlyCost);
                          const expectedVal = item.recurrenceType === 'interval_days' && totalCost > 0 ? totalCost : monthlyCost;
                          const isExplicitlyUnpaid = Boolean(item.unpaidMonths && item.unpaidMonths.includes(selectedFinanceMonth || todayStr().slice(0, 7)));
                          const remainingVal = isExplicitlyUnpaid ? expectedVal : Math.max(0, expectedVal - totalPaid);
                          const isInterval = item.recurrenceType === 'interval_days' && (item.intervalDays || 0) > 0;

                          const categoryColors: Record<string, { label: string; badge: string }> = {
                            combustivel: { label: 'Combustível', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
                            manutencao: { label: 'Peças & Oficina', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
                            documentacao: { label: 'Documentação', badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
                            seguro: { label: 'Seguro / Proteção', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
                            equipamento: { label: 'Equipamentos', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
                            outros: { label: 'Outros', badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
                          };
                          const catMeta = categoryColors[item.category] || categoryColors.outros;

                          return (
                            <div
                              key={item.id}
                              className={`rounded-2xl p-4 border transition-all bg-transparent ${
                                !item.isActive
                                  ? `opacity-50 grayscale ${dividerBorder}`
                                  : isPaid
                                  ? isDark
                                    ? 'border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                                    : 'border-emerald-400 shadow-md ring-1 ring-emerald-400/30'
                                  : isDark
                                  ? `${dividerBorder} hover:border-[#FF6A1A]/40`
                                  : 'border-slate-200 hover:border-[#FF6A1A]/40'
                              } flex flex-col justify-between gap-3 shadow-xs`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-2xl shrink-0 p-1.5 rounded-xl bg-transparent border border-neutral-800">
                                      {item.icon || '🏍️'}
                                    </span>
                                    <div className="min-w-0">
                                      <h4 className="text-sm font-black truncate leading-tight">
                                        {item.name}
                                      </h4>
                                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${catMeta.badge}`}>
                                          {catMeta.label}
                                        </span>
                                        {isInterval && (
                                          <span className="inline-block text-[10px] font-black px-1.5 py-0.2 rounded-md bg-transparent text-[#FF6A1A] border border-[#FF6A1A]/30">
                                            A cada {item.intervalDays} dias
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => toggleBikeExpensePaidStatus(item.id, selectedFinanceMonth)}
                                          className={`inline-block text-[10px] font-black px-1.5 py-0.5 rounded-md cursor-pointer transition-colors border bg-transparent ${
                                            isPaid
                                              ? 'text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10'
                                              : 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                                          }`}
                                          title={isPaid ? 'Quitado no mês. Clique para alternar para pendente' : 'Pendente no mês. Clique para marcar como quitado'}
                                        >
                                          {isPaid ? '✓ Quitado' : '⏳ A Pagar'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Toggle Ativar / Desativar */}
                                  <button
                                    type="button"
                                    onClick={() => toggleBikeExpense(item.id)}
                                    className={`text-[10px] font-black px-2 py-1 rounded-lg cursor-pointer transition-colors bg-transparent border ${
                                      item.isActive
                                        ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                                        : `${dividerBorder} text-slate-400 hover:text-white`
                                    }`}
                                    title={item.isActive ? 'Clique para desativar esta despesa' : 'Clique para ativar esta despesa'}
                                  >
                                    {item.isActive ? 'Ativa' : 'Inativa'}
                                  </button>
                                </div>

                                {/* Valores Mensal/Ciclo e Diário */}
                                <div className="mt-2 pt-2 border-t border-slate-800/40 flex items-end justify-between gap-2">
                                  <div>
                                    <span className={`text-[10px] font-bold block ${mutedText}`}>
                                      {isInterval ? `Reserva p/ Mês (Troca: ${fmtCurrencyExact(totalCost)})` : 'Orçamento Mensal'}
                                    </span>
                                    <span className={`text-lg font-black tabular-nums ${isPaid ? 'text-emerald-400 line-through opacity-85' : 'text-[#FF6A1A]'}`}>
                                      {fmtCurrencyExact(monthlyCost)}
                                      <span className="text-[10px] font-bold text-slate-400 ml-0.5">/mês</span>
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className={`text-[10px] font-bold block ${mutedText}`}>
                                      {isPaid ? 'Pago no Mês' : (item as any).isProportional ? 'Rateio Proporcional' : 'Rateio Diário'}
                                    </span>
                                    <span className={`text-xs font-extrabold tabular-nums ${isPaid ? 'text-emerald-400 font-black' : 'text-amber-400'}`}>
                                      {isPaid ? fmtCurrencyExact(totalPaid) : `${fmtCurrencyExact(dailyShare)}/dia`}
                                    </span>
                                  </div>
                                </div>

                                {/* Nota de Cálculo Proporcional Inteligente */}
                                {(item as any).calculationNote && (
                                  <div className="mt-1.5 text-[10px] font-semibold text-slate-400 flex items-center gap-1 truncate">
                                    <span className="text-[#FF6A1A]">⚡</span>
                                    <span className="truncate">{(item as any).calculationNote}</span>
                                  </div>
                                )}

                                {/* Status de Vencimento / Revisão Personalizado */}
                                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                                  <span
                                    className={`text-[10px] font-black px-2 py-1 rounded-lg inline-flex items-center gap-1.5 ${dueInfo.badgeClass}`}
                                  >
                                    <Calendar className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{dueInfo.label}</span>
                                  </span>
                                  {isPaid && (
                                    <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                      {fmtMoney(totalPaid)} quitado
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Ações: Lançar Gasto, Duplicar, Editar e Excluir */}
                              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-800/30">
                                {isPaid ? (
                                  <button
                                    type="button"
                                    onClick={() => duplicateBikeExpense(item)}
                                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-black bg-sky-500/15 border border-sky-500/40 text-sky-400 hover:bg-sky-500/25 cursor-pointer flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                                    title="Despesa quitada no mês. Clique para duplicar esta despesa e criar uma nova"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Duplicar Despesa</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openNewBikePaymentModal(item)}
                                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
                                    title="Registrar pagamento ou compra desta peça como gasto real"
                                  >
                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>Lançar Gasto{remainingVal > 0 && remainingVal < expectedVal ? ` (${fmtMoney(remainingVal)})` : ''}</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEditBikeExpenseModal(item)}
                                  className={`p-1.5 sm:p-2 rounded-lg text-xs font-bold ${surfaceSubtle} hover:border-[#FF6A1A] text-[#FF6A1A] cursor-pointer flex items-center justify-center transition-colors`}
                                  title="Editar despesa da moto"
                                  aria-label="Editar"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {deletingBikeId === item.id ? (
                                  <div className="flex items-center gap-1 animate-in fade-in duration-150">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        deleteBikeExpense(item.id);
                                        setDeletingBikeId(null);
                                      }}
                                      className="px-2 py-1.5 rounded-lg text-xs font-black bg-rose-600 text-white hover:bg-rose-500 cursor-pointer flex items-center gap-1 shadow-sm"
                                      title="Confirmar exclusão desta despesa"
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>Sim</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingBikeId(null)}
                                      className={`px-2 py-1.5 rounded-lg text-xs font-bold ${surfaceSubtle} ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'} cursor-pointer`}
                                      title="Cancelar"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingBikeId(item.id)}
                                    className={`p-1.5 sm:p-2 rounded-lg text-xs font-bold ${surfaceSubtle} hover:border-rose-500 text-rose-400 cursor-pointer flex items-center justify-center transition-colors`}
                                    title="Excluir despesa da moto"
                                    aria-label="Excluir"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* CALENDÁRIO VISUAL DE REVISÕES E VENCIMENTOS DA MOTO */}
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays className="w-5 h-5 text-[#FF6A1A]" />
                    <div>
                      <h3 className="text-sm sm:text-base font-black">
                        Cronograma de Ciclos, Trocas & Vencimentos da Moto
                      </h3>
                      <p className={`text-xs ${mutedText}`}>
                        Ordenado pelas próximas revisões e vencimentos (a cada X dias ou mensal) para você se planejar com antecedência
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 mt-3">
                    {(() => {
                      const activeList = financialIntelligence.activeEnrichedBikeExpenses || financialIntelligence.activeBikeExpenses;
                      const activeSorted = [...activeList].sort((a, b) => {
                        const { totalPaid: paidA } = getBikeExpenseMonthPayments(a, selectedFinanceMonth);
                        const { totalPaid: paidB } = getBikeExpenseMonthPayments(b, selectedFinanceMonth);
                        return (
                          getExpenseDueInfo(a, paidA, selectedFinanceMonth).timelineSortKey -
                          getExpenseDueInfo(b, paidB, selectedFinanceMonth).timelineSortKey
                        );
                      });

                      return activeSorted.map(item => {
                        const { totalPaid } = getBikeExpenseMonthPayments(item, selectedFinanceMonth);
                        const info = getExpenseDueInfo(item, totalPaid, selectedFinanceMonth);
                        const isPaid = info.status === 'paid';
                        const displayMonthly = (item as any).monthlyCost ?? item.monthlyAmount;
                        return (
                          <div
                            key={'timeline_bike_' + item.id}
                            onClick={() => openEditBikeExpenseModal(item)}
                            className={`p-3 rounded-xl border text-center flex flex-col justify-between gap-1 cursor-pointer transition-all ${
                              isPaid
                                ? 'bg-emerald-950/25 border-emerald-500/40 hover:border-emerald-400'
                                : isDark
                                ? 'bg-transparent border-neutral-800 hover:border-[#FF6A1A]/50'
                                : 'bg-transparent border-slate-200 hover:border-[#FF6A1A]/50'
                            }`}
                            title="Clique para editar o prazo ou ciclo desta despesa"
                          >
                            <div className={`text-[10px] font-black uppercase tracking-wider truncate ${isPaid ? 'text-emerald-400' : 'text-[#FF6A1A]'}`}>
                              {isPaid ? '✅ PAGO NO MÊS' : info.detailNote}
                            </div>
                            <span className="text-xl my-0.5">{item.icon || '🏍️'}</span>
                            <span className="text-xs font-black truncate">{item.name}</span>
                            <span className={`text-xs font-bold tabular-nums ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : (isDark ? 'text-slate-300' : 'text-slate-800')}`}>
                              {isPaid ? `Pago: ${fmtCurrencyExact(totalPaid)}` : `${fmtCurrencyExact(displayMonthly)}/mês`}
                            </span>
                            <span className={`text-[10px] font-bold truncate ${
                              isPaid
                                ? 'text-emerald-400 font-extrabold'
                                : info.daysRemaining <= 0
                                ? 'text-rose-400'
                                : info.daysRemaining <= 7
                                ? 'text-amber-400'
                                : mutedText
                            }`}>
                              {isPaid
                                ? '✓ Quitado no Mês'
                                : info.daysRemaining === 0
                                ? 'Vence hoje!'
                                : info.daysRemaining < 0
                                ? `Venceu há ${Math.abs(info.daysRemaining)}d`
                                : `Faltam ${info.daysRemaining} dias`}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* ================= SUB-ABA: DESPESAS DA CASA & CUSTO DE VIDA DA FAMÍLIA ================= */}
            {billingSubTab === 'despesas_casa' && (
              <div className="flex flex-col gap-4 sm:gap-6">
                {/* TOPO: CARDS DE RESUMO DO CUSTO DE VIDA DA CASA */}
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/50">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center text-lg">
                          🏠
                        </span>
                        <h2 className="text-base sm:text-lg font-black">
                          Despesas da Casa & Custo de Vida
                        </h2>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          Vida Pessoal & Família
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${mutedText}`}>
                        Cadastre aluguel, luz, água, internet, supermercado e outras contas. O app rateia o valor pelos seus dias de trabalho para você nunca passar aperto no final do mês!
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={openNewHouseholdExpenseModal}
                        className="px-3.5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/25"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Nova Despesa da Casa</span>
                      </button>
                      <button
                        type="button"
                        onClick={resetDefaultHouseholdExpenses}
                        className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${surfaceSubtle} hover:border-slate-700`}
                        title="Restaurar lista com contas sugeridas (aluguel, luz, água, internet, mercado)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline ml-1">Restaurar Padrão</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Cards de Métricas do Custo de Vida */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
                    {/* 1. Total Mensal das Contas */}
                    <div className={`rounded-2xl p-3.5 sm:p-4 border-l-4 border-l-blue-500 ${surfaceSubtle}`}>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-blue-400 flex items-center gap-1.5 font-black">
                          <span>🏠</span>
                          <span>Total Contas a Pagar / Mês</span>
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                          {financialIntelligence.householdPaidCount}/{financialIntelligence.activeHouseholdExpenses.length} quitadas
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-blue-400 tabular-nums">
                        {fmtCurrencyExact(financialIntelligence.monthlyHouseholdRemaining)}
                      </div>
                      <div className={`text-xs mt-1 font-semibold ${mutedText}`}>
                        {financialIntelligence.monthlyHouseholdPaid > 0
                          ? `${fmtMoney(financialIntelligence.monthlyHouseholdPaid)} já quitado · Orçamento: ${fmtMoney(financialIntelligence.monthlyHouseholdCost)}`
                          : `Orçamento total definido: ${fmtMoney(financialIntelligence.monthlyHouseholdCost)}`}
                      </div>
                    </div>

                    {/* 2. Rateio Diário Obrigatório */}
                    <div className={`rounded-2xl p-3.5 sm:p-4 border-l-4 border-l-sky-500 ${surfaceSubtle}`}>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-sky-400 flex items-center gap-1.5 font-black">
                          <span>📅</span>
                          <span>Separar por Dia (Restante)</span>
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400">
                          {financialIntelligence.workDaysPerMonth} dias úteis
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-sky-400 tabular-nums">
                        {fmtCurrencyExact(financialIntelligence.dailyHouseholdReserve)}
                        <span className="text-xs font-semibold ml-1 text-slate-400">/dia</span>
                      </div>
                      <div className={`text-xs mt-1 font-semibold ${mutedText}`}>
                        {financialIntelligence.monthlyHouseholdRemaining === 0
                          ? '🎉 100% das contas quitadas neste mês!'
                          : `${fmtCurrencyExact(financialIntelligence.weeklyHouseholdReserve)}/semana restante`}
                      </div>
                    </div>

                    {/* 3. % do Faturamento Comprometido */}
                    <div className={`rounded-2xl p-3.5 sm:p-4 border-l-4 border-l-purple-500 ${surfaceSubtle}`}>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-purple-400 flex items-center gap-1.5 font-black">
                          <span>📊</span>
                          <span>Impacto no Ganho</span>
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">
                          Custo de Vida
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-purple-400 tabular-nums">
                        {financialIntelligence.housePctOfGross}%
                        <span className="text-xs font-semibold ml-1 text-slate-400">do bruto</span>
                      </div>
                      <div className={`text-xs mt-1 font-semibold ${mutedText}`}>
                        Base de {fmtCurrencyExact(financialIntelligence.dailyGross)}/dia
                      </div>
                    </div>

                    {/* 4. Meta de Sobrevivência (Break-Even Moto + Casa) */}
                    <div className="rounded-2xl p-3.5 sm:p-4 border-2 border-amber-500/40 bg-amber-500/10">
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-amber-400 flex items-center gap-1.5 font-black">
                          <span>⚖️</span>
                          <span>Ponto de Sobrevivência</span>
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          Mínimo
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                        {fmtCurrencyExact(financialIntelligence.breakEvenDaily)}
                        <span className="text-xs font-semibold ml-1 text-amber-300">/dia</span>
                      </div>
                      <div className="text-xs mt-1 font-semibold text-amber-300/90 truncate">
                        Moto ({fmtCurrencyExact(financialIntelligence.dailyBikeCostsTotal)}) + Casa ({fmtCurrencyExact(financialIntelligence.dailyHouseholdReserve)})
                      </div>
                    </div>
                  </div>

                  {/* Banner Explicativo da Metodologia dos 3 Pilares */}
                  <div className={`mt-4 p-3.5 sm:p-4 rounded-2xl border text-xs leading-relaxed flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-transparent ${dividerBorder}`}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">💡</span>
                      <div>
                        <strong className="text-[#FF6A1A] block font-black mb-0.5">
                          O Segredo do Motoboy Próspero: Separar o Dinheiro em 3 Caixinhas
                        </strong>
                        <p className={mutedText}>
                          1. <strong>Caixa da Moto</strong> (Gasolina, peças, documentos, almoço) · 2. <strong>Caixa da Casa</strong> (Aluguel, luz, água, mercado) · 3. <strong>Seu Lucro 100% Livre</strong>. Separando os <strong>{fmtCurrencyExact(financialIntelligence.dailyHouseholdReserve)}/dia</strong> da casa, você nunca mais terá que escolher entre pagar o aluguel ou consertar a moto!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FILTRO POR CATEGORIA, MÊS, STATUS E LISTAGEM DAS CONTAS DA CASA */}
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                  <div className={`flex flex-col gap-3 mb-4 pb-4 border-b ${dividerBorder}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black">
                          Suas Contas e Despesas Domésticas
                        </h3>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-transparent border ${dividerBorder} ${secondaryText}`}>
                          {financialIntelligence.rawHouseholdExpenses.length} cadastradas
                        </span>
                      </div>

                      {/* Seletor / Navegação de Mês de Competência */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const [y, m] = selectedFinanceMonth.split('-').map(Number);
                            const d = new Date(y, m - 2, 1);
                            setSelectedFinanceMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 ${surfaceSubtle} hover:border-blue-500`}
                          title="Mês Anterior"
                        >
                          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                          <span className="hidden sm:inline">Anterior</span>
                        </button>

                        <div className="relative">
                          <select
                            value={selectedFinanceMonth}
                            onChange={e => setSelectedFinanceMonth(e.target.value)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black outline-none cursor-pointer appearance-none pr-7 ${inputSurface}`}
                          >
                            {availableFinanceMonths.map(ym => {
                              const [y, m] = ym.split('-');
                              const name = PT_BR_MONTH_NAMES[parseInt(m, 10) - 1] || m;
                              const now = new Date();
                              const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                              const isFuture = ym > nowYM;
                              return (
                                <option key={ym} value={ym}>
                                  {name} de {y} {ym === nowYM ? '· (Atual)' : isFuture ? '· (Futuro)' : ''}
                                </option>
                              );
                            })}
                          </select>
                          <ChevronDown className="w-3 h-3 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70" />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const [y, m] = selectedFinanceMonth.split('-').map(Number);
                            const d = new Date(y, m, 1);
                            setSelectedFinanceMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 ${surfaceSubtle} hover:border-blue-500`}
                          title="Próximo Mês"
                        >
                          <span className="hidden sm:inline">Próximo</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        {selectedFinanceMonth !== `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` && (
                          <button
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              setSelectedFinanceMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 cursor-pointer transition-colors"
                          >
                            Mês Atual
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filtros de Status (Todas, A Pagar, Quitadas, Vencidas) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/30">
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full pb-0.5">
                        <span className={`text-[10px] font-bold uppercase mr-1 ${mutedText}`}>Status:</span>
                        {[
                          { id: 'all', label: 'Todas' },
                          { id: 'pending', label: `⏳ A Pagar (${financialIntelligence.householdPendingCount})` },
                          { id: 'paid', label: `✅ Quitadas (${financialIntelligence.householdPaidCount})` },
                          { id: 'overdue', label: '🚨 Vencidas' },
                        ].map(st => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setHouseholdStatusFilter(st.id as any)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                              householdStatusFilter === st.id
                                ? st.id === 'paid'
                                  ? 'bg-emerald-600 text-white font-black'
                                  : st.id === 'overdue'
                                  ? 'bg-rose-600 text-white font-black'
                                  : 'bg-blue-600 text-white font-black'
                                : `${surfaceSubtle} ${mutedText} hover:text-current`
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>

                      {/* Filtros Rápidos de Categoria */}
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full pb-0.5">
                        <span className={`text-[10px] font-bold uppercase mr-1 ${mutedText}`}>Categoria:</span>
                        {[
                          { id: 'all', label: 'Todas' },
                          { id: 'moradia', label: '🏠 Moradia' },
                          { id: 'utilidades', label: '⚡ Utilidades' },
                          { id: 'alimentacao', label: '🛒 Alimentação' },
                          { id: 'conectividade', label: '📶 Internet/Cel' },
                          { id: 'saude', label: '💊 Saúde' },
                          { id: 'outros', label: 'Outros' },
                        ].map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setHouseholdCategoryFilter(cat.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                              householdCategoryFilter === cat.id
                                ? 'bg-slate-200 text-black font-black'
                                : `${surfaceSubtle} ${mutedText} hover:text-current`
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Grid das Contas Cadastradas */}
                  {(() => {
                    const filteredList = financialIntelligence.rawHouseholdExpenses.filter(item => {
                      if (householdCategoryFilter !== 'all' && item.category !== householdCategoryFilter) {
                        return false;
                      }
                      if (householdStatusFilter !== 'all') {
                        const { totalPaid } = getHouseholdExpenseMonthPayments(item, selectedFinanceMonth);
                        const dueInfo = getExpenseDueInfo(item, totalPaid, selectedFinanceMonth);
                        if (householdStatusFilter === 'paid') return dueInfo.status === 'paid';
                        if (householdStatusFilter === 'pending') return dueInfo.status !== 'paid';
                        if (householdStatusFilter === 'overdue') return dueInfo.status === 'overdue';
                      }
                      return true;
                    });

                    if (filteredList.length === 0) {
                      return (
                        <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                          <span className="text-3xl">🏠</span>
                          <p className={`text-xs ${mutedText}`}>
                            Nenhuma despesa encontrada para os filtros selecionados.
                          </p>
                          <button
                            type="button"
                            onClick={openNewHouseholdExpenseModal}
                            className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 text-white cursor-pointer"
                          >
                            + Cadastrar Nova Conta
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {filteredList.map(item => {
                          const { totalPaid } = getHouseholdExpenseMonthPayments(item, selectedFinanceMonth);
                          const dueInfo = getExpenseDueInfo(item, totalPaid, selectedFinanceMonth);
                          const isPaid = dueInfo.status === 'paid';
                          const expectedVal = item.recurrenceType === 'interval_days' && item.totalCost && item.totalCost > 0
                            ? item.totalCost
                            : Number(item.monthlyAmount || 0);
                          const isExplicitlyUnpaid = Boolean(item.unpaidMonths && item.unpaidMonths.includes(selectedFinanceMonth || todayStr().slice(0, 7)));
                          const remainingVal = isExplicitlyUnpaid ? expectedVal : Math.max(0, expectedVal - totalPaid);
                          const dailyShare = Number(item.monthlyAmount || 0) / financialIntelligence.workDaysPerMonth;
                          const isInterval = item.recurrenceType === 'interval_days' && (item.intervalDays || 0) > 0;

                          const categoryColors: Record<string, { label: string; badge: string }> = {
                            moradia: { label: 'Moradia', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
                            utilidades: { label: 'Utilidades', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
                            alimentacao: { label: 'Alimentação', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
                            conectividade: { label: 'Conectividade', badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
                            saude: { label: 'Saúde', badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
                            outros: { label: 'Outros', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
                          };
                          const catMeta = categoryColors[item.category] || categoryColors.outros;

                          return (
                            <div
                              key={item.id}
                              className={`rounded-2xl p-4 border transition-all bg-transparent ${
                                !item.isActive
                                  ? `opacity-50 grayscale ${dividerBorder}`
                                  : isPaid
                                  ? isDark
                                    ? 'border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                                    : 'border-emerald-400 shadow-md ring-1 ring-emerald-400/30'
                                  : isDark
                                  ? `${dividerBorder} hover:border-blue-500/40`
                                  : 'border-slate-200 hover:border-blue-400'
                              } flex flex-col justify-between gap-3 shadow-xs`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-2xl shrink-0 p-1.5 rounded-xl bg-transparent border border-neutral-800">
                                      {item.icon || '🏠'}
                                    </span>
                                    <div className="min-w-0">
                                      <h4 className="text-sm font-black truncate leading-tight">
                                        {item.name}
                                      </h4>
                                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${catMeta.badge}`}>
                                          {catMeta.label}
                                        </span>
                                        {isInterval && (
                                          <span className="inline-block text-[10px] font-black px-1.5 py-0.2 rounded-md bg-transparent text-blue-400 border border-blue-500/30">
                                            A cada {item.intervalDays} dias
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => toggleHouseholdExpensePaidStatus(item.id, selectedFinanceMonth)}
                                          className={`inline-block text-[10px] font-black px-1.5 py-0.5 rounded-md cursor-pointer transition-colors border bg-transparent ${
                                            isPaid
                                              ? 'text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10'
                                              : 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                                          }`}
                                          title={isPaid ? 'Quitado no mês. Clique para alternar para pendente' : 'Pendente no mês. Clique para marcar como quitado'}
                                        >
                                          {isPaid ? '✓ Quitado' : '⏳ A Pagar'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Toggle Ativar / Desativar */}
                                  <button
                                    type="button"
                                    onClick={() => toggleHouseholdExpense(item.id)}
                                    className={`text-[10px] font-black px-2 py-1 rounded-lg cursor-pointer transition-colors bg-transparent border ${
                                      item.isActive
                                        ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                                        : `${dividerBorder} text-slate-400 hover:text-white`
                                    }`}
                                    title={item.isActive ? 'Clique para desativar esta conta' : 'Clique para ativar esta conta'}
                                  >
                                    {item.isActive ? 'Ativa' : 'Inativa'}
                                  </button>
                                </div>

                                {/* Valores Mensal/Ciclo e Diário */}
                                <div className="mt-2 pt-2 border-t border-slate-800/40 flex items-end justify-between gap-2">
                                  <div>
                                    <span className={`text-[10px] font-bold block ${mutedText}`}>
                                      {isInterval ? `Reserva p/ Mês (Compra: ${fmtCurrencyExact(item.totalCost || item.monthlyAmount)})` : 'Orçamento Mensal'}
                                    </span>
                                    <span className={`text-lg font-black tabular-nums ${isPaid ? 'text-emerald-400 line-through opacity-85' : 'text-blue-400'}`}>
                                      {fmtCurrencyExact(item.monthlyAmount)}
                                      <span className="text-[10px] font-bold text-slate-400 ml-0.5">/mês</span>
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className={`text-[10px] font-bold block ${mutedText}`}>
                                      {isPaid ? 'Pago no Mês' : 'Rateio Diário'}
                                    </span>
                                    <span className={`text-xs font-extrabold tabular-nums ${isPaid ? 'text-emerald-400 font-black' : 'text-sky-400'}`}>
                                      {isPaid ? fmtCurrencyExact(totalPaid) : `${fmtCurrencyExact(dailyShare)}/dia`}
                                    </span>
                                  </div>
                                </div>

                                {/* Status de Vencimento / Quitado Personalizado */}
                                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                                  <span
                                    className={`text-[10px] font-black px-2 py-1 rounded-lg inline-flex items-center gap-1.5 ${dueInfo.badgeClass}`}
                                  >
                                    <Calendar className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{dueInfo.label}</span>
                                  </span>
                                  {isPaid && (
                                    <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                      {fmtMoney(totalPaid)} quitado
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Ações: Lançar Gasto, Editar e Excluir */}
                              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-800/30">
                                {isPaid ? (
                                  <button
                                    type="button"
                                    onClick={() => duplicateHouseholdExpense(item)}
                                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-black bg-sky-500/15 border border-sky-500/40 text-sky-400 hover:bg-sky-500/25 cursor-pointer flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                                    title="Conta quitada no mês. Clique para duplicar esta conta e criar uma nova"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Duplicar Despesa</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openNewHouseholdPaymentModal(item)}
                                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
                                    title="Registrar pagamento desta conta como gasto real"
                                  >
                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>Lançar Gasto{remainingVal > 0 && remainingVal < expectedVal ? ` (${fmtMoney(remainingVal)})` : ''}</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEditHouseholdExpenseModal(item)}
                                  className={`p-1.5 sm:p-2 rounded-lg text-xs font-bold ${surfaceSubtle} hover:border-blue-500 text-blue-400 cursor-pointer flex items-center justify-center transition-colors`}
                                  title="Editar prazo, ciclo de dias e valor desta conta"
                                  aria-label="Editar"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {deletingHouseholdId === item.id ? (
                                  <div className="flex items-center gap-1 animate-in fade-in duration-150">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        deleteHouseholdExpense(item.id);
                                        setDeletingHouseholdId(null);
                                      }}
                                      className="px-2 py-1.5 rounded-lg text-xs font-black bg-rose-600 text-white hover:bg-rose-500 cursor-pointer flex items-center gap-1 shadow-sm"
                                      title="Confirmar exclusão desta conta"
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>Sim</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingHouseholdId(null)}
                                      className={`px-2 py-1.5 rounded-lg text-xs font-bold ${surfaceSubtle} ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'} cursor-pointer`}
                                      title="Cancelar"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingHouseholdId(item.id)}
                                    className={`p-1.5 sm:p-2 rounded-lg text-xs font-bold ${surfaceSubtle} hover:border-rose-500 text-rose-400 cursor-pointer flex items-center justify-center transition-colors`}
                                    title="Excluir esta conta"
                                    aria-label="Excluir"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* CALENDÁRIO VISUAL DE VENCIMENTOS E CICLOS DA CASA */}
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays className="w-5 h-5 text-blue-400" />
                    <div>
                      <h3 className="text-sm sm:text-base font-black">
                        Cronograma de Vencimentos & Ciclos das Contas da Casa
                      </h3>
                      <p className={`text-xs ${mutedText}`}>
                        Acompanhe quando cada conta vence (mensal, a cada X dias ou data fixa) para organizar os saques dos aplicativos
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 mt-3">
                    {(() => {
                      const activeSorted = [...financialIntelligence.activeHouseholdExpenses].sort((a, b) => {
                        const { totalPaid: paidA } = getHouseholdExpenseMonthPayments(a, selectedFinanceMonth);
                        const { totalPaid: paidB } = getHouseholdExpenseMonthPayments(b, selectedFinanceMonth);
                        return (
                          getExpenseDueInfo(a, paidA, selectedFinanceMonth).timelineSortKey -
                          getExpenseDueInfo(b, paidB, selectedFinanceMonth).timelineSortKey
                        );
                      });

                      return activeSorted.map(item => {
                        const { totalPaid } = getHouseholdExpenseMonthPayments(item, selectedFinanceMonth);
                        const info = getExpenseDueInfo(item, totalPaid, selectedFinanceMonth);
                        const isPaid = info.status === 'paid';
                        return (
                          <div
                            key={'timeline_' + item.id}
                            onClick={() => openEditHouseholdExpenseModal(item)}
                            className={`p-3 rounded-xl border text-center flex flex-col justify-between gap-1 cursor-pointer transition-all ${
                              isPaid
                                ? 'bg-emerald-950/25 border-emerald-500/40 hover:border-emerald-400'
                                : isDark
                                ? 'bg-transparent border-neutral-800 hover:border-blue-500/50'
                                : 'bg-transparent border-slate-200 hover:border-blue-500/50'
                            }`}
                            title="Clique para editar o prazo ou ciclo desta conta"
                          >
                            <div className={`text-[10px] font-black uppercase tracking-wider truncate ${isPaid ? 'text-emerald-400' : 'text-blue-400'}`}>
                              {isPaid ? '✅ PAGO NO MÊS' : info.detailNote}
                            </div>
                            <span className="text-xl my-0.5">{item.icon || '🏠'}</span>
                            <span className="text-xs font-black truncate">{item.name}</span>
                            <span className={`text-xs font-bold tabular-nums ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : (isDark ? 'text-slate-300' : 'text-slate-800')}`}>
                              {isPaid ? `Pago: ${fmtCurrencyExact(totalPaid)}` : `${fmtCurrencyExact(item.monthlyAmount)}/mês`}
                            </span>
                            <span className={`text-[10px] font-bold truncate ${
                              isPaid
                                ? 'text-emerald-400 font-extrabold'
                                : info.daysRemaining <= 0
                                ? 'text-rose-400'
                                : info.daysRemaining <= 7
                                ? 'text-amber-400'
                                : mutedText
                            }`}>
                              {isPaid
                                ? '✓ Quitado no Mês'
                                : info.daysRemaining === 0
                                ? 'Vence hoje!'
                                : info.daysRemaining < 0
                                ? `Venceu há ${Math.abs(info.daysRemaining)}d`
                                : `Faltam ${info.daysRemaining} dias`}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

            {billingSubTab === 'planejamento' && (
              <>
                {/* BASE DO CÁLCULO FINANCEIRO OPERACIONAL (COMPLETO, TRANSPARENTE E SEM ABA DE SIMULAÇÃO) */}
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/50">
                    <div>
                      <h2 className="text-sm sm:text-base font-black flex items-center gap-2">
                        <span>Base do Cálculo Financeiro Diário</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#FF6A1A]/15 text-[#FF6A1A] border border-[#FF6A1A]/30">
                          {financialIntelligence.baseLabel}
                        </span>
                      </h2>
                      <p className={`text-xs mt-0.5 ${mutedText}`}>
                        Parâmetros reais do seu trabalho para calcular custos de rodagem, reservas obrigatórias e seu lucro limpo
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: 'actual_or_goal', label: 'Média Real / Automático' },
                        { id: 'daily_goal', label: `Meta Diária (${fmtMoney(dbState.dailyGoal)})` },
                      ].map(mode => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => updateFinancialPlan({ revenueBaseMode: mode.id as any })}
                          className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                            finPlan.revenueBaseMode === mode.id || (finPlan.revenueBaseMode === 'custom_daily' && mode.id === 'actual_or_goal')
                              ? 'bg-[#FF6A1A] text-black font-black'
                              : `${surfaceSubtle} hover:border-[#FF6A1A]`
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grid Completo de Métricas Operacionais */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
                    {/* 1. Faturamento Bruto Base */}
                    <div className={`rounded-2xl p-3.5 ${surfaceSubtle}`}>
                      <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                        Faturamento Bruto Base / Dia
                      </label>
                      <div className="text-lg sm:text-xl font-black text-[#FF6A1A] tabular-nums">
                        {fmtCurrencyExact(financialIntelligence.dailyGross)}
                      </div>
                      <div className={`text-[10px] mt-1 ${mutedText}`}>
                        Projeção mensal: {fmtMoney(financialIntelligence.monthlyGross)} ({finPlan.workDaysPerMonth} dias)
                      </div>
                    </div>

                    {/* 2. Rodagem Média Diária */}
                    <div className={`rounded-2xl p-3.5 ${surfaceSubtle}`}>
                      <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                        Rodagem Média / Dia (KM)
                      </label>
                      <div className="text-lg sm:text-xl font-black tabular-nums">
                        {Math.round(financialIntelligence.dailyKm).toLocaleString('pt-BR')} km/dia
                      </div>
                      <div className={`text-[10px] mt-1 ${mutedText}`}>
                        ~{Math.round(financialIntelligence.dailyKm * financialIntelligence.workDaysPerMonth).toLocaleString('pt-BR')} km/mês rodados
                      </div>
                    </div>

                    {/* 3. Dias Trabalhados no Mês */}
                    <div className={`rounded-2xl p-3.5 ${surfaceSubtle}`}>
                      <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                        Dias Trabalhados por Mês
                      </label>
                      <div className="flex items-center gap-2">
                        <FreeNumberInput
                          value={finPlan.workDaysPerMonth}
                          onValueChange={val =>
                            updateFinancialPlan({
                              workDaysPerMonth: Math.max(1, Math.min(31, val)),
                            })
                          }
                          className={`w-20 px-3 py-1.5 rounded-xl text-sm font-black tabular-nums text-center outline-none ${inputSurface}`}
                        />
                        <span className="text-xs font-bold">dias/mês</span>
                      </div>
                      <div className={`text-[10px] mt-1 ${mutedText}`}>
                        {finPlan.workDaysPerMonth >= 26 ? 'Escala intensa (6x1)' : `${finPlan.workDaysPerMonth} dias úteis no asfalto`}
                      </div>
                    </div>

                    {/* 4. Sobra Limpa no Bolso (Líquido Real) */}
                    <div className={`rounded-2xl p-3.5 border ${
                      financialIntelligence.dailyNetProfit >= 0
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-rose-500/10 border-rose-500/30'
                    }`}>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                        Sobra Limpa (Líquido Real)
                      </div>
                      <div className={`text-lg sm:text-xl font-black tabular-nums mt-0.5 ${
                        financialIntelligence.dailyNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {fmtCurrencyExact(financialIntelligence.dailyNetProfit)} / dia
                      </div>
                      <div className={`text-[11px] font-bold mt-1 ${mutedText}`}>
                        {fmtCurrencyExact(financialIntelligence.monthlyNetProfit)}/mês livre ({financialIntelligence.netMarginPct}%)
                      </div>
                    </div>
                  </div>

                  {/* Segunda Linha de Indicadores Operacionais Completos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-3 pt-3 border-t border-slate-800/40">
                    <div className={`rounded-xl p-3 border bg-transparent ${dividerBorder}`}>
                      <div className={`text-[10px] font-bold ${mutedText}`}>⛽ Custo Combustível/KM</div>
                      <div className="text-sm sm:text-base font-black text-rose-400 tabular-nums dashboard-number-anim mt-0.5">
                        R$ {financialIntelligence.fuelCostPerKm.toFixed(2)}/km
                      </div>
                      <div className={`text-[10px] mt-0.5 ${mutedText}`}>
                        {financialIntelligence.kmPerLiter} km/L · Gasolina R$ {financialIntelligence.fuelPrice.toFixed(2)}
                      </div>
                    </div>

                    <div className={`rounded-xl p-3 border bg-transparent ${dividerBorder}`}>
                      <div className={`text-[10px] font-bold ${mutedText}`}>🛠️ Desgaste Mecânico/KM</div>
                      <div className="text-sm sm:text-base font-black text-amber-400 tabular-nums dashboard-number-anim mt-0.5">
                        R$ {financialIntelligence.baseMaintCostPerKm.toFixed(2)}/km
                      </div>
                      <div className={`text-[10px] mt-0.5 ${mutedText}`}>
                        Óleo, pneus, relação e pastilhas
                      </div>
                    </div>

                    <div className={`rounded-xl p-3 border bg-transparent ${dividerBorder}`}>
                      <div className={`text-[10px] font-bold ${mutedText}`}>🏠 Despesas da Casa / Dia</div>
                      <div className="text-sm sm:text-base font-black text-blue-400 tabular-nums dashboard-number-anim mt-0.5">
                        {fmtCurrencyExact(financialIntelligence.dailyHouseholdReserve)}/dia
                      </div>
                      <div className={`text-[10px] mt-0.5 ${mutedText}`}>
                        {financialIntelligence.housePctOfGross}% do faturamento · {fmtCurrencyExact(financialIntelligence.monthlyHouseholdCost)}/mês
                      </div>
                    </div>

                    <div className={`rounded-xl p-3 border bg-transparent ${
                      isDark ? 'border-amber-500/40 text-amber-400' : 'bg-amber-50 border-amber-200'
                    }`}>
                      <div className={`text-[10px] font-black text-amber-400 uppercase tracking-wider`}>
                        ⚖️ Ponto de Sobrevivência
                      </div>
                      <div className="text-sm sm:text-base font-black text-amber-400 tabular-nums dashboard-number-anim mt-0.5">
                        {fmtCurrencyExact(financialIntelligence.breakEvenDaily)}/dia
                      </div>
                      <div className={`text-[10px] mt-0.5 ${mutedText}`}>
                        Mínimo p/ Moto ({fmtCurrencyExact(financialIntelligence.dailyBikeCostsTotal)}) + Casa ({fmtCurrencyExact(financialIntelligence.dailyHouseholdReserve)})
                      </div>
                    </div>
                  </div>

                  {/* Toggle para Explicação Transparente da Fórmula */}
                  <div className="mt-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowFormulaExplanation(prev => !prev)}
                      className={`text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        showFormulaExplanation ? 'text-[#FF6A1A]' : mutedText
                      } hover:text-[#FF6A1A]`}
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>{showFormulaExplanation ? 'Ocultar detalhes da fórmula de cálculo' : 'Como o app calcula seu Lucro Líquido Real? (Ver fórmula passo a passo)'}</span>
                    </button>

                    {showFormulaExplanation && (
                      <div className={`mt-3 p-4 rounded-2xl border text-xs leading-relaxed bg-transparent ${dividerBorder} ${secondaryText}`}>
                        <div className="font-black text-[#FF6A1A] mb-1.5 text-sm">
                          📐 A Matemática Real do Bolso do Motoboy (Três Caixinhas)
                        </div>
                        <p className="mb-2">
                          Muitos entregadores acham que faturar <strong>R$ 200/dia</strong> significa ter <strong>R$ 200 no bolso</strong>. Mas na realidade, o dinheiro precisa ser blindado em 3 caixinhas (Moto, Casa e Emergência) antes de gastar o lucro livre.
                        </p>
                        <div className="p-3 rounded-xl bg-black/30 border border-slate-800/80 font-mono text-[11px] mb-2 space-y-1.5">
                          <div className="text-[#FF6A1A] font-black text-xs">
                            Faturamento Bruto ({fmtCurrencyExact(financialIntelligence.dailyGross)})
                          </div>
                          <div className="text-rose-400">
                            - 🏍️ Custos Operacionais da Moto: {fmtCurrencyExact(financialIntelligence.dailyBikeCostsTotal)} ({financialIntelligence.bikePctOfGross}%)
                            <span className="text-[10px] block pl-3 text-rose-300/80">
                              (Gasolina {fmtCurrencyExact(financialIntelligence.dailyFuelCost)} + Manutenção {fmtCurrencyExact(financialIntelligence.dailyMaintReserve)} + Alimentação {fmtCurrencyExact(financialIntelligence.dailyFoodCost)} + Docs {fmtCurrencyExact(financialIntelligence.dailyDocsReserve)})
                            </span>
                          </div>
                          <div className="text-blue-400">
                            - 🏠 Despesas da Casa & Família: {fmtCurrencyExact(financialIntelligence.dailyHouseholdReserve)} ({financialIntelligence.housePctOfGross}%)
                            <span className="text-[10px] block pl-3 text-blue-300/80">
                              (Aluguel, Luz, Água, Mercado, Internet · {fmtCurrencyExact(financialIntelligence.monthlyHouseholdCost)}/mês rateados)
                            </span>
                          </div>
                          <div className="text-purple-400">
                            - 🛡️ Reserva de Emergência: {fmtCurrencyExact(financialIntelligence.dailyEmergencyReserve)} ({financialIntelligence.emergencyPct}%)
                          </div>
                          <div className="pt-2 border-t border-slate-700 text-emerald-400 font-black text-xs">
                            = 💵 Lucro Líquido Real 100% Limpo: {fmtCurrencyExact(financialIntelligence.dailyNetProfit)} ({financialIntelligence.netMarginPct}% livre no bolso)
                          </div>
                        </div>
                        <p className="text-[11px]">
                          💡 Este valor líquido de <strong>{fmtCurrencyExact(financialIntelligence.dailyNetProfit)}/dia</strong> é o seu dinheiro 100% LIMPO e desimpedido para levar para casa, fazer poupança ou lazer, já com o aluguel, a comida de casa, a gasolina e a manutenção da moto pagos!
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* RAIO-X INTERATIVO DO FATURAMENTO DIÁRIO: GRÁFICO DINÂMICO, ANIMADO COM DESTAQUE E DETALHES */}
                {(() => {
                  const raioXItems = [
                    {
                      id: 'fuel',
                      name: 'Combustível do Dia',
                      shortName: 'Combustível',
                      icon: '⛽',
                      color: '#ef4444',
                      colorClass: 'text-rose-400',
                      bgClass: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
                      amount: financialIntelligence.dailyFuelCost,
                      monthly: financialIntelligence.monthlyFuelCost,
                      pct: Math.max(1, financialIntelligence.fuelPctOfGross),
                      desc: 'Cobre a gasolina gasta para rodar suas corridas do dia, calculado com base na sua quilometragem e consumo da moto.',
                      formulaInfo: `${Math.round(financialIntelligence.dailyKm)} km/dia ÷ ${financialIntelligence.kmPerLiter} km/L × R$ ${financialIntelligence.fuelPrice.toFixed(2)}/L`,
                      tip: 'Calibrar os pneus a cada 5 dias e evitar aceleradas bruscas pode economizar até R$ 80 a R$ 120 de gasolina todo mês.',
                    },
                    {
                      id: 'maint',
                      name: 'Reserva Manutenção da Moto',
                      shortName: 'Manutenção',
                      icon: '🛠️',
                      color: '#f59e0b',
                      colorClass: 'text-amber-400',
                      bgClass: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
                      amount: financialIntelligence.dailyMaintReserve,
                      monthly: financialIntelligence.monthlyMaintReserve,
                      pct: Math.max(1, financialIntelligence.maintPctOfGross),
                      desc: 'Guarda o valor do desgaste mecânico gerado hoje para pagar troca de óleo, pneus novos, relação e pastilhas sem aperto.',
                      formulaInfo: `Desgaste de R$ ${financialIntelligence.baseMaintCostPerKm.toFixed(2)}/km rodado + ${financialIntelligence.extraBufferPct}% margem preventiva`,
                      tip: 'Trocar o óleo religiosamente no prazo evita fundir o motor, economizando mais de R$ 1.800 de retífica na oficina.',
                    },
                    {
                      id: 'food',
                      name: 'Alimentação na Rua',
                      shortName: 'Alimentação',
                      icon: '🍱',
                      color: '#fb923c',
                      colorClass: 'text-orange-400',
                      bgClass: 'bg-orange-500/15 border-orange-500/40 text-orange-400',
                      amount: financialIntelligence.dailyFoodCost,
                      monthly: financialIntelligence.monthlyFoodCost,
                      pct: Math.max(1, financialIntelligence.foodPctOfGross),
                      desc: 'Garante almoço digno, marmita, lanches rápidos e água gelada para manter sua energia e foco no trânsito.',
                      formulaInfo: `Almoço ${fmtCurrencyExact(financialIntelligence.dailyLunch)} + Lanches/Água ${fmtCurrencyExact(financialIntelligence.dailySnack)} por dia trabalhado`,
                      tip: 'Levar garrafa térmica com água e lanches rápidos de casa economiza em média R$ 300 por mês no seu bolso.',
                    },
                    {
                      id: 'docs',
                      name: 'Reserva Documentos & IPVA',
                      shortName: 'Documentos',
                      icon: '📄',
                      color: '#38bdf8',
                      colorClass: 'text-sky-400',
                      bgClass: 'bg-sky-500/15 border-sky-500/40 text-sky-400',
                      amount: financialIntelligence.dailyDocsReserve,
                      monthly: financialIntelligence.monthlyDocsReserve,
                      pct: Math.max(1, financialIntelligence.docsPctOfGross),
                      desc: 'Parcelamento diário invisível para quitar IPVA, licenciamento CRLV-e, MEI e seguro sem aperto no final do ano.',
                      formulaInfo: `Custo anual de ${fmtCurrencyExact(financialIntelligence.totalAnnualDocsWithInsurance)} rateado pelos dias de trabalho`,
                      tip: 'Pagar o IPVA à vista em cota única garante desconto de até 3% a 5% em diversos estados.',
                    },
                    {
                      id: 'household',
                      name: 'Despesas da Casa & Custo de Vida',
                      shortName: 'Casa & Família',
                      icon: '🏠',
                      color: '#3b82f6',
                      colorClass: 'text-blue-400',
                      bgClass: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
                      amount: financialIntelligence.dailyHouseholdReserve,
                      monthly: financialIntelligence.monthlyHouseholdCost,
                      pct: Math.max(1, financialIntelligence.housePctOfGross),
                      desc: 'Rateio diário das contas da sua residência: aluguel, energia elétrica, água, compras de supermercado, internet e botijão de gás.',
                      formulaInfo: `Total mensal de ${fmtCurrencyExact(financialIntelligence.monthlyHouseholdCost)} rateado por ${financialIntelligence.workDaysPerMonth} dias de trabalho = ${fmtCurrencyExact(financialIntelligence.dailyHouseholdReserve)}/dia`,
                      tip: 'Separar o rateio do aluguel e da luz todo dia evita desespero ou atrasos com juros no final do mês.',
                    },
                    {
                      id: 'emergency',
                      name: 'Reserva de Emergência',
                      shortName: 'Emergência',
                      icon: '🛡️',
                      color: '#c084fc',
                      colorClass: 'text-purple-400',
                      bgClass: 'bg-purple-500/15 border-purple-500/40 text-purple-400',
                      amount: financialIntelligence.dailyEmergencyReserve,
                      monthly: financialIntelligence.monthlyEmergencyReserve,
                      pct: Math.max(1, financialIntelligence.emergencyPct),
                      desc: 'Fundo de blindagem para imprevistos pessoais, dias de chuva torrencial, doença ou descanso merecido.',
                      formulaInfo: `${financialIntelligence.emergencyPct}% do faturamento bruto retidos para segurança financeira`,
                      tip: 'Ter 1 mês de custos fixos guardados evita recorrer a empréstimos com juros abusivos quando a moto precisar parar.',
                    },
                    {
                      id: 'net_profit',
                      name: 'Lucro Líquido Real Livre',
                      shortName: 'Lucro Livre',
                      icon: '💰',
                      color: '#10b981',
                      colorClass: 'text-emerald-400',
                      bgClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
                      amount: financialIntelligence.dailyNetProfit,
                      monthly: financialIntelligence.monthlyNetProfit,
                      pct: Math.max(0, financialIntelligence.netMarginPct),
                      desc: 'O dinheiro 100% LIMPO que sobra no seu bolso depois de pagar a operação da moto, quitar o aluguel e contas de casa e blindar a emergência!',
                      formulaInfo: `Bruto (${fmtCurrencyExact(financialIntelligence.dailyGross)}) - Moto (${fmtCurrencyExact(financialIntelligence.dailyBikeCostsTotal)}) - Casa (${fmtCurrencyExact(financialIntelligence.dailyHouseholdReserve)}) - Emergência (${fmtCurrencyExact(financialIntelligence.dailyEmergencyReserve)})`,
                      tip: 'Separe a conta do trabalho da conta de casa. Nunca gaste reservas de manutenção com compras pessoais do dia a dia.',
                    },
                  ];

                  const activeItem = raioXItems.find(i => i.id === selectedRaioXCategory) || raioXItems[0];

                  return (
                    <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/50">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base sm:text-lg font-black">
                              Raio-X do Faturamento Diário: Para Onde Vai Seu Dinheiro?
                            </h2>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Interativo · Clique para Explorar
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${mutedText}`}>
                            Divisão inteligente de cada dia rodado. Clique nas fatias do gráfico ou nas categorias para ver os detalhes
                          </p>
                        </div>
                        <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 self-start sm:self-center shrink-0">
                          Margem Real Livre: {financialIntelligence.netMarginPct}%
                        </span>
                      </div>

                      {/* Seletor Rápido em Botões / Abas */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {raioXItems.map(item => {
                          const isSelected = item.id === selectedRaioXCategory;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setSelectedRaioXCategory(item.id)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? `${item.bgClass} font-black shadow-md scale-102`
                                  : `${surfaceSubtle} ${mutedText} hover:text-white hover:border-slate-700`
                              }`}
                            >
                              <span>{item.icon}</span>
                              <span>{item.shortName}</span>
                              <span className="text-[10px] font-black opacity-80">({item.pct}%)</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Layout Central do Gráfico Interativo + Painel Inspetor Detalhado */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                        {/* GRÁFICO DONUT INTERATIVO (RECHARTS PIE CHART COM DESTAQUE AO CLICAR) */}
                        <div className="lg:col-span-5 flex flex-col items-center justify-center p-2 relative">
                          <div className="w-full max-w-[280px] h-[260px] relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={raioXItems}
                                  dataKey="amount"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={68}
                                  outerRadius={96}
                                  paddingAngle={3}
                                  stroke={isDark ? '#0b0d13' : '#ffffff'}
                                  strokeWidth={2}
                                  onClick={(entry: any) => {
                                    if (entry && entry.id) {
                                      setSelectedRaioXCategory(entry.id);
                                    }
                                  }}
                                  cursor="pointer"
                                  animationDuration={700}
                                  animationEasing="ease-out"
                                >
                                  {raioXItems.map(entry => {
                                    const isSelected = entry.id === selectedRaioXCategory;
                                    return (
                                      <Cell
                                        key={entry.id}
                                        fill={entry.color}
                                        opacity={isSelected ? 1 : 0.65}
                                        style={{
                                          filter: isSelected ? `drop-shadow(0px 0px 8px ${entry.color}90)` : 'none',
                                          transition: 'all 0.3s ease',
                                        }}
                                      />
                                    );
                                  })}
                                </Pie>
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (!active || !payload || !payload.length) return null;
                                    const data = payload[0].payload;
                                    return (
                                      <div className={`p-2.5 rounded-xl text-xs font-bold shadow-lg border ${
                                        isDark ? 'bg-black border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                                      }`}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <span>{data.icon}</span>
                                          <span>{data.name}</span>
                                        </div>
                                        <div className="text-[#FF6A1A] font-black">{fmtCurrencyExact(data.amount)} / dia</div>
                                        <div className={`text-[10px] ${mutedText}`}>{data.pct}% do faturamento diário</div>
                                      </div>
                                    );
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>

                            {/* Conteúdo Central do Donut com a Categoria Selecionada */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center px-4">
                              <span className="text-2xl animate-bounce-short">{activeItem.icon}</span>
                              <span className={`text-base sm:text-lg font-black tabular-nums dashboard-number-anim mt-0.5 ${activeItem.colorClass}`}>
                                {fmtCurrencyExact(activeItem.amount)}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                {activeItem.pct}% do dia
                              </span>
                            </div>
                          </div>
                          <span className={`text-[11px] font-semibold mt-1 ${mutedText}`}>
                            Toque em qualquer fatia para inspecionar
                          </span>
                        </div>

                        {/* PAINEL INSPETOR DETALHADO DO ITEM SELECIONADO */}
                        <div className="lg:col-span-7 flex flex-col gap-3">
                          <div className="rounded-2xl p-4 sm:p-5 border-2 transition-all bg-transparent" style={{ borderColor: `${activeItem.color}80` }}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2.5">
                                <span className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: `${activeItem.color}25` }}>
                                  {activeItem.icon}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm sm:text-base font-black">
                                      {activeItem.name}
                                    </h3>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md text-black" style={{ backgroundColor: activeItem.color }}>
                                      {activeItem.pct}% do dia
                                    </span>
                                  </div>
                                  <p className={`text-xs mt-0.5 ${mutedText}`}>
                                    {activeItem.desc}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Valores Diário, Mensal e Anual Projetados */}
                            <div className="grid grid-cols-3 gap-2 my-3 p-3 rounded-xl bg-black/20 border border-slate-800/60 text-center">
                              <div>
                                <span className={`block text-[10px] font-bold ${mutedText}`}>Por Dia Rodado</span>
                                <span className={`text-sm sm:text-base font-black tabular-nums ${activeItem.colorClass}`}>
                                  {fmtCurrencyExact(activeItem.amount)}
                                </span>
                              </div>
                              <div className="border-x border-slate-800/60 px-1">
                                <span className={`block text-[10px] font-bold ${mutedText}`}>Por Mês ({finPlan.workDaysPerMonth}d)</span>
                                <span className="text-sm sm:text-base font-black tabular-nums">
                                  {fmtCurrencyExact(activeItem.monthly)}
                                </span>
                              </div>
                              <div>
                                <span className={`block text-[10px] font-bold ${mutedText}`}>Em 12 Meses</span>
                                <span className={`text-sm sm:text-base font-black tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
                                  {fmtMoney(activeItem.monthly * 12)}
                                </span>
                              </div>
                            </div>

                            {/* Base de Cálculo desta Categoria */}
                            <div className={`p-2.5 rounded-xl border text-xs mb-2.5 flex items-center justify-between gap-2 bg-transparent ${
                              isDark ? 'border-neutral-800 text-slate-300' : 'border-slate-200 text-slate-700'
                            }`}>
                              <span className="font-semibold text-[11px] flex items-center gap-1.5">
                                <Calculator className="w-3.5 h-3.5 text-[#FF6A1A]" />
                                <span>Cálculo Base:</span>
                              </span>
                              <span className="font-bold text-[11px] tabular-nums truncate">
                                {activeItem.formulaInfo}
                              </span>
                            </div>

                            {/* Dica Prática de Economia para o Motoboy */}
                            <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                              isDark ? 'bg-[#FF6A1A]/10 border border-[#FF6A1A]/30 text-amber-200' : 'bg-amber-50 border border-amber-200 text-amber-900'
                            }`}>
                              <Sparkles className="w-4 h-4 text-[#FF6A1A] shrink-0 mt-0.5" />
                              <div className="leading-snug">
                                <strong className="font-black text-[#FF6A1A] mr-1">💡 Dica de Ouro do Motoboy:</strong>
                                <span>{activeItem.tip}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Barra Visual Proporcional Interativa (com clique) */}
                      <div className="mt-4 pt-3 border-t border-slate-800/40">
                        <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                          <span className={mutedText}>Distribuição Proporcional do Faturamento</span>
                          <span className="text-[#FF6A1A] font-black">{financialIntelligence.baseLabel}</span>
                        </div>
                        <div className={`w-full h-4 rounded-full overflow-hidden flex p-0.5 gap-0.5 ${isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-slate-200'}`}>
                          {raioXItems.map(item => {
                            const isSelected = item.id === selectedRaioXCategory;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelectedRaioXCategory(item.id)}
                                style={{
                                  width: `${Math.max(2, item.pct)}%`,
                                  backgroundColor: item.color,
                                }}
                                className={`h-full transition-all cursor-pointer hover:opacity-100 ${
                                  isSelected ? 'opacity-100 ring-2 ring-white scale-y-110 z-10' : 'opacity-70'
                                }`}
                                title={`${item.name}: ${item.pct}%`}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* 6 Cards Resumo do Raio-X Diário e Mensal com Destaque Dinâmico */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                        {raioXItems.map(item => {
                          const isSelected = item.id === selectedRaioXCategory;
                          return (
                            <div
                              key={item.id}
                              onClick={() => setSelectedRaioXCategory(item.id)}
                              className={`rounded-2xl p-3.5 border-l-4 transition-all cursor-pointer ${
                                isSelected
                                  ? `${item.bgClass} border-2 ring-2 ring-[#FF6A1A]/40 scale-101 shadow-md`
                                  : `${surfaceSubtle} hover:border-slate-700`
                              }`}
                              style={{ borderLeftColor: item.color }}
                            >
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="flex items-center gap-1.5 truncate">
                                  <span>{item.icon}</span>
                                  <span className="truncate">{item.name}</span>
                                </span>
                                <span className="font-black shrink-0 ml-1" style={{ color: item.color }}>
                                  {item.pct}%
                                </span>
                              </div>
                              <div className="text-base sm:text-lg font-black tabular-nums mt-1" style={{ color: item.color }}>
                                {item.id === 'net_profit' ? '= ' : '- '}
                                {fmtCurrencyExact(item.amount)} / dia
                              </div>
                              <div className={`text-[11px] mt-1 ${mutedText} truncate`}>
                                {fmtCurrencyExact(item.monthly)}/mês · {item.shortName}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* GRÁFICO DE ÁREA (RECHARTS): TENDÊNCIA DO LUCRO LÍQUIDO REAL NOS ÚLTIMOS 30 DIAS */}
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                          <span>📈 Tendência do Lucro Líquido Real</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30">
                            Últimos 30 Dias
                          </span>
                        </h2>
                      </div>
                      <p className={`text-xs mt-1 ${mutedText}`}>
                        Evolução do dinheiro limpo que realmente sobrou no seu bolso dia a dia após descontar combustível, manutenção preventiva, refeições e reservas financeiras
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
                      <div className={`rounded-xl px-3 py-2 ${surfaceSubtle}`}>
                        <div className={`text-[10px] font-semibold ${mutedText}`}>Lucro Líquido (30d)</div>
                        <div className={`text-xs sm:text-sm font-black tabular-nums ${
                          realProfitEvolution30Days.total30DaysProfit >= 0
                            ? 'text-emerald-500 dark:text-emerald-400'
                            : 'text-rose-500 dark:text-rose-400'
                        }`}>
                          {fmtCurrencyExact(realProfitEvolution30Days.total30DaysProfit)}
                        </div>
                      </div>

                      <div className={`rounded-xl px-3 py-2 ${surfaceSubtle}`}>
                        <div className={`text-[10px] font-semibold ${mutedText}`}>Média / Dia Ativo</div>
                        <div className="text-xs sm:text-sm font-black tabular-nums text-sky-500 dark:text-sky-400">
                          {fmtCurrencyExact(realProfitEvolution30Days.avgDailyProfit)}
                        </div>
                      </div>

                      <div className={`rounded-xl px-3 py-2 ${surfaceSubtle}`}>
                        <div className={`text-[10px] font-semibold ${mutedText}`}>Melhor Dia</div>
                        <div className="text-xs sm:text-sm font-black tabular-nums text-emerald-500 dark:text-emerald-400 truncate">
                          {realProfitEvolution30Days.bestDay
                            ? `${realProfitEvolution30Days.bestDay.label} · ${fmtCurrencyExact(realProfitEvolution30Days.bestDay.lucroReal)}`
                            : 'Sem registros'}
                        </div>
                      </div>

                      <div className={`rounded-xl px-3 py-2 ${surfaceSubtle}`}>
                        <div className={`text-[10px] font-semibold ${mutedText}`}>Dias Trabalhados</div>
                        <div className="text-xs sm:text-sm font-black tabular-nums text-amber-500 dark:text-amber-400">
                          {realProfitEvolution30Days.activeDaysCount} de 30 dias
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-64 sm:h-72 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={realProfitEvolution30Days.data}
                        margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
                      >
                        <defs>
                          <linearGradient id="areaLucroReal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke={isDark ? '#334155' : '#e2e8f0'}
                          opacity={0.6}
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                          tickLine={false}
                          axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
                          minTickGap={16}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={val => `R$${val}`}
                          width={60}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const item = payload[0].payload;
                            return (
                              <div
                                className={`rounded-xl p-3 shadow-xl border text-xs min-w-[210px] ${
                                  isDark ? 'bg-black border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                                }`}
                              >
                                <div className={`font-bold flex items-center justify-between border-b pb-1.5 mb-2 ${dividerBorder}`}>
                                  <span>📅 {item.fullDateLabel}</span>
                                  {item.isActive ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 font-bold">
                                      {item.km} km
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400 font-medium">
                                      Folga / Parado
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className={mutedText}>Faturamento Bruto:</span>
                                    <span className="font-semibold tabular-nums">{fmtCurrencyExact(item.faturamento)}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className={mutedText}>Deduções & Reservas:</span>
                                    <span className="font-semibold text-rose-500 dark:text-rose-400 tabular-nums">
                                      - {fmtCurrencyExact(item.deducoesTotais)}
                                    </span>
                                  </div>
                                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-black">
                                    <span className="text-emerald-500 dark:text-emerald-400">Lucro Líquido Real:</span>
                                    <span
                                      className={`tabular-nums text-sm ${
                                        item.lucroReal >= 0
                                          ? 'text-emerald-500 dark:text-emerald-400'
                                          : 'text-rose-500 dark:text-rose-400'
                                      }`}
                                    >
                                      {fmtCurrencyExact(item.lucroReal)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <ReferenceLine
                          y={0}
                          stroke={isDark ? '#64748b' : '#94a3b8'}
                          strokeDasharray="4 4"
                        />
                        {realProfitEvolution30Days.avgDailyProfit > 0 && (
                          <ReferenceLine
                            y={realProfitEvolution30Days.avgDailyProfit}
                            stroke="#38bdf8"
                            strokeDasharray="3 3"
                            label={{
                              value: 'Média',
                              fill: '#38bdf8',
                              fontSize: 10,
                              position: 'insideTopRight',
                            }}
                          />
                        )}
                        <Area
                          type="monotone"
                          dataKey="lucroReal"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#areaLucroReal)"
                          name="Lucro Líquido Real"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* GRÁFICO DE BARRAS (RECHARTS): COMPARATIVO DE FATURAMENTO POR PERÍODO & SAZONALIDADE COM FILTRO DE DATAS */}
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/50">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black">
                          Sazonalidade: Faturamento por Período
                        </h2>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#FF6A1A]/15 text-[#FF6A1A] border border-[#FF6A1A]/30">
                          {sixMonthSeasonality.filterLabel}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${mutedText}`}>
                        Compare a evolução mensal dos seus ganhos brutos para identificar meses de alta demanda e períodos de baixa sazonalidade
                      </p>
                    </div>

                    {/* Filtro de Datas Interativo */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
                      <div className={`flex items-center gap-1 p-1 bg-transparent rounded-xl border ${dividerBorder}`}>
                        {[
                          { id: '3m', label: '3 Meses' },
                          { id: '6m', label: '6 Meses' },
                          { id: '12m', label: '12 Meses' },
                          { id: 'ytd', label: 'Ano Atual' },
                          { id: 'custom', label: 'Personalizado' },
                        ].map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setSeasonalityFilter(f.id as any)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              seasonalityFilter === f.id
                                ? 'bg-transparent border border-[#FF6A1A] text-[#FF6A1A] font-black'
                                : `${mutedText} hover:text-white`
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Seleção de Mês Inicial e Final se Personalizado */}
                  {seasonalityFilter === 'custom' && (
                    <div className={`flex flex-wrap items-center gap-3 mb-4 p-3 rounded-2xl bg-transparent border text-xs ${dividerBorder}`}>
                      <span className="font-bold flex items-center gap-1.5 text-[#FF6A1A]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Intervalo de Meses:</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <label className={`text-[11px] font-bold ${mutedText}`}>De:</label>
                        <input
                          type="month"
                          value={seasonalityCustomStart}
                          onChange={e => setSeasonalityCustomStart(e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold outline-none ${inputSurface}`}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className={`text-[11px] font-bold ${mutedText}`}>Até:</label>
                        <input
                          type="month"
                          value={seasonalityCustomEnd}
                          onChange={e => setSeasonalityCustomEnd(e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold outline-none ${inputSurface}`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Métricas Resumo do Período Filtrado */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    <div className={`rounded-xl px-3 py-2 ${surfaceSubtle}`}>
                      <div className={`text-[10px] font-semibold ${mutedText}`}>
                        Total ({sixMonthSeasonality.months.length} {sixMonthSeasonality.months.length === 1 ? 'Mês' : 'Meses'})
                      </div>
                      <div className="text-xs sm:text-sm font-black tabular-nums text-[#FF6A1A]">
                        {fmtCurrencyExact(sixMonthSeasonality.total6MonthsRev)}
                      </div>
                    </div>
                    <div className={`rounded-xl px-3 py-2 ${surfaceSubtle}`}>
                      <div className={`text-[10px] font-semibold ${mutedText}`}>Média Mensal</div>
                      <div className="text-xs sm:text-sm font-black tabular-nums text-sky-400">
                        {fmtCurrencyExact(sixMonthSeasonality.avgMonthlyRev)}
                      </div>
                    </div>
                    <div className={`rounded-xl px-3 py-2 col-span-2 sm:col-span-1 ${surfaceSubtle}`}>
                      <div className={`text-[10px] font-semibold ${mutedText}`}>Melhor Mês (Pico)</div>
                      <div className="text-xs sm:text-sm font-black tabular-nums text-emerald-400 truncate">
                        {sixMonthSeasonality.peakMonth
                          ? `${sixMonthSeasonality.peakMonth.label} · ${fmtMoney(sixMonthSeasonality.peakMonth.faturamento)}`
                          : 'Sem registros'}
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-64 sm:h-72 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={sixMonthSeasonality.months}
                        margin={{ top: 14, right: 16, left: 0, bottom: 4 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={isDark ? '#1e293b' : '#e2e8f0'}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          stroke={isDark ? '#94a3b8' : '#64748b'}
                          tick={{ fontSize: 11, fontWeight: 800 }}
                          tickLine={false}
                          axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                        />
                        <YAxis
                          stroke={isDark ? '#94a3b8' : '#64748b'}
                          tick={{ fontSize: 11, fontWeight: 700 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val: number) => `R$ ${val}`}
                          width={72}
                        />
                        <Tooltip
                          cursor={{ fill: isDark ? 'rgba(255, 106, 26, 0.08)' : 'rgba(255, 106, 26, 0.06)' }}
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const item = payload[0].payload;
                            return (
                              <div
                                className={`rounded-2xl p-3.5 shadow-xl border text-xs ${
                                  isDark
                                    ? 'bg-black border-neutral-800 text-slate-100'
                                    : 'bg-white border-slate-200 text-slate-900'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3 mb-1.5">
                                  <span className="font-black text-[#FF6A1A]">{item.fullLabel}</span>
                                  {item.isPeak && (
                                    <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                      Pico Sazonal
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-4 font-bold">
                                  <span className={mutedText}>Faturamento Total:</span>
                                  <span className="text-[#FF6A1A] font-black tabular-nums">
                                    {fmtCurrencyExact(item.faturamento)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4 mt-0.5">
                                  <span className={mutedText}>Gastos Lançados:</span>
                                  <span className="text-rose-400 font-bold tabular-nums">
                                    {fmtCurrencyExact(item.gastos)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4 mt-0.5">
                                  <span className={mutedText}>Saldo do Mês:</span>
                                  <span
                                    className={`font-black tabular-nums ${
                                      item.lucro >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {fmtCurrencyExact(item.lucro)}
                                  </span>
                                </div>
                                <div className={`flex items-center justify-between gap-4 mt-1 pt-1 border-t ${dividerBorder}`}>
                                  <span className={mutedText}>Rodagem / Registros:</span>
                                  <span className="font-bold tabular-nums">
                                    {item.km.toLocaleString('pt-BR')} km · {item.corridas} reg(s)
                                  </span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        {sixMonthSeasonality.avgMonthlyRev > 0 && (
                          <ReferenceLine
                            y={Math.round(sixMonthSeasonality.avgMonthlyRev)}
                            stroke="#38bdf8"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{
                              value: `Média: ${fmtMoney(sixMonthSeasonality.avgMonthlyRev)}`,
                              position: 'insideTopRight',
                              fill: '#38bdf8',
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          />
                        )}
                        <Bar
                          dataKey="faturamento"
                          name="Faturamento Mensal (R$)"
                          radius={[8, 8, 0, 0]}
                          maxBarSize={54}
                        >
                          {sixMonthSeasonality.months.map(entry => (
                            <Cell
                              key={entry.yearMonth}
                              fill={
                                entry.isPeak
                                  ? '#10b981'
                                  : entry.isCurrent
                                  ? '#FF6A1A'
                                  : entry.faturamento > 0
                                  ? '#fb923c'
                                  : isDark
                                  ? '#1e293b'
                                  : '#cbd5e1'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Insight de Sazonalidade & Legenda Rápida */}
                  <div className={`mt-3 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${surfaceSubtle}`}>
                    <div className="text-xs leading-relaxed">
                      <span className="font-black text-[#FF6A1A] mr-1.5">📊 Análise de Sazonalidade:</span>
                      <span className={mutedText}>{sixMonthSeasonality.seasonalitySummary}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-[11px] font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                        <span>Pico</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#FF6A1A] inline-block" />
                        <span>Mês Atual</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-sky-400 inline-block" />
                        <span>Média</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* CONFIGURAÇÃO E AJUSTE DOS PARÂMETROS DAS RESERVAS (ALIMENTAÇÃO, MANUTENÇÃO E DOCUMENTOS) */}
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/50">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                          <SlidersHorizontal className="w-5 h-5 text-[#FF6A1A]" />
                          <span>Ajustar Parâmetros de Custos & Reservas</span>
                        </h2>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Exibidos no Topo do Início
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${mutedText}`}>
                        Ajuste seus custos diários e anuais. Os valores consolidados a reservar por dia são calculados automaticamente e exibidos em destaque no topo da Tela de Início
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="px-3.5 py-2 rounded-xl text-xs font-black bg-[#FF6A1A]/15 hover:bg-[#FF6A1A]/25 text-[#FF6A1A] border border-[#FF6A1A]/30 transition-colors cursor-pointer self-start sm:self-center flex items-center gap-1.5 shrink-0"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Ver Cards no Início</span>
                    </button>
                  </div>

                  {/* Banner de Direcionamento Visual */}
                  <div className={`mt-4 p-3.5 rounded-2xl flex items-center justify-between gap-3 ${
                    isDark ? 'bg-[#FF6A1A]/10 border border-[#FF6A1A]/30 text-amber-200' : 'bg-amber-50 border border-amber-200 text-amber-900'
                  }`}>
                    <div className="flex items-center gap-2.5 text-xs">
                      <span className="text-xl shrink-0">📌</span>
                      <div>
                        <strong className="font-black text-[#FF6A1A]">Valores Movidos para o Topo do Início:</strong>
                        <span className="ml-1">
                          Alimentação na Rua ({fmtCurrencyExact(financialIntelligence.dailyFoodCost)}/dia), Manutenção ({fmtCurrencyExact(financialIntelligence.dailyMaintReserve)}/dia) e Documentos ({fmtCurrencyExact(financialIntelligence.dailyDocsReserve)}/dia) agora ficam fixados no topo do painel principal para você nunca esquecer de guardar.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grid de Configuração dos Custos e Reservas */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4">
                    {/* Bloco 1: Alimentação & Margem Mecânica */}
                    <div className={`rounded-2xl p-4 sm:p-5 border bg-transparent ${dividerBorder}`}>
                      <h3 className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5 mb-3">
                        <span>🍱</span>
                        <span>Alimentação na Rua & Segurança Mecânica</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                            Almoço / Marmita por Dia (R$)
                          </label>
                          <FreeNumberInput
                            step="1"
                            value={finPlan.dailyLunchBudget}
                            onValueChange={val =>
                              updateFinancialPlan({ dailyLunchBudget: Math.max(0, val) })
                            }
                            className={`w-full px-3 py-2 rounded-xl text-sm font-black tabular-nums outline-none ${inputSurface}`}
                          />
                        </div>

                        <div>
                          <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                            Lanche / Café / Água por Dia (R$)
                          </label>
                          <FreeNumberInput
                            step="1"
                            value={finPlan.dailySnackBudget}
                            onValueChange={val =>
                              updateFinancialPlan({ dailySnackBudget: Math.max(0, val) })
                            }
                            className={`w-full px-3 py-2 rounded-xl text-sm font-black tabular-nums outline-none ${inputSurface}`}
                          />
                        </div>

                        <div>
                          <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                            Reserva de Emergência (% do Bruto)
                          </label>
                          <div className="flex items-center gap-2">
                            <FreeNumberInput
                              step="1"
                              value={finPlan.emergencyReservePct}
                              onValueChange={val =>
                                updateFinancialPlan({
                                  emergencyReservePct: Math.max(0, val),
                                })
                              }
                              className={`w-full px-3 py-2 rounded-xl text-sm font-black tabular-nums outline-none ${inputSurface}`}
                            />
                            <span className="text-xs font-black text-purple-400 shrink-0">
                              ={fmtCurrencyExact(financialIntelligence.dailyEmergencyReserve)}/dia
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                            Margem Extra Imprevisto Mecânico (%)
                          </label>
                          <div className="flex items-center gap-2">
                            <FreeNumberInput
                              step="1"
                              value={finPlan.maintenanceExtraBufferPct}
                              onValueChange={val =>
                                updateFinancialPlan({
                                  maintenanceExtraBufferPct: Math.max(0, val),
                                })
                              }
                              className={`w-full px-3 py-2 rounded-xl text-sm font-black tabular-nums outline-none ${inputSurface}`}
                            />
                            <span className="text-xs font-black text-amber-400 shrink-0">
                              +{fmtCurrencyExact(financialIntelligence.extraDailyMaintBuffer)}/dia
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bloco 2: Documentos da Moto, IPVA & MEI */}
                    <div className={`rounded-2xl p-4 sm:p-5 border bg-transparent ${dividerBorder}`}>
                      <h3 className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5 mb-3">
                        <span>📄</span>
                        <span>Documentos Anuais & Obrigações (IPVA/MEI)</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                            IPVA Anual da Moto (R$)
                          </label>
                          <FreeNumberInput
                            step="10"
                            value={finPlan.ipvaAnnual}
                            onValueChange={val =>
                              updateFinancialPlan({ ipvaAnnual: Math.max(0, val) })
                            }
                            className={`w-full px-3 py-2 rounded-xl text-sm font-black tabular-nums outline-none ${inputSurface}`}
                          />
                        </div>

                        <div>
                          <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                            Licenciamento Anual CRLV-e (R$)
                          </label>
                          <FreeNumberInput
                            step="5"
                            value={finPlan.licensingAnnual}
                            onValueChange={val =>
                              updateFinancialPlan({ licensingAnnual: Math.max(0, val) })
                            }
                            className={`w-full px-3 py-2 rounded-xl text-sm font-black tabular-nums outline-none ${inputSurface}`}
                          />
                        </div>

                        <div>
                          <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                            DAS MEI / Seguro / Rastreador Mensal (R$)
                          </label>
                          <FreeNumberInput
                            step="5"
                            value={finPlan.insuranceOrMeiMonthly}
                            onValueChange={val =>
                              updateFinancialPlan({ insuranceOrMeiMonthly: Math.max(0, val) })
                            }
                            className={`w-full px-3 py-2 rounded-xl text-sm font-black tabular-nums outline-none ${inputSurface}`}
                          />
                        </div>

                        <div>
                          <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                            Outras Taxas Anuais / CNH / Detran (R$)
                          </label>
                          <FreeNumberInput
                            step="10"
                            value={finPlan.otherDocsAnnual}
                            onValueChange={val =>
                              updateFinancialPlan({ otherDocsAnnual: Math.max(0, val) })
                            }
                            className={`w-full px-3 py-2 rounded-xl text-sm font-black tabular-nums outline-none ${inputSurface}`}
                          />
                        </div>

                        <div className="sm:col-span-2 pt-1 border-t border-slate-800/40">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <label className={`text-[11px] font-bold ${mutedText}`}>
                              Prazo até o vencimento do IPVA / Licenciamento:
                            </label>
                            <span className="text-xs font-black text-sky-400">
                              {finPlan.docsTargetMonths} {finPlan.docsTargetMonths === 1 ? 'mês' : 'meses'} ({finPlan.docsTargetMonths * financialIntelligence.workDaysPerMonth} dias de trabalho)
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {[1, 2, 3, 6, 9, 12].map(mVal => (
                              <button
                                key={mVal}
                                type="button"
                                onClick={() => updateFinancialPlan({ docsTargetMonths: mVal })}
                                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer transition-colors ${
                                  finPlan.docsTargetMonths === mVal
                                    ? 'bg-sky-400 text-black'
                                    : `${surfaceSubtle} hover:border-sky-400`
                                }`}
                              >
                                {mVal} {mVal === 1 ? 'mês' : 'meses'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CONSULTOR FINANCEIRO COM INTELIGÊNCIA ARTIFICIAL (GEMINI AI) */}
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 border ${
                  isDark ? 'bg-black border-[#FF6A1A]/40' : 'bg-white border-orange-300 shadow-sm'
                }`}>
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${dividerBorder}`}>
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#FF6A1A] text-black flex items-center justify-center font-black text-lg shrink-0">
                        IA
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-black">
                            Consultor Financeiro Mochilinha (IA do Motoboy)
                          </h2>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#FF6A1A]/15 text-[#FF6A1A] border border-[#FF6A1A]/30">
                            Análise em Tempo Real
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${mutedText}`}>
                          A Mochilinha analisa seu faturamento, gastos de rua, desgaste da {dbState.fuelConfig.bikeModelName} e documentação para orientar seu bolso
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isAiFinancialLoading}
                      onClick={() =>
                        handleAskFinancialAI(
                          'Atualize meu diagnóstico financeiro completo com foco em reserva diária de manutenção, almoço, IPVA/Licenciamento e lucro líquido real.'
                        )
                      }
                      className="px-4 py-2.5 rounded-xl bg-[#FF6A1A] text-black font-black text-xs hover:bg-[#ff7b33] transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 min-h-[42px]"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isAiFinancialLoading ? 'animate-spin' : ''}`} />
                      <span>{isAiFinancialLoading ? 'Analisando Finanças...' : 'Atualizar Análise com IA'}</span>
                    </button>
                  </div>

                  {/* Atalhos de Perguntas Financeiras Inteligentes */}
                  <div className="flex flex-wrap gap-1.5 my-3.5">
                    {[
                      'Quanto devo guardar por dia para manutenção, IPVA e emergência?',
                      'Como aumentar meu lucro líquido real diário?',
                      'Meu gasto com almoço, lanche e gasolina está saudável?',
                      'Quanto preciso faturar bruto por dia para tirar R$ 4.000 limpos no mês?',
                    ].map(presetQ => (
                      <button
                        key={presetQ}
                        type="button"
                        disabled={isAiFinancialLoading}
                        onClick={() => {
                          setAiFinancialPrompt(presetQ);
                          handleAskFinancialAI(presetQ);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-colors ${surfaceSubtle} hover:border-[#FF6A1A] hover:text-[#FF6A1A]`}
                      >
                        {presetQ}
                      </button>
                    ))}
                  </div>

                  {/* Resposta da IA Financeira */}
                  <div className={`rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium ${surfaceSubtle}`}>
                    {isAiFinancialLoading ? (
                      <div className="flex items-center gap-2.5 text-[#FF6A1A] font-bold py-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Calculando projeções de reservas, documentação e lucro líquido real com IA...</span>
                      </div>
                    ) : (
                      aiFinancialAdvice ||
                      'Clique em "Atualizar Análise com IA" ou selecione uma pergunta acima para receber seu plano financeiro personalizado.'
                    )}
                  </div>

                  {/* Campo para Pergunta Financeira Personalizada */}
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      if (!aiFinancialPrompt.trim()) return;
                      handleAskFinancialAI(aiFinancialPrompt);
                    }}
                    className="mt-3.5 flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="text"
                      value={aiFinancialPrompt}
                      onChange={e => setAiFinancialPrompt(e.target.value)}
                      placeholder="Pergunte para a Mochilinha (ex: Como juntar R$ 2.000 sem trabalhar domingo?)"
                      className={`flex-1 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold outline-none ${inputSurface}`}
                    />
                    <button
                      type="submit"
                      disabled={isAiFinancialLoading || !aiFinancialPrompt.trim()}
                      className="px-5 py-3 rounded-xl bg-[#FF6A1A] text-black font-black text-xs sm:text-sm hover:bg-[#ff7b33] transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0 min-h-[44px]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Perguntar à Mochilinha</span>
                    </button>
                  </form>
                </div>
              </>
            )}

            {billingSubTab === 'ganhos' && (
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                <div className="flex items-center justify-between mb-4 sm:mb-5">
                  <h2 className="text-sm sm:text-base font-extrabold">Ranking de Faturamento por App</h2>
                  <span className="text-base sm:text-lg font-black text-[#FF6A1A] tabular-nums">
                    {fmtMoney(totals.totalRevenue)}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5 sm:gap-3">
                  {allApps
                    .map(a => ({ ...a, val: totals.revenueByApp[a.id] || 0 }))
                    .sort((a, b) => b.val - a.val)
                    .map(app => {
                      const pct = totals.totalRevenue > 0 ? Math.round((app.val / totals.totalRevenue) * 100) : 0;
                      return (
                        <div key={app.id} className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 ${surfaceSubtle}`}>
                          <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5 sm:mb-2">
                            <span className="flex items-center gap-2">
                              <span className="text-lg sm:text-xl">{app.icon}</span>
                              <span className="truncate">{app.name}</span>
                            </span>
                            <span className="tabular-nums whitespace-nowrap">
                              {fmtMoney(app.val)} <span className={`text-[11px] ${mutedText}`}>· {pct}%</span>
                            </span>
                          </div>
                          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-slate-200'}`}>
                            <div className="h-full bg-[#FF6A1A] rounded-full dashboard-progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {billingSubTab === 'gastos' && (
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold">Despesas Lançadas por Categoria</h2>
                    <p className={`text-xs ${mutedText}`}>Consolidado de gastos operacionais da moto e despesas da casa</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 block">Total Geral de Despesas</span>
                    <span className="text-base sm:text-xl font-black text-rose-400 tabular-nums">
                      {fmtMoney(totals.totalExpense)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 sm:gap-3">
                  {allCategories
                    .map(c => {
                      const val = totals.expenseByCat[c.id] || 0;
                      const isHousehold = (dbState.householdExpenses || []).some(
                        h => h.name.toLowerCase() === c.name.toLowerCase() || h.id === c.id
                      );
                      const householdItem = (dbState.householdExpenses || []).find(
                        h => h.name.toLowerCase() === c.name.toLowerCase() || h.id === c.id
                      );
                      return {
                        ...c,
                        val,
                        isHousehold,
                        icon: isHousehold
                          ? householdItem?.icon || '🏠'
                          : c.id === 'combustivel'
                          ? '⛽'
                          : c.id === 'manutencao'
                          ? '🔧'
                          : c.id === 'pecas'
                          ? '⚙️'
                          : c.id === 'seguro'
                          ? '🛡️'
                          : c.id === 'documentacao'
                          ? '📄'
                          : c.id === 'lavagem'
                          ? '🧼'
                          : '🛵',
                      };
                    })
                    .filter(c => c.val > 0)
                    .sort((a, b) => b.val - a.val)
                    .map(cat => {
                      const pct = totals.totalExpense > 0 ? Math.round((cat.val / totals.totalExpense) * 100) : 0;
                      return (
                        <div key={cat.id} className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 ${surfaceSubtle}`}>
                          <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5 sm:mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base shrink-0">{cat.icon}</span>
                              <span className="truncate">{cat.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold border ${
                                cat.isHousehold
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                              }`}>
                                {cat.isHousehold ? 'Casa' : 'Moto'}
                              </span>
                            </div>
                            <span className="tabular-nums whitespace-nowrap">
                              {fmtMoney(cat.val)} <span className={`text-[11px] ${mutedText}`}>· {pct}%</span>
                            </span>
                          </div>
                          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-slate-200'}`}>
                            <div
                              className={`h-full rounded-full dashboard-progress-fill ${cat.isHousehold ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  {totals.totalExpense === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Nenhuma despesa registrada ainda. Use o botão <strong>+ Gasto</strong> para lançar despesas da moto ou da casa.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= ABA INVESTIMENTOS (FUNDO MOTOBOY & COTAS) ================= */}
        {activeTab === 'investments' && (
          <InvestimentosScreen
            isDark={isDark}
            userStorageKey={getStorageKeyForUser(currentUser)}
            currentBalance={totals.lucro}
            isAdmin={isUserAdmin(currentUser)}
            currentUserEmail={currentUser?.email || ''}
            currentUserName={currentUser?.name || ''}
          />
        )}

        {/* ================= ABA 4: HISTÓRICO ================= */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h1 className="text-xl sm:text-2xl font-black">Histórico de Corridas & Despesas</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filtro por Tipo */}
                <div className={`flex items-center gap-1 p-1 rounded-xl sm:rounded-2xl overflow-x-auto max-w-full no-scrollbar ${surfaceSubtle}`}>
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'ganho', label: 'Ganhos' },
                    { id: 'gasto', label: 'Gastos' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setHistoryTypeFilter(t.id as any);
                        setHistorySubFilter('all');
                      }}
                      className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                        historyTypeFilter === t.id ? 'bg-[#FF6A1A] text-black font-black' : mutedText
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Filtro por Status (Todos / Ativos / Anulados) */}
                <div className={`flex items-center gap-1 p-1 rounded-xl sm:rounded-2xl overflow-x-auto max-w-full no-scrollbar ${surfaceSubtle}`}>
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'active', label: 'Ativos' },
                    { id: 'cancelled', label: '🚫 Anulados' },
                  ].map(st => (
                    <button
                      key={st.id}
                      onClick={() => setHistoryStatusFilter(st.id as any)}
                      className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                        historyStatusFilter === st.id
                          ? st.id === 'cancelled'
                            ? 'bg-rose-600 text-white font-black'
                            : 'bg-slate-200 text-black font-black'
                          : mutedText
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
              {dbState.entries.length === 0 && dbState.expenses.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center gap-3">
                  <History className={`w-10 h-10 ${mutedText}`} />
                  <div>
                    <div className="text-sm sm:text-base font-extrabold">Nenhum registro salvo ainda</div>
                    <p className={`text-xs sm:text-sm mt-1 max-w-md mx-auto ${mutedText}`}>
                      Sua conta começa 100% zerada. Adicione sua primeira corrida ou gasto para acompanhar seu histórico.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openNewEntryModal('ganho', false)}
                    className="mt-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Adicionar Primeiro Registro</span>
                  </button>
                </div>
              ) : (
              <div className="flex flex-col divide-y divide-slate-800/40">
                {[
                  ...dbState.entries.map(e => ({ ...e, itemType: 'ganho' as const })),
                  ...dbState.expenses.map(e => ({ ...e, itemType: 'gasto' as const })),
                ]
                  .filter(item => {
                    if (historyStatusFilter === 'active' && item.isCancelled) return false;
                    if (historyStatusFilter === 'cancelled' && !item.isCancelled) return false;
                    if (historyTypeFilter === 'all') return true;
                    if (historyTypeFilter !== item.itemType) return false;
                    if (historySubFilter === 'all') return true;
                    return item.itemType === 'ganho'
                      ? item.app === historySubFilter
                      : item.category === historySubFilter;
                  })
                  .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
                  .map(item => {
                    const [, m, d] = (item.date || todayStr()).split('-');
                    if (item.itemType === 'ganho') {
                      const app = allApps.find(a => a.id === item.app) || { name: item.app, icon: '🛵' };
                      const shift = allShifts.find(s => s.id === item.shift);
                      const rev = Number(item.revenue || 0);
                      const km = Number(item.km || 0);
                      const avgKmBase = Math.max(20, financialIntelligence.dailyKm || 90);
                      const bikeCostPerKmRide =
                        (financialIntelligence.dailyFuelCost +
                          financialIntelligence.dailyMaintReserve +
                          financialIntelligence.dailyDocsReserve) /
                        avgKmBase;
                      const housePersonalPerKmRide =
                        (financialIntelligence.dailyHouseholdReserve +
                          financialIntelligence.dailyFoodCost) /
                        avgKmBase;
                      const netAfterBike = rev - (km > 0 ? km * bikeCostPerKmRide : 0);
                      const netAfterBikeAndHouse =
                        netAfterBike - (km > 0 ? km * housePersonalPerKmRide : 0);

                      return (
                        <div
                          key={`ganho-${item.id}`}
                          className={`py-3 sm:py-4 flex items-center justify-between gap-2.5 transition-all ${
                            item.isCancelled ? 'opacity-50 grayscale-[40%]' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            <span className="text-lg sm:text-xl shrink-0">{app.icon}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs sm:text-sm font-bold truncate">
                                  {app.name} · {d}/{m}
                                </span>
                                {item.isCancelled && (
                                  <span className="inline-block text-[10px] font-black px-1.5 py-0.2 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    🚫 Anulado
                                  </span>
                                )}
                              </div>
                              <div className={`text-[11px] sm:text-xs tabular-nums truncate ${mutedText}`}>
                                {shift ? shift.name.split(' ')[0] : 'Turno'} · {item.km} km · {item.hours || 0}h
                              </div>
                              {km > 0 && !item.isCancelled && (
                                <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[10px] font-bold">
                                  <span className="text-amber-400 tabular-nums">
                                    🏍️ Moto: {fmtCurrencyExact(netAfterBike)}
                                  </span>
                                  <span className="text-slate-600">·</span>
                                  <span
                                    className={`tabular-nums ${
                                      netAfterBikeAndHouse >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    🏠 Livre c/ Casa: {fmtCurrencyExact(netAfterBikeAndHouse)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                            <span className={`text-xs sm:text-base font-black tabular-nums whitespace-nowrap ${
                              item.isCancelled ? 'line-through text-slate-500' : 'text-emerald-400'
                            }`}>
                              + {fmtMoney(item.revenue)}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleEntryOrExpenseCancelled(item.id, 'ganho')}
                              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl cursor-pointer transition-colors ${
                                item.isCancelled
                                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                                  : `${surfaceSubtle} hover:border-amber-500 text-slate-400 hover:text-amber-400`
                              }`}
                              title={item.isCancelled ? 'Ativar ganho (voltará a somar nos totais e saldo)' : 'Anular ganho (não somará nos totais nem no saldo)'}
                            >
                              {item.isCancelled ? (
                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                              ) : (
                                <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => openEditHistoryItem(item, 'ganho')}
                              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${surfaceSubtle} hover:border-[#FF6A1A] cursor-pointer`}
                              title="Editar registro"
                            >
                              <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF6A1A]" />
                            </button>
                            <button
                              onClick={() =>
                                persistAndEnqueueWorkManager({
                                  ...dbState,
                                  entries: dbState.entries.filter(e => e.id !== item.id),
                                  deletedEntryIds: Array.from(
                                    new Set([...(dbState.deletedEntryIds || []), Number(item.id)])
                                  ),
                                })
                              }
                              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${surfaceSubtle} hover:border-rose-500 cursor-pointer`}
                              title="Excluir registro"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                            </button>
                          </div>
                        </div>
                      );
                    } else {
                      const isHousehold =
                        item.expenseType === 'casa' ||
                        Boolean(item.householdExpenseId) ||
                        Boolean(
                          item.category &&
                            (item.category.toLowerCase().includes('(casa)') ||
                              item.category.toLowerCase().includes('casa') ||
                              item.category.toLowerCase().includes('supermercado') ||
                              item.category.toLowerCase().includes('feira') ||
                              item.category.toLowerCase().includes('mercado') ||
                              item.category.toLowerCase().includes('aluguel') ||
                              item.category.toLowerCase().includes('energia') ||
                              item.category.toLowerCase().includes('luz') ||
                              item.category.toLowerCase().includes('água') ||
                              item.category.toLowerCase().includes('internet'))
                        ) ||
                        (dbState.householdExpenses || []).some(
                          (h: HouseholdExpenseItem) =>
                            h.id === item.householdExpenseId ||
                            h.name.toLowerCase() === (item.category || '').toLowerCase()
                        );
                      const householdItem = (dbState.householdExpenses || []).find(
                        (h: HouseholdExpenseItem) =>
                          h.id === item.householdExpenseId ||
                          h.name.toLowerCase() === (item.category || '').toLowerCase() ||
                          (item.category && item.category.toLowerCase().includes(h.id.toLowerCase()))
                      );

                      const getExpenseIcon = () => {
                        if (isHousehold) {
                          return householdItem?.icon || '🏠';
                        }
                        if (item.category === 'combustivel') return '⛽';
                        if (item.category === 'manutencao') return '🔧';
                        if (item.category === 'pecas') return '⚙️';
                        if (item.category === 'seguro') return '🛡️';
                        if (item.category === 'documentacao') return '📄';
                        if (item.category === 'lavagem') return '🧼';
                        return '🛵';
                      };

                      const cat = allCategories.find(c => c.id === item.category) || { name: item.category };
                      const displayTitle = householdItem?.name || cat.name || item.category;

                      return (
                        <div
                          key={`gasto-${item.id}`}
                          className={`py-3 sm:py-4 flex items-center justify-between gap-2.5 transition-all ${
                            item.isCancelled ? 'opacity-50 grayscale-[40%]' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            <span className="text-lg sm:text-xl shrink-0">
                              {getExpenseIcon()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs sm:text-sm font-bold truncate">
                                  {displayTitle} · {d}/{m}
                                </span>
                                {item.isCancelled && (
                                  <span className="inline-block text-[10px] font-black px-1.5 py-0.2 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    🚫 Anulado
                                  </span>
                                )}
                              </div>
                              <div className={`text-[11px] sm:text-xs ${mutedText} truncate flex items-center gap-1.5 mt-0.5`}>
                                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${
                                  isHousehold
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                    : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                                }`}>
                                  {isHousehold ? '🏠 Casa & Família' : '🛵 Despesa Moto'}
                                </span>
                                {item.description && (
                                  <span className="truncate italic">· {item.description}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                            <span className={`text-xs sm:text-base font-black tabular-nums whitespace-nowrap ${
                              item.isCancelled ? 'line-through text-slate-500' : 'text-rose-400'
                            }`}>
                              - {fmtMoney(item.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleEntryOrExpenseCancelled(item.id, 'gasto')}
                              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl cursor-pointer transition-colors ${
                                item.isCancelled
                                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                                  : `${surfaceSubtle} hover:border-amber-500 text-slate-400 hover:text-amber-400`
                              }`}
                              title={item.isCancelled ? 'Ativar despesa (voltará a somar nos totais e saldo)' : 'Anular despesa (não somará nos totais nem no saldo)'}
                            >
                              {item.isCancelled ? (
                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                              ) : (
                                <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => openEditHistoryItem(item, 'gasto')}
                              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${surfaceSubtle} hover:border-[#FF6A1A] cursor-pointer`}
                              title="Editar despesa"
                            >
                              <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF6A1A]" />
                            </button>
                            <button
                              onClick={() =>
                                persistAndEnqueueWorkManager({
                                  ...dbState,
                                  expenses: dbState.expenses.filter(e => e.id !== item.id),
                                  deletedExpenseIds: Array.from(
                                    new Set([...(dbState.deletedExpenseIds || []), Number(item.id)])
                                  ),
                                })
                              }
                              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${surfaceSubtle} hover:border-rose-500 cursor-pointer`}
                              title="Excluir despesa"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                            </button>
                          </div>
                        </div>
                      );
                    }
                  })}
              </div>
              )}
            </div>
          </div>
        )}

        {/* ================= ABA 5: PROGRESSO, ESTATÍSTICAS & CONQUISTAS ================= */}
        {activeTab === 'progress' && (
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* TOP HEADER + PILOT LEVEL BANNER */}
            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#FF6A1A]/15 border border-[#FF6A1A]/40 text-[#FF6A1A] flex items-center justify-center shrink-0">
                    <Trophy className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-[#FF6A1A]/15 text-[#FF6A1A] border border-[#FF6A1A]/30">
                        Patente: {level.name}
                      </span>
                      <span className={`text-xs font-bold ${mutedText}`}>
                        {progressAnalytics.unlockedCount}/{progressAnalytics.achievements.length} conquistas desbloqueadas
                      </span>
                    </div>
                    <h1 className="text-lg sm:text-2xl font-black mt-1">
                      Progresso, Estatísticas & Performance
                    </h1>
                    <p className={`text-xs mt-0.5 ${mutedText}`}>
                      Análise completa de metas, eficiência por hora/KM, recordes pessoais e evolução diária
                    </p>
                  </div>
                </div>

                {/* Level XP Bar */}
                <div className={`rounded-2xl p-3.5 sm:p-4 lg:w-80 shrink-0 ${surfaceSubtle}`}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-extrabold text-[#FF6A1A]">Progresso de Patente</span>
                    <span className="font-black tabular-nums">
                      {totals.totalKm.toLocaleString('pt-BR')} / {level.end.toLocaleString('pt-BR')} km
                    </span>
                  </div>
                  <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-slate-200'}`}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#FF6A1A] to-amber-400 transition-all duration-500 dashboard-progress-fill"
                      style={{ width: `${Math.min(100, Math.round(level.pct))}%` }}
                    />
                  </div>
                  <div className={`flex items-center justify-between text-[11px] mt-1.5 ${mutedText}`}>
                    <span>Nível atual: {level.start.toLocaleString('pt-BR')} km</span>
                    <span className="font-bold">
                      Faltam {Math.max(0, level.end - totals.totalKm).toLocaleString('pt-BR')} km
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 1: PAINEL DE METAS (DIÁRIA, SEMANAL E META PERSONALIZADA) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5">
              {/* Card 1: Meta Diária (Hoje) */}
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-3 ${surfaceCard}`}>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-extrabold uppercase tracking-wider ${mutedText}`}>
                      Meta Diária (Hoje)
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                        progressAnalytics.revToday >= progressAnalytics.dailyGoal
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-[#FF6A1A]/15 text-[#FF6A1A] border-[#FF6A1A]/30'
                      }`}
                    >
                      {progressAnalytics.dailyPct}% atingido
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 mt-2">
                    <div className="text-xl sm:text-2xl font-black tabular-nums text-emerald-400 dashboard-number-anim">
                      {fmtCurrencyExact(progressAnalytics.revToday)}
                    </div>
                    <div className={`text-xs font-bold tabular-nums ${mutedText}`}>
                      de {fmtMoney(progressAnalytics.dailyGoal)}
                    </div>
                  </div>

                  <div className={`w-full h-2.5 rounded-full overflow-hidden mt-2.5 ${isDark ? 'bg-neutral-800' : 'bg-slate-200'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 dashboard-progress-fill ${
                        progressAnalytics.revToday >= progressAnalytics.dailyGoal
                          ? 'bg-emerald-400'
                          : 'bg-[#FF6A1A]'
                      }`}
                      style={{ width: `${progressAnalytics.dailyPct}%` }}
                    />
                  </div>
                </div>

                <div className={`rounded-xl p-2.5 grid grid-cols-3 gap-2 text-center ${surfaceSubtle}`}>
                  <div>
                    <div className={`text-[10px] font-semibold ${mutedText}`}>Status Hoje</div>
                    <div className="text-xs font-black tabular-nums mt-0.5">
                      {progressAnalytics.dailyRemaining > 0
                        ? `Faltam ${fmtMoney(progressAnalytics.dailyRemaining)}`
                        : 'Meta Batida!'}
                    </div>
                  </div>
                  <div>
                    <div className={`text-[10px] font-semibold ${mutedText}`}>KM Hoje</div>
                    <div className="text-xs font-black tabular-nums mt-0.5">
                      {progressAnalytics.kmToday.toLocaleString('pt-BR')} km
                    </div>
                  </div>
                  <div>
                    <div className={`text-[10px] font-semibold ${mutedText}`}>Horas Hoje</div>
                    <div className="text-xs font-black tabular-nums mt-0.5">
                      {progressAnalytics.hoursToday.toFixed(1)}h
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Meta Semanal */}
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-3 ${surfaceCard}`}>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-extrabold uppercase tracking-wider ${mutedText}`}>
                      Meta Semanal
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                        progressAnalytics.revWeek >= progressAnalytics.weeklyGoal
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                      }`}
                    >
                      {progressAnalytics.weeklyPct}% atingido
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 mt-2">
                    <div className="text-xl sm:text-2xl font-black tabular-nums text-sky-400 dashboard-number-anim">
                      {fmtCurrencyExact(progressAnalytics.revWeek)}
                    </div>
                    <div className={`text-xs font-bold tabular-nums ${mutedText}`}>
                      de {fmtMoney(progressAnalytics.weeklyGoal)}
                    </div>
                  </div>

                  <div className={`w-full h-2.5 rounded-full overflow-hidden mt-2.5 ${isDark ? 'bg-neutral-800' : 'bg-slate-200'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 dashboard-progress-fill ${
                        progressAnalytics.revWeek >= progressAnalytics.weeklyGoal
                          ? 'bg-emerald-400'
                          : 'bg-sky-400'
                      }`}
                      style={{ width: `${progressAnalytics.weeklyPct}%` }}
                    />
                  </div>
                </div>

                <div className={`rounded-xl p-2.5 grid grid-cols-3 gap-2 text-center ${surfaceSubtle}`}>
                  <div>
                    <div className={`text-[10px] font-semibold ${mutedText}`}>Restante</div>
                    <div className="text-xs font-black tabular-nums mt-0.5">
                      {progressAnalytics.weeklyRemaining > 0
                        ? fmtMoney(progressAnalytics.weeklyRemaining)
                        : 'Concluída!'}
                    </div>
                  </div>
                  <div>
                    <div className={`text-[10px] font-semibold ${mutedText}`}>Ritmo p/ Bater</div>
                    <div className="text-xs font-black tabular-nums text-sky-400 mt-0.5">
                      {progressAnalytics.weeklyRemaining > 0
                        ? `${fmtMoney(progressAnalytics.weeklyDailyNeeded)}/dia`
                        : '100% OK'}
                    </div>
                  </div>
                  <div>
                    <div className={`text-[10px] font-semibold ${mutedText}`}>Dias na Sem.</div>
                    <div className="text-xs font-black tabular-nums mt-0.5">
                      {progressAnalytics.weekActiveDays} dia(s)
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Meta Personalizada de Ganhos */}
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-3 ${surfaceCard}`}>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF6A1A] truncate">
                        {progressAnalytics.customGoalTitle}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                          progressAnalytics.customScope === 'month'
                            ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                            : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                        }`}
                      >
                        {progressAnalytics.customScope === 'month'
                          ? `📅 ${progressAnalytics.currentMonthName}`
                          : '🌐 Histórico'}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                        progressAnalytics.customCurrent >= progressAnalytics.customGoalTarget
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-[#FF6A1A]/15 text-[#FF6A1A] border-[#FF6A1A]/30'
                      }`}
                    >
                      {progressAnalytics.customCurrent >= progressAnalytics.customGoalTarget
                        ? '100% Batida!'
                        : `${progressAnalytics.customPct}% atingido`}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 mt-2">
                    <div>
                      <div className="text-xl sm:text-2xl font-black tabular-nums text-[#FF6A1A] dashboard-number-anim">
                        {fmtCurrencyExact(progressAnalytics.customCurrent)}
                      </div>
                      <span className={`text-[10px] block font-semibold ${mutedText}`}>
                        Saldo Atual (Ganhos {fmtMoney(progressAnalytics.customGross)} - Gastos {fmtMoney(progressAnalytics.customExpenses)})
                      </span>
                    </div>
                    <div className={`text-xs font-bold tabular-nums ${mutedText} text-right`}>
                      de {fmtMoney(progressAnalytics.customGoalTarget)}
                    </div>
                  </div>

                  <div className={`w-full h-2.5 rounded-full overflow-hidden mt-2.5 ${isDark ? 'bg-neutral-800' : 'bg-slate-200'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 dashboard-progress-fill ${
                        progressAnalytics.customCurrent >= progressAnalytics.customGoalTarget
                          ? 'bg-emerald-400'
                          : 'bg-gradient-to-r from-[#FF6A1A] to-amber-400'
                      }`}
                      style={{ width: `${progressAnalytics.customPct}%` }}
                    />
                  </div>
                </div>

                <div className={`rounded-xl p-2.5 grid grid-cols-3 gap-2 text-center ${surfaceSubtle}`}>
                  <div>
                    <div className={`text-[10px] font-semibold ${mutedText}`}>Meta Diária</div>
                    <div className="text-xs font-black tabular-nums text-[#FF6A1A] mt-0.5">
                      {progressAnalytics.customRemaining > 0
                        ? `${fmtCurrencyExact(progressAnalytics.customDailyNeeded)}/dia`
                        : 'Objetivo Batido!'}
                    </div>
                  </div>
                  <div>
                    <div className={`text-[10px] font-semibold ${mutedText}`}>Faltam</div>
                    <div className="text-xs font-black tabular-nums mt-0.5">
                      {fmtMoney(progressAnalytics.customRemaining)}
                    </div>
                  </div>
                  <div>
                    <div className={`text-[10px] font-semibold ${mutedText}`}>
                      {progressAnalytics.customGoalCountdown.isDateMode ? 'Contagem' : 'Prazo / Ritmo'}
                    </div>
                    <div className="text-xs font-black tabular-nums mt-0.5 text-[#FF6A1A] truncate">
                      {progressAnalytics.customGoalCountdown.isDateMode
                        ? `⏳ ${progressAnalytics.customGoalCountdown.countdownBadgeText}`
                        : `${progressAnalytics.customGoalDays}d (est. ${progressAnalytics.estimatedDaysToCustomGoal}d)`}
                    </div>
                    {progressAnalytics.customGoalCountdown.isDateMode && (
                      <div className={`text-[9px] font-semibold mt-0.5 truncate ${mutedText}`}>
                        até {formatPtBrDate(progressAnalytics.customGoalCountdown.targetDateStr)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: KPIs DE EFICIÊNCIA E ESTATÍSTICAS OPERACIONAIS (8 INDICADORES) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className={`rounded-2xl p-4 ${surfaceCard}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase ${mutedText}`}>Sequência Ativa</span>
                  <Flame className="w-4 h-4 text-[#FF6A1A]" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#FF6A1A] tabular-nums mt-1">
                  {streakCount} {streakCount === 1 ? 'dia' : 'dias'}
                </div>
                <div className={`text-[11px] mt-1 ${mutedText}`}>
                  Recorde pessoal: <strong className="text-current">{progressAnalytics.maxStreak} dias</strong> seguidos
                </div>
              </div>

              <div className={`rounded-2xl p-4 ${surfaceCard}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase ${mutedText}`}>Dias Trabalhados</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black tabular-nums mt-1">
                  {progressAnalytics.uniqueWorkDays}
                </div>
                <div className={`text-[11px] mt-1 ${mutedText}`}>
                  Meta batida em <strong className="text-emerald-400">{progressAnalytics.daysMetDailyGoal}</strong> ({progressAnalytics.goalHitRatePct}%)
                </div>
              </div>

              <div className={`rounded-2xl p-4 ${surfaceCard}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase ${mutedText}`}>Média / Dia Ativo</span>
                  <BarChart3 className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-sky-400 tabular-nums mt-1">
                  {fmtCurrencyExact(progressAnalytics.avgRevPerDay)}
                </div>
                <div className={`text-[11px] mt-1 ${mutedText}`}>
                  Líquido/dia: <strong className="text-emerald-400">{fmtCurrencyExact(progressAnalytics.avgNetPerDay)}</strong> · {Math.round(progressAnalytics.avgKmPerDay)} km/dia
                </div>
              </div>

              <div className={`rounded-2xl p-4 ${surfaceCard}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase ${mutedText}`}>Ganho por Hora</span>
                  <Gauge className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums mt-1">
                  {fmtCurrencyExact(progressAnalytics.grossPerHour)}/h
                </div>
                <div className={`text-[11px] mt-1 ${mutedText}`}>
                  Líquido/h: <strong className="text-emerald-400">{fmtCurrencyExact(progressAnalytics.netPerHour)}/h</strong> ({totals.totalHours.toFixed(1)}h totais)
                </div>
              </div>

              <div className={`rounded-2xl p-4 ${surfaceCard}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase ${mutedText}`}>Rentabilidade / KM</span>
                  <Gauge className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums mt-1">
                  {fmtCurrencyExact(progressAnalytics.grossPerKm)}/km
                </div>
                <div className={`text-[11px] mt-1 ${mutedText}`}>
                  Lucro/km: <strong className="text-current">{fmtCurrencyExact(progressAnalytics.netPerKm)}</strong> · Custo/km: {fmtCurrencyExact(progressAnalytics.expensePerKm)}
                </div>
              </div>

              <div className={`rounded-2xl p-4 ${surfaceCard}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase ${mutedText}`}>Margem Líquida</span>
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                </div>
                <div
                  className={`text-2xl sm:text-3xl font-black tabular-nums mt-1 ${
                    progressAnalytics.profitMarginPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {progressAnalytics.profitMarginPct}%
                </div>
                <div className={`text-[11px] mt-1 ${mutedText}`}>
                  Lucro Real: <strong className="text-current">{fmtCurrencyExact(totals.lucro)}</strong>
                </div>
              </div>

              <div className={`rounded-2xl p-4 ${surfaceCard}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase ${mutedText}`}>Combustível Est.</span>
                  <Fuel className="w-4 h-4 text-[#FF6A1A]" />
                </div>
                <div className="text-xl sm:text-2xl font-black tabular-nums mt-1">
                  {progressAnalytics.estimatedFuelLiters.toFixed(1)} L
                </div>
                <div className={`text-[11px] mt-1 ${mutedText}`}>
                  Est. <strong className="text-current">{fmtCurrencyExact(progressAnalytics.estimatedFuelCost)}</strong> ({dbState.fuelConfig.kmPerLiter} km/L)
                </div>
              </div>

              <div className={`rounded-2xl p-4 ${surfaceCard}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase ${mutedText}`}>Saúde da Moto</span>
                  <Wrench className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black tabular-nums mt-1">
                  {progressAnalytics.healthyMaintCount}/{progressAnalytics.totalMaintItems} em dia
                </div>
                <div className={`text-[11px] mt-1 ${mutedText}`}>
                  Investido em trocas: <strong className="text-current">{fmtMoney(progressAnalytics.totalMaintHistorySpent)}</strong>
                </div>
              </div>
            </div>

            {/* SECTION 3: RECORDES PESSOAIS & DESTAQUES DO PILOTO */}
            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-black">Recordes Pessoais & Destaques da Operação</h2>
                  <p className={`text-xs ${mutedText}`}>
                    Seus melhores marcos históricos calculados automaticamente a partir dos seus registros
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Recorde 1: Melhor Dia de Faturamento */}
                <div className={`rounded-2xl p-4 ${surfaceSubtle}`}>
                  <div className="text-[11px] font-extrabold uppercase text-[#FF6A1A]">
                    🏆 Melhor Dia de Ganhos
                  </div>
                  {progressAnalytics.bestDayByRev ? (
                    <>
                      <div className="text-xl font-black tabular-nums mt-1.5">
                        {fmtCurrencyExact(progressAnalytics.bestDayByRev.rev)}
                      </div>
                      <div className={`text-xs mt-1 ${mutedText}`}>
                        Data: <strong className="text-current">{progressAnalytics.bestDayByRev.date.split('-').reverse().join('/')}</strong>
                      </div>
                      <div className={`text-[11px] mt-0.5 ${mutedText}`}>
                        {progressAnalytics.bestDayByRev.km} km · {progressAnalytics.bestDayByRev.hours.toFixed(1)}h trabalhadas
                      </div>
                    </>
                  ) : (
                    <div className={`text-xs mt-2 ${mutedText}`}>
                      Registre seu primeiro ganho para desbloquear seu recorde diário.
                    </div>
                  )}
                </div>

                {/* Recorde 2: Melhor Hora Produtiva */}
                <div className={`rounded-2xl p-4 ${surfaceSubtle}`}>
                  <div className="text-[11px] font-extrabold uppercase text-emerald-400">
                    ⚡ Maior Produtividade / Hora
                  </div>
                  {progressAnalytics.bestDayByHourly ? (
                    <>
                      <div className="text-xl font-black tabular-nums text-emerald-400 mt-1.5">
                        {fmtCurrencyExact(
                          progressAnalytics.bestDayByHourly.rev / progressAnalytics.bestDayByHourly.hours
                        )}
                        /h
                      </div>
                      <div className={`text-xs mt-1 ${mutedText}`}>
                        Data: <strong className="text-current">{progressAnalytics.bestDayByHourly.date.split('-').reverse().join('/')}</strong>
                      </div>
                      <div className={`text-[11px] mt-0.5 ${mutedText}`}>
                        {fmtCurrencyExact(progressAnalytics.bestDayByHourly.rev)} em {progressAnalytics.bestDayByHourly.hours.toFixed(1)}h
                      </div>
                    </>
                  ) : (
                    <div className={`text-xs mt-2 ${mutedText}`}>
                      Informe as horas trabalhadas nos lançamentos para medir seu pico de R$/h.
                    </div>
                  )}
                </div>

                {/* Recorde 3: Aplicativo Mais Rentável */}
                <div className={`rounded-2xl p-4 ${surfaceSubtle}`}>
                  <div className="text-[11px] font-extrabold uppercase text-sky-400">
                    🛵 App Campeão de Receita
                  </div>
                  {progressAnalytics.bestApp ? (
                    <>
                      <div className="text-lg font-black mt-1.5 flex items-center gap-1.5 truncate">
                        <span>{progressAnalytics.bestApp.icon}</span>
                        <span className="truncate">{progressAnalytics.bestApp.name}</span>
                      </div>
                      <div className={`text-xs mt-1 ${mutedText}`}>
                        Total: <strong className="text-sky-400">{fmtCurrencyExact(progressAnalytics.bestApp.rev)}</strong> ({progressAnalytics.bestApp.sharePct}%)
                      </div>
                      <div className={`text-[11px] mt-0.5 ${mutedText}`}>
                        {fmtCurrencyExact(progressAnalytics.bestApp.revPerKm)}/km · {fmtCurrencyExact(progressAnalytics.bestApp.revPerHour)}/h
                      </div>
                    </>
                  ) : (
                    <div className={`text-xs mt-2 ${mutedText}`}>
                      Ainda sem corridas registradas por aplicativo.
                    </div>
                  )}
                </div>

                {/* Recorde 4: Melhor Turno */}
                <div className={`rounded-2xl p-4 ${surfaceSubtle}`}>
                  <div className="text-[11px] font-extrabold uppercase text-amber-400">
                    🌙 Turno Mais Lucrativo
                  </div>
                  {progressAnalytics.bestShift ? (
                    <>
                      <div className="text-base font-black mt-1.5 truncate">
                        {progressAnalytics.bestShift.name}
                      </div>
                      <div className={`text-xs mt-1 ${mutedText}`}>
                        Total: <strong className="text-amber-400">{fmtCurrencyExact(progressAnalytics.bestShift.rev)}</strong> ({progressAnalytics.bestShift.sharePct}%)
                      </div>
                      <div className={`text-[11px] mt-0.5 ${mutedText}`}>
                        {fmtCurrencyExact(progressAnalytics.bestShift.revPerHour)}/h · {progressAnalytics.bestShift.count} lançamento(s)
                      </div>
                    </>
                  ) : (
                    <div className={`text-xs mt-2 ${mutedText}`}>
                      Registre seus turnos para descobrir o horário mais rentável.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 4: COMPARATIVO DE EFICIÊNCIA POR APLICATIVO E POR TURNO */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Ranking por Aplicativo */}
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-black">Desempenho por Aplicativo / Fonte</h2>
                    <p className={`text-xs ${mutedText}`}>Comparativo de ganhos, R$/km e R$/h em cada app</p>
                  </div>
                  <span className={`text-xs font-bold ${mutedText}`}>
                    {progressAnalytics.appPerformance.length} ativo(s)
                  </span>
                </div>

                {progressAnalytics.appPerformance.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {progressAnalytics.appPerformance.map(app => (
                      <div key={app.id} className={`rounded-2xl p-3.5 ${surfaceSubtle}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg shrink-0">{app.icon}</span>
                            <span className="text-xs sm:text-sm font-black truncate">{app.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FF6A1A]/15 text-[#FF6A1A]`}>
                              {app.sharePct}%
                            </span>
                          </div>
                          <span className="text-xs sm:text-sm font-black tabular-nums text-emerald-400 shrink-0">
                            {fmtCurrencyExact(app.rev)}
                          </span>
                        </div>

                        <div className={`w-full h-1.5 rounded-full overflow-hidden my-2 ${isDark ? 'bg-neutral-800' : 'bg-slate-200'}`}>
                          <div
                            className="h-full rounded-full bg-[#FF6A1A] dashboard-progress-fill"
                            style={{ width: `${Math.max(4, app.sharePct)}%` }}
                          />
                        </div>

                        <div className={`flex flex-wrap items-center justify-between gap-2 text-[11px] ${mutedText}`}>
                          <span>{app.km.toLocaleString('pt-BR')} km · {app.hours.toFixed(1)}h · {app.count} reg(s)</span>
                          <span className="font-bold text-current">
                            {fmtCurrencyExact(app.revPerKm)}/km · {fmtCurrencyExact(app.revPerHour)}/h
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`rounded-2xl p-6 text-center text-xs ${surfaceSubtle} ${mutedText}`}>
                    Adicione corridas na tela inicial para visualizar o ranking comparativo entre aplicativos.
                  </div>
                )}
              </div>

              {/* Ranking por Turno */}
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-black">Eficiência por Turno de Trabalho</h2>
                    <p className={`text-xs ${mutedText}`}>Descubra em quais horários sua hora vale mais</p>
                  </div>
                  <span className={`text-xs font-bold ${mutedText}`}>
                    {progressAnalytics.shiftPerformance.length} turno(s)
                  </span>
                </div>

                {progressAnalytics.shiftPerformance.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {progressAnalytics.shiftPerformance.map(sh => (
                      <div key={sh.id} className={`rounded-2xl p-3.5 ${surfaceSubtle}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs sm:text-sm font-black truncate">{sh.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400">
                              {sh.sharePct}%
                            </span>
                          </div>
                          <span className="text-xs sm:text-sm font-black tabular-nums text-sky-400 shrink-0">
                            {fmtCurrencyExact(sh.rev)}
                          </span>
                        </div>

                        <div className={`w-full h-1.5 rounded-full overflow-hidden my-2 ${isDark ? 'bg-neutral-800' : 'bg-slate-200'}`}>
                          <div
                            className="h-full rounded-full bg-sky-400 dashboard-progress-fill"
                            style={{ width: `${Math.max(4, sh.sharePct)}%` }}
                          />
                        </div>

                        <div className={`flex flex-wrap items-center justify-between gap-2 text-[11px] ${mutedText}`}>
                          <span>{sh.km.toLocaleString('pt-BR')} km · {sh.hours.toFixed(1)}h · {sh.count} reg(s)</span>
                          <span className="font-bold text-current">
                            {fmtCurrencyExact(sh.revPerHour)}/h · {fmtCurrencyExact(sh.revPerKm)}/km
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`rounded-2xl p-6 text-center text-xs ${surfaceSubtle} ${mutedText}`}>
                    Seus turnos aparecerão aqui assim que você registrar seus ganhos diários.
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 5: GRÁFICO DE LINHA (RECHARTS) - EVOLUÇÃO DOS GANHOS DIÁRIOS NOS ÚLTIMOS 30 DIAS */}
            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black">
                      Evolução dos Ganhos Diários (Últimos 30 Dias)
                    </h2>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#FF6A1A]/15 text-[#FF6A1A] border border-[#FF6A1A]/30">
                      Gráfico de Linha · 30 Dias
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${mutedText}`}>
                    Curva diária de faturamento bruto comparada com a sua Meta Diária ({fmtMoney(progressAnalytics.dailyGoal)})
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3">
                  <div className={`rounded-xl px-3 py-2 ${surfaceSubtle}`}>
                    <div className={`text-[10px] font-semibold ${mutedText}`}>Total 30 Dias</div>
                    <div className="text-xs sm:text-sm font-black tabular-nums text-[#FF6A1A]">
                      {fmtCurrencyExact(progressAnalytics.total30DaysRev)}
                    </div>
                  </div>
                  <div className={`rounded-xl px-3 py-2 ${surfaceSubtle}`}>
                    <div className={`text-[10px] font-semibold ${mutedText}`}>Média / Dia Ativo</div>
                    <div className="text-xs sm:text-sm font-black tabular-nums text-emerald-400">
                      {fmtCurrencyExact(progressAnalytics.avg30DaysActiveRev)}
                    </div>
                  </div>
                  <div className={`rounded-xl px-3 py-2 ${surfaceSubtle}`}>
                    <div className={`text-[10px] font-semibold ${mutedText}`}>Metas Batidas (30d)</div>
                    <div className="text-xs sm:text-sm font-black tabular-nums text-sky-400">
                      {progressAnalytics.daysMetGoalIn30} dia(s)
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full h-72 sm:h-80 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={progressAnalytics.last30DaysEvolution}
                    margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#1e293b' : '#e2e8f0'}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      stroke={isDark ? '#94a3b8' : '#64748b'}
                      tick={{ fontSize: 11, fontWeight: 700 }}
                      tickLine={false}
                      axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                      minTickGap={16}
                    />
                    <YAxis
                      stroke={isDark ? '#94a3b8' : '#64748b'}
                      tick={{ fontSize: 11, fontWeight: 700 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val: number) => `R$ ${val}`}
                      width={68}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const point = payload[0].payload;
                        return (
                          <div
                            className={`rounded-2xl p-3 shadow-xl border text-xs ${
                              isDark
                                ? 'bg-black border-neutral-800 text-slate-100'
                                : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          >
                            <div className="font-black text-[#FF6A1A] mb-1">
                              Data: {point.fullDateLabel}
                            </div>
                            <div className="flex items-center justify-between gap-4 font-bold">
                              <span className={mutedText}>Ganhos do Dia:</span>
                              <span className="text-emerald-400 font-black tabular-nums">
                                {fmtCurrencyExact(point.ganhos)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 mt-0.5">
                              <span className={mutedText}>Meta Diária:</span>
                              <span className="font-bold tabular-nums">
                                {fmtCurrencyExact(point.metaDiaria)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 mt-0.5">
                              <span className={mutedText}>Rodagem / Horas:</span>
                              <span className="font-bold tabular-nums">
                                {point.km} km · {point.hours}h
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      y={progressAnalytics.dailyGoal}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Meta: ${fmtMoney(progressAnalytics.dailyGoal)}`,
                        position: 'insideTopRight',
                        fill: '#10b981',
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ganhos"
                      name="Ganhos Diários (R$)"
                      stroke="#FF6A1A"
                      strokeWidth={3}
                      dot={{ r: 3, fill: '#FF6A1A', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#FF6A1A', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SECTION 5B: EVOLUÇÃO DOS ÚLTIMOS 7 DIAS VS META DIÁRIA */}
            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-black">
                    Desempenho nos Últimos 7 Dias vs Meta Diária ({fmtMoney(progressAnalytics.dailyGoal)})
                  </h2>
                  <p className={`text-xs ${mutedText}`}>
                    Acompanhe a consistência diária de ganhos, quilometragem e produtividade por hora
                  </p>
                </div>
                <span className="text-xs font-extrabold text-emerald-400">
                  {progressAnalytics.last7DaysDetailed.filter(d => d.metGoal).length}/7 dias com meta batida
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
                {progressAnalytics.last7DaysDetailed.map(day => (
                  <div
                    key={day.date}
                    className={`rounded-2xl p-3 flex flex-col justify-between gap-2 border ${
                      day.metGoal
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : day.rev > 0
                        ? 'border-[#FF6A1A]/30 bg-[#FF6A1A]/5'
                        : isDark
                        ? 'border-neutral-800/70 bg-transparent'
                        : 'border-slate-200 bg-slate-100/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black">{day.label}</span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            day.metGoal
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : day.rev > 0
                              ? 'bg-[#FF6A1A]/20 text-[#FF6A1A]'
                              : `${mutedText}`
                          }`}
                        >
                          {day.goalPct}%
                        </span>
                      </div>

                      <div className="text-sm sm:text-base font-black tabular-nums mt-1.5">
                        {fmtMoney(day.rev)}
                      </div>

                      <div className={`w-full h-1.5 rounded-full overflow-hidden my-2 ${isDark ? 'bg-neutral-800' : 'bg-slate-200'}`}>
                        <div
                          className={`h-full rounded-full dashboard-progress-fill ${
                            day.metGoal ? 'bg-emerald-400' : 'bg-[#FF6A1A]'
                          }`}
                          style={{ width: `${day.goalPct}%` }}
                        />
                      </div>
                    </div>

                    <div className={`text-[10px] flex flex-col gap-0.5 ${mutedText}`}>
                      <span>{day.km} km · {day.hours.toFixed(1)}h</span>
                      <span className="font-bold text-current">
                        {day.hours > 0 ? `${fmtMoney(day.revPerHour)}/h` : 'Sem horas'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 6: GALERIA COMPLETA DE CONQUISTAS COM PROGRESSO INDIVIDUAL */}
            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-black">Galeria de Conquistas & Marcos do Piloto</h2>
                  <p className={`text-xs ${mutedText}`}>
                    Acompanhe o progresso individual de cada medalha conforme você roda e registra seus ganhos
                  </p>
                </div>
                <span className="text-xs font-black px-3 py-1 rounded-xl bg-[#FF6A1A]/15 text-[#FF6A1A] border border-[#FF6A1A]/30 self-start sm:self-center">
                  {progressAnalytics.unlockedCount} de {progressAnalytics.achievements.length} Concluídas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {progressAnalytics.achievements.map(ach => (
                  <div
                    key={ach.id}
                    className={`rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all border ${
                      ach.unlocked
                        ? 'border-[#FF6A1A]/50 bg-[#FF6A1A]/5'
                        : `${surfaceSubtle} opacity-80`
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                            ach.unlocked ? 'bg-[#FF6A1A]/20' : `bg-transparent border ${dividerBorder} grayscale`
                          }`}
                        >
                          {ach.icon}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-black">{ach.title}</div>
                          <p className={`text-[11px] mt-0.5 leading-snug ${mutedText}`}>{ach.desc}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
                          ach.unlocked
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : `bg-transparent border ${dividerBorder} text-slate-400`
                        }`}
                      >
                        {ach.unlocked ? 'Desbloqueada' : `${ach.pct}%`}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className={mutedText}>Progresso</span>
                        <span className="font-black tabular-nums">
                          {ach.unit === 'R$'
                            ? `${fmtMoney(ach.current)} / ${fmtMoney(ach.target)}`
                            : `${Math.round(ach.current).toLocaleString('pt-BR')} / ${ach.target.toLocaleString('pt-BR')} ${ach.unit}`}
                        </span>
                      </div>
                      <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-slate-200'}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 dashboard-progress-fill ${
                            ach.unlocked ? 'bg-emerald-400' : 'bg-[#FF6A1A]'
                          }`}
                          style={{ width: `${ach.pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 6: CONFIGURAÇÕES ================= */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-6 max-w-3xl pb-16">
            {/* 1. TOPO: IDENTIFICAÇÃO DO PILOTO (Minimalista, Sem Cards) */}
            <div className={`pb-3 border-b ${dividerBorder}`}>
              <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Configurações</h1>
              <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                <span className={`text-base font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{currentUser.name}</span>
                <span className={`text-xs ${mutedText}`}>•</span>
                <span className={`text-xs font-medium ${mutedText}`}>
                  {currentUser.email}{currentUser.phone ? ` · ${currentUser.phone}` : ''}
                </span>
              </div>
            </div>

            {/* 2. METAS FINANCEIRAS (Design Minimalista sem cards) */}
            <div className="flex flex-col gap-3">
              <div className="text-xs font-black uppercase tracking-wider text-[#FF6A1A]">
                Metas de Faturamento
              </div>

              {/* Meta Diária */}
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3 border-b ${dividerBorder}`}>
                <div>
                  <div className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Meta Diária</div>
                  <div className={`text-xs ${mutedText}`}>Meta de faturamento do dia no Painel e Mochilinha</div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-center">
                  <span className="text-xs font-bold text-[#FF6A1A]">R$</span>
                  <FreeNumberInput
                    value={dbState.dailyGoal}
                    onValueChange={val =>
                      persistAndEnqueueWorkManager({
                        ...dbState,
                        dailyGoal: Math.max(0, val),
                      })
                    }
                    className={`w-28 px-3 py-1.5 rounded-lg text-right font-black tabular-nums outline-none ${inputSurface}`}
                  />
                </div>
              </div>

              {/* Meta Semanal / Mensal */}
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3 border-b ${dividerBorder}`}>
                <div>
                  <div className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Meta Semanal / Mensal</div>
                  <div className={`text-xs ${mutedText}`}>Faturamento acumulado exibido no início</div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-center">
                  <span className="text-xs font-bold text-[#FF6A1A]">R$</span>
                  <FreeNumberInput
                    step="50"
                    value={dbState.weeklyGoal ?? 0}
                    onValueChange={val =>
                      persistAndEnqueueWorkManager({
                        ...dbState,
                        weeklyGoal: Math.max(0, val),
                      })
                    }
                    className={`w-28 px-3 py-1.5 rounded-lg text-right font-black tabular-nums outline-none ${inputSurface}`}
                  />
                </div>
              </div>

              {/* Meta Personalizada de Ganhos */}
              <div className={`flex flex-col gap-3 py-3 border-b ${dividerBorder}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      <Target className="w-4 h-4 text-[#FF6A1A]" />
                      <span>Meta Personalizada de Ganhos</span>
                    </div>
                    <div className={`text-xs ${mutedText}`}>
                      Alvo total com contagem regressiva de dias
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#FF6A1A] self-start sm:self-center">
                    ⏳ {getCustomGoalCountdown('date', dbState.customGoalDays, dbState.customGoalTargetDate).countdownBadgeText}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>
                      Valor Alvo (R$)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#FF6A1A]">R$</span>
                      <FreeNumberInput
                        step="50"
                        value={dbState.customGoalTarget ?? 0}
                        onValueChange={val =>
                          persistAndEnqueueWorkManager({
                            ...dbState,
                            customGoalTarget: Math.max(0, val),
                            customGoalMode: 'date',
                          })
                        }
                        className={`w-full px-3 py-1.5 rounded-lg text-left font-black tabular-nums outline-none ${inputSurface}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>
                      Data Limite
                    </label>
                    <input
                      type="date"
                      min={todayStr()}
                      value={dbState.customGoalTargetDate || getDefaultFutureDate(20)}
                      onChange={e =>
                        persistAndEnqueueWorkManager({
                          ...dbState,
                          customGoalTargetDate: e.target.value,
                          customGoalMode: 'date',
                        })
                      }
                      className={`w-full px-3 py-1.5 rounded-lg text-left font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. SISTEMA & PERMISSÕES (Sem fundos nos ícones nem nos botões) */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="text-xs font-black uppercase tracking-wider text-[#FF6A1A]">
                Sistema & Permissões
              </div>

              {/* Notificações do Sistema */}
              <div className={`py-3 border-b ${dividerBorder} flex flex-col gap-2.5`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <BellRing className={`w-5 h-5 shrink-0 mt-0.5 ${isMaintNotificationsEnabled ? 'text-[#FF6A1A]' : 'text-slate-500'}`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                          Notificações do Sistema
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            isMaintNotificationsEnabled
                              ? 'text-emerald-500 dark:text-emerald-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {isMaintNotificationsEnabled ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${mutedText}`}>
                        Alertas de manutenção preventiva e confirmação de depósitos.
                      </p>
                    </div>
                  </div>

                  {/* Switch */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isMaintNotificationsEnabled}
                      onClick={() => handleToggleMaintenanceNotifications(!isMaintNotificationsEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isMaintNotificationsEnabled ? 'bg-[#FF6A1A]' : isDark ? 'bg-slate-700' : 'bg-slate-300'
                      }`}
                      title={
                        isMaintNotificationsEnabled
                          ? 'Desabilitar notificações'
                          : 'Habilitar notificações'
                      }
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isMaintNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Sublinha de monitoramento e teste (suave, sem fundo pesado) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                  <div className={`flex items-center gap-2 ${mutedText}`}>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        !isMaintNotificationsEnabled
                          ? 'bg-slate-500'
                          : maintAlertStats.overdueCount > 0
                          ? 'bg-rose-500 animate-pulse'
                          : maintAlertStats.alertCount > 0
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <span>
                      {!isMaintNotificationsEnabled
                        ? 'Alertas silenciados'
                        : `${maintAlertStats.overdueCount} vencida(s) · ${maintAlertStats.alertCount} no ponto de alerta`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendTestNotification}
                    className={`self-start sm:self-auto text-xs font-semibold text-[#FF6A1A] hover:text-[#ff7b33] bg-transparent border border-transparent ${
                      isDark ? 'hover:border-slate-800' : 'hover:border-slate-300'
                    } px-2 py-1 rounded-md cursor-pointer flex items-center gap-1.5 transition-colors`}
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>Enviar teste</span>
                  </button>
                </div>
                {notifTestFeedback && (
                  <p className={`text-[11px] font-medium ${mutedText}`}>{notifTestFeedback}</p>
                )}
              </div>

              {/* Permissão de Voz */}
              <div className={`py-3 border-b ${dividerBorder} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                <div className="flex items-start gap-2.5">
                  <Mic className={`w-5 h-5 shrink-0 mt-0.5 ${micPermissionStatus === 'granted' ? 'text-emerald-500 dark:text-emerald-400' : 'text-[#FF6A1A]'}`} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                        Comando de Voz
                      </span>
                      <span className={`text-[10px] font-bold uppercase ${
                        micPermissionStatus === 'granted'
                          ? 'text-emerald-500 dark:text-emerald-400'
                          : micPermissionStatus === 'denied'
                          ? 'text-rose-500 dark:text-rose-400'
                          : 'text-amber-500 dark:text-amber-400'
                      }`}>
                        {micPermissionStatus === 'granted' ? 'Ativo' : micPermissionStatus === 'denied' ? 'Bloqueado' : 'Pendente'}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${mutedText}`}>
                      Ditar corridas e despesas falando.
                    </p>
                  </div>
                </div>

                <div className="flex items-center self-start sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (micPermissionStatus === 'granted') {
                        handleTriggerVoiceDictation();
                      } else {
                        setMicPermissionError(null);
                        setAutoRecordAfterPermission(false);
                        setShowMicPermissionModal(true);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 bg-transparent border ${
                      isDark
                        ? 'text-slate-200 hover:text-white border-slate-700 hover:border-slate-500'
                        : 'text-slate-700 hover:text-slate-900 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>
                      {micPermissionStatus === 'granted' ? 'Testar Voz' : 'Permitir Microfone'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Permissão de Localização GPS */}
              <div className={`py-3 border-b ${dividerBorder} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                <div className="flex items-start gap-2.5">
                  <Navigation className={`w-5 h-5 shrink-0 mt-0.5 ${gpsPermissionStatus === 'granted' ? 'text-emerald-500 dark:text-emerald-400' : 'text-sky-500 dark:text-sky-400'}`} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                        Localização GPS (Odômetro)
                      </span>
                      <span className={`text-[10px] font-bold uppercase ${
                        gpsPermissionStatus === 'granted'
                          ? 'text-emerald-500 dark:text-emerald-400'
                          : gpsPermissionStatus === 'denied'
                          ? 'text-rose-500 dark:text-rose-400'
                          : 'text-amber-500 dark:text-amber-400'
                      }`}>
                        {gpsPermissionStatus === 'granted' ? 'Ativo' : gpsPermissionStatus === 'denied' ? 'Bloqueado' : 'Pendente'}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${mutedText}`}>
                      Medição automática de KM no Modo Turno.
                    </p>
                  </div>
                </div>

                <div className="flex items-center self-start sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setGpsPermissionError(null);
                      setShowGpsPermissionModal(true);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 bg-transparent border ${
                      isDark
                        ? 'text-slate-200 hover:text-white border-slate-700 hover:border-slate-500'
                        : 'text-slate-700 hover:text-slate-900 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>
                      {gpsPermissionStatus === 'granted' ? 'Testar GPS' : 'Ativar GPS'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. PREFERÊNCIAS E TEMA (Minimalista) */}
            <div className={`flex items-center justify-between gap-4 py-3 border-b ${dividerBorder}`}>
              <div>
                <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Tema da Interface</span>
                <div className={`text-xs ${mutedText}`}>Alternar entre Modo Escuro e Modo Claro</div>
              </div>
              <button
                type="button"
                onClick={() => setIsDark(prev => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold bg-transparent border cursor-pointer transition-colors flex items-center gap-2 ${
                  isDark
                    ? 'text-slate-300 hover:text-white border-slate-700 hover:border-slate-500'
                    : 'text-slate-700 hover:text-slate-900 border-slate-300 hover:border-slate-400'
                }`}
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
                <span>{isDark ? 'Modo Escuro' : 'Modo Claro'}</span>
              </button>
            </div>

            {/* 5. DADOS LOCAIS */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b ${dividerBorder}`}>
              <div>
                <div className="text-sm font-bold text-rose-500">Restaurar Banco de Dados</div>
                <div className={`text-xs ${mutedText}`}>Restaura os dados originais no armazenamento local</div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-500 hover:text-rose-400 bg-transparent border border-rose-500/40 hover:border-rose-500/70 cursor-pointer self-start sm:self-auto transition-colors"
              >
                Apagar Dados Locais
              </button>
            </div>

            {/* 6. PRIVACIDADE E TERMOS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
              <div>
                <div className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Privacidade & Termos Legais</div>
                <div className={`text-xs ${mutedText}`}>Em conformidade com LGPD e Google Play Store</div>
              </div>
              <a
                href="/privacidade.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 hover:underline self-start sm:self-auto transition-colors"
              >
                Ver Política de Privacidade →
              </a>
            </div>
          </div>
        )}
      </main>

      {/* COCKPIT DE LANÇAMENTOS RÁPIDOS (Aberto pelo botão principal Novo Registro) */}
      {showQuickRegisterCockpit && (
        <div
          className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-xs ${
            isQuickRegisterClosing ? 'cockpit-backdrop-out' : 'cockpit-backdrop-in'
          }`}
          onClick={() => closeQuickRegisterCockpit()}
          aria-modal="true"
          role="dialog"
          aria-label="Cockpit de Novo Registro"
        >
          <div
            className="fixed right-3 left-3 sm:left-auto sm:right-6 sm:w-[400px] flex justify-end pointer-events-none"
            style={{
              bottom: 'calc(8.75rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              className={`w-full pointer-events-auto rounded-3xl p-4 sm:p-5 ${modalSurface} ${
                isQuickRegisterClosing ? 'cockpit-panel-out' : 'cockpit-panel-in'
              }`}
            >
              <div className={`flex items-center justify-between gap-2 pb-3 mb-3.5 border-b ${dividerBorder}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-[#FF6A1A] animate-pulse shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6A1A] block leading-none">
                      Cockpit Rápido
                    </span>
                    <h3 className="text-sm sm:text-base font-black leading-tight mt-0.5 truncate">
                      O que deseja registrar?
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => closeQuickRegisterCockpit()}
                  className={`p-1.5 rounded-xl ${surfaceSubtle} hover:border-[#FF6A1A] transition-colors cursor-pointer shrink-0`}
                  aria-label="Fechar Cockpit"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'ganho',
                    title: 'Registrar Ganho',
                    subtitle: 'Corrida ou entrega',
                    icon: TrendingUp,
                    badgeClass: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400',
                    hoverBorder: 'hover:border-emerald-500/60',
                    spanFull: false,
                    onSelect: () => {
                      closeQuickRegisterCockpit(true);
                      openNewEntryModal('ganho', true);
                    },
                  },
                  {
                    id: 'despesa',
                    title: 'Registrar Despesa',
                    subtitle: 'Combustível ou gasto',
                    icon: Receipt,
                    badgeClass: 'bg-rose-500/15 border-rose-500/35 text-rose-400',
                    hoverBorder: 'hover:border-rose-500/60',
                    spanFull: false,
                    onSelect: () => {
                      closeQuickRegisterCockpit(true);
                      openNewEntryModal('gasto', true);
                    },
                  },
                  {
                    id: 'despesa_moto',
                    title: 'Despesa da Moto',
                    subtitle: 'Manutenção ou peça',
                    icon: Wrench,
                    badgeClass: 'bg-[#FF6A1A]/15 border-[#FF6A1A]/35 text-[#FF6A1A]',
                    hoverBorder: 'hover:border-[#FF6A1A]/60',
                    spanFull: false,
                    onSelect: () => {
                      closeQuickRegisterCockpit(true);
                      openNewBikeExpenseModal();
                    },
                  },
                  {
                    id: 'despesa_casa',
                    title: 'Despesa da Casa',
                    subtitle: 'Conta fixa e família',
                    icon: Home,
                    badgeClass: 'bg-blue-500/15 border-blue-500/35 text-blue-400',
                    hoverBorder: 'hover:border-blue-500/60',
                    spanFull: false,
                    onSelect: () => {
                      closeQuickRegisterCockpit(true);
                      openNewHouseholdExpenseModal();
                    },
                  },
                  {
                    id: 'faturamento_previsto',
                    title: 'Faturamento Previsto',
                    subtitle: 'Selecionar dias futuros no calendário',
                    icon: CalendarDays,
                    badgeClass: 'bg-sky-500/15 border-sky-500/35 text-sky-400',
                    hoverBorder: 'hover:border-sky-500/60',
                    spanFull: true,
                    onSelect: () => {
                      closeQuickRegisterCockpit(true);
                      openNewProjectedRevenueModal();
                    },
                  },
                ].map((action, idx) => {
                  const ActionIcon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={action.onSelect}
                      style={{
                        animationDelay: isQuickRegisterClosing ? '0ms' : `${idx * 42}ms`,
                      }}
                      className={`cockpit-item-anim group text-left p-3 rounded-2xl border transition-all duration-200 active:scale-[0.97] cursor-pointer flex ${
                        action.spanFull ? 'col-span-2 items-center justify-between gap-3' : 'flex-col justify-between gap-2.5 min-h-[88px]'
                      } ${
                        isDark
                          ? 'bg-neutral-950/90 border-neutral-800/90 hover:bg-neutral-900'
                          : 'bg-slate-50/90 border-slate-200 hover:bg-white shadow-xs'
                      } ${action.hoverBorder}`}
                    >
                      <div className={`flex items-center ${action.spanFull ? 'gap-3 min-w-0' : 'justify-between w-full'}`}>
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${action.badgeClass}`}>
                          <ActionIcon className="w-4 h-4" />
                        </div>
                        {action.spanFull ? (
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-black block leading-tight truncate">
                              {action.title}
                            </span>
                            <span className={`text-[11px] font-medium block mt-0.5 truncate ${mutedText}`}>
                              {action.subtitle}
                            </span>
                          </div>
                        ) : (
                          <ChevronRight className={`w-3.5 h-3.5 opacity-40 group-hover:opacity-90 group-hover:translate-x-0.5 transition-all ${mutedText}`} />
                        )}
                      </div>
                      {action.spanFull ? (
                        <ChevronRight className={`w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ${mutedText}`} />
                      ) : (
                        <div className="min-w-0">
                          <span className="text-xs sm:text-[13px] font-black block leading-tight truncate">
                            {action.title}
                          </span>
                          <span className={`text-[10px] sm:text-[11px] font-medium block mt-0.5 truncate ${mutedText}`}>
                            {action.subtitle}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTONS: DITAR POR VOZ + NOVO REGISTRO (Acima da barra de navegação, lado direito) */}
      <div
        className={`fixed right-4 sm:right-6 ${showQuickRegisterCockpit ? 'z-50' : 'z-40'} flex items-center gap-2`}
        style={{
          bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Voice Dictation Button */}
        <button
          type="button"
          onClick={() => {
            if (showQuickRegisterCockpit) closeQuickRegisterCockpit(true);
            handleTriggerVoiceDictation();
          }}
          title="Ditar Corrida ou Gasto por Voz (Hands-Free)"
          aria-label="Ditar por Voz"
          className={`h-11 sm:h-12 px-3 sm:px-3.5 rounded-2xl shadow-lg border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
            isRecordingVoice
              ? 'bg-rose-500 text-white border-rose-300 animate-pulse ring-4 ring-rose-500/30'
              : isDark
              ? 'bg-[#181A24] text-[#FF6A1A] border-[#FF6A1A]/40 hover:bg-[#202330]'
              : 'bg-white text-[#FF6A1A] border-[#FF6A1A]/40 hover:bg-orange-50 shadow-md'
          }`}
        >
          <Mic className={`w-4 h-4 sm:w-5 sm:h-5 ${isRecordingVoice ? 'animate-bounce' : ''}`} />
          <span className="text-xs font-black hidden xs:inline">
            {isRecordingVoice ? 'Ouvindo...' : 'Voz'}
          </span>
        </button>

        {/* Novo Registro Button (Abre / Fecha Cockpit de Lançamentos) */}
        <button
          type="button"
          onClick={() =>
            showQuickRegisterCockpit && !isQuickRegisterClosing
              ? closeQuickRegisterCockpit()
              : openQuickRegisterCockpit()
          }
          aria-label={
            showQuickRegisterCockpit && !isQuickRegisterClosing
              ? 'Fechar Cockpit de Registros'
              : 'Novo Registro'
          }
          aria-expanded={showQuickRegisterCockpit && !isQuickRegisterClosing}
          className={`h-11 sm:h-12 px-4 sm:px-5 text-xs sm:text-sm font-black rounded-2xl shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-95 border ${
            showQuickRegisterCockpit && !isQuickRegisterClosing
              ? isDark
                ? 'bg-neutral-900 text-white border-neutral-700 hover:bg-neutral-800 shadow-black/40'
                : 'bg-slate-900 text-white border-slate-700 hover:bg-slate-800 shadow-slate-900/20'
              : 'text-black bg-[#FF6A1A] hover:bg-[#ff7b33] shadow-[#FF6A1A]/30 border-orange-300/40'
          }`}
        >
          <Plus
            className={`w-4 h-4 sm:w-5 sm:h-5 stroke-[2.8] transition-transform duration-300 ${
              showQuickRegisterCockpit && !isQuickRegisterClosing ? 'rotate-45' : 'rotate-0'
            }`}
          />
          <span>{showQuickRegisterCockpit && !isQuickRegisterClosing ? 'Fechar' : 'Novo Registro'}</span>
        </button>
      </div>

      {/* VOICE SPEECH FEEDBACK POPUP */}
      {voiceSpeechFeedback && (
        <div
          className="fixed right-4 left-4 sm:left-auto sm:w-96 z-50 p-3.5 rounded-2xl bg-[#FF6A1A] text-black font-black text-xs shadow-2xl flex items-center justify-between gap-2 border border-orange-200"
          style={{
            bottom: 'calc(9rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Mic className="w-4 h-4 shrink-0" />
            <span className="truncate">{voiceSpeechFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setVoiceSpeechFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/10 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* FLOATING BOTTOM NAVIGATION BAR (Mobile Ergonomic Thumb Zone with safe spacing) */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-md ${
          isDark ? 'bg-black/95 border-neutral-800' : 'bg-white/95 border-slate-200'
        }`}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="max-w-3xl mx-auto grid grid-cols-7 items-center h-16 px-1 sm:px-2">
          {[
            { id: 'dashboard', label: 'Painel', icon: Home },
            { id: 'maintenance', label: 'Moto', icon: Wrench },
            { id: 'billing', label: 'Finanças', icon: BarChart3 },
            { id: 'investments', label: 'Investir', icon: TrendingUp },
            { id: 'history', label: 'Histórico', icon: History },
            { id: 'progress', label: 'Progresso', icon: Trophy },
            { id: 'settings', label: 'Config', icon: Settings },
          ].map(item => {
            const IconComponent = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as NavTab)}
                className={`flex flex-col items-center justify-center min-h-[48px] py-1 cursor-pointer transition-colors touch-manipulation ${
                  active ? 'text-[#FF6A1A]' : mutedText
                }`}
              >
                <IconComponent className="w-5 h-5" />
                <span className="text-[10px] font-bold mt-0.5 sm:mt-1 whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ADD / EDIT RIDE OR EXPENSE BOTTOM SHEET MODAL (Optimized for Mobile Keyboards & Touch) */}
      {showEntryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowEntryModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 pb-6 sm:pb-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 ${modalSurface}`}
          >
            <div className={`flex items-center justify-between gap-3 ${isEntryModeDedicated || editingEntryId !== null ? `pb-4 mb-4 border-b ${dividerBorder}` : 'mb-4 sm:mb-5'}`}>
              <div className="flex items-center gap-3 min-w-0">
                {(isEntryModeDedicated || editingEntryId !== null) && (
                  <div
                    className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
                      entryMode === 'ganho'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                    }`}
                  >
                    {entryMode === 'ganho' ? <TrendingUp className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                  </div>
                )}
                <div className="min-w-0">
                  {(isEntryModeDedicated || editingEntryId !== null) && (
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider block ${
                        entryMode === 'ganho' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {entryMode === 'ganho' ? 'Entrada de Corridas' : 'Lançamento de Despesa'}
                    </span>
                  )}
                  <h3 className="text-base sm:text-lg font-black leading-tight">
                    {editingEntryId !== null
                      ? entryMode === 'ganho'
                        ? 'Editar Corrida'
                        : 'Editar Gasto'
                      : entryMode === 'ganho'
                      ? 'Registrar Corrida'
                      : 'Registrar Gasto'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                className={`p-2 rounded-xl ${surfaceSubtle} hover:border-[#FF6A1A] cursor-pointer shrink-0`}
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-Modal Voice Dictation Banner (apenas no registro de corrida; removido do registro de despesa) */}
            {entryMode === 'ganho' && (
              <button
                type="button"
                onClick={handleTriggerVoiceDictation}
                className={`w-full mb-4 py-2.5 px-3.5 rounded-2xl border flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer ${
                  isRecordingVoice
                    ? 'bg-rose-500 text-white border-rose-400 animate-pulse ring-4 ring-rose-500/30'
                    : 'bg-[#FF6A1A]/10 text-[#FF6A1A] border-[#FF6A1A]/40 hover:bg-[#FF6A1A]/20'
                }`}
              >
                <Mic className={`w-4 h-4 ${isRecordingVoice ? 'animate-bounce' : ''}`} />
                <span>
                  {isRecordingVoice
                    ? 'Ouvindo... Fale sua corrida ou gasto agora!'
                    : 'Preencher por Voz (Ex: "Ganho 25 reais no iFood 8 km")'}
                </span>
              </button>
            )}

            {!isEntryModeDedicated && editingEntryId === null && (
              <div className="grid grid-cols-2 gap-2 mb-5">
                <button
                  type="button"
                  onClick={() => setEntryMode('ganho')}
                  className={`py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
                    entryMode === 'ganho' ? 'bg-[#FF6A1A] text-black' : surfaceSubtle
                  }`}
                >
                  Ganho / Corrida
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('gasto')}
                  className={`py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
                    entryMode === 'gasto' ? 'bg-[#FF6A1A] text-black' : surfaceSubtle
                  }`}
                >
                  Gasto / Despesa
                </button>
              </div>
            )}

            {entryMode === 'ganho' ? (
              <div className="flex flex-col gap-4">
                {/* APLICATIVO / LOCAL SECTION (SELECT, ADD & EDIT) */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className={`text-xs font-bold ${mutedText}`}>Aplicativo / Local</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingApps(prev => !prev);
                        setEditingAppId(null);
                      }}
                      className={`text-[11px] font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                        isEditingApps
                          ? 'bg-[#FF6A1A] text-black'
                          : `${surfaceSubtle} text-[#FF6A1A] hover:border-[#FF6A1A]`
                      }`}
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{isEditingApps ? 'Concluir Edição' : 'Editar Apps'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {allApps.map(a => {
                      const isSelected = selectedApp === a.id;
                      const isBeingEdited = editingAppId === a.id;
                      return (
                        <div key={a.id} className="inline-flex items-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedApp(a.id);
                              if (isEditingApps) {
                                setEditingAppId(a.id);
                                setEditingAppName(a.name);
                                setEditingAppIcon(a.icon || '🛵');
                              }
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                              isBeingEdited
                                ? 'ring-2 ring-[#FF6A1A] bg-[#FF6A1A]/20 text-[#FF6A1A]'
                                : isSelected
                                ? 'bg-[#FF6A1A] text-black'
                                : `${surfaceSubtle} hover:border-[#FF6A1A]/50`
                            }`}
                          >
                            <span>{a.icon}</span>
                            <span>{a.name}</span>
                            {isEditingApps && <Edit3 className="w-3 h-3 ml-0.5 opacity-80" />}
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewAppInput(prev => !prev);
                        setEditingAppId(null);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border border-[#FF6A1A] cursor-pointer transition-colors ${
                        showNewAppInput ? 'bg-[#FF6A1A] text-black' : 'text-[#FF6A1A] hover:bg-[#FF6A1A]/10'
                      }`}
                    >
                      + Novo App / Local
                    </button>
                  </div>

                  {/* Inline Editor for an Existing App / Local */}
                  {editingAppId && (
                    <div className={`mt-2.5 p-3 rounded-2xl border border-[#FF6A1A]/50 ${surfaceSubtle} flex flex-col gap-2.5`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-[#FF6A1A]">
                          Editar Aplicativo / Local Selecionado
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingAppId(null)}
                          className={`p-1 rounded-lg ${mutedText} hover:text-white cursor-pointer`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingAppIcon}
                          onChange={e => setEditingAppIcon(e.target.value)}
                          placeholder="🛵"
                          className={`w-12 px-2 py-2 rounded-xl text-center text-sm font-bold outline-none ${inputSurface}`}
                          title="Ícone / Emoji"
                        />
                        <input
                          type="text"
                          value={editingAppName}
                          onChange={e => setEditingAppName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEditedApp();
                            }
                          }}
                          placeholder="Nome do App ou Local"
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        {allApps.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteApp(editingAppId)}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          onClick={handleSaveEditedApp}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#FF6A1A] text-black cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Salvar Alteração</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add New App / Local Input Box */}
                  {showNewAppInput && (
                    <div className={`mt-2.5 p-3 rounded-2xl border border-[#FF6A1A]/50 ${surfaceSubtle} flex flex-col gap-2.5`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-[#FF6A1A]">
                          Adicionar Novo Aplicativo ou Estabelecimento
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewAppInput(false);
                            setNewCustomAppName('');
                          }}
                          className={`p-1 rounded-lg ${mutedText} cursor-pointer`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {['🛵', '🍕', '🍔', '🍣', '📦', '🏪', '💊', '⚡'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setNewCustomAppIcon(emoji)}
                            className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center cursor-pointer transition-all ${
                              newCustomAppIcon === emoji
                                ? 'bg-[#FF6A1A] text-black scale-105 font-bold'
                                : `${isDark ? 'bg-transparent border border-neutral-800' : 'bg-transparent border border-slate-300'} hover:border-[#FF6A1A]`
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCustomAppName}
                          onChange={e => setNewCustomAppName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCreateCustomApp();
                            }
                          }}
                          placeholder="Ex: Pizzaria Central, Lalamove, Particular..."
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                        />
                        <button
                          type="button"
                          onClick={handleCreateCustomApp}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FF6A1A] text-black cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Salvar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* TURNO SECTION (100% EDITABLE: SELECT, EDIT EXISTING, ADD NEW & DELETE) */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className={`text-xs font-bold ${mutedText}`}>Turno (Editável)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextEdit = !isEditingShifts;
                        setIsEditingShifts(nextEdit);
                        if (nextEdit) {
                          const currentShiftObj = allShifts.find(s => s.id === selectedShift) || allShifts[0];
                          if (currentShiftObj) {
                            setEditingShiftId(currentShiftObj.id);
                            setEditingShiftName(currentShiftObj.name);
                          }
                        } else {
                          setEditingShiftId(null);
                        }
                      }}
                      className={`text-[11px] font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                        isEditingShifts
                          ? 'bg-[#FF6A1A] text-black'
                          : `${surfaceSubtle} text-[#FF6A1A] hover:border-[#FF6A1A]`
                      }`}
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{isEditingShifts ? 'Concluir Edição' : 'Editar Turnos'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {allShifts.map(s => {
                      const isSelected = selectedShift === s.id;
                      const isBeingEdited = editingShiftId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedShift(s.id);
                            if (isEditingShifts) {
                              setEditingShiftId(s.id);
                              setEditingShiftName(s.name);
                            }
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                            isBeingEdited
                              ? 'ring-2 ring-[#FF6A1A] bg-[#FF6A1A]/20 text-[#FF6A1A]'
                              : isSelected
                              ? 'bg-[#FF6A1A] text-black'
                              : `${surfaceSubtle} hover:border-[#FF6A1A]/50`
                          }`}
                        >
                          <span>{s.name}</span>
                          {isEditingShifts && <Edit3 className="w-3 h-3 opacity-80" />}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewShiftInput(prev => !prev);
                        setEditingShiftId(null);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border border-[#FF6A1A] cursor-pointer transition-colors ${
                        showNewShiftInput ? 'bg-[#FF6A1A] text-black' : 'text-[#FF6A1A] hover:bg-[#FF6A1A]/10'
                      }`}
                    >
                      + Novo Turno
                    </button>
                  </div>

                  {/* Inline Editor for Existing Shift */}
                  {editingShiftId && (
                    <div className={`mt-2.5 p-3 rounded-2xl border border-[#FF6A1A]/50 ${surfaceSubtle} flex flex-col gap-2.5`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-[#FF6A1A]">
                          Editar Nome / Horário do Turno
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingShiftId(null)}
                          className={`p-1 rounded-lg ${mutedText} hover:text-white cursor-pointer`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingShiftName}
                          onChange={e => setEditingShiftName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEditedShift();
                            }
                          }}
                          placeholder="Ex: Almoço (10h30-15h)"
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        {allShifts.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteShift(editingShiftId)}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir Turno</span>
                          </button>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          onClick={handleSaveEditedShift}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#FF6A1A] text-black cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Salvar Turno</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add New Shift Input Box */}
                  {showNewShiftInput && (
                    <div className={`mt-2.5 p-3 rounded-2xl border border-[#FF6A1A]/50 ${surfaceSubtle} flex flex-col gap-2`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-[#FF6A1A]">
                          Criar Novo Turno Personalizado
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewShiftInput(false);
                            setNewCustomShiftName('');
                          }}
                          className={`p-1 rounded-lg ${mutedText} cursor-pointer`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCustomShiftName}
                          onChange={e => setNewCustomShiftName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCreateCustomShift();
                            }
                          }}
                          placeholder="Ex: Comercial (08h-18h), Integral..."
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                        />
                        <button
                          type="button"
                          onClick={handleCreateCustomShift}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FF6A1A] text-black cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Salvar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Data</label>
                    <input
                      type="date"
                      value={entryDate}
                      onChange={e => setEntryDate(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-xs font-bold ${mutedText}`}>KM Rodados</label>
                      <button
                        type="button"
                        onClick={() => openQuickCalculator('KM Rodados', entryKm, val => setEntryKm(val))}
                        className="text-[11px] font-bold text-[#FF6A1A] hover:underline flex items-center gap-1 cursor-pointer"
                        title="Abrir calculadora"
                      >
                        <Calculator className="w-3 h-3" />
                        <span>Calc</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 65"
                        value={entryKm}
                        onChange={e => setEntryKm(e.target.value)}
                        className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                      />
                      <button
                        type="button"
                        onClick={() => openQuickCalculator('KM Rodados', entryKm, val => setEntryKm(val))}
                        className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-[#FF6A1A] hover:bg-[#FF6A1A]/10 text-[#FF6A1A] cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                        title="Calcular KM Rodados"
                        aria-label="Calcular KM Rodados"
                      >
                        <Calculator className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-xs font-bold ${mutedText}`}>Faturamento (R$)</label>
                      <button
                        type="button"
                        onClick={() => openQuickCalculator('Faturamento da Corrida (R$)', entryRev, val => setEntryRev(val))}
                        className="text-[11px] font-bold text-[#FF6A1A] hover:underline flex items-center gap-1 cursor-pointer"
                        title="Abrir calculadora"
                      >
                        <Calculator className="w-3 h-3" />
                        <span>Calc</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 140"
                        value={entryRev}
                        onChange={e => setEntryRev(e.target.value)}
                        className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                      />
                      <button
                        type="button"
                        onClick={() => openQuickCalculator('Faturamento da Corrida (R$)', entryRev, val => setEntryRev(val))}
                        className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-[#FF6A1A] hover:bg-[#FF6A1A]/10 text-[#FF6A1A] cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                        title="Calcular Faturamento"
                        aria-label="Calcular Faturamento"
                      >
                        <Calculator className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Horas Trabalhadas</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ex: 4.5"
                      value={entryHours}
                      onChange={e => setEntryHours(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* TIPO DE GASTO: MOTO OU CASA */}
                <div className="flex p-1 rounded-2xl bg-black/25 border border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      setExpenseType('moto');
                      if (!motoCategories.some(c => c.id === selectedCategory)) {
                        setSelectedCategory(BASE_EXPENSE_CATEGORIES[0].id);
                      }
                      setSelectedHouseholdExpenseId('');
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      expenseType === 'moto'
                        ? 'bg-[#FF6A1A] text-black shadow-md'
                        : `${mutedText} hover:text-white`
                    }`}
                  >
                    <span className="text-base">🏍️</span>
                    <span>Despesa da Moto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExpenseType('casa');
                      const householdList = dbState.householdExpenses || [];
                      if (householdList.length > 0) {
                        const found =
                          householdList.find(h => h.id === selectedHouseholdExpenseId) ||
                          householdList[0];
                        setSelectedHouseholdExpenseId(found.id);
                        setSelectedCategory(found.name);
                        if (!expenseAmount && found.monthlyAmount > 0) {
                          setExpenseAmount(String(found.monthlyAmount));
                        }
                      } else {
                        setSelectedCategory('Casa & Família');
                      }
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      expenseType === 'casa'
                        ? 'bg-amber-400 text-black shadow-md'
                        : `${mutedText} hover:text-white`
                    }`}
                  >
                    <span className="text-base">🏠</span>
                    <span>Despesa da Casa</span>
                  </button>
                </div>

                {expenseType === 'moto' ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={`text-xs font-bold ${mutedText}`}>Categoria da Moto</label>
                        <button
                          type="button"
                          onClick={() => setShowNewCatInput(prev => !prev)}
                          className="text-[11px] font-bold text-[#FF6A1A] hover:underline flex items-center gap-1 cursor-pointer"
                          title="Criar nova categoria de despesa"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{showNewCatInput ? 'Cancelar' : '+ Nova Categoria'}</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {motoCategories.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCategory(c.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                              selectedCategory === c.id ? 'bg-[#FF6A1A] text-black' : surfaceSubtle
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setShowNewCatInput(prev => !prev)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold border border-[#FF6A1A] text-[#FF6A1A] cursor-pointer"
                        >
                          + Nova Categoria
                        </button>
                      </div>
                      {showNewCatInput && (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={newCustomCatName}
                            onChange={e => setNewCustomCatName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (!newCustomCatName.trim()) return;
                                const id = 'cat_' + Date.now();
                                const nextCats = [...dbState.customCategories, { id, name: newCustomCatName.trim() }];
                                persistAndEnqueueWorkManager({ ...dbState, customCategories: nextCats });
                                setSelectedCategory(id);
                                setNewCustomCatName('');
                                setShowNewCatInput(false);
                                setEntryModalFeedback(`Categoria "${newCustomCatName.trim()}" salva e selecionada!`);
                              }
                            }}
                            placeholder="Nome da Categoria da Moto"
                            className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newCustomCatName.trim()) return;
                              const id = 'cat_' + Date.now();
                              const nextCats = [...dbState.customCategories, { id, name: newCustomCatName.trim() }];
                              persistAndEnqueueWorkManager({ ...dbState, customCategories: nextCats });
                              setSelectedCategory(id);
                              setNewCustomCatName('');
                              setShowNewCatInput(false);
                              setEntryModalFeedback(`Categoria "${newCustomCatName.trim()}" salva e selecionada!`);
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FF6A1A] text-black cursor-pointer"
                          >
                            Salvar
                          </button>
                        </div>
                      )}
                    </div>

                    {selectedCategory === 'combustivel' ? (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Data do Abastecimento</label>
                            <input
                              type="date"
                              value={entryDate}
                              onChange={e => setEntryDate(e.target.value)}
                              className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className={`text-xs font-bold ${mutedText}`}>
                                Preço Pago (R$) <span className="text-amber-400">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => openQuickCalculator('Preço Total do Abastecimento (R$)', expenseAmount, val => {
                                  setExpenseAmount(val);
                                  const numVal = parseFloat(val);
                                  const priceVal = parseFloat(fuelPricePerLiter);
                                  if (!isNaN(numVal) && numVal > 0 && !isNaN(priceVal) && priceVal > 0) {
                                    setFuelLiters((numVal / priceVal).toFixed(2));
                                  }
                                })}
                                className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                                title="Abrir calculadora"
                              >
                                <Calculator className="w-3 h-3" />
                                <span>Calc</span>
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Ex: 50.00"
                                value={expenseAmount}
                                onChange={e => {
                                  const val = e.target.value;
                                  setExpenseAmount(val);
                                  const numVal = parseFloat(val);
                                  const priceVal = parseFloat(fuelPricePerLiter);
                                  if (!isNaN(numVal) && numVal > 0 && !isNaN(priceVal) && priceVal > 0) {
                                    setFuelLiters((numVal / priceVal).toFixed(2));
                                  }
                                }}
                                className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                              />
                              <button
                                type="button"
                                onClick={() => openQuickCalculator('Preço Total do Abastecimento (R$)', expenseAmount, val => {
                                  setExpenseAmount(val);
                                  const numVal = parseFloat(val);
                                  const priceVal = parseFloat(fuelPricePerLiter);
                                  if (!isNaN(numVal) && numVal > 0 && !isNaN(priceVal) && priceVal > 0) {
                                    setFuelLiters((numVal / priceVal).toFixed(2));
                                  }
                                })}
                                className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-amber-400 hover:bg-amber-400/10 text-amber-400 cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                                title="Calcular Valor Pago"
                                aria-label="Calcular Valor Pago"
                              >
                                <Calculator className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className={`text-xs font-bold ${mutedText}`}>
                                Litros Abastecidos (L) <span className="text-[#FF6A1A]">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => openQuickCalculator('Litros Abastecidos (L)', fuelLiters, val => {
                                  setFuelLiters(val);
                                  const litersNum = parseFloat(val);
                                  const amountNum = parseFloat(expenseAmount);
                                  const priceNum = parseFloat(fuelPricePerLiter);
                                  if (!isNaN(litersNum) && litersNum > 0) {
                                    if (!isNaN(amountNum) && amountNum > 0) {
                                      setFuelPricePerLiter((amountNum / litersNum).toFixed(2));
                                    } else if (!isNaN(priceNum) && priceNum > 0) {
                                      setExpenseAmount((litersNum * priceNum).toFixed(2));
                                    }
                                  }
                                })}
                                className="text-[11px] font-bold text-[#FF6A1A] hover:underline flex items-center gap-1 cursor-pointer"
                                title="Abrir calculadora"
                              >
                                <Calculator className="w-3 h-3" />
                                <span>Calc</span>
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Ex: 8.5"
                                value={fuelLiters}
                                onChange={e => {
                                  const val = e.target.value;
                                  setFuelLiters(val);
                                  const litersNum = parseFloat(val);
                                  const amountNum = parseFloat(expenseAmount);
                                  const priceNum = parseFloat(fuelPricePerLiter);
                                  if (!isNaN(litersNum) && litersNum > 0) {
                                    if (!isNaN(amountNum) && amountNum > 0) {
                                      setFuelPricePerLiter((amountNum / litersNum).toFixed(2));
                                    } else if (!isNaN(priceNum) && priceNum > 0) {
                                      setExpenseAmount((litersNum * priceNum).toFixed(2));
                                    }
                                  }
                                }}
                                className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                              />
                              <button
                                type="button"
                                onClick={() => openQuickCalculator('Litros Abastecidos (L)', fuelLiters, val => {
                                  setFuelLiters(val);
                                  const litersNum = parseFloat(val);
                                  const amountNum = parseFloat(expenseAmount);
                                  const priceNum = parseFloat(fuelPricePerLiter);
                                  if (!isNaN(litersNum) && litersNum > 0) {
                                    if (!isNaN(amountNum) && amountNum > 0) {
                                      setFuelPricePerLiter((amountNum / litersNum).toFixed(2));
                                    } else if (!isNaN(priceNum) && priceNum > 0) {
                                      setExpenseAmount((litersNum * priceNum).toFixed(2));
                                    }
                                  }
                                })}
                                className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-[#FF6A1A] hover:bg-[#FF6A1A]/10 text-[#FF6A1A] cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                                title="Calcular Litros"
                                aria-label="Calcular Litros"
                              >
                                <Calculator className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className={`text-xs font-bold ${mutedText}`}>Preço por Litro (R$/L)</label>
                              <button
                                type="button"
                                onClick={() => openQuickCalculator('Preço do Litro (R$/L)', fuelPricePerLiter, val => {
                                  setFuelPricePerLiter(val);
                                  const priceNum = parseFloat(val);
                                  const amountNum = parseFloat(expenseAmount);
                                  const litersNum = parseFloat(fuelLiters);
                                  if (!isNaN(priceNum) && priceNum > 0) {
                                    if (!isNaN(amountNum) && amountNum > 0) {
                                      setFuelLiters((amountNum / priceNum).toFixed(2));
                                    } else if (!isNaN(litersNum) && litersNum > 0) {
                                      setExpenseAmount((litersNum * priceNum).toFixed(2));
                                    }
                                  }
                                })}
                                className="text-[11px] font-bold text-[#FF6A1A] hover:underline flex items-center gap-1 cursor-pointer"
                                title="Abrir calculadora"
                              >
                                <Calculator className="w-3 h-3" />
                                <span>Calc</span>
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Ex: 5.89"
                                value={fuelPricePerLiter}
                                onChange={e => {
                                  const val = e.target.value;
                                  setFuelPricePerLiter(val);
                                  const priceNum = parseFloat(val);
                                  const amountNum = parseFloat(expenseAmount);
                                  const litersNum = parseFloat(fuelLiters);
                                  if (!isNaN(priceNum) && priceNum > 0) {
                                    if (!isNaN(amountNum) && amountNum > 0) {
                                      setFuelLiters((amountNum / priceNum).toFixed(2));
                                    } else if (!isNaN(litersNum) && litersNum > 0) {
                                      setExpenseAmount((litersNum * priceNum).toFixed(2));
                                    }
                                  }
                                }}
                                className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                              />
                              <button
                                type="button"
                                onClick={() => openQuickCalculator('Preço do Litro (R$/L)', fuelPricePerLiter, val => {
                                  setFuelPricePerLiter(val);
                                  const priceNum = parseFloat(val);
                                  const amountNum = parseFloat(expenseAmount);
                                  const litersNum = parseFloat(fuelLiters);
                                  if (!isNaN(priceNum) && priceNum > 0) {
                                    if (!isNaN(amountNum) && amountNum > 0) {
                                      setFuelLiters((amountNum / priceNum).toFixed(2));
                                    } else if (!isNaN(litersNum) && litersNum > 0) {
                                      setExpenseAmount((litersNum * priceNum).toFixed(2));
                                    }
                                  }
                                })}
                                className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-[#FF6A1A] hover:bg-[#FF6A1A]/10 text-[#FF6A1A] cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                                title="Calcular Preço do Litro"
                                aria-label="Calcular Preço do Litro"
                              >
                                <Calculator className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className={`block text-xs font-bold mb-1 ${mutedText}`}>KM Atual do Odômetro</label>
                            <div className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold tabular-nums flex items-center justify-between ${surfaceSubtle}`}>
                              <span>{totals.totalKm.toLocaleString('pt-BR')} km</span>
                              <span className="text-[10px] text-emerald-400 font-extrabold uppercase">Registrado</span>
                            </div>
                          </div>
                        </div>

                        {/* Telemetria e Estimativa de Autonomia em Tempo Real */}
                        {(() => {
                          const ltr = parseFloat(fuelLiters) || (parseFloat(expenseAmount) && parseFloat(fuelPricePerLiter) ? parseFloat(expenseAmount) / parseFloat(fuelPricePerLiter) : 0);
                          const kmL = Number(dbState.fuelConfig.kmPerLiter) || 35;
                          const estKm = Math.round(ltr * kmL);
                          return (
                            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between flex-wrap gap-2 ${
                              isDark ? 'bg-sky-950/40 border-sky-800/50 text-sky-200' : 'bg-sky-100/80 border-sky-300 text-sky-950'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Fuel className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                                <span>
                                  Autonomia Estimada: <strong className="text-sky-950 dark:text-sky-100 font-black">~{estKm.toLocaleString('pt-BR')} km</strong>{' '}
                                  <span className="opacity-80 font-semibold">({kmL} km/L médio)</span>
                                </span>
                              </div>
                              <span className="text-[11px] font-black text-sky-800 dark:text-sky-300">
                                Custo: R$ {((parseFloat(fuelPricePerLiter) || 5.8) / kmL).toFixed(2)}/km
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Data</label>
                            <input
                              type="date"
                              value={entryDate}
                              onChange={e => setEntryDate(e.target.value)}
                              className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className={`text-xs font-bold ${mutedText}`}>Valor (R$)</label>
                              <button
                                type="button"
                                onClick={() => openQuickCalculator('Valor da Despesa (R$)', expenseAmount, val => setExpenseAmount(val))}
                                className="text-[11px] font-bold text-[#FF6A1A] hover:underline flex items-center gap-1 cursor-pointer"
                                title="Abrir calculadora"
                              >
                                <Calculator className="w-3 h-3" />
                                <span>Calc</span>
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Ex: 35.00"
                                value={expenseAmount}
                                onChange={e => setExpenseAmount(e.target.value)}
                                className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                              />
                              <button
                                type="button"
                                onClick={() => openQuickCalculator('Valor da Despesa (R$)', expenseAmount, val => setExpenseAmount(val))}
                                className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-[#FF6A1A] hover:bg-[#FF6A1A]/10 text-[#FF6A1A] cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                                title="Calcular Valor"
                                aria-label="Calcular Valor"
                              >
                                <Calculator className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                            Descrição / Detalhe (opcional)
                          </label>
                          <input
                            type="text"
                            value={expenseDescription}
                            onChange={e => setExpenseDescription(e.target.value)}
                            placeholder="Ex: Troca de pastilhas dianteiras, Óleo Yamalube..."
                            className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* DESPESAS DA CASA / FAMÍLIA */
                  <div className="flex flex-col gap-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={`block text-xs font-bold ${mutedText}`}>
                          Selecione a Conta da Casa
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowNewHouseholdInModal(prev => !prev)}
                          className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                        >
                          {showNewHouseholdInModal ? 'Cancelar' : '+ Nova Conta da Casa'}
                        </button>
                      </div>

                      {/* Chips rápidos das contas da casa */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(dbState.householdExpenses || []).map(item => {
                          const isSelected =
                            selectedHouseholdExpenseId === item.id ||
                            selectedCategory.toLowerCase() === item.name.toLowerCase();
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setSelectedHouseholdExpenseId(item.id);
                                setSelectedCategory(item.name);
                                if (!expenseAmount || selectedHouseholdExpenseId !== item.id) {
                                  setExpenseAmount(item.monthlyAmount > 0 ? String(item.monthlyAmount) : '');
                                }
                              }}
                              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                                isSelected
                                  ? isDark
                                     ? 'bg-[#FF6A1A]/15 border-[#FF6A1A] text-white shadow-xs'
                                     : 'bg-[#FF6A1A]/10 border-[#FF6A1A] text-slate-900 shadow-xs'
                                  : `${surfaceSubtle} border-slate-700/50 hover:border-slate-500`
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-base shrink-0">{item.icon || '🏠'}</span>
                                <span className="text-xs font-bold truncate leading-tight">
                                  {item.name}
                                </span>
                              </div>
                              <span className={`text-[10px] tabular-nums font-semibold ${isSelected ? (isDark ? 'text-[#FFB27A]' : 'text-[#C2410C]') : mutedText}`}>
                                {item.monthlyAmount > 0 ? fmtMoney(item.monthlyAmount) : 'Variável'}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Formulário inline para criar nova conta da casa se o motoboy quiser */}
                      {showNewHouseholdInModal && (
                        <div className={`mt-3 p-3 rounded-2xl border ${isDark ? 'bg-amber-950/20 border-amber-800/40' : 'bg-amber-50 border-amber-200'} flex flex-col gap-2.5`}>
                          <div className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                            <span>🏠</span>
                            <span>Cadastrar Nova Conta Doméstica</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={newHouseholdNameInModal}
                              onChange={e => setNewHouseholdNameInModal(e.target.value)}
                              placeholder="Nome (Ex: Gás, Farmácia, Feira...)"
                              className={`px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                            />
                            <select
                              value={newHouseholdCatInModal}
                              onChange={e => setNewHouseholdCatInModal(e.target.value as HouseholdCategory)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                            >
                              <option value="moradia">🏠 Moradia (Aluguel, IPTU)</option>
                              <option value="utilidades">⚡ Utilidades (Luz, Água, Gás)</option>
                              <option value="alimentacao">🛒 Alimentação (Mercado, Feira)</option>
                              <option value="conectividade">📶 Conectividade (Internet, Celular)</option>
                              <option value="saude">💊 Saúde (Farmácia, Convênio)</option>
                              <option value="outros">📋 Outros Domésticos</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Data do Pagamento</label>
                        <input
                          type="date"
                          value={entryDate}
                          onChange={e => setEntryDate(e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className={`text-xs font-bold ${mutedText}`}>
                            Valor Pago (R$) <span className="text-amber-400">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => openQuickCalculator('Valor Pago da Conta da Casa (R$)', expenseAmount, val => setExpenseAmount(val))}
                            className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                            title="Abrir calculadora"
                          >
                            <Calculator className="w-3 h-3" />
                            <span>Calc</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 150.00"
                            value={expenseAmount}
                            onChange={e => setExpenseAmount(e.target.value)}
                            className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                          />
                          <button
                            type="button"
                            onClick={() => openQuickCalculator('Valor Pago da Conta da Casa (R$)', expenseAmount, val => setExpenseAmount(val))}
                            className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-amber-400 hover:bg-amber-400/10 text-amber-400 cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                            title="Calcular Valor Pago"
                            aria-label="Calcular Valor Pago"
                          >
                            <Calculator className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                        Descrição / Detalhe (opcional)
                      </label>
                      <input
                        type="text"
                        value={expenseDescription}
                        onChange={e => setExpenseDescription(e.target.value)}
                        placeholder="Ex: Compra quinzenal no Atacadão, Conta de luz ref. mês 10..."
                        className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                      />
                    </div>

                    <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                      isDark ? 'bg-amber-950/30 border-amber-800/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}>
                      <span className="text-lg shrink-0">🏠</span>
                      <p className="leading-snug">
                        <strong>Despesa Doméstica vinculada:</strong> será abatida no seu fechamento mensal e no saldo real livre para garantir que o sustento da sua família esteja sempre no controle.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {entryModalFeedback && (
              <div className="mt-4 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#FF6A1A]/15 border border-[#FF6A1A]/40 text-[#FF6A1A]">
                {entryModalFeedback}
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveEntryOrExpense}
              className="mt-5 w-full py-3.5 rounded-2xl bg-[#FF6A1A] text-black font-black text-sm hover:bg-[#ff7b33] transition-colors cursor-pointer"
            >
              {editingEntryId !== null ? 'Salvar Alterações no Room DB' : 'Adicionar Registro'}
            </button>
          </div>
        </div>
      )}

      {/* MOCHILINHA AI ASSISTANT MODAL */}
      {showCopilotModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 flex flex-col max-h-[85vh] ${surfaceCard}`}>
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800/50">
              <div>
                <h3 className="text-sm sm:text-base font-black">Mochilinha IA</h3>
                <p className={`text-[11px] sm:text-xs ${mutedText}`}>Assistente inteligente Mochilinha integrada aos seus dados</p>
              </div>
              <button
                onClick={() => setShowCopilotModal(false)}
                className={`p-1.5 sm:p-2 rounded-xl ${surfaceSubtle} cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 sm:py-4 flex flex-col gap-2.5 sm:gap-3">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-[#FF6A1A] text-black font-bold self-end max-w-[85%]'
                      : `${surfaceSubtle} self-start max-w-[92%]`
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {isAskingAi && (
                <div className={`p-3 rounded-2xl text-xs italic self-start ${surfaceSubtle}`}>
                  Analisando telemetria e histórico local...
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 pb-2.5 sm:pb-3">
              {[
                'Vale a pena continuar rodando hoje?',
                'Como economizar combustível?',
                'Resumo de manutenção da moto',
              ].map(sug => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleSendChat(sug)}
                  className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold cursor-pointer ${surfaceSubtle} hover:border-[#FF6A1A]`}
                >
                  {sug}
                </button>
              ))}
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Pergunte sobre turnos, combustível ou manutenção..."
                className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold outline-none ${inputSurface}`}
              />
              <button
                type="submit"
                className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-[#FF6A1A] text-black font-bold text-xs flex items-center gap-1 cursor-pointer min-h-[44px]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RESET DATABASE CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl sm:rounded-3xl p-5 sm:p-6 ${surfaceCard}`}>
            <h3 className="text-base sm:text-lg font-black">Apagar todos os registros?</h3>
            <p className={`text-xs sm:text-sm mt-2 ${mutedText}`}>
              Isso limpará as tabelas locais do Room Database e restaurará os cards padrão.
            </p>
            <div className="flex gap-3 mt-5 sm:mt-6">
              <button
                onClick={() => setShowResetConfirm(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer min-h-[40px] ${surfaceSubtle}`}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const fresh = createCleanDatabaseState(currentUser?.bikeModel);
                  await clearRemoteCloudData(currentUser?.email ?? null);
                  await persistAndEnqueueWorkManager(fresh);
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-500 text-white cursor-pointer"
              >
                Confirmar Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPONENT MAINTENANCE REPLACEMENT HISTORY POP-UP MODAL */}
      {selectedMaintHistoryId && (() => {
        const activeMaintItem = dbState.maintenanceItems.find(m => m.id === selectedMaintHistoryId);
        if (!activeMaintItem) return null;

        const historyRecords = [...(activeMaintItem.history || [])].sort((a, b) => {
          if (b.date !== a.date) return b.date.localeCompare(a.date);
          return (b.km || 0) - (a.km || 0);
        });

        const totalSpent = historyRecords.reduce((acc, rec) => acc + (Number(rec.amount) || 0), 0);
        const lastRecord = historyRecords[0] || null;

        const formatPtDate = (isoDate: string) => {
          if (!isoDate) return '—';
          const parts = isoDate.split('-');
          if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
          return isoDate;
        };

        return (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => {
              setSelectedMaintHistoryId(null);
              setShowAddMaintHistoryForm(false);
              setEditingMaintHistoryRecordId(null);
            }}
          >
            <div
              className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 flex flex-col max-h-[88vh] shadow-2xl ${surfaceCard}`}
              onClick={e => e.stopPropagation()}
            >
              {/* Pop-up Header */}
              <div className="flex items-start justify-between gap-3 pb-3.5 sm:pb-4 border-b border-slate-800/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#FF6A1A]/15 border border-[#FF6A1A]/35 flex items-center justify-center text-2xl shrink-0">
                    {activeMaintItem.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#FF6A1A] shrink-0" />
                      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#FF6A1A]">
                        Histórico de Trocas & Valores
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black truncate mt-0.5">{activeMaintItem.name}</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMaintHistoryId(null);
                    setShowAddMaintHistoryForm(false);
                    setEditingMaintHistoryRecordId(null);
                  }}
                  className={`p-2 rounded-xl ${surfaceSubtle} hover:border-[#FF6A1A] cursor-pointer shrink-0`}
                  aria-label="Fechar histórico"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Summary Metrics */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 my-3.5 sm:my-4">
                <div className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-3 ${surfaceSubtle}`}>
                  <span className={`block text-[10px] font-bold ${mutedText}`}>Trocas Registradas</span>
                  <span className="text-sm sm:text-base font-black tabular-nums mt-0.5 block">
                    {historyRecords.length}
                  </span>
                </div>
                <div className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-3 ${surfaceSubtle}`}>
                  <span className={`block text-[10px] font-bold ${mutedText}`}>Último Valor Pago</span>
                  <span className="text-sm sm:text-base font-black tabular-nums text-[#FF6A1A] mt-0.5 block truncate">
                    {lastRecord
                      ? fmtCurrencyExact(lastRecord.amount)
                      : fmtCurrencyExact(activeMaintItem.costEstimate || 0)}
                  </span>
                </div>
                <div className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-3 ${surfaceSubtle}`}>
                  <span className={`block text-[10px] font-bold ${mutedText}`}>Total Investido</span>
                  <span className="text-sm sm:text-base font-black tabular-nums text-emerald-400 mt-0.5 block truncate">
                    {fmtCurrencyExact(totalSpent)}
                  </span>
                </div>
              </div>

              {/* Toggle / Form to Add or Edit a Replacement Entry */}
              {!showAddMaintHistoryForm ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMaintHistoryRecordId(null);
                    setMaintHistoryDate(todayStr());
                    setMaintHistoryKm(totals.totalKm > 0 ? String(totals.totalKm) : '');
                    setMaintHistoryAmount(
                      activeMaintItem.costEstimate && activeMaintItem.costEstimate > 0
                        ? String(activeMaintItem.costEstimate)
                        : ''
                    );
                    setMaintHistoryNotes(activeMaintItem.notes || '');
                    setMaintHistoryAddToExpenses(false);
                    setShowAddMaintHistoryForm(true);
                  }}
                  className="mb-3.5 w-full py-2.5 px-4 rounded-xl text-xs font-extrabold bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Registrar Troca com Data e Valor Pago</span>
                </button>
              ) : (
                <div className={`mb-3.5 p-3.5 rounded-2xl border border-[#FF6A1A]/50 ${surfaceSubtle} flex flex-col gap-3`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#FF6A1A]">
                      {editingMaintHistoryRecordId
                        ? 'Editar Registro do Histórico'
                        : 'Nova Troca no Histórico da Peça'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMaintHistoryForm(false);
                        setEditingMaintHistoryRecordId(null);
                      }}
                      className={`p-1 rounded-lg ${mutedText} cursor-pointer`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>Data da Troca</label>
                      <input
                        type="date"
                        value={maintHistoryDate}
                        onChange={e => setMaintHistoryDate(e.target.value)}
                        className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>Valor Pago (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Ex: 45.00"
                        value={maintHistoryAmount}
                        onChange={e => setMaintHistoryAmount(e.target.value)}
                        className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold tabular-nums outline-none ${inputSurface}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>Odômetro (KM)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Ex: 15000"
                        value={maintHistoryKm}
                        onChange={e => setMaintHistoryKm(e.target.value)}
                        className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold tabular-nums outline-none ${inputSurface}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${mutedText}`}>
                      Observação / Marca da Peça (opcional)
                    </label>
                    <input
                      type="text"
                      value={maintHistoryNotes}
                      onChange={e => setMaintHistoryNotes(e.target.value)}
                      placeholder="Ex: Motul 10W30, Oficina do João..."
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none ${inputSurface}`}
                    />
                  </div>

                  {!editingMaintHistoryRecordId && (
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={maintHistoryAddToExpenses}
                        onChange={e => setMaintHistoryAddToExpenses(e.target.checked)}
                        className="rounded accent-[#FF6A1A] w-4 h-4"
                      />
                      <span className={mutedText}>
                        Lançar também este valor nas Despesas Gerais (Manutenção)
                      </span>
                    </label>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMaintHistoryForm(false);
                        setEditingMaintHistoryRecordId(null);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${surfaceCard}`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveMaintenanceHistoryRecord}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Salvar no Histórico</span>
                    </button>
                  </div>
                </div>
              )}

              {/* History List */}
              <div className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-2.5">
                {historyRecords.length === 0 ? (
                  <div className={`rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-2 ${surfaceSubtle}`}>
                    <History className={`w-7 h-7 ${mutedText} opacity-60`} />
                    <p className="text-xs sm:text-sm font-bold">
                      Nenhuma troca registrada ainda para {activeMaintItem.name}
                    </p>
                    <p className={`text-[11px] max-w-xs ${mutedText}`}>
                      Ao clicar em "Registrar Troca Agora" no card ou no botão acima, as datas, quilometragens e valores pagos ficam salvos aqui.
                    </p>
                  </div>
                ) : (
                  historyRecords.map((rec, idx) => (
                    <div
                      key={rec.id}
                      className={`rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors ${surfaceSubtle}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-extrabold tabular-nums">
                            📅 {formatPtDate(rec.date)}
                          </span>
                          {idx === 0 && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Mais recente
                            </span>
                          )}
                          <span className={`text-[11px] font-bold tabular-nums ${mutedText}`}>
                            · {(Number(rec.km) || 0).toLocaleString('pt-BR')} km
                          </span>
                        </div>
                        {rec.notes && (
                          <p className={`text-[11px] mt-1 truncate ${mutedText}`}>{rec.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="block text-xs sm:text-sm font-black tabular-nums text-[#FF6A1A]">
                            {fmtCurrencyExact(Number(rec.amount) || 0)}
                          </span>
                          <span className={`block text-[10px] font-semibold ${mutedText}`}>valor pago</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingMaintHistoryRecordId(rec.id);
                            setMaintHistoryDate(rec.date || todayStr());
                            setMaintHistoryKm(String(rec.km || 0));
                            setMaintHistoryAmount(String(rec.amount || 0));
                            setMaintHistoryNotes(rec.notes || '');
                            setShowAddMaintHistoryForm(true);
                          }}
                          title="Editar data ou valor pago"
                          className={`p-2 rounded-xl ${surfaceCard} hover:border-[#FF6A1A] text-[#FF6A1A] cursor-pointer`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteMaintenanceHistoryRecord(activeMaintItem.id, rec.id)}
                          title="Excluir registro do histórico"
                          className={`p-2 rounded-xl ${surfaceCard} hover:border-rose-500/60 text-rose-400 cursor-pointer`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 1. RADAR DE CORRIDA MODAL ("ACEITO OU RECUSO?") */}
      <RadarCorridaModal
        isOpen={showRadarModal}
        onClose={() => setShowRadarModal(false)}
        fuelConfig={dbState.fuelConfig}
        maintenanceItems={dbState.maintenanceItems}
        financialContext={{
          dailyKm: financialIntelligence.dailyKm,
          dailyGross: financialIntelligence.dailyGross,
          workDaysPerMonth: financialIntelligence.workDaysPerMonth,
          dailyBikeCostsTotal: financialIntelligence.dailyBikeCostsTotal,
          dailyFuelCost: financialIntelligence.dailyFuelCost,
          dailyMaintReserve: financialIntelligence.dailyMaintReserve,
          dailyDocsReserve: financialIntelligence.dailyDocsReserve,
          dailyFoodCost: financialIntelligence.dailyFoodCost,
          monthlyFoodCost: financialIntelligence.monthlyFoodCost,
          monthlyHouseholdCost: financialIntelligence.monthlyHouseholdCost,
          dailyHouseholdReserve: financialIntelligence.dailyHouseholdReserve,
          dailyEmergencyReserve: financialIntelligence.dailyEmergencyReserve,
        }}
        onAcceptRide={handleAcceptRideFromRadar}
        isDark={isDark}
      />

      {/* 2. CONTROLE DE TURNO MODAL (INICIAR / ENCERRAR COM ODÔMETRO AUTOMÁTICO GPS) */}
      <ControleTurnoModal
        isOpen={showTurnoModal}
        onClose={() => setShowTurnoModal(false)}
        currentOdometer={totals.baseTotalKm}
        currentTotalRevenue={totals.totalRevenue}
        activeSession={activeShiftSession}
        gpsPermissionStatus={gpsPermissionStatus}
        onRequestGpsPermission={handleRequestDeviceGpsPermission}
        onOpenGpsPermissionModal={() => {
          setGpsPermissionError(null);
          setShowGpsPermissionModal(true);
        }}
        onStartShift={handleStartShift}
        onEndShift={handleEndShift}
        isDark={isDark}
      />

      {/* 3. RELATÓRIO / EXTRATO FISCAL MEI MODAL (IMPRESSÃO / PDF) */}
      <RelatorioMeiModal
        isOpen={showRelatorioMeiModal}
        onClose={() => setShowRelatorioMeiModal(false)}
        entries={dbState.entries}
        expenses={dbState.expenses}
        currentUser={currentUser}
        fuelConfig={dbState.fuelConfig}
        allApps={allApps}
        allCategories={allCategories}
        isDark={isDark}
      />

      {/* 4. SIMULADOR DE META REVERSA MODAL */}
      <MetaReversaModal
        isOpen={showMetaReversaModal}
        onClose={() => setShowMetaReversaModal(false)}
        fuelConfig={dbState.fuelConfig}
        maintenanceItems={dbState.maintenanceItems}
        financialPlan={finPlan}
        householdMonthlyCost={financialIntelligence.monthlyHouseholdCost}
        currentDailyGoal={dbState.dailyGoal}
        onApplyDailyGoal={(newDailyGoal) => {
          persistAndEnqueueWorkManager({
            ...dbState,
            dailyGoal: newDailyGoal,
          });
          setShowMetaReversaModal(false);
        }}
        isDark={isDark}
      />

      {/* 5. MODAL DE SOLICITAÇÃO DE PERMISSÃO DE VOZ NO DISPOSITIVO */}
      {showMicPermissionModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowMicPermissionModal(false)}
        >
          <div
            className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border ${surfaceCard}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-start justify-between gap-3 pb-3 border-b ${dividerBorder}`}>
              <div className="flex items-center gap-3">
                <Mic className="w-5 h-5 text-[#FF6A1A] shrink-0" />
                <div>
                  <h3 className={`text-base sm:text-lg font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Ativar Comando de Voz
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMicPermissionModal(false)}
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <p className={`text-xs sm:text-sm leading-relaxed ${mutedText}`}>
                Dite corridas e despesas falando enquanto você pilota. O microfone só é utilizado no momento em que você acionar o comando de voz.
              </p>

              {micPermissionError && (
                <div className="rounded-xl p-3 bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{micPermissionError}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowMicPermissionModal(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
                  }`}
                >
                  Agora não
                </button>
                <button
                  type="button"
                  disabled={isRequestingMicPermission}
                  onClick={() => handleRequestDeviceMicPermission(autoRecordAfterPermission)}
                  className="flex-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Mic className={`w-4 h-4 ${isRequestingMicPermission ? 'animate-bounce' : ''}`} />
                  <span>
                    {isRequestingMicPermission
                      ? 'Solicitando...'
                      : 'Permitir Microfone'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DE PERMISSÃO DE LOCALIZAÇÃO GPS EM TEMPO REAL & SEGUNDO PLANO */}
      {showGpsPermissionModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowGpsPermissionModal(false)}
        >
          <div
            className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border ${surfaceCard}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-start justify-between gap-3 pb-3 border-b ${dividerBorder}`}>
              <div className="flex items-center gap-3">
                <Navigation className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <div>
                  <h3 className={`text-base sm:text-lg font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Permissão de Localização GPS
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGpsPermissionModal(false)}
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <p className={`text-xs sm:text-sm leading-relaxed ${mutedText}`}>
                Permite que o odômetro registre a quilometragem percorrida durante os turnos de entrega automaticamente, inclusive em segundo plano.
              </p>

              {gpsPermissionError && (
                <div className="rounded-xl p-3 bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{gpsPermissionError}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowGpsPermissionModal(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
                  }`}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={isRequestingGpsPermission}
                  onClick={handleRequestDeviceGpsPermission}
                  className="flex-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-emerald-500 text-black hover:bg-emerald-400 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Navigation className={`w-4 h-4 ${isRequestingGpsPermission ? 'animate-spin' : ''}`} />
                  <span>
                    {isRequestingGpsPermission
                      ? 'Conectando...'
                      : 'Ativar Localização'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DOS DADOS DA MOTO (CENTRALIZADO, ABRE DIRETO NA TELA SEM PRECISAR ROLAR) */}
      {isEditingFuelCard && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setIsEditingFuelCard(false)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl sm:rounded-3xl p-5 sm:p-6 ${modalSurface} my-auto animate-in fade-in zoom-in-95 duration-200`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-start justify-between gap-3 pb-4 border-b ${dividerBorder}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-transparent border border-[#FF6A1A]/40 flex items-center justify-center text-[#FF6A1A] shrink-0">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6A1A]">
                    Configuração da Moto
                  </span>
                  <h3 className="text-base sm:text-lg font-black leading-tight mt-0.5">
                    Dados da Moto & Combustível
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingFuelCard(false)}
                className={`p-2 rounded-xl ${surfaceSubtle} hover:border-[#FF6A1A] cursor-pointer`}
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <p className={`text-xs sm:text-sm leading-relaxed ${mutedText}`}>
                Personalize os dados da sua moto. Esses valores são usados no cálculo de combustível, autonomia, custo por KM e desgaste mecânico.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                    Modelo da Moto (Nome / Cilindrada)
                  </label>
                  <input
                    type="text"
                    value={fuelDraft.bikeModelName}
                    onChange={e => setFuelDraft({ ...fuelDraft, bikeModelName: e.target.value })}
                    placeholder="Ex: Honda CG 160 Fan, Yamaha Fazer 250..."
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                    Consumo Médio (KM / Litro)
                  </label>
                  <FreeNumberInput
                    step="0.5"
                    value={fuelDraft.kmPerLiter}
                    onValueChange={val => setFuelDraft({ ...fuelDraft, kmPerLiter: Math.max(1, val) })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                  />
                  <span className={`text-[10px] mt-0.5 block ${mutedText}`}>Ex: 35 ou 40 km/L</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`block text-xs font-bold ${mutedText}`}>
                      Preço da Gasolina (R$ / Litro)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        openQuickCalculator('Preço da Gasolina (R$/L)', fuelDraft.fuelPrice, valStr => {
                          const val = Math.max(0.1, parseFloat(valStr) || 0.1);
                          setFuelDraft({ ...fuelDraft, fuelPrice: val });
                        });
                      }}
                      className="text-[11px] font-bold text-[#FF6A1A] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Calc</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FreeNumberInput
                      step="0.05"
                      value={fuelDraft.fuelPrice}
                      onValueChange={val => setFuelDraft({ ...fuelDraft, fuelPrice: Math.max(0.1, val) })}
                      className={`flex-1 px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        openQuickCalculator('Preço da Gasolina (R$/L)', fuelDraft.fuelPrice, valStr => {
                          const val = Math.max(0.1, parseFloat(valStr) || 0.1);
                          setFuelDraft({ ...fuelDraft, fuelPrice: val });
                        });
                      }}
                      className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-[#FF6A1A] hover:bg-[#FF6A1A]/10 text-[#FF6A1A] cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                      title="Calcular Preço"
                    >
                      <Calculator className="w-4 h-4" />
                    </button>
                  </div>
                  <span className={`text-[10px] mt-0.5 block ${mutedText}`}>Preço pago na bomba</span>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                    Capacidade do Tanque (Litros)
                  </label>
                  <FreeNumberInput
                    step="0.5"
                    value={fuelDraft.tankCapacityLiters}
                    onValueChange={val => setFuelDraft({ ...fuelDraft, tankCapacityLiters: Math.max(1, val) })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                  />
                  <span className={`text-[10px] mt-0.5 block ${mutedText}`}>Capacidade total com reserva</span>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                    Odômetro Base Inicial (KM)
                  </label>
                  <FreeNumberInput
                    step="10"
                    value={fuelDraft.odometerBaseKm}
                    onValueChange={val => setFuelDraft({ ...fuelDraft, odometerBaseKm: Math.max(0, val) })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                  />
                  <span className={`text-[10px] mt-0.5 block ${mutedText}`}>KM da moto antes de usar o app</span>
                </div>
              </div>

              <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs bg-transparent ${dividerBorder}`}>
                <div>
                  <span className={`text-[10px] block font-bold ${mutedText}`}>Custo Estimado / KM</span>
                  <span className="text-sm font-black text-rose-400 tabular-nums">
                    R$ {(Math.max(0.1, Number(fuelDraft.fuelPrice) || 5.8) / Math.max(1, Number(fuelDraft.kmPerLiter) || 35)).toFixed(2)}/km
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] block font-bold ${mutedText}`}>Autonomia c/ Tanque Cheio</span>
                  <span className="text-sm font-black text-sky-400 tabular-nums">
                    ~{Math.round(Math.max(1, Number(fuelDraft.kmPerLiter) || 35) * Math.max(1, Number(fuelDraft.tankCapacityLiters) || 16.1))} km
                  </span>
                </div>
              </div>

              <div className={`flex items-center gap-2.5 pt-3 border-t ${dividerBorder}`}>
                <button
                  type="button"
                  onClick={() => setIsEditingFuelCard(false)}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold cursor-pointer transition-colors ${surfaceSubtle}`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveFuelCardEdit}
                  className="flex-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-transparent border border-[#FF6A1A] text-[#FF6A1A] hover:bg-[#FF6A1A]/10 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Salvar Dados da Moto</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOVA MANUTENÇÃO PREVENTIVA (SOBRE A TELA, MESMO PADRÃO DE DADOS DA MOTO) */}
      {isAddingNewMaint && maintDraft && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => {
            setIsAddingNewMaint(false);
            setEditingMaintId(null);
            setMaintDraft(null);
          }}
        >
          <div
            className={`w-full max-w-2xl rounded-2xl sm:rounded-3xl p-5 sm:p-6 ${modalSurface} my-auto animate-in fade-in zoom-in-95 duration-200`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-start justify-between gap-3 pb-4 border-b ${dividerBorder}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-transparent border border-[#FF6A1A]/40 flex items-center justify-center text-[#FF6A1A] shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6A1A]">
                    Garagem & Manutenção
                  </span>
                  <h3 className="text-base sm:text-lg font-black leading-tight mt-0.5">
                    Adicionar Nova Manutenção Preventiva
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNewMaint(false);
                  setEditingMaintId(null);
                  setMaintDraft(null);
                }}
                className={`p-2 rounded-xl ${surfaceSubtle} hover:border-[#FF6A1A] cursor-pointer`}
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <p className={`text-xs leading-relaxed ${mutedText}`}>
                Escolha uma sugestão rápida ou digite uma peça/serviço personalizado:
              </p>

              {/* Sugestões Rápidas para Motoboys */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[
                  { name: 'Vela de Ignição', icon: '⚡', intervalKm: 12000, costEstimate: 45, notes: 'Vela NGK Iridium / Standard' },
                  { name: 'Filtro de Ar', icon: '🌬️', intervalKm: 10000, costEstimate: 35, notes: 'Troca preventiva do elemento filtrante' },
                  { name: 'Fluido de Freio', icon: '💧', intervalKm: 15000, costEstimate: 40, notes: 'Fluido DOT 4' },
                  { name: 'Cabos (Embreagem / Acelerador)', icon: '🔌', intervalKm: 15000, costEstimate: 55, notes: 'Lubrificação e regulagem de folga' },
                  { name: 'Bateria', icon: '🔋', intervalKm: 25000, costEstimate: 220, notes: 'Verificar tensão (12.6V - 14.4V)' },
                  { name: 'Rolamentos de Roda', icon: '⭕', intervalKm: 20000, costEstimate: 90, notes: 'Conferir folga dianteira e traseira' },
                  { name: 'Regulagem de Válvulas', icon: '🔩', intervalKm: 12000, costEstimate: 120, notes: 'Folga de admissão e escape' },
                ].map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      setMaintDraft({
                        ...maintDraft,
                        name: preset.name,
                        icon: preset.icon,
                        intervalKm: preset.intervalKm,
                        costEstimate: preset.costEstimate,
                        notes: preset.notes,
                      })
                    }
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold cursor-pointer transition-colors bg-transparent border ${dividerBorder} hover:border-[#FF6A1A] hover:text-[#FF6A1A]`}
                  >
                    {preset.icon} {preset.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Nome do Componente</label>
                  <input
                    type="text"
                    value={maintDraft.name}
                    onChange={e => setMaintDraft({ ...maintDraft, name: e.target.value })}
                    placeholder="Ex: Vela de Ignição, Filtro de Ar"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Ícone (Emoji)</label>
                  <input
                    type="text"
                    value={maintDraft.icon}
                    onChange={e => setMaintDraft({ ...maintDraft, icon: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Intervalo de Troca (KM)</label>
                  <FreeNumberInput
                    step="100"
                    value={maintDraft.intervalKm}
                    onValueChange={val => setMaintDraft({ ...maintDraft, intervalKm: Math.max(0, val) })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${mutedText}`}>KM da Última Troca</label>
                  <FreeNumberInput
                    step="10"
                    value={maintDraft.lastChangeKm}
                    onValueChange={val => setMaintDraft({ ...maintDraft, lastChangeKm: Math.max(0, val) })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Custo Estimado (R$)</label>
                  <FreeNumberInput
                    step="5"
                    value={maintDraft.costEstimate}
                    onValueChange={val => setMaintDraft({ ...maintDraft, costEstimate: Math.max(0, val) })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Observação / Especificação</label>
                  <input
                    type="text"
                    value={maintDraft.notes || ''}
                    onChange={e => setMaintDraft({ ...maintDraft, notes: e.target.value })}
                    placeholder="Ex: Marca, viscosidade, calibragem"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                  />
                </div>

                {/* Configuração de Porcentagem de Alerta (Room DB) */}
                <div className="col-span-1 sm:col-span-2 lg:col-span-3 rounded-2xl p-3.5 bg-transparent border border-amber-500/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
                    <div>
                      <label className={`block text-xs font-black ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                        🔔 Porcentagem de Alerta Preventivo (% do intervalo)
                      </label>
                      <p className={`text-[11px] mt-0.5 ${mutedText}`}>
                        O app exibirá um alerta visual no card quando atingir essa porcentagem.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <FreeNumberInput
                        step="1"
                        value={maintDraft.alertThresholdPct ?? 85}
                        onValueChange={val =>
                          setMaintDraft({
                            ...maintDraft,
                            alertThresholdPct: Math.max(0, val),
                          })
                        }
                        className={`w-20 px-3 py-1.5 rounded-xl text-center text-sm font-black tabular-nums outline-none ${isDark ? 'text-amber-300' : 'text-amber-700'} ${inputSurface}`}
                      />
                      <span className={`text-xs font-black ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>%</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className={`text-[11px] font-bold mr-1 ${mutedText}`}>Atalhos rápidos:</span>
                    {[75, 80, 85, 90, 95].map(pctVal => {
                      const isSelected = (maintDraft.alertThresholdPct ?? 85) === pctVal;
                      return (
                        <button
                          key={pctVal}
                          type="button"
                          onClick={() => setMaintDraft({ ...maintDraft, alertThresholdPct: pctVal })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer transition-colors bg-transparent border ${
                            isSelected
                              ? 'border-amber-500 text-amber-500'
                              : `${dividerBorder} hover:border-amber-400 ${isDark ? 'text-amber-300' : 'text-amber-700'}`
                          }`}
                        >
                          {pctVal}%
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className={`flex items-center gap-2.5 pt-3 border-t ${dividerBorder}`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNewMaint(false);
                    setEditingMaintId(null);
                    setMaintDraft(null);
                  }}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold cursor-pointer transition-colors ${surfaceSubtle}`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveMaintenanceCardEdit}
                  disabled={!maintDraft.name.trim()}
                  className="flex-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-transparent border border-[#FF6A1A] text-[#FF6A1A] hover:bg-[#FF6A1A]/10 disabled:opacity-40 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Salvar Nova Manutenção</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ADICIONAR / EDITAR DESPESA DA MOTO (CENTRALIZADO, COM CICLO PERSONALIZADO A CADA X DIAS) */}
      {showBikeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowBikeModal(false)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl sm:rounded-3xl p-5 sm:p-6 ${modalSurface} my-auto animate-in fade-in zoom-in-95 duration-200`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-start justify-between gap-3 pb-4 border-b ${dividerBorder}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FF6A1A]/15 border border-[#FF6A1A]/40 flex items-center justify-center text-[#FF6A1A] text-xl shrink-0">
                  {bikeDraft.icon || '🏍️'}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6A1A]">
                    Operação & Manutenção da Moto
                  </span>
                  <h3 className="text-base sm:text-lg font-black leading-tight mt-0.5">
                    {editingBikeItem ? 'Editar Despesa da Moto' : 'Nova Despesa da Moto'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBikeModal(false)}
                className={`p-2 rounded-xl ${surfaceSubtle} hover:border-[#FF6A1A] cursor-pointer`}
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                  Nome da Conta / Peça / Manutenção
                </label>
                <input
                  type="text"
                  value={bikeDraft.name}
                  onChange={e => setBikeDraft({ ...bikeDraft, name: e.target.value })}
                  placeholder="Ex: Kit Relação, Troca de Óleo, Pneu Traseiro, Seguro..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                />
              </div>

              {/* SELETOR DE TIPO DE VENCIMENTO / CICLO */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${mutedText}`}>
                  Como funciona o prazo / vencimento desta despesa?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'interval_days', label: '🔄 A cada X dias', desc: 'Peças, óleo, relação, pneus' },
                    { id: 'monthly', label: '📅 Todo Mês', desc: 'Dia fixo (1 a 31)' },
                    { id: 'specific_date', label: '🎯 Data Fixa', desc: 'Data específica' },
                  ].map(opt => {
                    const isSel = (bikeDraft.recurrenceType || 'monthly') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          const newType = opt.id as ExpenseRecurrenceType;
                          const intDays = Math.max(1, Number(bikeDraft.intervalDays) || 90);
                          const mAmt = Math.max(0, Number(bikeDraft.monthlyAmount) || 0);
                          const tCost =
                            newType === 'interval_days' && (!bikeDraft.totalCost || bikeDraft.totalCost <= 0)
                              ? Math.round((mAmt * (intDays / 30)) * 100) / 100
                              : bikeDraft.totalCost || mAmt;
                          setBikeDraft({
                            ...bikeDraft,
                            recurrenceType: newType,
                            intervalDays: intDays,
                            totalCost: tCost,
                            nextDueDate: bikeDraft.nextDueDate || addDaysToDateStr(bikeDraft.lastPaidDate || todayStr(), intDays),
                          });
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSel
                            ? 'bg-[#FF6A1A]/15 border-[#FF6A1A] text-[#FF6A1A]'
                            : `${surfaceSubtle} hover:border-slate-600`
                        }`}
                      >
                        <div className="text-xs font-black leading-tight">{opt.label}</div>
                        <div className={`text-[10px] mt-0.5 truncate ${isSel ? 'text-[#FF6A1A]/90' : mutedText}`}>
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CAMPOS DINÂMICOS CONFORME O TIPO DE VENCIMENTO */}
              {(bikeDraft.recurrenceType || 'monthly') === 'interval_days' && (
                <div className={`p-3.5 rounded-2xl border space-y-3.5 bg-transparent ${
                  isDark ? 'border-[#FF6A1A]/30' : 'border-orange-200'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-black text-[#FF6A1A]">
                        Troca / Vencimento a cada quantos dias?
                      </label>
                      <span className={`text-[10px] font-bold ${mutedText}`}>
                        Atalhos rápidos:
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      {[1, 2, 7, 15, 30, 45, 60, 90, 120, 180, 365].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            const tCost = Math.max(0, Number(bikeDraft.totalCost) || 0);
                            const nextM = tCost > 0 ? Math.round(((tCost / d) * 30) * 100) / 100 : bikeDraft.monthlyAmount;
                            const baseDate = bikeDraft.lastPaidDate || todayStr();
                            setBikeDraft({
                              ...bikeDraft,
                              intervalDays: d,
                              monthlyAmount: nextM,
                              nextDueDate: addDaysToDateStr(baseDate, d),
                            });
                          }}
                          className={`px-2 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all border ${
                            Number(bikeDraft.intervalDays) === d
                              ? 'bg-[#FF6A1A] text-black border-[#FF6A1A]'
                              : `${surfaceSubtle} hover:border-slate-600`
                          }`}
                        >
                          {d === 1 ? '1d (Diário)' : `${d}d`}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                          Intervalo em Dias (Personalizado)
                        </label>
                        <FreeNumberInput
                          step="1"
                          value={bikeDraft.intervalDays || 90}
                          onValueChange={val => {
                            const cleanDays = Math.max(1, Math.round(val));
                            const tCost = Math.max(0, Number(bikeDraft.totalCost) || 0);
                            const nextM = tCost > 0 ? Math.round(((tCost / cleanDays) * 30) * 100) / 100 : bikeDraft.monthlyAmount;
                            const baseDate = bikeDraft.lastPaidDate || todayStr();
                            setBikeDraft({
                              ...bikeDraft,
                              intervalDays: cleanDays,
                              monthlyAmount: nextM,
                              nextDueDate: addDaysToDateStr(baseDate, cleanDays),
                            });
                          }}
                          className={`w-full px-3.5 py-2 rounded-xl text-sm font-black tabular-nums outline-none ${inputSurface}`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className={`block text-[11px] font-bold ${mutedText}`}>
                            Valor por Abastecimento / Troca (R$)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = bikeDraft.totalCost ?? bikeDraft.monthlyAmount;
                              openQuickCalculator('Valor da Manutenção / Troca', cur, valStr => {
                                const cleanCost = Math.max(0, parseFloat(valStr) || 0);
                                const cleanDays = Math.max(1, Number(bikeDraft.intervalDays) || 30);
                                const nextM = Math.round(((cleanCost / cleanDays) * 30) * 100) / 100;
                                setBikeDraft({
                                  ...bikeDraft,
                                  totalCost: cleanCost,
                                  monthlyAmount: nextM,
                                });
                              });
                            }}
                            className="text-[11px] font-bold text-[#FF6A1A] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Calculator className="w-3 h-3" />
                            <span>Calc</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FreeNumberInput
                            step="5"
                            value={bikeDraft.totalCost ?? bikeDraft.monthlyAmount}
                            onValueChange={val => {
                              const cleanCost = Math.max(0, val);
                              const cleanDays = Math.max(1, Number(bikeDraft.intervalDays) || 30);
                              const nextM = Math.round(((cleanCost / cleanDays) * 30) * 100) / 100;
                              setBikeDraft({
                                ...bikeDraft,
                                totalCost: cleanCost,
                                monthlyAmount: nextM,
                              });
                            }}
                            className={`flex-1 px-3.5 py-2 rounded-xl text-sm font-black tabular-nums outline-none ${inputSurface}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const cur = bikeDraft.totalCost ?? bikeDraft.monthlyAmount;
                              openQuickCalculator('Valor da Manutenção / Troca', cur, valStr => {
                                const cleanCost = Math.max(0, parseFloat(valStr) || 0);
                                const cleanDays = Math.max(1, Number(bikeDraft.intervalDays) || 30);
                                const nextM = Math.round(((cleanCost / cleanDays) * 30) * 100) / 100;
                                setBikeDraft({
                                  ...bikeDraft,
                                  totalCost: cleanCost,
                                  monthlyAmount: nextM,
                                });
                              });
                            }}
                            className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-[#FF6A1A] hover:bg-[#FF6A1A]/10 text-[#FF6A1A] cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                            title="Calcular Valor"
                          >
                            <Calculator className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/40">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={`text-[11px] font-bold ${mutedText}`}>
                          Última Troca / Início do Ciclo
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const t = todayStr();
                            const d = Math.max(1, Number(bikeDraft.intervalDays) || 30);
                            setBikeDraft({
                              ...bikeDraft,
                              lastPaidDate: t,
                              nextDueDate: addDaysToDateStr(t, d),
                            });
                          }}
                          className="text-[10px] font-black text-[#FF6A1A] hover:underline cursor-pointer"
                        >
                          Usar Hoje
                        </button>
                      </div>
                      <input
                        type="date"
                        value={bikeDraft.lastPaidDate || todayStr()}
                        onChange={e => {
                          const newStart = e.target.value;
                          const d = Math.max(1, Number(bikeDraft.intervalDays) || 30);
                          setBikeDraft({
                            ...bikeDraft,
                            lastPaidDate: newStart,
                            nextDueDate: addDaysToDateStr(newStart, d),
                          });
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                        Próxima Troca / Vencimento
                      </label>
                      <input
                        type="date"
                        value={bikeDraft.nextDueDate || addDaysToDateStr(bikeDraft.lastPaidDate || todayStr(), bikeDraft.intervalDays || 90)}
                        onChange={e => {
                          const newDue = e.target.value;
                          const diff = Math.max(1, calculateDaysDifference(bikeDraft.lastPaidDate || todayStr(), newDue));
                          const tCost = Math.max(0, Number(bikeDraft.totalCost) || 0);
                          const nextM = tCost > 0 ? Math.round(((tCost / diff) * 30) * 100) / 100 : bikeDraft.monthlyAmount;
                          setBikeDraft({
                            ...bikeDraft,
                            nextDueDate: newDue,
                            intervalDays: diff,
                            monthlyAmount: nextM,
                          });
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                      />
                    </div>
                  </div>

                  {/* Resumo Automático do Rateio */}
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    isDark ? 'bg-[#FF6A1A]/10 border-[#FF6A1A]/30' : 'bg-orange-50 border-orange-200'
                  }`}>
                    <div>
                      <span className={`text-[10px] font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Reserva Mensal Equivalente (a cada {bikeDraft.intervalDays || 30} dias):
                      </span>
                      <span className="font-black text-[#FF6A1A] text-sm tabular-nums">
                        {fmtCurrencyExact(bikeDraft.monthlyAmount)}/mês
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Separar por dia:</span>
                      <span className={`font-black text-sm tabular-nums ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                        {fmtCurrencyExact((Number(bikeDraft.monthlyAmount) || 0) / Math.max(1, financialIntelligence.workDaysPerMonth))}/dia
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {(bikeDraft.recurrenceType || 'monthly') === 'monthly' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`block text-xs font-bold ${mutedText}`}>
                        Valor Mensal Estimado (R$)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          openQuickCalculator('Valor Mensal Estimado (R$)', bikeDraft.monthlyAmount, valStr => {
                            const val = Math.max(0, parseFloat(valStr) || 0);
                            setBikeDraft({ ...bikeDraft, monthlyAmount: val, totalCost: val });
                          });
                        }}
                        className="text-[11px] font-bold text-[#FF6A1A] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Calculator className="w-3 h-3" />
                        <span>Calc</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FreeNumberInput
                        step="5"
                        value={bikeDraft.monthlyAmount}
                        onValueChange={val => setBikeDraft({ ...bikeDraft, monthlyAmount: val, totalCost: val })}
                        className={`flex-1 px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          openQuickCalculator('Valor Mensal Estimado (R$)', bikeDraft.monthlyAmount, valStr => {
                            const val = Math.max(0, parseFloat(valStr) || 0);
                            setBikeDraft({ ...bikeDraft, monthlyAmount: val, totalCost: val });
                          });
                        }}
                        className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-[#FF6A1A] hover:bg-[#FF6A1A]/10 text-[#FF6A1A] cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                        title="Calcular Valor Mensal"
                      >
                        <Calculator className="w-4 h-4" />
                      </button>
                    </div>
                    <span className={`text-[10px] mt-0.5 block ${mutedText}`}>
                      Rateio: ~{fmtCurrencyExact((Number(bikeDraft.monthlyAmount) || 0) / Math.max(1, financialIntelligence.workDaysPerMonth))}/dia trabalhado
                    </span>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                      Dia Fixo do Vencimento no Mês
                    </label>
                    <FreeNumberInput
                      step="1"
                      value={bikeDraft.dueDay || 15}
                      onValueChange={val => setBikeDraft({ ...bikeDraft, dueDay: Math.max(1, Math.min(31, val)) })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                    <span className={`text-[10px] mt-0.5 block ${mutedText}`}>
                      Dia do mês (1 a 31)
                    </span>
                  </div>
                </div>
              )}

              {(bikeDraft.recurrenceType || 'monthly') === 'specific_date' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`block text-xs font-bold ${mutedText}`}>
                        Valor para Reservar por Mês (R$)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          openQuickCalculator('Valor para Reservar (R$)', bikeDraft.monthlyAmount, valStr => {
                            const val = Math.max(0, parseFloat(valStr) || 0);
                            setBikeDraft({ ...bikeDraft, monthlyAmount: val, totalCost: val });
                          });
                        }}
                        className="text-[11px] font-bold text-[#FF6A1A] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Calculator className="w-3 h-3" />
                        <span>Calc</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FreeNumberInput
                        step="5"
                        value={bikeDraft.monthlyAmount}
                        onValueChange={val => setBikeDraft({ ...bikeDraft, monthlyAmount: val, totalCost: val })}
                        className={`flex-1 px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          openQuickCalculator('Valor para Reservar (R$)', bikeDraft.monthlyAmount, valStr => {
                            const val = Math.max(0, parseFloat(valStr) || 0);
                            setBikeDraft({ ...bikeDraft, monthlyAmount: val, totalCost: val });
                          });
                        }}
                        className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-[#FF6A1A] hover:bg-[#FF6A1A]/10 text-[#FF6A1A] cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                        title="Calcular Valor"
                      >
                        <Calculator className="w-4 h-4" />
                      </button>
                    </div>
                    <span className={`text-[10px] mt-0.5 block ${mutedText}`}>
                      Rateio: ~{fmtCurrencyExact((Number(bikeDraft.monthlyAmount) || 0) / Math.max(1, financialIntelligence.workDaysPerMonth))}/dia trabalhado
                    </span>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                      Data Específica do Vencimento
                    </label>
                    <input
                      type="date"
                      value={bikeDraft.nextDueDate || addDaysToDateStr(todayStr(), 30)}
                      onChange={e => setBikeDraft({ ...bikeDraft, nextDueDate: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                    />
                    <span className={`text-[10px] mt-0.5 block ${mutedText}`}>
                      Data exata prevista no calendário
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`block text-xs font-bold ${mutedText}`}>
                      Categoria
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewBikeCatInput(prev => !prev)}
                      className="text-[11px] font-bold text-[#FF6A1A] hover:underline flex items-center gap-1 cursor-pointer"
                      title="Adicionar nova categoria de despesa"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showNewBikeCatInput ? 'Fechar' : '+ Nova Categoria'}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={bikeDraft.category}
                      onChange={e => setBikeDraft({ ...bikeDraft, category: e.target.value as any })}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                    >
                      <option value="combustivel">⛽ Combustível (Gasolina / Álcool)</option>
                      <option value="manutencao">🔧 Peças & Oficina (Óleo, Pneus, Relação)</option>
                      <option value="pecas">⚙️ Peças & Reparos</option>
                      <option value="documentacao">📄 Documentação (IPVA, Licenciamento)</option>
                      <option value="seguro">🛡️ Seguro & Proteção Veicular</option>
                      <option value="equipamento">🪖 Equipamentos (Capacete, Capa, Luvas)</option>
                      <option value="outros">✨ Outros Cuidados & Lavagem</option>
                      {(dbState.customCategories || []).map(cat => (
                        <option key={cat.id} value={cat.id}>
                          📁 {cat.name} (Personalizada)
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewBikeCatInput(prev => !prev)}
                      className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-[#FF6A1A] hover:bg-[#FF6A1A]/10 text-[#FF6A1A] cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                      title="Adicionar Nova Categoria"
                      aria-label="Adicionar Nova Categoria"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {showNewBikeCatInput && (
                    <div className={`mt-2 p-2.5 rounded-xl border border-[#FF6A1A]/50 ${surfaceSubtle} flex flex-col gap-2`}>
                      <span className="text-[11px] font-black text-[#FF6A1A]">
                        Criar Nova Categoria de Despesa da Moto
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newBikeCatName}
                          onChange={e => setNewBikeCatName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddBikeCategory();
                            }
                          }}
                          placeholder="Ex: Borracharia, Adesivos, Estética..."
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                        />
                        <button
                          type="button"
                          onClick={handleAddBikeCategory}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#FF6A1A] text-black cursor-pointer shrink-0 flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Salvar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                    Ícone Representativo
                  </label>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {['🏍️', '⛽', '🛢️', '🛞', '⛓️', '🛑', '🛡️', '📄', '🔧', '✨', '🪖', '🛵', '🧤', '🪛', '⚙️'].map(ic => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setBikeDraft({ ...bikeDraft, icon: ic })}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg cursor-pointer border transition-all ${
                          bikeDraft.icon === ic
                            ? 'bg-[#FF6A1A] border-[#FF6A1A] text-black scale-110 font-black'
                            : `${surfaceSubtle} hover:border-slate-600`
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs bg-transparent ${dividerBorder}`}>
                <div>
                  <span className={`text-[10px] block font-bold ${mutedText}`}>Status da Despesa</span>
                  <span className={`text-xs font-black ${bikeDraft.isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {bikeDraft.isActive ? '✓ Ativa no cálculo das reservas da moto' : 'Inativa (Não afeta o rateio)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setBikeDraft({ ...bikeDraft, isActive: !bikeDraft.isActive })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                    bikeDraft.isActive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : isDark ? 'bg-transparent border border-neutral-800 text-slate-400' : 'bg-transparent border border-slate-300 text-slate-600'
                  }`}
                >
                  {bikeDraft.isActive ? 'Ativa' : 'Desativada'}
                </button>
              </div>

              <div className="flex items-center gap-2.5 pt-2 border-t border-slate-800/40">
                {editingBikeItem && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteBikeExpense(editingBikeItem.id);
                      setShowBikeModal(false);
                      setEditingBikeItem(null);
                    }}
                    className="py-3 px-3.5 rounded-xl text-xs font-black bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 cursor-pointer flex items-center gap-1.5 transition-colors shrink-0"
                    title="Excluir esta despesa"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowBikeModal(false)}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold cursor-pointer transition-colors ${surfaceSubtle}`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveBikeExpense}
                  className="flex-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#FF6A1A]/20"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Salvar Despesa da Moto</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ADICIONAR / EDITAR DESPESA DA CASA (CENTRALIZADO, COM CICLO PERSONALIZADO A CADA X DIAS) */}
      {showHouseholdModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowHouseholdModal(false)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl sm:rounded-3xl p-5 sm:p-6 ${modalSurface} my-auto animate-in fade-in zoom-in-95 duration-200`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-start justify-between gap-3 pb-4 border-b ${dividerBorder}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/40 flex items-center justify-center text-blue-400 text-xl shrink-0">
                  {householdDraft.icon || '🏠'}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                    Custo de Vida & Família
                  </span>
                  <h3 className="text-base sm:text-lg font-black leading-tight mt-0.5">
                    {editingHouseholdItem ? 'Editar Despesa da Casa' : 'Nova Despesa da Casa'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHouseholdModal(false)}
                className={`p-2 rounded-xl ${surfaceSubtle} hover:border-[#FF6A1A] cursor-pointer`}
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                  Nome da Conta / Despesa
                </label>
                <input
                  type="text"
                  value={householdDraft.name}
                  onChange={e => setHouseholdDraft({ ...householdDraft, name: e.target.value })}
                  placeholder="Ex: Aluguel, Gás de Cozinha, Supermercado, Luz, Internet..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                />
              </div>

              {/* SELETOR DE TIPO DE VENCIMENTO / CICLO */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${mutedText}`}>
                  Como funciona o vencimento desta despesa?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'monthly', label: '📅 Todo Mês', desc: 'Dia fixo (1 a 31)' },
                    { id: 'interval_days', label: '🔄 A cada X dias', desc: 'Ex: Gás, feira, compras' },
                    { id: 'specific_date', label: '🎯 Data Fixa', desc: 'Data específica' },
                  ].map(opt => {
                    const isSel = (householdDraft.recurrenceType || 'monthly') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          const newType = opt.id as ExpenseRecurrenceType;
                          const intDays = Math.max(1, Number(householdDraft.intervalDays) || 30);
                          const mAmt = Math.max(0, Number(householdDraft.monthlyAmount) || 0);
                          const tCost =
                            newType === 'interval_days' && (!householdDraft.totalCost || householdDraft.totalCost <= 0)
                              ? Math.round((mAmt * (intDays / 30)) * 100) / 100
                              : householdDraft.totalCost || mAmt;
                          setHouseholdDraft({
                            ...householdDraft,
                            recurrenceType: newType,
                            intervalDays: intDays,
                            totalCost: tCost,
                            nextDueDate: householdDraft.nextDueDate || addDaysToDateStr(householdDraft.lastPaidDate || todayStr(), intDays),
                          });
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSel
                            ? 'bg-blue-500/15 border-blue-500 text-blue-400'
                            : `${surfaceSubtle} hover:border-slate-600`
                        }`}
                      >
                        <div className="text-xs font-black leading-tight">{opt.label}</div>
                        <div className={`text-[10px] mt-0.5 truncate ${isSel ? 'text-blue-400/90' : mutedText}`}>
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CAMPOS DINÂMICOS CONFORME O TIPO DE VENCIMENTO */}
              {(householdDraft.recurrenceType || 'monthly') === 'interval_days' && (
                <div className={`p-3.5 rounded-2xl border space-y-3.5 bg-transparent ${
                  isDark ? 'border-blue-500/30' : 'border-blue-200'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-black text-blue-400">
                        Compra / Vencimento a cada quantos dias?
                      </label>
                      <span className={`text-[10px] font-bold ${mutedText}`}>
                        Atalhos rápidos:
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      {[7, 15, 30, 45, 60, 90, 120, 180, 365].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            const tCost = Math.max(0, Number(householdDraft.totalCost) || 0);
                            const nextM = tCost > 0 ? Math.round(((tCost / d) * 30) * 100) / 100 : householdDraft.monthlyAmount;
                            const baseDate = householdDraft.lastPaidDate || todayStr();
                            setHouseholdDraft({
                              ...householdDraft,
                              intervalDays: d,
                              monthlyAmount: nextM,
                              nextDueDate: addDaysToDateStr(baseDate, d),
                            });
                          }}
                          className={`px-2 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all border ${
                            Number(householdDraft.intervalDays) === d
                              ? 'bg-blue-600 text-white border-blue-500'
                              : `${surfaceSubtle} hover:border-slate-600`
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                          Intervalo em Dias (Personalizado)
                        </label>
                        <FreeNumberInput
                          step="5"
                          value={householdDraft.intervalDays || 45}
                          onValueChange={val => {
                            const cleanDays = Math.max(1, Math.round(val));
                            const tCost = Math.max(0, Number(householdDraft.totalCost) || 0);
                            const nextM = tCost > 0 ? Math.round(((tCost / cleanDays) * 30) * 100) / 100 : householdDraft.monthlyAmount;
                            const baseDate = householdDraft.lastPaidDate || todayStr();
                            setHouseholdDraft({
                              ...householdDraft,
                              intervalDays: cleanDays,
                              monthlyAmount: nextM,
                              nextDueDate: addDaysToDateStr(baseDate, cleanDays),
                            });
                          }}
                          className={`w-full px-3.5 py-2 rounded-xl text-sm font-black tabular-nums outline-none ${inputSurface}`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className={`block text-[11px] font-bold ${mutedText}`}>
                            Valor da Compra / Conta (R$)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = householdDraft.totalCost ?? householdDraft.monthlyAmount;
                              openQuickCalculator('Valor da Compra / Conta (R$)', cur, valStr => {
                                const cleanCost = Math.max(0, parseFloat(valStr) || 0);
                                const cleanDays = Math.max(1, Number(householdDraft.intervalDays) || 30);
                                const nextM = Math.round(((cleanCost / cleanDays) * 30) * 100) / 100;
                                setHouseholdDraft({
                                  ...householdDraft,
                                  totalCost: cleanCost,
                                  monthlyAmount: nextM,
                                });
                              });
                            }}
                            className="text-[11px] font-bold text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Calculator className="w-3 h-3" />
                            <span>Calc</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FreeNumberInput
                            step="10"
                            value={householdDraft.totalCost ?? householdDraft.monthlyAmount}
                            onValueChange={val => {
                              const cleanCost = Math.max(0, val);
                              const cleanDays = Math.max(1, Number(householdDraft.intervalDays) || 30);
                              const nextM = Math.round(((cleanCost / cleanDays) * 30) * 100) / 100;
                              setHouseholdDraft({
                                ...householdDraft,
                                totalCost: cleanCost,
                                monthlyAmount: nextM,
                              });
                            }}
                            className={`flex-1 px-3.5 py-2 rounded-xl text-sm font-black tabular-nums outline-none ${inputSurface}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const cur = householdDraft.totalCost ?? householdDraft.monthlyAmount;
                              openQuickCalculator('Valor da Compra / Conta (R$)', cur, valStr => {
                                const cleanCost = Math.max(0, parseFloat(valStr) || 0);
                                const cleanDays = Math.max(1, Number(householdDraft.intervalDays) || 30);
                                const nextM = Math.round(((cleanCost / cleanDays) * 30) * 100) / 100;
                                setHouseholdDraft({
                                  ...householdDraft,
                                  totalCost: cleanCost,
                                  monthlyAmount: nextM,
                                });
                              });
                            }}
                            className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-blue-400 hover:bg-blue-400/10 text-blue-400 cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                            title="Calcular Valor"
                          >
                            <Calculator className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/40">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={`text-[11px] font-bold ${mutedText}`}>
                          Último Pagamento / Compra
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const t = todayStr();
                            const d = Math.max(1, Number(householdDraft.intervalDays) || 30);
                            setHouseholdDraft({
                              ...householdDraft,
                              lastPaidDate: t,
                              nextDueDate: addDaysToDateStr(t, d),
                            });
                          }}
                          className="text-[10px] font-black text-blue-400 hover:underline cursor-pointer"
                        >
                          Usar Hoje
                        </button>
                      </div>
                      <input
                        type="date"
                        value={householdDraft.lastPaidDate || todayStr()}
                        onChange={e => {
                          const newStart = e.target.value;
                          const d = Math.max(1, Number(householdDraft.intervalDays) || 30);
                          setHouseholdDraft({
                            ...householdDraft,
                            lastPaidDate: newStart,
                            nextDueDate: addDaysToDateStr(newStart, d),
                          });
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                        Próximo Vencimento / Compra
                      </label>
                      <input
                        type="date"
                        value={householdDraft.nextDueDate || addDaysToDateStr(householdDraft.lastPaidDate || todayStr(), householdDraft.intervalDays || 45)}
                        onChange={e => {
                          const newDue = e.target.value;
                          const diff = Math.max(1, calculateDaysDifference(householdDraft.lastPaidDate || todayStr(), newDue));
                          const tCost = Math.max(0, Number(householdDraft.totalCost) || 0);
                          const nextM = tCost > 0 ? Math.round(((tCost / diff) * 30) * 100) / 100 : householdDraft.monthlyAmount;
                          setHouseholdDraft({
                            ...householdDraft,
                            nextDueDate: newDue,
                            intervalDays: diff,
                            monthlyAmount: nextM,
                          });
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                      />
                    </div>
                  </div>

                  {/* Resumo Automático do Rateio */}
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div>
                      <span className={`text-[10px] font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Reserva Mensal Equivalente (a cada {householdDraft.intervalDays || 30} dias):
                      </span>
                      <span className={`font-black text-sm tabular-nums ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                        {fmtCurrencyExact(householdDraft.monthlyAmount)}/mês
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Separar por dia:</span>
                      <span className={`font-black text-sm tabular-nums ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                        {fmtCurrencyExact((Number(householdDraft.monthlyAmount) || 0) / Math.max(1, financialIntelligence.workDaysPerMonth))}/dia
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {(householdDraft.recurrenceType || 'monthly') === 'monthly' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`block text-xs font-bold ${mutedText}`}>
                        Valor Mensal (R$)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          openQuickCalculator('Valor Mensal da Conta (R$)', householdDraft.monthlyAmount, valStr => {
                            const val = Math.max(0, parseFloat(valStr) || 0);
                            setHouseholdDraft({ ...householdDraft, monthlyAmount: val, totalCost: val });
                          });
                        }}
                        className="text-[11px] font-bold text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Calculator className="w-3 h-3" />
                        <span>Calc</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FreeNumberInput
                        step="10"
                        value={householdDraft.monthlyAmount}
                        onValueChange={val => setHouseholdDraft({ ...householdDraft, monthlyAmount: Math.max(0, val), totalCost: Math.max(0, val) })}
                        className={`flex-1 px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          openQuickCalculator('Valor Mensal da Conta (R$)', householdDraft.monthlyAmount, valStr => {
                            const val = Math.max(0, parseFloat(valStr) || 0);
                            setHouseholdDraft({ ...householdDraft, monthlyAmount: val, totalCost: val });
                          });
                        }}
                        className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-blue-400 hover:bg-blue-400/10 text-blue-400 cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                        title="Calcular Valor Mensal"
                      >
                        <Calculator className="w-4 h-4" />
                      </button>
                    </div>
                    <span className={`text-[10px] mt-0.5 block ${mutedText}`}>
                      Rateio: ~{fmtCurrencyExact((Number(householdDraft.monthlyAmount) || 0) / Math.max(1, financialIntelligence.workDaysPerMonth))}/dia trabalhado
                    </span>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                      Dia Fixo do Vencimento no Mês
                    </label>
                    <FreeNumberInput
                      step="1"
                      value={householdDraft.dueDay || 10}
                      onValueChange={val => setHouseholdDraft({ ...householdDraft, dueDay: Math.max(1, Math.min(31, val)) })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                    <span className={`text-[10px] mt-0.5 block ${mutedText}`}>
                      Dia do mês em que a conta vence (1 a 31)
                    </span>
                  </div>
                </div>
              )}

              {(householdDraft.recurrenceType || 'monthly') === 'specific_date' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`block text-xs font-bold ${mutedText}`}>
                        Valor para Reservar por Mês (R$)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          openQuickCalculator('Valor para Reservar (R$)', householdDraft.monthlyAmount, valStr => {
                            const val = Math.max(0, parseFloat(valStr) || 0);
                            setHouseholdDraft({ ...householdDraft, monthlyAmount: val, totalCost: val });
                          });
                        }}
                        className="text-[11px] font-bold text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Calculator className="w-3 h-3" />
                        <span>Calc</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FreeNumberInput
                        step="10"
                        value={householdDraft.monthlyAmount}
                        onValueChange={val => setHouseholdDraft({ ...householdDraft, monthlyAmount: Math.max(0, val), totalCost: Math.max(0, val) })}
                        className={`flex-1 px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          openQuickCalculator('Valor para Reservar (R$)', householdDraft.monthlyAmount, valStr => {
                            const val = Math.max(0, parseFloat(valStr) || 0);
                            setHouseholdDraft({ ...householdDraft, monthlyAmount: val, totalCost: val });
                          });
                        }}
                        className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-blue-400 hover:bg-blue-400/10 text-blue-400 cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                        title="Calcular Valor"
                      >
                        <Calculator className="w-4 h-4" />
                      </button>
                    </div>
                    <span className={`text-[10px] mt-0.5 block ${mutedText}`}>
                      Rateio: ~{fmtCurrencyExact((Number(householdDraft.monthlyAmount) || 0) / Math.max(1, financialIntelligence.workDaysPerMonth))}/dia trabalhado
                    </span>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                      Data Específica do Vencimento
                    </label>
                    <input
                      type="date"
                      value={householdDraft.nextDueDate || addDaysToDateStr(todayStr(), 30)}
                      onChange={e => setHouseholdDraft({ ...householdDraft, nextDueDate: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                    />
                    <span className={`text-[10px] mt-0.5 block ${mutedText}`}>
                      Data exata prevista no calendário
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`block text-xs font-bold ${mutedText}`}>
                      Categoria
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewHouseholdCatInput(prev => !prev)}
                      className="text-[11px] font-bold text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Adicionar nova categoria de despesa doméstica"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showNewHouseholdCatInput ? 'Fechar' : '+ Nova Categoria'}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={householdDraft.category}
                      onChange={e => setHouseholdDraft({ ...householdDraft, category: e.target.value as any })}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                    >
                      <option value="moradia">🏠 Moradia (Aluguel, Condomínio)</option>
                      <option value="utilidades">⚡ Utilidades (Luz, Água, Gás)</option>
                      <option value="alimentacao">🛒 Alimentação (Mercado, Feira)</option>
                      <option value="conectividade">📶 Conectividade (Internet, Celular)</option>
                      <option value="saude">💊 Saúde (Farmácia, Plano)</option>
                      <option value="outros">📄 Outros Compromissos</option>
                      {(dbState.customCategories || []).map(cat => (
                        <option key={cat.id} value={cat.id}>
                          📁 {cat.name} (Personalizada)
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewHouseholdCatInput(prev => !prev)}
                      className={`p-2.5 rounded-xl border border-slate-700/60 hover:border-blue-400 hover:bg-blue-400/10 text-blue-400 cursor-pointer transition-colors shrink-0 ${surfaceSubtle}`}
                      title="Adicionar Nova Categoria Doméstica"
                      aria-label="Adicionar Nova Categoria Doméstica"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {showNewHouseholdCatInput && (
                    <div className={`mt-2 p-2.5 rounded-xl border border-blue-400/50 ${surfaceSubtle} flex flex-col gap-2`}>
                      <span className="text-[11px] font-black text-blue-400">
                        Criar Nova Categoria Doméstica
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newHouseholdCatName}
                          onChange={e => setNewHouseholdCatName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddHouseholdCategory();
                            }
                          }}
                          placeholder="Ex: Educação, Pets, Lazer, Vestuário..."
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                        />
                        <button
                          type="button"
                          onClick={handleAddHouseholdCategory}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white cursor-pointer shrink-0 flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Salvar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                    Ícone Representativo
                  </label>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {['🏠', '🛒', '⚡', '💧', '📶', '🔥', '💊', '💳', '🎓', '🛡️', '📄', '📺'].map(ic => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setHouseholdDraft({ ...householdDraft, icon: ic })}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg cursor-pointer border transition-all ${
                          householdDraft.icon === ic
                            ? 'bg-blue-600 border-blue-400 text-white scale-110'
                            : `${surfaceSubtle} hover:border-slate-600`
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs bg-transparent ${dividerBorder}`}>
                <div>
                  <span className={`text-[10px] block font-bold ${mutedText}`}>Status da Conta</span>
                  <span className={`text-xs font-black ${householdDraft.isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {householdDraft.isActive ? '✓ Ativa no cálculo das reservas' : 'Inativa (Não afeta o rateio)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHouseholdDraft({ ...householdDraft, isActive: !householdDraft.isActive })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                    householdDraft.isActive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : isDark ? 'bg-transparent border border-neutral-800 text-slate-400' : 'bg-transparent border border-slate-300 text-slate-600'
                  }`}
                >
                  {householdDraft.isActive ? 'Ativa' : 'Desativada'}
                </button>
              </div>

              <div className="flex items-center gap-2.5 pt-2 border-t border-slate-800/40">
                {editingHouseholdItem && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteHouseholdExpense(editingHouseholdItem.id);
                      setShowHouseholdModal(false);
                      setEditingHouseholdItem(null);
                    }}
                    className="py-3 px-3.5 rounded-xl text-xs font-black bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 cursor-pointer flex items-center gap-1.5 transition-colors shrink-0"
                    title="Excluir esta conta"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowHouseholdModal(false)}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold cursor-pointer transition-colors ${surfaceSubtle}`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveHouseholdExpense}
                  className="flex-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Salvar Conta da Casa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ADICIONAR / EDITAR FATURAMENTO FUTURO PREVISTO */}
      {showProjectedModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowProjectedModal(false)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl sm:rounded-3xl p-5 sm:p-6 ${modalSurface} my-auto animate-in fade-in zoom-in-95 duration-200`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-start justify-between gap-3 pb-4 border-b ${dividerBorder}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400 text-xl shrink-0">
                  🔮
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                    Projeção Financeira
                  </span>
                  <h3 className="text-base sm:text-lg font-black leading-tight text-slate-900 dark:text-white">
                    {editingProjectedId ? 'Editar Faturamento Previsto' : 'Lançar Faturamento Futuro'}
                  </h3>
                  <p className={`text-xs mt-0.5 ${mutedText}`}>
                    Ganhos que você planeja receber ou corridas já agendadas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProjectedModal(false)}
                className={`p-2 rounded-xl shrink-0 cursor-pointer ${surfaceSubtle} ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* 1. Seleção Livre dos Dias que Irá Rodar via Modal de Calendário */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className={`text-xs font-bold ${mutedText}`}>
                    Dias que irá rodar no mês:
                  </label>
                  <span className="text-[11px] font-black text-[#FF6A1A]">
                    {projectedSelectedDates.length} dia{projectedSelectedDates.length === 1 ? '' : 's'} selecionado{projectedSelectedDates.length === 1 ? '' : 's'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const fallbackMonth = (projectedSelectedDates[0] || todayStr()).slice(0, 7);
                    setProjectedCalendarMonth(fallbackMonth);
                    setShowProjectedCalendarModal(true);
                  }}
                  className={`w-full p-3.5 rounded-2xl bg-transparent border ${
                    projectedSelectedDates.length > 0 ? 'border-[#FF6A1A]/60' : dividerBorder
                  } hover:border-[#FF6A1A] transition-colors text-left cursor-pointer flex items-center justify-between gap-3`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl bg-transparent border ${
                      projectedSelectedDates.length > 0 ? 'border-[#FF6A1A]/50 text-[#FF6A1A]' : `${dividerBorder} ${mutedText}`
                    } flex items-center justify-center shrink-0`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs sm:text-sm font-black ${primaryText}`}>
                        {projectedSelectedDates.length > 0
                          ? `${projectedSelectedDates.length} dia${projectedSelectedDates.length === 1 ? '' : 's'} selecionado${projectedSelectedDates.length === 1 ? '' : 's'} no calendário`
                          : 'Abrir Calendário e Selecionar Dias'}
                      </div>
                      <div className={`text-[11px] mt-0.5 truncate ${mutedText}`}>
                        {projectedSelectedDates.length > 0
                          ? `${projectedSelectedDates
                              .slice(0, 5)
                              .map(d => d.slice(8, 10) + '/' + d.slice(5, 7))
                              .join(', ')}${projectedSelectedDates.length > 5 ? ` +${projectedSelectedDates.length - 5} dias` : ''}`
                          : 'Toque para escolher livremente quaisquer dias do mês'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-transparent border border-[#FF6A1A]/50 text-[#FF6A1A] shrink-0">
                    Calendário
                  </span>
                </button>
              </div>

              {/* 2. Valor da Diária Prevista (R$/dia) */}
              <div>
                <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                  Diária Prevista por Dia (R$/dia):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="200,00"
                  value={projectedDailyRate}
                  onChange={e => {
                    const raw = e.target.value;
                    setProjectedDailyRate(raw);
                    const rate = parseFloat(raw.replace(',', '.')) || 0;
                    const days = projectedSelectedDates.length;
                    if (rate > 0 && days > 0) {
                      setProjectedAmount(String(Math.round(days * rate * 100) / 100));
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-base font-black tabular-nums outline-none text-sky-400 ${inputSurface}`}
                />
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  {selectedMonthFinancials.historicalDailyAvg > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const avg = selectedMonthFinancials.historicalDailyAvg;
                        setProjectedDailyRate(String(avg));
                        const days = projectedSelectedDates.length;
                        if (days > 0) {
                          setProjectedAmount(String(Math.round(days * avg * 100) / 100));
                        }
                      }}
                      className="px-2 py-0.5 rounded-md text-[10px] font-black bg-transparent text-sky-400 border border-sky-500/40 hover:border-sky-400 cursor-pointer"
                    >
                      Média: R$ {selectedMonthFinancials.historicalDailyAvg.toFixed(0)}
                    </button>
                  )}
                  {[100, 150, 200, 250, 300].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setProjectedDailyRate(String(r));
                        const days = projectedSelectedDates.length;
                        if (days > 0) {
                          setProjectedAmount(String(Math.round(days * r * 100) / 100));
                        }
                      }}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-transparent text-[#FF6A1A] border border-[#FF6A1A]/35 hover:border-[#FF6A1A] cursor-pointer"
                    >
                      R$ {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Valor Total Previsto (soma automática dos dias selecionados × diária) */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className={`text-xs font-bold ${mutedText}`}>
                    Valor Total Previsto (R$):
                  </label>
                  <span className="text-[11px] font-bold text-sky-400">
                    {projectedSelectedDates.length} dia(s) × {fmtMoney(parseFloat(projectedDailyRate.replace(',', '.')) || 0)}/dia
                  </span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0,00"
                  value={projectedAmount}
                  onChange={e => {
                    const raw = e.target.value;
                    setProjectedAmount(raw);
                    const total = parseFloat(raw.replace(',', '.')) || 0;
                    const days = projectedSelectedDates.length;
                    if (total > 0 && days > 0) {
                      setProjectedDailyRate(String(Math.round((total / days) * 100) / 100));
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-base font-black tabular-nums outline-none text-[#FF6A1A] ${inputSurface}`}
                />
                {(parseFloat(projectedAmount.replace(',', '.')) || 0) > 0 && projectedSelectedDates.length > 0 && (
                  <p className={`text-[11px] mt-1.5 ${mutedText}`}>
                    A cada dia marcado no calendário que passar,{' '}
                    <strong className="text-sky-400">
                      {fmtMoney(
                        (parseFloat(projectedDailyRate.replace(',', '.')) || 0) > 0
                          ? parseFloat(projectedDailyRate.replace(',', '.'))
                          : (parseFloat(projectedAmount.replace(',', '.')) || 0) / projectedSelectedDates.length
                      )}/dia
                    </strong>{' '}
                    será debitado automaticamente do saldo futuro total.
                  </p>
                )}
              </div>

              {/* 3. Descrição / Motivo */}
              <div>
                <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                  Descrição da Previsão:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Entrega agendada Loja X, Turno Domingo, etc."
                  value={projectedDescription}
                  onChange={e => setProjectedDescription(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                />
                {/* Sugestões Rápidas */}
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  {[
                    'Entrega Agendada',
                    'Turno Fim de Semana',
                    'Frete Particular',
                    'Fixo Semanal',
                    'Meta do Dia',
                  ].map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setProjectedDescription(sug)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border cursor-pointer transition-colors ${
                        isDark
                          ? 'bg-transparent hover:border-[#FF6A1A] text-slate-300 border-neutral-800'
                          : 'bg-transparent hover:border-[#FF6A1A] text-slate-700 border-slate-300'
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Aplicativo / Origem */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${mutedText}`}>
                  Canal / Aplicativo de Origem:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'Particular', name: 'Particular', icon: '🛵' },
                    { id: 'iFood', name: 'iFood', icon: '🔴' },
                    { id: '99Moto', name: '99Moto', icon: '🟡' },
                    { id: 'Uber Flash', name: 'Uber Flash', icon: '⚫' },
                    { id: 'Rappi', name: 'Rappi', icon: '🟠' },
                    { id: 'Frete', name: 'Frete', icon: '📦' },
                    { id: 'Fixo', name: 'Fixo Semanal', icon: '💼' },
                    { id: 'Outro', name: 'Outro', icon: '✨' },
                  ].map(app => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setProjectedApp(app.id)}
                      className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer border transition-all ${
                        projectedApp === app.id
                          ? isDark
                            ? 'bg-sky-500/20 border-sky-400 text-sky-300 scale-102'
                            : 'bg-sky-100 border-sky-500 text-sky-800 font-black scale-102'
                          : `${surfaceSubtle} border-transparent hover:border-slate-700`
                      }`}
                    >
                      <span className="text-base">{app.icon}</span>
                      <span className="text-[10px] truncate max-w-full">{app.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Observações Opcionais */}
              <div>
                <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                  Observações (Opcional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhes do trajeto, horário ou notas adicionais..."
                  value={projectedNotes}
                  onChange={e => setProjectedNotes(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium outline-none resize-none ${inputSurface}`}
                />
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className={`flex items-center gap-2.5 pt-3 border-t ${dividerBorder}`}>
              {editingProjectedId && (
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteProjectedRevenue(editingProjectedId);
                    setShowProjectedModal(false);
                  }}
                  className="py-3 px-3.5 rounded-xl text-xs font-black bg-transparent text-rose-400 border border-rose-500/40 hover:border-rose-400 cursor-pointer flex items-center gap-1.5 transition-colors shrink-0"
                  title="Excluir previsão"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowProjectedModal(false)}
                className={`flex-1 py-3 rounded-xl text-xs font-bold cursor-pointer transition-colors bg-transparent border ${dividerBorder}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveProjectedRevenue}
                className="flex-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Salvar Faturamento Previsto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MINIMALISTA DE CALENDÁRIO PARA SELEÇÃO LIVRE DE DIAS */}
      {showProjectedCalendarModal && (() => {
        const [calY, calM] = projectedCalendarMonth.split('-').map(Number);
        const yearNum = calY || new Date().getFullYear();
        const monthNum = calM || new Date().getMonth() + 1;
        const firstWeekday = new Date(yearNum, monthNum - 1, 1).getDay();
        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        const monthPrefix = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
        const monthLabel = `${PT_BR_MONTH_NAMES[monthNum - 1] || monthNum} de ${yearNum}`;
        const today = todayStr();

        const monthAllDates: string[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          monthAllDates.push(`${monthPrefix}-${String(d).padStart(2, '0')}`);
        }
        const selectedSet = new Set(projectedSelectedDates);
        const allMonthSelected = monthAllDates.every(d => selectedSet.has(d));
        const selectedInCurrentMonthCount = monthAllDates.filter(d => selectedSet.has(d)).length;

        const updateSelectedAndTotal = (nextDates: string[]) => {
          const sorted = Array.from(new Set(nextDates)).sort();
          setProjectedSelectedDates(sorted);
          const rate = parseFloat(projectedDailyRate.replace(',', '.')) || 0;
          if (rate > 0) {
            setProjectedAmount(
              sorted.length > 0 ? String(Math.round(sorted.length * rate * 100) / 100) : ''
            );
          }
        };

        const toggleDaySelection = (ymd: string) => {
          if (selectedSet.has(ymd)) {
            updateSelectedAndTotal(projectedSelectedDates.filter(d => d !== ymd));
          } else {
            updateSelectedAndTotal([...projectedSelectedDates, ymd]);
          }
        };

        const toggleSelectWholeMonth = () => {
          if (allMonthSelected) {
            updateSelectedAndTotal(projectedSelectedDates.filter(d => !d.startsWith(monthPrefix)));
          } else {
            updateSelectedAndTotal([...projectedSelectedDates, ...monthAllDates]);
          }
        };

        const stepCalendarMonth = (delta: number) => {
          const next = new Date(yearNum, monthNum - 1 + delta, 1);
          setProjectedCalendarMonth(
            `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
          );
        };

        const dailyRatePreview = parseFloat(projectedDailyRate.replace(',', '.')) || 0;

        return (
          <div
            className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowProjectedCalendarModal(false)}
          >
            <div
              className={`w-full max-w-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${modalSurface} my-auto animate-in fade-in zoom-in-95 duration-200`}
              onClick={e => e.stopPropagation()}
            >
              {/* Cabeçalho Minimalista */}
              <div className={`flex items-start justify-between gap-3 pb-3.5 border-b ${dividerBorder}`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-transparent border border-[#FF6A1A]/50 flex items-center justify-center text-[#FF6A1A] shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm sm:text-base font-black leading-tight ${primaryText}`}>
                      Selecionar Dias no Calendário
                    </h3>
                    <p className={`text-[11px] mt-0.5 ${mutedText}`}>
                      Toque nos dias em que você irá rodar
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProjectedCalendarModal(false)}
                  className={`p-2 rounded-xl shrink-0 cursor-pointer bg-transparent border ${dividerBorder} ${mutedText} hover:text-current`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navegação de Mês */}
              <div className="flex items-center justify-between gap-2 py-3.5">
                <button
                  type="button"
                  onClick={() => stepCalendarMonth(-1)}
                  className={`p-2 rounded-xl bg-transparent border ${dividerBorder} hover:border-[#FF6A1A] cursor-pointer transition-colors`}
                  title="Mês Anterior"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>

                <div className="text-center">
                  <div className={`text-sm sm:text-base font-black capitalize ${primaryText}`}>
                    {monthLabel}
                  </div>
                  <div className={`text-[10px] font-bold ${mutedText}`}>
                    {selectedInCurrentMonthCount} de {daysInMonth} dias marcados neste mês
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => stepCalendarMonth(1)}
                  className={`p-2 rounded-xl bg-transparent border ${dividerBorder} hover:border-[#FF6A1A] cursor-pointer transition-colors`}
                  title="Próximo Mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Ações Livres do Mês */}
              <div className="flex items-center justify-between gap-2 pb-3">
                <button
                  type="button"
                  onClick={toggleSelectWholeMonth}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black bg-transparent border cursor-pointer transition-colors ${
                    allMonthSelected
                      ? 'border-[#FF6A1A] text-[#FF6A1A]'
                      : `${dividerBorder} ${secondaryText} hover:border-[#FF6A1A]`
                  }`}
                >
                  {allMonthSelected ? 'Desmarcar Mês Inteiro' : 'Marcar Todos os Dias do Mês'}
                </button>

                {projectedSelectedDates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => updateSelectedAndTotal([])}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold bg-transparent border ${dividerBorder} ${mutedText} hover:border-rose-500/60 hover:text-rose-400 cursor-pointer transition-colors`}
                  >
                    Limpar ({projectedSelectedDates.length})
                  </button>
                )}
              </div>

              {/* Grade Semanal */}
              <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(wd => (
                  <div key={wd} className={`text-[10px] font-black uppercase py-1 ${mutedText}`}>
                    {wd}
                  </div>
                ))}
              </div>

              {/* Grade de Dias */}
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: firstWeekday }).map((_, idx) => (
                  <div key={`empty_${idx}`} className="h-10" />
                ))}
                {monthAllDates.map((ymd, idx) => {
                  const dayNum = idx + 1;
                  const isSelected = selectedSet.has(ymd);
                  const isTodayCell = ymd === today;
                  return (
                    <button
                      key={ymd}
                      type="button"
                      onClick={() => toggleDaySelection(ymd)}
                      className={`h-10 rounded-xl text-xs font-bold tabular-nums cursor-pointer transition-all flex flex-col items-center justify-center relative border ${
                        isSelected
                          ? 'bg-[#FF6A1A]/15 border-[#FF6A1A] text-[#FF6A1A] font-black'
                          : `bg-transparent ${dividerBorder} ${primaryText} hover:border-[#FF6A1A]/60`
                      }`}
                    >
                      <span>{dayNum}</span>
                      {isTodayCell && (
                        <span
                          className={`w-1 h-1 rounded-full mt-0.5 ${
                            isSelected ? 'bg-[#FF6A1A]' : 'bg-sky-400'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Resumo & Confirmação */}
              <div className={`mt-4 pt-3.5 border-t ${dividerBorder} flex items-center justify-between gap-3 flex-wrap`}>
                <div className="text-xs">
                  <div className={`font-black ${primaryText}`}>
                    {projectedSelectedDates.length} dia{projectedSelectedDates.length === 1 ? '' : 's'} selecionado{projectedSelectedDates.length === 1 ? '' : 's'}
                  </div>
                  {dailyRatePreview > 0 && projectedSelectedDates.length > 0 && (
                    <div className="text-[11px] font-bold text-sky-400">
                      Total: {fmtMoney(Math.round(projectedSelectedDates.length * dailyRatePreview * 100) / 100)}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowProjectedCalendarModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-black bg-[#FF6A1A] text-black hover:bg-[#ff7b33] cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirmar Dias</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      <QuickCalculatorModal
        isOpen={quickCalcState.isOpen}
        title={quickCalcState.title}
        initialValue={quickCalcState.initialValue}
        onClose={() => setQuickCalcState(prev => ({ ...prev, isOpen: false }))}
        onApply={quickCalcState.onApply}
        isDark={isDark}
      />

      {/* MODAL DE AJUSTE MANUAL DE SALDO DO MOTOBOY */}
      <AdjustBalanceModal
        isOpen={showAdjustBalanceModal}
        onClose={() => setShowAdjustBalanceModal(false)}
        currentBalance={adjustBaseBalance}
        onConfirmAdjust={handleConfirmAdjustBalance}
        isDark={isDark}
      />
    </div>
  );
}
