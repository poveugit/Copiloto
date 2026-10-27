import { RideEntry, MaintenanceItem, FuelDiagnosticsConfig } from './supabaseSync';

export interface ShiftEvaluation {
  status: 'goal_reached' | 'excellent' | 'good' | 'slow';
  badge: string;
  badgeColor: string;
  title: string;
  summary: string;
  recommendation: string;
  projectedExtra: string;
}

export function evaluateShiftWorthiness(
  todayEntries: RideEntry[],
  dailyGoal: number,
  allEntries: RideEntry[]
): ShiftEvaluation {
  const goal = Number(dailyGoal) || 150;
  if (!todayEntries || todayEntries.length === 0) {
    return {
      status: 'good',
      badge: 'Sem Registros Hoje',
      badgeColor: '#38BDF8',
      title: 'Nenhum turno registrado hoje ainda.',
      summary: 'Seus dados começam zerados. Lance suas corridas do dia para acompanhar sua média por hora e progresso da meta.',
      recommendation: 'Toque no botão flutuante "+ Novo Registro" no canto inferior direito para adicionar seu primeiro ganho ou despesa.',
      projectedExtra: `Meta diária configurada: R$ ${goal.toLocaleString('pt-BR')}`,
    };
  }

  const todayRev = todayEntries.reduce((s, e) => s + Number(e.revenue || 0), 0);
  const todayHours = todayEntries.reduce((s, e) => s + Number(e.hours || 0), 0);

  const revPerHour = todayHours > 0 ? todayRev / todayHours : 0;
  const goalPct = Math.round((todayRev / goal) * 100);

  let totalHistRev = 0;
  let totalHistHours = 0;
  allEntries.forEach(e => {
    totalHistRev += Number(e.revenue || 0);
    totalHistHours += Number(e.hours || 0);
  });
  const histRevPerHour = totalHistHours > 0 ? totalHistRev / totalHistHours : 25;

  if (goalPct >= 100) {
    return {
      status: 'goal_reached',
      badge: 'Meta Diária Atingida',
      badgeColor: '#10B981',
      title: 'Parabéns! Sua meta diária foi alcançada.',
      summary: `Você faturou R$ ${todayRev.toLocaleString('pt-BR')} hoje em ${todayHours || 1}h rodadas (${revPerHour > 0 ? 'R$ ' + revPerHour.toFixed(2) + '/h' : ''}).`,
      recommendation: 'Se continuar rodando, todo ganho extra é lucro líquido direto. Se estiver cansado, ótimo momento para encerrar o turno.',
      projectedExtra: `Projeção de +2h extras: +R$ ${Math.round((revPerHour || histRevPerHour) * 2)}`,
    };
  }

  if (revPerHour >= histRevPerHour * 1.1 || revPerHour >= 30) {
    return {
      status: 'excellent',
      badge: 'Alta Demanda no Turno',
      badgeColor: '#FF6A1A',
      title: 'Rendimento excelente hoje!',
      summary: `Sua média atual de R$ ${revPerHour.toFixed(2)}/h está acima da sua média histórica (R$ ${histRevPerHour.toFixed(2)}/h).`,
      recommendation: 'As corridas estão pagando muito bem neste horário. Aproveite o embalo do turno para bater a meta rápido!',
      projectedExtra: `Faltam R$ ${(goal - todayRev).toFixed(0)} para a meta (~${Math.max(1, Math.round((goal - todayRev) / (revPerHour || 25)))}h estimadas).`,
    };
  }

  if (revPerHour >= histRevPerHour * 0.85 || todayHours < 2) {
    return {
      status: 'good',
      badge: 'Ritmo Estável',
      badgeColor: '#38BDF8',
      title: 'Desempenho dentro da média normal.',
      summary: `Você faturou R$ ${todayRev.toLocaleString('pt-BR')} até agora. Média de R$ ${revPerHour > 0 ? revPerHour.toFixed(2) : '0,00'}/h.`,
      recommendation: `Faltam R$ ${Math.max(0, goal - todayRev).toFixed(0)} (${goalPct}% da meta concluída). Continue focado nos pontos de maior movimento.`,
      projectedExtra: `Em +2 horas você pode faturar cerca de +R$ ${Math.round((revPerHour || histRevPerHour) * 2)}.`,
    };
  }

  return {
    status: 'slow',
    badge: 'Demanda Abaixo da Média',
    badgeColor: '#F59E0B',
    title: 'Movimento mais calmo neste horário.',
    summary: `Faturamento médio atual de R$ ${revPerHour.toFixed(2)}/h, abaixo dos seus melhores dias (R$ ${histRevPerHour.toFixed(2)}/h).`,
    recommendation: 'Sugestão: Alterne entre iFood, Uber e 99 ou posicione-se próximo a polos gastronômicos antes do pico.',
    projectedExtra: `Consumo estimado em +2h: ~R$ ${Math.round(2 * 15 * (5.8 / 35))}`,
  };
}

