const defaultWorkerCategories = require('../../constants/workerCategories');
const enums = require('../../constants/enums');
const { messages } = require('../../constants/messages');
const { success } = require('../../utils/apiResponse');

const StockCategory = require('../stock/stockCategory.model');
const WorkerCategory = require('../workerCategories/workerCategory.model');
const Process = require('../processes/process.model');
const FuelType = require('../fuel/fuelType.model');
const ExpenseCategory = require('../expenseCategories/expenseCategory.model');

const brickCategories = [
  { code: 'KACCHA_EENT', name: 'Kaccha Eent', nameHindi: 'कच्ची ईंट', categoryGroup: 'RAW', saleable: false, allowDispatch: false },
  { code: 'SUKHI_EENT', name: 'Sukhi Eent', nameHindi: 'सूखी ईंट', categoryGroup: 'RAW', saleable: false, allowDispatch: false },
  { code: 'SEEDHA_MANJAL', name: 'Seedha Manjal', nameHindi: 'सीधा मंजल', categoryGroup: 'SEMI_PROCESSED', saleable: false, allowDispatch: false },
  { code: 'TEDHA_MANJAL', name: 'Tedha Manjal', nameHindi: 'टेढ़ा मंजल', categoryGroup: 'SEMI_PROCESSED', saleable: false, allowDispatch: false },
  { code: 'PAKKA_EENT', name: 'Pakka Eent', nameHindi: 'पक्की ईंट', categoryGroup: 'FINISHED', saleable: true, allowDispatch: true },
  { code: 'NO_1', name: 'No. 1 Brick', nameHindi: 'नंबर 1 ईंट', categoryGroup: 'FINISHED', saleable: true, allowDispatch: true },
  { code: 'NO_2', name: 'No. 2 Brick', nameHindi: 'नंबर 2 ईंट', categoryGroup: 'FINISHED', saleable: true, allowDispatch: true },
  { code: 'NO_3', name: 'No. 3 Brick', nameHindi: 'नंबर 3 ईंट', categoryGroup: 'FINISHED', saleable: true, allowDispatch: true },
  { code: 'JHAMA', name: 'Jhama / Overburnt', nameHindi: 'झामा', categoryGroup: 'WASTE', saleable: true, allowDispatch: true },
  { code: 'BROKEN', name: 'Broken Brick', nameHindi: 'टूटी ईंट', categoryGroup: 'WASTE', saleable: true, allowDispatch: true },
  { code: 'CHHATTA', name: 'Chhatta Brick', nameHindi: 'छत्ता ईंट', categoryGroup: 'WASTE', saleable: true, allowDispatch: true },
  { code: 'OTHER', name: 'Other Brick', nameHindi: 'अन्य ईंट', categoryGroup: 'FINISHED', saleable: true, allowDispatch: true }
];
const processes = [
  { code: 'MITTI_KHUDAI', name: 'Mitti Khudai', nameHindi: 'मिट्टी खुदाई', sequenceNo: 1 },
  { code: 'RAABIS', name: 'Raabis Preparation', nameHindi: 'राबिस तैयारी', sequenceNo: 2 },
  { code: 'PATHAI', name: 'Pathai / Brick Molding', nameHindi: 'ईंट पथाई', sequenceNo: 3, outputCategoryCodes: ['KACCHA_EENT'], requiresWorkers: true, affectsStock: true },
  { code: 'KACCHA_NIKASI', name: 'Kaccha Nikasi', nameHindi: 'कच्चा निकासी', sequenceNo: 4, requiresWorkers: true },
  { code: 'SUKHAI', name: 'Sukhai / Drying', nameHindi: 'सुखाई', sequenceNo: 5, inputCategoryCodes: ['KACCHA_EENT'], outputCategoryCodes: ['SUKHI_EENT'], affectsStock: true },
  { code: 'BHARAI', name: 'Bharai / Kiln Loading', nameHindi: 'भराई', sequenceNo: 6, inputCategoryCodes: ['SUKHI_EENT'], requiresChamber: true, requiresWorkers: true, affectsStock: true },
  { code: 'PHUKAI', name: 'Phukai / Firing', nameHindi: 'फुकाई', sequenceNo: 7, requiresChamber: true, requiresWorkers: true, requiresFuel: true },
  { code: 'PAKAI', name: 'Pakai / Baking', nameHindi: 'पकाई', sequenceNo: 8, requiresChamber: true },
  { code: 'NIKASI', name: 'Nikasi / Unloading', nameHindi: 'निकासी', sequenceNo: 9, requiresChamber: true, requiresWorkers: true },
  { code: 'CHHANTAI', name: 'Chhantai / Sorting', nameHindi: 'छंटाई', sequenceNo: 10, requiresChamber: true, requiresWorkers: true, outputCategoryCodes: ['NO_1', 'NO_2', 'NO_3', 'JHAMA', 'BROKEN'], affectsStock: true },
  { code: 'STOCK_TRANSFER', name: 'Stock Transfer', nameHindi: 'स्टॉक ट्रांसफर', sequenceNo: 11, affectsStock: true },
  { code: 'DISPATCH', name: 'Dispatch / Sale', nameHindi: 'डिस्पैच / बिक्री', sequenceNo: 12, affectsStock: true }
];
const fuelTypes = [
  { code: 'COAL', name: 'Coal', nameHindi: 'कोयला', unit: 'KG' },
  { code: 'BIOMASS', name: 'Biomass', nameHindi: 'बायोमास', unit: 'KG' },
  { code: 'PET_COKE', name: 'Pet Coke', nameHindi: 'पेट कोक', unit: 'KG' },
  { code: 'WOOD', name: 'Wood', nameHindi: 'लकड़ी', unit: 'KG' },
  { code: 'DIESEL', name: 'Diesel', nameHindi: 'डीजल', unit: 'LITER' }
];
const expenseCategories = [
  { code: 'LABOR', name: 'Labor', nameHindi: 'मजदूरी' },
  { code: 'PATHAI', name: 'Pathai', nameHindi: 'पथाई' },
  { code: 'BHARAI', name: 'Bharai', nameHindi: 'भराई' },
  { code: 'NIKASI', name: 'Nikasi', nameHindi: 'निकासी' },
  { code: 'FUEL', name: 'Fuel', nameHindi: 'ईंधन' },
  { code: 'COAL', name: 'Coal', nameHindi: 'कोयला' },
  { code: 'DIESEL', name: 'Diesel', nameHindi: 'डीजल' },
  { code: 'VEHICLE', name: 'Vehicle', nameHindi: 'वाहन' },
  { code: 'REPAIR', name: 'Repair', nameHindi: 'मरम्मत' },
  { code: 'OFFICE', name: 'Office', nameHindi: 'ऑफिस' },
  { code: 'ELECTRICITY', name: 'Electricity', nameHindi: 'बिजली' },
  { code: 'INTERNET', name: 'Internet', nameHindi: 'इंटरनेट' },
  { code: 'FOOD', name: 'Food', nameHindi: 'भोजन' },
  { code: 'SECURITY', name: 'Security', nameHindi: 'सुरक्षा' },
  { code: 'MISCELLANEOUS', name: 'Miscellaneous', nameHindi: 'विविध' }
];

