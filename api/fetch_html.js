// Vercel Serverless Function: 服务端抓取网页 HTML（绕 CORS）
export default async function handler(req, res) {
  let body = {};
  if (req.method === 'POST') {
    const raw = req.body;
    try {
      body = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
    } catch (e) { /* ignore */ }
  }
  const url = body.url || req.query.url || '';
  if (!/^https?:\/\//i.test(url)) {
    return res.status(200).json({ status: 0, html: null, error: 'invalid url' });
  }
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(45000)
    });
    const html = await r.text();
    if (html.length > 5000000) {
      return res.status(200).json({ status: 0, html: null, error: 'html too large' });
    }
    return res.status(200).json({ status: r.status, html });
  } catch (e) {
    return res.status(200).json({ status: 0, html: null, error: e.message });
  }
}
