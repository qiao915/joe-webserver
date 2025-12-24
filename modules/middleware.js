// 日志中间件
function loggerMiddleware(req, res, next) {
  console.log(`\u001b[32m${new Date().toLocaleString()} - ${req.method} ${req.url}\u001b[0m`);
  next();
}

module.exports = {
  loggerMiddleware
};