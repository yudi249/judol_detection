# YouTube Scraping Pilot Analysis

Last updated: 2026-07-09

Dokumen ini merangkum hasil awal dari dua jalur YouTube:

- `notebooks/ytdlp_scraper.ipynb`: discovery kandidat video judol dari metadata YouTube memakai `yt-dlp`.
- `notebooks/yt_scraper.ipynb`: pengambilan komentar dari seed video memakai YouTube Data API v3.

Tujuan analisis ini adalah menentukan apakah YouTube lebih cocok menjadi sumber positive judol, hard negative, atau keduanya.

## Executive Summary

Hasil pilot menunjukkan pola yang cukup jelas:

- `yt-dlp` efektif untuk menemukan video dengan judul/deskripsi sangat eksplisit judol.
- Komentar dari seed manual yang sebelumnya dicoba hampir tidak menghasilkan promosi judol eksplisit.
- YouTube sebaiknya dipakai dalam dua peran berbeda:
  - `youtube_video_metadata` sebagai sumber positive candidate dari title/description.
  - `youtube_comments` sebagai sumber hard-negative, false-positive trap, dan komentar natural.

Implikasi metodologis: pencarian positive judol di YouTube perlu dimulai dari video metadata yang eksplisit, lalu komentar dari video tersebut tetap harus direview terpisah. Komentar tidak boleh otomatis diberi label judol hanya karena video seed-nya judol.

## Dataset Files Reviewed

| File | Rows | Role |
| --- | ---: | --- |
| `data/interim/youtube_ytdlp_video_seed_candidates.csv` | 320 | Kandidat video seed dari query yt-dlp |
| `data/interim/youtube_ytdlp_seed_template.csv` | 50 | Top candidate untuk review manual |
| `data/interim/youtube_comments_raw.csv` | 1,214 | Komentar mentah dari seed manual |
| `data/interim/youtube_comments_annotation_queue.csv` | 1,214 | Queue anotasi komentar |

## yt-dlp Video Seed Discovery

Discovery menjalankan 10 query berbasis keyword paper:

- `slot gacor hari ini`
- `slot online gacor`
- `bonus new member slot`
- `deposit dana slot`
- `link slot gacor`
- `rtp live slot hari ini`
- `maxwin slot pragmatic`
- `pragmatic play slot gacor`
- `mahjong ways gacor`
- `togel online terpercaya`

Hasil utama:

| Metric | Value |
| --- | ---: |
| Raw search hits | 375 |
| Deduplicated videos | 320 |
| Query errors | 0 |
| Keyword candidates | 294 |
| Contact candidates | 44 |
| Unicode candidates | 276 |
| Median candidate score | 5 |
| Max candidate score | 13 |

Query terbaik berdasarkan rata-rata candidate score:

| Query | Videos | Avg score | Max score |
| --- | ---: | ---: | ---: |
| `link slot gacor` | 33 | 8.49 | 10 |
| `slot online gacor` | 34 | 7.82 | 11 |
| `maxwin slot pragmatic` | 31 | 5.90 | 10 |
| `pragmatic play slot gacor` | 36 | 5.89 | 10 |
| `mahjong ways gacor` | 40 | 5.00 | 8 |

Keyword yang paling sering muncul pada kandidat video:

| Term | Count |
| --- | ---: |
| `slot` | 177 |
| `gacor` | 107 |
| `situs` | 77 |
| `mahjong` | 62 |
| `pragmatic` | 57 |
| `link` | 53 |
| `judi` | 52 |
| `bonus` | 36 |
| `depo` | 34 |
| `maxwin` | 33 |
| `deposit` | 33 |

Temuan: discovery metadata berhasil menemukan video yang sangat eksplisit, misalnya judul dengan kombinasi `situs judi slot online`, `slot gacor`, `maxwin`, `rtp live`, `pragmatic play`, dan `mahjong ways`. Ini jauh lebih kuat sebagai sumber positive candidate daripada komentar acak dari video umum.

## YouTube Comment Collection

Komentar yang dianalisis berasal dari 5 seed manual yang user pilih sendiri.

Hasil utama:

| Metric | Value |
| --- | ---: |
| Videos | 5 |
| Total comments/replies | 1,214 |
| Replies | 219 |
| Keyword candidates | 6 |
| Contact candidates | 21 |
| Unicode candidates | 439 |

Distribusi per video:

| Video ID | Rows | Replies | Keyword | Contact | Unicode |
| --- | ---: | ---: | ---: | ---: | ---: |
| `-zKVlGqDld8` | 212 | 47 | 0 | 2 | 61 |
| `LGDV0DW_Y1g` | 250 | 70 | 0 | 5 | 88 |
| `PIan6qn8FwE` | 251 | 63 | 3 | 9 | 98 |
| `c7IYpLO44hc` | 251 | 32 | 0 | 5 | 127 |
| `dw3-zZyvJXg` | 250 | 7 | 3 | 0 | 65 |

Temuan penting:

- Keyword candidate komentar hanya 6 dari 1,214 row, dan semuanya hanya match `link`.
- Tidak ada indikasi kuat bahwa komentar seed manual ini kaya positive judol.
- `candidate_flag_contact` saat ini noisy karena banyak row hanya mention `@username`, bukan URL/Telegram/WhatsApp/domain promosi.
- `candidate_flag_unicode` tinggi karena emoji, karakter non-ASCII, dan zero-width marker umum di komentar YouTube; flag ini perlu dibedakan antara Unicode natural dan obfuscation judol.

## Interpretation

Untuk skripsi ini, YouTube sebaiknya tidak diperlakukan sebagai satu sumber homogen.

`youtube_video_metadata` cocok untuk positive candidate:

- Judul/deskripsi video dari yt-dlp discovery sangat eksplisit judol.
- Metadata dapat menjadi dataset teks tersendiri untuk mendeteksi promosi judol pada title/description web.
- Data ini tetap perlu manual review karena keyword search bisa menangkap konten non-promosi atau konten edukasi.

`youtube_comments` cocok untuk hard negative:

- Komentar dari video umum sulit menghasilkan promosi judol eksplisit pada pilot ini.
- Ini berguna untuk menguji false positive, terutama kata umum seperti `link`, emoji, mention, dan diskusi non-promosi.
- Komentar harus tetap dianotasi manual bila dipakai sebagai ground truth.

## Recommended Next Step

1. Review `data/interim/youtube_ytdlp_seed_template.csv`.
2. Pilih 10-20 video dengan candidate score tinggi dan judul/deskripsi jelas promosi judol.
3. Masukkan `video_id` terpilih ke `SEED_VIDEOS` di `notebooks/yt_scraper.ipynb`.
4. Jalankan YouTube Data API comment collection pada seed tersebut.
5. Pisahkan output menjadi:
   - video metadata positive candidates
   - comments from judol-video seeds
   - comments from neutral/control seeds
6. Perbaiki rule enrichment komentar:
   - `candidate_flag_contact` jangan menghitung mention `@username` biasa sebagai contact.
   - `candidate_flag_unicode` perlu memisahkan emoji/non-ASCII natural dari obfuscation seperti zero-width, homoglyph, spacing, dan number substitution.

## Methodological Note

Hasil pilot ini mendukung strategi hybrid yang defensible:

- Gunakan `yt-dlp` untuk discovery video judol berbasis keyword.
- Gunakan YouTube Data API v3 untuk mengambil komentar dari seed yang sudah direview.
- Jangan memberi label komentar berdasarkan label video.
- Simpan provenance query, seed, dan sumber label agar data bisa diaudit pada bab metodologi.
