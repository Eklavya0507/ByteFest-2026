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

    function feeForEvent() {
        return 0;
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
        const label = safeStatus === "PAID" ? "CONFIRMED" : safeStatus;
        const cssStatus = safeStatus === "PAID" ? "paid" : safeStatus.toLowerCase();
        return `<span class="status-badge status-${cssStatus}">${escapeHtml(label)}</span>`;
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
        const emailSent = registrations.filter(item => item.payment?.emailNotification?.status === "SENT").length;
        document.getElementById("totalCount").textContent = registrations.length;
        document.getElementById("pendingCount").textContent = pending;
        document.getElementById("proofCount").textContent = emailSent;
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
                participant.name,
                participant.email,
                participant.phone,
                participant.department,
                participant.year,
                item.teamName,
                ...members.flatMap(member => [member.name, member.email, member.phone])
            ].join(" ").toLowerCase();
            const matchesSearch = !search || haystack.includes(search);
            const matchesEvent = !event || item.event === event;
            let matchesPayment = !payment || item.payment?.status === payment;

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
            const linksReady = Boolean(item.groupLink && item.communityLink);
            const emailStatus = payment.emailNotification?.status || "NOT_ATTEMPTED";
            const smsStatus = payment.smsNotification?.status || "NOT_ATTEMPTED";
            const notificationIncomplete = paid && (emailStatus !== "SENT" || !["SENT", "SKIPPED"].includes(smsStatus));
            const teamSize = 1 + (Array.isArray(item.members) ? item.members.length : 0);

            return `
                <tr>
                    <td><span class="cell-title">${escapeHtml(item.registrationId)}</span><span class="cell-subtitle">${escapeHtml(formatDate(item.createdAt))}</span></td>
                    <td><span class="cell-title">${escapeHtml(item.event)}</span><span class="cell-subtitle">${item.event !== "Checkmate" ? `${escapeHtml(item.teamName || "TEAM NAME NOT SET")}<br>` : ""}${teamSize} participant${teamSize === 1 ? "" : "s"}</span></td>
                    <td><span class="cell-title">${escapeHtml(participant.name)}</span><span class="cell-subtitle">${escapeHtml(participant.email)}<br>+91 ${escapeHtml(participant.phone)}</span></td>
                    <td>${statusBadge(paid ? "PAID" : "PENDING")}<span class="cell-subtitle">No registration fee${payment.approvedAt ? `<br>${escapeHtml(formatDate(payment.approvedAt))}` : ""}</span></td>
                    <td>${statusBadge(linksReady ? "SENT" : "NOT_ATTEMPTED")}<span class="cell-subtitle">${linksReady ? "Event + Community links ready" : "One or more links missing"}</span></td>
                    <td><div class="notification-stack"><span>Email ${statusBadge(emailStatus)}</span><span>SMS ${statusBadge(smsStatus)}</span></div></td>
                    <td><div class="admin-actions"><button class="btn btn-small" type="button" data-view="${escapeHtml(item.registrationId)}">View</button><button class="btn btn-small" type="button" data-edit="${escapeHtml(item.registrationId)}">Edit</button>${!paid ? `<button class="btn btn-small btn-success" type="button" data-approve="${escapeHtml(item.registrationId)}">Confirm</button>` : ""}${notificationIncomplete ? `<button class="btn btn-small btn-success" type="button" data-notify="${escapeHtml(item.registrationId)}">Retry notify</button>` : ""}</div></td>
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
        const notificationIncomplete = paid && (emailStatus !== "SENT" || !["SENT", "SKIPPED"].includes(smsStatus));
        const modal = document.getElementById("detailsModal");
        const body = document.getElementById("modalBody");
        modal.dataset.registrationId = registration.registrationId;
        document.getElementById("modalTitle").textContent = registration.registrationId;

        body.innerHTML = `
            <div class="result-grid">
                <div class="result-item"><small>Event</small><b>${escapeHtml(registration.event)}</b></div>
                ${registration.event !== "Checkmate" ? `<div class="result-item"><small>Team name</small><b>${escapeHtml(registration.teamName || "TEAM NAME NOT SET")}</b></div>` : ""}
                <div class="result-item"><small>Status</small>${statusBadge(paid ? "PAID" : "PENDING")}</div>
                <div class="result-item"><small>Lead participant</small><b>${escapeHtml(participant.name)}</b></div>
                <div class="result-item"><small>Email</small><b>${escapeHtml(participant.email)}</b></div>
                <div class="result-item"><small>Phone</small><b>+91 ${escapeHtml(participant.phone)}</b></div>
                <div class="result-item"><small>Department / year</small><b>${escapeHtml(participant.department)} · ${escapeHtml(participant.year)}</b></div>
                ${members.map((member, index) => `<div class="result-item"><small>Member ${index + 2}</small><b>${escapeHtml(member.name)}</b><br><span class="muted">${escapeHtml(member.email)} · +91 ${escapeHtml(member.phone)}</span></div>`).join("")}
                <div class="result-item"><small>Registered</small><b>${escapeHtml(formatDate(registration.createdAt))}</b></div>
                <div class="result-item"><small>Confirmed</small><b>${escapeHtml(formatDate(payment.approvedAt))}</b></div>
                <div class="result-item"><small>${escapeHtml(registration.event)} group link</small><b>${escapeHtml(registration.groupLink || "Not configured")}</b></div>
                <div class="result-item"><small>BYTEFEST Community link</small><b>${escapeHtml(registration.communityLink || "Not configured")}</b></div>
                <div class="result-item"><small>Email notification</small>${statusBadge(payment.emailNotification?.status || "NOT_ATTEMPTED")}<br><span class="muted">${escapeHtml(payment.emailNotification?.error || payment.emailNotification?.messageId || "")}</span></div>
                <div class="result-item"><small>SMS notification</small>${statusBadge(payment.smsNotification?.status || "NOT_ATTEMPTED")}<br><span class="muted">${escapeHtml(payment.smsNotification?.error || payment.smsNotification?.messageId || "")}</span></div>
            </div>
            <div class="actions"><button class="btn" type="button" data-edit="${escapeHtml(registration.registrationId)}">Edit registration details</button></div>
            ${!paid ? `<div class="actions"><button class="btn btn-primary" type="button" data-approve="${escapeHtml(registration.registrationId)}">Confirm registration & notify participant</button></div>` : ""}
            ${notificationIncomplete ? `<div class="actions"><button class="btn btn-success" type="button" data-notify="${escapeHtml(registration.registrationId)}">Retry failed email / SMS</button></div>` : ""}
        `;

        modal.classList.add("is-open");
        document.body.classList.add("modal-open");
    }


    function editMemberFields(member, index, required) {
        const data = member || {};
        return `
            <div class="member-card admin-edit-member" data-member-index="${index}">
                <div class="member-title"><b>Member ${index + 2}${required ? " · required" : " · optional"}</b></div>
                <div class="form-grid">
                    <label class="field">Name<input data-edit-member-name maxlength="80" value="${escapeHtml(data.name || "")}" placeholder="Member full name"></label>
                    <label class="field">Email<input data-edit-member-email type="email" maxlength="120" value="${escapeHtml(data.email || "")}" placeholder="member@example.com"></label>
                    <label class="field">Phone<input data-edit-member-phone type="tel" inputmode="numeric" maxlength="10" value="${escapeHtml(data.phone || "")}" placeholder="10-digit number"></label>
                </div>
            </div>
        `;
    }

    function openEditModal(registrationId) {
        const registration = findRegistration(registrationId);
        if (!registration) {
            showToast("Registration was not found in the current dashboard data.");
            return;
        }

        const participant = registration.participant || {};
        const members = Array.isArray(registration.members) ? registration.members : [];
        const teamEvent = registration.event !== "Checkmate";
        const exactThree = ["UI/UX Arena", "Code Sprint", "Bug Hunt"].includes(registration.event);
        const modal = document.getElementById("detailsModal");
        const body = document.getElementById("modalBody");

        modal.dataset.registrationId = registration.registrationId;
        document.getElementById("modalTitle").textContent = `Edit ${registration.registrationId}`;

        body.innerHTML = `
            <form id="adminEditRegistrationForm" class="form-shell" novalidate>
                <div class="notice is-visible">
                    <b>Event cannot be changed here:</b> ${escapeHtml(registration.event)}.
                    ${teamEvent ? "Changing the team name can change the competition login password, so share the updated password with the team." : ""}
                </div>

                <div class="form-grid" style="margin-top:18px">
                    <label class="field">Event
                        <input value="${escapeHtml(registration.event)}" disabled>
                    </label>
                    ${teamEvent ? `
                    <label class="field">Team name
                        <input id="adminEditTeamName" minlength="2" maxlength="60" required value="${escapeHtml(registration.teamName || "")}" placeholder="Team name">
                    </label>` : ""}
                    <label class="field">Lead participant name
                        <input id="adminEditLeadName" maxlength="80" required value="${escapeHtml(participant.name || "")}">
                    </label>
                    <label class="field">Lead email
                        <input id="adminEditLeadEmail" type="email" maxlength="120" required value="${escapeHtml(participant.email || "")}">
                    </label>
                    <label class="field">Lead phone
                        <input id="adminEditLeadPhone" type="tel" inputmode="numeric" maxlength="10" required value="${escapeHtml(participant.phone || "")}">
                    </label>
                    <label class="field">Department
                        <input id="adminEditDepartment" maxlength="80" required value="${escapeHtml(participant.department || "")}">
                    </label>
                    <label class="field">Year
                        <select id="adminEditYear" required>
                            ${["1st Year","2nd Year","3rd Year","4th Year"].map(year => `<option value="${year}"${participant.year === year ? " selected" : ""}>${year}</option>`).join("")}
                        </select>
                    </label>
                </div>

                ${teamEvent ? `
                <div style="margin-top:20px">
                    <h3>Team members</h3>
                    <p class="muted">${exactThree ? "Member 2 and Member 3 are required." : "Bug Hunt requires Member 2; Member 3 is optional."}</p>
                    ${editMemberFields(members[0], 0, true)}
                    ${editMemberFields(members[1], 1, exactThree)}
                </div>` : ""}

                <div class="form-status" id="adminEditStatus" role="status"></div>
                <div class="actions">
                    <button class="btn btn-primary" id="adminEditSaveButton" type="submit">Save changes</button>
                    <button class="btn" type="button" data-view="${escapeHtml(registration.registrationId)}">Cancel</button>
                </div>
            </form>
        `;

        modal.classList.add("is-open");
        document.body.classList.add("modal-open");

        document.getElementById("adminEditRegistrationForm").addEventListener("submit", event => {
            event.preventDefault();
            saveRegistrationEdits(registration.registrationId);
        });
    }

    async function saveRegistrationEdits(registrationId) {
        const registration = findRegistration(registrationId);
        const form = document.getElementById("adminEditRegistrationForm");
        const statusBox = document.getElementById("adminEditStatus");
        const saveButton = document.getElementById("adminEditSaveButton");

        if (!registration || !form || !statusBox || !saveButton) return;
        if (!form.reportValidity()) {
            showFormStatus(statusBox, "Complete all required fields.", "error");
            return;
        }

        const members = [...form.querySelectorAll(".admin-edit-member")].map(card => ({
            name: card.querySelector("[data-edit-member-name]")?.value.trim() || "",
            email: card.querySelector("[data-edit-member-email]")?.value.trim().toLowerCase() || "",
            phone: card.querySelector("[data-edit-member-phone]")?.value.trim() || ""
        })).filter(member => member.name || member.email || member.phone);

        const payload = {
            teamName: registration.event === "Checkmate"
                ? ""
                : document.getElementById("adminEditTeamName")?.value.trim() || "",
            participant: {
                name: document.getElementById("adminEditLeadName").value.trim(),
                email: document.getElementById("adminEditLeadEmail").value.trim().toLowerCase(),
                phone: document.getElementById("adminEditLeadPhone").value.trim(),
                department: document.getElementById("adminEditDepartment").value.trim(),
                year: document.getElementById("adminEditYear").value
            },
            members
        };

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
        showFormStatus(statusBox, "Saving registration changes...");

        try {
            const data = await apiRequest(
                `/api/admin/registrations/${encodeURIComponent(registrationId)}/edit`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                },
                true
            );

            const updated = data.registration;
            const index = registrations.findIndex(item => item.registrationId === registrationId);
            if (index >= 0 && updated) registrations[index] = updated;

            updateStatistics();
            applyFilters();
            showToast("Registration details updated.");
            openModal(registrationId);
        } catch (error) {
            console.error(error);
            showFormStatus(statusBox, error.message || "Could not update registration.", "error");
            saveButton.disabled = false;
            saveButton.textContent = "Save changes";
        }
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

    async function approveRegistration(registrationId) {
        const registration = findRegistration(registrationId);

        if (!registration || registration.payment?.status === "PAID") {
            return;
        }

        const confirmed = window.confirm(`Confirm registration for ${registration.participant?.name || registrationId} and send the official group-link notification?`);

        if (!confirmed) {
            return;
        }

        document.querySelectorAll(`[data-approve="${CSS.escape(registrationId)}"]`).forEach(button => {
            button.disabled = true;
            button.textContent = "Confirming...";
        });

        try {
            const data = await apiRequest(`/api/admin/registrations/${encodeURIComponent(registrationId)}/approve`, { method: "PATCH" }, true);
            const email = data.notification?.email || data.registration?.payment?.emailNotification;
            const sms = data.notification?.sms || data.registration?.payment?.smsNotification;
            showToast(`Registration confirmed. ${deliverySummary("Email", email)}. ${deliverySummary("SMS", sms)}.`);
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
            showToast("Confirm the registration before retrying notifications.");
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
            "Registration Status",
            "Registration Fee",
            "Event Group Link",
            "Community Link",
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
                payment.status === "PAID" ? "CONFIRMED" : "PENDING",
                "NO REGISTRATION FEE",
                item.groupLink || "",
                item.communityLink || "",
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
            const editButton = event.target.closest("[data-edit]");
            const approveButton = event.target.closest("[data-approve]");
            const notifyButton = event.target.closest("[data-notify]");

            if (viewButton) {
                openModal(viewButton.dataset.view);
            }

            if (editButton) {
                openEditModal(editButton.dataset.edit);
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
