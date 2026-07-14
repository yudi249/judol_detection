# Collection Architecture Design

## Goal

Menyediakan fondasi pengumpulan teks yang rapi, lokal, dan dapat dipakai ulang oleh setiap sumber data yang diizinkan. Tahap awal dijalankan oleh satu peneliti pada satu komputer. Database SQLite menjadi sumber data operasional tunggal; notebook dipakai hanya untuk audit dan eksplorasi hasil.

## Scope

Desain ini mencakup kontrak data, penyimpanan, deduplikasi, weak labeling berbasis keyword, pencatatan run, ekspor, dan batas tanggung jawab file. Collector sumber pertama akan ditambahkan pada tahap implementasi berikutnya.

Desain ini tidak mencakup pengambilan data dari sumber yang tidak diizinkan oleh ketentuan sumber tersebut. Setiap collector yang diimplementasikan harus memakai akses dan penggunaan data yang sesuai dengan izin, kebijakan platform, lisensi dataset, dan ketentuan riset yang berlaku.

## Decisions

- Gunakan satu database SQLite pada `data/interim/collection.sqlite`.
- Gunakan tiga tabel inti saja: `collection_runs`, `documents`, dan `annotations`.
- Simpan hasil ekspor sebagai artefak turunan di `data/interim/exports/`; CSV atau Parquet bukan sumber kebenaran.
- Semua collector mengubah item sumber menjadi record `documents` yang sama.
- Weak label dibuat oleh satu modul keyword bersama, bukan oleh setiap collector.
- `weak_label` tidak menggantikan hasil anotasi manusia. Label akhir, bila tersedia, berada di `annotations`.
- Data mentah, teks normalisasi, dan hash deduplikasi disimpan bersama agar eksperimen Unicode dapat diaudit dan diulang.

## Layout

```text
src/judol_detection/
  collection/
    database.py
    models.py
    keywords.py
    normalizer.py
    storage.py
  collectors/
    base.py
    youtube.py

scripts/
  collect_youtube.py
  export_dataset.py

data/
  raw/
  interim/
    collection.sqlite
    exports/
  annotation/
  processed/
```

`collection/` menyimpan perilaku lintas sumber. `collectors/` hanya memuat adaptor yang mengambil item dari suatu sumber dan memetakannya ke kontrak bersama. `scripts/` menyediakan CLI tipis yang mengorkestrasi collector dan ekspor. Tidak ada logika penyimpanan, keyword, atau deduplikasi yang disalin ke dalam script atau notebook.

## Data flow

```text
seed atau query
  -> CLI collector
  -> source-specific collector
  -> record dokumen standar
  -> normalisasi + hash + weak label
  -> SQLite
  -> ekspor CSV/Parquet atau antrean anotasi
```

Untuk setiap eksekusi, CLI membuat satu baris `collection_runs` berstatus `running`. Collector memproses item per batch. Setiap item yang valid dinormalisasi, diberi weak label, lalu disimpan hanya bila belum memiliki hash teks normalisasi yang sama. Saat selesai, run diberi status `completed`; bila gagal, statusnya `failed` beserta ringkasan error. Menjalankan ulang collector tidak memasukkan duplikasi yang sudah tersimpan.

## Database schema

### `collection_runs`

Satu baris mewakili satu eksekusi collector.

| Column | Purpose |
| --- | --- |
| `run_id` | Primary key UUID atau integer. |
| `platform` | Nama platform atau asal dataset. |
| `collector_name` | Nama adaptor collector yang dijalankan. |
| `seed_or_query` | Seed, query, atau identitas input pengumpulan. |
| `config_json` | Batas batch, tanggal, dan konfigurasi run yang dapat diaudit. |
| `started_at` | Waktu mulai UTC. |
| `finished_at` | Waktu selesai UTC, nullable jika belum selesai. |
| `status` | `running`, `completed`, atau `failed`. |
| `fetched_count` | Jumlah item yang diterima dari collector. |
| `inserted_count` | Jumlah dokumen baru yang masuk database. |
| `duplicate_count` | Jumlah item yang tidak disimpan karena duplikat. |
| `error_summary` | Pesan error ringkas, nullable. |

### `documents`

Satu baris mewakili satu teks yang telah lolos validasi minimum dan belum duplikat.

| Column | Purpose |
| --- | --- |
| `document_id` | Primary key. |
| `run_id` | Foreign key ke run yang pertama kali memasukkan dokumen. |
| `platform` | Platform atau nama dataset asal. |
| `source_type` | Contoh: `api`, `public_dataset`, atau `manual_import`. |
| `source_item_id_hash` | Hash ID item/sumber bila perlu untuk traceability tanpa menyimpan identitas mentah. |
| `source_url` | URL asal bila relevan dan diizinkan untuk disimpan. |
| `published_at` | Waktu publikasi dari sumber, nullable. |
| `collected_at` | Waktu dokumen masuk sistem dalam UTC. |
| `text_raw` | Teks apa adanya. |
| `text_normalized` | Teks hasil normalisasi deterministik untuk analisis dan deduplikasi. |
| `text_hash_raw` | SHA-256 dari teks mentah. |
| `text_hash_normalized` | SHA-256 dari teks normalisasi; memiliki unique constraint. |
| `language_hint` | Petunjuk bahasa bila tersedia. |
| `unicode_obfuscation_flags` | Flag seperti `zero_width`, `homoglyph`, atau `number_substitution`. |
| `matched_keywords` | Keyword yang cocok, dipisahkan secara deterministik. |
| `weak_label` | `1` bila aturan keyword cocok, `0` bila tidak cocok. |
| `weak_label_reason` | Penjelasan singkat, misalnya `keyword:slot|maxwin`. |
| `raw_payload_path` | Path snapshot payload mentah opsional di `data/raw/`; bukan payload besar di SQLite. |

