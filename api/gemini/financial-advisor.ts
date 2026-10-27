import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', fallback: true });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { prompt, financialContext } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(200).json({ fallback: true });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const fc = financialContext || {};
    const fullPrompt = `Você é um Consultor Financeiro Especialista em Motoboys e Entregadores de App no Brasil (Mochilinha IA Financeira).
Analise os dados reais abaixo do piloto e forneça um diagnóstico financeiro prático, direto ao ponto, em português do Brasil, organizado em tópicos curtos e acionáveis.

DADOS FINANCEIROS E OPERACIONAIS DO MOTOBOY:
- Moto: ${fc.bikeModel || 'Moto de Entrega'} (${fc.kmPerLiter || 35} km/L · Gasolina R$ ${Number(fc.fuelPrice || 5.8).toFixed(2)}/L)
- Faturamento Bruto Diário Base: R$ ${Number(fc.dailyGross || 0).toFixed(2)} (${fc.workDaysPerMonth || 24} dias/mês = R$ ${Number(fc.monthlyGross || 0).toFixed(2)}/mês)
- Rodagem Média Diária: ${Number(fc.dailyKm || 0).toFixed(0)} km/dia
- Gasto Diário com Combustível: R$ ${Number(fc.dailyFuelCost || 0).toFixed(2)}/dia
- Reserva Diária p/ Manutenção Preventiva da Moto: R$ ${Number(fc.dailyMaintReserve || 0).toFixed(2)}/dia (Custo de desgaste: R$ ${Number(fc.maintCostPerKm || 0).toFixed(3)}/km)
- Alimentação na Rua (Almoço + Lanche/Água): R$ ${Number(fc.dailyFoodCost || 0).toFixed(2)}/dia (Almoço R$ ${Number(fc.dailyLunch || 0).toFixed(2)} + Lanche R$ ${Number(fc.dailySnack || 0).toFixed(2)})
- Reserva Diária p/ Documentação (IPVA R$ ${Number(fc.ipvaAnnual || 0).toFixed(0)} + Licenciamento R$ ${Number(fc.licensingAnnual || 0).toFixed(0)} + MEI/Seguro R$ ${Number(fc.insuranceMonthly || 0).toFixed(0)}/mês): R$ ${Number(fc.dailyDocsReserve || 0).toFixed(2)}/dia
- Reserva de Emergência (${fc.emergencyPct || 10}%): R$ ${Number(fc.dailyEmergencyReserve || 0).toFixed(2)}/dia
- LUCRO LÍQUIDO REAL (Sobra livre no bolso após TODOS os custos e reservas): R$ ${Number(fc.dailyNetProfit || 0).toFixed(2)}/dia | R$ ${Number(fc.monthlyNetProfit || 0).toFixed(2)}/mês (Margem líquida real: ${fc.netMarginPct || 0}%)

Solicitação específica do piloto: "${prompt || 'Faça um diagnóstico completo das minhas reservas diárias, custos com almoço/combustível, documentação (IPVA/Licenciamento) e como aumentar meu lucro líquido real.'}"

Responda em no máximo 4 blocos curtos com títulos claros (usando marcadores •), valores em R$ e recomendações práticas para o dia a dia na rua.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: fullPrompt,
    });

    return res.status(200).json({ answer: response.text || '', fallback: false });
  } catch (error: any) {
    console.error('Gemini Financial Advisor error:', error?.message || error);
    return res.status(200).json({ fallback: true, error: error?.message });
  }
}
