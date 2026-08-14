const API_URL = "https://byte-fest-backend.onrender.com";

let registrations = [];
let displayedRegistrations = [];

const ADMIN_STORAGE_KEY = "bytefest_admin";


// =====================================================
// AUTH
// =====================================================

function getAdminToken() {
    return sessionStorage.getItem(ADMIN_STORAGE_KEY);
}


function getAuthHeaders() {
    const token = getAdminToken();

    return token
        ? {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
        : {
            "Content-Type": "application/json"
        };
}


function showLogin() {
    const login = document.getElementById("adminLogin");
    const dashboard = document.getElementById("adminDashboard");

    if (login) {
        login.style.display = "block";
    }

    if (dashboard) {
        dashboard.style.display = "none";
    }
}


function showDashboard() {
    const login = document.getElementById("adminLogin");
    const dashboard = document.getElementById("adminDashboard");

    if (login) {
        login.style.display = "none";
    }

    if (dashboard) {
        dashboard.style.display = "block";
    }
}


// =====================================================
// ADMIN LOGIN
// =====================================================

async function adminLogin(event) {

    event.preventDefault();

    const emailInput =
        document.getElementById("adminEmail");

    const loginMessage =
        document.getElementById("loginMessage");

    const email =
        emailInput.value.trim().toLowerCase();

    if (!email) {
        loginMessage.textContent =
            "Please enter your admin email.";

        return;
    }

    loginMessage.textContent =
        "Checking admin access...";

    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/check`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.allowed || !data.token) {

            loginMessage.textContent =
                data.message ||
                "This email is not an approved admin.";

            return;
        }

        // Store the authentication token
        sessionStorage.setItem(
            ADMIN_STORAGE_KEY,
            data.token
        );

        sessionStorage.setItem(
            "bytefest_admin_email",
            data.email || email
        );

        loginMessage.textContent =
            "Login successful.";

        showDashboard();

        await loadRegistrations();

    } catch (error) {

        console.error(
            "Admin login error:",
            error
        );

        loginMessage.textContent =
            "Cannot connect to BYTEFEST server.";
    }
}


// =====================================================
// LOGOUT
// =====================================================

function logout() {

    sessionStorage.removeItem(
        ADMIN_STORAGE_KEY
    );

    sessionStorage.removeItem(
        "bytefest_admin_email"
    );

    registrations = [];
    displayedRegistrations = [];

    showLogin();
}


// =====================================================
// LOAD REGISTRATIONS
// =====================================================

async function loadRegistrations() {

    const rows =
        document.getElementById("rows");

    if (!rows) {
        return;
    }

    const token =
        getAdminToken();

    if (!token) {

        showLogin();

        return;
    }

    rows.innerHTML = `
        <tr>
            <td colspan="9">
                Loading registrations...
            </td>
        </tr>
    `;

    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/registrations`,
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );


        if (response.status === 401 ||
            response.status === 403) {

            sessionStorage.removeItem(
                ADMIN_STORAGE_KEY
            );

            showLogin();

            return;
        }


        if (!response.ok) {

            const data =
                await response.json().catch(
                    () => ({})
                );

            throw new Error(
                data.message ||
                "Unable to load registrations"
            );
        }


        registrations =
            await response.json();


        applyFilters();


    } catch (error) {

        console.error(
            "Load registrations error:",
            error
        );

        rows.innerHTML = `
            <tr>
                <td colspan="9">
                    Cannot load registrations.
                    <br>
                    ${escapeHtml(error.message)}
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
        document.getElementById(
            "eventFilter"
        ).value;

    const payment =
        document.getElementById(
            "paymentFilter"
        ).value;


    displayedRegistrations =
        registrations.filter(
            registration => {

                const participant =
                    registration.participant || {};

                const members =
                    Array.isArray(
                        registration.members
                    )
                        ? registration.members
                        : [];


                const memberSearchText =
                    members
                        .map(
                            member =>
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
                    registration.payment?.status ||
                    "PENDING";


                const matchesPayment =
                    !payment ||
                    status === payment;


                return (
                    matchesSearch &&
                    matchesEvent &&
                    matchesPayment
                );
            }
        );


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
                (x.payment?.status ||
                    "PENDING") ===
                "PENDING"
        ).length;


    const paid =
        registrations.filter(
            x =>
                x.payment?.status ===
                "PAID"
        ).length;


    document.getElementById(
        "total"
    ).textContent = total;


    document.getElementById(
        "pending"
    ).textContent = pending;


    document.getElementById(
        "paid"
    ).textContent = paid;
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
            .map(
                (registration, index) => {

                    const participant =
                        registration.participant ||
                        {};

                    const payment =
                        registration.payment ||
                        {};

                    const status =
                        payment.status ||
                        "PENDING";


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
                                    registration.registrationId ||
                                    ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    registration.event ||
                                    ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    participant.name ||
                                    ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    participant.email ||
                                    ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    participant.phone ||
                                    ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    participant.department ||
                                    ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    participant.year ||
                                    ""
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
                }
            )
            .join("");
}


// =====================================================
// APPROVE PAYMENT
// =====================================================

async function approvePayment(
    registrationId
) {

    const registration =
        registrations.find(
            x =>
                x.registrationId ===
                registrationId
        );


    if (!registration) {

        alert(
            "Registration not found."
        );

        return;
    }


    const participant =
        registration.participant || {};


    const confirmApproval =
        confirm(
            `Approve payment for ${
                participant.name ||
                "participant"
            }?\n\n` +

            `Registration ID: ${
                registrationId
            }\n` +

            `Amount: ₹${
                registration.payment?.amount ||
                150
            }`
        );


    if (!confirmApproval) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/registrations/${encodeURIComponent(
                    registrationId
                )}/approve`,
                {
                    method: "PATCH",
                    headers: getAuthHeaders()
                }
            );


        const data =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            sessionStorage.removeItem(
                ADMIN_STORAGE_KEY
            );

            showLogin();

            return;
        }


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
        registration.participant ||
        {};

    const payment =
        registration.payment ||
        {};

    const members =
        Array.isArray(
            registration.members
        )
            ? registration.members
            : [];


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
                .map(
                    (member, i) => {

                        return `
                            <div class="member">

                                <h4>
                                    Member ${i + 1}
                                </h4>

                                <p>
                                    <b>Name:</b>
                                    ${escapeHtml(
                                        member.name ||
                                        ""
                                    )}
                                </p>

                                <p>
                                    <b>Email:</b>
                                    ${escapeHtml(
                                        member.email ||
                                        ""
                                    )}
                                </p>

                                <p>
                                    <b>Phone:</b>
                                    ${escapeHtml(
                                        member.phone ||
                                        ""
                                    )}
                                </p>

                            </div>
                        `;
                    }
                )
                .join("");
    }


    // =================================================
    // PAYMENT SCREENSHOT
    // =================================================

    let screenshotHtml = "";

    if (payment.screenshot) {

        screenshotHtml = `
            <div class="detail-card"
                 style="grid-column:1/-1">

                <span>
                    Payment Screenshot
                </span>

                <div style="margin-top:10px">

                    <img
                        src="${escapeAttribute(
                            payment.screenshot
                        )}"
                        alt="Payment Screenshot"
                        style="
                            max-width:100%;
                            max-height:500px;
                            border-radius:10px;
                            border:1px solid #334155;
                        "
                    >

                </div>

                <p style="margin-top:10px">

                    <a
                        href="${escapeAttribute(
                            payment.screenshot
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Open Full Screenshot
                    </a>

                </p>

            </div>
        `;

    } else {

        screenshotHtml = `
            <div class="detail-card"
                 style="grid-column:1/-1">

                <span>
                    Payment Screenshot
                </span>

                <b>
                    Not uploaded
                </b>

            </div>
        `;
    }


    // =================================================
    // UTR
    // =================================================

    const utrHtml = `
        <div class="detail-card">

            <span>
                UTR / Transaction ID
            </span>

            <b>
                ${escapeHtml(
                    payment.utr ||
                    "Not provided"
                )}
            </b>

        </div>
    `;


    // =================================================
    // PAYMENT ID
    // =================================================

    const paymentIdHtml = `
        <div class="detail-card">

            <span>
                Payment ID
            </span>

            <b>
                ${escapeHtml(
                    payment.paymentId ||
                    "Not available"
                )}
            </b>

        </div>
    `;


    // =================================================
    // GROUP LINK
    // =================================================

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


    // =================================================
    // PAYMENT ACTION
    // =================================================

    let paymentActionHtml = "";


    if (
        payment.status !==
        "PAID"
    ) {

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
                        registration.registrationId ||
                        ""
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Event
                </span>

                <b>
                    ${escapeHtml(
                        registration.event ||
                        ""
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Name
                </span>

                <b>
                    ${escapeHtml(
                        participant.name ||
                        ""
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Email
                </span>

                <b>
                    ${escapeHtml(
                        participant.email ||
                        ""
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Phone
                </span>

                <b>
                    ${escapeHtml(
                        participant.phone ||
                        ""
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Department
                </span>

                <b>
                    ${escapeHtml(
                        participant.department ||
                        ""
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Year
                </span>

                <b>
                    ${escapeHtml(
                        participant.year ||
                        ""
                    )}
                </b>
            </div>


            <div class="detail-card">
                <span>
                    Payment Status
                </span>

                <b>
                    ${escapeHtml(
                        payment.status ||
                        "PENDING"
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


            ${utrHtml}

            ${paymentIdHtml}

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

            ${screenshotHtml}

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
    ).style.display =
        "block";
}


// =====================================================
// CLOSE MODAL
// =====================================================

function closeModal() {

    document.getElementById(
        "detailsModal"
    ).style.display =
        "none";
}


// =====================================================
// CSV EXPORT
// =====================================================

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
        "UTR",
        "Payment ID",
        "Payment Screenshot",

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


    registrations.forEach(
        registration => {

            const participant =
                registration.participant ||
                {};

            const payment =
                registration.payment ||
                {};

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

                registration.registrationId ||
                "",

                registration.event ||
                "",

                participant.name ||
                "",

                participant.email ||
                "",

                participant.phone ||
                "",

                participant.department ||
                "",

                participant.year ||
                "",

                payment.status ||
                "PENDING",

                payment.amount ||
                150,

                payment.utr ||
                "",

                payment.paymentId ||
                "",

                payment.screenshot ||
                "",

                member1.name ||
                "",

                member1.email ||
                "",

                member1.phone ||
                "",

                member2.name ||
                "",

                member2.email ||
                "",

                member2.phone ||
                "",

                registration.groupLink ||
                "",

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
        }
    );


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


    document.body.appendChild(
        link
    );

    link.click();

    document.body.removeChild(
        link
    );

    URL.revokeObjectURL(url);
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
// HTML SECURITY
// =====================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


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
// START
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const loginForm =
            document.getElementById(
                "adminLoginForm"
            );

        const logoutBtn =
            document.getElementById(
                "logout"
            );

        const closeBtn =
            document.getElementById(
                "closeModal"
            );

        const modal =
            document.getElementById(
                "detailsModal"
            );


        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                adminLogin
            );
        }


        if (logoutBtn) {

            logoutBtn.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    logout();
                }
            );
        }


        if (closeBtn) {

            closeBtn.addEventListener(
                "click",
                closeModal
            );
        }


        if (modal) {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target.id ===
                        "detailsModal"
                    ) {
                        closeModal();
                    }
                }
            );
        }


        const search =
            document.getElementById(
                "search"
            );

        if (search) {

            search.addEventListener(
                "input",
                applyFilters
            );
        }


        const eventFilter =
            document.getElementById(
                "eventFilter"
            );

        if (eventFilter) {

            eventFilter.addEventListener(
                "change",
                applyFilters
            );
        }


        const paymentFilter =
            document.getElementById(
                "paymentFilter"
            );

        if (paymentFilter) {

            paymentFilter.addEventListener(
                "change",
                applyFilters
            );
        }


        const refreshBtn =
            document.getElementById(
                "refreshBtn"
            );

        if (refreshBtn) {

            refreshBtn.addEventListener(
                "click",
                loadRegistrations
            );
        }


        const exportBtn =
            document.getElementById(
                "exportBtn"
            );

        if (exportBtn) {

            exportBtn.addEventListener(
                "click",
                exportCSV
            );
        }


        const token =
            getAdminToken();


        if (token) {

            showDashboard();

            loadRegistrations();

        } else {

            showLogin();
        }
    }
);
