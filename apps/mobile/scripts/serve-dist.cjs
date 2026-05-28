const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '../dist');
const port = Number(process.env.PORT || 8082);

const contentTypes = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

http
  .createServer((request, response) => {
    const requestPath = decodeURIComponent((request.url || '/').split('?')[0]);
    const relativePath = requestPath === '/' ? '/index.html' : requestPath;
    const filePath = path.join(root, relativePath);

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        fs.readFile(path.join(root, 'index.html'), (fallbackError, fallbackData) => {
          if (fallbackError) {
            response.writeHead(404);
            response.end('Not found');
            return;
          }

          response.writeHead(200, { 'Content-Type': contentTypes['.html'] });
          response.end(fallbackData);
        });
        return;
      }

      response.writeHead(200, {
        'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream'
      });
      response.end(data);
    });
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`Serving ${root} at http://127.0.0.1:${port}`);
  });

