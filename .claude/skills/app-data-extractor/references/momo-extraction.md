# Momo Screenshot Extraction

## Layout

Momo's "Giao dịch" (transactions) list is a scrollable feed grouped under a month header (e.g. `Tháng 5/2026`). Each row contains:

- An icon (merchant/category glyph) — not reliable for categorization, ignore it.
- Merchant/description text (e.g. "FPT Telecom", "Google", "EPASS", "Nạp tiền điện thoại Viettel").
- A `HH:MM - DD/MM` timestamp — the year is not in the row, it comes from the month header above it.
- A signed amount in Vietnamese format: `-195.000đ` (expense) or `+195.000đ` (income). `.` is the thousands separator; a decimal (rare) would use `,`.
- An optional tag below the row: `Hóa đơn` (bill/invoice), `Tự động` (auto-pay), `Ứng dụng` (in-app purchase). Occasionally `Số dư ví: X` (wallet balance after the transaction) appears in the tag's place instead — this is not a transaction field, ignore it for extraction.

## Field mapping

| Sheet column | Source |
|---|---|
| Date | `DD/MM` + year from the screenshot's month header, written as `yyyy-MM-DD` |
| Time | `HH:MM` from the row |
| Description | Merchant/description text, as shown, no translation |
| Amount | Numeric value, sign preserved, `.` separators stripped |
| Type | `expense` if amount is negative, `income` if positive |
| Source | `Momo` |
| Image | Source screenshot filename |
| Status | `extracted`, `NEEDS REVIEW`, or `SKIPPED` per edge cases below |
| Notes | Blank unless a known edge case or the cross-mode grouping rule (see `sheet-schema.md`) sets it |

## Cross-month and overlap handling

- Skip any row under a month header that doesn't match the target extraction month (a screenshot can be scrolled into an adjacent month).
- Scrolled screenshots of the same list commonly repeat the last few rows of the previous screenshot — dedup by exact match on Date+Time+Description+Amount across the whole batch, not just within one image.

## Known edge cases

Confirmed patterns are kept locally (not committed) in `.claude/agent-memory/app-data-extractor/known-edge-cases-momo.md` — copy `known-edge-cases-momo.md.sample` to start one. Check it before flagging a row as `NEEDS REVIEW`.
