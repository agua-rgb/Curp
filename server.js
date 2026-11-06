const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const fields = ['first_name', 'last_name', 'curp', 'rfc', 'nss', 'address', 'phone', 'email'];
const required = fields.filter(field => field !== 'curp');
const records = [];
const assets = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
function json(res, status, data) {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
  res.end(JSON.stringify(data));
}
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const route = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'GET' && route === '/api/citizens') return json(res, 200, records);
  if (req.method === 'POST' && route === '/api/verify') {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, {message: 'Se requiere JSON.'});
    let body = '';
    try {
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 12000) return json(res, 413, {message: 'Solicitud demasiado grande.'});
      }
      const data = JSON.parse(body);
      if (!data || typeof data !== 'object' || data.synthetic !== true) return json(res, 400, {message: 'Confirma que todos los datos son ficticios.'});
      if (required.some(field => typeof data[field] !== 'string' || !data[field].trim()) || fields.some(field => data[field] !== undefined && (typeof data[field] !== 'string' || data[field].length > 250))) return json(res, 400, {message: 'Revisa los campos: máximo 250 caracteres por campo.'});
      const record = {id: randomUUID(), created_at: new Date().toISOString()};
      for (const field of fields) record[field] = (data[field] || '').trim();
      records.unshift(record);
      if (records.length > 100) records.pop();
      return json(res, 201, {message: 'Datos recibidos y publicados. No se consultó ni generó ninguna CURP.', id: record.id});
    } catch {
      if (!res.writableEnded) return json(res, 400, {message: 'Solicitud inválida.'});
      return;
    }
  }
  if (req.method === 'GET' && assets[route]) {
    try {
      const [file, type] = assets[route];
      const content = await fs.readFile(path.join(__dirname, 'public', file));
      res.writeHead(200, {'Content-Type': type + '; charset=utf-8'});
      return res.end(content);
    } catch { return json(res, 500, {message: 'No se pudo cargar la página.'}); }
  }
  json(res, 404, {message: 'Ruta no encontrada.'});
});
server.listen(process.env.PORT || 4327, '0.0.0.0', () => console.log('Portal CURP disponible en puerto ' + (process.env.PORT || 4327)));
