import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calculator, X, Delete, Check, CornerDownLeft, Plus, RefreshCw } from 'lucide-react';

export interface QuickCalculatorModalProps {
  isOpen: boolean;
  title?: string;
  initialValue?: string | number;
  unit?: 'currency' | 'km';
  currentOdometer?: number;
  onClose: () => void;
  onApply: (calculatedValue: string) => void;
  isDark?: boolean;
}

export function safeEvaluateMath(rawExpr: string): number {
  if (!rawExpr || !rawExpr.trim()) return 0;
  try {
    // 1. Sanitize: replace comma with dot, × with *, ÷ with /
    let clean = rawExpr
      .replace(/,/g, '.')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .trim();

    // Strip trailing operator if user hasn't typed the second operand yet
    clean = clean.replace(/[+\-*/]+$/, '').trim();
    if (!clean) return 0;

    // Handle percentage: e.g. "100 * 10%" -> "100 * (10/100)"
    clean = clean.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

    // Whitelist check: only digits, basic math symbols, spaces and dots
    if (!/^[0-9+\-*/. ()]+$/.test(clean)) return 0;

    const val = Function(`"use strict"; return (${clean});`)();
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
      return Math.round(val * 100) / 100;
    }
    return 0;
  } catch {
    return 0;
  }
}

