const Stock = require('./stock.model');
const StockLedger = require('../stockLedger/stockLedger.model');
const { resolveBrickCategory } = require('../../utils/masterData');

async function findCategory({ categoryId, categoryCode, requireActive = true, allowDispatch = false }) {
  return resolveBrickCategory({ categoryId, categoryCode, requireActive, allowDispatch });
}

async function ensureStock({ kilnId, seasonId, categoryId, categoryCode, userId, session, allowDispatch = false }) {
  const category = await resolveBrickCategory({ categoryId, categoryCode, allowDispatch });
  let stock = await Stock.findOne({ kilnId, seasonId: seasonId || null, categoryId: category._id }).session(session || null);
  if (!stock) {
    const rows = await Stock.create([{ kilnId, seasonId, categoryId: category._id, categoryCode: category.code, availableQuantity: 0, lastUpdatedBy: userId }], session ? { session } : undefined);
    stock = rows[0];
  }
  return { stock, category };
}

async function addStock({ kilnId, seasonId, categoryId, categoryCode, quantity, sourceModule, sourceId, userId, remark, date, session }) {
  if (Number(quantity) <= 0) throw new Error('Quantity must be greater than zero');
  const { stock, category } = await ensureStock({ kilnId, seasonId, categoryId, categoryCode, userId, session });
  const previousQuantity = stock.availableQuantity;
  stock.availableQuantity += Number(quantity);
  stock.lastUpdatedBy = userId;
  await stock.save(session ? { session } : undefined);
  await StockLedger.create([{ kilnId, seasonId, date: date || new Date(), transactionType: 'ADD', categoryId: category._id, categoryCode: category.code, toCategoryId: category._id, toCategoryCode: category.code, quantity, sourceModule, sourceId, previousQuantity, newQuantity: stock.availableQuantity, createdBy: userId, remark }], session ? { session } : undefined);
  return stock;
}

async function reduceStock({ kilnId, seasonId, categoryId, categoryCode, quantity, sourceModule, sourceId, userId, remark, date, session, allowDispatch = false }) {
  if (Number(quantity) <= 0) throw new Error('Quantity must be greater than zero');
  const { stock, category } = await ensureStock({ kilnId, seasonId, categoryId, categoryCode, userId, session, allowDispatch });
  const previousQuantity = stock.availableQuantity;
  if (previousQuantity < Number(quantity)) throw new Error(`Insufficient stock for ${category.code}. Available ${previousQuantity}, requested ${quantity}`);
  stock.availableQuantity -= Number(quantity);
  stock.lastUpdatedBy = userId;
  await stock.save(session ? { session } : undefined);
  await StockLedger.create([{ kilnId, seasonId, date: date || new Date(), transactionType: 'REDUCE', categoryId: category._id, categoryCode: category.code, fromCategoryId: category._id, fromCategoryCode: category.code, quantity, sourceModule, sourceId, previousQuantity, newQuantity: stock.availableQuantity, createdBy: userId, remark }], session ? { session } : undefined);
  return stock;
}

async function transferStock({ kilnId, seasonId, fromCategoryId, fromCategoryCode, toCategoryId, toCategoryCode, quantity, sourceModule, sourceId, userId, remark, date, session }) {
  await reduceStock({ kilnId, seasonId, categoryId: fromCategoryId, categoryCode: fromCategoryCode, quantity, sourceModule, sourceId, userId, remark: remark || 'Stock transfer out', date, session });
  const stock = await addStock({ kilnId, seasonId, categoryId: toCategoryId, categoryCode: toCategoryCode, quantity, sourceModule, sourceId, userId, remark: remark || 'Stock transfer in', date, session });
  return stock;
}

async function correctStock({ kilnId, seasonId, categoryId, categoryCode, quantity, sourceModule, sourceId, userId, remark, date, session }) {
  if (Number(quantity) < 0) throw new Error('Quantity cannot be negative');
  const { stock, category } = await ensureStock({ kilnId, seasonId, categoryId, categoryCode, userId, session });
  const previousQuantity = stock.availableQuantity;
  stock.availableQuantity = Number(quantity);
  stock.lastUpdatedBy = userId;
  await stock.save(session ? { session } : undefined);
  await StockLedger.create([{ kilnId, seasonId, date: date || new Date(), transactionType: 'CORRECTION', categoryId: category._id, categoryCode: category.code, quantity, sourceModule, sourceId, previousQuantity, newQuantity: stock.availableQuantity, createdBy: userId, remark }], session ? { session } : undefined);
  return stock;
}

module.exports = { findCategory, ensureStock, addStock, reduceStock, transferStock, correctStock };
