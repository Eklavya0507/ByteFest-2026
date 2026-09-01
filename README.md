# BYTEFEST 2026 Frontend — v3.1

Complete static GitHub Pages frontend for BYTEFEST 2026.

## Participant flow

`Home -> Register -> Registration Successful -> Join Official Event Group`

There is no payment page, payment QR, UTR, screenshot upload, or payment approval step.

## Event schedule

- Date: Friday, 4 September 2026
- Reporting: 9:50 AM
- Event Start: 10:00 AM
- Venue: EPCET B Block Seminar Hall
- Registration Fee: NO REGISTRATION FEE

## Design update

The existing BYTEFEST layout is preserved. Only selected areas (main Home hero + countdown) use the darker purple/cyber/data style inspired by the supplied reference video. Event cards, details, registration form, My Registration, and admin remain familiar and functional.

## Instant group-link behavior

After the participant submits the registration form, the backend response includes:

- `registrationId`
- `event`
- `teamName`
- `groupLink`
- optional `communityLink`

The frontend stores these values in `sessionStorage` and opens the Join Group screen immediately. It does not wait for Brevo email delivery and does not make a second API request when the fresh registration response already contains the event group link.

## Deployment

Upload/replace the complete contents of this folder in the `ByteFest-2026` frontend repository and push to GitHub Pages.

Deploy the matching backend first so `/api/registrations` returns the instant group link.
