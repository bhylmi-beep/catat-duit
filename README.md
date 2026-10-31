# Catat Duit — app money manager di HP

Catat pengeluaran satu tangan. Batang budgetnya ikut jalan sama tanggal, jadi kalau bulan ini kebablasan,
ketahuan dari minggu pertama. Rencana lengkap + alasan tiap keputusan ada di dokumen rencana (`RENCANA-App-Money-Manager.html`, di luar repo ini).
Aturan buat agen AI yang ngerjain repo ini: `AGENTS.md`.

## Status (31 Oktober 2026)

| Langkah | Isi | Status |
|---|---|---|
| 1 | Mesin hitung + tes otomatis | **jadi** — 48 tes lulus, sama hasilnya di 4 zona waktu |
| 2 | Layar inti di lebar HP | **jadi** — 46 tes alur lulus (360–412 px) |
| — | Kategori spesifik buat budget (permintaan Bay 30 Okt) | **jadi** — 15 saran tinggal centang + tulis sendiri, di langkah awal & layar Budget |
| — | Review independen 3 sudut (hitungan, HP/UX, keamanan data) | **beres** — 21 temuan, semua dibetulin + dikasih tes |
| 3 | Jadi app di HP lu (hosting https + pasang ke layar utama) | **online** di `https://bhylmi-beep.github.io/catat-duit/`; pemasangan dan cek di HP Bay belum diverifikasi |
| 4 | Lu pakai 1–2 minggu | belum |
| 5 | Fase 2: favorit, transaksi rutin, pengingat kalender | belum |

Laporan per siklus yang di rencana masuk Fase 2 **udah ikut dibikin** versi dasarnya.

## Alurnya

```
  + (tengah bawah) ──→ jam & tanggal terekam saat diketuk
        │
        ├─ ketik nominal (papan angka sendiri, ada 000)
        ├─ ketuk kategori
        └─ Simpan ──→ batang budget langsung gerak ──→ 5 detik bisa "Urungkan"

  Tiap budget:  terpakai % vs waktu % (hari ke- ÷ jumlah hari siklus)
        ├─ terpakai > 100%            → Jebol
        ├─ budget "dibayar sekali"    → Aman (Belum dibayar / Sisa / Lunas)
        ├─ lebih cepat > 10 poin      → Ngebut
        ├─ lebih cepat 0–10 poin      → Agak ngebut
        └─ sama / lebih lambat        → Aman
```

## Nyoba sekarang di laptop

Dari folder ini:

```bash
npm start
```

Lalu buka http://localhost:8830/ di Chrome. (Tanpa npm juga bisa: `node tools/serve-app.mjs`.) Data di laptop **terpisah** dari data di HP nanti.
Buat ngetes tanggal tertentu tanpa nunggu: tambah `?jam=2026-11-24T23:59` di alamat.

## Susunan berkas

| Berkas | Isinya |
|---|---|
| `index.html` | Semua layar + alur app. Satu berkas, tanpa framework |
| `engine.js` | Mesin hitung murni (siklus, status, jatah, laporan, cadangan, CSV) — dipakai app **dan** tes |
| `sw.js` | Service worker: satu rilis = satu salinan utuh di HP, biar kebuka tanpa internet dan nggak kecampur versi |
| `manifest.webmanifest` | Nama, warna, ikon — yang bikin bisa "dipasang" |
| `ikon-*.png`, `apple-touch-icon.png` | Ikon. Dibikin ulang: `npm run ikon` |
| `tools/serve-app.mjs` | Server lokal buat nyoba di laptop (`npm start`) |
| `package.json` | Perintah `npm start` / `npm test`; satu-satunya dependensi = Playwright buat tes |
| `.nojekyll` | Biar GitHub Pages nyajiin berkas apa adanya |
| `AGENTS.md` | Aturan buat agen AI (versi, tes, logika yang nggak boleh diubah diam-diam) |
| `tests/engine.test.cjs` | 48 tes mesin hitung |
| `tests/ui.spec.cjs` | 46 tes alur di HP pakai jam palsu (Playwright + Chrome) |

**Tiap rilis:** naikkan versi di tiga tempat sekaligus — `VERSI_KODE` di `engine.js`, `VERSI_DIMINTA` + `engine.js?v=` di
`index.html`, dan `VERSI` di `sw.js`. Kalau beda, app nolak jalan dan minta muat ulang (sengaja, biar nggak setengah-setengah).

## Tes

Dari folder ini. Sekali aja di awal: `npm install` (Playwright). Tes alur pakai Google Chrome di Mac kalau ada;
kalau nggak ada, jalanin dulu `npx playwright install chromium`.

```bash
npm test
```

Cuma mesin hitung (tanpa Playwright, cepat):

```bash
npm run test:mesin
```

