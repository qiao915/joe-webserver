# JoeWebServer

基于nodejs express框架的静态文件服务器，支持本地代理功能。

## 功能特性

- 🔹 **静态文件服务**：快速将当前目录变成静态文件服务器
- 🔹 **目录列表**：美观的目录结构展示
- 🔹 **代理功能**：支持将特定路径的请求转发到远程服务器
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
```

或使用小写命令：

```bash
joewebserver
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

## 开发说明

### 核心功能实现

1. **静态文件服务**：使用Express的static中间件
2. **目录列表**：自定义中间件实现目录结构展示
3. **参数解析**：使用commander解析命令行参数
4. **IP地址获取**：通过os模块获取本地网络IP

## 许可证

MIT