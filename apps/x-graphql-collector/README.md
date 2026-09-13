# X GraphQL Collector

Extension Chrome terpisah untuk collection riset dari hasil pencarian **Terbaru**
di X. App ini tidak mengubah `apps/browser-extension/`; build dan output-nya
berada di `apps/x-graphql-collector/.output/`.

## Build

```powershell
pnpm install
pnpm test
pnpm compile
pnpm build
```

Load `apps/x-graphql-collector/.output/chrome-mv3` melalui
`chrome://extensions` dengan **Developer mode** dan **Load unpacked**.

## Penggunaan

1. Buka X dan lakukan pencarian dengan tab **Terbaru** secara manual.
2. Pastikan tab hasil pencarian X menjadi tab aktif.
3. Buka popup extension, isi query jika ingin membatasi query yang dipantau.
4. Pilih **Mode pencarian**: `Terbaru (Latest)` atau `Populer (Top)`.
5. Tekan **Mulai monitor**.
6. Scroll halaman X secara manual untuk memicu request `SearchTimeline` baru.
7. Setelah **Monitoring aktif**, tekan **Start Auto-scroll** jika ingin halaman digulir otomatis.
8. Tekan **Stop Auto-scroll** untuk menghentikan scroll tanpa menghentikan monitoring.
9. Tekan **Stop**, lalu **Export JSON**.

Query dan mode pada popup dapat diedit tanpa polling state mengembalikannya ke
nilai monitor sebelumnya. Filter `rawQuery` dan `product` ditetapkan ketika
**Mulai monitor** ditekan. Untuk mengganti query atau mode, tekan **Stop**, ubah
input, lalu tekan **Mulai monitor** lagi. Perbandingan `rawQuery` dan `product`
bersifat exact match.

Auto-scroll melompat langsung ke posisi bawah halaman saat ini setiap 2 detik.
Karena hasil pencarian X memakai infinite scroll, extension kemudian menunggu
batch baru; jika tinggi halaman bertambah, extension melompat lagi ke posisi
bawah terbaru. Auto-scroll berhenti jika tombol stop ditekan, monitoring
dihentikan, debugger terlepas, halaman tidak bertambah tiga kali berturut-turut,
atau batas pengaman 500 langkah tercapai.

Chrome akan menampilkan indikator debugger ketika tab sedang dipantau. Login X
tetap dilakukan manual dan extension tidak membaca atau menyimpan cookie, bearer
token, request header, response header, maupun payload GraphQL penuh.

## JSON output

Output hanya menyimpan field yang diperlukan pipeline collection:

```json
{
  "schema_version": 1,
  "source": "x_search_timeline",
  "query": "situs slot gacor",
  "collected_at": "2026-08-16T00:00:00.000Z",
  "items": [
    {
      "source_item_id": "123",
      "text_raw": "bonus slot gacor",
      "source_url": "https://x.com/i/web/status/123",
      "published_at": "Wed Jan 01 00:00:00 +0000 2025"
    }
  ]
}
```

### Import JSON ke database X existing

Gunakan `--input` secara eksplisit. Jangan menulis path JSON sebagai argumen
posisi.

Untuk melanjutkan database X yang sudah ada:

```powershell
uv run --no-cache python scripts/import_x_files.py `
  --input "$env:USERPROFILE\Downloads\x-search-timeline-slot-gacor.json" `
  --database data/interim/x.sqlite `
  --candidate-only `
  --language-filter strict
```

Dry-run tanpa mengubah database:

```powershell
uv run --no-cache python scripts/import_x_files.py `
  --input "$env:USERPROFILE\Downloads\x-search-timeline-slot-gacor.json" `
  --dry-run
```

Untuk file yang sudah berada di `configs`:

```powershell
uv run --no-cache python scripts/import_x_files.py `
  --input configs\x-search-timeline-slot-gacor.json `
  --database data/interim/x.sqlite `
  --candidate-only `
  --language-filter strict
```

Database existing tidak dihapus. Import menambah satu collection run baru dan
melewatkan item yang sudah ada melalui normalisasi/deduplication. Counter output
`parsed`, `inserted`, `non_candidate`, `non_indonesian`, dan `duplicates`
menjelaskan hasil setiap file. Provenance disimpan sebagai
`source_type=x_graphql_extension_json`.

Importer akan menghitung `language_hint` secara lokal, menjalankan weak-label
candidate filter, dan melakukan deduplikasi yang sama dengan collector lain.

## Batasan

- Extension hanya mengamati response yang dibuat halaman X; extension tidak membuat request GraphQL baru.
- Operation ID GraphQL tidak di-hard-code dan dapat berubah mengikuti X.
- Response body dapat tidak tersedia jika tab ditutup, debugger terlepas, atau Chrome menghapus request dari buffer.
- Hasil adalah bounded sample dari sesi browser, bukan arsip lengkap X.
- `chrome.debugger` dan indikator debugger membuat app ini ditujukan untuk collection lokal peneliti, bukan publikasi Chrome Web Store.
