# Rencana EDA (Exploratory Data Analysis)

Last updated: 2026-07-23
Status: Perencanaan — sebelum implementasi notebook `01_sample_explore.ipynb`.
       Engine analisis Unicode sudah dipilih: **`silverspeak`** (lihat §2.4).
Terkait: `docs/research/adversarial-training-plan.md`, `docs/dataset.md`, `docs/unicode-attacks.md`, `docs/research/judol-keyword-baseline.md`, `docs/architecture.md`, `notebooks/README.md`

## 0. Tujuan EDA dalam Konteks Skripsi

Judul skripsi: **Pengembangan Sistem Deteksi Promosi Judi Online Berbasis
Deep Learning untuk Mengatasi Manipulasi Unicode dengan Adversarial Training**.

EDA di sini bukan sekadar "lihat-lihat data". EDA harus menghasilkan **bukti
kuantitatif** yang dipakai langsung di Bab 1 (latar belakang) dan Bab 3
(metodologi). Karena inti skripsi adalah manipulasi Unicode, bagian Unicode-EDA
adalah yang paling penting dan paling membedakan dari EDA klasifikasi teks
biasa.

### 0.1 Pertanyaan yang Harus Terjawab Setelah EDA Selesai

1. Berapa jumlah data, distribusi kelas, dan rasio imbalance? (sudah diketahui:
   2058 baris, seimbang 1029:1029)
2. Karakteristik teks apa yang membedakan kelas judol vs non-judol (panjang,
   keyword, struktur)?
3. **Berapa persen data yang sudah mengandung karakter non-ASCII secara alami?**
   (sudah diketahui kasar: ~76.2%)
4. Dari karakter non-ASCII itu, berapa yang benar-benar **homoglyph sengaja**
   vs **noise alami** (emoji, simbol, spasi)? ← pertanyaan inti latar belakang
5. Kata kunci sensitif apa yang paling sering muncul di kelas judol? (untuk
   attack generator Tahap 1 adversarial plan)
6. Bagaimana tokenizer pilihan (IndoBERT WordPiece / SentencePiece) gagal
   menangani homoglyph? ← bukti konkret rumusan masalah
7. Apakah dataset perlu di-stratifikasi menjadi "bersih" vs "sudah
   termanipulasi" untuk test set real-world di Tahap 4?

### 0.2 Non-Goal (jangan dikerjakan di tahap EDA)

- Tidak melatih model (itu Tahap 3 adversarial plan).
- Tidak membuat adversarial contoh (itu Tahap 1–2 adversarial plan).
- Tidak menyetujui library engine final (Q2 adversarial plan masih open).
- EDA hanya menganalisis data asli yang sudah dikumpulkan.

---

## 1. Sumber Data yang Dipakai untuk EDA

### 1.1 Dataset Utama (prioritas tertinggi)

**`data/annotation/dataset_final.xlsx`** — sheet `Sheet1`, 2058 baris, 7 kolom:

| Kolom | Arti |
| --- | --- |
| `text_raw` | Teks mentah (komentar / posting / caption) |
| `label_anotator_1`, `_2`, `_3` | Label per anotator (0 / 1) |
| `label_final` | Label ground truth final (0 / 1) |
| `agreement_count` | Jumlah anotator yang setuju |
| `agreement_status` | `unanimous` (semua 2058 baris saat ini) |

Catatan:
- Dataset sudah **seimbang persis secara artificial**: 1029 kelas 1 (judol) vs
  1029 kelas 0 (non-judol), 0 duplikat persis. Ini berarti baseline majority
  class = 50%; akurasi mentah tidak informatif tanpa konteks → prioritaskan
  F1 / precision / recall per kelas sebagai metrik utama, dan selalu
  bandingkan dengan baseline shallow (Langkah B2).
- `dataset_final_simple.xlsx` adalah versi 2 kolom (`text_raw`, `label`) —
  dipakai sebagai kemudahan loading di notebook.

