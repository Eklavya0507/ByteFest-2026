BYTEFEST 2026 — SINGLE URL CORRECTED BUILD

Purpose
- Home, Events, Details, Register, Payment, My Registration, Admin Login and Admin Dashboard all use ONE clean GitHub Pages URL.
- The address bar stays at the repository root.
- Existing registration backend/API contract is preserved.
- Invictus logo is visible in the header and Home hero.

Test
1. Upload all files/folders in this ZIP directly to a temporary GitHub repository root.
2. Enable GitHub Pages: main / root.
3. Open the clean Pages URL. It should start at Home.
4. Click every navigation item: address bar must stay unchanged.
5. Create one trial registration -> Payment must open without changing URL.
6. Submit payment proof -> My Registration must work.
7. Admin -> login -> dashboard must open without admin-login.html/admin.html appearing in URL.
8. Test View/Approve/Export/Logout in admin.

Backend URL currently used:
https://byte-fest-backend.onrender.com

Do not upload the ZIP itself to GitHub. Extract it and upload its contents.
