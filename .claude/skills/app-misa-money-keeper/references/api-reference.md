# MISA Money Keeper — Business API Reference

Base URL: `https://moneykeeperapp.misa.vn/g1/api/business/api/v1`

## Auth / Session Extraction

Run inside `browser_evaluate` (Playwright) so the token never leaves the browser:

```js
const info = JSON.parse(localStorage.getItem('moneykeeper_userInfo'));
// info.accessToken, info.sessionId, info.userId available here
```

Required headers for every direct fetch call:

```js
{
  'authorization': 'Bearer ' + info.accessToken,
  'content-type': 'application/json',
  'x-misa-clientdevicetype': 'Web',
  'x-misa-clientversion': '1.0.0',
  'x-misa-clientid': 'Web_' + info.sessionId
}
```

Never log/print `info.accessToken` — pass it directly into the fetch call within the same `page.evaluate` closure.

### Bootstrapping a Session Without Manual Login

The `tools/misa-session-exporter/` Chrome extension's "Save to Downloads" button
always writes the session to `Downloads/misa-session.json` (fixed name, overwritten
each export — no path/rename to track). `loadMisaSession(page)` reads that same
default path, so no argument is needed for the common case:

```js
const fs = require("fs");
const os = require("os");
const path = require("path");

const DEFAULT_SESSION_PATH = path.join(os.homedir(), "Downloads", "misa-session.json");

async function loadMisaSession(page, sessionFilePath = DEFAULT_SESSION_PATH) {
  const session = fs.readFileSync(sessionFilePath, "utf-8");
  await page.addInitScript((raw) => {
    localStorage.setItem("moneykeeper_userInfo", raw);
  }, session);
  await page.goto("https://moneykeeperapp.misa.vn/");
}
```

`addInitScript` runs before any page script on every new document in that context, so
the session is present before MISA's app checks auth state. No manual login step
needed. The exported session may expire — if `loadMisaSession` results in a login
redirect, re-export from the browser extension (one click, overwrites the same file).

## 1. Read Transactions — `POST /transactions/pagingdashboard`

Request body:

```json
{
  "userId": "",
  "searchText": "",
  "startDate": "2026-06-27T22:13:56",
  "endDate": "2026-07-04T22:13:56",
  "reportType": -1,
  "skip": 0,
  "take": 2147483647
}
```

- `startDate`/`endDate`: ISO 8601, no milliseconds, no timezone suffix.
- `take`: use max int to avoid pagination; UI default is smaller.

Full `browser_evaluate` snippet (last N days):

```js
async () => {
  const info = JSON.parse(localStorage.getItem('moneykeeper_userInfo'));
  const now = new Date();
  const start = new Date(now.getTime() - N*24*60*60*1000); // N = days back
  const toIso = d => d.toISOString().slice(0,19);
  const res = await fetch('/g1/api/business/api/v1/transactions/pagingdashboard', {
    method: 'POST',
    headers: {
      'authorization': 'Bearer ' + info.accessToken,
      'content-type': 'application/json',
      'x-misa-clientdevicetype': 'Web',
      'x-misa-clientversion': '1.0.0',
      'x-misa-clientid': 'Web_' + info.sessionId
    },
    body: JSON.stringify({ userId: '', searchText: '', startDate: toIso(start), endDate: toIso(now), reportType: -1, skip: 0, take: 2147483647 })
  });
  return { status: res.status, data: await res.json() };
}
```

