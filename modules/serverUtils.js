const http = require('http');
const https = require('https');
const open = require('open');

// 尝试监听指定端口的函数
function tryListen(app, portToTry) {
  return new Promise((resolve, reject) => {
    const server = app.listen(portToTry, () => {
      resolve({ server, port: portToTry });
    });
    
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        // 端口被占用，尝试下一个端口
        reject({ port: portToTry, error });
      } else {
        // 其他错误，直接拒绝
        reject({ error });
      }
    });
  });
}

// 启动HTTP服务器（自动尝试可用端口）
async function startHttpServer(app, startingPort) {
  let currentPort = startingPort;
  let maxRetries = 100; // 最多尝试100个端口
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await tryListen(app, currentPort);
      return result;
    } catch (error) {
      if (error.port) {
        // 端口被占用，尝试下一个端口
        console.log(`\u001b[33mPort ${currentPort} is already in use, trying ${currentPort + 1} / 端口 ${currentPort} 已被占用，尝试端口 ${currentPort + 1}\u001b[0m`);
        currentPort++;
      } else {
        // 其他错误，直接抛出
        throw error.error;
      }
    }
  }
  
  throw new Error(`No available ports found after ${maxRetries} attempts / 尝试${maxRetries}次后仍未找到可用端口`);
}

// 启动HTTPS服务器（自动尝试可用端口）
async function startHttpsServer(app, startingPort, certOptions) {
  return new Promise((resolve, reject) => {
    let currentHttpsPort = parseInt(startingPort) + 1;
    const maxHttpsRetries = 10;
    let attemptCount = 0;
    
    function tryHttpsPort(tryPort) {
      attemptCount++;
      
      // 创建新的HTTPS服务器实例
      const httpsServer = https.createServer(certOptions, app);
      
      httpsServer.listen(tryPort, () => {
        resolve(tryPort);
      });
      
      httpsServer.on('error', (error) => {
        httpsServer.close(); // 关闭失败的服务器实例
        
        if (error.code === 'EADDRINUSE' && attemptCount < maxHttpsRetries) {
          console.log(`\u001b[33mHTTPS port ${tryPort} is already in use, trying ${tryPort + 1} / HTTPS端口 ${tryPort} 已被占用，尝试端口 ${tryPort + 1}\u001b[0m`);
          tryHttpsPort(tryPort + 1);
        } else {
          reject(error);
        }
      });
    }
    
    tryHttpsPort(currentHttpsPort);
  });
}

// 显示服务器启动信息
function showServerInfo(staticDir, httpServerUrl, httpsServerUrl, proxyConfig, enableLogApi) {
  console.log('\u001b[36m------------------------------------------------------\u001b[0m');
  console.log('\u001b[36m                   Joe Web Server\u001b[0m');
  console.log('\u001b[36m======================================================\u001b[0m');
  console.log(`\u001b[32m  Start Directory / 启动目录: ${staticDir}\u001b[0m`);
  console.log(`\u001b[33m  Access Address / 访问地址: ${httpServerUrl}\u001b[0m`);
  
  // 打印HTTPS地址
  if (httpsServerUrl) {
    console.log(`\u001b[33m  HTTPS Address / HTTPS地址: ${httpsServerUrl}\u001b[0m`);
    
    // 打印日志接口地址（如果启用）
    if (enableLogApi) {
      const logApiUrl = httpsServerUrl.replace(/:\d+$/, `:${parseInt(httpsServerUrl.match(/:(\d+)/)[1])}/jws/logs`);
      console.log(`\u001b[35m  Log API / 日志接口: ${logApiUrl}\u001b[0m`);
    }
  }
  
  // 打印代理配置（如果有）
  if (proxyConfig && Object.keys(proxyConfig).length > 0) {
    let arr = Object.keys(proxyConfig);
    for (const path in proxyConfig) {
      let index = arr.findIndex(item => item === path);
      const target = proxyConfig[path].target || proxyConfig[path];
      index == 0 
      ? console.log(`\u001b[33m  Proxy Config / 代理配置: ${path}  >>>  ${target}\u001b[0m`)
      : console.log(`\u001b[33m            ${path}  >>>  ${target}\u001b[0m`);
    }
  }
  
  console.log('\u001b[36m======================================================\u001b[0m');
  console.log(`\u001b[35m                   qiao_915@yeah.net\u001b[0m`);
  console.log('\u001b[36m------------------------------------------------------\u001b[0m');
}

// 自动打开浏览器
function autoOpenBrowser(url) {
  open(url).catch(err => {
    console.warn(`\u001b[33mFailed to open browser automatically / 无法自动打开浏览器: ${err.message}\u001b[0m`);
  });
}

module.exports = {
  startHttpServer,
  startHttpsServer,
  showServerInfo,
  autoOpenBrowser
};