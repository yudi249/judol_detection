import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const simulationPath = path.resolve(__dirname, '../simulation/index.html');
const host = '127.0.0.1';
const port = 4173;

await stat(simulationPath);

const server = createServer((request, response) => {
  if (request.url !== '/' && request.url !== '/index.html') {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  createReadStream(simulationPath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`JudolLens simulation page: http://${host}:${port}/`);
});
