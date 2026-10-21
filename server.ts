import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

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
