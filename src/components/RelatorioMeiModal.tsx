import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileText,
  Calendar,
  CheckCircle2,
  Download,
  Building,
  User,
  Bike,
  ShieldCheck,
} from 'lucide-react';
import { RideEntry, ExpenseEntry, UserProfile, FuelDiagnosticsConfig } from '../services/supabaseSync';

interface RelatorioMeiModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: RideEntry[];
  expenses: ExpenseEntry[];
  currentUser: UserProfile | null;
  fuelConfig: FuelDiagnosticsConfig;
  isDark: boolean;
}

export function RelatorioMeiModal({
  isOpen,
  onClose,
  entries,
  expenses,
  currentUser,
  fuelConfig,
  isDark,
}: RelatorioMeiModalProps) {
  // Select year and month (default to current year-month)
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);

  // Available months from entries + expenses
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentYearMonth);
    entries.forEach(e => {
      if (e.date && e.date.length >= 7) set.add(e.date.slice(0, 7));
    });
    expenses.forEach(ex => {
      if (ex.date && ex.date.length >= 7) set.add(ex.date.slice(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [entries, expenses, currentYearMonth]);

  // Filtered entries and expenses for selected month
  const monthData = useMemo(() => {
    const mEntries = entries.filter(e => e.date && e.date.startsWith(selectedMonth));
    const mExpenses = expenses.filter(ex => ex.date && ex.date.startsWith(selectedMonth));

    const totalRevenue = mEntries.reduce((s, e) => s + (Number(e.revenue) || 0), 0);
    const totalKm = mEntries.reduce((s, e) => s + (Number(e.km) || 0), 0);
    const totalHours = mEntries.reduce((s, e) => s + (Number(e.hours) || 0), 0);
    const totalExpenses = mExpenses.reduce((s, ex) => s + (Number(ex.amount) || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    // Breakdown by App
    const appMap: Record<string, { app: string; count: number; rev: number; km: number }> = {};
    mEntries.forEach(e => {
      const app = e.app || 'Outros';
      if (!appMap[app]) {
        appMap[app] = { app, count: 0, rev: 0, km: 0 };
      }
      appMap[app].count += 1;
      appMap[app].rev += Number(e.revenue || 0);
      appMap[app].km += Number(e.km || 0);
    });

    // Breakdown by Expense Category
    const catMap: Record<string, { cat: string; count: number; amount: number }> = {};
    mExpenses.forEach(ex => {
      const cat = ex.category || 'Geral';
      if (!catMap[cat]) {
        catMap[cat] = { cat, count: 0, amount: 0 };
      }
      catMap[cat].count += 1;
      catMap[cat].amount += Number(ex.amount || 0);
    });

    const activeDays = new Set([...mEntries.map(e => e.date), ...mExpenses.map(e => e.date)]).size;

    return {
      entries: mEntries,
      expenses: mExpenses,
      totalRevenue,
      totalKm,
      totalHours,
      totalExpenses,
      netProfit,
      activeDays,
      byApp: Object.values(appMap).sort((a, b) => b.rev - a.rev),
      byCategory: Object.values(catMap).sort((a, b) => b.amount - a.amount),
    };
  }, [entries, expenses, selectedMonth]);

  // Format month name in Portuguese (e.g., "Outubro de 2026")
  const formattedMonthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    const monthsPt = [
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
    const monthName = monthsPt[parseInt(m, 10) - 1] || m;
    return `${monthName} de ${y}`;
  }, [selectedMonth]);

  if (!isOpen) return null;

  const surfaceCard = isDark ? 'bg-[#12141C] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const surfaceSubtle = isDark ? 'bg-slate-900/70 border border-slate-800' : 'bg-slate-100 border border-slate-200';
  const inputSurface = isDark ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`w-full max-w-2xl rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 flex flex-col max-h-[92vh] overflow-y-auto shadow-2xl border ${surfaceCard}`}
      >
        {/* Print-specific style tag */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden; }
              #printable-mei-report, #printable-mei-report * { visibility: visible; }
              #printable-mei-report {
                position: fixed;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                color: black !important;
                padding: 24px;
                font-family: sans-serif;
              }
              .no-print { display: none !important; }
            }
          `
        }} />

        {/* Header (No print) */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800/50 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500 text-black flex items-center justify-center font-black">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black">Extrato & Relatório Mensal MEI</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  Pronto p/ PDF
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs ${mutedText}`}>
                Demonstrativo fiscal de faturamento, despesas operacionais e comprovante de rendimentos
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

        {/* Month Selector Bar (No print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-3 p-3 rounded-2xl border border-sky-500/30 bg-sky-500/5 no-print">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold">Mês de Apuração:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black outline-none cursor-pointer ${inputSurface}`}
            >
              {availableMonths.map(m => {
                const [y, mon] = m.split('-');
                return (
                  <option key={m} value={m}>
                    {mon}/{y}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl text-xs font-black bg-sky-400 text-black hover:bg-sky-300 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Salvar em PDF / Imprimir</span>
          </button>
        </div>

        {/* Printable Document Container */}
        <div
          id="printable-mei-report"
          className={`p-4 sm:p-6 rounded-2xl border ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Header of Report */}
          <div className="border-b-2 border-slate-400/40 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-[#FF6A1A]">Mochilinha</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-black/10">Gestão para Entregadores</span>
              </div>
              <h1 className="text-base sm:text-lg font-black mt-1">
                DEMONSTRATIVO DE RENDIMENTOS & APURAÇÃO MENSAL (MEI)
              </h1>
              <p className="text-xs text-slate-500">
                Período de Referência: <strong>{formattedMonthLabel}</strong>
              </p>
            </div>

            <div className="text-left sm:text-right text-xs">
              <span className="block font-bold">Piloto: {currentUser?.name || 'Entregador de Aplicativo'}</span>
              <span className="block text-slate-500">E-mail: {currentUser?.email || '—'}</span>
              <span className="block text-slate-500">
                Veículo: {fuelConfig.bikeModelName || 'Moto'} ({fuelConfig.kmPerLiter} km/L)
              </span>
            </div>
          </div>

          {/* 3 Main Fiscal Indicators */}
          <div className="grid grid-cols-3 gap-2.5 my-4">
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-center">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">1. Faturamento Bruto</span>
              <span className="text-sm sm:text-lg font-black tabular-nums text-sky-500 mt-0.5 block">
                R$ {monthData.totalRevenue.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 block">Receita Bruta Total</span>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">2. Despesas Operacionais</span>
              <span className="text-sm sm:text-lg font-black tabular-nums text-rose-500 mt-0.5 block">
                - R$ {monthData.totalExpenses.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 block">Combustível + Manutenção</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">3. Lucro Líquido Real</span>
              <span className="text-sm sm:text-lg font-black tabular-nums text-emerald-500 mt-0.5 block">
                R$ {monthData.netProfit.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 block">Rendimento Livre Apurado</span>
            </div>
          </div>

          {/* Operational Metrics Row */}
          <div className="p-3 rounded-xl border border-slate-700/30 text-xs flex flex-wrap items-center justify-around gap-2 mb-4">
            <span>
              <strong>Dias Trabalhados:</strong> {monthData.activeDays} dias
            </span>
            <span>
              <strong>Total de Corridas:</strong> {monthData.entries.length} reg(s)
            </span>
            <span>
              <strong>KM Rodados:</strong> {monthData.totalKm.toLocaleString('pt-BR')} km
            </span>
            <span>
              <strong>Horas Rodadas:</strong> {monthData.totalHours.toFixed(1)}h
            </span>
          </div>

          {/* Breakdown by App */}
          <div className="mb-4">
            <h4 className="text-xs font-black uppercase text-[#FF6A1A] mb-1.5">
              • Faturamento por Aplicativo / Origem
            </h4>
            {monthData.byApp.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhum registro de faturamento neste mês.</p>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/50 font-bold text-slate-400">
                    <th className="py-1.5">Aplicativo / Local</th>
                    <th className="py-1.5 text-center">Qtd. Corridas</th>
                    <th className="py-1.5 text-center">KM Rodados</th>
                    <th className="py-1.5 text-right">Faturamento Bruto</th>
                  </tr>
                </thead>
                <tbody>
                  {monthData.byApp.map((app, idx) => (
                    <tr key={idx} className="border-b border-slate-800/30 font-medium">
                      <td className="py-1.5 font-bold">{app.app}</td>
                      <td className="py-1.5 text-center">{app.count}</td>
                      <td className="py-1.5 text-center">{app.km.toLocaleString('pt-BR')} km</td>
                      <td className="py-1.5 text-right font-bold text-sky-400">R$ {app.rev.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Breakdown by Expense Category */}
          <div className="mb-4">
            <h4 className="text-xs font-black uppercase text-rose-400 mb-1.5">
              • Despesas Operacionais Comprovadas por Categoria
            </h4>
            {monthData.byCategory.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhuma despesa lançada neste mês.</p>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/50 font-bold text-slate-400">
                    <th className="py-1.5">Categoria da Despesa</th>
                    <th className="py-1.5 text-center">Lançamentos</th>
                    <th className="py-1.5 text-right">Valor Total Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {monthData.byCategory.map((cat, idx) => (
                    <tr key={idx} className="border-b border-slate-800/30 font-medium">
                      <td className="py-1.5 font-bold">{cat.cat}</td>
                      <td className="py-1.5 text-center">{cat.count}</td>
                      <td className="py-1.5 text-right font-bold text-rose-400">- R$ {cat.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Legal / MEI Compliance Notice & Signature Block */}
          <div className="border-t-2 border-slate-400/40 pt-4 mt-4 flex flex-col sm:flex-row items-end justify-between gap-4 text-[11px] text-slate-500">
            <div className="max-w-xs leading-snug">
              <p>
                Este demonstrativo foi gerado eletronicamente com base nas corridas e despesas registradas no aplicativo
                Mochilinha, válido para suporte à Declaração Anual do MEI (DASN-SIMEI) e comprovação de rendimentos.
              </p>
              <p className="mt-1">Emitido em: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>

            <div className="text-center w-56 pt-6 border-t border-slate-400 text-xs font-bold text-slate-700 dark:text-slate-300">
              Assinatura do Entregador
            </div>
          </div>
        </div>

        {/* Bottom Actions (No print) */}
        <div className="mt-4 flex justify-end gap-2 no-print">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${surfaceSubtle}`}
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
