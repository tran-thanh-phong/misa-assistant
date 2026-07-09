# MISA Session Exporter

Personal dev tool. Chrome extension (Manifest V3) that exports the MISA Money Keeper
session (`localStorage.moneykeeper_userInfo`) from your logged-in browser tab, so it
can be fed into Playwright automation without re-running the MISA login flow.

## Install (unpacked)

1. `chrome://extensions`
2. Enable "Developer mode"
3. "Load unpacked" → select this `tools/misa-session-exporter/` directory

## Use

1. Log in to https://moneykeeperapp.misa.vn/ in this Chrome profile.
2. Click the extension icon while that tab is active.
3. If a valid session is found, click **Save to Downloads** — one click, no save-as
   dialog, no rename. Always writes to `Downloads/misa-session.json`, overwriting the
   previous export.
4. `loadMisaSession(page)` (see
   `.claude/skills/app-misa-money-keeper/references/api-reference.md`) reads that same
   fixed path by default — no path argument needed.

The exported file contains a live access token — never commit it. It's safe to leave
in Downloads between runs since it's overwritten on each export, but delete it if you
won't be re-running automation soon.

**Copy to Clipboard** is also available for one-off manual use (e.g. pasting the
session somewhere other than the default file location).
