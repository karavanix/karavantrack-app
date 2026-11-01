// Counters and goals of the cabinet. Yandex Metrika and GA4 are the landing's counters
// (one counter on yool.live and app.yool.live glues the visit: ad → landing → sign-up).
// They load only when the ids are set at build time (VITE_YM_ID / VITE_GA4_ID — GitHub
// variables → build-args → Dockerfile ARG/ENV); without them nothing loads and `track()` is a no-op.
//
// Privacy: the cabinet shows drivers' names and phones, addresses and loads, so Webvisor and the
// click map are off here (the landing keeps them — the init options are per page). The counters
// never get a URL with a token in it: all hits are sent by us (`defer: true`, `send_page_view:
// false`) through `pageView()` with the URL cleaned by `publicPath()`.
//
// Goal names match the landing's `lib/analytics.ts` and the owner's list in
// karavantrack-landing/docs/promotion/tasks.md (task 4): JavaScript-event goals in Metrika,
// events with the same names in GA4.

export const YM_ID = import.meta.env.VITE_YM_ID || "";
export const GA4_ID = import.meta.env.VITE_GA4_ID || "";

export const GOALS = [
  "sign_up_start",
  "sign_up",
  "company_created",
  "load_created",
  "driver_invited",
  "tracking_link_created",
  "login",
  "password_reset",
] as const;
export type Goal = (typeof GOALS)[number];

type YmFn = ((...args: unknown[]) => void) & { a?: unknown[]; l?: number };

declare global {
  interface Window {
    ym?: YmFn;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Defines the queueing stubs exactly as the official snippets do, so calls made before the tags
 * load are replayed by them. Idempotent; React strict mode calls effects twice.
 */
export function initCounters() {
  if (typeof window === "undefined") return;
  if (YM_ID && !window.ym) {
    const ym: YmFn = (...args) => {
      (ym.a = ym.a || []).push(args);
    };
    ym.l = Date.now();
    window.ym = ym;
    ym(Number(YM_ID), "init", {
      // No automatic first hit: it would carry location.href, tokens included. See pageView().
      defer: true,
      webvisor: false,
      clickmap: false,
      trackLinks: false,
      accurateTrackBounce: true,
    });
  }
  if (GA4_ID && !window.gtag) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // GA reads `arguments`, not a spread array.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA4_ID, { send_page_view: false });
  }
}

/** Inserts the counters' scripts; called after `load` so they do not compete with the first screen. */
export function loadCounterScripts() {
  if (typeof document === "undefined") return;
  initCounters();
  const add = (src: string) => {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  };
  if (YM_ID) add(`https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}`);
  if (GA4_ID) add(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`);
}

/**
 * The URL the counters may see. Tokens of the public pages are replaced by the literal `:token`
 * (a tracking token is access to a load's track, an invite token is access to a load), the
 * Telegram callback loses its query (the OAuth code). The query is kept elsewhere: the utm marks
 * in it are how the counters attribute the visit to a campaign.
 */
export function publicPath(pathname: string, search: string): string {
  const path = pathname.replace(/^\/(track|invite)\/[^/]+/, "/$1/:token");
  if (path.startsWith("/auth/telegram/callback")) return path;
  return path + search;
}

let lastHit: string | null = null;

/** Reports a page view (one per route change) to both counters with the cleaned URL. */
export function pageView(pathname: string, search: string) {
  if (typeof window === "undefined") return;
  const path = publicPath(pathname, search);
  const url = `${location.origin}${path}`;
  const referer = lastHit;
  lastHit = url;
  initCounters();
  if (YM_ID) {
    window.ym?.(Number(YM_ID), "hit", url, {
      title: document.title,
      ...(referer || document.referrer ? { referer: referer ?? document.referrer } : {}),
    });
  }
  if (GA4_ID) {
    // `set` makes the cleaned location stick to the goal events that follow, too.
    window.gtag?.("set", { page_location: url });
    window.gtag?.("event", "page_view", {
      page_location: url,
      page_title: document.title,
      ...(referer ? { page_referrer: referer } : {}),
    });
  }
}

/** Reports a goal to both counters (whichever are configured). */
export function track(goal: Goal, params?: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  initCounters();
  if (YM_ID) window.ym?.(Number(YM_ID), "reachGoal", goal, params);
  if (GA4_ID) window.gtag?.("event", goal, params);
}
