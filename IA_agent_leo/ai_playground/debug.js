// debug.js — logger semplice + pannello
const KEY = "groq8bit_debug_lines_v1";

function ts(){
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function load(){
    try {
        const raw = localStorage.getItem(KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

function save(lines){
    try { localStorage.setItem(KEY, JSON.stringify(lines.slice(-800))); } catch {}
}

export function createDebug({
                                enabled = true,
                                logEl = null,
                                persist = true,
                                maxLines = 800
                            } = {}){
    let _enabled = !!enabled;
    let _logEl = logEl;
    let lines = persist ? load() : [];

    function redraw(){
        if (!_logEl) return;
        _logEl.value = lines.join("\n");
        _logEl.scrollTop = _logEl.scrollHeight;
    }

    function setEnabled(v){ _enabled = !!v; }
    function setLogEl(el){
        _logEl = el;
        redraw();
    }

    function clear(){
        lines = [];
        if (persist) localStorage.removeItem(KEY);
        if (_logEl) _logEl.value = "";
    }

    function log(msg){
        if (!_enabled) return;
        const line = `[${ts()}] ${msg}`;
        lines.push(line);
        if (lines.length > maxLines) lines = lines.slice(-maxLines);
        if (persist) save(lines);

        if (_logEl){
            _logEl.value += (_logEl.value ? "\n" : "") + line;
            _logEl.scrollTop = _logEl.scrollHeight;
        }
    }

    function getLines(){
        return lines.slice();
    }

    // init
    redraw();

    return { log, clear, setEnabled, setLogEl, getLines };
}