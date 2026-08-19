require('dotenv').config();
const connectDB = require('../src/config/db');
const { closeDB } = require('../src/config/db');
const { getTenantModel } = require('../src/platform/tenant.model');
const { getTenantConnection } = require('../src/platform/tenantConnectionManager');
const { runWithTenant } = require('../src/platform/tenantContext');
const User = require('../src/modules/users/user.model');
const StockCategory = require('../src/modules/stock/stockCategory.model');
const roles = require('../src/constants/roles');

async function seedForTenant(tenant) {
  const name = process.env.SEED_ADMIN_NAME || 'Super Admin';
  const mobile = String(process.env.SEED_ADMIN_MOBILE || '').trim();
  const email = String(process.env.SEED_ADMIN_EMAIL || '').trim() || undefined;
  const password = String(process.env.SEED_ADMIN_PASSWORD || '');
  if (!mobile || !password) throw new Error('SEED_ADMIN_MOBILE and SEED_ADMIN_PASSWORD are required for tenant provisioning');
  if (password.length < 10) throw new Error('SEED_ADMIN_PASSWORD must be at least 10 characters');

  let admin = await User.findOne({ mobile });
  if (!admin) {
    admin = await User.create({ name, mobile, email, passwordHash: await User.hashPassword(password), role: roles.ADMIN, languagePreference: 'hi', isActive: true });
    console.log(`[${tenant.code}] Admin created:`, { mobile, email });
  } else console.log(`[${tenant.code}] Admin already exists:`, { mobile, email: admin.email });

  const categories = [
    { name: 'Seedha Kacchi', nameHindi: 'सीधा कच्ची', code: 'SEEDHA_KACCHI' },
    { name: 'Seedha Pakki', nameHindi: 'सीधा पक्की', code: 'SEEDHA_PAKKI' },
    { name: 'Tedha Kacchi', nameHindi: 'टेढ़ा कच्ची', code: 'TEDHA_KACCHI' },
    { name: 'Tedha Pakki', nameHindi: 'टेढ़ा पक्की', code: 'TEDHA_PAKKI' },
    { name: 'Other', nameHindi: 'अन्य', code: 'OTHER' }
  ];
  for (const category of categories) await StockCategory.updateOne({ code: category.code }, { $setOnInsert: category }, { upsert: true });
}

async function seed() {
  await connectDB();
  const Tenant = getTenantModel();
  const code = String(process.env.SEED_TENANT_CODE || process.env.TENANT_CODE || '').toUpperCase();
  if (!code) throw new Error('SEED_TENANT_CODE is required');
  const tenant = await Tenant.findOne({ code, status: 'ACTIVE' });
  if (!tenant) throw new Error(`Active tenant not found: ${code}`);
  const connection = await getTenantConnection(tenant);
  await runWithTenant({ tenant, connection }, () => seedForTenant(tenant));
  await closeDB();
}
seed().catch(async (error) => { console.error(error); await closeDB().catch(() => {}); process.exit(1); });
