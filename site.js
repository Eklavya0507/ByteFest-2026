(function () {
    const menuButton = document.querySelector("[data-menu-toggle]");
    const navigation = document.querySelector("[data-site-nav]");

    if (menuButton && navigation) {
        menuButton.addEventListener("click", () => {
            const open = navigation.classList.toggle("is-open");
            menuButton.setAttribute("aria-expanded", String(open));
        });
    }

    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("[data-site-nav] a").forEach(link => {
        const target = link.getAttribute("href")?.split("?")[0].split("#")[0];

        if (target === currentPage) {
            link.setAttribute("aria-current", "page");
        }
    });

    const countdown = document.querySelector("[data-countdown]");

    if (!countdown) {
        return;
    }

    const target = new Date(window.BYTEFEST_CONFIG.EVENT_START).getTime();
    const status = countdown.querySelector("[data-countdown-status]");

    function setPart(name, value) {
        const element = countdown.querySelector(`[data-${name}]`);

        if (element) {
            element.textContent = String(value).padStart(2, "0");
        }
    }

    function updateCountdown() {
        const difference = target - Date.now();

        if (difference <= 0) {
            setPart("days", 0);
            setPart("hours", 0);
            setPart("minutes", 0);
            setPart("seconds", 0);
            status.textContent = "BYTEFEST 2026 is here!";
            return false;
        }

        const seconds = Math.floor(difference / 1000);
        setPart("days", Math.floor(seconds / 86400));
        setPart("hours", Math.floor((seconds % 86400) / 3600));
        setPart("minutes", Math.floor((seconds % 3600) / 60));
        setPart("seconds", seconds % 60);
        return true;
    }

    if (updateCountdown()) {
        const timer = window.setInterval(() => {
            if (!updateCountdown()) {
                window.clearInterval(timer);
            }
        }, 1000);
    }
}());
