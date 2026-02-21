import React, { useMemo, useState } from 'react';

type SignatureStyle = {
  id: string;
  label: string;
  fontFamily: string;
  weight: number;
  angle: number;
  spacing: number;
  flourish: string;
  color: string;
};

type SignatureItem = {
  id: string;
  index: number;
  style: SignatureStyle;
  text: string;
  price: number;
  buyer: string;
};

type PackageTier = 'BASIC' | 'PRO' | 'VIP';

const STYLES: SignatureStyle[] = [
  { id: 'great-vibes', label: 'Great Vibes', fontFamily: '"Great Vibes", cursive', weight: 400, angle: -3, spacing: 1.2, flourish: '✦', color: '#f5ddff' },
  { id: 'dancing', label: 'Dancing Script', fontFamily: '"Dancing Script", cursive', weight: 700, angle: -1, spacing: 0.8, flourish: '❦', color: '#dbe8ff' },
  { id: 'allura', label: 'Allura', fontFamily: '"Allura", cursive', weight: 400, angle: -4, spacing: 1.1, flourish: '✺', color: '#f8e3ff' },
  { id: 'alex', label: 'Alex Brush', fontFamily: '"Alex Brush", cursive', weight: 400, angle: -2, spacing: 0.9, flourish: '✪', color: '#d5f4ff' },
  { id: 'parisienne', label: 'Parisienne', fontFamily: '"Parisienne", cursive', weight: 400, angle: -3, spacing: 0.8, flourish: '❋', color: '#ffe0ef' },
  { id: 'caveat', label: 'Caveat Brush', fontFamily: '"Caveat Brush", cursive', weight: 700, angle: 1, spacing: 0.5, flourish: '✰', color: '#e8ffd9' },
  { id: 'yellowtail', label: 'Yellowtail', fontFamily: '"Yellowtail", cursive', weight: 400, angle: -3, spacing: 0.9, flourish: '❈', color: '#efdfff' },
  { id: 'kaushan', label: 'Kaushan Script', fontFamily: '"Kaushan Script", cursive', weight: 400, angle: -1, spacing: 0.7, flourish: '✹', color: '#ddeeff' },
  { id: 'lobster', label: 'Lobster', fontFamily: '"Lobster", cursive', weight: 400, angle: -1, spacing: 0.5, flourish: '✶', color: '#ffdede' },
  { id: 'cookie', label: 'Cookie', fontFamily: '"Cookie", cursive', weight: 400, angle: -2, spacing: 0.8, flourish: '✸', color: '#ffe6fa' },
  { id: 'sacramento', label: 'Sacramento', fontFamily: '"Sacramento", cursive', weight: 400, angle: -4, spacing: 1.3, flourish: '❧', color: '#ffe8ce' },
  { id: 'pacifico', label: 'Pacifico', fontFamily: '"Pacifico", cursive', weight: 400, angle: 0, spacing: 0.7, flourish: '✧', color: '#ffddea' },
];

const PATTERNS: Array<(name: string, f: string, i: number) => string> = [
  (n, f) => `${f} ${n}`,
  (n, f) => `${n} ${f}`,
  (n, f) => `${f} ${n.toUpperCase()}`,
  (n, f) => `${n} ${f} ${n.charAt(0).toUpperCase()}.`,
  (n, f) => `${n.split('').join(' ')} ${f}`,
  (n, f) => `${f} ${n} ${f}`,
  (n, f, i) => `${n}${'~'.repeat((i % 3) + 1)} ${f}`,
  (n, f, i) => `${n} ${f} ${['Studio', 'Prime', 'Art', 'Live'][i % 4]}`,
  (n, f) => `${n.charAt(0).toUpperCase()}. ${n.slice(1)} ${f}`,
  (n, f) => `_${n}_ ${f}`,
];

const PRICES: Record<PackageTier, number> = { BASIC: 3.99, PRO: 7.99, VIP: 14.99 };

const cleanName = (raw: string) => raw.replace(/\s+/g, ' ').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 24);

const escapeText = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const createSignatures = (name: string, tier: PackageTier): SignatureItem[] => {
  const safe = cleanName(name);
  if (!safe) return [];
  const limit = tier === 'BASIC' ? 24 : tier === 'PRO' ? 72 : STYLES.length * PATTERNS.length;
  const results: SignatureItem[] = [];

  for (const style of STYLES) {
    for (let i = 0; i < PATTERNS.length; i++) {
      if (results.length >= limit) return results;
      results.push({
        id: `${style.id}-${i}`,
        index: results.length + 1,
        style,
        text: PATTERNS[i](safe, style.flourish, i),
        price: PRICES[tier],
        buyer: safe,
      });
    }
  }

  return results;
};

