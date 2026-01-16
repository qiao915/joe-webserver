# JoeWebServer

基于 nodejs express 框架的 Joe Web Server 静态文件服务器，支持本地代理功能。

## 系统要求

### Node.js 版本要求
- 需要 **Node.js 16.x 或更高版本**。我们推荐使用最新的 LTS 版本以获得最佳性能和安全性。

### 安装 Node.js
1. 从 [官方网站](https://nodejs.org/) 下载最新的 Node.js LTS 版本
2. 按照操作系统的安装说明进行安装
3. 通过运行以下命令验证安装：
   ```bash
   node -v
   npm -v
   ```
   两个命令都应该返回版本号。

## 功能特性

- 🔹 **静态文件服务**：快速将当前目录变成静态文件服务器
- 🔹 **目录列表**：美观的目录结构展示
- 🔹 **代理功能**：支持将特定路径的请求转发到远程服务器
- 🔹 **日志收集接口**：内置日志收集接口，可以在js中调用接口，将参数以日志形式打印到启动该服务的控制台
- 🔹 **自定义配置**：支持自定义端口、目录、代理等参数
- 🔹 **自动打开浏览器**：可选的浏览器自动打开功能
- 🔹 **彩色日志**：清晰的彩色日志输出
- 🔹 **错误处理**：友好的404错误页面

## 安装

### 全局安装

```bash
npm install -g joe-webserver
```

### 局部安装

```bash
npm install joe-webserver --save-dev
```

## 使用方法

### 基本使用

全局安装后，直接在命令行运行：

```bash
JoeWebServer
# 或者
joewebserver
# 或者
joe-webserver
# 或者
jws
```

这将会在当前目录启动一个静态文件服务器，默认端口为7426。

### 命令行参数

```bash
JoeWebServer [options]
```

#### 可用选项

- `-p, --port <port>`: 设置服务器端口，默认7426
- `-d, --dir <dir>`: 设置静态文件目录，默认当前目录
- `-o, --open`: 自动打开浏览器
- `-c, --config <config>`: 代理配置文件路径，格式: {"/api":{ target:"http://192.168.1.34:3030"}} JSON格式
- `--proxy <proxy>`: 代理规则，格式: "[path1=target1,pathn=targetn]"，如"[/api=http://localhost:3000,/api2=http://localhost:3001]"
- `--proxy-log <boolean>`: 是否显示代理日志，默认为true
- `--enable-log-api`: 启用日志收集接口，默认为false 关闭状态
- `-V, --version`: 显示版本号

### 使用示例

#### 指定端口

```bash
JoeWebServer --port 3000
```

#### 指定目录

```bash
JoeWebServer --dir ./public
```



#### 自动打开浏览器

```bash
JoeWebServer --open
```

#### 结合多个选项

```bash
JoeWebServer --port 5000 --dir ./dist --open
```

## 代理功能

JoeWebServer支持强大的代理功能，可以将特定路径的请求转发到远程服务器。

### 使用命令行参数配置代理

可以使用`--proxy`参数直接指定代理规则：

```bash
# 将/api路径的请求代理到http://localhost:3000
JoeWebServer --proxy "/api=http://localhost:3000"

# 将多个路径代理到不同的目标服务器
JoeWebServer --proxy "[/api=http://localhost:3000,/auth=http://auth.example.com]"
```

### 使用配置文件配置代理

创建一个代理配置文件（如`proxy.json`）：

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "changeOrigin": true,
    "pathRewrite": {
      "^/api": ""
    }
  },
  "/auth": {
    "target": "https://auth.example.com",
    "changeOrigin": true
  }
}
```

然后使用`--config`参数指定配置文件：

```bash
JoeWebServer --config proxy.json
```

### 代理配置选项

支持的代理配置选项：

- `target`: 代理目标服务器地址
- `changeOrigin`: 是否修改请求头中的Host字段，默认为true
- `pathRewrite`: 路径重写规则，如`{"^/api": ""}`将/api前缀移除
- `logLevel`: 日志级别，可选值：debug, info, warn, error, silent
- `headers`: 自定义请求头

### 代理功能示例

#### 1. API代理

将所有以/api开头的请求代理到后端服务器：

```bash
JoeWebServer --proxy /api=http://localhost:3000
```

这样访问`http://localhost:7426/api/users`会被转发到`http://localhost:3000/api/users`。

