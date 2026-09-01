(function () {
    const view = document.querySelector('[data-app-view="groups"]');
    if (!view) return;

    const statusBox = document.getElementById("groupJoinStatus");
    const contentBox = document.getElementById("groupJoinContent");

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function safeUrl(value) {
        try {
            const url = new URL(String(value || "").trim());
            return ["http:", "https:"].includes(url.protocol) ? url.href : "";
        } catch {
            return "";
        }
    }

    function showStatus(message, type = "") {
        statusBox.textContent = message;
        statusBox.className = `form-status is-visible${type ? ` is-${type}` : ""}`;
    }

    function clearStatus() {
        statusBox.textContent = "";
        statusBox.className = "form-status";
    }

    async function readJson(response) {
        const text = await response.text();
        try { return text ? JSON.parse(text) : {}; }
        catch { return {}; }
    }

    function render(data) {
        const groupLink = safeUrl(data.groupLink);
        const communityLink = safeUrl(data.communityLink);
        const teamLine = data.event !== "Checkmate" && data.teamName
            ? `<div class="result-item"><small>Team</small><b>${escapeHtml(data.teamName)}</b></div>`
            : "";

        contentBox.innerHTML = `
            <article class="result-card group-success-card">
                <div class="result-head">
                    <div><p class="eyebrow">REGISTRATION SUCCESSFUL</p><h3>${escapeHtml(data.registrationId)}</h3></div>
                    <span class="status-badge status-paid">CONFIRMED</span>
                </div>
                <div class="result-grid">
                    <div class="result-item"><small>Event</small><b>${escapeHtml(data.event || "BYTEFEST 2026")}</b></div>
                    ${teamLine}
                    <div class="result-item"><small>Registration fee</small><b>NO REGISTRATION FEE</b></div>
                    <div class="result-item"><small>Event date</small><b>Friday, 4 September 2026</b></div>
                </div>
                <div class="notice notice-success is-visible instant-group-box" style="margin-top:20px">
                    <p class="eyebrow">YOUR NEXT STEP</p>
                    <h3>Join your official event group</h3>
                    <p>Your registration is complete. Use the button below and you are done.</p>
                    <div class="actions">
                        ${groupLink
                            ? `<a class="btn btn-primary instant-join-button" href="${escapeHtml(groupLink)}" target="_blank" rel="noopener noreferrer">Join ${escapeHtml(data.event || "Official")} Group →</a>`
                            : '<span class="btn" aria-disabled="true">Event group link unavailable</span>'}
                        ${communityLink
                            ? `<a class="btn" href="${escapeHtml(communityLink)}" target="_blank" rel="noopener noreferrer">Join BYTEFEST WhatsApp Community</a>`
                            : ""}
                    </div>
                </div>
                <div class="payment-warning"><b>Reporting:</b> 9:50 AM · <b>Event Start:</b> 10:00 AM · EPCET B Block Seminar Hall.</div>
                <div class="actions"><a class="btn" data-page="my-registration" href="./">My Registration</a><a class="btn" data-page="home" href="./">Return Home</a></div>
            </article>
        `;
    }

    function cachedRegistration(id) {
        const groupLink = safeUrl(sessionStorage.getItem(`bytefest_group_link_${id}`));
        if (!groupLink) return null;

        return {
            registrationId: id,
            event: sessionStorage.getItem("bytefest_last_registration_event") || "",
            teamName: sessionStorage.getItem("bytefest_last_registration_team") || "",
            groupLink,
            communityLink: safeUrl(sessionStorage.getItem(`bytefest_community_link_${id}`))
        };
    }

    async function lookup(id, email) {
        const response = await fetch(`${window.BYTEFEST_CONFIG.API_URL}/api/registrations/lookup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ registrationId: id, email })
        });
        const data = await readJson(response);
        if (!response.ok) throw new Error(data.message || `Could not load registration (HTTP ${response.status})`);
        return data;
    }

    async function load(registrationId) {
        const id = String(
            registrationId ||
            sessionStorage.getItem("bytefest_active_registration_id") ||
            sessionStorage.getItem("bytefest_last_registration_id") ||
            ""
        ).trim().toUpperCase();
        const email = String(sessionStorage.getItem("bytefest_last_registration_email") || "").trim().toLowerCase();

        if (!id) {
            showStatus("Registration ID is missing. Use My Registration to recover your group link.", "error");
            contentBox.innerHTML = '<div class="actions"><a class="btn btn-primary" href="./" data-page="my-registration">Open My Registration →</a></div>';
            return;
        }

        // The POST /registrations response already contains the group link. Render it
        // immediately with no second request, exactly after the form is submitted.
        const cached = cachedRegistration(id);
        if (cached) {
            clearStatus();
            render(cached);
            return;
        }

        if (!email) {
            showStatus("Registration email is missing. Use My Registration to recover your group link.", "error");
            return;
        }

        showStatus("Loading your official group link...");
        try {
            const data = await lookup(id, email);
            if (data.groupLink) sessionStorage.setItem(`bytefest_group_link_${id}`, data.groupLink);
            if (data.communityLink) sessionStorage.setItem(`bytefest_community_link_${id}`, data.communityLink);
            sessionStorage.setItem("bytefest_last_registration_event", data.event || "");
            sessionStorage.setItem("bytefest_last_registration_team", data.teamName || "");
            sessionStorage.setItem("bytefest_active_registration_id", id);
            clearStatus();
            render(data);
        } catch (error) {
            console.error(error);
            showStatus(error.message || "Could not load group link.", "error");
        }
    }

    window.addEventListener("bytefest:viewchange", event => {
        if (event.detail?.view === "groups") load(event.detail.registrationId);
    });

    if (window.ByteFestSPA?.getView?.() === "groups") load();
}());
