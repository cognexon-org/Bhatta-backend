const BrickCategory = require('../stock/stockCategory.model');
const factory = require('../../utils/crudFactory');
exports.list = factory.list(BrickCategory, ['code','categoryGroup','saleable','isActive'], { searchFields: ['code','name','nameHindi'] });
exports.get = factory.get(BrickCategory);
exports.create = factory.create(BrickCategory);
exports.update = factory.update(BrickCategory);
exports.deactivate = factory.deactivate(BrickCategory);
