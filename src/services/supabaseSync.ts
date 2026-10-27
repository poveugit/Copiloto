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

export function getCandidateDeviceIds(userEmail?: string | null): string[] {
  const ids = new Set<string>();
  const primary = getUserDeviceId(userEmail);
  ids.add(primary);

  if (userEmail) {
    const clean = userEmail.trim().toLowerCase();
    ids.add(clean);
    ids.add('usr_' + clean.replace(/[^a-z0-9_.-]/g, '_'));
    ids.add('usr_' + clean.replace(/[^a-z0-9]/g, '_'));
  }

  try {
    const storedGuestId = localStorage.getItem('moto-dash-device-id');
    if (storedGuestId) ids.add(storedGuestId);
  } catch {
    // ignore
  }

  return Array.from(ids).filter(Boolean);
}

const CLOUD_SYNC_ENDPOINTS = [
  '',
  'https://ais-dev-rztjkqzidbnnsie2ngbp3l-559814617776.us-west2.run.app',
  'https://ais-pre-rztjkqzidbnnsie2ngbp3l-559814617776.us-west2.run.app',
];

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 2500
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = 2500, fallbackValue: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>(resolve => {
    timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } catch {
    return fallbackValue;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function getBrowserRelayTopic(deviceId: string): string {
  const clean = deviceId.trim().toLowerCase().replace(/^usr_/, '');
  return `mochilinha_b_${simpleHash('mochilinha_v3_' + clean)}`;
}

function hasPopulatedData(state?: Partial<LocalRoomDatabaseState> | null): boolean {
  if (!state) return false;
  const eLen = Array.isArray(state.entries) ? state.entries.length : 0;
  const xLen = Array.isArray(state.expenses) ? state.expenses.length : 0;
  const odo = Number(state.fuelConfig?.odometerBaseKm || 0);
  const customBike =
    state.fuelConfig?.bikeModelName &&
    state.fuelConfig.bikeModelName !== 'Minha Moto';
  const hasMaintChanges =
    Array.isArray(state.maintenanceItems) &&
    state.maintenanceItems.some(
      m => Number(m.lastChangeKm) > 0 || (Array.isArray(m.history) && m.history.length > 0)
    );
  return eLen > 0 || xLen > 0 || odo > 0 || Boolean(customBike) || Boolean(hasMaintChanges);
}

export async function runWorkManagerCloudSync(
  state: LocalRoomDatabaseState,
  userEmail?: string | null,
  simulateOffline = false,
  explicitPush = false
): Promise<{ success: boolean; status: string; timestamp: string }> {
  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const isoNow = new Date().toISOString();

  if (simulateOffline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return {
      success: false,
      status: 'Offline (Salvo no banco local)',
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

  const cloudSnapshot: LocalRoomDatabaseState = {
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
    lastSyncedAt: isoNow,
  };

  let serverSynced = false;
  let supabaseSynced = false;
  let browserRelaySynced = false;

  // 1. Push to Express / Serverless Cloud Store across active endpoints
  const payloadStr = JSON.stringify({
    deviceId,
    state: cloudSnapshot,
    pilotProfile: pilotProfileObj,
    explicitPush,
  });

  await Promise.all(
    CLOUD_SYNC_ENDPOINTS.map(async baseUrl => {
      try {
        if (
          baseUrl &&
          typeof window !== 'undefined' &&
          window.location.origin === baseUrl
        ) {
          return;
        }
        const serverRes = await fetchWithTimeout(
          `${baseUrl}/api/cloud-sync/push`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payloadStr,
          },
          3000
        );
        if (serverRes.ok) {
          serverSynced = true;
        }
      } catch {
        // Ignore if endpoint unreachable
      }
    })
  );

  // 2. Direct Browser Relay Backup on explicit push (bridges static/serverless deployments)
  if (explicitPush) {
    try {
      const bTopic = getBrowserRelayTopic(deviceId);
      const recordStr = JSON.stringify({
        state: cloudSnapshot,
        pilotProfile: pilotProfileObj,
        updatedAt: isoNow,
      });
      if (recordStr.length < 3800) {
        const bRes = await fetchWithTimeout(
          `https://ntfy.sh/${bTopic}`,
          {
            method: 'POST',
            body: recordStr,
          },
          3000
        );
        if (bRes.ok) browserRelaySynced = true;
      } else {
        const putRes = await fetchWithTimeout(
          `https://ntfy.sh/${bTopic}_blob`,
          {
            method: 'PUT',
            headers: { Filename: 'mochilinha_state.json' },
            body: recordStr,
          },
          3500
        );
        if (putRes.ok) {
          const putJson = await putRes.json();
          if (putJson?.attachment?.url) {
            const ptrRes = await fetchWithTimeout(
              `https://ntfy.sh/${bTopic}`,
              {
                method: 'POST',
                body: JSON.stringify({ fileUrl: putJson.attachment.url, updatedAt: isoNow }),
              },
              3000
            );
            if (ptrRes.ok) browserRelaySynced = true;
          }
        }
      }
    } catch {
      // Ignore browser relay error
    }
  }

  // 3. Push to Supabase (moto_settings + moto_entries + moto_expenses)
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
        const entriesWithTs = cleanEntries.map(e => ({
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
        const { error: entErr } = await client
          .from('moto_entries')
          .upsert(entriesWithTs, { onConflict: 'id' });
        if (entErr) {
          const entriesCore = cleanEntries.map(e => ({
            id: String(e.id),
            device_id: deviceId,
            entry_date: e.date,
            app: e.app,
            shift: e.shift || 'almoco',
            km: Number(e.km || 0),
            revenue: Number(e.revenue || 0),
            hours: Number(e.hours || 0),
          }));
          await client.from('moto_entries').upsert(entriesCore, { onConflict: 'id' });
        }
      }

      if (cleanExpenses.length > 0) {
        const expensesWithTs = cleanExpenses.map(e => ({
          id: String(e.id),
          device_id: deviceId,
          expense_date: e.date,
          category: e.category,
          amount: Number(e.amount || 0),
          updated_at: isoNow,
        }));
        const { error: expErr } = await client
          .from('moto_expenses')
          .upsert(expensesWithTs, { onConflict: 'id' });
        if (expErr) {
          const expensesCore = cleanExpenses.map(e => ({
            id: String(e.id),
            device_id: deviceId,
            expense_date: e.date,
            category: e.category,
            amount: Number(e.amount || 0),
          }));
          await client.from('moto_expenses').upsert(expensesCore, { onConflict: 'id' });
        }
      }
    } catch {
      // Handled by serverSynced / browserRelaySynced
    }
  }

  if (supabaseSynced || serverSynced || browserRelaySynced) {
    return {
      success: true,
      status: 'Sincronizado na Nuvem',
      timestamp: nowStr,
    };
  }

  return {
    success: false,
    status: 'Salvo no Dispositivo Local',
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

function combineSnapshotsList(
  snapshots: Array<Partial<LocalRoomDatabaseState> | null>
): Partial<LocalRoomDatabaseState> | null {
  const valid = snapshots.filter((s): s is Partial<LocalRoomDatabaseState> => Boolean(s));
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0];

  const delEntries = new Set<number>();
  const delExpenses = new Set<number>();
  for (const s of valid) {
    for (const id of s.deletedEntryIds || []) delEntries.add(Number(id));
    for (const id of s.deletedExpenseIds || []) delExpenses.add(Number(id));
  }

  const combinedEntries = new Map<number, RideEntry>();
  const combinedExpenses = new Map<number, ExpenseEntry>();

  for (const s of valid) {
    for (const e of s.entries || []) {
      if (e && !delEntries.has(Number(e.id)) && !isLegacyDemoEntry(e)) {
        combinedEntries.set(Number(e.id), e);
      }
    }
    for (const ex of s.expenses || []) {
      if (ex && !delExpenses.has(Number(ex.id)) && !isLegacyDemoExpense(ex)) {
        combinedExpenses.set(Number(ex.id), ex);
      }
    }
  }

  // Sort snapshots so the most populated / most recently updated wins for scalar configs
  const sorted = [...valid].sort((a, b) => {
    const aPop = hasPopulatedData(a) ? 1 : 0;
    const bPop = hasPopulatedData(b) ? 1 : 0;
    if (aPop !== bPop) return bPop - aPop;
    const aOdo = Number(a.fuelConfig?.odometerBaseKm || 0);
    const bOdo = Number(b.fuelConfig?.odometerBaseKm || 0);
    if (aOdo !== bOdo && (aOdo === 0 || bOdo === 0)) return bOdo - aOdo;
    const aTime = a.lastSyncedAt ? new Date(a.lastSyncedAt).getTime() : 0;
    const bTime = b.lastSyncedAt ? new Date(b.lastSyncedAt).getTime() : 0;
    return bTime - aTime;
  });

  const best = sorted[0];

  return {
    ...best,
    entries: Array.from(combinedEntries.values()),
    expenses: Array.from(combinedExpenses.values()),
    deletedEntryIds: Array.from(delEntries),
    deletedExpenseIds: Array.from(delExpenses),
  };
}

export async function fetchRemoteCloudData(
  userEmail?: string | null
): Promise<Partial<LocalRoomDatabaseState> | null> {
  if (!userEmail) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

  const deviceId = getUserDeviceId(userEmail);
  const candidateIds = getCandidateDeviceIds(userEmail);
  const emailClean = userEmail.trim().toLowerCase();
  const collectedSnapshots: Array<Partial<LocalRoomDatabaseState> | null> = [];

  // Run Cloud Store, Browser Relay, and Supabase fetches in parallel with strict timeouts
  const fetchFromEndpoints = Promise.all(
    CLOUD_SYNC_ENDPOINTS.map(async baseUrl => {
      try {
        if (
          baseUrl &&
          typeof window !== 'undefined' &&
          window.location.origin === baseUrl
        ) {
          return;
        }
        const res = await fetchWithTimeout(
          `${baseUrl}/api/cloud-sync/pull?deviceId=${encodeURIComponent(deviceId)}&email=${encodeURIComponent(emailClean)}`,
          {},
          2500
        );
        if (res.ok) {
          const json = await res.json();
          if (json?.ok && json?.data?.state) {
            collectedSnapshots.push(json.data.state);
          }
        }
      } catch {
        // Ignore if endpoint unavailable
      }
    })
  );

  const fetchFromRelay = (async () => {
    try {
      const bTopic = getBrowserRelayTopic(deviceId);
      const bRes = await fetchWithTimeout(`https://ntfy.sh/${bTopic}/json?poll=1&since=all`, {}, 2200);
      if (bRes.ok) {
        const text = (await bRes.text()).trim();
        if (text) {
          const lines = text.split('\n').filter(Boolean);
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              const evt = JSON.parse(lines[i]);
              if (evt.event !== 'message' || !evt.message) continue;
              const parsedMsg = JSON.parse(evt.message);
              if (parsedMsg?.state) {
                collectedSnapshots.push(parsedMsg.state);
                break;
              } else if (parsedMsg?.fileUrl) {
                const fRes = await fetchWithTimeout(parsedMsg.fileUrl, {}, 2200);
                if (fRes.ok) {
                  const fJson = await fRes.json();
                  if (fJson?.state) {
                    collectedSnapshots.push(fJson.state);
                    break;
                  }
                }
              }
            } catch {
              // continue
            }
          }
        }
      }
    } catch {
      // Ignore browser relay error
    }
  })();

  const fetchFromSupabase = (async () => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const [settingsRes, entriesRes, expensesRes] = await withTimeout(
        Promise.all([
          client.from('moto_settings').select('*').in('device_id', candidateIds),
          client.from('moto_entries').select('*').in('device_id', candidateIds),
          client.from('moto_expenses').select('*').in('device_id', candidateIds),
        ]),
        2500,
        [{ data: null }, { data: null }, { data: null }] as any
      );

      const settingsRows = Array.isArray(settingsRes?.data) ? settingsRes.data : [];
      const rawEntries = Array.isArray(entriesRes?.data) ? entriesRes.data : [];
      const rawExpenses = Array.isArray(expensesRes?.data) ? expensesRes.data : [];

      const settings =
        settingsRows.sort((a: any, b: any) => {
          const tA = a?.updated_at ? new Date(a.updated_at).getTime() : 0;
          const tB = b?.updated_at ? new Date(b.updated_at).getTime() : 0;
          return tB - tA;
        })[0] || null;

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
        if (!isLegacyDemoEntry(mapped)) {
          tableEntries.push(mapped);
        }
      }

      const tableExpenses: ExpenseEntry[] = [];
      for (const row of rawExpenses) {
        const mapped: ExpenseEntry = {
          id: Number(row.id) || Date.now(),
          date: row.expense_date,
          category: row.category,
          amount: Number(row.amount || 0),
        };
        if (!isLegacyDemoExpense(mapped)) {
          tableExpenses.push(mapped);
        }
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

        // Reconstruct maintenance items from custom_maints, cloudSnapshot, or legacy maintenance fields
        let maintItems: MaintenanceItem[] | undefined =
          Array.isArray(settings?.custom_maints) && settings.custom_maints.length > 0
            ? settings.custom_maints
            : Array.isArray(snap.maintenanceItems) && snap.maintenanceItems.length > 0
            ? snap.maintenanceItems
            : undefined;

        if (
          !maintItems &&
          (m.lastOilChangeKm !== undefined ||
            m.lastTireChangeKm !== undefined ||
            m.lastChainChangeKm !== undefined ||
            m.lastBrakeChangeKm !== undefined)
        ) {
          maintItems = [
            {
              id: 'oil',
              name: 'Troca de Óleo',
              icon: '🛢️',
              lastChangeKm: Number(m.lastOilChangeKm) || 0,
              intervalKm: Number(m.oilIntervalKm) || 1000,
              costEstimate: 45,
              notes: 'Óleo 10W30 Semissintético',
              isDefault: true,
              alertThresholdPct: 85,
            },
            {
              id: 'tire',
              name: 'Pneus Dianteiro/Traseiro',
              icon: '🛞',
              lastChangeKm: Number(m.lastTireChangeKm) || 0,
              intervalKm: Number(m.tireIntervalKm) || 10000,
              costEstimate: 520,
              notes: 'Calibrar semanalmente (29/33 PSI)',
              isDefault: true,
              alertThresholdPct: 90,
            },
            {
              id: 'chain',
              name: 'Kit Relação',
              icon: '⚙️',
              lastChangeKm: Number(m.lastChainChangeKm) || 0,
              intervalKm: Number(m.chainIntervalKm) || 8000,
              costEstimate: 210,
              notes: 'Lubrificar corrente a cada 500 km',
              isDefault: true,
              alertThresholdPct: 80,
            },
            {
              id: 'brake',
              name: 'Pastilhas de Freio',
              icon: '🛑',
              lastChangeKm: Number(m.lastBrakeChangeKm) || 0,
              intervalKm: Number(m.brakeIntervalKm) || 5000,
              costEstimate: 75,
              notes: 'Conferir fluído DOT 4 e disco',
              isDefault: true,
              alertThresholdPct: 85,
            },
          ];
        }

        collectedSnapshots.push({
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
          customShifts: Array.isArray(snap.customShifts) ? snap.customShifts : [],
          shiftOverrides: snap.shiftOverrides || {},
          deletedShiftIds: Array.isArray(snap.deletedShiftIds) ? snap.deletedShiftIds : [],
          deletedAppIds: Array.isArray(snap.deletedAppIds) ? snap.deletedAppIds : [],
          deletedEntryIds: Array.from(deletedEntrySet),
          deletedExpenseIds: Array.from(deletedExpenseSet),
          lastSyncedAt: snap.lastSyncedAt || settings?.updated_at,
        });
      }
    } catch {
      // Ignore Supabase fetch error if other cloud sources succeeded
    }
  })();

  await Promise.allSettled([fetchFromEndpoints, fetchFromRelay, fetchFromSupabase]);

  return combineSnapshotsList(collectedSnapshots);
}

