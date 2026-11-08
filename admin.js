/* ==========================================================================
   Availability editor (admin.html)
   Reads and writes availability.json in the GitHub repository through
   GitHub's API. The access token never leaves this browser. No database:
   the repository file is the data, and every change is kept in its history.
   ========================================================================== */
(function () {
    "use strict";

    const $ = (selector, scope = document) => scope.querySelector(selector);
    const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
    const pad = (n) => String(n).padStart(2, "0");

    const FILE = "availability.json";
    const STORE = "availability-admin";
    const MONTHS_AHEAD = 12;
    const API = "https://api.github.com";
    const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
    const DEFAULT_HOWTO = "Add one line per day you are free. Format: \"YYYY-MM-DD\": [\"10:00-12:00\", \"14:00-15:30\"]. Each range is split into slots (see slotMinutes). When someone books a time, delete it from this file. Easier: use admin.html to edit this file.";

    const els = {
        connectCard: $("#connect-card"), token: $("#token"), repo: $("#repo"), remember: $("#remember"),
        btnConnect: $("#btn-connect"), btnLocal: $("#btn-local"), connectStatus: $("#connect-status"),
        connectedBar: $("#connected-bar"), connectedText: $("#connected-text"), btnDisconnect: $("#btn-disconnect"),
        editor: $("#editor"), grid: $("[data-a-grid]"), title: $("[data-a-title]"),
        prev: $("[data-a-prev]"), next: $("[data-a-next]"),
        selTitle: $("#sel-title"), selSub: $("#sel-sub"), rangeList: $("#range-list"),
        from: $("#t-from"), to: $("#t-to"), opStatus: $("#op-status"),
        fFrom: $("#f-from"), fTo: $("#f-to"), btnFill: $("#btn-fill"),
        saveBar: $("#savebar"), dirty: $("#dirty-text"), prune: $("#prune"),
        btnPublish: $("#btn-publish"), saveStatus: $("#save-status"),
    };

    const state = {
        token: "", repo: "", branch: "", sha: null, connected: false,
        meta: { _how_to_update: DEFAULT_HOWTO, timezone: "America/Toronto", slotMinutes: 30, minNoticeHours: 12 },
        avail: {},                 // "YYYY-MM-DD" -> [[startMin, endMin], ...]
        baseline: "",              // serialized text of what is currently published
        view: null,
        selected: new Set(),
        anchor: null,
    };

    const icon = (id) => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;

    /* ---- Small helpers ---------------------------------------------------- */
    function setStatus(node, message, kind) {
        node.textContent = message || "";
        node.className = "a-status" + (kind ? ` is-${kind}` : "");
    }

    function toMin(text) {
        const m = /^(\d{1,2}):(\d{2})$/.exec(String(text).trim());
        if (!m || +m[2] > 59) return NaN;
        return +m[1] * 60 + +m[2];
    }
    const fmt = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;       // 1440 -> "24:00"
    function label(min) {
        if (min >= 1440) return "Midnight";
        const h = Math.floor(min / 60);
        return `${h % 12 || 12}:${pad(min % 60)} ${h >= 12 ? "PM" : "AM"}`;
    }

    function parseEntry(entry, slot) {
        const text = String(entry).trim();
        const range = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(text);
        if (range) {
            const a = toMin(range[1]), b = toMin(range[2]);
            return a >= 0 && b <= 1440 && a < b ? [a, b] : null;
        }
        const one = toMin(text);
        return one >= 0 && one < 1440 ? [one, Math.min(1440, one + slot)] : null;
    }

    function mergeRanges(list) {
        const sorted = list.filter((r) => r[0] < r[1]).map((r) => [r[0], r[1]]).sort((a, b) => a[0] - b[0]);
        const out = [];
        for (const r of sorted) {
            const last = out[out.length - 1];
            if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
            else out.push(r);
        }
        return out;
    }

    function subtractRange(list, [start, end]) {
        const out = [];
        for (const [a, b] of list) {
            if (end <= a || start >= b) { out.push([a, b]); continue; }
            if (a < start) out.push([a, start]);
            if (end < b) out.push([end, b]);
        }
        return out;
    }

    /* ---- Dates (plain calendar maths, no time zones involved) ------------ */
    const utc = (key) => { const [y, m, d] = key.split("-").map(Number); return Date.UTC(y, m - 1, d); };
    const keyFromUtc = (ms) => new Date(ms).toISOString().slice(0, 10);
    const addDays = (key, n) => keyFromUtc(utc(key) + n * 864e5);
    const weekday = (key) => new Date(utc(key)).getUTCDay();
    const longDay = (key) => new Date(utc(key)).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
    const shortDay = (key) => new Date(utc(key)).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

    function todayKey() {
        try {
            return new Intl.DateTimeFormat("en-CA", { timeZone: state.meta.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
        } catch (e) {
            const d = new Date();
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        }
    }

    /* ---- Reading and writing the JSON ------------------------------------ */
    function loadText(text) {
        let data;
        try { data = JSON.parse(text); } catch (e) { throw new Error("availability.json is not valid JSON. Fix it on GitHub first."); }
        const slot = Number(data.slotMinutes) > 0 ? Number(data.slotMinutes) : 30;
        state.meta = {
            _how_to_update: typeof data._how_to_update === "string" ? data._how_to_update : DEFAULT_HOWTO,
            timezone: typeof data.timezone === "string" ? data.timezone : "America/Toronto",
            slotMinutes: slot,
            minNoticeHours: Number.isFinite(Number(data.minNoticeHours)) ? Number(data.minNoticeHours) : 12,
        };
        state.avail = {};
        let skipped = 0;
        Object.entries(data.availability || {}).forEach(([key, entries]) => {
            if (!DAY_KEY.test(key) || !Array.isArray(entries)) { skipped++; return; }
            const ranges = [];
            entries.forEach((entry) => {
                const r = parseEntry(entry, slot);
                if (r) ranges.push(r); else skipped++;
            });
            const merged = mergeRanges(ranges);
            if (merged.length) state.avail[key] = merged;
        });
        return skipped;
    }

    function serialize() {
        const today = todayKey();
        const keep = Object.keys(state.avail)
            .filter((key) => state.avail[key].length && (!els.prune.checked || key >= today))
            .sort();
        const lines = keep.map((key) => `    "${key}": [${state.avail[key].map(([a, b]) => `"${fmt(a)}-${fmt(b)}"`).join(", ")}]`);
        const m = state.meta;
        return `{\n  "_how_to_update": ${JSON.stringify(m._how_to_update)},\n  "timezone": ${JSON.stringify(m.timezone)},\n  "slotMinutes": ${m.slotMinutes},\n  "minNoticeHours": ${m.minNoticeHours},\n  "availability": {\n${lines.join(",\n")}${lines.length ? "\n" : ""}  }\n}\n`;
    }

    const b64 = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));
    const unb64 = (data) => new TextDecoder().decode(Uint8Array.from(atob(String(data).replace(/\s/g, "")), (c) => c.charCodeAt(0)));

    /* ---- GitHub API ---------------------------------------------------------- */
    async function gh(path, options = {}) {
        const response = await fetch(API + path, {
            ...options,
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${state.token}`,
                "X-GitHub-Api-Version": "2022-11-28",
                ...(options.body ? { "Content-Type": "application/json" } : {}),
            },
        });
        let data = null;
        try { data = await response.json(); } catch (e) { /* empty body */ }
        return { ok: response.ok, status: response.status, data };
    }

    function explain(result, doing) {
        const s = result.status;
        if (s === 401) return "GitHub did not accept this token. It may be mistyped or expired. Create a new one and try again.";
        if (s === 403 || s === 404) return `${doing} failed. Check the repository name, and that the token has Contents: Read and write for it.`;
        if (s === 409 || s === 422) return "The file changed on GitHub since you loaded it. Press Connect and load again, then redo your edit.";
        return `${doing} failed (${s || "no connection"}). ${(result.data && result.data.message) || "Check your internet connection and try again."}`;
    }

    /* ---- Connect ----------------------------------------------------------------- */
    function remember() {
        try {
            if (els.remember.checked) localStorage.setItem(STORE, JSON.stringify({ token: state.token, repo: state.repo }));
            else localStorage.removeItem(STORE);
        } catch (e) { /* storage blocked: fine */ }
    }

    async function connect() {
        state.token = els.token.value.trim();
        state.repo = els.repo.value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
        if (!state.token) return setStatus(els.connectStatus, "Paste your GitHub token first, or use “Edit without a token”.", "error");
        if (!/^[\w.-]+\/[\w.-]+$/.test(state.repo)) return setStatus(els.connectStatus, "The repository should look like owner/name.", "error");

        els.btnConnect.disabled = true;
        setStatus(els.connectStatus, "Connecting to GitHub…");
        try {
            const repo = await gh(`/repos/${state.repo}`);
            if (!repo.ok) return setStatus(els.connectStatus, explain(repo, "Connecting"), "error");
            state.branch = repo.data.default_branch || "main";

            const file = await gh(`/repos/${state.repo}/contents/${FILE}?ref=${encodeURIComponent(state.branch)}`);
            let skipped = 0, notice = "";
            if (file.ok) {
                state.sha = file.data.sha;
                skipped = loadText(unb64(file.data.content));
            } else if (file.status === 404) {
                state.sha = null;
                loadText("{}");
                notice = "availability.json does not exist yet. It will be created when you publish.";
            } else {
                return setStatus(els.connectStatus, explain(file, "Loading the file"), "error");
            }

            state.connected = true;
            remember();
            els.connectedText.innerHTML = `${icon("i-check")} Connected to <strong>${state.repo}</strong> (${state.branch})`;
            start(skipped ? `${skipped} entries in the file could not be read and were skipped.` : notice);
        } catch (error) {
            setStatus(els.connectStatus, "Could not reach GitHub. Check your internet connection.", "error");
        } finally {
            els.btnConnect.disabled = false;
        }
    }

    async function connectLocal() {
        setStatus(els.connectStatus, "Loading the live file…");
        state.connected = false; state.sha = null; state.token = "";
        let skipped = 0, notice = "";
        try {
            const response = await fetch(`${FILE}?t=${Date.now()}`, { cache: "no-store" });
            if (!response.ok) throw new Error(String(response.status));
            skipped = loadText(await response.text());
        } catch (error) {
            loadText("{}");
            notice = "Could not load the live file, so you are starting from an empty calendar.";
        }
        els.connectedText.innerHTML = `${icon("i-pen")} Editing without a token. Use <strong>Download file</strong> to save your changes.`;
        start(skipped ? `${skipped} entries in the file could not be read and were skipped.` : notice);
    }

    function disconnect() {
        try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
        Object.assign(state, { token: "", connected: false, sha: null, selected: new Set(), anchor: null });
        els.token.value = "";
        els.connectCard.hidden = false;
        els.connectedBar.hidden = els.editor.hidden = els.saveBar.hidden = true;
        setStatus(els.connectStatus, "Disconnected. The token was removed from this browser.", "ok");
    }

    function start(message) {
        const today = todayKey();
        state.view = { y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 };
        state.selected = new Set();
        state.anchor = null;
        els.fFrom.value = today;
        els.fTo.value = addDays(today, 13);
        els.fFrom.min = els.fTo.min = today;
        state.baseline = serialize();

        els.connectCard.hidden = true;
        els.connectedBar.hidden = els.editor.hidden = els.saveBar.hidden = false;
        setStatus(els.connectStatus, "");
        setStatus(els.saveStatus, message || "", message ? "warn" : "");
        renderGrid(0, true);
        updatePanel();
        updateDirty();
    }

    /* ---- Calendar ------------------------------------------------------------------ */
    function minIndex() {
        const today = todayKey();
        return +today.slice(0, 4) * 12 + +today.slice(5, 7) - 1;
    }

    function renderGrid(direction = 0, animate = false) {
        const { y, m } = state.view;
        const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
        const total = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        const today = todayKey();

        let html = "";
        for (let i = 0; i < first; i++) html += '<span class="cal-day is-blank" aria-hidden="true"></span>';
        for (let d = 1; d <= total; d++) {
            const key = `${y}-${pad(m + 1)}-${pad(d)}`;
            const ranges = state.avail[key];
            const past = key < today;
            const selected = state.selected.has(key);
            const classes = ["cal-day"];
            if (ranges && !past) classes.push("is-free");
            if (key === today) classes.push("is-today");
            if (selected) classes.push("is-selected");

            let bars = "";
            if (ranges && !past) {
                const hours = ranges.reduce((sum, [a, b]) => sum + (b - a), 0) / 60;
                bars = `<span class="bars" aria-hidden="true">${"<i></i>".repeat(hours < 3 ? 1 : hours < 6 ? 2 : 3)}</span>`;
            }
            const description = ranges && !past
                ? ranges.map(([a, b]) => `${label(a)} to ${label(b)}`).join(", ")
                : (past ? "past" : "no times");
            html += `<button type="button" class="${classes.join(" ")}" data-day="${key}" style="--i:${first + d}" aria-pressed="${selected}" ` +
                `aria-label="${longDay(key)}: ${description}"${past ? " disabled" : ""}><span>${d}</span>${bars}</button>`;
        }

        els.grid.style.setProperty("--dir", direction);
        els.grid.classList.toggle("no-anim", !animate);
        els.grid.innerHTML = html;
        els.title.innerHTML = `<span>${new Date(Date.UTC(y, m, 1)).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" })}</span>`;

        const index = y * 12 + m;
        els.prev.disabled = index <= minIndex();
        els.next.disabled = index >= minIndex() + MONTHS_AHEAD;
    }

    function shiftMonth(delta) {
        const index = state.view.y * 12 + state.view.m + delta;
        if (index < minIndex() || index > minIndex() + MONTHS_AHEAD) return;
        state.view = { y: Math.floor(index / 12), m: index % 12 };
        renderGrid(delta, true);
    }

    function daysInView() {
        const { y, m } = state.view;
        const total = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        const today = todayKey();
        return Array.from({ length: total }, (_, i) => `${y}-${pad(m + 1)}-${pad(i + 1)}`).filter((key) => key >= today);
    }

    function onDayClick(event) {
        const button = event.target.closest(".cal-day[data-day]");
        if (!button || button.disabled) return;
        const key = button.dataset.day;

        if (event.shiftKey && state.anchor) {
            const [a, b] = [state.anchor, key].sort();
            for (let k = a; k <= b; k = addDays(k, 1)) if (k >= todayKey()) state.selected.add(k);
        } else {
            if (state.selected.has(key)) state.selected.delete(key); else state.selected.add(key);
            state.anchor = key;
        }
        renderGrid(0, false);
        updatePanel();
    }

    function quickSelect(kind) {
        if (kind === "none") state.selected = new Set();
        else {
            daysInView().forEach((key) => {
                const wd = weekday(key);
                if (kind === "all" || (wd > 0 && wd < 6)) state.selected.add(key);
            });
        }
        state.anchor = null;
        renderGrid(0, false);
        updatePanel();
    }

    /* ---- Side panel ------------------------------------------------------------------ */
    function updatePanel() {
        const days = [...state.selected].sort();
        els.rangeList.innerHTML = "";
        $$("[data-op]").forEach((button) => { button.disabled = days.length === 0; });

        if (!days.length) {
            els.selTitle.textContent = "Select days";
            els.selSub.textContent = "Click days on the calendar, then choose hours below.";
            return;
        }
        if (days.length > 1) {
            els.selTitle.textContent = `${days.length} days selected`;
            els.selSub.textContent = `${shortDay(days[0])} to ${shortDay(days[days.length - 1])}`;
            return;
        }

        const ranges = state.avail[days[0]] || [];
        els.selTitle.textContent = longDay(days[0]);
        els.selSub.textContent = ranges.length ? "Times currently open on this day:" : "No times yet. Choose hours below.";
        els.rangeList.innerHTML = ranges.map(([a, b], i) =>
            `<li><span>${label(a)} to ${label(b)}</span><button type="button" data-remove="${i}" aria-label="Remove ${label(a)} to ${label(b)}">×</button></li>`
        ).join("");
    }

    function currentRange() {
        const a = toMin(els.from.value);
        const b = els.to.value === "24:00" ? 1440 : toMin(els.to.value);
        return a < b ? [a, b] : null;
    }

    function applyOperation(kind) {
        const days = [...state.selected];
        if (!days.length) return;
        const range = currentRange();
        if (kind !== "clear" && !range) return setStatus(els.opStatus, "The end time must be after the start time.", "error");

        days.forEach((key) => {
            const existing = state.avail[key] || [];
            let next;
            if (kind === "set") next = [range];
            else if (kind === "add") next = mergeRanges([...existing, range]);
            else if (kind === "block") next = subtractRange(existing, range);
            else next = [];
            if (next.length) state.avail[key] = next; else delete state.avail[key];
        });

        const noun = days.length === 1 ? "day" : "days";
        const text = {
            set: `Set ${label(range ? range[0] : 0)} to ${label(range ? range[1] : 0)} on ${days.length} ${noun}.`,
            add: `Added the hours to ${days.length} ${noun}.`,
            block: `Blocked that time on ${days.length} ${noun}.`,
            clear: `Cleared ${days.length} ${noun}.`,
        }[kind];
        setStatus(els.opStatus, `${text} Not published yet.`, "ok");
        afterChange();
    }

    function removeRange(index) {
        const key = [...state.selected][0];
        if (state.selected.size !== 1 || !state.avail[key]) return;
        state.avail[key].splice(index, 1);
        if (!state.avail[key].length) delete state.avail[key];
        setStatus(els.opStatus, "Removed. Not published yet.", "ok");
        afterChange();
    }

    function fillRange() {
        const range = currentRange();
        if (!range) return setStatus(els.opStatus, "The end time must be after the start time.", "error");
        const from = els.fFrom.value, to = els.fTo.value;
        if (!DAY_KEY.test(from) || !DAY_KEY.test(to) || to < from) return setStatus(els.opStatus, "Choose a start date, and an end date that is not earlier.", "error");
        if (utc(to) - utc(from) > 366 * 864e5) return setStatus(els.opStatus, "Please keep it to a year or less.", "error");

        const wanted = new Set($$('input[name="wd"]:checked').map((box) => Number(box.value)));
        if (!wanted.size) return setStatus(els.opStatus, "Tick at least one day of the week.", "error");

        const today = todayKey();
        let count = 0;
        for (let key = from; key <= to; key = addDays(key, 1)) {
            if (key < today || !wanted.has(weekday(key))) continue;
            state.avail[key] = mergeRanges([...(state.avail[key] || []), range]);
            count++;
        }
        setStatus(els.opStatus, count ? `Added ${label(range[0])} to ${label(range[1])} to ${count} ${count === 1 ? "day" : "days"}. Not published yet.` : "No matching days in that range.", count ? "ok" : "warn");
        afterChange();
    }

    function afterChange() {
        renderGrid(0, false);
        updatePanel();
        updateDirty();
    }

    function updateDirty() {
        const dirty = serialize() !== state.baseline;
        els.saveBar.classList.toggle("is-dirty", dirty);
        els.dirty.textContent = dirty ? "Changes not published yet" : "Everything is published";
        els.btnPublish.disabled = !(state.connected && dirty);
        els.btnPublish.textContent = state.connected ? "Publish to website" : "Connect to publish";
    }

    /* ---- Publish / download / copy ------------------------------------------------------- */
    async function publish() {
        if (!state.connected) return;
        const text = serialize();
        els.btnPublish.disabled = true;
        setStatus(els.saveStatus, "Publishing…");

        const body = {
            message: `Update availability (${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC)`,
            content: b64(text),
            branch: state.branch,
        };
        if (state.sha) body.sha = state.sha;

        try {
            const result = await gh(`/repos/${state.repo}/contents/${FILE}`, { method: "PUT", body: JSON.stringify(body) });
            if (!result.ok) {
                setStatus(els.saveStatus, explain(result, "Publishing"), "error");
                updateDirty();
                return;
            }
            state.sha = result.data.content.sha;
            state.baseline = text;
            // Drop past days from memory too, to match what was saved
            if (els.prune.checked) Object.keys(state.avail).forEach((key) => { if (key < todayKey()) delete state.avail[key]; });
            setStatus(els.saveStatus, "Published. Your booking page shows the new times in about a minute (refresh if you don't see them yet).", "ok");
            renderGrid(0, false);
            updatePanel();
            updateDirty();
        } catch (error) {
            setStatus(els.saveStatus, "Could not reach GitHub. Your edits are still here. Try again.", "error");
            updateDirty();
        }
    }

    function download() {
        const blob = new Blob([serialize()], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = FILE;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        setStatus(els.saveStatus, "Downloaded. On GitHub, open availability.json, choose Edit, paste the contents, and commit.", "ok");
    }

    async function copyJson() {
        try {
            await navigator.clipboard.writeText(serialize());
            setStatus(els.saveStatus, "Copied. Paste it over the contents of availability.json on GitHub and commit.", "ok");
        } catch (error) {
            setStatus(els.saveStatus, "Your browser blocked copying. Use Download file instead.", "warn");
        }
    }

    /* ---- Wiring --------------------------------------------------------------------------------- */
    function buildTimeSelects() {
        const options = (from, to) => {
            let html = "";
            for (let m = from; m <= to; m += 30) html += `<option value="${fmt(m)}">${label(m)}</option>`;
            return html;
        };
        els.from.innerHTML = options(0, 1410);
        els.to.innerHTML = options(30, 1440);
        els.from.value = "09:00";
        els.to.value = "17:00";
    }

    buildTimeSelects();

    els.btnConnect.addEventListener("click", connect);
    els.btnLocal.addEventListener("click", connectLocal);
    els.btnDisconnect.addEventListener("click", disconnect);
    els.token.addEventListener("keydown", (event) => { if (event.key === "Enter") connect(); });

    els.prev.addEventListener("click", () => shiftMonth(-1));
    els.next.addEventListener("click", () => shiftMonth(1));
    els.grid.addEventListener("click", onDayClick);
    $$("[data-sel]").forEach((button) => button.addEventListener("click", () => quickSelect(button.dataset.sel)));
    $$("[data-op]").forEach((button) => button.addEventListener("click", () => applyOperation(button.dataset.op)));
    $$("[data-preset]").forEach((button) => button.addEventListener("click", () => {
        const [a, b] = button.dataset.preset.split("-");
        els.from.value = a;
        els.to.value = b;
    }));
    els.rangeList.addEventListener("click", (event) => {
        const remove = event.target.closest("[data-remove]");
        if (remove) removeRange(Number(remove.dataset.remove));
    });
    els.btnFill.addEventListener("click", fillRange);
    els.prune.addEventListener("change", updateDirty);
    els.btnPublish.addEventListener("click", publish);
    $('[data-act="download"]').addEventListener("click", download);
    $('[data-act="copy"]').addEventListener("click", copyJson);

    // Come back to a remembered connection automatically
    try {
        const saved = JSON.parse(localStorage.getItem(STORE) || "null");
        if (saved && saved.token) {
            els.token.value = saved.token;
            if (saved.repo) els.repo.value = saved.repo;
            connect();
        }
    } catch (error) { /* ignore */ }
})();
