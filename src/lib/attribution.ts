// Where the visitor came from: the landing's utm marks, ad click ids, the landing's language and
// the referring host. Read from the URL on the first screen, kept in localStorage for 30 days (as
// the landing does in its `lib/analytics.ts`) and sent with the registration as `attribution`
// (api-server, table `user_attributions`). New marks replace the saved ones: the visit that
// brought the person back counts. Without any marks nothing is sent and the server records
// `direct`; a referrer alone is sent — the server still records `direct`, but keeps the host.

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const CLICK_IDS = ["gclid", "yclid"] as const;
const STORAGE_KEY = "yl_attribution";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_LEN = 128;

/** The server's `attribution` object (api-server `AttributionRequest`). */
export interface Attribution {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  gclid?: string;
  yclid?: string;
  referrer?: string;
  landing_lang?: string;
}

interface Saved {
  t: number;
  a: Attribution;
}

function clean(v: string | null): string | undefined {
  const s = (v ?? "").trim().slice(0, MAX_LEN);
  return s || undefined;
}

/** The marks of a URL: utm_* under the server's names, click ids, `?lang=` as the landing's language. */
export function readMarks(search: string): Attribution {
  const q = new URLSearchParams(search);
  const out: Attribution = {};
  for (const k of UTM_KEYS) {
    const v = clean(q.get(k));
    if (v) out[k.slice(4) as keyof Attribution] = v;
  }
  for (const k of CLICK_IDS) {
    const v = clean(q.get(k));
    if (v) out[k] = v;
  }
  const lang = clean(q.get("lang"));
  if (lang && /^(ru|uz|en)$/.test(lang)) out.landing_lang = lang;
  return out;
}

/** The host the document came from, when it is another site. */
export function externalReferrerHost(referrer: string, ownHost: string): string | undefined {
  if (!referrer) return undefined;
  try {
    const host = new URL(referrer).host;
    return host && host !== ownHost ? host.slice(0, MAX_LEN) : undefined;
  } catch {
    return undefined;
  }
}

function load(): Attribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    if (!saved || typeof saved.t !== "number" || Date.now() - saved.t > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return saved.a ?? null;
  } catch {
    return null;
  }
}

function save(a: Attribution) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ t: Date.now(), a } satisfies Saved));
  } catch {
    // Private mode or storage disabled: the marks live for this page only.
  }
}

const hasMarks = (a: Attribution) =>
  Boolean(a.source || a.medium || a.campaign || a.content || a.term || a.gclid || a.yclid);

/**
 * Called once on the first screen. Marks in the URL (with the referrer and `?lang=` of that
 * visit) replace whatever was saved. Without marks: nothing saved yet → the referrer and language
 * are remembered, and a visitor landing on a driver's invite page is `source=invite` (the
 * owner's decision: drivers who came by an invite link are told apart from `direct`).
 */
export function captureAttribution(
  pathname = location.pathname,
  search = location.search,
  referrer = document.referrer,
  ownHost = location.host,
) {
  const fresh = readMarks(search);
  const ref = externalReferrerHost(referrer, ownHost);
  if (hasMarks(fresh)) {
    save({ ...fresh, ...(ref ? { referrer: ref } : {}) });
    return;
  }
  if (load()) return;
  const a: Attribution = { ...fresh };
  if (ref) a.referrer = ref;
  if (/^\/invite\/[^/]+/.test(pathname)) a.source = "invite";
  if (Object.keys(a).length) save(a);
}

/** The saved attribution for the registration request, or undefined when there is nothing to send. */
export function currentAttribution(): Attribution | undefined {
  const a = load();
  return a && Object.keys(a).length ? a : undefined;
}

/** After a successful sign-up: the next account from this browser starts clean. */
export function clearAttribution() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
