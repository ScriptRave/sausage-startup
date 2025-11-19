
# Yves POS — Full Prototype (Minimal UI + Updated Employee Flow)

Features:
- Minimal white/gray/black theme inspired by chat apps.
- Dropdown nav (Menu ▾) with Home, Accounts, Employee, Admin, CEO.
- Home = login hub (no menu clutter).
- Accounts page for email-based logins + local user management.
- Admin portal with:
  - Menu management (items + sides / substitutions / add-ons).
  - Profits dashboard (daily gross, bar chart, all-time cut).
  - Employee overview (hours, tips, orders).
- CEO portal with:
  - Multi-business dashboard.
  - Our revenue per business + chart.
  - Add new businesses.
- Employee portal with NEW flow:
  1. Clock-in screen (name + PIN).
  2. After clock-in, full-screen voice ordering UI:
     - Order text centered at top.
     - Hotdog ASCII art button in the middle.
     - Hotdog wiggles while listening.
     - Clear / Chat-Details / Process Payment controls centered under it.
- Speech-to-text order parsing prototype using the browser Web Speech API (Chrome).

How to run:
1. Open `index.html` in Chrome, or run a small server:
   - `python -m http.server 8000`
   - then visit http://localhost:8000
2. Try:
   - Admin: admin@yves.local / 1234
   - Employee: employee@yves.local / 4321 or PIN 4321
   - CEO: ceo@yves.local / yvesrocks
