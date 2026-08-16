// =====================================================
// BYTEFEST 2026 - ADMIN SYSTEM
// =====================================================

const API_URL = "https://byte-fest-backend.onrender.com";

const ADMIN_STORAGE_KEY = "bytefest_admin";
const ADMIN_EMAIL_KEY = "bytefest_admin_email";

let registrations = [];
let displayedRegistrations = [];


// =====================================================
// AUTH STORAGE
// =====================================================

function getAdminToken() {
    return sessionStorage.getItem(
        ADMIN_STORAGE_KEY
    );
}


function getAdminEmail() {
    return sessionStorage.getItem(
        ADMIN_EMAIL_KEY
    );
}


function getAuthHeaders() {

    const token = getAdminToken();

    return {
        "Content-Type": "application/json",

        ...(token
            ? {
                "Authorization": `Bearer ${token}`
            }
            : {})
    };
}


function clearAdminSession() {

    sessionStorage.removeItem(
        ADMIN_STORAGE_KEY
    );

    sessionStorage.removeItem(
        ADMIN_EMAIL_KEY
    );

    sessionStorage.removeItem(
        "bytefestAdminEmail"
    );
}


// =====================================================
// PAGE HELPERS
// =====================================================

function showLogin() {

    const login =
        document.getElementById(
            "adminLogin"
        );

    const dashboard =
        document.getElementById(
            "adminDashboard"
        );

    const logout =
        document.getElementById(
            "logout"
        );


    if (login) {
        login.style.display = "block";
    }


    if (dashboard) {
        dashboard.style.display = "none";
    }


    if (logout) {
        logout.style.display = "none";
    }
}


function showDashboard() {

    const login =
        document.getElementById(
            "adminLogin"
        );

    const dashboard =
        document.getElementById(
            "adminDashboard"
        );

    const logout =
        document.getElementById(
            "logout"
        );


    if (login) {
        login.style.display = "none";
    }


    if (dashboard) {
        dashboard.style.display = "block";
    }


    if (logout) {
        logout.style.display = "";
    }
}


// =====================================================
// ADMIN LOGIN
// =====================================================

