const params = new URLSearchParams(window.location.search);

const eventEl = document.getElementById("event");
const members = document.getElementById("members");
const list = document.getElementById("memberList");
const addBtn = document.getElementById("addBtn");

let memberCount = 0;

// Automatically select event from events page
if (params.get("event")) {
    eventEl.value = params.get("event");
}

function updateEvent() {
    if (eventEl.value === "Checkmate") {
        members.style.display = "none";
        list.innerHTML = "";
        memberCount = 0;
    } else {
        members.style.display = "block";
    }
}

eventEl.addEventListener("change", updateEvent);

updateEvent();

// Add team member
addBtn.addEventListener("click", () => {

    if (memberCount >= 2) {
        alert("Maximum 3 members allowed.");
        return;
    }

    memberCount++;

    const member = document.createElement("div");

    member.className = "member";

    member.innerHTML = `
        <b>Member ${memberCount + 1}</b>

        <div class="formgrid">

            <label>
                Name
                <input class="member-name" required placeholder="Full name">
            </label>

            <label>
                Email
                <input class="member-email" type="email" required placeholder="Email">
            </label>

            <label>
                Phone
                <div class="phone">
                    <span>+91</span>
                    <input
                        class="member-phone"
                        inputmode="numeric"
                        maxlength="10"
                        pattern="[6-9][0-9]{9}"
                        required
                        placeholder="10-digit number">
                </div>
            </label>

        </div>
    `;

    list.appendChild(member);
});


// SUBMIT REGISTRATION
document.getElementById("form").addEventListener("submit", async (e) => {

    e.preventDefault();

    const phone = document.getElementById("phone").value;

    if (!/^[6-9][0-9]{9}$/.test(phone)) {
        alert("Enter a valid 10-digit Indian mobile number.");
        return;
    }

    const participant = {
        name: document.querySelector('input[placeholder="Full name"]').value,
        email: document.querySelector('input[placeholder="you@example.com"]').value,
        phone: phone,
        department: document.querySelector('input[value="CSE (DS)"]').value,
        year: document.getElementById("year").value
    };

    const memberElements = document.querySelectorAll(".member");

    const memberData = [];

    memberElements.forEach(member => {

        memberData.push({
            name: member.querySelector(".member-name").value,
            email: member.querySelector(".member-email").value,
            phone: member.querySelector(".member-phone").value
        });

    });

    const data = {
        event: eventEl.value,
        participant: participant,
        members: memberData
    };

    try {

        const response = await fetch(
            "https://byte-fest-backend.onrender.com/api/registrations",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            alert(result.message || "Registration failed.");
            return;
        }

        alert(
    "Registration successful!\n\n" +
    "Registration ID: " +
    result.registrationId
);

window.location.href =
    "payment.html?registrationId=" +
    encodeURIComponent(result.registrationId);

    } catch (error) {

        console.error(error);

        alert(
            "Cannot connect to BYTEFEST server.\n" +
            "Make sure the backend is running."
        );
    }

});