const buildSvgMarkup = (item: SignatureItem) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="540" viewBox="0 0 1400 540">
  <rect width="1400" height="540" fill="#130726" rx="28"/>
  <text x="80" y="315" fill="${item.style.color}" font-size="130" style="font-family:${item.style.fontFamily};font-weight:${item.style.weight};letter-spacing:${item.style.spacing}px;" transform="rotate(${item.style.angle} 280 260)">${escapeText(item.text)}</text>
  <text x="80" y="470" fill="#c8b9f2" font-size="30" style="font-family:Inter,Arial,sans-serif;letter-spacing:1.5px;">${item.style.label} • ${item.buyer} • €${item.price.toFixed(2)}</text>
</svg>`;



const waitForFonts = async () => {
  if ('fonts' in document) {
    try {
      await (document as any).fonts.ready;
    } catch {
      // ignore and continue
    }
  }
};

const svgToPngBlob = async (svgMarkup: string, width = 1400, height = 540) => {
  await waitForFonts();
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = svgUrl;
    await image.decode();

    const canvas = document.createElement('canvas');
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(ratio, ratio);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#130726';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 1));
    return blob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
};

const downloadFile = (content: string | Blob, fileName: string, mimeType?: string) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const buildPackHtml = (items: SignatureItem[]) => {
  const cards = items
    .map((item) => `
      <section class="card">
        <h3>#${item.index} • ${escapeText(item.style.label)}</h3>
        ${buildSvgMarkup(item)}
      </section>
    `)
    .join('\n');

  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>Signature Pack</title>
<style>
body { font-family: Inter, Arial, sans-serif; background:#0f0624; color:#fff; margin:0; padding:24px; }
h1 { margin:0 0 14px; }
.grid { display:grid; grid-template-columns:1fr; gap:20px; }
.card { background:#1b1037; border:1px solid #ffffff33; border-radius:14px; padding:14px; }
svg { width:100%; height:auto; border-radius:12px; }
</style></head>
<body><h1>Signature Pack Export</h1><div class="grid">${cards}</div></body></html>`;
};

