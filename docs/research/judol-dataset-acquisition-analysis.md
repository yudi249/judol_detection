# Analisis Metode Pengumpulan Dataset Paper Judol Indonesia

Last updated: 2026-07-09

Dokumen ini merangkum bagaimana paper judol Indonesia mengumpulkan,
memfilter, dan melabeli dataset. Fokusnya adalah metode dataset, bukan
performa model. Delapan paper dengan PDF lokal sudah dikonversi ke Markdown di
`docs/research/papers/judol-dataset-methods/converted-md/`; dua paper IEEE
masih metadata-only karena belum ada PDF lokal.

Catatan kualitas ekstraksi: sebagian file hasil Markitdown memiliki encoding
aneh atau tabel yang bercampur antar kolom, tetapi nomor baris tetap dapat
dipakai untuk audit sumber.

## Executive Summary

Metode pengumpulan dataset yang paling kuat untuk skripsi ini sebaiknya
berbentuk hybrid: keyword-based untuk discovery awal, API/scraping untuk
pengambilan data, manual annotation untuk ground truth, dan pseudo-labeling
hanya setelah ada model awal yang cukup presisi.

Temuan utama:

- X/Twitter: paper Perdana et al. memakai query eksplisit `(slot OR gacor OR untung OR cuan) lang:id`, jadi Twitter/X jelas keyword-based. Sumber: `converted-md/5DYFDX3A-perdana-2024-twitter-keyword-dataset.md:L194-L213`.
- YouTube: sebagian besar paper memakai YouTube Data API v3 atau dataset turunan YouTube. Santika et al. memilih 10 video trending kategori gaming, sedangkan Angelo et al. mengambil komentar dari kanal Deddy Corbuzier dan Jess No Limit. Sumber: `converted-md/AQL2DL9V-santika-2025-youtube-semisupervised-dataset.md:L341-L364`; `converted-md/JDRGFXYF-angelo-2025-youtube-ml-dataset.md:L187-L190`.
- Web `.go.id`: Nurseno et al. memakai FOFA API, Google dork/domain seed, Python scraping, dan keyword `slot`, `judi`, `gacor`, `togel`. Sumber: `converted-md/IXXGJ6YQ-nurseno-2024-goid-webscraping-dataset.md:L112-L117`; `converted-md/IXXGJ6YQ-nurseno-2024-goid-webscraping-dataset.md:L135-L140`; `converted-md/IXXGJ6YQ-nurseno-2024-goid-webscraping-dataset.md:L167-L183`.
- Labeling yang paling defensible adalah manual annotation dengan kriteria eksplisit dan, bila mungkin, dua annotator plus adjudication. Perdana et al. memakai dua annotator, Cohen's Kappa, dan third expert; Ammar et al. memakai keyword pre-labeling lalu dua annotator. Sumber: `converted-md/5DYFDX3A-perdana-2024-twitter-keyword-dataset.md:L184-L193`; `converted-md/5DYFDX3A-perdana-2024-twitter-keyword-dataset.md:L228-L251`; `converted-md/BN63T94I-ammar-2025-youtube-spam-dataset.md:L165-L182`.
- Unicode/obfuscation muncul sebagai masalah nyata pada YouTube. Santika et al. melakukan unicode conversion dan penggabungan keyword yang dipisah spasi; Angelo et al. secara khusus menormalkan Unicode, homoglyph, emoji-styled letters, dan manipulated spelling. Sumber: `converted-md/AQL2DL9V-santika-2025-youtube-semisupervised-dataset.md:L385-L391`; `converted-md/JDRGFXYF-angelo-2025-youtube-ml-dataset.md:L292-L315`.

## Paper-by-Paper Evidence

### Perdana et al. 2024 - Indonesian Twitter/X

Metode: keyword-based Twitter search, lalu manual labeling.

Ground truth yang bisa diambil:

- Paper menyebut tantangan utama adalah menentukan keyword efektif untuk retrieval dari Twitter. Sumber: `converted-md/5DYFDX3A-perdana-2024-twitter-keyword-dataset.md:L103-L113`.
- Query eksplisit yang dipakai adalah `(slot OR gacor OR untung OR cuan) lang:id`; target minimalnya 5.000 tweet Indonesia. Sumber: `converted-md/5DYFDX3A-perdana-2024-twitter-keyword-dataset.md:L194-L213`.
- Hasilnya 6.038 data Twitter berdasarkan keyword. Sumber: `converted-md/5DYFDX3A-perdana-2024-twitter-keyword-dataset.md:L326-L334`.
- Labeling memakai dua annotator, rekonsiliasi, third expert, dan Cohen's Kappa. Sumber: `converted-md/5DYFDX3A-perdana-2024-twitter-keyword-dataset.md:L184-L193`; `converted-md/5DYFDX3A-perdana-2024-twitter-keyword-dataset.md:L275-L280`.
- Kriteria label positif meliputi ajakan ikut judi online, link/nama platform, hasil aktivitas judi, dan instruksi bergabung. Sumber: `converted-md/5DYFDX3A-perdana-2024-twitter-keyword-dataset.md:L228-L251`.

Implikasi untuk skripsi: gunakan query seed Twitter/X sebagai baseline awal, tetapi catat bias karena data yang terkumpul akan condong ke istilah eksplisit seperti `slot`, `gacor`, `untung`, dan `cuan`.

### Santika et al. 2025 - YouTube Semi-Supervised

Metode: YouTube Data API v3, seed video kategori gaming, manual label 10%, lalu pseudo-labeling.

Ground truth yang bisa diambil:

- Data dikumpulkan memakai YouTube Data API v3 melalui Google Cloud Platform. Sumber: `converted-md/AQL2DL9V-santika-2025-youtube-semisupervised-dataset.md:L341-L346`.
- Target awalnya 10.000 komentar berbahasa Indonesia dari 10 video trending kategori gaming pada 5 Mei 2025. Sumber: `converted-md/AQL2DL9V-santika-2025-youtube-semisupervised-dataset.md:L344-L364`.
- Setelah terkumpul, 10% data dilabel manual menjadi Promotion dan Non-Promotion. Sumber: `converted-md/AQL2DL9V-santika-2025-youtube-semisupervised-dataset.md:L368-L377`.
- Indikator Promotion mencakup nama situs judi, ajakan seperti `main`, `gampang`, `coba`, dan istilah seperti `jepe`, `nagih`, `slot`. Sumber: `converted-md/AQL2DL9V-santika-2025-youtube-semisupervised-dataset.md:L368-L377`.
- Total dataset 10.101 komentar; 10% atau sekitar 1.010 komentar dilabel manual; setelah preprocessing tersisa 9.880 data. Sumber: `converted-md/AQL2DL9V-santika-2025-youtube-semisupervised-dataset.md:L509-L514`.
- Pseudo-labeling dilakukan pada dataset yang belum berlabel, lalu model dilatih ulang. Sumber: `converted-md/AQL2DL9V-santika-2025-youtube-semisupervised-dataset.md:L555-L564`.
- Preprocessing mencakup unicode conversion, penghapusan emoji/URL/karakter asing/simbol, dan penggabungan keyword promosi yang dipisah spasi. Sumber: `converted-md/AQL2DL9V-santika-2025-youtube-semisupervised-dataset.md:L385-L392`.

Implikasi untuk skripsi: untuk YouTube, strategi paling defensible adalah memilih video seed yang berisiko tinggi, bukan hanya mencari kata kunci. Pseudo-labeling boleh dipakai untuk memperbesar data, tetapi human-labeled dan pseudo-labeled harus dipisah.

### Kamdan et al. 2025 - YouTube IndoBERT

Metode: YouTube Data API v3 dari video publik, manual labeling, dataset seimbang.