export function evaluateBikeDiagnostics(
  maintenanceItems: MaintenanceItem[],
  fuelConfig: FuelDiagnosticsConfig,
  totalKm: number
) {
  const kmPerLiter = Number(fuelConfig.kmPerLiter) || 35;
  const fuelPrice = Number(fuelConfig.fuelPrice) || 5.8;
  const costPerKm = fuelPrice / kmPerLiter;

  let score = 100;
  const tips: string[] = [];

  tips.push(
    `Custo real de combustível: R$ ${costPerKm.toFixed(2)}/km rodado (Gasolina R$ ${fuelPrice.toFixed(2)} a ${kmPerLiter} km/L na ${fuelConfig.bikeModelName || 'sua moto'}).`
  );

  maintenanceItems.forEach(item => {
    const kmUsed = Math.max(0, totalKm - (item.lastChangeKm || 0));
    const interval = Math.max(100, item.intervalKm || 1000);
    const pct = Math.min(100, Math.round((kmUsed / interval) * 100));

    if (pct >= 100) {
      score -= 22;
      tips.push(
        `Alerta de ${item.name}: Você já rodou ${kmUsed.toLocaleString('pt-BR')} km desde a última revisão (limite: ${interval.toLocaleString('pt-BR')} km). Efetue a troca o quanto antes.`
      );
    } else if (pct >= 80) {
      score -= 10;
      tips.push(
        `Revisão próxima (${item.name}): Restam ${(interval - kmUsed).toLocaleString('pt-BR')} km para atingir o intervalo preventivo.`
      );
    }
  });

  if (tips.length === 1) {
    tips.push('Todos os componentes da moto estão em dia e dentro da margem de segurança preventiva.');
  }

  const autonomyKm = Math.round((fuelConfig.tankCapacityLiters || 14) * kmPerLiter);
  tips.push(`Autonomia estimada por tanque cheio (${fuelConfig.tankCapacityLiters || 14}L): ~${autonomyKm} km.`);

  return {
    costPerKm,
    efficiencyScore: Math.max(20, score),
    autonomyKm,
    tips,
  };
}

export async function askCopilotAssistant(question: string, context: any): Promise<string> {
  try {
    const res = await fetch('/api/gemini/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context }),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.fallback && data.answer) {
        return data.answer;
      }
    }
  } catch {
    // Fallback to offline heuristic engine
  }

  const q = question.toLowerCase().trim();
  const costPerKm = ((context.fuelPrice || 5.8) / (context.kmPerLiter || 35)).toFixed(2);

  if (q.includes('vale a pena') || q.includes('continuar') || q.includes('hoje') || q.includes('meta')) {
    const shift = evaluateShiftWorthiness(context.todayEntries || [], context.dailyGoal || 150, context.allEntries || []);
    return `${shift.title}\n${shift.summary}\n\nRecomendação: ${shift.recommendation}\n${shift.projectedExtra}`;
  }

  if (q.includes('combust') || q.includes('gasolina') || q.includes('economizar') || q.includes('consumo')) {
    return `Com consumo de ${context.kmPerLiter || 35} km/L e gasolina a R$ ${(context.fuelPrice || 5.8).toFixed(2)}/L, seu custo de combustível é R$ ${costPerKm}/km.\n\nDicas práticas:\n1. Calibre os pneus semanalmente.\n2. Mantenha a relação limpa e lubrificada.\n3. Evite arrancadas bruscas nos semáforos.`;
  }

  return `Analisando seus dados locais (Room Offline-First):\n• Ganhos Hoje: R$ ${context.todayRev || 0} (${context.todayHours || 0}h)\n• Média: R$ ${context.revPerHour || '0.00'}/h\n• Custo Combustível: R$ ${costPerKm}/km\n\nFoque nos turnos de Almoço (11h-15h) e Jantar (18h-23h) e mantenha todos os cards da aba Moto atualizados para proteger seu lucro líquido!`;
}

