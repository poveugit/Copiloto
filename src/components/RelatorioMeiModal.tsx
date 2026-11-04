import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileText,
  Calendar,
  CheckCircle2,
  Download,
  Share2,
  Copy,
  Info,
  ShieldCheck,
  Building,
  User,
  Bike,
  Sparkles,
  Percent,
} from 'lucide-react';
import { RideEntry, ExpenseEntry, UserProfile, FuelDiagnosticsConfig } from '../services/supabaseSync';

export interface AppItemDefinition {
  id: string;
  name: string;
  icon?: string;
}

export interface CategoryItemDefinition {
  id: string;
  name: string;
}

interface RelatorioMeiModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: RideEntry[];
  expenses: ExpenseEntry[];
  currentUser: UserProfile | null;
  fuelConfig: FuelDiagnosticsConfig;
  allApps?: AppItemDefinition[];
  allCategories?: CategoryItemDefinition[];
  isDark: boolean;
}

export function RelatorioMeiModal({
  isOpen,
  onClose,
  entries,
  expenses,
  currentUser,
  fuelConfig,
  allApps = [],
  allCategories = [],
  isDark,
}: RelatorioMeiModalProps) {
  // Current year-month default (YYYY-MM)
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

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

  // Helper to resolve App Name and Icon without raw IDs or "Uber"
  const resolveAppInfo = useMemo(() => {
    const appLookup = new Map<string, { id: string; name: string; icon: string }>();

    allApps.forEach(a => {
      appLookup.set(a.id.toLowerCase(), { id: a.id, name: a.name, icon: a.icon || '🛵' });
      appLookup.set(a.name.toLowerCase(), { id: a.id, name: a.name, icon: a.icon || '🛵' });
    });

    return (rawAppId?: string) => {
      if (!rawAppId) return { id: 'outros', name: 'Outros / Particular', icon: '🛵' };
      const lower = rawAppId.toLowerCase().trim();

      // Check in registered apps list
      if (appLookup.has(lower)) {
        return appLookup.get(lower)!;
      }

      // Alias normalization for common motoboy delivery apps
      if (lower === 'ifood' || lower.includes('ifood')) {
        return { id: 'ifood', name: 'iFood', icon: '🛍️' };
      }
      if (lower === '99' || lower === '99moto' || lower.includes('99')) {
        return { id: '99moto', name: '99 Moto', icon: '🛵' };
      }
      if (lower === 'lalamove' || lower.includes('lala')) {
        return { id: 'lalamove', name: 'Lalamove', icon: '📦' };
      }
      if (lower === 'ze' || lower === 'ze_delivery' || lower.includes('ze')) {
        return { id: 'ze_delivery', name: 'Zé Delivery', icon: '🍺' };
      }
      if (lower === 'rappi') {
        return { id: 'rappi', name: 'Rappi', icon: '🍔' };
      }
      if (lower === 'keeta') {
        return { id: 'keeta', name: 'Keeta', icon: '🛵' };
      }
      if (lower === 'particular' || lower === 'direto' || lower === 'fixo') {
        return { id: 'particular', name: 'Particular / Fixo', icon: '💼' };
      }
      if (lower === 'uber') {
        // If legacy data has 'uber', map it to 99 Moto (delivery motoboys don't use Uber car)
        return { id: '99moto', name: '99 Moto', icon: '🛵' };
      }

      // Pretty format custom app id if not matched
      const formatted = rawAppId.replace(/^app_\d+_?/, '').replace(/_/g, ' ');
      const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      return { id: rawAppId, name: capitalized || 'Outros / Particular', icon: '🛵' };
    };
  }, [allApps]);

  // Helper to resolve Category Name
  const resolveCategoryName = useMemo(() => {
    const catLookup = new Map<string, string>();
    allCategories.forEach(c => {
      catLookup.set(c.id.toLowerCase(), c.name);
      catLookup.set(c.name.toLowerCase(), c.name);
    });

    const fallbackCatMap: Record<string, string> = {
      combustivel: 'Combustível',
      gasolina: 'Combustível',
      manutencao: 'Manutenção Preventiva',
      pecas: 'Peças e Pneus',
      seguro: 'Seguro Moto',
      documentacao: 'Documentação / IPVA',
      lavagem: 'Lavagem da Moto',
      alimentacao: 'Alimentação na Rua',
      outros: 'Outros Custos Operacionais',
    };

    return (rawCatId?: string) => {
      if (!rawCatId) return 'Despesas Gerais';
      const lower = rawCatId.toLowerCase().trim();
      if (catLookup.has(lower)) return catLookup.get(lower)!;
      if (fallbackCatMap[lower]) return fallbackCatMap[lower];
      const formatted = rawCatId.replace(/_/g, ' ');
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    };
  }, [allCategories]);

  // Filtered entries and expenses for selected month
  const monthData = useMemo(() => {
    const mEntries = entries.filter(e => e.date && e.date.startsWith(selectedMonth));
    const mExpenses = expenses.filter(ex => ex.date && ex.date.startsWith(selectedMonth));

    const totalRevenue = mEntries.reduce((s, e) => s + (Number(e.revenue) || 0), 0);
    const totalKm = mEntries.reduce((s, e) => s + (Number(e.km) || 0), 0);
    const totalHours = mEntries.reduce((s, e) => s + (Number(e.hours) || 0), 0);
    const totalExpenses = mExpenses.reduce((s, ex) => s + (Number(ex.amount) || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    // Breakdown by App (Properly normalized with names and icons)
    const appMap: Record<string, { id: string; name: string; icon: string; count: number; rev: number; km: number }> = {};
    mEntries.forEach(e => {
      const appInfo = resolveAppInfo(e.app);
      const groupKey = appInfo.name;
      if (!appMap[groupKey]) {
        appMap[groupKey] = {
          id: appInfo.id,
          name: appInfo.name,
          icon: appInfo.icon,
          count: 0,
          rev: 0,
          km: 0,
        };
      }
      appMap[groupKey].count += 1;
      appMap[groupKey].rev += Number(e.revenue || 0);
      appMap[groupKey].km += Number(e.km || 0);
    });

    const byAppList = Object.values(appMap).map(item => ({
      ...item,
      percent: totalRevenue > 0 ? (item.rev / totalRevenue) * 100 : 0,
    })).sort((a, b) => b.rev - a.rev);

    // Breakdown by Expense Category
    const catMap: Record<string, { name: string; count: number; amount: number }> = {};
    mExpenses.forEach(ex => {
      const catName = resolveCategoryName(ex.category);
      if (!catMap[catName]) {
        catMap[catName] = { name: catName, count: 0, amount: 0 };
      }
      catMap[catName].count += 1;
      catMap[catName].amount += Number(ex.amount || 0);
    });

    const byCategoryList = Object.values(catMap).map(item => ({
      ...item,
      percent: totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0,
    })).sort((a, b) => b.amount - a.amount);

    const activeDays = new Set([...mEntries.map(e => e.date), ...mExpenses.map(e => e.date)]).size;
    const avgPerKm = totalKm > 0 ? totalRevenue / totalKm : 0;
    const avgPerHour = totalHours > 0 ? totalRevenue / totalHours : 0;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // MEI Fiscal Constants (Teto Anual R$ 81.000 / R$ 6.750 mensal proporcional)
    const meiMonthlyLimit = 6750.0;
    const meiPercentUsed = (totalRevenue / meiMonthlyLimit) * 100;

    return {
      entries: mEntries,
      expenses: mExpenses,
      totalRevenue,
      totalKm,
      totalHours,
      totalExpenses,
      netProfit,
      profitMargin,
      activeDays,
      avgPerKm,
      avgPerHour,
      meiMonthlyLimit,
      meiPercentUsed,
      byApp: byAppList,
      byCategory: byCategoryList,
    };
  }, [entries, expenses, selectedMonth, resolveAppInfo, resolveCategoryName]);

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

  // 1. Native Print Flow (Salvar como PDF ou Imprimir)
  const handlePrint = () => {
    setIsPrinting(true);
    setFeedbackMsg('Preparando relatório para impressão/PDF...');
    document.body.classList.add('printing-mei-mode');

    setTimeout(() => {
      try {
        window.focus();
        window.print();
        setFeedbackMsg('Diálogo de impressão aberto. Escolha "Salvar como PDF" no destino.');
      } catch (err) {
        setFeedbackMsg('Falha ao abrir diálogo de impressão nativo. Use o botão "Baixar Arquivo Oficial".');
      } finally {
        setTimeout(() => {
          document.body.classList.remove('printing-mei-mode');
          setIsPrinting(false);
          setTimeout(() => setFeedbackMsg(null), 4000);
        }, 800);
      }
    }, 150);
  };

  // 2. Download Standalone Document Flow (PDF-ready standalone HTML)
  const handleDownloadStandaloneReport = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Extrato e Relatorio MEI - ${formattedMonthLabel} - Mochilinha</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 12mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.4;
      font-size: 13px;
    }
    .header-bar {
      border-bottom: 2px solid #FF6A1A;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand { font-size: 20px; font-weight: 900; color: #FF6A1A; }
    .badge { background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .title { font-size: 16px; font-weight: 800; margin: 6px 0 2px 0; color: #0f172a; }
    .subtitle { font-size: 12px; color: #64748b; margin: 0; }
    .pilot-info { text-align: right; font-size: 11px; color: #475569; }
    .indicators-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 16px 0;
    }
    .indicator-card {
      padding: 12px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .indicator-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .indicator-value { font-size: 18px; font-weight: 900; margin: 4px 0; }
    .rev-color { color: #0284c7; }
    .exp-color { color: #e11d48; }
    .profit-color { color: #059669; }
    .stats-row {
      display: flex;
      justify-content: space-around;
      background: #f1f5f9;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 11px;
      margin-bottom: 18px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 12px; }
    th { text-align: left; padding: 8px 6px; border-bottom: 2px solid #cbd5e1; font-weight: 700; color: #475569; font-size: 11px; text-transform: uppercase; }
    td { padding: 8px 6px; border-bottom: 1px solid #f1f5f9; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 16px 0 6px 0; }
    .mei-box {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 11px;
      margin: 16px 0;
    }
    .footer-signatures {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 10px;
      color: #64748b;
    }
    .signature-line {
      width: 220px;
      border-top: 1px solid #334155;
      text-align: center;
      padding-top: 6px;
      font-weight: bold;
      color: #0f172a;
    }
    @media print {
      .print-btn-bar { display: none !important; }
      body { padding: 0; }
    }
    .print-btn-bar {
      margin-bottom: 20px;
      padding: 12px;
      background: #e0f2fe;
      border: 1px solid #7dd3fc;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .print-btn {
      background: #FF6A1A;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="print-btn-bar">
    <span>📄 Relatório Oficial MEI pronto para impressão e PDF.</span>
    <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
  </div>

  <div class="header-bar">
    <div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="brand">Mochilinha</span>
        <span class="badge">Gestão para Entregadores & Motoboys</span>
      </div>
      <div class="title">DEMONSTRATIVO DE RENDIMENTOS & APURAÇÃO MENSAL (MEI)</div>
      <div class="subtitle">Período de Competência: <strong>${formattedMonthLabel}</strong></div>
    </div>
    <div class="pilot-info">
      <div><strong>Piloto:</strong> ${currentUser?.name || 'Entregador de Aplicativo'}</div>
      <div><strong>E-mail:</strong> ${currentUser?.email || '—'}</div>
      <div><strong>Veículo:</strong> ${fuelConfig.bikeModelName || 'Moto'} (${fuelConfig.kmPerLiter} km/L)</div>
    </div>
  </div>

  <div class="indicators-grid">
    <div class="indicator-card">
      <div class="indicator-label">1. Faturamento Bruto</div>
      <div class="indicator-value rev-color">R$ ${monthData.totalRevenue.toFixed(2)}</div>
      <div style="font-size: 10px; color: #64748b;">Receita Bruta Total dos Apps</div>
    </div>
    <div class="indicator-card">
      <div class="indicator-label">2. Despesas Operacionais</div>
      <div class="indicator-value exp-color">- R$ ${monthData.totalExpenses.toFixed(2)}</div>
      <div style="font-size: 10px; color: #64748b;">Combustível, Peças e Custos</div>
    </div>
    <div class="indicator-card">
      <div class="indicator-label">3. Lucro Líquido Real</div>
      <div class="indicator-value profit-color">R$ ${monthData.netProfit.toFixed(2)}</div>
      <div style="font-size: 10px; color: #64748b;">Rendimento Líquido Efetivo</div>
    </div>
  </div>

  <div class="stats-row">
    <span><strong>Dias Trabalhados:</strong> ${monthData.activeDays} dias</span>
    <span><strong>Total de Corridas:</strong> ${monthData.entries.length}</span>
    <span><strong>KM Rodados:</strong> ${monthData.totalKm.toLocaleString('pt-BR')} km</span>
    <span><strong>Horas Trabalhadas:</strong> ${monthData.totalHours.toFixed(1)}h</span>
    <span><strong>Média R$/KM:</strong> R$ ${monthData.avgPerKm.toFixed(2)}/km</span>
  </div>

  <div class="section-title" style="color: #ea580c;">• Faturamento por Aplicativo / Origem de Entrega</div>
  ${
    monthData.byApp.length === 0
      ? '<p style="color: #94a3b8; font-style: italic;">Nenhum registro de faturamento neste mês.</p>'
      : `<table>
      <thead>
        <tr>
          <th>Aplicativo / Origem</th>
          <th class="text-center">Qtd. Corridas</th>
          <th class="text-center">KM Rodados</th>
          <th class="text-center">Participação (%)</th>
          <th class="text-right">Faturamento Bruto</th>
        </tr>
      </thead>
      <tbody>
        ${monthData.byApp
          .map(
            a => `<tr>
            <td class="font-bold">${a.icon} ${a.name}</td>
            <td class="text-center">${a.count}</td>
            <td class="text-center">${a.km.toLocaleString('pt-BR')} km</td>
            <td class="text-center font-bold">${a.percent.toFixed(1)}%</td>
            <td class="text-right font-bold rev-color">R$ ${a.rev.toFixed(2)}</td>
          </tr>`
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr style="border-top: 2px solid #cbd5e1; font-weight: bold;">
          <td>Total Geral Faturado</td>
          <td class="text-center">${monthData.entries.length}</td>
          <td class="text-center">${monthData.totalKm.toLocaleString('pt-BR')} km</td>
          <td class="text-center">100%</td>
          <td class="text-right rev-color">R$ ${monthData.totalRevenue.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>`
  }

  <div class="section-title" style="color: #e11d48;">• Despesas Operacionais Comprovadas por Categoria</div>
  ${
    monthData.byCategory.length === 0
      ? '<p style="color: #94a3b8; font-style: italic;">Nenhuma despesa lançada neste mês.</p>'
      : `<table>
      <thead>
        <tr>
          <th>Categoria de Custo</th>
          <th class="text-center">Lançamentos</th>
          <th class="text-center">Participação (%)</th>
          <th class="text-right">Valor Pago (R$)</th>
        </tr>
      </thead>
      <tbody>
        ${monthData.byCategory
          .map(
            c => `<tr>
            <td class="font-bold">${c.name}</td>
            <td class="text-center">${c.count}</td>
            <td class="text-center">${c.percent.toFixed(1)}%</td>
            <td class="text-right font-bold exp-color">- R$ ${c.amount.toFixed(2)}</td>
          </tr>`
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr style="border-top: 2px solid #cbd5e1; font-weight: bold;">
          <td>Total Despesas Operacionais</td>
          <td class="text-center">${monthData.expenses.length}</td>
          <td class="text-center">100%</td>
          <td class="text-right exp-color">- R$ ${monthData.totalExpenses.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>`
  }

  <div class="mei-box">
    <strong>Enquadramento Fiscal MEI (Transportador Autônomo / Entregador):</strong>
    <p style="margin: 4px 0 0 0;">
      Limite de faturamento anual MEI: R$ 81.000,00 (média proporcional de R$ 6.750,00/mês). Faturamento deste mês atingiu <strong>${monthData.meiPercentUsed.toFixed(1)}%</strong> da cota proporcional. 
      Este documento serve como suporte à escrituração do Livro Caixa e preenchimento da Declaração Anual Simplificada (DASN-SIMEI).
    </p>
  </div>

  <div class="footer-signatures">
    <div>
      <div>Documento gerado eletronicamente pelo app Mochilinha.</div>
      <div>Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
    <div class="signature-line">
      Assinatura do Entregador Titular
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Extrato_MEI_${selectedMonth}_Mochilinha.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setFeedbackMsg('Arquivo oficial do relatório baixado com sucesso! Pronto para salvar em PDF ou enviar à contabilidade.');
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // 3. Copy Summary for WhatsApp (Para enviar ao Contador)
  const handleCopyWhatsApp = async () => {
    const lines = [
      `📋 *DEMONSTRATIVO MEI - MOCHILINHA*`,
      `📅 *Mês de Referência:* ${formattedMonthLabel}`,
      `🏍️ *Piloto:* ${currentUser?.name || 'Entregador de Aplicativo'}`,
      `🛵 *Veículo:* ${fuelConfig.bikeModelName || 'Moto'}`,
      ``,
      `💰 *Faturamento Bruto:* R$ ${monthData.totalRevenue.toFixed(2)}`,
      `🔧 *Despesas Operacionais:* -R$ ${monthData.totalExpenses.toFixed(2)}`,
      `✅ *Lucro Líquido Real:* R$ ${monthData.netProfit.toFixed(2)} (${monthData.profitMargin.toFixed(1)}% de margem)`,
      ``,
      `📊 *Faturamento por Aplicativo:*`,
    ];

    if (monthData.byApp.length === 0) {
      lines.push(`• Nenhum registro lançado no mês`);
    } else {
      monthData.byApp.forEach(a => {
        lines.push(`• ${a.icon} ${a.name}: R$ ${a.rev.toFixed(2)} (${a.count} corridas · ${a.km} km · ${a.percent.toFixed(0)}%)`);
      });
    }

    lines.push(``);
    lines.push(`🔧 *Despesas Operacionais:*`);
    if (monthData.byCategory.length === 0) {
      lines.push(`• Nenhuma despesa lançada no mês`);
    } else {
      monthData.byCategory.forEach(c => {
        lines.push(`• ${c.name}: R$ ${c.amount.toFixed(2)} (${c.percent.toFixed(0)}%)`);
      });
    }

    lines.push(``);
    lines.push(`📈 *Indicadores:* ${monthData.activeDays} dias trabalhados | ${monthData.totalKm.toLocaleString('pt-BR')} km rodados | Média R$ ${monthData.avgPerKm.toFixed(2)}/km`);
    lines.push(`📌 _Relatório gerado pelo App Mochilinha para suporte à DASN-SIMEI_`);

    const fullText = lines.join('\n');

    try {
      await navigator.clipboard.writeText(fullText);
      setFeedbackMsg('Resumo copiado com sucesso! Cole direto no WhatsApp do seu contador.');
    } catch {
      setFeedbackMsg('Não foi possível copiar automaticamente.');
    }
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  if (!isOpen) return null;

  const surfaceCard = isDark ? 'bg-[#12141C] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const surfaceSubtle = isDark ? 'bg-slate-900/80 border border-slate-800' : 'bg-slate-100 border border-slate-200';
  const inputSurface = isDark ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 mei-modal-overlay">
      <div
        className={`w-full max-w-2xl rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 flex flex-col max-h-[92vh] overflow-y-auto shadow-2xl border ${surfaceCard} mei-modal-card`}
      >
        {/* Header (No print) */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800/50 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6A1A] text-black flex items-center justify-center font-black shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black">Extrato & Relatório Fiscal MEI</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Compatível DASN-SIMEI
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs ${mutedText}`}>
                Faturamento real por aplicativo, despesas operacionais e demonstrativo para contabilidade
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl ${surfaceSubtle} cursor-pointer hover:border-[#FF6A1A] transition-colors`}
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMsg && (
          <div className="my-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 no-print animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="flex-1">{feedbackMsg}</span>
          </div>
        )}

        {/* Action Toolbar & Month Selector (No print) */}
        <div className="my-3 p-3 rounded-2xl border border-sky-500/30 bg-sky-500/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 no-print">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs font-bold">Mês:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black outline-none cursor-pointer flex-1 sm:flex-none ${inputSurface}`}
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

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${surfaceSubtle} hover:border-emerald-500`}
              title="Copiar resumo textual para WhatsApp"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadStandaloneReport}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${surfaceSubtle} hover:border-sky-500`}
              title="Baixar arquivo oficial para impressão ou contabilidade"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Baixar Arquivo</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-sky-500 text-black hover:bg-sky-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Salvar em PDF / Imprimir</span>
            </button>
          </div>
        </div>

        {/* Printable Document Container (Styled for both on-screen and @media print) */}
        <div
          id="printable-mei-report"
          className={`p-4 sm:p-6 rounded-2xl border ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Header of Report */}
          <div className="border-b-2 border-slate-400/40 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-[#FF6A1A] print-brand-orange">Mochilinha</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
                  Gestão para Entregadores & Motoboys
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black mt-1">
                DEMONSTRATIVO DE RENDIMENTOS & APURAÇÃO MENSAL (MEI)
              </h1>
              <p className="text-xs text-slate-500 print-text-muted">
                Período de Competência: <strong>{formattedMonthLabel}</strong>
              </p>
            </div>

            <div className="text-left sm:text-right text-xs print-text-muted">
              <span className="block font-bold text-slate-800 dark:text-slate-200">
                Piloto: {currentUser?.name || 'Entregador de Aplicativo'}
              </span>
              <span className="block text-slate-500">E-mail: {currentUser?.email || '—'}</span>
              <span className="block text-slate-500">
                Veículo: {fuelConfig.bikeModelName || 'Moto'} ({fuelConfig.kmPerLiter} km/L)
              </span>
            </div>
          </div>

          {/* 3 Main Fiscal Indicators */}
          <div className="grid grid-cols-3 gap-2.5 my-4">
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-center print-badge-revenue">
              <span className="block text-[10px] font-bold uppercase text-slate-500 print-text-muted">
                1. Faturamento Bruto
              </span>
              <span className="text-base sm:text-xl font-black tabular-nums text-sky-500 dark:text-sky-400 mt-0.5 block">
                R$ {monthData.totalRevenue.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 block print-text-muted">Receita Bruta Total</span>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center print-badge-expense">
              <span className="block text-[10px] font-bold uppercase text-slate-500 print-text-muted">
                2. Despesas Operacionais
              </span>
              <span className="text-base sm:text-xl font-black tabular-nums text-rose-500 dark:text-rose-400 mt-0.5 block">
                - R$ {monthData.totalExpenses.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 block print-text-muted">Combustível + Manutenção</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center print-badge-profit">
              <span className="block text-[10px] font-bold uppercase text-slate-500 print-text-muted">
                3. Lucro Líquido Real
              </span>
              <span className="text-base sm:text-xl font-black tabular-nums text-emerald-500 dark:text-emerald-400 mt-0.5 block">
                R$ {monthData.netProfit.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 block print-text-muted">
                Margem: {monthData.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Operational Metrics Row */}
          <div className="p-2.5 rounded-xl border border-slate-700/30 text-xs flex flex-wrap items-center justify-around gap-2 mb-4 bg-slate-500/5">
            <span>
              <strong>Dias Trabalhados:</strong> {monthData.activeDays} dias
            </span>
            <span>
              <strong>Total de Corridas:</strong> {monthData.entries.length} corridas
            </span>
            <span>
              <strong>KM Rodados:</strong> {monthData.totalKm.toLocaleString('pt-BR')} km
            </span>
            <span>
              <strong>Horas:</strong> {monthData.totalHours.toFixed(1)}h
            </span>
            <span>
              <strong>Média:</strong> R$ {monthData.avgPerKm.toFixed(2)}/km
            </span>
          </div>

          {/* Breakdown by App (Fixed to show authentic motoboy apps: iFood, 99 Moto, Lalamove, Zé Delivery, etc.) */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black uppercase text-[#FF6A1A] print-brand-orange flex items-center gap-1.5">
                <span>• Faturamento por Aplicativo / Origem</span>
              </h4>
              <span className="text-[10px] text-slate-500 print-text-muted">
                {monthData.byApp.length} app(s) ativos no mês
              </span>
            </div>

            {monthData.byApp.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-slate-700 text-xs text-slate-400 italic text-center">
                Nenhum registro de faturamento neste mês.
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/60 font-bold text-slate-500 print-text-muted text-[11px]">
                    <th className="py-2">Aplicativo / Origem</th>
                    <th className="py-2 text-center">Corridas</th>
                    <th className="py-2 text-center">KM Rodados</th>
                    <th className="py-2 text-center">Participação</th>
                    <th className="py-2 text-right">Faturamento Bruto</th>
                  </tr>
                </thead>
                <tbody>
                  {monthData.byApp.map((app, idx) => (
                    <tr key={idx} className="border-b border-slate-800/30 font-medium">
                      <td className="py-2 font-bold flex items-center gap-1.5">
                        <span className="text-sm">{app.icon}</span>
                        <span>{app.name}</span>
                      </td>
                      <td className="py-2 text-center">{app.count}</td>
                      <td className="py-2 text-center">{app.km.toLocaleString('pt-BR')} km</td>
                      <td className="py-2 text-center font-bold text-slate-400 print-text-muted">
                        {app.percent.toFixed(1)}%
                      </td>
                      <td className="py-2 text-right font-black text-sky-500 dark:text-sky-400 tabular-nums">
                        R$ {app.rev.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-700 font-black">
                    <td className="py-2">Total Bruto dos Apps</td>
                    <td className="py-2 text-center">{monthData.entries.length}</td>
                    <td className="py-2 text-center">{monthData.totalKm.toLocaleString('pt-BR')} km</td>
                    <td className="py-2 text-center">100%</td>
                    <td className="py-2 text-right text-sky-500 dark:text-sky-400 tabular-nums">
                      R$ {monthData.totalRevenue.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Breakdown by Expense Category */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black uppercase text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                <span>• Despesas Operacionais Comprovadas por Categoria</span>
              </h4>
              <span className="text-[10px] text-slate-500 print-text-muted">
                {monthData.byCategory.length} categoria(s) lançadas
              </span>
            </div>

            {monthData.byCategory.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-slate-700 text-xs text-slate-400 italic text-center">
                Nenhuma despesa lançada neste mês.
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/60 font-bold text-slate-500 print-text-muted text-[11px]">
                    <th className="py-2">Categoria de Despesa</th>
                    <th className="py-2 text-center">Lançamentos</th>
                    <th className="py-2 text-center">Participação</th>
                    <th className="py-2 text-right">Valor Total Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {monthData.byCategory.map((cat, idx) => (
                    <tr key={idx} className="border-b border-slate-800/30 font-medium">
                      <td className="py-2 font-bold">{cat.name}</td>
                      <td className="py-2 text-center">{cat.count}</td>
                      <td className="py-2 text-center font-bold text-slate-400 print-text-muted">
                        {cat.percent.toFixed(1)}%
                      </td>
                      <td className="py-2 text-right font-black text-rose-500 dark:text-rose-400 tabular-nums">
                        - R$ {cat.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-700 font-black">
                    <td className="py-2">Total de Custos Comprovados</td>
                    <td className="py-2 text-center">{monthData.expenses.length}</td>
                    <td className="py-2 text-center">100%</td>
                    <td className="py-2 text-right text-rose-500 dark:text-rose-400 tabular-nums">
                      - R$ {monthData.totalExpenses.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* MEI Guidelines & Tax Compliance Notice */}
          <div className="p-3 rounded-xl border border-slate-700/40 bg-slate-900/30 text-xs mb-4">
            <div className="flex items-center gap-1.5 font-bold text-[#FF6A1A] print-brand-orange mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Controle Fiscal MEI (DASN-SIMEI)</span>
            </div>
            <p className="text-[11px] text-slate-400 print-text-muted leading-relaxed">
              O teto anual MEI é de <strong>R$ 81.000,00</strong> (média proporcional de R$ 6.750,00/mês). Neste mês,
              seu faturamento bruto representou <strong>{monthData.meiPercentUsed.toFixed(1)}%</strong> da cota média.
              Mantenha o comprovante dos abastecimentos e notas de manutenção para abater na escrituração do seu Livro Caixa.
            </p>
          </div>

          {/* Signature and Emission Block */}
          <div className="border-t-2 border-slate-400/40 pt-4 flex flex-col sm:flex-row items-end justify-between gap-4 text-[11px] text-slate-500 print-text-muted">
            <div className="max-w-xs leading-snug">
              <p>
                Demonstrativo gerado eletronicamente com base nas corridas e custos cadastrados no aplicativo Mochilinha.
              </p>
              <p className="mt-1 font-bold">Emitido em: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>

            <div className="text-center w-56 pt-6 border-t border-slate-400 text-xs font-bold text-slate-800 dark:text-slate-200">
              Assinatura do Entregador
            </div>
          </div>
        </div>

        {/* Bottom Actions (No print) */}
        <div className="mt-4 pt-3 border-t border-slate-800/50 flex flex-wrap items-center justify-between gap-2.5 no-print">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${surfaceSubtle}`}
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadStandaloneReport}
              className={`px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-colors flex items-center gap-1.5 ${surfaceSubtle} hover:border-sky-500`}
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Baixar Arquivo</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#FF6A1A] text-black hover:bg-[#ff7b33] transition-colors flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
