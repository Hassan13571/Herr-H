import React, { useEffect, useMemo, useState } from 'react';

type SignatureStyle = {
  id: string;
  label: string;
  fontFamily: string;
  baseWeight: number;
  accent: string;
  flourish: string;
  angle: number;
  letterSpacing: number;
};

type SignatureVariant = {
  id: string;
  index: number;
  style: SignatureStyle;
  text: string;
};

type ExportTheme = 'midnight' | 'paper' | 'transparent';

const STORAGE_KEY = 'signature-lab-favorites-v2';

const STYLES: SignatureStyle[] = [
  { id: 'great-vibes', label: 'Great Vibes', fontFamily: '"Great Vibes", cursive', baseWeight: 400, accent: '#f6dbff', flourish: '✦', angle: -3, letterSpacing: 1.2 },
  { id: 'dancing', label: 'Dancing Script', fontFamily: '"Dancing Script", cursive', baseWeight: 700, accent: '#deebff', flourish: '❦', angle: -1, letterSpacing: 0.8 },
  { id: 'sacramento', label: 'Sacramento', fontFamily: '"Sacramento", cursive', baseWeight: 400, accent: '#ffe9d0', flourish: '❧', angle: -4, letterSpacing: 1.4 },
  { id: 'allura', label: 'Allura', fontFamily: '"Allura", cursive', baseWeight: 400, accent: '#f8e2ff', flourish: '✺', angle: -4, letterSpacing: 1.2 },
  { id: 'alex', label: 'Alex Brush', fontFamily: '"Alex Brush", cursive', baseWeight: 400, accent: '#d7f4ff', flourish: '✪', angle: -2, letterSpacing: 1 },
  { id: 'parisienne', label: 'Parisienne', fontFamily: '"Parisienne", cursive', baseWeight: 400, accent: '#ffe3f2', flourish: '❋', angle: -3, letterSpacing: 0.9 },
  { id: 'dafoe', label: 'Mr Dafoe', fontFamily: '"Mr Dafoe", cursive', baseWeight: 400, accent: '#d9f1ff', flourish: '✥', angle: -5, letterSpacing: 1.3 },
  { id: 'caveat-brush', label: 'Caveat Brush', fontFamily: '"Caveat Brush", cursive', baseWeight: 700, accent: '#e5ffd7', flourish: '✰', angle: 1, letterSpacing: 0.5 },
  { id: 'satisfy', label: 'Satisfy', fontFamily: '"Satisfy", cursive', baseWeight: 400, accent: '#ffe4d8', flourish: '✵', angle: -2, letterSpacing: 0.8 },
  { id: 'yellowtail', label: 'Yellowtail', fontFamily: '"Yellowtail", cursive', baseWeight: 400, accent: '#f0dcff', flourish: '❈', angle: -3, letterSpacing: 0.8 },
  { id: 'kaushan', label: 'Kaushan Script', fontFamily: '"Kaushan Script", cursive', baseWeight: 400, accent: '#ddefff', flourish: '✹', angle: -1, letterSpacing: 0.6 },
  { id: 'pacifico', label: 'Pacifico', fontFamily: '"Pacifico", cursive', baseWeight: 400, accent: '#ffdce9', flourish: '✧', angle: 0, letterSpacing: 0.7 },
  { id: 'lobster', label: 'Lobster', fontFamily: '"Lobster", cursive', baseWeight: 400, accent: '#ffd6d6', flourish: '✶', angle: -1, letterSpacing: 0.5 },
  { id: 'marck', label: 'Marck Script', fontFamily: '"Marck Script", cursive', baseWeight: 400, accent: '#e2f7ff', flourish: '✷', angle: -3, letterSpacing: 0.9 },
  { id: 'cookie', label: 'Cookie', fontFamily: '"Cookie", cursive', baseWeight: 400, accent: '#ffe4f9', flourish: '✸', angle: -2, letterSpacing: 0.8 },
  { id: 'merienda', label: 'Merienda', fontFamily: '"Merienda", cursive', baseWeight: 700, accent: '#f3ffe0', flourish: '✻', angle: -1, letterSpacing: 0.7 },
];

const PATTERNS: Array<(name: string, f: string, seed: number) => string> = [
  (n, f) => `${f} ${n}`,
  (n, f) => `${n} ${f}`,
  (n, f) => `${f} ${n.toUpperCase()}`,
  (n, f) => `${n} ${f} ${n.charAt(0).toUpperCase()}.`,
  (n, f) => `${n.split('').join(' ')} ${f}`,
  (n, f) => `${n} ${f} ${n.slice(-1).toUpperCase()}`,
  (n, f) => `${n.charAt(0).toUpperCase()}. ${n.slice(1)} ${f}`,
  (n, f) => `${f} ${n} ${f}`,
  (n, f, s) => `${n}${'~'.repeat((s % 3) + 1)} ${f}`,
  (n, f, s) => `${n} ${f} ${['Jr.', 'Art', 'Studio', 'Original'][s % 4]}`,
  (n, f) => `${f} ${n} •`,
  (n, f) => `_${n}_ ${f}`,
];

