(function () {
    const form = document.getElementById("lookupForm");
    if (!form) return;

    const idInput = document.getElementById("lookupId");
    const emailInput = document.getElementById("lookupEmail");
    const statusBox = document.getElementById("lookupStatus");
    const resultBox = document.getElementById("lookupResult");
    const submitButton = document.getElementById("lookupButton");

    idInput.value = sessionStorage.getItem("bytefest_last_registration_id") || "";
    emailInput.value = sessionStorage.getItem("bytefest_last_registration_email") || "";

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
        } catch { return ""; }
    }

    function showStatus(message, type = "") {
        statusBox.textContent = message;
        statusBox.className = `form-status is-visible${type ? ` is-${type}` : ""}`;
    }

    function clearStatus() {
        statusBox.textContent = "";
        statusBox.className = "form-status";
    }

    function renderRegistration(data, email) {
        const participant = data.participant || {};
        const members = Array.isArray(data.members) ? data.members : [];
        const groupLink = safeUrl(data.groupLink);
        const communityLink = safeUrl(data.communityLink);
        const emailStatus = data.notifications?.email || data.payment?.emailNotification || "NOT_ATTEMPTED";
        const smsStatus = data.notifications?.sms || data.payment?.smsNotification || "NOT_ATTEMPTED";

        const memberHtml = members.length
            ? members.map((member, index) => `
                <div class="result-item"><small>Member ${index + 2}</small><b>${escapeHtml(member.name)}</b><br><span class="muted">${escapeHtml(member.email)} · +91 ${escapeHtml(member.phone)}</span></div>
            `).join("")
            : "";

        resultBox.innerHTML = `
            <article class="result-card">
                <div class="result-head">
                    <div><p class="eyebrow">REGISTRATION FOUND</p><h3>${escapeHtml(data.registrationId)}</h3></div>
                    <span class="status-badge status-paid">CONFIRMED</span>
                </div>
                <div class="result-grid">
                    <div class="result-item"><small>Event</small><b>${escapeHtml(data.event)}</b></div>
                    ${data.event !== "Checkmate" ? `<div class="result-item"><small>Team name</small><b>${escapeHtml(data.teamName || "Not set")}</b></div>` : ""}
                    <div class="result-item"><small>Lead participant</small><b>${escapeHtml(participant.name)}</b></div>
                    <div class="result-item"><small>Email</small><b>${escapeHtml(participant.email)}</b></div>
                    <div class="result-item"><small>Phone</small><b>+91 ${escapeHtml(participant.phone)}</b></div>
                    <div class="result-item"><small>Department</small><b>${escapeHtml(participant.department)}</b></div>
                    <div class="result-item"><small>Year</small><b>${escapeHtml(participant.year)}</b></div>
                    ${memberHtml}
                    <div class="result-item"><small>Registration fee</small><b>NO REGISTRATION FEE</b></div>
                    <div class="result-item"><small>Email notification</small><b>${escapeHtml(emailStatus)}</b></div>
                    <div class="result-item"><small>SMS notification</small><b>${escapeHtml(smsStatus)}</b></div>
                </div>
                <div class="notice notice-success is-visible">
                    <h3>Your registration is confirmed.</h3>
                    <p>Use the official links below to join your registered event group and the BYTEFEST Community.</p>
                    <div class="actions">
                        ${groupLink ? `<a class="btn btn-primary" href="${escapeHtml(groupLink)}" target="_blank" rel="noopener noreferrer">Join ${escapeHtml(data.event)} Group →</a>` : '<span class="btn" aria-disabled="true">Event group link not configured</span>'}
                        ${communityLink ? `<a class="btn" href="${escapeHtml(communityLink)}" target="_blank" rel="noopener noreferrer">Join BYTEFEST Community →</a>` : '<span class="btn" aria-disabled="true">Community link not configured</span>'}
                    </div>
                </div>
            </article>
        `;

        sessionStorage.setItem("bytefest_active_registration_id", data.registrationId);
        sessionStorage.setItem("bytefest_last_registration_id", data.registrationId);
        sessionStorage.setItem("bytefest_last_registration_email", email);
    }

    async function readJson(response) {
        const text = await response.text();
        try { return text ? JSON.parse(text) : {}; }
        catch { return {}; }
    }

    window.addEventListener("bytefest:viewchange", event => {
        if (event.detail?.view !== "my-registration") return;
        if (!idInput.value) idInput.value = sessionStorage.getItem("bytefest_last_registration_id") || "";
        if (!emailInput.value) emailInput.value = sessionStorage.getItem("bytefest_last_registration_email") || "";
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        clearStatus();
        resultBox.replaceChildren();

        if (!form.reportValidity()) {
            showStatus("Enter your registration ID and email.", "error");
            return;
        }

        const registrationId = idInput.value.trim().toUpperCase();
        const email = emailInput.value.trim().toLowerCase();
        submitButton.disabled = true;
        submitButton.textContent = "Checking...";
        showStatus("Checking your registration...");

        try {
            const response = await fetch(`${window.BYTEFEST_CONFIG.API_URL}/api/registrations/lookup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ registrationId, email })
            });
            const data = await readJson(response);
            if (!response.ok) throw new Error(data.message || `Lookup failed (HTTP ${response.status})`);

            clearStatus();
            renderRegistration(data, email);
        } catch (error) {
            console.error(error);
            showStatus(error.message || "Could not check registration.", "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Check registration →";
        }
    });
}());
