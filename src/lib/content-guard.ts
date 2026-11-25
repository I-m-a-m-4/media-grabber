export interface GuardResult {
  blocked: boolean;
  reason?: string;
  layer?: 'domain' | 'tld' | 'url_slug' | 'age_limit' | 'html_meta' | 'metadata_keywords';
}

export const BLOCKED_CONTENT_MESSAGE =
  'Adult or age-restricted content is not supported by Media Grabber.';

/**
 * Dedicated adult TLDs (exact TLD match only).
 */
const ADULT_TLDS = new Set(['xxx', 'porn', 'sex', 'adult', 'sexy', 'cam', 'cams']);

/**
 * Curated list of well-known dedicated adult domains.
 * Matched strictly by exact hostname or subdomain (`host === d || host.endsWith('.' + d)`),
 * never substring matching, to avoid false positives on unrelated sites.
 */
const DEDICATED_ADULT_DOMAINS = new Set([
  'pornhub.com',
  'pornhubpremium.com',
  'xvideos.com',
  'xvideos2.com',
  'xvideos3.com',
  'xnxx.com',
  'xnxx2.com',
  'xhamster.com',
  'xhamster2.com',
  'xhamster3.com',
  'xhamster42.desi',
  'redtube.com',
  'youporn.com',
  'tube8.com',
  'spankbang.com',
  'eporner.com',
  'txxx.com',
  'hclips.com',
  'upornia.com',
  'vjav.com',
  'javhd.com',
  'javguru.com',
  'jav.guru',
  'missav.com',
  'missav.ws',
  'nhentai.net',
  'hanime.tv',
  'hentaihaven.xxx',
  'rule34.xxx',
  'rule34video.com',
  'e621.net',
  'chaturbate.com',
  'stripchat.com',
  'bongacams.com',
  'livejasmin.com',
  'myfreecams.com',
  'cam4.com',
  'camsoda.com',
  'onlyfans.com',
  'fansly.com',
  'manyvids.com',
  'clips4sale.com',
  'brazzers.com',
  'bangbros.com',
  'realitykings.com',
  'naughtyamerica.com',
  'mofos.com',
  'evilangel.com',
  'blacked.com',
  'tushy.com',
  'vixen.com',
  'deeper.com',
  'beeg.com',
  'motherless.com',
  'heavy-r.com',
  'daftsex.com',
  'hqporner.com',
  'fuq.com',
  'tnaflix.com',
  'drtuber.com',
  'sunporno.com',
  'porntrex.com',
  'pornone.com',
  'porndoe.com',
  'porn300.com',
  'pornzog.com',
  'pornhd.com',
  'gotporn.com',
  'thumbzilla.com',
  'nuvid.com',
  'keezmovies.com',
  'extremetube.com',
  'spankwire.com',
  '4tube.com',
  'fapello.com',
  'coomer.su',
  'coomer.party',
  'kemono.su',
  'erome.com',
  'redgifs.com',
  'scrolller.com',
  'literotica.com',
  'chaturbate.eu',
  'sex.com',
  'porn.com',
  'xxx.com',
]);

/**
 * Unambiguous explicit terms (weight 3 each).
 * Matched with strict word boundaries (\b) so substrings inside normal words never trigger.
 */
