(function () {
    const views = [...document.querySelectorAll("[data-app-view]")];
    if (!views.length) return;

    const validViews = new Set(views.map(view => view.dataset.appView));
    const titles = {
        home: "BYTEFEST 2026 | Invictus Tech Club",
        events: "Events | BYTEFEST 2026",
        details: "Event Details | BYTEFEST 2026",
        register: "Register | BYTEFEST 2026",
        groups: "Join Groups | BYTEFEST 2026",
        "my-registration": "My Registration | BYTEFEST 2026",
        "admin-login": "Admin Login | BYTEFEST 2026",
        "admin-dashboard": "Registration Dashboard | BYTEFEST 2026"
    };

    // Keep only the GitHub Pages repository root in the address bar.
    const rootPath = window.location.pathname.replace(/[^/]*$/, "");
    let currentView = "home";

    function closeMobileMenu() {
        const navigation = document.querySelector("[data-site-nav]");
        const button = document.querySelector("[data-menu-toggle]");
        navigation?.classList.remove("is-open");
        button?.setAttribute("aria-expanded", "false");
    }

    function updateNavigation(viewName) {
        document.querySelectorAll("[data-nav-link]").forEach(link => {
            const match = link.dataset.navLink === viewName ||
                (viewName === "admin-dashboard" && link.dataset.navLink === "admin-login");
            if (match) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });
    }

    function showView(viewName, options = {}, historyMode = "push") {
        const nextView = validViews.has(viewName) ? viewName : "home";
        currentView = nextView;

        views.forEach(view => { view.hidden = view.dataset.appView !== nextView; });
        document.body.classList.toggle("admin-mode", nextView === "admin-dashboard");

        if (nextView === "register") {
            if (options.eventName) sessionStorage.setItem("bytefest_pending_event", options.eventName);
            else if (options.clearEvent) sessionStorage.removeItem("bytefest_pending_event");
        }
        if (options.registrationId) {
            sessionStorage.setItem("bytefest_active_registration_id", String(options.registrationId).trim().toUpperCase());
        }
        if (options.scrollTarget) sessionStorage.setItem("bytefest_pending_scroll", options.scrollTarget);

        updateNavigation(nextView);
        closeMobileMenu();
        document.title = titles[nextView] || titles.home;

        const state = {
            bytefestView: nextView,
            eventName: options.eventName || "",
            registrationId: options.registrationId || "",
            scrollTarget: options.scrollTarget || ""
        };

        if (historyMode === "replace") history.replaceState(state, "", rootPath);
        else if (historyMode === "push") history.pushState(state, "", rootPath);

        window.dispatchEvent(new CustomEvent("bytefest:viewchange", {
            detail: {
                view: nextView,
                eventName: options.eventName || sessionStorage.getItem("bytefest_pending_event") || "",
                registrationId: options.registrationId || sessionStorage.getItem("bytefest_active_registration_id") || "",
                scrollTarget: options.scrollTarget || sessionStorage.getItem("bytefest_pending_scroll") || ""
            }
        }));

        const pendingScroll = options.scrollTarget || (nextView === "details" ? sessionStorage.getItem("bytefest_pending_scroll") : "");
        if (pendingScroll) {
            sessionStorage.removeItem("bytefest_pending_scroll");
            requestAnimationFrame(() => document.getElementById(pendingScroll)?.scrollIntoView({ behavior: "smooth", block: "start" }));
        } else {
            window.scrollTo({ top: 0, behavior: historyMode === "replace" ? "auto" : "smooth" });
        }
    }

    document.addEventListener("click", event => {
        const link = event.target.closest("[data-page]");
        if (!link) return;
        event.preventDefault();
        showView(link.dataset.page, {
            eventName: link.dataset.event || "",
            registrationId: link.dataset.registrationId || "",
            scrollTarget: link.dataset.scrollTarget || "",
            clearEvent: link.dataset.page === "register" && !link.dataset.event
        });
    });

    window.addEventListener("popstate", event => {
        const state = event.state || {};
        showView(state.bytefestView || "home", state, "none");
    });

    window.ByteFestSPA = Object.freeze({
        open(viewName, options = {}) { showView(viewName, options, "push"); },
        replace(viewName, options = {}) { showView(viewName, options, "replace"); },
        getView() { return currentView; }
    });

    // Legacy redirect pages set bytefest_entry_view before returning here.
    const entryView = sessionStorage.getItem("bytefest_entry_view");
    const entryEvent = sessionStorage.getItem("bytefest_entry_event");
    const entryRegistration = sessionStorage.getItem("bytefest_entry_registration_id");
    const entryScroll = sessionStorage.getItem("bytefest_entry_scroll");
    sessionStorage.removeItem("bytefest_entry_view");
    sessionStorage.removeItem("bytefest_entry_event");
    sessionStorage.removeItem("bytefest_entry_registration_id");
    sessionStorage.removeItem("bytefest_entry_scroll");

    // history.state preserves the current section only on an actual refresh/back-forward.
    // A fresh visit to the clean root always starts on Home, so the logo/hero is visible.
    const initialState = history.state && validViews.has(history.state.bytefestView) ? history.state : null;
    const initialView = entryView && validViews.has(entryView) ? entryView : (initialState?.bytefestView || "home");
    const initialOptions = entryView ? {
        eventName: entryEvent || "",
        registrationId: entryRegistration || "",
        scrollTarget: entryScroll || ""
    } : (initialState || {});
    showView(initialView, initialOptions, "replace");
}());
