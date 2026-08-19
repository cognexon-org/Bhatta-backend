const registry = new Map();
const { getTenantConnection } = require('./tenantContext');

function registerSchema(name, schema, collection) {
  registry.set(name, { schema, collection });
}

function ensureRegistered(connection) {
  for (const [name, definition] of registry.entries()) {
    if (!connection.models[name]) {
      connection.model(name, definition.schema, definition.collection);
    }
  }
}

function getModel(name) {
  const connection = getTenantConnection();
  ensureRegistered(connection);
  return connection.model(name);
}

/**
 * Export a Mongoose-model-compatible proxy that resolves the real model from
 * the AsyncLocalStorage tenant context at request/job execution time.
 * Existing controllers can keep calling Model.find(), Model.create(), new Model(), etc.
 */
function tenantModel(name, schema, collection) {
  registerSchema(name, schema, collection);

  const callable = function TenantScopedModel(...args) {
    const Model = getModel(name);
    return Reflect.construct(Model, args);
  };

  return new Proxy(callable, {
    get(_target, prop) {
      if (prop === '__tenantModelName') return name;
      if (prop === 'schema') return schema;
      if (prop === 'modelName') return name;
      if (prop === Symbol.toStringTag) return 'TenantScopedModel';
      const Model = getModel(name);
      const value = Reflect.get(Model, prop, Model);
      return typeof value === 'function' ? value.bind(Model) : value;
    },
    set(_target, prop, value) {
      const Model = getModel(name);
      Reflect.set(Model, prop, value, Model);
      return true;
    },
    construct(_target, args) {
      const Model = getModel(name);
      return Reflect.construct(Model, args);
    },
    apply(_target, _thisArg, args) {
      const Model = getModel(name);
      return Reflect.apply(Model, Model, args);
    }
  });
}

module.exports = { tenantModel, ensureRegistered, getModel };
