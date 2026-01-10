// src/server.js
import http from 'http';

export const startServer = () => {
  const port = process.env.PORT || 3000;

  http.createServer((_, res) => {
    res.writeHead(200);
    res.end('ok');
  }).listen(port);
};
