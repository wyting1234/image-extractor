// Vercel Serverless Function: 服务端抓取网页 HTML（绕 CORS）
// 支持批量：{urls:[...]} 并行抓取，返回 {batch:[{url,status,html,error}]}
export default async function handler(req, res) {
  let body = {};
  if (req.method === 'POST') {
    const raw = req.body;
    try {
      body = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
    } catch (e) { /* ignore */ }
  }
  let urls = Array.isArray(body.urls) ? body.urls : [];
  if (urls.length === 0 && body.url) urls = [body.url];
  urls = urls.filter(Boolean).slice(0, 12);

  const CONC = 8;
  const results = [];
  for (let i = 0; i < urls.length; i += CONC) {
    const batch = urls.slice(i, i + CONC);
    const rs = await Promise.all(batch.map(async (url) => {
      if (!/^https?:\/\//i.test(url)) {
        return { url, status: 0, html: null, error: 'invalid url' };
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
        return { url, status: r.status, html: html.length > 5000000 ? null : html, error: html.length > 5000000 ? 'html too large' : false };
      } catch (e) {
        return { url, status: 0, html: null, error: e.message };
      }
    }));
    results.push(...rs);
  }
  return res.status(200).json({ batch: results });
}
