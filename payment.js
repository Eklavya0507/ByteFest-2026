(function () {
    const form = document.getElementById("paymentForm");

    if (!form) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const registrationId = String(params.get("registrationId") || "").trim().toUpperCase();
    const registrationLabel = document.getElementById("registrationId");
    const emailInput = document.getElementById("paymentEmail");
    const screenshotInput = document.getElementById("screenshot");
    const preview = document.getElementById("screenshotPreview");
    const statusBox = document.getElementById("paymentStatus");
    const submitButton = document.getElementById("paymentButton");
    const successBox = document.getElementById("paymentSuccess");
    let previewUrl = "";

    registrationLabel.textContent = registrationId || "Registration ID missing";
    emailInput.value = sessionStorage.getItem(`bytefest_payment_email_${registrationId}`) || "";

    function showStatus(message, type = "") {
        statusBox.textContent = message;
        statusBox.className = `form-status is-visible${type ? ` is-${type}` : ""}`;
    }

    if (!registrationId) {
        showStatus("Registration ID is missing. Return to registration and create a new entry.", "error");
        submitButton.disabled = true;
    }

    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Could not read the selected screenshot"));
            reader.readAsDataURL(file);
        });
    }

    function loadImage(source) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("The selected screenshot is not a valid image"));
            image.src = source;
        });
    }

    async function compressScreenshot(file) {
        if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
            throw new Error("Choose a JPG, PNG or WebP screenshot");
        }

        if (file.size > 10 * 1024 * 1024) {
            throw new Error("Screenshot is too large. Choose an image below 10 MB.");
        }

        const source = await readFile(file);
        const image = await loadImage(source);
        let scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
        let quality = 0.86;
        let result = "";

        for (let attempt = 0; attempt < 6; attempt += 1) {
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            const context = canvas.getContext("2d", { alpha: false });
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            result = canvas.toDataURL("image/jpeg", quality);

            if (result.length <= 1_850_000) {
                return result;
            }

            scale *= 0.82;
            quality = Math.max(0.58, quality - 0.07);
        }

        throw new Error("Screenshot could not be compressed enough. Crop it and try again.");
    }

    async function readJson(response) {
        const text = await response.text();

        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return {};
        }
    }

    screenshotInput.addEventListener("change", () => {
        const [file] = screenshotInput.files;

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = "";
        }

        if (!file) {
            preview.classList.add("hidden");
            preview.removeAttribute("src");
            return;
        }

        previewUrl = URL.createObjectURL(file);
        preview.src = previewUrl;
        preview.classList.remove("hidden");
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (!registrationId || !form.reportValidity()) {
            showStatus("Complete every payment field before submitting.", "error");
            return;
        }

        const [file] = screenshotInput.files;

        if (!file) {
            showStatus("Choose a payment screenshot.", "error");
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Preparing screenshot...";
        showStatus("Compressing and securely submitting your payment proof...");

        try {
            const screenshot = await compressScreenshot(file);
            const email = emailInput.value.trim().toLowerCase();
            const utr = document.getElementById("utr").value.trim();
            submitButton.textContent = "Submitting payment proof...";

            const response = await fetch(`${window.BYTEFEST_CONFIG.API_URL}/api/registrations/${encodeURIComponent(registrationId)}/payment`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, utr, screenshot })
            });
            const data = await readJson(response);

            if (!response.ok) {
                throw new Error(data.message || `Payment submission failed (HTTP ${response.status})`);
            }

            sessionStorage.setItem("bytefest_last_registration_id", registrationId);
            sessionStorage.setItem("bytefest_last_registration_email", email);
            form.classList.add("hidden");
            successBox.classList.add("is-visible");
        } catch (error) {
            console.error(error);
            showStatus(error.message || "Could not submit payment proof.", "error");
            submitButton.disabled = false;
            submitButton.textContent = "Submit payment proof →";
        }
    });
}());
