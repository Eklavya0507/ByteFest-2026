const API_URL = "https://byte-fest-backend.onrender.com";

const ADMIN_EMAIL = "1.gautamkushwha4467@gmail.com";

let registrations = [];
let displayedRegistrations = [];


// ===============================
// LOAD REGISTRATIONS
// ===============================

async function loadRegistrations() {

    const rows = document.getElementById("rows");

    rows.innerHTML = `
        <tr>
            <td colspan="9">Loading...</td>
        </tr>
    `;

    try {

        const response = await fetch(
            `${API_URL}/api/admin/registrations`
        );

        if (!response.ok) {
            throw new Error("Unable to load registrations");
        }

        registrations = await response.json();

        applyFilters();

    } catch (error) {

        console.error(error);

        rows.innerHTML = `
            <tr>
                <td colspan="9">
                    Cannot connect to backend.
                </td>
            </tr>
        `;

    }

}


// ===============================
// FILTERS
// ===============================

function applyFilters() {

    const search =
        document
            .getElementById("search")
            .value
            .trim()
            .toLowerCase();

    const event =
        document
            .getElementById("eventFilter")
            .value;

    const payment =
        document
            .getElementById("paymentFilter")
            .value;


    displayedRegistrations = registrations.filter(x => {

        const participant = x.participant || {};

        const searchText = [

            x.registrationId,

            x.event,

            participant.name,

            participant.email,

            participant.phone,

            participant.department,

            participant.year

        ]
        .join(" ")
        .toLowerCase();


        const matchesSearch =
            !search ||
            searchText.includes(search);


        const matchesEvent =
            !event ||
            x.event === event;


        const matchesPayment =
            !payment ||
            (x.payment?.status || "PENDING") === payment;


        return (
            matchesSearch &&
            matchesEvent &&
            matchesPayment
        );

    });


    updateStats();

    renderTable();

}


// ===============================
// UPDATE STATISTICS
// ===============================

function updateStats() {

    document.getElementById("total").textContent =
        registrations.length;


    const pending =
        registrations.filter(
            x => (x.payment?.status || "PENDING") === "PENDING"
        ).length;


    const paid =
        registrations.filter(
            x => x.payment?.status === "PAID"
        ).length;


    document.getElementById("pending").textContent =
        pending;

    document.getElementById("paid").textContent =
        paid;

}


// ===============================
// RENDER TABLE
// ===============================

function renderTable() {

    const rows =
        document.getElementById("rows");


    if (!displayedRegistrations.length) {

        rows.innerHTML = `
            <tr>
                <td colspan="9">
                    No registrations found.
                </td>
            </tr>
        `;

        return;

    }


    rows.innerHTML =
        displayedRegistrations
            .map((x, index) => {

                const participant =
                    x.participant || {};

                const payment =
                    x.payment || {};

                const status =
                    payment.status || "PENDING";


                return `
                    <tr>

                        <td>
                            ${escapeHtml(x.registrationId || "")}
                        </td>

                        <td>
                            ${escapeHtml(x.event || "")}
                        </td>

                        <td>
                            ${escapeHtml(participant.name || "")}
                        </td>

                        <td>
                            ${escapeHtml(participant.email || "")}
                        </td>

                        <td>
                            ${escapeHtml(participant.phone || "")}
                        </td>

                        <td>
                            ${escapeHtml(participant.department || "")}
                        </td>

                        <td>
                            ${escapeHtml(participant.year || "")}
                        </td>

                        <td>
                            <span class="${
                                status === "PAID"
                                    ? "status-paid"
                                    : "status-pending"
                            }">
                                ${escapeHtml(status)}
                            </span>

                            <br>

                            ₹${payment.amount || 150}
                        </td>

                        <td>

                            <button
                                class="view-btn"
                                onclick="showDetails(${index})"
                            >
                                View
                            </button>

                        </td>

                    </tr>
                `;

            })
            .join("");

}


// ===============================
// VIEW DETAILS
// ===============================

function showDetails(index) {

    const x =
        displayedRegistrations[index];

    if (!x) return;


    const participant =
        x.participant || {};

    const payment =
        x.payment || {};

    const members =
        Array.isArray(x.members)
            ? x.members
            : [];


    let membersHtml = "";


    if (members.length === 0) {

        membersHtml =
            "<p>No additional members.</p>";

    } else {

        membersHtml =
            members.map((member, i) => {

                return `
                    <div class="member">

                        <b>Member ${i + 1}</b>

                        <p>
                            Name:
                            ${escapeHtml(member.name || "")}
                        </p>

                        <p>
                            Email:
                            ${escapeHtml(member.email || "")}
                        </p>

                        <p>
                            Phone:
                            ${escapeHtml(member.phone || "")}
                        </p>

                    </div>
                `;

            }).join("");

    }


    document.getElementById("detailsContent").innerHTML = `

        <div class="detail-grid">

            <div class="detail-card">
                <span>Registration ID</span>
                <b>${escapeHtml(x.registrationId || "")}</b>
            </div>

            <div class="detail-card">
                <span>Event</span>
                <b>${escapeHtml(x.event || "")}</b>
            </div>

            <div class="detail-card">
                <span>Name</span>
                <b>${escapeHtml(participant.name || "")}</b>
            </div>

            <div class="detail-card">
                <span>Email</span>
                <b>${escapeHtml(participant.email || "")}</b>
            </div>

            <div class="detail-card">
                <span>Phone</span>
                <b>${escapeHtml(participant.phone || "")}</b>
            </div>

            <div class="detail-card">
                <span>Department</span>
                <b>${escapeHtml(participant.department || "")}</b>
            </div>

            <div class="detail-card">
                <span>Year</span>
                <b>${escapeHtml(participant.year || "")}</b>
            </div>

            <div class="detail-card">
                <span>Payment Status</span>
                <b>${escapeHtml(payment.status || "PENDING")}</b>
            </div>

            <div class="detail-card">
                <span>Payment Amount</span>
                <b>₹${payment.amount || 150}</b>
            </div>

            <div class="detail-card">
                <span>Created At</span>
                <b>
                    ${
                        x.createdAt
                            ? new Date(x.createdAt).toLocaleString()
                            : ""
                    }
                </b>
            </div>

        </div>


        <div class="member-box">

            <h3>Additional Members</h3>

            ${membersHtml}

        </div>

    `;


    document.getElementById("detailsModal").style.display =
        "block";

}