> **Catatan:** **komputasi** analisis kualitas anotasi (perhitungan Cohen's
> Kappa, inter-rater agreement, audit survivorship-bias atas semua baris
> `unanimous`) **dikeluarkan dari scope EDA** dan ditangani di **sesi khusus
> anotasi**. EDA memakai `label_final` sebagai ground truth apa adanya.
> Cohen's Kappa **tetap** merupakan metode evaluasi anotasi pada metodologi
> skripsi — hanya komputasinya yang ditunda, bukan metodenya dihapus.
>
> **Open question E1:** `docs/dataset.md` menyebutkan "2 anotator + Cohen's
> Kappa", tapi file anotasi aktual memakai 3 anotator + `agreement_status`.
> Perbarui `docs/dataset.md` agar konsisten dengan schema aktual saat sesi EDA
> berlangsung (koreksi deskripsi schema saja, bukan perhitungan Kappa).

### 1.2 Data Pendukung (referensi, bukan label utama)

Database koleksi SQLite di `data/interim/` menyimpan `weak_label` (bukan ground
truth). Dipakai HANYA untuk cross-check distribusi sumber & bahasa:

| Database | Jumlah docs | Platform |
| --- | --- | --- |
| `telegram_targeted.sqlite` | 974 | Telegram |
| `youtube_api_1.sqlite` | 706 | YouTube |
| `x_manual_import.sqlite` | 155 | X |
| `youtube_api.sqlite` | 123 | YouTube |
| lainnya | <100 | beragam |

Karena `dataset_final.xlsx` tidak punya kolom `platform`/`source`, korespondensi
ke database koleksi bersifat **indirect** dan tidak boleh dipakai sebagai label.

---

## 2. Infrastruktur yang Wajib Di-reuse (jangan tulis ulang)

| Sudah ada | Lokasi | Dipakai untuk |
| --- | --- | --- |
| NFKC normalization + zero-width detection | `src/judol_detection/collection/normalizer.py` | dasar deteksi karakter non-standar |
| Keyword baseline judol | `src/judol_detection/collection/keywords.py` + `docs/research/judol-keyword-baseline.md` | analisis keyword & target substitusi |
| Skema dokumen koleksi (hash, weak_label, flags) | `src/judol_detection/collection/models.py`, `database.py` | cross-check |
| Alur SEMMA | `notebooks/README.md` | urutan notebook |
| Penampung config & report | `experiments/configs/`, `experiments/reports/` | simpan ringkasan EDA |

### 2.4 Keputusan Engine Analisis Unicode (resolved 2026-07-23)

EDA memerlukan **deteksi & klasifikasi** karakter non-standar, bukan generasi.
Riset via Context7 dan web membandingkan empat kandidat:

| Library | API deteksi untuk EDA | Python binding | Catatan |
| --- | --- | --- | --- |
| **`silverspeak`** | `find_homoglyph_words()` → `(start, end, word)`; reverse mapping eksposisi posisi & pasangan karakter | Ya, native | **Dipilih.** Multi-strategi (char-level, word-level, spell-check, LM). Terdokumentasi Context7 (165 snippet, reputasi High). |
| `decancer` | Hanya normalisasi ke ASCII + `Find()` posisi kata; **tidak ekspos char mana yang confusable** | **Tidak resmi di PyPI** (Rust/Go/native) | Benchmark tertinggi (96) tapi API normalisasi-saja tidak cukup untuk klasifikasi karakter; binding Python komunitas menambah risiko reproducibility skripsi. |
| `glin-profanity` | Deteksi leetspeak/homoglyph, tapi framing moderation/profanity | Ya | Fokusnya filter konten, bukan klasifikasi riset karakter. |
| `confusable_homoglyphs` / `homoglyphs` | Wrapper di atas UTS #39 | Ya | **Tidak terdokumentasi di Context7** → dokumentasi harus dicari manual, risiko API berubah antar versi. |

