/* ==========================================================================
   Md Tanvir Ahmed — Portfolio interactions
   Every feature checks that its elements exist, so this one file is safe
   to load on all pages (home, contact, case studies).
   ========================================================================== */
(() => {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    /* 1. Header state + scroll progress bar ------------------------------ */
    const header = $(".site-header");
    const progress = $(".scroll-progress");
    let scrollQueued = false;

    function updateScroll() {
        scrollQueued = false;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;

        if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
        if (progress) progress.style.transform = `scaleX(${ratio})`;
    }

    window.addEventListener("scroll", () => {
        if (!scrollQueued) {
            scrollQueued = true;
            requestAnimationFrame(updateScroll);
        }
    }, { passive: true });
    updateScroll();

    /* 2. Highlight the nav link for the section in view (home page) ------ */
    const navLinks = $$('.nav-links a[href^="#"]');
    if (navLinks.length && "IntersectionObserver" in window) {
        const byId = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
        const sectionObserver = new IntersectionObserver((entries) => {
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
            if (section) sectionObserver.observe(section);
        });
    }

    /* 3. Scroll reveal --------------------------------------------------- */
    $$("[data-stagger]").forEach((group) => {
        Array.from(group.children).forEach((child, i) => {
            child.classList.add("reveal");
            child.style.setProperty("--d", `${i * 90}ms`);
        });
    });

    const revealEls = $$(".reveal");
    if ("IntersectionObserver" in window && !reduceMotion) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
        revealEls.forEach((el) => revealObserver.observe(el));
    } else {
        revealEls.forEach((el) => el.classList.add("is-visible"));
    }

    /* 4. Project carousel ------------------------------------------------ */
    const carousel = $(".carousel");
    if (carousel) {
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

        // Swipe on touch screens
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
    }

    /* 5. Pointer effects (desktop mouse only, off for reduced motion) ---- */
    if (finePointer && !reduceMotion) {
        // 5a. Card spotlight
        $$(".card").forEach((card) => {
            card.addEventListener("pointermove", (event) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
                card.style.setProperty("--my", `${event.clientY - rect.top}px`);
            });
        });

        // 5b. 3D tilt on screenshots
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

        // 5c. Magnetic buttons
        $$("[data-magnetic]").forEach((el) => {
            el.addEventListener("pointermove", (event) => {
                const rect = el.getBoundingClientRect();
                const x = event.clientX - (rect.left + rect.width / 2);
                const y = event.clientY - (rect.top + rect.height / 2);
                el.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
            });
            el.addEventListener("pointerleave", () => { el.style.transform = ""; });
        });

        // 5d. Cursor ring + hero light, both eased in one animation loop
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
    }

    /* 6. Contact form: validates, then sends through the mail service ---- */
    const form = $("#contact-form");
    if (form) {
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
    }
})();