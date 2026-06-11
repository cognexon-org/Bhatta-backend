const ExpenseCategory = require('./expenseCategory.model');
const factory = require('../../utils/crudFactory');
exports.list = factory.list(ExpenseCategory, ['code', 'isActive', 'requiresApproval'], { searchFields: ['code', 'name', 'nameHindi'] });
exports.get = factory.get(ExpenseCategory);
exports.create = factory.create(ExpenseCategory);
exports.update = factory.update(ExpenseCategory);
exports.deactivate = factory.deactivate(ExpenseCategory);
