import zlib from 'zlib';
import crypto from 'crypto';

function getRelayTopicForDevice(deviceId: string): string {
  const clean = deviceId.trim().toLowerCase().replace(/^usr_/, '');
  const hash = crypto.createHash('sha256').update('mochilinha_v3_' + clean).digest('hex').slice(0, 20);
  return `mochilinha_sync_${hash}`;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const deviceId = String(req.query?.deviceId || '').trim();
    if (!deviceId) {
      return res.status(400).json({ ok: false, error: 'Missing deviceId' });
    }

    const topic = getRelayTopicForDevice(deviceId);
    const pollRes = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=all`);
    if (!pollRes.ok) {
      return res.status(200).json({ ok: true, data: null });
    }

    const text = (await pollRes.text()).trim();
    if (!text) {
      return res.status(200).json({ ok: true, data: null });
    }

    const lines = text.split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const evt = JSON.parse(lines[i]);
        if (evt.event !== 'message' || !evt.message) continue;
        const msg = JSON.parse(evt.message);
        if (msg.gz) {
          const unzipped = zlib.gunzipSync(Buffer.from(msg.gz, 'base64')).toString('utf-8');
          const parsed = JSON.parse(unzipped);
          if (parsed && parsed.state) {
            return res.status(200).json({ ok: true, data: parsed });
          }
        } else if (msg.fileUrl) {
          const fileRes = await fetch(msg.fileUrl);
          if (fileRes.ok) {
            const parsed = await fileRes.json();
            if (parsed && parsed.state) {
              return res.status(200).json({ ok: true, data: parsed });
            }
          }
        }
      } catch {
        // continue
      }
    }

    return res.status(200).json({ ok: true, data: null });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
}
