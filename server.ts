import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import crypto from 'crypto';
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

function getRelayTopicForDevice(deviceId: string): string {
  const clean = deviceId.trim().toLowerCase().replace(/^usr_/, '');
  const hash = crypto.createHash('sha256').update('mochilinha_v3_' + clean).digest('hex').slice(0, 20);
  return `mochilinha_sync_${hash}`;
}

function isStatePopulated(state: any): boolean {
  if (!state) return false;
  const entriesLen = Array.isArray(state.entries) ? state.entries.length : 0;
  const expensesLen = Array.isArray(state.expenses) ? state.expenses.length : 0;
  const odo = Number(state.fuelConfig?.odometerBaseKm || 0);
  const customBike = state.fuelConfig?.bikeModelName && state.fuelConfig.bikeModelName !== 'Minha Moto';
  const hasMaintChanges = Array.isArray(state.maintenanceItems) && state.maintenanceItems.some((m: any) => Number(m.lastChangeKm) > 0 || (Array.isArray(m.history) && m.history.length > 0));
  return entriesLen > 0 || expensesLen > 0 || odo > 0 || Boolean(customBike) || Boolean(hasMaintChanges);
}

async function fetchServerWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function pushToGlobalCloudRelay(deviceId: string, record: any): Promise<boolean> {
  try {
    const topic = getRelayTopicForDevice(deviceId);
    const jsonStr = JSON.stringify(record);
    const gzBase64 = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8')).toString('base64');
    if (gzBase64.length < 3600) {
      const res = await fetchServerWithTimeout(`https://ntfy.sh/${topic}`, {
        method: 'POST',
        body: JSON.stringify({ gz: gzBase64, updatedAt: record.updatedAt }),
      }, 2200);
      return res.ok;
    } else {
      const putRes = await fetchServerWithTimeout(`https://ntfy.sh/${topic}_blob`, {
        method: 'PUT',
        headers: { Filename: 'mochilinha_sync.json' },
        body: jsonStr,
      }, 2500);
      if (putRes.ok) {
        const putJson: any = await putRes.json();
        const fileUrl = putJson?.attachment?.url;
        if (fileUrl) {
          const ptrRes = await fetchServerWithTimeout(`https://ntfy.sh/${topic}`, {
            method: 'POST',
            body: JSON.stringify({ fileUrl, updatedAt: record.updatedAt }),
          }, 2000);
          return ptrRes.ok;
        }
      }
    }
  } catch {
    // ignore relay error
  }
  return false;
}

async function pullFromGlobalCloudRelay(deviceId: string): Promise<any | null> {
  try {
    const topic = getRelayTopicForDevice(deviceId);
    const res = await fetchServerWithTimeout(`https://ntfy.sh/${topic}/json?poll=1&since=all`, {}, 1800);
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    if (!text) return null;
    const lines = text.split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const evt = JSON.parse(lines[i]);
        if (evt.event !== 'message' || !evt.message) continue;
        const msg = JSON.parse(evt.message);
        if (msg.gz) {
          const unzipped = zlib.gunzipSync(Buffer.from(msg.gz, 'base64')).toString('utf-8');
          const parsed = JSON.parse(unzipped);
          if (parsed && parsed.state) return parsed;
        } else if (msg.fileUrl) {
          const fileRes = await fetchServerWithTimeout(msg.fileUrl, {}, 1800);
          if (fileRes.ok) {
            const parsed = await fileRes.json();
            if (parsed && parsed.state) return parsed;
          }
        }
      } catch {
        // continue checking older messages
      }
    }
  } catch {
    // ignore relay error
  }
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS so Production (ais-pre / Vercel) and Test (ais-dev) can communicate directly
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // Cloud Sync Server Endpoints (Multi-device & Cross-Environment Sync)
  app.get('/api/cloud-sync/pull', async (req, res) => {
    try {
      const deviceId = String(req.query.deviceId || '').trim();
      const userEmail = String(req.query.email || '').trim().toLowerCase();
      if (!deviceId) {
        return res.status(400).json({ ok: false, error: 'Missing deviceId' });
      }
      const store = readServerCloudStore();
      let localRecord = store[deviceId] || null;

      // Also check matching email or populated fallback in store
      if ((!localRecord || !isStatePopulated(localRecord.state)) && userEmail) {
        for (const key of Object.keys(store)) {
          const candidate = store[key];
          if (
            candidate?.pilotProfile?.email?.toLowerCase() === userEmail &&
            isStatePopulated(candidate.state)
          ) {
            localRecord = candidate;
            break;
          }
        }
      }

      // Check global cloud relay to bridge Production <-> Test environments
      const relayRecord = await pullFromGlobalCloudRelay(deviceId);

      let chosenRecord = localRecord;
      if (relayRecord && relayRecord.state) {
        const localPop = isStatePopulated(localRecord?.state);
        const relayPop = isStatePopulated(relayRecord.state);
        const localEntries = localRecord?.state?.entries?.length || 0;
        const relayEntries = relayRecord.state?.entries?.length || 0;
        const localTime = localRecord?.updatedAt ? new Date(localRecord.updatedAt).getTime() : 0;
        const relayTime = relayRecord.updatedAt ? new Date(relayRecord.updatedAt).getTime() : 0;

        if (!localRecord || (relayPop && !localPop) || relayEntries > localEntries || relayTime > localTime) {
          chosenRecord = relayRecord;
          store[deviceId] = relayRecord;
          writeServerCloudStore(store);
        }
      }

      return res.json({ ok: true, data: chosenRecord });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message });
    }
  });

  app.post('/api/cloud-sync/push', async (req, res) => {
    try {
      const { deviceId, state, pilotProfile, explicitPush, forceReset } = req.body || {};
      if (!deviceId || !state) {
        return res.status(400).json({ ok: false, error: 'Missing deviceId or state' });
      }
      const store = readServerCloudStore();
      const existing = store[deviceId];

      // Prevent an empty test device from overwriting populated cloud data unless forceReset or explicitPush with data
      if (
        !forceReset &&
        !explicitPush &&
        existing &&
        isStatePopulated(existing.state) &&
        !isStatePopulated(state)
      ) {
        return res.json({
          ok: true,
          protectedExisting: true,
          updatedAt: existing.updatedAt,
          data: existing,
        });
      }

      const record = {
        state,
        pilotProfile: pilotProfile || existing?.pilotProfile || null,
        updatedAt: new Date().toISOString(),
      };
      store[deviceId] = record;
      writeServerCloudStore(store);

      if (explicitPush || isStatePopulated(state)) {
        await pushToGlobalCloudRelay(deviceId, record);
      }

      return res.json({ ok: true, updatedAt: record.updatedAt });
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

      const systemPrompt = `Você é o Assistente Mochilinha, o assistente virtual inteligente e especialista para motoboys e entregadores de aplicativo (iFood, Uber, 99, Rappi, Keeta).
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

