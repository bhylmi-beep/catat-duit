// Tes mesin hitung — jalankan: node tests/engine.test.cjs (dari folder app/)
// Dijalankan juga dengan TZ lain buat buktiin hitungan siklus nggak kena zona waktu.
const assert = require('node:assert/strict');
const MM = require('../engine.js');

let lulus = 0;
const gagal = [];
function uji(nama, fn) {
  try { fn(); lulus++; } catch (e) { gagal.push(nama + ' — ' + e.message); }
}
const siklus = (tgl, S) => { const c = MM.cycleFor(tgl, S); return [c.start, c.last, c.N, MM.dayIndex(c, tgl)]; };

// ---------- siklus: kasus pinggir (dicocokkan dua hitungan terpisah di rencana) ----------
const KASUS = [
  ['mulai 25, 29 Okt 2026', '2026-10-29', 25, ['2026-10-25', '2026-11-24', 31, 5]],
  ['mulai 1, 29 Okt 2026', '2026-10-29', 1, ['2026-10-01', '2026-10-31', 31, 29]],
  ['mulai 15, 29 Okt 2026', '2026-10-29', 15, ['2026-10-15', '2026-11-14', 31, 15]],
  ['mulai 31, 29 Okt 2026 (Sep cuma 30)', '2026-10-29', 31, ['2026-09-30', '2026-10-30', 31, 30]],
  ['mulai 31, 15 Feb 2027', '2027-02-15', 31, ['2027-01-31', '2027-02-27', 28, 16]],
  ['mulai 31, 28 Feb 2027 dijepit', '2027-02-28', 31, ['2027-02-28', '2027-03-30', 31, 1]],
  ['mulai 31, 30 Mar 2027 hari terakhir', '2027-03-30', 31, ['2027-02-28', '2027-03-30', 31, 31]],
  ['mulai 31, 15 Feb 2028 kabisat', '2028-02-15', 31, ['2028-01-31', '2028-02-28', 29, 16]],
  ['mulai 31, 29 Feb 2028', '2028-02-29', 31, ['2028-02-29', '2028-03-30', 31, 1]],
  ['mulai 30, 1 Mar 2027', '2027-03-01', 30, ['2027-02-28', '2027-03-29', 30, 2]],
  ['mulai 29, 27 Feb 2027', '2027-02-27', 29, ['2027-01-29', '2027-02-27', 30, 30]],
  ['mulai 29, 28 Feb 2027', '2027-02-28', 29, ['2027-02-28', '2027-03-28', 29, 1]],
  ['mulai 29, 29 Feb 2028', '2028-02-29', 29, ['2028-02-29', '2028-03-28', 29, 1]],
  ['mulai 31, 29 Nov 2026', '2026-11-29', 31, ['2026-10-31', '2026-11-29', 30, 30]],
  ['mulai 31, 30 Nov 2026', '2026-11-30', 31, ['2026-11-30', '2026-12-30', 31, 1]],
  ['mulai 31, 31 Des 2026 lintas tahun', '2026-12-31', 31, ['2026-12-31', '2027-01-30', 31, 1]],
  ['mulai 25, 5 Jan 2027 lintas tahun', '2027-01-05', 25, ['2026-12-25', '2027-01-24', 31, 12]],
  ['mulai 1, 10 Feb 2027', '2027-02-10', 1, ['2027-02-01', '2027-02-28', 28, 10]],
  ['mulai 1, 10 Feb 2028', '2028-02-10', 1, ['2028-02-01', '2028-02-29', 29, 10]],
  ['mulai 31, 28 Feb 2100 (bukan kabisat)', '2100-02-28', 31, ['2100-02-28', '2100-03-30', 31, 1]],
  ['mulai 25 Nov: hari pertama siklus baru', '2026-11-25', 25, ['2026-11-25', '2026-12-24', 30, 1]],
  ['mulai 25: 24 Nov hari terakhir', '2026-11-24', 25, ['2026-10-25', '2026-11-24', 31, 31]],
];
for (const [nama, tgl, S, harap] of KASUS) uji('siklus ' + nama, () => assert.deepEqual(siklus(tgl, S), harap));

