# Techcombank Statement & Screenshot Extraction

## Data sources

Two source types:

1. **Excel bank statement (primary, preferred)** — `SaoKeTK_TCB<suffix>_<fromDDMMYYYY>_<toDDMMYYYY>.xlsx`, one file per account, exported from Techcombank internet banking ("Sao kê tài khoản"). Location: `data/TCB/` — not month-scoped, since one file's date range routinely spans several months (e.g. `15042026_30062026`). Structured and far more reliable than screenshot OCR — full untruncated description text, exact signed amounts.
2. **Screenshots** — Techcombank mobile app, under `data/{yyyy-MM}/TCB/`, same per-month convention as Momo/VCB. Currently only the "Accounts & Cards" balance-overview screen is seen here — useful to cross-check a wallet's current balance against the statement's running balance, but it has no transaction rows and is not an extraction source. If a transaction-list screenshot type appears later, extend this file with its own layout section before relying on it.

## Wallet mapping (fixed per statement file, not per-row)

Each statement file belongs to exactly one MISA wallet, resolved from the account number in its header (row ~20, "Số tài khoản/ Account no.") and identified by the filename's `<suffix>`:

| Filename suffix | Account no. | MISA wallet |
|---|---|---|
| `TCB23` | `<ACCT-TCB23>` | `TCB - 23` |
| `TCB39` | `<ACCT-TCB39>` | `QGĐ` |
| `TCB41` | `<ACCT-TCB41>` | `5G - TCB - 41` |
| `TCB90` | `<ACCT-TCB90>` | `TCB - 90` |

Confirm any new suffix/account against `data/misa-master-data.json` before adding a row here — never guess a new mapping.

## Excel layout

Sheet name `AccountStatement_A4_Landscape`. Rows 1–~33 are header metadata (bank name, account holder, account no., date range, currency) — skip entirely. Transaction rows start after the "Số dư đầu kỳ/ Opening balance" row (not a transaction itself — skip it, but its value is the starting balance for sanity-checking the first real row's running balance). Each transaction row has 8 logical columns spread across many merged Excel cells:

| Logical column | Header (VN/EN) |
|---|---|
| Date | Ngày giao dịch / Transaction Date, `DD/MM/YYYY` |
| Counterparty | Đối tác / Remitter |
| Counterparty bank | NH Đối tác / Remitter Bank |
| Description | Diễn giải / Details |
| Transaction No | Số bút toán / Transaction No |
| Debit | Nợ TKTT / Debit |
| Credit | Có TKTT / Credit |
| Balance | Số dư (2) / Balance — running balance after this row |

Footer rows to skip: "Cộng doanh số/Total volume" (period totals), "Số dư cuối kỳ/ Ending balance", the "Diễn giải/Description" legend, its footnote rows, and the "generated from Techcombank Online Banking..." disclaimer line(s).

## Field mapping

| Sheet column | Source |
|---|---|
| Date | Transaction Date, `DD/MM/YYYY` → `yyyy-MM-DD` |
| Time | Not present in the statement — leave blank |
| Description | Diễn giải, exactly as shown (already full text, unlike truncated screenshot OCR) |
| Amount | `-Debit` if Debit is non-empty, `+Credit` if Credit is non-empty (a row has exactly one of the two populated) |
| Type | `expense` if Debit populated, `income` if Credit populated |
| Source | `Techcombank` |
| Image | The statement filename (e.g. `SaoKeTK_TCB23_15042026_30062026.xlsx`) — same column as a screenshot filename, for traceability |
| Wallet | Fixed per file, from the mapping table above — never resolved per-row |
| Status | `extracted`, `NEEDS REVIEW`, or `SKIPPED` per edge cases below |
| Notes | Blank unless a known edge case sets it |

## Cross-wallet transfer resolution

A Credit row with Counterparty `<PERSON_1>` and Counterparty bank `TECHCOMBANK` (i.e. money arriving from another of the user's own Techcombank accounts, not an external party) is very likely a self-transfer between two of the 4 wallets, not income — but don't guess which source wallet. Cross-reference the *other* statement files in `data/TCB/` for a Debit row with the **exact same `Số bút toán` (Transaction No)** — if found, that file's wallet (per the mapping table) is the transfer source; set `Type = transfer`, `Misa Description = "Transfer from <source wallet>"`, and note the matched Transaction No. Confirmed 2026-07-07: every such row found on `TCB23` matched a same-day, same-amount Debit on `TCB90` by Transaction No. If no match is found in any other statement file, leave the row `NEEDS REVIEW` rather than assuming a transfer.

## Cross-month and overlap handling

- A single statement file's date range routinely spans several months. Split its rows by the target month before writing — same "skip rows outside `month`" rule as screenshots, just applied to every row of one file instead of across several images.
- Statement files are commonly re-exported later with an overlapping/wider date range (e.g. a fresh `TCB23` export with a later end date). Dedup by exact match on Date+Description+Amount+Transaction No across the whole batch — `Số bút toán`/Transaction No is a reliable extra dedup key the screenshot modes don't have.

## Watch for (not yet confirmed — do not auto-classify)

- `Diễn giải` starting with `Tra lai so du tren tai khoan` for amounts ≥ 10,000 VND — the confirmed `Lãi tiết kiệm` category (see Known edge cases) only covers this pattern in general; every instance seen so far has been under the trivial-amount threshold and gets `SKIPPED` before the category even matters. A larger instance would still need this category applied.

## Known edge cases

Confirmed patterns are kept locally (not committed) in `.claude/agent-memory/app-data-extractor/known-edge-cases-tcb.md` — copy `known-edge-cases-tcb.md.sample` to start one. Check it before flagging a row as `NEEDS REVIEW`.
