# Rencana Adversarial Training (Unicode Homoglyph)

Last updated: 2026-07-23
Status: Tahap 1 — perencanaan & pemilihan sumber data confusable
Terkait: `docs/unicode-attacks.md`, `docs/dataset.md`, `docs/research/judol-keyword-baseline.md`, `docs/architecture.md`

## 1. Konteks Skripsi

Judul: **Pengembangan Sistem Deteksi Promosi Judi Online Berbasis Deep Learning
untuk Mengatasi Manipulasi Unicode dengan Adversarial Training**.

### 1.1 Latar Belakang Masalah

- Model deep learning klasifikasi teks mengalami **penurunan akurasi** ketika
  input mengandung manipulasi Unicode, karena tokenisasi/subword tidak memetakan
  karakter lookalike ke representasi yang sama dengan karakter aslinya.
- Promosi judi online (judol) di platform sosial secara luas memakai manipulasi
  Unicode **untuk menghindari filter** kata sensitif.
- Manipulasi yang menjadi fokus utama skripsi ini adalah **Unicode lookalikes
  (homoglyph substitution)** karena ini pola yang paling sering muncul di
  promosi judol nyata di lapangan.

### 1.2 Tujuan Eksperimen

- Membangun pipeline yang menghasilkan **contoh adversarial berbasis homoglyph**
  secara terprogram dari tabel confusable resmi Unicode Consortium.
- Melatih model klasifikasi judol dengan **data campuran (asli + adversarial)**.
- Mengukur **robustness gap** akibat manipulasi Unicode dan menunjukkan bahwa
  adversarial training mengecilkan gap tersebut.

### 1.3 Ruang Lingkup Manipulasi

Direncanakan tiga kategori manipulasi Unicode (lihat juga `docs/unicode-attacks.md`):

1. **Homoglyph substitution** — fokus utama dan prioritas Tahap 1–4.
2. **Unicode character substitution** (kategori perlu diperjelas: apakah ini
   sinonim dari homoglyph atau mengacu ke substitusi simbol/fonetik).
3. **Invisible character insertion** (zero-width, ZWSP, ZWJ, dll).

Tahap 5.12 opsional menguji generalisasi ke **reordering** atau kategori lain
di luar ketiga di atas.

> Open question Q1: apakah kategori 2 (Unicode character substitution) perlu
> dibedakan secara eksplisit dari homoglyph, atau cukup digabung sebagai
> "substitusi karakter lintas-skrip"?

---

## 2. Asumsi, Sumber Data, dan Infrastruktur yang Sudah Ada

### 2.1 Sumber Data Asli (sebelum augmentasi)

- Dataset operasional ada di `data/interim/collection.sqlite` (lihat
  `docs/dataset.md`).
- Sumber koleksi: Telegram (`docs/collection/telegram-collector.md`),
  YouTube (`docs/collection/youtube-collector.md`), X
  (`docs/collection/x-collector.md`).
- Label kandidat: `weak_label` berbasis keyword (bukan ground truth final);
  label manusia + riwayat disimpan di tabel `annotations`.
- Keyword baseline judol ada di `docs/research/judol-keyword-baseline.md`
  (`slot`, `gacor`, `wd`, `maxwin`, `togel`, `link`, `situs`, dst).

### 2.2 Infrastruktur Kode yang Sudah Ada (siap diisi)

- `src/judol_detection/unicode/` — kosong, tempat attack generator.
- `src/judol_detection/preprocessing/` — kosong, tempat normalisasi (NFKC dll).
- `src/judol_detection/models/`, `training/`, `evaluation/`, `data/` — kosong.
- `experiments/configs/` dan `experiments/runs/` — siap untuk config ablasi
  dan output run.

### 2.3 Konvensi Repo yang Harus Diikuti

