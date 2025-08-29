import fetch from 'node-fetch';
const webhook = process.env.DISCORD_WEBHOOK_URL;
function sanitize(val) {
    if (val == null)
        return '';
    if (typeof val === 'string')
        return val.slice(0, 1500);
    try {
        return JSON.stringify(val).slice(0, 1500);
    }
    catch {
        return String(val).slice(0, 1500);
    }
}
export async function sendAlert(message, opts = {}) {
    if (!webhook)
        return; // silently skip if not configured
    const lines = [];
    lines.push(`**${opts.severity?.toUpperCase() || 'INFO'}** ${opts.component ? '[' + opts.component + '] ' : ''}${message}`);
    if (opts.error) {
        const err = opts.error;
        const errMsg = err?.message || String(err);
        lines.push('Error: ' + sanitize(errMsg));
        if (err?.stack)
            lines.push('Stack:```' + String(err.stack).slice(0, 1500) + '```');
        if (err?.code)
            lines.push('Code: ' + err.code);
    }
    if (opts.extra) {
        for (const [k, v] of Object.entries(opts.extra)) {
            lines.push(`${k}: ${sanitize(v)}`);
        }
    }
    const content = lines.join('\n');
    try {
        await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    }
    catch (e) {
        // last resort: log to console; avoid recursive alerting
        console.error('[ALERT SEND FAILED]', e?.message);
    }
}
