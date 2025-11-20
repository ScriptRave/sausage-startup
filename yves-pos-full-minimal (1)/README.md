# Yves — AI POS Prototype (Static, no backend)

This prototype demonstrates your requested features:

- Speech-only ordering for employees (Web Speech API).
- Simulated card reader with a "Process Payment" button.
- Employee PIN + name to clock in/out. Hours, orders, and tips tracked.
- Admin/Manager portal:
  - Menu management (items + sides, substitutions, add‑ons with per-item pricing).
  - Daily profits view (1¢ per $1 gross to Yves).
- CEO portal to view all businesses, their orders/gross, our cut, and simple charts.
- Email login accounts for employees/managers/admin + separate CEO login.
- Data stored locally in the browser (localStorage) for demo purposes.

## Quick Start

1) Unzip the project.
2) Open `index.html` in Chrome.
   - If the microphone doesn't work when opening as a file, start a simple local server:
     - **Python 3**: `python -m http.server 8000`
     - **Node**: `npx serve .` (if you have `serve` installed)
     - Then browse to `http://localhost:8000/`

## Default Credentials

- Admin: `admin@yves.local` / `1234` (or PIN 1234 in Admin page)
- Manager: `manager@yves.local` / `password`
- Employee: `employee@yves.local` / `4321`
- CEO: `ceo@yves.local` / `yvesrocks`
- PINs: Employee `4321`, Admin `1234`

## Notes

- This is a front‑end only prototype (no real backend). All data resets if localStorage is cleared.
- The "Process Payment" button marks orders as paid; it stands in for a card reader / Apple Pay.
- Speech recognition relies on the browser’s Web Speech API (best in Chrome).
- You can add menu items and per‑item option sets (sides, substitutions, add‑ons) in Admin → Menu.

