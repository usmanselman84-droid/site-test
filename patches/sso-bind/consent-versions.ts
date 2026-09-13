/** Policy version stamps — safe for client and server.
 * Bump PRIVACY_POLICY_VERSION when the privacy text changes — logged-in users
 * must re-accept before using the portal.
 * Bump RULES_POLICY_VERSION when site rules change.
 * Bump INSTRUCTIONS_VERSION when a new profile guide is added — the
 * «инструктаж пройден» badge clears until the user completes all current guides.
 */
export const PRIVACY_POLICY_VERSION = '2026-09-12-bind';
export const COOKIES_POLICY_VERSION = '2026-09-12-bind';
export const RULES_POLICY_VERSION = '2026-09-12-bind';
export const TERMS_POLICY_VERSION = '2026-09-12-bind';

/**
 * Profile instructions pack version.
 * Add a new guide id in profile-guides → bump this string.
 */
export const INSTRUCTIONS_VERSION = '2026-09-12-sso-bind';
