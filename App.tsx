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

type PackageTier = 'BASIC' | 'PRO' | 'VIP';

type SignatureItem = {
  id: string;
  index: number;
  style: SignatureStyle;
  text: string;
};

type Order = {
  id: string;
  customer: string;
  tier: PackageTier;
  amount: number;
  paid: boolean;
  createdAt: string;
};

const PACKAGES: Record<PackageTier, { label: string; price: number; count: number }> = {
  BASIC: { label: 'Basic', price: 4.99, count: 24 },
  PRO: { label: 'Pro', price: 9.99, count: 72 },
  VIP: { label: 'VIP Priority', price: 19.99, count: 120 },
};

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

const cleanName = (raw: string) => raw.replace(/\s+/g, ' ').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 24);
const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const createSignatures = (name: string, tier: PackageTier): SignatureItem[] => {
  const safe = cleanName(name);
  if (!safe) return [];
  const limit = PACKAGES[tier].count;
  const results: SignatureItem[] = [];
  for (const style of STYLES) {
    for (let i = 0; i < PATTERNS.length; i++) {
      if (results.length >= limit) return results;
      results.push({ id: `${style.id}-${i}`, index: results.length + 1, style, text: PATTERNS[i](safe, style.flourish, i) });
    }
  }
  return results;
};

const buildSvgMarkup = (item: SignatureItem, customer: string, tier: PackageTier) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="540" viewBox="0 0 1400 540">
  <rect width="1400" height="540" fill="#130726" rx="28"/>
  <text x="80" y="315" fill="${item.style.color}" font-size="130" style="font-family:${item.style.fontFamily};font-weight:${item.style.weight};letter-spacing:${item.style.spacing}px;" transform="rotate(${item.style.angle} 280 260)">${escapeText(item.text)}</text>
  <text x="80" y="470" fill="#c8b9f2" font-size="30" style="font-family:Inter,Arial,sans-serif;letter-spacing:1.5px;">${item.style.label} • ${escapeText(customer)} • ${PACKAGES[tier].label}</text>
