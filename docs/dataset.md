# Dataset

Dataset penelitian ditargetkan minimal 2.000 sampel berbahasa Indonesia dengan distribusi seimbang antara promosi judol dan non-promosi.

Sumber data rencana:

- Public channel atau grup Telegram.
- Komentar YouTube.
- Twitter/X.

Anotasi dilakukan oleh dua anotator independen dan dievaluasi menggunakan Cohen's Kappa.

## Fondasi Collection Lokal

Database operasional untuk proses pengumpulan adalah SQLite pada `data/interim/collection.sqlite`. File CSV dan Parquet di `data/interim/exports/` hanya hasil ekspor untuk anotasi atau analisis notebook.

Setiap dokumen menyimpan `weak_label` berbasis keyword: `1` berarti minimal satu keyword baseline cocok dan `0` berarti tidak cocok. Nilai ini hanya kandidat otomatis; label manusia dan riwayatnya disimpan terpisah di tabel `annotations` dan dipakai sebagai ground truth saat tersedia.

Untuk setup, batas pengambilan, snowball, deduplikasi, dan seluruh command collector Telegram, lihat [Panduan Collector Telegram](collection/telegram-collector.md).

Untuk discovery video YouTube berbasis judul dan deskripsi tanpa download media, lihat [Panduan Collector YouTube](collection/youtube-collector.md).
