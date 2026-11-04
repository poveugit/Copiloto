import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
];

const BASE_EXPENSE_CATEGORIES: CategoryDefinition[] = [
  { id: 'combustivel', name: 'Combustível' },
  { id: 'manutencao', name: 'Manutenção' },
  { id: 'pecas', name: 'Peças/Pneus' },
  { id: 'seguro', name: 'Seguro' },
  { id: 'documentacao', name: 'Documentação' },
  { id: 'lavagem', name: 'Lavagem' },
  { id: 'outros', name: 'Outros' },
];

const BASE_SHIFTS: ShiftDefinition[] = [
  { id: 'almoco', name: 'Almoço (11h-15h)' },
  { id: 'jantar', name: 'Jantar (18h-23h)' },
  { id: 'madrugada', name: 'Madrugada (23h-06h)' },
  { id: 'manha', name: 'Manhã (06h-11h)' },
  { id: 'tarde', name: 'Tarde (15h-18h)' },
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
    costEstimate: 45,
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
    costEstimate: 520,
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
    costEstimate: 210,
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
    costEstimate: 75,
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

function createCleanDatabaseState(bikeModelName?: string): LocalRoomDatabaseState {
  const cleanBike = (bikeModelName || '').trim() || DEFAULT_FUEL_CONFIG.bikeModelName;
  return {
    entries: [],
    expenses: [],
    dailyGoal: 150,
    weeklyGoal: 900,
    customGoalTarget: 3000,
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
    customApps: [],
    customCategories: [],
    appOverrides: {},
    customShifts: [],
    shiftOverrides: {},
    deletedShiftIds: [],
    deletedAppIds: [],
    deletedEntryIds: [],
    deletedExpenseIds: [],
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
        dailyGoal: Number(parsed.dailyGoal) || 150,
        weeklyGoal: Number(parsed.weeklyGoal) || 900,
        customGoalTarget: Number(parsed.customGoalTarget) || 3000,
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
        customApps: Array.isArray(parsed.customApps) ? parsed.customApps : [],
        customCategories: Array.isArray(parsed.customCategories) ? parsed.customCategories : [],
        appOverrides: parsed.appOverrides || {},
        customShifts: Array.isArray(parsed.customShifts) ? parsed.customShifts : [],
        shiftOverrides: parsed.shiftOverrides || {},
        deletedShiftIds: Array.isArray(parsed.deletedShiftIds) ? parsed.deletedShiftIds : [],
        deletedAppIds: Array.isArray(parsed.deletedAppIds) ? parsed.deletedAppIds : [],
        deletedEntryIds: Array.isArray(parsed.deletedEntryIds) ? parsed.deletedEntryIds : [],
        deletedExpenseIds: Array.isArray(parsed.deletedExpenseIds) ? parsed.deletedExpenseIds : [],
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

type NavTab = 'dashboard' | 'maintenance' | 'billing' | 'history' | 'progress' | 'settings';

export default function App() {
  // Theme State (Dark Mode / Light Mode)
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('copilotrider_theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    localStorage.setItem('copilotrider_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Navigation & Architecture Inspector State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [billingSubTab, setBillingSubTab] = useState<'mensal' | 'planejamento' | 'ganhos' | 'gastos'>('mensal');
  const [selectedFinanceMonth, setSelectedFinanceMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [financeAppFilter, setFinanceAppFilter] = useState<string>('all');
  const [financeSortOrder, setFinanceSortOrder] = useState<'date_desc' | 'val_desc' | 'val_asc'>('date_desc');
  const [isEditingCustomGoalInFinance, setIsEditingCustomGoalInFinance] = useState<boolean>(false);
  const [tempFinanceGoalTarget, setTempFinanceGoalTarget] = useState<number>(3000);
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
  const [authEmail, setAuthEmail] = useState<string>(() => getRememberedCredentials()?.email || '');
  const [authPhone, setAuthPhone] = useState<string>('');
  const [authBikeModel, setAuthBikeModel] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>(() => getRememberedCredentials()?.password || '');
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

      // Brand-new account ALWAYS starts 100% clean (zero entries, zero expenses, zero demo data)
      const freshUserDb = createCleanDatabaseState(res.user.bikeModel);
      setCurrentUser(res.user);
      setShowAuthScreen(false);
      setAuthName('');
      setAuthPhone('');
      setAuthBikeModel('');
      if (!rememberMe) {
        setAuthPassword('');
      }
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
    setCurrentUser(null);
    setDbState(createCleanDatabaseState());
    setAuthError(null);
    setAuthSuccess(null);
    const rem = getRememberedCredentials();
    setSavedAccounts(getSavedLoginAccounts());
    if (rem && rem.rememberMe) {
      setAuthEmail(rem.email);
      setAuthPassword(rem.password);
      setRememberMe(true);
    } else {
      setAuthPassword('');
    }
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

  const allCategories = useMemo(() => {
    return [...BASE_EXPENSE_CATEGORIES, ...dbState.customCategories];
  }, [dbState.customCategories]);

  // Active Shift Session State (persisted in localStorage, tracks real-time GPS odometer)
  const [activeShiftSession, setActiveShiftSession] = useState<ShiftSession | null>(() => getStoredShiftSession());

  // Computed MVVM Totals (includes live GPS shift distance in real time when shift is active)
  const totals = useMemo(() => {
    const ridesKm = dbState.entries.reduce((s, e) => s + Number(e.km || 0), 0);
    const baseTotalKm = (Number(dbState.fuelConfig.odometerBaseKm) || 0) + ridesKm;
    const liveShiftGpsKm =
      activeShiftSession?.isActive && activeShiftSession?.gpsEnabled !== false
        ? Number(activeShiftSession.gpsDistanceKm || 0)
        : 0;
    const totalKm = Math.round((baseTotalKm + liveShiftGpsKm) * 10) / 10;
    const totalHours = dbState.entries.reduce((s, e) => s + Number(e.hours || 0), 0);

    const revenueByApp: Record<string, number> = {};
    allApps.forEach(a => (revenueByApp[a.id] = 0));
    dbState.entries.forEach(e => {
      revenueByApp[e.app] = (revenueByApp[e.app] || 0) + Number(e.revenue || 0);
    });
    const totalRevenue = Object.values(revenueByApp).reduce((a, b) => a + b, 0);

    const expenseByCat: Record<string, number> = {};
    allCategories.forEach(c => (expenseByCat[c.id] = 0));
    dbState.expenses.forEach(e => {
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
      if (!e.date) return;
      const rev = Number(e.revenue || 0);
      const entryDate = new Date(e.date + 'T12:00:00');
      if (entryDate.getFullYear() === currentYear) revYear += rev;
      if (e.date.startsWith(currentMonthStr)) revMonth += rev;
      if (entryDate >= monday && entryDate <= sunday) revWeek += rev;
    });

    dbState.expenses.forEach(ex => {
      if (!ex.date) return;
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
    // Adiciona os últimos 12 meses para o motoboy sempre poder navegar e visualizar
    const [cy, cm] = currentYM.split('-').map(Number);
    for (let i = 1; i <= 12; i++) {
      const d = new Date(cy, cm - 1 - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      set.add(ym);
    }
    return Array.from(set).sort().reverse();
  }, [dbState.entries, dbState.expenses]);

  // Finanças completas do mês selecionado na Central de Finanças
  const selectedMonthFinancials = useMemo(() => {
    const mEntries = dbState.entries.filter(
      e => e.date && e.date.startsWith(selectedFinanceMonth)
    );
    const mExpenses = dbState.expenses.filter(
      ex => ex.date && ex.date.startsWith(selectedFinanceMonth)
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

    return {
      entries: mEntries,
      expenses: mExpenses,
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
  }, [dbState.entries, dbState.expenses, selectedFinanceMonth, allApps]);

  // Shift & Bike Diagnostics
  const shiftEval = useMemo(() => {
    const today = todayStr();
    const todayEntries = dbState.entries.filter(e => e.date === today);
    return evaluateShiftWorthiness(todayEntries, dbState.dailyGoal, dbState.entries);
  }, [dbState.entries, dbState.dailyGoal]);

  const bikeDiagnostics = useMemo(() => {
    return evaluateBikeDiagnostics(dbState.maintenanceItems, dbState.fuelConfig, totals.totalKm);
  }, [dbState.maintenanceItems, dbState.fuelConfig, totals.totalKm]);

  // ================= LOCAL PUSH NOTIFICATIONS FOR MAINTENANCE ALERTS =================
  interface LocalPushToast {
    id: string;
    itemId: string;
    itemName: string;
    itemIcon: string;
    severity: 'alert' | 'overdue';
    wearPct: number;
    thresholdPct: number;
    kmRemaining: number;
    timestamp: string;
  }

  const [localPushToasts, setLocalPushToasts] = useState<LocalPushToast[]>([]);
  const [browserNotifPermission, setBrowserNotifPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

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

  const dispatchNativeAndLocalPush = useCallback((toast: LocalPushToast) => {
    setLocalPushToasts(prev => {
      const filtered = prev.filter(t => t.itemId !== toast.itemId);
      return [toast, ...filtered].slice(0, 4);
    });

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const title =
          toast.severity === 'overdue'
            ? `🚨 Manutenção Vencida: ${toast.itemName}`
            : `⚠️ Ponto de Alerta (${toast.wearPct}%): ${toast.itemName}`;
        const body =
          toast.severity === 'overdue'
            ? `O limite de quilometragem foi atingido (${toast.wearPct}% de uso). Agende a troca agora.`
            : `Atingiu o ponto de alerta de ${toast.thresholdPct}%! Restam ${toast.kmRemaining.toLocaleString('pt-BR')} km para a revisão.`;
        new Notification(title, {
          body,
          tag: `copilotrider_maint_${toast.itemId}`,
        });
      } catch {
        // Fallback handled by in-app local push banner
      }
    }
  }, []);

  // Watch maintenance items against totalKm and fire local push when alertThresholdPct is reached
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
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

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
          dispatchNativeAndLocalPush({
            id: `${cycleKey}_${Date.now()}`,
            itemId: item.id,
            itemName: item.name,
            itemIcon: item.icon || '🔧',
            severity,
            wearPct,
            thresholdPct,
            kmRemaining,
            timestamp: nowTime,
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
    dispatchNativeAndLocalPush,
  ]);

  const handleToggleMaintenanceNotifications = async (nextEnabled: boolean) => {
    if (nextEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          const perm = await Notification.requestPermission();
          setBrowserNotifPermission(perm);
        } catch {
          // Ignore iframe permission restriction
        }
      } else {
        setBrowserNotifPermission(Notification.permission);
      }
    }

    if (!nextEnabled) {
      setLocalPushToasts([]);
    } else {
      // Clear notified cache for current active alerts so enabling immediately notifies any items already at alert point
      const notifiedStorageKey = `${getStorageKeyForUser(currentUser)}_notified_alerts_v1`;
      localStorage.removeItem(notifiedStorageKey);
    }

    await persistAndEnqueueWorkManager({
      ...dbState,
      maintenanceNotificationsEnabled: nextEnabled,
    });
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

  // ================= ADD / EDIT RIDE OR EXPENSE MODAL STATE =================
  const [showEntryModal, setShowEntryModal] = useState<boolean>(false);
  const [entryMode, setEntryMode] = useState<'ganho' | 'gasto'>('ganho');
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

    const watcher = startGpsShiftWatcher(
      {
        lat: activeShiftSession.lastLat,
        lng: activeShiftSession.lastLng,
        timestamp: activeShiftSession.lastTimestamp,
      },
      update => {
        setGpsPermissionStatus('granted');
        setActiveShiftSession(prev => {
          if (!prev || !prev.isActive) return prev;
          const nextDistance =
            Math.round(((Number(prev.gpsDistanceKm) || 0) + update.deltaKm) * 100) / 100;
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

  // PWA Shortcuts action detection (?action=novo_registro | ?action=radar | ?action=turno)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get('action');
      if (action === 'novo_registro') {
        openNewEntryModal();
      } else if (action === 'radar') {
        setShowRadarModal(true);
      } else if (action === 'turno') {
        setShowTurnoModal(true);
      }
    } catch {
      // ignore url error
    }
  }, []);

  const openNewEntryModal = () => {
    setEditingEntryId(null);
    setEntryMode('ganho');
    setEntryDate(todayStr());
    setEntryKm('');
    setEntryRev('');
    setEntryHours('');
    setExpenseAmount('');
    setFuelLiters('');
    setFuelPricePerLiter(String(dbState.fuelConfig.fuelPrice || 5.8));
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
      const amountVal = Number(expenseAmount) || 0;
      if (amountVal <= 0) {
        if (savedPendingMeta) {
          persistAndEnqueueWorkManager(nextDb);
          setEntryModalFeedback('Nova categoria salva! Informe o Valor (R$) para registrar a despesa.');
        } else {
          setEntryModalFeedback('Informe o Valor (R$) da despesa para salvar.');
        }
        return;
      }

      const isFuel = finalCategoryId === 'combustivel';
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

      const updatedExpenses =
        editingEntryId !== null
          ? nextDb.expenses.map(e =>
              e.id === editingEntryId
                ? {
                    ...e,
                    date: entryDate,
                    category: finalCategoryId,
                    amount: amountVal,
                    ...(isFuel
                      ? {
                          liters: litersVal,
                          pricePerLiter: pricePerLiterVal,
                          odometerKm: e.odometerKm !== undefined ? e.odometerKm : totals.totalKm,
                        }
                      : {}),
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

      persistAndEnqueueWorkManager({
        ...nextDb,
        expenses: updatedExpenses,
        fuelConfig: nextFuelConfig,
      });
    }

    setEntryModalFeedback(null);
    setShowEntryModal(false);
    setEditingEntryId(null);
  };

  // History Filters
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'ganho' | 'gasto'>('all');
  const [historySubFilter, setHistorySubFilter] = useState<string>('all');

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

  // Theme surface classes (60-30-10 discipline, dark & light mode)
  const bgCanvas = isDark ? 'bg-[#090A0F] text-slate-100' : 'bg-[#F8FAFC] text-slate-900';
  const surfaceCard = isDark
    ? 'bg-[#12141C] border border-slate-800/80 text-slate-100'
    : 'bg-white border border-slate-200/90 text-slate-900 shadow-xs';
  const surfaceSubtle = isDark
    ? 'bg-[#181B26] border border-slate-800/60'
    : 'bg-slate-100/80 border border-slate-200/70';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputSurface = isDark
    ? 'bg-[#090A0F] border border-slate-700/80 text-white focus:border-[#FF6A1A]'
    : 'bg-slate-50 border border-slate-300 text-slate-900 focus:border-[#FF6A1A]';

  // Last 7 days chart data
  const chart7Days = useMemo(() => {
    const days: { date: string; label: string; km: number; rev: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const [, m, dd] = iso.split('-');
      const dayEntries = dbState.entries.filter(e => e.date === iso);
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
      const has = dbState.entries.some(e => e.date === ds) || dbState.expenses.some(e => e.date === ds);
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
    const dailyGoal = Math.max(10, Number(dbState.dailyGoal) || 150);
    const weeklyGoal = Math.max(50, Number(dbState.weeklyGoal) || 900);
    const customGoalTarget = Math.max(10, Number(dbState.customGoalTarget) || 3000);
    const customGoalTargetDate = dbState.customGoalTargetDate || getDefaultFutureDate(dbState.customGoalDays || 20);
    const customGoalCountdown = getCustomGoalCountdown(
      'date',
      dbState.customGoalDays,
      customGoalTargetDate
    );
    const customGoalDays = customGoalCountdown.effectiveDays;
    const customGoalTitle = (dbState.customGoalTitle || '').trim() || 'Meta Personalizada de Ganhos';

    // Today stats
    const todayEntries = dbState.entries.filter(e => e.date === today);
    const revToday = todayEntries.reduce((s, e) => s + Number(e.revenue || 0), 0);
    const kmToday = todayEntries.reduce((s, e) => s + Number(e.km || 0), 0);
    const hoursToday = todayEntries.reduce((s, e) => s + Number(e.hours || 0), 0);
    const dailyPct = Math.min(100, Math.round((revToday / dailyGoal) * 100));
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
      if (!e.date) return false;
      const dt = new Date(e.date + 'T12:00:00');
      return dt >= monday && dt <= sunday;
    });
    const revWeek = periodTotals.revWeek;
    const kmWeek = weekEntries.reduce((s, e) => s + Number(e.km || 0), 0);
    const hoursWeek = weekEntries.reduce((s, e) => s + Number(e.hours || 0), 0);
    const weekActiveDays = new Set(weekEntries.map(e => e.date)).size;
    const weeklyPct = Math.min(100, Math.round((revWeek / weeklyGoal) * 100));
    const weeklyRemaining = Math.max(0, weeklyGoal - revWeek);
    const remainingDaysInWeek = Math.max(1, 8 - dayOfWeek);
    const weeklyDailyNeeded = weeklyRemaining > 0 ? weeklyRemaining / remainingDaysInWeek : 0;

    // Custom Goal stats: Acompanha o SALDO ATUAL do usuário (Lucro Líquido Real = Ganhos - Gastos)
    const customScope = dbState.customGoalScope || 'month';
    const customCurrent = customScope === 'all' ? totals.lucro : periodTotals.saldoMonth;
    const customGross = customScope === 'all' ? totals.totalRevenue : periodTotals.revMonth;
    const customExpenses = customScope === 'all' ? totals.totalExpense : periodTotals.expMonth;
    const customPct = Math.min(100, Math.max(0, Math.round((customCurrent / customGoalTarget) * 100)));
    const customRemaining = Math.max(0, customGoalTarget - customCurrent);
    const customDailyNeeded = customRemaining > 0 ? customRemaining / customGoalDays : 0;

    // Group entries by date for work days, records, goal hit rate, and max streak
    const byDateMap: Record<
      string,
      { date: string; rev: number; km: number; hours: number; count: number; exp: number }
    > = {};

    dbState.entries.forEach(e => {
      if (!e.date) return;
      if (!byDateMap[e.date]) {
        byDateMap[e.date] = { date: e.date, rev: 0, km: 0, hours: 0, count: 0, exp: 0 };
      }
      byDateMap[e.date].rev += Number(e.revenue || 0);
      byDateMap[e.date].km += Number(e.km || 0);
      byDateMap[e.date].hours += Number(e.hours || 0);
      byDateMap[e.date].count += 1;
    });

    dbState.expenses.forEach(ex => {
      if (!ex.date) return;
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
    const daysMetDailyGoal = workDaysList.filter(d => d.rev >= dailyGoal).length;
    const goalHitRatePct = uniqueWorkDays > 0 ? Math.round((daysMetDailyGoal / uniqueWorkDays) * 100) : 0;

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
      const dayEntries = dbState.entries.filter(e => e.date === d.date);
      const hours = dayEntries.reduce((s, e) => s + Number(e.hours || 0), 0);
      const goalPct = Math.min(100, Math.round((d.rev / dailyGoal) * 100));
      const revPerHour = hours > 0 ? d.rev / hours : 0;
      const revPerKm = d.km > 0 ? d.rev / d.km : 0;
      return {
        ...d,
        hours,
        goalPct,
        metGoal: d.rev >= dailyGoal,
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
        metGoal: rev >= dailyGoal,
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

  // Notifications State & Pending Alerts from Room DB (Threshold >= alertThresholdPct or >= 100%)
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const pendingAlertNotifications = useMemo(() => {
    return dbState.maintenanceItems
      .map(item => {
        const kmUsed = Math.max(0, totals.totalKm - (item.lastChangeKm || 0));
        const interval = Math.max(100, item.intervalKm || 1000);
        const rawPct = Math.round((kmUsed / interval) * 100);
        const threshold = Math.min(99, Math.max(50, item.alertThresholdPct ?? 85));
        const isOverdue = rawPct >= 100;
        const isWarning = rawPct >= threshold && !isOverdue;
        const kmRemaining = Math.max(0, interval - kmUsed);
        const kmOverdue = kmUsed > interval ? kmUsed - interval : 0;
        return {
          ...item,
          rawPct,
          threshold,
          isOverdue,
          isWarning,
          kmRemaining,
          kmOverdue,
        };
      })
      .filter(n => n.isOverdue || n.isWarning);
  }, [dbState.maintenanceItems, totals.totalKm]);

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

    let dailyGross = Number(dbState.dailyGoal) || 150;
    let dailyKm = Math.max(20, Math.round(dailyGross / 1.65));
    let baseLabel = 'Meta Diária Configurada';

    if (finPlan.revenueBaseMode === 'actual_or_goal') {
      if (hasLoggedDays && progressAnalytics.avgRevPerDay > 0) {
        dailyGross = progressAnalytics.avgRevPerDay;
        dailyKm = progressAnalytics.avgKmPerDay > 0 ? progressAnalytics.avgKmPerDay : Math.max(30, Math.round(dailyGross / 1.65));
        baseLabel = `Sua Média Real (${progressAnalytics.uniqueWorkDays} dias registrados)`;
      } else {
        dailyGross = Number(dbState.dailyGoal) || 150;
        dailyKm = Math.max(30, Math.round(dailyGross / 1.65));
        baseLabel = 'Sua Meta Diária (Sem corridas salvas ainda)';
      }
    } else if (finPlan.revenueBaseMode === 'daily_goal') {
      dailyGross = Number(dbState.dailyGoal) || 150;
      dailyKm = progressAnalytics.avgKmPerDay > 0 ? progressAnalytics.avgKmPerDay : Math.max(30, Math.round(dailyGross / 1.65));
      baseLabel = 'Meta Diária do Painel';
    } else if (finPlan.revenueBaseMode === 'custom_daily') {
      dailyGross = Math.max(20, Number(finPlan.customDailyGrossBase) || Number(dbState.dailyGoal) || 180);
      dailyKm = Math.max(10, Number(finPlan.customDailyKmBase) || 110);
      baseLabel = 'Simulação Personalizada';
    }

    const monthlyGross = dailyGross * workDaysPerMonth;
    const weeklyGross = dailyGross * Math.min(7, Math.round(workDaysPerMonth / 4));

    // 1. Combustível Diário
    const kmPerLiter = Math.max(5, Number(dbState.fuelConfig.kmPerLiter) || 35);
    const fuelPrice = Math.max(1, Number(dbState.fuelConfig.fuelPrice) || 5.8);
    const fuelCostPerKm = fuelPrice / kmPerLiter;
    const dailyFuelCost = dailyKm * fuelCostPerKm;
    const monthlyFuelCost = dailyFuelCost * workDaysPerMonth;
    const fuelPctOfGross = dailyGross > 0 ? Math.round((dailyFuelCost / dailyGross) * 100) : 0;

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
    const extraBufferPct = Math.max(0, Math.min(25, Number(finPlan.maintenanceExtraBufferPct) ?? 3));
    const extraDailyMaintBuffer = dailyGross * (extraBufferPct / 100);
    const dailyMaintReserve = baseDailyMaintWear + extraDailyMaintBuffer;
    const monthlyMaintReserve = dailyMaintReserve * workDaysPerMonth;
    const maintPctOfGross = dailyGross > 0 ? Math.round((dailyMaintReserve / dailyGross) * 100) : 0;

    // 3. Alimentação na Rua (Almoço + Lanche / Água / Café)
    const dailyLunch = Math.max(0, Number(finPlan.dailyLunchBudget) ?? 22);
    const dailySnack = Math.max(0, Number(finPlan.dailySnackBudget) ?? 10);
    const dailyFoodCost = dailyLunch + dailySnack;
    const monthlyFoodCost = dailyFoodCost * workDaysPerMonth;
    const foodPctOfGross = dailyGross > 0 ? Math.round((dailyFoodCost / dailyGross) * 100) : 0;

    // 4. Documentação da Moto (IPVA, Licenciamento, MEI/Seguro, CNH/Taxas)
    const ipvaAnnual = Math.max(0, Number(finPlan.ipvaAnnual) ?? 480);
    const licensingAnnual = Math.max(0, Number(finPlan.licensingAnnual) ?? 160);
    const otherDocsAnnual = Math.max(0, Number(finPlan.otherDocsAnnual) ?? 120);
    const insuranceMonthly = Math.max(0, Number(finPlan.insuranceOrMeiMonthly) ?? 75);
    const docsTargetMonths = Math.max(1, Math.min(12, Number(finPlan.docsTargetMonths) || 12));

    const annualStateDocsTotal = ipvaAnnual + licensingAnnual + otherDocsAnnual;
    const workDaysUntilDocsDue = Math.max(1, docsTargetMonths * workDaysPerMonth);

    const dailyIpvaReserve = ipvaAnnual / workDaysUntilDocsDue;
    const dailyLicensingReserve = licensingAnnual / workDaysUntilDocsDue;
    const dailyOtherDocsReserve = otherDocsAnnual / workDaysUntilDocsDue;
    const dailyMeiInsuranceReserve = insuranceMonthly / workDaysPerMonth;

    const dailyDocsReserve =
      dailyIpvaReserve + dailyLicensingReserve + dailyOtherDocsReserve + dailyMeiInsuranceReserve;
    const weeklyDocsReserve = dailyDocsReserve * Math.min(7, Math.round(workDaysPerMonth / 4));
    const monthlyDocsReserve = dailyDocsReserve * workDaysPerMonth;
    const totalAnnualDocsWithInsurance = annualStateDocsTotal + insuranceMonthly * 12;
    const docsPctOfGross = dailyGross > 0 ? Math.round((dailyDocsReserve / dailyGross) * 100) : 0;

    // 5. Reserva de Emergência (Fundo de Segurança Pessoal / Imprevistos / Dias Parados)
    const emergencyPct = Math.max(0, Math.min(40, Number(finPlan.emergencyReservePct) ?? 10));
    const dailyEmergencyReserve = dailyGross * (emergencyPct / 100);
    const monthlyEmergencyReserve = dailyEmergencyReserve * workDaysPerMonth;
    const emergencyIn6Months = monthlyEmergencyReserve * 6;
    const emergencyIn12Months = monthlyEmergencyReserve * 12;

    // 6. Lucro Líquido Real (O Que Sobra de Fato no Bolso do Motoboy)
    const totalDailyCostsAndReserves =
      dailyFuelCost + dailyMaintReserve + dailyFoodCost + dailyDocsReserve + dailyEmergencyReserve;
    const dailyNetProfit = dailyGross - totalDailyCostsAndReserves;
    const weeklyNetProfit = dailyNetProfit * Math.min(7, Math.round(workDaysPerMonth / 4));
    const monthlyNetProfit = dailyNetProfit * workDaysPerMonth;
    const netMarginPct = dailyGross > 0 ? Math.round((dailyNetProfit / dailyGross) * 100) : 0;

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
      emergencyPct,
      dailyEmergencyReserve,
      monthlyEmergencyReserve,
      emergencyIn6Months,
      emergencyIn12Months,
      totalDailyCostsAndReserves,
      dailyNetProfit,
      weeklyNetProfit,
      monthlyNetProfit,
      netMarginPct,
      avgDailyHours,
      realNetPerHour,
      realNetPerKm,
      totalRealLoggedRev,
      totalRealLoggedExp,
      totalRealLoggedProfit,
    };
  }, [dbState, finPlan, progressAnalytics, totals]);

  // ================= TELEMETRIA REAL DO COMBUSTÍVEL & AUTONOMIA BASEADA EM ABASTECIMENTO =================
  const fuelTelemetry = useMemo(() => {
    const kmPerLiter = Math.max(5, Number(dbState.fuelConfig.kmPerLiter) || 35);
    const fuelExpenses = dbState.expenses
      .filter(ex => ex.category === 'combustivel')
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

      const dayEntries = dbState.entries.filter(e => e.date === iso);
      const dayExpenses = dbState.expenses.filter(e => e.date === iso);

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

      const monthEntries = dbState.entries.filter(e => (e.date || '').startsWith(yearMonth));
      const monthExpenses = dbState.expenses.filter(ex => (ex.date || '').startsWith(yearMonth));

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
      <div className={`min-h-screen transition-colors duration-200 ${bgCanvas} flex flex-col justify-between p-4 sm:p-6 lg:p-10`}>
        {/* Top Minimal Brand + Theme Switcher */}
        <header className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF6A1A] text-black font-black flex items-center justify-center text-lg shadow-sm">
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
            {currentUser && (
              <button
                type="button"
                onClick={() => setShowAuthScreen(false)}
                className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${surfaceSubtle} hover:border-[#FF6A1A]`}
              >
                Voltar ao App
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsDark(prev => !prev)}
              aria-label="Alternar tema claro ou escuro"
              className={`p-2.5 rounded-xl cursor-pointer transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center ${surfaceSubtle}`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </header>

        {/* Main Responsive Split Container (Desktop 2-Column | Mobile 1-Column Ergonomic Card) */}
        <main className="w-full max-w-6xl mx-auto my-6 sm:my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          {/* Left Hero / Value Proposition (Visible on Desktop, compact header on Mobile) */}
          <div className="lg:col-span-6 flex flex-col gap-4 sm:gap-6">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#FF6A1A]">
                Sincronização Nuvem + Room Offline
              </span>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight mt-1.5 sm:mt-2 leading-tight">
                Controle seus ganhos, turnos e a saúde da sua moto.
              </h1>
              <p className={`text-xs sm:text-base mt-2 sm:mt-3 leading-relaxed ${mutedText}`}>
                Acesse sua conta para sincronizar seu histórico de corridas, despesas de combustível e alertas preventivos de manutenção em qualquer celular.
              </p>
            </div>

            <div className="hidden sm:grid grid-cols-3 gap-3">
              <div className={`rounded-2xl p-4 ${surfaceCard}`}>
                <div className="text-lg font-black text-[#FF6A1A] tabular-nums">100%</div>
                <div className={`text-xs font-semibold mt-1 ${mutedText}`}>Funciona Offline no Room DB</div>
              </div>
              <div className={`rounded-2xl p-4 ${surfaceCard}`}>
                <div className="text-lg font-black text-emerald-400 tabular-nums">R$/KM</div>
                <div className={`text-xs font-semibold mt-1 ${mutedText}`}>Lucro Real por Turno e App</div>
              </div>
              <div className={`rounded-2xl p-4 ${surfaceCard}`}>
                <div className="text-lg font-black text-amber-400 tabular-nums">Alertas</div>
                <div className={`text-xs font-semibold mt-1 ${mutedText}`}>Aviso Preventivo de Manutenção</div>
              </div>
            </div>
          </div>

          {/* Right Column: Login, Cadastro & Redefinir Senha Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto lg:max-w-none">
            <div className={`rounded-3xl p-5 sm:p-8 ${surfaceCard}`}>
              {/* 2-Tab Segmented Switcher (Entrar | Criar Conta) */}
              {authMode !== 'recover' && (
                <div className={`grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl mb-6 ${surfaceSubtle}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black cursor-pointer transition-all flex items-center justify-center gap-2 min-h-[44px] ${
                      authMode === 'login'
                        ? 'bg-[#FF6A1A] text-black shadow-xs'
                        : `${mutedText} hover:text-current`
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
                    }}
                    className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black cursor-pointer transition-all flex items-center justify-center gap-2 min-h-[44px] ${
                      authMode === 'register'
                        ? 'bg-[#FF6A1A] text-black shadow-xs'
                        : `${mutedText} hover:text-current`
                    }`}
                  >
                    <UserPlus className="w-4 h-4 shrink-0" />
                    <span>Criar Conta</span>
                  </button>
                </div>
              )}

              {/* Contextual Header for Redefinir Senha Mode */}
              {authMode === 'recover' && (
                <div className={`mb-5 p-3.5 rounded-2xl border ${
                  isDark ? 'bg-[#FF6A1A]/10 border-[#FF6A1A]/30' : 'bg-orange-50 border-orange-200'
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
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${surfaceSubtle}`}
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
                        className={`rounded-2xl p-2.5 flex items-center justify-between gap-2 border transition-colors ${
                          isDark
                            ? 'bg-slate-900/90 border-slate-800 hover:border-[#FF6A1A]/50'
                            : 'bg-slate-50 border-slate-200 hover:border-[#FF6A1A]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleQuickSavedLogin(acc)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-xl bg-[#FF6A1A]/15 border border-[#FF6A1A]/40 text-[#FF6A1A] font-black text-xs flex items-center justify-center shrink-0">
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
                          <span className="px-2.5 py-1 rounded-lg bg-[#FF6A1A] text-black text-[11px] font-black shrink-0">
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
                <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex flex-col gap-2">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
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
                      className="self-start px-3 py-1.5 rounded-xl bg-rose-500/25 hover:bg-rose-500/35 text-rose-200 text-[11px] font-black cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Redefinir Senha Agora</span>
                    </button>
                  )}
                </div>
              )}

              {authSuccess && (
                <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
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
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                            authBikeModel === model
                              ? 'bg-[#FF6A1A] text-black'
                              : `${surfaceSubtle} hover:border-[#FF6A1A]`
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
                  className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    rememberMe
                      ? isDark
                        ? 'bg-[#FF6A1A]/10 border-[#FF6A1A]/50'
                        : 'bg-orange-50 border-orange-300'
                      : surfaceSubtle
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        rememberMe
                          ? 'bg-[#FF6A1A] text-black'
                          : isDark
                          ? 'bg-slate-800 border border-slate-700'
                          : 'bg-white border border-slate-300'
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
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
                      rememberMe
                        ? 'bg-[#FF6A1A]/20 text-[#FF6A1A]'
                        : isDark
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {rememberMe ? 'Ativo' : 'Off'}
                  </span>
                </button>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="mt-1 w-full py-3.5 px-5 rounded-2xl bg-[#FF6A1A] text-black font-black text-sm hover:bg-[#ff7b33] transition-colors cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
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
    <div className={`min-h-screen transition-colors duration-200 ${bgCanvas} pb-24 sm:pb-28`}>
      {/* TOP BAR CONTRACT: 3 ZONES (Brand | Nav Links | Primary Action) */}
      <header
        className={`sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-8 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 border-b backdrop-blur-md ${
          isDark ? 'bg-[#090A0F]/90 border-slate-800/80' : 'bg-white/90 border-slate-200'
        }`}
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

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 relative">
          {/* Menu Cockpit Hub (Radar de Lucro, Iniciar Turno, Extrato MEI, Meta Reversa) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCockpitMenu(prev => !prev)}
              aria-label="Menu Cockpit de Operações"
              title="Menu Cockpit: Radar de Lucro, Turno GPS, Extrato MEI, Meta Reversa"
              className={`p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center relative border ${
                activeShiftSession?.isActive
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/25'
                  : showCockpitMenu
                  ? 'bg-[#FF6A1A]/15 border-[#FF6A1A] text-[#FF6A1A]'
                  : `${surfaceSubtle} ${mutedText} hover:text-white hover:border-[#FF6A1A]/50`
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
                  className={`fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 md:w-96 max-w-full rounded-2xl p-4 shadow-2xl z-50 border ${
                    isDark
                      ? 'bg-[#12141C] border-slate-800 text-slate-100'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <Gauge className="w-4 h-4 text-[#FF6A1A] shrink-0" />
                      <span className="text-xs font-black uppercase tracking-wider truncate">
                        Menu Cockpit do Piloto
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCockpitMenu(false)}
                      className={`p-1.5 rounded-lg shrink-0 ${surfaceSubtle} cursor-pointer hover:text-white`}
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
                      className={`p-3 rounded-xl flex flex-col items-start gap-2 transition-all cursor-pointer text-left border ${
                        isDark
                          ? 'bg-[#151722] hover:bg-[#1b1e2c] border-amber-500/30 hover:border-amber-500/60'
                          : 'bg-amber-50/50 hover:bg-amber-50 border-amber-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Zap className="w-4 h-4 fill-amber-400/20" />
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
                      className={`p-3 rounded-xl flex flex-col items-start gap-2 transition-all cursor-pointer text-left border ${
                        activeShiftSession?.isActive
                          ? 'bg-emerald-500/15 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                          : isDark
                          ? 'bg-[#151722] hover:bg-[#1b1e2c] border-sky-500/30 hover:border-sky-500/60'
                          : 'bg-sky-50/50 hover:bg-sky-50 border-sky-300'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          activeShiftSession?.isActive
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
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
                      className={`p-3 rounded-xl flex flex-col items-start gap-2 transition-all cursor-pointer text-left border ${
                        isDark
                          ? 'bg-[#151722] hover:bg-[#1b1e2c] border-purple-500/30 hover:border-purple-500/60'
                          : 'bg-purple-50/50 hover:bg-purple-50 border-purple-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
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
                      className={`p-3 rounded-xl flex flex-col items-start gap-2 transition-all cursor-pointer text-left border ${
                        isDark
                          ? 'bg-[#151722] hover:bg-[#1b1e2c] border-[#FF6A1A]/30 hover:border-[#FF6A1A]/60'
                          : 'bg-orange-50/50 hover:bg-orange-50 border-[#FF6A1A]/40'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#FF6A1A]/15 border border-[#FF6A1A]/30 flex items-center justify-center text-[#FF6A1A] shrink-0">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black leading-tight">Meta Reversa</div>
                        <div className={`text-[10px] mt-0.5 leading-tight ${mutedText}`}>
                          Quanto faturar por dia?
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Botão de Conta / Login Rápido */}
          <button
            type="button"
            onClick={() => setShowAuthScreen(true)}
            title={currentUser.isGuest ? 'Entrar ou Criar Conta' : `Conta: ${currentUser.name} (${currentUser.email})`}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[40px] flex items-center gap-1.5 ${surfaceSubtle} hover:border-[#FF6A1A]`}
          >
            <User className="w-3.5 h-3.5 text-[#FF6A1A] shrink-0" />
            <span className="hidden sm:inline max-w-[110px] truncate">
              {currentUser.isGuest ? 'Entrar / Conta' : currentUser.name.split(' ')[0]}
            </span>
          </button>

          {/* Central de Notificações de Alerta */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotificationsModal(prev => !prev)}
              aria-label="Notificações e Alertas de Manutenção"
              className={`p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer relative min-h-[40px] min-w-[40px] flex items-center justify-center ${
                pendingAlertNotifications.length > 0
                  ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
                  : `${surfaceSubtle} ${mutedText} hover:text-white`
              }`}
            >
              <Bell className="w-4 h-4" />
              {pendingAlertNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-xs animate-pulse">
                  {pendingAlertNotifications.length}
                </span>
              )}
            </button>

            {/* Dropdown / Modal de Notificações adaptado para telas mobile e desktop */}
            {showNotificationsModal && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotificationsModal(false)}
                />
                <div
                  className={`fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 max-w-full rounded-2xl p-4 shadow-2xl z-50 border ${
                    isDark
                      ? 'bg-[#12141C] border-slate-800 text-slate-100'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <Bell className="w-4 h-4 text-[#FF6A1A] shrink-0" />
                      <span className="text-xs font-black uppercase tracking-wider truncate">
                        Alertas de Manutenção ({pendingAlertNotifications.length})
                      </span>
                    </div>
                    <button
                      onClick={() => setShowNotificationsModal(false)}
                      className={`p-1.5 rounded-lg shrink-0 ${surfaceSubtle} cursor-pointer`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-col gap-2.5 max-h-[65vh] sm:max-h-80 overflow-y-auto">
                    {pendingAlertNotifications.length === 0 ? (
                      <div className="py-6 text-center text-xs font-semibold text-emerald-400 flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        <span>Todas as manutenções estão abaixo da porcentagem de alerta!</span>
                      </div>
                    ) : (
                      pendingAlertNotifications.map(item => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setActiveTab('maintenance');
                            setShowNotificationsModal(false);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            item.isOverdue
                              ? 'bg-rose-500/10 border-rose-500/40 hover:bg-rose-500/20'
                              : 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20'
                          }`}
                        >
                          <span className="text-2xl shrink-0 mt-0.5">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black truncate">{item.name}</span>
                              <span
                                className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
                                  item.isOverdue
                                    ? 'bg-rose-500/25 text-rose-300'
                                    : 'bg-amber-500/25 text-amber-300'
                                }`}
                              >
                                {item.isOverdue ? 'Vencido' : `Alerta ${item.threshold}%`}
                              </span>
                            </div>
                            <p className={`text-[11px] mt-0.5 break-words ${mutedText}`}>
                              {item.isOverdue
                                ? `Ultrapassou o limite (+${item.kmOverdue.toLocaleString('pt-BR')} km rodados além)`
                                : `Atingiu ${item.rawPct}% do intervalo (restam ${item.kmRemaining.toLocaleString('pt-BR')} km)`}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {pendingAlertNotifications.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/40 flex justify-end">
                      <button
                        onClick={() => {
                          setActiveTab('maintenance');
                          setShowNotificationsModal(false);
                        }}
                        className="text-xs font-bold text-[#FF6A1A] hover:underline cursor-pointer"
                      >
                        Ir para a Garagem da Moto →
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER (Responsive Mobile + Multi-Column Desktop) */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6">
        {/* ================= ABA 1: PAINEL (DASHBOARD) ================= */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* CARDS EM DESTAQUE NO TOPO: RESERVAS OBRIGATÓRIAS DO MOTOBOY */}
            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 ${surfaceCard} border border-[#FF6A1A]/30 shadow-sm`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-[#FF6A1A]/15 text-[#FF6A1A] flex items-center justify-center text-base shrink-0">
                    🛡️
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-black flex items-center gap-2">
                      <span>Reservas Financeiras Obrigatórias</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#FF6A1A]/15 text-[#FF6A1A] border border-[#FF6A1A]/30">
                        Blindagem do Bolso
                      </span>
                    </h2>
                    <p className={`text-xs mt-0.5 ${mutedText}`}>
                      Valores diários que você deve separar do faturamento antes de gastar seu lucro
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('billing');
                    setBillingSubTab('planejamento');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FF6A1A]/15 hover:bg-[#FF6A1A]/25 text-[#FF6A1A] border border-[#FF6A1A]/30 transition-colors cursor-pointer self-start sm:self-center flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Ajustar Parâmetros</span>
                </button>
              </div>

              {/* Grid dos Cards de Reserva em Destaque */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Reserva Alimentação na Rua */}
                <div className={`rounded-2xl p-3.5 sm:p-4 border-l-4 border-l-orange-400 ${surfaceSubtle}`}>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="flex items-center gap-1.5 text-orange-400 font-black">
                      <span>🍱</span>
                      <span>Alimentação na Rua</span>
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-orange-400/15 text-orange-400">
                      {financialIntelligence.foodPctOfGross}% do dia
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-orange-400 tabular-nums">
                    {fmtCurrencyExact(financialIntelligence.dailyFoodCost)}
                    <span className="text-xs font-semibold ml-1 text-slate-400">/ dia</span>
                  </div>
                  <div className={`text-xs mt-1 font-semibold ${mutedText}`}>
                    {fmtCurrencyExact(financialIntelligence.monthlyFoodCost)}/mês estimado
                  </div>
                  <div className={`text-[11px] mt-1 ${mutedText}`}>
                    Almoço, lanches e água no turno
                  </div>
                </div>

                {/* 2. Reserva Manutenção da Moto */}
                <div className={`rounded-2xl p-3.5 sm:p-4 border-l-4 border-l-amber-500 ${surfaceSubtle}`}>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="flex items-center gap-1.5 text-amber-400 font-black">
                      <span>🛠️</span>
                      <span>Manutenção Preventiva</span>
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-400">
                      {financialIntelligence.maintPctOfGross}% do dia
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                    {fmtCurrencyExact(financialIntelligence.dailyMaintReserve)}
                    <span className="text-xs font-semibold ml-1 text-slate-400">/ dia</span>
                  </div>
                  <div className={`text-xs mt-1 font-semibold ${mutedText}`}>
                    {fmtCurrencyExact(financialIntelligence.monthlyMaintReserve)}/mês preventivo
                  </div>
                  <div className={`text-[11px] mt-1 ${mutedText}`}>
                    Desgaste de óleo, pneus e relação
                  </div>
                </div>

                {/* 3. Reserva Documentos da Moto */}
                <div className={`rounded-2xl p-3.5 sm:p-4 border-l-4 border-l-sky-400 ${surfaceSubtle}`}>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="flex items-center gap-1.5 text-sky-400 font-black">
                      <span>📄</span>
                      <span>Documentos & IPVA</span>
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-400/15 text-sky-400">
                      {financialIntelligence.docsPctOfGross}% do dia
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-sky-400 tabular-nums">
                    {fmtCurrencyExact(financialIntelligence.dailyDocsReserve)}
                    <span className="text-xs font-semibold ml-1 text-slate-400">/ dia</span>
                  </div>
                  <div className={`text-xs mt-1 font-semibold ${mutedText}`}>
                    {fmtCurrencyExact(financialIntelligence.monthlyDocsReserve)}/mês · Total {fmtMoney(financialIntelligence.totalAnnualDocsWithInsurance)}/ano
                  </div>
                  <div className={`text-[11px] mt-1 ${mutedText}`}>
                    IPVA, licenciamento e DAS MEI
                  </div>
                </div>

                {/* 4. Total a Reservar por Dia */}
                <div className="rounded-2xl p-3.5 sm:p-4 border-2 border-emerald-500/40 bg-emerald-500/10">
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-black">
                      <span>🔒</span>
                      <span>Total Diário a Guardar</span>
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      Proteção
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">
                    {fmtCurrencyExact(financialIntelligence.dailyFoodCost + financialIntelligence.dailyMaintReserve + financialIntelligence.dailyDocsReserve + financialIntelligence.dailyEmergencyReserve)}
                    <span className="text-xs font-semibold ml-1 text-emerald-300">/ dia</span>
                  </div>
                  <div className="text-xs mt-1 font-semibold text-emerald-400/90">
                    Alimentação + Manutenção + Docs + Emergência
                  </div>
                  <div className={`text-[11px] mt-1 ${mutedText}`}>
                    Separe todo dia antes do lucro livre
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            {/* Left Column: Hero Odometer, Level Road & Main Financials */}
            <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6">
              {/* LIVE ACTIVE SHIFT BANNER */}
              {activeShiftSession?.isActive && (
                <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-emerald-500/15 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span className="relative flex h-3 w-3 shrink-0 mt-1 sm:mt-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                          Turno Ativo · Odômetro GPS Automático
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          +{(Number(activeShiftSession.gpsDistanceKm) || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          km no GPS
                        </span>
                        {(activeShiftSession.currentSpeedKmh || 0) > 0 && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            {activeShiftSession.currentSpeedKmh} km/h
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm font-bold mt-1 flex items-center gap-2 flex-wrap">
                        <span>
                          Início: <strong>{activeShiftSession.startKm.toLocaleString('pt-BR')} km</strong>
                        </span>
                        <span>·</span>
                        <span>
                          Ganhos no turno:{' '}
                          <strong className="text-emerald-400 font-black">
                            {fmtMoney(Math.max(0, totals.totalRevenue - (activeShiftSession.startRevenue || 0)))}
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
                        className="px-3 py-2 rounded-xl text-xs font-black bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Permitir GPS 2º Plano</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowTurnoModal(true)}
                      className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-black bg-emerald-500 text-black hover:bg-emerald-400 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 shadow-md"
                    >
                      <Square className="w-3.5 h-3.5 fill-black" />
                      <span>Ver / Encerrar</span>
                    </button>
                  </div>
                </div>
              )}

              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-7 ${surfaceCard}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className={`text-[11px] sm:text-xs font-bold tracking-wider uppercase ${mutedText}`}>
                    Odômetro Total · {dbState.fuelConfig.bikeModelName}
                  </div>
                  {activeShiftSession?.isActive && activeShiftSession.gpsEnabled !== false && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
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
                  <span className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight tabular-nums">
                    {totals.totalKm.toLocaleString('pt-BR', {
                      minimumFractionDigits: activeShiftSession?.isActive && totals.liveShiftGpsKm > 0 ? 1 : 0,
                      maximumFractionDigits: 1,
                    })}
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-[#FF6A1A] uppercase tracking-wider">
                    KM Rodados
                  </span>
                </div>
                <div className={`mt-1.5 sm:mt-2 text-xs sm:text-sm font-semibold ${mutedText}`}>
                  Nível: <span className="text-[#FF6A1A] font-extrabold">{level.name}</span> · Próxima meta aos{' '}
                  {level.end.toLocaleString('pt-BR')} km
                </div>

                {/* Road Progress Bar */}
                <div className="mt-6 sm:mt-8 pt-2 sm:pt-4 relative">
                  <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div
                      className="h-full bg-gradient-to-r from-[#FF7B31] to-[#FF5000] rounded-full transition-all duration-500"
                      style={{ width: `${level.pct}%` }}
                    />
                  </div>
                  <div className={`flex justify-between text-[11px] sm:text-xs font-bold mt-2 tabular-nums ${mutedText}`}>
                    <span>{level.start.toLocaleString('pt-BR')} km</span>
                    <span className="text-[#FF6A1A]">{Math.round(level.pct)}% do nível</span>
                    <span className="text-[#FF6A1A]">{level.end.toLocaleString('pt-BR')} km</span>
                  </div>
                </div>

                {/* RAIO-X OPERACIONAL DO ODÔMETRO: CUSTO REAL POR KM, AUTONOMIA & MARGEM LIMPA */}
                <div className={`mt-5 sm:mt-6 pt-4 sm:pt-6 border-t ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#FF6A1A]/15 border border-[#FF6A1A]/30 flex items-center justify-center text-[#FF6A1A] shrink-0">
                        <Gauge className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-white">
                          Custo Operacional & Autonomia da Moto
                        </h3>
                        <p className={`text-[10px] sm:text-[11px] font-semibold ${mutedText}`}>
                          Telemetria em tempo real baseada nos abastecimentos
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-stretch sm:self-auto">
                      {/* Botão de Abastecer */}
                      <button
                        type="button"
                        onClick={openNewFuelModal}
                        title="Registrar novo abastecimento com preço pago e litros"
                        className="flex-1 sm:flex-initial px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all bg-[#FF6A1A] hover:bg-[#ff7b33] text-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer shrink-0"
                      >
                        <Fuel className="w-4 h-4 stroke-[2.5]" />
                        <span>+ Abastecer</span>
                      </button>

                      {/* Botão de Ver Detalhes do KM */}
                      <button
                        type="button"
                        onClick={() => setShowOdometerCostDetails(prev => !prev)}
                        className={`flex-1 sm:flex-initial px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                          showOdometerCostDetails
                            ? 'bg-[#FF6A1A]/15 border-[#FF6A1A] text-[#FF6A1A]'
                            : isDark
                            ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
                            : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                        }`}
                      >
                        <span>{showOdometerCostDetails ? 'Ocultar Detalhes' : 'Ver Detalhes do KM'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showOdometerCostDetails ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
                    {/* 1. Custo Real por KM */}
                    <div className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-0 border-l-4 border-l-amber-500 ${surfaceSubtle}`}>
                      <div className={`text-[10px] sm:text-xs font-bold truncate ${mutedText}`}>Custo Real / KM</div>
                      <div className="text-xs sm:text-lg lg:text-xl font-black mt-1 tabular-nums text-amber-500 dark:text-amber-400 truncate">
                        R$ {(financialIntelligence.fuelCostPerKm + financialIntelligence.baseMaintCostPerKm).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className={`text-[9px] sm:text-[11px] mt-0.5 truncate ${mutedText}`}>
                        Gasolina + Peças
                      </div>
                    </div>

                    {/* 2. Autonomia Baseada no Abastecimento Real */}
                    <div className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-0 border-l-4 ${
                      fuelTelemetry.hasLoggedFuel
                        ? fuelTelemetry.remainingAutonomyKm <= 35
                          ? 'border-l-rose-500 bg-rose-500/10'
                          : fuelTelemetry.remainingAutonomyKm <= 70
                          ? 'border-l-amber-500 bg-amber-500/10'
                          : 'border-l-sky-500'
                        : 'border-l-sky-500'
                    } ${surfaceSubtle}`}>
                      <div className="flex items-center justify-between gap-1">
                        <div className={`text-[10px] sm:text-xs font-bold truncate ${
                          fuelTelemetry.hasLoggedFuel && fuelTelemetry.remainingAutonomyKm <= 35 ? 'text-rose-500 dark:text-rose-400 font-black' : mutedText
                        }`}>
                          {fuelTelemetry.hasLoggedFuel ? 'Autonomia Restante' : 'Autonomia Tanque'}
                        </div>
                        {fuelTelemetry.hasLoggedFuel && (
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                            fuelTelemetry.remainingAutonomyKm <= 35
                              ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 animate-pulse'
                              : 'bg-sky-500/20 text-sky-600 dark:text-sky-400'
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
                        {fuelTelemetry.remainingAutonomyKm.toLocaleString('pt-BR')}{' '}
                        <span className="text-[10px] sm:text-xs font-bold">km</span>
                      </div>
                      <div className={`text-[9px] sm:text-[11px] mt-0.5 truncate ${mutedText}`}>
                        {fuelTelemetry.hasLoggedFuel
                          ? `${fuelTelemetry.liters}L abastecidos (${fuelTelemetry.kmSinceFuel} km rodados)`
                          : `Tanque padrão ${fuelTelemetry.liters}L`}
                      </div>
                    </div>

                    {/* 3. Margem Limpa por KM */}
                    {(() => {
                      const totalCostKm = financialIntelligence.fuelCostPerKm + financialIntelligence.baseMaintCostPerKm;
                      const grossKm = totals.ridesKm > 0 ? totals.totalRevenue / totals.ridesKm : (progressAnalytics.grossPerKm > 0 ? progressAnalytics.grossPerKm : 0);
                      const netKm = grossKm > 0 ? Math.max(0, grossKm - totalCostKm) : 0;
                      return (
                        <div className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-0 border-l-4 border-l-emerald-500 ${
                          netKm > 0 ? 'bg-emerald-500/10 border border-emerald-500/25' : surfaceSubtle
                        }`}>
                          <div className={`text-[10px] sm:text-xs font-bold truncate ${netKm > 0 ? 'text-emerald-600 dark:text-emerald-400' : mutedText}`}>
                            Lucro Limpo / KM
                          </div>
                          <div className={`text-xs sm:text-lg lg:text-xl font-black mt-1 tabular-nums truncate ${
                            netKm > 0 ? 'text-emerald-600 dark:text-emerald-400' : mutedText
                          }`}>
                            {netKm > 0 ? `+ R$ ${netKm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </div>
                          <div className={`text-[9px] sm:text-[11px] mt-0.5 truncate ${mutedText}`}>
                            {netKm > 0 ? 'Livre no bolso' : 'Sem corridas'}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Detalhamento Expansível do Custo Operacional e Telemetria de Combustível */}
                  {showOdometerCostDetails && (
                    <div className={`mt-4 p-4 sm:p-5 rounded-2xl border text-xs transition-all ${
                      isDark
                        ? 'bg-[#151824] border-slate-800 text-slate-200'
                        : 'bg-slate-100/90 border-slate-300/80 text-slate-800'
                    } space-y-3`}>
                      <div className="flex items-center justify-between font-bold border-b pb-2.5 border-slate-300 dark:border-slate-800 flex-wrap gap-2">
                        <span className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          <Fuel className="w-4 h-4 text-[#FF6A1A]" />
                          <span>Telemetria do Combustível & Custo ({dbState.fuelConfig.bikeModelName})</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={openNewFuelModal}
                            className="text-xs font-black text-[#FF6A1A] hover:underline cursor-pointer flex items-center gap-1"
                          >
                            + Abastecer Agora
                          </button>
                          <span className="text-slate-400">·</span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('maintenance');
                              startEditFuelCard();
                            }}
                            className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#FF6A1A] hover:underline cursor-pointer"
                          >
                            Configurar Moto →
                          </button>
                        </div>
                      </div>

                      {/* Grid de estatísticas com cards individuais de alto contraste */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                        <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Consumo Médio
                          </div>
                          <div className="text-xs sm:text-sm font-black mt-1 text-slate-900 dark:text-white tabular-nums">
                            {financialIntelligence.kmPerLiter} km/L
                          </div>
                        </div>

                        <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Preço Gasolina
                          </div>
                          <div className="text-xs sm:text-sm font-black mt-1 text-slate-900 dark:text-white tabular-nums">
                            {fmtCurrencyExact(fuelTelemetry.pricePerL)}/L
                          </div>
                        </div>

                        <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Combustível / KM
                          </div>
                          <div className="text-xs sm:text-sm font-black mt-1 text-amber-600 dark:text-amber-400 tabular-nums">
                            {fmtCurrencyExact(financialIntelligence.fuelCostPerKm)}/km
                          </div>
                        </div>

                        <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Desgaste Peças / KM
                          </div>
                          <div className="text-xs sm:text-sm font-black mt-1 text-amber-600 dark:text-amber-400 tabular-nums">
                            {fmtCurrencyExact(financialIntelligence.baseMaintCostPerKm)}/km
                          </div>
                        </div>

                        <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                            Último Abastecimento
                          </div>
                          <div className="text-xs sm:text-sm font-black mt-1 text-sky-600 dark:text-sky-400 tabular-nums truncate">
                            {fuelTelemetry.fuelDate
                              ? `${fuelTelemetry.fuelDate.split('-').reverse().join('/')} (${fuelTelemetry.liters}L)`
                              : `Padrão (${fuelTelemetry.liters}L)`}
                          </div>
                        </div>

                        <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                            Valor Pago
                          </div>
                          <div className="text-xs sm:text-sm font-black mt-1 text-sky-600 dark:text-sky-400 tabular-nums">
                            {fmtMoney(fuelTelemetry.amountPaid)}
                          </div>
                        </div>

                        <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            KM Rodados no Tanque
                          </div>
                          <div className="text-xs sm:text-sm font-black mt-1 text-slate-900 dark:text-white tabular-nums">
                            {fuelTelemetry.kmSinceFuel} km
                          </div>
                        </div>

                        <div className={`p-2.5 sm:p-3 rounded-xl border shadow-2xs ${
                          fuelTelemetry.remainingAutonomyKm <= 35
                            ? 'bg-rose-500/10 border-rose-500/30'
                            : 'bg-emerald-500/10 border-emerald-500/30'
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

              {/* Period Earnings + Real-Time Productivity */}
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                  <h2 className="text-sm sm:text-base font-extrabold">Ganhos por Período & Produtividade</h2>
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="text-xs font-bold text-[#FF6A1A] hover:underline cursor-pointer shrink-0"
                  >
                    Ver completo
                  </button>
                </div>

                {/* Card de Meta Diária */}
                {(() => {
                  const dailyTarget = Math.max(10, Number(dbState.dailyGoal) || 150);
                  const dailyEarned = progressAnalytics.revToday;
                  const dailyRawPct = Math.round((dailyEarned / dailyTarget) * 100);
                  const dailyBarPct = Math.min(100, Math.max(0, dailyRawPct));
                  const dailyRemaining = Math.max(0, dailyTarget - dailyEarned);
                  const isDailyGoalReached = dailyEarned >= dailyTarget;

                  return (
                    <div
                      className={`rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border transition-colors ${
                        isDailyGoalReached
                          ? isDark
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-emerald-50/70 border-emerald-300'
                          : surfaceSubtle
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Target
                            className={`w-4 h-4 shrink-0 ${
                              isDailyGoalReached ? 'text-emerald-400' : 'text-[#FF6A1A]'
                            }`}
                          />
                          <span className="text-xs sm:text-sm font-extrabold">Meta Diária de Hoje</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs sm:text-sm font-black tabular-nums ${
                              isDailyGoalReached ? 'text-emerald-400' : 'text-[#FF6A1A]'
                            }`}
                          >
                            {fmtMoney(dailyEarned)} / {fmtMoney(dailyTarget)} ({dailyRawPct}%)
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('settings')}
                            title="Ajustar Meta Diária nas Configurações"
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              isDark
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700'
                            }`}
                          >
                            Ajustar
                          </button>
                        </div>
                      </div>

                      <div
                        className={`mt-2.5 h-2.5 sm:h-3 rounded-full overflow-hidden ${
                          isDark ? 'bg-slate-800' : 'bg-slate-200'
                        }`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isDailyGoalReached
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : 'bg-gradient-to-r from-[#FF7B31] to-[#FF5000]'
                          }`}
                          style={{ width: `${dailyBarPct}%` }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] sm:text-xs font-semibold tabular-nums">
                        <span className={isDailyGoalReached ? 'text-emerald-400 font-bold' : mutedText}>
                          {isDailyGoalReached
                            ? `🎉 Meta diária batida! (+${fmtMoney(dailyEarned - dailyTarget)} acima da meta)`
                            : `Faltam ${fmtMoney(dailyRemaining)} para atingir o objetivo de hoje`}
                        </span>
                        <span className={isDailyGoalReached ? 'text-emerald-400 font-extrabold' : mutedText}>
                          {dailyRawPct}% concluído
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Meta de Faturamento Semanal Progress Bar */}
                {(() => {
                  const weeklyTarget = Math.max(50, Number(dbState.weeklyGoal) || 900);
                  const weeklyEarned = periodTotals.revWeek;
                  const weeklyRawPct = Math.round((weeklyEarned / weeklyTarget) * 100);
                  const weeklyBarPct = Math.min(100, Math.max(0, weeklyRawPct));
                  const weeklyRemaining = Math.max(0, weeklyTarget - weeklyEarned);
                  const isWeeklyGoalReached = weeklyEarned >= weeklyTarget;

                  return (
                    <div className={`mt-2.5 sm:mt-3 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 ${surfaceSubtle}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Trophy
                            className={`w-4 h-4 shrink-0 ${
                              isWeeklyGoalReached ? 'text-emerald-400' : 'text-[#FF6A1A]'
                            }`}
                          />
                          <span className="text-xs sm:text-sm font-extrabold">
                            Meta de Faturamento Semanal
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs sm:text-sm font-black tabular-nums ${
                              isWeeklyGoalReached ? 'text-emerald-400' : 'text-[#FF6A1A]'
                            }`}
                          >
                            {fmtMoney(weeklyEarned)} / {fmtMoney(weeklyTarget)} ({weeklyRawPct}%)
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('settings')}
                            title="Ajustar Meta Semanal nas Configurações"
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              isDark
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700'
                            }`}
                          >
                            Ajustar
                          </button>
                        </div>
                      </div>

                      <div
                        className={`mt-2.5 h-2.5 sm:h-3 rounded-full overflow-hidden ${
                          isDark ? 'bg-slate-800' : 'bg-slate-200'
                        }`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
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
                        <span className={isWeeklyGoalReached ? 'text-emerald-400 font-extrabold' : mutedText}>
                          {weeklyRawPct}% concluído
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Meta Personalizada de Ganhos: Acompanha o Saldo Atual do Usuário */}
                {(() => {
                  const customTarget = Math.max(50, Number(dbState.customGoalTarget) || 3000);
                  const targetDate = dbState.customGoalTargetDate || getDefaultFutureDate(dbState.customGoalDays || 20);
                  const countdown = getCustomGoalCountdown('date', dbState.customGoalDays, targetDate);
                  const customDays = Math.max(1, countdown.effectiveDays);
                  const customTitle = (dbState.customGoalTitle || '').trim() || 'Meta Personalizada de Saldo';
                  // Acompanha o SALDO ATUAL do usuário (Lucro Líquido Real = Ganhos - Gastos)
                  const currentBalance = periodTotals.saldoMonth;
                  const currentGross = periodTotals.revMonth;
                  const currentExpenses = periodTotals.expMonth;
                  const rawPct = customTarget > 0 ? Math.round((currentBalance / customTarget) * 100) : 0;
                  const barPct = Math.min(100, Math.max(0, rawPct));
                  const remainingToGoal = Math.max(0, customTarget - currentBalance);
                  const isGoalReached = currentBalance >= customTarget;
                  const requiredDailyToReachGoal = isGoalReached ? 0 : remainingToGoal / customDays;

                  return (
                    <div
                      className={`mt-2.5 sm:mt-3 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border transition-colors ${
                        isGoalReached
                          ? isDark
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-emerald-50/70 border-emerald-300'
                          : surfaceSubtle
                      }`}
                    >
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                              isGoalReached
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-[#FF6A1A]/15 text-[#FF6A1A]'
                            }`}
                          >
                            <Trophy className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-extrabold block leading-tight">
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
                              isGoalReached ? 'text-emerald-400' : currentBalance < 0 ? 'text-rose-400' : 'text-[#FF6A1A]'
                            }`}
                          >
                            Saldo: {fmtMoney(currentBalance)} / {fmtMoney(customTarget)} ({rawPct}%)
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('settings')}
                            title="Ajustar Meta e Data Término nas Configurações"
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              isDark
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700'
                            }`}
                          >
                            Ajustar
                          </button>
                        </div>
                      </div>

                      {/* Informações Definidas na Configuração: Data Término, Meta Diária e Falta para o Objetivo */}
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className={`rounded-xl p-2.5 flex flex-col justify-between ${surfaceCard}`}>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                            Data Término
                          </span>
                          <div className="mt-1 flex items-center justify-between gap-1 flex-wrap">
                            <span className="text-xs sm:text-sm font-black tabular-nums">
                              {formatPtBrDate(countdown.targetDateStr)}
                            </span>
                            <span className="text-[10px] font-black text-[#FF6A1A] bg-[#FF6A1A]/10 px-1.5 py-0.5 rounded-md border border-[#FF6A1A]/20">
                              ⏳ {countdown.countdownBadgeText}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`rounded-xl p-2.5 flex flex-col justify-between border ${
                            isGoalReached
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-[#FF6A1A]/10 border-[#FF6A1A]/30'
                          }`}
                        >
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF6A1A]">
                            Saldo Diário Necessário
                          </span>
                          <div className="mt-1 flex items-baseline justify-between gap-1">
                            <span
                              className={`text-sm sm:text-base font-black tabular-nums ${
                                isGoalReached ? 'text-emerald-400' : 'text-[#FF6A1A]'
                              }`}
                            >
                              {isGoalReached
                                ? 'Objetivo Batido!'
                                : `${fmtCurrencyExact(requiredDailyToReachGoal)}/dia`}
                            </span>
                            {!isGoalReached && (
                              <span className={`text-[10px] font-bold tabular-nums ${mutedText}`}>
                                {countdown.isToday ? 'hoje' : `por ${customDays} ${customDays === 1 ? 'dia' : 'dias'}`}
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          className={`rounded-xl p-2.5 flex flex-col justify-between border ${
                            isGoalReached
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-rose-500/10 border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-extrabold uppercase tracking-wider ${
                              isGoalReached ? 'text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                            }`}
                          >
                            Falta de Saldo Líquido
                          </span>
                          <div className="mt-1 flex items-baseline justify-between gap-1">
                            <span
                              className={`text-sm sm:text-base font-black tabular-nums ${
                                isGoalReached ? 'text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {isGoalReached ? '100% Batida!' : fmtMoney(remainingToGoal)}
                            </span>
                            <span className={`text-[10px] font-bold ${mutedText}`}>
                              {isGoalReached ? 'Sucesso' : `${Math.max(0, 100 - rawPct)}% restante`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div
                        className={`mt-3 h-2.5 sm:h-3 rounded-full overflow-hidden ${
                          isDark ? 'bg-slate-800' : 'bg-slate-200'
                        }`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isGoalReached
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : 'bg-gradient-to-r from-[#FF6A1A] to-amber-400'
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>

                      {/* Feedback Visual Direto: Saldo Atual (Ganhos - Gastos) e o Quanto Falta */}
                      <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] sm:text-xs font-semibold tabular-nums">
                        <span className={mutedText}>
                          Saldo no bolso: <span className={currentBalance >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{fmtMoney(currentBalance)}</span> <span className="opacity-75">(Ganhos: {fmtMoney(currentGross)} · Gastos: {fmtMoney(currentExpenses)})</span>
                        </span>
                        <span className={isGoalReached ? 'text-emerald-400 font-extrabold' : 'text-slate-800 dark:text-slate-200 font-bold'}>
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-2.5 sm:mt-3">
                  <div className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 ${surfaceSubtle}`}>
                    <div className={`text-[10px] sm:text-xs font-medium truncate ${mutedText}`}>Ganhos / Hora</div>
                    <div className="text-xs sm:text-base font-black mt-0.5 sm:mt-1 tabular-nums truncate">
                      {fmtCurrencyExact(totals.totalHours > 0 ? totals.totalRevenue / totals.totalHours : 0)}/h
                    </div>
                  </div>
                  <div className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 ${surfaceSubtle}`}>
                    <div className={`text-[10px] sm:text-xs font-medium truncate ${mutedText}`}>Lucro / Hora</div>
                    <div className="text-xs sm:text-base font-black mt-0.5 sm:mt-1 tabular-nums text-emerald-400 truncate">
                      {fmtCurrencyExact(totals.totalHours > 0 ? totals.lucro / totals.totalHours : 0)}/h
                    </div>
                  </div>
                  <div className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 ${surfaceSubtle}`}>
                    <div className={`text-[10px] sm:text-xs font-medium truncate ${mutedText}`}>Ganhos / KM</div>
                    <div className="text-xs sm:text-base font-black mt-0.5 sm:mt-1 tabular-nums text-[#FF6A1A] truncate">
                      {fmtCurrencyExact(totals.ridesKm > 0 ? totals.totalRevenue / totals.ridesKm : 0)}/km
                    </div>
                  </div>
                  <div className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 ${surfaceSubtle}`}>
                    <div className={`text-[10px] sm:text-xs font-medium truncate ${mutedText}`}>Horas Rodadas</div>
                    <div className="text-xs sm:text-base font-black mt-0.5 sm:mt-1 tabular-nums truncate">
                      {totals.totalHours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h
                    </div>
                  </div>
                </div>
              </div>

              {/* 7-Day Trend Chart */}
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold">Desempenho nos Últimos 7 Dias</h2>
                    <p className={`text-[11px] sm:text-xs ${mutedText}`}>Faturamento diário e quilometragem</p>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-[#FF6A1A] tabular-nums shrink-0">
                    {fmtMoney(chart7Days.reduce((a, b) => a + b.rev, 0))}
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2 items-end h-36 sm:h-40 pt-2 sm:pt-4">
                  {chart7Days.map(day => {
                    const maxRev = Math.max(100, ...chart7Days.map(d => d.rev));
                    const barHeightPct = Math.max(8, Math.round((day.rev / maxRev) * 100));
                    return (
                      <div key={day.date} className="flex flex-col items-center gap-1 sm:gap-1.5 h-full justify-end">
                        <span className={`text-[9px] sm:text-[10px] font-bold tabular-nums truncate max-w-full ${day.rev > 0 ? 'text-[#FF6A1A]' : mutedText}`}>
                          {day.rev > 0 ? `R$${Math.round(day.rev)}` : '—'}
                        </span>
                        <div className={`w-full max-w-[36px] rounded-t-lg sm:rounded-t-xl transition-all ${
                          day.rev > 0 ? 'bg-gradient-to-t from-[#FF5000] to-[#FF8533]' : isDark ? 'bg-slate-800' : 'bg-slate-200'
                        }`} style={{ height: `${barHeightPct}%` }} />
                        <span className={`text-[10px] sm:text-[11px] font-bold tabular-nums ${mutedText}`}>{day.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Mochilinha Decision, Quick Maintenance Status & App Ranking */}
            <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-6">
              {/* Mochilinha Shift Evaluation Card */}
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#FF6A1A]">
                    Análise de Turno · {shiftEval.badge}
                  </span>
                  <button
                    onClick={() => setShowCopilotModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FF6A1A]/15 text-[#FF6A1A] hover:bg-[#FF6A1A]/25 transition-colors cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Perguntar à Mochilinha</span>
                  </button>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold">{shiftEval.title}</h3>
                <p className={`text-xs sm:text-sm mt-1.5 sm:mt-2 leading-relaxed ${mutedText}`}>{shiftEval.summary}</p>
                <p className="text-xs sm:text-sm mt-1.5 sm:mt-2 font-medium leading-relaxed">{shiftEval.recommendation}</p>
                <div className={`mt-3 sm:mt-4 pt-3 border-t border-slate-800/40 text-xs font-bold text-[#FF6A1A]`}>
                  {shiftEval.projectedExtra}
                </div>
              </div>

              {/* Bike Health Quick Summary */}
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                  <h2 className="text-sm sm:text-base font-extrabold">Saúde da Moto & Manutenção</h2>
                  <button
                    onClick={() => setActiveTab('maintenance')}
                    className="text-xs font-bold text-[#FF6A1A] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Ver na aba Moto</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2.5 sm:gap-3">
                  {dbState.maintenanceItems.slice(0, 3).map(item => {
                    const kmUsed = Math.max(0, totals.totalKm - (item.lastChangeKm || 0));
                    const rawPct = Math.round((kmUsed / (item.intervalKm || 1000)) * 100);
                    const pct = Math.min(100, rawPct);
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
                        className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isDanger
                            ? `border-l-4 border-l-rose-500 border border-rose-500/40 ${
                                isDark ? 'bg-slate-900/60' : 'bg-white shadow-xs'
                              }`
                            : isWarn
                            ? `border-l-4 border-l-amber-500 border border-amber-500/40 ${
                                isDark ? 'bg-slate-900/60' : 'bg-white shadow-xs'
                              }`
                            : `${surfaceSubtle} hover:border-[#FF6A1A]/50`
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <span className="text-2xl shrink-0">{item.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-bold truncate flex items-center gap-1.5">
                              <span className="truncate">{item.name}</span>
                              {isDanger ? (
                                <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 shrink-0">
                                  Vencido
                                </span>
                              ) : isWarn ? (
                                <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                                  Alerta {alertThreshold}%
                                </span>
                              ) : null}
                            </div>
                            <div className={`text-[11px] sm:text-xs tabular-nums ${mutedText}`}>
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
                            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${surfaceCard} hover:border-[#FF6A1A] text-[#FF6A1A]`}
                          >
                            <History className="w-3.5 h-3.5 shrink-0" />
                            {(item.history?.length || 0) > 0 && (
                              <span className="tabular-nums text-[10px] font-black">{item.history?.length}</span>
                            )}
                          </button>
                          <span
                            className={`text-[11px] sm:text-xs font-black whitespace-nowrap shrink-0 ${
                              isDanger
                                ? 'text-rose-400 animate-pulse'
                                : isWarn
                                ? 'text-amber-400 animate-pulse'
                                : 'text-emerald-400'
                            }`}
                          >
                            {isDanger ? '⚠️ Trocar Já' : isWarn ? `⚠️ Alerta (${rawPct}%)` : 'Em Dia'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* App Revenue Ranking */}
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                  <h2 className="text-sm sm:text-base font-extrabold">Faturamento por Aplicativo</h2>
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="text-xs font-bold text-[#FF6A1A] hover:underline cursor-pointer shrink-0"
                  >
                    Ver todos
                  </button>
                </div>

                <div className="flex flex-col gap-2.5 sm:gap-3">
                  {allApps
                    .map(a => ({ ...a, val: totals.revenueByApp[a.id] || 0 }))
                    .sort((a, b) => b.val - a.val)
                    .slice(0, 4)
                    .map(app => {
                      const pct = totals.totalRevenue > 0 ? Math.round((app.val / totals.totalRevenue) * 100) : 0;
                      return (
                        <div key={app.id} className={`rounded-xl sm:rounded-2xl p-3 sm:p-3.5 ${surfaceSubtle}`}>
                          <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5 sm:mb-2">
                            <span className="flex items-center gap-2">
                              <span>{app.icon}</span>
                              <span className="truncate">{app.name}</span>
                            </span>
                            <span className="tabular-nums whitespace-nowrap">
                              {fmtMoney(app.val)} <span className={`text-[11px] font-normal ${mutedText}`}>· {pct}%</span>
                            </span>
                          </div>
                          <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                            <div
                              className="h-full bg-[#FF6A1A] rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
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

        {/* ================= ABA 2: MOTO (100% EDITABLE CARDS) ================= */}
        {activeTab === 'maintenance' && (
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Header & Action Bar */}
            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard} flex flex-col gap-3.5 sm:gap-4`}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-[#FF6A1A]" />
                    <h1 className="text-lg sm:text-2xl font-black tracking-tight">
                      Garagem & Manutenção da Moto (100% Editável)
                    </h1>
                  </div>
                  <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${mutedText}`}>
                    Toque em <span className="text-[#FF6A1A] font-bold">Editar Card</span> em qualquer item para personalizar nome, ícone, KM da troca, intervalo, alerta % e dados de combustível.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  <button
                    onClick={startEditFuelCard}
                    className={`flex-1 sm:flex-initial justify-center px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors min-h-[44px] ${surfaceSubtle} hover:border-[#FF6A1A]`}
                  >
                    <SlidersHorizontal className="w-4 h-4 text-[#FF6A1A]" />
                    <span>Dados da Moto</span>
                  </button>
                  <button
                    onClick={() => startCreateMaintenanceCard()}
                    className="flex-1 sm:flex-initial justify-center px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
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
                    <span className="text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-[#FF6A1A]/15 text-[#FF6A1A] border border-[#FF6A1A]/30 tabular-nums">
                      {sortedMaintenanceItems.length}/{dbState.maintenanceItems.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMaintSearchQuery('')}
                      title="Limpar busca"
                      className={`p-1.5 rounded-lg cursor-pointer transition-colors ${surfaceSubtle} hover:border-[#FF6A1A]`}
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
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 border-l-4 border-l-rose-500 border border-rose-500/35 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 ${
                  isDark ? 'bg-rose-950/20 text-slate-100' : 'bg-rose-50/90 text-slate-900 shadow-xs'
                }`}>
                  <div className="flex items-center gap-3 sm:gap-3.5">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 shrink-0">
                      <AlertTriangle className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-300">
                        {overdueItems.length === 1
                          ? `Atenção: 1 manutenção atingiu 100% ou mais do intervalo!`
                          : `Atenção: ${overdueItems.length} manutenções atingiram 100% ou mais do intervalo!`}
                      </h4>
                      <p className={`text-[11px] sm:text-xs mt-0.5 ${mutedText}`}>
                        Cards com alerta vermelho precisam de troca imediata ({overdueItems.map(o => o.name).join(', ')}).
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-200 shrink-0 self-start sm:self-auto">
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
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 border-l-4 border-l-amber-500 border border-amber-500/35 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 ${
                  isDark ? 'bg-amber-950/20 text-slate-100' : 'bg-amber-50/90 text-slate-900 shadow-xs'
                }`}>
                  <div className="flex items-center gap-3 sm:gap-3.5">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shrink-0">
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-amber-700 dark:text-amber-300">
                        {warningItems.length === 1
                          ? `Aviso Preventivo: 1 manutenção atingiu a porcentagem de alerta configurada!`
                          : `Aviso Preventivo: ${warningItems.length} manutenções atingiram a porcentagem de alerta configurada!`}
                      </h4>
                      <p className={`text-[11px] sm:text-xs mt-0.5 ${mutedText}`}>
                        Cards com alerta preventivo ({warningItems.map(w => `${w.name} aos ${w.alertThresholdPct ?? 85}%`).join(', ')}).
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 shrink-0 self-start sm:self-auto">
                    Alerta Preventivo
                  </span>
                </div>
              );
            })()}

            {/* Inline Editor Modal / Card when adding a brand new Maintenance Card */}
            {isAddingNewMaint && maintDraft && (
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-[#FF6A1A] ${isDark ? 'bg-[#141722]' : 'bg-orange-50/40'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-[#FF6A1A]">
                      Adicionar Nova Manutenção Preventiva
                    </h3>
                    <p className={`text-[11px] sm:text-xs mt-0.5 ${mutedText}`}>
                      Escolha uma sugestão rápida ou digite uma peça/serviço personalizado:
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsAddingNewMaint(false);
                      setEditingMaintId(null);
                      setMaintDraft(null);
                    }}
                    className={`p-2 rounded-xl ${surfaceSubtle} cursor-pointer`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sugestões Rápidas para Motoboys */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
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
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold cursor-pointer transition-colors ${surfaceSubtle} hover:border-[#FF6A1A] hover:text-[#FF6A1A]`}
                    >
                      {preset.icon} {preset.name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
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
                  <div>
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
                  <div className="col-span-1 sm:col-span-2 lg:col-span-3 rounded-2xl p-3.5 sm:p-4 bg-amber-500/10 border border-amber-500/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
                      <div>
                        <label className="block text-xs font-black text-amber-300">
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
                          className={`w-20 px-3 py-1.5 rounded-xl text-center text-sm font-black tabular-nums outline-none text-amber-300 ${inputSurface}`}
                        />
                        <span className="text-xs font-black text-amber-400">%</span>
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
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-amber-500 text-black shadow-xs'
                                : `${surfaceSubtle} hover:border-amber-400 text-amber-300`
                            }`}
                          >
                            {pctVal}%
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 mt-4 sm:mt-5">
                  <button
                    onClick={() => {
                      setIsAddingNewMaint(false);
                      setEditingMaintId(null);
                      setMaintDraft(null);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer text-center ${surfaceSubtle}`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveMaintenanceCardEdit}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#FF6A1A] text-black hover:bg-[#ff7b33] cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Salvar Novo Card no Room DB</span>
                  </button>
                </div>
              </div>
            )}

            {/* ALL MAINTENANCE CARDS GRID (100% EDITABLE INLINE) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {sortedMaintenanceItems.map(item => {
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
                    className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 transition-all relative overflow-hidden ${surfaceCard} ${
                      isDanger && !isEditingThis
                        ? 'border-l-[6px] border-l-rose-500 border-rose-500/60 dark:border-rose-500/70 maint-card-danger-glow'
                        : isWarn && !isEditingThis
                        ? 'border-l-[6px] border-l-amber-500 border-amber-500/60 dark:border-amber-500/70 maint-card-warn-glow'
                        : ''
                    } ${isEditingThis ? 'ring-2 ring-[#FF6A1A]' : ''}`}
                  >
                    {isEditingThis && maintDraft ? (
                      /* 100% EDITABLE FORM MODE FOR THIS CARD */
                      <div className="flex flex-col gap-3.5 sm:gap-4">
                        <div className="flex items-center justify-between border-b border-slate-800/50 pb-2.5">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-[#FF6A1A] truncate">
                            Editando · {item.name}
                          </span>
                          <button
                            onClick={() => {
                              setEditingMaintId(null);
                              setMaintDraft(null);
                            }}
                            className={`p-1.5 rounded-lg ${surfaceSubtle} cursor-pointer`}
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
                        <div className="rounded-xl sm:rounded-2xl p-3 bg-amber-500/10 border border-amber-500/30">
                          <div className="flex items-center justify-between gap-2.5 mb-1.5">
                            <div>
                              <label className="block text-[11px] font-black text-amber-300">
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
                                className={`w-16 px-2 py-1 rounded-lg text-center text-xs font-black tabular-nums outline-none text-amber-300 ${inputSurface}`}
                              />
                              <span className="text-xs font-black text-amber-400">%</span>
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
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-black cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-amber-500 text-black shadow-xs'
                                      : `${surfaceSubtle} hover:border-amber-400 text-amber-300`
                                  }`}
                                >
                                  {pctVal}%
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => deleteMaintenanceCard(item.id)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir Card</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMaintId(null);
                                setMaintDraft(null);
                              }}
                              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer min-h-[40px] text-center ${surfaceSubtle}`}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={saveMaintenanceCardEdit}
                              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
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
                              <span className={`text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md tabular-nums shrink-0 ${
                                isDark
                                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                  : 'bg-rose-100 text-rose-700 border border-rose-300'
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
                              <span className={`text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md tabular-nums shrink-0 ${
                                isDark
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
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
                                    <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
                                      isDark
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        : 'bg-rose-100 text-rose-700 border border-rose-200'
                                    }`}>
                                      {rawPct}%
                                    </span>
                                  ) : isWarn ? (
                                    <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
                                      isDark
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
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
                                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 min-h-[38px] sm:min-h-[40px] ${surfaceSubtle} hover:border-[#FF6A1A] text-slate-700 dark:text-slate-200`}
                                title={`Ver histórico de datas e valores pagos de ${item.name}`}
                              >
                                <History className="w-3.5 h-3.5 text-[#FF6A1A] shrink-0" />
                                <span className="hidden sm:inline">Histórico</span>
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums bg-[#FF6A1A]/15 text-[#FF6A1A] border border-[#FF6A1A]/30">
                                  {(item.history || []).length}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => startEditMaintenanceCard(item)}
                                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0 min-h-[38px] sm:min-h-[40px] ${surfaceSubtle} hover:border-[#FF6A1A] text-[#FF6A1A]`}
                                title="Editar dados deste card"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Editar Card</span>
                                <span className="sm:hidden">Editar</span>
                              </button>
                            </div>
                          </div>

                          {/* Metadata Line */}
                          <div className={`mt-3 sm:mt-4 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs tabular-nums ${mutedText}`}>
                            <span>
                              Desgaste: <strong className="text-current">{kmUsed.toLocaleString('pt-BR')}</strong> /{' '}
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

                          {/* Wear Progress Bar with Threshold Marker */}
                          <div className={`mt-3 sm:mt-4 h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'} relative`}>
                            {/* Marcador visual da porcentagem de alerta configurada */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-amber-400/90 z-10 shadow-[0_0_4px_rgba(245,158,11,0.8)]"
                              style={{ left: `${alertThreshold}%` }}
                              title={`Ponto de Alerta Configurado: ${alertThreshold}%`}
                            />
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isDanger
                                  ? 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 shadow-sm'
                                  : isWarn
                                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 shadow-sm'
                                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className={`mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t ${
                          isDark ? 'border-slate-800/40' : 'border-slate-200'
                        } flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5`}>
                          <button
                            type="button"
                            onClick={() => quickResetMaintenanceCard(item.id)}
                            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all min-h-[44px] text-center ${
                              isDanger
                                ? isDark
                                  ? 'bg-rose-500/20 border-2 border-rose-500/70 text-rose-300 hover:bg-rose-500/30'
                                  : 'bg-rose-50 border-2 border-rose-500/60 text-rose-700 hover:bg-rose-100 shadow-xs'
                                : `${surfaceSubtle} hover:border-emerald-500/60`
                            }`}
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Registrar Troca Agora ({totals.totalKm.toLocaleString('pt-BR')} km)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openMaintenanceHistoryModal(item)}
                            className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all min-h-[44px] shrink-0 ${surfaceSubtle} hover:border-[#FF6A1A] text-[#FF6A1A]`}
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
                  className={`col-span-1 md:col-span-2 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-3 ${surfaceCard}`}
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
                    className="mt-1 px-4 py-2 rounded-xl text-xs font-bold bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors cursor-pointer"
                  >
                    Limpar filtro de busca
                  </button>
                </div>
              )}

              {/* BOTÃO / CARD DEDICADO PARA ADICIONAR OUTRAS NOVAS MANUTENÇÕES */}
              <button
                type="button"
                onClick={() => {
                  startCreateMaintenanceCard();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`rounded-2xl sm:rounded-3xl p-5 sm:p-6 border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-2.5 sm:gap-3 min-h-[180px] sm:min-h-[210px] cursor-pointer group ${
                  isDark
                    ? 'border-slate-800 hover:border-[#FF6A1A] bg-[#12141C]/50 hover:bg-[#12141C]'
                    : 'border-slate-300 hover:border-[#FF6A1A] bg-white/60 hover:bg-white'
                }`}
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#FF6A1A]/15 border border-[#FF6A1A]/40 flex items-center justify-center text-[#FF6A1A] group-hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-extrabold text-[#FF6A1A]">
                    + Adicionar Outra Manutenção
                  </div>
                  <p className={`text-[11px] sm:text-xs mt-1 max-w-xs ${mutedText}`}>
                    Cadastre novos itens como Vela de Ignição, Filtro de Ar, Fluido de Freio, Bateria, Cabos ou Revisão Geral.
                  </p>
                </div>
              </button>
            </div>

            {/* 100% EDITABLE FUEL & DIAGNOSTICS CARD */}
            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-7 ${surfaceCard} ${isEditingFuelCard ? 'ring-2 ring-[#FF6A1A]' : ''}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 sm:pb-5 border-b border-slate-800/50">
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

                {!isEditingFuelCard ? (
                  <button
                    onClick={startEditFuelCard}
                    className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors min-h-[40px] sm:min-h-[44px] ${surfaceSubtle} hover:border-[#FF6A1A] text-[#FF6A1A] self-start sm:self-auto`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Combustível</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => setIsEditingFuelCard(false)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle}`}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveFuelCardEdit}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FF6A1A] text-black hover:bg-[#ff7b33] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Salvar Parâmetros</span>
                    </button>
                  </div>
                )}
              </div>

              {isEditingFuelCard ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mt-4 sm:mt-5">
                  <div className="lg:col-span-1">
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Modelo da Moto</label>
                    <input
                      type="text"
                      value={fuelDraft.bikeModelName}
                      onChange={e => setFuelDraft({ ...fuelDraft, bikeModelName: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold outline-none ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Média da Moto (km/L)</label>
                    <FreeNumberInput
                      step="0.5"
                      value={fuelDraft.kmPerLiter}
                      onValueChange={val => setFuelDraft({ ...fuelDraft, kmPerLiter: Math.max(0, val) })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Preço Gasolina (R$/L)</label>
                    <FreeNumberInput
                      step="0.05"
                      value={fuelDraft.fuelPrice}
                      onValueChange={val => setFuelDraft({ ...fuelDraft, fuelPrice: Math.max(0, val) })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Tanque (Litros)</label>
                    <FreeNumberInput
                      step="0.5"
                      value={fuelDraft.tankCapacityLiters}
                      onValueChange={val => setFuelDraft({ ...fuelDraft, tankCapacityLiters: Math.max(0, val) })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Odômetro Base Inicial (KM)</label>
                    <FreeNumberInput
                      step="10"
                      value={fuelDraft.odometerBaseKm}
                      onValueChange={val => setFuelDraft({ ...fuelDraft, odometerBaseKm: Math.max(0, val) })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 mt-4 sm:mt-5">
                    <div
                      onClick={startEditFuelCard}
                      className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition-colors ${surfaceSubtle} hover:border-[#FF6A1A]/50`}
                    >
                      <div className={`text-[11px] sm:text-xs font-semibold ${mutedText}`}>Consumo Total</div>
                      <div className="text-base sm:text-xl font-black mt-1 tabular-nums truncate">
                        {(totals.totalKm / (dbState.fuelConfig.kmPerLiter || 35)).toLocaleString('pt-BR', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{' '}
                        L
                      </div>
                    </div>
                    <div
                      onClick={startEditFuelCard}
                      className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition-colors ${surfaceSubtle} hover:border-[#FF6A1A]/50`}
                    >
                      <div className={`text-[11px] sm:text-xs font-semibold ${mutedText}`}>Gasto Estimado</div>
                      <div className="text-base sm:text-xl font-black mt-1 tabular-nums text-[#FF6A1A] truncate">
                        {fmtCurrencyExact(
                          (totals.totalKm / (dbState.fuelConfig.kmPerLiter || 35)) *
                            (dbState.fuelConfig.fuelPrice || 5.8)
                        )}
                      </div>
                    </div>
                    <div
                      onClick={startEditFuelCard}
                      className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition-colors ${surfaceSubtle} hover:border-[#FF6A1A]/50`}
                    >
                      <div className={`text-[11px] sm:text-xs font-semibold ${mutedText}`}>Custo / KM</div>
                      <div className="text-base sm:text-xl font-black mt-1 tabular-nums text-emerald-400 truncate">
                        R$ {bikeDiagnostics.costPerKm.toFixed(2)}/km
                      </div>
                    </div>
                    <div
                      onClick={startEditFuelCard}
                      className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition-colors ${surfaceSubtle} hover:border-[#FF6A1A]/50`}
                    >
                      <div className={`text-[11px] sm:text-xs font-semibold ${mutedText}`}>Média & Preço</div>
                      <div className="text-xs sm:text-base font-black mt-1 tabular-nums truncate">
                        {dbState.fuelConfig.kmPerLiter} km/L · R$ {dbState.fuelConfig.fuelPrice.toFixed(2)}
                      </div>
                    </div>
                    <div
                      onClick={startEditFuelCard}
                      className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition-colors ${surfaceSubtle} hover:border-[#FF6A1A]/50 col-span-2 sm:col-span-1`}
                    >
                      <div className={`text-[11px] sm:text-xs font-semibold ${mutedText}`}>Autonomia / Tanque</div>
                      <div className="text-base sm:text-xl font-black mt-1 tabular-nums text-sky-400 truncate">
                        ~{bikeDiagnostics.autonomyKm} km
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-5 flex flex-col gap-2">
                    {bikeDiagnostics.tips.map((tip, idx) => (
                      <div key={idx} className={`rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium leading-relaxed ${surfaceSubtle}`}>
                        {tip}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ================= ABA 3: FINANCEIRO (INTELIGÊNCIA FINANCEIRA COM IA, RESERVAS & DOCUMENTAÇÃO) ================= */}
        {activeTab === 'billing' && (
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* TOP HEADER + SUB-NAVIGATION (Sem Resumo e Sem Produtividade) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black">
                  Central de Finanças
                </h1>
                <p className={`text-xs mt-0.5 ${mutedText}`}>
                  Planejamento de reservas diárias, custos e lucro real que sobra no seu bolso
                </p>
              </div>
              <div className={`flex items-center gap-1 p-1 rounded-xl sm:rounded-2xl overflow-x-auto max-w-full no-scrollbar ${surfaceSubtle}`}>
                {[
                  { id: 'mensal', label: 'Ganhos do Mês & Saldo' },
                  { id: 'planejamento', label: 'Planejamento & IA' },
                  { id: 'ganhos', label: 'Ganhos por App' },
                  { id: 'gastos', label: 'Gastos por Categoria' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setBillingSubTab(tab.id as any)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      billingSubTab === tab.id ? 'bg-[#FF6A1A] text-black' : `${mutedText} hover:text-current`
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* LEMBRETE DO DAS-MEI (Vencimento todo dia 20 do mês) + BOTÕES RÁPIDOS */}
            {(() => {
              const today = new Date();
              const currentDay = today.getDate();
              const daysUntil20 = 20 - currentDay;
              const isNearOrOver = currentDay >= 12 && currentDay <= 25;
              const isPast20 = currentDay > 20;

              return (
                <div
                  className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md ${
                    isPast20
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : isNearOrOver
                      ? 'bg-purple-500/10 border-purple-500/40'
                      : surfaceSubtle
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isPast20
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                          : 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isPast20
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {isPast20
                            ? '⚠️ Venceu dia 20'
                            : daysUntil20 === 0
                            ? '🚨 Vence Hoje (Dia 20)!'
                            : `Lembrete DAS-MEI · Vence dia 20 (${daysUntil20} dias)`}
                        </span>
                        <span className={`text-[11px] font-semibold ${mutedText}`}>
                          Guia Mensal do MEI
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold mt-1">
                        {isPast20
                          ? 'O boleto DAS-MEI deste mês venceu dia 20. Se ainda não pagou, emita a guia atualizada no portal do Simples Nacional.'
                          : daysUntil20 <= 5
                          ? `Atenção: O boleto DAS-MEI vence ${daysUntil20 === 0 ? 'HOJE' : `em ${daysUntil20} dias`} (dia 20). Mantenha seu INSS e benefícios em dia!`
                          : 'Pague sua guia DAS-MEI mensalmente até o dia 20 para garantir direitos do INSS e CNPJ regular.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-stretch md:self-auto justify-end flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowRelatorioMeiModal(true)}
                      className="px-3.5 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Extrato MEI (PDF)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMetaReversaModal(true)}
                      className="px-3.5 py-2 rounded-xl text-xs font-black bg-[#FF6A1A] hover:bg-[#ff7b33] text-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Meta Reversa</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {billingSubTab === 'mensal' && (
              <div className="flex flex-col gap-4 sm:gap-6">
                {/* 1. BARRA DE CONTROLE: SELETOR DE MÊS, FILTRO DE MESES ANTERIORES & ATALHOS */}
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 ${surfaceCard} shadow-sm border`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-black flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-[#FF6A1A]" />
                          <span>Extrato Mensal & Filtro de Meses</span>
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            selectedMonthFinancials.isCurrentMonth
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
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
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 ${surfaceSubtle} hover:border-[#FF6A1A]`}
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
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 ${surfaceSubtle} hover:border-[#FF6A1A]`}
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
                          className="px-2.5 py-2 rounded-xl text-xs font-black bg-[#FF6A1A]/15 text-[#FF6A1A] hover:bg-[#FF6A1A]/25 border border-[#FF6A1A]/30 cursor-pointer transition-colors"
                        >
                          Ir p/ Mês Atual
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. OS 4 CARDS PRINCIPAIS: GANHOS TOTAIS, GASTOS, SALDO ATUAL E META PERSONALIZADA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Card 1: Ganhos Totais do Mês */}
                  <div className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between border ${surfaceCard}`}>
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${mutedText}`}>
                          1. Ganhos Totais
                        </span>
                        <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                          {selectedMonthFinancials.entries.length} corridas
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black tabular-nums text-[#FF6A1A] mt-1">
                        {fmtMoney(selectedMonthFinancials.totalRevenue)}
                      </div>
                    </div>
                    <div className={`mt-3 pt-2.5 border-t border-slate-800/40 text-[11px] font-semibold ${mutedText} flex items-center justify-between`}>
                      <span>Média/corrida:</span>
                      <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
                        {fmtMoney(selectedMonthFinancials.avgPerRide)}
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Gastos do Mês */}
                  <div className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between border ${surfaceCard}`}>
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${mutedText}`}>
                          2. Gastos do Mês
                        </span>
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                          {selectedMonthFinancials.expenses.length} lançamentos
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black tabular-nums text-rose-500 dark:text-rose-400 mt-1">
                        - {fmtMoney(selectedMonthFinancials.totalExpenses)}
                      </div>
                    </div>
                    <div className={`mt-3 pt-2.5 border-t border-slate-800/40 text-[11px] font-semibold ${mutedText} flex items-center justify-between`}>
                      <span>Custos operacionais:</span>
                      <span className="font-bold tabular-nums text-rose-400">
                        Gasolina + Manutenção
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Saldo Atual / Lucro Líquido Real */}
                  <div
                    className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between border ${
                      selectedMonthFinancials.currentBalance >= 0
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-rose-500/5 border-rose-500/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                          3. Saldo Atual (Lucro Real)
                        </span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            selectedMonthFinancials.currentBalance >= 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {selectedMonthFinancials.netMarginPct}% livre
                        </span>
                      </div>
                      <div
                        className={`text-xl sm:text-2xl font-black tabular-nums mt-1 ${
                          selectedMonthFinancials.currentBalance >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {fmtMoney(selectedMonthFinancials.currentBalance)}
                      </div>
                    </div>
                    <div className={`mt-3 pt-2.5 border-t border-slate-800/40 text-[11px] font-semibold ${mutedText} flex items-center justify-between`}>
                      <span>Dinheiro limpo:</span>
                      <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
                        Sobra no seu bolso
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Meta Personalizada Acompanhando o Saldo Atual do Usuário */}
                  {(() => {
                    const customTarget = Math.max(50, Number(dbState.customGoalTarget) || 3000);
                    const targetDate = dbState.customGoalTargetDate || getDefaultFutureDate(dbState.customGoalDays || 20);
                    const countdown = getCustomGoalCountdown('date', dbState.customGoalDays, targetDate);
                    const customDays = Math.max(1, countdown.effectiveDays);
                    const customTitle = (dbState.customGoalTitle || '').trim() || 'Meta Personalizada de Saldo';

                    // O campo de meta personalizada acompanha o saldo atual do usuário!
                    const currentBalance = selectedMonthFinancials.currentBalance;
                    const rawPct = customTarget > 0 ? Math.round((currentBalance / customTarget) * 100) : 0;
                    const barPct = Math.min(100, Math.max(0, rawPct));
                    const remainingToGoal = Math.max(0, customTarget - currentBalance);
                    const isGoalReached = currentBalance >= customTarget;
                    const requiredDailyToReachGoal = isGoalReached ? 0 : remainingToGoal / customDays;

                    return (
                      <div className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between border ${surfaceCard}`}>
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
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                isEditingCustomGoalInFinance
                                  ? 'bg-emerald-500 text-black font-black'
                                  : 'bg-[#FF6A1A]/15 text-[#FF6A1A] hover:bg-[#FF6A1A]/25'
                              }`}
                            >
                              {isEditingCustomGoalInFinance ? 'Fechar' : 'Ajustar'}
                            </button>
                          </div>

                          <div className="flex items-baseline justify-between gap-1 mt-1">
                            <div className={`text-base sm:text-lg font-black tabular-nums ${currentBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {fmtMoney(currentBalance)}
                            </div>
                            <div className={`text-xs font-bold tabular-nums ${mutedText}`}>
                              de {fmtMoney(customTarget)} ({rawPct}%)
                            </div>
                          </div>

                          {/* Barra de Progresso da Meta com Saldo Atual */}
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-2">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
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
                          <div className="mt-2.5 pt-2 border-t border-slate-800/40 flex flex-col gap-2">
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
                              className="w-full py-1.5 rounded-lg text-xs font-black bg-emerald-500 text-black cursor-pointer shadow-xs"
                            >
                              Salvar Meta
                            </button>
                          </div>
                        ) : (
                          <div className={`mt-2.5 pt-2 border-t border-slate-800/40 text-[10px] font-semibold ${mutedText} flex items-center justify-between`}>
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

                {/* 3. FAIXA OPERACIONAL RESUMIDA DO MÊS */}
                <div className={`rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-around gap-2 text-xs border ${surfaceSubtle}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={mutedText}>Dias Trabalhados:</span>
                    <strong className="text-slate-900 dark:text-white font-black">{selectedMonthFinancials.activeDays} dias</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={mutedText}>Total Rodado:</span>
                    <strong className="text-slate-900 dark:text-white font-black">{selectedMonthFinancials.totalKm.toLocaleString('pt-BR')} km</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={mutedText}>Horas em Rota:</span>
                    <strong className="text-slate-900 dark:text-white font-black">{selectedMonthFinancials.totalHours.toFixed(1)}h</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={mutedText}>Rendimento/KM:</span>
                    <strong className="text-[#FF6A1A] font-black">{fmtMoney(selectedMonthFinancials.avgPerKm)}/km</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={mutedText}>Rendimento/Hora:</span>
                    <strong className="text-emerald-400 font-black">{fmtMoney(selectedMonthFinancials.avgPerHour)}/h</strong>
                  </div>
                </div>

                {/* 4. CAMPO PRINCIPAL: TODOS OS GANHOS DO MÊS (LISTA COM FILTROS) */}
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard} border shadow-sm`}>
                  {/* Cabeçalho da Lista */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/40">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                          <span>Todos os Ganhos de {selectedMonthFinancials.formattedLabel}</span>
                        </h2>
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#FF6A1A]/15 text-[#FF6A1A] border border-[#FF6A1A]/30 tabular-nums">
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
                        onClick={openNewEntryModal}
                        className="px-3.5 py-2 rounded-xl text-xs font-black bg-[#FF6A1A] hover:bg-[#ff7b33] text-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Novo Ganho</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowRelatorioMeiModal(true)}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-purple-400" />
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                          financeAppFilter === 'all'
                            ? 'bg-[#FF6A1A] text-black'
                            : `${surfaceSubtle} ${mutedText} hover:text-current`
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
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                              financeAppFilter === app.id
                                ? 'bg-[#FF6A1A] text-black'
                                : `${surfaceSubtle} ${mutedText} hover:text-current`
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
                      // date_desc
                      return (b.date || '').localeCompare(a.date || '') || Number(b.id) - Number(a.id);
                    });

                    if (sorted.length === 0) {
                      return (
                        <div className={`p-8 rounded-2xl border border-dashed border-slate-700/60 text-center flex flex-col items-center justify-center gap-3 my-2 ${surfaceSubtle}`}>
                          <div className="w-12 h-12 rounded-2xl bg-[#FF6A1A]/10 text-[#FF6A1A] flex items-center justify-center">
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
                            onClick={openNewEntryModal}
                            className="px-4 py-2 rounded-xl text-xs font-black bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
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

                          return (
                            <div
                              key={entry.id}
                              className={`rounded-2xl p-3 sm:p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${surfaceSubtle} hover:border-[#FF6A1A]/40`}
                            >
                              {/* Lado Esquerdo: App, Data, Turno */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-black/10 dark:bg-white/10 flex items-center justify-center text-xl shrink-0">
                                  {appInfo.icon}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs sm:text-sm font-black truncate">
                                      {appInfo.name}
                                    </span>
                                    {shiftInfo && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400">
                                        {shiftInfo.name.split(' ')[0]}
                                      </span>
                                    )}
                                  </div>
                                  <div className={`text-[11px] font-semibold mt-0.5 ${mutedText} flex items-center gap-2 flex-wrap`}>
                                    <span>📅 {formatPtBrDate(entry.date)}</span>
                                    {km > 0 && <span>· {km} km</span>}
                                    {hours > 0 && <span>· {hours}h</span>}
                                    {ratePerKm > 0 && <span>· {fmtMoney(ratePerKm)}/km</span>}
                                  </div>
                                </div>
                              </div>

                              {/* Lado Direito: Valor e Ações */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/40">
                                <div className="text-right">
                                  <div className="text-base sm:text-lg font-black text-emerald-400 tabular-nums">
                                    + {fmtMoney(rev)}
                                  </div>
                                  <span className={`text-[10px] block ${mutedText}`}>Faturamento bruto</span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditHistoryItem(entry, 'ganho')}
                                    className={`p-2 rounded-xl text-slate-400 hover:text-white cursor-pointer transition-colors ${surfaceCard}`}
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
                                    className={`p-2 rounded-xl text-rose-400 hover:text-rose-300 cursor-pointer transition-colors ${surfaceCard}`}
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
                    <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-900/40' : 'bg-slate-50'}`}>
                      <div className={`text-[10px] font-bold ${mutedText}`}>⛽ Custo Combustível/KM</div>
                      <div className="text-sm sm:text-base font-black text-rose-400 tabular-nums mt-0.5">
                        R$ {financialIntelligence.fuelCostPerKm.toFixed(2)}/km
                      </div>
                      <div className={`text-[10px] mt-0.5 ${mutedText}`}>
                        {financialIntelligence.kmPerLiter} km/L · Gasolina R$ {financialIntelligence.fuelPrice.toFixed(2)}
                      </div>
                    </div>

                    <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-900/40' : 'bg-slate-50'}`}>
                      <div className={`text-[10px] font-bold ${mutedText}`}>🛠️ Desgaste Mecânico/KM</div>
                      <div className="text-sm sm:text-base font-black text-amber-400 tabular-nums mt-0.5">
                        R$ {financialIntelligence.baseMaintCostPerKm.toFixed(2)}/km
                      </div>
                      <div className={`text-[10px] mt-0.5 ${mutedText}`}>
                        Óleo, pneus, relação e pastilhas
                      </div>
                    </div>

                    <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-900/40' : 'bg-slate-50'}`}>
                      <div className={`text-[10px] font-bold ${mutedText}`}>⚙️ Custo Operacional Total/KM</div>
                      <div className="text-sm sm:text-base font-black text-sky-400 tabular-nums mt-0.5">
                        R$ {(financialIntelligence.fuelCostPerKm + financialIntelligence.baseMaintCostPerKm).toFixed(2)}/km
                      </div>
                      <div className={`text-[10px] mt-0.5 ${mutedText}`}>
                        Gasolina + Desgaste por km rodado
                      </div>
                    </div>

                    <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-900/40' : 'bg-slate-50'}`}>
                      <div className={`text-[10px] font-bold ${mutedText}`}>⚖️ Ponto de Equilíbrio (Break-Even)</div>
                      <div className="text-sm sm:text-base font-black text-purple-400 tabular-nums mt-0.5">
                        {fmtCurrencyExact(financialIntelligence.dailyFuelCost + financialIntelligence.dailyMaintReserve + financialIntelligence.dailyFoodCost + financialIntelligence.dailyDocsReserve + financialIntelligence.dailyEmergencyReserve)}/dia
                      </div>
                      <div className={`text-[10px] mt-0.5 ${mutedText}`}>
                        Mínimo a faturar p/ cobrir custos do dia
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
                      <div className={`mt-3 p-4 rounded-2xl border text-xs leading-relaxed ${
                        isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}>
                        <div className="font-black text-[#FF6A1A] mb-1.5 text-sm">
                          📐 A Matemática Real do Bolso do Motoboy
                        </div>
                        <p className="mb-2">
                          Muitos entregadores acham que faturar <strong>R$ 200/dia</strong> significa ter <strong>R$ 200 no bolso</strong>. Mas na realidade, o dinheiro precisa ser blindado antes que uma quebra ou imposto surpreenda você.
                        </p>
                        <div className="p-3 rounded-xl bg-black/30 border border-slate-800/80 font-mono text-[11px] mb-2 space-y-1">
                          <div className="text-[#FF6A1A] font-black">
                            Faturamento Bruto ({fmtCurrencyExact(financialIntelligence.dailyGross)})
                          </div>
                          <div className="text-rose-400">
                            - Combustível do Dia: {fmtCurrencyExact(financialIntelligence.dailyFuelCost)} ({financialIntelligence.fuelPctOfGross}%)
                          </div>
                          <div className="text-amber-400">
                            - Reserva Manutenção da Moto: {fmtCurrencyExact(financialIntelligence.dailyMaintReserve)} ({financialIntelligence.maintPctOfGross}%)
                          </div>
                          <div className="text-orange-400">
                            - Alimentação na Rua: {fmtCurrencyExact(financialIntelligence.dailyFoodCost)} ({financialIntelligence.foodPctOfGross}%)
                          </div>
                          <div className="text-sky-400">
                            - Provisão Documentos & IPVA: {fmtCurrencyExact(financialIntelligence.dailyDocsReserve)} ({financialIntelligence.docsPctOfGross}%)
                          </div>
                          <div className="text-purple-400">
                            - Reserva de Emergência: {fmtCurrencyExact(financialIntelligence.dailyEmergencyReserve)} ({financialIntelligence.emergencyPct}%)
                          </div>
                          <div className="pt-1.5 border-t border-slate-700 text-emerald-400 font-black text-xs">
                            = Lucro Líquido Real Limpo: {fmtCurrencyExact(financialIntelligence.dailyNetProfit)} ({financialIntelligence.netMarginPct}% livre)
                          </div>
                        </div>
                        <p className="text-[11px]">
                          💡 Este valor líquido de <strong>{fmtCurrencyExact(financialIntelligence.dailyNetProfit)}/dia</strong> é o que realmente é seu para pagar as despesas de casa, mercado e lazer sem se endividar!
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
                      desc: 'O dinheiro 100% LIMPO que sobra no seu bolso para levar para casa, pagar despesas da família e realizar seus sonhos.',
                      formulaInfo: `Bruto (${fmtCurrencyExact(financialIntelligence.dailyGross)}) - Total de Custos e Reservas (${fmtCurrencyExact(financialIntelligence.dailyFuelCost + financialIntelligence.dailyMaintReserve + financialIntelligence.dailyFoodCost + financialIntelligence.dailyDocsReserve + financialIntelligence.dailyEmergencyReserve)})`,
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
                                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
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
                              <span className={`text-base sm:text-lg font-black tabular-nums mt-0.5 ${activeItem.colorClass}`}>
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
                          <div className={`rounded-2xl p-4 sm:p-5 border-2 transition-all ${
                            isDark ? 'bg-slate-900/60' : 'bg-slate-50'
                          }`} style={{ borderColor: `${activeItem.color}80` }}>
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
                                <span className="text-sm sm:text-base font-black tabular-nums text-slate-300">
                                  {fmtMoney(activeItem.monthly * 12)}
                                </span>
                              </div>
                            </div>

                            {/* Base de Cálculo desta Categoria */}
                            <div className={`p-2.5 rounded-xl text-xs mb-2.5 flex items-center justify-between gap-2 ${
                              isDark ? 'bg-slate-800/40 text-slate-300' : 'bg-white text-slate-700'
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
                        <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden flex p-0.5 gap-0.5">
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
                                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                                }`}
                              >
                                <div className="font-bold flex items-center justify-between border-b pb-1.5 mb-2 border-slate-200 dark:border-slate-800">
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
                      <div className="flex items-center gap-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800/80">
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
                                ? 'bg-[#FF6A1A] text-black font-black shadow-xs'
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
                    <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-xs">
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
                                    ? 'bg-[#12141C] border-slate-700 text-slate-100'
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
                                <div className="flex items-center justify-between gap-4 mt-1 pt-1 border-t border-slate-700/40">
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
                    <div className={`rounded-2xl p-4 sm:p-5 border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
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
                    <div className={`rounded-2xl p-4 sm:p-5 border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
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
                  isDark ? 'bg-[#12141C] border-[#FF6A1A]/40' : 'bg-white border-orange-300 shadow-sm'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/50">
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
                          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                            <div className="h-full bg-[#FF6A1A] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {billingSubTab === 'gastos' && (
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                <div className="flex items-center justify-between mb-4 sm:mb-5">
                  <h2 className="text-sm sm:text-base font-extrabold">Despesas Lançadas por Categoria</h2>
                  <span className="text-base sm:text-lg font-black text-rose-400 tabular-nums">
                    {fmtMoney(totals.totalExpense)}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5 sm:gap-3">
                  {allCategories
                    .map(c => ({ ...c, val: totals.expenseByCat[c.id] || 0 }))
                    .sort((a, b) => b.val - a.val)
                    .map(cat => {
                      const pct = totals.totalExpense > 0 ? Math.round((cat.val / totals.totalExpense) * 100) : 0;
                      return (
                        <div key={cat.id} className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 ${surfaceSubtle}`}>
                          <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5 sm:mb-2">
                            <span className="truncate">{cat.name}</span>
                            <span className="tabular-nums whitespace-nowrap">
                              {fmtMoney(cat.val)} <span className={`text-[11px] ${mutedText}`}>· {pct}%</span>
                            </span>
                          </div>
                          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= ABA 4: HISTÓRICO ================= */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h1 className="text-xl sm:text-2xl font-black">Histórico de Corridas & Despesas</h1>
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
                      historyTypeFilter === t.id ? 'bg-[#FF6A1A] text-black' : mutedText
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
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
                    onClick={openNewEntryModal}
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
                      return (
                        <div
                          key={`ganho-${item.id}`}
                          className="py-3 sm:py-4 flex items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            <span className="text-lg sm:text-xl shrink-0">{app.icon}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs sm:text-sm font-bold truncate">
                                {app.name} · {d}/{m}
                              </div>
                              <div className={`text-[11px] sm:text-xs tabular-nums truncate ${mutedText}`}>
                                {shift ? shift.name.split(' ')[0] : 'Turno'} · {item.km} km · {item.hours || 0}h
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <span className="text-xs sm:text-base font-black text-emerald-400 tabular-nums whitespace-nowrap">
                              + {fmtMoney(item.revenue)}
                            </span>
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
                      const cat = allCategories.find(c => c.id === item.category) || { name: item.category };
                      return (
                        <div
                          key={`gasto-${item.id}`}
                          className="py-3 sm:py-4 flex items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            <span className="text-lg sm:text-xl shrink-0">⛽</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs sm:text-sm font-bold truncate">
                                {cat.name} · {d}/{m}
                              </div>
                              <div className={`text-[11px] sm:text-xs ${mutedText} truncate`}>Despesa Operacional</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <span className="text-xs sm:text-base font-black text-rose-400 tabular-nums whitespace-nowrap">
                              - {fmtMoney(item.amount)}
                            </span>
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
                  <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#FF6A1A] to-amber-400 transition-all duration-500"
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
                    <div className="text-xl sm:text-2xl font-black tabular-nums text-emerald-400">
                      {fmtCurrencyExact(progressAnalytics.revToday)}
                    </div>
                    <div className={`text-xs font-bold tabular-nums ${mutedText}`}>
                      de {fmtMoney(progressAnalytics.dailyGoal)}
                    </div>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden mt-2.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
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
                    <div className="text-xl sm:text-2xl font-black tabular-nums text-sky-400">
                      {fmtCurrencyExact(progressAnalytics.revWeek)}
                    </div>
                    <div className={`text-xs font-bold tabular-nums ${mutedText}`}>
                      de {fmtMoney(progressAnalytics.weeklyGoal)}
                    </div>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden mt-2.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
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
                      <div className="text-xl sm:text-2xl font-black tabular-nums text-[#FF6A1A]">
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

                  <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden mt-2.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
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

                        <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden my-2">
                          <div
                            className="h-full rounded-full bg-[#FF6A1A]"
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

                        <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden my-2">
                          <div
                            className="h-full rounded-full bg-sky-400"
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
                                ? 'bg-[#12141C] border-slate-700 text-slate-100'
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
                        ? 'border-slate-800/70 bg-[#181B26]/60'
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

                      <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden my-2">
                        <div
                          className={`h-full rounded-full ${
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
                            ach.unlocked ? 'bg-[#FF6A1A]/20' : 'bg-slate-800/60 grayscale'
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
                            : 'bg-slate-800 text-slate-400'
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
                      <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
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
          <div className="flex flex-col gap-4 sm:gap-6 max-w-4xl">
            <h1 className="text-xl sm:text-2xl font-black">Configurações & Sincronização</h1>

            {/* CONTA DO PILOTO CARD (Acesso à Tela de Login / Cadastro / Logout) */}
            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${surfaceCard}`}>
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#FF6A1A]/15 border border-[#FF6A1A]/40 text-[#FF6A1A] flex items-center justify-center font-black text-base shrink-0">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-black truncate">{currentUser.name}</div>
                  <div className={`text-xs truncate ${mutedText}`}>
                    {`${currentUser.email}${currentUser.phone ? ` · ${currentUser.phone}` : ''}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setAuthEmail(currentUser.email);
                    setAuthPassword('');
                    setAuthConfirmPassword('');
                    setAuthError(null);
                    setAuthSuccess(null);
                    setAuthMode('recover');
                    setShowAuthScreen(true);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 min-h-[40px] ${surfaceSubtle} hover:border-[#FF6A1A]`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#FF6A1A]" />
                  <span>Redefinir Senha</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setShowAuthScreen(true);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer min-h-[40px] ${surfaceSubtle} hover:border-[#FF6A1A]`}
                >
                  Trocar Conta
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 cursor-pointer flex items-center gap-1.5 min-h-[40px]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </div>
            </div>

            {/* CENTRAL DE SINCRONIZAÇÃO COM A NUVEM (ENVIAR PARA NUVEM & BAIXAR DA NUVEM) */}
            <div
              className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-4 ${surfaceCard}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Database className="w-4 h-4 text-[#FF6A1A]" />
                    <span className="text-sm sm:text-base font-black">
                      Sincronização em Nuvem · Mochilinha Cloud
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Multi-Dispositivo
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${mutedText}`}>
                    Use <strong>Enviar para a Nuvem</strong> no aparelho onde você cadastrou suas corridas, gastos e KM, e depois clique em <strong>Baixar da Nuvem</strong> ao acessar por outro celular ou navegador.
                  </p>
                </div>

                <div className={`text-[11px] font-semibold shrink-0 px-3 py-2 rounded-xl ${surfaceSubtle}`}>
                  <div className="font-bold text-[#FF6A1A]">
                    {dbState.entries.length} corridas · {dbState.expenses.length} gastos ·{' '}
                    {totals.totalKm.toLocaleString('pt-BR')} km
                  </div>
                  <div className={mutedText}>
                    {workManagerStatus} ({lastSyncTime})
                  </div>
                </div>
              </div>

              {/* DOIS BOTÕES DEDICADOS: ENVIAR PARA A NUVEM vs BAIXAR DA NUVEM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleUploadToCloud(true)}
                  disabled={isSyncing}
                  className="w-full justify-center px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer min-h-[48px] bg-[#FF6A1A] text-black hover:bg-[#ff7b33] shadow-sm"
                >
                  <Upload className={`w-4 h-4 stroke-[2.5] ${isSyncing && syncActionType === 'upload' ? 'animate-bounce' : ''}`} />
                  <span>
                    {isSyncing && syncActionType === 'upload'
                      ? 'Enviando para a Nuvem...'
                      : 'Enviar Dados para a Nuvem'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadFromCloud(true)}
                  disabled={isSyncing}
                  className={`w-full justify-center px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer min-h-[48px] border ${
                    isDark
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <Download className={`w-4 h-4 stroke-[2.5] ${isSyncing && syncActionType === 'download' ? 'animate-bounce' : ''}`} />
                  <span>
                    {isSyncing && syncActionType === 'download'
                      ? 'Baixando da Nuvem...'
                      : 'Baixar / Sincronizar da Nuvem'}
                  </span>
                </button>
              </div>

              {syncFeedbackBanner && (
                <div
                  className={`rounded-xl px-3.5 py-2.5 text-xs font-bold flex items-center justify-between gap-2 ${
                    syncFeedbackBanner.startsWith('✅')
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                  }`}
                >
                  <span>{syncFeedbackBanner}</span>
                  <button
                    type="button"
                    onClick={() => setSyncFeedbackBanner(null)}
                    className="p-1 rounded-lg hover:bg-black/20 cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Código de Transferência Direta / Backup Rápido entre Aparelhos */}
              <div className="pt-2 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setShowBackupCodePanel(prev => !prev)}
                  className={`text-xs font-bold flex items-center gap-1.5 cursor-pointer ${mutedText} hover:text-[#FF6A1A]`}
                >
                  <Copy className="w-3.5 h-3.5 text-[#FF6A1A]" />
                  <span>
                    {showBackupCodePanel
                      ? 'Ocultar transferência por código de backup'
                      : 'Precisa transferir dados de uma versão antiga? Usar Código de Backup Direto'}
                  </span>
                </button>

                {showBackupCodePanel && (
                  <div className={`mt-3 p-3.5 rounded-2xl border ${surfaceSubtle} flex flex-col gap-3`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-black">
                          1. Copiar todos os dados deste aparelho
                        </div>
                        <div className={`text-[11px] ${mutedText}`}>
                          Gera um código com todas as corridas, gastos, KM da moto e manutenções.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const code = exportCloudBackupCode(dbState);
                          navigator.clipboard?.writeText(code);
                          setSyncFeedbackBanner(
                            '✅ Código de backup copiado! Cole no campo abaixo no outro aparelho ou navegador.'
                          );
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-black bg-[#FF6A1A] text-black cursor-pointer shrink-0 flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Código dos Meus Dados</span>
                      </button>
                    </div>

                    <div className="pt-2.5 border-t border-slate-800/40 flex flex-col gap-2">
                      <div className="text-xs font-black">
                        2. Colar código de outro aparelho para restaurar e sincronizar
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={backupInputCode}
                          onChange={e => setBackupInputCode(e.target.value)}
                          placeholder="Cole aqui o código MOCHILINHA_BACKUP:..."
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold outline-none ${inputSurface}`}
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!backupInputCode.trim()) return;
                            const res = importCloudBackupCode(backupInputCode, dbState);
                            if (!res.ok || !res.mergedState) {
                              setSyncFeedbackBanner(`⚠️ ${res.error}`);
                              return;
                            }
                            setBackupInputCode('');
                            await persistAndEnqueueWorkManager(res.mergedState);
                            await uploadLocalDataToCloud(res.mergedState, currentUser?.email);
                            setSyncFeedbackBanner(
                              `✅ Dados importados e sincronizados na nuvem com sucesso! (${res.mergedState.entries.length} corridas e ${res.mergedState.expenses.length} gastos)`
                            );
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-500 text-black cursor-pointer shrink-0"
                        >
                          Restaurar Dados Agora
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 ${surfaceCard}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 border-b border-slate-800/40">
                <div>
                  <div className="text-sm font-bold">Meta Diária de Faturamento (R$)</div>
                  <div className={`text-xs ${mutedText}`}>Usada no cálculo de progresso diário e Mochilinha</div>
                </div>
                <FreeNumberInput
                  value={dbState.dailyGoal}
                  onValueChange={val =>
                    persistAndEnqueueWorkManager({
                      ...dbState,
                      dailyGoal: Math.max(0, val),
                    })
                  }
                  className={`w-full sm:w-28 px-3 py-2 rounded-xl text-left sm:text-right font-black tabular-nums outline-none ${inputSurface}`}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 border-b border-slate-800/40">
                <div>
                  <div className="text-sm font-bold">Meta de Faturamento Semanal (R$)</div>
                  <div className={`text-xs ${mutedText}`}>Exibida na barra de progresso semanal no Painel de Início</div>
                </div>
                <FreeNumberInput
                  step="50"
                  value={dbState.weeklyGoal ?? 900}
                  onValueChange={val =>
                    persistAndEnqueueWorkManager({
                      ...dbState,
                      weeklyGoal: Math.max(0, val),
                    })
                  }
                  className={`w-full sm:w-28 px-3 py-2 rounded-xl text-left sm:text-right font-black tabular-nums outline-none ${inputSurface}`}
                />
              </div>

              <div className="flex flex-col gap-3 py-3 border-b border-slate-800/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <div className="text-sm font-bold flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#FF6A1A]" />
                      <span>Meta Personalizada de Ganhos</span>
                    </div>
                    <div className={`text-xs ${mutedText}`}>
                      Defina sua meta de faturamento e a data término para contagem regressiva e meta diária
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  <div className={`rounded-xl p-3 ${surfaceSubtle}`}>
                    <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                      Valor da Meta de Ganhos (R$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#FF6A1A]">R$</span>
                      <FreeNumberInput
                        step="50"
                        value={dbState.customGoalTarget ?? 3000}
                        onValueChange={val =>
                          persistAndEnqueueWorkManager({
                            ...dbState,
                            customGoalTarget: Math.max(0, val),
                            customGoalMode: 'date',
                          })
                        }
                        className={`w-full px-3 py-2 rounded-xl text-left font-black tabular-nums outline-none ${inputSurface}`}
                      />
                    </div>
                  </div>

                  <div className={`rounded-xl p-3 ${surfaceSubtle}`}>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-[11px] font-bold ${mutedText}`}>
                        Data Término da Meta (Data Personalizada)
                      </label>
                      <span className="text-[10px] font-black text-[#FF6A1A] bg-[#FF6A1A]/10 px-1.5 py-0.5 rounded-md border border-[#FF6A1A]/20">
                        ⏳ {getCustomGoalCountdown('date', dbState.customGoalDays, dbState.customGoalTargetDate).countdownBadgeText}
                      </span>
                    </div>
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
                      className={`w-full px-3 py-2 rounded-xl text-left font-black tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>
                </div>
              </div>

              {/* LOCAL PUSH NOTIFICATIONS COMPONENT FOR MAINTENANCE ALERTS */}
              <div className="py-3 border-b border-slate-800/40 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${
                        isMaintNotificationsEnabled
                          ? 'bg-[#FF6A1A]/15 border-[#FF6A1A]/40 text-[#FF6A1A]'
                          : isDark
                          ? 'bg-slate-800/70 border-slate-700 text-slate-400'
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}
                    >
                      {isMaintNotificationsEnabled ? (
                        <BellRing className="w-5 h-5" />
                      ) : (
                        <BellOff className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold">
                          Notificações Locais de Manutenção (Push Local)
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            isMaintNotificationsEnabled
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : isDark
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}
                        >
                          {isMaintNotificationsEnabled ? 'Habilitado' : 'Desabilitado'}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${mutedText}`}>
                        Dispara um alerta push local sempre que uma manutenção atingir o ponto de alerta configurado (ex: 85% de uso) ou vencer o limite de troca.
                      </p>
                    </div>
                  </div>

                  {/* Interactive Toggle Switch */}
                  <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isMaintNotificationsEnabled}
                      onClick={() => handleToggleMaintenanceNotifications(!isMaintNotificationsEnabled)}
                      className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isMaintNotificationsEnabled
                          ? 'bg-[#FF6A1A]'
                          : isDark
                          ? 'bg-slate-700'
                          : 'bg-slate-300'
                      }`}
                      title={
                        isMaintNotificationsEnabled
                          ? 'Desabilitar notificações locais de manutenção'
                          : 'Habilitar notificações locais de manutenção'
                      }
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isMaintNotificationsEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-xs font-extrabold min-w-[70px]">
                      {isMaintNotificationsEnabled ? 'Ativado' : 'Desativado'}
                    </span>
                  </div>
                </div>

                {/* Details & Test Push Action Bar */}
                <div
                  className={`rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${surfaceSubtle}`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-bold flex items-center gap-1.5">
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
                      Status de Monitoramento:
                    </span>
                    <span className={mutedText}>
                      {!isMaintNotificationsEnabled
                        ? 'Alertas silenciados pelo usuário'
                        : `${maintAlertStats.overdueCount} vencida(s) · ${maintAlertStats.alertCount} no ponto de alerta`}
                    </span>
                    {browserNotifPermission === 'granted' && isMaintNotificationsEnabled && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        Push Nativo + In-App Ativo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* PERMISSÃO DE VOZ E MICROFONE NO DISPOSITIVO */}
              <div className="py-3.5 border-b border-slate-800/40 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        micPermissionStatus === 'granted'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : micPermissionStatus === 'denied'
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                          : 'bg-[#FF6A1A]/15 border-[#FF6A1A]/40 text-[#FF6A1A]'
                      }`}
                    >
                      {micPermissionStatus === 'denied' ? (
                        <MicOff className="w-5 h-5" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold">
                          Permissão de Voz e Microfone no Dispositivo
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            micPermissionStatus === 'granted'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : micPermissionStatus === 'denied'
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {micPermissionStatus === 'granted'
                            ? 'Permitido no Aparelho'
                            : micPermissionStatus === 'denied'
                            ? 'Bloqueado'
                            : 'Solicitar Permissão'}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${mutedText}`}>
                        Necessário para ditar corridas e gastos por voz sem precisar digitar enquanto pilota.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
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
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 ${
                        micPermissionStatus === 'granted'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-[#FF6A1A] text-black hover:bg-[#ff7b33]'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>
                        {micPermissionStatus === 'granted'
                          ? 'Testar Comando de Voz'
                          : 'Permitir Microfone no Aparelho'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* PERMISSÃO DE LOCALIZAÇÃO GPS (ODÔMETRO AUTOMÁTICO EM 2º PLANO) */}
              <div className="py-3.5 border-b border-slate-800/40 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        gpsPermissionStatus === 'granted'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : gpsPermissionStatus === 'denied'
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                          : 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                      }`}
                    >
                      <Navigation className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold">
                          Permissão de Localização GPS (Tempo Real & 2º Plano)
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            gpsPermissionStatus === 'granted'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : gpsPermissionStatus === 'denied'
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {gpsPermissionStatus === 'granted'
                            ? 'Ativo no Aparelho'
                            : gpsPermissionStatus === 'denied'
                            ? 'Bloqueado'
                            : 'Solicitar Permissão'}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${mutedText}`}>
                        Permite que o odômetro conte a distância percorrida automaticamente no Modo Turno, inclusive em segundo plano enquanto você usa iFood, Uber ou 99.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setGpsPermissionError(null);
                        setShowGpsPermissionModal(true);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 ${
                        gpsPermissionStatus === 'granted'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-[#FF6A1A] text-black hover:bg-[#ff7b33]'
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>
                        {gpsPermissionStatus === 'granted'
                          ? 'Configurar / Testar GPS'
                          : 'Permitir GPS (O Tempo Todo)'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-800/40">
                <span className="text-sm font-bold">Tema da interface</span>
                <button
                  onClick={() => setIsDark(prev => !prev)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-2 ${surfaceSubtle}`}
                >
                  {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
                  <span>{isDark ? 'Modo Escuro' : 'Modo Claro'}</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2">
                <div>
                  <div className="text-sm font-bold text-rose-400">Resetar Banco de Dados Local</div>
                  <div className={`text-xs ${mutedText}`}>Restaura os dados de fábrica no Room Database</div>
                </div>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 cursor-pointer self-start sm:self-auto"
                >
                  Apagar Dados
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FLOATING ACTION BUTTONS: DITAR POR VOZ + NOVO REGISTRO (Acima da barra de navegação, lado direito) */}
      <div className="fixed bottom-20 right-4 sm:right-6 z-40 flex items-center gap-2">
        {/* Voice Dictation Button */}
        <button
          type="button"
          onClick={handleTriggerVoiceDictation}
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

        {/* Novo Registro Button */}
        <button
          type="button"
          onClick={openNewEntryModal}
          aria-label="Novo Registro"
          className="h-11 sm:h-12 px-4 sm:px-5 text-xs sm:text-sm font-black text-black bg-[#FF6A1A] hover:bg-[#ff7b33] active:scale-95 rounded-2xl shadow-lg shadow-[#FF6A1A]/30 border border-orange-300/40 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.8]" />
          <span>Novo Registro</span>
        </button>
      </div>

      {/* VOICE SPEECH FEEDBACK POPUP */}
      {voiceSpeechFeedback && (
        <div className="fixed bottom-36 right-4 left-4 sm:left-auto sm:w-96 z-50 p-3.5 rounded-2xl bg-[#FF6A1A] text-black font-black text-xs shadow-2xl flex items-center justify-between gap-2 border border-orange-200">
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
          isDark ? 'bg-[#090A0F]/95 border-slate-800' : 'bg-white/95 border-slate-200'
        }`}
      >
        <div className="max-w-3xl mx-auto grid grid-cols-6 items-center h-16 px-1 sm:px-2">
          {[
            { id: 'dashboard', label: 'Painel', icon: Home },
            { id: 'maintenance', label: 'Moto', icon: Wrench },
            { id: 'billing', label: 'Finanças', icon: BarChart3 },
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 pb-6 sm:pb-6 max-h-[90vh] overflow-y-auto ${surfaceCard}`}>
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <h3 className="text-base sm:text-lg font-black">
                {editingEntryId !== null
                  ? entryMode === 'ganho'
                    ? 'Editar Corrida'
                    : 'Editar Gasto'
                  : entryMode === 'ganho'
                  ? 'Registrar Corrida'
                  : 'Registrar Gasto'}
              </h3>
              <button
                onClick={() => setShowEntryModal(false)}
                className={`p-2 rounded-xl ${surfaceSubtle} cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-Modal Voice Dictation Banner */}
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
                                : `${isDark ? 'bg-slate-800/80' : 'bg-white'} hover:border-[#FF6A1A]`
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
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>KM Rodados</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 65"
                      value={entryKm}
                      onChange={e => setEntryKm(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Faturamento (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 140"
                      value={entryRev}
                      onChange={e => setEntryRev(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                    />
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
                <div>
                  <label className={`block text-xs font-bold mb-2 ${mutedText}`}>Categoria da Despesa</label>
                  <div className="flex flex-wrap gap-2">
                    {allCategories.map(c => (
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
                        placeholder="Nome da Categoria"
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
                        <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                          Preço Pago Total (R$) <span className="text-amber-400">*</span>
                        </label>
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
                          className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-bold mb-1 ${mutedText}`}>
                          Litros Abastecidos (L) <span className="text-[#FF6A1A]">*</span>
                        </label>
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
                          className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Preço por Litro (R$/L)</label>
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
                          className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                        />
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
                      <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Valor (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 35.00"
                        value={expenseAmount}
                        onChange={e => setExpenseAmount(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                      />
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

      {/* FLOATING LOCAL PUSH NOTIFICATION BANNER (MOTO MAINTENANCE ALERTS) */}
      {isMaintNotificationsEnabled && localPushToasts.length > 0 && (
        <div className="fixed top-3 right-3 left-3 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none">
          {localPushToasts.map(toast => {
            const isOverdue = toast.severity === 'overdue';
            return (
              <div
                key={toast.id}
                className={`pointer-events-auto rounded-2xl p-3.5 shadow-2xl border backdrop-blur-md transition-all flex flex-col gap-2.5 ${
                  isDark
                    ? isOverdue
                      ? 'bg-[#181115]/95 border-rose-500/50 text-slate-100'
                      : 'bg-[#171510]/95 border-amber-500/50 text-slate-100'
                    : isOverdue
                    ? 'bg-white/95 border-rose-400 text-slate-900'
                    : 'bg-white/95 border-amber-400 text-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                        isOverdue
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                          : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                      }`}
                    >
                      {toast.itemIcon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                            isOverdue
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {isOverdue ? '🚨 Manutenção Vencida' : `⚠️ Ponto de Alerta (${toast.thresholdPct}%)`}
                        </span>
                        <span className={`text-[10px] font-semibold ${mutedText}`}>
                          · Push Local · {toast.timestamp}
                        </span>
                      </div>
                      <h5 className="text-xs sm:text-sm font-black truncate mt-0.5">
                        {toast.itemName} ({toast.wearPct}% de desgaste)
                      </h5>
                      <p className={`text-[11px] leading-snug mt-0.5 ${mutedText}`}>
                        {isOverdue
                          ? 'Limite de quilometragem ultrapassado! Realize a manutenção para evitar danos.'
                          : `Atingiu o ponto de alerta configurado (${toast.thresholdPct}%). Restam ${toast.kmRemaining.toLocaleString('pt-BR')} km.`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setLocalPushToasts(prev => prev.filter(t => t.id !== toast.id))
                    }
                    className={`p-1.5 rounded-xl shrink-0 cursor-pointer ${surfaceSubtle}`}
                    title="Dispensar notificação"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-700/30">
                  <button
                    type="button"
                    onClick={() =>
                      setLocalPushToasts(prev => prev.filter(t => t.id !== toast.id))
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${mutedText}`}
                  >
                    Agora não
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('maintenance');
                      setMaintSearchQuery(toast.itemName);
                      setLocalPushToasts(prev => prev.filter(t => t.id !== toast.id));
                    }}
                    className="px-3 py-1 rounded-lg text-[11px] font-black bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors cursor-pointer"
                  >
                    Ver Componente
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. RADAR DE CORRIDA MODAL ("ACEITO OU RECUSO?") */}
      <RadarCorridaModal
        isOpen={showRadarModal}
        onClose={() => setShowRadarModal(false)}
        fuelConfig={dbState.fuelConfig}
        maintenanceItems={dbState.maintenanceItems}
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
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FF6A1A]/15 border border-[#FF6A1A]/40 flex items-center justify-center text-[#FF6A1A] shrink-0">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6A1A]">
                    Permissão do Dispositivo
                  </span>
                  <h3 className="text-base sm:text-lg font-black leading-tight mt-0.5">
                    Ativar Comando de Voz
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMicPermissionModal(false)}
                className={`p-2 rounded-xl ${surfaceSubtle} cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3.5">
              <p className={`text-xs sm:text-sm leading-relaxed ${mutedText}`}>
                Para registrar corridas e despesas falando (ex:{' '}
                <strong className="text-current">"Ganho 25 reais no iFood 8 km"</strong> ou{' '}
                <strong className="text-current">"Gasto 40 reais de gasolina"</strong>), o{' '}
                <strong className="text-[#FF6A1A]">Mochilinha</strong> precisa de permissão para usar o microfone do seu aparelho.
              </p>

              <div className={`rounded-2xl p-3.5 flex flex-col gap-2 text-xs ${surfaceSubtle}`}>
                <div className="font-black text-[#FF6A1A] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Como autorizar no celular ou computador:</span>
                </div>
                <ol className={`list-decimal list-inside space-y-1 font-medium ${mutedText}`}>
                  <li>Toque no botão laranja abaixo para solicitar acesso ao microfone.</li>
                  <li>
                    Quando o aviso do seu aparelho aparecer na tela, toque em{' '}
                    <strong className="text-current">"Permitir"</strong> ou{' '}
                    <strong className="text-current">"Durante o uso do app"</strong>.
                  </li>
                  <li>Pronto! Fale sua corrida ou gasto e os campos serão preenchidos sozinhos.</li>
                </ol>
              </div>

              {micPermissionError && (
                <div className="rounded-2xl p-3.5 bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 font-bold leading-relaxed flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-rose-400 mb-0.5">Acesso ao microfone bloqueado</div>
                    <span>{micPermissionError}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMicPermissionModal(false)}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle}`}
                >
                  Agora não
                </button>
                <button
                  type="button"
                  disabled={isRequestingMicPermission}
                  onClick={() => handleRequestDeviceMicPermission(autoRecordAfterPermission)}
                  className="flex-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#FF6A1A]/25"
                >
                  <Mic className={`w-4 h-4 ${isRequestingMicPermission ? 'animate-bounce' : ''}`} />
                  <span>
                    {isRequestingMicPermission
                      ? 'Solicitando no aparelho...'
                      : 'Permitir Microfone e Falar'}
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
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    Odômetro Automático em 2º Plano
                  </span>
                  <h3 className="text-base sm:text-lg font-black leading-tight mt-0.5">
                    Permitir Localização Sempre
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGpsPermissionModal(false)}
                className={`p-2 rounded-xl ${surfaceSubtle} cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3.5">
              <p className={`text-xs sm:text-sm leading-relaxed ${mutedText}`}>
                Para que o <strong className="text-[#FF6A1A]">Mochilinha</strong> marque a quilometragem percorrida{' '}
                <strong className="text-current">automaticamente no Odômetro</strong> durante o Modo Turno — sem que você precise anotar manualmente — autorize o acesso ao GPS do seu aparelho.
              </p>

              <div className={`rounded-2xl p-3.5 flex flex-col gap-2 text-xs ${surfaceSubtle}`}>
                <div className="font-black text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Como ativar em Tempo Real e Segundo Plano:</span>
                </div>
                <ol className={`list-decimal list-inside space-y-1.5 font-medium ${mutedText}`}>
                  <li>
                    Toque em <strong className="text-current">"Ativar Localização GPS Agora"</strong> abaixo.
                  </li>
                  <li>
                    No aviso do celular, escolha{' '}
                    <strong className="text-emerald-400">"Permitir o tempo todo"</strong> (ou{' '}
                    <strong className="text-current">"Permitir durante o uso do app"</strong>).
                  </li>
                  <li>
                    Nas configurações de localização do aparelho, mantenha a{' '}
                    <strong className="text-current">Localização Precisa (Alta Precisão)</strong> ligada para contar cada rua rodada enquanto você usa o iFood, Uber ou 99.
                  </li>
                </ol>
              </div>

              {gpsPermissionError && (
                <div className="rounded-2xl p-3.5 bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 font-bold leading-relaxed flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-rose-400 mb-0.5">Atenção na Permissão de GPS</div>
                    <span>{gpsPermissionError}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGpsPermissionModal(false)}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle}`}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={isRequestingGpsPermission}
                  onClick={handleRequestDeviceGpsPermission}
                  className="flex-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-emerald-500 text-black hover:bg-emerald-400 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
                >
                  <Navigation className={`w-4 h-4 ${isRequestingGpsPermission ? 'animate-spin' : ''}`} />
                  <span>
                    {isRequestingGpsPermission
                      ? 'Conectando ao GPS...'
                      : 'Ativar Localização GPS Agora'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
