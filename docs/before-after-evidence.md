# Before / After Evidence

Quantifying the impact of the MISA Assistant pipeline against the prior manual process, sourced from real Apr–Jul 2026 usage.

## Time

| | Before | After |
|---|---|---|
| Time per month | ~3-4 hours | ~30 minutes |
| Source | User-stated baseline (manual re-typing + cross-checking every transaction into MISA by hand) | Target estimate — **to be confirmed by a timed live run** (this repo's demo-video phase); do not treat as independently measured yet |
| Time saved | — | ~85% (`(3.5h − 0.5h) / 3.5h`, using the midpoint of the before range) |

## Throughput (real runs, Apr–Jul 2026)

| Metric | Value | Source artifact | Verification status |
|---|---|---|---|
| June MISA transactions read back | 83 | `data/runs/misa-june-transactions.json` (`count: 83`, `data.length: 83`) | **Verified** in this pass |
| June batch inserts | 11 | `data/runs/misa-insert-results.json` (11 entries, each with a `transactionsId`) | **Verified** in this pass |
| July batch inserts (follow-up run) | 4 | `data/runs/misa-july-insert-results.json` (4 entries) | **Verified** in this pass — additional evidence of repeat monthly usage, not part of the original "11" figure |
| Screenshot/statement coverage | 4 months (Apr–Jul 2026) × up to 3 sources (Momo/VCB/Techcombank) | `data/{yyyy-MM}/{source}/`, `data/TCB/` | Verified — directory listing |
| Sheet rows extracted per month | Recorded historically as 58 total (Apr 15 / May 20 / Jun 15 / Jul 8) | Google Sheet tabs | **Not independently re-verified in this pass** — requires a live Google Sheet read via the `mcp-gsheets` MCP server, which was not connected in this session. The nearest local proxy (`data/{yyyy-MM}/index.md` per-image "Extracted" counts) is a *different* metric — raw per-image extraction before cross-image dedup/merge into the sheet — and sums higher (123 across Apr–Jul), so it cannot substitute as confirmation. Recommend a live-Sheet count check before final submission. |

## Duplicate & Error Prevention

- Sheet rows are matched against MISA's existing transaction history on **Wallet + Date + Amount + Category Name** before any insert is proposed — an insert only happens for rows with no match.
- Once a row is inserted or matched, its MISA transaction id is written back into the sheet (`Misa Transaction Id` column) — the same row is never proposed for insertion again on a later reconciliation pass.
- Ambiguous extractions are never guessed: they're flagged `Status = NEEDS REVIEW` for a human to resolve, rather than silently written with a wrong value.

## Qualitative Wins

- No manual re-typing of transaction fields — extraction is vision/statement-based.
- A single pending-insert batch is confirmed once per wallet reconciliation, rather than one-transaction-at-a-time manual entry.
- The sheet is the review surface: a human can see everything proposed for a month before anything reaches MISA.

## Evidence Screenshots

Redacted before/after screenshots (manual MISA entry vs. reviewed sheet + batch-confirm) are **not included in this pass** — deferred to be captured during the Phase 06 demo-video timed run, then added here with amounts/accounts/names redacted or cropped before commit. Placeholder references:

- `[screenshot: BEFORE — manual MISA "add transaction" entry, mid-typing — TBD]`
- `[screenshot: AFTER — reviewed sheet with resolved Wallet/Category columns — TBD]`
- `[screenshot: AFTER — batch-insert approval confirmation — TBD]`

## Summary

The pipeline replaces ~3-4 hours/month of manual re-typing with a review-and-approve flow, while adding a duplicate-prevention mechanism (MISA-history matching + write-back id) that the manual process didn't have. The ~85% time-saving figure is the pipeline's target, pending confirmation from a timed live run; the throughput counts above (83 read, 11+4 inserted) are independently verified against real run artifacts.
