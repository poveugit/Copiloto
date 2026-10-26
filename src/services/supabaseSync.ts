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

export interface LocalRoomDatabaseState {
  entries: RideEntry[];
  expenses: ExpenseEntry[];
  dailyGoal: number;
  weeklyGoal: number;
  maintenanceItems: MaintenanceItem[];
  fuelConfig: FuelDiagnosticsConfig;
  customApps: AppDefinition[];
  customCategories: CategoryDefinition[];
  appOverrides: Record<string, { name: string; icon: string }>;
  customShifts?: ShiftDefinition[];
  shiftOverrides?: Record<string, { name: string }>;
  deletedShiftIds?: string[];
  deletedAppIds?: string[];
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
    return 'usr_' + userEmail.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
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

  if (simulateOffline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return {
      success: false,
      status: 'Offline (Room SQLite Local · WorkManager em fila)',
      timestamp: nowStr,
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      status: 'Salvo no Room DB Local',
      timestamp: nowStr,
    };
  }

  try {
    const deviceId = getUserDeviceId(userEmail);

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
    };

    await client.from('moto_settings').upsert(
      {
        device_id: deviceId,
        daily_goal: state.dailyGoal,
        maintenance: legacyMaintenance,
        app_overrides: state.appOverrides || {},
        custom_apps: state.customApps || [],
        custom_categories: state.customCategories || [],
        custom_maints: state.maintenanceItems || [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'device_id' }
    );

    if (state.entries.length > 0) {
      const entriesPayload = state.entries.map(e => ({
        id: String(e.id),
        device_id: deviceId,
        entry_date: e.date,
        app: e.app,
        shift: e.shift || 'almoco',
        km: Number(e.km || 0),
        revenue: Number(e.revenue || 0),
        hours: Number(e.hours || 0),
        updated_at: new Date().toISOString(),
      }));
      await client.from('moto_entries').upsert(entriesPayload, { onConflict: 'id' });
    }

    if (state.expenses.length > 0) {
      const expensesPayload = state.expenses.map(e => ({
        id: String(e.id),
        device_id: deviceId,
        expense_date: e.date,
        category: e.category,
        amount: Number(e.amount || 0),
        updated_at: new Date().toISOString(),
      }));
      await client.from('moto_expenses').upsert(expensesPayload, { onConflict: 'id' });
    }

    return {
      success: true,
      status: 'Sincronizado via WorkManager + Room',
      timestamp: nowStr,
    };
  } catch {
    return {
      success: false,
      status: 'Room Local Ativo (Retry agendado)',
      timestamp: nowStr,
    };
  }
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

const USERS_DB_KEY = 'copilotrider_users_db_v1';
const ACTIVE_SESSION_KEY = 'copilotrider_active_session_v1';

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

export function getActiveSessionUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
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
  const client = getSupabaseClient();
  if (!client || (typeof navigator !== 'undefined' && !navigator.onLine)) return null;

