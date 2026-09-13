'use client';

import { useEffect, useState } from 'react';
import { Leaf } from 'lucide-react';
import { fetchPublicStatusCached } from '@/lib/public-status-client';

type Pool = {
  visible: boolean;
  total: number;
  remaining?: number;
  showInFooter?: boolean;
};

function fmt(n: number) {
  return n.toLocaleString('ru-RU');
}

export default function FooterEcoStatus() {
  const [pool, setPool] = useState<Pool | null>(null);
  const [ecoEnabled, setEcoEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const pub = await fetchPublicStatusCached();
      if (cancelled) return;
      if (pub?.modules && pub.modules.eco === false) {
        setEcoEnabled(false);
        return;
      }
      setEcoEnabled(true);
      try {
        const r = await fetch('/api/eco/pool', { cache: 'default' });
        if (!r.ok || cancelled) return;
        const d = (await r.json()) as Pool;
        if (!cancelled) setPool(d);
      } catch {
        /* ignore */
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ecoEnabled) return null;
  if (!pool?.visible || pool.showInFooter === false) return null;

  const remaining = pool.remaining ?? 0;
  const total = Math.max(1, pool.total ?? 0);
  const pct = Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));

  return (
    <aside className="site-footer-eco site-footer-eco--card" aria-label="Общий М-пул портала">
      <div className="site-footer-eco__row">
        <span className="site-footer-eco__icon" aria-hidden>
          <Leaf size={18} />
        </span>
        <div className="site-footer-eco__text">
          <strong>М-пул портала</strong>
          <span>
            Общий запас М-баллов на всех: осталось {fmt(remaining)} из {fmt(total)}. Это не ваш личный баланс —
            личные очки смотрите в кабинете → Магазин.
          </span>
        </div>
        <span className="site-footer-eco__pct">{pct}%</span>
      </div>
      <div className="site-footer-eco__bar" aria-hidden>
        <i style={{ width: `${pct}%` }} />
      </div>
    </aside>
  );
}
