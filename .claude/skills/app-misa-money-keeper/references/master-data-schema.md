# Master Data Schema — `data/misa-master-data.json`

Produced by Action 6 (Sync Master Data). Project-root file, shared across skills (e.g. `app-data-extractor` for future category/wallet matching against extracted transactions).

**Overwritten in full on every sync** — this is a snapshot, not an append-only log. `syncedAt` is the only freshness signal; there is no automatic staleness check.

Only stable identity fields are kept — no live balances, no `iconObjectId` (UI-only cruft). Balances belong to Action 2 (`/wallets/accounts`) or a fresh sync, not this file.

## Shape

```json
{
  "syncedAt": "2026-07-05T21:45:00+07:00",
  "wallets": [
    { "walletId": "uuid", "walletName": "Cash Wallet", "walletType": 0, "bankName": "", "currencyCode": "VND" }
  ],
  "categories": {
    "expense": [
      {
        "id": "uuid",
        "name": "61 - NEC - Nhà Cửa, Sinh Hoạt",
        "children": [
          { "id": "uuid", "name": "6110 - Đi chợ, siêu thị" }
        ]
      }
    ],
    "income": [
      { "id": "uuid", "name": "101 - Lương" }
    ]
  }
}
```

## Field notes

| Field | Source | Notes |
|---|---|---|
| `syncedAt` | local clock at sync time | ISO 8601 with offset |
| `wallets[]` | `POST /wallets/accounts`, filtered `inActive:false` | `walletType` per the map in `api-reference.md` §2 |
| `categories.expense[]` | `GET /incomeexpensecategorys/0` | Tree preserved as-is (group → leaf); some top-level groups have no numeric code prefix |
| `categories.income[]` | `GET /incomeexpensecategorys/1` | Flat — MISA's income categories have no group/child nesting |

`children` is omitted (not empty-array) on leaf category nodes and on all income entries, to keep the file free of empty-array noise.