Ground truth yang bisa diambil:

- Framework penelitian dimulai dari pengumpulan komentar video publik memakai YouTube Data API v3, lalu disimpan sebagai CSV. Sumber: `converted-md/ACI2T66J-kamdan-2025-youtube-indobert-dataset.md:L157-L185`.
- Pengumpulan mengambil komentar video publik, metadata, komentar, waktu publikasi, dan like count. Sumber: `converted-md/ACI2T66J-kamdan-2025-youtube-indobert-dataset.md:L189-L202`.
- Label manual membagi komentar menjadi spam promosi judi dan non-spam; kriteria mencakup situs judi, referral code, dan istilah terkait judi. Sumber: `converted-md/ACI2T66J-kamdan-2025-youtube-indobert-dataset.md:L212-L221`.
- Dataset berisi 2.315 komentar YouTube, dengan field video ID, user ID, comment content, timestamp, like count, dan label. Sumber: `converted-md/ACI2T66J-kamdan-2025-youtube-indobert-dataset.md:L271-L284`.
- Distribusi label hampir seimbang: 1.170 spam dan 1.145 non-spam. Sumber: `converted-md/ACI2T66J-kamdan-2025-youtube-indobert-dataset.md:L299-L304`.
- Karakteristik spam mencakup encoded text atau modified spelling, frasa promosi, platform judi, referral links, dan klaim kemenangan. Sumber: `converted-md/ACI2T66J-kamdan-2025-youtube-indobert-dataset.md:L305-L315`.

Implikasi untuk skripsi: desain field dataset perlu menyimpan `video_id`, `comment_id`, `timestamp`, `like_count`, dan label. Namun user ID sebaiknya di-hash atau tidak disimpan mentah.

### Ammar et al. 2025 - YouTube Spam Dataset

Metode: YouTube Data API v3, keyword-heuristic pre-labeling, manual verification by annotators.

Ground truth yang bisa diambil:

- Dataset utama adalah komentar YouTube Indonesia. Paper menekankan YouTube sebagai ruang komentar publik yang rentan promosi judi. Sumber: `converted-md/BN63T94I-ammar-2025-youtube-spam-dataset.md:L120-L148`.
- Data dikumpulkan dengan YouTube Data API v3, mencakup top-level comments dan nested replies. Sumber: `converted-md/BN63T94I-ammar-2025-youtube-spam-dataset.md:L149-L158`.
- Corpus awal berisi 26.208 komentar dari beberapa kanal Indonesia. Sumber: `converted-md/BN63T94I-ammar-2025-youtube-spam-dataset.md:L159-L164`.
- Pre-labeling otomatis memakai keyword heuristic, termasuk brand names seperti `pulauwin`, `slot`, `maxwin`, frasa `judi online`, `daftar sekarang`, `bonus deposit`, serta URL/Telegram/WhatsApp handle. Sumber: `converted-md/BN63T94I-ammar-2025-youtube-spam-dataset.md:L165-L177`.
- Manual annotation dilakukan oleh dua annotator yang memverifikasi pre-label dan mengecek kasus ambigu. Sumber: `converted-md/BN63T94I-ammar-2025-youtube-spam-dataset.md:L177-L182`.
- Final dataset sangat imbalanced: 1.400 spam dan 24.808 non-spam. Sumber: `converted-md/BN63T94I-ammar-2025-youtube-spam-dataset.md:L184-L188`.
- Split stratified 80/20 mempertahankan distribusi label; paper juga menguji undersampling dan SMOTE. Sumber: `converted-md/BN63T94I-ammar-2025-youtube-spam-dataset.md:L315-L343`.
- Limitasi: dataset terbatas pada 19 video di 9 kanal. Sumber: `converted-md/BN63T94I-ammar-2025-youtube-spam-dataset.md:L651-L654`.