async function adminLogin(event) {

    event.preventDefault();


    const emailInput =
        document.getElementById(
            "adminEmail"
        );


    const loginMessage =
        document.getElementById(
            "adminMessage"
        ) ||
        document.getElementById(
            "loginMessage"
        );


    if (!emailInput) {

        console.error(
            "Admin email input not found."
        );

        return;
    }


    const email =
        emailInput.value
            .trim()
            .toLowerCase();


    if (!email) {

        if (loginMessage) {

            loginMessage.textContent =
                "Please enter your admin email.";
        }

        return;
    }


    if (loginMessage) {

        loginMessage.textContent =
            "Checking admin access...";
    }


    console.log(
        "Attempting admin login:",
        email
    );


    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/check`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        email
                    })
                }
            );


        console.log(
            "Admin login HTTP status:",
            response.status
        );


        // ---------------------------------------------
        // Read response safely
        // ---------------------------------------------

        const responseText =
            await response.text();


        let data = {};


        try {

            data =
                responseText
                    ? JSON.parse(
                        responseText
                    )
                    : {};

        } catch (parseError) {

            console.error(
                "Backend returned invalid JSON:",
                responseText
            );


            if (loginMessage) {

                loginMessage.textContent =
                    "BYTEFEST backend returned an invalid response.";
            }

            return;
        }


        console.log(
            "Admin login response:",
            {
                status:
                    response.status,

                allowed:
                    data.allowed,

                email:
                    data.email,

                tokenReceived:
                    Boolean(
                        data.token
                    ),

                message:
                    data.message
            }
        );


        // ---------------------------------------------
        // HTTP ERROR
        // ---------------------------------------------

        if (!response.ok) {

            if (loginMessage) {

                loginMessage.textContent =
                    data.message ||
                    `Admin login failed. HTTP ${response.status}`;
            }

            return;
        }


        // ---------------------------------------------
        // ADMIN NOT APPROVED
        // ---------------------------------------------

        if (!data.allowed) {

            if (loginMessage) {

                loginMessage.textContent =
                    data.message ||
                    "This email is not an approved admin.";
            }

            return;
        }


        // ---------------------------------------------
        // TOKEN MISSING
        // ---------------------------------------------

        if (!data.token) {

            console.error(
                "Admin approved but token was not returned.",
                data
            );


            if (loginMessage) {

                loginMessage.textContent =
                    "Admin approved, but no login token was received.";
            }

            return;
        }


        // =================================================
        // SAVE TOKEN
        // =================================================

        sessionStorage.setItem(
            ADMIN_STORAGE_KEY,
            data.token
        );


        sessionStorage.setItem(
            ADMIN_EMAIL_KEY,
            data.email || email
        );


        // Compatibility with older frontend code
        sessionStorage.setItem(
            "bytefestAdminEmail",
            data.email || email
        );


        console.log(
            "Admin session saved successfully."
        );


        if (loginMessage) {

            loginMessage.textContent =
                "Login successful. Opening admin dashboard...";
        }


        // =================================================
        // REDIRECT TO DASHBOARD
        // =================================================

        window.location.replace(
            "admin.html"
        );


    } catch (error) {

        console.error(
            "ADMIN LOGIN NETWORK ERROR:",
            error
        );


        if (loginMessage) {

            loginMessage.textContent =
                "Unable to contact BYTEFEST backend: " +
                error.message;
        }
    }
}


// =====================================================
// LOGOUT
// =====================================================

function logout() {

    clearAdminSession();

    registrations = [];
    displayedRegistrations = [];


    console.log(
        "Admin logged out."
    );


    window.location.replace(
        "admin-login.html"
    );
}


// =====================================================
// ADMIN PAGE GUARD
// =====================================================

function protectAdminPage() {

    const dashboard =
        document.getElementById(
            "adminDashboard"
        );


    // Not the dashboard page
    if (!dashboard) {
        return;
    }


    const token =
        getAdminToken();


    if (!token) {

        console.log(
            "No admin session found."
        );


        window.location.replace(
            "admin-login.html"
        );

        return;
    }


    showDashboard();
}


// =====================================================
// HANDLE INVALID / EXPIRED SESSION
// =====================================================

function handleUnauthorized() {

    console.warn(
        "Admin authentication rejected."
    );


    clearAdminSession();


    window.location.replace(
        "admin-login.html"
    );
}


// =====================================================
// LOAD REGISTRATIONS
// =====================================================

async function loadRegistrations() {

    const rows =
        document.getElementById(
            "rows"
        );


    if (!rows) {
        return;
    }


    const token =
        getAdminToken();


    if (!token) {

        handleUnauthorized();

        return;
    }


    rows.innerHTML = `
        <tr>
            <td colspan="9">
                Loading registrations...
            </td>
        </tr>
    `;


    console.log(
        "Loading registrations..."
    );


    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/registrations`,
                {
                    method: "GET",

                    headers:
                        getAuthHeaders()
                }
            );


        console.log(
            "Registrations HTTP status:",
            response.status
        );


        // ---------------------------------------------
        // TOKEN INVALID
        // ---------------------------------------------

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleUnauthorized();

            return;
        }


        // ---------------------------------------------
        // READ RESPONSE
        // ---------------------------------------------

        const responseText =
            await response.text();


        let data;


        try {

            data =
                responseText
                    ? JSON.parse(
                        responseText
                    )
                    : [];

        } catch (error) {

            console.error(
                "Registration response was not JSON:",
                responseText
            );


            throw new Error(
                "Backend returned an invalid registration response."
            );
        }


        // ---------------------------------------------
        // HTTP ERROR
        // ---------------------------------------------

        if (!response.ok) {

            throw new Error(
                data.message ||
                `Unable to load registrations. HTTP ${response.status}`
            );
        }


        // ---------------------------------------------
        // NORMALIZE RESPONSE
        // ---------------------------------------------

        if (
            Array.isArray(data)
        ) {

            registrations =
                data;

        } else if (
            Array.isArray(
                data.registrations
            )
        ) {

            registrations =
                data.registrations;

        } else {

            registrations =
                [];
        }


        console.log(
            "Registrations loaded:",
            registrations.length
        );


        populateEventFilter();

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
                    <br><br>
                    ${escapeHtml(
                        error.message
                    )}
                </td>
            </tr>
        `;
    }
}


// =====================================================
// POPULATE EVENT FILTER
// =====================================================

function populateEventFilter() {

    const eventFilter =
        document.getElementById(
            "eventFilter"
        );


    if (!eventFilter) {
        return;
    }


    const selectedValue =
        eventFilter.value;


    const events =
        [
            ...new Set(
                registrations
                    .map(
                        registration =>
                            String(
                                registration.event ||
                                ""
                            ).trim()
                    )
                    .filter(Boolean)
            )
        ]
            .sort(
                (a, b) =>
                    a.localeCompare(b)
            );


    eventFilter.innerHTML = `
        <option value="">
            All Events
        </option>
    `;


    events.forEach(
        eventName => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                eventName;


            option.textContent =
                eventName;


            eventFilter.appendChild(
                option
            );
        }
    );


    if (
        events.includes(
            selectedValue
        )
    ) {

        eventFilter.value =
            selectedValue;
    }
}


// =====================================================
// FILTERS
// =====================================================

function applyFilters() {

    const searchElement =
        document.getElementById(
            "search"
        );


    const eventElement =
        document.getElementById(
            "eventFilter"
        );


    const paymentElement =
        document.getElementById(
            "paymentFilter"
        );


    const search =
        searchElement
            ? searchElement.value
                .trim()
                .toLowerCase()
            : "";


    const event =
        eventElement
            ? eventElement.value
            : "";


    const payment =
        paymentElement
            ? paymentElement.value
                .toUpperCase()
            : "";


    displayedRegistrations =
        registrations.filter(
            registration => {

                const participant =
                    registration.participant ||
                    {};


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
                                ]
                                    .filter(Boolean)
                                    .join(" ")
                        )
                        .join(" ");


                const searchText =
                    [
                        registration.registrationId,
                        registration.event,

                        participant.name,
                        participant.email,
                        participant.phone,
                        participant.department,
                        participant.year,

                        registration.payment?.utr,

                        memberSearchText
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchText.includes(
                        search
                    );


                const matchesEvent =
                    !event ||
                    registration.event ===
                        event;


                const status =
                    String(
                        registration.payment
                            ?.status ||
                        "PENDING"
                    )
                        .toUpperCase();


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
            registration =>
                String(
                    registration.payment
                        ?.status ||
                    "PENDING"
                )
                    .toUpperCase() ===
                    "PENDING"
        ).length;


    const paid =
        registrations.filter(
            registration =>
                String(
                    registration.payment
                        ?.status ||
                    ""
                )
                    .toUpperCase() ===
                    "PAID"
        ).length;


    const totalElement =
        document.getElementById(
            "total"
        );


    const pendingElement =
        document.getElementById(
            "pending"
        );


    const paidElement =
        document.getElementById(
            "paid"
        );


    if (totalElement) {

        totalElement.textContent =
            total;
    }


    if (pendingElement) {

        pendingElement.textContent =
            pending;
    }


    if (paidElement) {

        paidElement.textContent =
            paid;
    }
}


// =====================================================
// RENDER TABLE
// =====================================================

function renderTable() {

    const rows =
        document.getElementById(
            "rows"
        );


    if (!rows) {
        return;
    }


    if (
        !displayedRegistrations.length
    ) {

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
                (
                    registration,
                    index
                ) => {

                    const participant =
                        registration.participant ||
                        {};


                    const payment =
                        registration.payment ||
                        {};


                    const status =
                        String(
                            payment.status ||
                            "PENDING"
                        )
                            .toUpperCase();


                    const amount =
                        payment.amount ||
                        150;


                    let paymentHtml;


                    if (
                        status === "PAID"
                    ) {

                        paymentHtml = `
                            <span
                                class="status-paid"
                            >
                                PAID
                            </span>

                            <br>

                            ₹${escapeHtml(
                                amount
                            )}

                            <br>

                            <small>
                                Approved
                            </small>
                        `;

                    } else {

                        paymentHtml = `
                            <span
                                class="status-pending"
                            >
                                PENDING
                            </span>

                            <br>

                            ₹${escapeHtml(
                                amount
                            )}

                            <br><br>

                            <button
                                class="view-btn"
                                type="button"
                                onclick="approvePayment('${escapeJs(
                                    registration.registrationId ||
                                    ""
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
                                    type="button"
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

    if (!registrationId) {

        alert(
            "Registration ID is missing."
        );

        return;
    }


    const registration =
        registrations.find(
            item =>
                item.registrationId ===
                registrationId
        );


    if (!registration) {

        alert(
            "Registration not found."
        );

        return;
    }


    const participant =
        registration.participant ||
        {};


    const payment =
        registration.payment ||
        {};


    // ---------------------------------------------
    // REQUIRE PAYMENT PROOF
    // ---------------------------------------------

    const utr =
        String(
            payment.utr ||
            ""
        ).trim();


    const screenshot =
        String(
            payment.screenshot ||
            ""
        ).trim();


    if (!utr) {

        alert(
            "Cannot approve this payment because UTR is missing."
        );

        return;
    }


    if (!screenshot) {

        alert(
            "Cannot approve this payment because payment screenshot is missing."
        );

        return;
    }


    const confirmed =
        confirm(
            `Approve payment for ${
                participant.name ||
                "participant"
            }?\n\n` +

            `Registration ID: ${
                registrationId
            }\n` +

            `UTR: ${
                utr
            }\n` +

            `Amount: ₹${
                payment.amount ||
                150
            }`
        );


    if (!confirmed) {
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

                    headers:
                        getAuthHeaders()
                }
            );


        const responseText =
            await response.text();


        let data = {};


        try {

            data =
                responseText
                    ? JSON.parse(
                        responseText
                    )
                    : {};

        } catch {

            data = {};
        }


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleUnauthorized();

            return;
        }


        if (!response.ok) {

            throw new Error(
                data.message ||
                `Payment approval failed. HTTP ${response.status}`
            );
        }


        alert(
            "Payment approved successfully!"
        );


        closeModal();

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
        displayedRegistrations[
            index
        ];


    if (!registration) {

        console.error(
            "Registration details not found."
        );

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


    // =================================================
    // MEMBERS
    // =================================================

    let membersHtml;


    if (!members.length) {

        membersHtml = `
            <p>
                No additional members.
            </p>
        `;

    } else {

        membersHtml =
            members
                .map(
                    (
                        member,
                        i
                    ) => `
                        <div class="member">

                            <h4>
                                Member ${i + 1}
                            </h4>

                            <p>
                                <b>
                                    Name:
                                </b>

                                ${escapeHtml(
                                    member.name ||
                                    ""
                                )}
                            </p>

                            <p>
                                <b>
                                    Email:
                                </b>

                                ${escapeHtml(
                                    member.email ||
                                    ""
                                )}
                            </p>

                            <p>
                                <b>
                                    Phone:
                                </b>

                                ${escapeHtml(
                                    member.phone ||
                                    ""
                                )}
                            </p>

                        </div>
                    `
                )
                .join("");
    }


    // =================================================
    // PAYMENT SCREENSHOT
    // =================================================

    const screenshotUrl =
        safeUrl(
            payment.screenshot,
            true
        );


    let screenshotHtml;


    if (screenshotUrl) {

        screenshotHtml = `

            <div
                class="detail-card"
                style="grid-column:1/-1"
            >

                <span>
                    Payment Screenshot
                </span>

                <div
                    style="margin-top:10px"
                >

                    <img
                        src="${escapeAttribute(
                            screenshotUrl
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

                <p
                    style="margin-top:10px"
                >

                    <a
                        href="${escapeAttribute(
                            screenshotUrl
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

            <div
                class="detail-card"
                style="grid-column:1/-1"
            >

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
    // Supports both old and new backend structure
    // =================================================

    const groupLink =
        registration.groupLink ||
        payment.groupLink ||
        "";


    const safeGroupLink =
        safeUrl(
            groupLink,
            false
        );


    let groupLinkHtml = "";


    if (
        String(
            payment.status ||
            ""
        ).toUpperCase() ===
            "PAID" &&
        safeGroupLink
    ) {

        groupLinkHtml = `

            <div class="detail-card">

                <span>
                    WhatsApp / Group Link
                </span>

                <b>

                    <a
                        href="${escapeAttribute(
                            safeGroupLink
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

    let paymentActionHtml =
        "";


    if (
        String(
            payment.status ||
            "PENDING"
        ).toUpperCase() !==
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
                    type="button"
                    onclick="approvePayment('${escapeJs(
                        registration.registrationId ||
                        ""
                    )}')"
                >
                    ✓ Approve Payment
                </button>

            </div>
        `;
    }


    // =================================================
    // DETAILS CONTENT
    // =================================================

    const detailsContent =
        document.getElementById(
            "detailsContent"
        );


    if (!detailsContent) {

        console.error(
            "detailsContent element not found."
        );

        return;
    }


    const createdAt =
        registration.createdAt
            ? formatDate(
                registration.createdAt
            )
            : "Not available";


    detailsContent.innerHTML = `

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
                        String(
                            payment.status ||
                            "PENDING"
                        )
                            .toUpperCase()
                    )}
                </b>

            </div>


            <div class="detail-card">

                <span>
                    Payment Amount
                </span>

                <b>
                    ₹${escapeHtml(
                        payment.amount ||
                        150
                    )}
                </b>

            </div>


            ${utrHtml}


            ${paymentIdHtml}


            <div class="detail-card">

                <span>
                    Registered At
                </span>

                <b>
                    ${escapeHtml(
                        createdAt
                    )}
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


    const modal =
        document.getElementById(
            "detailsModal"
        );


    if (modal) {

        modal.style.display =
            "block";
    }
}


