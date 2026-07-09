---
name: project-misa-session-exporter
description: Chrome MV3 dev-tool companion to the app-misa-money-keeper skill; review bar and known tradeoffs for this tool
metadata:
  type: project
---

`tools/misa-session-exporter/` is a personal-dev-tool Chrome extension (MV3) that reads
`localStorage.moneykeeper_userInfo` from the user's real logged-in MISA tab and exports it
(clipboard/file) so a Playwright script can bootstrap an authenticated session via
`page.addInitScript` + `localStorage.setItem` (helper `loadMisaSession()` documented in
`.claude/skills/app-misa-money-keeper/references/api-reference.md`, "Bootstrapping a Session
Without Manual Login" section).

**Why:** avoids re-running MISA's manual login flow for every Playwright automation session
against live financial data at moneykeeperapp.misa.vn.

**How to apply (review bar for this tool and similar personal dev-tools in this repo):**
- Permission model is intentionally minimal: `activeTab` + `scripting` + `downloads`, with
  `host_permissions` scoped to exactly `https://moneykeeperapp.misa.vn/*` (no wildcards). Treat
  this as the reference pattern — flag any future addition of broader permissions (e.g.
  `<all_urls>`, `tabs`, unscoped host permissions) as a regression.
- Don't flag missing test suites/CI for tools under `tools/` explicitly called out as personal
  dev tools — only report real bugs/security/correctness issues a user would hit in practice.
- Known accepted tradeoff (as of 2026-07-05 review): origin check in `popup.js` uses
  `tab.url.startsWith(MISA_ORIGIN)` (string-prefix, spoofable by subdomain-suffix hosts like
  `moneykeeperapp.misa.vn.evil.com`) but is backstopped by `host_permissions` actually enforcing
  the exact origin at the API level, so no real exfiltration path — recommended fix is
  `new URL(tab.url).origin === MISA_ORIGIN` for defense-in-depth, not yet applied.
- Blob URLs created via `URL.createObjectURL` for the "Save to File" button are never revoked —
  low-risk in a short-lived popup, but worth fixing if this pattern is copied into another
  tool with a longer-lived popup lifecycle.