/**
 * BOTÃO 1: ENVIAR DADOS PARA A NUVEM (Upload Local -> Cloud)
 * Envia todos os dados locais (corridas, gastos, KM base do odômetro, manutenções, metas e finanças)
 * para a nuvem como a versão principal, mantendo também corridas antigas da nuvem que não foram excluídas.
 */
export async function uploadLocalDataToCloud(
  localState: LocalRoomDatabaseState,
  userEmail?: string | null
): Promise<{
  success: boolean;
  status: string;
  timestamp: string;
  mergedState: LocalRoomDatabaseState;
  stats: { entries: number; expenses: number; maintCards: number; totalKm: number };
}> {
  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const isoNow = new Date().toISOString();

  const remote = await fetchRemoteCloudData(userEmail);

  const deletedEntryIds = Array.from(
    new Set<number>([...(localState.deletedEntryIds || []), ...(remote?.deletedEntryIds || [])])
  );
  const deletedExpenseIds = Array.from(
    new Set<number>([...(localState.deletedExpenseIds || []), ...(remote?.deletedExpenseIds || [])])
  );
  const delEntrySet = new Set(deletedEntryIds);
  const delExpenseSet = new Set(deletedExpenseIds);

  // Preserve remote entries/expenses that aren't deleted, but local entries/expenses override on same ID
  const entriesMap = new Map<number, RideEntry>();
  for (const e of remote?.entries || []) {
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

  const expensesMap = new Map<number, ExpenseEntry>();
  for (const ex of remote?.expenses || []) {
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

  // Local maintenance items and local fuelConfig / goals take priority when sending to cloud
  const stateToPush: LocalRoomDatabaseState = {
    ...localState,
    entries: mergedEntries,
    expenses: mergedExpenses,
    deletedEntryIds,
    deletedExpenseIds,
    lastSyncedAt: isoNow,
  };

  const pushRes = await runWorkManagerCloudSync(stateToPush, userEmail, false, true);
  const ridesKm = stateToPush.entries.reduce((s, e) => s + Number(e.km || 0), 0);
  const totalKm = (Number(stateToPush.fuelConfig?.odometerBaseKm) || 0) + ridesKm;

  return {
    success: pushRes.success,
    status: pushRes.status,
    timestamp: pushRes.timestamp || nowStr,
    mergedState: stateToPush,
    stats: {
      entries: stateToPush.entries.length,
      expenses: stateToPush.expenses.length,
      maintCards: stateToPush.maintenanceItems.length,
      totalKm,
    },
  };
}

/**
 * BOTÃO 2: BAIXAR / SINCRONIZAR DA NUVEM (Download Cloud -> Local)
 * Baixa todos os dados salvos na nuvem (corridas, gastos, KM já rodados/odômetro, modelo da moto,
 * cards de manutenção, histórico de trocas, metas e planejamento financeiro) e atualiza o dispositivo local.
 */
export async function downloadCloudDataToLocal(
  localState: LocalRoomDatabaseState,
  userEmail?: string | null
): Promise<{
  success: boolean;
  foundRemoteData: boolean;
  status: string;
  timestamp: string;
  mergedState: LocalRoomDatabaseState;
  stats: { entries: number; expenses: number; maintCards: number; totalKm: number };
}> {
  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const isoNow = new Date().toISOString();

  const remote = await fetchRemoteCloudData(userEmail);

  if (!remote || (!hasPopulatedData(remote) && (remote.entries || []).length === 0 && (remote.expenses || []).length === 0)) {
    const ridesKm = localState.entries.reduce((s, e) => s + Number(e.km || 0), 0);
    const totalKm = (Number(localState.fuelConfig?.odometerBaseKm) || 0) + ridesKm;
    return {
      success: false,
      foundRemoteData: false,
      status: 'Nenhum dado encontrado na nuvem ainda',
      timestamp: nowStr,
      mergedState: localState,
      stats: {
        entries: localState.entries.length,
        expenses: localState.expenses.length,
        maintCards: localState.maintenanceItems.length,
        totalKm,
      },
    };
  }

  const deletedEntryIds = Array.from(
    new Set<number>([...(localState.deletedEntryIds || []), ...(remote.deletedEntryIds || [])])
  );
  const deletedExpenseIds = Array.from(
    new Set<number>([...(localState.deletedExpenseIds || []), ...(remote.deletedExpenseIds || [])])
  );
  const delEntrySet = new Set(deletedEntryIds);
  const delExpenseSet = new Set(deletedExpenseIds);

  // Merge Entries (Local first, then Remote so Remote updates win when downloading from cloud)
  const entriesMap = new Map<number, RideEntry>();
  for (const e of localState.entries || []) {
    if (e && !delEntrySet.has(Number(e.id)) && !isLegacyDemoEntry(e)) {
      entriesMap.set(Number(e.id), e);
    }
  }
  for (const e of remote.entries || []) {
    if (e && !delEntrySet.has(Number(e.id)) && !isLegacyDemoEntry(e)) {
      entriesMap.set(Number(e.id), e);
    }
  }
  const mergedEntries = Array.from(entriesMap.values()).sort(
    (a, b) => b.date.localeCompare(a.date) || b.id - a.id
  );

  // Merge Expenses (Local first, then Remote so Remote updates win)
  const expensesMap = new Map<number, ExpenseEntry>();
  for (const ex of localState.expenses || []) {
    if (ex && !delExpenseSet.has(Number(ex.id)) && !isLegacyDemoExpense(ex)) {
      expensesMap.set(Number(ex.id), ex);
    }
  }
  for (const ex of remote.expenses || []) {
    if (ex && !delExpenseSet.has(Number(ex.id)) && !isLegacyDemoExpense(ex)) {
      expensesMap.set(Number(ex.id), ex);
    }
  }
  const mergedExpenses = Array.from(expensesMap.values()).sort(
    (a, b) => b.date.localeCompare(a.date) || b.id - a.id
  );

  // Merge Maintenance Items (Remote wins for KM/cost/interval, while combining all history records)
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
        const histMap = new Map<string, MaintenanceHistoryRecord>();
        for (const h of [...(lItem.history || []), ...(rItem.history || [])]) {
          if (h && h.id) histMap.set(h.id, h);
        }
        maintMap.set(rItem.id, {
          ...lItem,
          ...rItem,
          lastChangeKm:
            Number(rItem.lastChangeKm) > 0
              ? Number(rItem.lastChangeKm)
              : Number(lItem.lastChangeKm) || 0,
          history: Array.from(histMap.values()).sort((a, b) => b.date.localeCompare(a.date)),
        });
      }
    }
  }
  const mergedMaintItems = Array.from(maintMap.values());

  // Merge fuelConfig (preserving remote odometerBaseKm and bikeModelName!)
  const remoteFuel = remote.fuelConfig;
  const localFuel = localState.fuelConfig;
  const mergedFuelConfig: FuelDiagnosticsConfig = {
    kmPerLiter: Number(remoteFuel?.kmPerLiter || localFuel.kmPerLiter) || 35,
    fuelPrice: Number(remoteFuel?.fuelPrice || localFuel.fuelPrice) || 5.8,
    tankCapacityLiters: Number(remoteFuel?.tankCapacityLiters || localFuel.tankCapacityLiters) || 16.1,
    bikeModelName:
      remoteFuel?.bikeModelName && remoteFuel.bikeModelName !== 'Minha Moto'
        ? remoteFuel.bikeModelName
        : localFuel.bikeModelName || 'Minha Moto',
    odometerBaseKm:
      Number(remoteFuel?.odometerBaseKm) > 0
        ? Number(remoteFuel?.odometerBaseKm)
        : Number(localFuel.odometerBaseKm) || 0,
  };

  // Merge customApps, customCategories, customShifts
  const appMap = new Map<string, AppDefinition>();
  for (const a of [...(localState.customApps || []), ...(remote.customApps || [])]) {
    if (a && a.id) appMap.set(a.id, a);
  }
  const catMap = new Map<string, CategoryDefinition>();
  for (const c of [...(localState.customCategories || []), ...(remote.customCategories || [])]) {
    if (c && c.id) catMap.set(c.id, c);
  }
  const shiftMap = new Map<string, ShiftDefinition>();
  for (const s of [...(localState.customShifts || []), ...(remote.customShifts || [])]) {
    if (s && s.id) shiftMap.set(s.id, s);
  }

  const mergedState: LocalRoomDatabaseState = {
    ...localState,
    entries: mergedEntries,
    expenses: mergedExpenses,
    maintenanceItems: mergedMaintItems,
    dailyGoal: Number(remote.dailyGoal || localState.dailyGoal) || 150,
    weeklyGoal: Number(remote.weeklyGoal || localState.weeklyGoal) || 900,
    customGoalTarget: Number(remote.customGoalTarget || localState.customGoalTarget) || 3000,
    customGoalDays: Number(remote.customGoalDays || localState.customGoalDays) || 20,
    customGoalTitle: remote.customGoalTitle || localState.customGoalTitle || 'Meta Personalizada de Ganhos',
    maintenanceNotificationsEnabled:
      typeof remote.maintenanceNotificationsEnabled === 'boolean'
        ? remote.maintenanceNotificationsEnabled
        : localState.maintenanceNotificationsEnabled ?? true,
    fuelConfig: mergedFuelConfig,
    financialPlan: {
      ...DEFAULT_FINANCIAL_PLAN,
      ...(localState.financialPlan || {}),
      ...(remote.financialPlan || {}),
    },
    customApps: Array.from(appMap.values()),
    customCategories: Array.from(catMap.values()),
    customShifts: Array.from(shiftMap.values()),
    appOverrides: { ...(localState.appOverrides || {}), ...(remote.appOverrides || {}) },
    shiftOverrides: { ...(localState.shiftOverrides || {}), ...(remote.shiftOverrides || {}) },
    deletedEntryIds,
    deletedExpenseIds,
    lastSyncedAt: isoNow,
  };

  const ridesKm = mergedState.entries.reduce((s, e) => s + Number(e.km || 0), 0);
  const totalKm = (Number(mergedState.fuelConfig?.odometerBaseKm) || 0) + ridesKm;

  return {
    success: true,
    foundRemoteData: true,
    status: 'Dados Baixados e Sincronizados da Nuvem',
    timestamp: nowStr,
    mergedState,
    stats: {
      entries: mergedState.entries.length,
      expenses: mergedState.expenses.length,
      maintCards: mergedState.maintenanceItems.length,
      totalKm,
    },
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
  if (preferRemoteScalars || !hasPopulatedData(localState)) {
    const downRes = await downloadCloudDataToLocal(localState, userEmail);
    if (downRes.foundRemoteData) {
      return {
        success: true,
        status: downRes.status,
        timestamp: downRes.timestamp,
        mergedState: downRes.mergedState,
        stats: {
          entries: downRes.stats.entries,
          expenses: downRes.stats.expenses,
          maintCards: downRes.stats.maintCards,
        },
      };
    }
  }

  const upRes = await uploadLocalDataToCloud(localState, userEmail);
  return {
    success: upRes.success,
    status: upRes.status,
    timestamp: upRes.timestamp,
    mergedState: upRes.mergedState,
    stats: {
      entries: upRes.stats.entries,
      expenses: upRes.stats.expenses,
      maintCards: upRes.stats.maintCards,
    },
  };
}

