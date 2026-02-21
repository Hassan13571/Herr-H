import React, { useMemo, useState } from 'react';

type SignatureStyle = {
  id: string;
  title: string;
  subtitle: string;
  className: string;
  transform?: string;
  decoration: string;
};

const SIGNATURE_STYLES: SignatureStyle[] = [
  {
    id: 'classic',
    title: 'Classic Ink',
    subtitle: 'Elegant everyday signature',
    className: 'italic tracking-wide',
    decoration: '✦',
  },
  {
    id: 'neon',
    title: 'Neon Glow',
    subtitle: 'Perfect for TikTok vibe',
    className: 'font-black tracking-widest text-fuchsia-200 drop-shadow-[0_0_10px_rgba(244,114,182,0.9)]',
    decoration: '⚡',
  },
  {
    id: 'royal',
    title: 'Royal Script',
    subtitle: 'Luxury and premium feeling',
    className: 'font-serif italic text-amber-200',
    transform: 'scale(1.08)',
    decoration: '👑',
  },
  {
    id: 'minimal',
    title: 'Minimal Line',
    subtitle: 'Clean modern signature',
    className: 'font-mono uppercase tracking-[0.2em] text-sky-200',
    decoration: '—',
  },
  {
    id: 'dream',
    title: 'Dream Cloud',
    subtitle: 'Soft cute creator style',
    className: 'font-bold italic text-violet-200',
    decoration: '☁️',
  },
  {
    id: 'artist',
    title: 'Artist Mark',
    subtitle: 'Bold logo-like signature',
    className: 'font-extrabold tracking-tight text-rose-200',
    transform: 'skew(-8deg)',
    decoration: '🎨',
  },
];

const sanitizeName = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);

const buildSignature = (name: string, style: SignatureStyle, index: number) => {
  const base = sanitizeName(name);
  if (!base) return '';

  const variants = [
    `${style.decoration} ${base}`,
    `${base} ${style.decoration}`,
    `${base.split('').join(' ')} ${style.decoration}`,
    `${style.decoration} ${base.toUpperCase()}`,
  ];

  return variants[index % variants.length];
};

const App: React.FC = () => {
  const [name, setName] = useState('');
  const [showResults, setShowResults] = useState(false);

  const cleanName = sanitizeName(name);

  const signatures = useMemo(() => {
    if (!showResults || !cleanName) return [];
    return SIGNATURE_STYLES.map((style, index) => ({
      ...style,
      signature: buildSignature(cleanName, style, index),
    }));
  }, [cleanName, showResults]);

  const handleGenerate = () => {
    if (!cleanName) return;
    setShowResults(true);
  };

  return (
    <main className="h-full overflow-y-auto bg-gradient-to-br from-[#0c0320] via-[#1a0f3f] to-[#2a124f] text-white">
      <div className="min-h-full px-4 py-8 md:py-14">
        <section className="mx-auto w-full max-w-5xl rounded-3xl border border-white/20 bg-black/25 p-5 shadow-2xl backdrop-blur-xl md:p-10">
          <div className="mb-8 text-center">
            <p className="mb-3 inline-block rounded-full border border-pink-300/40 bg-pink-400/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-pink-100">
              TikTok Signature Game
            </p>
            <h1 className="bg-gradient-to-r from-fuchsia-300 via-violet-200 to-cyan-200 bg-clip-text text-3xl font-black text-transparent md:text-5xl">
              Name → Many Beautiful Signatures
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-violet-100/90 md:text-base">
              Type a name, tap generate, and show signature options live in your TikTok stream.
              Let people comment their name and make custom signature styles for them.
            </p>
          </div>

          <div className="mb-8 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tell me your name..."
              maxLength={32}
              className="w-full rounded-2xl border border-white/25 bg-white/10 px-5 py-4 text-lg text-white outline-none ring-fuchsia-300 placeholder:text-white/60 focus:ring-2"
            />
            <button
              onClick={handleGenerate}
              disabled={!cleanName}
              className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-4 font-bold text-white shadow-lg shadow-fuchsia-900/40 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Generate Signatures ✨
            </button>
          </div>

          {!showResults && (
            <div className="rounded-2xl border border-dashed border-white/30 bg-white/5 p-8 text-center text-violet-100/80">
              Start the game by entering a name.
            </div>
          )}

          {!!signatures.length && (
            <section className="grid gap-4 md:grid-cols-2">
              {signatures.map((item) => (
                <article key={item.id} className="rounded-2xl border border-white/15 bg-white/[0.08] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-fuchsia-100">{item.title}</h2>
                    <span className="text-xs uppercase tracking-[0.2em] text-violet-200">style</span>
                  </div>
                  <p className="mb-4 text-xs text-violet-100/75">{item.subtitle}</p>
                  <div className="rounded-xl border border-white/20 bg-black/30 p-4">
                    <p className={`text-2xl md:text-3xl ${item.className}`} style={{ transform: item.transform, fontFamily: item.id === 'classic' ? 'Times New Roman, serif' : undefined }}>
                      {item.signature}
                    </p>
                  </div>
                </article>
              ))}
            </section>
          )}
        </section>
      </div>
    </main>
  );
};

export default App;
