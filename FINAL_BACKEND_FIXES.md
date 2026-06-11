# Final Backend Fixes Applied

This backend package fixes the old-to-new ERP transformation issues where configurable business master data was still treated as hardcoded enum data.

## Main corrections

1. Worker categories are now database master data.
   - `WorkerCategory` collection is the source of truth.
   - `Worker.categoryCode` no longer uses `constants/workerCategories.js` as a Mongoose enum.
   - `Worker` now stores `categoryId`, `categoryCode`, `categoryName`, and `categoryNameHindi` snapshot fields.
   - Worker create/update resolves and validates category from `WorkerCategory`.

2. Attendance category validation fixed.
   - `Attendance.categoryCode` no longer uses hardcoded worker category enum.
   - Attendance stores category snapshot from worker.

3. Process master is now dynamic.
   - `Process.code` no longer uses hardcoded `PROCESS_CODE` enum.
   - `ProcessEntry.processCode` no longer uses hardcoded `PROCESS_CODE` enum.
   - Process entries validate `processCode` or `processId` from the `Process` collection.
   - Constants are now seed/fallback data only.

4. Expense category master added.
   - Added `ExpenseCategory` model, controller, and routes.
   - Added `/api/v1/expense-categories` APIs.
   - `Expense` stores `categoryId`, `categoryCode`, `categoryName`, and `categoryNameHindi`.
   - Expense create/update validates category from `ExpenseCategory`.

5. Brick/stock category validation improved.
   - Stock service resolves categories from `StockCategory` collection.
   - Dispatch validates that category is active and dispatch-allowed.
   - Stock requests now support `categoryId` or `categoryCode`.

6. Constants endpoints corrected.
   - `/api/v1/constants` now returns database master data when seeded.
   - Hardcoded constants are used only as fallback/default seed data.

7. Seed script updated.
   - `npm run seed:erp` now seeds brick categories, worker categories, processes, fuel types, and expense categories.

8. Safer ledger flows.
   - Stock service supports session-aware stock and stock-ledger updates.
   - Worker ledger and customer ledger services support session-aware updates.
   - Process entry and dispatch flows use optional MongoDB transactions.
   - If MongoDB standalone does not support transactions, the API falls back to normal writes so local development still works.

## Final design rule

System status fields remain enum-based:

- USER_ROLE
- SALARY_TYPE
- ATTENDANCE_STATUS
- ORDER_STATUS
- DISPATCH_STATUS
- PAYMENT_MODE
- APPROVAL_STATUS
- LEDGER transaction types

Business master data is database-backed:

- WorkerCategory
- StockCategory / BrickCategory
- Process
- FuelType
- ExpenseCategory

## Checks run

- `npm run check`
- `node -e "require('./src/app')"`
- `npm test`

Note: `npm test` still contains placeholder tests only, as inherited from the project.
