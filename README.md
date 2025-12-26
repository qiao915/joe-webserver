# JoeWebServer

A static file server based on the nodejs express framework, supporting local proxy functionality.
[中文文档 (Chinese Documentation)](README.zh.md)


## System Requirements

### Node.js Version Requirement
- Requires **Node.js 16.x or higher**. We recommend using the latest LTS version for best performance and security.

### Installing Node.js
1. Download the latest Node.js LTS version from the [official website](https://nodejs.org/)
2. Follow the installation instructions for your operating system
3. Verify installation by running:
   ```bash
   node -v
   npm -v
   ```
   Both commands should return version numbers.

## Features

- 🔹 **Static File Serving**: Quickly turn your current directory into a static file server
- 🔹 **Directory Listing**: Beautiful directory structure display
- 🔹 **Proxy Functionality**: Support forwarding requests from specific paths to remote servers
- 🔹 **Custom Configuration**: Support customizing port, directory, proxy, and other parameters
- 🔹 **Auto Open Browser**: Optional browser auto-open feature
- 🔹 **Colorful Logs**: Clear and colorful log output
- 🔹 **Error Handling**: Friendly 404 error page

## Installation

### Global Installation

```bash
npm install -g joe-webserver
```

### Local Installation

```bash
npm install joe-webserver --save-dev
```

## Usage

### Basic Usage

After global installation, run directly in the command line:

```bash
JoeWebServer
```

Or use lowercase command:

```bash
joewebserver
```

This will start a static file server in the current directory with default port 7426.

### Command Line Arguments

```bash
JoeWebServer [options]
```

#### Available Options

- `-p, --port <port>`: Set server port, default 7426
- `-d, --dir <dir>`: Set static file directory, default current directory
- `-o, --open`: Auto open browser
- `-c, --config <config>`: Proxy configuration file path, format: {"/api":{ target:"http://192.168.1.34:3030"}} JSON format
- `--proxy <proxy>`: Proxy rules, format: "[path1=target1,pathn=targetn]", e.g. "[/api=http://localhost:3000,/api2=http://localhost:3001]"
- `--proxy-log <boolean>`: Whether to show proxy logs, default true
- `-V, --version`: Show version number

### Usage Examples

#### Specify Port

```bash
JoeWebServer --port 3000
```

#### Specify Directory

```bash
JoeWebServer --dir ./public
```

#### Auto Open Browser

```bash
JoeWebServer --open
```

#### Combine Multiple Options

```bash
JoeWebServer --port 5000 --dir ./dist --open
```

## Proxy Functionality

JoeWebServer supports powerful proxy functionality, which can forward requests from specific paths to remote servers.

### Configure Proxy with Command Line Arguments

You can use the `--proxy` parameter to specify proxy rules directly:

```bash
# Proxy requests from /api path to http://localhost:3000
JoeWebServer --proxy "/api=http://localhost:3000"

# Proxy multiple paths to different target servers
JoeWebServer --proxy "[/api=http://localhost:3000,/auth=http://auth.example.com]"
```

### Configure Proxy with Configuration File

Create a proxy configuration file (e.g., `proxy.json`):

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

Then use the `--config` parameter to specify the configuration file:

```bash
JoeWebServer --config proxy.json
```

### Proxy Configuration Options

Supported proxy configuration options:

- `target`: Proxy target server address
- `changeOrigin`: Whether to modify the Host field in the request header, default true
- `pathRewrite`: Path rewrite rules, e.g., `{"^/api": ""}` removes the /api prefix
- `logLevel`: Log level, optional values: debug, info, warn, error, silent
- `headers`: Custom request headers

### Proxy Functionality Examples

#### 1. API Proxy

Proxy all requests starting with /api to the backend server:

```bash
JoeWebServer --proxy /api=http://localhost:3000
```

This way, accessing `http://localhost:7426/api/users` will be forwarded to `http://localhost:3000/api/users`.

#### 2. Path Rewrite

Implement path rewrite using configuration file:

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

This way, accessing `http://localhost:7426/api/users` will be forwarded to `http://localhost:3000/users`.

#### 3. Disable Proxy Logs

```bash
JoeWebServer --proxy /api=http://localhost:3000 --proxy-log false
```

### Proxy Example Configuration File

The project root directory provides a `proxy.example.json` sample configuration file, which you can refer to and modify as needed:

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

## Development Notes

### Core Function Implementation

1. **Static File Service**: Using Express's static middleware
2. **Directory Listing**: Custom middleware for directory structure display
3. **Parameter Parsing**: Using commander to parse command line arguments
4. **IP Address Acquisition**: Getting local network IP through os module

## License

MIT