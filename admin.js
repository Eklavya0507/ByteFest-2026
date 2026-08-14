```javascript
const API_URL = "https://byte-fest-backend.onrender.com";

let registrations = [];
let displayedRegistrations = [];


// =====================================================
// LOAD REGISTRATIONS
// =====================================================

async function loadRegistrations() {

    const rows = document.getElementById("rows");

    rows.innerHTML = `
        <tr>
            <td colspan="9">Loading registrations...</td>
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

        console.error("Load registrations error:", error);

        rows.innerHTML = `
            <tr>
                <td colspan="9">
                    Cannot connect to backend.
                    <br>
                    Please make sure the backend is running.
                </td>
            </tr>
        `;
    }
}


// =====================================================
// FILTERS
// =====================================================

function applyFilters() {

    const search =
        document
            .getElementById("search")
            .value
            .trim()
            .toLowerCase();

    const event =
        document.getElementById("eventFilter").value;

    const payment =
        document.getElementById("paymentFilter").value;


    displayedRegistrations =
        registrations.filter(registration => {

            const participant =
                registration.participant || {};

            const members =
                Array.isArray(registration.members)
                    ? registration.members
                    : [];


            // Search main participant + members
            const memberSearchText =
                members
                    .map(member =>
                        [
                            member.name,
                            member.email,
                            member.phone
                        ].join(" ")
                    )
                    .join(" ");


            const searchText = [

                registration.registrationId,
                registration.event,

                participant.name,
                participant.email,
                participant.phone,
                participant.department,
                participant.year,

                memberSearchText

            ]
                .join(" ")
                .toLowerCase();


            const matchesSearch =
                !search ||
                searchText.includes(search);


            const matchesEvent =
                !event ||
                registration.event === event;


            const status =
                registration.payment?.status || "PENDING";


            const matchesPayment =
                !payment ||
                status === payment;


            return (
                matchesSearch &&
                matchesEvent &&
                matchesPayment
            );

        });


    updateStats();
    renderTable();
}


// =====================================================
// STATISTICS
// =====================================================

function updateStats() {

    const total =
        registrations.length;


    const pending =
        registrations.filter(
            x =>
                (x.payment?.status || "PENDING")
                === "PENDING"
        ).length;


    const paid =
        registrations.filter(
            x =>
                x.payment?.status === "PAID"
        ).length;


    document.getElementById("total").textContent =
        total;

    document.getElementById("pending").textContent =
        pending;

    document.getElementById("paid").textContent =
        paid;
}


// =====================================================
// RENDER TABLE
// =====================================================

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
            .map((registration, index) => {

                const participant =
                    registration.participant || {};

                const payment =
                    registration.payment || {};

                const status =
                    payment.status || "PENDING";


                let paymentHtml = "";


                if (status === "PAID") {

                    paymentHtml = `
                        <span class="status-paid">
                            PAID
                        </span>

                        <br>

                        ₹${payment.amount || 150}

                        <br>

                        <small>
                            Approved
                        </small>
                    `;

                } else {

                    paymentHtml = `
                        <span class="status-pending">
                            PENDING
                        </span>

                        <br>

                        ₹${payment.amount || 150}

                        <br><br>

                        <button
                            class="view-btn"
                            onclick="approvePayment('${escapeJs(
                                registration.registrationId
                            )}')"
                        >
                            ✓ Approve
                        </button>
                    `;
                }


                return `
                    <tr>

                        <td>
                            ${escapeHtml(
                                registration.registrationId || ""
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                registration.event || ""
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                participant.name || ""
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                participant.email || ""
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                participant.phone || ""
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                participant.department || ""
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                participant.year || ""
                            )}
                        </td>


                        <td>
                            ${paymentHtml}
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


// =====================================================
// APPROVE PAYMENT
// =====================================================

async function approvePayment(registrationId) {

    const registration =
        registrations.find(
            x =>
                x.registrationId === registrationId
        );


    if (!registration) {

        alert("Registration not found.");

        return;
    }


    const participant =
        registration.participant || {};


    const confirmApproval =
        confirm(
            `Approve payment for ${participant.name || "participant"}?\n\n` +
            `Registration ID: ${registrationId}\n` +
            `Amount: ₹${registration.payment?.amount || 150}`
        );


    if (!confirmApproval) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/registrations/${encodeURIComponent(registrationId)}/approve`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Payment approval failed"
            );
        }


        alert(
            "Payment approved successfully!"
        );


        await loadRegistrations();


    } catch (error) {

        console.error(
            "Approve payment error:",
            error
        );


        alert(
            "Could not approve payment.\n\n" +
            error.message
        );
    }
}


