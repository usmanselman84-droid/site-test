'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Leaf,
  ShoppingBag,
  Sparkles,
  Circle,
  Award,
  Palette,
  Ticket,
  Mic2,
  Image as ImageIcon,
  MousePointer2,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ecoTierProgress, ECO_EARN_HINTS, profileLevelProgress } from '@/lib/eco-tier';
import { useVoiceActions } from '@/components/VoiceProvider';
import { SLOT_LABELS,
  SLOT_HINTS, COSMETIC_PREVIEW, ECO_BOOSTS, type CosmeticSlot, type EcoLoadout, type EcoBoosts, type EcoBoostId } from '@/lib/eco-loadout';
import EcoPoolHint from '@/components/EcoPoolHint';
import { fetchEcoCached, invalidateEcoCache } from '@/lib/user-data-client';
import { POINTS } from '@/lib/points-labels';
import { useSession } from 'next-auth/react';
import UserAvatar from '@/components/UserAvatar';

const SLOT_ICONS: Record<CosmeticSlot, LucideIcon> = {
  frame: Circle,
  badge: Award,
  theme: Palette,
  ticket: Ticket,
  voice: Mic2,
  aura: Sparkles,
  banner: ImageIcon,
  cursor: MousePointer2,
};

type CatalogItem = {
  id: string;
  label: string;
  cost: number;
  slot: CosmeticSlot;
  slotLabel?: string;
  owned: boolean;
  equipped?: boolean;
  blurb?: string;
};

type Props = {
  /** @deprecated use mode="card" */
  compact?: boolean;
  /** card = profile overview; shop = full store; full = legacy */
  mode?: 'card' | 'shop' | 'full';
  onBalanceChange?: (ecoPoints: number) => void;
};

function networkErrorMessage(e: unknown) {
  const name = e instanceof Error ? e.name : '';
  const msg = e instanceof Error ? e.message : '';
  if (name === 'AbortError' || /aborted/i.test(msg)) {
    return 'Сервер не ответил вовремя. Попробуйте ещё раз';
  }
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return 'Не удалось связаться с сервером. Обновите страницу и попробуйте снова';
  }
  return msg || 'Ошибка';
}

