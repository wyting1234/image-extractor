// Vercel Serverless Function: 图片代理（缩略图 / 单张下载），绕 CORS
// 支持 GET ?url=xxx 或 POST {"url":"xxx"}，返回图片二进制
export default async function handler(req, res) {
  let url = '';
  if (req.method === 'GET') {
    url = req.query.url || '';
  } else {
    const raw = req.body;
    try {
      const body = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
      url = body.url || req.query.url || '';
    } catch (e) { url = req.query.url || ''; }
  }
  if (!/^https?:\/\//i.test(url)) {
    return res.status(400).send('missing or invalid url');
  }
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Referer': new URL(url).origin + '/'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(30000)
    });
    if (!r.ok) return res.status(r.status).send('fetch failed');
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(buf);
  } catch (e) {
    return res.status(502).send('fetch failed: ' + e.message);
  }
}