Implikasi untuk skripsi: pre-labeling berbasis keyword bagus untuk mempercepat annotation, tetapi jangan langsung dianggap ground truth. Harus ada verifikasi manual, terutama karena kelas positif sangat minoritas.

### Manullang et al. 2025 - Public Kaggle YouTube Dataset

Metode: menggunakan dataset publik Kaggle, bukan scraping sendiri.

Ground truth yang bisa diambil:

- Paper memakai dataset publik `Deteksi Judi Online` dari Kaggle. Sumber: `converted-md/JRUTHJUT-manullang-2025-youtube-spam-dataset.md:L116-L123`.
- Dataset terdiri dari 6.351 komentar dari live YouTube `Wayang Jogja Night Carnival #9` pada kanal `@TribunJogjaOfficial`. Sumber: `converted-md/JRUTHJUT-manullang-2025-youtube-spam-dataset.md:L121-L131`.
- Field mencakup datetime, author name, original comment, cleaned message, dan binary label. Sumber: `converted-md/JRUTHJUT-manullang-2025-youtube-spam-dataset.md:L141-L146`.
- Dataset dilabel manual oleh pembuat dataset dengan label 1 untuk spam judi online dan 0 untuk non-spam. Sumber: `converted-md/JRUTHJUT-manullang-2025-youtube-spam-dataset.md:L160-L167`.
- Paper mencatat keterbatasan karena dataset spesifik pada satu event dan satu sumber YouTube. Sumber: `converted-md/JRUTHJUT-manullang-2025-youtube-spam-dataset.md:L164-L167`.

Implikasi untuk skripsi: dataset Kaggle ini bisa dipakai sebagai benchmark awal, tetapi tidak cukup sebagai satu-satunya sumber karena terlalu sempit pada satu live event.

### Pratama et al. 2025 - Kaggle YouTube Balanced Dataset

Metode: menggunakan dataset sekunder Kaggle `Deteksi Judi Online`, dari komentar YouTube satu live event.

Ground truth yang bisa diambil:

- Data dikumpulkan dari komentar video YouTube `LIVE Wayang Jogja Night Carnival #9`. Sumber: `converted-md/PMVNB2PV-pratama-2025-youtube-transformer-dataset.md:L54-L61`.
- Dataset sudah dilabel oleh pembuat dataset, berisi 6.350 komentar. Sumber: `converted-md/PMVNB2PV-pratama-2025-youtube-transformer-dataset.md:L62-L68`.
- Distribusinya seimbang: 3.163 `Bukan Promosi` dan 3.187 `Promosi`. Sumber: `converted-md/PMVNB2PV-pratama-2025-youtube-transformer-dataset.md:L62-L68`.
- Paper menyebut data terbatas pada satu kanal YouTube. Sumber: `converted-md/PMVNB2PV-pratama-2025-youtube-transformer-dataset.md:L73-L80`.
- Sumber data eksplisit adalah Kaggle `Deteksi Judi Online`. Sumber: `converted-md/PMVNB2PV-pratama-2025-youtube-transformer-dataset.md:L104-L110`.
- Preprocessing mencakup case folding, URL cleaning, karakter khusus, slang normalization, filtering teks pendek, dan duplicate removal. Sumber: `converted-md/PMVNB2PV-pratama-2025-youtube-transformer-dataset.md:L92-L126`.
- Word cloud menunjukkan kata promosi seperti `freebet`, `gratis`, `bonus`, dan `deposit`; error analysis menunjukkan obfuscation seperti `d3p0`, `b0nus`, `0nline`. Sumber: `converted-md/PMVNB2PV-pratama-2025-youtube-transformer-dataset.md:L669-L696`.

Implikasi untuk skripsi: paper ini memperkuat bahwa baseline keyword tidak cukup hanya `slot`/`judi`; istilah transaksi dan bonus perlu dipakai sebagai expansion seed.

### Angelo et al. 2025 - YouTube API, Obfuscation, Pseudo-Labeling

