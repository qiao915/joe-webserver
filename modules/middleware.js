// 清理IP地址，去掉IPv6映射前缀
function cleanIpAddress(ip) {
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}

// 日志中间件
function loggerMiddleware(req, res, next) {
  // 跳过日志收集接口的访问日志
  if (req.path === '/jws/logs') {
    return next();
  }
  
  const cleanIp = cleanIpAddress(req.ip);
  console.log(`\u001b[32m${new Date().toLocaleString()} - ${cleanIp} - ${req.method} ${req.url}\u001b[0m`);
  next();
}

// 日志收集接口中间件
function logCollectionMiddleware(app, enabled) {
  if (!enabled) {
    return;
  }

  // 性能优化：使用异步处理和批量处理
  let logBuffer = [];
  let isProcessing = false;
  const BUFFER_SIZE = 100;
  const FLUSH_INTERVAL = 100;

  // 异步批量处理日志
  async function processLogBuffer() {
    if (isProcessing || logBuffer.length === 0) {
      return;
    }

    isProcessing = true;
    const logsToProcess = logBuffer.splice(0, BUFFER_SIZE);

    // 使用 setImmediate 避免阻塞事件循环
    setImmediate(() => {
      logsToProcess.forEach(log => {
        console.log(`\u001b[35m[JWS Log] ${log.timestamp} - ${log.ip} - ${log.method} ${log.path}\u001b[0m`);
        if (log.data) {
          console.log(`\u001b[35m  Data: ${log.data}\u001b[0m`);
        }
      });
      isProcessing = false;
      
      // 如果还有日志，继续处理
      if (logBuffer.length > 0) {
        processLogBuffer();
      }
    });
  }

  // 定期刷新缓冲区
  setInterval(() => {
    if (logBuffer.length > 0) {
      processLogBuffer();
    }
  }, FLUSH_INTERVAL);

  // 日志收集接口
  app.all('/jws/logs', (req, res) => {
    // 设置CORS头，允许跨域
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }

    // 获取日志数据
    let logData = '';
    
    if (req.method === 'GET') {
      // 从查询参数获取数据
      logData = req.query.data || req.query.log || req.query.msg || JSON.stringify(req.query);
    } else if (req.method === 'POST') {
      // 从请求体获取数据
      if (req.body) {
        logData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      } else {
        logData = '';
      }
    }

    // 获取客户端IP
    const cleanIp = cleanIpAddress(req.ip);

    // 将日志添加到缓冲区
    const logEntry = {
      timestamp: new Date().toLocaleString(),
      ip: cleanIp,
      method: req.method,
      path: req.url,
      data: logData
    };

    logBuffer.push(logEntry);

    // 如果缓冲区达到阈值，立即处理
    if (logBuffer.length >= BUFFER_SIZE) {
      processLogBuffer();
    }

    // 返回成功响应
    res.json({
      success: true,
      message: 'Log received',
      timestamp: new Date().toISOString()
    });
  });
}

module.exports = {
  loggerMiddleware,
  logCollectionMiddleware
};