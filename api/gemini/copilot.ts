import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', fallback: true });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { question, context } = body;
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

    const systemPrompt = `Você é a Mochilinha, a assistente virtual inteligente e especialista para motoboys e entregadores de aplicativo (iFood, Uber, 99, Rappi, Keeta).
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

    return res.status(200).json({ answer: response.text || '', fallback: false });
  } catch (error: any) {
    console.error('Gemini API error:', error?.message || error);
    return res.status(200).json({ fallback: true, error: error?.message });
  }
}
