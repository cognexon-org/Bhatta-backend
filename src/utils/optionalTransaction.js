const { getTenantConnection } = require('../platform/tenantContext');

function isTransactionUnsupported(error) {
  const msg = String(error && error.message ? error.message : error || '');
  return msg.includes('Transaction numbers are only allowed') || msg.includes('replica set member') || msg.includes('mongos') || msg.includes('Transaction API error');
}

async function runWithOptionalTransaction(work) {
  const connection = getTenantConnection();
  const session = await connection.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    const allowFallback = String(process.env.ALLOW_NON_TRANSACTIONAL_FALLBACK || 'false').toLowerCase() === 'true';
    if (isTransactionUnsupported(error) && allowFallback) return work(null);
    throw error;
  } finally {
    await session.endSession();
  }
}

module.exports = { runWithOptionalTransaction, isTransactionUnsupported };