### `annotations`

Menyimpan label manual tanpa menimpa weak label atau riwayat penilaian sebelumnya.

| Column | Purpose |
| --- | --- |
| `annotation_id` | Primary key. |
| `document_id` | Foreign key ke `documents`. |
| `label` | `1`, `0`, atau `uncertain`. |
| `annotator_id` | Pseudonim annotator, misalnya `annotator_a`. |
| `label_source` | Selalu `human` untuk tabel ini. |
| `notes` | Alasan atau konteks keputusan, nullable. |
| `annotated_at` | Waktu anotasi UTC. |

Label yang dipakai sebagai ground truth dihasilkan oleh aturan query pada `annotations`, bukan dengan mengganti `weak_label` pada `documents`.

## Weak labeling

`collection/keywords.py` adalah satu-satunya lokasi daftar keyword dan aturan pencocokan. Fungsi utama menerima `text_raw` dan `text_normalized`, lalu menghasilkan:

```python
WeakLabelResult(
    label=1 | 0,
    matched_keywords=(...),
    reason="keyword:..." | "no_keyword_match",
)
```

Aturan awal adalah sederhana dan deterministik: sedikitnya satu keyword cocok menghasilkan `weak_label = 1`; tanpa kecocokan menghasilkan `weak_label = 0`. Keyword atau heuristic adalah mekanisme pemilihan kandidat, bukan pernyataan kebenaran ilmiah. Kasus seperti berita, edukasi, atau penolakan judi dapat tetap memperoleh weak label `1` dan harus dapat dikoreksi melalui anotasi.

## Normalization and deduplication

`collection/normalizer.py` menghasilkan normalisasi yang stabil dan tidak menghapus `text_raw`. Tahap awal menangani whitespace, zero-width characters, Unicode normalization yang relevan, dan transformasi yang dicatat melalui `unicode_obfuscation_flags`.

Deduplicasi memakai `text_hash_normalized` sebagai unique constraint di SQLite. Jika ada item yang hash normalisasinya sama, penyimpanan menganggapnya duplikat dan menaikkan `duplicate_count`; dokumen asli tidak ditimpa. Strategi ini sederhana, dapat direproduksi, dan cukup untuk tahap awal. Near-duplicate atau fuzzy matching sengaja ditunda sampai ada bukti bahwa exact normalized deduplication tidak cukup.

## Error handling and resume behavior

- Collector tidak boleh membatalkan seluruh run hanya karena satu item tidak dapat diubah menjadi record standar. Item tersebut dilewati dan error ringkas dicatat pada konteks run.
- Kegagalan yang menghentikan collector mengubah run menjadi `failed`, mengisi `finished_at`, dan menyimpan `error_summary`.
- Re-run aman karena unique constraint hash menghindari penyimpanan ulang dokumen yang telah ada.
- Collector harus menghormati batas akses dan retry/backoff yang ditentukan oleh sumber yang digunakan; detail ini milik adaptor sumber, bukan `storage.py`.

## Export and notebook use

`scripts/export_dataset.py` mengambil data dari SQLite dan menghasilkan:

- Parquet untuk EDA dan pipeline Python;
- CSV untuk anotasi atau inspeksi manual;
- ringkasan run dan distribusi `weak_label`.

Notebook membaca ekspor tersebut, tidak melakukan pengumpulan utama dan tidak menulis langsung ke tabel inti. Hal ini menjaga proses pengumpulan dapat dijalankan ulang dari CLI dan membuat analisis tetap eksploratif.

## Verification plan

Unit test harus mencakup:

1. Inisialisasi SQLite membuat tiga tabel dan constraint yang diperlukan.
2. Dokumen baru dapat disimpan dan menghitung `inserted_count`.
3. Dokumen dengan hash normalisasi yang sama ditolak sebagai duplikat dan menghitung `duplicate_count`.
4. Keyword match menghasilkan `weak_label = 1`, daftar keyword deterministik, dan alasan yang sesuai.
5. Tanpa keyword menghasilkan `weak_label = 0` dengan alasan `no_keyword_match`.
6. Normalisasi menjaga teks mentah sekaligus menghasilkan hash dan Unicode flag yang stabil.
7. Run sukses dan gagal menyimpan status, waktu selesai, serta ringkasan yang benar.
8. Ekspor hanya membaca SQLite dan menghasilkan kolom kontrak yang disepakati.

Integrasi pertama harus memakai fixture lokal atau importer dataset berizin agar tidak bergantung pada jaringan atau akses platform dalam test.

## Deferred decisions

- Migrasi SQLite ke PostgreSQL: hanya bila ada beberapa worker atau kebutuhan server.
- Fuzzy deduplication: hanya setelah analisis menunjukkan exact normalized hash tidak memadai.
- Pseudo-labeling/model labeling: bukan bagian fase fondasi ini.
- UI anotasi: fase terpisah; ekspor CSV terlebih dahulu cukup.
