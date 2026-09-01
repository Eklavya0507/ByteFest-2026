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
    const allowedEvents = ["UI/UX Arena", "Code Sprint", "Bug Hunt", "Checkmate"];
    const threeMemberEvents = new Set(["UI/UX Arena", "Code Sprint", "Bug Hunt"]);

    function showStatus(message, type = "") {
        statusBox.textContent = message;
        statusBox.className = `form-status is-visible${type ? ` is-${type}` : ""}`;
    }

    function clearStatus() {
        statusBox.textContent = "";
        statusBox.className = "form-status";
    }

    function memberCards() {
        return [...memberList.querySelectorAll(".member-card")];
    }

    function updateMemberLabels() {
        memberCards().forEach((card, index) => {
            card.querySelector("[data-member-title]").textContent = `Member ${index + 2}`;
            card.querySelector("[data-remove-member]").disabled = false;
        });
        addMemberButton.disabled = memberCards().length >= 2;
    }

    function addMember() {
        if (memberCards().length >= 2) return;

        const card = document.createElement("div");
        card.className = "member-card";
        card.innerHTML = `
            <div class="member-title">
                <b data-member-title>Member</b>
                <button class="icon-button" type="button" data-remove-member aria-label="Remove member">×</button>
            </div>
            <div class="form-grid">
                <label class="field">Name<input class="member-name" maxlength="80" required placeholder="Member full name"></label>
                <label class="field">Email<input class="member-email" type="email" maxlength="120" required placeholder="member@example.com"></label>
                <label class="field">Phone number<span class="phone-field"><span class="phone-prefix">+91</span><input class="member-phone" type="tel" inputmode="numeric" maxlength="10" pattern="[6-9][0-9]{9}" required placeholder="10-digit number"></span></label>
            </div>
        `;

        card.querySelector("[data-remove-member]").addEventListener("click", () => {
            card.remove();
            updateMemberLabels();
        });

        memberList.appendChild(card);
        updateMemberLabels();
    }

    function updateEventMode() {
        const selectedEvent = eventInput.value;
        const individual = selectedEvent === "Checkmate";
        const teamEvent = Boolean(selectedEvent) && !individual;

        if (feeAmount) feeAmount.textContent = "NO REGISTRATION FEE";

        if (teamNameField && teamNameInput) {
            teamNameField.classList.toggle("hidden", !teamEvent);
            teamNameInput.required = teamEvent;
            teamNameInput.disabled = !teamEvent;
            if (!teamEvent) teamNameInput.value = "";
        }

        membersSection.classList.toggle("hidden", individual);

        if (individual) {
            memberList.replaceChildren();
            membersHelp.textContent = "Checkmate is an individual event.";
        } else if (selectedEvent) {
            membersHelp.textContent = `${selectedEvent} requires exactly 3 participants in total. Add Member 2 and Member 3.`;
        } else {
            membersHelp.textContent = "UI/UX Arena, Code Sprint and Bug Hunt require exactly 3 participants; Checkmate is individual.";
        }

        updateMemberLabels();
    }

    function validPhone(value) {
        return /^[6-9][0-9]{9}$/.test(value.trim());
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
        try { return text ? JSON.parse(text) : {}; }
        catch { return {}; }
    }

    eventInput.addEventListener("change", updateEventMode);
    addMemberButton.addEventListener("click", addMember);

    function applyRequestedEvent(requestedEvent) {
        if (allowedEvents.includes(requestedEvent)) {
            eventInput.value = requestedEvent;
            sessionStorage.removeItem("bytefest_pending_event");
        }
        updateEventMode();
    }

    applyRequestedEvent(sessionStorage.getItem("bytefest_pending_event"));

    window.addEventListener("bytefest:viewchange", event => {
        if (event.detail?.view !== "register") return;
        applyRequestedEvent(event.detail.eventName || sessionStorage.getItem("bytefest_pending_event") || "");
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        clearStatus();

        if (!form.reportValidity()) {
            showStatus("Please complete every required field.", "error");
            return;
        }

        const members = collectMembers();
        const selectedEvent = eventInput.value;
        const teamName = teamNameInput && !teamNameInput.disabled ? teamNameInput.value.trim() : "";
        const phone = document.getElementById("phone").value.trim();

        if (selectedEvent !== "Checkmate" && (teamName.length < 2 || teamName.length > 60)) {
            showStatus("Enter a team name between 2 and 60 characters.", "error");
            teamNameInput?.focus();
            return;
        }

        if (!validPhone(phone) || members.some(member => !validPhone(member.phone))) {
            showStatus("Enter valid 10-digit Indian phone numbers starting with 6–9.", "error");
            return;
        }

        if (threeMemberEvents.has(selectedEvent) && members.length !== 2) {
            showStatus(`${selectedEvent} requires exactly 3 participants in total.`, "error");
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
        submitButton.textContent = "Confirming registration...";
        showStatus("Creating your BYTEFEST registration...");

        try {
            const response = await fetch(`${window.BYTEFEST_CONFIG.API_URL}/api/registrations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event: selectedEvent, teamName, participant, members })
            });
            const data = await readJson(response);

            if (!response.ok) {
                throw new Error(data.message || `Registration failed (HTTP ${response.status})`);
            }

            sessionStorage.setItem("bytefest_last_registration_id", data.registrationId);
            sessionStorage.setItem("bytefest_last_registration_email", participant.email);
            sessionStorage.setItem("bytefest_active_registration_id", data.registrationId);
            sessionStorage.setItem("bytefest_last_registration_event", data.event || selectedEvent);
            sessionStorage.setItem("bytefest_last_registration_team", data.teamName || teamName || "");
            if (data.groupLink) sessionStorage.setItem(`bytefest_group_link_${data.registrationId}`, data.groupLink);
            if (data.communityLink) sessionStorage.setItem(`bytefest_community_link_${data.registrationId}`, data.communityLink);

            showStatus(`Registration ${data.registrationId} confirmed. Opening your group link...`, "success");

            window.setTimeout(() => {
                form.reset();
                memberList.replaceChildren();
                submitButton.disabled = false;
                submitButton.textContent = "Create registration & join group →";
                updateEventMode();
                if (window.ByteFestSPA) {
                    window.ByteFestSPA.open("groups", { registrationId: data.registrationId });
                } else {
                    window.location.href = "./groups.html";
                }
            }, 250);
        } catch (error) {
            console.error(error);
            showStatus(error.message || "Cannot connect to the BYTEFEST server.", "error");
            submitButton.disabled = false;
            submitButton.textContent = "Create registration & join group →";
        }
    });
}());
