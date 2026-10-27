import zlib from 'zlib';
import crypto from 'crypto';

function getRelayTopicForDevice(deviceId: string): string {
  const clean = deviceId.trim().toLowerCase().replace(/^usr_/, '');
  const hash = crypto.createHash('sha256').update('mochilinha_v3_' + clean).digest('hex').slice(0, 20);
  return `mochilinha_sync_${hash}`;
}

async function fetchPullWithTimeout(url: string, timeoutMs = 1800): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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
    const pollRes = await fetchPullWithTimeout(`https://ntfy.sh/${topic}/json?poll=1&since=all`, 1800);
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
          const fileRes = await fetchPullWithTimeout(msg.fileUrl, 1800);
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
