const fs = require('fs').promises;
const path = require('path');

// 目录列表处理中间件
async function directoryListMiddleware(req, res, next) {
  try {
    const requestedPath = path.join(req.app.get('staticDir'), req.path);
    
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
          // file !== '.DS_Store' && 
          // file !== '.git' && 
          // file !== '.idea' && 
          // file !== 'node_modules' &&
          // file !== 'package-lock.json' &&
          file !== '.gitignore' && 
          file !== '.npmignore'  
        );
        
        // 获取文件/目录信息以确定图标
        const fileInfos = await Promise.all(
          filteredFiles.map(async file => {
            const filePath = path.join(requestedPath, file);
            const stats = await fs.stat(filePath);
            return {
              name: file,
              isDirectory: stats.isDirectory()
            };
          })
        );
        
        // 排序：文件夹在前，文件在后
        fileInfos.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        
        // 获取文件图标
        function getFileIcon(filename, isDirectory) {
          if (isDirectory) return '📁';
          
          const ext = path.extname(filename).toLowerCase();
          const iconMap = {
            '.html': '🌐',
            '.htm': '🌐',
            '.css': '🎨',
            '.less': '🎨',
            '.sass': '🎨',
            '.js': '📜',
            '.json': '📋',
            '.md': '📝',
            '.txt': '📄',
            '.docx': '📄',
            '.xls': '📄',
            '.xlsx': '📄',
            '.png': '🖼️',
            '.jpg': '🖼️',
            '.jpeg': '🖼️',
            '.gif': '🖼️',
            '.svg': '🖼️',
            '.ico': '🖼️',
            '.pdf': '📕',
            '.zip': '📦',
            '.rar': '📦',
            '.tar': '📦',
            '.gz': '📦',
            '.mp3': '🎵',
            '.wav': '🎵',
            '.mp4': '🎬',
            '.avi': '🎬',
            '.mov': '🎬',
            '.mkv': '🎬'
          };
          return iconMap[ext] || '📄';
        }
        
        // 生成目录列表HTML
        res.status(200).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Directory Listing - ${req.path}</title>
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
                font-size: 18px;
              }
            </style>
          </head>
          <body>
            <h1>Directory Listing - ${req.path}</h1>
            <div class="dir-list">
              ${req.path !== '/' ? `<div class="dir-item"><span class="icon">📁</span><a href="${path.dirname(req.path) || '/'}">..</a></div>` : ''}
              ${fileInfos.map(file => {
                const filePath = path.join(req.path, file.name);
                const icon = getFileIcon(file.name, file.isDirectory);
                return `<div class="dir-item"><span class="icon">${icon}</span><a href="${filePath}">${file.name}</a></div>`;
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
}

// 404处理中间件
function notFoundMiddleware(req, res) {
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
        <p>Page not found / 页面未找到</p>
      </div>
    </body>
    </html>
  `);
}

module.exports = {
  directoryListMiddleware,
  notFoundMiddleware
};