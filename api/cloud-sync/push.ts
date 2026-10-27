import zlib from 'zlib';
import crypto from 'crypto';

function getRelayTopicForDevice(deviceId: string): string {
  const clean = deviceId.trim().toLowerCase().replace(/^usr_/, '');
  const hash = crypto.createHash('sha256').update('mochilinha_v3_' + clean).digest('hex').slice(0, 20);
  return `mochilinha_sync_${hash}`;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { deviceId, state, pilotProfile } = body;
    if (!deviceId || !state) {
      return res.status(400).json({ ok: false, error: 'Missing deviceId or state' });
    }

    const updatedAt = new Date().toISOString();
    const record = { state, pilotProfile: pilotProfile || null, updatedAt };
    const topic = getRelayTopicForDevice(deviceId);
    const jsonStr = JSON.stringify(record);
    const gzBase64 = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8')).toString('base64');

    if (gzBase64.length < 3600) {
      await fetch(`https://ntfy.sh/${topic}`, {
        method: 'POST',
        body: JSON.stringify({ gz: gzBase64, updatedAt }),
      });
    } else {
      const putRes = await fetch(`https://ntfy.sh/${topic}_blob`, {
        method: 'PUT',
        headers: { Filename: 'mochilinha_sync.json' },
        body: jsonStr,
      });
      if (putRes.ok) {
        const putJson: any = await putRes.json();
        const fileUrl = putJson?.attachment?.url;
        if (fileUrl) {
          await fetch(`https://ntfy.sh/${topic}`, {
            method: 'POST',
            body: JSON.stringify({ fileUrl, updatedAt }),
          });
        }
      }
    }

    return res.status(200).json({ ok: true, updatedAt });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
}
