# Google Sheet Schema

Spreadsheet ID: `<SHEET_ID>`

## Tab convention

One tab per reconciliation month, named `yyyy-MM` (e.g. `2026-05`). All sources (Momo, VCB, Techcombank) write into the same month's tab — the `Source` column distinguishes them. Create the tab with the header row below if it doesn't exist yet for that month.

## Columns (row 1 header, in order)

| Column | Notes |
|---|---|
| Date | `yyyy-MM-DD` |
| Time | `HH:MM`, 24h. For a merged row (see Grouping below), the max (latest) time among the merged instances — the full per-instance times are in Notes |
| Description | As extracted, original language, no translation |
| Amount | Signed number, no thousand separators, no currency symbol. For a merged row, the sum of all merged instances |
| Type | `expense` \| `income` \| `transfer` |
| Source | `Momo` \| `VCB` \| `Techcombank` |
| Image | Source screenshot filename(s), comma-separated if a merged row spans more than one image, for traceability back to `data/{yyyy-MM}/{mode}/` — for Techcombank Excel-sourced rows, the statement filename instead, traceable back to `data/TCB/` |
| Status | `extracted` \| `NEEDS REVIEW` \| `SKIPPED` — `SKIPPED` means written for visibility but excluded from MISA write-back consideration (see a mode's Known Edge Cases table, or the trivial-amount rule — any row with `\|Amount\| < 10,000 VND`, applies across all modes) |
| Notes | Freeform. Used for: merged-row breakdown (original Time+Amount pairs), the reason behind a `SKIPPED`/`transfer` classification from a known edge case, or context on a `NEEDS REVIEW` row. Empty otherwise |
| Wallet | MISA wallet **name** (matches `walletName` in `data/misa-master-data.json`) — written by `app-data-extractor` (this skill), read by `app-misa-money-keeper`. Name only, not id — wallet names are unique across the account, no ambiguity |
| Category Id | MISA `incomeExpenseCategoryId` (uuid) from `data/misa-master-data.json` — written by this skill. Blank for `transfer`-type rows (transfers have no category in MISA) |
| Category Name | MISA category name paired with Category Id (e.g. `"6105 - Ăn Uống"`) — written by this skill, for human review; MISA writes use the id, not this |
| Misa Description | The description to actually write into MISA's `Diễn giải` field — written by this skill, may differ from the raw extracted `Description` (e.g. normalized/cleaned). Resolved the same way as Wallet/Category (see the extraction skill's workflow step 8) |
| Misa Transaction Id | MISA transaction uuid once this row has been synced into MISA — written by `app-misa-money-keeper` only, this skill never writes it (leave blank on insert). Its presence is what prevents `app-misa-money-keeper` from re-inserting a row on the next sync pass |
| Human Notes | Human notes, dont' overwrite |

## Grouping same-date, same-merchant charges

Applies across all modes, not a mode-specific edge case. Before appending, merge rows that share the same Date + Description + Type + Source into one row:
- `Amount` = sum of the merged rows' amounts.
- `Time` = the max (latest) time among the merged instances; `Notes` lists each original `Time — Amount` pair (e.g. `13:49 -14.946đ; 14:37 -9.897đ; 14:52 -15.100đ; 17:12 -117.580đ`).
- `Image` lists every distinct source image involved, comma-separated.
- Only merge exact Date matches — don't merge across different dates even for the same merchant.

## Tab template (apply once, when a new `yyyy-MM` tab is created)

- Header row (row 1): bold.
- Freeze row 1 (`gridProperties.frozenRowCount = 1` via `sheets_update_sheet_properties`).
- Time column: number format `TIME` pattern `HH:mm`.
- Amount column: number format `NUMBER` pattern `#,##0` (display only — underlying value stays a plain signed number, see Columns above).
- Filter across all columns (AutoFilter on the header row): **not settable via the current mcp-gsheets tool set** — it only exposes `sheets_get_basic_filter` (read), no set/create tool. Ask the user to add it manually in Sheets (Data → Create a filter) if it's missing, or re-check `ToolSearch` in case a future mcp-gsheets version adds a write tool for it.

## Writing via mcp-gsheets

1. `ToolSearch` for the `mcp-gsheets` server's tools if not yet loaded (approve the server first if pending — see SKILL.md Prerequisites).
2. Check whether the `yyyy-MM` tab exists; if not, create it and append the header row, but **do not apply the tab template formatting yet** — do that after step 3, per the ordering rule below.
3. Append new rows after the last existing row using `sheets_append_values` with `insertDataOption: INSERT_ROWS`. Never overwrite existing rows — this sheet is the human review surface for later reconciliation stages, which may add state to rows written here.
4. Apply the tab template formatting (bold header, frozen row, Time/Amount number formats) **after** appending data, scoped to the exact row range just written (e.g. `A2:I8` for 7 appended rows) — not a pre-emptive large range like `B2:B1000`.
5. Confirm the exact mcp-gsheets tool names/params at call time rather than hardcoding them here — the MCP server version can change between sessions.

### Ordering rule (format AFTER append, not before)

`sheets_append_values` with `insertDataOption: INSERT_ROWS` inserts brand-new rows and inherits formatting from the row immediately above the insertion point. If the header row was already bold and a Time/Amount number format was pre-applied to a large empty range (e.g. `B2:B1000`) *before* appending, the insert pushes that pre-applied formatting down past the new data (so Time/Amount format lands on now-empty rows below the real data) while the new rows inherit **bold** from the header above them. Symptoms: body rows appear bold, and Time/Amount show as raw serials instead of `HH:mm` / `#,##0`.

Fix/avoidance: always append values first, then format only the actual written range afterward.

### `sheets_batch_format_cells` replaces the whole format object per range, not a merge

A format request for a range overwrites that range's entire `userEnteredFormat`, not just the fields you specify. Setting `{"textFormat": {"bold": false}}` on a range that already had a `numberFormat` (e.g. `DATE` on the Date column, auto-applied by `USER_ENTERED` parsing `yyyy-MM-DD` strings) wipes that number format. When correcting one aspect of a range's format (e.g. un-bolding body rows), always include the other format fields that must persist (e.g. `numberFormat`) in the same request, or reapply them afterward.

**Recurrence trap:** a single `bold:false` request over the *whole* appended range (`A2:N8`) wipes the auto-date-format on column A too, not just Time/Amount — it's easy to remember the Time/Amount combined-format fix and forget Date needs the same treatment (happened 2026-07-07 on a Techcombank append: dates displayed as raw serials like `46146` until a `DATE`/`yyyy-MM-dd` numberFormat was reapplied to column A). Checklist for every append: after any blanket `bold:false` sweep, explicitly reapply `numberFormat` to Date (A), Time (B), and Amount (D) columns in the same batch — not just the two documented here.
