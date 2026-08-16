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

    function safeGroupLink(value) {
        try {
            const url = new URL(value);
            return ["http:", "https:"].includes(url.protocol) ? url.href : "";
        } catch {
            return "";
        }
    }

    function statusClass(status) {
        return String(status || "NOT_ATTEMPTED").toLowerCase();
    }

    function renderRegistration(data, email) {
        const participant = data.participant || {};
        const payment = data.payment || {};
        const members = Array.isArray(data.members) ? data.members : [];
        const paid = payment.status === "PAID";
        const groupLink = safeGroupLink(data.groupLink);
        const communityLink = safeGroupLink(data.communityLink);
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
                    <div class="result-item"><small>Lead participant</small><b>${escapeHtml(participant.name)}</b></div>
                    <div class="result-item"><small>Email</small><b>${escapeHtml(participant.email)}</b></div>
                    <div class="result-item"><small>Phone</small><b>+91 ${escapeHtml(participant.phone)}</b></div>
                    <div class="result-item"><small>Department</small><b>${escapeHtml(participant.department)}</b></div>
                    <div class="result-item"><small>Year</small><b>${escapeHtml(participant.year)}</b></div>
                    ${memberHtml}
                    <div class="result-item"><small>Payment amount</small><b>₹${escapeHtml(payment.amount || 150)}</b></div>
                    <div class="result-item"><small>Proof submitted</small><b>${payment.proofSubmitted ? "Yes · " + escapeHtml(formatDate(payment.submittedAt)) : "Not yet"}</b></div>
                </div>
                ${paid ? `
                    <div class="notice notice-success is-visible">
                        <h3>Your registration is confirmed.</h3>
                        <p>Approval email: <span class="status-badge status-${statusClass(payment.emailNotification)}">${escapeHtml(payment.emailNotification || "NOT_ATTEMPTED")}</span>
                        &nbsp; SMS: <span class="status-badge status-${statusClass(payment.smsNotification)}">${escapeHtml(payment.smsNotification || "NOT_ATTEMPTED")}</span></p>
                        <div class="actions">
                            ${groupLink ? `<a class="btn btn-primary" href="${escapeHtml(groupLink)}" target="_blank" rel="noopener noreferrer">Join ${escapeHtml(data.event)} group →</a>` : ""}
                            ${communityLink ? `<a class="btn btn-success" href="${escapeHtml(communityLink)}" target="_blank" rel="noopener noreferrer">Join BYTEFEST Community →</a>` : ""}
                        </div>
                        ${!groupLink || !communityLink ? "<p>One or more invite links are not configured. Please contact the organizers.</p>" : ""}
                    </div>
                ` : `
                    <div class="notice is-visible">
                        <h3>Admin verification is pending.</h3>
                        <p>${payment.proofSubmitted ? "Your UTR and screenshot were received. Please wait for the admin to check them." : "Payment proof has not been submitted yet."}</p>
                        <a class="btn btn-primary" href="payment.html?registrationId=${encodeURIComponent(data.registrationId)}">${payment.proofSubmitted ? "Update payment proof" : "Submit payment proof"} →</a>
                    </div>
                `}
            </article>
        `;

        sessionStorage.setItem(`bytefest_payment_email_${data.registrationId}`, email);
    }

    async function readJson(response) {
        const text = await response.text();

        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return {};
        }
    }

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