const HIGH_CONFIDENCE_EXPLICIT_PATTERNS: RegExp[] = [
  /\bpornhub\b/i,
  /\bxvideos\b/i,
  /\bxnxx\b/i,
  /\bxhamster\b/i,
  /\bredtube\b/i,
  /\byouporn\b/i,
  /\bspankbang\b/i,
  /\bporno(?:graphy)?\b/i,
  /\bporn\b/i,
  /\bhardcore\s+sex\b/i,
  /\bsex\s+tape\b/i,
  /\bhentai\b/i,
  /\bbukkake\b/i,
  /\bcreampie\b/i,
  /\bgangbang\b/i,
  /\bdeepthroat\b/i,
  /\bblowjob\b/i,
  /\bhandjob\b/i,
  /\bfootjob\b/i,
  /\bcumshot\b/i,
  /\bpaizuri\b/i,
  /\bahegao\b/i,
  /\bfutanari\b/i,
  /\bmilf\b/i,
  /\bbbc\s+(?:porn|sex|fuck)\b/i,
  /\bfucking\b/i,
  /\bthreesome\s+(?:sex|porn|video)\b/i,
  /\banal\s+(?:sex|porn|fuck)\b/i,
  /\boral\s+sex\b/i,
  /\bmasturbat(?:ion|ing|e)\b/i,
  /\bdildo\b/i,
  /\bcamgirl\b/i,
  /\bstripchat\b/i,
  /\bchaturbate\b/i,
];

/**
 * Contextual adult signals (weight 2 each).
 * A single match (score 2) will NOT block on its own (threshold is 3),
 * preventing false positives on news, health, or educational content.
 */
const MEDIUM_CONFIDENCE_ADULT_PATTERNS: RegExp[] = [
  /\bnsfw\b/i,
  /\bxxx\b/i,
  /\bonlyfans\b/i,
  /\bfansly\b/i,
  /\b18\+\b/i,
  /\badult\s+video\b/i,
  /\berotic(?:a)?\b/i,
  /\bnude(?:s)?\b/i,
  /\bnaked\b/i,
  /\buncensored\b/i,
  /\blewd\b/i,
  /\brule34\b/i,
  /\bjav\b/i,
  /\bsoftcore\b/i,
  /\bhardcore\b/i,
];

function isGuardEnabled(): boolean {
  return process.env.ENABLE_ADULT_GUARD !== 'false';
}

function getExtraBlockedDomains(): string[] {
  const raw = process.env.BLOCKED_ADULT_DOMAINS || '';
  if (!raw.trim()) return [];
  return raw
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^www\./, ''))
    .filter(Boolean);
}

/**
 * Layer 1: Instant Domain, TLD & URL Slug Filter (Pre-Fetch, 0 ms).
 */
export function checkUrlSafety(rawUrl?: string | null): GuardResult {
  if (!isGuardEnabled() || !rawUrl) return { blocked: false };

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl);
  } catch {
    return { blocked: false };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (!host) return { blocked: false };

  // 1. Adult TLD check
  const parts = host.split('.');
  const tld = parts[parts.length - 1];
  if (ADULT_TLDS.has(tld)) {
    return { blocked: true, reason: BLOCKED_CONTENT_MESSAGE, layer: 'tld' };
  }

  // 2. Dedicated adult domain check (exact or subdomain)
  for (const domain of DEDICATED_ADULT_DOMAINS) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return { blocked: true, reason: BLOCKED_CONTENT_MESSAGE, layer: 'domain' };
    }
  }
  for (const domain of getExtraBlockedDomains()) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return { blocked: true, reason: BLOCKED_CONTENT_MESSAGE, layer: 'domain' };
    }
  }

  // 3. Explicit URL path/slug check (replace separators with spaces for word-boundary matching)
  const decodedPath = (() => {
    try {
      return decodeURIComponent(`${parsed.pathname} ${parsed.search}`).replace(/[-_/+]+/g, ' ');
    } catch {
      return `${parsed.pathname} ${parsed.search}`.replace(/[-_/+]+/g, ' ');
    }
  })();

  let slugScore = 0;
  for (const re of HIGH_CONFIDENCE_EXPLICIT_PATTERNS) {
    if (re.test(decodedPath)) {
      slugScore += 3;
      if (slugScore >= 3) {
        return { blocked: true, reason: BLOCKED_CONTENT_MESSAGE, layer: 'url_slug' };
      }
    }
  }
  for (const re of MEDIUM_CONFIDENCE_ADULT_PATTERNS) {
    if (re.test(decodedPath)) {
      slugScore += 2;
      if (slugScore >= 4) {
        return { blocked: true, reason: BLOCKED_CONTENT_MESSAGE, layer: 'url_slug' };
      }
    }
  }

  return { blocked: false };
}