uji('semua S 1..31 × 5 tahun: siklus nyambung, tanpa celah/tumpang tindih, N 28–31', () => {
  for (let S = 1; S <= 31; S++) {
    let c = MM.cycleFor('2026-01-01', S);
    for (let i = 0; i < 62; i++) {
      assert.ok(c.N >= 28 && c.N <= 31, 'N=' + c.N);
      const n = MM.nextCycle(c, S);
      assert.equal(n.start, c.end, 'nyambung');
      assert.deepEqual(MM.prevCycle(n, S).start, c.start, 'balik');
      c = n;
    }
  }
  // tiap tanggal masuk tepat satu siklus
  for (let S = 1; S <= 31; S++) {
    for (let n = MM.numOf('2026-01-01'); n < MM.numOf('2028-12-31'); n += 7) {
      const t = MM.strOf(n), c = MM.cycleFor(t, S);
      assert.ok(t >= c.start && t < c.end);
    }
  }
});

// ---------- keanggotaan transaksi: jam diabaikan ----------
uji('00.00 di hari mulai masuk siklus baru', () => {
  const baru = MM.cycleFor('2026-11-25', 25), lama = MM.cycleFor('2026-11-24', 25);
  assert.ok(MM.inCycle('2026-11-25T00:00', baru));
  assert.ok(!MM.inCycle('2026-11-25T00:00', lama));
});
uji('23.59 di hari terakhir masih siklus lama', () => {
  const lama = MM.cycleFor('2026-11-24', 25);
  assert.ok(MM.inCycle('2026-11-24T23:59', lama));
});
uji('stamp = jam dinding lokal, bukan UTC', () => {
  assert.equal(MM.stamp(new Date(2026, 9, 25, 0, 0)), '2026-10-25T00:00');
  assert.equal(MM.stamp(new Date(2026, 9, 29, 6, 59)), '2026-10-29T06:59');
  assert.equal(MM.stamp(new Date(2026, 9, 29, 19, 42)), '2026-10-29T19:42');
});

// ---------- status: tepat di garis batas (bilangan bulat, nggak meleset) ----------
const st = (T, B, d, N, sekali, tol) => MM.budgetState({ T, B, d, N, sekali, tol });
uji('pas di garis waktu = aman; lewat 1 rupiah = agak', () => {
  // N=31, d=5, B=3.100.000 → garis waktu di Rp500.000
  assert.equal(st(500000, 3100000, 5, 31), 'aman');
  assert.equal(st(500001, 3100000, 5, 31), 'agak');
});
uji('pas di garis toleransi = agak; lewat 1 rupiah = ngebut', () => {
  // 100·31·T = 3.100.000·(500 + 310) → T = Rp810.000
  assert.equal(st(810000, 3100000, 5, 31), 'agak');
  assert.equal(st(810001, 3100000, 5, 31), 'ngebut');
});
uji('habis pas = bukan jebol; lewat 1 rupiah = jebol', () => {
  assert.equal(st(1000000, 1000000, 20, 31), 'ngebut');
  assert.equal(st(1000000, 1000000, 31, 31), 'aman');
  assert.equal(st(1000001, 1000000, 31, 31), 'jebol');
});
uji('contoh Bay: hari ke-15 dari 31, 55% = agak; 65% = ngebut', () => {
  assert.equal(st(1375000, 2500000, 15, 31), 'agak');
  assert.equal(st(1625000, 2500000, 15, 31), 'ngebut');
});
uji('pengeluaran sama, vonis beda karena waktu jalan (21%)', () => {
  assert.equal(st(520000, 2500000, 2, 31), 'ngebut');
  assert.equal(st(520000, 2500000, 5, 31), 'agak');
  assert.equal(st(520000, 2500000, 7, 31), 'aman');
});
uji('dibayar sekali: lunas di hari 1 tetap aman, lewat batas tetap jebol', () => {
  assert.equal(st(1800000, 1800000, 1, 31, true), 'aman');
  assert.equal(st(0, 750000, 1, 31, true), 'aman');
  assert.equal(st(1800001, 1800000, 1, 31, true), 'jebol');
});
uji('toleransi bisa diubah', () => {
  assert.equal(st(520000, 2500000, 2, 31, false, 20), 'agak');
  assert.equal(st(520000, 2500000, 2, 31, false, 10), 'ngebut');
});
uji('batas 0: ada belanja = jebol, kosong = aman', () => {
  assert.equal(st(1, 0, 5, 31), 'jebol');
  assert.equal(st(0, 0, 5, 31), 'aman');
});
uji('MECE: 20.000 titik acak jatuh ke tepat satu status yang konsisten dengan rumus desimal di luar garis', () => {
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < 20000; i++) {
    const N = 28 + Math.floor(rnd() * 4), d = 1 + Math.floor(rnd() * N), B = 100000 + Math.floor(rnd() * 5000000);
    const T = Math.floor(rnd() * B * 1.3), s = st(T, B, d, N);
    const sp = (100 * T) / B, tp = (100 * d) / N, gap = sp - tp;
    const eps = 1e-6; // di luar garis, rumus desimal & bulat harus sama
    if (Math.abs(sp - 100) > eps && Math.abs(gap - 10) > eps && Math.abs(gap) > eps) {
      const harap = sp > 100 ? 'jebol' : gap > 10 ? 'ngebut' : gap > 0 ? 'agak' : 'aman';
      assert.equal(s, harap, JSON.stringify({ T, B, d, N }));
    }
  }
});

