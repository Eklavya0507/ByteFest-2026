(function () {
    const form = document.getElementById("lookupForm");

    if (!form) {
        return;
    }

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

    function showStatus(message, type = "") {
        statusBox.textContent = message;
        statusBox.className = `form-status is-visible${type ? ` is-${type}` : ""}`;
    }

    function clearStatus() {
        statusBox.textContent = "";
        statusBox.className = "form-status";
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        return new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Kolkata"
        }).format(new Date(value));
    }

    function feeForEvent(eventName) {
        return Number(window.BYTEFEST_CONFIG?.EVENT_FEES?.[eventName] ?? window.BYTEFEST_CONFIG?.REGISTRATION_FEE ?? 150);
    }

    function renderRegistration(data, email) {
        const participant = data.participant || {};
        const payment = data.payment || {};
        const members = Array.isArray(data.members) ? data.members : [];
        const paid = payment.status === "PAID";
        const memberHtml = members.length
            ? members.map((member, index) => `
                <div class="result-item"><small>Member ${index + 2}</small><b>${escapeHtml(member.name)}</b><br><span class="muted">${escapeHtml(member.email)} · +91 ${escapeHtml(member.phone)}</span></div>
            `).join("")
            : "";

        resultBox.innerHTML = `
            <article class="result-card">
                <div class="result-head">
                    <div><p class="eyebrow">REGISTRATION FOUND</p><h3>${escapeHtml(data.registrationId)}</h3></div>
                    <span class="status-badge ${paid ? "status-paid" : "status-pending"}">${paid ? "PAID · CONFIRMED" : "PENDING REVIEW"}</span>
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
                    <div class="result-item"><small>Payment amount</small><b>₹${escapeHtml(payment.amount || feeForEvent(data.event))}</b></div>
                    <div class="result-item"><small>Proof submitted</small><b>${payment.proofSubmitted ? "Yes · " + escapeHtml(formatDate(payment.submittedAt)) : "Not yet"}</b></div>
                </div>
                ${paid ? `
                    <div class="notice notice-success is-visible">
                        <h3>Your registration is confirmed.</h3>
                        <p>Please check your email and SMS for your event group and BYTEFEST Community links.</p>
                    </div>
                ` : `
                    <div class="notice is-visible">
                        <h3>Admin verification is pending.</h3>
                        <p>${payment.proofSubmitted
                            ? "Please wait for admin approval and check your email."
                            : "Payment proof has not been submitted yet."}</p>
                        ${!payment.proofSubmitted ? `
                            <a class="btn btn-primary" href="./" data-page="payment" data-registration-id="${escapeHtml(data.registrationId)}">Submit payment proof →</a>
                        ` : ""}
                    </div>
                `}
            </article>
        `;

        sessionStorage.setItem(`bytefest_payment_email_${data.registrationId}`, email);
        sessionStorage.setItem("bytefest_active_registration_id", data.registrationId);
    }

    async function readJson(response) {
        const text = await response.text();

        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return {};
        }
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

            if (!response.ok) {
                throw new Error(data.message || `Lookup failed (HTTP ${response.status})`);
            }

            sessionStorage.setItem("bytefest_last_registration_id", registrationId);
            sessionStorage.setItem("bytefest_last_registration_email", email);
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
