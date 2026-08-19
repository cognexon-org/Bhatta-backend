# Shared Bhatta Deployment + Voice Entry

## Runtime boundary

One Node/Express backend serves all initial Bhatta clients. Each request resolves one tenant from the login tenant code / `X-Tenant-Code` / signed JWT. Operational Mongoose models are bound at runtime to that tenant's MongoDB connection through AsyncLocalStorage.

Production tenants should use `DEDICATED_URI`: each tenant record stores the *name of an environment variable*, not a password. Each environment variable points to a separate MongoDB database/user credential. All databases may still live in the same private MongoDB Community process.

## Minimum topology for clients 1-5

- One OCI VM (A1 Flex target when available).
- Nginx: public 443 only.
- One Node backend process/container.
- One MongoDB Community process configured as single-member replica set `rs0`.
- `bhatta_master` database for tenant registry and AI usage metadata.
- `bhatta_BH001`, `bhatta_BH002`, ... for ERP operational data.
- Dedicated MongoDB `readWrite` user per tenant DB.
- Separate encrypted/compressed `mongodump` backup per tenant DB.
- Tenant-specific Groq/Gemini API key env references.

MongoDB port 27017 must remain localhost/private only. `ALLOW_NON_TRANSACTIONAL_FALLBACK=false` is recommended for production because dispatch/process workflows use multi-document transactions.

## Onboard a tenant

1. Create the database user with an administrative Mongo URI:

```bash
MONGO_ADMIN_URI='mongodb://...' \
TENANT_DB_NAME='bhatta_BH001' \
TENANT_DB_USERNAME='bh001_user' \
TENANT_DB_PASSWORD='...' \
npm run tenant:db-user
```

2. Add `MONGO_URI_BH001`, `GROQ_API_KEY_BH001`, `GEMINI_API_KEY_BH001` to the backend secret environment.
3. Register/update tenant metadata:

```bash
TENANT_CODE=BH001 TENANT_NAME='Sharma Bricks' \
TENANT_DB_NAME=bhatta_BH001 TENANT_MONGO_URI_ENV=MONGO_URI_BH001 \
TENANT_GROQ_KEY_ENV=GROQ_API_KEY_BH001 \
TENANT_GEMINI_KEY_ENV=GEMINI_API_KEY_BH001 \
npm run tenant:register
```

4. Seed tenant admin/master data with explicit tenant credentials (the script has no default production password):

```bash
SEED_TENANT_CODE=BH001 \
SEED_ADMIN_MOBILE=9876543210 \
SEED_ADMIN_PASSWORD='replace-with-strong-password' \
npm run seed:admin
SEED_TENANT_CODE=BH001 npm run seed:erp
```

## Voice-to-entry contract

`POST /api/v1/voice-entry/parse`

```json
{
  "task": "PROCESS_ENTRY",
  "language": "hi-IN",
  "transcript": "आज राम ने पथाई में अठारह हजार ईंट बनाई, रेट छह सौ पचास प्रति हजार",
  "context": { "kilnId": "...", "seasonId": "..." }
}
```

The backend:

1. runs Hindi/English deterministic parsing;
2. escalates unresolved semantic fields to the tenant-selected Groq/Gemini provider;
3. resolves names against the current tenant database;
4. returns unresolved/ambiguous fields instead of guessing;
5. validates numeric/business constraints;
6. returns a preview only. The client must require human confirmation and then call the existing ERP save API.

AI output never writes directly to stock/worker/customer/cash ledgers.

For process entries, the resolver also reads the tenant Process master (`requiresWorkers`, `requiresChamber`, `requiresFuel`). Missing chamber/fuel/output details and multi-worker quantity allocation remain unresolved for manual review rather than being guessed.

## Provider switching

Tenant `ai.provider` supports `deterministic`, `groq`, `gemini`, or `auto`. In `auto`, `primary` and `fallback` select the order. Provider keys are looked up from tenant-specific environment variable names; the browser/mobile app never receives them.

## Backups

Create one archive per database, for example:

```bash
mongodump --uri "$MONGO_URI_BH001" --archive --gzip > BH001-$(date +%F).archive.gz
```

Encrypt before off-host/object-storage upload and test restores regularly. The recovery unit is one tenant database, not the whole platform.

## Secure single-VM bootstrap (Docker Compose starter)

The included `deploy/docker-compose.yml` keeps MongoDB on `127.0.0.1`, enables replica-set access control with a MongoDB keyfile, creates the Docker root account on first initialization, and then runs a one-shot replica-set initializer. The application never uses the Mongo root account.

1. Copy `deploy/.env.example` to `deploy/.env` and set a long random root password.
2. Run `sudo ./deploy/prepare-mongo-keyfile.sh` once. The keyfile is intentionally git-ignored.
3. Start Mongo and initialize `rs0`:

```bash
cd deploy
docker compose --env-file .env up -d mongo
docker compose --env-file .env run --rm mongo-init-replica
```

4. Create a restricted `bhatta_master` application user and one restricted user per tenant database. `tenant:db-user` accepts either `MONGO_ADMIN_URI` or the component variables below:

```bash
MONGO_ADMIN_USERNAME=bhatta_root \
MONGO_ADMIN_PASSWORD='...' \
TENANT_DB_NAME=bhatta_master \
TENANT_DB_USERNAME=bhatta_master_user \
TENANT_DB_PASSWORD='...' \
npm run tenant:db-user
```

Repeat for `bhatta_BH001`, `bhatta_BH002`, etc. Put only those restricted application credentials in the backend `.env`.

5. Register tenants, seed each tenant, then start the shared API.

The Docker Mongo root password and replica-set keyfile are bootstrap/administrative secrets. They must not be passed to normal API requests or stored in the tenant registry.

## Request isolation rules

- Login requires a Bhatta/organization code. The resulting JWT contains tenant identity.
- After login, clients send `X-Tenant-Code`; authenticated endpoints reject a JWT/header tenant mismatch.
- Mongoose models resolve from request-scoped `AsyncLocalStorage`; existing controllers therefore execute against one tenant connection without adding a `tenantId` filter to every ERP collection.
- Platform tenant-management endpoints are outside the tenant middleware and require `X-Platform-Key`.
- Cron jobs iterate active tenants and run inside the same request-style tenant context.
- The master DB stores tenant registry + AI usage metadata only; operational ERP records stay in each tenant DB.

## Voice cost-control behavior

Before an LLM call, the backend now performs three deterministic layers: Hindi/English number/date/domain parsing, exact tenant master-data mention matching (worker/customer/expense category), and schema/business validation. Only unresolved, ambiguous, mixed-status, low-confidence, or long dictation is escalated to the configured provider. AI output is schema-constrained, IDs are resolved only from the tenant DB, and the result remains a preview until the user confirms the existing ERP form.

`npm run voice:test` runs deterministic Hindi number/process/dispatch/attendance parser smoke tests without any AI key.