// ---------- jatah & balik hijau ----------
uji('jatah per hari: hari ini ikut dihitung', () => {
  assert.equal(MM.jatahPerHari(520000, 2500000, 5, 31), 73333);   // 1.980.000 ÷ 27
  assert.equal(MM.jatahPerHari(0, 3100000, 31, 31), 3100000);     // hari terakhir: pembagi 1
  assert.equal(MM.jatahPerHari(435000, 400000, 5, 31), 0);        // jebol: 0, bukan minus
});
uji('balik hijau Makan: hari ke-7 (Sab 31 Okt)', () => {
  const h = MM.balikHijau(520000, 2500000, 31);
  assert.equal(h, 7);
  const c = MM.cycleFor('2026-10-29', 25);
  assert.equal(MM.tglHari(MM.strOf(c.a + h - 1)), 'Sab 31 Okt');
  assert.equal(st(520000, 2500000, h, 31), 'aman');
  assert.equal(st(520000, 2500000, h - 1, 31), 'agak');
});

uji('persen tampilan: dibulatkan, tapi 100% cuma kalau beneran habis', () => {
  assert.equal(MM.persen(520000, 2500000), 21);
  assert.equal(MM.persen(996, 1000), 99);
  assert.equal(MM.persen(1000, 1000), 100);
  assert.equal(MM.persen(1004, 1000), 101);  // lewat batas nggak boleh kebaca 100%
  assert.equal(MM.persen(435000, 400000), 109);
  assert.equal(MM.persen(5, 0), 0);
});

// ---------- riwayat batas ----------
uji('batas berubah di tengah siklus: siklus lalu pakai batas lama', () => {
  const b = { riwayat: [{ sejak: '2026-10-01', batas: 2000000 }, { sejak: '2026-11-10', batas: 2500000 }, { sejak: '2026-12-01', batas: null }] };
  assert.equal(MM.limitFor(b, MM.cycleFor('2026-10-20', 25)), 2000000);
  assert.equal(MM.limitFor(b, MM.cycleFor('2026-10-29', 25)), 2500000);
  assert.equal(MM.limitFor(b, MM.cycleFor('2026-12-10', 25)), null);
  assert.equal(MM.limitFor(b, MM.cycleFor('2026-09-10', 25)), null);
});

