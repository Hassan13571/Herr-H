import React, { useMemo, useState } from 'react';

type SignatureStyle = {
  id: string;
  label: string;
  fontFamily: string;
  weight: number;
  color: string;
  tilt: number;
  spacing: number;
  embellishment: string;
};

type SignatureItem = SignatureStyle & {
  index: number;
  text: string;
};

const HAND_STYLES: SignatureStyle[] = [
  { id: 'gv', label: 'Great Vibes', fontFamily: '"Great Vibes", cursive', weight: 400, color: '#f8d4ff', tilt: -2, spacing: 1, embellishment: '✦' },
  { id: 'pc', label: 'Pacifico', fontFamily: '"Pacifico", cursive', weight: 400, color: '#ffd6e8', tilt: 0, spacing: 0.5, embellishment: '✧' },
  { id: 'dm', label: 'Dancing Script', fontFamily: '"Dancing Script", cursive', weight: 700, color: '#d9e9ff', tilt: -1, spacing: 0.4, embellishment: '❦' },
  { id: 'sa', label: 'Sacramento', fontFamily: '"Sacramento", cursive', weight: 400, color: '#ffe6c7', tilt: -4, spacing: 1.2, embellishment: '❧' },
  { id: 'as', label: 'Allura', fontFamily: '"Allura", cursive', weight: 400, color: '#fbe4ff', tilt: -3, spacing: 0.9, embellishment: '✺' },
  { id: 'af', label: 'Alex Brush', fontFamily: '"Alex Brush", cursive', weight: 400, color: '#ccf2ff', tilt: -2, spacing: 0.8, embellishment: '✪' },
  { id: 'pk', label: 'Parisienne', fontFamily: '"Parisienne", cursive', weight: 400, color: '#ffe9f5', tilt: -2, spacing: 1, embellishment: '❋' },
  { id: 'mr', label: 'Mr Dafoe', fontFamily: '"Mr Dafoe", cursive', weight: 400, color: '#dff1ff', tilt: -5, spacing: 1.1, embellishment: '✥' },
  { id: 'cb', label: 'Caveat Brush', fontFamily: '"Caveat Brush", cursive', weight: 600, color: '#e5ffd9', tilt: 1, spacing: 0.2, embellishment: '✰' },
  { id: 'sc', label: 'Satisfy', fontFamily: '"Satisfy", cursive', weight: 400, color: '#ffe4d6', tilt: -2, spacing: 0.6, embellishment: '✵' },
  { id: 'yl', label: 'Yellowtail', fontFamily: '"Yellowtail", cursive', weight: 400, color: '#f5e0ff', tilt: -3, spacing: 0.8, embellishment: '❈' },
  { id: 'ka', label: 'Kaushan Script', fontFamily: '"Kaushan Script", cursive', weight: 400, color: '#d9edff', tilt: -1, spacing: 0.5, embellishment: '✹' },
];

const cleanName = (raw: string) => raw.replace(/\s+/g, ' ').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 26);

const patternBuilders: Array<(name: string, m: string, i: number) => string> = [
  (name, m) => `${m} ${name}`,
  (name, m) => `${name} ${m}`,
  (name, m) => `${m} ${name.toUpperCase()}`,
  (name, m) => `${name} ${m} ${name.charAt(0)}.`,
  (name, m) => `${name.split('').join(' ')} ${m}`,
  (name, m) => `${name} ${m} ${name.slice(-1).toUpperCase()}`,
  (name, m) => `${name.charAt(0).toUpperCase()}. ${name.slice(1)} ${m}`,
  (name, m) => `${m} ${name} ${m}`,
  (name, m, i) => `${name}${'~'.repeat((i % 3) + 1)} ${m}`,
  (name, m, i) => `${name} ${m} ${['Jr.', 'Art', 'Studio', 'Sign'][i % 4]}`,
];

const createSignatures = (name: string): SignatureItem[] => {
  const safe = cleanName(name);
  if (!safe) return [];

  const items: SignatureItem[] = [];
  HAND_STYLES.forEach((style) => {
    patternBuilders.forEach((builder, i) => {
      items.push({
        ...style,
        index: items.length + 1,
        text: builder(safe, style.embellishment, i),
      });
    });
  });

  return items;
};

