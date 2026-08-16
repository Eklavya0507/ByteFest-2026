# BYTEFEST 2026 Frontend

Static GitHub Pages frontend for the complete participant and administrator flow.

## Included pages

- `index.html` — unique registration CTA, event summary and live countdown to 29 August 2026
- `events.html` — all four event choices
- `details.html` — expanded format, preparation and rules; Code Sprint and Bug Hunt use venue systems
- `register.html` — participant/team registration
- `payment.html` — supplied QR, UTR and compressed screenshot upload
- `my-registration.html` — participant status lookup plus approved event-group and Community links
- `admin-login.html` — separate administrator login
- `admin.html` — protected registration/payment dashboard with event/community links, Brevo delivery errors and retry controls

The layout includes larger, higher-contrast typography and mobile-sized controls for participant phones. Asset version query strings are included so GitHub Pages does not keep serving the older small-text CSS after deployment.

## Configuration

Edit `config.js` only if the Render URL or event start time changes:

```js
window.BYTEFEST_CONFIG = Object.freeze({
    API_URL: "https://byte-fest-backend.onrender.com",
    EVENT_START: "2026-08-29T09:00:00+05:30",
    EVENT_DATE_LABEL: "29 August 2026 · 9:00 AM IST",
    REGISTRATION_FEE: 150
});
```

The countdown currently assumes a 9:00 AM start in India. Change `EVENT_START` if the official reporting time is different.

## Deploy to GitHub Pages

Replace the files in the `ByteFest-2026` repository with this folder, then commit and push:

```powershell
git add .
git commit -m "Complete BYTEFEST registration payment and admin flow"
git push origin main
```

Do not remove `assets/bytefest-payment-qr.jpeg`; it is the QR displayed on the payment page.

## Required backend deployment order

Deploy the new backend to Render first. After Render reports `MongoDB connected successfully`, deploy this frontend. The new frontend depends on the lookup and payment-proof endpoints included in the rebuilt backend.