// ---------- data contoh mockup Beranda (29 Okt 2026 19.40) ----------
function dataContoh() {
  const kat = (id, nama, jenis) => ({ id, nama, jenis, ikon: 'i-tag', urutan: 0, arsip: false });
  const categories = [kat('makan', 'Makan & minum', 'keluar'), kat('kopi', 'Jajan & kopi', 'keluar'), kat('transport', 'Transport', 'keluar'),
    kat('belanja', 'Belanja', 'keluar'), kat('tagihan', 'Tagihan & langganan', 'keluar'), kat('hiburan', 'Hiburan', 'keluar'),
    kat('sehat', 'Kesehatan', 'keluar'), kat('gaji', 'Gaji', 'masuk')];
  const bud = (kat, batas, sekali) => ({ id: 'b-' + kat, kat, sekali: !!sekali, riwayat: [{ sejak: '2026-10-25', batas }] });
  const budgets = [bud('makan', 2500000), bud('kopi', 600000), bud('transport', 800000), bud('belanja', 1000000), bud('tagihan', 750000, true), bud('hiburan', 400000)];
  const T = [['2026-10-25T08:00', 'gaji', 8500000, 'masuk'], ['2026-10-25T12:30', 'tagihan', 100000], ['2026-10-25T15:10', 'transport', 44000],
    ['2026-10-25T16:00', 'hiburan', 325000], ['2026-10-25T17:20', 'kopi', 98000], ['2026-10-25T19:00', 'makan', 340000],
    ['2026-10-26T08:05', 'transport', 6000], ['2026-10-26T08:30', 'kopi', 25000], ['2026-10-26T12:15', 'makan', 34000],
    ['2026-10-26T15:40', 'kopi', 18000], ['2026-10-26T17:50', 'transport', 22000], ['2026-10-26T19:30', 'makan', 76000],
    ['2026-10-26T20:15', 'belanja', 75000], ['2026-10-27T19:15', 'sehat', 65000], ['2026-10-27T21:00', 'tagihan', 350000],
    ['2026-10-28T08:10', 'kopi', 41000], ['2026-10-28T12:45', 'makan', 38000], ['2026-10-28T20:30', 'hiburan', 110000],
    ['2026-10-29T07:55', 'kopi', 28000], ['2026-10-29T12:20', 'makan', 32000], ['2026-10-29T18:05', 'transport', 24000]];
  const tx = T.map(([waktu, k, nominal, jenis], i) => ({ id: 't' + i, jenis: jenis || 'keluar', nominal, kat: k, catatan: '', waktu, dibuat: i, dompet: 'utama' }));
  return { settings: { startDay: 25, tol: 10 }, categories, budgets, tx };
}
uji('data contoh: angka Beranda cocok sama mockup', () => {
  const s = dataContoh(), c = MM.cycleFor('2026-10-29', 25), r = MM.summarize(s, c, '2026-10-29');
  assert.equal(r.d, 5); assert.equal(r.N, 31); assert.equal(r.sisaHari, 27);
  assert.deepEqual(r.budgets.map((b) => [b.kat, b.state]), [['hiburan', 'jebol'], ['kopi', 'ngebut'], ['makan', 'agak'], ['transport', 'aman'], ['belanja', 'aman'], ['tagihan', 'aman']]);
  assert.deepEqual(r.hitung, { jebol: 1, ngebut: 1, agak: 1, aman: 3 });
  assert.deepEqual([r.total.B, r.total.T, r.total.state, r.total.jatah, r.total.sisa], [5300000, 1336000, 'agak', 146814, 3964000]);
  assert.deepEqual([r.masuk, r.keluar, r.dalamBudget, r.luarBudget], [8500000, 1851000, 1786000, 65000]);
  const j = Object.fromEntries(r.budgets.map((b) => [b.kat, b.jatah]));
  assert.deepEqual(j, { hiburan: 0, kopi: 14444, makan: 73333, transport: 26074, belanja: 34259, tagihan: null });
  assert.equal(r.budgets.find((b) => b.kat === 'makan').hijauHari, 7);
});
uji('banding siklus lalu di hari yang sama', () => {
  const s = dataContoh(), c = MM.cycleFor('2026-10-29', 25);
  assert.equal(MM.keluarSampaiHari(s, c, 5), 1851000);
  assert.equal(MM.keluarSampaiHari(s, c, 1), 907000);
});

