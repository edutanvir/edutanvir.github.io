/* ==========================================================================
   Md Tanvir Ahmed — Portfolio interactions
   Safe to load on every page: each feature looks for its own elements and
   runs inside its own try/catch, so one problem never stops the others.

   Features
    0  Icon sprite            7  Pipeline animation       13 Contact form
    1  Typewriter + backspace 8  Floating icons (parallax)
    2  Header + scroll bar    9  Side rail (scroll dot)
    3  Active nav link       10  Tech-stack marquee
    4  Scroll reveal        11  Reading time
    5  Project carousel     12  Pointer effects: ring, trail, burst, tilt
   ========================================================================== */
(() => {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const rand = (min, max) => min + Math.random() * (max - min);
    const pick = (list) => list[Math.floor(Math.random() * list.length)];

    function run(name, fn) {
        try {
            fn();
        } catch (error) {
            console.warn(`[portfolio] "${name}" failed:`, error);
        }
    }

    /* 0. Icon sprite ------------------------------------------------------- */
    run("sprite", () => {
        const ICONS = {
            "i-db": '<ellipse cx="12" cy="5.5" rx="7" ry="3"/><path d="M5 5.5v13c0 1.7 3.1 3 7 3s7-1.3 7-3v-13"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
            "i-cloud": '<path d="M6.5 18.5a4.5 4.5 0 0 1-.4-8.98 6 6 0 0 1 11.5-1.1A4.6 4.6 0 0 1 17.5 18.5z"/>',
            "i-chart": '<rect x="4" y="11" width="4" height="9" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><rect x="16" y="8" width="4" height="12" rx="1"/>',
            "i-bolt": '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
            "i-layers": '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
            "i-table": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
            "i-code": '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
            "i-shield": '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
            "i-search": '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
            "i-globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
            "i-spark": '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
            "i-mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
            "i-link": '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
            "i-compass": '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
        };

        const symbols = Object.entries(ICONS)
            .map(([id, body]) => `<symbol id="${id}" viewBox="0 0 24 24">${body}</symbol>`)
            .join("");

        document.body.insertAdjacentHTML(
            "afterbegin",
            `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${symbols}</defs></svg>`
        );
    });

    /* 1. Typewriter with backspacing ---------------------------------------
       Mark any element with data-type. Add data-words="a|b|c" to make it
       backspace and retype alternatives after the first typing is done.      */
    run("typewriter", () => {
        const elements = $$("[data-type]");
        if (!elements.length) return;

        if (reduceMotion) {
            elements.forEach((el) => el.classList.add("tw-ready"));
            return;
        }

        // Untyped text stays in the layout (invisible), so nothing jumps while typing.
        const prepare = (el) => {
            const full = el.textContent.replace(/\s+/g, " ").trim();
            el.textContent = "";

            const readerCopy = document.createElement("span");
            readerCopy.className = "sr-only";
            readerCopy.textContent = full;

            const visual = document.createElement("span");
            visual.setAttribute("aria-hidden", "true");

            const typed = document.createElement("span");
            typed.className = "tw-typed";
            const caret = document.createElement("span");
            caret.className = "tw-caret is-off";
            const rest = document.createElement("span");
            rest.className = "tw-rest";
            rest.textContent = full;

            visual.append(typed, caret, rest);
            el.append(readerCopy, visual);

            return {
                el,
                full,
                typed,
                caret,
                rest,
                alternatives: el.dataset.words ? el.dataset.words.split("|") : null,
            };
        };

        const typers = elements.map(prepare);
        elements.forEach((el) => el.classList.add("tw-ready"));

        const typeIn = async (t, speed) => {
            t.caret.classList.remove("is-off");
            for (let i = 1; i <= t.full.length; i++) {
                t.typed.textContent = t.full.slice(0, i);
                t.rest.textContent = t.full.slice(i);
                await sleep(speed * rand(0.6, 1.4));
            }
        };

        const whenVisible = () =>
            new Promise((resolve) => {
                if (!document.hidden) return resolve();
                const onChange = () => {
                    if (!document.hidden) {
                        document.removeEventListener("visibilitychange", onChange);
                        resolve();
                    }
                };
                document.addEventListener("visibilitychange", onChange);
            });

        // Backspace the current word, then type the next one
        const cycleWords = async (t) => {
            const words = [t.full, ...t.alternatives];
            let index = 0;
            t.caret.classList.remove("is-off");

            for (;;) {
                await sleep(2600);
                await whenVisible();

                const current = words[index];
                for (let i = current.length - 1; i >= 0; i--) {
                    t.typed.textContent = current.slice(0, i);
                    await sleep(42);
                }

                await sleep(260);
                index = (index + 1) % words.length;

                const next = words[index];
                for (let i = 1; i <= next.length; i++) {
                    t.typed.textContent = next.slice(0, i);
                    await sleep(rand(55, 95));
                }
            }
        };

        (async () => {
            await sleep(350);

            for (const t of typers) {
                const isParagraph = t.el.tagName === "P";
                await typeIn(t, isParagraph ? 15 : 62);
                t.caret.classList.add("is-off");
                await sleep(isParagraph ? 0 : 160);
            }

            const cycler = typers.find((t) => t.alternatives);
            if (cycler) cycleWords(cycler);
        })();
    });

    /* 2. Header state + scroll progress bar -------------------------------- */
    const header = $(".site-header");
    const progress = $(".scroll-progress");
    const scrollHandlers = [];
    let scrollQueued = false;

    function onScrollFrame() {
        scrollQueued = false;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;

        if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
        if (progress) progress.style.transform = `scaleX(${ratio})`;
        scrollHandlers.forEach((handler) => handler());
    }

    run("scroll", () => {
        window.addEventListener("scroll", () => {
            if (!scrollQueued) {
                scrollQueued = true;
                requestAnimationFrame(onScrollFrame);
            }
        }, { passive: true });
        window.addEventListener("resize", () => requestAnimationFrame(onScrollFrame));
        window.addEventListener("load", onScrollFrame);
        onScrollFrame();
    });

    /* 3. Highlight the nav link for the section in view (home page) -------- */
    run("nav-active", () => {
        const navLinks = $$('.nav-links a[href^="#"]');
        if (!navLinks.length || !("IntersectionObserver" in window)) return;

        const byId = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const link = byId.get(entry.target.id);
                if (link && entry.isIntersecting) {
                    navLinks.forEach((a) => a.classList.remove("is-active"));
                    link.classList.add("is-active");
                }
            });
        }, { rootMargin: "-45% 0px -50% 0px" });

        byId.forEach((_, id) => {
            const section = document.getElementById(id);
            if (section) observer.observe(section);
        });
    });

    /* 4. Scroll reveal ------------------------------------------------------ */
    run("reveal", () => {
        $$("[data-stagger]").forEach((group) => {
            Array.from(group.children).forEach((child, i) => {
                child.classList.add("reveal");
                child.style.setProperty("--d", `${i * 90}ms`);
            });
        });

        const items = $$(".reveal");
        if ("IntersectionObserver" in window && !reduceMotion) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
            items.forEach((el) => observer.observe(el));
        } else {
            items.forEach((el) => el.classList.add("is-visible"));
        }
    });

    /* 5. Project carousel --------------------------------------------------- */
    run("carousel", () => {
        const carousel = $(".carousel");
        if (!carousel) return;

        const stage = $(".carousel-stage", carousel);
        const slides = $$(".slide", carousel);
        const dots = $$(".carousel-dot", carousel);
        const counter = $(".carousel-counter", carousel);
        const pad = (n) => String(n).padStart(2, "0");
        let index = 0;

        function show(next) {
            index = (next + slides.length) % slides.length;

            slides.forEach((slide, i) => {
                const active = i === index;
                slide.classList.toggle("is-active", active);
                slide.toggleAttribute("inert", !active);
                slide.setAttribute("aria-hidden", String(!active));
            });

            dots.forEach((dot, i) => {
                const active = i === index;
                dot.classList.toggle("is-active", active);
                dot.setAttribute("aria-current", String(active));
            });

            if (counter) counter.textContent = `${pad(index + 1)} / ${pad(slides.length)}`;
        }

        $$("[data-direction]", carousel).forEach((button) => {
            button.addEventListener("click", () => show(index + Number(button.dataset.direction)));
        });
        dots.forEach((dot, i) => dot.addEventListener("click", () => show(i)));

        carousel.addEventListener("keydown", (event) => {
            if (event.key === "ArrowLeft") show(index - 1);
            if (event.key === "ArrowRight") show(index + 1);
        });

        let touchStartX = null;
        stage.addEventListener("touchstart", (event) => {
            touchStartX = event.changedTouches[0].clientX;
        }, { passive: true });
        stage.addEventListener("touchend", (event) => {
            if (touchStartX === null) return;
            const deltaX = event.changedTouches[0].clientX - touchStartX;
            if (Math.abs(deltaX) > 50) show(index + (deltaX < 0 ? 1 : -1));
            touchStartX = null;
        }, { passive: true });

        show(0);
    });

    /* 7. Pipeline animation --------------------------------------------------
       Lights each node in turn and sends a glowing packet down the link
       to the next one. Only runs while the pipeline is on screen.            */
    run("pipeline", () => {
        $$("[data-flow]").forEach((flow) => {
            const nodes = $$(".flow-node", flow);
            const links = $$(".flow-link", flow);
            if (!nodes.length || reduceMotion) return;

            const STEP = 1250;
            let tick = -1;
            let timer = null;

            const advance = () => {
                // One extra tick with every node dark gives a short pause between loops
                tick = (tick + 1) % (nodes.length + 1);
                nodes.forEach((node, i) => node.classList.toggle("is-lit", i === tick));

                if (tick < links.length) {
                    const link = links[tick];
                    link.classList.remove("is-go");
                    void link.offsetWidth; // restart the CSS animation
                    link.classList.add("is-go");
                }
            };

            const start = () => {
                if (timer) return;
                advance();
                timer = setInterval(advance, STEP);
            };
            const stop = () => {
                clearInterval(timer);
                timer = null;
            };

            if ("IntersectionObserver" in window) {
                new IntersectionObserver((entries) => {
                    entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
                }, { threshold: 0.35 }).observe(flow);
            } else {
                start();
            }
        });
    });

    /* 8. Floating icons: drift with the pointer and with scrolling ---------- */
    run("float-icons", () => {
        const groups = $$(".float-icons");
        if (!groups.length || reduceMotion) return;

        const visible = new Set();
        if ("IntersectionObserver" in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) visible.add(entry.target);
                    else visible.delete(entry.target);
                });
            }, { rootMargin: "120px" });
            groups.forEach((group) => observer.observe(group));
        } else {
            groups.forEach((group) => visible.add(group));
        }

        let targetX = 0, targetY = 0, x = 0, y = 0;

        if (finePointer) {
            document.addEventListener("pointermove", (event) => {
                targetX = (event.clientX / window.innerWidth - 0.5) * 2;
                targetY = (event.clientY / window.innerHeight - 0.5) * 2;
            }, { passive: true });
        }

        const lastKey = new Map();
        (function frame() {
            x += (targetX - x) * 0.07;
            y += (targetY - y) * 0.07;

            visible.forEach((group) => {
                const rect = group.getBoundingClientRect();
                const sy = Math.round(rect.top + rect.height / 2 - window.innerHeight / 2);
                const key = `${x.toFixed(3)}|${y.toFixed(3)}|${sy}`;

                if (lastKey.get(group) !== key) {
                    lastKey.set(group, key);
                    group.style.setProperty("--mx", x.toFixed(3));
                    group.style.setProperty("--my", y.toFixed(3));
                    group.style.setProperty("--sy", sy);
                }
            });

            requestAnimationFrame(frame);
        })();
    });

    /* 9. Side rail: a dot travels down the page as you scroll --------------- */
    run("rail", () => {
        const sections = $$("[data-rail]");
        if (sections.length < 2) return;

        const rail = document.createElement("nav");
        rail.className = "rail";
        rail.setAttribute("aria-label", "Page sections");
        rail.innerHTML =
            '<span class="rail-line"><i class="rail-fill"></i></span><span class="rail-packet"></span>' +
            sections
                .map((s) => `<a class="rail-dot" href="#${s.id}" data-label="${s.dataset.rail}" aria-label="${s.dataset.rail}"></a>`)
                .join("");
        document.body.appendChild(rail);

        const dots = $$(".rail-dot", rail);

        scrollHandlers.push(() => {
            const y = window.scrollY + window.innerHeight * 0.4;
            const tops = sections.map((s) => s.getBoundingClientRect().top + window.scrollY);
            const last = sections.length - 1;

            let current = -1;
            tops.forEach((top, i) => {
                if (y >= top) current = i;
            });

            let p = 0;
            if (current >= last) p = 1;
            else if (current >= 0) p = (current + (y - tops[current]) / (tops[current + 1] - tops[current])) / last;

            rail.style.setProperty("--p", Math.min(Math.max(p, 0), 1).toFixed(4));
            dots.forEach((dot, i) => {
                dot.classList.toggle("is-passed", i < current);
                dot.classList.toggle("is-active", i === Math.max(current, 0));
            });
        });
        onScrollFrame();
    });

    /* 10. Tech-stack marquee ------------------------------------------------ */
    run("marquee", () => {
        $$(".marquee").forEach((marquee) => {
            const inner = $(".marquee-inner", marquee);
            const track = $(".marquee-track", marquee);
            if (!inner || !track || reduceMotion) return;

            const copy = track.cloneNode(true);
            copy.setAttribute("aria-hidden", "true");
            inner.appendChild(copy);
            marquee.classList.add("is-ready");
        });
    });

    /* 11. Reading time on blog-style pages --------------------------------- */
    run("reading-time", () => {
        const post = $("[data-post]");
        const outputs = $$("[data-reading-time]");
        if (!post || !outputs.length) return;

        const words = post.textContent.trim().split(/\s+/).length;
        const minutes = Math.max(1, Math.round(words / 210));
        outputs.forEach((el) => (el.textContent = `${minutes} min read`));
    });

    /* 12. Pointer effects (desktop mouse only, off for reduced motion) ------ */
    run("pointer-effects", () => {
        if (!finePointer || reduceMotion) return;

        // Card spotlight
        $$(".card").forEach((card) => {
            card.addEventListener("pointermove", (event) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
                card.style.setProperty("--my", `${event.clientY - rect.top}px`);
            });
        });

        // 3D tilt on screenshots
        $$("[data-tilt]").forEach((el) => {
            const MAX_DEG = 6;
            el.addEventListener("pointermove", (event) => {
                const rect = el.getBoundingClientRect();
                const px = (event.clientX - rect.left) / rect.width - 0.5;
                const py = (event.clientY - rect.top) / rect.height - 0.5;
                el.style.transform =
                    `perspective(1000px) rotateY(${px * MAX_DEG}deg) ` +
                    `rotateX(${-py * MAX_DEG}deg) scale(1.01)`;
            });
            el.addEventListener("pointerleave", () => { el.style.transform = ""; });
        });

        // Magnetic buttons
        $$("[data-magnetic]").forEach((el) => {
            el.addEventListener("pointermove", (event) => {
                const rect = el.getBoundingClientRect();
                const x = event.clientX - (rect.left + rect.width / 2);
                const y = event.clientY - (rect.top + rect.height / 2);
                el.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
            });
            el.addEventListener("pointerleave", () => { el.style.transform = ""; });
        });

        // Trail of little data bits and icons, and a burst on click.
        // To switch the trail off, add the attribute data-no-trail to <body>.
        const COLORS = ["#2997ff", "#40d9ff", "#8f7bff", "#ff7ab8", "#ffb340", "#30d158"];
        const ICON_IDS = ["i-bolt", "i-db", "i-chart", "i-cloud", "i-layers", "i-spark"];
        let live = 0;

        function spawnBit(x, y, angle) {
            if (live >= 40) return;
            const burst = typeof angle === "number";
            const asIcon = Math.random() < 0.34;
            const size = asIcon ? rand(14, 20) : rand(5, 11);
            const distance = burst ? rand(50, 110) : rand(24, 60);
            const direction = burst ? angle : rand(-Math.PI * 0.9, -Math.PI * 0.1);

            const el = document.createElement("span");
            el.className = asIcon ? "bit bit--icon" : "bit";
            el.setAttribute("aria-hidden", "true");
            el.style.cssText =
                `--x:${(x - size / 2).toFixed(1)}px;--y:${(y - size / 2).toFixed(1)}px;` +
                `--dx:${(Math.cos(direction) * distance).toFixed(1)}px;` +
                `--dy:${(Math.sin(direction) * distance + (burst ? 0 : 12)).toFixed(1)}px;` +
                `--r:${rand(-120, 120).toFixed(0)}deg;--sz:${size.toFixed(1)}px;` +
                `--bc:${pick(COLORS)};--dur:${rand(burst ? 600 : 700, burst ? 900 : 1100).toFixed(0)}ms`;

            if (asIcon) el.innerHTML = `<svg class="ico"><use href="#${pick(ICON_IDS)}"/></svg>`;

            el.addEventListener("animationend", () => {
                el.remove();
                live--;
            });
            document.body.appendChild(el);
            live++;
        }

        let lastX = 0, lastY = 0, travelled = 0;
        document.addEventListener("pointermove", (event) => {
            if (event.pointerType && event.pointerType !== "mouse") return;
            if (document.body.hasAttribute("data-no-trail")) return;
            if (event.target.closest && event.target.closest("input, textarea")) return;

            travelled += Math.hypot(event.clientX - lastX, event.clientY - lastY);
            lastX = event.clientX;
            lastY = event.clientY;

            if (travelled > 46) {
                travelled = 0;
                spawnBit(event.clientX, event.clientY);
            }
        }, { passive: true });

        document.addEventListener("pointerdown", (event) => {
            if (event.pointerType && event.pointerType !== "mouse") return;
            if (document.body.hasAttribute("data-no-trail")) return;
            if (event.target.closest && event.target.closest("input, textarea")) return;

            const count = 10;
            for (let i = 0; i < count; i++) {
                spawnBit(event.clientX, event.clientY, (i / count) * Math.PI * 2 + rand(-0.2, 0.2));
            }
        });

        // Cursor ring + hero light, both eased in one animation loop
        const ring = document.createElement("div");
        ring.className = "cursor-ring";
        ring.setAttribute("aria-hidden", "true");
        ring.innerHTML = "<span></span>";
        document.body.appendChild(ring);
        const ringLabel = ring.firstElementChild;

        const hero = $(".hero");
        let targetX = -100, targetY = -100, ringX = -100, ringY = -100;
        let glowTargetX = 72, glowTargetY = 28, glowX = 72, glowY = 28;

        document.addEventListener("pointermove", (event) => {
            targetX = event.clientX;
            targetY = event.clientY;
            ring.classList.add("is-on");

            if (hero) {
                const rect = hero.getBoundingClientRect();
                glowTargetX = ((event.clientX - rect.left) / rect.width) * 100;
                glowTargetY = ((event.clientY - rect.top) / rect.height) * 100;
            }
        });

        document.documentElement.addEventListener("mouseleave", () => ring.classList.remove("is-on"));
        document.documentElement.addEventListener("mouseenter", () => ring.classList.add("is-on"));

        document.addEventListener("pointerover", (event) => {
            const viewTarget = event.target.closest("[data-cursor='view']");
            const interactive = event.target.closest("a, button, label");
            const textField = event.target.closest("input, textarea");

            ring.classList.toggle("is-view", Boolean(viewTarget));
            ring.classList.toggle("is-hover", Boolean(interactive) && !viewTarget);
            ring.classList.toggle("is-on", !textField);
            ringLabel.textContent = viewTarget ? (viewTarget.dataset.cursorLabel || "View") : "";
        });

        (function loop() {
            ringX += (targetX - ringX) * 0.18;
            ringY += (targetY - ringY) * 0.18;
            ring.style.transform =
                `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;

            if (hero) {
                glowX += (glowTargetX - glowX) * 0.06;
                glowY += (glowTargetY - glowY) * 0.06;
                hero.style.setProperty("--gx", `${glowX}%`);
                hero.style.setProperty("--gy", `${glowY}%`);
            }

            requestAnimationFrame(loop);
        })();
    });

    /* 13. Contact form: validates, then sends through the mail service ------ */
    run("contact-form", () => {
        const form = $("#contact-form");
        if (!form) return;

        const status = $(".form-status", form);
        const submitButton = $("button[type='submit']", form);
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const messages = {
            name: "Enter your name.",
            email: "Enter your email address.",
            message: "Write a short message.",
        };

        function setStatus(text, kind) {
            status.textContent = text;
            status.classList.toggle("is-success", kind === "success");
            status.classList.toggle("is-error", kind === "error");
        }

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            let firstInvalid = null;

            ["name", "email", "message"].forEach((id) => {
                const input = form.elements[id];
                const error = $(`#${id}-error`);
                const value = input.value.trim();
                let message = "";

                if (!value) message = messages[id];
                else if (id === "email" && !emailPattern.test(value)) {
                    message = "Enter a valid email address, like name@company.com.";
                }

                error.textContent = message;
                input.setAttribute("aria-invalid", String(Boolean(message)));
                if (message && !firstInvalid) firstInvalid = input;
            });

            if (firstInvalid) {
                firstInvalid.focus();
                setStatus("", "");
                return;
            }

            const accessKey = form.elements.access_key.value;
            if (!accessKey || accessKey.startsWith("YOUR_")) {
                console.warn("Contact form: add your Web3Forms access key in contact.html.");
                setStatus("The contact form is not connected yet. Please message me on LinkedIn for now.", "error");
                return;
            }

            const originalLabel = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = "Sending...";
            setStatus("", "");

            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Accept": "application/json" },
                    body: JSON.stringify(Object.fromEntries(new FormData(form))),
                });
                const result = await response.json().catch(() => ({}));

                if (!response.ok || result.success === false) {
                    throw new Error(result.message || `Request failed (${response.status})`);
                }

                form.reset();
                setStatus("Thanks, your message was sent. I will reply by email.", "success");
            } catch (error) {
                console.warn("Contact form error:", error);
                setStatus("Your message could not be sent. Please try again, or message me on LinkedIn.", "error");
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalLabel;
            }
        });

        form.addEventListener("input", (event) => {
            const input = event.target;
            if (input.getAttribute("aria-invalid") === "true") {
                input.setAttribute("aria-invalid", "false");
                const error = $(`#${input.id}-error`);
                if (error) error.textContent = "";
            }
        });
    });
})();