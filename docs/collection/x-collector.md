# Panduan Collector X

Collector X mengambil teks kandidat dari hasil pencarian **Terbaru** melalui
Camoufox dan satu profil browser persisten yang dikelola peneliti. Peneliti
menggulir halaman secara manual; response `SearchTimeline` yang diterima oleh
halaman diproses di memori dan dokumen langsung diteruskan ke fondasi collection
bersama.

Collector ini tidak menyimpan dump response network, `data.js`, atau file
`data = [...]`. Yang disimpan adalah dokumen yang melewati pipeline SQLite:
normalisasi Unicode, filter bahasa Indonesia, filter kandidat keyword, dan
deduplikasi.

Hasil X disimpan pada file SQLite terpisah secara default,
`data/interim/x_camoufox_manual.sqlite`, tetapi memakai tabel `documents` dan
`collection_runs` yang sama dengan Telegram dan YouTube. Oleh karena itu hasilnya
dapat diekspor dengan script export dataset yang sama.

## Persiapan sekali

Sinkronkan dependency dan download browser Camoufox:

```powershell
uv sync --no-cache
uv run --no-cache python -m camoufox fetch
```

Profil browser disimpan lokal di `data/browser-profiles/x-research/`. Direktori
ini diabaikan Git dan tidak boleh disalin, dibagikan, atau di-commit.

## Login pertama

Siapkan sesi persisten sebelum collection:

```powershell
uv run --no-cache python scripts/login_x.py `
  --profile-dir data/browser-profiles/x-research
```

Camoufox akan terbuka memakai profil khusus riset. Login sendiri bila diperlukan,
lalu kembali ke terminal dan tekan Enter. Script memverifikasi bahwa halaman
sudah tidak berada di alur login X, lalu menutup browser agar sesi tersimpan.
Collector berikutnya memakai profil yang sama.

Jangan menaruh credential, cookie, token, atau profile browser ke argument
command maupun repository.

## Periksa konfigurasi tanpa membuka browser

```powershell
uv run --no-cache python scripts/collect_x.py `
  --query-file configs/x_queries.json `
  --dry-run
```

Output dry-run menyebutkan `mode=manual browser=camoufox`. Query aktif berada di
`configs/x_queries.json`; hanya item dengan `"enabled": true` yang digunakan.

## Collection manual

```powershell
uv run --no-cache python scripts/collect_x.py `
  --query-file configs/x_queries.json `
  --database data/interim/x_camoufox_manual.sqlite `
  --profile-dir data/browser-profiles/x-research `
  --candidate-only `
  --language-filter strict
```

Untuk setiap query, collector membuka URL Latest:

```text
https://x.com/search?q=<query>&src=typed_query&f=live
```

Browser terbuka dalam mode tampilan. Scroll halaman secara manual seperti biasa.
Setelah selesai, tekan Enter pada terminal collector. Thread Playwright tetap
memompa event halaman selama proses scroll sehingga response dapat diproses
real-time.

Collector memulai pencarian dari `https://x.com/home`, menunggu search box UI,
mengisi query melalui UI, menekan Enter, lalu memilih tab **Terbaru**. Pola ini
meniru alur browser normal dan menghindari ketergantungan pada persisted GraphQL
operation ID X yang dapat berubah. Collector tidak membuka deep-link pencarian
sebagai langkah utama.

Collector hanya mengamati response HTTP 200 yang URL-nya mengandung
`SearchTimeline`. Ia tidak membuat request GraphQL sendiri, mengulang cursor,
atau mengambil ulang endpoint internal X.

## Control samples untuk dataset non-promosi

Query positif lama tetap menggunakan `configs/x_queries.json` dan mode default
`candidate`. Untuk mengumpulkan kontrol negatif, gunakan registry baru:

```powershell
uv run --no-cache python scripts/collect_x.py `
  --query-file configs/x_negative_queries.json `
  --sample-mode control `
  --database data/interim/x_negative_control.sqlite `
  --profile-dir data/browser-profiles/x-research `
  --language-filter strict
