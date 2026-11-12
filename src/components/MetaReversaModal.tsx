import React, { useState, useMemo } from 'react';
import {
  X,
  Target,
  Calculator,
  TrendingUp,
  Fuel,
  Wrench,
  Utensils,
  FileText,
  Shield,
  Check,
  CheckCircle2,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { FreeNumberInput } from './FreeNumberInput';
import { FuelDiagnosticsConfig, MaintenanceItem, FinancialPlanningConfig } from '../services/supabaseSync';

interface MetaReversaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fuelConfig: FuelDiagnosticsConfig;
  maintenanceItems: MaintenanceItem[];
  financialPlan: FinancialPlanningConfig;
  householdMonthlyCost?: number;
  currentDailyGoal: number;
  onApplyDailyGoal: (newDailyGoal: number) => void;
  isDark: boolean;
}

export function MetaReversaModal({
  isOpen,
  onClose,
  fuelConfig,
  maintenanceItems,
  financialPlan,
  householdMonthlyCost = 0,
  currentDailyGoal,
  onApplyDailyGoal,
  isDark,
}: MetaReversaModalProps) {
  const [desejadoMensal, setDesejadoMensal] = useState<number>(3500);
  const [diasMes, setDiasMes] = useState<number>(financialPlan.workDaysPerMonth || 24);
  const [horasDia, setHorasDia] = useState<number>(8);
  const [kmMedioDia, setKmMedioDia] = useState<number>(100);
  const [includeHousehold, setIncludeHousehold] = useState<boolean>(true);

  // Calculations for reverse financial engineering
  const results = useMemo(() => {
    const netTargetMonth = Math.max(100, Number(desejadoMensal) || 3500);
    const days = Math.max(1, Number(diasMes) || 24);
    const hours = Math.max(1, Number(horasDia) || 8);
    const km = Math.max(10, Number(kmMedioDia) || 100);

    const netTargetDaily = netTargetMonth / days;

    // Fuel cost per day
    const kmPerL = Math.max(5, Number(fuelConfig.kmPerLiter) || 35);
    const fuelPrice = Math.max(0.5, Number(fuelConfig.fuelPrice) || 5.8);
    const dailyFuelCost = (km / kmPerL) * fuelPrice;

    // Maintenance cost per day
    let maintPerKm = 0;
    if (Array.isArray(maintenanceItems) && maintenanceItems.length > 0) {
      maintenanceItems.forEach(item => {
        const cost = Number(item.costEstimate || 0);
        const interval = Math.max(500, Number(item.intervalKm || 1000));
        if (cost > 0 && interval > 0) {
          maintPerKm += cost / interval;
        }
      });
    }
    if (maintPerKm <= 0) maintPerKm = 0.085;
    const dailyMaintCost = maintPerKm * km;

    // Food cost per day
    const dailyFood = Number(financialPlan.dailyLunchBudget || 18) + Number(financialPlan.dailySnackBudget || 7);

    // Docs cost per day (IPVA, Licenciamento, MEI/Seguro)
    const annualDocs = Number(financialPlan.ipvaAnnual || 350) + Number(financialPlan.licensingAnnual || 160) + Number(financialPlan.otherDocsAnnual || 120);
    const monthlyMei = Number(financialPlan.insuranceOrMeiMonthly || 75);
    const totalAnnualDocsWithMei = annualDocs + monthlyMei * 12;
    const dailyDocsCost = totalAnnualDocsWithMei / Math.max(12, days * 12);

    // Household cost per day
    const dailyHouseholdCost = includeHousehold
      ? Math.max(0, Number(householdMonthlyCost) || 0) / days
      : 0;

    // Non-emergency base gross
    const fixedCostsDaily = dailyFuelCost + dailyMaintCost + dailyFood + dailyDocsCost + dailyHouseholdCost;
    const emergencyPct = Math.min(30, Math.max(0, Number(financialPlan.emergencyReservePct || 10))) / 100;

    // (Gross * (1 - emergencyPct)) = netTargetDaily + fixedCostsDaily
    // => Gross = (netTargetDaily + fixedCostsDaily) / (1 - emergencyPct)
    const factor = Math.max(0.01, 1 - emergencyPct);
    const neededDailyGross = Math.ceil((netTargetDaily + fixedCostsDaily) / factor);
    const neededMonthlyGross = neededDailyGross * days;
    const neededPerHour = neededDailyGross / hours;
    const dailyEmergencyCost = neededDailyGross * emergencyPct;

    return {
      netTargetMonth,
      netTargetDaily,
      days,
      hours,
      km,
      dailyFuelCost,
      dailyMaintCost,
      dailyFood,
      dailyDocsCost,
      dailyHouseholdCost,
      dailyEmergencyCost,
      neededDailyGross,
      neededMonthlyGross,
      neededPerHour,
      fixedCostsDaily,
    };
  }, [desejadoMensal, diasMes, horasDia, kmMedioDia, fuelConfig, maintenanceItems, financialPlan, householdMonthlyCost, includeHousehold]);

  if (!isOpen) return null;

  const surfaceCard = isDark ? 'bg-black border border-neutral-800 text-slate-100 shadow-2xl' : 'bg-white border border-slate-200 text-slate-900 shadow-2xl';
  const surfaceSubtle = isDark ? 'bg-transparent border border-neutral-800' : 'bg-transparent border border-slate-200';
  const inputSurface = isDark ? 'bg-black border border-neutral-800 text-white focus:border-[#FF6A1A]' : 'bg-transparent border border-slate-300 text-slate-900 focus:border-[#FF6A1A]';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 flex flex-col max-h-[90vh] overflow-y-auto shadow-2xl border ${surfaceCard}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 sm:pb-4 border-b ${dividerBorder}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-transparent border border-emerald-500/50 text-emerald-400 flex items-center justify-center font-black">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm sm:text-base font-black">Simulador de Meta Reversa</h3>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border bg-transparent ${
                  isDark ? 'text-emerald-400 border-emerald-500/40' : 'text-emerald-800 border-emerald-300'
                }`}>
                  Lucro Limpo
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs ${mutedText}`}>
                Descubra quanto você precisa faturar por dia para levar o salário dos seus sonhos para casa
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

        {/* Input Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className={`p-3 rounded-2xl border ${surfaceSubtle}`}>
            <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              Salário Limpo no Bolso / Mês (R$)
            </label>
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>R$</span>
              <FreeNumberInput
                step="100"
                value={desejadoMensal}
                onValueChange={val => setDesejadoMensal(val)}
                className={`w-full px-3 py-2 rounded-xl text-base font-black tabular-nums outline-none ${inputSurface}`}
              />
            </div>
            <div className="flex gap-1 mt-2">
              {[2500, 3500, 4500, 6000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDesejadoMensal(val)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                    desejadoMensal === val
                      ? 'bg-transparent border border-emerald-500 text-emerald-400'
                      : `bg-transparent border ${dividerBorder} ${mutedText} hover:border-slate-500`
                  }`}
                >
                  {val / 1000}k
                </button>
              ))}
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${surfaceSubtle} flex flex-col justify-between`}>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={`block text-[10px] font-bold ${mutedText}`}>Dias / Mês</label>
                <FreeNumberInput
                  value={diasMes}
                  onValueChange={val => setDiasMes(val)}
                  className={`w-full px-2 py-1.5 rounded-xl text-center text-xs font-black tabular-nums outline-none mt-1 ${inputSurface}`}
                />
              </div>
              <div>
                <label className={`block text-[10px] font-bold ${mutedText}`}>Horas / Dia</label>
                <FreeNumberInput
                  value={horasDia}
                  onValueChange={val => setHorasDia(val)}
                  className={`w-full px-2 py-1.5 rounded-xl text-center text-xs font-black tabular-nums outline-none mt-1 ${inputSurface}`}
                />
              </div>
              <div>
                <label className={`block text-[10px] font-bold ${mutedText}`}>KM / Dia</label>
                <FreeNumberInput
                  value={kmMedioDia}
                  onValueChange={val => setKmMedioDia(val)}
                  className={`w-full px-2 py-1.5 rounded-xl text-center text-xs font-black tabular-nums outline-none mt-1 ${inputSurface}`}
                />
              </div>
            </div>
            <span className={`text-[10px] font-semibold mt-1.5 ${mutedText}`}>
              Base: {diasMes} dias x {horasDia}h de trabalho ({kmMedioDia} km/dia)
            </span>
          </div>
        </div>

        {/* Highlight Result Card */}
        <div className="mt-3.5 p-4 rounded-2xl bg-transparent border border-[#FF6A1A]/40 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-[#FF6A1A] tracking-wider">
              Sua Meta Diária Necessária
            </span>
            <span className="text-xs font-black text-[#FF6A1A] tabular-nums dashboard-number-anim">
              R$ {results.neededPerHour.toFixed(2)} / hora
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="text-2xl sm:text-3xl font-black tabular-nums dashboard-number-anim text-[#FF6A1A]">
                R$ {results.neededDailyGross.toLocaleString('pt-BR')} <span className="text-xs font-bold text-slate-400">/ dia</span>
              </div>
              <span className={`text-[11px] ${mutedText}`}>
                Faturamento bruto mensal total: <strong>R$ {results.neededMonthlyGross.toLocaleString('pt-BR')}</strong>
              </span>
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-bold uppercase block ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Sobra Limpo</span>
              <span className={`text-lg sm:text-xl font-black tabular-nums dashboard-number-anim ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                R$ {results.netTargetDaily.toFixed(2)}/dia
              </span>
            </div>
          </div>
        </div>

        {/* Transparent Cost Breakdown */}
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={`block text-[11px] font-bold uppercase ${mutedText}`}>
              Divisão Diária: Onde vai o faturamento de R$ {results.neededDailyGross}?
            </span>
            {householdMonthlyCost > 0 && (
              <button
                type="button"
                onClick={() => setIncludeHousehold(!includeHousehold)}
                className={`text-[10px] font-black px-2 py-0.5 rounded-lg border transition-colors cursor-pointer bg-transparent ${
                  includeHousehold
                    ? isDark
                      ? 'text-blue-400 border-blue-500/40'
                      : 'text-blue-700 border-blue-300'
                    : isDark
                    ? 'text-slate-400 border-neutral-800'
                    : 'text-slate-700 border-slate-300'
                }`}
              >
                {includeHousehold ? '✓ Contas Casa Inclusas' : '+ Incluir Contas Casa'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className={`p-2.5 rounded-xl border ${surfaceSubtle}`}>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 dark:text-amber-400">
                <Fuel className="w-3.5 h-3.5" />
                <span>Gasolina</span>
              </div>
              <span className="text-xs sm:text-sm font-black tabular-nums dashboard-number-anim block mt-1">
                R$ {results.dailyFuelCost.toFixed(2)}
              </span>
            </div>

            <div className={`p-2.5 rounded-xl border ${surfaceSubtle}`}>
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 dark:text-rose-400">
                <Wrench className="w-3.5 h-3.5" />
                <span>Manutenção</span>
              </div>
              <span className="text-xs sm:text-sm font-black tabular-nums dashboard-number-anim block mt-1">
                R$ {results.dailyMaintCost.toFixed(2)}
              </span>
            </div>

            <div className={`p-2.5 rounded-xl border ${surfaceSubtle}`}>
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-500 dark:text-sky-400">
                <Utensils className="w-3.5 h-3.5" />
                <span>Almoço/Lanche</span>
              </div>
              <span className="text-xs sm:text-sm font-black tabular-nums dashboard-number-anim block mt-1">
                R$ {results.dailyFood.toFixed(2)}
              </span>
            </div>

            <div className={`p-2.5 rounded-xl border ${surfaceSubtle}`}>
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-500 dark:text-purple-400">
                <FileText className="w-3.5 h-3.5" />
                <span>IPVA/MEI/Docs</span>
              </div>
              <span className="text-xs sm:text-sm font-black tabular-nums dashboard-number-anim block mt-1">
                R$ {results.dailyDocsCost.toFixed(2)}
              </span>
            </div>

            {includeHousehold && results.dailyHouseholdCost > 0 && (
              <div className={`p-2.5 rounded-xl border bg-transparent ${isDark ? 'border-blue-500/40 text-blue-400' : 'border-blue-300 text-blue-700'}`}>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span>🏠</span>
                  <span>Contas da Casa</span>
                </div>
                <span className="text-xs sm:text-sm font-black tabular-nums dashboard-number-anim block mt-1">
                  R$ {results.dailyHouseholdCost.toFixed(2)}
                </span>
              </div>
            )}

            <div className={`p-2.5 rounded-xl border ${surfaceSubtle}`}>
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400">
                <Shield className="w-3.5 h-3.5" />
                <span>Emergência (10%)</span>
              </div>
              <span className="text-xs sm:text-sm font-black tabular-nums dashboard-number-anim block mt-1">
                R$ {results.dailyEmergencyCost.toFixed(2)}
              </span>
            </div>

            <div className={`p-2.5 rounded-xl border bg-transparent ${
              isDark ? 'border-emerald-500/40 text-emerald-400' : 'border-emerald-300 text-emerald-700'
            }`}>
              <div className="flex items-center gap-1.5 text-xs font-black">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>LUCRO LIMPO</span>
              </div>
              <span className="text-xs sm:text-sm font-black tabular-nums dashboard-number-anim block mt-1">
                R$ {results.netTargetDaily.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button: Apply as current daily goal */}
        <div className={`mt-4 flex gap-2 pt-2 border-t ${dividerBorder}`}>
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
              onApplyDailyGoal(results.neededDailyGross);
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-transparent border border-[#FF6A1A] text-[#FF6A1A] hover:bg-[#FF6A1A]/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Aplicar R$ {results.neededDailyGross}/dia como Minha Meta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
