import { env } from '../config/env.js';

export const ACCESS_COOKIE = 'shivaay_access';
export const REFRESH_COOKIE = 'shivaay_refresh';
export const TWO_FA_CHALLENGE_COOKIE = 'shivaay_2fa_challenge';
export const CSRF_COOKIE = 'XSRF-TOKEN';

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/',
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
  };
}

export function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: env.accessTokenTtlMinutes * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

export function clearAuthCookies(res) {
  const opts = baseCookieOptions();
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, { ...opts, path: '/api/auth' });
  res.clearCookie(TWO_FA_CHALLENGE_COOKIE, { ...opts, path: '/api/auth' });
}

export function setTwoFactorChallengeCookie(res, challengeToken) {
  res.cookie(TWO_FA_CHALLENGE_COOKIE, challengeToken, {
    ...baseCookieOptions(),
    maxAge: 5 * 60 * 1000,
    path: '/api/auth',
  });
}

export function clearTwoFactorChallengeCookie(res) {
  res.clearCookie(TWO_FA_CHALLENGE_COOKIE, {
    ...baseCookieOptions(),
    path: '/api/auth',
  });
}