// =====================================================
// CLOSE MODAL
// =====================================================

function closeModal() {

    const modal =
        document.getElementById(
            "detailsModal"
        );


    if (modal) {

        modal.style.display =
            "none";
    }
}


// =====================================================
// EXPORT CSV
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

        headers
            .map(
                csvEscape
            )
            .join(",")
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
                members[0] ||
                {};


            const member2 =
                members[1] ||
                {};


            const groupLink =
                registration.groupLink ||
                payment.groupLink ||
                "";


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

                groupLink,

                registration.createdAt
                    ? formatDate(
                        registration.createdAt
                    )
                    : ""
            ];


            lines.push(
                row
                    .map(
                        csvEscape
                    )
                    .join(",")
            );
        }
    );


    const blob =
        new Blob(
            [
                "\uFEFF" +
                lines.join(
                    "\r\n"
                )
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        "BYTEFEST-registrations.csv";


    document.body.appendChild(
        link
    );


    link.click();


    document.body.removeChild(
        link
    );


    URL.revokeObjectURL(
        url
    );
}


// =====================================================
// DATE FORMAT
// =====================================================

function formatDate(value) {

    try {

        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";
        }


        return date.toLocaleString();


    } catch {

        return "";
    }
}


// =====================================================
// CSV ESCAPE
// =====================================================