export function exportCloudBackupCode(state: LocalRoomDatabaseState): string {
  const payload = {
    v: 3,
    ts: new Date().toISOString(),
    state,
  };
  const json = JSON.stringify(payload);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return `MOCHILINHA_BACKUP:${encoded}`;
}

export function importCloudBackupCode(
  rawCode: string,
  currentState: LocalRoomDatabaseState
): { ok: boolean; mergedState?: LocalRoomDatabaseState; error?: string } {
  try {
    const trimmed = rawCode.trim();
    const base64Part = trimmed.startsWith('MOCHILINHA_BACKUP:')
      ? trimmed.slice('MOCHILINHA_BACKUP:'.length).trim()
      : trimmed;
    const jsonStr = decodeURIComponent(escape(atob(base64Part)));
    const parsed = JSON.parse(jsonStr);
    const incoming: Partial<LocalRoomDatabaseState> = parsed?.state || parsed;
    if (!incoming || (!Array.isArray(incoming.entries) && !incoming.fuelConfig)) {
      return { ok: false, error: 'Código de backup inválido ou incompleto.' };
    }

    const entriesMap = new Map<number, RideEntry>();
    for (const e of [...(currentState.entries || []), ...(incoming.entries || [])]) {
      if (e && !isLegacyDemoEntry(e)) entriesMap.set(Number(e.id), e);
    }
    const expensesMap = new Map<number, ExpenseEntry>();
    for (const ex of [...(currentState.expenses || []), ...(incoming.expenses || [])]) {
      if (ex && !isLegacyDemoExpense(ex)) expensesMap.set(Number(ex.id), ex);
    }

    const merged: LocalRoomDatabaseState = {
      ...currentState,
      ...incoming,
      entries: Array.from(entriesMap.values()).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
      expenses: Array.from(expensesMap.values()).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
      fuelConfig: incoming.fuelConfig || currentState.fuelConfig,
      maintenanceItems:
        Array.isArray(incoming.maintenanceItems) && incoming.maintenanceItems.length > 0
          ? incoming.maintenanceItems
          : currentState.maintenanceItems,
      financialPlan: {
        ...DEFAULT_FINANCIAL_PLAN,
        ...(currentState.financialPlan || {}),
        ...(incoming.financialPlan || {}),
      },
      lastSyncedAt: new Date().toISOString(),
    };
    return { ok: true, mergedState: merged };
  } catch {
    return { ok: false, error: 'Não foi possível ler o código de backup. Verifique se copiou todo o código.' };
  }
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

  // Attempt cloud registration with Supabase Auth in background (non-blocking)
  const client = getSupabaseClient();
  if (client && typeof navigator !== 'undefined' && navigator.onLine) {
    void Promise.resolve(
      client.auth.signUp({
        email: emailClean,
        password: passwordClean.length >= 6 ? passwordClean : passwordClean + '_cr26',
        options: {
          data: {
            full_name: nameClean,
            phone: phoneClean,
            bike_model: bikeClean,
          },
        },
      })
    ).catch(() => {
      // Fallback to Room local auth seamlessly
    });
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

  // 1. Fast Local Verification (Instant 0ms login when password matches local account)
  if (localMatch && localMatch.passwordHash) {
    if (localMatch.passwordHash === hashRaw || localMatch.passwordHash === hashTrimmed) {
      const { passwordHash: _, ...publicProfile } = localMatch;
      saveActiveSessionUser(publicProfile);
      return { ok: true, user: publicProfile };
    }
  }

  // 2. Check Cloud Profile (with strict 1.8s timeout) for cross-device login or password updated on another device
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const deviceId = getUserDeviceId(emailClean);
      const client = getSupabaseClient();

      // Check local/remote server store and Supabase moto_settings in parallel with a fast 1.8s timeout
      const [serverPullRes, supabaseSettingsRes] = await Promise.all([
        fetchWithTimeout(
          `/api/cloud-sync/pull?deviceId=${encodeURIComponent(deviceId)}&email=${encodeURIComponent(emailClean)}`,
          {},
          1500
        )
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null),
        client
          ? withTimeout(
              client.from('moto_settings').select('*').eq('device_id', deviceId).maybeSingle(),
              1800,
              { data: null } as any
            )
          : Promise.resolve({ data: null }),
      ]);

      const serverPilotProfile = serverPullRes?.data?.pilotProfile || null;
      const remoteSettings = supabaseSettingsRes?.data || null;
      const remoteMaint = remoteSettings?.maintenance || {};
      const remotePilotProfile = remoteMaint.pilotProfile || serverPilotProfile || null;

      // STRICT PASSWORD CHECK: If cloud profile has a stored passwordHash, verify it strictly
      if (remotePilotProfile && remotePilotProfile.passwordHash) {
        if (
          remotePilotProfile.passwordHash === hashRaw ||
          remotePilotProfile.passwordHash === hashTrimmed
        ) {
          const syncedAccount: StoredLocalAccount = {
            id: remotePilotProfile.id || localMatch?.id || 'usr_' + Date.now(),
            name:
              remotePilotProfile.name ||
              localMatch?.name ||
              emailClean.split('@')[0],
            email: emailClean,
            phone: remotePilotProfile.phone || localMatch?.phone || '',
            bikeModel:
              remotePilotProfile.bikeModel ||
              remoteMaint.bikeModelName ||
              localMatch?.bikeModel ||
              'Minha Moto',
            createdAt: remotePilotProfile.createdAt || localMatch?.createdAt || new Date().toISOString(),
            isGuest: false,
            passwordHash: remotePilotProfile.passwordHash,
          };
          const updatedAccounts =
            localIdx >= 0
              ? accounts.map((a, i) => (i === localIdx ? syncedAccount : a))
              : [...accounts, syncedAccount];
          saveLocalAccounts(updatedAccounts);
          const { passwordHash: _, ...publicProfile } = syncedAccount;
          saveActiveSessionUser(publicProfile);
          return { ok: true, user: publicProfile };
        } else {
          // Password does NOT match remotePilotProfile.passwordHash -> Reject immediately!
          return {
            ok: false,
            error: 'Senha incorreta. Confira a senha digitada ou clique em "Redefinir Senha".',
          };
        }
      }

      // If local account exists and its passwordHash did NOT match, reject immediately (do not fall through)
      if (localMatch && localMatch.passwordHash) {
        return {
          ok: false,
          error: 'Senha incorreta. Confira a senha digitada ou clique em "Redefinir Senha".',
        };
      }

      // Only if no local/cloud passwordHash exists yet, check Supabase Auth with strict 1.8s timeout
      if (client) {
        const authRes = await withTimeout(
          client.auth.signInWithPassword({
            email: emailClean,
            password: trimmedPassword.length >= 6 ? trimmedPassword : trimmedPassword + '_cr26',
          }),
          1800,
          { data: { user: null }, error: { message: 'timeout' } } as any
        );
        if (!authRes.error && authRes.data?.user) {
          const meta = authRes.data.user.user_metadata || {};
          const importedAccount: StoredLocalAccount = {
            id: authRes.data.user.id || 'usr_' + Date.now(),
            name: meta.full_name || emailClean.split('@')[0],
            email: emailClean,
            phone: meta.phone || '',
            bikeModel: meta.bike_model || 'Minha Moto',
            createdAt: authRes.data.user.created_at || new Date().toISOString(),
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
      }

      if (remoteSettings || serverPullRes?.data?.state) {
        return {
          ok: false,
          error:
            'Senha incorreta ou ainda não configurada neste aparelho. Clique em "Redefinir Senha" para definir sua senha de acesso.',
        };
      }
    } catch {
      // Ignore network error and fall through to strict rejection
    }
  }

  if (localMatch) {
    return {
      ok: false,
      error: 'Senha incorreta. Confira a senha digitada ou clique em "Redefinir Senha".',
    };
  }

  return {
    ok: false,
    error: 'Conta não encontrada ou senha inválida. Crie sua conta na aba "Criar Conta" ou use "Redefinir Senha".',
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

  // Sync updated passwordHash to Supabase moto_settings in background (non-blocking)
  const client = getSupabaseClient();
  if (client && typeof navigator !== 'undefined' && navigator.onLine) {
    void (async () => {
      try {
        const deviceId = getUserDeviceId(emailClean);
        const { data: existingSettings } = await withTimeout(
          client.from('moto_settings').select('*').eq('device_id', deviceId).maybeSingle(),
          2000,
          { data: null } as any
        );

        const existingMaint = existingSettings?.maintenance || {};
        const existingPilot = existingMaint.pilotProfile || {};

        if (existingPilot.name && idx === -1) {
          updatedAccount.name = existingPilot.name;
        }
        if (existingMaint.bikeModelName && idx === -1) {
          updatedAccount.bikeModel = existingMaint.bikeModelName;
        }

        const latestAccounts = getLocalAccounts().map(a =>
          a.email.toLowerCase() === emailClean ? updatedAccount : a
        );
        saveLocalAccounts(latestAccounts);

        await withTimeout(
          client.from('moto_settings').upsert(
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
          ),
          2000,
          null as any
        );
      } catch {
        // Offline / local fallback already succeeded
      }
    })();
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
  saveActiveSessionUser(publicProfile);
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