// ---------- format, cadangan, CSV ----------
uji('format rupiah & tanggal', () => {
  assert.equal(MM.rp(146814), 'Rp146.814');
  assert.equal(MM.rp(0), 'Rp0');
  assert.equal(MM.rp(-35000), '−Rp35.000');
  assert.equal(MM.tglHari('2026-10-29'), 'Kam 29 Okt');
  assert.equal(MM.tglPanjang('2026-10-27'), 'Selasa, 27 Okt');
  assert.equal(MM.labelSiklus(MM.cycleFor('2026-10-29', 25)), '25 Okt – 24 Nov');
  assert.equal(MM.labelSiklus(MM.cycleFor('2026-12-31', 31)), '31 Des – 30 Jan 2027');
  assert.equal(MM.jam('2026-10-29T07:55'), '07.55');
});
uji('validasi cadangan: yang sehat lolos, yang rusak ditolak dengan pesan jelas', () => {
  const s = dataContoh();
  assert.ok(MM.validasi({ app: 'catat-duit', versi: 1, data: s }));
  assert.throws(() => MM.validasi({ app: 'lain', data: s }), /bukan file cadangan/);
  const rusak = JSON.parse(JSON.stringify(s)); rusak.tx[0].nominal = 12.5;
  assert.throws(() => MM.validasi({ app: 'catat-duit', data: rusak }), /nominal/);
  const rusak2 = JSON.parse(JSON.stringify(s)); rusak2.tx[0].waktu = '2026-10-25T08:00:00.000Z';
  assert.throws(() => MM.validasi({ app: 'catat-duit', data: rusak2 }), /waktu/);
});
uji('validasi cadangan: id/ikon disusupi kode ditolak atau dinetralkan', () => {
  const s = dataContoh();
  const jahat = JSON.parse(JSON.stringify(s)); jahat.tx[0].id = 'x" onmouseover="alert(1)';
  assert.throws(() => MM.validasi({ app: 'catat-duit', data: jahat }), /id nggak valid/);
  const ikon = JSON.parse(JSON.stringify(s)); ikon.categories[0].ikon = '"/><img src=x onerror=alert(1)>';
  assert.equal(MM.validasi({ app: 'catat-duit', data: ikon }).categories[0].ikon, 'i-tag');
  const dobel = JSON.parse(JSON.stringify(s)); dobel.tx[1].id = dobel.tx[0].id;
  assert.throws(() => MM.validasi({ app: 'catat-duit', data: dobel }), /id dobel/);
  const bud = JSON.parse(JSON.stringify(s)); bud.budgets[0].kat = 'nggak-ada';
  assert.throws(() => MM.validasi({ app: 'catat-duit', data: bud }), /budget yang kategorinya hilang/);
  const bat = JSON.parse(JSON.stringify(s)); bat.budgets[0].riwayat[0].batas = -5;
  assert.throws(() => MM.validasi({ app: 'catat-duit', data: bat }), /Riwayat batas/);
});
uji('CSV buat Excel region Indonesia: titik koma, BOM, kutip, nominal angka, urut waktu', () => {
  const s = dataContoh(); s.tx[1].catatan = 'pulsa "data"; 25rb';
  const out = MM.csv(s), baris = out.split('\r\n');
  assert.equal(out.charCodeAt(0), 0xfeff);
  assert.equal(baris[0].slice(1), '"tanggal";"jam";"jenis";"kategori";"nominal";"catatan"');
  assert.equal(baris[1], '"2026-10-25";"08:00";"masuk";"Gaji";8500000;""');
  assert.equal(baris[2], '"2026-10-25";"12:30";"keluar";"Tagihan & langganan";100000;"pulsa ""data""; 25rb"');
  assert.equal(baris.length, s.tx.length + 2);
});
uji('CSV: catatan yang diawali = + - @ nggak dijalankan Excel sebagai rumus', () => {
  const s = dataContoh();
  s.tx[2].catatan = '=2 porsi'; s.tx[3].catatan = '-diskon 10rb'; s.tx[4].catatan = '+ongkir'; s.tx[5].catatan = '@indomaret';
  const baris = MM.csv(s).split('\r\n');
  assert.ok(baris[3].endsWith(';"\'=2 porsi"'), baris[3]);
  assert.ok(baris[4].endsWith(';"\'-diskon 10rb"'), baris[4]);
  assert.ok(baris[5].endsWith(';"\'+ongkir"'), baris[5]);
  assert.ok(baris[6].endsWith(';"\'@indomaret"'), baris[6]);
});
uji('validasi cadangan: budget dobel/pemasukan, jenis beda kategori, tanggal mustahil ditolak', () => {
  const s = dataContoh(), salin = () => JSON.parse(JSON.stringify(s)), coba = (d) => () => MM.validasi({ app: 'catat-duit', data: d });
  const a = salin(); a.budgets.push({ id: 'b-makan-2', kat: 'makan', sekali: false, riwayat: [{ sejak: '2026-10-25', batas: 2500000 }] });
  assert.throws(coba(a), /dua budget/);
  const b = salin(); b.budgets.push({ id: 'b-gaji', kat: 'gaji', sekali: false, riwayat: [{ sejak: '2026-10-25', batas: 8500000 }] });
  assert.throws(coba(b), /kategori pemasukan/);
  const c = salin(); c.tx[1].jenis = 'masuk';
  assert.throws(coba(c), /jenisnya beda/);
  for (const w of ['2026-10-32T10:00', '2027-02-29T10:00', '2026-13-01T10:00', '2026-10-25T24:00', '2026-10-25T10:60']) {
    const d = salin(); d.tx[1].waktu = w; assert.throws(coba(d), /waktu nggak valid/, w);
  }
  const e = salin(); e.budgets[0].riwayat[0].sejak = '2026-02-30';
  assert.throws(coba(e), /Riwayat batas/);
  assert.ok(MM.validasi({ app: 'catat-duit', data: salin() }), 'yang sehat tetap lolos');
});
uji('versi kode ada (dicek index.html biar nggak kecampur versi pas update)', () => {
  assert.match(MM.VERSI_KODE, /^\d{4}\.\d{2}\.\d{2}-\d+$/);
});

console.log((gagal.length ? 'GAGAL' : 'LULUS') + ' — ' + lulus + ' lulus, ' + gagal.length + ' gagal (TZ=' + (process.env.TZ || 'lokal') + ')');
gagal.forEach((g) => console.log('  ✗ ' + g));
process.exit(gagal.length ? 1 : 0);
