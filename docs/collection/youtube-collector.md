# Panduan Collector YouTube

Collector YouTube mencari video melalui yt-dlp, mengambil metadata tanpa mengunduh video/audio, lalu menyimpan gabungan judul dan deskripsi melalui fondasi `collection` yang sama dengan Telegram.

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