function csvEscape(value) {

    const text =
        String(
            value ?? ""
        );


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
// SAFE URL
// =====================================================

function safeUrl(
    value,
    allowDataImage = false
) {

    const url =
        String(
            value ||
            ""
        ).trim();


    if (!url) {
        return "";
    }


    if (
        /^https?:\/\//i.test(
            url
        )
    ) {

        return url;
    }


    if (
        allowDataImage &&
        /^data:image\//i.test(
            url
        )
    ) {

        return url;
    }


    return "";
}


// =====================================================
// SECURITY HELPERS
// =====================================================

function escapeHtml(value) {

    return String(
        value ?? ""
    )
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


function escapeJs(value) {

    return String(
        value ?? ""
    )
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

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
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
// INITIALIZE
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "BYTEFEST admin.js loaded."
        );


        // =================================================
        // LOGIN FORM
        // =================================================

        const loginForm =
            document.getElementById(
                "adminLoginForm"
            );


        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                adminLogin
            );
        }


        // =================================================
        // LOGOUT
        // =================================================

        const logoutBtn =
            document.getElementById(
                "logout"
            );


        if (logoutBtn) {

            logoutBtn.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    logout();
                }
            );
        }


        // =================================================
        // CLOSE MODAL BUTTON
        // =================================================

        const closeBtn =
            document.getElementById(
                "closeModal"
            );


        if (closeBtn) {

            closeBtn.addEventListener(
                "click",
                closeModal
            );
        }


        // =================================================
        // CLICK OUTSIDE MODAL
        // =================================================

        const modal =
            document.getElementById(
                "detailsModal"
            );


        if (modal) {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        modal
                    ) {

                        closeModal();
                    }
                }
            );
        }


        // =================================================
        // ESCAPE KEY CLOSE MODAL
        // =================================================

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeModal();
                }
            }
        );


        // =================================================
        // SEARCH
        // =================================================

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


        // =================================================
        // EVENT FILTER
        // =================================================

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


        // =================================================
        // PAYMENT FILTER
        // =================================================

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


        // =================================================
        // REFRESH
        // =================================================

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


        // =================================================
        // EXPORT
        // =================================================

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


        // =================================================
        // DETERMINE PAGE
        // =================================================

        const dashboard =
            document.getElementById(
                "adminDashboard"
            );


        const token =
            getAdminToken();


        // =================================================
        // DASHBOARD PAGE
        // =================================================

        if (dashboard) {

            if (!token) {

                console.log(
                    "Dashboard opened without admin token."
                );


                window.location.replace(
                    "admin-login.html"
                );

                return;
            }


            console.log(
                "Admin session found."
            );


            showDashboard();

            loadRegistrations();

            return;
        }


        // =================================================
        // LOGIN PAGE
        // =================================================

        if (loginForm) {

            showLogin();


            // Already logged in
            if (token) {

                console.log(
                    "Existing admin session found. Opening dashboard."
                );


                window.location.replace(
                    "admin.html"
                );
            }
        }
    }
);