const buildSvgData = (item: SignatureItem) => {
  const safeText = item.text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500" viewBox="0 0 1200 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#12072e"/>
      <stop offset="100%" stop-color="#29134d"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="1200" height="500" fill="url(#bg)" rx="32"/>
  <text x="70" y="300" fill="${item.color}" font-size="120" style="font-family:${item.fontFamily};font-weight:${item.weight};letter-spacing:${item.spacing}px;" transform="rotate(${item.tilt} 300 250)">${safeText}</text>
  <text x="70" y="440" fill="#cfc2ff" font-size="28" style="font-family:Inter,Arial,sans-serif;letter-spacing:2px;">Signature #${item.index} • ${item.label}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const downloadUri = (uri: string, filename: string) => {
  const a = document.createElement('a');
  a.href = uri;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const App: React.FC = () => {
  const [name, setName] = useState('');
  const [generated, setGenerated] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);

  const signatures = useMemo(() => (generated ? createSignatures(name) : []), [generated, name]);
  const safeName = cleanName(name);

  const handleGenerate = () => {
    if (!safeName) return;
    setGenerated(true);
    setVisibleCount(24);
  };

  const handleDownloadOne = (item: SignatureItem) => {
    const uri = buildSvgData(item);
    downloadUri(uri, `${safeName || 'signature'}-${item.index}.svg`);
  };

  const handleDownloadAll = async () => {
    for (const item of signatures) {
      const uri = buildSvgData(item);
      downloadUri(uri, `${safeName || 'signature'}-${item.index}.svg`);
      await new Promise((r) => setTimeout(r, 60));
    }
  };

  return (
    <main className="h-full overflow-y-auto bg-gradient-to-br from-[#0d0424] via-[#180a3b] to-[#2b1251] text-white">
      <div className="mx-auto min-h-full w-full max-w-7xl px-4 py-8 md:py-12">
        <section className="rounded-3xl border border-white/20 bg-black/25 p-5 shadow-2xl backdrop-blur-xl md:p-10">
          <div className="mb-8 text-center">
            <p className="mb-3 inline-block rounded-full border border-fuchsia-200/40 bg-fuchsia-400/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-fuchsia-100">
              Handwriting Signature Studio
            </p>
            <h1 className="bg-gradient-to-r from-fuchsia-200 via-violet-100 to-cyan-200 bg-clip-text text-3xl font-black text-transparent md:text-5xl">
              120 Handwritten Signature Styles + Download
            </h1>
            <p className="mx-auto mt-3 max-w-3xl text-sm text-violet-100/90 md:text-base">
              Enter one name and generate more than 100 hand-writing style signatures.
              Download each style as SVG, or download all at once.
            </p>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type a name from TikTok comments..."
              maxLength={32}
              className="w-full rounded-2xl border border-white/25 bg-white/10 px-5 py-4 text-lg text-white outline-none ring-fuchsia-300 placeholder:text-white/60 focus:ring-2"
            />
            <button
              onClick={handleGenerate}
              disabled={!safeName}
              className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-4 font-bold text-white shadow-lg shadow-fuchsia-900/40 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Generate 120 ✨
            </button>
            <button
              onClick={handleDownloadAll}
              disabled={!signatures.length}
              className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4 font-bold text-white shadow-lg shadow-blue-900/40 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Download All
            </button>
          </div>

          {!!signatures.length && (
            <p className="mb-6 text-center text-sm text-violet-200">Generated: {signatures.length} signatures for “{safeName}”.</p>
          )}

          {!generated && (
            <div className="rounded-2xl border border-dashed border-white/30 bg-white/5 p-8 text-center text-violet-100/80">
              Start by entering a name. You will get 120 handwritten versions.
            </div>
          )}

          {!!signatures.length && (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {signatures.slice(0, visibleCount).map((item) => (
                  <article key={`${item.id}-${item.index}`} className="rounded-2xl border border-white/15 bg-white/[0.08] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-fuchsia-100">#{item.index} • {item.label}</h2>
                      <button
                        onClick={() => handleDownloadOne(item)}
                        className="rounded-lg border border-cyan-200/30 bg-cyan-400/20 px-2 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/30"
                      >
                        Download
                      </button>
                    </div>
                    <div className="rounded-xl border border-white/20 bg-black/35 p-4">
                      <p
                        className="text-4xl leading-tight md:text-5xl"
                        style={{
                          fontFamily: item.fontFamily,
                          fontWeight: item.weight,
                          color: item.color,
                          transform: `skew(${item.tilt}deg)`,
                          letterSpacing: `${item.spacing}px`,
                          textShadow: '0 0 14px rgba(255,255,255,0.16)',
                        }}
                      >
                        {item.text}
                      </p>
                    </div>
                  </article>
                ))}
              </section>

              {visibleCount < signatures.length && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setVisibleCount((v) => Math.min(v + 24, signatures.length))}
                    className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/20"
                  >
                    Show More ({signatures.length - visibleCount} left)
                  </button>
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
