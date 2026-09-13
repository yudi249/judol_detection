# Panduan Collector YouTube

Collector metadata YouTube legacy mencari video melalui yt-dlp, mengambil metadata tanpa mengunduh video/audio, lalu menyimpan gabungan judul dan deskripsi melalui fondasi `collection` yang sama dengan Telegram. Untuk collection berbasis API, gunakan collector YouTube Data API pada bagian khusus di bawah.

## Query registry

Gunakan `configs/youtube_queries.json`. Hanya item `enabled: true` dipakai.

## Periksa query tanpa network

```powershell
uv run --no-cache python scripts/collect_youtube.py `
  --query-file configs/youtube_queries.json `
  --dry-run
```

## Collection metadata

```powershell
uv run --no-cache python -m scripts.collect_youtube `
  --query-file configs/youtube_queries.json `
  --search-limit 50 `
  --database data/interim/youtube_pilot.sqlite
```

Atau tambahkan query langsung berulang kali dengan `--query "slot gacor"`.

Metadata mentah tersimpan di `data/raw/youtube/`; media tidak diunduh. Setiap video menjadi `source_type=youtube_video_metadata` dengan `text_raw = judul + deskripsi`. Keyword, candidate-only filtering, deduplikasi, database, dan ekspor memakai komponen shared yang sama dengan Telegram.

## Export

```powershell
uv run --no-cache python -m scripts.export_dataset `
  --database data/interim/youtube_pilot.sqlite `
  --output-dir data/interim/youtube_pilot_exports
```

## Discovery terbaru dengan YouTube Data API

Gunakan Data API bila hasil keyword harus terbaru ke terlama. Isi `YOUTUBE_API_KEY` di `.env`, lalu jalankan:

```powershell
uv run --no-cache python -m scripts.collect_youtube_api `
  --query-file configs/youtube_queries.json `
  --max-pages 2 `
  --published-after 2025-01-01T00:00:00Z `
  --region-code ID `
  --database data/interim/youtube_api.sqlite
```

API memakai `order=date`, sehingga setiap query dikumpulkan terbaru ke terlama. `--max-pages` membatasi konsumsi kuota. Raw response tersimpan di `data/raw/youtube-api/`; API key tidak pernah ditulis ke database atau terminal.

## Control samples untuk dataset non-promosi

Query positif lama tidak diubah. Untuk mengambil sampel kontrol dari hasil
pencarian video, gunakan registry baru dan mode `control`:

```powershell
uv run --no-cache python scripts/collect_youtube_api.py `
  --query-file configs/youtube_negative_queries.json `
  --sample-mode control `
  --max-pages 2 `
  --region-code ID `
  --database data/interim/youtube_negative_control.sqlite
```

Pada mode `control`, hasil YouTube Data API yang tidak memiliki keyword tetap
disimpan sebagai kandidat kontrol. `weak_label` tetap dihitung sebagai evidence
dan bukan label final. Query positif lama tetap menggunakan mode default
`candidate`.

Jalur metadata legacy juga menerima flag yang sama:

```powershell
uv run --no-cache python scripts/collect_youtube.py `
  --query-file configs/youtube_negative_queries.json `
  --sample-mode control `
  --database data/interim/youtube_negative_control.sqlite
```

Registry membedakan `natural` (olahraga, teknologi, edukasi, masakan,
otomotif) dan `hard` (kata ambigu atau pemberitaan/edukasi judi). Hasil
`control` tidak otomatis berlabel negatif. Hard negative dapat tetap memiliki
`weak_label=1` karena mengandung keyword sensitif; video dan komentar harus
ditinjau manual karena konteks query atau video tidak menentukan label setiap
teks. `sample_type` disimpan pada `documents.sample_type` untuk menjaga
provenance setiap row.

## Collection 2024-2026 dengan Data API

Untuk mengambil hasil pada rentang publikasi 2024 sampai 2026 berdasarkan seluruh
query aktif di `configs/youtube_queries.json`, gunakan batas waktu berikut dan
database run yang telah ditentukan:

```powershell
uv run --no-cache python scripts/collect_youtube_api.py `
  --query-file configs/youtube_queries.json `
  --max-pages 8 `
  --published-after 2024-01-01T00:00:00Z `
  --published-before 2027-01-01T00:00:00Z `
  --region-code ID `
  --database data/interim/youtube_api_user_run.sqlite
```

Rentang tersebut mencakup tahun kalender 2024, 2025, dan 2026. Hasil yang masuk
SQLite tetap melewati filter kandidat, bahasa, deduplikasi, dan near-duplicate
yang dikonfigurasi pada collector; jadi jumlah baris `documents` lebih kecil
daripada jumlah hasil API mentah. Jalur ini memakai YouTube Data API v3, bukan
`yt-dlp`.
