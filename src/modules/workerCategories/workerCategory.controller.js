const WorkerCategory = require('./workerCategory.model');
const factory = require('../../utils/crudFactory');
exports.list = factory.list(WorkerCategory, ['code','isActive'], { searchFields: ['code','name','nameHindi'] });
exports.get = factory.get(WorkerCategory);
exports.create = factory.create(WorkerCategory);
exports.update = factory.update(WorkerCategory);
exports.deactivate = factory.deactivate(WorkerCategory);
