import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calculator, X, Delete, Check, CornerDownLeft, Plus, RefreshCw } from 'lucide-react';

export interface QuickCalculatorModalProps {
  isOpen: boolean;
  title?: string;
  initialValue?: string | number;
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
  onClose,
  onApply,
  isDark = true,
}) => {
  const [expression, setExpression] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);

  // When opening, initialize expression from initialValue if present
  useEffect(() => {
    if (isOpen) {
      const strVal = String(initialValue ?? '').trim().replace(',', '.');
      const num = parseFloat(strVal);
      if (!isNaN(num) && num > 0) {
        setExpression(String(num));
      } else {
        setExpression('');
      }
    }
  }, [isOpen, initialValue]);

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
    const formatted = res % 1 === 0 ? String(res) : res.toFixed(2);
    onApply(formatted);
    onClose();
  }, [expression, onApply, onClose]);

  // Physical keyboard listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
    ? 'bg-[#12141C] border border-slate-800 text-slate-100 shadow-2xl'
    : 'bg-white border border-slate-200 text-slate-900 shadow-2xl';
  const displaySurface = isDark
    ? 'bg-[#090A0F] border border-slate-800 text-white'
    : 'bg-slate-100 border border-slate-300 text-slate-900';
  const numBtnClass = isDark
    ? 'bg-[#181B26] hover:bg-[#202535] active:bg-[#282e42] text-white border border-slate-800/80 shadow-xs'
    : 'bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 border border-slate-200 shadow-xs';
  const opBtnClass = 'bg-[#FF6A1A]/15 hover:bg-[#FF6A1A]/25 active:bg-[#FF6A1A]/35 text-[#FF6A1A] border border-[#FF6A1A]/40 font-black';

  return (
    <div
      className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 flex flex-col gap-3 ${bgModal}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-2 border-b ${
          isDark ? 'border-slate-800/60' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FF6A1A] text-black flex items-center justify-center shadow-xs">
              <Calculator className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">{title}</h3>
              <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Calcule e insira diretamente no campo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl cursor-pointer transition-colors ${
              isDark ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Display da Calculadora */}
        <div className={`p-3.5 rounded-2xl flex flex-col justify-end min-h-[82px] text-right ${displaySurface}`}>
          {/* Linha da Expressão */}
          <div className={`text-xs font-mono font-medium min-h-[18px] tracking-wider truncate ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            {expression || '0'}
          </div>
          {/* Linha do Resultado / Valor em Tempo Real */}
          <div className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-[#FF6A1A]">
            R$ {currentResult.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Atalhos Rápidos de Adição (Perfeito para gorjetas, combustível ou somas rápidas) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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
              className={`px-2 py-1 rounded-lg text-[11px] font-black border shrink-0 cursor-pointer transition-all active:scale-95 ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-[#FF6A1A] hover:text-black text-slate-200 border-slate-700/60'
                  : 'bg-slate-100 hover:bg-[#FF6A1A] hover:text-black text-slate-700 border-slate-300'
              }`}
            >
              +{val}
            </button>
          ))}
        </div>

        {/* Teclado da Calculadora (Grid 4 colunas) */}
        <div className="grid grid-cols-4 gap-2 text-base font-black">
          {/* Linha 1 */}
          <button
            type="button"
            onClick={handleClear}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 border ${
              isDark
                ? 'bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500 text-rose-400 hover:text-rose-200 border-rose-500/40'
                : 'bg-rose-50 hover:bg-rose-100 active:bg-rose-500 text-rose-700 border-rose-300'
            }`}
            title="Limpar tudo"
          >
            C
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className={`py-3 rounded-xl cursor-pointer flex items-center justify-center transition-all active:scale-95 border ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-750 active:bg-slate-700 text-slate-200 border-slate-700/60'
                : 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border-slate-300'
            }`}
            title="Apagar dígito"
          >
            <Delete className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={() => handleAppend('%')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${opBtnClass}`}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => handleAppend('÷')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${opBtnClass}`}
          >
            ÷
          </button>

          {/* Linha 2 */}
          <button
            type="button"
            onClick={() => handleAppend('7')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${numBtnClass}`}
          >
            7
          </button>
          <button
            type="button"
            onClick={() => handleAppend('8')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${numBtnClass}`}
          >
            8
          </button>
          <button
            type="button"
            onClick={() => handleAppend('9')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${numBtnClass}`}
          >
            9
          </button>
          <button
            type="button"
            onClick={() => handleAppend('×')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${opBtnClass}`}
          >
            ×
          </button>

          {/* Linha 3 */}
          <button
            type="button"
            onClick={() => handleAppend('4')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${numBtnClass}`}
          >
            4
          </button>
          <button
            type="button"
            onClick={() => handleAppend('5')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${numBtnClass}`}
          >
            5
          </button>
          <button
            type="button"
            onClick={() => handleAppend('6')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${numBtnClass}`}
          >
            6
          </button>
          <button
            type="button"
            onClick={() => handleAppend('-')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${opBtnClass}`}
          >
            -
          </button>

          {/* Linha 4 */}
          <button
            type="button"
            onClick={() => handleAppend('1')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${numBtnClass}`}
          >
            1
          </button>
          <button
            type="button"
            onClick={() => handleAppend('2')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${numBtnClass}`}
          >
            2
          </button>
          <button
            type="button"
            onClick={() => handleAppend('3')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${numBtnClass}`}
          >
            3
          </button>
          <button
            type="button"
            onClick={() => handleAppend('+')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${opBtnClass}`}
          >
            +
          </button>

          {/* Linha 5 */}
          <button
            type="button"
            onClick={() => handleAppend('0')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${numBtnClass}`}
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleAppend('00')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${numBtnClass}`}
          >
            00
          </button>
          <button
            type="button"
            onClick={() => handleAppend('.')}
            className={`py-3 rounded-xl cursor-pointer transition-all active:scale-95 ${numBtnClass}`}
          >
            ,
          </button>
          <button
            type="button"
            onClick={handleEquals}
            className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black cursor-pointer shadow-sm flex items-center justify-center transition-all active:scale-95"
          >
            =
          </button>
        </div>

        {/* Botão de Ação: Inserir no Campo */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className={`py-3 px-4 rounded-xl text-xs font-bold cursor-pointer border ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-[#FF6A1A] hover:bg-[#ff7b33] active:bg-[#e05810] text-black shadow-lg shadow-[#FF6A1A]/20 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              Inserir R$ {currentResult.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