> **Keputusan: `silverspeak` dipakai sebagai engine analisis Unicode di EDA
> (Langkah D–E).** Dipilih karena (1) satu-satunya dengan API deteksi eksplisit
> yang cocok untuk menghitung & mengklasifikasi karakter, (2) native Python
> tanpa risiko binding, (3) multi-strategi memungkinkan ablasi kualitas deteksi,
> (4) terdokumentasi di Context7 sehingga API-nya dapat diverifikasi.
>
> **Pemisahan scope:** keputusan library untuk **generasi** adversarial (Q2 di
> `adversarial-training-plan.md`) tetap terpisah dan dibahas di sesi khusus
> sebelum Tahap 1. EDA hanya butuh deteksi, sehingga pemilihan `silverspeak`
> di sini tidak memaksa pilihan yang sama untuk generator.
>
> **Catatan untuk `silverspeak`:** dokumentasi Context7 menunjukkan API deteksi
> memakai mapping/reverse_mapping internal. Saat implementasi, verifikasi nama
> fungsi & signature persis terhadap versi yang terinstal (`silverspeak.__version__`),
> catat versi di `experiments/reports/eda-summary.md` untuk reproducibility.

---

## 3. Dependensi yang Perlu Ditambahkan ke `pyproject.toml`

Saat ini `pyproject.toml` hanya punya collection deps. Untuk EDA perlu
ditambahkan (via `uv add` saat sesi implementasi):

- `matplotlib` + `seaborn` — distribusi, heatmap, boxplot
- `wordcloud` — visualisasi keyword
- `scikit-learn` — split stratified, Count/TfidfVectorizer (analisis keyword)
- `silverspeak` — engine deteksi homoglyph untuk Langkah D–E (lihat §2.4)
- `transformers` — tokenizer IndoBERT (untuk analisis §7, opsional awal)

> `pandas` dan `openpyxl` sudah ada. Penambahan dependency harus dicatat di
> `claude-progress.md` dan tetap menjaga `uv.lock` reproducible.

---

## 4. Langkah-Langkah EDA

Setiap langkah menghasilkan: (a) output di notebook, (b) artefak numerik
tercatat di `experiments/reports/eda-summary.md`.

### Langkah A — Load & Audit Data Dasar

Tujuan: konfirmasi integritas dataset.

1. Load `dataset_final_simple.xlsx` (lebih ringan) sebagai sumber utama;
   cross-check jumlah dengan `dataset_final.xlsx`.
2. Cek missing value, duplikat persis (`text_hash`), panjang 0.
3. Distribusi `label_final`: konfirmasi 1029:1029, catat apakah ada baris
   non-unanimous.
4. Distribusi `agreement_status` dan `agreement_count`.
5. Catat: jumlah total, jumlah unik, jumlah duplikat, jumlah kosong.

**Output:** tabel ringkasan + 1 bar chart distribusi kelas.

### Langkah B — Karakteristik Teks Standar

Tujuan: memahami bentuk teks sebelum masuk aspek Unicode.

1. Distribusi panjang teks (jumlah karakter dan jumlah kata), boxplot per kelas.
2. Distribusi jumlah baris / kalimat per dokumen.
3. Deteksi bahasa kasar: hitung proporsi teks yang mengandung kata Indonesia
   umum vs Inggris vs gaul (bisa pakai `lingua-language-detector` yang sudah
   ada di deps, atau deteksi keyword sederhana).
4. Deteksi elemen struktural per kelas: URL, mention `@`, hashtag `#`, emoji,
   angka, tanda baca berlebih.

**Output:** histogram panjang per kelas + tabel statistik deskriptif.

### Langkah B2 — Analisis Label Leakage via Fitur Struktural ← RISIKO KRITIS

Tujuan: mendeteksi apakah kelas bisa dipisahkan dari fitur dangkal (bukan
makna teks). Bila ya, model berisiko belajar shortcut, bukan robustness, dan
adversarial training di homoglyph mungkin tidak banyak menolong.

> **Motivating evidence (inspeksi awal 2026-07-23):** di dataset aktual,
> proporsi dokumen dengan emoji kelas judol ≈ **51%** vs non-judol ≈ **13%**;
> rata-rata jumlah kata uppercase kelas judol ≈ **10.3** vs non-judol ≈ **2.3**.
> Perbedaan ini sangat besar dan berpotensi menjadi sinyal spurius. Langkah ini
> wajib mengkuantifikasi risiko tersebut sebelum training.

1. Hitung fitur struktural per dokumen: ada/tidak URL, ada/tidak mention `@`,
   ada/tidak nomor telepon/WA, jumlah emoji, jumlah kata ALL-CAPS (len > 2),
   jumlah tanda baca, rasio digit, jumlah baris.
