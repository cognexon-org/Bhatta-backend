const ProcessEntry = require('../processEntries/processEntry.model');
const Stock = require('../stock/stock.model');
const StockLedger = require('../stockLedger/stockLedger.model');
const WorkerLedger = require('../workerLedger/workerLedger.model');
const CustomerLedger = require('../customerLedger/customerLedger.model');
const Dispatch = require('../dispatches/dispatch.model');
const Expense = require('../expenses/expense.model');
const FuelConsumption = require('../fuel/fuelConsumption.model');
const Payment = require('../payments/payment.model');
const Udhari = require('../udhari/udhari.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { t } = require('../../constants/messages');
function base(req, dateField='date'){ const f={}; ['kilnId','seasonId','managerId'].forEach(k=>{ if(req.query[k]) f[k]=req.query[k]; }); if(req.user.role===roles.MANAGER){ if(dateField !== 'receivedBy') f.managerId=req.user._id; if(req.user.assignedKilnId) f.kilnId=req.user.assignedKilnId; } const from=req.query.fromDate||req.query.from; const to=req.query.toDate||req.query.to; if(from||to){ f[dateField]={}; if(from) f[dateField].$gte=new Date(from); if(to){ const d=new Date(to); d.setHours(23,59,59,999); f[dateField].$lte=d; } } return f; }
exports.dailySummary = asyncHandler(async(req,res)=>{ const today=new Date(); const start=new Date(today); start.setHours(0,0,0,0); const end=new Date(today); end.setHours(23,59,59,999); req.query.fromDate=req.query.fromDate||start.toISOString(); req.query.toDate=req.query.toDate||end.toISOString(); const [process,dispatch,payments,expenses,fuel]=await Promise.all([
  ProcessEntry.aggregate([{ $match: base(req) },{ $group:{ _id:'$processCode', quantityIn:{ $sum:'$quantityIn' }, quantityOut:{ $sum:'$quantityOut' }, entries:{ $sum:1 } } }]),
  Dispatch.aggregate([{ $match: base(req,'dispatchDate') },{ $group:{ _id:null,totalQuantity:{ $sum:'$totalQuantity' },totalAmount:{ $sum:'$totalAmount' },entries:{ $sum:1 } } }]),
  Payment.aggregate([{ $match: base(req,'paymentDate') },{ $group:{ _id:null,amount:{ $sum:'$amount' },entries:{ $sum:1 } } }]),
  Expense.aggregate([{ $match: base(req) },{ $group:{ _id:null,amount:{ $sum:'$amount' },entries:{ $sum:1 } } }]),
  FuelConsumption.aggregate([{ $match: base(req) },{ $group:{ _id:'$fuelTypeId',quantity:{ $sum:'$quantity' },estimatedCost:{ $sum:'$estimatedCost' } } }])
]); return success(res,t('FETCHED',req.lang),{process,dispatch:dispatch[0]||{},payments:payments[0]||{},expenses:expenses[0]||{},fuel}); });
exports.production = asyncHandler(async(req,res)=>{ const f=base(req); if(req.query.processCode) f.processCode=req.query.processCode; const data=await ProcessEntry.aggregate([{ $match:f },{ $group:{ _id:'$processCode',quantityIn:{ $sum:'$quantityIn' },quantityOut:{ $sum:'$quantityOut' },wastage:{ $sum:'$wastageQuantity' },entries:{ $sum:1 } } }]); return success(res,t('FETCHED',req.lang),data); });
exports.process = (code)=>asyncHandler(async(req,res)=>{ req.query.processCode=code; return exports.production(req,res); });
exports.stock = asyncHandler(async(req,res)=>{ const f={}; ['kilnId','seasonId','categoryCode'].forEach(k=>{ if(req.query[k]) f[k]=req.query[k]; }); if(req.user.role===roles.MANAGER&&req.user.assignedKilnId) f.kilnId=req.user.assignedKilnId; const data=await Stock.find(f).populate('categoryId kilnId seasonId'); return success(res,t('FETCHED',req.lang),data); });
exports.fuel = asyncHandler(async(req,res)=>{ const data=await FuelConsumption.aggregate([{ $match:base(req) },{ $group:{ _id:'$fuelTypeId',quantity:{ $sum:'$quantity' },estimatedCost:{ $sum:'$estimatedCost' },entries:{ $sum:1 } } }]); return success(res,t('FETCHED',req.lang),data); });
exports.workerLedger = asyncHandler(async(req,res)=>{ const f=base(req); if(req.query.workerId) f.workerId=req.query.workerId; const data=await WorkerLedger.aggregate([{ $match:f },{ $group:{ _id:{workerId:'$workerId',type:'$transactionType'},amount:{ $sum:'$amount' },debit:{ $sum:'$debit' },credit:{ $sum:'$credit' } } }]); return success(res,t('FETCHED',req.lang),data); });
exports.customerLedger = asyncHandler(async(req,res)=>{ const f=base(req); if(req.query.customerId) f.customerId=req.query.customerId; const data=await CustomerLedger.aggregate([{ $match:f },{ $group:{ _id:{customerId:'$customerId',type:'$transactionType'},debit:{ $sum:'$debit' },credit:{ $sum:'$credit' } } }]); return success(res,t('FETCHED',req.lang),data); });
exports.sales = asyncHandler(async(req,res)=>{ const data=await Dispatch.aggregate([{ $match:base(req,'dispatchDate') },{ $group:{ _id:'$customerId',totalQuantity:{ $sum:'$totalQuantity' },totalAmount:{ $sum:'$totalAmount' },paidAmount:{ $sum:'$paidAmount' },entries:{ $sum:1 } } }]); return success(res,t('FETCHED',req.lang),data); });
exports.dispatch = asyncHandler(async(req,res)=>{ const data=await Dispatch.aggregate([{ $match:base(req,'dispatchDate') },{ $group:{ _id:'$deliveryStatus',totalQuantity:{ $sum:'$totalQuantity' },totalAmount:{ $sum:'$totalAmount' },entries:{ $sum:1 } } }]); return success(res,t('FETCHED',req.lang),data); });
exports.expenses = asyncHandler(async(req,res)=>{ const data=await Expense.aggregate([{ $match:base(req) },{ $group:{ _id:'$categoryCode',amount:{ $sum:'$amount' },entries:{ $sum:1 } } }]); return success(res,t('FETCHED',req.lang),data); });
exports.profitLoss = asyncHandler(async(req,res)=>{ const [sales, payments, expenses, workerCredits, fuelCost, pendingDues]=await Promise.all([
  Dispatch.aggregate([{ $match:base(req,'dispatchDate') },{ $group:{ _id:null,amount:{ $sum:'$totalAmount' } } }]),
  Payment.aggregate([{ $match:base(req,'paymentDate') },{ $group:{ _id:null,amount:{ $sum:'$amount' } } }]),
  Expense.aggregate([{ $match:base(req) },{ $group:{ _id:null,amount:{ $sum:'$amount' } } }]),
  WorkerLedger.aggregate([{ $match:{...base(req),transactionType:{ $in:['PAYMENT','ADVANCE'] }} },{ $group:{ _id:null,amount:{ $sum:'$credit' } } }]),
  FuelConsumption.aggregate([{ $match:base(req) },{ $group:{ _id:null,amount:{ $sum:'$estimatedCost' } } }]),
  Udhari.aggregate([{ $match:{...base(req,'udhariDate'),pendingAmount:{ $gt:0 }} },{ $group:{ _id:null,amount:{ $sum:'$pendingAmount' } } }])
]); const income=sales[0]?.amount||0; const received=payments[0]?.amount||0; const totalExpenses=(expenses[0]?.amount||0)+(workerCredits[0]?.amount||0)+(fuelCost[0]?.amount||0); return success(res,t('FETCHED',req.lang),{sales:income,cashReceived:received,pendingDues:pendingDues[0]?.amount||0,expenses:totalExpenses,estimatedProfit:income-totalExpenses}); });
