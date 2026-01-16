#!/usr/bin/env node
const express = require('express');
const path = require('path');
const fs = require('fs');
const { program } = require('commander');

// 导入模块
const { generateSelfSignedCertificate } = require('./modules/certificate');
const { getIpAddress } = require('./modules/ipUtils');
const { loadProxyConfig, applyProxyMiddleware } = require('./modules/proxyConfig');
const { loggerMiddleware, logCollectionMiddleware } = require('./modules/middleware');
const { directoryListMiddleware, notFoundMiddleware } = require('./modules/directoryHandler');
const { startHttpServer, startHttpsServer, showServerInfo, autoOpenBrowser } = require('./modules/serverUtils');
const { handleDirectorySelection } = require('./modules/inquirerHelper');

// 从package.json读取版本号
const packageJson = require('./package.json');
const version = packageJson.version;

// 解析命令行参数
program
  .version(version)
  .option('-p, --port <port>', 'Set server port / 设置服务器端口', '7426')
  .option('-d, --dir <dir>', 'Set static file directory / 设置静态文件目录')
  .option('-o, --open', 'Auto open browser / 自动打开浏览器', false)
  .option('-c, --config <config>', 'Proxy config file path / 代理配置文件路径,\nformat / 格式: {"/api":{ target:"http://192.168.1.34:3030"}} JSON')
  .option('--proxy <proxy>', 'Proxy rules / 代理规则, format / 格式: "[path1=target1,/*...*/,pathn=targetn]" e.g. "[/api=http://localhost:3000,/api2=http://localhost:3001]"')
  .option('--proxy-log <boolean>', 'Show proxy logs / 是否显示代理日志', 'true')
  .option('--enable-log-api', 'Enable log collection API / 启用日志收集接口', false)
  .arguments('[directory]')
  .description('Static file directory path (optional, default: current directory) / 静态文件目录路径（可选，默认为当前目录）', {
    directory: 'Directory path to serve / 要服务的目录路径'
  })
  .parse(process.argv);

const options = program.opts();
const app = express();
const port = options.port;

// 立即初始化静态目录，避免中间件配置错误
// 只有通过 -d, --dir 参数明确指定的才作为目录，避免将额外参数误判为目录
let staticDir = options.dir || '.';

// 加载代理配置
const { proxyConfig, proxyLog } = loadProxyConfig(options);

// 应用中间件
app.use(loggerMiddleware);

// 添加body解析中间件（用于日志接口的POST请求）
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 应用代理中间件
applyProxyMiddleware(app, proxyConfig, proxyLog, port, getIpAddress);

// 应用日志收集接口中间件（在静态文件服务之前）
logCollectionMiddleware(app, options.enableLogApi);

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

// 设置静态目录到app实例中，供中间件使用
app.set('staticDir', staticDir);

// 实现目录列表功能
app.use(directoryListMiddleware);

// 404处理
app.use(notFoundMiddleware);

// 主函数，支持异步询问
async function startServer() {
  // 处理目录选择
  staticDir = await handleDirectorySelection(options, staticDir);
  
  // 更新app实例中的静态目录
  app.set('staticDir', staticDir);
  
  const ipAddress = getIpAddress();

  // 启动HTTP服务器（自动尝试可用端口）
  let serverResult;
  try {
    serverResult = await startHttpServer(app, parseInt(port));
  } catch (error) {
    console.error(`\u001b[31mHTTP server start error / HTTP服务器启动错误: ${error.message}\u001b[0m`);
    process.exit(1);
  }
  
  const server = serverResult.server;
  const actualPort = serverResult.port;
  const httpServerUrl = `http://${ipAddress}:${actualPort}`;
  
  // HTTPS服务器功能
  let httpsServerUrl = null;
  try {
    // 生成自签名证书
    const certOptions = generateSelfSignedCertificate();
    if (certOptions) {
      // 尝试为HTTPS服务器找到可用端口
      const httpsPortResult = await startHttpsServer(app, actualPort, certOptions);
      httpsServerUrl = `https://${ipAddress}:${httpsPortResult}`;
    } else {
      console.error(`\u001b[31mHTTPS server startup failed: Unable to generate self-signed certificate / HTTPS服务器启动失败：无法生成自签名证书\u001b[0m`);
      console.log(`\u001b[33mHTTP service is still available / HTTP服务仍可正常使用\u001b[0m`);
    }
  } catch (err) {
    console.error(`\u001b[31mHTTPS server startup failed / HTTPS服务器启动失败: ${err.message}\u001b[0m`);
    console.log(`\u001b[33mHTTP service is still available / HTTP服务仍可正常使用\u001b[0m`);
  }

  // 显示服务器启动信息
  showServerInfo(staticDir, httpServerUrl, httpsServerUrl, proxyConfig, options.enableLogApi);
  
  // 自动打开浏览器（使用HTTP）
  if (options.open) {
    autoOpenBrowser(httpServerUrl);
  }
}

// 调用startServer函数启动服务器
startServer().catch(error => {
  console.error('\u001b[31mError starting server / 启动服务器时出错:', error, '\u001b[0m');
  process.exit(1);
});