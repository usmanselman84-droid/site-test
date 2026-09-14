/** First-paint hint so header chrome matches auth before NextAuth hydrates. */

export const SESSION_HINT_KEY = 'yp-session';

function writeCookie(on: boolean) {
  if (typeof document === 'undefined') return;
  document.cookie = on
    ? `${SESSION_HINT_KEY}=1; Path=/; Max-Age=2592000; SameSite=Lax`
    : `${SESSION_HINT_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function persistSessionHint(on: boolean) {
  if (typeof document === 'undefined') return;
  try {
    if (on) localStorage.setItem(SESSION_HINT_KEY, '1');
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    /* ignore */
  }
  writeCookie(on);
  document.documentElement.classList.toggle('has-session', on);
}

export function readSessionHint(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.classList.contains('has-session')) return true;
  try {
    if (localStorage.getItem(SESSION_HINT_KEY) === '1') return true;
  } catch {
    /* ignore */
  }
  return typeof document.cookie === 'string' && document.cookie.includes(`${SESSION_HINT_KEY}=1`);
}