export default function EcoPointsPanel({ compact, mode, onBalanceChange }: Props) {
  const resolvedMode: 'card' | 'shop' | 'full' = mode || (compact ? 'card' : 'full');
  const [ecoPoints, setEcoPoints] = useState(0);
  const [contribution, setContribution] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(resolvedMode === 'shop' || resolvedMode === 'full');
  const [openSlot, setOpenSlot] = useState<CosmeticSlot | null>('frame');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [fitReveal, setFitReveal] = useState<CatalogItem | null>(null);
  const [shopTab, setShopTab] = useState<'look' | 'boosts'>('look');
  const [boosts, setBoosts] = useState<EcoBoosts>({});
  const { data: session } = useSession();
  const { setLoadoutLocal } = useVoiceActions();
  const postLock = useRef(false);
  const onBalanceRef = useRef(onBalanceChange);
  onBalanceRef.current = onBalanceChange;
  const lastReportedEco = useRef<number | null>(null);

  const applyCatalogEquipped = useCallback((loadout: EcoLoadout, ownedIds?: string[]) => {
    setCatalog((prev) =>
      prev.map((item) => ({
        ...item,
        owned: ownedIds ? ownedIds.includes(item.id) : item.owned,
        equipped: loadout[item.slot] === item.id,
      }))
    );
  }, []);

  const reportBalance = useCallback((n: number) => {
    setEcoPoints(n);
    if (lastReportedEco.current === n) return;
    lastReportedEco.current = n;
    onBalanceRef.current?.(n);
  }, []);

  const load = useCallback((force = false) => {
    return fetchEcoCached(force)
      .then((d) => {
        if (!d) return;
        if (typeof d.ecoPoints === 'number') {
          reportBalance(d.ecoPoints);
        }
        if (typeof d.contribution === 'number') setContribution(d.contribution);
        if (Array.isArray(d.catalog)) setCatalog(d.catalog as CatalogItem[]);
        if (d.loadout && typeof d.loadout === 'object') setLoadoutLocal(d.loadout as EcoLoadout);
        if (d.boosts && typeof d.boosts === 'object') setBoosts(d.boosts as EcoBoosts);
      })
      .catch(() => undefined);
  }, [reportBalance, setLoadoutLocal]);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    setShopOpen(resolvedMode === 'shop' || resolvedMode === 'full');
  }, [resolvedMode]);

  const post = async (body: Record<string, unknown>, okMsg: string) => {
    if (postLock.current) return;
    const id = String(body.cosmeticId || body.slot || 'x');
    postLock.current = true;
    setBusyId(id);

    const snapshot = catalog;
    const snapshotPoints = ecoPoints;
    const snapshotLoadout: EcoLoadout = {};
    for (const c of catalog) {
      if (c.equipped) snapshotLoadout[c.slot] = c.id;
    }

    /* Optimistic: flip owned/equipped/points immediately so Купить doesn't freeze the shop */
    if (body.action === 'buy' && typeof body.cosmeticId === 'string') {
      const item = catalog.find((c) => c.id === body.cosmeticId);
      if (item) {
        const nextPoints = Math.max(0, ecoPoints - item.cost);
        const merged: EcoLoadout = { ...snapshotLoadout, [item.slot]: item.id };
        setEcoPoints(nextPoints);
        onBalanceRef.current?.(nextPoints);
        lastReportedEco.current = nextPoints;
        setCatalog((prev) =>
          prev.map((c) =>
            c.id === item.id
              ? { ...c, owned: true, equipped: true }
              : c.slot === item.slot
                ? { ...c, equipped: false }
                : c
          )
        );
        setLoadoutLocal(merged);
      }
    } else if (body.action === 'equip' && typeof body.cosmeticId === 'string') {
      const item = catalog.find((c) => c.id === body.cosmeticId);
      if (item) {
        const merged: EcoLoadout = { ...snapshotLoadout, [item.slot]: item.id };
        setCatalog((prev) =>
          prev.map((c) =>
            c.slot === item.slot ? { ...c, equipped: c.id === item.id } : c
          )
        );
        setLoadoutLocal(merged);
      }
    } else if (body.action === 'unequip' && typeof body.slot === 'string') {
      const slot = body.slot as CosmeticSlot;
      setCatalog((prev) =>
        prev.map((c) => (c.slot === slot ? { ...c, equipped: false } : c))
      );
      const merged: EcoLoadout = { ...snapshotLoadout };
      delete merged[slot];
      setLoadoutLocal(merged);
    }

    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? window.setTimeout(() => ctrl.abort(), 12000) : 0;

    try {
      const res = await fetch('/api/user/eco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify(body),
        signal: ctrl?.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          res.status === 403 && String(data.code || '').startsWith('CSRF')
            ? 'Обновите страницу и попробуйте снова'
            : data.message ||
                (res.status === 401
                  ? 'Войдите снова'
                  : res.status === 429
                    ? 'Слишком часто. Подождите пару секунд'
                    : res.status >= 500
                      ? 'Сервер временно недоступен'
                      : 'Не удалось сохранить')
        );
      }
      if (typeof data.ecoPoints === 'number') {
        reportBalance(data.ecoPoints);
      }
      if (data.loadout && typeof data.loadout === 'object') {
        setLoadoutLocal(data.loadout as EcoLoadout);
        applyCatalogEquipped(
          data.loadout as EcoLoadout,
          Array.isArray(data.cosmetics) ? data.cosmetics : undefined
        );
      }
      if (data.boosts && typeof data.boosts === 'object') setBoosts(data.boosts as EcoBoosts);
      if (Array.isArray(data.cosmetics)) {
        setCatalog((prev) =>
          prev.map((item) => ({
            ...item,
            owned: data.cosmetics.includes(item.id),
            equipped: data.loadout?.[item.slot] === item.id,
          }))
        );
      }
      invalidateEcoCache();
      /* Stable ids replace in-place — never stack duplicate equip toasts */
      const action = String(body.action || 'x');
      toast.dismiss(`eco-shop-${action}`);
      toast.success(okMsg, { id: `eco-shop-${action}`, duration: 2200 });
      if (action === 'buy' || action === 'equip') {
        const cid = String(body.cosmeticId || '');
        const shown = catalog.find((c) => c.id === cid);
        if (shown) setFitReveal(shown);
      }
    } catch (e) {
      /* Revert optimistic UI; avoid extra GET stampede on 429 / CSRF / timeout */
      setCatalog(snapshot);
      setLoadoutLocal(snapshotLoadout);
      setEcoPoints(snapshotPoints);
      lastReportedEco.current = snapshotPoints;
      onBalanceRef.current?.(snapshotPoints);
      const msg = networkErrorMessage(e);
      const action = String(body.action || 'x');
      toast.dismiss(`eco-shop-${action}`);
      toast.error(msg, { id: `eco-shop-err-${action}`, duration: 3200 });
      if (!/слишком часто|вовремя|сервер временно|origin|csrf|referer|обновите страницу/i.test(msg)) {
        void load(true);
      }
    } finally {
      if (timer) window.clearTimeout(timer);
      setBusyId(null);
      postLock.current = false;
    }
  };

  const progress =
    contribution != null ? profileLevelProgress(contribution) : ecoTierProgress(ecoPoints);
  const tierObj = 'level' in progress ? progress.level : progress.tier;
  const pct = progress.pct;
  const tierLabel =
    'title' in tierObj
      ? `Ур. ${tierObj.level} · ${tierObj.title}`
      : tierObj.label;
  const tierColor = tierObj.color;
  const tierNext = tierObj.next;
  const tierBlurb = 'blurb' in tierObj ? tierObj.blurb : '';
  const pointsBase = contribution != null ? contribution : ecoPoints;
  const ownedCount = catalog.filter((c) => c.owned).length;

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of catalog) {
      const slot = item.slot || 'frame';
      const list = map.get(slot) || [];
      list.push(item);
      map.set(slot, list);
    }
    return Array.from(map.entries());
  }, [catalog]);

  const equippedLook = useMemo(
    () =>
      catalog
        .filter((c) => c.equipped)
        .map((item) => ({
          ...item,
          preview: COSMETIC_PREVIEW[item.id] || { glyph: '◈', tint: '#8562d8' },
        })),
    [catalog]
  );

  const previewItem = useMemo(() => {
    const id =
      previewId ||
      catalog.find((c) => c.slot === 'frame' && c.equipped)?.id ||
      catalog.find((c) => c.slot === 'frame')?.id;
    return catalog.find((c) => c.id === id) || null;
  }, [catalog, previewId]);
  const previewMeta = previewItem
    ? COSMETIC_PREVIEW[previewItem.id] || { glyph: '▣', tint: '#8562d8' }
    : null;

  if (resolvedMode === 'card') {
    return (
      <section className="eco-card" aria-label={POINTS.shop.wallet}>
        <div className="eco-card__top">
          <div>
            <div className="eco-card__label">
              <Leaf size={14} aria-hidden /> {POINTS.shop.wallet}
            </div>
            <div className="eco-card__balance">{ecoPoints.toLocaleString('ru-RU')}</div>
          </div>
          <div className="eco-card__ring" style={{ ['--eco-pct' as string]: `${pct}%`, ['--eco-color' as string]: tierColor }}>
            <span>{'level' in tierObj ? tierObj.level : '★'}</span>
          </div>
        </div>
        <div className="eco-card__tier" style={{ color: tierColor }}>
          {tierLabel}
        </div>
        {tierNext ? (
          <div className="eco-card__bar" aria-hidden>
            <div style={{ width: `${pct}%`, background: tierColor }} />
          </div>
        ) : null}
        <p className="eco-card__hint">
          {tierNext
            ? `Ещё ${tierNext - pointsBase} вклада до следующего уровня`
            : 'Максимальный уровень — держите активность'}
        </p>
        <div className="eco-card__actions">
          <Link href="/dashboard/shop" className="btn btn-primary btn-sm">
            <ShoppingBag size={14} /> Открыть магазин
          </Link>
          <span className="eco-card__owned">в инвентаре {ownedCount}</span>
        </div>
      </section>
    );
  }

  return (
    <section
      id={resolvedMode === 'shop' || resolvedMode === 'full' ? 'eco-shop' : undefined}
      className={`eco-panel${resolvedMode === 'shop' ? ' eco-panel--shop eco-panel--luxe' : ''}`}
      aria-label={POINTS.shop.wallet}
    >
      <div className="eco-panel__head">
        <h4>
          <Leaf size={15} aria-hidden /> {resolvedMode === 'shop' ? 'Кошелёк магазина — можно тратить' : POINTS.shop.brand}
        </h4>
        <span className="eco-panel__balance">{ecoPoints.toLocaleString('ru-RU')}</span>
      </div>
      {contribution != null && contribution !== ecoPoints ? (
        <p className="eco-panel__hint" style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
          К трате {ecoPoints.toLocaleString('ru-RU')} · вклад в ранг {contribution.toLocaleString('ru-RU')}
        </p>
      ) : null}

      <div className="eco-panel__tier" style={{ '--eco-tier-color': tierColor } as React.CSSProperties}>
        <span className="eco-panel__tier-badge">
          <Sparkles size={12} aria-hidden />
          {tierLabel}
        </span>
        {tierBlurb ? <p className="eco-panel__level-blurb">{tierBlurb}</p> : null}
        {tierNext ? (
          <div className="eco-panel__tier-bar">
            <div style={{ width: `${pct}%` }} />
          </div>
        ) : null}
        {tierNext ? (
          <span className="eco-panel__tier-next">
            ещё {tierNext - pointsBase} вклада до следующего уровня
            {'nextReward' in progress && progress.nextReward
              ? ` · награда: +${progress.nextReward.eco} мб`
              : ''}
          </span>
        ) : (
          <span className="eco-panel__tier-next">Максимальный уровень</span>
        )}
      </div>

      <details className="eco-panel__faq">
        <summary>Как заработать М-баллы?</summary>
        <ul className="eco-panel__earn-hints">
          {ECO_EARN_HINTS.map((h) => (
            <li key={h.action}>
              <span>{h.action}</span>
              <strong>+{h.points}</strong>
            </li>
          ))}
        </ul>
      </details>

      {resolvedMode === 'shop' ? (
        <div className="eco-shop-tabs" role="tablist">
          <button type="button" className={shopTab === 'look' ? 'is-on' : ''} onClick={() => setShopTab('look')}>
            Образ
          </button>
          <button type="button" className={shopTab === 'boosts' ? 'is-on' : ''} onClick={() => setShopTab('boosts')}>
            Услуги
          </button>
        </div>
      ) : null}

      {resolvedMode === 'shop' && shopTab === 'boosts' ? (
        <div className="eco-boosts">
          {(Object.values(ECO_BOOSTS) as (typeof ECO_BOOSTS)[EcoBoostId][]).map((b) => {
            const until = boosts[b.id];
            const active = until && Date.parse(until) > Date.now();
            return (
              <article key={b.id} className={`eco-boost-card${active ? ' is-active' : ''}`}>
                <div>
                  <strong>{b.label}</strong>
                  <em style={{ display: 'block', fontStyle: 'normal', fontSize: '0.8rem', color: '#7c3aed' }}>
                    {b.cost} М-баллов
                  </em>
                </div>
                <button
                  type="button"
                  disabled={busyId === b.id || ecoPoints < b.cost}
                  onClick={() => void post({ action: 'boost', boostId: b.id }, active ? 'Продлено' : 'Услуга включена')}
                >
                  {busyId === b.id ? '…' : active ? 'Продлить' : 'Купить'}
                </button>
                <p>
                  {b.blurb}
                  {active
                    ? ` Активно до ${new Date(until as string).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.`
                    : ''}
                </p>
              </article>
            );
          })}
        </div>
      ) : null}

      <EcoPoolHint variant="shop" />

      {resolvedMode === 'shop' || resolvedMode === 'full' ? (
        <div className="eco-live-preview" aria-label="Примерка на аватаре">
          <div
            className="eco-live-preview__ring"
            data-slot={previewItem?.slot || 'frame'}
            style={{ ['--preview' as string]: previewMeta?.tint || '#8562d8' }}
          >
            <UserAvatar name={session?.user?.name} image={session?.user?.image || null} size={88} />
          </div>
          <div className="eco-live-preview__meta">
            <span className="eco-live-preview__kicker">Как будет выглядеть</span>
            <strong>{previewItem?.label || 'Выберите рамку'}</strong>
            <p>
              {previewItem?.slot === 'frame' || previewItem?.slot === 'aura'
                ? 'Примерка на вашем текущем аватаре. Купите или наденьте, чтобы закрепить в профиле.'
                : 'Наведите на карточку товара, чтобы примерить цвет и акцент.'}
            </p>
          </div>
        </div>
      ) : null}

      {equippedLook.length > 0 ? (
        <div className="eco-look" aria-label="Текущий образ">
          <span className="eco-look__label">Ваш образ</span>
          <ul className="eco-look__list">
            {equippedLook.map((item) => (
              <li
                key={item.id}
                className="eco-look__chip"
                style={{ ['--preview' as string]: item.preview.tint }}
              >
                <span className="eco-look__glyph" aria-hidden>
                  {item.preview.glyph}
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <em>{SLOT_LABELS[item.slot] || item.slot}</em>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : resolvedMode === 'shop' ? (
        <p className="eco-look eco-look--empty">
          Пока без образа — купите рамку или тему, и они сразу появятся в профиле.
        </p>
      ) : null}

      {resolvedMode === 'full' ? (
        <div className="eco-panel__shop-head">
          <p className="eco-panel__lead">
            Соберите образ: рамки, ауры, темы. «Стиль текстов» меняет формулировки интерфейса (это не микрофон). Покупка сразу надевается.
          </p>
          <button
            type="button"
            className="eco-panel__shop-toggle"
            aria-expanded={shopOpen}
            onClick={() => setShopOpen((v) => !v)}
          >
            {shopOpen ? 'Свернуть магазин' : `Магазин · ${catalog.length}`}
          </button>
        </div>
      ) : (
        <p className="eco-panel__lead">Выберите слот и купите или наденьте предмет.</p>
      )}

      {shopOpen && (resolvedMode !== 'shop' || shopTab === 'look')
        ? grouped.map(([slot, items]) => (
            <details
              key={slot}
              className="eco-panel__slot-group"
              data-slot={slot}
              open={openSlot === slot}
            >
              <summary
                className="eco-panel__slot-title"
                onClick={(e) => {
                  e.preventDefault();
                  setOpenSlot((cur) => (cur === slot ? null : (slot as CosmeticSlot)));
                }}
              >
                {(() => {
                  const Icon = SLOT_ICONS[slot as CosmeticSlot] || Sparkles;
                  return <Icon size={13} aria-hidden />;
                })()}{' '}
                {SLOT_LABELS[slot as CosmeticSlot] || slot}
                <span className="eco-panel__slot-count">{items.length}</span>
              </summary>
              {openSlot === slot ? (
              <>
              <p className="eco-panel__slot-hint">{SLOT_HINTS[slot as CosmeticSlot]}</p>
              <ul className="eco-panel__catalog eco-panel__catalog--rich eco-panel__catalog--grid">
                {items.map((item) => {
                  const preview = COSMETIC_PREVIEW[item.id] || {
                    glyph:
                      slot === 'voice' ? '♪' : slot === 'frame' ? '▣' : slot === 'aura' ? '✦' : '◈',
                    tint: '#0d9488',
                  };
                  return (
                  <li
                    key={item.id}
                    className={`eco-shop-card${item.owned ? ' is-owned' : ''}${item.equipped ? ' is-equipped' : ''}${previewId === item.id ? ' is-preview' : ''}`}
                    data-slot={slot}
                    data-preview={item.id}
                    onMouseEnter={() => setPreviewId(item.id)}
                    onFocus={() => setPreviewId(item.id)}
                  >
                    <div
                      className="eco-shop-card__visual"
                      aria-hidden
                      data-preview={item.id}
                      data-slot={slot}
                      style={{ ['--preview' as string]: preview.tint }}
                    >
                      <span className="eco-shop-card__glyph">{preview.glyph}</span>
                      <span className="eco-shop-card__mini" />
                    </div>
                    <div className="eco-shop-card__body">
                      <strong>{item.label}</strong>
                      <span className="eco-shop-card__meta">
                        {item.owned
                          ? item.equipped
                            ? 'Надето · видно в профиле'
                            : 'В инвентаре'
                          : `${item.cost} мб`}
                      </span>
                      <p className="eco-shop-card__blurb">
                        {item.blurb || SLOT_HINTS[item.slot]}
                      </p>
                    </div>
                    <div className="eco-shop-card__actions">
                      {!item.owned ? (
                        <button
                          type="button"
                          className="eco-panel__buy"
                          disabled={busyId === item.id || ecoPoints < item.cost}
                          onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            void post(
                              { action: 'buy', cosmeticId: item.id },
                              item.slot === 'voice' ? 'Куплено и включено' : 'Куплено и надето'
                            );
                          }}
                        >
                          <ShoppingBag size={13} aria-hidden />
                          {busyId === item.id ? '…' : 'Купить'}
                        </button>
                      ) : item.equipped ? (
                        <button
                          type="button"
                          className="eco-panel__buy eco-panel__buy--ghost"
                          disabled={busyId === item.slot}
                          onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            void post({ action: 'unequip', slot: item.slot }, 'Снято');
                          }}
                        >
                          {busyId === item.slot ? '…' : 'Снять'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="eco-panel__buy"
                          disabled={busyId === item.id}
                          onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            void post(
                              { action: 'equip', cosmeticId: item.id },
                              'Надето — видно в профиле'
                            );
                          }}
                        >
                          {busyId === item.id ? '…' : 'Надеть'}
                        </button>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ul>
              </>
              ) : null}
            </details>
          ))
        : null}
      {fitReveal ? (
        <div className="eco-fit-modal" role="dialog" aria-modal="true" aria-labelledby="eco-fit-title">
          <button type="button" className="eco-fit-modal__back" aria-label="Закрыть" onClick={() => setFitReveal(null)} />
          <div className="eco-fit-modal__card">
            <p className="eco-fit-modal__kicker">Надето</p>
            <h3 id="eco-fit-title">{fitReveal.label}</h3>
            <p>
              Слот: {SLOT_LABELS[fitReveal.slot]}. {fitReveal.blurb || SLOT_HINTS[fitReveal.slot]}
            </p>
            <p className="eco-fit-modal__where">
              Где смотреть: кабинет → профиль (рамка, аура, шапка, тема, значок). Билет — в «Билетах». Курсор — на ПК
              сразу по сайту. Стиль текстов — в подписях кнопок.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setFitReveal(null)}>
              Понятно
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