```

`x_negative_queries.json` mencampur dua jenis sampel:

- `natural`: topik netral seperti olahraga, resep, teknologi, wisata, dan tutorial.
- `hard`: konteks ambigu seperti `slot waktu`, `bonus karyawan`, `deposit rumah`,
  serta berita atau edukasi tentang judi online tanpa ajakan bermain.

Nilai `sample_type` dari registry ikut disimpan pada kolom `documents.sample_type`
sehingga provenance `natural` dan `hard` tetap tersedia setelah export.

Dalam mode `control`, teks dengan `weak_label=0` tetap disimpan untuk anotasi
manual. Hard negative juga dapat memiliki `weak_label=1`; nilai tersebut tetap
merupakan sinyal keyword otomatis, bukan label `promosi_judol` atau
`bukan_judol`. Jangan menggabungkan database control dengan database kandidat
sebelum provenance dan label anotasi diperiksa.

## Konfigurasi Camoufox dan profile

Camoufox dijalankan dengan opsi yang sama pada login dan collection:

```text
persistent_context=True
user_data_dir=data/browser-profiles/x-research
headless=False
humanize=True
os=windows
locale=id-ID
```

Profile juga menyimpan satu preset fingerprint lokal di
`.camoufox-fingerprint.json`. File ini dibuat otomatis pada launch pertama dan
diabaikan Git. `fingerprint_preset=True` tidak digunakan langsung karena API
Camoufox memilih preset acak ketika nilainya boolean `True`; preset lokal dipakai
agar profile login tidak berpindah identity OS antara `login_x.py` dan
`collect_x.py`.

Jika database WebGL Camoufox berubah dan pasangan vendor/renderer lama tidak
lagi kompatibel, collector otomatis membuang bagian WebGL dari preset lokal.
Camoufox kemudian memilih pasangan WebGL valid untuk target Windows. Navigator,
screen, locale, dan profile login tetap dipertahankan.

Jangan menjalankan dua proses Camoufox bersamaan dengan profile yang sama. Tutup
`login_x.py` sepenuhnya sebelum menjalankan `collect_x.py`.

## Data dan batasan

Parser menyimpan metadata minimum yang diperlukan pipeline:

| Field | Makna |
| --- | --- |
| `source_item_id` | ID tweet untuk deduplikasi |
| `text_raw` | Teks tweet, termasuk `note_tweet` bila tersedia |
| `source_url` | URL status X yang dibangun dari ID |
| `published_at` | Waktu publikasi dari response bila tersedia |
| `language_hint` | Hasil deteksi bahasa awal |

Tweet yang sama tidak diproses dua kali dalam satu query berdasarkan ID. Storage
kemudian menerapkan filter bahasa, weak label keyword, exact duplicate, dan
near-duplicate lintas hasil collection.

Ringkasan terminal menampilkan response, tweet teramati, parse error, jumlah
response SearchTimeline non-200, status error terakhir, dokumen tersimpan,
penolakan kandidat/bahasa, duplikat, dan alasan berhenti. Tabel `x_query_runs`
menyimpan ringkasan utama setiap query.

Jika terlihat `search_errors` dengan `last_error_status=404` dan halaman X
kembali ke tab Populer atau menampilkan "Ada kesalahan teknis", berarti request
pencarian X gagal sebelum tweet dapat diproses. Error CORS `live_pipeline` dan
source-map biasanya bukan penyebab utama. Collector tidak mengulang request
internal atau memakai header/cookie yang disalin dari DevTools; simpan hanya
status dan URL untuk diagnosis.

Alasan berhenti yang mungkin:

| Alasan | Makna |
| --- | --- |
| `manual_stop` | Peneliti menekan Enter atau terminal mencapai EOF |
| `authentication_required` | X mengarahkan browser ke halaman login |
| `access_challenge` | Halaman menampilkan sinyal challenge seperti CAPTCHA atau unusual activity |
| error run | Browser atau navigasi gagal; dokumen yang sudah tersimpan dipertahankan |

Hasilnya adalah sampel bounded dari hasil pencarian Terbaru, bukan arsip lengkap
atau historis X. Collector tidak memakai account rotation, proxy rotation,
CAPTCHA solving, atau bypass pembatasan akses.

## Export

```powershell
uv run --no-cache python -m scripts.export_dataset `
  --database data/interim/x_camoufox_manual.sqlite `
  --output-dir data/interim/x_camoufox_manual_exports
