// Vercel Serverless Function: 批量下载图片打包 ZIP（绕 CORS）
import JSZip from 'jszip';

export default async function handler(req, res) {
  let body = {};
  if (req.method === 'POST') {
    const raw = req.body;
    try {
      body = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
    } catch (e) { /* ignore */ }
  }
  const urls = Array.isArray(body.urls) ? body.urls : [];
  const limited = urls.slice(0, 300);

  const zip = new JSZip();
  let ok = 0;
  await Promise.all(limited.map(async (url, idx) => {
    if (!/^https?:\/\//i.test(url)) return;
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Referer': new URL(url).origin + '/'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(30000)
      });
      if (!r.ok) return;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 10 * 1024 * 1024) return;
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      let ext = 'jpg';
      if (ct.includes('png')) ext = 'png';
      else if (ct.includes('webp')) ext = 'webp';
      else if (ct.includes('gif')) ext = 'gif';
      else if (ct.includes('jpeg')) ext = 'jpg';
      const rawName = (url.split('?')[0] || '').split('/').pop() || 'image.jpg';
      const name = rawName.replace(/[^\w.\-\u4e00-\u9fa5]/g, '_').slice(0, 80) || 'image.jpg';
      const finalName = name.includes('.') ? name : name + '.' + ext;
      zip.file(String(idx + 1).padStart(3, '0') + '_' + finalName, buf);
      ok++;
    } catch (e) { /* skip */ }
  }));

  const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=images.zip');
  res.setHeader('X-Zip-Count', String(ok));
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'X-Zip-Count');
  res.status(200).send(zipBuf);
}
