const SupplierLedger = require('./supplierLedger.model');
const { createSupplierLedgerEntry } = require('./supplierLedger.service');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { t } = require('../../constants/messages');
exports.list = asyncHandler(async(req,res)=>{ const f={}; ['supplierId','kilnId','seasonId','transactionType'].forEach(k=>{ if(req.query[k]) f[k]=req.query[k]; }); const result=await paginate(SupplierLedger,f,req.query,{populate:[{path:'supplierId'}]}); return success(res,t('FETCHED',req.lang),result.items,200,result.meta); });
exports.bySupplier = asyncHandler(async(req,res)=>{ req.query.supplierId=req.params.supplierId; return exports.list(req,res); });
exports.adjustment = asyncHandler(async(req,res)=>{ const item=await createSupplierLedgerEntry({ ...req.body, transactionType:'ADJUSTMENT', sourceModule:'SUPPLIER_ADJUSTMENT', createdBy:req.user._id }); return created(res,t('CREATED',req.lang),item); });
