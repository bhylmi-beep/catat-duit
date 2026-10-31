"""Bikin ikon PNG Catat Duit tanpa library luar: latar ungu #8b3cdd + batang budget dengan garis "hari ini".

Jalankan dari folder app:  python3 tools/ikon.py
Hasil ditulis ke folder app (satu tingkat di atas berkas ini): ikon-192.png, ikon-512.png, ikon-maskable-512.png, apple-touch-icon.png
"""
import struct
import zlib
from pathlib import Path

UNGU = (0x8B, 0x3C, 0xDD)
PUTIH = (0xFF, 0xFF, 0xFF)
GELAP = (0x16, 0x1D, 0x27)
SS = 4  # supersampling per sisi


def campur(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def dalam_pil(x, y, x0, x1, cy, h):
    """titik (x,y) di dalam bentuk pil horizontal [x0,x1] setinggi h, tengah cy"""
    r = h / 2
    if abs(y - cy) > r:
        return False
    if x0 + r <= x <= x1 - r:
        return True
    cx = x0 + r if x < x0 + r else x1 - r
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def piksel(n, u, v, skala):
    """warna di koordinat normal (u,v) 0..1; skala = ukuran glyph relatif kanvas"""
    m = (1 - skala) / 2
    x0, x1 = m + 0.04 * skala, 1 - m - 0.04 * skala
    cy, h = 0.5, 0.15 * skala
    isi = x0 + (x1 - x0) * 0.46
    garis_x, garis_w, garis_h = x0 + (x1 - x0) * 0.62, 0.045 * skala, 0.40 * skala
    if abs(u - garis_x) <= garis_w / 2 and abs(v - cy) <= garis_h / 2:
        return GELAP
    if dalam_pil(u, v, x0, x1, cy, h):
        if u <= isi or dalam_pil(u, v, x0, isi, cy, h):
            return PUTIH
        return campur(UNGU, PUTIH, 0.32)
    return UNGU


def gambar(n, skala):
    baris = bytearray()
    for py in range(n):
        baris.append(0)  # filter: none
        for px in range(n):
            acc = [0, 0, 0]
            for sy in range(SS):
                for sx in range(SS):
                    c = piksel(n, (px + (sx + 0.5) / SS) / n, (py + (sy + 0.5) / SS) / n, skala)
                    acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]
            baris.extend(round(a / (SS * SS)) for a in acc)
    return bytes(baris)


def png(n, data):
    def chunk(tag, isi):
        return struct.pack('>I', len(isi)) + tag + isi + struct.pack('>I', zlib.crc32(tag + isi) & 0xFFFFFFFF)
    ihdr = struct.pack('>IIBBBBB', n, n, 8, 2, 0, 0, 0)  # RGB 8-bit
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(data, 9)) + chunk(b'IEND', b'')


def main():
    out = Path(__file__).resolve().parent.parent
    for nama, n, skala in [('ikon-192.png', 192, 0.86), ('ikon-512.png', 512, 0.86),
                           ('ikon-maskable-512.png', 512, 0.66), ('apple-touch-icon.png', 180, 0.86)]:
        (out / nama).write_bytes(png(n, gambar(n, skala)))
        print('ditulis', nama, n, 'px')


if __name__ == '__main__':
    main()
