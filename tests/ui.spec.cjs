// Tes alur app di HP 360px pakai jam palsu (Playwright + Chrome).
// Jalankan dari folder app/:  npm install  lalu  npm test   (atau langsung: node tests/ui.spec.cjs)
// Pakai Google Chrome di Mac kalau ada; kalau nggak ada, Chromium bawaan Playwright (npx playwright install chromium).
// Jalur Chrome lain bisa dikasih lewat CHROME=/jalur/ke/chrome.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.json': 'application/json' };
const CHROME_MAC = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME = process.env.CHROME || (fs.existsSync(CHROME_MAC) ? CHROME_MAC : undefined);
const WIB = (s) => new Date(s + ':00+07:00');

function server() {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.normalize(path.join(ROOT, p));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(fs.readFileSync(f));
    });
    srv.listen(0, '127.0.0.1', () => ok(srv));
  });
}

// data contoh yang sama persis dengan mockup di rencana (29 Okt 2026)
function dataContoh() {
  const k = (id, nama, jenis, ikon, urutan) => ({ id, nama, jenis, ikon, urutan, arsip: false });
  const categories = [k('makan', 'Makan & minum', 'keluar', 'c-makan', 0), k('kopi', 'Jajan & kopi', 'keluar', 'c-kopi', 1), k('transport', 'Transport', 'keluar', 'c-motor', 2),
    k('belanja', 'Belanja', 'keluar', 'c-belanja', 3), k('tagihan', 'Tagihan & langganan', 'keluar', 'c-tagihan', 4), k('hiburan', 'Hiburan', 'keluar', 'c-hiburan', 5),
    k('sehat', 'Kesehatan', 'keluar', 'c-sehat', 6), k('gaji', 'Gaji', 'masuk', 'c-gaji', 0)];
  const b = (kat, batas, sekali) => ({ id: 'b-' + kat, kat, sekali: !!sekali, riwayat: [{ sejak: '2026-10-25', batas }] });
  const budgets = [b('makan', 2500000), b('kopi', 600000), b('transport', 800000), b('belanja', 1000000), b('tagihan', 750000, true), b('hiburan', 400000)];
  const T = [['2026-10-25T08:00', 'gaji', 8500000, 'Gaji Oktober', 'masuk'], ['2026-10-25T12:30', 'tagihan', 100000, 'Pulsa & data'], ['2026-10-25T15:10', 'transport', 44000, 'Ojol ke venue'],
    ['2026-10-25T16:00', 'hiburan', 325000, 'Konser'], ['2026-10-25T17:20', 'kopi', 98000, 'Boba berdua'], ['2026-10-25T19:00', 'makan', 340000, 'Makan-makan gajian'],
    ['2026-10-26T08:05', 'transport', 6000, 'KRL'], ['2026-10-26T08:30', 'kopi', 25000, 'Kopi'], ['2026-10-26T12:15', 'makan', 34000, 'Makan siang'],
    ['2026-10-26T15:40', 'kopi', 18000, 'Snack sore'], ['2026-10-26T17:50', 'transport', 22000, 'Ojol pulang'], ['2026-10-26T19:30', 'makan', 76000, 'Makan malam'],
    ['2026-10-26T20:15', 'belanja', 75000, 'Sabun & sampo'], ['2026-10-27T19:15', 'sehat', 65000, 'Obat flu'], ['2026-10-27T21:00', 'tagihan', 350000, 'Internet rumah'],
    ['2026-10-28T08:10', 'kopi', 41000, 'Kopi + roti'], ['2026-10-28T12:45', 'makan', 38000, 'Makan siang kantor'], ['2026-10-28T20:30', 'hiburan', 110000, 'Nonton berdua'],
    ['2026-10-29T07:55', 'kopi', 28000, 'Kopi susu'], ['2026-10-29T12:20', 'makan', 32000, 'Nasi padang'], ['2026-10-29T18:05', 'transport', 24000, 'Ojol pulang']];
  const tx = T.map(([waktu, kat, nominal, catatan, jenis], i) => ({ id: 't' + i, jenis: jenis || 'keluar', nominal, kat, catatan, waktu, dibuat: 1000 + i, dompet: 'utama' }));
  return { v: 1, settings: { startDay: 25, tol: 10, lastBackup: '2026-10-28T21:00', dibuat: '2026-10-25T08:00' }, categories, budgets, tx, meta: { rekap: '2026-10-25' } };
}

let lulus = 0;
const gagal = [];
async function uji(nama, fn) {
  try { await fn(); lulus++; console.log('  ✓ ' + nama); } catch (e) { gagal.push(nama); console.log('  ✗ ' + nama + '\n      ' + String(e.message).split('\n').slice(0, 4).join('\n      ')); }
}