const cleanName = (raw: string) => raw.replace(/\s+/g, ' ').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 26);

const createVariants = (name: string): SignatureVariant[] => {
  const safe = cleanName(name);
  if (!safe) return [];
  const list: SignatureVariant[] = [];
  STYLES.forEach((style) => {
    PATTERNS.forEach((pattern, idx) => {
      list.push({
        id: `${style.id}-${idx}`,
        index: list.length + 1,
        style,
        text: pattern(safe, style.flourish, idx),
      });
    });
  });
  return list;
};

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const themeFill = (theme: ExportTheme) => {
  if (theme === 'paper') return '#fef7ea';
  if (theme === 'transparent') return 'transparent';
  return '#130726';
};

const signatureSvg = (item: SignatureVariant, opts: { size: number; color: string; extraAngle: number; extraSpacing: number; theme: ExportTheme }) => {
  const bg = themeFill(opts.theme);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="540" viewBox="0 0 1400 540">
  <rect x="0" y="0" width="1400" height="540" fill="${bg}" rx="28"/>
  <text x="80" y="320" fill="${opts.color}" font-size="${opts.size}" style="font-family:${item.style.fontFamily};font-weight:${item.style.baseWeight};letter-spacing:${item.style.letterSpacing + opts.extraSpacing}px;" transform="rotate(${item.style.angle + opts.extraAngle} 280 260)">${esc(item.text)}</text>
  <text x="80" y="470" fill="${opts.theme === 'paper' ? '#5f4a3a' : '#c5b8ed'}" font-size="28" style="font-family:Inter,Arial,sans-serif;letter-spacing:1.8px;">#${item.index} • ${item.style.label} • Signature Lab</text>
</svg>`;
};

const saveData = (uri: string, fileName: string) => {
  const a = document.createElement('a');
  a.href = uri;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const svgToPng = async (svg: string) => {
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const img = new Image();
  img.src = uri;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
};

const App: React.FC = () => {
  const [name, setName] = useState('');
  const [generated, setGenerated] = useState(false);
  const [search, setSearch] = useState('');
  const [showCount, setShowCount] = useState(30);
  const [fontSize, setFontSize] = useState(118);
  const [inkColor, setInkColor] = useState('#f6dbff');
  const [extraAngle, setExtraAngle] = useState(0);
  const [extraSpacing, setExtraSpacing] = useState(0);
  const [theme, setTheme] = useState<ExportTheme>('midnight');
  const [favorites, setFavorites] = useState<string[]>([]);

  const safeName = cleanName(name);
  const generatedList = useMemo(() => (generated ? createVariants(safeName) : []), [generated, safeName]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return generatedList;
    return generatedList.filter((x) => x.style.label.toLowerCase().includes(q) || x.text.toLowerCase().includes(q));
  }, [generatedList, search]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        setFavorites(parsed);
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id: string) => setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const generate = () => {
    if (!safeName) return;
    setGenerated(true);
    setShowCount(30);
  };

  const downloadSvg = (item: SignatureVariant) => {
    const svg = signatureSvg(item, { size: fontSize, color: inkColor, extraAngle, extraSpacing, theme });
    saveData(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, `${safeName || 'signature'}-${item.index}.svg`);
  };

  const downloadPng = async (item: SignatureVariant) => {
    const svg = signatureSvg(item, { size: fontSize, color: inkColor, extraAngle, extraSpacing, theme });
    const png = await svgToPng(svg);
    if (png) saveData(png, `${safeName || 'signature'}-${item.index}.png`);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // no-op
    }
  };

  const downloadFavoritesPack = async () => {
    const fav = filtered.filter((x) => favorites.includes(x.id));
    for (const item of fav) {
      downloadSvg(item);
      await new Promise((r) => setTimeout(r, 45));
    }
  };

  return (
    <main className="h-full overflow-y-auto bg-gradient-to-br from-[#09021d] via-[#180a35] to-[#2d1454] text-white">
      <div className="mx-auto min-h-full w-full max-w-7xl px-4 py-8 md:py-12">
        <section className="rounded-3xl border border-white/20 bg-black/25 p-5 shadow-2xl backdrop-blur-xl md:p-8">
          <header className="mb-6 text-center">
            <p className="mb-2 inline-block rounded-full border border-fuchsia-200/35 bg-fuchsia-400/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-fuchsia-100">World-Class Signature Creator</p>
            <h1 className="bg-gradient-to-r from-fuchsia-200 via-violet-100 to-cyan-200 bg-clip-text text-3xl font-black text-transparent md:text-5xl">192 Signature Variants + Pro Export</h1>
            <p className="mx-auto mt-2 max-w-3xl text-violet-100/85">One name → many realistic handwritten signatures, search, favorites, and SVG/PNG download tools.</p>
          </header>

          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} placeholder="Type TikTok user name..." className="w-full rounded-2xl border border-white/25 bg-white/10 px-5 py-4 text-lg outline-none ring-fuchsia-300 placeholder:text-white/60 focus:ring-2" />
            <button onClick={generate} disabled={!safeName} className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-4 font-bold disabled:opacity-40">Generate 192 ✨</button>
          </div>

          <div className="mb-6 grid gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 md:grid-cols-5">
            <label className="text-xs">Font Size
              <input type="range" min={90} max={150} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="mt-1 w-full" />
            </label>
            <label className="text-xs">Extra Slant
              <input type="range" min={-8} max={8} value={extraAngle} onChange={(e) => setExtraAngle(Number(e.target.value))} className="mt-1 w-full" />
            </label>
            <label className="text-xs">Letter Spacing
              <input type="range" min={-1} max={3} step={0.1} value={extraSpacing} onChange={(e) => setExtraSpacing(Number(e.target.value))} className="mt-1 w-full" />
            </label>
            <label className="text-xs">Ink Color
              <input type="color" value={inkColor} onChange={(e) => setInkColor(e.target.value)} className="mt-1 block h-9 w-full rounded bg-transparent" />
            </label>
            <label className="text-xs">Export Theme
              <select value={theme} onChange={(e) => setTheme(e.target.value as ExportTheme)} className="mt-1 h-9 w-full rounded border border-white/25 bg-[#1c103f] px-2">
                <option value="midnight">Midnight</option>
                <option value="paper">Paper</option>
                <option value="transparent">Transparent</option>
              </select>
            </label>
          </div>

          {generated && (
            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search style or signature text..." className="rounded-xl border border-white/20 bg-white/10 px-4 py-3" />
              <button onClick={downloadFavoritesPack} disabled={!favorites.length} className="rounded-xl border border-cyan-200/35 bg-cyan-500/20 px-4 py-3 text-sm font-semibold disabled:opacity-40">Download Favorites ({favorites.length})</button>
              <p className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm">Showing {Math.min(showCount, filtered.length)} / {filtered.length}</p>
            </div>
          )}

          {!generated && <div className="rounded-2xl border border-dashed border-white/30 bg-white/5 p-8 text-center text-violet-100/80">Enter name and generate to unlock full signature lab.</div>}

          {!!filtered.length && (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.slice(0, showCount).map((item) => {
                  const fav = favorites.includes(item.id);
                  return (
                    <article key={`${item.id}-${item.index}`} className="rounded-2xl border border-white/15 bg-white/[0.08] p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h2 className="text-sm font-bold text-fuchsia-100">#{item.index} • {item.style.label}</h2>
                        <button onClick={() => toggleFavorite(item.id)} className={`rounded px-2 py-1 text-xs font-semibold ${fav ? 'bg-pink-500/40 text-pink-50' : 'bg-white/10 text-white'}`}>{fav ? '★ Saved' : '☆ Save'}</button>
                      </div>
                      <div className="mb-3 rounded-xl border border-white/20 bg-black/35 p-4">
                        <p style={{ fontFamily: item.style.fontFamily, fontWeight: item.style.baseWeight, color: inkColor || item.style.accent, transform: `skew(${item.style.angle + extraAngle}deg)`, letterSpacing: `${item.style.letterSpacing + extraSpacing}px`, fontSize: `${fontSize / 2.4}px`, textShadow: '0 0 12px rgba(255,255,255,0.16)' }} className="leading-tight">{item.text}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <button onClick={() => downloadSvg(item)} className="rounded-lg border border-cyan-200/30 bg-cyan-400/20 py-2 font-semibold">SVG</button>
                        <button onClick={() => downloadPng(item)} className="rounded-lg border border-blue-200/30 bg-blue-400/20 py-2 font-semibold">PNG</button>
                        <button onClick={() => copyText(item.text)} className="rounded-lg border border-white/30 bg-white/10 py-2 font-semibold">Copy</button>
                      </div>
                    </article>
                  );
                })}
              </section>

              {showCount < filtered.length && (
                <div className="mt-6 text-center">
                  <button onClick={() => setShowCount((v) => Math.min(v + 24, filtered.length))} className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-semibold">Show More ({filtered.length - showCount} left)</button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
};

export default App;