2. Untuk setiap fitur, hitung **separability univariat**:
   - AUC ROC satu-fitur terhadap `label_final` (pakai `scikit-learn`).
   - Uji statistik (chi-square / Mann-Whitney U) per fitur vs label.
3. Latih **baseline dangkal**: TF-IDF dinonaktifkan, hanya fitur struktural +
   Logistic Regression. Catat F1-nya. Ini adalah **upper bound shortcut** —
   performa yang bisa dicapai tanpa memahami teks sama sekali.
4. Tandai fitur dengan AUC > 0.85 atau kontribusi besar di baseline dangkal
   sebagai **fitur berisiko**.

**Output:**
- Tabel AUC per fitur struktural.
- F1 baseline dangkal (shortcut).
- Daftar fitur berisiko → dipakai untuk **mengontrol** test set adversarial
  (Tahap 4) agar tidak confound: contoh homoglyph sebaiknya tidak disertai
  lonjakan emoji/uppercase yang tidak ada di data aslinya.
- Keputusan: apakah perlu **stratified control** atas fitur berbahaya saat
  split (Langkah §5).

### Langkah C — Analisis Keyword & Leksikon

Tujuan: menyusun daftar kata kunci target untuk attack generator (Tahap 1
adversarial plan).

1. Tokenisasi sederhana (casefold + split) per dokumen.
2. Hitung frekuensi kata & bigram **terpisah per kelas**.
3. Bandingkan dengan keyword baseline di
   `docs/research/judol-keyword-baseline.md` (`slot`, `gacor`, `wd`,
   `maxwin`, `link`, `situs`, `daftar`, dll).
4. Hitung kata yang **paling membedakan** kelas (log-odds ratio atau
   chi-square `SelectKBest` dari `scikit-learn`).
5. Buat word cloud terpisah untuk kelas 1 dan kelas 0.

**Output:**
- Daftar top-30 keyword khas kelas judol (dipakai sebagai **target kata**
  attack generator).
- Daftar top-30 keyword khas kelas non-judol (untuk menghindari false-positive
  trap).
- 2 word cloud.
- Disimpan ke `experiments/reports/eda-keywords.json` agar bisa diimpor Tahap 1.

### Langkah C2 — Deep-Dive Kualitatif per Kelas

Tujuan: melengkapi statistik keyword (Langkah C) dengan pemahaman naratif pola
judol nyata, sehingga target kata attack generator (Tahap 1) dan annotation
guidelines benar-benar grounded di data, bukan asumsi.

1. **Close reading**: pilih 20–30 sampel acak per kelas (total 40–60). Baca
   manual dan catat pola: CTA ("daftar sini", "klik link"), bukti WD/jackpot,
   nama situs/brand, instruksi deposit, dan untuk non-judol: alasan penolakan
   padahal mengandung keyword sensitif (mis. "slot waktu", "bonus gaji").
2. **Identifikasi hard negatives**: sampel kelas 0 yang mengandung ≥2 keyword
   judol baseline. Ini menentukan kualitas annotation guidelines dan menjadi
  **kasus uji adversarial** paling menantang nanti (homoglyph pada kata yang
  ambigu konteks).
3. **Identifikasi hard positives**: sampel kelas 1 yang minim keyword biasa —
   mungkin memakai eupemisme, inisial, atau emoji-only. Berguna memperluas
   daftar target kata.
4. Bandingkan temuan dengan `docs/research/judol-keyword-baseline.md`
   annotation guidelines; usulkan revisi bila ada pola tak tercakup.

**Output:**
- `experiments/reports/eda-qualitative-notes.md`: kategori pola naratif per
  kelas + daftar hard negatives/positives dengan `document_id`/index.
- Daftar **target kata sensitif ber-konteks** (mis. `slot` sensitif hanya bila
  berdekatan `gacor`/`wd`/`link`) — input langsung untuk attack generator.
- Usulan revisi annotation guidelines (bila ada).

> Catatan: pekerjaan manual; catat provenance & waktu di `claude-progress.md`.

### Langkah D — Karakter Non-ASCII: Cakupan & Distribusi ← INTI

Tujuan: menghasilkan angka latar belakang "masalah ini nyata di data".