  try {
    const deviceId = getUserDeviceId(userEmail);
    const [settingsRes, entriesRes, expensesRes] = await Promise.all([
      client.from('moto_settings').select('*').eq('device_id', deviceId).maybeSingle(),
      client.from('moto_entries').select('*').eq('device_id', deviceId),
      client.from('moto_expenses').select('*').eq('device_id', deviceId),
    ]);

    const settings = settingsRes.data;
    const rawEntries = Array.isArray(entriesRes.data) ? entriesRes.data : [];
    const rawExpenses = Array.isArray(expensesRes.data) ? expensesRes.data : [];

    // Filter out any legacy demo rows that might have been synced earlier
    const demoEntryIdsToDelete: string[] = [];
    const entries: RideEntry[] = [];
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
        entries.push(mapped);
      }
    }

    const demoExpenseIdsToDelete: string[] = [];
    const expenses: ExpenseEntry[] = [];
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
        expenses.push(mapped);
      }
    }

    if (demoEntryIdsToDelete.length > 0) {
      client.from('moto_entries').delete().eq('device_id', deviceId).in('id', demoEntryIdsToDelete).then(() => {});
    }
    if (demoExpenseIdsToDelete.length > 0) {
      client.from('moto_expenses').delete().eq('device_id', deviceId).in('id', demoExpenseIdsToDelete).then(() => {});
    }

    if (!settings && entries.length === 0 && expenses.length === 0) {
      return null;
    }

    const m = settings?.maintenance || {};
    return {
      entries,
      expenses,
      dailyGoal: Number(settings?.daily_goal) || 150,
      weeklyGoal: Number(m.weeklyGoal) || 900,
      maintenanceItems: Array.isArray(settings?.custom_maints) && settings.custom_maints.length > 0
        ? settings.custom_maints
        : undefined,
      fuelConfig: {
        kmPerLiter: Number(m.kmPerLiter) || 35,
        fuelPrice: Number(m.fuelPrice) || 5.8,
        tankCapacityLiters: Number(m.tankCapacityLiters) || 16.1,
        bikeModelName: m.bikeModelName || 'Minha Moto',
        odometerBaseKm: Number(m.odometerBaseKm) || 0,
      },
      customApps: Array.isArray(settings?.custom_apps) ? settings.custom_apps : [],
      customCategories: Array.isArray(settings?.custom_categories) ? settings.custom_categories : [],
      appOverrides: settings?.app_overrides || {},
    };
  } catch {
    return null;
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

  if (!nameClean) {
    return { ok: false, error: 'Informe seu nome ou apelido.' };
  }
  if (!emailClean || !emailClean.includes('@')) {
    return { ok: false, error: 'Informe um e-mail válido.' };
  }
  if (!params.password || params.password.length < 4) {
    return { ok: false, error: 'A senha deve ter pelo menos 4 caracteres.' };
  }

  const accounts = getLocalAccounts();
  if (accounts.some(a => a.email.toLowerCase() === emailClean)) {
    return { ok: false, error: 'Este e-mail já está cadastrado. Faça login na aba Entrar.' };
  }

  const newAccount: StoredLocalAccount = {
    id: 'usr_' + Date.now(),
    name: nameClean,
    email: emailClean,
    phone: phoneClean,
    bikeModel: bikeClean,
    createdAt: new Date().toISOString(),
    isGuest: false,
    passwordHash: simpleHash(params.password),
  };

  // Attempt cloud registration with Supabase Auth in background if online
  const client = getSupabaseClient();
  if (client && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      await client.auth.signUp({
        email: emailClean,
        password: params.password.length >= 6 ? params.password : params.password + '_cr26',
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
  if (!emailClean || !emailClean.includes('@')) {
    return { ok: false, error: 'Digite um endereço de e-mail válido.' };
  }
  if (!params.password) {
    return { ok: false, error: 'Digite sua senha para entrar.' };
  }

  const accounts = getLocalAccounts();
  const localMatch = accounts.find(a => a.email.toLowerCase() === emailClean);

  if (localMatch) {
    if (localMatch.passwordHash !== simpleHash(params.password)) {
      return { ok: false, error: 'Senha incorreta. Confira os dados ou redefina sua senha.' };
    }
    const { passwordHash: _, ...publicProfile } = localMatch;
    saveActiveSessionUser(publicProfile);
    return { ok: true, user: publicProfile };
  }

  // Try remote Supabase sign-in if account was created on another device
  const client = getSupabaseClient();
  if (client && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: emailClean,
        password: params.password.length >= 6 ? params.password : params.password + '_cr26',
      });
      if (!error && data?.user) {
        const meta = data.user.user_metadata || {};
        const importedAccount: StoredLocalAccount = {
          id: data.user.id || 'usr_' + Date.now(),
          name: meta.full_name || emailClean.split('@')[0],
          email: emailClean,
          phone: meta.phone || '',
          bikeModel: meta.bike_model || 'Honda CG 160 Titan',
          createdAt: data.user.created_at || new Date().toISOString(),
          isGuest: false,
          passwordHash: simpleHash(params.password),
        };
        saveLocalAccounts([...accounts, importedAccount]);
        const { passwordHash: _, ...publicProfile } = importedAccount;
        saveActiveSessionUser(publicProfile);
        return { ok: true, user: publicProfile };
      }
    } catch {
      // Ignore network error
    }
  }

  return {
    ok: false,
    error: 'Conta não encontrada para este e-mail. Crie sua conta na aba "Criar Conta".',
  };
}

export function resetPilotPassword(params: {
  email: string;
  newPassword: string;
}): { ok: boolean; message?: string; error?: string } {
  const emailClean = params.email.trim().toLowerCase();
  if (!emailClean || !emailClean.includes('@')) {
    return { ok: false, error: 'Informe um e-mail válido.' };
  }
  if (!params.newPassword || params.newPassword.length < 4) {
    return { ok: false, error: 'A nova senha deve ter pelo menos 4 caracteres.' };
  }

  const accounts = getLocalAccounts();
  const idx = accounts.findIndex(a => a.email.toLowerCase() === emailClean);
  if (idx === -1) {
    return { ok: false, error: 'Nenhuma conta encontrada com este e-mail neste dispositivo.' };
  }

  accounts[idx] = {
    ...accounts[idx],
    passwordHash: simpleHash(params.newPassword),
  };
  saveLocalAccounts(accounts);
  return { ok: true, message: 'Senha redefinida com sucesso! Você já pode entrar.' };
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

