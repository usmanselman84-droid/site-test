'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';

type Tile = { id: string; src: string };
type Pow = { seed: string; zeros: number };

function CaptchaTileCanvas({ src }: { src: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let dead = false;
    const run = async () => {
      const res = await fetch(src, { cache: 'no-store' });
      if (!res.ok || dead) return;
      const blob = await res.blob();
      const bmp = await createImageBitmap(blob);
      if (dead) return;
      const c = ref.current;
      if (!c) return;
      c.width = 96;
      c.height = 96;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, 96, 96);
      ctx.drawImage(bmp, 0, 0, 96, 96);
    };
    void run();
    return () => {
      dead = true;
    };
  }, [src]);
  return <canvas ref={ref} width={96} height={96} aria-hidden style={{ width: '100%', height: 'auto', display: 'block' }} />;
}

async function solvePow(challengeId: string, pow: Pow): Promise<string> {
  const enc = new TextEncoder();
  const zeros = Math.max(1, Math.min(6, pow.zeros || 3));
  const prefix = '0'.repeat(zeros);
  for (let n = 0; n < 2_000_000; n++) {
    const nonce = n.toString(16);
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(`${challengeId}:${pow.seed}:${nonce}`));
    const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (hex.startsWith(prefix)) return nonce;
    if (n % 250 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  return '0';
}

type Props = {
  onToken: (token: string) => void;
  className?: string;
};

export default function CaptchaField({ onToken, className }: Props) {
  const [challengeId, setChallengeId] = useState('');
  const [question, setQuestion] = useState('Защита…');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [pow, setPow] = useState<Pow | null>(null);
  const [powNonce, setPowNonce] = useState('');
  const [busy, setBusy] = useState(false);
  const [warming, setWarming] = useState(false);
  const [error, setError] = useState('');
  const [solved, setSolved] = useState(false);
  const moves = useRef(0);

  const load = useCallback(async () => {
    setBusy(true);
    setWarming(true);
    setError('');
    setSolved(false);
    setSelected([]);
    setPowNonce('');
    onToken('');
    try {
      const res = await fetch('/api/captcha/challenge');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      setChallengeId(data.challengeId);
      setQuestion(data.question || 'Отметьте картинки');
      setTiles(Array.isArray(data.tiles) ? data.tiles : []);
      const p = data.pow as Pow | undefined;
      if (p?.seed) {
        setPow(p);
        const nonce = await solvePow(data.challengeId, p);
        setPowNonce(nonce);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить проверку');
      setQuestion('—');
    } finally {
      setBusy(false);
      setWarming(false);
    }
  }, [onToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onMove = () => {
      moves.current += 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const verify = async () => {
    if (!challengeId) {
      setError('Обновите проверку');
      return;
    }
    if (selected.length === 0) {
      setError('Выберите картинки');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/captcha/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          selected,
          website: '',
          powNonce,
          moves: moves.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Неверно');
      setSolved(true);
      onToken(data.token);
    } catch (e) {
      setSolved(false);
      onToken('');
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) => {
    if (busy || solved) return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        padding: '0.85rem',
        borderRadius: 16,
        border: '1px solid rgba(6,52,74,0.12)',
        background: 'linear-gradient(180deg,#fff, #f7faf3)',
      }}
    >
      <input
        type="text"
        name="website"
        className="yp-honeypot"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        readOnly
        defaultValue=""
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
        <label style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', gap: 8, alignItems: 'center' }}>
          <ShieldCheck size={16} />
          {warming ? 'Крипто-проверка…' : question}
        </label>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void load()}
          disabled={busy}
          aria-label="Обновить проверку"
          style={{ padding: '0.55rem 0.7rem', minWidth: 44, minHeight: 44 }}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <div
        className="captcha-grid-9"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '0.4rem',
        }}
      >
        {tiles.map((t) => {
          const on = selected.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              disabled={busy || solved}
              aria-pressed={on}
              style={{
                padding: '0.35rem',
                borderRadius: 12,
                border: on ? '2px solid #0a7aa8' : '1px solid rgba(0,0,0,0.1)',
                background: on ? 'rgba(175,202,3,0.28)' : '#fff',
                cursor: busy || solved ? 'default' : 'pointer',
              }}
            >
              <CaptchaTileCanvas src={t.src} />
            </button>
          );
        })}
      </div>
      <button type="button" className="btn btn-primary" onClick={() => void verify()} disabled={busy || solved || !powNonce}>
        {solved ? 'Защита пройдена' : warming ? 'Готовим ключ…' : 'Подтвердить'}
      </button>
      {error && <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.85rem' }}>{error}</p>}
      {solved && !error && (
        <p style={{ margin: 0, color: '#15803d', fontSize: '0.85rem' }}>Можно отправлять форму</p>
      )}
    </div>
  );
}
