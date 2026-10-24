/**
 * dev-server.js — 足球闹钟App浏览器开发预览服务器
 * 
 * 用法:
 *   node dev-server.js
 *   或: npm install express http-proxy-middleware && node dev-server.js
 * 
 * 功能:
 *   1. 服务 assets/ 目录的静态文件
 *   2. 代理 /api/* 请求到生产服务器 (https://足球闹钟.top)
 *   3. 自动打开浏览器
 * 
 * 端口: http://localhost:8080
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8080;
const ASSETS_DIR = path.join(__dirname, 'app', 'src', 'main', 'assets');
// mock-android.js 只用于浏览器预览，故意放在 assets 之外，
// 否则会被一起打进正式 APK（里面是假数据 + mock 关键字，商店静态扫描会当测试代码）。
const DEV_ASSETS_DIR = path.join(__dirname, 'dev-assets');
const PROXY_HOST = 'xn--5eyx16c61esnb.top'; // Punycode of 足球闹钟.top
const PROXY_PORT = 443;

console.log('═══════════════════════════════════');
console.log('  ⚽ 足球闹钟App 开发预览服务器');
console.log('═══════════════════════════════════');
console.log('  静态文件:', ASSETS_DIR);
console.log('  API代理:', 'https://' + PROXY_HOST);
console.log('  端口:', PORT);
console.log('═══════════════════════════════════');

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// 代理API请求 (使用Node.js原生https)
function proxyApi(req, res) {
  const https = require('https');
  const options = {
    hostname: PROXY_HOST,
    port: PROXY_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: PROXY_HOST }
  };

  const proxyReq = https.request(options, function(proxyRes) {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', function(err) {
    console.error('[Proxy] Error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
  });

  req.pipe(proxyReq);
}

// 创建服务器
const server = http.createServer(function(req, res) {
  console.log('[' + new Date().toLocaleTimeString() + ']', req.method, req.url);

  // API请求 → 代理到生产服务器
  if (req.url.startsWith('/api/')) {
    return proxyApi(req, res);
  }

  // 静态文件请求
  var filePath = req.url === '/' ? '/index.html' : req.url;
  var isDevAsset = (filePath === '/mock-android.js');
  filePath = path.join(isDevAsset ? DEV_ASSETS_DIR : ASSETS_DIR, filePath);

  // 安全检查：防止目录遍历
  if (!filePath.startsWith(ASSETS_DIR) && !filePath.startsWith(DEV_ASSETS_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  var ext = path.extname(filePath).toLowerCase();
  var contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, function(err, content) {
    if (err) {
      if (err.code === 'ENOENT') {
        // 文件不存在，尝试代理到生产服务器（图片等）
        return proxyApi(req, res);
      }
      res.writeHead(500);
      return res.end('Internal Server Error');
    }
    res.writeHead(200, { 'Content-Type': contentType });
    // 浏览器预览专用：把 mock 层注入到 HTML 里。
    // 正式 APK 的 index.html 不再引用 mock-android.js，
    // 避免开发用的 mock 顶掉原生 JS 桥导致闹钟失效。
    if (ext === '.html') {
      var html = content.toString('utf8').replace(
        '</head>',
        '  <script src="mock-android.js"></script>\n</head>'
      );
      return res.end(html);
    }
    res.end(content);
  });
});

server.listen(PORT, function() {
  console.log('');
  console.log('  ✅ 服务器已启动!');
  console.log('  🌐 打开浏览器访问: http://localhost:' + PORT);
  console.log('  📱 按 F12 打开开发者工具，切换到手机视图');
  console.log('  🛑 按 Ctrl+C 停止服务器');
  console.log('');

  // 自动打开浏览器
  var url = 'http://localhost:' + PORT;
  var platform = process.platform;
  try {
    if (platform === 'win32') {
      exec('start "" "' + url + '"');
    } else if (platform === 'darwin') {
      exec('open "' + url + '"');
    } else {
      exec('xdg-open "' + url + '"');
    }
  } catch(e) {
    // 忽略错误
  }
});
