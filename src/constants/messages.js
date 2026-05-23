const messages = {
  en: {
    LOGIN_SUCCESS: 'Login successful',
    INVALID_CREDENTIALS: 'Invalid mobile/email or password',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'You do not have permission to perform this action',
    NOT_FOUND: 'Resource not found',
    CREATED: 'Created successfully',
    UPDATED: 'Updated successfully',
    DELETED: 'Deleted successfully',
    FETCHED: 'Fetched successfully',
    STOCK_APPROVED: 'Stock request approved',
    STOCK_REJECTED: 'Stock request rejected',
    PAYMENT_RECORDED: 'Payment recorded successfully'
  },
  hi: {
    LOGIN_SUCCESS: 'लॉगिन सफल रहा',
    INVALID_CREDENTIALS: 'मोबाइल/ईमेल या पासवर्ड गलत है',
    UNAUTHORIZED: 'अनधिकृत प्रवेश',
    FORBIDDEN: 'आपको यह कार्य करने की अनुमति नहीं है',
    NOT_FOUND: 'रिकॉर्ड नहीं मिला',
    CREATED: 'सफलतापूर्वक बनाया गया',
    UPDATED: 'सफलतापूर्वक अपडेट किया गया',
    DELETED: 'सफलतापूर्वक हटाया गया',
    FETCHED: 'सफलतापूर्वक प्राप्त किया गया',
    STOCK_APPROVED: 'स्टॉक अनुरोध स्वीकृत किया गया',
    STOCK_REJECTED: 'स्टॉक अनुरोध अस्वीकृत किया गया',
    PAYMENT_RECORDED: 'भुगतान सफलतापूर्वक दर्ज किया गया'
  }
};
function t(key, lang = 'en') { return messages[lang]?.[key] || messages.en[key] || key; }
module.exports = { messages, t };
