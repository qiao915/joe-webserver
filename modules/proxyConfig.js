const path = require('path');

// 加载代理配置
function loadProxyConfig(options) {
  let proxyConfig = {};
  let proxyLog = options.proxyLog === 'true';

  // 1. 从配置文件加载代理配置
  if (options.config) {
    try {
      const configPath = path.resolve(options.config);
      proxyConfig = require(configPath);
      console.log(`\u001b[33mLoaded proxy config file / 已加载代理配置文件: ${configPath}\u001b[0m`);
    } catch (error) {
      console.error(`\u001b[31mFailed to load proxy config file / 加载代理配置文件失败: ${error.message}\u001b[0m`);
    }
  }

  // 2. 从命令行参数加载代理配置
  if (options.proxy) {
    // 处理命令行代理参数
    let rule = options.proxy;
    
    // 如果规则是数组格式（带方括号），则解析内部规则
    if (rule.startsWith('[') && rule.endsWith(']')) {
      rule = rule.substring(1, rule.length - 1);
    }
    
    // 处理单个代理规则
    if (rule.includes('=')) {
      const [proxyPath, target] = rule.split('=');
      if (proxyPath && target) {
        proxyConfig[proxyPath.trim()] = { target: target.trim() };
      }
    }
    // 处理多个代理规则（逗号分隔）
    else if (rule.includes(',')) {
      const rules = rule.split(',');
      rules.forEach(innerRule => {
        if (innerRule.includes('=')) {
          const [proxyPath, target] = innerRule.split('=');
          if (proxyPath && target) {
            proxyConfig[proxyPath.trim()] = { target: target.trim() };
          }
        }
      });
    }
  }

  return { proxyConfig, proxyLog };
}

// 应用代理中间件
function applyProxyMiddleware(app, proxyConfig, proxyLog, port, getIpAddress) {
  if (proxyConfig && Object.keys(proxyConfig).length > 0) {
    const hostname = getIpAddress();
    const addr = `http://${hostname}:${port}`;
    
    // 遍历代理配置，直接创建并应用代理中间件
    for (let path in proxyConfig) {
      // 确保配置是对象格式
      let config = proxyConfig[path];
      if (typeof config === 'string') {
        // 如果是字符串格式，直接作为target
        config = { target: config };
      }
      
      // 创建并应用代理中间件
      // 使用通配符确保所有以代理路径开头的请求都能被匹配
      const proxyPath = path.endsWith('/*') ? path : path.endsWith('/') ? path + '*' : path + '/*';
      
      // 使用http-proxy-middleware 3.0.5版本的正确API
      app.use(path, require('http-proxy-middleware').createProxyMiddleware({
        target: config.target,
        changeOrigin: config.changeOrigin !== false,
        // 重写路径，去掉代理前缀
        pathRewrite: config.pathRewrite || {
          [`^${path}`]: ''
        },
        logLevel: proxyLog ? 'debug' : 'silent',
        onProxyReq: (proxyReq, req, res) => {
          if (proxyLog) {
            console.log(`\u001b[34m代理请求: "${addr}${req.originalUrl}" -> "${config.target}${req.originalUrl.replace(new RegExp(`^${path}`), '')}"\u001b[0m`);
          }
        },
        onError: (err, req, res) => {
          if (proxyLog) {
            console.error(`\u001b[31mProxy error / 代理服务器错误: ${err.message}\u001b[0m`);
          }
          res.status(500).send('Proxy server error / 代理服务器错误');
        }
      }));
    }
  }
}

module.exports = {
  loadProxyConfig,
  applyProxyMiddleware
};