export const QuickCalculatorModal: React.FC<QuickCalculatorModalProps> = ({
  isOpen,
  title = 'Calculadora de Valores',
  initialValue = '',
  unit = 'currency',
  currentOdometer,
  onClose,
  onApply,
  isDark = true,
}) => {
  const [expression, setExpression] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [baseOdometerInput, setBaseOdometerInput] = useState<string>('');
  const [dayOdometerInput, setDayOdometerInput] = useState<string>('');

  const hasOdometerMode = currentOdometer !== undefined && Number.isFinite(currentOdometer);
  const isKmUnit = unit === 'km' || hasOdometerMode;

  // When opening, initialize expression from initialValue if present and reset odometer fields
  useEffect(() => {
    if (isOpen) {
      const strVal = String(initialValue ?? '').trim().replace(',', '.');
      const num = parseFloat(strVal);
      if (!isNaN(num) && num > 0) {
        setExpression(String(num));
      } else {
        setExpression('');
      }
      if (currentOdometer !== undefined && Number.isFinite(currentOdometer)) {
        const roundedBase = Math.round(currentOdometer * 10) / 10;
        setBaseOdometerInput(String(roundedBase));
      } else {
        setBaseOdometerInput('');
      }
      setDayOdometerInput('');
    }
  }, [isOpen, initialValue, currentOdometer]);

  const recalcFromOdometer = useCallback((nextBaseStr: string, nextDayStr: string) => {
    const baseVal = parseFloat(nextBaseStr.replace(',', '.'));
    const dayVal = parseFloat(nextDayStr.replace(',', '.'));
    if (Number.isFinite(baseVal) && Number.isFinite(dayVal) && dayVal > baseVal) {
      const cleanBase = Math.round(baseVal * 10) / 10;
      const cleanDay = Math.round(dayVal * 10) / 10;
      setExpression(`${cleanDay} - ${cleanBase}`);
    }
  }, []);

  // Live evaluated result
  const currentResult = useMemo(() => {
    if (!expression) return 0;
    return safeEvaluateMath(expression);
  }, [expression]);

  const handleAppend = useCallback((char: string) => {
    setExpression(prev => {
      // If user inputs an operator (+, -, ×, ÷)
      const isOperator = ['+', '-', '×', '÷'].includes(char);
      if (isOperator) {
        if (!prev) return '0' + char;
        const lastChar = prev.slice(-1);
        if (['+', '-', '×', '÷'].includes(lastChar)) {
          return prev.slice(0, -1) + char;
        }
        return prev + char;
      }

      // If user inputs a decimal dot/comma
      if (char === '.' || char === ',') {
        const parts = prev.split(/[+\-×÷]/);
        const lastPart = parts[parts.length - 1];
        if (lastPart.includes('.')) return prev;
        if (!lastPart) return prev + '0.';
        return prev + '.';
      }

      // If user inputs '00'
      if (char === '00') {
        const parts = prev.split(/[+\-×÷]/);
        const lastPart = parts[parts.length - 1];
        if (!lastPart || lastPart === '0') return prev;
        return prev + '00';
      }

      // Digits
      return prev + char;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setExpression(prev => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setExpression('');
  }, []);

  const handleQuickAdd = useCallback((amount: number) => {
    setExpression(prev => {
      const current = safeEvaluateMath(prev);
      const next = Math.round((current + amount) * 100) / 100;
      return String(next);
    });
  }, []);

  const handleEquals = useCallback(() => {
    if (!expression) return;
    const res = safeEvaluateMath(expression);
    const formatted = res % 1 === 0 ? String(res) : res.toFixed(2);
    setHistory(prev => [expression + ' = ' + formatted, ...prev].slice(0, 5));
    setExpression(formatted);
  }, [expression]);

  const handleApply = useCallback(() => {
    const res = safeEvaluateMath(expression);
    const formatted = isKmUnit
      ? String(Math.round(res * 10) / 10)
      : res % 1 === 0
      ? String(res)
      : res.toFixed(2);
    onApply(formatted);
    onClose();
  }, [expression, isKmUnit, onApply, onClose]);

  // Physical keyboard listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleApply();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleApply();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleAppend(e.key);
      } else if (e.key === '+') {
        e.preventDefault();
        handleAppend('+');
      } else if (e.key === '-') {
        e.preventDefault();
        handleAppend('-');
      } else if (e.key === '*') {
        e.preventDefault();
        handleAppend('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleAppend('÷');
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        handleAppend('.');
      } else if (e.key === '=' ) {
        e.preventDefault();
        handleEquals();
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleApply, handleBackspace, handleAppend, handleEquals, handleClear]);

  if (!isOpen) return null;

  const bgModal = isDark
    ? 'bg-black border border-neutral-800 text-slate-100 shadow-2xl'
    : 'bg-white border border-slate-200 text-slate-900 shadow-2xl';
  const displaySurface = isDark
    ? 'bg-black border border-neutral-800 text-white'
    : 'bg-transparent border border-slate-300 text-slate-900';
  const keyPadPy = hasOdometerMode ? 'py-2' : 'py-2.5 sm:py-3';
  const numBtnClass = `${keyPadPy} rounded-xl cursor-pointer transition-all active:scale-95 border bg-transparent ${
    isDark
      ? 'hover:bg-white/10 active:bg-white/15 text-white border-neutral-800 shadow-xs'
      : 'hover:bg-slate-100 active:bg-slate-200 text-slate-900 border-slate-200 shadow-xs'
  }`;
  const opBtnClass = `${keyPadPy} rounded-xl cursor-pointer transition-all active:scale-95 bg-transparent hover:bg-[#FF6A1A]/15 active:bg-[#FF6A1A]/25 text-[#FF6A1A] border border-[#FF6A1A]/50 font-black`;
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';

  const formatResultDisplay = (val: number) => {
    if (isKmUnit) {
      const roundedKm = Math.round(val * 10) / 10;
      return `${roundedKm.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} km`;
    }
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const parsedBaseOdo = parseFloat(baseOdometerInput.replace(',', '.'));
  const parsedDayOdo = parseFloat(dayOdometerInput.replace(',', '.'));
  const odoDiffKm =
    Number.isFinite(parsedBaseOdo) && Number.isFinite(parsedDayOdo) && parsedDayOdo > parsedBaseOdo
      ? Math.round((parsedDayOdo - parsedBaseOdo) * 10) / 10
      : null;

  return (
    <div
      className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 flex flex-col ${hasOdometerMode ? 'gap-2.5' : 'gap-3'} max-h-[92dvh] overflow-y-auto ${bgModal}`}
        style={{
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-2 border-b ${dividerBorder} shrink-0`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-transparent border border-[#FF6A1A]/40 text-[#FF6A1A] flex items-center justify-center shadow-xs shrink-0">
              <Calculator className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black tracking-tight truncate">{title}</h3>
              <p className={`text-[10px] font-semibold truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {hasOdometerMode
                  ? 'Informe o odômetro do dia ou use a calculadora'
                  : 'Calcule e insira diretamente no campo'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl cursor-pointer transition-colors bg-transparent border shrink-0 ${dividerBorder} ${
              isDark ? 'text-slate-400 hover:text-white hover:border-slate-600' : 'text-slate-700 hover:text-slate-900 hover:border-slate-400'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Calculador Automático por Odômetro (apenas quando aberto no campo KM Rodados) */}
        {hasOdometerMode && (
          <div className={`p-2.5 rounded-2xl border ${dividerBorder} bg-transparent flex flex-col gap-2 shrink-0`}>
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0">
                <label className={`block text-[10px] font-bold mb-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Odômetro Atual da Moto
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={baseOdometerInput}
                  onChange={e => {
                    const nextBase = e.target.value;
                    setBaseOdometerInput(nextBase);
                    recalcFromOdometer(nextBase, dayOdometerInput);
                  }}
                  className={`w-full min-w-0 px-2.5 py-1.5 rounded-xl text-xs font-black tabular-nums outline-none border ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 text-slate-200 focus:border-[#FF6A1A]'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#FF6A1A]'
                  }`}
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[10px] font-black mb-1 text-[#FF6A1A] truncate">
                  Odômetro do Dia (km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder={baseOdometerInput ? `Ex: ${Math.round((parseFloat(baseOdometerInput) || 0) + 85)}` : 'Ex: 45200'}
                  value={dayOdometerInput}
                  onChange={e => {
                    const nextDay = e.target.value;
                    setDayOdometerInput(nextDay);
                    recalcFromOdometer(baseOdometerInput, nextDay);
                  }}
                  className={`w-full min-w-0 px-2.5 py-1.5 rounded-xl text-xs font-black tabular-nums outline-none border ${
                    isDark
                      ? 'bg-neutral-950 border-[#FF6A1A]/50 text-white focus:border-[#FF6A1A]'
                      : 'bg-white border-[#FF6A1A]/60 text-slate-900 focus:border-[#FF6A1A]'
                  }`}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                KMs rodados no dia:
              </span>
              {odoDiffKm !== null ? (
                <span className="text-emerald-500 dark:text-emerald-400 font-black tabular-nums">
                  {odoDiffKm.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} km
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">
                  {dayOdometerInput
                    ? `Digite acima de ${baseOdometerInput || 0} km`
                    : 'Digite o painel de hoje'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Display da Calculadora */}
        <div className={`p-3 rounded-2xl flex flex-col justify-end shrink-0 ${hasOdometerMode ? 'min-h-[64px]' : 'min-h-[78px]'} text-right ${displaySurface}`}>
          {/* Linha da Expressão */}
          <div className={`text-xs font-mono font-medium min-h-[16px] tracking-wider truncate ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            {expression || '0'}
          </div>
          {/* Linha do Resultado / Valor em Tempo Real */}
          <div className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-[#FF6A1A] dashboard-number-anim">
            {formatResultDisplay(currentResult)}
          </div>
        </div>

        {/* Atalhos Rápidos de Adição (Perfeito para gorjetas, combustível ou somas rápidas) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0 min-h-[32px] scrollbar-none">
          <span className={`text-[10px] font-black uppercase shrink-0 mr-0.5 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            + Rápido:
          </span>
          {[5, 10, 20, 50, 100].map(val => (
            <button
              key={val}
              type="button"
              onClick={() => handleQuickAdd(val)}
              className={`px-2 py-1 rounded-lg text-[11px] font-black border shrink-0 cursor-pointer transition-all active:scale-95 bg-transparent ${
                isDark
                  ? 'hover:border-[#FF6A1A] hover:text-[#FF6A1A] text-slate-200 border-neutral-800'
                  : 'hover:border-[#FF6A1A] hover:text-[#FF6A1A] text-slate-700 border-slate-300'
              }`}
            >
              +{val}
            </button>
          ))}
        </div>

        {/* Teclado da Calculadora (Grid 4 colunas) */}
        <div className="grid grid-cols-4 gap-2 text-base font-black shrink-0">
          {/* Linha 1 */}
          <button
            type="button"
            onClick={handleClear}
            className={`${keyPadPy} rounded-xl cursor-pointer transition-all active:scale-95 border bg-transparent ${
              isDark
                ? 'hover:bg-rose-500/10 active:bg-rose-500/20 text-rose-400 border-rose-500/40'
                : 'hover:bg-rose-50 active:bg-rose-100 text-rose-700 border-rose-300'
            }`}
            title="Limpar tudo"
          >
            C
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className={`${keyPadPy} rounded-xl cursor-pointer flex items-center justify-center transition-all active:scale-95 border bg-transparent ${
              isDark
                ? 'hover:bg-white/10 active:bg-white/15 text-slate-200 border-neutral-800'
                : 'hover:bg-slate-100 active:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Apagar dígito"
          >
            <Delete className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={() => handleAppend('%')}
            className={opBtnClass}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => handleAppend('÷')}
            className={opBtnClass}
          >
            ÷
          </button>

          {/* Linha 2 */}
          <button type="button" onClick={() => handleAppend('7')} className={numBtnClass}>7</button>
          <button type="button" onClick={() => handleAppend('8')} className={numBtnClass}>8</button>
          <button type="button" onClick={() => handleAppend('9')} className={numBtnClass}>9</button>
          <button type="button" onClick={() => handleAppend('×')} className={opBtnClass}>×</button>

          {/* Linha 3 */}
          <button type="button" onClick={() => handleAppend('4')} className={numBtnClass}>4</button>
          <button type="button" onClick={() => handleAppend('5')} className={numBtnClass}>5</button>
          <button type="button" onClick={() => handleAppend('6')} className={numBtnClass}>6</button>
          <button type="button" onClick={() => handleAppend('-')} className={opBtnClass}>-</button>

          {/* Linha 4 */}
          <button type="button" onClick={() => handleAppend('1')} className={numBtnClass}>1</button>
          <button type="button" onClick={() => handleAppend('2')} className={numBtnClass}>2</button>
          <button type="button" onClick={() => handleAppend('3')} className={numBtnClass}>3</button>
          <button type="button" onClick={() => handleAppend('+')} className={opBtnClass}>+</button>

          {/* Linha 5 */}
          <button type="button" onClick={() => handleAppend('0')} className={numBtnClass}>0</button>
          <button type="button" onClick={() => handleAppend('00')} className={numBtnClass}>00</button>
          <button type="button" onClick={() => handleAppend('.')} className={numBtnClass}>,</button>
          <button
            type="button"
            onClick={handleEquals}
            className={`${keyPadPy} rounded-xl bg-transparent hover:bg-emerald-500/10 active:bg-emerald-500/20 text-emerald-400 border border-emerald-500 font-black cursor-pointer shadow-sm flex items-center justify-center transition-all active:scale-95`}
          >
            =
          </button>
        </div>

        {/* Botão de Ação: Inserir no Campo */}
        <div className={`flex gap-2 pt-2 border-t ${dividerBorder} shrink-0`}>
          <button
            type="button"
            onClick={onClose}
            className={`py-3 px-4 rounded-xl text-xs font-bold cursor-pointer border bg-transparent ${dividerBorder} ${
              isDark
                ? 'hover:border-slate-500 text-slate-300'
                : 'hover:border-slate-400 text-slate-700'
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-transparent hover:bg-[#FF6A1A]/10 active:bg-[#FF6A1A]/20 text-[#FF6A1A] border border-[#FF6A1A] cursor-pointer flex items-center justify-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              Inserir {formatResultDisplay(currentResult)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
