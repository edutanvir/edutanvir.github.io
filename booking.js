/* ==========================================================================
   Booking calendar (contact page)

   How it works, with no database:
   1. You list the days and times you are free in availability.json.
   2. This script reads that file, converts every time to the VISITOR's own
      time zone, and draws the calendar.
   3. A visitor picks a time and sends a request. It arrives in your inbox
      through Web3Forms (the same service as the contact form). You reply to
      confirm, then delete that time from availability.json.

   Preview with example dates and no emails sent:  contact.html?demo=1
   ========================================================================== */
(() => {
    "use strict";

    const root = document.querySelector("[data-booking]");
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (selector, scope = root) => scope.querySelector(selector);
    const pad = (n) => String(n).padStart(2, "0");
    const DEMO = new URLSearchParams(window.location.search).get("demo") === "1";

    const els = {
        grid: $("[data-cal-grid]"),
        title: $("[data-cal-title]"),
        prev: $("[data-cal-prev]"),
        next: $("[data-cal-next]"),
        panel: $("[data-panel]"),
        count: $("[data-stat-count]"),
        nextOpen: $("[data-next-open]"),
        demoNote: $("[data-demo-note]"),
    };

    const icon = (id) => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;

    const visitorTz = (() => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        } catch (error) {
            return "UTC";
        }
    })();

    const state = {
        owner: { tz: "America/Toronto", slotMinutes: 30, minNoticeHours: 12 },
        slots: [],              // [{ utc, dayKey }]
        byDay: new Map(),       // dayKey (visitor's date) -> slots
        view: null,             // { y, m } month being shown
        selectedDay: null,
        selectedSlot: null,
        requested: new Set(),
        minMonth: null,
        maxMonth: null,
    };

    /* ---- Time zone maths --------------------------------------------------
       Turns "10:00 in Toronto on 2026-11-10" into one exact moment (UTC), so
       the same slot shows correctly for a visitor anywhere, daylight saving
       included.                                                              */
    const zoneFormatters = new Map();
    function zoneParts(utcMs, tz) {
        let f = zoneFormatters.get(tz);
        if (!f) {
            f = new Intl.DateTimeFormat("en-US", {
                timeZone: tz, hourCycle: "h23",
                year: "numeric", month: "numeric", day: "numeric",
                hour: "numeric", minute: "numeric", second: "numeric",
            });
            zoneFormatters.set(tz, f);
        }
        const p = {};
        f.formatToParts(new Date(utcMs)).forEach((part) => { p[part.type] = part.value; });
        return p;
    }

    function offsetMs(utcMs, tz) {
        const p = zoneParts(utcMs, tz);
        const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
        return asUtc - Math.floor(utcMs / 1000) * 1000;
    }

    function zonedToUtc(y, m, d, hh, mm, tz) {
        const guess = Date.UTC(y, m - 1, d, hh, mm);
        const first = guess - offsetMs(guess, tz);
        return guess - offsetMs(first, tz);
    }

    const dayKeyOf = (utcMs, tz) => {
        const p = zoneParts(utcMs, tz);
        return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
    };

    const fmt = (options, tz = visitorTz) => new Intl.DateTimeFormat(undefined, { timeZone: tz, ...options });
    const timeFmt = fmt({ hour: "numeric", minute: "2-digit" });
    const ownerTimeFmt = () => fmt({ hour: "numeric", minute: "2-digit", timeZoneName: "short" }, state.owner.tz);

    /* ---- Reading availability.json ---------------------------------------- */
    function expandEntry(entry, slotMinutes) {
        const m = /^(\d{1,2}):(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?$/.exec(String(entry).trim());
        if (!m) return null;

        const start = +m[1] * 60 + +m[2];
        if (+m[1] > 23 || +m[2] > 59) return null;
        if (m[3] === undefined) return [start];

        const end = +m[3] * 60 + +m[4];
        if (+m[3] > 24 || +m[4] > 59) return null;

        const starts = [];
        for (let t = start; t + slotMinutes <= end; t += slotMinutes) starts.push(t);
        return starts;
    }

    function buildSlots(data) {
        let tz = data.timezone || "America/Toronto";
        try {
            new Intl.DateTimeFormat(undefined, { timeZone: tz });
        } catch (error) {
            console.warn(`[booking] Unknown timezone "${tz}". Using America/Toronto.`);
            tz = "America/Toronto";
        }

        const slotMinutes = Math.min(Math.max(Number(data.slotMinutes) || 30, 5), 240);
        const notice = Number.isFinite(Number(data.minNoticeHours)) ? Number(data.minNoticeHours) : 12;
        state.owner = { tz, slotMinutes, minNoticeHours: notice };

        const earliest = Date.now() + notice * 3600 * 1000;
        const seen = new Set();
        const slots = [];

        Object.entries(data.availability || {}).forEach(([date, entries]) => {
            const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
            if (!dm || !Array.isArray(entries)) {
                console.warn(`[booking] Skipped "${date}": use "YYYY-MM-DD": ["10:00-12:00"].`);
                return;
            }

            entries.forEach((entry) => {
                const starts = expandEntry(entry, slotMinutes);
                if (!starts) {
                    console.warn(`[booking] Skipped "${entry}" on ${date}: use "HH:MM" or "HH:MM-HH:MM".`);
                    return;
                }
                starts.forEach((minutes) => {
                    const utc = zonedToUtc(+dm[1], +dm[2], +dm[3], Math.floor(minutes / 60), minutes % 60, tz);
                    if (utc >= earliest && !seen.has(utc)) {
                        seen.add(utc);
                        slots.push({ utc, dayKey: dayKeyOf(utc, visitorTz) });
                    }
                });
            });
        });

        slots.sort((a, b) => a.utc - b.utc);
        return slots;
    }

    // Example dates for ?demo=1 (always the next few weekdays)
    function demoData() {
        const availability = {};
        const patterns = [
            ["10:00-12:00", "14:00-16:00"],
            ["09:30-11:30"],
            ["13:00-15:00", "17:00-18:00"],
            ["10:00-11:30", "15:00-16:30"],
            ["11:00-12:00"],
        ];
        const d = new Date();
        for (let i = 1; i <= 24; i++) {
            const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
            const dow = day.getDay();
            if (dow === 0 || dow === 6) continue;
            if (i % 5 === 0) continue; // a few gaps look more natural
            availability[`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`] = patterns[(i + dow) % patterns.length];
        }
        return { timezone: visitorTz, slotMinutes: 30, minNoticeHours: 0, availability };
    }

    /* ---- Calendar ---------------------------------------------------------- */
    const monthLabel = (y, m) => new Date(y, m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const longDay = (key) => {
        const [y, m, d] = key.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    };
    const shortDay = (key) => {
        const [y, m, d] = key.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    };

    function renderCalendar(direction = 0) {
        const { y, m } = state.view;
        const first = new Date(y, m, 1).getDay();
        const total = new Date(y, m + 1, 0).getDate();
        const todayKey = dayKeyOf(Date.now(), visitorTz);
        const firstOpen = state.slots.length ? state.slots[0].dayKey : null;

        let html = "";
        for (let i = 0; i < first; i++) html += '<span class="cal-day is-blank" aria-hidden="true"></span>';

        for (let d = 1; d <= total; d++) {
            const key = `${y}-${pad(m + 1)}-${pad(d)}`;
            const slots = state.byDay.get(key);
            const free = Boolean(slots);
            const classes = ["cal-day"];
            if (free) classes.push("is-free");
            if (key === todayKey) classes.push("is-today");
            if (key === state.selectedDay) classes.push("is-selected");
            if (free && key === firstOpen && key !== state.selectedDay) classes.push("is-pulse");

            const bars = free ? `<span class="bars" aria-hidden="true">${"<i></i>".repeat(Math.min(3, slots.length))}</span>` : "";
            const label = free
                ? `${longDay(key)}, ${slots.length} ${slots.length === 1 ? "time" : "times"} available`
                : `${longDay(key)}, no times available`;

            html += `<button type="button" class="${classes.join(" ")}" data-day="${key}" style="--i:${first + d}" aria-label="${label}"${free ? "" : " disabled"}>` +
                `<span>${d}</span>${bars}</button>`;
        }

        els.grid.style.setProperty("--dir", direction);
        els.grid.innerHTML = html;
        els.title.innerHTML = `<span>${monthLabel(y, m)}</span>`;

        const index = y * 12 + m;
        els.prev.disabled = index <= state.minMonth;
        els.next.disabled = index >= state.maxMonth;
    }

    function shiftMonth(delta) {
        const index = state.view.y * 12 + state.view.m + delta;
        if (index < state.minMonth || index > state.maxMonth) return;
        state.view = { y: Math.floor(index / 12), m: index % 12 };
        renderCalendar(delta);
    }

    // Highlight the chosen day without redrawing the whole month (no flicker)
    function markSelected() {
        const firstOpen = state.slots.length ? state.slots[0].dayKey : null;
        els.grid.querySelectorAll(".cal-day[data-day]").forEach((button) => {
            const key = button.dataset.day;
            const selected = key === state.selectedDay;
            button.classList.toggle("is-selected", selected);
            button.classList.toggle("is-pulse", key === firstOpen && !selected);
        });
    }

    function jumpToDay(key, { open = true } = {}) {
        const [y, m] = key.split("-").map(Number);
        const previous = state.view;
        const sameMonth = previous && previous.y === y && previous.m === m - 1;

        state.view = { y, m: m - 1 };
        state.selectedDay = key;
        state.selectedSlot = null;

        if (sameMonth) {
            markSelected();
        } else {
            const delta = previous ? (y * 12 + m - 1) - (previous.y * 12 + previous.m) : 0;
            renderCalendar(Math.sign(delta));
        }
        if (open) renderDayPanel();
    }

    /* ---- Right-hand panel -------------------------------------------------- */
    function setPanel(html) {
        els.panel.innerHTML = `<div class="panel-in">${html}</div>`;
    }

    function renderEmptyPanel() {
        const hasSlots = state.slots.length > 0;
        setPanel(`
            <div class="panel-empty">
                <span class="empty-icon">${icon("i-calendar")}</span>
                <h3 class="panel-title">${hasSlots ? "Pick a day" : "No times open right now"}</h3>
                <p>${hasSlots
                    ? "Choose a highlighted day on the calendar to see the times I'm free."
                    : "I haven't posted new times yet. Send me a message and we'll find one together."}</p>
                ${hasSlots ? "" : '<a class="btn btn-primary btn-small" href="#send">Send a message</a>'}
                ${hasSlots ? `<p class="panel-tz">${icon("i-globe")} Times are shown in <strong>${visitorTz.replace(/_/g, " ")}</strong></p>` : ""}
            </div>`);
    }

    function renderDayPanel() {
        const key = state.selectedDay;
        const slots = state.byDay.get(key) || [];

        const buttons = slots.map((slot, i) => {
            const requested = state.requested.has(slot.utc);
            return `<button type="button" class="slot${requested ? " is-requested" : ""}" data-utc="${slot.utc}" style="--i:${i}"${requested ? " disabled" : ""}>` +
                `${requested ? "Requested" : timeFmt.format(slot.utc)}</button>`;
        }).join("");

        setPanel(`
            <h3 class="panel-title">${longDay(key)}</h3>
            <p class="panel-sub">${icon("i-clock")} ${state.owner.slotMinutes}-minute call
                <span aria-hidden="true">·</span> your time (${visitorTz.replace(/_/g, " ")})</p>
            <div class="slots" role="group" aria-label="Available times">${buttons}</div>

            <div class="slot-form-wrap" data-form-wrap>
                <div>
                    <form class="bk-form" data-bk-form novalidate>
                        <p class="bk-summary" data-summary></p>

                        <input type="hidden" name="access_key" value="${root.dataset.key || ""}">
                        <input type="checkbox" name="botcheck" style="display:none" tabindex="-1" autocomplete="off">

                        <div class="field">
                            <label for="bk-name">Your name</label>
                            <input id="bk-name" name="name" type="text" autocomplete="name" aria-describedby="bk-name-error" aria-invalid="false">
                            <p class="field-error" id="bk-name-error" role="alert"></p>
                        </div>
                        <div class="field">
                            <label for="bk-email">Your email</label>
                            <input id="bk-email" name="email" type="email" autocomplete="email" aria-describedby="bk-email-error" aria-invalid="false">
                            <p class="field-error" id="bk-email-error" role="alert"></p>
                        </div>
                        <div class="field">
                            <label for="bk-note">What would you like to talk about? <span class="optional">(optional)</span></label>
                            <textarea id="bk-note" name="note" rows="3"></textarea>
                        </div>

                        <button class="btn btn-primary" type="submit">Request this time</button>
                        <p class="form-status" role="status" aria-live="polite"></p>
                    </form>
                </div>
            </div>`);
    }

    function describeSlot(utc) {
        const mine = `${shortDay(dayKeyOf(utc, visitorTz))}, ${timeFmt.format(utc)}`;
        const sameZone = state.owner.tz === visitorTz;
        const theirs = sameZone ? "" : ` (${ownerTimeFmt().format(utc)} for me)`;
        return { mine, theirs };
    }

    function selectSlot(button) {
        const utc = Number(button.dataset.utc);
        state.selectedSlot = utc;

        els.panel.querySelectorAll(".slot").forEach((b) => b.classList.toggle("is-selected", b === button));

        const wrap = $("[data-form-wrap]", els.panel);
        const summary = $("[data-summary]", els.panel);
        const { mine, theirs } = describeSlot(utc);
        summary.innerHTML = `${icon("i-calendar")} <span></span>`;
        summary.querySelector("span").textContent = `${mine}${theirs}`;

        wrap.classList.add("is-open");
        setTimeout(() => wrap.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" }), 350);
    }

    /* ---- Sending a request -------------------------------------------------- */
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    async function submitRequest(form) {
        const status = $(".form-status", form);
        const submit = $("button[type='submit']", form);
        const name = form.elements.name.value.trim();
        const email = form.elements.email.value.trim();
        const note = form.elements.note.value.trim();

        let firstBad = null;
        const check = (field, message) => {
            const input = form.elements[field];
            const error = $(`#bk-${field}-error`, form);
            error.textContent = message;
            input.setAttribute("aria-invalid", String(Boolean(message)));
            if (message && !firstBad) firstBad = input;
        };
        check("name", name ? "" : "Enter your name.");
        check("email", !email ? "Enter your email address." : emailPattern.test(email) ? "" : "Enter a valid email address, like name@company.com.");

        if (firstBad) {
            firstBad.focus();
            status.textContent = "";
            return;
        }

        const utc = state.selectedSlot;
        if (!utc) {
            status.textContent = "Pick a time first.";
            status.className = "form-status is-error";
            return;
        }

        const label = submit.textContent;
        submit.disabled = true;
        submit.textContent = "Sending...";
        status.textContent = "";
        status.className = "form-status";

        const ownerWhen = new Intl.DateTimeFormat("en-US", {
            timeZone: state.owner.tz, weekday: "long", month: "long", day: "numeric", year: "numeric",
            hour: "numeric", minute: "2-digit", timeZoneName: "short",
        }).format(utc);
        const visitorWhen = new Intl.DateTimeFormat("en-US", {
            timeZone: visitorTz, weekday: "long", month: "long", day: "numeric", year: "numeric",
            hour: "numeric", minute: "2-digit", timeZoneName: "short",
        }).format(utc);

        try {
            if (DEMO) {
                await new Promise((resolve) => setTimeout(resolve, 900));
            } else {
                const key = form.elements.access_key.value;
                if (!key) throw new Error("No access key configured");

                const response = await fetch(root.dataset.endpoint || "https://api.web3forms.com/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify({
                        access_key: key,
                        subject: `Meeting request: ${ownerWhen}`,
                        from_name: "Portfolio booking",
                        name,
                        email,
                        message: note || "(No note added)",
                        requested_time_my_timezone: ownerWhen,
                        requested_time_visitor_timezone: visitorWhen,
                        visitor_timezone: visitorTz,
                        requested_time_utc: new Date(utc).toISOString(),
                        duration_minutes: state.owner.slotMinutes,
                        botcheck: form.elements.botcheck.checked ? "1" : "",
                    }),
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok || result.success === false) {
                    throw new Error(result.message || `Request failed (${response.status})`);
                }
            }

            state.requested.add(utc);
            renderDone({ visitorWhen, email });
        } catch (error) {
            console.warn("[booking] could not send:", error);
            status.textContent = "Your request could not be sent. Please try again, or use the message form below.";
            status.className = "form-status is-error";
            submit.disabled = false;
            submit.textContent = label;
        }
    }

    function renderDone({ visitorWhen, email }) {
        const colors = ["#2997ff", "#40d9ff", "#8f7bff", "#ff7ab8", "#ffb340", "#30d158"];
        const confetti = reduceMotion ? "" : Array.from({ length: 22 }, (_, i) =>
            `<i style="--a:${Math.round((i / 22) * 360)}deg;--d:${50 + (i % 4) * 14}px;--c:${colors[i % colors.length]};--t:${(i % 5) * 40}ms"></i>`
        ).join("");

        setPanel(`
            <div class="panel-done">
                <div class="done-badge">
                    <span class="confetti" aria-hidden="true">${confetti}</span>
                    <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="m14 27 8 8 16-17"/></svg>
                </div>
                <h3 class="panel-title">Request sent</h3>
                <p class="done-when"></p>
                <p class="done-note">I'll confirm by email to <strong class="done-email"></strong>.</p>
                ${DEMO ? '<p class="demo-flag">Demo mode: nothing was actually sent.</p>' : ""}
                <button type="button" class="btn btn-secondary btn-small" data-again>Pick another time</button>
            </div>`);

        $(".done-when", els.panel).textContent = visitorWhen;
        $(".done-email", els.panel).textContent = email;
        state.selectedSlot = null;
    }

    /* ---- Stats strip --------------------------------------------------------- */
    function countUp(el, to) {
        if (reduceMotion || to === 0) {
            el.textContent = String(to);
            return;
        }
        const start = performance.now();
        const duration = 900;
        (function tick(now) {
            const t = Math.min((now - start) / duration, 1);
            el.textContent = String(Math.round(to * (1 - Math.pow(1 - t, 3))));
            if (t < 1) requestAnimationFrame(tick);
        })(start);
    }

    function renderStats() {
        // Count open DAYS (not half-hour slots), so the number stays sensible however many hours are free
        const soon = Date.now() + 14 * 864e5;
        const openDays = new Set(state.slots.filter((s) => s.utc < soon).map((s) => s.dayKey));
        countUp(els.count, openDays.size);

        if (state.slots.length) {
            const first = state.slots[0];
            els.nextOpen.hidden = false;
            $("span", els.nextOpen).textContent = `${shortDay(first.dayKey)}, ${timeFmt.format(first.utc)}`;
            els.nextOpen.dataset.day = first.dayKey;
        } else {
            els.nextOpen.hidden = true;
        }
        if (els.demoNote) els.demoNote.hidden = !DEMO;
    }

    /* ---- Start ---------------------------------------------------------------- */
    function ready(data) {
        state.slots = buildSlots(data);
        state.byDay = new Map();
        state.slots.forEach((slot) => {
            if (!state.byDay.has(slot.dayKey)) state.byDay.set(slot.dayKey, []);
            state.byDay.get(slot.dayKey).push(slot);
        });

        const today = dayKeyOf(Date.now(), visitorTz).split("-").map(Number);
        state.minMonth = today[0] * 12 + today[1] - 1;
        state.maxMonth = state.minMonth;
        state.slots.forEach((slot) => {
            const [y, m] = slot.dayKey.split("-").map(Number);
            state.maxMonth = Math.max(state.maxMonth, y * 12 + m - 1);
        });

        const startKey = state.slots.length ? state.slots[0].dayKey : null;
        const [sy, sm] = startKey ? startKey.split("-").map(Number) : [today[0], today[1]];
        state.view = { y: sy, m: sm - 1 };

        els.grid.classList.remove("is-loading");
        renderCalendar(0);
        renderStats();
        renderEmptyPanel();
    }

    function failed(error) {
        console.warn("[booking] could not load availability.json:", error);
        els.grid.classList.remove("is-loading");
        const today = new Date();
        state.minMonth = state.maxMonth = today.getFullYear() * 12 + today.getMonth();
        state.view = { y: today.getFullYear(), m: today.getMonth() };
        renderCalendar(0);
        els.count.textContent = "0";
        els.nextOpen.hidden = true;
        setPanel(`
            <div class="panel-empty">
                <span class="empty-icon">${icon("i-calendar")}</span>
                <h3 class="panel-title">Calendar unavailable</h3>
                <p>I couldn't load my availability. Please send me a message instead and we'll find a time.</p>
                <a class="btn btn-primary btn-small" href="#send">Send a message</a>
            </div>`);
    }

    /* ---- Events ----------------------------------------------------------------- */
    els.prev.addEventListener("click", () => shiftMonth(-1));
    els.next.addEventListener("click", () => shiftMonth(1));

    els.grid.addEventListener("click", (event) => {
        const day = event.target.closest(".cal-day.is-free");
        if (!day) return;

        if (!reduceMotion) {
            const rect = day.getBoundingClientRect();
            const ripple = document.createElement("span");
            ripple.className = "ripple";
            const size = Math.max(rect.width, rect.height) * 1.6;
            ripple.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - rect.left - size / 2}px;top:${event.clientY - rect.top - size / 2}px`;
            day.appendChild(ripple);
            ripple.addEventListener("animationend", () => ripple.remove());
        }
        jumpToDay(day.dataset.day);
    });

    els.nextOpen.addEventListener("click", () => {
        jumpToDay(els.nextOpen.dataset.day);
        els.panel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    });

    els.panel.addEventListener("click", (event) => {
        const slot = event.target.closest(".slot");
        if (slot && !slot.disabled) selectSlot(slot);
        if (event.target.closest("[data-again]")) renderDayPanel();
    });

    els.panel.addEventListener("submit", (event) => {
        const form = event.target.closest("[data-bk-form]");
        if (!form) return;
        event.preventDefault();
        submitRequest(form);
    });

    els.panel.addEventListener("input", (event) => {
        const input = event.target;
        if (input.getAttribute && input.getAttribute("aria-invalid") === "true") {
            input.setAttribute("aria-invalid", "false");
            const error = $(`#${input.id}-error`, els.panel);
            if (error) error.textContent = "";
        }
    });

    els.grid.classList.add("is-loading");
    setPanel('<div class="panel-empty"><p>Loading availability...</p></div>');

    if (DEMO) {
        ready(demoData());
    } else {
        fetch(root.dataset.src || "availability.json", { cache: "no-cache" })
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(ready)
            .catch(failed);
    }
})();