const App: React.FC = () => {
  const [name, setName] = useState('');
  const [tier, setTier] = useState<PackageTier>('PRO');
  const [generated, setGenerated] = useState(false);
  const [showCount, setShowCount] = useState(24);
  const [todayOrders, setTodayOrders] = useState(0);
  const [vipQueue, setVipQueue] = useState<string[]>(['@lara', '@dani', '@milo']);
  const [normalQueue, setNormalQueue] = useState<string[]>(['@sara', '@tom', '@emre', '@mia']);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [isPngExporting, setIsPngExporting] = useState(false);

  const safeName = cleanName(name);
  const signatures = useMemo(() => (generated ? createSignatures(safeName, tier) : []), [generated, safeName, tier]);
  const estRevenue = useMemo(() => (todayOrders * PRICES[tier]).toFixed(2), [todayOrders, tier]);

  const generate = () => {
    if (!safeName) return;
    setGenerated(true);
    setShowCount(24);
    setTodayOrders((v) => v + 1);
    setDownloadStatus('');

    const tag = `@${safeName.toLowerCase().replace(/\s+/g, '')}`;
    if (tier === 'VIP') setVipQueue((q) => [tag, ...q]);
    else setNormalQueue((q) => [tag, ...q]);
  };

  const nextCustomer = () => {
    if (vipQueue.length) setVipQueue((q) => q.slice(1));
    else if (normalQueue.length) setNormalQueue((q) => q.slice(1));
  };

  const downloadOne = (item: SignatureItem) => {
    downloadFile(buildSvgMarkup(item), `${safeName || 'signature'}-${item.index}.svg`, 'image/svg+xml;charset=utf-8');
    setDownloadStatus(`Downloaded: ${item.index}.svg`);
  };

  const downloadOnePng = async (item: SignatureItem) => {
    setIsPngExporting(true);
    try {
      const pngBlob = await svgToPngBlob(buildSvgMarkup(item));
      if (!pngBlob) {
        setDownloadStatus('PNG export failed. Please try again.');
        return;
      }
      downloadFile(pngBlob, `${safeName || 'signature'}-${item.index}.png`);
      setDownloadStatus(`Downloaded: ${item.index}.png`);
    } catch {
      setDownloadStatus('PNG export failed. Please try again.');
    } finally {
      setIsPngExporting(false);
    }
  };

  const downloadPack = () => {
    if (!signatures.length) return;
    const html = buildPackHtml(signatures);
    downloadFile(html, `${safeName || 'signature'}-pack.html`, 'text/html;charset=utf-8');
    setDownloadStatus(`Downloaded pack with ${signatures.length} signatures.`);
  };

  return (
    <main className="h-full overflow-y-auto bg-gradient-to-br from-[#08021c] via-[#150a33] to-[#2d1556] text-white">
      <div className="mx-auto min-h-full max-w-7xl px-4 py-8 md:py-10">
        <section className="mb-5 rounded-3xl border border-white/20 bg-black/25 p-5 backdrop-blur-xl md:p-8">
          <h1 className="bg-gradient-to-r from-fuchsia-200 via-violet-100 to-cyan-200 bg-clip-text text-center text-3xl font-black text-transparent md:text-5xl">Creator Signature Business Suite</h1>
          <p className="mx-auto mt-2 max-w-3xl text-center text-violet-100/85">Now with reliable downloads: single SVG per card + one-click full pack file.</p>
        </section>

        <section className="mb-5 grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-white/15 bg-white/[0.08] p-4"><p className="text-xs uppercase tracking-[0.2em] text-violet-200">Today Orders</p><p className="mt-2 text-3xl font-black">{todayOrders}</p></article>
          <article className="rounded-2xl border border-white/15 bg-white/[0.08] p-4"><p className="text-xs uppercase tracking-[0.2em] text-violet-200">Price Per Order</p><p className="mt-2 text-3xl font-black">€{PRICES[tier].toFixed(2)}</p></article>
          <article className="rounded-2xl border border-emerald-200/25 bg-emerald-400/10 p-4"><p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Estimated Revenue</p><p className="mt-2 text-3xl font-black text-emerald-100">€{estRevenue}</p></article>
        </section>

        <section className="mb-5 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <article className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 md:p-5">
            <div className="mb-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Viewer name from live chat..." maxLength={32} className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-lg outline-none ring-fuchsia-300 placeholder:text-white/60 focus:ring-2" />
              <select value={tier} onChange={(e) => setTier(e.target.value as PackageTier)} className="rounded-xl border border-white/25 bg-[#1c103f] px-4 py-3 font-semibold">
                <option value="BASIC">Basic • 24 signatures • €3.99</option>
                <option value="PRO">Pro • 72 signatures • €7.99</option>
                <option value="VIP">VIP • 120 signatures • €14.99</option>
              </select>
              <button onClick={generate} disabled={!safeName} className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-3 font-bold disabled:opacity-40">Create & Charge ✨</button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button onClick={downloadPack} disabled={!signatures.length} className="rounded-lg border border-cyan-200/35 bg-cyan-500/20 px-3 py-2 text-sm font-semibold disabled:opacity-40">Download SVG Pack</button>
              <button onClick={nextCustomer} className="rounded-lg border border-amber-200/35 bg-amber-500/20 px-3 py-2 text-sm font-semibold">Next Customer</button>
              <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm">Generated: {signatures.length}</span>
              {downloadStatus && <span className="rounded-lg border border-emerald-200/35 bg-emerald-500/20 px-3 py-2 text-sm">{downloadStatus}</span>}
            </div>

            {!!signatures.length && (
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {signatures.slice(0, showCount).map((item) => (
                  <article key={item.id + item.index} className="rounded-xl border border-white/15 bg-black/25 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs text-violet-200">#{item.index} • {item.style.label}</p>
                      <div className="flex gap-1">
                        <button onClick={() => downloadOne(item)} className="rounded border border-cyan-200/30 bg-cyan-500/20 px-2 py-1 text-xs">SVG</button>
                        <button onClick={() => downloadOnePng(item)} disabled={isPngExporting} className="rounded border border-blue-200/30 bg-blue-500/20 px-2 py-1 text-xs disabled:opacity-40">PNG</button>
                      </div>
                    </div>
                    <p className="min-h-[62px] text-4xl leading-tight" style={{ fontFamily: item.style.fontFamily, fontWeight: item.style.weight, color: item.style.color, letterSpacing: `${item.style.spacing}px`, transform: `skew(${item.style.angle}deg)`, textShadow: '0 0 12px rgba(255,255,255,0.15)' }}>{item.text}</p>
                  </article>
                ))}
              </section>
            )}

            {showCount < signatures.length && (
              <div className="mt-4 text-center">
                <button onClick={() => setShowCount((v) => Math.min(v + 24, signatures.length))} className="rounded-xl border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold">Show More ({signatures.length - showCount} left)</button>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 md:p-5">
            <h2 className="mb-3 text-lg font-bold">Live Queue Manager</h2>
            <div className="mb-4 rounded-xl border border-fuchsia-200/25 bg-fuchsia-500/10 p-3"><p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200">VIP Queue</p><ul className="mt-2 space-y-1 text-sm">{vipQueue.length ? vipQueue.map((x) => <li key={x}>• {x}</li>) : <li className="text-white/60">empty</li>}</ul></div>
            <div className="rounded-xl border border-white/20 bg-white/5 p-3"><p className="text-xs uppercase tracking-[0.2em] text-violet-200">Normal Queue</p><ul className="mt-2 space-y-1 text-sm">{normalQueue.length ? normalQueue.map((x) => <li key={x}>• {x}</li>) : <li className="text-white/60">empty</li>}</ul></div>
            <div className="mt-4 rounded-xl border border-emerald-200/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">Pro tip: Use “Download SVG Pack” in live so one click always works for customer delivery.</div>
          </article>
        </section>
      </div>
    </main>
  );
};

export default App;
