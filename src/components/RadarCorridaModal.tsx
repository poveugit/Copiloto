import React, { useState, useMemo } from 'react';
import {
  X,
  Zap,
  Fuel,
  Wrench,
  CheckCircle2,
  Home,
  Utensils,
  Wallet,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { FuelDiagnosticsConfig, MaintenanceItem } from '../services/supabaseSync';

export interface RadarFinancialContext {
  dailyKm: number;
  dailyGross: number;
  workDaysPerMonth: number;
  dailyBikeCostsTotal: number;
  dailyFuelCost: number;
  dailyMaintReserve: number;
  dailyDocsReserve: number;
  dailyFoodCost: number;
  monthlyFoodCost: number;
  monthlyHouseholdCost: number;
  dailyHouseholdReserve: number;
  dailyEmergencyReserve: number;
}

interface RadarCorridaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fuelConfig: FuelDiagnosticsConfig;
  maintenanceItems: MaintenanceItem[];
  financialContext?: RadarFinancialContext;
  onAcceptRide?: (rideData: { revenue: number; km: number; hours: number }) => void;
  isDark: boolean;
}

export function RadarCorridaModal({
  isOpen,
  onClose,
  fuelConfig,
  maintenanceItems,
  financialContext,
  onAcceptRide,
  isDark,
}: RadarCorridaModalProps) {
  const [valorCorrida, setValorCorrida] = useState<string>('15');
  const [distanciaKm, setDistanciaKm] = useState<string>('6');
  const [tempoMinutos, setTempoMinutos] = useState<string>('20');

  // Surface classes
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

  // Analysis calculations (Moto + Casa & Pessoal)
  const analysis = useMemo(() => {
    const revenue = Math.max(0, parseFloat(valorCorrida.replace(',', '.')) || 0);
    const km = Math.max(0.1, parseFloat(distanciaKm.replace(',', '.')) || 0);
    const minutes = Math.max(1, parseFloat(tempoMinutos.replace(',', '.')) || 1);
    const hours = minutes / 60;

    const avgDailyKm = Math.max(20, Number(financialContext?.dailyKm) || 90);
    const workDays = Math.max(1, Number(financialContext?.workDaysPerMonth) || 26);

    // 1. Custo da Moto por KM (Combustível + Manutenção/Peças + Docs/IPVA)
    const kmPerL = Math.max(5, Number(fuelConfig.kmPerLiter) || 35);
    const fuelPrice = Math.max(0.5, Number(fuelConfig.fuelPrice) || 5.8);
    const baseFuelCostPerKm = fuelPrice / kmPerL;

    // Se o usuário personalizou o gasto diário de combustível, usa o custo real por KM
    const fuelCostPerKm =
      financialContext && financialContext.dailyFuelCost > 0
        ? financialContext.dailyFuelCost / avgDailyKm
        : baseFuelCostPerKm;

    let maintCostPerKm = 0;
    if (financialContext && financialContext.dailyMaintReserve > 0) {
      maintCostPerKm = financialContext.dailyMaintReserve / avgDailyKm;
    } else if (Array.isArray(maintenanceItems) && maintenanceItems.length > 0) {
      maintenanceItems.forEach(item => {
        const cost = Number(item.costEstimate || 0);
        const interval = Math.max(500, Number(item.intervalKm || 1000));
        if (cost > 0 && interval > 0) {
          maintCostPerKm += cost / interval;
        }
      });
    }
    if (maintCostPerKm <= 0) {
      maintCostPerKm = 0.085;
    }

    const docsCostPerKm =
      financialContext && financialContext.dailyDocsReserve > 0
        ? financialContext.dailyDocsReserve / avgDailyKm
        : 0;

    const totalBikeCostPerKm = fuelCostPerKm + maintCostPerKm + docsCostPerKm;
    const totalFuelCost = fuelCostPerKm * km;
    const totalMaintCost = maintCostPerKm * km;
    const totalDocsCost = docsCostPerKm * km;
    const totalBikeCost = totalBikeCostPerKm * km;

    // Lucro Líquido da Moto (Descontando apenas a Moto)
    const netProfitBike = revenue - totalBikeCost;
    const bikeMarginPct = revenue > 0 ? Math.round((netProfitBike / revenue) * 100) : 0;
    const grossPerKm = km > 0 ? revenue / km : 0;
    const netBikePerKm = km > 0 ? netProfitBike / km : 0;
    const revPerHour = hours > 0 ? revenue / hours : 0;
    const netBikePerHour = hours > 0 ? netProfitBike / hours : 0;

    // 2. Custos da Casa & Pessoal (Alimentação/Rua) por KM e nesta Corrida
    const monthlyHouse = Math.max(0, Number(financialContext?.monthlyHouseholdCost) || 0);
    const dailyHouseReserve =
      financialContext?.dailyHouseholdReserve !== undefined
        ? Math.max(0, financialContext.dailyHouseholdReserve)
        : monthlyHouse / workDays;

    const dailyPersonalFood = Math.max(0, Number(financialContext?.dailyFoodCost) || 0);
    const dailyHouseAndPersonal = dailyHouseReserve + dailyPersonalFood;

    const houseCostPerKm = dailyHouseReserve / avgDailyKm;
    const personalCostPerKm = dailyPersonalFood / avgDailyKm;
    const houseAndPersonalPerKm = houseCostPerKm + personalCostPerKm;

    const rideHouseCost = houseCostPerKm * km;
    const ridePersonalCost = personalCostPerKm * km;
    const rideHouseAndPersonalCost = rideHouseCost + ridePersonalCost;

    // Custo Total Geral da Corrida (Moto + Casa + Pessoal)
    const totalAllCostPerKm = totalBikeCostPerKm + houseAndPersonalPerKm;
    const totalAllCost = totalBikeCost + rideHouseAndPersonalCost;

    // O Que Sobra Após Moto + Contas da Casa
    const netAfterHouseOnly = netProfitBike - rideHouseCost;
    const netAfterHouseOnlyPerKm = km > 0 ? netAfterHouseOnly / km : 0;

    // O Que Sobra 100% Livre (Após Moto + Contas da Casa + Pessoal/Alimentação)
    const netFreeAfterAll = netProfitBike - rideHouseAndPersonalCost;
    const freeMarginPct = revenue > 0 ? Math.round((netFreeAfterAll / revenue) * 100) : 0;
    const freePerKm = km > 0 ? netFreeAfterAll / km : 0;
    const freePerHour = hours > 0 ? netFreeAfterAll / hours : 0;

    // Quantas corridas iguais a esta quitam o piso diário (Moto + Casa + Pessoal)
    const totalDailyTarget =
      (financialContext?.dailyBikeCostsTotal || totalBikeCostPerKm * avgDailyKm + dailyPersonalFood) +
      dailyHouseReserve;
    const ridesNeededForDailyTarget =
      netProfitBike > 0
        ? Math.ceil((dailyHouseAndPersonal + totalBikeCostPerKm * avgDailyKm) / Math.max(1, revenue))
        : 0;

    // Verdict calculation
    let verdict: 'excellent' | 'good' | 'bad' = 'good';
    let verdictTitle = 'Paga o Justo (Compensador)';
    let verdictDesc = 'Cobre os custos da moto e ajuda a pagar as despesas da casa.';
    let verdictBadge = '🟡 COMPENSADOR';
    let verdictColor = 'text-amber-400 bg-amber-500/15 border-amber-500/30';

    if (grossPerKm >= 2.2 && netFreeAfterAll > 0) {
      verdict = 'excellent';
      verdictTitle = 'Excelente! Corrida de Ouro';
      verdictDesc = 'Cobre moto, contas da casa e ainda deixa ótimo lucro livre no bolso!';
      verdictBadge = '🟢 CORRIDA EXCELENTE';
      verdictColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    } else if (grossPerKm < 1.4 || netBikePerKm < 0.7 || netProfitBike <= 1.5 || bikeMarginPct < 35) {
      verdict = 'bad';
      verdictTitle = 'Prejuízo Disfarçado (Não Compensa)';
      verdictDesc = 'Paga muito pouco pelo KM. Mal cobre a moto e não ajuda nas contas da casa.';
      verdictBadge = '🔴 NÃO COMPENSA';
      verdictColor = 'text-rose-400 bg-rose-500/15 border-rose-500/30';
    }

    return {
      revenue,
      km,
      minutes,
      hours,
      avgDailyKm,
      workDays,
      fuelCostPerKm,
      maintCostPerKm,
      docsCostPerKm,
      totalBikeCostPerKm,
      totalFuelCost,
      totalMaintCost,
      totalDocsCost,
      totalBikeCost,
      netProfitBike,
      bikeMarginPct,
      grossPerKm,
      netBikePerKm,
      revPerHour,
      netBikePerHour,
      monthlyHouse,
      dailyHouseReserve,
      dailyPersonalFood,
      dailyHouseAndPersonal,
      houseCostPerKm,
      personalCostPerKm,
      houseAndPersonalPerKm,
      rideHouseCost,
      ridePersonalCost,
      rideHouseAndPersonalCost,
      totalAllCostPerKm,
      totalAllCost,
      netAfterHouseOnly,
      netAfterHouseOnlyPerKm,
      netFreeAfterAll,
      freeMarginPct,
      freePerKm,
      freePerHour,
      totalDailyTarget,
      ridesNeededForDailyTarget,
      verdict,
      verdictTitle,
      verdictDesc,
      verdictBadge,
      verdictColor,
    };
  }, [valorCorrida, distanciaKm, tempoMinutos, fuelConfig, maintenanceItems, financialContext]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`w-full max-w-xl rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 flex flex-col max-h-[92vh] overflow-y-auto shadow-2xl border ${surfaceCard}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF6A1A] text-black flex items-center justify-center font-black shrink-0">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-black">
                  Radar de Lucro: Aceito ou Recuso?
                </h3>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#FF6A1A]/15 text-[#FF6A1A]">
                  Moto + Casa
                </span>
              </div>
              <p className={`text-[11px] ${mutedText}`}>
                Veja o que sobra de cada corrida após os custos da moto e das contas da casa/pessoal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 sm:p-2 rounded-xl bg-transparent border ${dividerBorder} cursor-pointer text-slate-400 hover:text-white hover:border-slate-500 transition-colors shrink-0`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Fields */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className={`rounded-xl p-2.5 flex flex-col justify-between border ${surfaceSubtle}`}>
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

          <div className={`rounded-xl p-2.5 flex flex-col justify-between border ${surfaceSubtle}`}>
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

          <div className={`rounded-xl p-2.5 flex flex-col justify-between border ${surfaceSubtle}`}>
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
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition-colors ${
                parseFloat(valorCorrida) === v
                  ? 'bg-transparent border border-[#FF6A1A] text-[#FF6A1A]'
                  : `bg-transparent border ${dividerBorder} ${mutedText} hover:border-slate-500`
              }`}
            >
              R$ {v}
            </button>
          ))}
        </div>

        {/* BLOCO 1: LUCRO LÍQUIDO DA MOTO */}
        <div className={`mt-3 p-3.5 rounded-2xl border flex flex-col gap-2 bg-transparent ${analysis.verdictColor}`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-current/30">
              {analysis.verdictBadge}
            </span>
            <span className="text-[11px] font-extrabold">
              🏍️ Margem Após Moto: <strong>{analysis.bikeMarginPct}%</strong>
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h4 className="text-sm sm:text-base font-black">{analysis.verdictTitle}</h4>
              <p className="text-[11px] opacity-90 leading-tight mt-0.5">{analysis.verdictDesc}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[9px] font-bold block uppercase opacity-80">
                Lucro Líquido da Moto
              </span>
              <span className="text-lg sm:text-2xl font-black tabular-nums dashboard-number-anim">
                R$ {analysis.netProfitBike.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Transparência de Custos da Moto nesta corrida */}
          <div className="pt-2 border-t border-current/15 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold opacity-90">
            <span className="flex items-center gap-1">
              <Fuel className="w-3 h-3 shrink-0" />
              Gasolina: -R$ {analysis.totalFuelCost.toFixed(2)}
            </span>
            <span className="flex items-center gap-1">
              <Wrench className="w-3 h-3 shrink-0" />
              Peças/Manut.: -R$ {analysis.totalMaintCost.toFixed(2)}
            </span>
            {analysis.totalDocsCost > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3 shrink-0" />
                Docs/IPVA: -R$ {analysis.totalDocsCost.toFixed(2)}
              </span>
            )}
            <span className="font-black">
              Total Moto: -R$ {analysis.totalBikeCost.toFixed(2)} (R$ {analysis.totalBikeCostPerKm.toFixed(2)}/km)
            </span>
          </div>
        </div>

        {/* BLOCO 2 (NOVO): CARD COBRINDO DESPESAS DA CASA & PESSOAL (O QUE SOBRA DE FATO) */}
        <div
          className={`mt-2.5 p-3.5 rounded-2xl border bg-transparent ${
            isDark
              ? 'border-blue-500/35'
              : 'border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-blue-500/20">
            <div className="flex items-center gap-1.5">
              <Home className={`w-4 h-4 shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-700'}`} />
              <span className={`text-xs font-black ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                O Que Sobra Após Custos da Moto + Casa/Pessoal
              </span>
            </div>
            <span className={`text-[10px] font-bold ${mutedText}`}>
              Base: ~{Math.round(analysis.avgDailyKm)} km/dia
            </span>
          </div>

          {/* 2 Destaque Principais Lado a Lado: (1) Sobra Após Moto + Casa | (2) Sobra Após Moto + Casa + Pessoal */}
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            {/* Caixa A: Após Moto + Contas da Casa */}
            <div
              className={`p-2.5 rounded-xl border bg-transparent ${
                isDark ? 'border-blue-500/30' : 'border-blue-200'
              }`}
            >
              <span className={`block text-[10px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                🏠 Após Moto + Contas Casa
              </span>
              <div
                className={`text-base sm:text-lg font-black tabular-nums dashboard-number-anim mt-0.5 ${
                  analysis.netAfterHouseOnly >= 0
                    ? isDark ? 'text-blue-400' : 'text-blue-700'
                    : isDark ? 'text-rose-400' : 'text-rose-700'
                }`}
              >
                R$ {analysis.netAfterHouseOnly.toFixed(2)}
              </div>
              <div className={`text-[10px] font-semibold tabular-nums mt-0.5 ${mutedText}`}>
                R$ {analysis.netAfterHouseOnlyPerKm.toFixed(2)}/km · (-R$ {analysis.rideHouseCost.toFixed(2)} casa)
              </div>
            </div>

            {/* Caixa B: 100% Livre (Após Moto + Casa + Pessoal/Alimentação) */}
            <div
              className={`p-2.5 rounded-xl border bg-transparent ${
                analysis.netFreeAfterAll >= 0
                  ? isDark
                    ? 'border-emerald-500/40 text-emerald-400'
                    : 'border-emerald-300'
                  : isDark
                  ? 'border-rose-500/40 text-rose-400'
                  : 'border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`text-[10px] font-black ${
                    analysis.netFreeAfterAll >= 0
                      ? isDark ? 'text-emerald-400' : 'text-emerald-800'
                      : isDark ? 'text-rose-400' : 'text-rose-800'
                  }`}
                >
                  💵 Sobra Livre (Moto+Casa+Pessoal)
                </span>
              </div>
              <div
                className={`text-base sm:text-lg font-black tabular-nums dashboard-number-anim mt-0.5 ${
                  analysis.netFreeAfterAll >= 0
                    ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                    : isDark ? 'text-rose-400' : 'text-rose-700'
                }`}
              >
                R$ {analysis.netFreeAfterAll.toFixed(2)}
                <span className="text-[10px] font-bold ml-1 opacity-85">
                  ({analysis.freeMarginPct}%)
                </span>
              </div>
              <div className={`text-[10px] font-semibold tabular-nums mt-0.5 ${mutedText}`}>
                R$ {analysis.freePerKm.toFixed(2)}/km · R$ {analysis.freePerHour.toFixed(2)}/h
              </div>
            </div>
          </div>

          {/* Equação Passo a Passo Desta Corrida */}
          <div
            className={`mt-2.5 p-2 rounded-xl text-[10px] font-bold grid grid-cols-2 sm:grid-cols-4 gap-1.5 border bg-transparent ${dividerBorder}`}
          >
            <div className="flex flex-col">
              <span className={mutedText}>1. Ganho Bruto</span>
              <span className={`${isDark ? 'text-slate-200' : 'text-slate-900'} font-black tabular-nums dashboard-number-anim`}>
                + R$ {analysis.revenue.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className={isDark ? 'text-rose-400' : 'text-rose-700'}>2. Custo Moto ({analysis.km}km)</span>
              <span className={`${isDark ? 'text-rose-400' : 'text-rose-700'} font-black tabular-nums dashboard-number-anim`}>
                - R$ {analysis.totalBikeCost.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className={isDark ? 'text-blue-400' : 'text-blue-700'}>3. Contas Casa ({analysis.km}km)</span>
              <span className={`${isDark ? 'text-blue-400' : 'text-blue-700'} font-black tabular-nums dashboard-number-anim`}>
                - R$ {analysis.rideHouseCost.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className={isDark ? 'text-orange-400' : 'text-orange-700'}>4. Pessoal/Rua ({analysis.km}km)</span>
              <span className={`${isDark ? 'text-orange-400' : 'text-orange-700'} font-black tabular-nums dashboard-number-anim`}>
                - R$ {analysis.ridePersonalCost.toFixed(2)}
              </span>
            </div>
          </div>

          <div className={`mt-2 text-[10px] flex items-center justify-between gap-2 flex-wrap ${mutedText}`}>
            <span>
              🏠 Custo Casa/KM: <strong className={isDark ? 'text-blue-400' : 'text-blue-700'}>R$ {analysis.houseCostPerKm.toFixed(2)}/km</strong> (R$ {analysis.dailyHouseReserve.toFixed(2)}/dia)
            </span>
            <span>
              🍱 Pessoal/KM: <strong className={isDark ? 'text-orange-400' : 'text-orange-700'}>R$ {analysis.personalCostPerKm.toFixed(2)}/km</strong> (R$ {analysis.dailyPersonalFood.toFixed(2)}/dia)
            </span>
          </div>
        </div>

        {/* BLOCO 3: COMPARATIVO POR QUILÔMETRO (BRUTO vs LÍQUIDO MOTO vs APÓS CASA vs 100% LIVRE) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
          <div className={`rounded-xl p-2.5 border ${surfaceSubtle}`}>
            <span className={`block text-[10px] font-bold ${mutedText}`}>R$ / KM Bruto</span>
            <span className={`text-xs sm:text-sm font-black tabular-nums dashboard-number-anim mt-0.5 block ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
              R$ {analysis.grossPerKm.toFixed(2)} / km
            </span>
            <span className={`text-[9px] block mt-0.5 ${mutedText}`}>Sem descontos</span>
          </div>

          <div className={`rounded-xl p-2.5 border ${surfaceSubtle}`}>
            <span className={`block text-[10px] font-bold ${mutedText}`}>R$ / KM Líq. Moto</span>
            <span
              className={`text-xs sm:text-sm font-black tabular-nums dashboard-number-anim mt-0.5 block ${
                analysis.netBikePerKm >= 1.5
                  ? 'text-amber-400'
                  : analysis.netBikePerKm >= 1.0
                  ? 'text-orange-400'
                  : 'text-rose-400'
              }`}
            >
              R$ {analysis.netBikePerKm.toFixed(2)} / km
            </span>
            <span className={`text-[9px] block mt-0.5 ${mutedText}`}>
              -R$ {analysis.totalBikeCostPerKm.toFixed(2)}/km moto
            </span>
          </div>

          <div className={`rounded-xl p-2.5 border ${surfaceSubtle}`}>
            <span className={`block text-[10px] font-bold ${mutedText}`}>R$ / KM Após Casa</span>
            <span
              className={`text-xs sm:text-sm font-black tabular-nums dashboard-number-anim mt-0.5 block ${
                analysis.netAfterHouseOnlyPerKm >= 0 ? 'text-blue-400' : 'text-rose-400'
              }`}
            >
              R$ {analysis.netAfterHouseOnlyPerKm.toFixed(2)} / km
            </span>
            <span className={`text-[9px] block mt-0.5 ${mutedText}`}>
              -R$ {analysis.houseCostPerKm.toFixed(2)}/km casa
            </span>
          </div>

          <div className={`rounded-xl p-2.5 border ${surfaceSubtle}`}>
            <span className={`block text-[10px] font-bold ${mutedText}`}>R$ / KM 100% Livre</span>
            <span
              className={`text-xs sm:text-sm font-black tabular-nums dashboard-number-anim mt-0.5 block ${
                analysis.freePerKm >= 0.8
                  ? 'text-emerald-400'
                  : analysis.freePerKm >= 0
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              R$ {analysis.freePerKm.toFixed(2)} / km
            </span>
            <span className={`text-[9px] block mt-0.5 ${mutedText}`}>
              Após Moto+Casa+Pessoal
            </span>
          </div>
        </div>

        {/* Botão de Ação: Lançar Direto no Registro */}
        <div className={`mt-3.5 flex gap-2 pt-2 border-t ${dividerBorder}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-3 rounded-xl text-xs font-bold cursor-pointer bg-transparent border ${dividerBorder} ${mutedText} hover:text-white hover:border-slate-500 transition-colors`}
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
            className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-transparent border border-[#FF6A1A] text-[#FF6A1A] hover:bg-[#FF6A1A]/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Aceitei essa Corrida! (Lançar Registro)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
