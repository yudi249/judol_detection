# Judol Detection

Monorepo skripsi untuk pengembangan sistem deteksi promosi judi online berbahasa Indonesia yang tahan terhadap manipulasi Unicode.

Fokus penelitian:

- Membangun dataset teks promosi judol dan non-judol berbahasa Indonesia.
- Membuat variasi manipulasi Unicode seperti homoglyph substitution dan invisible character insertion.
- Melatih dan mengevaluasi model CNN, BiLSTM, dan IndoBERT dengan pendekatan adversarial training.
- Menyediakan REST API berbasis FastAPI untuk inferensi model.
- Membuat prototipe browser extension Manifest V3 untuk memindai DOM dan menyensor konten terdeteksi secara realtime.

## Struktur Repo

```text
data/                 Dataset raw, interim, processed, adversarial, dan anotasi
notebooks/            Notebook SEMMA: sample, explore, modify, model, assess
src/judol_detection/  Kode Python reusable untuk preprocessing, Unicode, model, evaluasi, dan inferensi
experiments/          Konfigurasi eksperimen, hasil run lokal, dan ringkasan laporan
models/               Checkpoint lokal dan model final
apps/api/             REST API FastAPI
apps/browser-extension/ Browser extension Manifest V3
tests/                Unit, integration, dan fixture test
thesis/               Proposal, draft bab skripsi, gambar, tabel, referensi, final
docs/                 Dokumentasi arsitektur, dataset, Unicode attack, API, dan demo extension
scripts/              Command-line script untuk dataset, training, evaluasi, dan export model
```

## Quick Start

```powershell
uv sync
uv run python main.py
```

## Status

Repo ini baru diinisialisasi dengan `uv`. Tahap berikutnya adalah mengisi pipeline dataset dan utilitas manipulasi Unicode sebelum masuk ke training model.
