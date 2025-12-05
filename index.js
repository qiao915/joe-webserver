#!/usr/bin/env node
const express = require('express');
const path = require('path');
const fs = require('fs');
const { program } = require('commander');
const open = require('open');
const os = require('os');
const readline = require('readline');
const crypto = require('crypto');

// 解析命令行参数
program
  .version('1.0.0')
  .option('-p, --port <port>', '设置服务器端口', '7426')
  .option('-d, --dir <dir>', '设置静态文件目录')
  .option('-o, --open', '自动打开浏览器', false)
  .option('-c, --config <config>', '代理配置文件路径，\n格式: {"/api":{ target:"http://192.168.1.34:3030"}} JSON字')
  .option('--proxy <proxy>', '代理规则，\n格式: "[path1=target1,/*...*/,pathn=targetn]"，\n如"[/api=http://localhost:3000,/api2=http://localhost:3001]"', (value, previous) => previous.concat(value), "[]")
  .option('--proxy-log <boolean>', '是否显示代理日志', 'true')
  .arguments('[directory]')
  .description('静态文件目录路径（可选，默认为当前目录）', {
    directory: '要服务的目录路径'
  })
  .parse(process.argv);

// 生成自签名证书函数
function generateSelfSignedCertificate() {
  try {
    // 使用crypto生成真正的自签名证书
    const forge = require('node-forge');
    
    // 创建RSA密钥对
    const keys = forge.pki.rsa.generateKeyPair(2048);
    
    // 创建证书
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    
    // 设置证书属性
    const attrs = [
      { name: 'commonName', value: 'localhost' },
      { name: 'countryName', value: 'CN' },
      { shortName: 'ST', value: 'Beijing' },
      { name: 'localityName', value: 'Beijing' },
      { name: 'organizationName', value: 'Joe Web Server' },
      { shortName: 'OU', value: 'Development' }
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs); // 自签名证书
    
    // 添加扩展
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: true
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true
      },
      {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: true
      },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: '0.0.0.0' }
        ]
      }
    ]);
    
    // 自签名证书
    cert.sign(keys.privateKey);
    
    // 转换为PEM格式
    const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
    const publicKeyPem = forge.pki.certificateToPem(cert);
    
    return { 
      key: privateKeyPem, 
      cert: publicKeyPem 
    };
  } catch (err) {
    console.error(`\u001b[31m证书生成错误: ${err.message}\u001b[0m`);
    // 尝试使用简化的证书生成方法
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      
      // 使用node-forge简化版生成证书
      const forge = require('node-forge');
      const cert = forge.pki.createCertificate();
      cert.publicKey = forge.pki.publicKeyFromPem(publicKey);
      cert.serialNumber = '01';
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
      
      const attrs = [
        { name: 'commonName', value: 'localhost' }
      ];
      cert.setSubject(attrs);
      cert.setIssuer(attrs);
      cert.sign(forge.pki.privateKeyFromPem(privateKey));
      
      return { 
        key: privateKey, 
        cert: forge.pki.certificateToPem(cert) 
      };
    } catch (fallbackErr) {
      console.error(`\u001b[31m备用证书生成也失败: ${fallbackErr.message}\u001b[0m`);
      return null;
    }
  }
}

const options = program.opts();
const app = express();
const port = options.port;
const httpsPort = parseInt(port) + 1;

// 加载代理配置
let proxyConfig = {};
let proxyLog = options.proxyLog === 'true';

// 1. 从配置文件加载代理配置
if (options.config) {
  try {
    const configPath = path.resolve(options.config);
    proxyConfig = require(configPath);
    console.log(`\u001b[33m已加载代理配置文件: ${configPath}\u001b[0m`);
  } catch (error) {
    console.error(`\u001b[31m加载代理配置文件失败: ${error.message}\u001b[0m`);
  }
}

// 2. 从命令行参数加载代理配置
if (options.proxy) {
  // 处理多个--proxy参数的情况（会是数组）
  const proxyRules = Array.isArray(options.proxy) ? options.proxy : [options.proxy];
  
  proxyRules.forEach(rule => {
    try {
      // 处理数组格式的代理规则，如: [/api=http://localhost:3000,/api2=http://localhost:3001]
      if (rule.startsWith('[') && rule.endsWith(']')) {
        // 移除方括号并分割多个规则
        const innerRules = rule.substring(1, rule.length - 1).split(',');
        innerRules.forEach(innerRule => {
          const [path, target] = innerRule.split('=');
          if (path && target) {
            proxyConfig[path.trim()] = { target: target.trim() };
          }
        });
      } else {
        // 处理单个规则格式，如: /api=http://localhost:3000
        const [path, target] = rule.split('=');
        if (path && target) {
          proxyConfig[path.trim()] = { target: target.trim() };
        }
      }
    } catch (error) {
      console.error(`\u001b[31m解析代理规则失败: ${error.message}\u001b[0m`);
    }
  });
}



