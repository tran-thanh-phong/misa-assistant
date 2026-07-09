# Monthly Image Index (data/{yyyy-MM}/index.md)

One index per reconciliation month, tracking every source image seen so nothing is processed twice.

## Format

Markdown table, one row per image:

| Image | Mode | Processed At | Extracted | Flagged | Skipped |
|---|---|---|---|---|---|
| photo_2026-07-05_19-08-11.jpg | Momo | 2026-07-05T19:10:00+07:00 | 5 | 1 | 0 |

- `Image` — filename only (path is implied by `data/{yyyy-MM}/{Mode}/`). For Techcombank rows sourced from an Excel statement, this is the statement filename instead (path implied by `data/TCB/`, not month-scoped) — one statement file can appear in several months' index.md files since its date range typically spans multiple months.
- `Mode` — source app (`Momo`, `VCB`, `Techcombank`).
- `Processed At` — ISO timestamp of when extraction ran for this image.
- `Extracted` — count of rows written with `Status = extracted`, attributed to this image (a merged row counts toward every image it drew an instance from).
- `Flagged` — count of rows written with `Status = NEEDS REVIEW`.
- `Skipped` — count of rows written with `Status = SKIPPED`.

## Rules

- An image listed here is done — skip it on future runs of this skill for the same month, even if the skill is invoked again.
- If an image is intentionally reprocessed (e.g. after confirming a new known edge case that affects it), update its existing row rather than adding a duplicate row.
- Create `data/{yyyy-MM}/index.md` with just the header row if it doesn't exist yet when a month is first processed.
