const {createServer} = require('node:http');
const {createReadStream} = require('node:fs');
const {join} = require('node:path');
const {networkInterfaces} = require('node:os');

const port = Number(process.env.VCRAFT_PORT || 8787);
const lan = process.argv.includes('--lan');
const localAddresses = Object.values(networkInterfaces()).flat().filter(Boolean);
const localIp = new Set(['127.0.0.1', ...localAddresses.map(row => row.address)]);
const traces = new Map();
const staticFiles = new Map([
  ['/', ['index.html', 'text/html']],
  ['/index.html', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']],
  ['/bat-trang-streets.svg', ['bat-trang-streets.svg', 'image/svg+xml']],
  ['/app.js', ['app.js', 'application/javascript']],
  ['/village-map.js', ['village-map.js', 'application/javascript']],
  ['/maps-config.js', ['maps-config.js', 'application/javascript']],
  ['/qr.js', ['qr.js', 'application/javascript']]
]);

const text = (value, limit) => typeof value === 'string' && value.length <= limit ? value : '';
const image = value => typeof value === 'string' && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value);

function snapshot(value, token) {
  if (value?.token !== token || !Array.isArray(value.milestones) || value.milestones.length > 300) throw new Error();
  if (!['IN_PROGRESS', 'COMPLETED'].includes(value.status) || !Number.isSafeInteger(value.quantity) || value.quantity < 1) throw new Error();
  return {
    token, status: value.status, quantity: value.quantity,
    story: text(value.story, 300), productName: text(value.productName, 100), workshopName: text(value.workshopName, 100),
    style: ['cup', 'bowl'].includes(value.style) ? value.style : 'vase',
    milestones: value.milestones.map(step => ({
      date: text(step.date, 24), name: text(step.name, 100), note: text(step.note, 300),
      images: Array.isArray(step.images) ? step.images.slice(0, 8).filter(image) : []
    })).sort((a, b) => a.date.localeCompare(b.date))
  };
}

const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const match = /^\/public-traces\/([A-Z0-9_-]{1,30})$/.exec(path);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  if (match) {
    const token = match[1];
    if (request.method === 'GET') {
      if (!traces.has(token)) return response.writeHead(404).end();
      return response.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'}).end(JSON.stringify(traces.get(token)));
    }
    if (request.method !== 'PUT') return response.writeHead(405).end();
    // Only the computer running the demo can publish snapshots. Other LAN devices can read them.
    const from = request.socket.remoteAddress?.replace(/^::ffff:/, '');
    if (!localIp.has(from)) return response.writeHead(403).end();
    if (request.headers.origin !== 'http://' + request.headers.host) return response.writeHead(403).end();
    if (!traces.has(token) && traces.size >= 30) return response.writeHead(507).end();
    try {
      const chunks = [];
      let length = 0;
      for await (const chunk of request) {
        length += chunk.length;
        if (length > 6_000_000) {
          response.writeHead(413).end();
          return;
        }
        chunks.push(chunk);
      }
      traces.set(token, snapshot(JSON.parse(Buffer.concat(chunks)), token));
      return response.writeHead(204).end();
    } catch {
      return response.writeHead(400).end();
    }
  }
  const file = staticFiles.get(path);
  if (!file || request.method !== 'GET') return response.writeHead(404).end();
  response.writeHead(200, {'Content-Type': file[1] + '; charset=utf-8'});
  createReadStream(join(__dirname, file[0])).pipe(response);
});

server.listen(port, lan ? '0.0.0.0' : '127.0.0.1', () => {
  if (lan) {
    for (const ip of localAddresses.filter(row => !row.internal && row.family === 'IPv4')) {
      console.log('Địa chỉ mạng để mở trên máy tính và quét QR: http://' + ip.address + ':' + port);
    }
  }
  console.log('Địa chỉ trên máy tính: http://127.0.0.1:' + port);
});