Metode: YouTube Data API v3 dari kanal seed, manual label awal, pseudo-labeling confidence tinggi, normalisasi karakter kuat.

Ground truth yang bisa diambil:

- Data dikumpulkan dari komentar video pada kanal Deddy Corbuzier dan Jess No Limit, 1 Januari 2025 sampai 19 Juni 2025, total 160 video. Sumber: `converted-md/JDRGFXYF-angelo-2025-youtube-ml-dataset.md:L183-L190`.
- Pengambilan memakai YouTube Data API v3. Sumber: `converted-md/JDRGFXYF-angelo-2025-youtube-ml-dataset.md:L187-L190`.
- Total raw comments mencapai 1.055.716; kandidat dataset 20.539; ground truth awal 1.648 komentar manual. Sumber: `converted-md/JDRGFXYF-angelo-2025-youtube-ml-dataset.md:L240-L250`.
- Pseudo-labeling menerima hanya prediksi dengan confidence di atas 0.90. Sumber: `converted-md/JDRGFXYF-angelo-2025-youtube-ml-dataset.md:L240-L249`.
- Initial set seimbang: 824 promotion dan 824 non-gambling. Sumber: `converted-md/JDRGFXYF-angelo-2025-youtube-ml-dataset.md:L216-L225`.
- Final split memakai stratified 80/20 dan SMOTE pada training set. Sumber: `converted-md/JDRGFXYF-angelo-2025-youtube-ml-dataset.md:L226-L232`.
- Test set berisi 1.823 komentar: 1.114 non-promotion dan 709 promotion. Sumber: `converted-md/JDRGFXYF-angelo-2025-youtube-ml-dataset.md:L526-L531`.
- Preprocessing secara eksplisit menargetkan Unicode, symbol, emoji, manipulated spelling, character splitting, dan homoglyph. Sumber: `converted-md/JDRGFXYF-angelo-2025-youtube-ml-dataset.md:L292-L315`.

Implikasi untuk skripsi: paper ini paling relevan untuk tesis Unicode-robust. Strategi scraping bisa memakai seed channel/video, tetapi evaluasi harus menyertakan adversarial slice berisi Unicode/homoglyph/emoji obfuscation.

### Nurseno et al. 2024 - `.go.id` Web Scraping

Metode: Google dork / FOFA seed, FOFA API, Python web scraping, keyword validation.

Ground truth yang bisa diambil:

- Paper mengembangkan web scraper Python untuk mendeteksi hidden online gambling pada `.go.id`. Sumber: `converted-md/IXXGJ6YQ-nurseno-2024-goid-webscraping-dataset.md:L80-L96`.
- Metode awal memakai Google dork queries pada `.go.id` yang mengandung kata mirip `slot`; periode scraping 25-26 Oktober 2023. Sumber: `converted-md/IXXGJ6YQ-nurseno-2024-goid-webscraping-dataset.md:L112-L117`.
- FOFA menghasilkan sekitar 450.000 records dan diambil melalui FOFA API, lalu dibersihkan menjadi 183.927 website `.go.id`. Sumber: `converted-md/IXXGJ6YQ-nurseno-2024-goid-webscraping-dataset.md:L135-L140`.
- Python scraper mengecek akses HTTPS/HTTP dengan timeout 5 detik. Sumber: `converted-md/IXXGJ6YQ-nurseno-2024-goid-webscraping-dataset.md:L154-L161`.
- Keyword yang dipakai untuk analisis halaman adalah `slot`, `judi`, `gacor`, dan `togel`. Sumber: `converted-md/IXXGJ6YQ-nurseno-2024-goid-webscraping-dataset.md:L167-L183`.
- Validasi mempertimbangkan URL/title terkait judi online dan mengecualikan kasus berita/pencegahan yang bukan kompromi. Sumber: `converted-md/IXXGJ6YQ-nurseno-2024-goid-webscraping-dataset.md:L189-L222`.
- Hasil: 183.927 website diproses, 1.482 terdeteksi keyword, 958 true positive, dan 6.437 URL mengarah ke judi online. Sumber: `converted-md/IXXGJ6YQ-nurseno-2024-goid-webscraping-dataset.md:L240-L274`.
- Paper mengakui limitation encoding dan evolusi keyword seperti `toto`, `zeus`, `4D`. Sumber: `converted-md/IXXGJ6YQ-nurseno-2024-goid-webscraping-dataset.md:L328-L334`.