// 立即初始化静态目录，避免中间件配置错误
// 只有通过 -d, --dir 参数明确指定的才作为目录，避免将额外参数误判为目录
let staticDir = options.dir || '.';

// 获取本地IP地址
function getIpAddress() {
  const ifaces = os.networkInterfaces();
  for (const dev in ifaces) {
    const iface = ifaces[dev];
    for (let i = 0; i < iface.length; i++) {
      const { family, address, internal } = iface[i];
      if (family === 'IPv4' && address !== '127.0.0.1' && !internal) {
        return address;
      }
    }
  }
  return '127.0.0.1';
}

// 中间件：日志功能
app.use((req, res, next) => {
  console.log(`\u001b[32m${new Date().toLocaleString()} - ${req.method} ${req.url}\u001b[0m`);
  next();
});

// 应用代理中间件
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
    app.use(path + (path.endsWith('/') ? '*' : '/*'), require('http-proxy-middleware').createProxyMiddleware({
      target: config.target,
      changeOrigin: config.changeOrigin !== false,
      // 重写路径，保留完整的原始路径
      pathRewrite: config.pathRewrite || function(pathStr, req) {
        // 对于 /api/users，将 /api/* 重写为 /api/users
        return req.originalUrl;
      },
      logLevel: proxyLog ? 'info' : 'silent',
      onProxyReq: (proxyReq, req, res) => {
        if (proxyLog) {
          console.log(`\u001b[34m代理请求: "${addr}${req.originalUrl}" -> "${config.target}${req.originalUrl}"\u001b[0m`);
        }
      },
      onError: (err, req, res) => {
        if (proxyLog) {
          console.error(`\u001b[31m代理错误: ${err.message}\u001b[0m`);
        }
        res.status(500).send('代理服务器错误');
      }
    }));
  }
}