</svg>`;

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

const buildPackHtml = (items: SignatureItem[], customer: string, tier: PackageTier) => {
  const cards = items
    .map((item) => `<section class="card"><h3>#${item.index} • ${escapeText(item.style.label)}</h3>${buildSvgMarkup(item, customer, tier)}</section>`)
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8" /><title>Signature Pack</title><style>
  body { font-family: Inter, Arial, sans-serif; background:#0f0624; color:#fff; margin:0; padding:24px; }
  .card { background:#1b1037; border:1px solid #ffffff33; border-radius:14px; padding:14px; margin-bottom:16px; }
  svg { width:100%; height:auto; border-radius:12px; }
  </style></head><body><h1>${escapeText(customer)} • ${PACKAGES[tier].label} Pack</h1>${cards}</body></html>`;
};

const App: React.FC = () => {
  const [name, setName] = useState('');
  const [tier, setTier] = useState<PackageTier>('PRO');
  const [paypalMe, setPaypalMe] = useState('yourpaypalname');
  const [kofiUrl, setKofiUrl] = useState('https://ko-fi.com/yourname');
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [showCount, setShowCount] = useState(24);
  const [status, setStatus] = useState('');

  const safeName = cleanName(name);

  const activeOrder = useMemo(() => orders.find((o) => o.id === activeOrderId) || null, [orders, activeOrderId]);
  const signatures = useMemo(() => (activeOrder ? createSignatures(activeOrder.customer, activeOrder.tier) : []), [activeOrder]);

  const paidOrders = orders.filter((o) => o.paid).length;
  const openOrders = orders.filter((o) => !o.paid).length;
  const revenue = orders.filter((o) => o.paid).reduce((sum, o) => sum + o.amount, 0);

  const createOrder = () => {
    if (!safeName) return;
    const pkg = PACKAGES[tier];
    const id = `ORD-${Date.now().toString().slice(-6)}`;
    const order: Order = {
      id,
      customer: safeName,
      tier,
      amount: pkg.price,
      paid: false,
      createdAt: new Date().toLocaleTimeString(),
    };
    setOrders((prev) => [order, ...prev]);
    setActiveOrderId(id);
    setShowCount(24);
    setStatus(`Order ${id} created.`);
  };

  const markPaid = (id: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, paid: true } : o)));
    setStatus(`Order ${id} marked as PAID. Delivery unlocked.`);
  };

  const copyPaymentMessage = () => {
    if (!activeOrder) return;
    const msg = `Hi ${activeOrder.customer}! ✅\nYour custom signature order: ${activeOrder.id}\nPackage: ${PACKAGES[activeOrder.tier].label} (${PACKAGES[activeOrder.tier].count} styles)\nPrice: €${activeOrder.amount.toFixed(2)}\n\nPay now:\nPayPal: https://paypal.me/${paypalMe}/${activeOrder.amount.toFixed(2)}\nKo-fi: ${kofiUrl}\n\nAfter payment, send screenshot and I deliver instantly.`;
    navigator.clipboard.writeText(msg).then(() => setStatus('Payment DM copied.')).catch(() => setStatus('Could not copy payment DM.'));
  };

  const downloadPack = () => {
    if (!activeOrder || !activeOrder.paid) {
      setStatus('Mark order as PAID first, then download.');
      return;
    }
    const html = buildPackHtml(signatures, activeOrder.customer, activeOrder.tier);
    downloadFile(html, `${activeOrder.customer}-${activeOrder.id}-pack.html`, 'text/html;charset=utf-8');
    setStatus('Delivery pack downloaded.');
  };

  const downloadOneSvg = (item: SignatureItem) => {
    if (!activeOrder || !activeOrder.paid) {
      setStatus('Order must be PAID before delivery download.');
      return;
    }
    const svg = buildSvgMarkup(item, activeOrder.customer, activeOrder.tier);
    downloadFile(svg, `${activeOrder.customer}-${activeOrder.id}-${item.index}.svg`, 'image/svg+xml;charset=utf-8');
  };

  return (
    <main className="h-full overflow-y-auto bg-gradient-to-br from-[#08021c] via-[#150a33] to-[#2d1556] text-white">
      <div className="mx-auto min-h-full max-w-7xl px-4 py-8 md:py-10">
        <section className="mb-5 rounded-3xl border border-white/20 bg-black/25 p-5 backdrop-blur-xl md:p-8">
          <h1 className="bg-gradient-to-r from-fuchsia-200 via-violet-100 to-cyan-200 bg-clip-text text-center text-3xl font-black text-transparent md:text-5xl">Live Signature Sales Engine</h1>
          <p className="mx-auto mt-2 max-w-3xl text-center text-violet-100/85">Create order → send payment message → mark paid → deliver pack. Built for immediate live income.</p>
        </section>

        <section className="mb-5 grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-white/15 bg-white/[0.08] p-4"><p className="text-xs uppercase tracking-[0.2em] text-violet-200">Paid Orders</p><p className="mt-2 text-3xl font-black">{paidOrders}</p></article>
          <article className="rounded-2xl border border-white/15 bg-white/[0.08] p-4"><p className="text-xs uppercase tracking-[0.2em] text-violet-200">Open Orders</p><p className="mt-2 text-3xl font-black">{openOrders}</p></article>
          <article className="rounded-2xl border border-emerald-200/25 bg-emerald-400/10 p-4"><p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Revenue Today</p><p className="mt-2 text-3xl font-black text-emerald-100">€{revenue.toFixed(2)}</p></article>
        </section>

        <section className="mb-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <article className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 md:p-5">
            <h2 className="mb-3 text-lg font-bold">1) Create New Paid Order</h2>
            <div className="mb-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Viewer name from live chat..." maxLength={32} className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-lg outline-none ring-fuchsia-300 placeholder:text-white/60 focus:ring-2" />
              <select value={tier} onChange={(e) => setTier(e.target.value as PackageTier)} className="rounded-xl border border-white/25 bg-[#1c103f] px-4 py-3 font-semibold">
                <option value="BASIC">Basic • 24 signatures • €4.99</option>
                <option value="PRO">Pro • 72 signatures • €9.99</option>
                <option value="VIP">VIP • 120 signatures • €19.99</option>
              </select>
              <button onClick={createOrder} disabled={!safeName} className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-3 font-bold disabled:opacity-40">Create Order</button>
            </div>

            <h3 className="mb-2 text-sm font-semibold text-violet-200">Payment Link Settings</h3>
            <div className="grid gap-2 md:grid-cols-2">
              <input value={paypalMe} onChange={(e) => setPaypalMe(e.target.value)} placeholder="PayPal.me username" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2" />
              <input value={kofiUrl} onChange={(e) => setKofiUrl(e.target.value)} placeholder="Ko-fi URL" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={copyPaymentMessage} disabled={!activeOrder} className="rounded-lg border border-cyan-200/35 bg-cyan-500/20 px-3 py-2 text-sm font-semibold disabled:opacity-40">Copy Payment DM</button>
              <button onClick={downloadPack} disabled={!activeOrder} className="rounded-lg border border-emerald-200/35 bg-emerald-500/20 px-3 py-2 text-sm font-semibold disabled:opacity-40">Download Delivery Pack</button>
              {status && <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm">{status}</span>}
            </div>
          </article>

          <article className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 md:p-5">
            <h2 className="mb-3 text-lg font-bold">2) Order Queue</h2>
            <ul className="space-y-2">
              {orders.length === 0 && <li className="text-sm text-white/70">No orders yet.</li>}
              {orders.map((o) => (
                <li key={o.id} className={`rounded-xl border p-3 ${activeOrderId === o.id ? 'border-fuchsia-300/50 bg-fuchsia-400/10' : 'border-white/15 bg-white/5'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <button onClick={() => setActiveOrderId(o.id)} className="text-left text-sm font-semibold">{o.id} • {o.customer} • €{o.amount.toFixed(2)}</button>
                    {!o.paid ? (
                      <button onClick={() => markPaid(o.id)} className="rounded border border-emerald-300/40 bg-emerald-500/20 px-2 py-1 text-xs">Mark Paid</button>
                    ) : (
                      <span className="rounded border border-emerald-300/40 bg-emerald-500/20 px-2 py-1 text-xs">Paid</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-white/70">{PACKAGES[o.tier].label} • {o.createdAt}</p>
                </li>
              ))}
            </ul>
          </article>
        </section>

        {!!activeOrder && !!signatures.length && (
          <section className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 md:p-5">
            <h2 className="mb-3 text-lg font-bold">3) Delivery Preview ({activeOrder.customer} • {PACKAGES[activeOrder.tier].label})</h2>
            {!activeOrder.paid && <p className="mb-3 rounded-lg border border-amber-300/35 bg-amber-500/15 px-3 py-2 text-sm text-amber-100">This order is not paid yet. Downloads are locked.</p>}
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {signatures.slice(0, showCount).map((item) => (
                <article key={item.id + item.index} className="rounded-xl border border-white/15 bg-black/25 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-violet-200">#{item.index} • {item.style.label}</p>
                    <button onClick={() => downloadOneSvg(item)} className="rounded border border-cyan-200/30 bg-cyan-500/20 px-2 py-1 text-xs">SVG</button>
                  </div>
                  <p className="min-h-[62px] text-4xl leading-tight" style={{ fontFamily: item.style.fontFamily, fontWeight: item.style.weight, color: item.style.color, letterSpacing: `${item.style.spacing}px`, transform: `skew(${item.style.angle}deg)`, textShadow: '0 0 12px rgba(255,255,255,0.15)' }}>{item.text}</p>
                </article>
              ))}
            </section>

            {showCount < signatures.length && (
              <div className="mt-4 text-center">
                <button onClick={() => setShowCount((v) => Math.min(v + 24, signatures.length))} className="rounded-xl border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold">Show More ({signatures.length - showCount} left)</button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
};

export default App;