// =====================================================
// VIEW DETAILS
// =====================================================

function showDetails(index) {

    const registration =
        displayedRegistrations[index];


    if (!registration) {
        return;
    }


    const participant =
        registration.participant || {};

    const payment =
        registration.payment || {};

    const members =
        Array.isArray(registration.members)
            ? registration.members
            : [];


    // -----------------------------------------------
    // MEMBERS
    // -----------------------------------------------

    let membersHtml = "";


    if (members.length === 0) {

        membersHtml = `
            <p>
                No additional members.
            </p>
        `;

    } else {

        membersHtml =
            members
                .map((member, i) => {

                    return `
                        <div class="member">

                            <h4>
                                Member ${i + 1}
                            </h4>

                            <p>
                                <b>Name:</b>
                                ${escapeHtml(
                                    member.name || ""
                                )}
                            </p>

                            <p>
                                <b>Email:</b>
                                ${escapeHtml(
                                    member.email || ""
                                )}
                            </p>

                            <p>
                                <b>Phone:</b>
                                ${escapeHtml(
                                    member.phone || ""
                                )}
                            </p>

                        </div>
                    `;

                })
                .join("");
    }


    // -----------------------------------------------
    // GROUP LINK
    // -----------------------------------------------

    let groupLinkHtml = "";


    if (
        payment.status === "PAID" &&
        registration.groupLink
    ) {

        groupLinkHtml = `

            <div class="detail-card">

                <span>
                    WhatsApp / Group Link
                </span>

                <b>

                    <a
                        href="${escapeAttribute(
                            registration.groupLink
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Open Group
                    </a>

                </b>

            </div>

        `;
    }


    // -----------------------------------------------
    // PAYMENT ACTION
    // -----------------------------------------------

    let paymentActionHtml = "";


    if (payment.status !== "PAID") {

        paymentActionHtml = `

            <div
                style="
                    margin-top:20px;
                    padding:15px;
                    border-radius:10px;
                    background:#1f2937;
                "
            >

                <strong>
                    Payment is still pending.
                </strong>

                <br><br>

                <button
                    class="view-btn"
                    onclick="approvePayment('${escapeJs(
                        registration.registrationId
                    )}')"
                >
                    ✓ Approve Payment
                </button>

            </div>

        `;
    }


    // -----------------------------------------------
    // MODAL CONTENT
    // -----------------------------------------------

    document.getElementById(
        "detailsContent"
    ).innerHTML = `

        <div class="detail-grid">

            <div class="detail-card">
                <span>
                    Registration ID
                </span>

                <b>
                    ${escapeHtml(
                        registration.registrationId || ""
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Event
                </span>

                <b>
                    ${escapeHtml(
                        registration.event || ""
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Name
                </span>

                <b>
                    ${escapeHtml(
                        participant.name || ""
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Email
                </span>

                <b>
                    ${escapeHtml(
                        participant.email || ""
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Phone
                </span>

                <b>
                    ${escapeHtml(
                        participant.phone || ""
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Department
                </span>

                <b>
                    ${escapeHtml(
                        participant.department || ""
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Year
                </span>

                <b>
                    ${escapeHtml(
                        participant.year || ""
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Payment Status
                </span>

                <b>
                    ${escapeHtml(
                        payment.status || "PENDING"
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Payment Amount
                </span>

                <b>
                    ₹${payment.amount || 150}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Payment ID
                </span>

                <b>
                    ${escapeHtml(
                        payment.paymentId || "Not available"
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Registered At
                </span>

                <b>
                    ${
                        registration.createdAt
                            ? new Date(
                                registration.createdAt
                              ).toLocaleString()
                            : ""
                    }
                </b>
            </div>


            ${groupLinkHtml}

        </div>


        <div class="member-box">

            <h3>
                Additional Members
            </h3>

            ${membersHtml}

        </div>


        ${paymentActionHtml}

    `;


    document.getElementById(
        "detailsModal"
    ).style.display = "block";
}


