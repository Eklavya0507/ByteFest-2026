const API_URL = "https://byte-fest-backend.onrender.com";

const ADMIN_EMAIL = "1.gautamkushwha4467@gmail.com";

async function loadRegistrations() {

    try {

        const response = await fetch(
            `${API_URL}/api/admin/registrations`
        );

        if (!response.ok) {
            throw new Error("Unable to load registrations");
        }

        const data = await response.json();

        document.getElementById("total").textContent = data.length;

        const pending = data.filter(
            x => x.payment?.status === "PENDING"
        ).length;

        const paid = data.filter(
            x => x.payment?.status === "PAID"
        ).length;

        document.getElementById("pending").textContent = pending;
        document.getElementById("paid").textContent = paid;

        const rows = document.getElementById("rows");

        if (!data.length) {
            rows.innerHTML =
                `<tr><td colspan="8">No registrations found.</td></tr>`;
            return;
        }

        rows.innerHTML = data.map(x => `
            <tr>
                <td>${x.registrationId || ""}</td>
                <td>${x.event || ""}</td>
                <td>${x.participant?.name || ""}</td>
                <td>${x.participant?.email || ""}</td>
                <td>${x.participant?.phone || ""}</td>
                <td>${x.participant?.department || ""}</td>
                <td>${x.participant?.year || ""}</td>
                <td>
                    ${x.payment?.status || "PENDING"}
                    <br>
                    ₹${x.payment?.amount || 150}
                </td>
            </tr>
        `).join("");

    } catch (error) {

        console.error(error);

        document.getElementById("rows").innerHTML =
            `<tr><td colspan="8">
                Cannot connect to backend.
            </td></tr>`;
    }
}

document.getElementById("logout").addEventListener("click", () => {
    sessionStorage.removeItem("bytefest_admin");
    location.href = "index.html";
});

loadRegistrations();
