# Bhatta Backend — Multi-Tenant + Voice Entry Patch

This ZIP contains ONLY files that are new or changed from the uploaded `Bhatta-backend-main` repository.
Extract it into the repository root, preserving paths.

## Implements

- One shared Node/Express API for multiple Bhatta clients.
- `bhatta_master` control DB for tenant registry + AI usage metadata only.
- Separate MongoDB database + restricted DB credential per Bhatta tenant.
- Tenant resolution from organization code / `X-Tenant-Code` / signed JWT.
- Request-scoped Mongoose model binding through AsyncLocalStorage, so existing ERP controllers operate on exactly one tenant DB without adding `tenantId` to every collection.
- Tenant-aware cron jobs.
- Groq / Gemini / auto / deterministic provider routing with per-tenant key environment references.
- Hindi/English deterministic-first voice parsing, tenant DB entity resolution, schema/business validation, unresolved/ambiguity reporting, and preview-only results.
- Voice tasks: PROCESS_ENTRY, EXPENSE_ENTRY, CUSTOMER_PAYMENT, WORKER_ADVANCE, ATTENDANCE, DISPATCH.
- MongoDB Community single-member replica-set starter deployment for one OCI VM.
- Production transaction fallback disabled by default.
- Provisioning scripts for tenant DB users, tenant registration, and tenant-scoped seed data.

## Apply

1. Back up your repository/database.
2. Extract this ZIP into the backend repo root.
3. Keep real secrets OUT of source control. Copy `.env.example` to your secure runtime environment and replace placeholders.
4. For the single-VM MongoDB starter, read `docs/MULTI_TENANT_VOICE_DEPLOYMENT.md` and prepare the Mongo keyfile before starting Compose.
5. Create the restricted `bhatta_master` DB user and one restricted DB user per tenant.
6. Register each tenant with `npm run tenant:register`.
7. Seed each tenant with explicit `SEED_TENANT_CODE`, `SEED_ADMIN_MOBILE`, and `SEED_ADMIN_PASSWORD`.
8. Run:
   - `npm install` / `npm ci`
   - `npm run check`
   - `npm run voice:test`
9. Before production, run tenant-isolation denial tests and a real replica-set transaction smoke test on your OCI environment.

## Notes

- This patch does not contain any real MongoDB, Groq, Gemini, JWT, or platform-admin secret.
- Voice-to-entry does not directly save stock/ledger/cash transactions; it returns a reviewable form preview and the existing ERP endpoints remain the write path.
- Complex process details such as missing chamber/fuel/output data or multi-worker quantity allocation remain unresolved for user review rather than being guessed.
