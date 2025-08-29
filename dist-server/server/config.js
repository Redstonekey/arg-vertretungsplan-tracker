// Central config with environment fallbacks to allow long-term operation without code edits.
export const CONFIG = {
    baseUrl: process.env.PLAN_BASE_URL || 'https://arg-heusenstamm.de/vertretungsplan/allgemein/35/w/',
    maxPages: parseInt(process.env.PLAN_MAX_PAGES || '99', 10),
    userAgent: process.env.PLAN_USER_AGENT || 'VertretungsplanTrackerBot/1.0 (+https://example.local)',
    scrapeIntervalHours: parseInt(process.env.SCRAPE_INTERVAL_HOURS || '6', 10), // used by maintenance script
    staleAfterHours: parseInt(process.env.PLAN_STALE_AFTER_HOURS || '24', 10),
    alertToken: process.env.ALERT_TOKEN || ''
};