Engine: **`silverspeak`** (lihat §2.4) untuk identifikasi homoglyph, dipadu
`unicodedata` bawaan Python untuk klasifikasi kategori karakter non-ASCII lain.

1. Untuk setiap dokumen, hitung jumlah karakter di luar rentang:
   - ASCII cetak standar (`\x20`–`\x7e`).
2. Klasifikasikan setiap karakter non-ASCII ke kategori memakai
   `unicodedata.name()` + `unicodedata.category()`:
   - **Emoji / pictograph** (blok Emoticons, Miscellaneous Symbols, dll).
   - **Simbol & panah** (Arrows, Mathematical Operators, dingbat).
   - **Huruf Latin Extended** (agar bisa dibedakan dari homoglyph lintas-skrip).
   - **Huruf non-Latin lintas-skrip** (Cyrillic, Greek, Armenian, Cherokee) —
     kandidat homoglyph kuat.
   - **Whitespace non-ASCII** (NBSP, thin space, dll).
   - **Zero-width / format** (ZWSP, ZWJ, BOM) — sudah terdeteksi di
     `normalizer.py`.
3. Gunakan `silverspeak.find_homoglyph_words(text)` (atau API setara sesuai
   versi terinstal) untuk menandai **kata** yang mengandung homoglyph beserta
   posisinya. Catat apakah hasil `silverspeak` konsisten dengan deteksi
   kategori "huruf non-Latin lintas-skrip" di langkah 2 — selisihnya menjadi
   indikator kualitas deteksi.
4. Hitung: untuk setiap kategori, berapa **persen dokumen** yang mengandung
   minimal satu karakter, **dipisah per kelas**.
5. Bandingkan: apakah kelas judol punya proporsi homoglyph lintas-skrip lebih
   tinggi daripada kelas non-judol?
6. **Filter false-positive karakter (wajib).** Tidak semua karakter non-ASCII
   adalah manipulasi. Pisahkan karakter non-ASCII **sah** dari yang
   **mencurigakan** agar angka "X% manipulasi" tidak bias tinggi:
   - **Sah (jangan dihitung sebagai manipulasi):** Latin Extended yang
     legitimate dalam Bahasa Indonesia/nama diri (`é`, `è`, `ñ`), karakter
     bahasa daerah, tanda baca typographic sah (`…`, `—`), emoji dekoratif
     biasa.
   - **Mencurigakan (kandidat homoglyph):** huruf non-Latin lintas-skrip yang
     menyerupai Latin (Cyrillic/Greek/Armenian a/e/o/p/c/x dll), leetspeak
     (`0`/`1` di tengah kata), simbol fonetik aneh, zero-width (sudah di
     `normalizer.py`).
   - Gunakan `silverspeak` reverse mapping untuk verifikasi: karakter
     mencurigakan yang dipetakan ke huruf Latin common = homoglyph; yang
     tidak terpetakan = tetap ditandai "unknown" untuk audit manual Langkah E.
   - Laporkan **dua angka terpisah**: "% dokumen dengan karakter non-ASCII
     apapun" (cakupan kasar) vs "% dokumen dengan karakter non-ASCII
     *mencurigakan*" (angka manipulasi yang lebih jujur).

**Output:**
- Tabel "persen dokumen dengan karakter non-ASCII per kategori per kelas".
- Stacked bar chart.
- **Angka kunci untuk Bab 1:** "X% dokumen judol mengandung minimal satu
  karakter lintas-skrip (Cyrillic/Greek/...) vs Y% dokumen non-judol."
- **Pemisahan dua angka:** non-ASCII kasar (≈ saat ini 76%) vs non-ASCII
  mencurigakan saja — keduanya dicatat agar klaim latar belakang tidak
  overstated.
- Catat versi `silverspeak` yang dipakai untuk reproducibility.

### Langkah E — Inspeksi Manual Pola Manipulasi

Tujuan: membedakan homoglyph sengaja dari noise alami (jawaban pertanyaan #4 di
§0.1). Tidak bisa diotomatiskan 100%; butuh sampling manusia.

1. Ambil **stratified sample 100–200 dokumen** yang mengandung karakter
   lintas-skrip (Cyrillic/Greek/Armenian) **dan/atau** ditandai homoglyph oleh
   `silverspeak`, seimbang antar kelas bila memungkinkan.
