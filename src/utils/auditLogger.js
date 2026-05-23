const ActivityLog = require('../modules/logs/activityLog.model');
async function writeActivityLog({ req, action, module, moduleId, description, oldData, newData }) {
  try { await ActivityLog.create({ userId: req.user?._id, role: req.user?.role, action, module, moduleId, description, oldData, newData, ipAddress: req.ip, userAgent: req.get('user-agent') }); }
  catch (error) { console.warn('Activity log failed:', error.message); }
}
module.exports = { writeActivityLog };
