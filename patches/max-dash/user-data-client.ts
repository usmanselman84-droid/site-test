'use client';

/**
 * Shared client caches for chrome fetches (Navbar / Dashboard / NavProfileCard).
 * Prevents stampede of no-store profile+eco on every mount/focus.
 */

type Json = Record<string, unknown>;

const PROFILE_TTL = 45_000;
const ECO_TTL = 30_000;

let profileCache: { at: number; data: Json } | null = null;
let profileInflight: Promise<Json | null> | null = null;
let ecoCache: { at: number; data: Json } | null = null;
let ecoInflight: Promise<Json | null> | null = null;

async function getJson(url: string): Promise<Json | null> {
  const r = await fetch(url, { cache: 'default', credentials: 'same-origin' });
  if (r.status === 429) return null;
  if (!r.ok) {
    const { readCabinetJson } = await import('@/lib/cabinet-fetch');
    return (await readCabinetJson(r)) as Json | null;
  }
  return (await r.json()) as Json;
}

export async function fetchProfileCached(force = false): Promise<Json | null> {
  const now = Date.now();
  if (!force && profileCache && now - profileCache.at < PROFILE_TTL) return profileCache.data;
  if (profileInflight) return profileInflight;
  profileInflight = getJson('/api/user/profile')
    .then((data) => {
      if (data) profileCache = { at: Date.now(), data };
      return data ?? profileCache?.data ?? null;
    })
    .catch(() => profileCache?.data ?? null)
    .finally(() => {
      profileInflight = null;
    });
  return profileInflight;
}

export async function fetchEcoCached(force = false): Promise<Json | null> {
  const now = Date.now();
  if (!force && ecoCache && now - ecoCache.at < ECO_TTL) return ecoCache.data;
  if (ecoInflight) return ecoInflight;
  ecoInflight = getJson('/api/user/eco')
    .then((data) => {
      if (data) ecoCache = { at: Date.now(), data };
      return data ?? ecoCache?.data ?? null;
    })
    .catch(() => ecoCache?.data ?? null)
    .finally(() => {
      ecoInflight = null;
    });
  return ecoInflight;
}

const COLLECTIBLES_TTL = 30_000;
let collectiblesCache: { at: number; data: Json } | null = null;
let collectiblesInflight: Promise<Json | null> | null = null;

export async function fetchCollectiblesCached(force = false): Promise<Json | null> {
  const now = Date.now();
  if (!force && collectiblesCache && now - collectiblesCache.at < COLLECTIBLES_TTL) {
    return collectiblesCache.data;
  }
  if (collectiblesInflight) return collectiblesInflight;
  collectiblesInflight = getJson('/api/user/collectibles')
    .then((data) => {
      if (data) collectiblesCache = { at: Date.now(), data };
      return data ?? collectiblesCache?.data ?? null;
    })
    .catch(() => collectiblesCache?.data ?? null)
    .finally(() => {
      collectiblesInflight = null;
    });
  return collectiblesInflight;
}

export function invalidateProfileCache() {
  profileCache = null;
}

export function invalidateEcoCache() {
  ecoCache = null;
}

export function invalidateCollectiblesCache() {
  collectiblesCache = null;
}

const apiCache = new Map<string, { at: number; data: unknown }>();
const apiInflight = new Map<string, Promise<unknown>>();

/** Short-lived in-memory cache for cabinet lists (messages / friends). */
export async function fetchUserApiCached(url: string, ttlMs = 12_000, force = false): Promise<any> {
  const now = Date.now();
  const hit = apiCache.get(url);
  if (!force && hit && now - hit.at < ttlMs) return hit.data;
  const pending = apiInflight.get(url);
  if (pending) return pending;
  const p = fetch(url, { credentials: 'same-origin' })
    .then(async (r) => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((data as { message?: string }).message || 'Не удалось загрузить');
      apiCache.set(url, { at: Date.now(), data });
      return data;
    })
    .finally(() => {
      apiInflight.delete(url);
    });
  apiInflight.set(url, p);
  return p;
}

export function invalidateUserApiCache(prefix = '') {
  if (!prefix) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.startsWith(prefix)) apiCache.delete(key);
  }
}
