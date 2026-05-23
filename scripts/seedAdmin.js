require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/modules/users/user.model');
const StockCategory = require('../src/modules/stock/stockCategory.model');
const roles = require('../src/constants/roles');

async function seed() {
  await connectDB();
  const name = process.env.SEED_ADMIN_NAME || 'Super Admin';
  const mobile = process.env.SEED_ADMIN_MOBILE || '9999999999';
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';

  let admin = await User.findOne({ mobile });
  if (!admin) {
    admin = await User.create({ name, mobile, email, passwordHash: await User.hashPassword(password), role: roles.ADMIN, languagePreference: 'en', isActive: true });
    console.log('Admin created:', { mobile, email, password });
  } else {
    console.log('Admin already exists:', { mobile, email: admin.email });
  }

  const categories = [
    { name: 'Seedha Manjal', nameHindi: 'सीधा मंजल', code: 'SEEDHA_MANJAL' },
    { name: 'Tedha Manjal', nameHindi: 'टेढ़ा मंजल', code: 'TEDHA_MANJAL' },
    { name: 'Other', nameHindi: 'अन्य', code: 'OTHER' }
  ];
  for (const category of categories) {
    await StockCategory.updateOne({ code: category.code }, { $setOnInsert: category }, { upsert: true });
  }
  console.log('Stock categories seeded');
  await mongoose.disconnect();
}
seed().catch(async (error) => { console.error(error); await mongoose.disconnect(); process.exit(1); });
