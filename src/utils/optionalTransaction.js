const mongoose = require('mongoose');

function isTransactionUnsupported(error) {
  const msg = String(error && error.message ? error.message : error || '');
  return msg.includes('Transaction numbers are only allowed') || msg.includes('replica set member') || msg.includes('mongos') || msg.includes('Transaction API error');
}

async function runWithOptionalTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (isTransactionUnsupported(error)) return work(null);
    throw error;
  } finally {
    session.endSession();
  }
}

module.exports = { runWithOptionalTransaction, isTransactionUnsupported };
