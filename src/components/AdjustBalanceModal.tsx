import React, { useState, useEffect } from 'react';
import { X, Check, SlidersHorizontal, ArrowUpRight, ArrowDownRight, Wallet, Calendar, FileText } from 'lucide-react';

interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onConfirmAdjust: (params: {
    targetBalance: number;
    diff: number;
    date: string;
    notes: string;
  }) => void;
  isDark?: boolean;
}

function fmtBRL(val: number): string {
  return (val || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const AdjustBalanceModal: React.FC<AdjustBalanceModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  onConfirmAdjust,
  isDark = true,
}) => {
  const [newBalanceInput, setNewBalanceInput] = useState<string>('');
  const [adjustDate, setAdjustDate] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('Ajuste de Saldo');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setNewBalanceInput(currentBalance.toFixed(2).replace('.', ','));
      const today = new Date().toISOString().split('T')[0];
      setAdjustDate(today);
      setAdjustReason('Ajuste de Saldo');
      setErrorMsg('');
    }
  }, [isOpen, currentBalance]);

  if (!isOpen) return null;

  const parsedNewBalance = parseFloat(
    newBalanceInput.replace(/\./g, '').replace(',', '.').trim()
  );
  const isValidNumber = !isNaN(parsedNewBalance);
  const diff = isValidNumber ? Math.round((parsedNewBalance - currentBalance) * 100) / 100 : 0;
  const isDifferent = Math.abs(diff) >= 0.01;
  const isSurplus = diff > 0.009; // Excedente (Ganho)
  const isDeficit = diff < -0.009; // Faltante (Gasto)

  const handleApplyShortcut = (delta: number) => {
    const base = isValidNumber ? parsedNewBalance : currentBalance;
    const next = Math.round((base + delta) * 100) / 100;
    setNewBalanceInput(next.toFixed(2).replace('.', ','));
  };

  const handleSetZero = () => {
    setNewBalanceInput('0,00');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidNumber) {
      setErrorMsg('Informe um valor de saldo válido.');
      return;
    }
    if (!isDifferent) {
      setErrorMsg('O novo saldo é idêntico ao saldo atual. Altere o valor para realizar um ajuste.');
      return;
    }

    onConfirmAdjust({
      targetBalance: parsedNewBalance,
      diff,
      date: adjustDate || new Date().toISOString().split('T')[0],
      notes: adjustReason.trim() || 'Ajuste de Saldo',
    });
    onClose();
  };

  const modalBg = isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const surfaceSubtle = isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-100 border-slate-200';
  const inputBg = isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${modalBg}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-modal-title"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6A1A]/15 border border-[#FF6A1A]/30 text-[#FF6A1A] flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 id="adjust-modal-title" className="text-base sm:text-lg font-black leading-tight">
                Ajustar Saldo Atual
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Alinhe o saldo do app com o saldo real do seu bolso ou conta
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4">
          {/* Card: Saldo Atual no Sistema */}
          <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${surfaceSubtle}`}>
            <div className="flex items-center gap-2.5">
              <Wallet className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Saldo Atual no Sistema:
              </span>
            </div>
            <span
              className={`text-base sm:text-lg font-black tabular-nums ${
                currentBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {fmtBRL(currentBalance)}
            </span>
          </div>

          {/* Input do Novo Saldo Real */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#FF6A1A] mb-1.5">
              Novo Saldo Real (R$):
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={newBalanceInput}
                onChange={e => {
                  setNewBalanceInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="0,00"
                className={`w-full pl-11 pr-4 py-3 rounded-2xl text-xl sm:text-2xl font-black tabular-nums border outline-none focus:ring-2 focus:ring-[#FF6A1A]/40 focus:border-[#FF6A1A] transition-all ${inputBg}`}
                autoFocus
              />
            </div>
          </div>

          {/* Atalhos Rápidos */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Atalhos:
            </span>
            <button
              type="button"
              onClick={() => handleApplyShortcut(10)}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
            >
              +R$ 10
            </button>
            <button
              type="button"
              onClick={() => handleApplyShortcut(50)}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
            >
              +R$ 50
            </button>
            <button
              type="button"
              onClick={() => handleApplyShortcut(100)}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
            >
              +R$ 100
            </button>
            <button
              type="button"
              onClick={() => handleApplyShortcut(-10)}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
            >
              -R$ 10
            </button>
            <button
              type="button"
              onClick={() => handleApplyShortcut(-50)}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
            >
              -R$ 50
            </button>
            <button
              type="button"
              onClick={handleSetZero}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-700/30 text-slate-300 hover:bg-slate-700/60 border border-slate-600/40 transition-all cursor-pointer"
            >
              Zerar (R$ 0)
            </button>
          </div>

          {/* CARD DO CÁLCULO AUTOMÁTICO DO AJUSTE */}
          {isValidNumber && isDifferent && (
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                isSurplus
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between font-black text-sm mb-1.5">
                <span className="flex items-center gap-1.5">
                  {isSurplus ? (
                    <>
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      <span>Excedente Identificado:</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="w-4 h-4 text-rose-400" />
                      <span>Valor Faltante Identificado:</span>
                    </>
                  )}
                </span>
                <span className="text-base tabular-nums font-black">
                  {isSurplus ? `+${fmtBRL(diff)}` : `-${fmtBRL(Math.abs(diff))}`}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isSurplus ? (
                  <>
                    Será criada <strong>automaticamente uma transação de Ganho (Entrada)</strong> no valor de{' '}
                    <strong className="text-emerald-400">{fmtBRL(diff)}</strong> com o aplicativo/motivo{' '}
                    <em>"Ajuste de Saldo"</em> para igualar seu caixa.
                  </>
                ) : (
                  <>
                    Será criada <strong>automaticamente uma transação de Gasto (Despesa)</strong> no valor de{' '}
                    <strong className="text-rose-400">{fmtBRL(Math.abs(diff))}</strong> com a categoria{' '}
                    <em>"Ajuste de Saldo"</em> para equilibrar seu caixa.
                  </>
                )}
              </p>
            </div>
          )}

          {isValidNumber && !isDifferent && (
            <div className={`p-3 rounded-2xl border text-xs text-slate-400 text-center ${surfaceSubtle}`}>
              O valor digitado é igual ao saldo atual do sistema. Nenhuma transação será gerada.
            </div>
          )}

          {/* Detalhes Opcionais: Data e Motivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/40">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Data do Ajuste:</span>
              </label>
              <input
                type="date"
                value={adjustDate}
                onChange={e => setAdjustDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none ${inputBg}`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Motivo / Observação:</span>
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                placeholder="Ex: Diferença de caixinha"
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none ${inputBg}`}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* BOTÕES DE AÇÃO */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${surfaceSubtle} hover:bg-slate-800`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isDifferent || !isValidNumber}
              className={`flex-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                !isDifferent || !isValidNumber
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                  : 'bg-[#FF6A1A] hover:bg-[#ff7b33] text-black shadow-[#FF6A1A]/20 active:scale-98'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isDifferent
                  ? `Confirmar Ajuste (${isSurplus ? '+' : '-'}${fmtBRL(Math.abs(diff))})`
                  : 'Ajustar Saldo'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
