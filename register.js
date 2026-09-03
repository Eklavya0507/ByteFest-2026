(function () {
    const form = document.getElementById("registrationForm");
    if (!form) return;

    const eventInput = document.getElementById("event");
    const teamNameField = document.getElementById("teamNameField");
    const teamNameInput = document.getElementById("teamName");
    const membersSection = document.getElementById("membersSection");
    const memberList = document.getElementById("memberList");
    const addMemberButton = document.getElementById("addMemberButton");
    const submitButton = document.getElementById("registerButton");
    const statusBox = document.getElementById("registrationStatus");
    const membersHelp = document.getElementById("membersHelp");
    const feeAmount = document.getElementById("registrationFeeAmount");

    // FINAL REGISTRATION SETTINGS
    // Code Sprint is removed from registration.
    // Registration closes at 11:55 PM IST on 3 September 2026.
    const REGISTRATION_CLOSE_AT = new Date("2026-09-03T23:55:00+05:30");
    const allowedEvents = ["UI/UX Arena", "Bug Hunt", "Checkmate"];
    const teamEvents = new Set(["UI/UX Arena", "Bug Hunt"]);

    let deadlineBanner = null;
    let deadlineTimer = null;

    function showStatus(message, type = "") {
        if (!statusBox) return;
        statusBox.textContent = message;
        statusBox.className = `form-status is-visible${type ? ` is-${type}` : ""}`;
    }

    function clearStatus() {
        if (!statusBox) return;
        statusBox.textContent = "";
        statusBox.className = "form-status";
    }

    function isRegistrationClosed() {
        return Date.now() >= REGISTRATION_CLOSE_AT.getTime();
    }

    function formatRemaining(ms) {
        if (ms <= 0) return "00:00:00";
        const totalSeconds = Math.floor(ms / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
        const seconds = String(totalSeconds % 60).padStart(2, "0");
        return `${hours}:${minutes}:${seconds}`;
    }

    function ensureDeadlineBanner() {
        if (deadlineBanner || !form.parentNode) return;

        deadlineBanner = document.createElement("div");
        deadlineBanner.id = "registrationDeadlineBanner";
        deadlineBanner.setAttribute("role", "status");
        deadlineBanner.style.cssText = [
            "margin:0 0 18px",
            "padding:14px 16px",
            "border:1px solid rgba(72,221,255,.35)",
            "border-radius:14px",
            "background:rgba(13,30,51,.72)",
            "color:#eaf7ff",
            "font-weight:700",
            "line-height:1.5"
        ].join(";");

        form.parentNode.insertBefore(deadlineBanner, form);
    }

    function disableRegistrationForm() {
        [...form.querySelectorAll("input, select, button, textarea")].forEach(control => {
            control.disabled = true;
        });

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "REGISTRATION CLOSED";
        }
    }

    function updateDeadlineState() {
        ensureDeadlineBanner();

        const remaining = REGISTRATION_CLOSE_AT.getTime() - Date.now();

        if (remaining <= 0) {
            deadlineBanner.textContent =
                "REGISTRATION CLOSED • Registrations closed at 11:55 PM IST on 3 September 2026.";
            deadlineBanner.style.borderColor = "rgba(255,90,110,.55)";
            deadlineBanner.style.background = "rgba(64,18,29,.72)";

            disableRegistrationForm();
            showStatus(
                "Registration is closed. The deadline was 11:55 PM IST on 3 September 2026.",
                "error"
            );

            if (deadlineTimer) {
                clearInterval(deadlineTimer);
                deadlineTimer = null;
            }
            return;
        }

        deadlineBanner.textContent =
            `REGISTRATION OPEN • No registration fee • Closes today at 11:55 PM IST • Time left ${formatRemaining(remaining)}`;
    }

    function removeCodeSprintOption() {
        if (!eventInput) return;

        [...eventInput.options].forEach(option => {
            if (option.value === "Code Sprint") option.remove();
        });

        if (eventInput.value === "Code Sprint") {
            eventInput.value = "";
        }

        if (sessionStorage.getItem("bytefest_pending_event") === "Code Sprint") {
            sessionStorage.removeItem("bytefest_pending_event");
        }
    }

    function memberCards() {
        return [...memberList.querySelectorAll(".member-card")];
    }

    function updateMemberLabels() {
        memberCards().forEach((card, index) => {
            const title = card.querySelector("[data-member-title]");
            if (title) title.textContent = `Member ${index + 2}`;

            const remove = card.querySelector("[data-remove-member]");
            if (remove) remove.disabled = isRegistrationClosed();
        });

        // Lead participant is Member 1.
        // UI/UX Arena and Bug Hunt require exactly 2 additional members.
        addMemberButton.disabled = isRegistrationClosed() || memberCards().length >= 2;
    }

    function addMember() {
        if (isRegistrationClosed()) {
            updateDeadlineState();
            return;
        }

        if (memberCards().length >= 2) return;

        const card = document.createElement("div");
        card.className = "member-card";
        card.innerHTML = `
            <div class="member-title">
                <b data-member-title>Member</b>
                <button class="icon-button" type="button" data-remove-member aria-label="Remove member">×</button>
            </div>

            <div class="form-grid">
                <label class="field">
                    Name
                    <input class="member-name" maxlength="80" required placeholder="Member full name">
                </label>

                <label class="field">
                    Email
                    <input class="member-email" type="email" maxlength="120" required placeholder="member@example.com">
                </label>

                <label class="field">
                    Phone number
                    <span class="phone-field">
                        <span class="phone-prefix">+91</span>
                        <input
                            class="member-phone"
                            type="tel"
                            inputmode="numeric"
                            maxlength="10"
                            pattern="[6-9][0-9]{9}"
                            required
                            placeholder="10-digit number"
                        >
                    </span>
                </label>
            </div>
        `;

        card.querySelector("[data-remove-member]").addEventListener("click", () => {
            if (isRegistrationClosed()) return;
            card.remove();
            updateMemberLabels();
        });

        memberList.appendChild(card);
        updateMemberLabels();
    }

    function updateEventMode() {
        removeCodeSprintOption();

        const selectedEvent = eventInput.value;
        const individual = selectedEvent === "Checkmate";
        const isTeamEvent = teamEvents.has(selectedEvent);

        if (feeAmount) {
            feeAmount.textContent = selectedEvent
                ? "NO REGISTRATION FEE"
                : "Select event";
        }

        if (teamNameField && teamNameInput) {
            teamNameField.classList.toggle("hidden", !isTeamEvent);
            teamNameInput.required = isTeamEvent;
            teamNameInput.disabled = !isTeamEvent || isRegistrationClosed();

            if (!isTeamEvent) teamNameInput.value = "";
        }

        if (membersSection) {
            membersSection.classList.toggle("hidden", individual);
        }

        if (individual) {
            memberList.replaceChildren();

            if (membersHelp) {
                membersHelp.textContent = "Checkmate is an individual event.";
            }
        } else if (isTeamEvent) {
            if (membersHelp) {
                membersHelp.textContent =
                    `${selectedEvent} requires exactly 3 participants in total. Add Member 2 and Member 3.`;
            }
        } else if (membersHelp) {
            membersHelp.textContent =
                "UI/UX Arena and Bug Hunt require exactly 3 participants; Checkmate is individual.";
        }

        updateMemberLabels();
    }

    function validPhone(value) {
        return /^[6-9][0-9]{9}$/.test(String(value || "").trim());
    }

    function collectMembers() {
        return memberCards().map(card => ({
            name: card.querySelector(".member-name").value.trim(),
            email: card.querySelector(".member-email").value.trim().toLowerCase(),
            phone: card.querySelector(".member-phone").value.trim()
        }));
    }

    async function readJson(response) {
        const text = await response.text();

        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return {};
        }
    }

    function applyRequestedEvent(requestedEvent) {
        removeCodeSprintOption();

        if (allowedEvents.includes(requestedEvent)) {
            eventInput.value = requestedEvent;
            sessionStorage.removeItem("bytefest_pending_event");
        } else if (requestedEvent === "Code Sprint") {
            eventInput.value = "";
            sessionStorage.removeItem("bytefest_pending_event");
            showStatus("Code Sprint registration has been removed.", "error");
        }

        updateEventMode();
        updateDeadlineState();
    }

    removeCodeSprintOption();
    ensureDeadlineBanner();
    updateDeadlineState();

    if (!isRegistrationClosed()) {
        deadlineTimer = setInterval(updateDeadlineState, 1000);
    }

    eventInput.addEventListener("change", updateEventMode);
    addMemberButton.addEventListener("click", addMember);

    applyRequestedEvent(
        sessionStorage.getItem("bytefest_pending_event")
    );

    window.addEventListener("bytefest:viewchange", event => {
        if (event.detail?.view !== "register") return;

        applyRequestedEvent(
            event.detail.eventName ||
            sessionStorage.getItem("bytefest_pending_event") ||
            ""
        );
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        clearStatus();

        if (isRegistrationClosed()) {
            updateDeadlineState();
            return;
        }

        if (!form.reportValidity()) {
            showStatus("Please complete every required field.", "error");
            return;
        }

        const selectedEvent = eventInput.value;

        if (!allowedEvents.includes(selectedEvent)) {
            showStatus("Select UI/UX Arena, Bug Hunt or Checkmate.", "error");
            return;
        }

        if (selectedEvent === "Code Sprint") {
            showStatus("Code Sprint registration has been removed.", "error");
            return;
        }

        const isTeamEvent = teamEvents.has(selectedEvent);
        const members = collectMembers();
        const teamName =
            teamNameInput && !teamNameInput.disabled
                ? teamNameInput.value.trim()
                : "";

        const phone = document.getElementById("phone").value.trim();

        if (isTeamEvent && (teamName.length < 2 || teamName.length > 60)) {
            showStatus("Enter a team name between 2 and 60 characters.", "error");
            teamNameInput?.focus();
            return;
        }

        if (!validPhone(phone) || members.some(member => !validPhone(member.phone))) {
            showStatus(
                "Enter valid 10-digit Indian phone numbers starting with 6–9.",
                "error"
            );
            return;
        }

        if (isTeamEvent && members.length !== 2) {
            showStatus(
                `${selectedEvent} requires exactly 3 participants in total.`,
                "error"
            );
            return;
        }

        if (selectedEvent === "Checkmate" && members.length !== 0) {
            showStatus("Checkmate is an individual event.", "error");
            return;
        }

        const participant = {
            name: document.getElementById("participantName").value.trim(),
            email: document.getElementById("participantEmail").value.trim().toLowerCase(),
            phone,
            department: document.getElementById("department").value.trim(),
            year: document.getElementById("year").value
        };

        submitButton.disabled = true;
        submitButton.textContent = "Creating registration...";
        showStatus("Connecting to the BYTEFEST server...");

        try {
            // Check the deadline again immediately before sending.
            if (isRegistrationClosed()) {
                updateDeadlineState();
                return;
            }

            const response = await fetch(
                `${window.BYTEFEST_CONFIG.API_URL}/api/registrations`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        event: selectedEvent,
                        teamName: isTeamEvent ? teamName : "",
                        participant,
                        members
                    })
                }
            );

            const data = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    `Registration failed (HTTP ${response.status})`
                );
            }

            sessionStorage.setItem(
                "bytefest_last_registration_id",
                data.registrationId
            );

            sessionStorage.setItem(
                "bytefest_last_registration_email",
                participant.email
            );

            sessionStorage.setItem(
                "bytefest_active_registration_id",
                data.registrationId
            );

            if (data.groupLink) {
                sessionStorage.setItem(
                    `bytefest_group_${data.registrationId}`,
                    data.groupLink
                );
            }

            if (data.communityLink) {
                sessionStorage.setItem(
                    `bytefest_community_${data.registrationId}`,
                    data.communityLink
                );
            }

            showStatus(
                `Registration ${data.registrationId} confirmed. Opening official WhatsApp groups...`,
                "success"
            );

            window.setTimeout(() => {
                form.reset();
                memberList.replaceChildren();

                if (!isRegistrationClosed()) {
                    submitButton.disabled = false;
                    submitButton.textContent =
                        "Create registration & join group →";
                }

                updateEventMode();
                updateDeadlineState();

                if (window.ByteFestSPA) {
                    window.ByteFestSPA.open("groups", {
                        registrationId: data.registrationId
                    });
                } else {
                    window.location.href = "./";
                }
            }, 550);

        } catch (error) {
            console.error(error);

            showStatus(
                error.message ||
                "Cannot connect to the BYTEFEST server.",
                "error"
            );

            if (!isRegistrationClosed()) {
                submitButton.disabled = false;
                submitButton.textContent =
                    "Create registration & join group →";
            } else {
                updateDeadlineState();
            }
        }
    });
}());
