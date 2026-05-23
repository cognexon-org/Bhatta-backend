module.exports = function languageMiddleware(req, res, next) {
  const lang = req.headers['accept-language']?.split(',')?.[0]?.slice(0, 2);
  req.lang = ['hi', 'en'].includes(lang) ? lang : 'en';
  next();
};
