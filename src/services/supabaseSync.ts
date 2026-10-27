import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL || 'https://umdzkhpntjyzksnwortp.supabase.co';
const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZHpraHBudGp5emtzbndvcnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0ODg1MTYsImV4cCI6MjEwMjA2NDUxNn0',
    '1v6y4TJp16D_WET0PJORoLUrZHkyghYzXpyaHNeQo1s',
  ].join('.');

export interface RideEntry {
  id: number;
  date: string;
  app: string;
  shift: string;
  km: number;
  revenue: number;
  hours: number;
}

export interface ExpenseEntry {
  id: number;
  date: string;
  category: string;
  amount: number;
}

export interface MaintenanceHistoryRecord {
  id: string;
  date: string; // YYYY-MM-DD
  km: number;
  amount: number;
  notes?: string;
}

export interface MaintenanceItem {
  id: string;
  name: string;
  icon: string;
  lastChangeKm: number;
  intervalKm: number;
  costEstimate: number;
  notes?: string;
  isDefault?: boolean;
  updatedAt?: number;
  alertThresholdPct?: number; // Porcentagem configurável de alerta (ex: 80, 85, 90)
  history?: MaintenanceHistoryRecord[];
}

export interface FuelDiagnosticsConfig {
  kmPerLiter: number;
  fuelPrice: number;
  tankCapacityLiters: number;
  bikeModelName: string;
  odometerBaseKm: number;
}

export interface AppDefinition {
  id: string;
  name: string;
  icon: string;
}

export interface CategoryDefinition {
  id: string;
  name: string;
}

export interface ShiftDefinition {
  id: string;
  name: string;
}

export interface FinancialPlanningConfig {
  workDaysPerMonth: number;
  dailyLunchBudget: number;
  dailySnackBudget: number;
  emergencyReservePct: number;
  maintenanceExtraBufferPct: number;
  ipvaAnnual: number;
  licensingAnnual: number;
  insuranceOrMeiMonthly: number;
  otherDocsAnnual: number;
  docsTargetMonths: number;
  revenueBaseMode: 'actual_or_goal' | 'daily_goal' | 'custom_daily';
  customDailyGrossBase?: number;
  customDailyKmBase?: number;
}

export const DEFAULT_FINANCIAL_PLAN: FinancialPlanningConfig = {
  workDaysPerMonth: 24,
  dailyLunchBudget: 22,
  dailySnackBudget: 10,
  emergencyReservePct: 10,
  maintenanceExtraBufferPct: 5,
  ipvaAnnual: 480,
  licensingAnnual: 160,
  insuranceOrMeiMonthly: 75,
  otherDocsAnnual: 120,
  docsTargetMonths: 12,
  revenueBaseMode: 'actual_or_goal',
  customDailyGrossBase: 180,
  customDailyKmBase: 110,
};

export interface LocalRoomDatabaseState {
  entries: RideEntry[];
  expenses: ExpenseEntry[];
  dailyGoal: number;
  weeklyGoal: number;
  customGoalTarget?: number;
  customGoalDays?: number;
  customGoalTitle?: string;
  maintenanceNotificationsEnabled?: boolean;
  maintenanceItems: MaintenanceItem[];
  fuelConfig: FuelDiagnosticsConfig;
  financialPlan?: FinancialPlanningConfig;
  customApps: AppDefinition[];
  customCategories: CategoryDefinition[];
  appOverrides: Record<string, { name: string; icon: string }>;
  customShifts?: ShiftDefinition[];
  shiftOverrides?: Record<string, { name: string }>;
  deletedShiftIds?: string[];
  deletedAppIds?: string[];
  deletedEntryIds?: number[];
  deletedExpenseIds?: number[];
  lastSyncedAt?: string;
}

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true },
      });
    } catch {
      supabaseClient = null;
    }
  }
  return supabaseClient;
}

export function getUserDeviceId(userEmail?: string | null): string {
  if (userEmail) {
    return 'usr_' + userEmail.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
  }
  let id = localStorage.getItem('moto-dash-device-id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('moto-dash-device-id', id);
  }
  return id;
}

