const FuelType = require('./fuelType.model');
const FuelStock = require('./fuelStock.model');
const FuelPurchase = require('./fuelPurchase.model');
const FuelConsumption = require('./fuelConsumption.model');
const CashTransaction = require('../cashbook/cashTransaction.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { t } = require('../../constants/messages');
const { resolveFuelType } = require('../../utils/masterData');
function scoped(req, f = {}) { if(req.user.role === roles.MANAGER && req.user.assignedKilnId) f.kilnId = req.user.assignedKilnId; return f; }
exports.listTypes = asyncHandler(async (req,res)=>{ const result = await paginate(FuelType, req.query.isActive !== undefined ? { isActive: req.query.isActive === 'true' } : {}, req.query); return success(res,t('FETCHED',req.lang),result.items,200,result.meta); });
exports.createType = asyncHandler(async (req,res)=>created(res,t('CREATED',req.lang),await FuelType.create({ ...req.body, createdBy: req.user._id })));
exports.updateType = asyncHandler(async (req,res)=>{ const item = await FuelType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('UPDATED', req.lang), item); });
exports.stock = asyncHandler(async (req,res)=>{ const f=scoped(req,{}); ['kilnId','seasonId','fuelTypeId'].forEach(k=>{ if(req.query[k]) f[k]=req.query[k]; }); const result=await paginate(FuelStock,f,req.query,{populate:[{path:'fuelTypeId'},{path:'kilnId'},{path:'seasonId'}]}); return success(res,t('FETCHED',req.lang),result.items,200,result.meta); });
exports.listPurchases = asyncHandler(async (req,res)=>{ const f=scoped(req,{}); ['kilnId','seasonId','supplierId','fuelTypeId'].forEach(k=>{ if(req.query[k]) f[k]=req.query[k]; }); const result=await paginate(FuelPurchase,f,req.query,{populate:[{path:'fuelTypeId'},{path:'supplierId'},{path:'createdBy',select:'name mobile'}]}); return success(res,t('FETCHED',req.lang),result.items,200,result.meta); });
exports.createPurchase = asyncHandler(async (req,res)=>{
  const fuelType = await resolveFuelType({ fuelTypeId: req.body.fuelTypeId, fuelCode: req.body.fuelCode });
  const quantity = Number(req.body.quantity || 0); if(quantity <= 0) return fail(res,'Quantity must be greater than zero',400);
  const totalAmount = req.body.totalAmount ?? quantity * Number(req.body.rate || 0); const paidAmount = Number(req.body.paidAmount || 0);
  const payload = { ...req.body, fuelTypeId: fuelType._id, fuelCode: undefined, kilnId: req.body.kilnId || req.user.assignedKilnId, totalAmount, paidAmount, dueAmount: Math.max(totalAmount - paidAmount, 0), createdBy: req.user._id };
  const purchase = await FuelPurchase.create(payload);
  let stock = await FuelStock.findOne({ kilnId: payload.kilnId, seasonId: payload.seasonId || null, fuelTypeId: fuelType._id });
  if(!stock) stock = await FuelStock.create({ kilnId: payload.kilnId, seasonId: payload.seasonId, fuelTypeId: fuelType._id, availableQuantity: 0, averageRate: 0, lastUpdatedBy: req.user._id });
  const newQty = stock.availableQuantity + quantity; stock.averageRate = newQty > 0 ? (((stock.availableQuantity * stock.averageRate) + totalAmount) / newQty) : Number(req.body.rate || 0); stock.availableQuantity = newQty; stock.lastUpdatedBy = req.user._id; await stock.save();
  if(paidAmount > 0) await CashTransaction.create({ kilnId: payload.kilnId, seasonId: payload.seasonId, date: payload.date || new Date(), transactionType: 'EXPENSE', sourceModule: 'FUEL_PURCHASE', sourceId: purchase._id, amount: paidAmount, paymentMode: req.body.paymentMode || 'CASH', accountType: req.body.accountType || 'CASH', paidTo: 'Fuel supplier', createdBy: req.user._id, remark: req.body.remark });
  return created(res,t('CREATED',req.lang),{ purchase, stock });
});
exports.listConsumption = asyncHandler(async (req,res)=>{ const f=scoped(req,{}); ['kilnId','seasonId','chamberId','fuelTypeId','processEntryId'].forEach(k=>{ if(req.query[k]) f[k]=req.query[k]; }); const result=await paginate(FuelConsumption,f,req.query,{populate:[{path:'fuelTypeId'},{path:'chamberId'},{path:'processEntryId'}]}); return success(res,t('FETCHED',req.lang),result.items,200,result.meta); });
exports.createConsumption = asyncHandler(async (req,res)=>{
  const fuelType = await resolveFuelType({ fuelTypeId: req.body.fuelTypeId, fuelCode: req.body.fuelCode });
  const kilnId = req.body.kilnId || req.user.assignedKilnId; const quantity = Number(req.body.quantity || 0);
  let stock = await FuelStock.findOne({ kilnId, seasonId: req.body.seasonId || null, fuelTypeId: fuelType._id }); if(!stock || stock.availableQuantity < quantity) return fail(res,'Insufficient fuel stock',400);
  stock.availableQuantity -= quantity; stock.lastUpdatedBy = req.user._id; await stock.save();
  const item = await FuelConsumption.create({ ...req.body, fuelTypeId: fuelType._id, fuelCode: undefined, kilnId, consumedBy: req.user._id }); return created(res,t('CREATED',req.lang),item);
});
exports.consumptionReport = asyncHandler(async (req,res)=>{ const f=scoped(req,{}); if(req.query.fromDate || req.query.toDate){ f.date={}; if(req.query.fromDate) f.date.$gte=new Date(req.query.fromDate); if(req.query.toDate){ const d=new Date(req.query.toDate); d.setHours(23,59,59,999); f.date.$lte=d; }} const data=await FuelConsumption.aggregate([{ $match:f },{ $group:{ _id:'$fuelTypeId', quantity:{ $sum:'$quantity' }, estimatedCost:{ $sum:'$estimatedCost' }, entries:{ $sum:1 } } }]); return success(res,t('FETCHED',req.lang),data); });
exports.costPerBrick = asyncHandler(async (req,res)=>success(res,t('FETCHED',req.lang),{ message:'Use /reports/profit-loss with production quantity for cost per brick calculation.' }));