2. Untuk tiap dokumen sample, ekstrak pasangan: karakter non-Latin yang muncul
   + teks di sekitarnya (±10 karakter). Gunakan reverse mapping `silverspeak`
   untuk menampilkan kandidat karakter asli yang dimaksud (mis. `ο` → `o`),
   lalu verifikasi secara manual.
3. Klasifikasi manual tiap kemunculan ke:
   - **Homoglyph sengaja** (membentuk kata yang terbaca sebagai kata Indonesian
     umum, mis. `slοt`, `bοnus`, `s1ot`).
   - **Number/symbol substitution** (`sl0t`, `g@cor`).
   - **Noise alami** (emoji dekoratif, nama bahasa daerah, typo).
   - **Lainnya**.
4. Hitung proporsi tiap subkategori.

**Output:**
- File `experiments/reports/eda-manual-audit.csv` dengan kolom
  `sample_idx, label, char, silverspeak_candidate, context, category, notes`.
- Estimasi: "% karakter lintas-skrip di kelas judol yang merupakan homoglyph
  sengaja".

> Catatan: pekerjaan manual ini wajar memakan waktu; catat sebagai provenance
> riset di `claude-progress.md`.

### Langkah F — Analisis Dampak terhadap Tokenizer ← BUKTI RUMUSAN MASALAH

Tujuan: tunjukkan secara konkret mengapa model gagal (bukan karena "kurang pintar",
tapi karena representasi token rusak).

1. Ambil tokenizer IndoBERT (`indobenchmark/indobert-base-p1`, load via
   `transformers` — unduhan model besar, lakukan sekali).
2. Ambil 10–20 kata kunci judol bersih (dari Langkah C) dan versi
   **homoglyph-nya yang dibuat manual** (mis. `slot` → `slοt` dengan omicron
   Greek).
3. Untuk tiap pasangan, bandingkan:
   - Token ID bersih vs token ID homoglyph.
   - Hasil tokenisasi: apakah homoglyph pecah ke `[UNK]` / subword aneh?
4. Visualisasi: tabel pasangan + hasil tokenisasi.

**Output:**
- Tabel "kata bersih → token | kata homoglyph → token".
- Tangkapan konkret untuk Bab 1 / Bab 3: "kata `slot` di-tokenize sebagai
  satu token ID X, tetapi `slοt` (Greek omicron) menjadi `[UNK]` / pecah".

> Bila unduhan IndoBERT terlalu besar untuk sesi pertama, fallback: pakai
> tokenizer BERT base multilingual atau SentencePiece generik sebagai ilustrasi,
> dan tandai sebagai "preliminary" di laporan.

### Langkah G — Uji Awal Model Sederhana (opsional, bila waktu cukup)

Tujuan: bukti pembuka bahwa model pre-trained memang turun akurasi pada teks
homoglyph.

1. Latih baseline cepat (TF-IDF + Logistic Regression dari `scikit-learn`) pada
   split bersih.
2. Evaluasi pada: (a) data uji bersih, (b) data uji yang kata kuncinya
   disubstitusi homoglyph manual.
3. Catat penurunan F1.

**Output:** angka drop F1 awal (preliminary, bukan hasil final — itu Tahap 4).

> Ini opsional. Bisa ditunda ke awal Tahap 3/4 adversarial plan bila EDA
> sudah cukup panjang.

---

## 5. Keputusan Split Data (Output Penting EDA)

Setelah Langkah A–E, ambil keputusan strategis untuk Tahap 2–4 adversarial plan:

1. **Stratifikasi real-world test set**: apakah ada cukup dokumen dengan
   manipulasi Unicode alami untuk membentuk test set "real-world attacked"
   (skenario c di §6.1 adversarial plan)? Bila ya, sisihkan dan **beku** sebelum
   augmentasi.
2. **Strategi split**: `train/val/test` stratified berdasarkan `label_final`.
   Augmentasi **hanya pada train** (sudah ditegaskan di adversarial plan §5.2).
