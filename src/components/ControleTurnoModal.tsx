import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Play,
  Square,
  Clock,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  MapPin,
  Flame,
} from 'lucide-react';
import { FreeNumberInput } from './FreeNumberInput';

export interface ShiftSession {
  isActive: boolean;
  startKm: number;
  startTime: string; // ISO string
  startRevenue: number;
}

const SHIFT_STORAGE_KEY = 'mochilinha_shift_session_v1';

export function getStoredShiftSession(): ShiftSession | null {
  try {
    const raw = localStorage.getItem(SHIFT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function saveStoredShiftSession(session: ShiftSession | null): void {
  try {
    if (session) {
      localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SHIFT_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

interface ControleTurnoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOdometer: number;
  currentTotalRevenue: number;
  activeSession: ShiftSession | null;
  onStartShift: (startKm: number) => void;
  onEndShift: (data: {
    startKm: number;
    endKm: number;
    kmDelta: number;
    durationHours: number;
    shiftRevenue: number;
    syncOdometer: boolean;
  }) => void;
  isDark: boolean;
}

export function ControleTurnoModal({
  isOpen,
  onClose,
  currentOdometer,
  currentTotalRevenue,
  activeSession,
  onStartShift,
  onEndShift,
  isDark,
}: ControleTurnoModalProps) {
  const [startKmInput, setStartKmInput] = useState<number>(currentOdometer || 0);
  const [endKmInput, setEndKmInput] = useState<number>(currentOdometer || 0);
  const [syncOdometerCheckbox, setSyncOdometerCheckbox] = useState<boolean>(true);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Sync initial inputs when modal opens
  useEffect(() => {
    if (isOpen) {
      if (activeSession && activeSession.isActive) {
        setStartKmInput(activeSession.startKm);
        setEndKmInput(Math.max(activeSession.startKm, currentOdometer));
      } else {
        setStartKmInput(currentOdometer || 0);
        setEndKmInput(currentOdometer || 0);
      }
    }
  }, [isOpen, activeSession, currentOdometer]);

  // Live timer tick when shift is active
  useEffect(() => {
    if (!activeSession || !activeSession.isActive) return;
    const calculateElapsed = () => {
      const startMs = new Date(activeSession.startTime).getTime();
      const nowMs = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
    };
    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Format elapsed time (hh:mm:ss)
  const formattedTime = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }, [elapsedSeconds]);

  // Calculations for shift summary
  const summary = useMemo(() => {
    const start = Number(startKmInput) || 0;
    const end = Number(endKmInput) || start;
    const kmDelta = Math.max(0, end - start);
    const durationHours = Math.max(0.1, parseFloat((elapsedSeconds / 3600).toFixed(2)));
    const shiftRevenue = activeSession
      ? Math.max(0, currentTotalRevenue - (activeSession.startRevenue || 0))
      : 0;
    const revPerKm = kmDelta > 0 ? shiftRevenue / kmDelta : 0;
    const revPerHour = durationHours > 0 ? shiftRevenue / durationHours : 0;

    return {
      kmDelta,
      durationHours,
      shiftRevenue,
      revPerKm,
      revPerHour,
    };
  }, [startKmInput, endKmInput, elapsedSeconds, activeSession, currentTotalRevenue]);

  if (!isOpen) return null;

  const surfaceCard = isDark ? 'bg-[#12141C] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const surfaceSubtle = isDark ? 'bg-slate-900/70 border border-slate-800' : 'bg-slate-100 border border-slate-200';
  const inputSurface = isDark ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 flex flex-col max-h-[90vh] overflow-y-auto shadow-2xl border ${surfaceCard}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                activeSession?.isActive ? 'bg-emerald-500 text-black' : 'bg-[#FF6A1A] text-black'
              }`}
            >
              {activeSession?.isActive ? <Clock className="w-5 h-5 animate-pulse" /> : <Gauge className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm sm:text-base font-black">Controle de Turno (Odômetro)</h3>
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                    activeSession?.isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                  }`}
                >
                  {activeSession?.isActive ? 'Em Andamento' : 'Turno Fechado'}
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs ${mutedText}`}>
                Inicie ao sair de casa e encerre ao voltar. O app calcula os KM do dia automaticamente.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 sm:p-2 rounded-xl ${surfaceSubtle} cursor-pointer hover:border-[#FF6A1A]`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shift Active State Display */}
        {activeSession?.isActive ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/30 border border-emerald-500/40 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Turno Aberto Agora
                </span>
                <span className="text-xs font-black tabular-nums text-emerald-300">
                  {formattedTime}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="rounded-xl p-2.5 bg-black/30 border border-emerald-500/20">
                  <span className={`block text-[10px] font-bold ${mutedText}`}>Odômetro Inicial</span>
                  <span className="text-sm sm:text-base font-black tabular-nums mt-0.5 block">
                    {activeSession.startKm.toLocaleString('pt-BR')} km
                  </span>
                </div>
                <div className="rounded-xl p-2.5 bg-black/30 border border-emerald-500/20">
                  <span className={`block text-[10px] font-bold ${mutedText}`}>Faturamento no Turno</span>
                  <span className="text-sm sm:text-base font-black tabular-nums mt-0.5 block text-emerald-400">
                    R$ {summary.shiftRevenue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ending Odometer Field */}
            <div className={`p-4 rounded-2xl border ${surfaceSubtle} flex flex-col gap-3`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-[#FF6A1A]">
                  Encerrar Turno: Digite o Odômetro Atual da Moto
                </label>
                <span className={`text-[11px] font-bold tabular-nums ${mutedText}`}>
                  KM Inicial: {activeSession.startKm}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <FreeNumberInput
                  value={endKmInput}
                  onValueChange={val => setEndKmInput(val)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-base sm:text-lg font-black tabular-nums outline-none ${inputSurface}`}
                  placeholder="Ex: 15280"
                />
                <span className="text-sm font-bold shrink-0">KM</span>
              </div>

              {/* Real-Time Preview of Distance Run */}
              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/40">
                <div className={`p-2 rounded-xl ${surfaceCard}`}>
                  <span className={`block text-[10px] font-bold ${mutedText}`}>KM Rodados</span>
                  <span className="text-sm sm:text-base font-black tabular-nums text-[#FF6A1A]">
                    {summary.kmDelta.toLocaleString('pt-BR')} km
                  </span>
                </div>
                <div className={`p-2 rounded-xl ${surfaceCard}`}>
                  <span className={`block text-[10px] font-bold ${mutedText}`}>Tempo Total</span>
                  <span className="text-sm sm:text-base font-black tabular-nums">
                    {summary.durationHours.toFixed(1)}h
                  </span>
                </div>
                <div className={`p-2 rounded-xl ${surfaceCard}`}>
                  <span className={`block text-[10px] font-bold ${mutedText}`}>Média R$ / KM</span>
                  <span className="text-sm sm:text-base font-black tabular-nums text-emerald-400">
                    R$ {summary.revPerKm.toFixed(2)}
                  </span>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={syncOdometerCheckbox}
                  onChange={e => setSyncOdometerCheckbox(e.target.checked)}
                  className="rounded accent-[#FF6A1A] w-4 h-4"
                />
                <span>Atualizar automaticamente o Odômetro Principal da Moto para {endKmInput} km</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-3 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle}`}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  onEndShift({
                    startKm: activeSession.startKm,
                    endKm: endKmInput,
                    kmDelta: summary.kmDelta,
                    durationHours: summary.durationHours,
                    shiftRevenue: summary.shiftRevenue,
                    syncOdometer: syncOdometerCheckbox,
                  });
                  onClose();
                }}
                className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-rose-500 text-white hover:bg-rose-600 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-500/20"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Encerrar Turno ({summary.kmDelta} km rodados)</span>
              </button>
            </div>
          </div>
        ) : (
          /* Start Shift State Form */
          <div className="mt-4 flex flex-col gap-4">
            <div className={`p-4 rounded-2xl border ${surfaceSubtle} flex flex-col gap-3`}>
              <div>
                <label className="block text-xs font-black mb-1">
                  Odômetro Inicial ao Sair de Casa (KM)
                </label>
                <p className={`text-[11px] mb-2 ${mutedText}`}>
                  Confirme o KM atual marcado no painel da sua moto para iniciar a contagem do turno:
                </p>
                <div className="flex items-center gap-2">
                  <FreeNumberInput
                    value={startKmInput}
                    onValueChange={val => setStartKmInput(val)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-base sm:text-lg font-black tabular-nums outline-none ${inputSurface}`}
                    placeholder="Ex: 15200"
                  />
                  <span className="text-sm font-bold shrink-0">KM</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-[#FF6A1A]">
                <Flame className="w-4 h-4 shrink-0" />
                <span>Ao iniciar, o Mochilinha marcará o horário e acompanhará seus ganhos em tempo real.</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-3 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onStartShift(startKmInput);
                  onClose();
                }}
                className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-emerald-500 text-black hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar Turno de Hoje</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
