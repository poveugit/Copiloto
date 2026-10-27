import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLOUD_STORE_FILE = path.join(__dirname, '.cloud-sync-store.json');

function readServerCloudStore(): Record<string, any> {
  try {
    if (fs.existsSync(CLOUD_STORE_FILE)) {
      const raw = fs.readFileSync(CLOUD_STORE_FILE, 'utf-8');
      return JSON.parse(raw) || {};
    }
  } catch {
    // ignore read error
  }
  return {};
}

function writeServerCloudStore(store: Record<string, any>): void {
  try {
    fs.writeFileSync(CLOUD_STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // ignore write error
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Cloud Sync Server Endpoints (Multi-device sync guarantee alongside Supabase)
  app.get('/api/cloud-sync/pull', (req, res) => {
    try {
      const deviceId = String(req.query.deviceId || '').trim();
      if (!deviceId) {
        return res.status(400).json({ ok: false, error: 'Missing deviceId' });
      }
      const store = readServerCloudStore();
      const record = store[deviceId] || null;
      return res.json({ ok: true, data: record });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message });
    }
  });

  app.post('/api/cloud-sync/push', (req, res) => {
    try {
      const { deviceId, state, pilotProfile } = req.body || {};
      if (!deviceId || !state) {
        return res.status(400).json({ ok: false, error: 'Missing deviceId or state' });
      }
      const store = readServerCloudStore();
      store[deviceId] = {
        state,
        pilotProfile: pilotProfile || store[deviceId]?.pilotProfile || null,
        updatedAt: new Date().toISOString(),
      };
      writeServerCloudStore(store);
      return res.json({ ok: true, updatedAt: store[deviceId].updatedAt });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message });
    }
  });

  app.post('/api/gemini/copilot', async (req, res) => {
    try {
      const { question, context } = req.body;
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

      const systemPrompt = `Você é o Moto Copilot, o assistente virtual inteligente e especialista para motoboys e entregadores de aplicativo (iFood, Uber, 99, Rappi, Keeta).
Responda de forma direta, amigável, motivadora e focada na realidade da rua em português do Brasil.

Dados do Entregador Hoje:
- Faturamento hoje: R$ ${context?.todayRev || 0}
- Horas trabalhadas hoje: ${context?.todayHours || 0}h (Média: R$ ${context?.revPerHour || 0}/h)
- KM rodados hoje: ${context?.todayKm || 0}km
- Meta diária: R$ ${context?.dailyGoal || 150}
- Total geral de corridas salvas: ${context?.totalEntries || 0}
- Consumo da moto: ${context?.kmPerLiter || 35} km/L
- Preço gasolina: R$ ${context?.fuelPrice || 5.80}/L
- KM total da moto: ${context?.totalKm || 0} km

Pergunta do Entregador: "${question}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: systemPrompt,
      });

      res.json({ answer: response.text || '', fallback: false });
    } catch (error: any) {
      console.error('Gemini API error:', error?.message || error);
      res.status(200).json({ fallback: true, error: error?.message });
    }
  });

  app.post('/api/gemini/financial-advisor', async (req, res) => {
    try {
      const { prompt, financialContext } = req.body;
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
      const fullPrompt = `Você é um Consultor Financeiro Especialista em Motoboys e Entregadores de App no Brasil (CopilotRider IA Financeira).
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

      res.json({ answer: response.text || '', fallback: false });
    } catch (error: any) {
      console.error('Gemini Financial Advisor error:', error?.message || error);
      res.status(200).json({ fallback: true, error: error?.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

