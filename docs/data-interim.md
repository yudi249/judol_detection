# Panduan Data Interim

Dokumen ini adalah rujukan operasional untuk memeriksa dataset hasil collection
di `data/interim/`. Gunakan panduan ini ketika perlu mengetahui jumlah data,
membandingkan run collection, atau memastikan bahwa file ekspor tidak dihitung
sebagai data baru.

## Struktur Data

Setiap database SQLite hasil collection menyimpan record dokumen pada tabel
`documents`. Nama database menunjukkan sumber atau run, bukan jenis tabel yang
berbeda.

| Sumber | Database yang umum digunakan | Keterangan |
| --- | --- | --- |
| X | `data/interim/x.sqlite` | Hasil collection atau import manual X. |
| Telegram | `data/interim/telegram_full_history.sqlite` | Run riwayat penuh yang dapat diakses; gunakan sebagai sumber hitungan jika pertanyaan menyebut arsip/full history. |
| Telegram | `data/interim/telegram_user_run.sqlite` | Run pilot atau run pengguna yang terpisah; dapat menjadi subset dari database Telegram lain. |
| YouTube | `data/interim/youtube_api_user_run.sqlite` | Run discovery YouTube Data API. |

Nama file dapat bertambah setelah collection baru. Jangan menentukan jumlah data
hanya dari nama file; selalu periksa tabel `documents` dan `collection_runs`.

Folder dengan akhiran `_exports/` berisi salinan tabel `documents` dalam format
CSV dan Parquet. File-file tersebut berguna untuk anotasi atau analisis, tetapi
bukan data tambahan dan tidak boleh dijumlahkan bersama baris SQLite.

## Aturan Penghitungan

1. Hitung baris pada tabel `documents` di database sumber.
2. Gunakan satu database canonical untuk setiap sumber atau pertanyaan run.
3. Jangan menjumlahkan `documents.csv`, `documents.parquet`, dan SQLite yang
   berasal dari run yang sama.
4. Jangan menjumlahkan `telegram_full_history.sqlite` dengan
   `telegram_user_run.sqlite` sebelum memeriksa overlap `document_id`.
5. Bedakan jumlah pesan yang dibaca collector dari jumlah dokumen yang disimpan:
   `documents` hanya berisi record yang lolos filter kandidat dan deduplikasi
   sesuai konfigurasi collector.
6. `weak_label` adalah label kandidat berbasis keyword, bukan label final
   anotasi manusia.

Jika pengguna bertanya “berapa data X, Telegram, dan YouTube”, laporkan jumlah
`documents` dari database canonical masing-masing, sebutkan database yang
digunakan, dan jelaskan jika ada run lain yang hanya merupakan subset atau
salinan.

## Inspeksi Database

Jalankan dari root repository. Perintah berikut menampilkan semua database
SQLite di `data/interim/`, tabelnya, dan jumlah baris tiap tabel:

```powershell
$script = @'
import sqlite3
from pathlib import Path

root = Path("data/interim")
for path in sorted(root.glob("*.sqlite")):
    print(path)
    with sqlite3.connect(path) as connection:
        tables = [
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master "
                "WHERE type='table' AND name NOT LIKE 'sqlite_%' "
                "ORDER BY name"
            )
        ]
        for table in tables:
            quoted_table = '"' + table.replace('"', '""') + '"'
            count = connection.execute(
                f"SELECT COUNT(*) FROM {quoted_table}"
            ).fetchone()[0]
            print(f"  {table}: {count}")
'@
$script | & uv run --no-cache python -
```

Untuk menjawab jumlah dokumen per sumber, ambil nilai tabel `documents`, bukan
jumlah file ekspor. Jika database tidak memiliki tabel `documents`, laporkan
bahwa database tersebut tidak mengikuti schema collection yang diharapkan.

## Memeriksa Overlap Run Telegram

Gunakan `document_id` untuk memeriksa apakah dua database Telegram berisi record
yang sama. Perintah ini menghitung ukuran masing-masing set dan irisan keduanya:

```powershell
$script = @'
import sqlite3
from pathlib import Path

def document_ids(path: Path) -> set[str]:
    with sqlite3.connect(path) as connection:
        return {
            row[0]
            for row in connection.execute(
                "SELECT document_id FROM documents"
            )
        }

full = document_ids(Path("data/interim/telegram_full_history.sqlite"))
run = document_ids(Path("data/interim/telegram_user_run.sqlite"))
print(f"full_history={len(full)}")
print(f"user_run={len(run)}")
print(f"overlap={len(full & run)}")
'@
$script | & uv run --no-cache python -
```

Jika nilai `overlap` sama dengan seluruh ukuran run yang lebih kecil, run kecil
adalah subset dan tidak boleh ditambahkan ke total database yang lebih besar.
Jika tidak ada overlap, keduanya tetap hanya boleh dijumlahkan bila pertanyaan
meminta total gabungan beberapa run dan provenance setiap run sudah jelas.

## Memilih Database Canonical

Gunakan aturan berikut saat beberapa database tersedia:

- Untuk pertanyaan tentang hasil collection terbaru atau pilot tertentu, gunakan
  database yang disebutkan pada catatan run atau nama output run tersebut.
- Untuk pertanyaan tentang seluruh riwayat Telegram, prioritaskan
  `telegram_full_history.sqlite` dan cek apakah run pilot sudah termasuk di
  dalamnya.
- Untuk pertanyaan tentang X, gunakan database X yang eksplisit, misalnya
  `x.sqlite`, dan jangan menghitung file `_exports/` lagi.
- Untuk pertanyaan tentang YouTube API, gunakan database run API dan bukan raw
  payload di `data/raw/youtube-api/`.
- Jika maksud “total” ambigu, tampilkan jumlah per database terlebih dahulu dan
  jelaskan bahwa total gabungan memerlukan keputusan deduplikasi.

## Referensi Collection

- [Fondasi dataset](dataset.md)
- [Panduan Collector X](collection/x-collector.md)
- [Panduan Collector Telegram](collection/telegram-collector.md)
- [Panduan Collector YouTube](collection/youtube-collector.md)
- [Rencana analisis EDA](research/eda-plan.md)