```

## Import file response lama

Bagian ini hanya untuk file yang sudah terlanjur disimpan manual, misalnya
`configs/query_x_1.js`. Importer bekerja offline, tidak mengeksekusi JavaScript,
dan membaca array `data = [...]` sebagai JSON5. Workflow ini tidak digunakan oleh
collector Camoufox baru.

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

Nama file, misalnya `query_x_1`, disimpan sebagai provenance karena query X asal
tidak tersedia di payload. Setiap tweet ditandai sebagai
`source_type=x_search_timeline_manual_file` dan melewati filter serta deduplikasi
yang sama dengan collector lain.

Periksa file tanpa membuat database:

```powershell
uv run --no-cache python scripts/import_x_files.py `
  --input configs/query_x_1.js `
  --dry-run
```

Export hasil import lama:

```powershell
uv run --no-cache python -m scripts.export_dataset `
  --database data/interim/x_manual_import.sqlite `
  --output-dir data/interim/x_manual_import_exports
```

## Collector extension Chrome terpisah

Untuk eksperimen collection melalui browser Chrome, repository juga memiliki app
terpisah di `apps/x-graphql-collector/`. App ini tidak mengubah JudolLens di
`apps/browser-extension/`; keduanya memiliki manifest, build, dan output yang
berbeda.

Build extension:

```powershell
pnpm --dir apps/x-graphql-collector install
pnpm --dir apps/x-graphql-collector test
pnpm --dir apps/x-graphql-collector compile
pnpm --dir apps/x-graphql-collector build
```

Load `apps/x-graphql-collector/.output/chrome-mv3` sebagai unpacked extension.
Buka X, lakukan pencarian **Terbaru**, aktifkan tab tersebut, lalu mulai monitor
dari popup. Scroll dilakukan manual agar request `SearchTimeline` dibuat oleh
halaman X sendiri. Extension memakai `chrome.debugger` untuk membaca response,
sehingga Chrome akan menampilkan indikator debugger selama monitoring.

Tombol **Clear** menghentikan auto-scroll, menghapus hasil sementara, membuang
response yang masih menunggu, dan melepas `chrome.debugger`. Gunakan **Clear**
saat ingin memulai koleksi baru pada tab tersebut; indikator debugger Chrome
harus hilang setelah operasi selesai.

Setelah status popup menjadi **Monitoring aktif**, tombol **Start Auto-scroll**
tersedia. Auto-scroll melompat ke posisi paling bawah halaman saat ini setiap 2
detik pada tab yang sama. Karena X menggunakan infinite scroll, extension
menunggu tinggi halaman bertambah lalu melompat lagi ke posisi bawah terbaru.
Tombol **Stop Auto-scroll** menghentikan scroll tetapi membiarkan monitoring tetap
aktif. Auto-scroll juga berhenti otomatis saat monitoring dihentikan, debugger
terlepas, halaman tidak bertambah tiga kali berturut-turut, atau 500 langkah
tercapai.

Query pada popup dapat diedit tanpa dikembalikan ke query monitor sebelumnya.
Filter `rawQuery` ditetapkan ketika **Mulai monitor** ditekan. Untuk mengganti
query, tekan **Stop**, ubah input query, lalu tekan **Mulai monitor** kembali.
Filter query menggunakan exact match; misalnya `us deposit slot` tidak sama
dengan `bonus slot gacor`.

Popup juga memiliki dropdown **Mode pencarian**:

- `Terbaru (Latest)` menerima request dengan `variables.product=Latest`.
- `Populer (Top)` menerima request dengan `variables.product=Top`.

Default-nya adalah **Terbaru** agar sesuai perilaku collector sebelumnya. Mode
dinonaktifkan selama monitoring aktif; untuk mengganti mode, tekan **Stop**, pilih
mode lain, lalu tekan **Mulai monitor** kembali. Extension hanya memfilter
response yang dibuat oleh halaman X dan tidak otomatis mengganti tab navigasi X.

Export popup berupa satu file JSON normalized, bukan dump GraphQL:

```text
schema_version
source
query
collected_at
items[].source_item_id
items[].text_raw
items[].source_url
items[].published_at (opsional)
```

### Import hasil extension ke database X existing

File JSON hasil tombol **Export JSON** dapat langsung dipakai untuk melanjutkan
database X yang sudah ada. Gunakan flag `--input`; path file tidak boleh ditulis
sebagai argumen posisi.

Jika file berada di folder Downloads:

```powershell
uv run --no-cache python scripts/import_x_files.py `
  --input "$env:USERPROFILE\Downloads\x-search-timeline-slot-gacor.json" `
  --database data/interim/x.sqlite `
  --candidate-only `
  --language-filter strict
