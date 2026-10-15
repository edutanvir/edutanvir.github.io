
document.addEventListener("DOMContentLoaded", () => {
    // Project carousel
    const carousel = document.querySelector(".project-carousel");

    if (carousel) {
        const slides = Array.from(
            carousel.querySelectorAll(".project-slide")
        );

        const dots = Array.from(
            carousel.querySelectorAll(".carousel-dot")
        );

        const counter = carousel.querySelector(".carousel-counter");
        const arrows = carousel.querySelectorAll(".carousel-arrow");

        let currentIndex = 0;

        function showSlide(index) {
            if (!slides.length) return;

            currentIndex = (index + slides.length) % slides.length;

            slides.forEach((slide, i) => {
                const active = i === currentIndex;

                slide.hidden = !active;
                slide.classList.toggle("active", active);
                slide.setAttribute("aria-hidden", String(!active));
            });

            dots.forEach((dot, i) => {
                const active = i === currentIndex;

                dot.classList.toggle("active", active);

                if (active) {
                    dot.setAttribute("aria-current", "true");
                } else {
                    dot.removeAttribute("aria-current");
                }
            });

            if (counter) {
                counter.textContent =
                    `${String(currentIndex + 1).padStart(2, "0")} / ` +
                    `${String(slides.length).padStart(2, "0")}`;
            }
        }

        arrows.forEach((button) => {
            button.addEventListener("click", () => {
                showSlide(currentIndex + Number(button.dataset.direction));
            });
        });

        dots.forEach((dot) => {
            dot.addEventListener("click", () => {
                showSlide(Number(dot.dataset.goTo));
            });
        });

        showSlide(0);
    }

    // Mouse-following image
    const hasFinePointer = window.matchMedia(
        "(hover: hover) and (pointer: fine)"
    ).matches;

    if (hasFinePointer) {
        const follower = document.createElement("img");

        follower.src = "images/cursor.png";
        follower.alt = "";
        follower.className = "cursor-follower";
        follower.setAttribute("aria-hidden", "true");

        follower.addEventListener("error", () => {
            follower.remove();
            console.warn("Could not load images/cursor.jpg");
        });

        document.body.appendChild(follower);

        document.addEventListener("mousemove", (event) => {
            follower.style.left = `${event.clientX}px`;
            follower.style.top = `${event.clientY}px`;
            follower.classList.add("is-visible");
        });

        document.documentElement.addEventListener("mouseleave", () => {
            follower.classList.remove("is-visible");
        });

        document.documentElement.addEventListener("mouseenter", () => {
            follower.classList.add("is-visible");
        });

        document.querySelectorAll("a, button").forEach((element) => {
            element.addEventListener("mouseenter", () => {
                follower.classList.add("is-hovering");
            });

            element.addEventListener("mouseleave", () => {
                follower.classList.remove("is-hovering");
            });
        });
    }
});
