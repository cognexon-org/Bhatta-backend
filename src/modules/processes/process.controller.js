const Process = require('./process.model');
const factory = require('../../utils/crudFactory');
exports.list = factory.list(Process, ['code','isActive'], { searchFields: ['code','name','nameHindi'] });
exports.get = factory.get(Process);
exports.create = factory.create(Process);
exports.update = factory.update(Process);
exports.deactivate = factory.deactivate(Process);