```

Jika file sudah dipindahkan ke folder `configs`:

```powershell
uv run --no-cache python scripts/import_x_files.py `
  --input configs\x-search-timeline-slot-gacor.json `
  --database data/interim/x.sqlite `
  --candidate-only `
  --language-filter strict
```

Untuk mengimpor hasil extension sebagai dataset kontrol negatif, gunakan mode
`control`. File natural dan hard negative dapat diimpor bersama ke database
negatif yang sama:

```powershell
uv run --no-cache python scripts/import_x_files.py `
  --input <file-hasil-extension>.json `
  --database data/interim/x_negative.sqlite `
  --sample-mode control `
  --language-filter strict
```

Mode `control` menyimpan item tanpa keyword (`weak_label=0`) dan tetap mencatat
`weak_label` sebagai evidence. Kategori sumber dapat diaudit melalui file input,
`raw_payload_path`, dan `collection_runs`. Default importer tetap `candidate`,
sehingga import positif lama tidak berubah.

Sebelum menulis ke database existing, periksa file dengan dry-run:

```powershell
uv run --no-cache python scripts/import_x_files.py `
  --input configs\x-search-timeline-slot-gacor.json `
  --dry-run
```

Contoh output:

```text
[X IMPORT DRY RUN] file=x-search-timeline-slot-gacor | source=normalized | items=200
```

Backup database bersifat opsional, tetapi disarankan sebelum import besar:

```powershell
Copy-Item `
  data/interim/x.sqlite `
  "data/interim/x.sqlite.backup-$(Get-Date -Format yyyyMMdd-HHmmss)"
```

Import ke `data/interim/x.sqlite` tidak menghapus data lama. Import membuat
`collection_run` baru dan memasukkan hanya dokumen yang lolos filter. Dokumen
yang sudah ada akan dihitung sebagai duplikat berdasarkan teks yang sudah
dinormalisasi atau near-duplicate threshold.

Ringkasan output import:

```text
[X IMPORT] file=x-search-timeline-slot-gacor |
source=x_graphql_extension_json |
parsed=200 |
inserted=41 |
non_candidate=150 |
non_indonesian=0 |
duplicates=9
```

Makna counter:

- `parsed`: item yang terbaca dari JSON extension.
- `inserted`: dokumen baru yang disimpan ke tabel `documents`.
- `non_candidate`: item ditolak oleh `--candidate-only`.
- `non_indonesian`: item ditolak oleh `--language-filter strict`.
- `duplicates`: item yang sudah terwakili oleh data existing atau near-duplicate.

Pada mode `control`, item tanpa keyword tidak dihitung sebagai `non_candidate`;
item tersebut disimpan selama lolos filter bahasa dan deduplikasi.

Provenance dokumen hasil extension disimpan sebagai
`source_type=x_graphql_extension_json`. Field `language_hint` dihitung ulang oleh
Python agar filter strict tetap konsisten dengan collector lain.

Loader normalized JSON menandai provenance sebagai
`source_type=x_graphql_extension_json`. `language_hint` dihitung ulang oleh
Python sebelum filter strict; item yang bukan kandidat atau bukan bahasa
Indonesia tidak masuk tabel `documents` sesuai aturan storage yang ada.

Extension tidak menyimpan cookie, bearer token, header autentikasi, response
GraphQL penuh, full page history, atau full DOM. Hasil tetap merupakan bounded
sample dari sesi browser dan bukan arsip lengkap X.

Verifikasi jumlah hasil setelah import:

```powershell
$script = @'
import sqlite3
from pathlib import Path

path = Path("data/interim/x.sqlite")
with sqlite3.connect(path) as connection:
    documents = connection.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
    extension_rows = connection.execute(
        "SELECT COUNT(*) FROM documents WHERE source_type = 'x_graphql_extension_json'"
    ).fetchone()[0]
print(f"documents={documents}")
print(f"extension_documents={extension_rows}")
'@
$script | uv run --no-cache python -
```
