import React, { useState, useMemo } from 'react';
import {
  X,
  Zap,
  Gauge,
  Fuel,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { FuelDiagnosticsConfig, MaintenanceItem } from '../services/supabaseSync';

interface RadarCorridaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fuelConfig: FuelDiagnosticsConfig;
  maintenanceItems: MaintenanceItem[];
  onAcceptRide?: (rideData: { revenue: number; km: number; hours: number }) => void;
  isDark: boolean;
}

export function RadarCorridaModal({
  isOpen,
  onClose,
  fuelConfig,
  maintenanceItems,
  onAcceptRide,
  isDark,
}: RadarCorridaModalProps) {
  const [valorCorrida, setValorCorrida] = useState<string>('15');
  const [distanciaKm, setDistanciaKm] = useState<string>('6');
  const [tempoMinutos, setTempoMinutos] = useState<string>('20');

  // Surface classes
  const surfaceCard = isDark ? 'bg-[#12141C] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const surfaceSubtle = isDark ? 'bg-slate-900/70 border border-slate-800' : 'bg-slate-100 border border-slate-200';
  const inputSurface = isDark ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  // Analysis calculations
  const analysis = useMemo(() => {
    const revenue = Math.max(0, parseFloat(valorCorrida.replace(',', '.')) || 0);
    const km = Math.max(0.1, parseFloat(distanciaKm.replace(',', '.')) || 0);
    const minutes = Math.max(1, parseFloat(tempoMinutos.replace(',', '.')) || 1);
    const hours = minutes / 60;

    // Fuel cost per KM
    const kmPerL = Math.max(5, Number(fuelConfig.kmPerLiter) || 35);
    const fuelPrice = Math.max(0.5, Number(fuelConfig.fuelPrice) || 5.8);
    const fuelCostPerKm = fuelPrice / kmPerL;

    // Maintenance wear cost per KM
    let maintCostPerKm = 0;
    if (Array.isArray(maintenanceItems) && maintenanceItems.length > 0) {
      maintenanceItems.forEach(item => {
        const cost = Number(item.costEstimate || 0);
        const interval = Math.max(500, Number(item.intervalKm || 1000));
        if (cost > 0 && interval > 0) {
          maintCostPerKm += cost / interval;
        }
      });
    }
    // Safe default if no maintenance items configured
    if (maintCostPerKm <= 0) {
      maintCostPerKm = 0.085; // R$ 0,085 por km (óleo + relação + pneu)
    }

    const totalCostPerKm = fuelCostPerKm + maintCostPerKm;
    const totalFuelCost = fuelCostPerKm * km;
    const totalMaintCost = maintCostPerKm * km;
    const totalCost = totalFuelCost + totalMaintCost;

    const netProfit = revenue - totalCost;
    const marginPct = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;
    const grossPerKm = km > 0 ? revenue / km : 0;
    const netPerKm = km > 0 ? netProfit / km : 0;
    const revPerHour = hours > 0 ? revenue / hours : 0;
    const netPerHour = hours > 0 ? netProfit / hours : 0;

    // Verdict calculation
    let verdict: 'excellent' | 'good' | 'bad' = 'good';
    let verdictTitle = 'Paga o Justo (Compensador)';
    let verdictDesc = 'A corrida cobre gasolina e manutenção com lucro limpo no bolso.';
    let verdictBadge = '🟡 COMPENSADOR';
    let verdictColor = 'text-amber-400 bg-amber-500/15 border-amber-500/30';

    if (grossPerKm >= 2.2 || (netPerKm >= 1.6 && netPerHour >= 30)) {
      verdict = 'excellent';
      verdictTitle = 'Excelente! Corrida de Ouro';
      verdictDesc = 'Paga muito bem por KM rodado e acima da média por hora. Vale muito a pena!';
      verdictBadge = '🟢 CORRIDA EXCELENTE';
      verdictColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    } else if (grossPerKm < 1.4 || netPerKm < 0.7 || netProfit <= 1.5 || marginPct < 35) {
      verdict = 'bad';
      verdictTitle = 'Prejuízo Disfarçado (Não Compensa)';
      verdictDesc = 'Paga muito pouco pela distância. O combustível e o desgaste da moto vão consumir quase todo o valor.';
      verdictBadge = '🔴 NÃO COMPENSA';
      verdictColor = 'text-rose-400 bg-rose-500/15 border-rose-500/30';
    }

    return {
      revenue,
      km,
      minutes,
      hours,
      fuelCostPerKm,
      maintCostPerKm,
      totalCostPerKm,
      totalFuelCost,
      totalMaintCost,
      totalCost,
      netProfit,
      marginPct,
      grossPerKm,
      netPerKm,
      revPerHour,
      netPerHour,
      verdict,
      verdictTitle,
      verdictDesc,
      verdictBadge,
      verdictColor,
    };
  }, [valorCorrida, distanciaKm, tempoMinutos, fuelConfig, maintenanceItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 flex flex-col max-h-[90vh] overflow-y-auto shadow-2xl border ${surfaceCard}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF6A1A] text-black flex items-center justify-center font-black">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm sm:text-base font-black">Radar de Corrida: Aceito ou Recuso?</h3>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#FF6A1A]/15 text-[#FF6A1A]">
                  2 Toques
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs ${mutedText}`}>
                Calcule o lucro líquido limpo na hora com o consumo da sua moto
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

        {/* Input Fields */}
        <div className="grid grid-cols-3 gap-2.5 mt-3 sm:mt-4">
          <div className={`rounded-xl p-2.5 flex flex-col justify-between ${surfaceSubtle}`}>
            <label className={`text-[10px] font-bold uppercase ${mutedText}`}>Valor da Corrida</label>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-black text-[#FF6A1A]">R$</span>
              <input
                type="number"
                step="0.5"
                min="0"
                value={valorCorrida}
                onChange={e => setValorCorrida(e.target.value)}
                placeholder="15.00"
                className={`w-full px-2 py-1 rounded-lg text-sm sm:text-base font-black tabular-nums outline-none ${inputSurface}`}
              />
            </div>
          </div>

          <div className={`rounded-xl p-2.5 flex flex-col justify-between ${surfaceSubtle}`}>
            <label className={`text-[10px] font-bold uppercase ${mutedText}`}>Distância Total</label>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                step="0.5"
                min="0.1"
                value={distanciaKm}
                onChange={e => setDistanciaKm(e.target.value)}
                placeholder="6"
                className={`w-full px-2 py-1 rounded-lg text-sm sm:text-base font-black tabular-nums outline-none ${inputSurface}`}
              />
              <span className={`text-xs font-bold ${mutedText}`}>KM</span>
            </div>
          </div>

          <div className={`rounded-xl p-2.5 flex flex-col justify-between ${surfaceSubtle}`}>
            <label className={`text-[10px] font-bold uppercase ${mutedText}`}>Tempo Estimado</label>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                step="5"
                min="1"
                value={tempoMinutos}
                onChange={e => setTempoMinutos(e.target.value)}
                placeholder="20"
                className={`w-full px-2 py-1 rounded-lg text-sm sm:text-base font-black tabular-nums outline-none ${inputSurface}`}
              />
              <span className={`text-xs font-bold ${mutedText}`}>min</span>
            </div>
          </div>
        </div>

        {/* Presets Rápidos */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className={`text-[10px] font-bold ${mutedText}`}>Atalhos R$:</span>
          {[8, 12, 15, 20, 28, 35].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setValorCorrida(String(v))}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer ${
                parseFloat(valorCorrida) === v ? 'bg-[#FF6A1A] text-black' : surfaceSubtle
              }`}
            >
              R$ {v}
            </button>
          ))}
        </div>

        {/* Veredito Visual Impactante */}
        <div className={`mt-3.5 p-4 rounded-2xl border flex flex-col gap-2 ${analysis.verdictColor}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/25">
              {analysis.verdictBadge}
            </span>
            <span className="text-xs font-extrabold">
              Margem Líquida: <strong>{analysis.marginPct}% livre</strong>
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h4 className="text-base sm:text-lg font-black">{analysis.verdictTitle}</h4>
              <p className="text-xs opacity-90 leading-tight mt-0.5">{analysis.verdictDesc}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold block uppercase opacity-80">Lucro Limpo</span>
              <span className="text-xl sm:text-2xl font-black tabular-nums">
                R$ {analysis.netProfit.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Detalhamento dos Custos e Rendimento por KM & Hora */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          <div className={`rounded-xl p-2.5 ${surfaceSubtle}`}>
            <span className={`block text-[10px] font-bold ${mutedText}`}>R$ / KM Bruto</span>
            <span className="text-xs sm:text-sm font-black tabular-nums mt-0.5 block text-sky-400">
              R$ {analysis.grossPerKm.toFixed(2)} / km
            </span>
          </div>

          <div className={`rounded-xl p-2.5 ${surfaceSubtle}`}>
            <span className={`block text-[10px] font-bold ${mutedText}`}>R$ / KM Líquido</span>
            <span
              className={`text-xs sm:text-sm font-black tabular-nums mt-0.5 block ${
                analysis.netPerKm >= 1.5
                  ? 'text-emerald-400'
                  : analysis.netPerKm >= 1.0
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              R$ {analysis.netPerKm.toFixed(2)} / km
            </span>
          </div>

          <div className={`rounded-xl p-2.5 ${surfaceSubtle}`}>
            <span className={`block text-[10px] font-bold ${mutedText}`}>Ritmo / Hora Líq.</span>
            <span className="text-xs sm:text-sm font-black tabular-nums mt-0.5 block text-[#FF6A1A]">
              R$ {analysis.netPerHour.toFixed(2)} / h
            </span>
          </div>

          <div className={`rounded-xl p-2.5 ${surfaceSubtle}`}>
            <span className={`block text-[10px] font-bold ${mutedText}`}>Custo Total da Corrida</span>
            <span className="text-xs sm:text-sm font-black tabular-nums mt-0.5 block text-rose-400">
              - R$ {analysis.totalCost.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Transparência de Custos (Gasolina vs Desgaste da Moto) */}
        <div className={`mt-2.5 p-2.5 rounded-xl text-[11px] font-medium flex items-center justify-between gap-2 ${surfaceSubtle}`}>
          <div className="flex items-center gap-1 text-slate-400">
            <Fuel className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Gasolina: R$ {analysis.totalFuelCost.toFixed(2)} ({fuelConfig.kmPerLiter} km/L)</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Wrench className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Peças/Desgaste: R$ {analysis.totalMaintCost.toFixed(2)}</span>
          </div>
        </div>

        {/* Botão de Ação: Lançar Direto no Registro */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-3 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle}`}
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => {
              if (onAcceptRide) {
                onAcceptRide({
                  revenue: analysis.revenue,
                  km: analysis.km,
                  hours: parseFloat((analysis.minutes / 60).toFixed(1)),
                });
              }
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#FF6A1A]/20"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Aceitei essa Corrida! (Lançar Registro)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
