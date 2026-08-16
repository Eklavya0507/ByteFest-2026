(function () {
    const form = document.getElementById("registrationForm");

    if (!form) {
        return;
    }

    const eventInput = document.getElementById("event");
    const membersSection = document.getElementById("membersSection");
    const memberList = document.getElementById("memberList");
    const addMemberButton = document.getElementById("addMemberButton");
    const submitButton = document.getElementById("registerButton");
    const statusBox = document.getElementById("registrationStatus");
    const allowedEvents = ["UI/UX Arena", "Code Sprint", "Bug Hunt", "Checkmate"];

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
        });

        addMemberButton.disabled = memberCards().length >= 2;
    }

    function addMember() {
        if (memberCards().length >= 2) {
            return;
        }

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
        const individual = eventInput.value === "Checkmate";
        membersSection.classList.toggle("hidden", individual);

        if (individual) {
            memberList.replaceChildren();
        } else if (eventInput.value && memberCards().length === 0) {
            addMember();
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

        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return {};
        }
    }

    eventInput.addEventListener("change", updateEventMode);
    addMemberButton.addEventListener("click", addMember);

    const requestedEvent = new URLSearchParams(window.location.search).get("event");

    if (allowedEvents.includes(requestedEvent)) {
        eventInput.value = requestedEvent;
    }

    updateEventMode();

    form.addEventListener("submit", async event => {
        event.preventDefault();
        clearStatus();

        if (!form.reportValidity()) {
            showStatus("Please complete every required field.", "error");
            return;
        }

        const members = collectMembers();
        const selectedEvent = eventInput.value;
        const phone = document.getElementById("phone").value.trim();

        if (!validPhone(phone) || members.some(member => !validPhone(member.phone))) {
            showStatus("Enter valid 10-digit Indian phone numbers starting with 6–9.", "error");
            return;
        }

        if (selectedEvent !== "Checkmate" && (members.length < 1 || members.length > 2)) {
            showStatus("Team events require 2–3 participants in total.", "error");
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
            const response = await fetch(`${window.BYTEFEST_CONFIG.API_URL}/api/registrations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event: selectedEvent, participant, members })
            });
            const data = await readJson(response);

            if (!response.ok) {
                throw new Error(data.message || `Registration failed (HTTP ${response.status})`);
            }

            sessionStorage.setItem(`bytefest_payment_email_${data.registrationId}`, participant.email);
            sessionStorage.setItem("bytefest_last_registration_id", data.registrationId);
            showStatus(`Registration ${data.registrationId} created. Opening payment...`, "success");

            window.setTimeout(() => {
                window.location.href = `payment.html?registrationId=${encodeURIComponent(data.registrationId)}`;
            }, 650);
        } catch (error) {
            console.error(error);
            showStatus(error.message || "Cannot connect to the BYTEFEST server.", "error");
            submitButton.disabled = false;
            submitButton.textContent = "Create registration & continue →";
        }
    });
}());
