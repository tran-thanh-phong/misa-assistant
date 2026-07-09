# PRD: MISA Sổ Thu Chi Multi-Source Integration

**Status:** Draft
**Owner:** <owner-email>
**Source:** Personal OS inbox note, 2026-07-04

## 1. Overview

The user tracks personal/family finances across multiple disconnected sources: e-wallet apps (Momo), bank apps, and MISA Sổ Thu Chi (MISA Money Keeper). Today, moving a transaction from where it happens (a bank/wallet app) into MISA is a fully manual, error-prone re-typing exercise, and there is no reliable way to catch missed or duplicate entries. This feature builds an assisted pipeline — screenshot capture → data extraction → human-reviewed reconciliation in Google Sheets → write-back to MISA — so the user gets accurate, complete books with a human approval checkpoint before anything changes in MISA.

## 2. Problem Statement

- Transactions originate in several apps (Momo, bank apps) that don't talk to MISA.
- Manually re-entering every transaction into MISA is slow and error-prone (missed items, wrong amounts, wrong wallet).
- There's no existing reconciliation step to compare "what happened in the source app" vs "what's recorded in MISA" before committing changes.
- Salary/income entries follow a computed rule (hourly rate x hours + extras) that must be applied consistently, another manual, error-prone calculation today.
- The user needs to stay in control of what gets written to MISA — automation should propose, not silently act.

## 3. Goals & Objectives

| Goal | Why it matters |
|---|---|
| Turn a screenshot of a transaction into a structured record with no manual re-typing | Removes the main source of data-entry friction and errors |
| Maintain one monthly ledger (Google Sheet) covering all wallets, as the human-facing source of truth for review | Gives the user a single place to eyeball everything before it becomes permanent |
| Compare source-app data against what MISA already has, and surface only the differences | Prevents duplicate entries and catches gaps, without asking the user to re-review everything every time |
| Require explicit human approval before any data is written into MISA | Automation must never silently mutate financial records |

### Success Metrics / Acceptance Criteria

- A screenshot uploaded via Telegram results in a correctly-populated row in the correct monthly sheet/wallet without manual data entry.
- Transactions already present in MISA are not proposed again (no duplicate write-backs).
- Every write to MISA has a corresponding prior approval action recorded (no un-approved write ever reaches MISA).
- Salary rows are computed from hours + extra using the fixed rate, with the formula visible/auditable in the sheet.
- The user can review a month's proposed changes in one pass rather than transaction-by-transaction.

## 4. Non-Goals / Out of Scope

- Fully autonomous write-back with no human review (explicitly rejected — approval is a hard gate).
- Real-time/instant sync (the process is inherently batch: screenshot → upload → review → write-back).
- Automating the screenshot capture itself (user still manually screenshots and uploads).
- Supporting finance apps beyond Momo and bank apps unless added later.
- Multi-user / shared-household access control (single user for now).

## 5. User

- **Primary user:** the account owner (single individual), managing their own and/or family wallets across Momo, bank accounts, and MISA.

## 6. Jobs to Be Done

1. "When I have new transactions sitting in Momo/my bank app, I want them captured and organized without re-typing, so my books stay current with minimal effort."
2. "When it's time to reconcile, I want to see exactly what's new or different between the source apps and MISA, so I only need to make a decision, not re-derive the whole picture."
3. "When I approve changes, I want confidence that only what I approved gets written to MISA, so I never worry about silent/incorrect edits to my financial records."
4. "When I log hours worked, I want salary calculated automatically from the fixed rate and rules, so I don't have to redo the arithmetic every time."

## 7. Feature Requirements

### 7.1 Capture & Ingestion
- User manually screenshots the relevant app (Momo, bank app) showing transaction(s).
- User uploads the screenshot(s) to an input location via Telegram.
- Uploaded images are organized/tracked via an index so nothing is lost or processed twice.
- Images that contain data from months other than the current reconciliation period are ignored (not extracted).

### 7.2 Data Extraction
- Each image is read and transaction details (date, amount, wallet/account, description/category) are extracted into structured data.
- Extracted data is organized into monthly Google Sheet(s) covering all wallets — one sheet is the default, but multiple sheets can be used if needed (e.g. by wallet or by source) as long as everything for the month is reviewable together.

### 7.3 MISA Read-Back
- Existing transactions are pulled from the MISA app into a master MISA-transactions sheet, so both "what source apps show" and "what MISA already has" are available for comparison.

### 7.4 Reconciliation & Proposal
- The system compares source-app data against MISA's existing data using date + amount (or similarly identifying content) as the match key, and proposes the set of actions needed (adds, corrections, etc.) to bring MISA in line — rather than a raw side-by-side dump the user must manually diff.

### 7.5 Approval (Hard Gate)
- Proposed actions are presented in the Google Sheet for the user to review and approve.
- No action is written to MISA until explicitly approved by the user.
- If the user rejects a proposed action, that row is simply skipped — no write-back, no re-queue.

### 7.6 Write-Back
- Only approved actions are written back into the MISA app.

## 8. User Experience Requirements

- The monthly sheet is the single place the user looks to understand the current state of reconciliation — it should clearly distinguish "extracted from source," "already in MISA," "proposed action," and "approved."
- Approval should be a simple, low-friction action per proposed item (or batch), not a re-entry of data.
- The user should be able to tell at a glance which images/months have already been processed, to avoid duplicate work.
- Errors or ambiguous extractions (e.g., unclear amounts) should be visibly flagged for human review rather than silently guessed.

## 9. Assumptions & Risks

- **Assumption:** Illegible/ambiguous screenshot extractions are resolved via human review, not automated guessing or re-upload logic.
- **Risk:** Matching on date + amount could still coincidentally collide (e.g., two same-amount, same-day transactions) — may need a manual tie-break at review time.
- **Risk:** MISA's app/API surface may change or have rate limits affecting read-back and write-back reliability.
- **Assumption:** Single-user, trusted environment — no access control or multi-tenant concerns in scope.

## 10. Technical Considerations (High-Level)

- Requires image understanding to extract transaction data.
- Requires an integration path into MISA Sổ Thu Chi for both reading existing transactions and writing approved ones (a MISA browser-automation/API integration already exists as prior art in this environment).
- Requires a Telegram-based intake and a Google Sheets integration for the reconciliation surface.
- Detailed architecture, data model, and tooling choices are left to the implementation plan, not this PRD.

## 11. Open Questions

None outstanding — prior open questions resolved: matching uses date + amount (or similar identifying content); sheet layout may use multiple sheets plus a master MISA-transactions sheet; rejected actions are simply skipped; the hourly rate is fixed (not configurable, out of scope); ambiguous extractions go to human review.