Implikasi untuk skripsi: untuk web scraping, keyword matching perlu disertai validation rule agar kata seperti `judi` pada berita pencegahan tidak otomatis menjadi label positif.

### Metadata-Only Papers

`6L8K4MSX` dan `26Z3Q7TB` belum dipakai sebagai ground truth full text karena PDF lokal belum tersedia. Keduanya boleh disebut sebagai kandidat literatur tambahan, tetapi tidak dipakai untuk menyimpulkan keyword atau protokol scraping final sampai full text diperoleh.

## Method Taxonomy

| Method | Paper evidence | Use for thesis |
| --- | --- | --- |
| Keyword-based search | Perdana Twitter query; Nurseno web keywords; Ammar pre-labeling keywords | Seed discovery awal dan weak pre-labeling |
| Platform/API collection | YouTube Data API v3 pada Santika, Kamdan, Ammar, Angelo | Jalur legal/terstruktur untuk YouTube comments |
| Seed video/channel/domain | Santika: trending gaming videos; Angelo: Deddy/Jess No Limit; Nurseno: `.go.id` and FOFA/domain seeds | Mengurangi blind scraping; membuat sampling bisa dijelaskan |
| Web scraping | Nurseno Python scraper dengan requests, BeautifulSoup, CSV | Cocok untuk web/domain, bukan langsung untuk X/Twitter |
| Manual annotation | Perdana, Santika, Kamdan, Ammar, Angelo, Kaggle datasets | Sumber ground truth utama |
| Pseudo-labeling | Santika dan Angelo | Boleh untuk scale-up, harus dipisah dari human labels |
| Unicode/obfuscation handling | Santika, Pratama, Ammar, Angelo, Nurseno | Harus jadi slice evaluasi khusus dalam skripsi |

## Ground Truth for Our Dataset Search

### 1. Baseline keyword awal

Keyword inti yang punya dukungan paper:

- `slot`, `gacor`, `judi`, `togel`
- `untung`, `cuan`
- `bonus`, `deposit`, `freebet`, `gratis`
- `maxwin`, `jepe`, `jackpot`
- brand/domain/contact patterns seperti nama situs, URL, Telegram/WhatsApp handle

Sumber utama: Perdana query seed; Ammar heuristic pre-labeling; Nurseno web keywords; Pratama word cloud. Sumber: `converted-md/5DYFDX3A-perdana-2024-twitter-keyword-dataset.md:L194-L213`; `converted-md/BN63T94I-ammar-2025-youtube-spam-dataset.md:L165-L177`; `converted-md/IXXGJ6YQ-nurseno-2024-goid-webscraping-dataset.md:L167-L183`; `converted-md/PMVNB2PV-pratama-2025-youtube-transformer-dataset.md:L669-L696`.

### 2. Platform strategy

- X/Twitter: mulai dengan query keyword, tetapi catat keyword bias dan limit akses. Query Perdana bisa menjadi baseline pembanding.
- YouTube: gunakan YouTube Data API v3; pilih video seed dengan alasan yang eksplisit, misalnya kategori gaming/trending, kanal besar, atau live event yang rawan spam.
- Telegram: belum ada paper lokal di batch ini, jadi gunakan keyword baseline dari Twitter/YouTube sebagai seed awal, tetapi metode pengambilan Telegram harus dicatat sebagai kontribusi metodologis sendiri.
- Web/domain: gunakan approach Nurseno hanya untuk domain/page crawling, dengan validation rule untuk membedakan promosi judi dari artikel pencegahan judi.

