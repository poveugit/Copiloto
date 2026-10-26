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
  Flame,
  MessageSquare,
  Send,
  ChevronRight,
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
} from 'lucide-react';
import {
  RideEntry,
  ExpenseEntry,
  MaintenanceItem,
  MaintenanceHistoryRecord,
  FuelDiagnosticsConfig,
  AppDefinition,
  CategoryDefinition,
  ShiftDefinition,
  LocalRoomDatabaseState,
  UserProfile,
  getActiveSessionUser,
  saveActiveSessionUser,
  registerPilotAccount,
  loginPilotAccount,
  resetPilotPassword,
  runWorkManagerCloudSync,
  clearRemoteCloudData,
  fetchRemoteCloudData,
  isLegacyDemoEntry,
  isLegacyDemoExpense,
} from './services/supabaseSync';
import {
  evaluateShiftWorthiness,
  evaluateBikeDiagnostics,
  askCopilotAssistant,
} from './services/copilotService';
import { KOTLIN_NATIVE_FILES } from './data/kotlinSourceCode';

const BASE_APPS: AppDefinition[] = [
  { id: 'ifood', name: 'iFood', icon: '🛍️' },
  { id: 'uber', name: 'Uber', icon: '🚗' },
  { id: '99', name: '99', icon: '🚖' },
  { id: 'rappi', name: 'Rappi', icon: '📦' },
  { id: 'keeta', name: 'Keeta', icon: '🛵' },
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
    maintenanceNotificationsEnabled: true,
    maintenanceItems: DEFAULT_MAINTENANCE_ITEMS.map(item => ({ ...item })),
    fuelConfig: {
      ...DEFAULT_FUEL_CONFIG,
      bikeModelName: cleanBike,
    },
    customApps: [],
    customCategories: [],
    appOverrides: {},
    customShifts: [],
    shiftOverrides: {},
    deletedShiftIds: [],
    deletedAppIds: [],
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
        ? parsed.entries.filter((e: any) => !isLegacyDemoEntry(e))
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
        maintenanceNotificationsEnabled:
          typeof parsed.maintenanceNotificationsEnabled === 'boolean'
            ? parsed.maintenanceNotificationsEnabled
            : true,
        maintenanceItems: maintItems,
        fuelConfig: fuelCfg,
        customApps: Array.isArray(parsed.customApps) ? parsed.customApps : [],
        customCategories: Array.isArray(parsed.customCategories) ? parsed.customCategories : [],
        appOverrides: parsed.appOverrides || {},
        customShifts: Array.isArray(parsed.customShifts) ? parsed.customShifts : [],
        shiftOverrides: parsed.shiftOverrides || {},
        deletedShiftIds: Array.isArray(parsed.deletedShiftIds) ? parsed.deletedShiftIds : [],
        deletedAppIds: Array.isArray(parsed.deletedAppIds) ? parsed.deletedAppIds : [],
      };
    }
  } catch {
    // Ignore parse errors and return clean state
  }
  return createCleanDatabaseState(user?.bikeModel);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
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
  const [billingSubTab, setBillingSubTab] = useState<'ganhos' | 'gastos' | 'resumo' | 'produtividade'>('ganhos');
  const [showKotlinInspector, setShowKotlinInspector] = useState<boolean>(false);
  const [selectedKotlinFileIndex, setSelectedKotlinFileIndex] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // ================= AUTHENTICATION (LOGIN & CADASTRO) STATE =================
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getActiveSessionUser());
  const [showAuthScreen, setShowAuthScreen] = useState<boolean>(() => !getActiveSessionUser());
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recover'>('login');
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

  // Local Room DB State (isolated per user account, starting 100% clean with zero demo data)
  const [dbState, setDbState] = useState<LocalRoomDatabaseState>(() =>
    loadDatabaseForUser(getActiveSessionUser())
  );

  // Trigger Room Persistence + WorkManager Sync
  const persistAndEnqueueWorkManager = useCallback(
    async (nextState: LocalRoomDatabaseState, overrideUser?: UserProfile | null) => {
      const targetUser = overrideUser !== undefined ? overrideUser : currentUser;
      setDbState(nextState);
      const storageKey = getStorageKeyForUser(targetUser);
      localStorage.setItem(storageKey, JSON.stringify(nextState));

      if (simulateOffline) {
        setPendingSyncCount(prev => prev + 1);
        setWorkManagerStatus('Offline · Salvo no Room SQLite (WorkManager aguardando rede)');
        return;
      }

      setIsSyncing(true);
      const res = await runWorkManagerCloudSync(nextState, targetUser?.email ?? null, simulateOffline);
      setIsSyncing(false);
      setLastSyncTime(res.timestamp);
      setWorkManagerStatus(res.status);
      if (res.success) {
        setPendingSyncCount(0);
      }
    },
    [simulateOffline, currentUser]
  );

  // Hydrate from remote cloud on initial mount if user is logged in and local DB is empty
  useEffect(() => {
    let active = true;
    if (currentUser && !currentUser.isGuest && currentUser.email) {
      fetchRemoteCloudData(currentUser.email).then(remote => {
        if (!active || !remote) return;
        setDbState(prev => {
          if (prev.entries.length > 0 || prev.expenses.length > 0) return prev;
          const merged: LocalRoomDatabaseState = {
            ...prev,
            entries: remote.entries ?? prev.entries,
            expenses: remote.expenses ?? prev.expenses,
            dailyGoal: remote.dailyGoal ?? prev.dailyGoal,
            weeklyGoal: remote.weeklyGoal ?? prev.weeklyGoal,
            maintenanceItems: remote.maintenanceItems ?? prev.maintenanceItems,
            fuelConfig: remote.fuelConfig ?? prev.fuelConfig,
            customApps: remote.customApps ?? prev.customApps,
            customCategories: remote.customCategories ?? prev.customCategories,
            appOverrides: remote.appOverrides ?? prev.appOverrides,
          };
          localStorage.setItem(getStorageKeyForUser(currentUser), JSON.stringify(merged));
          return merged;
        });
      });
    }
    return () => {
      active = false;
    };
  }, [currentUser]);

  // Automatic periodic WorkManager tick every 30s when online
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!simulateOffline && currentUser) {
        setIsSyncing(true);
        const res = await runWorkManagerCloudSync(dbState, currentUser?.email ?? null, false);
        setIsSyncing(false);
        setLastSyncTime(res.timestamp);
        setWorkManagerStatus(res.status);
        setPendingSyncCount(0);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [dbState, simulateOffline, currentUser]);

  // ================= LOGIN, CADASTRO & RECOVERY HANDLERS =================
  const handleAuthSubmit = async (e: React.FormEvent) => {
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
        setAuthError(res.error || 'Não foi possível entrar na conta.');
        return;
      }

      // Load this user's own isolated database (or fetch from Supabase cloud if empty locally)
      let userDb = loadDatabaseForUser(res.user);
      if (userDb.entries.length === 0 && userDb.expenses.length === 0) {
        const remote = await fetchRemoteCloudData(res.user.email);
        if (remote) {
          userDb = {
            ...userDb,
            entries: remote.entries ?? [],
            expenses: remote.expenses ?? [],
            dailyGoal: remote.dailyGoal ?? userDb.dailyGoal,
            weeklyGoal: remote.weeklyGoal ?? userDb.weeklyGoal,
            maintenanceItems: remote.maintenanceItems ?? userDb.maintenanceItems,
            fuelConfig: remote.fuelConfig ?? userDb.fuelConfig,
            customApps: remote.customApps ?? [],
            customCategories: remote.customCategories ?? [],
            appOverrides: remote.appOverrides ?? {},
          };
        }
      }

      setIsAuthLoading(false);
      setCurrentUser(res.user);
      setShowAuthScreen(false);
      setAuthPassword('');
      await persistAndEnqueueWorkManager(userDb, res.user);
      return;
    }

    if (authMode === 'register') {
      if (authPassword !== authConfirmPassword) {
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

      // Brand-new account ALWAYS starts 100% clean (zero entries, zero expenses, zero demo data)
      const freshUserDb = createCleanDatabaseState(res.user.bikeModel);
      setCurrentUser(res.user);
      setShowAuthScreen(false);
      setAuthName('');
      setAuthPhone('');
      setAuthBikeModel('');
      setAuthPassword('');
      setAuthConfirmPassword('');
      await clearRemoteCloudData(res.user.email);
      await persistAndEnqueueWorkManager(freshUserDb, res.user);
      return;
    }

    if (authMode === 'recover') {
      if (authPassword !== authConfirmPassword) {
        setAuthError('As senhas digitadas não coincidem.');
        return;
      }
      const res = resetPilotPassword({
        email: authEmail,
        newPassword: authPassword,
      });
      if (!res.ok) {
        setAuthError(res.error || 'Erro ao redefinir a senha.');
        return;
      }
      setAuthSuccess(res.message || 'Senha redefinida com sucesso!');
      setAuthPassword('');
      setAuthConfirmPassword('');
      setAuthMode('login');
    }
  };

  const handleLogout = () => {
    saveActiveSessionUser(null);
    setCurrentUser(null);
    setDbState(createCleanDatabaseState());
    setAuthError(null);
    setAuthSuccess(null);
    setAuthPassword('');
    setAuthConfirmPassword('');
    setAuthMode('login');
    setShowAuthScreen(true);
  };

  // All Apps, Shifts & Categories
  const allApps = useMemo(() => {
    const deleted = new Set(dbState.deletedAppIds || []);
    const overrides = dbState.appOverrides || {};
    const base = BASE_APPS.filter(a => !deleted.has(a.id)).map(a =>
      overrides[a.id] ? { ...a, ...overrides[a.id] } : a
    );
    const custom = (dbState.customApps || [])
      .filter(a => !deleted.has(a.id))
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

  // Computed MVVM Totals
  const totals = useMemo(() => {
    const ridesKm = dbState.entries.reduce((s, e) => s + Number(e.km || 0), 0);
    const totalKm = (Number(dbState.fuelConfig.odometerBaseKm) || 0) + ridesKm;
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
      totalKm,
      totalHours,
      revenueByApp,
      totalRevenue,
      expenseByCat,
      totalExpense,
      lucro: totalRevenue - totalExpense,
    };
  }, [dbState.entries, dbState.expenses, dbState.fuelConfig.odometerBaseKm, allApps, allCategories]);

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
    const currentMonthStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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

    dbState.entries.forEach(e => {
      if (!e.date) return;
      const rev = Number(e.revenue || 0);
      const entryDate = new Date(e.date + 'T12:00:00');
      if (entryDate.getFullYear() === currentYear) revYear += rev;
      if (e.date.startsWith(currentMonthStr)) revMonth += rev;
      if (entryDate >= monday && entryDate <= sunday) revWeek += rev;
    });

    return { revWeek, revMonth, revYear };
  }, [dbState.entries]);

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

  const openNewEntryModal = () => {
    setEditingEntryId(null);
    setEntryMode('ganho');
    setEntryDate(todayStr());
    setEntryKm('');
    setEntryRev('');
    setEntryHours('');
    setExpenseAmount('');
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

      const updatedExpenses =
        editingEntryId !== null
          ? nextDb.expenses.map(e =>
              e.id === editingEntryId
                ? { ...e, date: entryDate, category: finalCategoryId, amount: amountVal }
                : e
            )
          : [
              ...nextDb.expenses,
              {
                id: Date.now(),
                date: entryDate,
                category: finalCategoryId,
                amount: amountVal,
              },
            ];

      persistAndEnqueueWorkManager({ ...nextDb, expenses: updatedExpenses });
    }

    setEntryModalFeedback(null);
    setShowEntryModal(false);
    setEditingEntryId(null);
  };

  // History Filters
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'ganho' | 'gasto'>('all');
  const [historySubFilter, setHistorySubFilter] = useState<string>('all');

  // Copilot Chat Modal
  const [showCopilotModal, setShowCopilotModal] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'bot' | 'user'; text: string }[]>([
    {
      role: 'bot',
      text: 'Olá! Sou o seu Moto Copilot IA. Analiso em tempo real seus dados locais do Room Database, custos por KM e metas do turno. Como posso ajudar hoje?',
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
    const customGoalDays = Math.max(1, Number(dbState.customGoalDays) || 20);
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

    // Custom Goal stats
    const customCurrent = totals.totalRevenue;
    const customPct = Math.min(100, Math.round((customCurrent / customGoalTarget) * 100));
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
        desc: 'Fature R$ 10.000 registrados no CopilotRider',
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

    const unlockedCount = achievements.filter(a => a.unlocked).length;

    return {
      dailyGoal,
      weeklyGoal,
      customGoalTarget,
      customGoalDays,
      customGoalTitle,
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
      achievements,
      unlockedCount,
    };
  }, [
    dbState,
    periodTotals.revWeek,
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

  // ================= DEDICATED LOGIN & CADASTRO SCREEN =================
  if (showAuthScreen || !currentUser) {
    return (
      <div className={`min-h-screen transition-colors duration-200 ${bgCanvas} flex flex-col justify-between p-4 sm:p-6 lg:p-10`}>
        {/* Top Minimal Brand + Theme Switcher */}
        <header className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF6A1A] text-black font-black flex items-center justify-center text-base shadow-sm">
              CR
            </div>
            <div>
              <span className="text-base sm:text-lg font-black tracking-tight block leading-none">
                CopilotRider
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

          {/* Right Column: Login & Cadastro Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto lg:max-w-none">
            <div className={`rounded-3xl p-5 sm:p-8 ${surfaceCard}`}>
              {/* Segmented Tab Switcher (Entrar vs Criar Conta) */}
              {authMode !== 'recover' ? (
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
                    <LogIn className="w-4 h-4" />
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
                    <UserPlus className="w-4 h-4" />
                    <span>Criar Conta</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800/40">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-[#FF6A1A]">Recuperar Senha</h2>
                    <p className={`text-xs ${mutedText}`}>Defina uma nova senha para o seu e-mail cadastrado</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle}`}
                  >
                    Voltar
                  </button>
                </div>
              )}

              {/* Feedback Banners */}
              {authError && (
                <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
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
                    E-mail
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
                      {authMode === 'recover' ? 'Nova Senha' : 'Senha'}
                    </label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('recover');
                          setAuthError(null);
                          setAuthSuccess(null);
                        }}
                        className="text-xs font-bold text-[#FF6A1A] hover:underline cursor-pointer"
                      >
                        Esqueceu a senha?
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

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="mt-2 w-full py-3.5 px-5 rounded-2xl bg-[#FF6A1A] text-black font-black text-sm hover:bg-[#ff7b33] transition-colors cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <span>
                    {isAuthLoading
                      ? 'Autenticando...'
                      : authMode === 'login'
                      ? 'Entrar no CopilotRider'
                      : authMode === 'register'
                      ? 'Criar Conta de Piloto'
                      : 'Salvar Nova Senha'}
                  </span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            </div>
          </div>
        </main>

        <footer className={`w-full max-w-6xl mx-auto text-center text-xs ${mutedText} py-2`}>
          CopilotRider · Seus dados permanecem salvos no Room Database local e sincronizados com segurança.
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
          className="text-base sm:text-lg font-black tracking-tight whitespace-nowrap shrink-0"
        >
          CopilotRider
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

            {/* Dropdown / Modal de Notificações adaptado para telas mobile */}
            {showNotificationsModal && (
              <div
                className={`absolute right-0 mt-2 w-[calc(100vw-1.75rem)] max-w-sm sm:w-96 rounded-2xl p-4 shadow-2xl z-50 border ${
                  isDark
                    ? 'bg-[#12141C] border-slate-800 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#FF6A1A]" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      Alertas de Manutenção ({pendingAlertNotifications.length})
                    </span>
                  </div>
                  <button
                    onClick={() => setShowNotificationsModal(false)}
                    className={`p-1 rounded-lg ${surfaceSubtle} cursor-pointer`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3 flex flex-col gap-2.5 max-h-80 overflow-y-auto">
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
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black truncate">{item.name}</span>
                            <span
                              className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                item.isOverdue
                                  ? 'bg-rose-500/25 text-rose-300'
                                  : 'bg-amber-500/25 text-amber-300'
                              }`}
                            >
                              {item.isOverdue ? 'Vencido' : `Alerta ${item.threshold}%`}
                            </span>
                          </div>
                          <p className={`text-[11px] mt-0.5 ${mutedText}`}>
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
            )}
          </div>

          <button
            onClick={openNewEntryModal}
            className="px-3 sm:px-4 py-2 text-xs font-bold text-black bg-[#FF6A1A] rounded-xl hover:bg-[#ff7b33] transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Registro</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER (Responsive Mobile + Multi-Column Desktop) */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6">
        {/* ================= ABA 1: PAINEL (DASHBOARD) ================= */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            {/* Left Column: Hero Odometer, Level Road & Main Financials */}
            <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6">
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-7 ${surfaceCard}`}>
                <div className={`text-[11px] sm:text-xs font-bold tracking-wider uppercase ${mutedText}`}>
                  Odômetro Total · {dbState.fuelConfig.bikeModelName}
                </div>
                <div className="mt-2 flex items-baseline gap-2 sm:gap-3 flex-wrap">
                  <span className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight tabular-nums">
                    {totals.totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
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

                {/* Primary 3 Financial KPIs (Adaptive 3-column with guaranteed mobile fit) */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-4 mt-5 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-800/40">
                  <div className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-0 ${surfaceSubtle}`}>
                    <div className={`text-[10px] sm:text-xs font-bold truncate ${mutedText}`}>Ganhos</div>
                    <div className="text-xs sm:text-xl lg:text-2xl font-black mt-1 tabular-nums text-sky-400 truncate">
                      {fmtMoney(totals.totalRevenue)}
                    </div>
                  </div>
                  <div className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-0 ${surfaceSubtle}`}>
                    <div className={`text-[10px] sm:text-xs font-bold truncate ${mutedText}`}>Gastos</div>
                    <div className="text-xs sm:text-xl lg:text-2xl font-black mt-1 tabular-nums text-rose-400 truncate">
                      {fmtMoney(totals.totalExpense)}
                    </div>
                  </div>
                  <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-4 min-w-0 bg-[#FF6A1A]/10 border border-[#FF6A1A]/30">
                    <div className="text-[10px] sm:text-xs font-bold text-[#FF6A1A] truncate">Lucro Líq.</div>
                    <div className="text-xs sm:text-xl lg:text-2xl font-black mt-1 tabular-nums text-[#FF6A1A] truncate">
                      {fmtMoney(totals.lucro)}
                    </div>
                  </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 ${surfaceSubtle}`}>
                    <div className={`text-[11px] sm:text-xs font-semibold ${mutedText}`}>Ganhos na Semana</div>
                    <div className="text-lg sm:text-xl font-black mt-0.5 sm:mt-1 tabular-nums text-sky-400">
                      {fmtMoney(periodTotals.revWeek)}
                    </div>
                  </div>
                  <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 ${surfaceSubtle}`}>
                    <div className={`text-[11px] sm:text-xs font-semibold ${mutedText}`}>Ganhos no Mês</div>
                    <div className="text-lg sm:text-xl font-black mt-0.5 sm:mt-1 tabular-nums text-emerald-400">
                      {fmtMoney(periodTotals.revMonth)}
                    </div>
                  </div>
                  <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 ${surfaceSubtle}`}>
                    <div className={`text-[11px] sm:text-xs font-semibold ${mutedText}`}>Ganhos no Ano</div>
                    <div className="text-lg sm:text-xl font-black mt-0.5 sm:mt-1 tabular-nums text-amber-400">
                      {fmtMoney(periodTotals.revYear)}
                    </div>
                  </div>
                </div>

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

                {/* Meta Personalizada de Ganhos + Barra de Progresso + Meta Diária até Atingir o Objetivo */}
                {(() => {
                  const customTarget = Math.max(50, Number(dbState.customGoalTarget) || 3000);
                  const customDays = Math.max(1, Number(dbState.customGoalDays) || 20);
                  const customTitle = (dbState.customGoalTitle || '').trim() || 'Meta Personalizada de Ganhos';
                  const currentEarned = totals.totalRevenue;
                  const rawPct = Math.round((currentEarned / customTarget) * 100);
                  const barPct = Math.min(100, Math.max(0, rawPct));
                  const remainingToGoal = Math.max(0, customTarget - currentEarned);
                  const isGoalReached = currentEarned >= customTarget;
                  const requiredDailyToReachGoal = isGoalReached ? 0 : remainingToGoal / customDays;
                  const estimatedDaysAtCurrentDailyGoal =
                    isGoalReached || dbState.dailyGoal <= 0
                      ? 0
                      : Math.ceil(remainingToGoal / Math.max(10, dbState.dailyGoal));

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
                      {/* Header + Editable Inputs for Custom Goal */}
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
                              Defina seu objetivo de ganhos e acompanhe a meta diária necessária
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs sm:text-sm font-black tabular-nums ${
                              isGoalReached ? 'text-emerald-400' : 'text-[#FF6A1A]'
                            }`}
                          >
                            {fmtMoney(currentEarned)} / {fmtMoney(customTarget)} ({rawPct}%)
                          </span>
                        </div>
                      </div>

                      {/* Inline Fields: Valor da Meta Personalizada (R$) & Prazo (Dias) */}
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className={`rounded-xl p-2.5 flex flex-col justify-between ${surfaceCard}`}>
                          <label className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                            Definir Meta de Ganhos (R$)
                          </label>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs font-black text-[#FF6A1A]">R$</span>
                            <input
                              type="number"
                              min="50"
                              step="50"
                              value={dbState.customGoalTarget || 3000}
                              onChange={e =>
                                persistAndEnqueueWorkManager({
                                  ...dbState,
                                  customGoalTarget: Math.max(10, Number(e.target.value) || 0),
                                })
                              }
                              placeholder="Ex: 3000"
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-black tabular-nums outline-none ${inputSurface}`}
                            />
                          </div>
                        </div>

                        <div className={`rounded-xl p-2.5 flex flex-col justify-between ${surfaceCard}`}>
                          <label className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                            Prazo p/ Objetivo (Dias)
                          </label>
                          <div className="flex items-center gap-1.5 mt-1">
                            <input
                              type="number"
                              min="1"
                              max="365"
                              value={dbState.customGoalDays || 20}
                              onChange={e =>
                                persistAndEnqueueWorkManager({
                                  ...dbState,
                                  customGoalDays: Math.max(1, Math.min(365, Number(e.target.value) || 1)),
                                })
                              }
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-black tabular-nums outline-none ${inputSurface}`}
                            />
                            <span className={`text-xs font-bold shrink-0 ${mutedText}`}>dias</span>
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
                            Meta Diária até o Objetivo
                          </span>
                          <div className="mt-1 flex items-baseline justify-between gap-1">
                            <span
                              className={`text-sm sm:text-base font-black tabular-nums ${
                                isGoalReached ? 'text-emerald-400' : 'text-[#FF6A1A]'
                              }`}
                            >
                              {isGoalReached
                                ? 'Objetivo Atingido!'
                                : `${fmtCurrencyExact(requiredDailyToReachGoal)}/dia`}
                            </span>
                            {!isGoalReached && (
                              <span className={`text-[10px] font-bold tabular-nums ${mutedText}`}>
                                por {customDays} {customDays === 1 ? 'dia' : 'dias'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div
                        className={`mt-3 h-3 rounded-full overflow-hidden ${
                          isDark ? 'bg-slate-800' : 'bg-slate-200'
                        }`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isGoalReached
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : 'bg-gradient-to-r from-[#FF6A1A] via-amber-500 to-emerald-400'
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>

                      {/* Bottom Status Details */}
                      <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] sm:text-xs font-semibold tabular-nums">
                        <span className={mutedText}>
                          {isGoalReached
                            ? `🏆 Parabéns! Você superou sua meta personalizada em ${fmtMoney(
                                currentEarned - customTarget
                              )}!`
                            : `Faltam ${fmtMoney(remainingToGoal)} · Faça ${fmtCurrencyExact(
                                requiredDailyToReachGoal
                              )}/dia (${customDays} dias) ou ~${estimatedDaysAtCurrentDailyGoal} dias na meta de ${fmtMoney(
                                dbState.dailyGoal
                              )}/dia`}
                        </span>
                        <span className={isGoalReached ? 'text-emerald-400 font-extrabold' : 'text-[#FF6A1A] font-extrabold'}>
                          {rawPct}% do objetivo
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

            {/* Right Column: Moto Copilot Decision, Quick Maintenance Status & App Ranking */}
            <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-6">
              {/* Copilot Shift Evaluation Card */}
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
                    <span>Perguntar ao Copilot</span>
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
                            ? `maint-card-danger-glow-subtle border-2 border-rose-500/80 ${
                                isDark ? 'bg-rose-950/20' : 'bg-rose-50/80 shadow-xs'
                              }`
                            : isWarn
                            ? `maint-card-warn-glow border-2 border-amber-500/80 ${
                                isDark ? 'bg-amber-950/20' : 'bg-amber-50/80 shadow-xs'
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
                                <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/40 shrink-0">
                                  Vencido
                                </span>
                              ) : isWarn ? (
                                <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-500/40 shrink-0">
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
                <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 border-2 border-rose-500/80 bg-rose-500/10 maint-card-danger-glow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 text-rose-300">
                  <div className="flex items-center gap-3 sm:gap-3.5">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                      <AlertTriangle className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-rose-200">
                        {overdueItems.length === 1
                          ? `Atenção: 1 manutenção atingiu 100% ou mais do intervalo!`
                          : `Atenção: ${overdueItems.length} manutenções atingiram 100% ou mais do intervalo!`}
                      </h4>
                      <p className={`text-[11px] sm:text-xs mt-0.5 ${mutedText}`}>
                        Cards com brilho pulsante vermelho precisam de troca imediata ({overdueItems.map(o => o.name).join(', ')}).
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-rose-500/25 border border-rose-500/50 text-rose-200 shrink-0 self-start sm:self-auto">
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
                <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 border-2 border-amber-500/80 bg-amber-500/10 maint-card-warn-glow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 text-amber-300">
                  <div className="flex items-center gap-3 sm:gap-3.5">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-amber-200">
                        {warningItems.length === 1
                          ? `Aviso Preventivo: 1 manutenção atingiu a porcentagem de alerta configurada!`
                          : `Aviso Preventivo: ${warningItems.length} manutenções atingiram a porcentagem de alerta configurada!`}
                      </h4>
                      <p className={`text-[11px] sm:text-xs mt-0.5 ${mutedText}`}>
                        Cards com destaque e borda âmbar ({warningItems.map(w => `${w.name} aos ${w.alertThresholdPct ?? 85}%`).join(', ')}).
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-amber-500/25 border border-amber-500/50 text-amber-200 shrink-0 self-start sm:self-auto">
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
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={maintDraft.intervalKm}
                      onChange={e => setMaintDraft({ ...maintDraft, intervalKm: Number(e.target.value) })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>KM da Última Troca</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={maintDraft.lastChangeKm}
                      onChange={e => setMaintDraft({ ...maintDraft, lastChangeKm: Number(e.target.value) })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Custo Estimado (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={maintDraft.costEstimate}
                      onChange={e => setMaintDraft({ ...maintDraft, costEstimate: Number(e.target.value) })}
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
                        <input
                          type="number"
                          min="50"
                          max="99"
                          step="1"
                          value={maintDraft.alertThresholdPct ?? 85}
                          onChange={e =>
                            setMaintDraft({
                              ...maintDraft,
                              alertThresholdPct: Math.min(99, Math.max(50, Number(e.target.value) || 85)),
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
              {/* SELETOR DE ORDENAÇÃO DOS CARDS DE MANUTENÇÃO (Scrollable chips on mobile, no layout squish) */}
              <div
                className={`col-span-1 md:col-span-2 rounded-xl sm:rounded-2xl px-3.5 sm:px-5 py-3 sm:py-3.5 ${surfaceCard} flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3`}
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#FF6A1A] shrink-0" />
                  <span className="text-xs sm:text-sm font-extrabold whitespace-nowrap">
                    Ordenar manutenções por:
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar py-0.5">
                  {(
                    [
                      { id: 'urgency', label: 'Mais urgente (Desgaste)' },
                      { id: 'name', label: 'Nome' },
                      { id: 'updatedAt', label: 'Data de atualização' },
                    ] as const
                  ).map(opt => {
                    const active = maintSortBy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMaintSortBy(opt.id)}
                        className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[#FF6A1A] text-black shadow-xs'
                            : `${surfaceSubtle} hover:border-[#FF6A1A]/60`
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                    className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 transition-all relative overflow-hidden ${
                      isDanger && !isEditingThis
                        ? `maint-card-danger-glow border-2 border-rose-500/90 ${
                            isDark
                              ? 'bg-gradient-to-b from-rose-950/30 via-[#12141C] to-[#12141C] text-slate-100'
                              : 'bg-gradient-to-b from-rose-50/90 via-white to-white text-slate-900 shadow-lg'
                          }`
                        : isWarn && !isEditingThis
                        ? `maint-card-warn-glow border-2 border-amber-500/90 ${
                            isDark
                              ? 'bg-gradient-to-b from-amber-950/25 via-[#12141C] to-[#12141C] text-slate-100'
                              : 'bg-gradient-to-b from-amber-50/90 via-white to-white text-slate-900 shadow-md'
                          }`
                        : surfaceCard
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
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={maintDraft.lastChangeKm}
                              onChange={e =>
                                setMaintDraft({ ...maintDraft, lastChangeKm: Number(e.target.value) })
                              }
                              className={`w-full px-3 py-2 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                            />
                          </div>
                          <div>
                            <label className={`block text-[10px] sm:text-[11px] font-bold mb-1 ${mutedText}`}>
                              Intervalo Revisão (KM)
                            </label>
                            <input
                              type="number"
                              min="100"
                              step="100"
                              value={maintDraft.intervalKm}
                              onChange={e =>
                                setMaintDraft({ ...maintDraft, intervalKm: Number(e.target.value) })
                              }
                              className={`w-full px-3 py-2 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                            />
                          </div>
                          <div>
                            <label className={`block text-[10px] sm:text-[11px] font-bold mb-1 ${mutedText}`}>
                              Custo Estimado (R$)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="5"
                              value={maintDraft.costEstimate}
                              onChange={e =>
                                setMaintDraft({ ...maintDraft, costEstimate: Number(e.target.value) })
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
                              <input
                                type="number"
                                min="50"
                                max="99"
                                step="1"
                                value={maintDraft.alertThresholdPct ?? 85}
                                onChange={e =>
                                  setMaintDraft({
                                    ...maintDraft,
                                    alertThresholdPct: Math.min(99, Math.max(50, Number(e.target.value) || 85)),
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
                          {/* DESTAQUE VISUAL ANIMADO: Faixa e brilho de alerta para manutenções >= 100% */}
                          {isDanger && (
                            <div className="mb-3 sm:mb-4 px-3 py-2 rounded-xl sm:rounded-2xl bg-rose-500/15 border border-rose-500/60 flex items-center justify-between text-xs font-black text-rose-400 gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="relative flex h-2.5 w-2.5 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                                </span>
                                <span className="tracking-wide uppercase font-black truncate text-[11px] sm:text-xs">
                                  ⚠️ Troca Vencida ({rawPct}%) · {kmOverdue > 0 ? `+${kmOverdue.toLocaleString('pt-BR')} km excedidos` : '100% atingido'}
                                </span>
                              </div>
                              <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-500/25 text-rose-200 border border-rose-500/40 shrink-0">
                                Trocar Já
                              </span>
                            </div>
                          )}

                          {/* DESTAQUE VISUAL ANIMADO: Faixa de Alerta Preventivo (ex: >= 90%) */}
                          {isWarn && !isDanger && (
                            <div className="mb-3 sm:mb-4 px-3 py-2 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/60 flex items-center justify-between text-xs font-black text-amber-300 gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="relative flex h-2.5 w-2.5 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                </span>
                                <span className="tracking-wide uppercase font-black truncate text-[11px] sm:text-xs">
                                  ⚠️ Alerta Preventivo ({rawPct}%) · Gatilho {alertThreshold}% atingido
                                </span>
                              </div>
                              <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/25 text-amber-200 border border-amber-500/40 shrink-0">
                                Alerta {alertThreshold}%
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
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                                      {rawPct}%
                                    </span>
                                  ) : isWarn ? (
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                                      {rawPct}% ({alertThreshold}%)
                                    </span>
                                  ) : null}
                                </h3>
                                <p className={`text-[11px] sm:text-xs mt-0.5 tabular-nums ${mutedText}`}>
                                  Troca aos {(item.lastChangeKm || 0).toLocaleString('pt-BR')} km ·{' '}
                                  {isDanger ? (
                                    <strong className="text-rose-400 font-extrabold">
                                      +{kmOverdue.toLocaleString('pt-BR')} km além
                                    </strong>
                                  ) : isWarn ? (
                                    <strong className="text-amber-400 font-extrabold">
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
                                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 min-h-[38px] sm:min-h-[40px] ${surfaceSubtle} hover:border-[#FF6A1A] text-slate-200`}
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
                                  ? 'text-rose-400 animate-pulse'
                                  : isWarn
                                  ? 'text-amber-400 animate-pulse'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {isDanger
                                ? '⚠️ VENCIDO (Troca Obrigatória)'
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
                                  ? 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                                  : isWarn
                                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-slate-800/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                          <button
                            type="button"
                            onClick={() => quickResetMaintenanceCard(item.id)}
                            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all min-h-[44px] text-center ${
                              isDanger
                                ? 'bg-emerald-500/25 border-2 border-emerald-500/70 text-emerald-300 hover:bg-emerald-500/35 shadow-sm'
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
                    <input
                      type="number"
                      step="0.5"
                      min="5"
                      value={fuelDraft.kmPerLiter}
                      onChange={e => setFuelDraft({ ...fuelDraft, kmPerLiter: Number(e.target.value) })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Preço Gasolina (R$/L)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="1"
                      value={fuelDraft.fuelPrice}
                      onChange={e => setFuelDraft({ ...fuelDraft, fuelPrice: Number(e.target.value) })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Tanque (Litros)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="3"
                      value={fuelDraft.tankCapacityLiters}
                      onChange={e => setFuelDraft({ ...fuelDraft, tankCapacityLiters: Number(e.target.value) })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${mutedText}`}>Odômetro Base Inicial (KM)</label>
                    <input
                      type="number"
                      step="10"
                      min="0"
                      value={fuelDraft.odometerBaseKm}
                      onChange={e => setFuelDraft({ ...fuelDraft, odometerBaseKm: Number(e.target.value) })}
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

        {/* ================= ABA 3: FINANCEIRO ================= */}
        {activeTab === 'billing' && (
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h1 className="text-xl sm:text-2xl font-black">Relatório Financeiro & Produtividade</h1>
              <div className={`flex items-center gap-1 p-1 rounded-xl sm:rounded-2xl overflow-x-auto max-w-full no-scrollbar ${surfaceSubtle}`}>
                {[
                  { id: 'ganhos', label: 'Ganhos' },
                  { id: 'gastos', label: 'Gastos' },
                  { id: 'resumo', label: 'Resumo' },
                  { id: 'produtividade', label: 'Produtividade' },
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
                  <h2 className="text-sm sm:text-base font-extrabold">Despesas por Categoria</h2>
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

            {billingSubTab === 'resumo' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
                <div className={`rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 ${surfaceCard}`}>
                  <div className={`text-[10px] sm:text-xs font-bold ${mutedText}`}>Total em Ganhos</div>
                  <div className="text-base sm:text-2xl font-black mt-1 sm:mt-2 tabular-nums text-sky-400 truncate">
                    {fmtMoney(totals.totalRevenue)}
                  </div>
                </div>
                <div className={`rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 ${surfaceCard}`}>
                  <div className={`text-[10px] sm:text-xs font-bold ${mutedText}`}>Total em Gastos</div>
                  <div className="text-base sm:text-2xl font-black mt-1 sm:mt-2 tabular-nums text-rose-400 truncate">
                    {fmtMoney(totals.totalExpense)}
                  </div>
                </div>
                <div className={`rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 ${surfaceCard}`}>
                  <div className="text-[10px] sm:text-xs font-bold text-[#FF6A1A]">Lucro Líquido</div>
                  <div className="text-base sm:text-2xl font-black mt-1 sm:mt-2 tabular-nums text-[#FF6A1A] truncate">
                    {fmtMoney(totals.lucro)}
                  </div>
                </div>
                <div className={`rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 ${surfaceCard}`}>
                  <div className={`text-[10px] sm:text-xs font-bold ${mutedText}`}>Custo Real / KM</div>
                  <div className="text-base sm:text-2xl font-black mt-1 sm:mt-2 tabular-nums truncate">
                    {fmtCurrencyExact(totals.ridesKm > 0 ? totals.totalExpense / totals.ridesKm : 0)}
                  </div>
                </div>
                <div className={`rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 ${surfaceCard} col-span-2 sm:col-span-1`}>
                  <div className={`text-[10px] sm:text-xs font-bold ${mutedText}`}>Margem Líquida</div>
                  <div className="text-base sm:text-2xl font-black mt-1 sm:mt-2 tabular-nums text-emerald-400 truncate">
                    {totals.totalRevenue > 0 ? Math.round((totals.lucro / totals.totalRevenue) * 100) : 0}%
                  </div>
                </div>
              </div>
            )}

            {billingSubTab === 'produtividade' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                  <h2 className="text-sm sm:text-base font-extrabold mb-3 sm:mb-4">Eficiência por App (R$/KM e R$/Hora)</h2>
                  <div className="flex flex-col gap-2.5 sm:gap-3">
                    {allApps.map(app => {
                      const entries = dbState.entries.filter(e => e.app === app.id);
                      const rev = entries.reduce((s, e) => s + Number(e.revenue || 0), 0);
                      const km = entries.reduce((s, e) => s + Number(e.km || 0), 0);
                      const h = entries.reduce((s, e) => s + Number(e.hours || 0), 0);
                      return (
                        <div key={app.id} className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 ${surfaceSubtle}`}>
                          <div className="flex items-center justify-between font-bold text-xs sm:text-sm mb-1 sm:mb-2">
                            <span className="flex items-center gap-1.5 truncate">
                              <span>{app.icon}</span>
                              <span className="truncate">{app.name}</span>
                            </span>
                            <span className="text-[#FF6A1A] tabular-nums whitespace-nowrap">{fmtMoney(rev)}</span>
                          </div>
                          <div className={`flex flex-wrap items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs tabular-nums ${mutedText}`}>
                            <span>Rentabilidade: {fmtCurrencyExact(km > 0 ? rev / km : 0)}/km</span>
                            <span aria-hidden="true">·</span>
                            <span>Média: {fmtCurrencyExact(h > 0 ? rev / h : 0)}/h</span>
                            <span aria-hidden="true">·</span>
                            <span>{km} km</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${surfaceCard}`}>
                  <h2 className="text-sm sm:text-base font-extrabold mb-3 sm:mb-4">Rentabilidade por Turno</h2>
                  <div className="flex flex-col gap-2.5 sm:gap-3">
                    {allShifts.map(shift => {
                      const entries = dbState.entries.filter(e => e.shift === shift.id);
                      const rev = entries.reduce((s, e) => s + Number(e.revenue || 0), 0);
                      const h = entries.reduce((s, e) => s + Number(e.hours || 0), 0);
                      return (
                        <div key={shift.id} className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 ${surfaceSubtle}`}>
                          <div className="flex items-center justify-between font-bold text-xs sm:text-sm mb-1">
                            <span className="truncate">{shift.name}</span>
                            <span className="text-emerald-400 tabular-nums whitespace-nowrap">
                              {fmtCurrencyExact(h > 0 ? rev / h : 0)}/h
                            </span>
                          </div>
                          <div className={`flex flex-wrap items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs tabular-nums ${mutedText}`}>
                            <span>Faturamento: {fmtMoney(rev)}</span>
                            <span aria-hidden="true">·</span>
                            <span>Trabalho: {h}h</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF6A1A] truncate">
                      {progressAnalytics.customGoalTitle}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                        progressAnalytics.customCurrent >= progressAnalytics.customGoalTarget
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-[#FF6A1A]/15 text-[#FF6A1A] border-[#FF6A1A]/30'
                      }`}
                    >
                      {progressAnalytics.customPct}% atingido
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 mt-2">
                    <div className="text-xl sm:text-2xl font-black tabular-nums text-[#FF6A1A]">
                      {fmtCurrencyExact(progressAnalytics.customCurrent)}
                    </div>
                    <div className={`text-xs font-bold tabular-nums ${mutedText}`}>
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
                    <div className={`text-[10px] font-semibold ${mutedText}`}>Prazo / Ritmo</div>
                    <div className="text-xs font-black tabular-nums mt-0.5">
                      {progressAnalytics.customGoalDays}d (est. {progressAnalytics.estimatedDaysToCustomGoal}d)
                    </div>
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

            {/* SECTION 5: EVOLUÇÃO DOS ÚLTIMOS 7 DIAS VS META DIÁRIA */}
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

            {/* WORKSPACE NATIVE ANDROID TOOLBAR CARD (Exclusivo na tela de Configurações) */}
            <div
              className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 ${surfaceCard}`}
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-[#FF6A1A]">Android Jetpack Compose · MVVM</span>
                  <span aria-hidden="true" className={mutedText}>·</span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Database className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      Room SQLite ({dbState.entries.length + dbState.expenses.length} regs · {dbState.maintenanceItems.length} cards)
                    </span>
                  </span>
                  <span aria-hidden="true" className={mutedText}>·</span>
                  <span className={`font-medium ${simulateOffline ? 'text-amber-500' : mutedText}`}>
                    {workManagerStatus} ({lastSyncTime})
                    {pendingSyncCount > 0 ? ` · ${pendingSyncCount} na fila` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Offline Mode Simulator Toggle */}
                  <button
                    onClick={() => {
                      const nextOffline = !simulateOffline;
                      setSimulateOffline(nextOffline);
                      if (!nextOffline) {
                        persistAndEnqueueWorkManager(dbState);
                      } else {
                        setWorkManagerStatus('Offline Ativo · Room Local 100% Operacional');
                      }
                    }}
                    className={`flex-1 sm:flex-initial justify-center px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
                      simulateOffline
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                    }`}
                    title="Testar funcionamento 100% Offline via Room Database"
                  >
                    {simulateOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
                    <span>{simulateOffline ? 'Modo Offline Ativo' : 'Online (WorkManager)'}</span>
                  </button>

                  {/* Manual WorkManager Sync Trigger */}
                  <button
                    onClick={() => persistAndEnqueueWorkManager(dbState)}
                    disabled={isSyncing}
                    className={`flex-1 sm:flex-initial justify-center px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
                      isDark
                        ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#FF6A1A]' : ''}`} />
                    <span>Sincronizar</span>
                  </button>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 ${surfaceCard}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 border-b border-slate-800/40">
                <div>
                  <div className="text-sm font-bold">Meta Diária de Faturamento (R$)</div>
                  <div className={`text-xs ${mutedText}`}>Usada no cálculo de progresso diário e Copilot</div>
                </div>
                <input
                  type="number"
                  value={dbState.dailyGoal}
                  onChange={e =>
                    persistAndEnqueueWorkManager({
                      ...dbState,
                      dailyGoal: Math.max(10, Number(e.target.value) || 150),
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
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={dbState.weeklyGoal || 900}
                  onChange={e =>
                    persistAndEnqueueWorkManager({
                      ...dbState,
                      weeklyGoal: Math.max(50, Number(e.target.value) || 900),
                    })
                  }
                  className={`w-full sm:w-28 px-3 py-2 rounded-xl text-left sm:text-right font-black tabular-nums outline-none ${inputSurface}`}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2 border-b border-slate-800/40">
                <div>
                  <div className="text-sm font-bold">Meta Personalizada de Ganhos (R$) & Prazo</div>
                  <div className={`text-xs ${mutedText}`}>
                    Exibe barra de progresso e calcula a meta diária necessária até atingir seu objetivo
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                    <span className={`text-xs font-bold ${mutedText}`}>R$</span>
                    <input
                      type="number"
                      min="50"
                      step="50"
                      value={dbState.customGoalTarget || 3000}
                      onChange={e =>
                        persistAndEnqueueWorkManager({
                          ...dbState,
                          customGoalTarget: Math.max(10, Number(e.target.value) || 0),
                        })
                      }
                      className={`w-full sm:w-28 px-3 py-2 rounded-xl text-left sm:text-right font-black tabular-nums outline-none ${inputSurface}`}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={dbState.customGoalDays || 20}
                      onChange={e =>
                        persistAndEnqueueWorkManager({
                          ...dbState,
                          customGoalDays: Math.max(1, Math.min(365, Number(e.target.value) || 1)),
                        })
                      }
                      className={`w-20 px-3 py-2 rounded-xl text-center font-black tabular-nums outline-none ${inputSurface}`}
                      title="Prazo em dias para atingir a meta personalizada"
                    />
                    <span className={`text-xs font-bold ${mutedText}`}>dias</span>
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

      {/* COPILOT AI ASSISTANT MODAL */}
      {showCopilotModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 flex flex-col max-h-[85vh] ${surfaceCard}`}>
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800/50">
              <div>
                <h3 className="text-sm sm:text-base font-black">Moto Copilot Gemini</h3>
                <p className={`text-[11px] sm:text-xs ${mutedText}`}>Assistente inteligente integrado ao Room Database</p>
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
                    setMaintHistoryKm(String(totals.totalKm));
                    setMaintHistoryAmount(String(activeMaintItem.costEstimate || 0));
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
    </div>
  );
}