(async () => {
  const srv = await server(), BASE = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch(CHROME ? { headless: true, executablePath: CHROME } : { headless: true });
  // Navigasi cukup nunggu DOM siap: font Google diambil dari internet dan kadang bikin event 'load' telat.
  // Tiap tes tetap nunggu elemen yang dicari (waitForSelector), jadi ini nggak bikin tes longgar.
  const tungguDom = (o) => Object.assign({ waitUntil: 'domcontentloaded' }, o);
  const tambal = (pg) => { for (const f of ['goto', 'reload', 'goBack']) { const asli = pg[f].bind(pg); pg[f] = f === 'goto' ? (u, o) => asli(u, tungguDom(o)) : (o) => asli(tungguDom(o)); } return pg; };
  const ctxAsli = browser.newContext.bind(browser);
  browser.newContext = async (o) => { const c = await ctxAsli(o); const np = c.newPage.bind(c); c.newPage = async () => tambal(await np()); return c; };
  const opsiHP = { viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'Asia/Jakarta', locale: 'id-ID', acceptDownloads: true };
  const errors = [];
  async function bukaHP(jam, data) {
    const ctx = await browser.newContext(opsiHP);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_INTERNET|net::/.test(m.text())) errors.push(m.text()); });
    await page.clock.install({ time: WIB(jam) });
    if (data) await ctx.addInitScript((d) => { if (!sessionStorage.getItem('diisi')) { localStorage.setItem('mm.v1', JSON.stringify(d)); sessionStorage.setItem('diisi', '1'); } }, data);
    await page.goto(BASE + '#beranda');
    await page.waitForSelector('#view > *');
    return { ctx, page };
  }
  const teks = (page, sel) => page.locator(sel).first().innerText();
  const db = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('mm.v1')));

  console.log('Pintasan Android');
  await uji('pintasan Pengeluaran langsung buka form, sekali saja, tanpa mengubah data', async () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
    assert.equal(manifest.shortcuts[0].name, 'Catat pengeluaran');
    assert.equal(manifest.shortcuts[0].url, './?aksi=keluar#beranda');
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    const sebelum = await db(page);
    await page.goto(BASE + '?aksi=keluar#beranda');
    await page.waitForSelector('.sheet[aria-label="Catat transaksi"]');
    assert.equal(await page.locator('[data-act="f-jenis"][data-v="keluar"]').getAttribute('aria-pressed'), 'true');
    assert.equal(new URL(page.url()).searchParams.has('aksi'), false);
    assert.deepEqual(await db(page), sebelum);
    await page.click('[data-act="tutup"]');
    await page.reload();
    assert.equal(await page.locator('.sheet').count(), 0);
    await ctx.close();
  });
  await uji('pintasan di HP baru tetap mulai dari langkah awal', async () => {
    const ctx = await browser.newContext(opsiHP), page = await ctx.newPage();
    await page.goto(BASE + '?aksi=keluar#beranda');
    await page.waitForSelector('.ob');
    assert.equal(await page.locator('.sheet').count(), 0);
    assert.equal(new URL(page.url()).searchParams.has('aksi'), false);
    await ctx.close();
  });
  await uji('pintasan: gambar pertama udah form, tanpa animasi masuk (beranda nggak ngintip); tombol + tetap beranimasi', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    // skrip app jalan sebelum DOMContentLoaded: kalau form udah ada di situ, layar pertama yang digambar = form
    await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { window.__formDiAwal = !!document.querySelector('.sheet[aria-label="Catat transaksi"]'); }));
    await page.goto(BASE + '?aksi=keluar#beranda');
    await page.waitForSelector('.sheet[aria-label="Catat transaksi"]');
    assert.equal(await page.evaluate(() => window.__formDiAwal), true);
    assert.equal(await page.locator('.sheet').evaluate((el) => el.classList.contains('buka') || el.getAnimations().length > 0), false);
    await page.click('[data-act="tutup"]');
    await page.waitForSelector('.hero');
    await page.click('[data-act="catat"]');
    assert.equal(await page.locator('.sheet').evaluate((el) => el.classList.contains('buka')), true);
    await ctx.close();
  });
  await uji('ikon pintasan: tanda + sendiri (beda dari ikon app), PNG 192px, muat di zona aman ikon bundar', async () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
    const ikon = manifest.shortcuts[0].icons;
    assert.deepEqual(ikon.map((i) => i.purpose).sort(), ['any', 'maskable']);
    for (const i of ikon) { assert.equal(i.src, 'ikon-pintasan-keluar.png'); assert.equal(i.sizes, '192x192'); }
    const b = fs.readFileSync(path.join(ROOT, 'ikon-pintasan-keluar.png')), N = 192;
    assert.equal(b.toString('latin1', 1, 4), 'PNG');
    assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20)], [N, N]);
    assert.notDeepEqual(b, fs.readFileSync(path.join(ROOT, 'ikon-192.png')));
    // buka piksel (RGB, filter 0 — bikinan tools/ikon.py): semua putih harus di dalam lingkaran radius 40% (zona aman maskable)
    const idat = [];
    for (let o = 8; o < b.length;) { const n = b.readUInt32BE(o); if (b.toString('latin1', o + 4, o + 8) === 'IDAT') idat.push(b.subarray(o + 8, o + 8 + n)); o += 12 + n; }
    const raw = require('node:zlib').inflateSync(Buffer.concat(idat));
    let putih = 0, putihLuar = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const p = y * (N * 3 + 1) + 1 + x * 3;
      if (raw[p] > 200 && raw[p + 1] > 200 && raw[p + 2] > 200) { putih++; if (Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2) > 0.4 * N) putihLuar++; }
    }
    assert.ok(putih > 1000, 'tanda + kelihatan');
    assert.equal(putihLuar, 0);
  });

  console.log('Pertama kali dibuka');
  await uji('onboarding 3 langkah: tanggal 25, kategori bawaan, budget + "udah kepakai"', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40');
    assert.match(await teks(page, '.ob-step'), /Langkah 1 dari 3/i);
    await page.click('[data-act="ob-s"][data-v="25"]');
    assert.match(await teks(page, '.card'), /25 Okt – 24 Nov.*hari ke-5 dari 31/is);
    await page.click('[data-act="ob-next"]');
    await page.click('[data-act="ob-next"]');
    assert.match(await teks(page, '.ob h1'), /Batas tiap budget/i);
    await page.fill('[data-ob="batas"][data-i="0"]', '2500000');
    assert.equal(await page.inputValue('[data-ob="batas"][data-i="0"]'), '2.500.000');
    await page.fill('[data-ob="terpakai"][data-i="0"]', '100000');
    await page.fill('[data-ob="batas"][data-i="4"]', '750000');
    assert.equal(await page.getAttribute('[data-act="ob-sekali"][data-i="4"]', 'aria-pressed'), 'true');
    await page.click('[data-act="ob-selesai"]');
    await page.waitForSelector('.hero');
    assert.match(await teks(page, '.head'), /Siklus 25 Okt – 24 Nov\s+Hari ke-5 dari 31/i);
    const d = await db(page);
    assert.equal(d.settings.startDay, 25);
    assert.equal(d.categories.length, 11);
    assert.equal(d.budgets.length, 2);
    assert.deepEqual(d.tx.map((t) => [t.nominal, t.catatan, t.waktu]), [[100000, 'Penyesuaian awal', '2026-10-29T19:40']]);
    assert.match(await teks(page, '.bud'), /Makan & minum\s+Rp100\.000 \/ Rp2\.500\.000\s+Aman/i);
    assert.match(await teks(page, '.bud >> nth=1'), /Tagihan & langganan[\s\S]*Belum dibayar/i);
    await ctx.close();
  });

  await uji('langkah awal: centang saran kategori spesifik + tulis kategori sendiri, langsung bisa dikasih budget', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40');
    await page.click('[data-act="ob-next"]');
    await page.click('[data-act="ob-pilih"][data-i="11"]');                       // saran: Bensin
    await page.fill('[data-ob-baru="keluar"]', 'Parkir kantor'); await page.press('[data-ob-baru="keluar"]', 'Enter');
    await page.fill('[data-ob-baru="masuk"]', 'Jualan'); await page.click('[data-act="ob-tambah"][data-j="masuk"]');
    await page.fill('[data-ob-baru="keluar"]', 'makan & MINUM'); await page.click('[data-act="ob-tambah"][data-j="keluar"]');
    assert.match(await teks(page, '#toast'), /udah ada/i);
    await page.fill('[data-ob-baru="keluar"]', 'kos / sewa'); await page.click('[data-act="ob-tambah"][data-j="keluar"]');   // sama kayak saran → saran dicentang
    assert.equal(await page.getAttribute('[data-act="ob-pilih"][data-i="13"]', 'aria-pressed'), 'true');
    await page.click('[data-act="ob-next"]');
    const nama = await page.locator('.obrow .nm').allInnerTexts();
    assert.ok(['Bensin', 'Kos / sewa', 'Parkir kantor'].every((n) => nama.includes(n)), nama.join(', '));
    assert.equal(await page.getAttribute('[data-act="ob-sekali"][data-i="13"]', 'aria-pressed'), 'true', 'Kos / sewa bawaannya dibayar sekali');
    await page.fill('[data-ob="batas"][data-i="11"]', '500000');
    await page.fill('[data-ob="batas"][data-i="s0"]', '150000');
    await page.click('[data-act="ob-selesai"]'); await page.waitForSelector('.hero');
    const d = await db(page), cari = (n) => d.categories.find((k) => k.nama === n);
    assert.equal(cari('Bensin').ikon, 'c-bensin');
    assert.equal(cari('Parkir kantor').jenis, 'keluar');
    assert.equal(cari('Jualan').jenis, 'masuk');
    assert.equal(d.categories.filter((k) => k.nama.toLowerCase() === 'makan & minum').length, 1);
    const batas = (n) => { const b = d.budgets.find((x) => x.kat === cari(n).id); return b && b.riwayat[0].batas; };
    assert.equal(batas('Bensin'), 500000); assert.equal(batas('Parkir kantor'), 150000);
    assert.match(await page.locator('#view').innerText(), /Bensin[\s\S]*Rp0 \/ Rp500\.000/i);
    await ctx.close();
  });
  await uji('layar Budget: saran kategori spesifik & "Tambah kategori lain" langsung lanjut ke isian batas', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    await page.goto(BASE + '#budget');
    await page.locator('[data-act="saran-budget"]', { hasText: 'Kos / sewa' }).click();
    assert.match(await teks(page, '.sheet h1'), /Budget · Kos \/ sewa/i);
    assert.equal(await page.getAttribute('[data-act="b-jenis"][data-v="true"]', 'aria-pressed'), 'true');
    await page.fill('#b-batas', '1500000'); await page.click('[data-act="b-simpan"]');
    await page.waitForFunction(() => !document.querySelector('.sheet'));
    assert.equal(await page.locator('[data-act="saran-budget"]', { hasText: 'Kos / sewa' }).count(), 0, 'saran yang udah dipakai ilang');
    await page.click('[data-act="kat-baru-budget"]');
    await page.fill('#k-nama', 'Skincare'); await page.click('[data-act="k-ikon"][data-v="c-sehat"]'); await page.click('[data-act="k-simpan"]');
    assert.match(await teks(page, '.sheet h1'), /Budget · Skincare/i);
    await page.fill('#b-batas', '200000'); await page.press('#b-batas', 'Enter');
    await page.waitForFunction(() => !document.querySelector('.sheet'));
    const d = await db(page), id = (n) => d.categories.find((k) => k.nama === n).id;
    const b = (n) => d.budgets.find((x) => x.kat === id(n));
    assert.deepEqual([b('Kos / sewa').sekali, b('Kos / sewa').riwayat.at(-1).batas], [true, 1500000]);
    assert.deepEqual([b('Skincare').sekali, b('Skincare').riwayat.at(-1).batas], [false, 200000]);
    await page.goto(BASE + '#beranda');
    assert.match(await page.locator('#view').innerText(), /Kos \/ sewa[\s\S]*Belum dibayar/i);
    await page.click('[data-act="catat"]');
    assert.equal(await page.locator('[data-act="f-kat"]', { hasText: 'Skincare' }).count(), 1, 'kategori baru muncul di layar Catat');
    await ctx.close();
  });

  console.log('Fitur 4: tanggal & jam keisi sendiri');
  await uji('tombol + jam 19.42 → form otomatis "Kam 29 Okt · 19.42", simpan pakai jam itu', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    await page.clock.setSystemTime(WIB('2026-10-29T19:42'));
    await page.click('[data-act="catat"]');
    assert.equal(await teks(page, '#f-when'), 'Kam 29 Okt · 19.42');
    for (const k of ['3', '5', '000']) await page.click('[data-act="f-key"][data-k="' + k + '"]');
    assert.equal(await teks(page, '#f-amt'), 'Rp35.000');
    await page.click('[data-act="f-kat"][data-id="makan"]');
    await page.fill('#f-catatan', 'Martabak');
    await page.click('[data-act="f-simpan"]');
    assert.match(await teks(page, '#toast'), /Tersimpan · Makan & minum Rp35\.000/i);
    const t = (await db(page)).tx.find((x) => x.catatan === 'Martabak');
    assert.deepEqual([t.waktu, t.nominal, t.kat, t.jenis], ['2026-10-29T19:42', 35000, 'makan', 'keluar']);
    await ctx.close();
  });
  await uji('form dibuka 23.59, disimpan 00.01 → tetap tanggal 24 (waktu diambil saat diketuk)', async () => {
    const { ctx, page } = await bukaHP('2026-11-24T23:59', dataContoh());
    await page.click('[data-act="catat"]');
    await page.clock.setSystemTime(WIB('2026-11-25T00:01'));
    await page.click('[data-act="f-key"][data-k="5"]'); await page.click('[data-act="f-key"][data-k="000"]');
    await page.click('[data-act="f-kat"][data-id="kopi"]');
    await page.click('[data-act="f-simpan"]');
    const t = (await db(page)).tx.at(-1);
    assert.equal(t.waktu, '2026-11-24T23:59');
    await ctx.close();
  });
  await uji('chip "Kemarin" dan + di grup hari Riwayat ngisi tanggal yang bener, jam tetap sekarang', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:42', dataContoh());
    await page.click('[data-act="catat"]');
    await page.click('[data-act="f-kemarin"]');
    assert.equal(await teks(page, '#f-when'), 'Rab 28 Okt · 19.42');
    await page.click('[data-act="tutup"]');
    await page.goto(BASE + '#riwayat');
    await page.click('[data-act="catat-hari"][data-tgl="2026-10-27"]');
    assert.equal(await teks(page, '#f-when'), 'Sel 27 Okt · 19.42');
    await page.click('[data-act="f-waktu"]');
    await page.fill('#f-tgl', '2026-10-20');
    await page.locator('#f-tgl').dispatchEvent('change');
    assert.match(await teks(page, '.sh-top'), /Masuk siklus 25 Sep – 24 Okt \(siklus lalu\)/i);
    await ctx.close();
  });
  await uji('nominal 0 atau tanpa kategori nggak bisa disimpan', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:42', dataContoh());
    const n = (await db(page)).tx.length;
    await page.click('[data-act="catat"]');
    await page.click('[data-act="f-simpan"]', { force: true });
    await page.click('[data-act="f-key"][data-k="9"]');
    await page.click('[data-act="f-simpan"]', { force: true });
    assert.equal((await db(page)).tx.length, n);
    assert.ok(await page.locator('.sheet').isVisible());
    assert.match(await teks(page, '#toast'), /Pilih kategorinya dulu/i);
    await ctx.close();
  });

  console.log('Fitur 3: batang ikut jalan sama tanggal');
  await uji('Beranda = mockup: jatah Rp146.814, urutan & warna status, di luar budget', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    assert.match(await teks(page, '.hero'), /Jatah aman hari ini\s+Rp146\.814\s+dari sisa Rp3\.964\.000 · 27 hari lagi/i);
    assert.match(await teks(page, '.hero .tot'), /Rp1\.336\.000 \/ Rp5\.300\.000\s+Agak ngebut/i);
    const baris = await page.locator('.bud').allInnerTexts();
    const ringkas = baris.map((s) => s.split('\n').filter(Boolean)).map((p) => p[0] + ' | ' + p[p.length - 1]);
    assert.deepEqual(ringkas, ['Hiburan | Jebol', 'Jajan & kopi | Ngebut', 'Makan & minum | Agak ngebut', 'Transport | Aman', 'Belanja | Aman', 'Tagihan & langganan | Aman']);
    assert.match(await teks(page, '.warn:not(.info)'), /Hiburan jebol · Jajan & kopi ngebut/i);
    assert.match(await teks(page, '.warn.info'), /Pasang dulu ke layar utama/i);  // HP sentuh, belum dipasang
    assert.match(await page.locator('#view').innerText(), /Di luar budget: Rp65\.000 \(Kesehatan\)/i);
    const garis = await page.locator('.bud .pb-mark').evaluateAll((els) => els.map((e) => e.style.left));
    assert.deepEqual(garis, Array(5).fill('16.13%'));   // tagihan "dibayar sekali" tanpa garis
    await ctx.close();
  });
  await uji('detail Makan: 21% vs 16%, jatah Rp73.333/hari, hijau lagi Sab 31 Okt', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    await page.click('[data-act="detail"][data-id="b-makan"]');
    await page.waitForSelector('.pb-big');
    const v = await page.locator('#view').innerText();
    assert.match(v, /terpakai 21%/i);
    assert.match(v, /waktu 16% \(hari ke-5\)/i);
    assert.match(v, /Agak ngebut\s+lebih cepat 5 poin dari waktu — belum lewat toleransi 10/i);
    assert.match(v, /Kalau nggak nambah, hijau lagi Sab 31 Okt/i);
    assert.match(v, /JATAH\/HARI\s+Rp73\.333/i);
    await ctx.close();
  });
  await uji('ganti hari tanpa muat ulang: tengah malam garis & "hari ke-" ikut maju', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T23:59', dataContoh());
    assert.match(await teks(page, '.head h1'), /Hari ke-5 dari 31/i);
    await page.clock.runFor(2 * 60 * 1000);
    assert.match(await teks(page, '.head h1'), /Hari ke-6 dari 31/i);
    assert.equal(await page.locator('.bud .pb-mark').first().evaluate((e) => e.style.left), '19.35%');
    await ctx.close();
  });
  await uji('refresh tanggal 25: rekap siklus lalu muncul sekali, batang mulai dari nol', async () => {
    const { ctx, page } = await bukaHP('2026-11-25T08:00', dataContoh());
    assert.match(await teks(page, '.card'), /Siklus baru mulai · rekap 25 Okt – 24 Nov[\s\S]*Keluar Rp1\.851\.000 dari budget Rp6\.050\.000\. 1 budget jebol: Hiburan/i);
    assert.match(await teks(page, '.head h1'), /Hari ke-1 dari 30/i);
    assert.match(await teks(page, '.hero'), /Rp176\.666/i);   // 5.300.000 ÷ 30
    await page.click('[data-act="rekap-ok"]');
    assert.equal(await page.locator('.card').count(), 0);
    await page.reload(); await page.waitForSelector('.hero');
    assert.equal(await page.locator('.card').count(), 0);
    assert.equal((await db(page)).tx.length, 21);            // data lama utuh
    await ctx.close();
  });

  console.log('Fitur 1: tanggal mulai bisa diatur');
  await uji('ganti tanggal mulai 25 → 1: pratinjau, siklus pindah, transaksi utuh', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    await page.goto(BASE + '#mulai');
    await page.click('[data-act="pilih-s"][data-v="1"]');
    assert.match(await teks(page, '.card'), /1 Okt – 31 Okt · hari ke-29 dari 31/i);
    await page.click('[data-act="simpan-s"]');
    await page.goto(BASE + '#beranda');
    assert.match(await teks(page, '.head'), /Siklus 1 Okt – 31 Okt\s+Hari ke-29 dari 31/i);
    assert.equal((await db(page)).tx.length, 21);
    await page.goto(BASE + '#mulai');
    await page.click('[data-act="pilih-s"][data-v="31"]');
    assert.match(await page.locator('#view').innerText(), /di hari terakhir bulan itu/i);
    await ctx.close();
  });

  console.log('Fitur 2: kategori sendiri');
  await uji('tambah kategori dari layar Catat → langsung kepilih; arsip & urutan', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:42', dataContoh());
    await page.click('[data-act="catat"]');
    await page.click('[data-act="kat-baru"]');
    await page.fill('#k-nama', 'Parkir');
    await page.click('[data-act="k-ikon"][data-v="c-motor"]');
    await page.click('[data-act="k-simpan"]');
    assert.match(await teks(page, '.cat.on'), /Parkir/i);
    await page.click('[data-act="f-key"][data-k="5"]'); await page.click('[data-act="f-key"][data-k="000"]');
    await page.click('[data-act="f-simpan"]');
    let d = await db(page);
    const parkir = d.categories.find((k) => k.nama === 'Parkir');
    assert.equal(d.tx.at(-1).kat, parkir.id);
    await page.goto(BASE + '#kategori');
    await page.click('[data-act="kat-naik"][data-id="' + parkir.id + '"]');
    d = await db(page);
    const urut = d.categories.filter((k) => k.jenis === 'keluar').sort((a, b) => a.urutan - b.urutan).map((k) => k.nama);
    assert.deepEqual(urut.slice(-2), ['Parkir', 'Kesehatan']);
    await page.click('[data-act="edit-kat"][data-id="sehat"]');
    await page.click('[data-act="kat-arsip"]');
    await page.click('[data-act="catat"]');
    assert.equal(await page.locator('[data-act="f-kat"][data-id="sehat"]').count(), 0);
    await page.click('[data-act="tutup"]');
    await page.goto(BASE + '#riwayat');
    await page.click('[data-act="rw-prev"]'); await page.click('[data-act="rw-next"]');
    assert.match(await page.locator('#rw-list').innerText(), /Kesehatan/i);  // riwayat lama tetap ada
    await ctx.close();
  });
  await uji('kategori pemasukan: pemasukan nggak nambah batas & nggak ngurangin terpakai', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:42', dataContoh());
    await page.click('[data-act="catat"]');
    await page.click('[data-act="f-jenis"][data-v="masuk"]');
    assert.equal(await page.locator('[data-act="f-kat"]').count(), 1);
    await page.click('[data-act="f-kat"][data-id="gaji"]');
    for (const k of ['1', '000', '000']) await page.click('[data-act="f-key"][data-k="' + k + '"]');
    await page.click('[data-act="f-simpan"]');
    assert.match(await teks(page, '.hero'), /Rp146\.814/i);
    await page.goto(BASE + '#laporan');
    assert.match(await teks(page, '.sum2'), /Masuk\s+Rp9\.500\.000/i);
    await ctx.close();
  });

  console.log('Fitur tambahan');
  await uji('urungkan hapus transaksi dalam 5 detik', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:42', dataContoh());
    await page.goto(BASE + '#riwayat');
    await page.click('[data-act="edit-tx"][data-id="t20"]');
    await page.click('[data-act="f-hapus"]');
    assert.equal((await db(page)).tx.length, 20);
    await page.click('#toast [data-act="urungkan"]');
    assert.equal((await db(page)).tx.length, 21);
    await ctx.close();
  });
  await uji('laporan: per kategori menjumlah pas 100,0% + dalam/di luar budget', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    await page.goto(BASE + '#laporan');
    const pct = await page.locator('.rep .num').allInnerTexts();
    assert.equal(pct[0], '28,1%');
    const jml = pct.reduce((s, p) => s + Number(p.replace('%', '').replace(',', '.')), 0);
    assert.equal(jml.toFixed(1), '100.0');
    assert.match(await teks(page, '.total'), /Total Rp1\.851\.000 = 100%[\s\S]*dalam budget Rp1\.786\.000 \+ di luar budget Rp65\.000/i);
    await ctx.close();
  });
  await uji('cadangan → ubah data → pulihkan dari file → data balik persis', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    await page.goto(BASE + '#atur');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="cadangan"]')]);
    assert.equal(dl.suggestedFilename(), 'catat-duit-cadangan-2026-10-29.json');
    const file = await dl.path();
    const isi = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(isi.app, 'catat-duit'); assert.equal(isi.data.tx.length, 21);
    const asli = await db(page);
    assert.equal(asli.settings.lastBackup, '2026-10-29T19:40');
    await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('mm.v1')); d.tx = d.tx.slice(0, 3); localStorage.setItem('mm.v1', JSON.stringify(d)); });
    await page.reload(); await page.waitForSelector('#view > *');
    await page.goto(BASE + '#atur');
    await page.click('[data-act="pulihkan"]');
    await page.setInputFiles('#p-file', file);
    await page.waitForSelector('[data-act="pulih-ok"]');
    assert.match(await teks(page, '.sheet .card'), /21 transaksi/i);
    await page.click('[data-act="pulih-ok"]');
    const balik = await db(page);
    assert.deepEqual(balik.tx, asli.tx);
    assert.deepEqual(balik.budgets, asli.budgets);
    await ctx.close();
  });
  await uji('iPhone: cadangan lewat menu Bagikan (Web Share) kalau didukung, bukan unduhan', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    await page.goto(BASE + '#atur');
    await page.evaluate(() => {
      window.__dibagikan = null;
      Navigator.prototype.canShare = (d) => !!(d && d.files && d.files.length);
      Navigator.prototype.share = async (d) => { window.__dibagikan = { nama: d.files[0].name, tipe: d.files[0].type, isi: await d.files[0].text() }; };
    });
    await page.click('[data-act="cadangan"]');
    await page.waitForFunction(() => window.__dibagikan);
    const b = await page.evaluate(() => window.__dibagikan);
    assert.equal(b.nama, 'catat-duit-cadangan-2026-10-29.json');
    assert.equal(JSON.parse(b.isi).data.tx.length, 21);
    assert.match(await teks(page, '#toast'), /Cadangan dikirim/i);
    assert.equal((await db(page)).settings.lastBackup, '2026-10-29T19:40');
    await page.evaluate(() => { Navigator.prototype.share = async () => { throw new DOMException('batal', 'AbortError'); }; });
    await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('mm.v1')); d.settings.lastBackup = null; localStorage.setItem('mm.v1', JSON.stringify(d)); });
    await page.reload(); await page.waitForSelector('#view > *');
    await page.evaluate(() => { Navigator.prototype.canShare = () => true; Navigator.prototype.share = async () => { throw new DOMException('batal', 'AbortError'); }; });
    await page.click('[data-act="cadangan"]');
    await page.waitForTimeout(300);
    assert.equal((await db(page)).settings.lastBackup, null, 'dibatalin = nggak dianggap udah nyadangin');
    await ctx.close();
  });
  await uji('cadangan rusak ditolak dengan pesan jelas, data nggak berubah', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    await page.goto(BASE + '#atur');
    await page.click('[data-act="pulihkan"]');
    await page.fill('#p-teks', '{"app":"catat-duit","data":{"settings":{"startDay":25},"categories":[],"budgets":[],"tx":[{"nominal":-5}]}}');
    await page.click('[data-act="pulih-teks"]');
    assert.match(await teks(page, '.sheet .warn'), /nominal nggak valid/i);
    assert.equal((await db(page)).tx.length, 21);
    await ctx.close();
  });
  await uji('ekspor CSV: BOM + kepala kolom + 21 baris', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    await page.goto(BASE + '#atur');
    await page.evaluate(() => { delete Navigator.prototype.share; delete Navigator.prototype.canShare; });  // Chrome headless: share nggak pernah selesai
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="csv"]')]);
    const isi = fs.readFileSync(await dl.path(), 'utf8');
    assert.equal(isi.charCodeAt(0), 0xfeff);
    assert.equal(isi.trim().split('\r\n').length, 22);
    await ctx.close();
  });
  await uji('pengingat cadangan muncul kalau udah 7 hari', async () => {
    const d = dataContoh(); d.settings.lastBackup = '2026-10-20T10:00';
    const { ctx, page } = await bukaHP('2026-10-29T19:40', d);
    assert.match(await page.locator('#view').innerText(), /Udah 9 hari belum nyimpen cadangan/i);
    await ctx.close();
  });
  await uji('budget baru di tengah siklus + "udah kepakai" + hapus budget', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    await page.goto(BASE + '#budget');
    await page.click('[data-act="edit-budget"][data-kat="sehat"]');
    await page.fill('#b-batas', '300000');
    await page.fill('#b-pakai', '20000');
    await page.click('[data-act="b-simpan"]');
    let d = await db(page);
    const b = d.budgets.find((x) => x.kat === 'sehat');
    assert.deepEqual(b.riwayat, [{ sejak: '2026-10-29', batas: 300000 }]);
    assert.equal(d.tx.filter((t) => t.kat === 'sehat').reduce((s, t) => s + t.nominal, 0), 85000);
    await page.goto(BASE + '#beranda');
    assert.match(await page.locator('#view').innerText(), /Kesehatan\s+Rp85\.000 \/ Rp300\.000/i);
    await page.goto(BASE + '#budget');
    await page.click('[data-act="edit-budget"][data-kat="sehat"]');
    await page.click('[data-act="b-hapus"]');
    d = await db(page);
    assert.equal(d.budgets.find((x) => x.kat === 'sehat').riwayat.at(-1).batas, null);
    await ctx.close();
  });
  await uji('penyimpanan HP penuh: perubahan dibatalin + pesan merah, data di memori nggak ngaco', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:42', dataContoh());
    await page.evaluate(() => { Storage.prototype.setItem = function () { throw new DOMException('penuh', 'QuotaExceededError'); }; });
    await page.click('[data-act="catat"]');
    await page.click('[data-act="f-key"][data-k="5"]'); await page.click('[data-act="f-key"][data-k="000"]');
    await page.click('[data-act="f-kat"][data-id="makan"]');
    await page.click('[data-act="f-simpan"]');
    assert.match(await teks(page, '#toast'), /Gagal nyimpen ke HP/i);
    assert.equal(await page.evaluate(() => window.__mm.db.tx.length), 21);
    await ctx.close();
  });

  console.log('Hasil review independen (biar nggak balik lagi)');
  await uji('toast Urungkan disingkirin pas lembar baru dibuka: ketuk Pemasukan aman', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:42', dataContoh());
    await page.click('[data-act="catat"]');
    await page.click('[data-act="f-key"][data-k="5"]'); await page.click('[data-act="f-key"][data-k="000"]');
    await page.click('[data-act="f-kat"][data-id="kopi"]');
    await page.click('[data-act="f-simpan"]');
    assert.ok(await page.locator('#toast [data-act="urungkan"]').isVisible());
    await page.waitForTimeout(500);
    await page.click('[data-act="catat"]');
    assert.ok(await page.locator('#toast').isHidden(), 'toast lama harus hilang');
    await page.click('[data-act="f-jenis"][data-v="masuk"]');
    assert.equal(await page.getAttribute('[data-act="f-jenis"][data-v="masuk"]', 'aria-pressed'), 'true');
    assert.equal((await db(page)).tx.length, 22, 'transaksi sebelumnya nggak boleh ikut kebatal');
    await ctx.close();
  });
  await uji('Simpan kepencet 2x: ketukan kedua nggak tembus ngebuka lembar kosong', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:42', dataContoh());
    await page.click('[data-act="catat"]');
    await page.click('[data-act="f-key"][data-k="5"]'); await page.click('[data-act="f-key"][data-k="000"]');
    await page.click('[data-act="f-kat"][data-id="kopi"]');
    await page.click('[data-act="f-simpan"]');
    await page.evaluate(() => document.querySelector('[data-act="catat"]').click());
    assert.equal(await page.locator('.sheet').count(), 0);
    await ctx.close();
  });
  await uji('tanggal masa depan ditolak (maks = hari ini)', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:42', dataContoh());
    await page.click('[data-act="catat"]');
    await page.click('[data-act="f-waktu"]');
    assert.equal(await page.getAttribute('#f-tgl', 'max'), '2026-10-29');
    await page.fill('#f-tgl', '2026-11-26'); await page.locator('#f-tgl').dispatchEvent('change');
    await page.click('[data-act="f-key"][data-k="5"]'); await page.click('[data-act="f-key"][data-k="000"]');
    await page.click('[data-act="f-kat"][data-id="makan"]');
    await page.click('[data-act="f-simpan"]');
    assert.match(await teks(page, '#toast'), /nggak bisa di masa depan/i);
    assert.equal((await db(page)).tx.length, 21);
    await ctx.close();
  });
  await uji('arsip kategori: budgetnya jalan sampai akhir siklus; "Pakai lagi" ngebalikin', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    await page.goto(BASE + '#kategori');
    await page.click('[data-act="edit-kat"][data-id="hiburan"]');
    assert.match(await teks(page, '.sheet'), /Budgetnya tetap jalan sampai akhir siklus ini \(24 Nov\)/i);
    await page.click('[data-act="kat-arsip"]');
    let d = await db(page);
    assert.deepEqual(d.budgets.find((b) => b.kat === 'hiburan').riwayat.at(-1), { sejak: '2026-11-25', batas: null });
    await page.goto(BASE + '#beranda');
    assert.match(await teks(page, '.hero'), /Rp146\.814/i);
    assert.match(await page.locator('#view').innerText(), /Hiburan[\s\S]*Jebol/i);
    await page.goto(BASE + '#kategori');
    await page.click('[data-act="kat-pulih"][data-id="hiburan"]');
    d = await db(page);
    assert.deepEqual(d.budgets.find((b) => b.kat === 'hiburan').riwayat, [{ sejak: '2026-10-25', batas: 400000 }]);
    await ctx.close();
  });
  await uji('langkah awal: "udah kepakai" yang kolomnya udah disembunyiin nggak ikut dicatat', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40');
    await page.click('[data-act="ob-s"][data-v="25"]');
    await page.click('[data-act="ob-next"]'); await page.click('[data-act="ob-next"]');
    await page.fill('[data-ob="batas"][data-i="0"]', '2500000');
    await page.fill('[data-ob="terpakai"][data-i="0"]', '400000');
    await page.goBack(); await page.goBack();            // tombol kembali HP: mundur selangkah-selangkah
    assert.match(await teks(page, '.ob-step'), /Langkah 1 dari 3/i);
    await page.click('[data-act="ob-s"][data-v="29"]');   // hari ini jadi hari ke-1
    await page.click('[data-act="ob-next"]'); await page.click('[data-act="ob-next"]');
    assert.equal(await page.locator('[data-ob="terpakai"]').count(), 0);
    assert.equal(await page.inputValue('[data-ob="batas"][data-i="0"]'), '2.500.000');  // isian lain tetap
    await page.click('[data-act="ob-selesai"]');
    await page.waitForSelector('.hero');
    assert.equal((await db(page)).tx.length, 0);
    await ctx.close();
  });
  await uji('cadangan bawa cap waktunya: sesudah dipulihkan nggak dibilang "belum pernah"', async () => {
    const d0 = dataContoh(); d0.settings.lastBackup = null; d0.settings.dibuat = '2026-10-01T08:00';
    const { ctx, page } = await bukaHP('2026-10-29T19:40', d0);
    assert.match(await page.locator('#view').innerText(), /Belum pernah nyimpen cadangan/i);
    await page.goto(BASE + '#atur');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="cadangan"]')]);
    const file = await dl.path(), isi = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(isi.data.settings.lastBackup, isi.dibuat);
    await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('mm.v1')); d.settings.lastBackup = null; localStorage.setItem('mm.v1', JSON.stringify(d)); });
    await page.reload(); await page.waitForSelector('#view > *');
    await page.goto(BASE + '#atur');
    await page.click('[data-act="pulihkan"]'); await page.setInputFiles('#p-file', file);
    await page.waitForSelector('[data-act="pulih-ok"]'); await page.click('[data-act="pulih-ok"]');
    await page.waitForSelector('.hero');
    assert.doesNotMatch(await page.locator('#view').innerText(), /belum pernah nyimpen|belum nyimpen cadangan/i);
    await ctx.close();
  });
  await uji('tombol kembali HP: "Kategori baru" balik ke Catat dengan nominal utuh', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:42', dataContoh());
    await page.click('[data-act="catat"]');
    for (const k of ['3', '5', '000']) await page.click('[data-act="f-key"][data-k="' + k + '"]');
    await page.click('[data-act="kat-baru"]');
    await page.goBack();
    assert.equal(await teks(page, '#f-amt'), 'Rp35.000');
    await page.goBack();
    assert.equal(await page.locator('.sheet').count(), 0);
    await ctx.close();
  });
  await uji('panah kembali & Simpan nggak numpuk riwayat (kembali HP nggak muter-muter)', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    for (let i = 0; i < 2; i++) {
      await page.click('[data-act="detail"][data-id="b-makan"]'); await page.waitForSelector('.pb-big');
      await page.click('[data-act="kembali"]'); await page.waitForSelector('.hero');
    }
    assert.equal(await page.evaluate(() => location.hash), '#beranda');
    await page.click('a[data-tab="atur"]'); await page.waitForSelector('a.set[href="#mulai"]');
    await page.click('a.set[href="#mulai"]'); await page.waitForSelector('.grid31');
    await page.click('[data-act="pilih-s"][data-v="1"]'); await page.click('[data-act="simpan-s"]');
    await page.waitForFunction(() => location.hash === '#atur');
    await page.goBack();
    assert.equal(await page.evaluate(() => location.hash), '#beranda', 'kembali dari Atur harus ke Beranda, bukan ke layar Tanggal mulai');
    await ctx.close();
  });
  await uji('lembar nggak loncat: gulir & fokus jam tetap waktu milih kategori / ngetik jam', async () => {
    const ctx = await browser.newContext({ ...opsiHP, viewport: { width: 360, height: 640 } });
    const page = await ctx.newPage();
    await page.clock.install({ time: WIB('2026-10-29T19:42') });
    await ctx.addInitScript((d) => { localStorage.setItem('mm.v1', JSON.stringify(d)); }, dataContoh());
    await page.goto(BASE + '#beranda'); await page.waitForSelector('.hero');
    await page.click('[data-act="catat"]'); await page.waitForTimeout(400);
    await page.evaluate(() => { document.querySelector('.sh-top').scrollTop = 9999; });
    const sebelum = await page.evaluate(() => document.querySelector('.sh-top').scrollTop);
    assert.ok(sebelum > 0, 'bagian atas lembar harus bisa digulir di 640px');
    await page.evaluate(() => { window.__lembar = document.querySelector('.sheet'); });
    await page.click('[data-act="f-kat"][data-id="sehat"]');
    assert.equal(await page.evaluate(() => document.querySelector('.sh-top').scrollTop), sebelum);
    assert.ok(await page.evaluate(() => document.querySelector('.sheet') === window.__lembar), 'milih kategori nggak boleh ngegambar ulang lembar');
    await page.click('[data-act="f-jenis"][data-v="masuk"]'); await page.click('[data-act="f-jenis"][data-v="keluar"]');
    assert.equal(await page.evaluate(() => document.querySelector('.sheet').classList.contains('buka')), false, 'animasi buka nggak boleh keulang');
    await page.evaluate(() => { document.querySelector('.sh-top').scrollTop = 0; });
    await page.click('[data-act="f-waktu"]');
    await page.focus('#f-jam');
    await page.keyboard.type('1230');
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'f-jam');
    assert.match(await teks(page, '#f-when'), /12\.30/);
    await ctx.close();
  });
  await uji('Enter di keyboard nyimpen budget & kategori', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    await page.goto(BASE + '#budget');
    await page.click('[data-act="edit-budget"][data-kat="sehat"]');
    await page.fill('#b-batas', '300000'); await page.press('#b-batas', 'Enter');
    await page.waitForFunction(() => !document.querySelector('.sheet'));
    assert.ok((await db(page)).budgets.some((b) => b.kat === 'sehat'));
    await page.goto(BASE + '#kategori');
    await page.click('[data-act="kat-baru"]');
    await page.fill('#k-nama', 'Parkir'); await page.press('#k-nama', 'Enter');
    await page.waitForFunction(() => !document.querySelector('.sheet'));
    assert.ok((await db(page)).categories.some((k) => k.nama === 'Parkir'));
    await ctx.close();
  });
  await uji('kalimat status searah warnanya tepat di garis', async () => {
    const d = dataContoh();
    d.tx = d.tx.filter((t) => t.kat !== 'makan');
    d.tx.push({ id: 'tm', jenis: 'keluar', nominal: 653275, kat: 'makan', catatan: '', waktu: '2026-10-26T12:00', dibuat: 5, dompet: 'utama' });
    let { ctx, page } = await bukaHP('2026-10-29T19:40', d);
    await page.goto(BASE + '#detail/b-makan'); await page.waitForSelector('.pb-big');
    assert.match(await page.locator('#view').innerText(), /Ngebut\s+lebih cepat 10,1 poin dari waktu — lewat toleransi 10/i);
    await ctx.close();
    d.tx.find((t) => t.id === 'tm').nominal = 403226;
    ({ ctx, page } = await bukaHP('2026-10-29T19:40', d));
    await page.goto(BASE + '#detail/b-makan'); await page.waitForSelector('.pb-big');
    assert.match(await page.locator('#view').innerText(), /Agak ngebut\s+lebih cepat 0,1 poin dari waktu — belum lewat toleransi 10/i);
    await ctx.close();
  });
  await uji('tebakan "dibayar sekali" pakai kata utuh: Ongkos bertahap, Kos sekali', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    for (const [nama, harap] of [['Ongkos', 'false'], ['Kos', 'true']]) {
      await page.goto(BASE + '#kategori');
      await page.click('[data-act="kat-baru"]'); await page.fill('#k-nama', nama); await page.click('[data-act="k-simpan"]');
      const id = (await db(page)).categories.find((k) => k.nama === nama).id;
      await page.goto(BASE + '#budget');
      await page.click('[data-act="edit-budget"][data-kat="' + id + '"]');
      assert.equal(await page.getAttribute('[data-act="b-jenis"][data-v="true"]', 'aria-pressed'), harap, nama);
      await page.click('[data-act="tutup"]');
    }
    await ctx.close();
  });
  await uji('lembar punya nama, fokus pindah ke dalam lalu balik ke tombol +', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    await page.click('[data-act="catat"]');
    assert.equal(await page.getAttribute('.sheet', 'aria-label'), 'Catat transaksi');
    assert.ok(await page.evaluate(() => document.querySelector('.sheet').contains(document.activeElement)));
    await page.click('[data-act="tutup"]');
    await page.waitForFunction(() => !document.querySelector('.sheet'));
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.dataset.act), 'catat');
    await ctx.close();
  });

  await uji('dua jendela (tab + app terpasang di Android) nggak saling timpa transaksi', async () => {
    const ctx = await browser.newContext(opsiHP);
    await ctx.addInitScript((d) => { if (!localStorage.getItem('mm.v1')) localStorage.setItem('mm.v1', JSON.stringify(d)); }, dataContoh());
    const A = await ctx.newPage(), B = await ctx.newPage();
    for (const pg of [A, B]) { await pg.clock.install({ time: WIB('2026-10-29T19:42') }); await pg.goto(BASE + '#beranda'); await pg.waitForSelector('.hero'); }
    const catat = async (pg, nominal, kat, catatan) => {
      await pg.click('[data-act="catat"]');
      for (const k of nominal) await pg.click('[data-act="f-key"][data-k="' + k + '"]');
      await pg.click('[data-act="f-kat"][data-id="' + kat + '"]');
      await pg.fill('#f-catatan', catatan);
      await pg.click('[data-act="f-simpan"]');
    };
    await catat(A, ['3', '5', '000'], 'makan', 'Martabak');
    await B.evaluate(() => new Promise((r) => setTimeout(r, 0)));
    await catat(B, ['1', '0', '000'], 'transport', 'Parkir');
    if (await B.locator('.sheet').count()) {   // B ketahuan basi: dimuat ulang, isian tetap → simpan lagi
      assert.match(await B.locator('#toast').innerText(), /jendela lain/i);
      await B.click('[data-act="f-simpan"]');
    }
    const akhir = await A.evaluate(() => JSON.parse(localStorage.getItem('mm.v1')).tx.map((t) => t.catatan));
    assert.ok(akhir.includes('Martabak'), 'transaksi dari jendela A hilang');
    assert.ok(akhir.includes('Parkir'), 'transaksi dari jendela B hilang');
    await A.waitForFunction(() => window.__mm.db.tx.some((t) => t.catatan === 'Parkir'));   // A ikut diperbarui
    await ctx.close();
  });
  await uji('jendela basi yang nyimpen ditolak & dimuat ulang (event storage kelewat)', async () => {
    const ctx = await browser.newContext(opsiHP);
    await ctx.addInitScript((d) => { if (!localStorage.getItem('mm.v1')) localStorage.setItem('mm.v1', JSON.stringify(d)); }, dataContoh());
    const A = await ctx.newPage();
    await A.clock.install({ time: WIB('2026-10-29T19:42') });
    await A.goto(BASE + '#beranda'); await A.waitForSelector('.hero');
    // jendela lain nulis langsung ke penyimpanan (simulasi event storage yang kelewat pas app di latar)
    await A.evaluate(() => { const d = JSON.parse(localStorage.getItem('mm.v1')); d.tx.push({ id: 'dariLain', jenis: 'keluar', nominal: 7000, kat: 'kopi', catatan: 'Dari tab', waktu: '2026-10-29T19:41', dibuat: 1, dompet: 'utama' }); localStorage.setItem('mm.v1', JSON.stringify(d)); localStorage.setItem('mm.v1.rev', String(Number(localStorage.getItem('mm.v1.rev') || 0) + 1)); });
    await A.click('[data-act="catat"]');
    await A.click('[data-act="f-key"][data-k="5"]'); await A.click('[data-act="f-key"][data-k="000"]');
    await A.click('[data-act="f-kat"][data-id="makan"]');
    await A.click('[data-act="f-simpan"]');
    assert.match(await A.locator('#toast').innerText(), /berubah di jendela lain/i);
    let tx = await A.evaluate(() => JSON.parse(localStorage.getItem('mm.v1')).tx);
    assert.ok(tx.some((t) => t.id === 'dariLain'), 'data jendela lain ketimpa');
    await A.click('[data-act="f-simpan"]');
    tx = await A.evaluate(() => JSON.parse(localStorage.getItem('mm.v1')).tx);
    assert.ok(tx.some((t) => t.id === 'dariLain') && tx.some((t) => t.nominal === 5000 && t.kat === 'makan'));
    await ctx.close();
  });
  await uji('"Balikin data sebelum pulihkan terakhir" jalan, lalu salinannya dibuang', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    await page.goto(BASE + '#atur');
    await page.click('[data-act="pulihkan"]');
    const kecil = dataContoh(); kecil.tx = kecil.tx.slice(0, 2);
    await page.fill('#p-teks', JSON.stringify({ app: 'catat-duit', versi: 1, dibuat: '2026-10-20T10:00', data: kecil }));
    await page.click('[data-act="pulih-teks"]'); await page.click('[data-act="pulih-ok"]');
    await page.waitForSelector('.hero');
    assert.equal((await db(page)).tx.length, 2);
    await page.goto(BASE + '#atur'); await page.click('[data-act="pulihkan"]');
    assert.match(await page.locator('[data-act="pulih-sebelum"]').innerText(), /21 transaksi/);
    await page.click('[data-act="pulih-sebelum"]'); await page.click('[data-act="pulih-ok"]');
    await page.waitForSelector('.hero');
    assert.equal((await db(page)).tx.length, 21);
    assert.equal(await page.evaluate(() => localStorage.getItem('mm.v1.sebelum-pulih')), null);
    await ctx.close();
  });
  await uji('index.html & engine.js beda versi: app nolak jalan setengah-setengah, minta muat ulang', async () => {
    const ctx = await browser.newContext(opsiHP);
    await ctx.route(/engine\.js/, async (route) => { const res = await route.fetch(); const body = (await res.text()).replace(/VERSI_KODE = '[^']+'/, "VERSI_KODE = '1999.01.01-1'"); await route.fulfill({ response: res, body }); });
    await ctx.addInitScript((d) => { localStorage.setItem('mm.v1', JSON.stringify(d)); }, dataContoh());
    const page = await ctx.newPage();
    await page.goto(BASE + '#beranda');
    await page.waitForSelector('#view .warn');
    assert.match(await page.locator('#view').innerText(), /App lagi ganti versi/i);
    assert.equal(await page.locator('.hero').count(), 0);
    await ctx.close();
  });
  await uji('service worker cuma ngehapus cache miliknya (repo lain di GitHub Pages aman); manifest tanpa id', async () => {
    const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
    assert.equal(man.id, undefined, 'id "./" diselesaikan ke akar origin, bentrok sama app lain');
    const ctx = await browser.newContext(opsiHP);
    const page = await ctx.newPage();
    await page.goto(BASE + 'manifest.webmanifest');
    await page.evaluate(async () => { const c = await caches.open('app-lain-v1'); await c.put('/app-lain/x', new Response('punya app lain')); const d = await caches.open('catat-duit-1999.01.01-1'); await d.put('/basi', new Response('versi lama')); });
    await ctx.addInitScript((d) => { if (!localStorage.getItem('mm.v1')) localStorage.setItem('mm.v1', JSON.stringify(d)); }, dataContoh());
    await page.goto(BASE + '#beranda');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.waitForFunction(async () => !(await caches.keys()).includes('catat-duit-1999.01.01-1'));
    const keys = await page.evaluate(() => caches.keys());
    assert.ok(keys.includes('app-lain-v1'), 'cache app lain ikut kehapus: ' + keys);
    assert.ok(keys.some((k) => /^catat-duit-\d{4}\./.test(k)), 'cache versi sekarang nggak ada: ' + keys);
    await ctx.close();
  });

  console.log('Tampilan HP');
  await uji('semua layar muat di 360px: nol geser samping, tombol ≥ 40px, teks ≥ 14px', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    const cek = async (nama) => {
      const font = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('500 14px Poppins'); });
      assert.ok(font, nama + ': Poppins belum kemuat, ukuran nggak bisa dipercaya');
      const r = await page.evaluate(() => {
        const vw = innerWidth, keluar = [], kecil = [], mini = [];
        document.querySelectorAll('body *').forEach((el) => {
          const b = el.getBoundingClientRect();
          if (!b.width || el.closest('svg') || el.closest('.chips')) return;
          if (b.right > vw + 1 || b.left < -1) keluar.push(el.className || el.tagName);
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && fs < 14) kecil.push((el.className || el.tagName) + ':' + fs);
          if ((el.tagName === 'BUTTON' || el.tagName === 'A') && getComputedStyle(el).display !== 'none' && b.height < 36 && !el.closest('.toast')) mini.push((el.className || el.tagName) + ' ' + Math.round(b.height) + ' ' + el.innerText.slice(0, 20));
        });
        return { lebar: document.documentElement.scrollWidth, vw, tinggi: innerHeight, keluar: keluar.slice(0, 5), kecil: kecil.slice(0, 5), mini: mini.slice(0, 8) };
      });
      assert.equal(r.lebar, r.vw, nama + ': halaman geser samping');
      assert.equal(r.vw, 360, nama + ': HP nge-zoom out (ada yang lebih lebar dari layar)');
      assert.equal(r.tinggi, 780, nama + ': HP nge-zoom out');
      assert.deepEqual(r.keluar, [], nama + ': elemen keluar layar');
      assert.deepEqual(r.kecil, [], nama + ': teks < 14px');
      assert.deepEqual(r.mini, [], nama + ': tombol terlalu kecil');
    };
    for (const v of ['beranda', 'riwayat', 'laporan', 'atur', 'mulai', 'toleransi', 'kategori', 'budget', 'detail/b-makan']) { await page.goto(BASE + '#' + v); await page.waitForSelector('#view > *'); await cek(v); }
    await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('mm.v1')); d.settings.lastBackup = '2026-10-10T10:00'; localStorage.setItem('mm.v1', JSON.stringify(d)); });
    await page.goto(BASE + '#beranda'); await page.reload(); await page.waitForSelector('.hero');
    assert.match(await page.locator('#view').innerText(), /belum nyimpen cadangan/i);
    await cek('beranda + spanduk cadangan');
    const isianKecil = async (nama) => { const k = await page.evaluate(() => [...document.querySelectorAll('input:not([type=file]):not([hidden]), textarea')].filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.id || el.className)); assert.deepEqual(k, [], nama + ': isian < 16px bikin iPhone nge-zoom'); };
    await page.click('[data-act="catat"]'); await page.click('[data-act="f-waktu"]'); await isianKecil('catat'); await page.click('[data-act="tutup"]');
    await page.goto(BASE + '#atur'); await page.click('[data-act="pulihkan"]'); await isianKecil('pulihkan'); await page.click('[data-act="tutup"]');
    await page.goto(BASE + '#budget'); await page.click('[data-act="edit-budget"][data-kat="sehat"]'); await isianKecil('budget'); await page.click('[data-act="tutup"]');
    await page.goto(BASE + '#kategori'); await page.click('[data-act="kat-baru"]'); await isianKecil('kategori'); await page.click('[data-act="tutup"]');
    await page.goto(BASE + '#detail/b-makan'); await page.waitForSelector('.pb-big');
    const numpuk = await page.evaluate(() => [...document.querySelectorAll('.sum2 b')].filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent));
    assert.deepEqual(numpuk, [], 'angka ringkasan Detail numpuk');
    await page.goto(BASE + '#riwayat');
    const tinggiHari = await page.evaluate(() => [...document.querySelectorAll('.day .sum')].map((x) => x.getBoundingClientRect().height));
    assert.ok(tinggiHari.every((h) => h <= 44), 'total harian kebungkus jadi 2 baris: ' + tinggiHari);
    await page.goto(BASE + '#beranda'); await page.click('[data-act="catat"]'); await page.waitForTimeout(450); await cek('catat');
    const kunci = await page.evaluate(() => { const s = document.querySelector('#f-save').getBoundingClientRect(); return s.bottom <= innerHeight; });
    assert.ok(kunci, 'tombol Simpan kelihatan tanpa scroll');
    await page.click('[data-act="tutup"]');
    await page.evaluate(() => { localStorage.removeItem('mm.v1'); sessionStorage.setItem('diisi', '1'); });
    await page.reload(); await page.waitForSelector('.ob');
    await cek('onboarding 1'); await page.click('[data-act="ob-next"]'); await cek('onboarding 2'); await page.click('[data-act="ob-next"]'); await cek('onboarding 3');
    await ctx.close();
  });
  await uji('prefers-reduced-motion: animasi mati', async () => {
    const { ctx, page } = await bukaHP('2026-10-29T19:40', dataContoh());
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.pb-fill').first().evaluate((e) => getComputedStyle(e).animationName), 'none');
    await ctx.close();
  });
  await uji('jalan offline (mode pesawat) sesudah sekali dibuka', async () => {
    const ctx = await browser.newContext({ ...opsiHP });
    const page = await ctx.newPage();
    await ctx.addInitScript((d) => { if (!localStorage.getItem('mm.v1')) localStorage.setItem('mm.v1', JSON.stringify(d)); }, dataContoh());
    await page.goto(BASE);
    await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
    await page.reload();  // biar halaman dikontrol service worker
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForSelector('.hero');
    assert.match(await teks(page, '.lab'), /Siklus/i);
    await page.goto(BASE + '?aksi=keluar#beranda');
    await page.waitForSelector('.sheet[aria-label="Catat transaksi"]');
    await ctx.close();
  });

  await browser.close(); srv.close();
  if (errors.length) { gagal.push('error di console'); console.log('  ✗ error di console:\n      ' + [...new Set(errors)].slice(0, 5).join('\n      ')); }
  console.log((gagal.length ? 'GAGAL' : 'LULUS') + ' — ' + lulus + ' lulus, ' + gagal.length + ' gagal');
  process.exit(gagal.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
