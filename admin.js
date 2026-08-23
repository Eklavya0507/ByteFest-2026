(function () {
    const API_URL = window.BYTEFEST_CONFIG?.API_URL || "https://byte-fest-backend.onrender.com";
    const TOKEN_KEY = "bytefest_admin_token";
    const EMAIL_KEY = "bytefest_admin_email";
    let registrations = [];
    let visibleRegistrations = [];
    let toastTimer = 0;

    function token() {
        return sessionStorage.getItem(TOKEN_KEY) || "";
    }

    function clearSession() {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(EMAIL_KEY);
        sessionStorage.removeItem("bytefest_admin");
        sessionStorage.removeItem("bytefest_admin_email");
    }

    function openAdminView(view) {
        if (window.ByteFestSPA) {
            window.ByteFestSPA.open(view);
        } else {
            window.location.replace("./");
        }
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        try {
            return new Intl.DateTimeFormat("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Kolkata"
            }).format(new Date(value));
        } catch {
            return "—";
        }
    }

    async function readJson(response) {
        const text = await response.text();

        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return {};
        }
    }

    async function apiRequest(path, options = {}, authenticated = false) {
        const headers = {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        };

        if (authenticated) {
            headers.Authorization = `Bearer ${token()}`;
        }

        const response = await fetch(`${API_URL}${path}`, { ...options, headers });
        const data = await readJson(response);

        if (authenticated && (response.status === 401 || response.status === 403)) {
            clearSession();
            openAdminView("admin-login");
            throw new Error("Admin session expired");
        }

        if (!response.ok) {
            throw new Error(data.message || `Request failed (HTTP ${response.status})`);
        }

        return data;
    }

    function showFormStatus(element, message, type = "") {
        if (!element) {
            return;
        }

        element.textContent = message;
        element.className = `form-status is-visible${type ? ` is-${type}` : ""}`;
    }

    function clearFormStatus(element) {
        if (!element) {
            return;
        }

        element.textContent = "";
        element.className = "form-status";
    }

    function showToast(message) {
        const toast = document.getElementById("adminToast");

        if (!toast) {
            return;
        }

        window.clearTimeout(toastTimer);
        toast.textContent = message;
        toast.classList.add("is-visible");
        toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 12000);
    }

    function statusBadge(status) {
        const safeStatus = String(status || "NOT_ATTEMPTED").toUpperCase();
        return `<span class="status-badge status-${safeStatus.toLowerCase()}">${escapeHtml(safeStatus)}</span>`;
    }

    function deliverySummary(label, delivery) {
        const status = delivery?.status || "NOT_ATTEMPTED";
        const detail = delivery?.error ? ` — ${delivery.error}` : "";
        return `${label}: ${status}${detail}`;
    }

    let loginInitialized = false;
    let dashboardInitialized = false;

    function initializeLogin() {
        const form = document.getElementById("adminLoginForm");

        if (!form) {
            return false;
        }

        // Login and dashboard now coexist in one SPA document.

        if (loginInitialized) return true;
        loginInitialized = true;

        const statusBox = document.getElementById("adminLoginStatus");
        const button = document.getElementById("adminLoginButton");

        form.addEventListener("submit", async event => {
            event.preventDefault();
            clearFormStatus(statusBox);

            if (!form.reportValidity()) {
                showFormStatus(statusBox, "Enter the approved email and admin password.", "error");
                return;
            }

            const email = document.getElementById("adminEmail").value.trim().toLowerCase();
            const password = document.getElementById("adminPassword").value;
            button.disabled = true;
            button.textContent = "Checking access...";
            showFormStatus(statusBox, "Connecting to the protected admin API...");

            try {
                const data = await apiRequest("/api/admin/check", {
                    method: "POST",
                    body: JSON.stringify({ email, password })
                });

                if (!data.allowed || !data.token) {
                    throw new Error("Admin authorization failed");
                }

                sessionStorage.setItem(TOKEN_KEY, data.token);
                sessionStorage.setItem(EMAIL_KEY, data.email || email);
                showFormStatus(statusBox, "Login successful. Opening dashboard...", "success");
                window.setTimeout(() => openAdminView("admin-dashboard"), 450);
            } catch (error) {
                console.error(error);
                showFormStatus(statusBox, error.message || "Admin login failed.", "error");
                button.disabled = false;
                button.textContent = "Open admin dashboard →";
            }
        });

        return true;
    }

    function paymentProofSubmitted(registration) {
        return Boolean(registration.payment?.utr);
    }

    function updateStatistics() {
        const pending = registrations.filter(item => item.payment?.status !== "PAID").length;
        const paid = registrations.filter(item => item.payment?.status === "PAID").length;
        const proof = registrations.filter(item => item.payment?.status !== "PAID" && paymentProofSubmitted(item)).length;
        document.getElementById("totalCount").textContent = registrations.length;
        document.getElementById("pendingCount").textContent = pending;
        document.getElementById("proofCount").textContent = proof;
        document.getElementById("paidCount").textContent = paid;
    }

    function applyFilters() {
        const search = document.getElementById("searchInput").value.trim().toLowerCase();
        const event = document.getElementById("eventFilter").value;
        const payment = document.getElementById("paymentFilter").value;

        visibleRegistrations = registrations.filter(item => {
            const participant = item.participant || {};
            const members = Array.isArray(item.members) ? item.members : [];
            const haystack = [
                item.registrationId,
                item.event,
                item.teamName,
                participant.name,
                participant.email,
                participant.phone,
                participant.department,
                participant.year,
                item.payment?.utr,
                ...members.flatMap(member => [member.name, member.email, member.phone])
            ].join(" ").toLowerCase();
            const matchesSearch = !search || haystack.includes(search);
            const matchesEvent = !event || item.event === event;
            let matchesPayment = !payment || item.payment?.status === payment;

            if (payment === "PROOF") {
                matchesPayment = item.payment?.status !== "PAID" && paymentProofSubmitted(item);
            }

            return matchesSearch && matchesEvent && matchesPayment;
        });

        renderRows();
    }

    function renderRows() {
        const body = document.getElementById("registrationRows");

        if (!visibleRegistrations.length) {
            body.innerHTML = '<tr><td class="empty-state" colspan="7">No registrations match the current filters.</td></tr>';
            return;
        }

        body.innerHTML = visibleRegistrations.map(item => {
            const participant = item.participant || {};
            const payment = item.payment || {};
            const paid = payment.status === "PAID";
            const proof = paymentProofSubmitted(item);
            const emailStatus = payment.emailNotification?.status || "NOT_ATTEMPTED";
            const smsStatus = payment.smsNotification?.status || "NOT_ATTEMPTED";
            const notificationIncomplete = paid && (emailStatus !== "SENT" || smsStatus !== "SENT");
            const teamSize = 1 + (Array.isArray(item.members) ? item.members.length : 0);

            return `
                <tr>
                    <td><span class="cell-title">${escapeHtml(item.registrationId)}</span><span class="cell-subtitle">${escapeHtml(formatDate(item.createdAt))}</span></td>
                    <td><span class="cell-title">${escapeHtml(item.event)}</span><span class="cell-subtitle">${item.event === "Checkmate" ? "Individual" : item.teamName ? `${escapeHtml(item.teamName)} · ${teamSize} participant${teamSize === 1 ? "" : "s"}` : `TEAM NAME NOT SET · ${teamSize} participant${teamSize === 1 ? "" : "s"}`}</span></td>
                    <td><span class="cell-title">${escapeHtml(participant.name)}</span><span class="cell-subtitle">${escapeHtml(participant.email)}<br>+91 ${escapeHtml(participant.phone)}</span></td>
                    <td>${statusBadge(paid ? "PAID" : "PENDING")}<span class="cell-subtitle">₹${escapeHtml(payment.amount || 150)}${payment.approvedAt ? `<br>${escapeHtml(formatDate(payment.approvedAt))}` : ""}</span></td>
                    <td>${proof ? statusBadge("SUBMITTED") : statusBadge("NOT_ATTEMPTED")}<span class="cell-subtitle">${proof ? `UTR: ${escapeHtml(payment.utr)}` : "Waiting for participant"}</span></td>
                    <td><div class="notification-stack"><span>Email ${statusBadge(emailStatus)}</span><span>SMS ${statusBadge(smsStatus)}</span></div></td>
                    <td><div class="admin-actions"><button class="btn btn-small" type="button" data-view="${escapeHtml(item.registrationId)}">View</button>${item.event !== "Checkmate" ? `<button class="btn btn-small" type="button" data-team-name="${escapeHtml(item.registrationId)}">${item.teamName ? "Edit team" : "Set team"}</button>` : ""}${!paid && proof ? `<button class="btn btn-small btn-success" type="button" data-approve="${escapeHtml(item.registrationId)}">Approve</button>` : ""}${notificationIncomplete ? `<button class="btn btn-small btn-success" type="button" data-notify="${escapeHtml(item.registrationId)}">Retry notify</button>` : ""}</div></td>
                </tr>
            `;
        }).join("");
    }

    async function loadRegistrations() {
        const statusBox = document.getElementById("dashboardStatus");
        const refreshButton = document.getElementById("refreshButton");
        refreshButton.disabled = true;
        showFormStatus(statusBox, "Loading registrations from MongoDB...");

        try {
            const data = await apiRequest("/api/admin/registrations", {}, true);
            registrations = Array.isArray(data) ? data : [];
            updateStatistics();
            applyFilters();
            clearFormStatus(statusBox);
        } catch (error) {
            console.error(error);
            showFormStatus(statusBox, error.message || "Could not load registrations.", "error");
        } finally {
            refreshButton.disabled = false;
        }
    }

    function findRegistration(registrationId) {
        return registrations.find(item => item.registrationId === registrationId);
    }

    function openModal(registrationId) {
        const registration = findRegistration(registrationId);

        if (!registration) {
            showToast("Registration was not found in the current dashboard data.");
            return;
        }

        const participant = registration.participant || {};
        const payment = registration.payment || {};
        const members = Array.isArray(registration.members) ? registration.members : [];
        const paid = payment.status === "PAID";
        const emailStatus = payment.emailNotification?.status || "NOT_ATTEMPTED";
        const smsStatus = payment.smsNotification?.status || "NOT_ATTEMPTED";
        const notificationIncomplete = paid && (emailStatus !== "SENT" || smsStatus !== "SENT");
        const modal = document.getElementById("detailsModal");
        const body = document.getElementById("modalBody");
        modal.dataset.registrationId = registration.registrationId;
        document.getElementById("modalTitle").textContent = registration.registrationId;

        body.innerHTML = `
            <div class="result-grid">
                <div class="result-item"><small>Event</small><b>${escapeHtml(registration.event)}</b></div>
                ${registration.event !== "Checkmate" ? `<div class="result-item"><small>Team name</small><b>${registration.teamName ? escapeHtml(registration.teamName) : "NOT SET"}</b><br><button class="btn btn-small" style="margin-top:10px" type="button" data-team-name="${escapeHtml(registration.registrationId)}">${registration.teamName ? "Edit team name" : "Set team name"}</button></div>` : ""}
                <div class="result-item"><small>Status</small>${statusBadge(paid ? "PAID" : "PENDING")}</div>
                <div class="result-item"><small>Lead participant</small><b>${escapeHtml(participant.name)}</b></div>
                <div class="result-item"><small>Email</small><b>${escapeHtml(participant.email)}</b></div>
                <div class="result-item"><small>Phone</small><b>+91 ${escapeHtml(participant.phone)}</b></div>
                <div class="result-item"><small>Department / year</small><b>${escapeHtml(participant.department)} · ${escapeHtml(participant.year)}</b></div>
                ${members.map((member, index) => `<div class="result-item"><small>Member ${index + 2}</small><b>${escapeHtml(member.name)}</b><br><span class="muted">${escapeHtml(member.email)} · +91 ${escapeHtml(member.phone)}</span></div>`).join("")}
                <div class="result-item"><small>Registered</small><b>${escapeHtml(formatDate(registration.createdAt))}</b></div>
                <div class="result-item"><small>Approved</small><b>${escapeHtml(formatDate(payment.approvedAt))}</b></div>
                <div class="result-item"><small>${escapeHtml(registration.event)} group link</small><b>${escapeHtml(registration.groupLink || "Not configured")}</b></div>
                <div class="result-item"><small>BYTEFEST Community link</small><b>${escapeHtml(registration.communityLink || "Not configured")}</b></div>
                <div class="result-item"><small>Email notification</small>${statusBadge(payment.emailNotification?.status || "NOT_ATTEMPTED")}<br><span class="muted">${escapeHtml(payment.emailNotification?.error || payment.emailNotification?.messageId || "")}</span></div>
                <div class="result-item"><small>SMS notification</small>${statusBadge(payment.smsNotification?.status || "NOT_ATTEMPTED")}<br><span class="muted">${escapeHtml(payment.smsNotification?.error || payment.smsNotification?.messageId || "")}</span></div>
            </div>
            <div class="detail-card" style="margin-top:20px">
                <div class="detail-card-header"><h3>Payment proof</h3><span class="detail-badge">₹${escapeHtml(payment.amount || 150)}</span></div>
                <p id="proofLoading" class="muted">Loading protected UTR and screenshot...</p>
                <div id="proofContent"></div>
            </div>
            ${!paid ? `<div class="actions"><button class="btn btn-primary" type="button" data-approve="${escapeHtml(registration.registrationId)}">Approve payment & notify participant</button></div>` : ""}
            ${notificationIncomplete ? `<div class="actions"><button class="btn btn-success" type="button" data-notify="${escapeHtml(registration.registrationId)}">Retry failed email / SMS</button></div>` : ""}
        `;

        modal.classList.add("is-open");
        document.body.classList.add("modal-open");
        loadPaymentProof(registration.registrationId);
    }

    async function loadPaymentProof(registrationId) {
        const loading = document.getElementById("proofLoading");
        const content = document.getElementById("proofContent");

        try {
            const proof = await apiRequest(`/api/admin/registrations/${encodeURIComponent(registrationId)}/payment-proof`, {}, true);

            if (document.getElementById("detailsModal")?.dataset.registrationId !== registrationId) {
                return;
            }

            loading.remove();

            const utr = document.createElement("p");
            utr.innerHTML = `<b>UTR:</b> ${escapeHtml(proof.utr || "Not submitted")}`;
            content.appendChild(utr);

            if (/^data:image\/(jpeg|jpg|png|webp);base64,/.test(proof.screenshot || "")) {
                const image = document.createElement("img");
                image.className = "proof-image";
                image.alt = `Payment screenshot for ${registrationId}`;
                image.src = proof.screenshot;
                content.appendChild(image);
            } else {
                const missing = document.createElement("p");
                missing.className = "notice notice-error is-visible";
                missing.textContent = "Payment screenshot has not been submitted.";
                content.appendChild(missing);
            }
        } catch (error) {
            console.error(error);
            loading.textContent = error.message || "Could not load payment proof.";
        }
    }

    function closeModal() {
        document.getElementById("detailsModal")?.classList.remove("is-open");
        document.body.classList.remove("modal-open");
    }

    async function updateTeamName(registrationId) {
        const registration = findRegistration(registrationId);

        if (!registration || registration.event === "Checkmate") {
            return;
        }

        const currentName = String(registration.teamName || "");
        const entered = window.prompt(
            currentName ? `Edit team name for ${registrationId}:` : `Set team name for ${registrationId}:`,
            currentName
        );

        if (entered === null) {
            return;
        }

        const teamName = entered.trim();
        if (teamName.length < 2 || teamName.length > 60) {
            showToast("Team name must be between 2 and 60 characters.");
            return;
        }

        document.querySelectorAll(`[data-team-name="${CSS.escape(registrationId)}"]`).forEach(button => {
            button.disabled = true;
            button.textContent = "Saving...";
        });

        try {
            const data = await apiRequest(
                `/api/admin/registrations/${encodeURIComponent(registrationId)}/team-name`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ teamName })
                },
                true
            );

            showToast(`Team name saved: ${data.registration?.teamName || teamName}`);
            closeModal();
            await loadRegistrations();
        } catch (error) {
            console.error(error);
            showToast(error.message || "Could not update team name.");
            document.querySelectorAll(`[data-team-name="${CSS.escape(registrationId)}"]`).forEach(button => {
                button.disabled = false;
                button.textContent = currentName ? "Edit team" : "Set team";
            });
        }
    }

    async function approveRegistration(registrationId) {
        const registration = findRegistration(registrationId);

        if (!registration || registration.payment?.status === "PAID") {
            return;
        }

        const confirmed = window.confirm(`Approve ₹150 payment for ${registration.participant?.name || registrationId}? This will confirm registration and send the approval notification.`);

        if (!confirmed) {
            return;
        }

        document.querySelectorAll(`[data-approve="${CSS.escape(registrationId)}"]`).forEach(button => {
            button.disabled = true;
            button.textContent = "Approving...";
        });

        try {
            const data = await apiRequest(`/api/admin/registrations/${encodeURIComponent(registrationId)}/approve`, { method: "PATCH" }, true);
            const email = data.notification?.email || data.registration?.payment?.emailNotification;
            const sms = data.notification?.sms || data.registration?.payment?.smsNotification;
            showToast(`Payment approved. ${deliverySummary("Email", email)}. ${deliverySummary("SMS", sms)}.`);
            closeModal();
            await loadRegistrations();
        } catch (error) {
            console.error(error);
            showToast(error.message || "Approval failed.");
            document.querySelectorAll(`[data-approve="${CSS.escape(registrationId)}"]`).forEach(button => {
                button.disabled = false;
                button.textContent = "Approve";
            });
        }
    }

    async function retryNotifications(registrationId) {
        const registration = findRegistration(registrationId);

        if (!registration || registration.payment?.status !== "PAID") {
            showToast("Approve the payment before retrying notifications.");
            return;
        }

        if (!window.confirm(`Retry unsent email/SMS for ${registration.participant?.name || registrationId}? The official group link will be included.`)) {
            return;
        }

        document.querySelectorAll(`[data-notify="${CSS.escape(registrationId)}"]`).forEach(button => {
            button.disabled = true;
            button.textContent = "Sending...";
        });

        try {
            const data = await apiRequest(`/api/admin/registrations/${encodeURIComponent(registrationId)}/notify`, { method: "PATCH" }, true);
            const email = data.notification?.email || data.registration?.payment?.emailNotification;
            const sms = data.notification?.sms || data.registration?.payment?.smsNotification;
            showToast(`Notification retry finished. ${deliverySummary("Email", email)}. ${deliverySummary("SMS", sms)}.`);
            closeModal();
            await loadRegistrations();
        } catch (error) {
            console.error(error);
            showToast(error.message || "Notification retry failed.");
            document.querySelectorAll(`[data-notify="${CSS.escape(registrationId)}"]`).forEach(button => {
                button.disabled = false;
                button.textContent = "Retry notify";
            });
        }
    }

    function csvCell(value) {
        const text = String(value ?? "");
        const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
        return `"${safeText.replaceAll('"', '""')}"`;
    }

    function exportPhone(value) {
        const digits = String(value || "").replace(/\D/g, "").slice(-10);
        return digits ? `+91 ${digits}` : "";
    }

    function exportCsv() {
        const headers = [
            "Registration ID",
            "Event",
            "Team Name",
            "Lead Name",
            "Lead Email",
            "Lead Phone",
            "Department",
            "Year",
            "Member 2 Name",
            "Member 2 Email",
            "Member 2 Phone",
            "Member 3 Name",
            "Member 3 Email",
            "Member 3 Phone",
            "Team Size",
            "Payment",
            "Amount",
            "UTR",
            "Proof Submitted",
            "Email Notification",
            "SMS Notification",
            "Created At",
            "Approved At"
        ];
        const rows = visibleRegistrations.map(item => {
            const payment = item.payment || {};
            const members = Array.isArray(item.members) ? item.members : [];
            const member2 = members[0] || {};
            const member3 = members[1] || {};

            return [
                item.registrationId,
                item.event,
                item.teamName || "",
                item.participant?.name,
                item.participant?.email,
                exportPhone(item.participant?.phone),
                item.participant?.department,
                item.participant?.year,
                member2.name || "",
                member2.email || "",
                exportPhone(member2.phone),
                member3.name || "",
                member3.email || "",
                exportPhone(member3.phone),
                1 + members.length,
                payment.status || "PENDING",
                payment.amount || 150,
                payment.utr || "",
                paymentProofSubmitted(item) ? "Yes" : "No",
                payment.emailNotification?.status || "NOT_ATTEMPTED",
                payment.smsNotification?.status || "NOT_ATTEMPTED",
                item.createdAt || "",
                payment.approvedAt || ""
            ];
        });
        const csv = [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
        const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `bytefest-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function initializeDashboard() {
        const dashboard = document.getElementById("adminDashboard");

        if (!dashboard) {
            return;
        }

        if (!token()) return;
        document.getElementById("adminIdentity").textContent = `Signed in as ${sessionStorage.getItem(EMAIL_KEY) || "approved administrator"}`;
        if (dashboardInitialized) {
            loadRegistrations();
            return;
        }
        dashboardInitialized = true;
        document.getElementById("logoutButton").addEventListener("click", () => {
            clearSession();
            openAdminView("admin-login");
        });
        document.getElementById("refreshButton").addEventListener("click", loadRegistrations);
        document.getElementById("exportButton").addEventListener("click", exportCsv);
        document.getElementById("searchInput").addEventListener("input", applyFilters);
        document.getElementById("eventFilter").addEventListener("change", applyFilters);
        document.getElementById("paymentFilter").addEventListener("change", applyFilters);
        document.getElementById("closeModalButton").addEventListener("click", closeModal);
        document.getElementById("detailsModal").addEventListener("click", event => {
            if (event.target.id === "detailsModal") {
                closeModal();
            }
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeModal();
            }
        });
        document.addEventListener("click", event => {
            const viewButton = event.target.closest("[data-view]");
            const teamNameButton = event.target.closest("[data-team-name]");
            const approveButton = event.target.closest("[data-approve]");
            const notifyButton = event.target.closest("[data-notify]");

            if (viewButton) {
                openModal(viewButton.dataset.view);
            }

            if (teamNameButton) {
                updateTeamName(teamNameButton.dataset.teamName);
            }

            if (approveButton) {
                approveRegistration(approveButton.dataset.approve);
            }

            if (notifyButton) {
                retryNotifications(notifyButton.dataset.notify);
            }
        });

        loadRegistrations();
    }

    initializeLogin();

    function resetLoginUi() {
        const button = document.getElementById("adminLoginButton");
        const password = document.getElementById("adminPassword");
        if (button) {
            button.disabled = false;
            button.textContent = "Open admin dashboard →";
        }
        if (password) password.value = "";
        clearFormStatus(document.getElementById("adminLoginStatus"));
    }

    function syncAdminView(view) {
        if (view === "admin-login") {
            if (token()) {
                openAdminView("admin-dashboard");
                return;
            }
            resetLoginUi();
        }
        if (view === "admin-dashboard") {
            if (!token()) {
                openAdminView("admin-login");
                return;
            }
            initializeDashboard();
        }
    }

    window.addEventListener("bytefest:viewchange", event => {
        syncAdminView(event.detail?.view || "");
    });

    syncAdminView(window.ByteFestSPA?.getView?.() || "");
}());
