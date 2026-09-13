# Panduan Collector Telegram

Panduan ini menjelaskan seluruh perintah yang tersedia pada `scripts/collect_telegram.py`. Collector ini ditujukan untuk riset pada channel Telegram publik yang dapat diakses oleh akun Telegram pengguna.

## Yang dilakukan collector

1. Membaca maksimal sejumlah pesan yang dipilih dari setiap channel, dari pesan terbaru ke pesan lama.
2. Pada mode candidate, menyimpan hanya pesan yang cocok sebagai kandidat promosi berdasarkan keyword (`weak_label=1`). Mode control juga menyimpan pesan tanpa keyword untuk anotasi manual.
3. Menolak duplikat teks, variasi hampir sama, dan template dengan awalan panjang sama tetapi ekor username berbeda.
4. Mencari `@username` atau `t.me/<username>` dalam pesan yang memiliki bukti, lalu melakukan snowball satu tingkat dari channel seed.
5. Menulis dokumen yang lolos ke satu database SQLite.

### Pengecekan near-duplicate

Saat near-duplicate diaktifkan, collector membandingkan pesan baru dengan
dokumen yang sudah tersimpan menggunakan Jaccard, containment, dan
shared-prefix. Canonicalizer deduplikasi melakukan NFKC normalization agar
format Unicode seperti Mathematical Bold (`𝗦𝗜𝗧𝗨𝗦`) dibandingkan sebagai teks
biasa. Karakter Unicode format/invisible juga dihapus sebelum tokenisasi.

URL, mention, dan angka yang berubah-ubah tidak dipakai sebagai token utama.
Untuk template pendek yang daftar namanya berubah, URL promosi yang sama
ditambah minimal 8 token prefix yang sama juga dianggap near-duplicate. Sinyal
promosi harus ada pada kedua pesan; URL berita atau URL generik tidak cukup.
URL saja tidak cukup: dua pesan berbeda yang hanya berbagi URL tetap
dipertahankan.
Dua pesan yang hanya berisi URL berbeda tidak otomatis dianggap near-duplicate
ketika canonical token keduanya kosong. Threshold hanya berlaku untuk pesan
baru; database lama harus dibersihkan ke salinan baru menggunakan
`scripts/deduplicate_database.py`.

## Target dokumen per channel

Untuk mengambil jumlah dokumen baru tertentu dari setiap channel, gunakan
`--target-documents-per-channel`. Quota menghitung row yang benar-benar masuk
database, bukan jumlah pesan yang dibaca. Pesan non-kandidat, duplicate, dan
near-duplicate tidak mengurangi quota. Collector lanjut ke channel berikutnya
setelah quota tercapai atau riwayat channel habis.

```powershell
uv run --no-cache python -m scripts.collect_telegram `
  --seed-file configs/telegram_seeds.json `
  --target-documents-per-channel 100 `
  --max-channels 20 `
  --progress-every 100 `
  --database data/interim/telegram_quota100.sqlite
```

Gunakan `--target-documents-per-channel` tanpa `--max-messages-per-channel`.
Progress menampilkan bentuk `quota=37/100`. Jika channel hanya memiliki 73
dokumen valid, collector menyimpan 73 lalu pindah ke channel berikutnya.

Collector **tidak** mengambil seluruh riwayat channel secara default. Batas awalnya 200 pesan per channel. Ia juga hanya mengakses channel publik yang dapat diakses akun Anda.

## Control samples untuk dataset non-promosi

Registry positif `configs/telegram_seeds.json` tetap menggunakan
`group: "candidate"` dan perilaku kandidat lama. Registry candidate dan control
sebaiknya tidak dicampur; CLI memakai semua entry yang aktif dari registry yang
diberikan. Untuk mengumpulkan kontrol
negatif dari channel publik, gunakan registry terpisah:

```powershell
uv run --no-cache python -m scripts.collect_telegram `
  --seed-file configs/telegram_control_seeds.json `
  --sample-mode control `
  --max-messages-per-channel 200 `
  --max-channels 20 `
  --database data/interim/telegram_control.sqlite
```

`telegram_control_seeds.json` berisi channel kontrol bertopik berita, bisnis,
dan hukum. `sample_type` membedakan `natural` dan `hard`; field tersebut adalah
provenance sampling, bukan label anotasi, dan ikut disimpan pada row dokumen.

Pada mode `control`, collector menyimpan pesan publik meskipun tidak memiliki
keyword baseline (`weak_label=0`). Pesan hard negative juga dapat memiliki
`weak_label=1`. Nilai `weak_label`, matched keyword, dan Unicode flags tetap
disimpan sebagai evidence untuk proses anotasi. Collector
tidak melakukan snowball dari pesan kontrol, sehingga seed kontrol tidak
menyebar ke channel promosi yang disebut di dalam pesan. Label akhir tetap
ditentukan melalui anotasi manual.

## Prasyarat

Jalankan perintah dari root repository `D:\judol_detection` dan isi `.env`:

```dotenv
TELEGRAM_API_ID=123456
TELEGRAM_API_HASH=your_api_hash
```

Pada eksekusi pertama, Telethon meminta nomor telepon dan kode OTP Telegram. Sesi login lokal disimpan sebagai `.telegram_pilot_session`; jangan commit file sesi atau `.env`.

Lihat seluruh opsi CLI kapan pun dengan:

```powershell
uv run --no-cache python scripts/collect_telegram.py --help
```

## Opsi command

| Opsi | Fungsi | Nilai awal |
| --- | --- | --- |
| `--seed USERNAME` | Menambahkan seed channel publik. Boleh diulang. Awalan `@` boleh dipakai atau dihilangkan. | Tidak ada; wajib memberi `--seed` atau `--seed-file`. |
| `--seed-file PATH` | Membaca semua entry registry yang `enabled`; gunakan registry homogen untuk candidate (`group: "candidate"`) atau control (`group: "control"`). Dapat digabung dengan `--seed`. | Tidak ada. |
| `--max-messages-per-channel N\|none` | Maksimal pesan terbaru yang dibaca dari **setiap** channel. Gunakan `none` untuk seluruh riwayat channel yang dapat diakses. | `200` |
| `--target-documents-per-channel N` | Target row baru yang benar-benar tersimpan per channel; membaca sampai target tercapai atau riwayat habis. Tidak boleh digabung dengan `--max-messages-per-channel`. | Mati |
| `--mode MODE` | `discovery`, `targeted`, `full-history`, atau `incremental`. | `discovery` |
| `--target-query TEXT` | Query Telegram server-side; boleh diulang, wajib untuk `targeted`. | Tidak ada |
| `--max-channels N` | Maksimal total channel yang diproses, termasuk seed dan channel hasil snowball. | `50` |
| `--database PATH` | Lokasi database SQLite tujuan. | `data/interim/telegram_pilot.sqlite` |
| `--candidate-only` | Pada mode `candidate`, menyimpan hanya kandidat keyword (`weak_label=1`). Mode `control` otomatis menyimpan pesan tanpa keyword untuk anotasi manual. | Aktif pada candidate |
| `--progress-every N` | Cetak checkpoint progres setiap `N` pesan per channel. | `100` |
| `--near-duplicate-threshold FLOAT` | Batas Jaccard, `0`–`1`; makin kecil makin agresif untuk aturan Jaccard. Aturan containment `0.90` dan shared-prefix (20 token/80%) tetap aktif terlepas dari nilai ini. | `0.85` |
| `--dry-run` | Memvalidasi seed dan menampilkan rencana tanpa login, membaca channel, atau membuat database. | Mati |
| `-h`, `--help` | Menampilkan bantuan CLI. | — |

## Bentuk registry seed

Contoh `configs/telegram_seeds.json`:

```json
{
  "version": 1,
  "seeds": [
    {"username": "NewEraForAll", "group": "candidate", "enabled": true},
    {"username": "channel_nonaktif", "group": "candidate", "enabled": false}
  ]
}
```

Channel nonaktif tetap tercatat sebagai riwayat konfigurasi, tetapi tidak akan diproses sampai `enabled` diubah menjadi `true`.

## Contoh command

### 1. Periksa registry tanpa scraping

```powershell
uv run --no-cache python -m scripts.collect_telegram `
  --seed-file configs/telegram_seeds.json `
  --dry-run
```

### 2. Scraping satu channel kecil untuk uji coba

```powershell
uv run --no-cache python -m scripts.collect_telegram `
  --seed NewEraForAll `
  --max-messages-per-channel 50 `
  --max-channels 1 `
  --database data/interim/telegram_smoke.sqlite
```

### 3. Scraping beberapa seed langsung

```powershell
uv run --no-cache python -m scripts.collect_telegram `
  --seed NewEraForAll `
  --seed busanslotofficial `
  --max-messages-per-channel 200 `
  --max-channels 20 `
  --database data/interim/telegram_manual_seeds.sqlite
```

### 4. Pilot snowball dari registry

```powershell
uv run --no-cache python -m scripts.collect_telegram `
  --seed-file configs/telegram_seeds.json `
  --max-messages-per-channel 200 `
  --max-channels 50 `
  --near-duplicate-threshold 0.85 `
  --database data/interim/telegram_filtered_pilot_v2.sqlite
```

### 5. Membaca lebih banyak riwayat per channel

```powershell
uv run --no-cache python -m scripts.collect_telegram `
  --seed-file configs/telegram_seeds.json `
  --max-messages-per-channel 500 `
  --max-channels 20 `
  --database data/interim/telegram_500_messages.sqlite
```

Menaikkan jumlah pesan meningkatkan waktu proses dan risiko rate limit. Telethon mengambil pesan terbaru lebih dahulu; gunakan nilai bertahap dan audit hasilnya sebelum memperbesar cakupan.

### 6. Mengambil seluruh riwayat channel

