# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project State

This is a **public repository** — every tracked file is or will be visible on GitHub. It's a skills/tools/docs repo (no build, no package manifest, no app runtime), currently:
- `.claude/skills/app-data-extractor/` — screenshot/statement → Google Sheet extraction skill (Momo, VCB, Techcombank sources).
- `.claude/skills/app-misa-money-keeper/` — MISA Money Keeper (moneykeeperapp.misa.vn) Business API integration: read transactions/wallets/categories, write transactions.
- `.claude/agent-memory/app-data-extractor/` — **local-only**, gitignored: real PII behind the redacted placeholders in the skills above. See "PII Handling" below before touching any reference doc.
- `tools/misa-session-exporter/` — Chrome extension exporting a MISA session for headless/Playwright use.
- `docs/misa-integration-prd.md`, `docs/system-architecture.md` — read the PRD first for any non-trivial work.
- `data/` — gitignored; screenshot intake + run artifacts, never tracked.

## What This Project Is

MISA Sổ Thu Chi (MISA Money Keeper) multi-source transaction integration — an assisted pipeline that turns screenshots/statements from wallet/bank apps (Momo, VCB, Techcombank) into reconciled, human-approved entries in MISA, via: capture → data extraction → reconciliation in a Google Sheet → write-back to MISA. Full requirements, jobs-to-be-done, and scope boundaries are in `docs/misa-integration-prd.md` — read it in full before planning or implementing anything here, don't rely on this summary.

Key hard constraint from the PRD: **human approval is a non-negotiable gate** — nothing is ever written to MISA without an explicit prior approval action recorded. Any implementation must preserve propose-then-approve-then-write as separate, auditable steps.

## PII Handling (read before editing anything under `.claude/skills/app-data-extractor/references/`)

This project processes the account owner's live personal financial data. The public skill docs are redacted — real account numbers, names, phone numbers, exact transaction amounts, and the Google Sheet ID are replaced with placeholders: `<ACCT-TCB23>` / `<ACCT-TCB39>` / `<ACCT-TCB41>` / `<ACCT-TCB90>` / `<ACCT-TCB25>` / `<ACCT>`, `<PHONE>`, `<PERSON_1>` / `<PERSON_2>` (distinct real people get distinct numbers — never reuse one placeholder for two different real values), `<MONEY_AMOUNT_01..05>`, `<SHEET_ID>`, `<REF>`.

Real values live only in gitignored local files, never in a committed doc:
- `.claude/agent-memory/app-data-extractor/pii-mapping.md` (real) / `pii-mapping.md.sample` (committed template) — placeholder → real value table.
- `.claude/agent-memory/app-data-extractor/known-edge-cases-{momo,vcb,tcb}.md` (real) / `.sample` (committed template) — the full confirmed edge-case pattern tables. The public `momo-extraction.md` / `vcb-extraction.md` / `techcombank-extraction.md` only carry a pointer to these local files under their "Known edge cases" heading — do not paste real confirmed patterns back into the public doc.
- `.mcp.json` (real GCP project id + credentials path, gitignored) / `.mcp.json.example` (committed placeholder) — same copy-and-fill pattern.
- `plans/` is entirely gitignored — working plan docs are process artifacts, not part of the public product, and have previously contained real PII while documenting an audit.

**Rule for any new real value discovered while working here:** never commit it. Add a new placeholder following the existing naming convention, record the real value in the matching local `*.md` (create from its `.sample` if missing), and add the same placeholder (blank value) to the `.sample` so the shape stays documented publicly.

**Before any commit or push touching tracked files:** re-run a full audit sweep for account numbers (9+ digit runs), known real names/phone/email patterns, `bearer`/`accesstoken=`/`BEGIN...PRIVATE KEY`, and the real Sheet ID — excluding `data/`, `plans/`, `.playwright-mcp/`, `docs/superpowers/` (all gitignored). Treat every 9+ digit number and uppercase-name memo as sensitive until proven a safe code constant (e.g. `take: 2147483647`, category UUIDs are fine to keep).

## MISA Integration Prior Art

Auth/session details (`accessToken`, headers, category/walletType code tables) are in `.claude/skills/app-misa-money-keeper/references/api-reference.md`. Any read-back or write-back component built for this project should reuse this integration rather than re-deriving MISA's API from scratch — and must keep the same treatment of this as live production financial data (never fabricate results, never log the raw access token outside its evaluation closure, always confirm before any write).

## Working in This Repo

- No build, lint, or test commands exist — this is a skills/tools/docs repo, don't invent them.
- Follow the global planning workflow (`~/.claude/rules/primary-workflow.md`) for any non-trivial feature work: plan → implement → test → review, with plans written to `plans/` (gitignored, see PII Handling).