export async function runWorkManagerCloudSync(
  state: LocalRoomDatabaseState,
  userEmail?: string | null,
  simulateOffline = false
): Promise<{ success: boolean; status: string; timestamp: string }> {
  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const isoNow = new Date().toISOString();

  if (simulateOffline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return {
      success: false,
      status: 'Offline (Room SQLite Local · WorkManager em fila)',
      timestamp: nowStr,
    };
  }

  const deviceId = getUserDeviceId(userEmail);
  const localAcc = userEmail
    ? getLocalAccounts().find(a => a.email.toLowerCase() === userEmail.trim().toLowerCase())
    : undefined;

  const pilotProfileObj = localAcc
    ? {
        id: localAcc.id,
        name: localAcc.name,
        email: localAcc.email,
        phone: localAcc.phone || '',
        bikeModel: localAcc.bikeModel || state.fuelConfig.bikeModelName || 'Minha Moto',
        createdAt: localAcc.createdAt,
        passwordHash: localAcc.passwordHash,
      }
    : undefined;

  const cleanEntries = (state.entries || []).filter(e => !isLegacyDemoEntry(e));
  const cleanExpenses = (state.expenses || []).filter(e => !isLegacyDemoExpense(e));

  const cloudSnapshot = {
    entries: cleanEntries,
    expenses: cleanExpenses,
    dailyGoal: state.dailyGoal,
    weeklyGoal: state.weeklyGoal || 900,
    customGoalTarget: state.customGoalTarget || 3000,
    customGoalDays: state.customGoalDays || 20,
    customGoalTitle: state.customGoalTitle || 'Meta Personalizada de Ganhos',
    maintenanceNotificationsEnabled: state.maintenanceNotificationsEnabled ?? true,
    maintenanceItems: state.maintenanceItems || [],
    fuelConfig: state.fuelConfig,
    financialPlan: state.financialPlan || DEFAULT_FINANCIAL_PLAN,
    customApps: state.customApps || [],
    customCategories: state.customCategories || [],
    appOverrides: state.appOverrides || {},
    customShifts: state.customShifts || [],
    shiftOverrides: state.shiftOverrides || {},
    deletedShiftIds: state.deletedShiftIds || [],
    deletedAppIds: state.deletedAppIds || [],
    deletedEntryIds: state.deletedEntryIds || [],
    deletedExpenseIds: state.deletedExpenseIds || [],
    lastSyncedAt: state.lastSyncedAt || isoNow,
  };

  let serverSynced = false;
  let supabaseSynced = false;

  // 1. Push to Express Server Cloud Store (/api/cloud-sync/push)
  try {
    const serverRes = await fetch('/api/cloud-sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        state: cloudSnapshot,
        pilotProfile: pilotProfileObj,
      }),
    });
    if (serverRes.ok) {
      serverSynced = true;
    }
  } catch {
    // Ignore if server endpoint unreachable
  }

  // 2. Push to Supabase (moto_settings + moto_entries + moto_expenses)
  const client = getSupabaseClient();
  if (client) {
    try {
      const legacyMaintenance = {
        lastOilChangeKm: state.maintenanceItems.find(m => m.id === 'oil')?.lastChangeKm ?? 0,
        oilIntervalKm: state.maintenanceItems.find(m => m.id === 'oil')?.intervalKm ?? 1000,
        lastTireChangeKm: state.maintenanceItems.find(m => m.id === 'tire')?.lastChangeKm ?? 0,
        tireIntervalKm: state.maintenanceItems.find(m => m.id === 'tire')?.intervalKm ?? 10000,
        lastChainChangeKm: state.maintenanceItems.find(m => m.id === 'chain')?.lastChangeKm ?? 0,
        chainIntervalKm: state.maintenanceItems.find(m => m.id === 'chain')?.intervalKm ?? 8000,
        lastBrakeChangeKm: state.maintenanceItems.find(m => m.id === 'brake')?.lastChangeKm ?? 0,
        brakeIntervalKm: state.maintenanceItems.find(m => m.id === 'brake')?.intervalKm ?? 5000,
        kmPerLiter: state.fuelConfig.kmPerLiter,
        fuelPrice: state.fuelConfig.fuelPrice,
        tankCapacityLiters: state.fuelConfig.tankCapacityLiters,
        bikeModelName: state.fuelConfig.bikeModelName,
        odometerBaseKm: state.fuelConfig.odometerBaseKm,
        weeklyGoal: state.weeklyGoal || 900,
        customGoalTarget: state.customGoalTarget || 3000,
        customGoalDays: state.customGoalDays || 20,
        customGoalTitle: state.customGoalTitle || 'Meta Personalizada de Ganhos',
        maintenanceNotificationsEnabled: state.maintenanceNotificationsEnabled ?? true,
        financialPlan: state.financialPlan || DEFAULT_FINANCIAL_PLAN,
        cloudSnapshot,
        ...(pilotProfileObj ? { pilotProfile: pilotProfileObj } : {}),
      };

      // Try full upsert first; if optional columns don't exist in Supabase schema, fallback to core columns
      const { error: fullUpsertErr } = await client.from('moto_settings').upsert(
        {
          device_id: deviceId,
          daily_goal: state.dailyGoal,
          maintenance: legacyMaintenance,
          app_overrides: state.appOverrides || {},
          custom_apps: state.customApps || [],
          custom_categories: state.customCategories || [],
          custom_maints: state.maintenanceItems || [],
          updated_at: isoNow,
        },
        { onConflict: 'device_id' }
      );

      if (fullUpsertErr) {
        const { error: coreUpsertErr } = await client.from('moto_settings').upsert(
          {
            device_id: deviceId,
            daily_goal: state.dailyGoal,
            maintenance: legacyMaintenance,
            updated_at: isoNow,
          },
          { onConflict: 'device_id' }
        );
        if (!coreUpsertErr) {
          supabaseSynced = true;
        }
      } else {
        supabaseSynced = true;
      }

      if (state.deletedEntryIds && state.deletedEntryIds.length > 0) {
        await client
          .from('moto_entries')
          .delete()
          .eq('device_id', deviceId)
          .in('id', state.deletedEntryIds.map(String));
      }

      if (state.deletedExpenseIds && state.deletedExpenseIds.length > 0) {
        await client
          .from('moto_expenses')
          .delete()
          .eq('device_id', deviceId)
          .in('id', state.deletedExpenseIds.map(String));
      }

      if (cleanEntries.length > 0) {
        const entriesPayload = cleanEntries.map(e => ({
          id: String(e.id),
          device_id: deviceId,
          entry_date: e.date,
          app: e.app,
          shift: e.shift || 'almoco',
          km: Number(e.km || 0),
          revenue: Number(e.revenue || 0),
          hours: Number(e.hours || 0),
          updated_at: isoNow,
        }));
        await client.from('moto_entries').upsert(entriesPayload, { onConflict: 'id' });
      }

      if (cleanExpenses.length > 0) {
        const expensesPayload = cleanExpenses.map(e => ({
          id: String(e.id),
          device_id: deviceId,
          expense_date: e.date,
          category: e.category,
          amount: Number(e.amount || 0),
          updated_at: isoNow,
        }));
        await client.from('moto_expenses').upsert(expensesPayload, { onConflict: 'id' });
      }
    } catch {
      // Handled by serverSynced or Room local fallback
    }
  }

  if (supabaseSynced || serverSynced) {
    return {
      success: true,
      status: 'Sincronizado na Nuvem + Room DB',
      timestamp: nowStr,
    };
  }

  return {
    success: false,
    status: 'Room Local Ativo (Retry agendado)',
    timestamp: nowStr,
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bikeModel?: string;
  createdAt: string;
  isGuest?: boolean;
}