3. **Anti-leakage via text-similarity** (BUKAN platform): `dataset_final.xlsx`
   tidak memiliki metadata platform/sumber (resolusi E5), jadi anti-leakage
   split **tidak dapat** berbasis platform. Sebagai gantinya, deteksi dokumen
   hampir-identik lintas train/test memakai
   `src/judol_detection/collection/deduplication.py`
   (`is_near_duplicate` Jaccard/containment/shared-prefix). Pastikan tidak ada
   pasangan near-duplicate yang terbelah antara train dan test.
   - Catatan: re-join metadata platform (bila nanti dibutuhkan) adalah
     pekerjaan sesi pengumpulan data terpisah, **bukan** tugas EDA.

**Output:** `experiments/reports/eda-split-decision.md` yang dipakai langsung
oleh Tahap 2.

---

## 6. Artefak yang Harus Dihasilkan

| Artefak | Lokasi | Dipakai oleh |
| --- | --- | --- |
| Notebook EDA utama | `notebooks/01_sample_explore.ipynb` | dokumentasi SEMMA |
| Ringkasan numerik | `experiments/reports/eda-summary.md` | Bab 1 & Bab 3 thesis |
| Daftar keyword target | `experiments/reports/eda-keywords.json` | Tahap 1 attack generator |
| Audit manual homoglyph | `experiments/reports/eda-manual-audit.csv` | Bab 1 bukti |
| Laporan leakage fitur struktural | `experiments/reports/eda-feature-leakage.md` | Bab 3 metodologi + kontrol Tahap 4 |
| Catatan kualitatif per kelas | `experiments/reports/eda-qualitative-notes.md` | revisi annotation guidelines + Tahap 1 |
| Keputusan split | `experiments/reports/eda-split-decision.md` | Tahap 2 augmentasi |
| Visualisasi (png) | `experiments/reports/figures/` | `thesis/figures/` |

> Catatan: file `experiments/` saat ini kosong; buat sub-direktori `figures/`
> dan `reports/` bila belum ada saat sesi implementasi.

---

## 7. Definition of Done (EDA)

- [ ] Notebook `01_sample_explore.ipynb` berjalan end-to-end dari atas ke bawah
      tanpa error (`uv run --no-cache jupyter nbconvert --execute` atau via
      VS Code).
- [ ] Semua 8 artefak di §6 ada dan terisi.
- [ ] Keputusan split (§5) tercatat dan siap dipakai Tahap 2.
- [ ] **Analisis leakage (Langkah B2) selesai**: tabel AUC per fitur + F1
      baseline shallow + daftar fitur berisiko tercatat di
      `eda-feature-leakage.md`, dan ada keputusan eksplisit apakah fitur
      berbahaya dikontrol saat split/test adversarial.
- [ ] **Deep-dive kualitatif (Langkah C2) selesai**: catatan pola per kelas +
      daftar hard negatives/positives tercatat.
- [ ] **Angka karakter non-ASCII dilaporkan sebagai dua angka terpisah**
      (cakupan kasar vs mencurigakan saja), bukan satu angka misleading.
- [ ] Angka kunci latar belakang tercatat di `eda-summary.md`:
      - persen dokumen dengan karakter non-ASCII (kasar + mencurigakan),
      - persen dokumen dengan homoglyph lintas-skrip per kelas,
      - contoh kegagalan tokenizer.
- [ ] `docs/dataset.md` diperbarui agar konsisten dengan schema anotasi aktual
      (resolusi open question E1).
- [ ] `feature_list.json` & `claude-progress.md` diperbarui dengan fitur EDA
      baru (lihat §9).
- [ ] Tidak ada raw/private data yang di-commit sebagai fixture.

---

## 8. Open Questions (perlu keputusan sebelum/di awal implementasi)