// 配置静态文件服务
app.use(express.static(staticDir, {
  index: 'index.html',
  extensions: ['html', 'htm'],
  setHeaders: (res, path) => {
    // 设置一些常用的响应头
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// 实现目录列表功能
app.use(async (req, res, next) => {
  try {
    const requestedPath = path.join(staticDir, req.path);
    const fs = require('fs').promises;
    const stats = await fs.stat(requestedPath);
    
    if (stats.isDirectory()) {
      // 检查是否有index.html文件
      try {
        await fs.access(path.join(requestedPath, 'index.html'));
        // 如果有index.html，让static中间件处理
        next();
        return;
      } catch (e) {
        // 没有index.html，显示目录列表
        const files = await fs.readdir(requestedPath);
        const filteredFiles = files.filter(file => 
          file !== '.DS_Store' && 
          file !== '.git' && 
          file !== '.gitignore' && 
          file !== '.idea' && 
          file !== 'node_modules' &&
          file !== 'package-lock.json'
        );
        
        // 生成目录列表HTML
        res.status(200).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>目录列表 - ${req.path}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
              }
              h1 {
                color: #333;
                border-bottom: 1px solid #ddd;
                padding-bottom: 10px;
              }
              .dir-list {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                padding: 0;
                margin-top: 20px;
              }
              .dir-item {
                padding: 12px 20px;
                border-bottom: 1px solid #eee;
                display: flex;
                align-items: center;
              }
              .dir-item:last-child {
                border-bottom: none;
              }
              .dir-item a {
                text-decoration: none;
                color: #0366d6;
                font-size: 16px;
              }
              .dir-item a:hover {
                text-decoration: underline;
              }
              .icon {
                margin-right: 10px;
                width: 20px;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <h1>目录列表 - ${req.path}</h1>
            <div class="dir-list">
              ${req.path !== '/' ? `<div class="dir-item"><span class="icon">📁</span><a href="${path.dirname(req.path) || '/'}">..</a></div>` : ''}
              ${filteredFiles.map(file => {
                const filePath = path.join(req.path, file);
                return `<div class="dir-item"><span class="icon">📄</span><a href="${filePath}">${file}</a></div>`;
              }).join('')}
            </div>
          </body>
          </html>
        `);
      }
    } else {
      next();
    }
  } catch (e) {
    next();
  }
});

// 404处理
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>404 Not Found</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background-color: #f5f5f5;
        }
        .error-container {
          text-align: center;
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
          font-size: 4rem;
          color: #e74c3c;
          margin: 0;
        }
        p {
          font-size: 1.2rem;
          color: #555;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>404</h1>
        <p>页面未找到</p>
      </div>
    </body>
    </html>
  `);
});

// 主函数，支持异步询问
async function startServer() {
  // 如果是默认目录，可以在交互式环境中询问用户是否要更改
  if (staticDir === '.') {
    try {
      // 检查是否为交互式终端，同时允许通过环境变量强制非交互模式（用于测试）
        if (process.stdin.isTTY && !process.env.FORCE_NON_INTERACTIVE) {
        // 在交互式环境中，询问用户是否要更改默认目录
        const useDefault = await new Promise((resolve) => {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });

          rl.question('是否使用默认目录(当前目录)？[Y/n]: ', (input) => {
            rl.close();
            const response = input.trim().toLowerCase();
            resolve(response === '' || response === 'y' || response === 'yes');
          });
        });

        // 如果用户不想使用默认目录，再询问具体目录
        if (!useDefault) {
          const newDir = await new Promise((resolve) => {
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });

            const askDirectory = () => {
              rl.question('请输入要服务的目录路径: ', (input) => {
                const dir = path.resolve(input.trim());
                if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                  rl.close();
                  resolve(dir);
                } else {
                  console.log('\u001b[31m错误: 请输入有效的目录路径\u001b[0m');
                  askDirectory();
                }
              });
            };

            askDirectory();
          });

          staticDir = newDir;
        }
      } else {
        // 在非交互式环境中，明确使用默认目录
        // console.log('\u001b[33m使用默认目录: 当前目录\u001b[0m');
      }
    } catch (error) {
      // 发生任何错误时，使用默认目录但显示警告
      console.log(`\u001b[33m目录选择出错: ${error.message}，使用默认目录\u001b[0m`);
    }
  }

  // 确保路径解析正确
  staticDir = path.resolve(staticDir);
  const ipAddress = getIpAddress();
  const httpServerUrl = `http://${ipAddress}:${port}`;

  // 启动HTTP服务器
  const server = app.listen(port, () => {
    console.log('\u001b[36m----------------------------------------\u001b[0m');
    console.log('\u001b[36m            Joe Web Server\u001b[0m');
    console.log('\u001b[36m========================================\u001b[0m');
    console.log(`\u001b[32m  启动目录: ${staticDir}\u001b[0m`);
    console.log(`\u001b[33m  访问地址: ${httpServerUrl}\u001b[0m`);
    
    // 打印代理配置（如果有）
    if (proxyConfig && Object.keys(proxyConfig).length > 0) {
      let arr = Object.keys(proxyConfig);
      for (const path in proxyConfig) {
        let index = arr.findIndex(item => item === path);
        const target = proxyConfig[path].target || proxyConfig[path];
        index == 0 
        ? console.log(`\u001b[33m  代理配置: ${path}  >>>  ${target}\u001b[0m`)
        : console.log(`\u001b[33m            ${path}  >>>  ${target}\u001b[0m`);
      }
    }
    
    console.log('\u001b[36m========================================\u001b[0m');
    console.log(`\u001b[35m           qiao_915@yeah.net\u001b[0m`);
    console.log('\u001b[36m----------------------------------------\u001b[0m');
    
    // 自动打开浏览器（使用HTTP）
    if (options.open) {
      open(httpServerUrl).catch(err => {
        console.warn(`\u001b[33m无法自动打开浏览器: ${err.message}\u001b[0m`);
      });
    }
  });

  // 处理HTTP服务器错误
  server.on('error', (error) => {
    console.error(`\u001b[31mHTTP服务器启动错误: ${error.message}\u001b[0m`);
    // 如果是端口被占用错误，可以提示用户尝试其他端口
    if (error.code === 'EADDRINUSE') {
      console.error(`\u001b[31m端口 ${port} 已被占用，请尝试其他端口\u001b[0m`);
    }
  });

  // 启动HTTPS服务器
  try {
    // 生成自签名证书
    const certOptions = generateSelfSignedCertificate();
    if (certOptions) {
      const https = require('https');
      
      const httpsServer = https.createServer(certOptions, app);
      
      httpsServer.listen(httpsPort, () => {
        // HTTPS服务器启动成功
      });
      
      httpsServer.on('error', (error) => {
        console.error(`\u001b[31mHTTPS服务器启动错误: ${error.message}\u001b[0m`);
        if (error.code === 'EADDRINUSE') {
          console.error(`\u001b[31m端口 ${httpsPort} 已被占用，请尝试其他端口\u001b[0m`);
        }
      });
    } else {
      console.error(`\u001b[31mHTTPS服务器启动失败：无法生成自签名证书\u001b[0m`);
      console.log(`\u001b[33mHTTP服务仍可正常使用\u001b[0m`);
    }
  } catch (err) {
    console.error(`\u001b[31mHTTPS服务器启动失败: ${err.message}\u001b[0m`);
    console.log(`\u001b[33mHTTP服务仍可正常使用\u001b[0m`);
  }
}

// 调用startServer函数启动服务器
startServer().catch(error => {
  console.error('\u001b[31m启动服务器时出错:', error, '\u001b[0m');
  process.exit(1);
});
