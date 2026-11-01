# Aturan buat agen AI yang ngerjain repo ini

App catat duit pribadi (PWA). Satu `index.html` + `engine.js`, tanpa framework, tanpa server, tanpa akun.
Data cuma di localStorage HP pemakainya. Bahasa UI & komentar kode: Indonesia santai.

## Wajib

- **Tiap ubah `index.html` / `engine.js` / `sw.js` → naikin versi di 3 tempat sekaligus**, dengan nilai yang sama:
  `VERSI_KODE` di `engine.js`, `VERSI_DIMINTA` + `engine.js?v=` di `index.html`, `VERSI` di `sw.js`.
  Format `YYYY.MM.DD-n`. Lupa = HP tetap nyajiin versi lama (service worker cache-first) atau app nolak jalan.
- **Jalanin tes sebelum bilang selesai:** `npm test` (mesin 48 + alur 44). Tambah tes buat tiap perilaku baru.
- **Logika status budget jangan diubah diam-diam.** Urutan cek (bilangan bulat, persis satu cabang kena):
  terpakai > batas → Jebol · budget "dibayar sekali" → Aman · lebih cepat dari waktu > toleransi → Ngebut ·
  lebih cepat 0 s/d toleransi → Agak ngebut · selain itu → Aman. Persen waktu = hari ke- ÷ jumlah hari siklus (hari ini dihitung penuh).
- **Waktu disimpan sebagai jam dinding lokal** `YYYY-MM-DDTHH:mm` (`MM.stamp`). Jangan `toISOString()`: 00.00–06.59 WIB jatuh ke kemarin.
- **Bentuk data (`mm.v1`) berubah → naikin `VERSI` data + migrasi + `validasi()` ikut diperbarui.** Cadangan lama harus tetap bisa dipulihkan.
- **Jangan nulis localStorage tanpa cek `mm.v1.rev`.** Di Android, tab Chrome dan app terpasang berbagi data.
- **Service worker cuma boleh hapus cache berawalan `catat-duit-`.**

## Tampilan

- Font Poppins (400/500/600/700) + fallback sistem. Teks isi 20px maks, isian ≥ 16px (biar iPhone nggak nge-zoom), tombol ≥ 40px.
- Dua tema: terang (latar putih) & gelap (Atur → Tampilan: Ikuti HP / Terang / Gelap, bawaan ikut HP).
  Warna **cuma lewat token** `:root` — jangan ngarang warna baru, jangan tulis warna langsung (`#fff`) kecuali di atas ungu/merah.
  Token gelap ada di **dua blok** (media query + `[data-tema="gelap"]`): ubah satu = ubah dua-duanya.
  Tes kontras otomatis (tulisan ≥ 4,5:1) wajib lulus di dua tema. Pilihan tema = `mm.v1.tema`, di luar data (nggak ikut cadangan).
  Agak ngebut = oranye `#b45309` (gelap `#e08a24`; kuning gagal kontras). Jebol = merah `#d92626`.
- Ikon: SVG garis lewat `<symbol>` + `<use>`. **Nol emoji.**
- Animasi halus + wajib hormatin `prefers-reduced-motion`. Semua layar dicek di lebar 360px, nol geser samping.

## Jangan dibikin (sengaja)

Login, sinkron cloud, server, PIN, notifikasi push, library/framework tambahan.

## Peta cepat

`index.html` (semua layar) · `engine.js` (hitungan murni, dipakai app + tes) · `sw.js` · `manifest.webmanifest` ·
`tests/` · `tools/serve-app.mjs` (`npm start` → http://localhost:8830/) · `tools/ikon.py` (bikin ulang ikon).
Ngetes tanggal tertentu: tambah `?jam=2026-11-24T23:59` di alamat. Status lengkap: `README.md`.