```powershell
uv run --no-cache python -m scripts.collect_telegram `
  --seed NewEraForAll `
  --max-messages-per-channel none `
  --max-channels 1 `
  --database data/interim/telegram_full_history.sqlite
```

`none` diteruskan sebagai `limit=None` ke Telethon. Gunakan mode ini terlebih dahulu pada satu channel dan database baru; riwayat panjang dapat membutuhkan waktu sangat lama.

### 7. Menampilkan progres lebih sering

```powershell
uv run --no-cache python -m scripts.collect_telegram `
  --seed-file configs/telegram_seeds.json `
  --max-messages-per-channel none `
  --progress-every 100 `
  --database data/interim/telegram_filtered_pilot_v3.sqlite
```

Terminal menampilkan awal/akhir channel, checkpoint pesan dibaca, data tersimpan, non-kandidat, duplikat, ukuran antrean snowball, FloodWait, dan kegagalan channel. `--progress-every 100` praktis untuk riwayat panjang.

### 8. Targeted collection (candidate)

```powershell
uv run --no-cache python -m scripts.collect_telegram `
  --seed-file configs/telegram_seeds.json `
  --mode targeted `
  --target-query "slot gacor" `
  --target-query "bonus deposit" `
  --target-query "link daftar" `
  --max-messages-per-channel 200 `
  --database data/interim/telegram_targeted.sqlite
```

Mode `targeted` memakai pencarian Telegram server-side untuk setiap query, lalu menyatukan hasil berdasarkan ID pesan. Query wajib diberikan; pencarian dapat melewatkan promosi yang sangat terobfuscasi, sehingga tetap gunakan discovery sample sebagai audit recall.

### 9. Incremental update

```powershell
uv run --no-cache python -m scripts.collect_telegram `
  --seed-file configs/telegram_seeds.json `
  --mode incremental `
  --max-messages-per-channel 200 `
  --database data/interim/telegram_targeted.sqlite
```

Gunakan database yang sama dengan run sebelumnya. Cursor `last_message_id` disimpan per channel, sehingga mode ini hanya meminta pesan yang lebih baru.

### 10. Full history untuk channel terpilih

```powershell
uv run --no-cache python -m scripts.collect_telegram `
  --seed NewEraForAll `
  --mode full-history `
  --max-channels 1 `
  --database data/interim/telegram_full_history.sqlite
```

Mode ini memaksa seluruh riwayat dapat diakses. Pakai hanya untuk channel ber-yield tinggi.

## Membersihkan database yang sudah ada

Near-duplicate yang sudah tersimpan tidak dibersihkan ulang ketika threshold
collector diubah. Gunakan command berikut untuk membuat salinan database yang
sudah dibersihkan:

```powershell
uv run --no-cache python scripts/deduplicate_database.py `
  --database data/interim/telegram_full_history.sqlite `
  --output data/interim/telegram_full_history_dedup075.sqlite `
  --threshold 0.75
```

Default threshold adalah `0.75`. Aturan containment `0.90` dan shared-prefix
20 token/80% yang digunakan collector tetap berlaku. Dokumen pertama menurut
`document_id` dipertahankan sebagai record canonical; dokumen near-duplicate
berikutnya dihapus dari salinan. Anotasi pada dokumen yang dihapus dipindahkan
ke record canonical.

Command menolak output yang sudah ada atau sama dengan input. Database sumber
tidak diubah, sehingga hasil sebaiknya diaudit terlebih dahulu sebelum dipakai
sebagai dataset anotasi atau diekspor ulang.

## Perilaku snowball dan batasan

- Kedalaman snowball tetap satu tingkat: `seed -> channel yang ditemukan`. Channel turunan tidak menghasilkan cucu channel.
- Maksimum channel adalah batas total yang diproses, bukan batas per seed.
- Pesan kosong, channel privat/tidak tersedia, atau channel yang gagal diakses tidak menghasilkan dokumen tersimpan; collector melanjutkan channel berikutnya.
- Bila Telegram mengirim `FloodWaitError`, collector menunggu selama jumlah detik yang diberikan Telegram lalu mencoba ulang channel yang sama. Pesan yang telah terbaca sebelum retry tidak menggandakan data karena storage melakukan deduplikasi.
- Satu pesan dapat dibaca tetapi tidak disimpan karena bukan kandidat keyword atau karena aturan deduplikasi.
- Jumlah dokumen yang tersimpan karena itu bisa jauh lebih kecil daripada `max_messages_per_channel × max_channels`.

## Mengekspor hasil

Setelah scraping, buat CSV dan Parquet dari database:

```powershell
uv run --no-cache python -m scripts.export_dataset `
  --database data/interim/telegram_filtered_pilot_v2.sqlite `
  --output-dir data/interim/telegram_filtered_pilot_v2_exports
```

Periksa `documents.csv` di folder output. Database atau ekspor lama tidak akan berubah bila Anda menjalankan collector ke path database baru.
