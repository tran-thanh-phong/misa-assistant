# VCB (Vietcombank) Screenshot Extraction

## Layout

Vietcombank Digibank app's "Lịch sử giao dịch" (transaction history) screen. A date-range filter (`Từ ngày`/`Đến ngày`, max 31-day span per search) sits above a scrollable list with three tabs: "Toàn bộ" (all — the one screenshots normally show), "Tiền vào" (income only), "Tiền ra" (expense only). Each row:

- Its own `DD/MM/YYYY` date directly above it — unlike Momo, there is no month-header grouping; every row repeats its full date.
- A raw bank memo string as the description, frequently **cut off with `…`** in the list view (e.g. `MBVCB.<REF>.067034.<PERSON_1> chuyen tien bg.CT…`). The full text is not visible without tapping into the row.
- A signed amount in the format `- 40,000 VND` / `+ 499 VND` — space after the sign, `,` thousands separator, trailing ` VND` (not `đ`). Red = outgoing (Tiền ra), green = incoming (Tiền vào).
- No merchant icon or tag row (contrast with Momo's `Hóa đơn`/`Tự động`/`Ứng dụng` tags).

## Field mapping

| Sheet column | Source |
|---|---|
| Date | `DD/MM/YYYY` from the row, written as `yyyy-MM-DD` |
| Time | **Not shown in this list view** — leave blank unless a detail (tap-in) screenshot supplies it |
| Description | Memo text exactly as shown, including a trailing `…` if the list truncated it — never guess the cut-off tail |
| Amount | Numeric value, sign preserved, `,` separators and ` VND` suffix stripped |
| Type | `expense` if red/negative, `income` if green/positive |
| Source | `VCB` |
| Image | Source screenshot filename |
| Status | `extracted`, `NEEDS REVIEW`, or `SKIPPED` per edge cases below |
| Notes | Blank unless a known edge case or the cross-mode grouping rule (see `sheet-schema.md`) sets it |

## Cross-month and overlap handling

- Skip any row whose own `DD/MM/YYYY` date falls outside the target extraction month — a screenshot's date-range filter can span into an adjacent month even when the intent was one month.
- Scrolled screenshots of the same list commonly repeat the last few rows of the previous screenshot — dedup by exact match on Date+Description+Amount across the whole batch (no Time field to include in the match key, unlike Momo).

## Watch for (not yet confirmed — do not auto-classify)

Memos containing `MOMO`/`VED` + `CashOut`/`CashIn` (e.g. `Ecom.<REF>.MOMO.<PHONE>.CashOut.…`) look like wallet-to-wallet transfers with Momo, mirroring Momo's existing `Nạp tiền vào ví từ Techcombank` edge case. Flag rows matching this pattern as `NEEDS REVIEW` with a note, rather than assuming `Type = transfer` — only promote to Known edge cases once the user confirms a specific pattern.

## Known edge cases

Confirmed patterns are kept locally (not committed) in `.claude/agent-memory/app-data-extractor/known-edge-cases-vcb.md` — copy `known-edge-cases-vcb.md.sample` to start one. Check it before flagging a row as `NEEDS REVIEW`.
