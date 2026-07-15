# Telegram Snowball Pilot Design

## Goal

Menjalankan pengumpulan ulang Telegram sebagai pilot snowball yang terukur, menggunakan fondasi SQLite collection yang sudah ada. Pilot ditujukan untuk meningkatkan cakupan dibanding seed-only collection sambil membatasi noise, duplikasi, dan pertumbuhan antrean.

## Scope

- Hanya channel publik yang dapat diakses melalui kredensial aplikasi milik peneliti.
- Seed channel ditetapkan secara eksplisit dalam konfigurasi, dengan alasan pemilihan yang dicatat.
- Snowball hanya sampai kedalaman 1.
- Maksimum 50 channel diproses dalam satu run.
- Setiap channel dibatasi jumlah pesannya melalui konfigurasi run.
- Data lama tidak dihapus atau ditimpa; pilot memakai database baru `data/interim/telegram_pilot.sqlite`.

## Architecture

`collectors/telegram.py` mengimplementasikan kontrak `Collector` dan mengubah setiap pesan yang valid menjadi `CollectedDocument`. Script `scripts/collect_telegram.py` membuat run, mengorkestrasi antrean channel, lalu menyerahkan penyimpanan, normalisasi, deduplikasi, dan weak label ke `CollectionStorage`.

```text
seed channel publik
  -> queue depth 0
  -> pesan channel
  -> evidence gate
  -> link atau @mention channel publik
  -> queue depth 1
  -> CollectionStorage / telegram_pilot.sqlite
  -> export + audit sampel
```

## Queue and discovery rules

1. Seed dimasukkan ke antrean pada `depth=0`.
2. Setiap pesan valid diperiksa oleh normalizer dan keyword weak label yang sama dengan sumber lain.
3. Channel baru hanya boleh masuk antrean bila pesan yang memuatnya memiliki sedikitnya satu evidence: keyword baseline cocok, URL/contact pattern, atau Unicode-obfuscation flag.
4. Link `t.me/<username>` dan mention `@<username>` menjadi kandidat discovery. Mention tanpa evidence tidak dimasukkan.
5. Kandidat dibersihkan, di-lowercase, dideduplikasi di antrean, dan hanya diproses pada `depth=1`.
6. Saat jumlah channel yang telah diproses mencapai 50, collector menyelesaikan run tanpa mengambil channel tambahan.
7. Queue dan provenance discovery disimpan pada database pilot agar run yang gagal dapat diteruskan tanpa menggandakan dokumen.

## Data and provenance

Setiap dokumen disimpan melalui `CollectionStorage` dengan `platform="telegram"`, `source_type="public_channel_api"`, hash ID pesan/channel bila diperlukan, teks mentah, URL sumber bila tersedia, waktu pesan, dan path snapshot payload opsional.

Metadata pilot tambahan berada pada konfigurasi run dan tabel queue internal: `seed_group`, `found_from_channel`, `found_from_message_id`, `discovery_evidence`, dan `depth`. Weak label tetap bersifat kandidat otomatis: `1` berarti keyword baseline cocok, bukan label manusia final.

## Operational safeguards

- API ID dan API hash hanya dibaca dari `.env`, tidak dari notebook, script, database, atau Git.
- Gunakan satu event loop async dan context-managed client Telethon.
- Tangani `FloodWaitError` dengan menunggu durasi yang diberikan sebelum melanjutkan.
- Catat channel private, username tidak ditemukan, atau error API sebagai status per channel; kegagalan satu channel tidak membatalkan keseluruhan run.
- Jalankan terlebih dahulu dengan batas kecil untuk memvalidasi konfigurasi dan queue; tingkatkan batas hanya setelah audit hasil.

## Verification

Unit tests harus mencakup ekstraksi link/mention, evidence gate, batas depth, batas 50 channel, deduplikasi antrean, dan pemetaan pesan menjadi `CollectedDocument` tanpa koneksi Telegram.

Integration test memakai fake async client untuk membuktikan: seed menghasilkan kandidat depth 1 yang memenuhi evidence, tidak melampaui limit, menyimpan run dan dokumen ke SQLite, serta melanjutkan setelah error channel yang dapat dipulihkan.

Manual pilot verification:

1. Jalankan mode dry-run dengan seed dan limit kecil tanpa menulis pesan.
2. Jalankan pengumpulan kecil dengan kredensial lokal.
3. Ekspor dokumen.
4. Audit sampel `weak_label=1` dan provenance channel baru sebelum menaikkan limit.

## Deferred

- Snowball depth lebih dari 1.
- Pengambilan grup privat atau konten yang memerlukan akses khusus.
- Otomatisasi anotasi manusia.
- Peningkatan batas channel di atas 50 sebelum audit pilot.