| ID | Pertanyaan | Status | Catatan |
| --- | --- | --- | --- |
| E1 | Perbarui `docs/dataset.md`: schema anotasi aktual (3 anotator, agreement_status) vs deskripsi lama (2 anotator) | **Resolved 2026-07-24** | `docs/dataset.md` diperbarui: 3 anotator + tabel skema + catatan metadata/leakage. Cohen's Kappa tetap sebagai metode evaluasi anotasi metodologi skripsi. |
| E3 | Tokenizer uji: IndoBERT (besar) vs fallback multilingual? | Open | §Langkah F |
| E4 | Langkah G (baseline model awal) dikerjakan di EDA atau ditunda ke Tahap 3? | Open | preferensi: ditunda bila EDA sudah panjang |
| E5 | Apakah dokumen di dataset_final punya metadata platform/sumber? | **Resolved 2026-07-24: TIDAK ada metadata platform/sumber di `dataset_final.xlsx`.** | Verifikasi: file hanya 7 kolom (`text_raw, label_anotator_1/2/3, label_final, agreement_count, agreement_status`); join via `text_hash_normalized` ke `telegram_targeted/youtube_api_1/x_manual_import` = **0% overlap** (dataset anotasi Juni lebih tua dari koleksi SQLite Juli). Implikasi §5: anti-leakage split **tidak bisa** berbasis platform; pakai text-similarity (`collection/deduplication.py`) saja. Re-join metadata platform = pekerjaan sesi pengumpulan data terpisah, bukan EDA. |
| ~~E6~~ | ~~Engine analisis Unicode untuk EDA: library mana?~~ | **Resolved 2026-07-23: `silverspeak`** | lihat §2.4; Q2 (library generasi adversarial) tetap terpisah |
| E8 | Fitur struktural berisiko mana yang harus dikontrol di test set adversarial Tahap 4? | Open | output dari Langkah B2; jangan putuskan sebelum AUC terhitung |

> **Diluar scope EDA (sesi khusus):** Cohen's Kappa, inter-rater agreement,
> dan audit survivorship-bias atas baris `unanimous`. EDA memakai `label_final`
> sebagai ground truth apa adanya sampai sesi anotasi khusus diadakan.

---

## 9. Usulan Entri `feature_list.json`

Tambahkan satu fitur baru (priority tinggi, area `eda`) sebelum melanjutkan ke
implementasi adversarial Tahap 1:

```json
{
  "id": "EDA-001",
  "priority": 1,
  "area": "eda",
  "title": "Eksplorasi data anotasi (SEMMA Sample + Explore)",
  "user_visible_behavior": "Notebook 01 menghasilkan statistik dataset, keyword target, analisis karakter non-ASCII, bukti kegagalan tokenizer, dan keputusan split untuk pipeline adversarial.",
  "status": "not_started",
  "verification": [
    "Run notebook 01_sample_explore.ipynb end-to-end.",
    "Confirm all 6 artifacts in docs/research/eda-plan.md §6 exist.",
    "Run uv run --no-cache python main.py (repo tetap sehat)."
  ],
  "evidence": [],
  "notes": "Mengikuti docs/research/eda-plan.md. Output keyword & split decision dipakai langsung oleh adversarial-training-plan.md Tahap 1 & 2."
}
```

`EDA-001` menjadi satu-satunya fitur `in_progress` selama EDA berjalan, sesuai
aturan `single_active_feature`.

---

## 10. Urutan Eksekusi yang Direkomendasikan

1. Tutup open questions E1 (mutlak), E3 (pilih tokenizer), E5 (cek metadata).
   (Analisis kualitas anotasi / Cohen's Kappa sengaja tidak termasuk — sesi
   khusus, lihat catatan di §8.)
2. Tambah dependency §3 via `uv add` (termasuk `silverspeak`).
3. Kerjakan Langkah A → B (audit & statistik dasar).
4. **Kerjakan Langkah B2 (analisis leakage) sebelum lanjut** — output AUC
   fitur menentukan apakah split/test perlu kontrol fitur struktural.
5. Kerjakan Langkah C → C2 (keyword + deep-dive kualitatif).
6. Kerjakan Langkah D → E (inti Unicode — paling lama & paling penting).
   Ingat Langkah D langkah 6: laporkan dua angka (non-ASCII kasar vs
   mencurigakan).
7. Kerjakan Langkah F (bukti tokenizer).
8. (Opsional) Langkah G, atau tunda ke awal Tahap 3/4.
9. Tulis keputusan split §5, termasuk kontrol fitur berisiko dari Langkah B2.
10. Update `docs/dataset.md`, `feature_list.json`, `claude-progress.md`.
11. Commit setelah semua Definition of Done §7 terpenuhi dan user menyetujui.