#### 2. 路径重写

使用配置文件实现路径重写：

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "changeOrigin": true,
    "pathRewrite": {
      "^/api": ""
    }
  }
}
```

```bash
JoeWebServer --config proxy.json
```

这样访问`http://localhost:7426/api/users`会被转发到`http://localhost:3000/users`。

#### 3. 禁用代理日志

```bash
JoeWebServer --proxy /api=http://localhost:3000 --proxy-log false
```

### 代理示例配置文件

项目根目录下提供了`proxy.example.json`示例配置文件，您可以参考并根据需要修改：

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "changeOrigin": true,
    "pathRewrite": {
      "^/api": ""
    }
  },
  "/auth": {
    "target": "https://auth.example.com",
    "changeOrigin": true
  },
  "/static": {
    "target": "http://cdn.example.com",
    "changeOrigin": true,
    "logLevel": "info"
  }
}
```

## 日志收集接口

JoeWebServer提供了内置的日志收集接口（`/jws/logs`），用于调试和监控目的。该接口允许客户端向服务器发送日志数据，日志将在控制台中显示。
例如：app内嵌H5页面，将app交互数据、js中的日志等数据打印到服务端控制台，方便调试。

### 启用日志收集接口

要启用日志收集接口，使用`--enable-log-api`标志：

```bash
JoeWebServer --enable-log-api
```

启用后，日志接口端点将在服务器启动信息中显示：

```
Log API / 日志接口: https://192.168.1.86:7429/jws/logs
```

### API端点

- **URL**: `/jws/logs`
- **方法**: GET, POST, OPTIONS
- **CORS**: 已启用（允许跨域请求）

### 使用示例

#### 1. GET请求

通过查询参数发送日志数据：

```bash
curl "http://localhost:7428/jws/logs?data=这是一条测试日志"
```

或使用不同的参数名称：

```bash
curl "http://localhost:7428/jws/logs?log=发生错误"
curl "http://localhost:7428/jws/logs?msg=调试信息"
```

#### 2. POST请求

通过请求体发送日志数据：

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"message":"这是一条POST日志","level":"info"}' \
  "http://localhost:7428/jws/logs"
```

#### 3. JavaScript示例

```javascript
// 通过GET发送日志
fetch('http://localhost:7428/jws/logs?data=客户端发生错误');

// 通过POST发送日志
fetch('http://localhost:7428/jws/logs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: '用户操作完成',
    level: 'info',
    timestamp: new Date().toISOString()
  })
});
```

#### 4. 跨域请求

该API支持CORS，允许来自任何域的请求：

```javascript
fetch('http://localhost:7428/jws/logs?data=CORS测试', {
  mode: 'cors'
});
```

### 日志输出格式

当接收到日志时，它们将在控制台中以以下格式显示：

```
[JWS Log] 2026/1/16 09:39:59 - 127.0.0.1 - GET /jws/logs?data=test_log_message
  Data: test_log_message
```

### 响应格式

该API返回JSON响应：

```json
{
  "success": true,
  "message": "Log received",
  "timestamp": "2026-01-16T01:39:59.082Z"
}
```
## 开发说明

### 核心功能实现

1. **静态文件服务**：使用Express的static中间件
2. **目录列表**：自定义中间件实现目录结构展示
3. **参数解析**：使用commander解析命令行参数
4. **IP地址获取**：通过os模块获取本地网络IP

## 许可证

MIT