export async function askFinancialAdvisorAI(prompt: string, financialContext: any): Promise<string> {
  try {
    const res = await fetch('/api/gemini/financial-advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, financialContext }),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.fallback && data.answer) {
        return data.answer;
      }
    }
  } catch {
    // Fallback to deterministic intelligent financial engine
  }

  const fc = financialContext || {};
  const dailyGross = Number(fc.dailyGross || 150);
  const dailyNet = Number(fc.dailyNetProfit || 0);
  const monthlyNet = Number(fc.monthlyNetProfit || 0);
  const dailyFuel = Number(fc.dailyFuelCost || 0);
  const dailyMaint = Number(fc.dailyMaintReserve || 0);
  const dailyFood = Number(fc.dailyFoodCost || 0);
  const dailyDocs = Number(fc.dailyDocsReserve || 0);
  const dailyEmerg = Number(fc.dailyEmergencyReserve || 0);
  const margin = Number(fc.netMarginPct || 0);

  return [
    `📊 1. Diagnóstico do Seu Lucro Líquido Real (${margin}% de margem livre):`,
    `• De cada R$ ${dailyGross.toFixed(2)} faturados no dia, sobram R$ ${dailyNet.toFixed(2)} limpos no seu bolso após descontar gasolina (R$ ${dailyFuel.toFixed(2)}), manutenção da moto (R$ ${dailyMaint.toFixed(2)}), alimentação (R$ ${dailyFood.toFixed(2)}), documentação IPVA/Licenciamento (R$ ${dailyDocs.toFixed(2)}) e reserva de emergência (R$ ${dailyEmerg.toFixed(2)}).`,
    `• Projeção de ganho livre mensal (${fc.workDaysPerMonth || 24} dias): R$ ${monthlyNet.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
    ``,
    `🛠️ 2. Blindagem da Moto & Manutenção Preventiva:`,
    `• Seu custo de desgaste das peças é de R$ ${Number(fc.maintCostPerKm || 0).toFixed(2)} por KM. Separando R$ ${dailyMaint.toFixed(2)} por dia em uma conta separada, você terá o valor à vista quando precisar trocar óleo, pneu, relação ou pastilha.`,
    ``,
    `📄 3. Documentos em Dia (IPVA, Licenciamento e MEI/Seguro):`,
    `• Guardando R$ ${dailyDocs.toFixed(2)} por dia trabalhado (ou R$ ${(dailyDocs * 6).toFixed(2)} por semana), você quita IPVA (R$ ${Number(fc.ipvaAnnual || 0).toFixed(0)}) e Licenciamento (R$ ${Number(fc.licensingAnnual || 0).toFixed(0)}) à vista e com desconto, sem comprometer o orçamento da família.`,
    ``,
    `🍱 4. Alimentação & Reserva de Emergência:`,
    `• Seu orçamento diário de rua (Almoço R$ ${Number(fc.dailyLunch || 0).toFixed(2)} + Lanche R$ ${Number(fc.dailySnack || 0).toFixed(2)}) representa ${dailyGross > 0 ? Math.round((dailyFood / dailyGross) * 100) : 0}% do seu bruto. Guardando R$ ${dailyEmerg.toFixed(2)}/dia de emergência, em 6 meses você acumula R$ ${Math.round(dailyEmerg * (fc.workDaysPerMonth || 24) * 6).toLocaleString('pt-BR')} de proteção financeira.`,
  ].join('\n');
}