async function dbOrFallback(Model, fallback, query = {}) {
  try {
    const rows = await Model.find({ isActive: true, ...query }).sort({ sortOrder: 1, sequenceNo: 1, name: 1 }).lean();
    return rows.length ? rows : fallback;
  } catch (e) {
    return fallback;
  }
}

exports.getConstants = async (req, res) => success(res, 'Constants fetched', {
  workerCategories: await dbOrFallback(WorkerCategory, defaultWorkerCategories.map((x) => ({ code: x.code, name: x.en, nameHindi: x.hi }))),
  brickCategories: await dbOrFallback(StockCategory, brickCategories),
  processes: await dbOrFallback(Process, processes),
  fuelTypes: await dbOrFallback(FuelType, fuelTypes),
  expenseCategories: await dbOrFallback(ExpenseCategory, expenseCategories),
  enums,
  messages: messages[req.lang]
});
exports.workerCategories = async (req, res) => success(res, 'Fetched', await dbOrFallback(WorkerCategory, defaultWorkerCategories.map((x) => ({ code: x.code, name: x.en, nameHindi: x.hi }))));
exports.brickCategories = async (req, res) => success(res, 'Fetched', await dbOrFallback(StockCategory, brickCategories));
exports.processes = async (req, res) => success(res, 'Fetched', await dbOrFallback(Process, processes));
exports.fuelTypes = async (req, res) => success(res, 'Fetched', await dbOrFallback(FuelType, fuelTypes));
exports.expenseCategories = async (req, res) => success(res, 'Fetched', await dbOrFallback(ExpenseCategory, expenseCategories));
exports.paymentModes = (req, res) => success(res, 'Fetched', enums.PAYMENT_MODE);
exports.languages = (req, res) => success(res, 'Fetched', ['en', 'hi']);

exports.seedDefaults = { brickCategories, processes, fuelTypes, expenseCategories, workerCategories: defaultWorkerCategories };