// =====================================================
// CLOSE MODAL
// =====================================================

document
    .getElementById("closeModal")
    .addEventListener(
        "click",
        () => {

            document.getElementById(
                "detailsModal"
            ).style.display = "none";

        }
    );


document
    .getElementById("detailsModal")
    .addEventListener(
        "click",
        event => {

            if (
                event.target.id ===
                "detailsModal"
            ) {

                document.getElementById(
                    "detailsModal"
                ).style.display = "none";
            }

        }
    );


// =====================================================
// SEARCH
// =====================================================

document
    .getElementById("search")
    .addEventListener(
        "input",
        applyFilters
    );


// =====================================================
// EVENT FILTER
// =====================================================

document
    .getElementById("eventFilter")
    .addEventListener(
        "change",
        applyFilters
    );


// =====================================================
// PAYMENT FILTER
// =====================================================

document
    .getElementById("paymentFilter")
    .addEventListener(
        "change",
        applyFilters
    );


// =====================================================
// REFRESH
// =====================================================

document
    .getElementById("refreshBtn")
    .addEventListener(
        "click",
        loadRegistrations
    );


// =====================================================
// EXPORT CSV
// =====================================================

document
    .getElementById("exportBtn")
    .addEventListener(
        "click",
        exportCSV
    );


function exportCSV() {

    if (!registrations.length) {

        alert(
            "No registrations to export."
        );

        return;
    }


    const headers = [

        "Registration ID",
        "Event",

        "Participant Name",
        "Participant Email",
        "Participant Phone",
        "Department",
        "Year",

        "Payment Status",
        "Amount",
        "Payment ID",

        "Member 1 Name",
        "Member 1 Email",
        "Member 1 Phone",

        "Member 2 Name",
        "Member 2 Email",
        "Member 2 Phone",

        "Group Link",
        "Created At"

    ];


    const lines = [
        headers.join(",")
    ];


    registrations.forEach(registration => {

        const participant =
            registration.participant || {};

        const payment =
            registration.payment || {};

        const members =
            Array.isArray(
                registration.members
            )
                ? registration.members
                : [];


        const member1 =
            members[0] || {};

        const member2 =
            members[1] || {};


        const row = [

            registration.registrationId || "",

            registration.event || "",


            participant.name || "",
            participant.email || "",
            participant.phone || "",
            participant.department || "",
            participant.year || "",


            payment.status || "PENDING",

            payment.amount || 150,

            payment.paymentId || "",


            member1.name || "",
            member1.email || "",
            member1.phone || "",


            member2.name || "",
            member2.email || "",
            member2.phone || "",


            registration.groupLink || "",


            registration.createdAt
                ? new Date(
                    registration.createdAt
                  ).toLocaleString()
                : ""

        ];


        lines.push(
            row
                .map(csvEscape)
                .join(",")
        );

    });


    const blob =
        new Blob(
            [
                "\uFEFF" +
                lines.join("\n")
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download =
        "BYTEFEST-registrations.csv";


    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);


    URL.revokeObjectURL(url);
}


// =====================================================
// IMPORT CSV
// =====================================================

document
    .getElementById("importBtn")
    .addEventListener(
        "click",
        () => {

            document
                .getElementById("importFile")
                .click();

        }
    );


document
    .getElementById("importFile")
    .addEventListener(
        "change",
        importCSV
    );


function importCSV(event) {

    const file =
        event.target.files[0];


    if (!file) {
        return;
    }


    const reader =
        new FileReader();


    reader.onload =
        function(e) {

            try {

                const text =
                    e.target.result;


                const lines =
                    text
                        .split(/\r?\n/)
                        .filter(
                            line =>
                                line.trim()
                        );


                if (lines.length < 2) {

                    alert(
                        "CSV file is empty."
                    );

                    return;
                }


                const imported = [];


                for (
                    let i = 1;
                    i < lines.length;
                    i++
                ) {

                    const columns =
                        parseCSVLine(
                            lines[i]
                        );


                    if (!columns.length) {
                        continue;
                    }


                    imported.push({

                        registrationId:
                            columns[0] || "",

                        event:
                            columns[1] || "",


                        participant: {

                            name:
                                columns[2] || "",

                            email:
                                columns[3] || "",

                            phone:
                                columns[4] || "",

                            department:
                                columns[5] || "",

                            year:
                                columns[6] || ""

                        },


                        payment: {

                            status:
                                columns[7] ||
                                "PENDING",

                            amount:
                                columns[8] ||
                                150,

                            paymentId:
                                columns[9] ||
                                ""

                        },


                        members: [

                            {
                                name:
                                    columns[10] || "",

                                email:
                                    columns[11] || "",

                                phone:
                                    columns[12] || ""
                            },

                            {
                                name:
                                    columns[13] || "",

                                email:
                                    columns[14] || "",

                                phone:
                                    columns[15] || ""
                            }

                        ].filter(
                            member =>
                                member.name ||
                                member.email ||
                                member.phone
                        ),


                        groupLink:
                            columns[16] || "",

                        createdAt:
                            columns[17] || ""

                    });

                }


                registrations =
                    imported;


                applyFilters();


                alert(
                    `${imported.length} registrations imported successfully.`
                );


            } catch (error) {

                console.error(
                    "CSV import error:",
                    error
                );


                alert(
                    "Unable to import CSV."
                );
            }

        };


    reader.readAsText(file);


    // Allow selecting the same file again
    event.target.value = "";
}


// =====================================================
// CSV ESCAPE
// =====================================================

function csvEscape(value) {

    const text =
        String(value ?? "");


    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n") ||
        text.includes("\r")
    ) {

        return `"${text.replace(
            /"/g,
            '""'
        )}"`;

    }


    return text;
}


// =====================================================
// CSV PARSER
// =====================================================

function parseCSVLine(line) {

    const result = [];

    let current = "";

    let insideQuotes = false;


    for (
        let i = 0;
        i < line.length;
        i++
    ) {

        const char =
            line[i];


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


// =====================================================
// HTML SECURITY
// =====================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// =====================================================
// JAVASCRIPT STRING SECURITY
// =====================================================

function escapeJs(value) {

    return String(value ?? "")
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        )
        .replace(
            /"/g,
            '\\"'
        )
        .replace(
            /\r/g,
            "\\r"
        )
        .replace(
            /\n/g,
            "\\n"
        );
}


// =====================================================
// ATTRIBUTE SECURITY
// =====================================================

function escapeAttribute(value) {

    return String(value ?? "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        );
}


// =====================================================
// LOGOUT
// =====================================================

document
    .getElementById("logout")
    .addEventListener(
        "click",
        event => {

            event.preventDefault();

            sessionStorage.removeItem(
                "bytefest_admin"
            );

            location.href =
                "index.html";
        }
    );


// =====================================================
// START
// =====================================================

loadRegistrations();
```