/**
 * Convenience helper to check multiple URLs (e.g. pageUrl + directUrl).
 */
export function checkUrlsSafety(...urls: Array<string | null | undefined>): GuardResult {
  for (const u of urls) {
    const res = checkUrlSafety(u);
    if (res.blocked) return res;
  }
  return { blocked: false };
}

/**
 * Checks raw HTML <meta> tags for standard adult/RTA rating labels.
 */
function hasAdultHtmlMeta(html: string): boolean {
  if (!html) return false;
  // Only inspect <head> (or first 25KB) for fast, low-cost meta scanning
  const headSlice = html.slice(0, 25000);

  // RTA (Restricted To Adults) industry standard label
  if (/RTA-5042-1996-1400-1577-RTA/i.test(headSlice)) {
    return true;
  }

  // <meta name="rating" content="adult" | "mature" | "restricted">
  if (
    /<meta[^>]+name=["']rating["'][^>]+content=["'][^"']*(?:adult|mature|rta-5042|18\+)[^"']*["']/i.test(
      headSlice
    ) ||
    /<meta[^>]+content=["'][^"']*(?:adult|mature|rta-5042|18\+)[^"']*["'][^>]+name=["']rating["']/i.test(
      headSlice
    )
  ) {
    return true;
  }

  // <meta property="og:restrictions:age" content="18+">
  if (
    /<meta[^>]+(?:property|name)=["']og:restrictions:age["'][^>]+content=["'](?:18|21)\+?["']/i.test(
      headSlice
    ) ||
    /<meta[^>]+content=["'](?:18|21)\+?["'][^>]+(?:property|name)=["']og:restrictions:age["']/i.test(
      headSlice
    )
  ) {
    return true;
  }

  return false;
}

export interface MetadataSafetyInput {
  url?: string;
  title?: string;
  description?: string;
  uploader?: string;
  tags?: string[];
  ageLimit?: number | null;
  html?: string;
}

/**
 * Layer 2: Metadata, yt-dlp age_limit & HTML RTA Tag Check.
 * Catches adult content hosted on general platforms (VK, Reddit, X, blogs, etc.)
 * without blocking the entire platform.
 */
export function checkMetadataSafety(input: MetadataSafetyInput): GuardResult {
  if (!isGuardEnabled()) return { blocked: false };

  // 1. yt-dlp age_limit >= 18
  if (typeof input.ageLimit === 'number' && input.ageLimit >= 18) {
    return { blocked: true, reason: BLOCKED_CONTENT_MESSAGE, layer: 'age_limit' };
  }

  // 2. HTML RTA / adult meta tags
  if (input.html && hasAdultHtmlMeta(input.html)) {
    return { blocked: true, reason: BLOCKED_CONTENT_MESSAGE, layer: 'html_meta' };
  }

  // 3. Weighted keyword scoring across title, description, tags, uploader
  const combinedText = [
    input.title || '',
    input.description || '',
    input.uploader || '',
    Array.isArray(input.tags) ? input.tags.join(' ') : '',
  ]
    .join(' ')
    .trim();

  if (!combinedText) return { blocked: false };

  let score = 0;
  for (const re of HIGH_CONFIDENCE_EXPLICIT_PATTERNS) {
    if (re.test(combinedText)) {
      score += 3;
      if (score >= 3) {
        return { blocked: true, reason: BLOCKED_CONTENT_MESSAGE, layer: 'metadata_keywords' };
      }
    }
  }

  for (const re of MEDIUM_CONFIDENCE_ADULT_PATTERNS) {
    if (re.test(combinedText)) {
      score += 2;
      if (score >= 4) {
        return { blocked: true, reason: BLOCKED_CONTENT_MESSAGE, layer: 'metadata_keywords' };
      }
    }
  }

  return { blocked: false };
}

