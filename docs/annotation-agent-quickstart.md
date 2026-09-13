# Quick Start Agent Anotasi Judol

Dokumen ini menjelaskan cara menjalankan pipeline anotasi Excel yang
didefinisikan di `docs/agent-annotation-prd.md`.

## 1. Siapkan Environment

Sinkronkan dependency dari root repository:

```powershell
uv sync --no-cache
```

Isi nilai provider pada `.env` berdasarkan `.env.example`:

```text
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://provider.example/v1
OPENAI_MODEL=nama-model
```

`OPENAI_BASE_URL` adalah base URL provider, bukan URL lengkap
`/chat/completions`.

## 2. Siapkan Workbook

Workbook harus berupa `.xlsx`. Secara default sistem membaca:

- sheet pertama;
- kolom teks `text_raw`;
- kolom hasil `label` jika sudah ada.

Nilai label valid:

```text
promosi_judol
bukan_judol
perlu_review
not_indonesian
```

Agent mendeteksi bahasa utama terlebih dahulu. Teks yang mayoritas bukan Bahasa
Indonesia mendapat `not_indonesian` dan tidak dinilai sebagai promosi judol.
Teks campuran mengikuti bahasa mayoritas. Bahasa Indonesia dengan URL, brand,
slang, atau beberapa kata asing tetap diproses jika Bahasa Indonesia dominan.

Jika workbook memiliki kolom `row_id`, setiap nilainya harus terisi dan unik.
Jika kolom tersebut tidak ada, sistem membuat ID internal dari nama sheet dan
nomor baris.

## 3. Jalankan Anotasi

Contoh untuk membuat output baru:

```powershell
uv run --no-cache python scripts/annotate_judol.py `
  --input data/annotation/dataset_input.xlsx `
  --output data/annotation/dataset_labeled.xlsx `
  --allow-external-data `
  --yes
```

`--allow-external-data` adalah consent eksplisit bahwa teks dikirim ke provider
eksternal. CLI menampilkan peringatan sebelum proses dimulai.

`--yes` diperlukan untuk mode non-interaktif. Tanpa `--yes`, CLI meminta
konfirmasi ketika estimasi token melebihi `--max-total-tokens`.

Parameter tambahan:

```powershell
--sheet Sheet1
--text-column text_raw
--concurrency 5
--progress-every 10
--max-total-tokens 2600000
--force
```

`--progress-every 10` mencetak progress setiap 10 baris terminal dan selalu
mencetak satu progress terakhir saat proses `completed` atau `paused`. Log hanya
berisi counter, persentase, jumlah request/cache, pending, retry/error, dan
distribusi label; teks mentah serta credential tidak dicetak. Gunakan
`--progress-every 1` untuk log setiap baris, atau `--progress-every 0` untuk
menonaktifkan log berkala.

`--force` hanya mengizinkan output path yang sudah ada untuk ditimpa. File
input tidak pernah ditimpa.

## 4. File yang Dihasilkan

Jika output path adalah `dataset_labeled.xlsx`, sistem membuat:

- `dataset_labeled.xlsx` setelah seluruh baris selesai;
- `dataset_labeled.checkpoint.json` untuk resume;
- `dataset_labeled.run.json` untuk ringkasan proses.

Checkpoint dan ringkasan tidak menyimpan teks mentah. Keduanya dapat berisi
hash teks, label, status, penggunaan token, fingerprint input, dan hash skill.

Workbook partial tidak dibuat ketika proses berhenti atau kuota provider habis.

## 5. Lanjutkan Proses

Setelah provider kembali tersedia, jalankan dengan input dan output yang sama:

```powershell
uv run --no-cache python scripts/annotate_judol.py `
  --input data/annotation/dataset_input.xlsx `
  --output data/annotation/dataset_labeled.xlsx `
  --allow-external-data `
  --progress-every 10 `
  --resume `
  --yes
```

Resume ditolak jika workbook, sheet, kolom teks, atau skill berubah sejak
checkpoint dibuat. Baris terminal dan cache teks identik tidak dikirim ulang.

## 6. Kontrak Model

Skill anotator dikirim sebagai system message. Teks satu baris dikirim sebagai
user message. Provider diminta mengembalikan JSON Schema strict:

```json
{"label":"promosi_judol"}
```

Respons invalid akan dicoba ulang maksimal tiga kali dengan exponential
backoff. Setelah retry habis, baris tersebut diberi `perlu_review`. Error kuota
provider berbeda: proses pause dan baris yang belum dikirim tetap tanpa label.

## 7. Verifikasi Lokal

Jalankan test suite:

```powershell
uv run --no-cache python -m pytest --basetemp=.pytest-tmp
uv run --no-cache python main.py
```

Test tidak memanggil provider eksternal. Client diuji dengan transport HTTP
palsu dan pipeline diuji menggunakan workbook sementara.
