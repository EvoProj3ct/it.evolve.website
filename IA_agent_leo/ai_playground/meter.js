// meter.js — tracking rate-limits + usage giornaliero (localStorage)
// Nota: Groq headers (RPD + TPM) sono affidabili; TPD non arriva in header -> stimato via budget configurabile.

const LEDGER_KEY = "groq8bit_usage_ledger_v1";

function todayKey(){
    const d = new Date();
    // locale-independent YYYY-MM-DD
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    return `${yyyy}-${mm}-${dd}`;
}

export function extractRateLimitFromHeaders(headers){
    // headers: instance of Headers
    const getNum = (k) => {
        const v = headers.get(k);
        if (!v) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };
    const getStr = (k) => headers.get(k) || null;

    return {
        retryAfterSec: getNum("retry-after"),
        // Groq doc: these meanings are fixed:
        // - limit/remaining-requests => RPD
        // - limit/remaining-tokens   => TPM
        limitRequests: getNum("x-ratelimit-limit-requests"),
        remainingRequests: getNum("x-ratelimit-remaining-requests"),
        resetRequests: getStr("x-ratelimit-reset-requests"),

        limitTokens: getNum("x-ratelimit-limit-tokens"),
        remainingTokens: getNum("x-ratelimit-remaining-tokens"),
        resetTokens: getStr("x-ratelimit-reset-tokens"),
    };
}

export function formatRateLimitLine(rl){
    if (!rl) return "";

    const parts = [];

    if (rl.limitRequests != null && rl.remainingRequests != null){
        const used = rl.limitRequests - rl.remainingRequests;
        const pct = rl.limitRequests > 0 ? (used / rl.limitRequests) * 100 : 0;
        parts.push(`RPD ${pct.toFixed(1)}% (rem ${rl.remainingRequests}/${rl.limitRequests}, reset ${rl.resetRequests || "?"})`);
    }

    if (rl.limitTokens != null && rl.remainingTokens != null){
        const used = rl.limitTokens - rl.remainingTokens;
        const pct = rl.limitTokens > 0 ? (used / rl.limitTokens) * 100 : 0;
        parts.push(`TPM ${pct.toFixed(1)}% (rem ${rl.remainingTokens}/${rl.limitTokens}, reset ${rl.resetTokens || "?"})`);
    }

    if (rl.retryAfterSec != null){
        parts.push(`retry-after ${rl.retryAfterSec}s`);
    }

    return parts.join(" | ");
}

function loadLedger(){
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return {};
    try { return JSON.parse(raw) || {}; } catch { return {}; }
}

function saveLedger(obj){
    localStorage.setItem(LEDGER_KEY, JSON.stringify(obj));
}

export function resetLedger(){
    localStorage.removeItem(LEDGER_KEY);
}

export function getUsageLedger(){
    return loadLedger();
}

// usage: {prompt_tokens, completion_tokens, total_tokens} (OpenAI-style-ish)
export function recordUsage({ model, stage, usage, rateLimit, budgets }){
    const day = todayKey();
    const ledger = loadLedger();
    if (!ledger[day]) ledger[day] = { byModel: {}, total: { tokens: 0, calls: 0 } };

    if (!ledger[day].byModel[model]){
        ledger[day].byModel[model] = {
            tokens: 0,
            calls: 0,
            byStage: {},
            lastRateLimitLine: ""
        };
    }

    const m = ledger[day].byModel[model];
    m.calls += 1;
    ledger[day].total.calls += 1;

    const tok = Number(usage?.total_tokens || 0);
    if (tok > 0){
        m.tokens += tok;
        ledger[day].total.tokens += tok;

        if (!m.byStage[stage]) m.byStage[stage] = { calls: 0, tokens: 0 };
        m.byStage[stage].calls += 1;
        m.byStage[stage].tokens += tok;
    } else {
        if (!m.byStage[stage]) m.byStage[stage] = { calls: 0, tokens: 0 };
        m.byStage[stage].calls += 1;
    }

    const rlLine = formatRateLimitLine(rateLimit);
    if (rlLine) m.lastRateLimitLine = rlLine;

    saveLedger(ledger);

    // opzionale: percentuale “TPD stimata” se hai un budget
    const tpdBudget = budgets?.[model]?.tpd ?? null;
    const tpdPct = (tpdBudget && tpdBudget > 0) ? (m.tokens / tpdBudget) * 100 : null;

    const line = [
        `calls today=${m.calls}`,
        `tokens today=${m.tokens}`,
        rlLine ? `| ${rlLine}` : "",
        (tpdPct != null) ? `| TPD~ ${tpdPct.toFixed(1)}% (budget ${tpdBudget})` : ""
    ].filter(Boolean).join(" ");

    return {
        day,
        model,
        stage,
        todayModelTokens: m.tokens,
        todayModelCalls: m.calls,
        tpdBudget,
        tpdPct,
        rateLimitLine: rlLine,
        line
    };
}