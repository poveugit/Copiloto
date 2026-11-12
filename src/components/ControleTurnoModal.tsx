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
  Navigation,
  ShieldCheck,
} from 'lucide-react';
import { FreeNumberInput } from './FreeNumberInput';
import { GpsPermissionState } from '../services/gpsOdometerService';

export interface ShiftSession {
  isActive: boolean;
  startKm: number;
  startTime: string; // ISO string
  startRevenue: number;
  gpsEnabled?: boolean;
  gpsDistanceKm?: number;
  lastLat?: number;
  lastLng?: number;
  lastTimestamp?: number;
  currentSpeedKmh?: number;
  gpsAccuracyMeters?: number;
  gpsPointsCount?: number;
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
  gpsPermissionStatus: GpsPermissionState;
  onRequestGpsPermission: () => Promise<boolean>;
  onOpenGpsPermissionModal: () => void;
  onStartShift: (startKm: number, gpsEnabled: boolean) => void;
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
  gpsPermissionStatus,
  onRequestGpsPermission,
  onOpenGpsPermissionModal,
  onStartShift,
  onEndShift,
  isDark,
}: ControleTurnoModalProps) {
  const [startKmInput, setStartKmInput] = useState<number>(currentOdometer || 0);
  const [endKmInput, setEndKmInput] = useState<number>(currentOdometer || 0);
  const [manualEndKmOverride, setManualEndKmOverride] = useState<boolean>(false);
  const [useAutoGps, setUseAutoGps] = useState<boolean>(true);
  const [syncOdometerCheckbox, setSyncOdometerCheckbox] = useState<boolean>(true);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isStartingShiftGps, setIsStartingShiftGps] = useState<boolean>(false);

  const liveGpsDistanceKm = Number(activeSession?.gpsDistanceKm || 0);
  const autoCalculatedEndKm = useMemo(() => {
    if (!activeSession) return currentOdometer || 0;
    return Math.round((activeSession.startKm + liveGpsDistanceKm) * 10) / 10;
  }, [activeSession, liveGpsDistanceKm, currentOdometer]);

  // Sync initial inputs when modal opens
  useEffect(() => {
    if (isOpen) {
      setManualEndKmOverride(false);
      if (activeSession && activeSession.isActive) {
        setStartKmInput(activeSession.startKm);
        const computedEnd = Math.max(
          activeSession.startKm,
          Math.round((activeSession.startKm + Number(activeSession.gpsDistanceKm || 0)) * 10) / 10,
          currentOdometer
        );
        setEndKmInput(computedEnd);
      } else {
        setStartKmInput(currentOdometer || 0);
        setEndKmInput(currentOdometer || 0);
      }
    }
  }, [isOpen, activeSession?.isActive, activeSession?.startKm, currentOdometer]);

  // Keep endKmInput updated in real time with GPS distance unless user manually overrode it
  useEffect(() => {
    if (isOpen && activeSession?.isActive && !manualEndKmOverride) {
      setEndKmInput(autoCalculatedEndKm);
    }
  }, [isOpen, activeSession?.isActive, autoCalculatedEndKm, manualEndKmOverride]);

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
    const kmDelta = Math.max(0, Math.round((end - start) * 10) / 10);
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

  const surfaceCard = isDark
    ? 'bg-black border border-neutral-800 text-slate-100 shadow-2xl'
    : 'bg-white border border-slate-200 text-slate-900 shadow-2xl';
  const surfaceSubtle = isDark
    ? 'bg-transparent border border-neutral-800'
    : 'bg-transparent border border-slate-200';
  const inputSurface = isDark
    ? 'bg-black border border-neutral-800 text-white focus:border-[#FF6A1A]'
    : 'bg-transparent border border-slate-300 text-slate-900 focus:border-[#FF6A1A]';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  const handleStartClick = async () => {
    if (useAutoGps && gpsPermissionStatus !== 'granted') {
      setIsStartingShiftGps(true);
      const granted = await onRequestGpsPermission();
      setIsStartingShiftGps(false);
      if (!granted) {
        onOpenGpsPermissionModal();
        return;
      }
    }
    onStartShift(startKmInput, useAutoGps);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 flex flex-col max-h-[92vh] overflow-y-auto shadow-2xl border ${surfaceCard}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 sm:pb-4 border-b ${dividerBorder}`}>
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black bg-transparent border ${
                activeSession?.isActive ? 'border-emerald-500/50 text-emerald-400' : 'border-[#FF6A1A]/50 text-[#FF6A1A]'
              }`}
            >
              {activeSession?.isActive ? (
                <Navigation className="w-5 h-5 animate-pulse" />
              ) : (
                <Gauge className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-black">Controle de Turno & Odômetro GPS</h3>
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                    activeSession?.isActive
                      ? isDark
                        ? 'bg-transparent text-emerald-400 border-emerald-500/40'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : isDark
                      ? 'bg-transparent text-slate-400 border-neutral-800'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {activeSession?.isActive ? 'GPS em Tempo Real' : 'Turno Fechado'}
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs ${mutedText}`}>
                Marca a distância percorrida automaticamente por GPS em tempo real e em 2º plano.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 sm:p-2 rounded-xl bg-transparent border ${dividerBorder} cursor-pointer text-slate-400 hover:text-white hover:border-slate-500 transition-colors`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shift Active State Display */}
        {activeSession?.isActive ? (
          <div className="mt-4 flex flex-col gap-3">
            {/* Live GPS Banner */}
            <div className={`p-4 rounded-2xl border flex flex-col gap-3 bg-transparent ${
              isDark
                ? 'border-emerald-500/40'
                : 'border-emerald-300'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isDark ? 'text-emerald-400' : 'text-emerald-800'
                }`}>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  {activeSession.gpsEnabled !== false
                    ? 'Odômetro GPS Automático Ativo (2º Plano)'
                    : 'Turno Aberto (Modo Manual)'}
                </span>
                <span className={`text-xs font-black tabular-nums px-2.5 py-1 rounded-lg border bg-transparent ${
                  isDark
                    ? 'text-emerald-300 border-emerald-500/40'
                    : 'text-emerald-900 border-emerald-300'
                }`}>
                  ⏱️ {formattedTime}
                </span>
              </div>

              {/* Real-time GPS Odometer Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className={`rounded-xl p-2.5 border bg-transparent ${
                  isDark ? 'border-emerald-500/30' : 'border-emerald-200'
                }`}>
                  <span className={`block text-[10px] font-bold ${mutedText}`}>KM no GPS (Turno)</span>
                  <span className={`text-sm sm:text-base font-black tabular-nums dashboard-number-anim mt-0.5 block ${
                    isDark ? 'text-emerald-400' : 'text-emerald-700'
                  }`}>
                    +{liveGpsDistanceKm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km
                  </span>
                </div>
                <div className={`rounded-xl p-2.5 border bg-transparent ${
                  isDark ? 'border-emerald-500/30' : 'border-emerald-200'
                }`}>
                  <span className={`block text-[10px] font-bold ${mutedText}`}>Odômetro Atual</span>
                  <span className={`text-sm sm:text-base font-black tabular-nums dashboard-number-anim mt-0.5 block ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {autoCalculatedEndKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km
                  </span>
                </div>
                <div className={`rounded-xl p-2.5 border bg-transparent ${
                  isDark ? 'border-emerald-500/30' : 'border-emerald-200'
                }`}>
                  <span className={`block text-[10px] font-bold ${mutedText}`}>Velocidade GPS</span>
                  <span className={`text-sm sm:text-base font-black tabular-nums dashboard-number-anim mt-0.5 block ${
                    isDark ? 'text-sky-400' : 'text-sky-700'
                  }`}>
                    {activeSession.currentSpeedKmh || 0} km/h
                  </span>
                </div>
                <div className={`rounded-xl p-2.5 border bg-transparent ${
                  isDark ? 'border-emerald-500/30' : 'border-emerald-200'
                }`}>
                  <span className={`block text-[10px] font-bold ${mutedText}`}>Ganhos no Turno</span>
                  <span className="text-sm sm:text-base font-black tabular-nums dashboard-number-anim mt-0.5 block text-[#FF6A1A]">
                    R$ {summary.shiftRevenue.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className={`flex items-center justify-between text-[11px] pt-1 border-t ${
                isDark ? 'border-emerald-500/20 text-emerald-200/90' : 'border-emerald-200 text-emerald-800'
              }`}>
                <span className="flex items-center gap-1.5 font-semibold">
                  <Navigation className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
                  {gpsPermissionStatus === 'granted'
                    ? `Sinal GPS conectado ${
                        activeSession.gpsAccuracyMeters ? `(±${activeSession.gpsAccuracyMeters}m)` : ''
                      } · Contando KM sozinho`
                    : 'Permissão de localização pendente'}
                </span>
                {gpsPermissionStatus !== 'granted' && (
                  <button
                    type="button"
                    onClick={onOpenGpsPermissionModal}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-transparent border border-[#FF6A1A] text-[#FF6A1A] hover:bg-[#FF6A1A]/10 cursor-pointer"
                  >
                    Ativar GPS
                  </button>
                )}
              </div>
            </div>

            {/* Ending Odometer Field (Auto-populated by GPS, editable if needed) */}
            <div className={`p-4 rounded-2xl border ${surfaceSubtle} flex flex-col gap-3`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <label className="text-xs font-black text-[#FF6A1A] block">
                    Odômetro Final Calculado Automaticamente
                  </label>
                  <span className={`text-[10px] font-semibold ${mutedText}`}>
                    Preenchido sozinho pelo GPS (você também pode ajustar se desejar)
                  </span>
                </div>
                <span className={`text-[11px] font-bold tabular-nums ${mutedText}`}>
                  Início: {activeSession.startKm.toLocaleString('pt-BR')} km
                </span>
              </div>

              <div className="flex items-center gap-2">
                <FreeNumberInput
                  step="0.1"
                  value={endKmInput}
                  onValueChange={val => {
                    setManualEndKmOverride(true);
                    setEndKmInput(val);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-base sm:text-lg font-black tabular-nums outline-none ${inputSurface}`}
                  placeholder="Ex: 15280"
                />
                <span className="text-sm font-bold shrink-0">KM</span>
                {manualEndKmOverride && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualEndKmOverride(false);
                      setEndKmInput(autoCalculatedEndKm);
                    }}
                    title="Voltar para o valor automático do GPS"
                    className={`px-2.5 py-2 rounded-xl text-[10px] font-black cursor-pointer shrink-0 border bg-transparent ${
                      isDark ? 'text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10' : 'text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    Usar GPS
                  </button>
                )}
              </div>

              {/* Real-Time Preview of Distance Run */}
              <div className={`grid grid-cols-3 gap-2 text-center pt-2 border-t ${dividerBorder}`}>
                <div className={`p-2 rounded-xl bg-transparent border ${dividerBorder}`}>
                  <span className={`block text-[10px] font-bold ${mutedText}`}>KM Rodados</span>
                  <span className="text-sm sm:text-base font-black tabular-nums dashboard-number-anim text-[#FF6A1A]">
                    {summary.kmDelta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km
                  </span>
                </div>
                <div className={`p-2 rounded-xl bg-transparent border ${dividerBorder}`}>
                  <span className={`block text-[10px] font-bold ${mutedText}`}>Tempo Total</span>
                  <span className="text-sm sm:text-base font-black tabular-nums dashboard-number-anim">
                    {summary.durationHours.toFixed(1)}h
                  </span>
                </div>
                <div className={`p-2 rounded-xl bg-transparent border ${dividerBorder}`}>
                  <span className={`block text-[10px] font-bold ${mutedText}`}>Média R$ / KM</span>
                  <span className="text-sm sm:text-base font-black tabular-nums dashboard-number-anim text-emerald-400">
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
                <span>
                  Consolidar distância no Odômetro Principal da Moto ({endKmInput.toLocaleString('pt-BR')} km)
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-3 rounded-xl text-xs font-bold cursor-pointer bg-transparent border ${dividerBorder} ${mutedText} hover:text-white hover:border-slate-500 transition-colors`}
              >
                Continuar Rodando
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
                className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-transparent border border-rose-500/70 text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>
                  Encerrar Turno ({summary.kmDelta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km)
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* Start Shift State Form */
          <div className="mt-4 flex flex-col gap-4">
            {/* Automatic GPS Background Mode Card */}
            <div
              className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 bg-transparent ${
                useAutoGps
                  ? 'border-emerald-500/40'
                  : dividerBorder
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-transparent border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-black">
                        Odômetro Automático por GPS (2º Plano)
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border bg-transparent ${
                          gpsPermissionStatus === 'granted'
                            ? isDark
                              ? 'text-emerald-300 border-emerald-500/40'
                              : 'text-emerald-800 border-emerald-300'
                            : isDark
                            ? 'text-amber-300 border-amber-500/40'
                            : 'text-amber-800 border-amber-300'
                        }`}
                      >
                        {gpsPermissionStatus === 'granted'
                          ? 'GPS Autorizado'
                          : 'Requer Permissão'}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-1 leading-relaxed ${mutedText}`}>
                      Marca os quilômetros rodados automaticamente em tempo real e em segundo plano, sem que você precise anotar o painel da moto.
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={useAutoGps}
                  onChange={e => setUseAutoGps(e.target.checked)}
                  className="rounded accent-emerald-500 w-5 h-5 shrink-0 mt-1 cursor-pointer"
                />
              </div>

              {useAutoGps && gpsPermissionStatus !== 'granted' && (
                <div className={`pt-2 border-t flex items-center justify-between gap-2 flex-wrap ${
                  isDark ? 'border-emerald-500/20' : 'border-emerald-200'
                }`}>
                  <span className={`text-[11px] font-bold flex items-center gap-1.5 ${
                    isDark ? 'text-amber-300' : 'text-amber-800'
                  }`}>
                    <ShieldCheck className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    Selecione &quot;Permitir o tempo todo&quot; no celular para funcionar em 2º plano.
                  </span>
                  <button
                    type="button"
                    onClick={onOpenGpsPermissionModal}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-transparent border border-[#FF6A1A] text-[#FF6A1A] hover:bg-[#FF6A1A]/10 cursor-pointer shrink-0"
                  >
                    Autorizar Localização
                  </button>
                </div>
              )}
            </div>

            <div className={`p-4 rounded-2xl border ${surfaceSubtle} flex flex-col gap-3`}>
              <div>
                <label className="block text-xs font-black mb-1">
                  Odômetro Inicial da Moto (KM)
                </label>
                <p className={`text-[11px] mb-2 ${mutedText}`}>
                  Já carregamos seu odômetro atual. O GPS somará os novos KM automaticamente a partir deste ponto:
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

              <div className={`flex items-center gap-2 pt-1 text-xs font-semibold ${
                isDark ? 'text-emerald-400' : 'text-emerald-700'
              }`}>
                <Flame className="w-4 h-4 shrink-0 text-[#FF6A1A]" />
                <span>
                  Assim que iniciar, o odômetro principal começará a subir automaticamente conforme você pilota!
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-3 rounded-xl text-xs font-bold cursor-pointer bg-transparent border ${dividerBorder} ${mutedText} hover:text-white hover:border-slate-500 transition-colors`}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isStartingShiftGps}
                onClick={handleStartClick}
                className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-transparent border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {isStartingShiftGps
                    ? 'Ativando Satélite GPS...'
                    : useAutoGps
                    ? 'Iniciar Turno com GPS Automático'
                    : 'Iniciar Turno Manual'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