| Yang diuji | Hasil |
|---|---|
| Siklus tanggal 1/15/25/29/30/31, Februari 2027 & 2028, tahun 2100, lintas tahun | 22 kasus + 31 tanggal mulai × 5 tahun nyambung tanpa celah |
| Status tepat di garis (Rp500.000 vs Rp500.001, dst.) + 20.000 titik acak | bilangan bulat, nggak meleset |
| Kalimat status di garis batas | searah warnanya ("10,1 poin — lewat toleransi 10") |
| Beranda = mockup rencana (jatah Rp146.814, urutan warna) | cocok |
| Form dibuka 23.59, disimpan 00.01 / app kebuka lewat tengah malam | tanggal & garis bener |
| Tanggal masa depan | ditolak |
| Refresh tanggal 25 | rekap siklus lalu muncul sekali, data lama utuh |
| Arsip kategori di tengah siklus | budgetnya jalan sampai akhir siklus; "Pakai lagi" ngebalikin |
| Toast "Urungkan" + buka lembar baru / Simpan kepencet 2x | nggak ada transaksi kebatal diam-diam |
| Tombol kembali HP (langkah awal, Kategori baru dari Catat, panah kembali) | mundur selangkah, nggak muter-muter |
| **Dua jendela (Android: tab + app terpasang)** | nggak saling timpa; jendela basi dimuat ulang |
| Cadangan → pulihkan / cadangan rusak / diutak-atik (id, ikon, budget dobel, tanggal mustahil) | balik persis / ditolak dengan pesan jelas |
| "Balikin data sebelum pulihkan terakhir" | jalan, salinannya dibuang sesudahnya |
| CSV | titik koma (Excel region Indonesia), teks = + − @ nggak jadi rumus |
| Memori HP penuh pas nyimpen | perubahan dibatalin, pesan merah |
| index.html & engine.js beda versi | app nolak jalan, minta muat ulang |
| Service worker | cuma ngehapus cache miliknya sendiri |
| Semua layar 360 px (termasuk 3 langkah awal + spanduk) | nol geser samping, tombol ≥ 40 px, teks ≥ 14 px, isian ≥ 16 px |
| Mode pesawat sesudah sekali dibuka | app tetap kebuka |

## Soal data — baca ini

- Data cuma ada di **HP itu** (localStorage, kunci `mm.v1`). Nggak ada server, nggak ada akun.
- **iPhone:** data di ikon layar utama ≠ data di tab Safari. Pasang dulu, baru mulai nyatet.
- **Android:** tab Chrome dan app terpasang **berbagi data**. App udah dijaga biar nggak saling timpa, tapi tetap: buka dari ikon aja.
- **Ikon dihapus = anggap data ikut hilang.** Simpan cadangan tiap minggu (app ngingetin kalau udah 7 hari).
- Cadangan di iPhone lewat menu Bagikan → Files / Drive / WA ke diri sendiri. Di Android keunduh ke Downloads.
- Sebelum pulihkan, data lama disalin (`mm.v1.sebelum-pulih`, kedaluwarsa 7 hari) dan bisa dibalikin dari lembar Pulihkan.

## Soal hosting

Rumahnya: GitHub Pages di akun pribadi Bay → `https://bhylmi-beep.github.io/catat-duit/` (repo publik, data tetap di HP).

**Pintasan Android:** setelah app terpasang lewat Chrome, tekan lama ikon Catat Duit → **Catat pengeluaran**.
Pintasan ini langsung membuka form pengeluaran; ini menu pintasan app, bukan widget Android.
Tautan langsungnya: `https://bhylmi-beep.github.io/catat-duit/?aksi=keluar#beranda`.
Kalau app sudah terpasang sebelum pintasan dirilis, Chrome bisa butuh waktu untuk memperbarui menu pintasan.
Jangan hapus app hanya untuk memaksa pembaruan sebelum cadangan data aman.

GitHub Pages di `<akun>.github.io/<repo>` **berbagi satu alamat (origin) dengan semua repo Pages lain di akun itu**:
app lain di akun yang sama bisa baca atau bahkan ngapus data duit di HP. Dicek 30 Okt 2026: akun `bhylmi-beep`
belum punya satu pun situs Pages, jadi aman. **Aturannya: jangan nyalain Pages di repo lain akun ini.**
Kalau suatu hari perlu, pindahin Catat Duit dulu ke rumah sendiri (organisasi GitHub / Netlify) lewat cadangan → pulihkan.

## Kategori spesifik

Selain 8 kategori bawaan, ada **15 saran** yang tinggal dicentang: Bensin, Parkir & tol, Kos / sewa, Listrik & air,
Pulsa & internet, Cicilan, Belanja bulanan, Skincare & perawatan, Baju, Olahraga, Kursus & buku, Liburan,
Hadiah & kondangan, Tabungan (pengeluaran), Sampingan (pemasukan). Yang tagihan otomatis "dibayar sekali".
Bisa juga nulis sendiri. Tempatnya: langkah 2 pas pertama buka, **Atur → Budget → Kategori spesifik** (langsung lanjut
isi batas), atau Atur → Kategori.

## Yang belum ada

Favorit sekali ketuk, transaksi rutin (gaji/kos), pengingat nyatet lewat kalender (.ics), dompet terpisah.
Sengaja nggak dibikin: login/sinkron cloud, PIN, notifikasi push.