- Verifikasi via `uv run --no-cache python -m pytest --basetemp=.pytest-tmp`.
- Satu fitur `in_progress` di `feature_list.json` pada satu waktu.
- Update `claude-progress.md` setelah perubahan bermakna.
- Simpan snapshot tabel confusable di `data/external/` dengan versi + tanggal
  agar reproducible (tabel UTS #39 berubah tiap rilis Unicode).

---

## 3. Tahap 1 — Bangun Attack Generator Khusus Homoglyph

### 3.1 Tujuan

Membuat modul yang, diberi teks bersih + kata kunci sensitif, menghasilkan
varian teks dengan sebagian karakter diganti oleh homoglyph visual dari blok
Unicode lain (Cyrillic, Greek, Armenian, dll).

### 3.2 Langkah

1. **Kumpulkan tabel confusable resmi**
   - Sumber utama: `confusables.txt` dari Unicode UTS #39
     (`https://www.unicode.org/Public/security/<version>/confusables.txt`).
   - Versi & tanggal unduh **wajib** dicatat untuk reproducibility.
   - Simpan di `data/external/unicode-confusables/confusables-<version>.txt`.
2. **Pilih implementasi library**
   - Kandidat (lihat hasil riset Context7 di `claude-progress.md` sesi ini):
     - `confusable_homoglyphs` — wrapper Python langsung di atas tabel UTS #39.
     - `homoglyphs` — alternatif wrapper serupa.
     - `silverspeak` — riset-grade, multi-strategi normalisasi + generasi.
     - `decancer` — performa tinggi, Rust core + binding.
   - > Open question Q2: library mana yang dipakai sebagai engine utama?
3. **Definisikan fungsi substitusi**
   - Target substitusi difokuskan pada **kata kunci judol yang paling sering
     difilter** (lihat `docs/research/judol-keyword-baseline.md`): nama situs,
     `slot`, `gacor`, `wd`, `maxwin`, `link`, `situs`, `daftar`, dll.
   - Ini strategi **targeted**, bukan random — agar representatif dengan pola
     manipulasi nyata di lapangan.
   - Parameter kunci: **persentase karakter yang diganti per token** (mis.
     10–30%). Rentang ini akan dijadikan sumbu ablasi di Tahap 4.
   - Pilih homoglyph lintas-skrip yang **secara visual mirip** sesuai tabel
     UTS #39 (bukan substitusi acak ke karakter yang tidak mirip).
4. **Dokumentasikan taksonomi serangan**
   - Pemetaan substitusi homoglyph mengikuti kategori serangan NLP imperceptible
     dari Boucher dkk. (2022) — sitasi ini perlu dilengkapi bibliografinya di
     `thesis/references/`.
   - > Open question Q3: apakah referensi Boucher dkk. (2022) sudah ada
     > metadata-nya (DOI/journal) untuk dimasukkan ke daftar pustaka?

### 3.3 Output Tahap 1

- Modul `src/judol_detection/unicode/generate_unicode_variants.py` (atau nama
  serupa sesuai konvensi `snake_case`).
- Unit test `tests/unit/test_unicode_obfuscation.py`.
- Snapshot tabel confusable + metadata versi di `data/external/`.
- Fungsi API yang dapat dipanggil dari pipeline augmentasi (Tahap 2) dan dari
  FastAPI inference nanti (kontrak harus kompatibel dengan
  `docs/extension/api-contract.md`).

### 3.4 Definition of Done (Tahap 1)

- [ ] Tabel confusable tersimpan dengan versi tercatat.
- [ ] Fungsi substitusi menghasilkan varian yang **tetap dibaca manusia** sebagai
      kata aslinya (sanity check visual).
- [ ] Unit test lulus dengan `--basetemp=.pytest-tmp`.
- [ ] Targeted substitution hanya menyentuh token kata kunci (bukan seluruh
      teks secara acak) — terverifikasi via test.

---

## 4. Tahap 2 — Data Augmentation

### 4.1 Langkah

4. Dari dataset asli (label judol / bukan judol), buat versi adversarial untuk
   **sebagian data**.
5. Rasio augmentasi direncanakan **30–50%** dari total training set; nilai
   pasti diuji dalam ablasi (Tahap 4).
6. Gabungkan data asli + data adversarial; **label tetap sama** karena makna
   teks tidak berubah, hanya representasi karakter.

### 4.2 Pertimbangan

- Hanya sampel dengan label final (human annotation), bukan `weak_label`,
  yang dipakai sebagai sumber augmentasi — agar ground truth bersih.
- **Keputusan (Q4, resolved 2026-07-23): augmentasi diterapkan pada kedua kelas
  — positif (judol) DAN negatif (bukan judol).**
  - Alasan: mencegah model belajar korelasi dangkal "homoglyph = judol".
    Jika augmentasi hanya pada kelas positif, model bisa mendapat sinyal
    spurius bahwa kehadiran homoglyph sendiri adalah prediktor positif, padahal
    yang ingin dipelajari adalah **makna teks** tetap sama terlepas dari
    representasi karakter.
  - Implementasi: kata kunci judol disubstitusi pada teks positif; pada teks
    negatif, substitusi diterapkan pada token yang relevan (mis. kata umum yang
    punya homoglyph) sehingga distribusi karakter manipulasi seimbang lintas kelas.
  - Catatan ablasi: nilai rasio augmentasi positif vs negatif bisa dijadikan
    parameter eksperimen di Tahap 4 (mis. 50:50 default, varian 70:30).
- Provenance wajib: setiap baris augmentasi mencatat
  `source_row_id`, `attack_type="homoglyph"`, `attack_ratio`,
  `attack_seed`, `attack_library_version`.

### 4.3 Output Tahap 2

- Modul augmentasi (kemungkinan `src/judol_detection/data/augment.py`).
- Dataset gabungan tersimpan di `data/processed/` atau `data/adversarial/`
  dengan skema yang kompatibel dengan koleksi existing.

### 4.4 Definition of Done (Tahap 2)

- [ ] Augmentasi reproduktif (seed deterministik).
- [ ] Skema output kompatibel dengan loader training (Tahap 3).
- [ ] Statistik rasio asli:adversarial tercatat per split.

---

## 5. Tahap 3 — Training Model dengan Data Campuran

### 5.1 Langkah

6. Latih model deep learning dengan data gabungan. Kandidat arsitektur sesuai
   `docs/architecture.md`: **IndoBERT / CNN karakter / BiLSTM**.
7. Opsional: **curriculum learning** — mulai dari rasio adversarial kecil,
   naikkan bertahap per epoch, supaya model tidak overfit ke pola adversarial.

### 5.2 Pertimbangan

- > Open question Q5: apakah melatih dan membandingkan **semua** arsitektur
  > (IndoBERT + CNN + BiLSTM), atau fokus ke satu dulu sebagai model utama?
- Tokenisasi: penting untuk karakter homoglyph. IndoBERT (SentencePiece/BPE)
  berperilaku berbeda dari CNN karakter — kedua perilaku ini justru jadi
  temuan menarik untuk thesis.
- Split: train/val/test terpisah; **augmentasi hanya pada train**, jangan pada
  val/test.

### 5.3 Definition of Done (Tahap 3)

- [ ] Pipeline training berjalan end-to-end pada data gabungan.
- [ ] Kurva training (loss/metric) tersimpan di `experiments/runs/`.
- [ ] Checkpoint model tersimpan di `models/` (di-ignore Git).

---

## 6. Tahap 4 — Evaluasi Robustness

### 6.1 Skenario Uji

8. Uji model pada tiga skenario:
   - (a) **Data uji bersih** — baseline akurasi/F1.
   - (b) **Serangan homoglyph baru (unseen attack)** — generator dengan
     konfigurasi/seed berbeda dari training, untuk menguji generalisasi.
   - (c) **Data uji real-world judol** yang memang sudah termanipulasi secara
     alami di lapangan (dari koleksi Telegram/YouTube/X yang sudah dianotasi).

### 6.2 Metrik

9. Hitung **robustness gap** = (metrik pada data bersih) − (metrik pada data
   adversarial). Semakin kecil gap, semakin robust.
10. Bandingkan empat baseline (ini **kontribusi eksperimen utama** skripsi):
    - (a) Model tanpa adversarial training.
    - (b) Model + normalisasi Unicode saja (NFKC / preprocessing di
      `src/judol_detection/preprocessing/`).
    - (c) Model + adversarial training.
    - (d) Model + kombinasi normalisasi + adversarial training.

### 6.3 Ablasi

- Sumbu ablasi yang direncanakan:
  - Rasio augmentasi (mis. 10% / 30% / 50%).
  - Persentase karakter diganti per token (10% / 20% / 30%).
  - (Jika Q5 = semua arsitektur) perbandingan arsitektur.
  - (Opsional) dengan vs tanpa curriculum learning.

### 6.4 Output Tahap 4

- Laporan ringkasan di `experiments/reports/`.
- Tabel metrik per kombinasi (untuk `thesis/tables/`).
- Robustness gap terdokumentasi.

### 6.5 Definition of Done (Tahap 4)

- [ ] Empat baseline semua dieksekusi dengan config yang setara.
- [ ] Robustness gap terhitung dan tercatat.
- [ ] Temuan utama siap dituangkan ke `thesis/chapters/bab-4-hasil-pembahasan.md`.

---

## 7. Tahap 5 — Analisis Tambahan (Opsional, Menambah Kedalaman)

11. **Analisis embedding**: bandingkan jarak representasi `bank` (Latin) vs
    `bаnk` (Cyrillic `а`) sebelum vs sesudah adversarial training. Hipotesis:
    setelah adversarial training, kedua representasi menjadi lebih dekat di
    ruang vektor.
12. **Generalisasi ke manipulasi lain**: uji apakah adversarial training pada
    homoglyph transfer ke invisible character insertion atau reordering.
    Ini menjawab apakah robustness spesifik pada satu serangan atau lebih luas.

### 7.1 Output Tahap 5

- Notebook analisis di `notebooks/` (logika reusable tetap di `src/`).
- Visualisasi embedding (mis. t-SNE/UMAP atau cosine similarity) untuk
  `thesis/figures/`.

---

## 8. Open Questions (perlu keputusan sebelum implementasi)

| ID | Pertanyaan | Status | Lokasi di dokumen |
| --- | --- | --- | --- |
| Q1 | Apakah "Unicode character substitution" dibedakan dari homoglyph? | **Dibahas di sesi baru** | §1.3 |
| Q2 | Library engine utama: `confusable_homoglyphs`, `homoglyphs`, `silverspeak`, atau `decancer`? | **Dibahas di sesi baru** | §3.2 langkah 2 |
| Q3 | Metadata sitasi Boucher dkk. (2022) sudah tersedia? | Open | §3.2 langkah 4 |
| Q4 | Augmentasi hanya kelas positif, atau juga negatif? | **Resolved 2026-07-23: positif + negatif** | §4.2 |
| Q5 | Satu arsitektur utama atau bandingkan IndoBERT + CNN + BiLSTM? | **Dibahas di sesi baru** | §5.2 |
| Q6 | Persen substitusi default awal (untuk mulai sebelum ablasi)? | Open | §3.2 langkah 3 |
| Q7 | Versi Unicode `confusables.txt` yang dipakai (mis. 16.0.0 / latest)? | Open | §3.2 langkah 1 |

---

## 9. Urutan Eksekusi yang Direkomendasikan

1. Tutup Q2, Q6, Q7 → fix engine library + parameter awal.
2. Implementasi Tahap 1 (generator + tabel + test).
3. Tutup Q4 → skema augmentasi.
4. Implementasi Tahap 2 (augmentasi + provenance).
5. Tutup Q5 → pilih satu atau beberapa arsitektur.
6. Implementasi Tahap 3 (training pipeline).
7. Eksekusi Tahap 4 (empat baseline + robustness gap).
8. (Opsional) Tahap 5 untuk kedalaman.

Setiap tahap mengikuti Definition of Done masing-masing dan update
`feature_list.json` + `claude-progress.md` sebelum lanjut.
