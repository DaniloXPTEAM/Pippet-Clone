// Reconstrucao do cliente de page view observado (771.5a26a240f4.js, RuntimeUserTrackingClient.reportPageView).
// Fonte: TELEMETRY_SPEC.md. Nao inventa nada alem do observado; erros sao engolidos como no original.
const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/\.$/, ''); } catch { return ''; } };

// variant 'cms_consumer' (observado na pagina /tools/video-agent; main.e32a6083.js handleReportPv): NAO envia user_agent;
// sessao inicia se primeira visita ou se document.referrer nao contem o hostname. variant 'landing' (771.js): envia user_agent.
export function buildPageViewUrl({ reportHost, webId, isFirstVisitPage, isSessionStartPage, referrer, userAgent, locale, channel, hostname, variant = 'cms_consumer' }) {
  if (!reportHost || !webId) return null;
  const a = isFirstVisitPage === true || isFirstVisitPage === '1';
  const s = typeof isSessionStartPage === 'boolean' ? isSessionStartPage
    : variant === 'cms_consumer' ? a || !(referrer ?? '').includes(hostname ?? '')
    : a || hostOf(referrer) !== (hostname || '').toLowerCase().replace(/\.$/, '');
  const c = new URL(`${reportHost}/lv/v1/event/report`);
  const p = c.searchParams;
  p.append('is_pwa', '0'); p.append('pwa_from', 'not_pwa'); p.append('open_from_pwa', '0'); p.append('web_id', webId);
  p.append('event_name', 'user_page_view'); p.append('os_name', 'unknown'); p.append('app_version', '');
  p.append('is_first_visit_page', a ? '1' : '0'); p.append('is_session_start_page', s ? '1' : '0');
  p.append('browser', ''); p.append('referrer', referrer ?? '');
  if (variant === 'landing') p.append('user_agent', userAgent ?? '');
  p.append('branch', 'master');
  if (locale) p.append(locale.name, locale.value);
  const { session_start_url: l, channel_from: f, ...rest } = channel || {};
  if (l || f) p.append('custom', JSON.stringify({ session_start_url: l, channel_from: f }));
  p.append('seo_info', JSON.stringify(rest));
  return c.toString();
}

// transport original: fetch(url, { referrerPolicy: 'unsafe-url', credentials: 'include' }); ignorado para bots; erros engolidos.
export async function reportPageView(input, { fetchImpl = globalThis.fetch, isSpider = false } = {}) {
  try {
    if (isSpider) return;
    const url = buildPageViewUrl(input);
    if (!url) return;
    await fetchImpl(url, { referrerPolicy: 'unsafe-url', credentials: 'include' });
  } catch { /* original: catch {} */ }
}
