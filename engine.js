/* ============================================================
   Mesin hitung Catat Duit — fungsi murni, tanpa DOM.
   Dipakai app (window.MM) dan tes Node (require('./engine.js')).

   Aturan yang dikunci di RENCANA-App-Money-Manager.html:
   - Tanggal = string kalender 'YYYY-MM-DD'; selisih hari pakai nomor hari UTC,
     jadi zona waktu & DST nggak pernah ikut campur.
   - Waktu transaksi = jam dinding HP 'YYYY-MM-DDTHH:mm' (bukan UTC).
   - Nominal = bilangan bulat rupiah; status dihitung pakai perkalian bulat.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MM = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const pad = (n) => String(n).padStart(2, '0');
  const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const HARI_PANJANG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  // ---------- kalender ----------
  /** jumlah hari di bulan m (1..12) tahun y — kabisat ikut aturan 4/100/400 */
  function dim(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function dayNum(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / 86400000); }
  function fromDayNum(n) {
    const t = new Date(n * 86400000);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }
  function ymd(o) { return o.y + '-' + pad(o.m) + '-' + pad(o.d); }
  function parseYmd(s) {
    const p = String(s).slice(0, 10).split('-').map(Number);
    return { y: p[0], m: p[1], d: p[2] };
  }
  function numOf(s) { const o = parseYmd(s); return dayNum(o.y, o.m, o.d); }
  function strOf(n) { return ymd(fromDayNum(n)); }
  function addDays(s, k) { return strOf(numOf(s) + k); }
  function addMonth(y, m, k) {
    const t = y * 12 + (m - 1) + k;
    return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 + 1 };
  }
  /** tanggal mulai siklus di bulan (y, m): tanggal S, dijepit ke hari terakhir kalau bulannya lebih pendek */
  function startIn(y, m, S) { return { y, m, d: Math.min(S, dim(y, m)) }; }

  // ---------- siklus ----------
  /** Siklus yang memuat tanggal X. Hasil: start (inklusif), end (eksklusif), last, N hari, a/b = nomor hari */
  function cycleFor(dateStr, S) {
    const x = parseYmd(dateStr);
    let st = startIn(x.y, x.m, S);
    if (x.d < st.d) { const p = addMonth(x.y, x.m, -1); st = startIn(p.y, p.m, S); }
    const nx = addMonth(st.y, st.m, 1);
    const next = startIn(nx.y, nx.m, S);
    const a = dayNum(st.y, st.m, st.d), b = dayNum(next.y, next.m, next.d);
    return { start: ymd(st), end: ymd(next), last: strOf(b - 1), N: b - a, a, b };
  }
  const prevCycle = (c, S) => cycleFor(strOf(c.a - 1), S);
  const nextCycle = (c, S) => cycleFor(c.end, S);
  /** hari ke- (1..N) untuk siklus berjalan; siklus lewat = N, siklus depan = 0 */
  function dayIndex(c, todayStr) { return Math.max(0, Math.min(c.N, numOf(todayStr) - c.a + 1)); }
  /** transaksi masuk siklus ⟺ start ≤ tanggalnya < end. Jam diabaikan. */
  function inCycle(waktu, c) { const t = String(waktu).slice(0, 10); return t >= c.start && t < c.end; }

  // ---------- waktu lokal ----------
  /** jam dinding HP saat ini, 'YYYY-MM-DDTHH:mm' — sengaja tanpa toISOString (itu UTC) */
  function stamp(dt) {
    return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()) +
      'T' + pad(dt.getHours()) + ':' + pad(dt.getMinutes());
  }
  const localDate = (dt) => stamp(dt).slice(0, 10);

  // ---------- status batang ----------
  // Dicek berurutan; tiap budget jatuh ke tepat satu status.
  //   jebol  : T > B
  //   aman   : budget "dibayar sekali" yang belum lewat batas
  //   ngebut : selisih > tol poin   ⟺ 100·N·T > B·(100·d + tol·N)
  //   agak   : selisih > 0          ⟺ N·T > d·B
  //   aman   : selain itu
  const URUTAN = { jebol: 0, ngebut: 1, agak: 2, aman: 3 };
  function budgetState(o) {
    const T = o.T, B = o.B, d = o.d, N = o.N, tol = o.tol == null ? 10 : o.tol;
    if (!(B > 0)) return T > 0 ? 'jebol' : 'aman';
    if (T > B) return 'jebol';
    if (o.sekali) return 'aman';
    if (100 * N * T > B * (100 * d + tol * N)) return 'ngebut';
    if (N * T > d * B) return 'agak';
    return 'aman';
  }
  /** jatah aman per hari = sisa ÷ sisa hari; hari ini ikut dihitung */
  function jatahPerHari(T, B, d, N) {
    const left = N - d + 1;
    return left > 0 ? Math.floor(Math.max(0, B - T) / left) : 0;
  }
  /** hari ke- pertama statusnya balik aman kalau nggak nambah belanja (null kalau udah jebol) */
  function balikHijau(T, B, N) {
    if (!(B > 0) || T > B) return null;
    return Math.max(1, Math.floor((N * T + B - 1) / B));
  }
  /** persen buat tampilan: dibulatkan biasa, tapi 100% cuma kalau pas habis (99,6% tetap 99%, lewat 0,4% tetap 101%) */
  function persen(T, B) {
    if (!(B > 0)) return 0;
    const p = Math.round((100 * T) / B);
    return T < B ? Math.min(99, p) : T === B ? 100 : Math.max(101, p);
  }

  // ---------- budget & riwayat batas ----------
  /** batas yang berlaku di siklus c = entri terakhir yang sejak < c.end; null = budget belum ada / dihapus */
  function limitFor(budget, c) {
    let b = null;
    for (const r of budget.riwayat || []) if (r.sejak < c.end) b = r.batas;
    return b;
  }

  // ---------- ringkasan siklus ----------
  /**
   * state: { settings:{startDay, tol}, categories:[...], budgets:[...], tx:[...] }
   * Hasil: angka untuk Beranda / Laporan / Detail — semua dihitung dari transaksi, tidak ada yang disimpan.
   */
  function summarize(state, c, todayStr) {
    const S = state.settings.startDay, tol = state.settings.tol;
    const d = dayIndex(c, todayStr);
    const tx = state.tx.filter((t) => inCycle(t.waktu, c));
    const perKat = {};
    let masuk = 0, keluar = 0;
    for (const t of tx) {
      if (t.jenis === 'masuk') { masuk += t.nominal; continue; }
      keluar += t.nominal;
      perKat[t.kat] = (perKat[t.kat] || 0) + t.nominal;
    }
    const budgets = [];
    for (const b of state.budgets) {
      const B = limitFor(b, c);
      if (B == null) continue;
      const T = perKat[b.kat] || 0;
      const st = budgetState({ T, B, d, N: c.N, sekali: !!b.sekali, tol });
      budgets.push({
        id: b.id, kat: b.kat, sekali: !!b.sekali, B, T, state: st,
        pct: persen(T, B), jatah: b.sekali ? null : jatahPerHari(T, B, d, c.N),
        hijauHari: st === 'agak' || st === 'ngebut' ? balikHijau(T, B, c.N) : null,
      });
    }
    budgets.sort((x, y) => (URUTAN[x.state] - URUTAN[y.state]) || (x.sekali - y.sekali) ||
      ((y.T * x.B - x.T * y.B)) || (x.kat < y.kat ? -1 : 1));
    const katBudget = new Set(budgets.map((b) => b.kat));
    const dalam = budgets.reduce((s, b) => s + b.T, 0);
    const rit = budgets.filter((b) => !b.sekali);
    const V = rit.reduce((s, b) => s + b.B, 0), TV = rit.reduce((s, b) => s + b.T, 0);
    const total = V > 0 ? {
      B: V, T: TV, state: budgetState({ T: TV, B: V, d, N: c.N, tol }),
      jatah: jatahPerHari(TV, V, d, c.N), sisa: V - TV,
    } : null;
    const hitung = { jebol: 0, ngebut: 0, agak: 0, aman: 0 };
    budgets.forEach((b) => { hitung[b.state]++; });
    return {
      cycle: c, d, N: c.N, waktuPct: c.N ? (100 * d) / c.N : 0, sisaHari: Math.max(0, c.N - d + 1),
      masuk, keluar, perKat, budgets, total, hitung,
      dalamBudget: dalam, luarBudget: keluar - dalam,
      luarKat: Object.keys(perKat).filter((k) => !katBudget.has(k)), jumlahTx: tx.length,
    };
  }
  /** total keluar di siklus c sampai hari ke-d (buat banding siklus lalu "di hari yang sama") */
  function keluarSampaiHari(state, c, d) {
    const batas = strOf(c.a + d);  // eksklusif
    return state.tx.reduce((s, t) => (t.jenis === 'keluar' && inCycle(t.waktu, c) && t.waktu.slice(0, 10) < batas ? s + t.nominal : s), 0);
  }

  // ---------- format ----------
  function rp(n) {
    const v = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (n < 0 ? '−' : '') + 'Rp' + v;
  }
  function tglPendek(s) { const o = parseYmd(s); return o.d + ' ' + BULAN[o.m - 1]; }
  function tglHari(s) { const n = numOf(s); const o = fromDayNum(n); return HARI[new Date(n * 86400000).getUTCDay()] + ' ' + o.d + ' ' + BULAN[o.m - 1]; }
  function tglPanjang(s) { const n = numOf(s); const o = fromDayNum(n); return HARI_PANJANG[new Date(n * 86400000).getUTCDay()] + ', ' + o.d + ' ' + BULAN[o.m - 1]; }
  function jam(waktu) { return String(waktu).slice(11, 16).replace(':', '.'); }
  function labelSiklus(c) {
    const a = parseYmd(c.start), z = parseYmd(c.last);
    return tglPendek(c.start) + ' – ' + tglPendek(c.last) + (a.y !== z.y ? ' ' + z.y : '');
  }

  // ---------- data ----------
  const VERSI = 1;               // versi bentuk data (cadangan)
  const VERSI_KODE = '2026.11.01-1';  // wajib sama dengan yang diminta index.html, biar nggak kecampur versi pas update
  /** 'YYYY-MM-DD' yang tanggalnya beneran ada di kalender (nolak 2026-10-32, 2027-02-29) */
  function tanggalAsli(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
    return !!m && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= dim(+m[1], +m[2]);
  }
  function waktuAsli(s) {
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(String(s));
    return !!m && tanggalAsli(m[1]) && +m[2] < 24 && +m[3] < 60;
  }
  /** cek bentuk data cadangan sebelum dipulihkan; lempar Error berbahasa manusia kalau rusak */
  function validasi(data) {
    const salah = (m) => { throw new Error(m); };
    if (!data || typeof data !== 'object') salah('Isinya bukan data cadangan.');
    if (data.app !== 'catat-duit') salah('Ini bukan file cadangan Catat Duit.');
    const s = data.data;
    if (!s || !s.settings || !Array.isArray(s.categories) || !Array.isArray(s.budgets) || !Array.isArray(s.tx)) salah('Bagian datanya nggak lengkap.');
    const S = s.settings.startDay;
    if (!(Number.isInteger(S) && S >= 1 && S <= 31)) salah('Tanggal mulai siklus di cadangan nggak valid.');
    // id & ikon masuk ke atribut HTML: wajib pola aman + unik (cadangan bisa aja diutak-atik)
    const ID = /^[A-Za-z0-9_-]{1,40}$/, IKON = /^[ci]-[a-z]{2,20}$/, TGL = /^\d{4}-\d{2}-\d{2}$/;
    const unik = (arr, apa) => { const set = new Set(); for (const x of arr) { if (!x || !ID.test(String(x.id))) salah('Ada ' + apa + ' dengan id nggak valid.'); if (set.has(x.id)) salah('Ada ' + apa + ' dengan id dobel.'); set.add(x.id); } return set; };
    const ids = unik(s.categories, 'kategori');
    unik(s.budgets, 'budget');
    unik(s.tx, 'transaksi');
    for (const k of s.categories) {
      if (typeof k.nama !== 'string' || !k.nama.trim()) salah('Ada kategori tanpa nama.');
      if (k.jenis !== 'keluar' && k.jenis !== 'masuk') salah('Ada kategori dengan jenis nggak valid.');
      if (!IKON.test(String(k.ikon))) k.ikon = 'i-tag';
      if (!Number.isFinite(k.urutan)) k.urutan = 0;
    }
    const jenisKat = {}; s.categories.forEach((k) => { jenisKat[k.id] = k.jenis; });
    const katBudget = new Set();
    for (const b of s.budgets) {
      if (!ids.has(b.kat)) salah('Ada budget yang kategorinya hilang.');
      if (jenisKat[b.kat] !== 'keluar') salah('Ada budget di kategori pemasukan.');
      if (katBudget.has(b.kat)) salah('Ada dua budget buat satu kategori.');
      katBudget.add(b.kat);
      if (!Array.isArray(b.riwayat)) salah('Riwayat batas budget rusak.');
      for (const r of b.riwayat) if (!r || !tanggalAsli(r.sejak) || !(r.batas === null || (Number.isInteger(r.batas) && r.batas > 0))) salah('Riwayat batas budget rusak.');
    }
    for (const t of s.tx) {
      if (!Number.isInteger(t.nominal) || t.nominal <= 0) salah('Ada transaksi dengan nominal nggak valid.');
      if (!waktuAsli(t.waktu)) salah('Ada transaksi dengan waktu nggak valid.');
      if (!ids.has(t.kat)) salah('Ada transaksi yang kategorinya hilang.');
      if (t.jenis !== 'keluar' && t.jenis !== 'masuk') salah('Ada transaksi dengan jenis nggak valid.');
      if (t.jenis !== jenisKat[t.kat]) salah('Ada transaksi yang jenisnya beda sama kategorinya.');
      if (t.catatan != null && typeof t.catatan !== 'string') salah('Ada catatan transaksi yang rusak.');
    }
    const tol = s.settings.tol;
    if (tol != null && !(Number.isInteger(tol) && tol >= 1 && tol <= 50)) salah('Toleransi di cadangan nggak valid.');
    return s;
  }
  function csv(state) {
    const nama = {}; state.categories.forEach((k) => { nama[k.id] = k.nama; });
    // Excel di Mac/Windows region Indonesia (desimal koma) baca CSV pakai titik koma.
    // Teks yang diawali = + - @ dikasih apostrof biar nggak dijalankan Excel sebagai rumus.
    const q = (v) => { let t = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };
    const SEP = ';';
    const rows = [['tanggal', 'jam', 'jenis', 'kategori', 'nominal', 'catatan'].map(q).join(SEP)];
    [...state.tx].sort((a, b) => (a.waktu < b.waktu ? -1 : a.waktu > b.waktu ? 1 : a.dibuat - b.dibuat)).forEach((t) => {
      rows.push([q(t.waktu.slice(0, 10)), q(t.waktu.slice(11, 16)), q(t.jenis), q(nama[t.kat] || t.kat), String(t.nominal), q(t.catatan || '')].join(SEP));
    });
    return '﻿' + rows.join('\r\n') + '\r\n';
  }

  return {
    VERSI_KODE, pad, dim, dayNum, fromDayNum, ymd, parseYmd, numOf, strOf, addDays, cycleFor, prevCycle, nextCycle, dayIndex, inCycle,
    stamp, localDate, budgetState, jatahPerHari, balikHijau, persen, limitFor, summarize, keluarSampaiHari,
    rp, tglPendek, tglHari, tglPanjang, jam, labelSiklus, validasi, csv, VERSI, URUTAN, HARI, BULAN,
  };
});
