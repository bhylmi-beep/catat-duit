// Server lokal buat nyoba Catat Duit di laptop: dari folder app jalankan  node tools/serve-app.mjs  (atau npm start)  → http://localhost:8830/
// Cuma dengerin 127.0.0.1 (nggak kebuka ke jaringan). Folder app = satu tingkat di atas berkas ini, bukan folder kerja.
// Kalau port-nya kepakai: kalau yang jalan itu Catat Duit juga, cukup kasih tau alamatnya; kalau program lain, geser ke port berikutnya.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname, sep } from 'node:path';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8830);
const COBA = 10;  // berapa port berikutnya yang dicoba kalau kepakai program lain
const TIPE = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = normalize(join(APP, p));
    if (f !== APP && !f.startsWith(APP + sep)) { res.writeHead(403).end(); return; }
    if (!(await stat(f)).isFile()) throw new Error('bukan berkas');
    res.writeHead(200, { 'Content-Type': TIPE[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(f));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('nggak ada');
  }
});

/** yang lagi dengerin di port ini Catat Duit juga? */
async function iniCatatDuit(port) {
  try {
    const r = await fetch('http://127.0.0.1:' + port + '/', { signal: AbortSignal.timeout(2000) });
    return /<title>Catat Duit<\/title>/.test(await r.text());
  } catch { return false; }
}

// satu pesan "jalan" doang, pakai port yang beneran kepakai (callback listen() percobaan yang gagal tetap nyangkut)
server.on('listening', () => {
  const port = server.address().port;
  console.log('Catat Duit jalan di http://localhost:' + port + '/  (Ctrl+C buat berhenti)');
  if (port !== PORT) console.log('Catatan: alamat beda = data beda. Data di http://localhost:' + PORT + '/ nggak kebawa ke sini.');
});

function jalan(port, sisa) {
  const gagal = async (e) => {
    if (e.code !== 'EADDRINUSE') { console.error('Server gagal jalan: ' + e.message); process.exit(1); }
    if (await iniCatatDuit(port)) {
      console.log('Catat Duit udah jalan di http://localhost:' + port + '/ — tinggal buka di browser.');
      process.exit(0);
    }
    if (sisa > 0) {
      console.log('Port ' + port + ' dipakai program lain, pindah ke ' + (port + 1) + '…');
      jalan(port + 1, sisa - 1);
    } else {
      console.error('Port ' + PORT + '–' + port + ' kepakai semua. Coba port lain: PORT=9000 node ' + fileURLToPath(import.meta.url));
      process.exit(1);
    }
  };
  server.once('error', gagal);
  server.listen(port, '127.0.0.1', () => server.removeListener('error', gagal));
}
jalan(PORT, COBA);