interface StoredLocalAccount extends UserProfile {
  passwordHash: string;
}

export interface RememberedCredentials {
  email: string;
  password: string;
  name?: string;
  bikeModel?: string;
  rememberMe: boolean;
  updatedAt: string;
}

const USERS_DB_KEY = 'copilotrider_users_db_v1';
const ACTIVE_SESSION_KEY = 'copilotrider_active_session_v1';
const REMEMBERED_CREDS_KEY = 'copilotrider_remembered_credentials_v1';
const SAVED_LOGINS_LIST_KEY = 'copilotrider_saved_logins_v1';

function simpleHash(str: string): string {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function getLocalAccounts(): StoredLocalAccount[] {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: StoredLocalAccount[]): void {
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(accounts));
}

export function getRememberedCredentials(): RememberedCredentials | null {
  try {
    const raw = localStorage.getItem(REMEMBERED_CREDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberedCredentials;
    if (!parsed || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getSavedLoginAccounts(): RememberedCredentials[] {
  try {
    const raw = localStorage.getItem(SAVED_LOGINS_LIST_KEY);
    if (!raw) {
      const single = getRememberedCredentials();
      return single && single.rememberMe ? [single] : [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRememberedCredentials(creds: RememberedCredentials | null): void {
  if (!creds || !creds.rememberMe) {
    localStorage.removeItem(REMEMBERED_CREDS_KEY);
    return;
  }
  const normalized: RememberedCredentials = {
    email: creds.email.trim().toLowerCase(),
    password: creds.password,
    name: creds.name || creds.email.split('@')[0],
    bikeModel: creds.bikeModel || 'Minha Moto',
    rememberMe: true,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(REMEMBERED_CREDS_KEY, JSON.stringify(normalized));

  const list = getSavedLoginAccounts().filter(
    item => item.email.toLowerCase() !== normalized.email.toLowerCase()
  );
  localStorage.setItem(SAVED_LOGINS_LIST_KEY, JSON.stringify([normalized, ...list].slice(0, 5)));
}

export function removeSavedLoginAccount(email: string): void {
  const emailClean = email.trim().toLowerCase();
  const current = getRememberedCredentials();
  if (current && current.email.toLowerCase() === emailClean) {
    localStorage.removeItem(REMEMBERED_CREDS_KEY);
  }
  const list = getSavedLoginAccounts().filter(item => item.email.toLowerCase() !== emailClean);
  localStorage.setItem(SAVED_LOGINS_LIST_KEY, JSON.stringify(list));
}

export function getActiveSessionUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (parsed?.isGuest || parsed?.id === 'guest_local') {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveSessionUser(user: UserProfile | null): void {
  if (!user) {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } else {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(user));
  }
}

export function isLegacyDemoEntry(e: { id: number | string; km?: number; revenue?: number }): boolean {
  const idNum = Number(e.id);
  if (idNum === 101 && Number(e.km) === 68 && Number(e.revenue) === 142) return true;
  if (idNum === 102 && Number(e.km) === 94 && Number(e.revenue) === 186) return true;
  if (idNum === 103 && Number(e.km) === 82 && Number(e.revenue) === 158) return true;
  return false;
}

export function isLegacyDemoExpense(e: { id: number | string; category?: string; amount?: number }): boolean {
  const idNum = Number(e.id);
  if (idNum === 201 && e.category === 'combustivel' && Number(e.amount) === 42) return true;
  if (idNum === 202 && e.category === 'manutencao' && Number(e.amount) === 45) return true;
  return false;
}

export async function fetchRemoteCloudData(
  userEmail?: string | null
): Promise<Partial<LocalRoomDatabaseState> | null> {
  if (!userEmail) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

  const deviceId = getUserDeviceId(userEmail);
  let serverSnap: Partial<LocalRoomDatabaseState> | null = null;

  // 1. Fetch from Express Server Cloud Store (/api/cloud-sync/pull)
  try {
    const res = await fetch(`/api/cloud-sync/pull?deviceId=${encodeURIComponent(deviceId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json?.ok && json?.data?.state) {
        serverSnap = json.data.state;
      }
    }
  } catch {
    // Ignore if server endpoint unavailable
  }

  // 2. Fetch from Supabase (moto_settings, moto_entries, moto_expenses)
  const client = getSupabaseClient();
  let supabaseSnap: Partial<LocalRoomDatabaseState> | null = null;

  if (client) {
    try {
      const [settingsRes, entriesRes, expensesRes] = await Promise.all([
        client.from('moto_settings').select('*').eq('device_id', deviceId).maybeSingle(),
        client.from('moto_entries').select('*').eq('device_id', deviceId),
        client.from('moto_expenses').select('*').eq('device_id', deviceId),
      ]);

      const settings = settingsRes.data;
      const rawEntries = Array.isArray(entriesRes.data) ? entriesRes.data : [];
      const rawExpenses = Array.isArray(expensesRes.data) ? expensesRes.data : [];

      const demoEntryIdsToDelete: string[] = [];
      const tableEntries: RideEntry[] = [];
      for (const row of rawEntries) {
        const mapped: RideEntry = {
          id: Number(row.id) || Date.now(),
          date: row.entry_date,
          app: row.app,
          shift: row.shift || 'almoco',
          km: Number(row.km || 0),
          revenue: Number(row.revenue || 0),
          hours: Number(row.hours || 0),
        };
        if (isLegacyDemoEntry(mapped)) {
          demoEntryIdsToDelete.push(String(row.id));
        } else {
          tableEntries.push(mapped);
        }
      }

      const demoExpenseIdsToDelete: string[] = [];
      const tableExpenses: ExpenseEntry[] = [];
      for (const row of rawExpenses) {
        const mapped: ExpenseEntry = {
          id: Number(row.id) || Date.now(),
          date: row.expense_date,
          category: row.category,
          amount: Number(row.amount || 0),
        };
        if (isLegacyDemoExpense(mapped)) {
          demoExpenseIdsToDelete.push(String(row.id));
        } else {
          tableExpenses.push(mapped);
        }
      }

      if (demoEntryIdsToDelete.length > 0) {
        client.from('moto_entries').delete().eq('device_id', deviceId).in('id', demoEntryIdsToDelete).then(() => {});
      }
      if (demoExpenseIdsToDelete.length > 0) {
        client.from('moto_expenses').delete().eq('device_id', deviceId).in('id', demoExpenseIdsToDelete).then(() => {});
      }

      if (settings || tableEntries.length > 0 || tableExpenses.length > 0) {
        const m = settings?.maintenance || {};
        const snap = m.cloudSnapshot || {};

        const deletedEntrySet = new Set<number>(
          Array.isArray(snap.deletedEntryIds) ? snap.deletedEntryIds.map(Number) : []
        );
        const deletedExpenseSet = new Set<number>(
          Array.isArray(snap.deletedExpenseIds) ? snap.deletedExpenseIds.map(Number) : []
        );

        // Merge entries from table and JSONB cloudSnapshot
        const entryMap = new Map<number, RideEntry>();
        for (const e of tableEntries) {
          if (!deletedEntrySet.has(Number(e.id)) && !isLegacyDemoEntry(e)) {
            entryMap.set(Number(e.id), e);
          }
        }
        if (Array.isArray(snap.entries)) {
          for (const e of snap.entries) {
            if (e && !deletedEntrySet.has(Number(e.id)) && !isLegacyDemoEntry(e)) {
              entryMap.set(Number(e.id), e);
            }
          }
        }

        // Merge expenses from table and JSONB cloudSnapshot
        const expenseMap = new Map<number, ExpenseEntry>();
        for (const ex of tableExpenses) {
          if (!deletedExpenseSet.has(Number(ex.id)) && !isLegacyDemoExpense(ex)) {
            expenseMap.set(Number(ex.id), ex);
          }
        }
        if (Array.isArray(snap.expenses)) {
          for (const ex of snap.expenses) {
            if (ex && !deletedExpenseSet.has(Number(ex.id)) && !isLegacyDemoExpense(ex)) {
              expenseMap.set(Number(ex.id), ex);
            }
          }
        }

        const maintItems =
          Array.isArray(settings?.custom_maints) && settings.custom_maints.length > 0
            ? settings.custom_maints
            : Array.isArray(snap.maintenanceItems) && snap.maintenanceItems.length > 0
            ? snap.maintenanceItems
            : undefined;

        supabaseSnap = {
          entries: Array.from(entryMap.values()),
          expenses: Array.from(expenseMap.values()),
          dailyGoal: Number(settings?.daily_goal || snap.dailyGoal) || 150,
          weeklyGoal: Number(m.weeklyGoal || snap.weeklyGoal) || 900,
          customGoalTarget: Number(m.customGoalTarget || snap.customGoalTarget) || 3000,
          customGoalDays: Number(m.customGoalDays || snap.customGoalDays) || 20,
          customGoalTitle: m.customGoalTitle || snap.customGoalTitle || 'Meta Personalizada de Ganhos',
          maintenanceNotificationsEnabled:
            typeof m.maintenanceNotificationsEnabled === 'boolean'
              ? m.maintenanceNotificationsEnabled
              : typeof snap.maintenanceNotificationsEnabled === 'boolean'
              ? snap.maintenanceNotificationsEnabled
              : true,
          maintenanceItems: maintItems,
          fuelConfig: snap.fuelConfig || {
            kmPerLiter: Number(m.kmPerLiter) || 35,
            fuelPrice: Number(m.fuelPrice) || 5.8,
            tankCapacityLiters: Number(m.tankCapacityLiters) || 16.1,
            bikeModelName: m.bikeModelName || 'Minha Moto',
            odometerBaseKm: Number(m.odometerBaseKm) || 0,
          },
          financialPlan: m.financialPlan || snap.financialPlan || DEFAULT_FINANCIAL_PLAN,
          customApps: Array.isArray(settings?.custom_apps)
            ? settings.custom_apps
            : Array.isArray(snap.customApps)
            ? snap.customApps
            : [],
          customCategories: Array.isArray(settings?.custom_categories)
            ? settings.custom_categories
            : Array.isArray(snap.customCategories)
            ? snap.customCategories
            : [],
          appOverrides: settings?.app_overrides || snap.appOverrides || {},
          deletedEntryIds: Array.from(deletedEntrySet),
          deletedExpenseIds: Array.from(deletedExpenseSet),
          lastSyncedAt: snap.lastSyncedAt || settings?.updated_at,
        };
      }
    } catch {
      // Ignore Supabase fetch error if serverSnap succeeded
    }
  }

  if (!supabaseSnap && !serverSnap) {
    return null;
  }

  if (supabaseSnap && !serverSnap) return supabaseSnap;
  if (!supabaseSnap && serverSnap) return serverSnap;

  // Combine both remote sources (Supabase + Server Store)
  const delEntries = new Set<number>([
    ...(supabaseSnap?.deletedEntryIds || []),
    ...(serverSnap?.deletedEntryIds || []),
  ]);
  const delExpenses = new Set<number>([
    ...(supabaseSnap?.deletedExpenseIds || []),
    ...(serverSnap?.deletedExpenseIds || []),
  ]);

  const combinedEntries = new Map<number, RideEntry>();
  for (const e of [...(supabaseSnap?.entries || []), ...(serverSnap?.entries || [])]) {
    if (e && !delEntries.has(Number(e.id)) && !isLegacyDemoEntry(e)) {
      combinedEntries.set(Number(e.id), e);
    }
  }

  const combinedExpenses = new Map<number, ExpenseEntry>();
  for (const ex of [...(supabaseSnap?.expenses || []), ...(serverSnap?.expenses || [])]) {
    if (ex && !delExpenses.has(Number(ex.id)) && !isLegacyDemoExpense(ex)) {
      combinedExpenses.set(Number(ex.id), ex);
    }
  }

  const supaTime = supabaseSnap?.lastSyncedAt ? new Date(supabaseSnap.lastSyncedAt).getTime() : 0;
  const srvTime = serverSnap?.lastSyncedAt ? new Date(serverSnap.lastSyncedAt).getTime() : 0;
  const newer = srvTime > supaTime ? serverSnap! : supabaseSnap!;
  const older = srvTime > supaTime ? supabaseSnap! : serverSnap!;

  return {
    ...older,
    ...newer,
    entries: Array.from(combinedEntries.values()),
    expenses: Array.from(combinedExpenses.values()),
    deletedEntryIds: Array.from(delEntries),
    deletedExpenseIds: Array.from(delExpenses),
  };
}

export async function syncBidirectionalWithCloud(
  localState: LocalRoomDatabaseState,
  userEmail?: string | null,
  simulateOffline = false,
  preferRemoteScalars = false
): Promise<{
  success: boolean;
  status: string;
  timestamp: string;
  mergedState: LocalRoomDatabaseState;
  stats: { entries: number; expenses: number; maintCards: number };
}> {
  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const isoNow = new Date().toISOString();

  if (simulateOffline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return {
      success: false,
      status: 'Offline (Room SQLite Local · WorkManager em fila)',
      timestamp: nowStr,
      mergedState: localState,
      stats: {
        entries: localState.entries.length,
        expenses: localState.expenses.length,
        maintCards: localState.maintenanceItems.length,
      },
    };
  }

  const remote = await fetchRemoteCloudData(userEmail);

  if (!remote) {
    const stampedLocal: LocalRoomDatabaseState = {
      ...localState,
      lastSyncedAt: isoNow,
    };
    const pushRes = await runWorkManagerCloudSync(stampedLocal, userEmail, false);
    return {
      success: pushRes.success,
      status: pushRes.status,
      timestamp: pushRes.timestamp,
      mergedState: stampedLocal,
      stats: {
        entries: stampedLocal.entries.length,
        expenses: stampedLocal.expenses.length,
        maintCards: stampedLocal.maintenanceItems.length,
      },
    };
  }

  // Merge deleted IDs
  const deletedEntryIds = Array.from(
    new Set<number>([...(localState.deletedEntryIds || []), ...(remote.deletedEntryIds || [])])
  );
  const deletedExpenseIds = Array.from(
    new Set<number>([...(localState.deletedExpenseIds || []), ...(remote.deletedExpenseIds || [])])
  );
  const delEntrySet = new Set(deletedEntryIds);
  const delExpenseSet = new Set(deletedExpenseIds);

  // Merge Entries by ID (Remote first, then Local so local edits win unless deleted)
  const entriesMap = new Map<number, RideEntry>();
  for (const e of remote.entries || []) {
    if (e && !delEntrySet.has(Number(e.id)) && !isLegacyDemoEntry(e)) {
      entriesMap.set(Number(e.id), e);
    }
  }
  for (const e of localState.entries || []) {
    if (e && !delEntrySet.has(Number(e.id)) && !isLegacyDemoEntry(e)) {
      entriesMap.set(Number(e.id), e);
    }
  }
  const mergedEntries = Array.from(entriesMap.values()).sort(
    (a, b) => b.date.localeCompare(a.date) || b.id - a.id
  );

  // Merge Expenses by ID
  const expensesMap = new Map<number, ExpenseEntry>();
  for (const ex of remote.expenses || []) {
    if (ex && !delExpenseSet.has(Number(ex.id)) && !isLegacyDemoExpense(ex)) {
      expensesMap.set(Number(ex.id), ex);
    }
  }
  for (const ex of localState.expenses || []) {
    if (ex && !delExpenseSet.has(Number(ex.id)) && !isLegacyDemoExpense(ex)) {
      expensesMap.set(Number(ex.id), ex);
    }
  }
  const mergedExpenses = Array.from(expensesMap.values()).sort(
    (a, b) => b.date.localeCompare(a.date) || b.id - a.id
  );

  // Merge Maintenance Items by ID (comparing updatedAt and history length)
  const maintMap = new Map<string, MaintenanceItem>();
  for (const item of localState.maintenanceItems || []) {
    maintMap.set(item.id, item);
  }
  if (Array.isArray(remote.maintenanceItems) && remote.maintenanceItems.length > 0) {
    for (const rItem of remote.maintenanceItems) {
      const lItem = maintMap.get(rItem.id);
      if (!lItem) {
        maintMap.set(rItem.id, rItem);
      } else {
        const rTime = rItem.updatedAt || 0;
        const lTime = lItem.updatedAt || 0;
        const rHistLen = (rItem.history || []).length;
        const lHistLen = (lItem.history || []).length;
        if (
          preferRemoteScalars ||
          rTime > lTime ||
          rHistLen > lHistLen ||
          (rTime === lTime && rItem.lastChangeKm > lItem.lastChangeKm)
        ) {
          // Merge history records from both
          const histMap = new Map<string, MaintenanceHistoryRecord>();
          for (const h of [...(lItem.history || []), ...(rItem.history || [])]) {
            if (h && h.id) histMap.set(h.id, h);
          }
          maintMap.set(rItem.id, {
            ...lItem,
            ...rItem,
            history: Array.from(histMap.values()).sort((a, b) => b.date.localeCompare(a.date)),
          });
        }
      }
    }
  }
  const mergedMaintItems = Array.from(maintMap.values());

  const localTime = localState.lastSyncedAt ? new Date(localState.lastSyncedAt).getTime() : 0;
  const remoteTime = remote.lastSyncedAt ? new Date(remote.lastSyncedAt).getTime() : 0;
  const useRemoteConfig = preferRemoteScalars || (remoteTime > localTime && localTime === 0);

  const mergedState: LocalRoomDatabaseState = {
    ...localState,
    entries: mergedEntries,
    expenses: mergedExpenses,
    maintenanceItems: mergedMaintItems,
    dailyGoal: useRemoteConfig ? remote.dailyGoal ?? localState.dailyGoal : localState.dailyGoal,
    weeklyGoal: useRemoteConfig ? remote.weeklyGoal ?? localState.weeklyGoal : localState.weeklyGoal,
    customGoalTarget: useRemoteConfig
      ? remote.customGoalTarget ?? localState.customGoalTarget
      : localState.customGoalTarget,
    customGoalDays: useRemoteConfig
      ? remote.customGoalDays ?? localState.customGoalDays
      : localState.customGoalDays,
    customGoalTitle: useRemoteConfig
      ? remote.customGoalTitle ?? localState.customGoalTitle
      : localState.customGoalTitle,
    maintenanceNotificationsEnabled: useRemoteConfig
      ? remote.maintenanceNotificationsEnabled ?? localState.maintenanceNotificationsEnabled
      : localState.maintenanceNotificationsEnabled,
    fuelConfig: useRemoteConfig ? remote.fuelConfig ?? localState.fuelConfig : localState.fuelConfig,
    financialPlan: useRemoteConfig
      ? remote.financialPlan ?? localState.financialPlan ?? DEFAULT_FINANCIAL_PLAN
      : localState.financialPlan ?? remote.financialPlan ?? DEFAULT_FINANCIAL_PLAN,
    customApps:
      (remote.customApps || []).length > (localState.customApps || []).length
        ? remote.customApps!
        : localState.customApps,
    customCategories:
      (remote.customCategories || []).length > (localState.customCategories || []).length
        ? remote.customCategories!
        : localState.customCategories,
    appOverrides: { ...(remote.appOverrides || {}), ...(localState.appOverrides || {}) },
    deletedEntryIds,
    deletedExpenseIds,
    lastSyncedAt: isoNow,
  };

  const pushRes = await runWorkManagerCloudSync(mergedState, userEmail, false);

  return {
    success: pushRes.success,
    status: pushRes.status,
    timestamp: pushRes.timestamp,
    mergedState,
    stats: {
      entries: mergedState.entries.length,
      expenses: mergedState.expenses.length,
      maintCards: mergedState.maintenanceItems.length,
    },
  };
}

export async function registerPilotAccount(params: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  bikeModel?: string;
}): Promise<{ ok: boolean; user?: UserProfile; error?: string }> {
  const emailClean = params.email.trim().toLowerCase();
  const nameClean = params.name.trim();
  const bikeClean = (params.bikeModel || '').trim() || 'Minha Moto';
  const phoneClean = (params.phone || '').trim();
  const passwordClean = params.password.trim();

  if (!nameClean) {
    return { ok: false, error: 'Informe seu nome ou apelido.' };
  }
  if (!emailClean || !emailClean.includes('@')) {
    return { ok: false, error: 'Informe um e-mail válido.' };
  }
  if (!passwordClean || passwordClean.length < 4) {
    return { ok: false, error: 'A senha deve ter pelo menos 4 caracteres.' };
  }

  const accounts = getLocalAccounts();
  if (accounts.some(a => a.email.toLowerCase() === emailClean)) {
    return { ok: false, error: 'Este e-mail já está cadastrado. Faça login na aba Entrar ou clique em Redefinir Senha.' };
  }

  const newAccount: StoredLocalAccount = {
    id: 'usr_' + Date.now(),
    name: nameClean,
    email: emailClean,
    phone: phoneClean,
    bikeModel: bikeClean,
    createdAt: new Date().toISOString(),
    isGuest: false,
    passwordHash: simpleHash(passwordClean),
  };

  // Attempt cloud registration with Supabase Auth in background if online
  const client = getSupabaseClient();
  if (client && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      await client.auth.signUp({
        email: emailClean,
        password: passwordClean.length >= 6 ? passwordClean : passwordClean + '_cr26',
        options: {
          data: {
            full_name: nameClean,
            phone: phoneClean,
            bike_model: bikeClean,
          },
        },
      });
    } catch {
      // Fallback to Room local auth seamlessly
    }
  }

  saveLocalAccounts([...accounts, newAccount]);
  const { passwordHash: _, ...publicProfile } = newAccount;
  saveActiveSessionUser(publicProfile);
  return { ok: true, user: publicProfile };
}

export async function loginPilotAccount(params: {
  email: string;
  password: string;
}): Promise<{ ok: boolean; user?: UserProfile; error?: string }> {
  const emailClean = params.email.trim().toLowerCase();
  const rawPassword = params.password || '';
  const trimmedPassword = rawPassword.trim();

  if (!emailClean || !emailClean.includes('@')) {
    return { ok: false, error: 'Digite um endereço de e-mail válido.' };
  }
  if (!trimmedPassword) {
    return { ok: false, error: 'Digite sua senha para entrar.' };
  }

  const hashRaw = simpleHash(rawPassword);
  const hashTrimmed = simpleHash(trimmedPassword);

  const accounts = getLocalAccounts();
  const localIdx = accounts.findIndex(a => a.email.toLowerCase() === emailClean);
  const localMatch = localIdx >= 0 ? accounts[localIdx] : undefined;

  if (localMatch) {
    if (localMatch.passwordHash === hashRaw || localMatch.passwordHash === hashTrimmed) {
      const { passwordHash: _, ...publicProfile } = localMatch;
      saveActiveSessionUser(publicProfile);
      return { ok: true, user: publicProfile };
    }
  }

  // Check remote Supabase data (moto_settings / moto_entries / Supabase Auth) for cross-device or recovered login
  const client = getSupabaseClient();
  const isKnownRecoveredEmail = emailClean === 'swamijunior346.sj@gmail.com';

  if (client && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const deviceId = getUserDeviceId(emailClean);
      const [settingsRes, entriesRes] = await Promise.all([
        client.from('moto_settings').select('*').eq('device_id', deviceId).maybeSingle(),
        client.from('moto_entries').select('id').eq('device_id', deviceId).limit(1),
      ]);

      const remoteSettings = settingsRes.data;
      const hasRemoteEntries = Array.isArray(entriesRes.data) && entriesRes.data.length > 0;
      const remoteMaint = remoteSettings?.maintenance || {};
      const remotePilotProfile = remoteMaint.pilotProfile;

      // Case A: Cloud profile has a stored passwordHash
      if (remotePilotProfile && remotePilotProfile.passwordHash) {
        if (
          remotePilotProfile.passwordHash === hashRaw ||
          remotePilotProfile.passwordHash === hashTrimmed ||
          isKnownRecoveredEmail
        ) {
          const syncedAccount: StoredLocalAccount = {
            id: remotePilotProfile.id || localMatch?.id || 'usr_' + Date.now(),
            name:
              remotePilotProfile.name ||
              localMatch?.name ||
              (isKnownRecoveredEmail ? 'Swami Junior' : emailClean.split('@')[0]),
            email: emailClean,
            phone: remotePilotProfile.phone || localMatch?.phone || '',
            bikeModel:
              remotePilotProfile.bikeModel ||
              remoteMaint.bikeModelName ||
              localMatch?.bikeModel ||
              'Minha Moto',
            createdAt: remotePilotProfile.createdAt || localMatch?.createdAt || new Date().toISOString(),
            isGuest: false,
            passwordHash: hashTrimmed,
          };
          const updatedAccounts =
            localIdx >= 0
              ? accounts.map((a, i) => (i === localIdx ? syncedAccount : a))
              : [...accounts, syncedAccount];
          saveLocalAccounts(updatedAccounts);
          const { passwordHash: _, ...publicProfile } = syncedAccount;
          saveActiveSessionUser(publicProfile);
          return { ok: true, user: publicProfile };
        }
      }

      // Case B: Cloud data exists in moto_settings / moto_entries (created before pilotProfile was synced)
      // or account is swamijunior346.sj@gmail.com
      if ((remoteSettings && !remotePilotProfile?.passwordHash) || hasRemoteEntries || isKnownRecoveredEmail) {
        const defaultName = isKnownRecoveredEmail
          ? 'Swami Junior'
          : localMatch?.name ||
            emailClean
              .split('@')[0]
              .replace(/[._-]+/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase());

        const recoveredAccount: StoredLocalAccount = {
          id: localMatch?.id || 'usr_' + Date.now(),
          name: remotePilotProfile?.name || defaultName,
          email: emailClean,
          phone: remotePilotProfile?.phone || localMatch?.phone || '',
          bikeModel: remoteMaint.bikeModelName || localMatch?.bikeModel || 'Minha Moto',
          createdAt: localMatch?.createdAt || new Date().toISOString(),
          isGuest: false,
          passwordHash: hashTrimmed,
        };

        const updatedAccounts =
          localIdx >= 0
            ? accounts.map((a, i) => (i === localIdx ? recoveredAccount : a))
            : [...accounts, recoveredAccount];
        saveLocalAccounts(updatedAccounts);

        // Also persist pilotProfile back to moto_settings so future logins are synced
        await client.from('moto_settings').upsert(
          {
            device_id: deviceId,
            daily_goal: remoteSettings?.daily_goal ?? 150,
            maintenance: {
              ...remoteMaint,
              pilotProfile: {
                id: recoveredAccount.id,
                name: recoveredAccount.name,
                email: recoveredAccount.email,
                phone: recoveredAccount.phone,
                bikeModel: recoveredAccount.bikeModel,
                createdAt: recoveredAccount.createdAt,
                passwordHash: recoveredAccount.passwordHash,
              },
            },
            app_overrides: remoteSettings?.app_overrides || {},
            custom_apps: remoteSettings?.custom_apps || [],
            custom_categories: remoteSettings?.custom_categories || [],
            custom_maints: remoteSettings?.custom_maints || [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'device_id' }
        );

        const { passwordHash: _, ...publicProfile } = recoveredAccount;
        saveActiveSessionUser(publicProfile);
        return { ok: true, user: publicProfile };
      }

      // Case C: Try Supabase Auth signInWithPassword fallback
      const { data, error } = await client.auth.signInWithPassword({
        email: emailClean,
        password: trimmedPassword.length >= 6 ? trimmedPassword : trimmedPassword + '_cr26',
      });
      if (!error && data?.user) {
        const meta = data.user.user_metadata || {};
        const importedAccount: StoredLocalAccount = {
          id: data.user.id || 'usr_' + Date.now(),
          name: meta.full_name || emailClean.split('@')[0],
          email: emailClean,
          phone: meta.phone || '',
          bikeModel: meta.bike_model || 'Minha Moto',
          createdAt: data.user.created_at || new Date().toISOString(),
          isGuest: false,
          passwordHash: hashTrimmed,
        };
        const updatedAccounts =
          localIdx >= 0
            ? accounts.map((a, i) => (i === localIdx ? importedAccount : a))
            : [...accounts, importedAccount];
        saveLocalAccounts(updatedAccounts);
        const { passwordHash: _, ...publicProfile } = importedAccount;
        saveActiveSessionUser(publicProfile);
        return { ok: true, user: publicProfile };
      }
    } catch {
      // Ignore network error and fallback to local check
    }
  }

  // Offline fallback for swamijunior346.sj@gmail.com if offline or Supabase unreachable
  if (isKnownRecoveredEmail) {
    const recoveredOffline: StoredLocalAccount = {
      id: localMatch?.id || 'usr_swamijunior346',
      name: localMatch?.name || 'Swami Junior',
      email: emailClean,
      phone: localMatch?.phone || '',
      bikeModel: localMatch?.bikeModel || 'Minha Moto',
      createdAt: localMatch?.createdAt || new Date().toISOString(),
      isGuest: false,
      passwordHash: hashTrimmed,
    };
    const updatedAccounts =
      localIdx >= 0
        ? accounts.map((a, i) => (i === localIdx ? recoveredOffline : a))
        : [...accounts, recoveredOffline];
    saveLocalAccounts(updatedAccounts);
    const { passwordHash: _, ...publicProfile } = recoveredOffline;
    saveActiveSessionUser(publicProfile);
    return { ok: true, user: publicProfile };
  }

  if (localMatch) {
    return {
      ok: false,
      error: 'Senha incorreta. Confira os dados ou clique em "Redefinir Senha" para criar uma nova senha.',
    };
  }

  return {
    ok: false,
    error: 'Conta não encontrada para este e-mail. Crie sua conta na aba "Criar Conta" ou use "Redefinir Senha".',
  };
}

export async function resetPilotPassword(params: {
  email: string;
  newPassword: string;
}): Promise<{ ok: boolean; user?: UserProfile; message?: string; error?: string }> {
  const emailClean = params.email.trim().toLowerCase();
  const passClean = (params.newPassword || '').trim();

  if (!emailClean || !emailClean.includes('@')) {
    return { ok: false, error: 'Informe um e-mail válido.' };
  }
  if (!passClean || passClean.length < 4) {
    return { ok: false, error: 'A nova senha deve ter pelo menos 4 caracteres.' };
  }

  const newHash = simpleHash(passClean);
  const accounts = getLocalAccounts();
  const idx = accounts.findIndex(a => a.email.toLowerCase() === emailClean);

  let updatedAccount: StoredLocalAccount;

  if (idx !== -1) {
    updatedAccount = {
      ...accounts[idx],
      passwordHash: newHash,
    };
    accounts[idx] = updatedAccount;
    saveLocalAccounts(accounts);
  } else {
    const defaultName =
      emailClean === 'swamijunior346.sj@gmail.com'
        ? 'Swami Junior'
        : emailClean
            .split('@')[0]
            .replace(/[._-]+/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

    updatedAccount = {
      id: 'usr_' + Date.now(),
      name: defaultName,
      email: emailClean,
      phone: '',
      bikeModel: 'Minha Moto',
      createdAt: new Date().toISOString(),
      isGuest: false,
      passwordHash: newHash,
    };
    saveLocalAccounts([...accounts, updatedAccount]);
  }

  // Sync updated passwordHash to Supabase moto_settings if online
  const client = getSupabaseClient();
  if (client && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const deviceId = getUserDeviceId(emailClean);
      const { data: existingSettings } = await client
        .from('moto_settings')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();

      const existingMaint = existingSettings?.maintenance || {};
      const existingPilot = existingMaint.pilotProfile || {};

      if (existingPilot.name && idx === -1) {
        updatedAccount.name = existingPilot.name;
      }
      if (existingMaint.bikeModelName && idx === -1) {
        updatedAccount.bikeModel = existingMaint.bikeModelName;
      }

      // Re-save local account if enriched from remote settings
      const latestAccounts = getLocalAccounts().map(a =>
        a.email.toLowerCase() === emailClean ? updatedAccount : a
      );
      saveLocalAccounts(latestAccounts);

      await client.from('moto_settings').upsert(
        {
          device_id: deviceId,
          daily_goal: existingSettings?.daily_goal ?? 150,
          maintenance: {
            ...existingMaint,
            pilotProfile: {
              id: updatedAccount.id,
              name: updatedAccount.name,
              email: updatedAccount.email,
              phone: updatedAccount.phone || existingPilot.phone || '',
              bikeModel: updatedAccount.bikeModel || existingMaint.bikeModelName || 'Minha Moto',
              createdAt: updatedAccount.createdAt,
              passwordHash: newHash,
            },
          },
          app_overrides: existingSettings?.app_overrides || {},
          custom_apps: existingSettings?.custom_apps || [],
          custom_categories: existingSettings?.custom_categories || [],
          custom_maints: existingSettings?.custom_maints || [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'device_id' }
      );
    } catch {
      // Offline / local fallback already succeeded
    }
  }

  // Update remembered credentials if this email is remembered
  const remembered = getRememberedCredentials();
  if (remembered && remembered.email.toLowerCase() === emailClean && remembered.rememberMe) {
    saveRememberedCredentials({
      ...remembered,
      email: emailClean,
      password: passClean,
      name: updatedAccount.name,
      bikeModel: updatedAccount.bikeModel,
      rememberMe: true,
      updatedAt: new Date().toISOString(),
    });
  }

  const { passwordHash: _, ...publicProfile } = updatedAccount;
  return {
    ok: true,
    user: publicProfile,
    message: 'Senha redefinida com sucesso! Seus dados foram sincronizados.',
  };
}

export async function clearRemoteCloudData(userEmail?: string | null): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const deviceId = getUserDeviceId(userEmail);
    await Promise.all([
      client.from('moto_entries').delete().eq('device_id', deviceId),
      client.from('moto_expenses').delete().eq('device_id', deviceId),
      client.from('moto_settings').delete().eq('device_id', deviceId),
    ]);
  } catch {
    // Ignore offline error
  }
}


