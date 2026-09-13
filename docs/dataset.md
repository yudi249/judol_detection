# Dataset

Dataset penelitian ditargetkan minimal 2.000 sampel berbahasa Indonesia dengan distribusi seimbang antara promosi judol dan non-promosi.

Sumber data rencana:

- Public channel atau grup Telegram.
- Komentar YouTube.
- Twitter/X.

## Dataset Anotasi Final

Dataset ground truth saat ini ada di `data/annotation/dataset_final.xlsx`
(sheet `Sheet1`, 2058 baris). Skema aktual:

| Kolom | Arti |
| --- | --- |
| `text_raw` | Teks mentah (komentar / posting / caption) |
| `label_anotator_1`, `label_anotator_2`, `label_anotator_3` | Label per anotator (0 / 1) |
| `label_final` | Label ground truth final (0 / 1) |
| `agreement_count` | Jumlah anotator yang setuju |
| `agreement_status` | `unanimous` (semua 2058 baris) |

Anotasi dilakukan oleh **tiga anotator** independen dan dievaluasi menggunakan
Cohen's Kappa; `label_final` diturunkan dari kesepakatan ketiganya dan
`agreement_status` mencatat status kesepakatan. Versi ringkas
(`text_raw`, `label`) tersedia di `data/annotation/dataset_final_simple.xlsx`.

> Catatan: dataset anotasi ini **tidak menyimpan metadata platform/sumber**
> (hanya `text_raw` + label). Anti-leakage split pada pipeline training
> memakai text-similarity, bukan platform — lihat
> `docs/research/eda-plan.md` §5 dan resolusi open question E5.
> Komputasi/detail analisis Cohen's Kappa dan audit survivorship-bias
> dikeluarkan dari scope EDA dan ditangani di sesi khusus; Cohen's Kappa tetap
> merupakan metode evaluasi anotasi pada metodologi skripsi.

## Fondasi Collection Lokal

Database operasional untuk proses pengumpulan adalah SQLite pada `data/interim/collection.sqlite`. File CSV dan Parquet di `data/interim/exports/` hanya hasil ekspor untuk anotasi atau analisis notebook.

Setiap dokumen menyimpan `weak_label` berbasis keyword: `1` berarti minimal satu keyword baseline cocok dan `0` berarti tidak cocok. Nilai ini hanya kandidat otomatis; label manusia dan riwayatnya disimpan terpisah di tabel `annotations` dan dipakai sebagai ground truth saat tersedia.

## Sampling Non-Promosi

Konfigurasi kontrol negatif dipisahkan dari konfigurasi kandidat positif:

- `configs/x_negative_queries.json`
- `configs/youtube_negative_queries.json`
- `configs/telegram_control_seeds.json`

Masing-masing memuat sampel `natural` dan `hard`. Natural negatives berasal
dari topik atau channel netral. Hard negatives sengaja menyertakan kata yang
ambigu, seperti `slot`, `bonus`, `deposit`, `link`, atau pembahasan pencegahan
judi tanpa ajakan berpartisipasi. Jalankan collector dengan
`--sample-mode control` agar dokumen `weak_label=0` tidak dibuang.

Dokumen kontrol tetap berstatus belum dianotasi sampai diperiksa manusia.
Jangan menerjemahkan `weak_label` langsung menjadi label final. Natural control
umumnya memiliki `weak_label=0`, sedangkan hard negative dapat memiliki
`weak_label=1` karena sengaja memuat keyword sensitif dalam konteks non-promosi.
Jika berasal dari registry kontrol, `sample_type` pada row dokumen menyimpan
`natural` atau `hard` agar provenance tidak hilang setelah database digabung.

## Snapshot Balanced Untuk Anotasi

Sampler reproducible tersedia di `scripts/sample_balanced_dataset.py`. Perintah
berikut membaca enam database canonical, tidak mengubah database sumber, membuang
hash teks yang muncul pada pool positif dan negatif platform yang sama, lalu
memilih 384 dokumen per strata `platform × pool_label` dengan seed `42`:

```powershell
uv run --no-cache python scripts/sample_balanced_dataset.py --quota 384 --seed 42
```

Hasil terverifikasi pada 2026-08-17 adalah 2.304 dokumen: 384 positif dan 384
negatif untuk setiap X, YouTube, dan Telegram. Artifact berada langsung di
`data/processed/`:

- `dataset_balanced_2304.sqlite`
- `dataset_balanced_2304.csv`
- `dataset_balanced_2304.parquet`
- `dataset_balanced_2304_manifest.json`

Manifest menyimpan seed, quota, jumlah hash konflik yang dibuang, jumlah tersedia
per strata, dan provenance database/document asal. Pool `positive` dan `negative`
adalah provenance collection, bukan label final manusia; keenam database sumber
masih harus diperlakukan sebagai input anotasi.

Untuk setup, batas pengambilan, snowball, deduplikasi, dan seluruh command collector Telegram, lihat [Panduan Collector Telegram](collection/telegram-collector.md).

Untuk discovery video YouTube berbasis judul dan deskripsi tanpa download media, lihat [Panduan Collector YouTube](collection/youtube-collector.md).