Response: flat array, alternating:
- **Parent row** (`isParent:true`): a date-group header. `categoryName` = human date label ("Hôm nay - dd/mm/yyyy", "Hôm qua - dd/mm/yyyy", or "dd/mm/yyyy"). `totalSpend`/`totalCollect` = day totals.
- **Child row** (`isParent:false`, `parentId` = parent's `id`): one real transaction. Key fields: `categoryName` (e.g. "6203 - Xăng Xe"), `walletName`, `description`, `transactionDate`, `currentAmount` (negative=expense, positive=income), `transactionType` (0=normal, 2=internal transfer — excluded from spend/income totals), `bankLogo`, `bankId`.

**`id` vs `transactionId` — do not confuse these.** Every child row carries both, and they are NOT interchangeable:
- `transactionId`: the real, stable MISA transaction identifier — matches the value the create endpoint returns in `transactionsId` (section 6/7/8 below). This is what belongs in the sheet's `Misa Transaction Id` column.
- `id`: a row/pagination identifier for this response only — **confirmed volatile 2026-07-08: the same transaction's `id` returned a different value on two `pagingdashboard` calls seconds apart**, while `transactionId` stayed constant. Never store `id` as a transaction reference; only ever use `transactionId`.

## 2. Read Accounts/Wallets — `POST /wallets/accounts`

Request body:

```json
{ "searchText": "", "walletType": null, "inActive": null, "excludeReport": null, "skip": 0, "take": 1000 }
```

`take` MUST be raised above the UI's default (10) to get the full list — use 1000+.

Response: array of wallet objects:

```json
{
  "walletId": "uuid",
  "walletName": "TCB - 90",
  "inActive": false,
  "walletType": 1,
  "excludeReport": false,
  "bankId": "uuid-or-empty",
  "bankLogo": "techcombank.jpg",
  "bankName": "Ngân hàng TMCP Kỹ Thương Việt Nam",
  "currencyCode": "VND",
  "currentAmount": -1992000,
  "convertCurrentAmount": 0
}
```

`walletType` map (inferred from data, not confirmed against UI source):

| Value | Meaning |
|---|---|
| 0 | Cash (Ví tiền mặt) |
| 1 | Bank account |
| 2 | Credit card |
| 3 | Savings / Investment |
| 4 | Adjustment (system) |

## 3. Create Batch Transactions — `POST /transactions/` (UI-only)

Triggered by clicking "Lưu" on the `/management/add-transaction` batch-entry screen. Payload was **not** fully reverse-engineered for this UI flow specifically — drive this via Playwright UI interaction (click/type), not a direct fetch. (The single-entry dialog's payload for the same endpoint *is* known — see sections 6-7 below — but batch-entry's payload shape was never captured and may differ.)

Success response:

```json
{ "transactionsId": ["uuid1", "uuid2", "..."] }
```

One ID per row submitted, in row order. Report these to the user for later lookup/deletion.

For the current full category list, don't hand-curate a sample table — call the endpoints in section 4 below, or read the synced `data/misa-master-data.json` (see `references/master-data-schema.md`).

## 4. Read Categories — `GET /incomeexpensecategorys/{type}`

`type`: `0` = expense (hierarchical tree — parent groups with `children[]`, e.g. `"61 - NEC - Nhà Cửa, Sinh Hoạt"` → `"6110 - Đi chợ, siêu thị"`; some groups have no numeric code, e.g. `"Ăn uống"` → `"Ăn sáng"`), `1` = income (flat list, e.g. `"101 - Lương"`).

```js
GET /incomeexpensecategorys/0   // expense tree
GET /incomeexpensecategorys/1   // income flat list
```

Response shape (expense, nested; income, flat with empty `children`):
```json
[{ "incomeExpenseCategoryId": "uuid", "name": "61 - NEC - Nhà Cửa, Sinh Hoạt", "parentId": null, "iconObjectId": "...", "children": [
  { "incomeExpenseCategoryId": "uuid", "name": "6110 - Đi chợ, siêu thị", "parentId": "uuid", "iconObjectId": "...", "children": [] }
]}]
```

**Caveat:** `GET /incomeexpensecategorys/suggest/{type}` returns a "recently used" shortlist only (flat, no groups) — never substitute it for the full list above.

## 5. Read Wallets (Add-Transaction Picker) — `GET /wallets/addtransaction`

Used by **every** account picker in the "Ghi chép thu chi" single-entry dialog (Chi tiền, Thu tiền, both Chuyển khoản from/to pickers, Điều chỉnh số dư) — confirmed by triggering each field individually, not inferred from tab-switch side effects. Unfiltered: includes every wallet regardless of type, even the one already selected elsewhere in the same form.

```json
[{ "walletId": "uuid", "walletName": "Cash Wallet", "currentAmount": 1058000.0, "currencyCode": "VND", "walletType": 0, "bankId": "", "isRecent": 0, "bankLogo": null, "currencySymbol": "₫", "convertCurrentAmount": 0 }]
```

Distinct from `/wallets/accounts` (section 2) — that endpoint remains the source of truth for the `inActive` flag; this one doesn't expose it and appears pre-filtered to usable wallets.

## 6. Create Transfer Transaction — `POST /transactions/` (WRITE — confirm first)

Verified live (real test transaction, not inferred). Same endpoint as batch-create; single-entry mode sends a 1-element array.

```json
[{
  "transactionType": 2,
  "amount": 1000,
  "walletId": "<from-wallet-uuid>",
  "transactionDate": "2026-07-05T22:03:54",
  "moreInfo": { "excludeReport": false, "description": "..." },
  "transfer": { "toWalletId": "<to-wallet-uuid>", "fcAmount": 0 }
}]
```
- `transactionType: 2` = internal transfer (matches the read-side note in section 1 that type-2 rows are excluded from spend/income totals).
- `walletId` = from-wallet, `transfer.toWalletId` = to-wallet — both sourced from section 5's `/wallets/addtransaction`.
- `fcAmount` observed as `0` for a same-currency (VND) transfer; multi-currency behavior not explored.
- Response: `{"transactionsId": ["uuid"]}`.

UI equivalent: "Ghi chép" → "Ghi chép thu chi" → "Chuyển khoản" tab.

## 7. Create Balance Adjustment — `POST /transactions/` (WRITE — confirm first)

Verified live (real test transaction, not inferred).

```json
[{
  "transactionType": 3,
  "amount": 0,
  "incomeExpenseCategoryId": "<category-uuid>",
  "incomeExpenseCategoryName": "901 - Điều Chỉnh",
  "walletId": "<wallet-uuid>",
  "transactionDate": "2026-07-05T22:05:23",
  "adjustment": { "closingAmount": 122000 },
  "moreInfo": { "description": "...", "excludeReport": false }
}]
```
- `transactionType: 3` = balance adjustment. `amount` is always `0` — the server derives the actual delta from `adjustment.closingAmount` (the target absolute balance) vs the wallet's current balance.
- **Category set flips with the sign of the difference** — confirmed live both directions: a positive difference (target > current) uses `901 - Điều Chỉnh` from `GET /incomeexpensecategorys/1` (income-side); a negative difference (target < current) uses `7902 - Điều Chỉnh` from `GET /incomeexpensecategorys/0` (expense-side).
- Response: `{"transactionsId": ["uuid"]}`.

UI equivalent: "Ghi chép" → "Ghi chép thu chi" → "Điều chỉnh số dư" tab.

## 8. Create Single Expense/Income Transaction — `POST /transactions/` (WRITE — confirm first)

Verified live (real test transactions, not inferred) for BOTH directions as of 2026-07-07.

Expense payload:
```json
[{
  "transactionType": 0,
  "amount": 1000,
  "incomeExpenseCategoryId": "<expense-category-uuid>",
  "incomeExpenseCategoryName": "7901 - Khác",
  "walletId": "<wallet-uuid>",
  "transactionDate": "2026-07-05T22:16:40",
  "moreInfo": { "excludeReport": false, "description": "..." }
}]
```

Income payload — **`transactionType` must be `1`, and an `"income": null` field must be present**:
```json
[{
  "transactionType": 1,
  "amount": 499,
  "incomeExpenseCategoryId": "<income-category-uuid>",
  "incomeExpenseCategoryName": "Lãi tiết kiệm",
  "walletId": "<wallet-uuid>",
  "transactionDate": "2026-04-25T00:00:00",
  "income": null,
  "moreInfo": { "excludeReport": false, "description": "..." }
}]
```
- **`transactionType` is NOT a fixed `0` for both directions** — this was previously (wrongly) documented as inferred from `incomeExpenseCategoryId`'s tree. That inference does not reliably work: sending `transactionType: 0` with an income-tree category id is nondeterministic — it landed as income (type 1, positive) in only 1 of 4 live attempts and as a wrong-signed expense (type 0, negated amount) in the other 3, with byte-identical payload shapes. The fix: explicitly send `transactionType: 1` (and the `income: null` field) for every income insert. Never rely on category-tree inference for direction.
- `amount` **must be positive** in both cases — sending a negative or zero value returns `400` with `{"ErrorCode":"syms:12000", "ValidationFailure": {"Property":"Amount", "FailureReason":"Số tiền ... không thể âm hoặc bằng 0"}}`. This differs from the read-side convention (negative `currentAmount` = expense, section 1) — the write payload carries no sign, only magnitude.
- After any income insert via direct API, verify by re-reading (`pagingdashboard`) that the result has `transactionType: 1` and a positive `currentAmount` before reporting success — do not trust the create response alone.
- Response: `{"transactionsId": ["uuid"]}`.