// ===============================
// CLOSE MODAL
// ===============================

document
    .getElementById("closeModal")
    .addEventListener("click", () => {

        document.getElementById("detailsModal").style.display =
            "none";

    });


document
    .getElementById("detailsModal")
    .addEventListener("click", event => {

        if (event.target.id === "detailsModal") {

            document.getElementById("detailsModal").style.display =
                "none";

        }

    });


// ===============================
// SEARCH / FILTER
// ===============================

document
    .getElementById("search")
    .addEventListener("input", applyFilters);


document
    .getElementById("eventFilter")
    .addEventListener("change", applyFilters);


document
    .getElementById("paymentFilter")
    .addEventListener("change", applyFilters);


// ===============================
// REFRESH
// ===============================

document
    .getElementById("refreshBtn")
    .addEventListener("click", loadRegistrations);


// ===============================
// EXPORT CSV
// ===============================

document
    .getElementById("exportBtn")
    .addEventListener("click", exportCSV);


function exportCSV() {

    if (!registrations.length) {

        alert("No registrations to export.");

        return;

    }


    const headers = [

        "Registration ID",
        "Event",
        "Name",
        "Email",
        "Phone",
        "Department",
        "Year",
        "Payment Status",
        "Amount"

    ];


    const lines = [

        headers.join(",")

    ];


    registrations.forEach(x => {

        const p =
            x.participant || {};

        const payment =
            x.payment || {};


        const row = [

            x.registrationId || "",

            x.event || "",

            p.name || "",

            p.email || "",

            p.phone || "",

            p.department || "",

            p.year || "",

            payment.status || "PENDING",

            payment.amount || 150

        ];


        lines.push(
            row.map(csvEscape).join(",")
        );

    });


    const blob =
        new Blob(
            [lines.join("\n")],
            {
                type: "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download =
        "BYTEFEST-registrations.csv";


    link.click();


    URL.revokeObjectURL(url);

}


// ===============================
// IMPORT CSV
// ===============================

document
    .getElementById("importBtn")
    .addEventListener("click", () => {

        document
            .getElementById("importFile")
            .click();

    });


document
    .getElementById("importFile")
    .addEventListener("change", importCSV);


function importCSV(event) {

    const file =
        event.target.files[0];

    if (!file) return;


    const reader =
        new FileReader();


    reader.onload = function(e) {

        const text =
            e.target.result;


        const lines =
            text
                .split(/\r?\n/)
                .filter(line => line.trim());


        if (lines.length < 2) {

            alert("CSV file is empty.");

            return;

        }


        const imported = [];


        for (let i = 1; i < lines.length; i++) {

            const columns =
                parseCSVLine(lines[i]);


            if (!columns.length) continue;


            imported.push({

                registrationId: columns[0] || "",

                event: columns[1] || "",

                participant: {

                    name: columns[2] || "",

                    email: columns[3] || "",

                    phone: columns[4] || "",

                    department: columns[5] || "",

                    year: columns[6] || ""

                },

                payment: {

                    status: columns[7] || "PENDING",

                    amount: columns[8] || 150

                },

                members: []

            });

        }


        registrations =
            imported;

        applyFilters();


        alert(
            `${imported.length} registrations imported into the dashboard view.`
        );

    };


    reader.readAsText(file);

}


// ===============================
// CSV HELPERS
// ===============================

function csvEscape(value) {

    const text =
        String(value ?? "");


    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n")
    ) {

        return `"${text.replace(/"/g, '""')}"`;

    }


    return text;

}


function parseCSVLine(line) {

    const result = [];

    let current = "";

    let insideQuotes = false;


    for (let i = 0; i < line.length; i++) {

        const char = line[i];


        if (char === '"') {

            if (
                insideQuotes &&
                line[i + 1] === '"'
            ) {

                current += '"';

                i++;

            } else {

                insideQuotes =
                    !insideQuotes;

            }

        } else if (
            char === "," &&
            !insideQuotes
        ) {

            result.push(current);

            current = "";

        } else {

            current += char;

        }

    }


    result.push(current);


    return result;

}


// ===============================
// SECURITY
// ===============================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ===============================
// LOGOUT
// ===============================

document
    .getElementById("logout")
    .addEventListener("click", event => {

        event.preventDefault();

        sessionStorage.removeItem(
            "bytefest_admin"
        );

        location.href =
            "index.html";

    });


// ===============================
// START
// ===============================

loadRegistrations();