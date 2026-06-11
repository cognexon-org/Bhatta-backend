# ERP Backend Update Summary

This backend has been upgraded with the complete Brick Kiln / Bhatta ERP module structure.

## New final ERP modules added

- Seasons
- Worker categories
- Brick categories
- Process master
- Process entries
- Stock ledger
- Worker ledger / Peshgi
- Payroll
- Chambers
- Fuel / Coal
- Dispatches / Challan / Invoice data
- Customer ledger
- Expenses
- Suppliers
- Purchases
- Supplier ledger
- Vehicles
- Cashbook
- Reports

## Important route base

All APIs use:

```txt
/api/v1
```

## Seed commands

```bash
npm run seed:admin
npm run seed:erp
```

## Validation command

```bash
npm run check
```

## Important production flow

```txt
Pathai -> Kaccha Stock -> Sukhai -> Bharai -> Phukai -> Pakai -> Nikasi -> Chhantai -> Finished Stock -> Dispatch
```

The new core module is `/api/v1/process-entries`.
