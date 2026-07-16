# Panduan Collector X

Collector X mengambil sampel post dari hasil pencarian **Terbaru** melalui satu
profil Chromium khusus riset. Respons pencarian yang memang dimuat browser
dipetakan ke fondasi `collection` yang sama dengan Telegram dan YouTube.

Hasil X disimpan pada file SQLite terpisah secara default,
`data/interim/x_latest_pilot.sqlite`, tetapi memakai tabel `documents` dan
`collection_runs` yang sama. Oleh karena itu hasilnya dapat diekspor dengan
script export dataset yang sama.

## Persiapan sekali

Playwright Chromium sudah termasuk dalam lingkungan proyek. Bila browser belum
ada pada mesin baru, jalankan:

```powershell
uv run --no-cache playwright install chromium
```

Profil browser disimpan lokal di `data/browser-profiles/x-research/`. Direktori
ini diabaikan Git dan tidak boleh disalin, dibagikan, atau di-commit.

## Login pertama (wajib sekali)

Siapkan sesi sebelum melakukan collection:

```powershell
uv run --no-cache python scripts/login_x.py
```

Chromium akan terbuka memakai profil khusus riset. Login sendiri bila diperlukan.
Setelah selesai, kembali ke terminal dan tekan Enter. Script memverifikasi bahwa
Anda tidak lagi berada di halaman login, lalu menutup browser dengan bersih agar
sesi tersimpan pada profil lokal. Collector berikutnya memakai profil yang sama.

## Periksa konfigurasi tanpa membuka browser

```powershell
uv run --no-cache python scripts/collect_x.py `
  --query-file configs/x_queries.json `
  --dry-run
```

Query aktif berada di `configs/x_queries.json`; hanya item dengan
`"enabled": true` yang digunakan.

## Bounded pilot

```powershell
uv run --no-cache python scripts/collect_x.py `
  --query-file configs/x_queries.json `
  --database data/interim/x_latest_pilot.sqlite `
  --max-posts 100 `
  --max-scrolls 30 `
  --no-progress-limit 3 `
  --candidate-only `
  --language-filter strict
```

Collector membuka URL pencarian dengan `f=live`, mengamati respons
SearchTimeline yang dimuat halaman, lalu scroll bertahap. Ia tidak membangun
atau memanggil ulang endpoint internal X. `--headless` tersedia sebagai opt-in,
tetapi gunakan mode tampilan browser untuk login awal dan audit pilot.

## Batas dan penghentian

| Opsi | Default | Makna |
| --- | ---: | --- |
| `--max-posts` | 100 | Batas post teramati per query. |
| `--max-scrolls` | 30 | Batas scroll per query. |
| `--no-progress-limit` | 3 | Berhenti setelah sejumlah scroll berturut-turut tanpa post baru. |
| `--scroll-interval-ms` | 1500 | Jeda setelah setiap scroll. |
| `--login-timeout-seconds` | 300 | Waktu tunggu login manual pada mode tampilan browser. |
| `--headless` | mati | Jalankan tanpa tampilan browser setelah sesi sudah siap. |

Collector berhenti dengan status `max_posts`, `max_scrolls`, `no_new_posts`,
`authentication_required`, atau `access_challenge`. Jika muncul
`authentication_required`, tutup collector lalu jalankan `scripts/login_x.py`
untuk memperbarui sesi sebelum mencoba lagi. Collector tidak menunggu login dan
tidak menggunakan rotasi akun maupun bypass akses.

## Penyimpanan dan filtering

Raw respons JSON tersimpan lokal di `data/raw/x/<run_id>/` dan ditautkan melalui
`raw_payload_path`; direktori ini diabaikan Git. Setiap post diteruskan ke
normalisasi Unicode, filter bahasa Indonesia, filter kandidat keyword,
deduplikasi exact/near-duplicate, dan SQLite bersama.

Terminal menampilkan scroll, jumlah respons, post teramati, post yang disimpan,
non-kandidat, non-Indonesia, duplikat, dan alasan berhenti. Tabel
`x_query_runs` menyimpan ringkasan tiap query.

Hasilnya adalah sampel bounded dari hasil pencarian Terbaru, bukan arsip lengkap
atau historis X.

## Export

```powershell
uv run --no-cache python -m scripts.export_dataset `
  --database data/interim/x_latest_pilot.sqlite `
  --output-dir data/interim/x_latest_pilot_exports
```

## Import file respons X yang disimpan manual

Untuk file seperti `configs/query_x_1.js`, gunakan importer offline. File tidak
dieksekusi; importer hanya membaca array `data = [...]` sebagai JSON5, lalu
memproses seluruh batch SearchTimeline di dalamnya.

```powershell
uv run --no-cache python scripts/import_x_files.py `
  --input configs/query_x_1.js `
  --input configs/query_x_2.js `
  --input configs/query_x_3.js `
  --input configs/query_x_4.js `
  --input configs/query_x_5.js `
  --database data/interim/x_manual_import.sqlite `
  --candidate-only `
  --language-filter strict
```

Nama file (misalnya `query_x_1`) disimpan sebagai provenance karena query X
asal tidak tersedia di payload. Setiap tweet ditandai sebagai
`source_type=x_search_timeline_manual_file` dan melewati normalisasi, filter
bahasa, keyword kandidat, serta deduplikasi yang sama dengan collector lain.

Periksa file tanpa membuat database:

```powershell
uv run --no-cache python scripts/import_x_files.py `
  --input configs/query_x_1.js `
  --dry-run
```

Export hasil import:

```powershell
uv run --no-cache python -m scripts.export_dataset `
  --database data/interim/x_manual_import.sqlite `
  --output-dir data/interim/x_manual_import_exports
```