### 3. Dataset fields minimum

Untuk setiap row dataset, simpan:

- `platform`
- `source_type` (`api`, `scraper`, `manual_download`, `public_dataset`)
- `source_seed` (`keyword`, `video_id`, `channel`, `domain`, `group/channel`)
- `collection_query`
- `source_id_hash`
- `raw_text`
- `normalized_text`
- `unicode_obfuscation_flags`
- `label`
- `label_source` (`human`, `heuristic_prelabel`, `pseudo_label`, `public_dataset`)
- `paper_basis`
- `collected_at`
- `annotated_at`
- `notes`

### 4. Labeling policy

- Human-labeled rows menjadi ground truth utama.
- Heuristic/keyword rows hanya boleh menjadi candidate positives sampai diverifikasi.
- Pseudo-labeled rows harus diberi `label_source = pseudo_label` dan tidak dicampur sebagai human ground truth.
- Kasus ambiguous harus punya catatan, terutama komentar yang mengandung kata umum seperti `slot waktu` atau istilah non-judi.

### 5. Unicode robustness policy

Skripsi ini harus memisahkan raw positive, normalized positive, dan adversarial/Unicode-obfuscated positive. Alasannya, beberapa paper sudah menunjukkan bahwa obfuscation berupa Unicode, homoglyph, symbol, emoji, spacing, dan character substitution adalah bagian dari pola promosi judol di komentar YouTube. Sumber: `converted-md/JDRGFXYF-angelo-2025-youtube-ml-dataset.md:L292-L315`; `converted-md/PMVNB2PV-pratama-2025-youtube-transformer-dataset.md:L683-L696`; `converted-md/BN63T94I-ammar-2025-youtube-spam-dataset.md:L138-L147`.

## Recommended Dataset Collection Protocol

1. Start dengan pilot kecil per platform:
   - X/Twitter: query `(slot OR gacor OR untung OR cuan) lang:id` plus expansion terms.
   - YouTube: 10-20 seed videos dari kategori/konten berisiko, bukan hanya keyword comments.
   - Telegram: keyword/channel search menggunakan baseline yang sama, dengan catatan etika dan akses.
2. Simpan semua seed dan query dalam dataset, bukan hanya teks hasil scraping.
3. Jalankan deduplication dan bounded evidence storage.
4. Buat candidate positive dengan keyword/heuristic.
5. Lakukan manual annotation minimal dua pass:
   - pass pertama: positive/negative/uncertain
   - pass kedua: reconcile uncertain dan false-positive traps
6. Pisahkan subset:
   - human-labeled train/dev/test
   - pseudo-labeled expansion
   - Unicode adversarial test set
7. Gunakan keyword expansion hanya setelah analisis word frequency dari data yang sudah terkumpul.

## Limitations

- Banyak paper YouTube memakai satu event, beberapa kanal, atau kategori tertentu, sehingga ada platform dan topic bias.
- Keyword-based search menghasilkan keyword bias: istilah yang dicari akan mendominasi data.
- Pseudo-labeling membantu skala, tetapi berisiko memperkuat bias model awal.
- Dataset publik Kaggle `Deteksi Judi Online` penting sebagai baseline, tetapi terlalu sempit jika digunakan sendirian.
- Paper web `.go.id` relevan untuk keyword dan scraping validation, tetapi task-nya berbeda dari komentar sosial media.
- Dua paper IEEE belum punya PDF lokal, sehingga belum dipakai sebagai ground truth full text.
- Markitdown menghasilkan encoding/table extraction yang tidak selalu bersih; untuk kutipan skripsi final, cek ulang PDF asli sebelum dimasukkan ke bab 2 atau metodologi.
