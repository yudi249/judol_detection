Journal of Applied Informatics and Computing (JAIC)
Vol.9, No.6, December 2025, pp. 3716~3725
e-ISSN: 2548-6861 3716
Comparison of Online Gambling Promotion Detection Performance
Using DistilBERT and DeBERTa Models
Halim Meliana Pratama 1, IGN Lanang Wijayakusuma 2, Ratna Sari Widiastuti 3
Matematika, Universitas Udayana
melianaprtm016@student.unud.ac.id 1, lanang_wijaya@unud.ac.id 2, ratnasariwidiastuti@unud.ac.id
Article Info ABSTRACT
Article history: Online gambling promotions on social media have become a serious concern in
Indonesia, where perpetrators use ambiguous and disguised language to evade
Received 2025-09-22
detection. This study compares two transformer-based models, DistilBERT and
Revised 2025-11-23
DeBERTa, in detecting such content within Indonesian YouTube comments. Using
Accepted 2025-11-26
a balanced dataset of 6,350 comments, both models were fine-tuned with optimized
hyperparameters (learning rate 1e-5, batch size 32, 5 epochs) and evaluated through
Keyword:
five-fold cross-validation. Results show that DeBERTa achieves superior
DistilBERT, performance with 99.84% accuracy and perfect recall, while DistilBERT achieves
DeBERTa, 99.29% accuracy. Error and linguistic analyses indicate that DeBERTa’s
Online Gambling, disentangled attention and Byte-Pair Encoding provide better understanding of non-
Transformer, standard and ambiguous language. Despite requiring higher computational cost,
Text Classification. DeBERTa is ideal for high-accuracy applications, whereas DistilBERT remains
suitable for real-time and resource-limited environments.
This is an open access article under the CC–BY-SA license.
I. PENDAHULUAN negatifnya dapat meluas ke berbagai aspek kehidupan.
Metode moderasi konten secara manual terbukti tidak lagi
Era digital telah mengubah interaksi sosial masyarakat memadai untuk menangani volume dan kompleksitas konten
secara fundamental. Platform media sosial seperti YouTube, yang terus berkembang. Keterbatasan sumber daya manusia,
Facebook, Instagram, TikTok, dan X kini menjadi bagian subjektivitas dalam penilaian, sertaketidakmampuan dalam
dalam kehidupan sehari-hari jutaan pengguna di Indonesia. memproses data berskala besar secara real-time menjadi
Data menunjukkan bahwa pada tahun 2024, pengguna media hambatan utama dalam upaya deteksi dan pencegahan
sosial di Indonesia mencapai 191 juta pengguna, dengan penyebaran promosi judi online.
YouTube sebagai platform terpopuler yang memiliki 139 juta Beberapa penelitian telah menunjukkan efektivitas
pengguna, diikuti TikTok (98 juta), Instagram (90 juta), dan berbagai pendekatan dalam deteksi konten judi online.
X (27 juta) [1]. Pertumbuhan eksponensial ini mencerminkan Penelitian pada tahun 2024 menggunakan kombinasi TF-IDF
besarnya potensi media sosial sebagai media informasi dan dengan Random Forest untuk mendeteksi promosi judi online
interaksi, namun di sisi lain, juga membuka celah bagi di Twitter berbahasa Indonesia dan mencapai akurasi 97,87%.
berbagai bentuk penyalahgunaan konten, khususnya Namun, pendekatan ini masih memiliki keterbatasan dalam
penyebaran promosi judi online. memahami konteks semantik yang kompleks [2]. Selain itu,
Fenomena judi online telah menjadi permasalahan serius terdapat penelitian yang membandingkan algoritma Naïve
yang mengancam kesehatan sosial dan ekonomi masyarakat Bayes dan Support Vector Machine (SVM) dalam analisis
Indonesia. Para pelaku menggunakan strategi penyamaran sentimen terkait judi online, dengan SVM mencapai akurasi
yang canggih dengan memanfaatkan bahasa ambigu, istilah- tertinggi sebesar 98% [3]. Meskipun demikian, model-model
istilah terselubung, dan frasa yang tidak langsung untuk tradisional ini belum mampu menangkap nuansa bahasa dan
menghindari deteksi oleh sistem moderasi konten. Promosi variasi linguistik yang terus berkembang.
judi online seringkali menyasar segmen pengguna muda yang Perkembangan teknologi Natural Language Processing
lebih familiar dengan teknologi digital, sehingga dampak (NLP), khususnya model berbasis Transformer, telah
http://jurnal.polibatam.ac.id/index.php/JAIC

JAIC e-ISSN: 2548-6861 3717
membuka peluang baru dalam deteksi konten berbahaya online dengan lisensi Apache 2.0. Data dikumpulkan dari
secara otomatis. Model BERT (Bidirectional Encoder kolom komentar pada video YouTube berjudul "LIVE
Representations from Transformers) telah membawa Wayang Jogja Night Carnival #9" dalam rangka Perayaan
perubahan signifikan dalam bidang NLP dengan HUT ke-268 Kota Yogyakarta yang diunggah pada kanal
kemampuannya memahami konteks kata. Pada penelitian resmi penyelenggara acara. Periode pengambilan data
2023 mengembangkan model berbasis BERT untuk dilakukan pada tahun 2024, bertepatan dengan waktu
mendeteksi tanda-tanda perjudian bermasalah dalam forum penyelenggaraan acara dan aktivitas interaksi penonton
daring berbahasa Jerman dengan akurasi 81% dan presisi 95% melalui kolom komentar siaran langsung tersebut.
[4]. Namun, BERT memiliki kelemahan dalam hal kebutuhan Dataset tersebut telah melalui proses pelabelan oleh
sumber daya komputasi yang besar dan waktu inferensi yang pembuat dataset yang terdiri dari 6.350 komentar dengan
relatif lama. distribusi yang seimbang. Kelas "Bukan Promosi" (label 0)
Mengatasi keterbatasan tersebut, dikembangkan sebanyak 3.163 komentar dan kelas "Promosi" (label 1)
DistilBERT, sebuah varian BERT yang lebih ringan dan sebanyak 3.187 komentar. Distribusi balanced dataset ini
efisien. Dilihat pada penelitian tahun 2022 membandingkan penting untuk menghindari bias dalam pelatihan model dan
performa BERT dan DistilBERT dalam analisis sentimen memastikan evaluasi yang adil. Karakteristik dataset
Twitter terkait Covid-19 dan menemukan bahwa DistilBERT menggunakan bahasa Indonesia dengan variasi dialek, slang,
unggul dengan akurasi 97% serta kecepatan pemrosesan yang dan singkatan media sosial, serta kompleksitas linguistik dari
lebih tinggi, dibandingkan BERT yang hanya mencapai formal hingga informal dengan penggunaan emoji, simbol
akurasi 87% [5]. DistilBERT mampu mempertahankan khusus, dan teknik penyamaran kata. Namun demikian,
sekitar 97% performa BERT dengan hanya 40% dari jumlah penelitian ini memiliki beberapa keterbatasan. Cakupan data
parameter [6]Di sisi lain, DeBERTa (Decoding-enhanced masih terbatas pada satu kanal YouTube sehingga belum
BERT with Disentangled Attention) menawarkan pendekatan merepresentasikan variasi bahasa pengguna media sosial
yang berbeda dengan mekanisme disentangled attention yang secara luas. Selain itu, penggunaan bahasa informal dan
lebih canggih. Tahun 2024 dilakukan penelitian yang campuran (code-mixed) dapat menurunkan performa model
menunjukkan bahwa DeBERTa secara signifikan lebih karena belum dioptimalkan untuk teks jenis tersebut.
unggul dibandingkan BERT dalam klasifikasi teks politik, Dengan deskripsi komprehensif ini, penelitian memiliki
terutama setelah dilakukan fine-tuning yang tepat[7]. fondasi kuat dalam kualitas, reliabilitas, dan validitas data,
Pendekatan transfer learning dan fine-tuning akan sehingga hasil analisis dapat dipertanggungjawabkan secara
digunakan untuk mengoptimalkan performa kedua model, ilmiah dan memberikan kontribusi signifikan dalam
memungkinkan model untuk memanfaatkan pengetahuan pengembangan sistem deteksi konten berbahaya di media
bahasa yang telah dipelajari dari corpus besar, kemudian sosial.
disesuaikan dengan karakteristik unik dari konten promosi Dari sisi etika penelitian, seluruh data yang digunakan
judi online [8]. Selain itu, penelitian ini juga berasal dari komentar publik di YouTube tanpa mengakses
mengintegrasikan analisis word cloud untuk mengidentifikasi informasi pribadi pengguna. Dengan demikian, penelitian ini
pola kata kunci yang dominan dalam promosi judi online, mematuhi prinsip etika penggunaan data publik serta
sehingga dapat memberikan wawasan lebih dalam tentang memastikan bahwa proses pengumpulan dan pengolahan data
karakteristik linguistik yang digunakan oleh para pelaku [9]. tidak melanggar privasi maupun hak digital pengguna.
Hasil penelitian ini diharapkan dapat memberikan
B. Pre-processing Data
kontribusi teoritis dalam memperkaya literatur ilmiah di
bidang NLP, khususnya dalam aplikasi model Transformer Tahapan pre-processing data merupakan langkah penting
untuk deteksi konten berbahaya. Secara praktis, penelitian ini untuk mempersiapkan teks mentah agar sesuai dengan
dapat diimplementasikan dalam pengembangan sistem kebutuhan model dan meningkatkan kualitas pembelajaran.
deteksi otomatis untuk moderasi konten di platform media Proses ini bertujuan untuk menghilangkan noise,
sosial, dan membantu melindungi pengguna. Dengan menstandarkan format, serta memastikan data yang
meningkatkan efektivitas dan efisiensi dalam digunakan bersih dan konsisten. Tahapan ini dilakukan secara
mengidentifikasi dan memfilter konten berbahaya secara real- sistematis, yaitu:
time, sistem ini dapat mengurangi ketergantungan pada a. case folding, yaitu mengubah seluruh teks menjadi huruf
moderasi manual yang memerlukan banyak sumber daya. kecil (lowercase) untuk menjaga keseragaman dan
mengurangi variasi kata akibat perbedaan penulisan.
II. METODE b. Pembersihan URL yang sering digunakan dalam
komentar untuk mempromosikan situs judi online, baik
A. Sumber Data dalam bentuk lengkap maupun tautan yang disamarkan.
Penelitian ini menggunakan data sekunder yang diperoleh c. Penghapusan karakter khusus dan tanda baca yang tidak
dari platform Kaggle dengan judul "Deteksi Judi Online" memiliki arti penting, karena model transformer seperti
yang dapat diakses melalui tautan BERT sudah dapat memahami struktur kalimat tanpa
https://www.kaggle.com/datasets/yaemico/deteksi-judi- bergantung pada tanda baca eksplisit.
Comparison of Online Gambling Promotion Detection Perfomance Using DistilBERT and DeBERTa Models
(Halim Meliana Pratama, IGN Lanang Wijaya Kusuma, Ratna Sari Widiastuti)

| 3718        |     |     |     |     |     |     |     |        e-ISSN: 2548-6861   |     |     |     |     |
| ----------- | --- | --- | --- | --- | --- | --- | --- | -------------------------- | --- | --- | --- | --- |
d.  Normalisasi kata tidak baku, mengingat bahasa Indonesia  khusus "Ġ" yang muncul di awal token untuk menandai
di  media  sosial  sering  menggunakan  kata  singkatan,  adanya spasi sebelum kata tersebut, sehingga lebih tangguh
slang, atau bentuk tidak baku. Normalisasi dilakukan  dalam menangani variasi teks informal, kesalahan ketik, serta
dengan membangun kamus (dictionary) pemetaan dari  karakter  non-standar  yang  sering  muncul  pada  komentar
kata tidak baku ke bentuk bakunya agar data menjadi  media sosial. Tokenizer secara otomatis menambahkan token
lebih konsisten.   khusus seperti [CLS] untuk menandai awal teks dan [SEP]
| e.                                                       |            |            |     |                 |          | untuk  memisahkan  |     | atau  | mengakhiri  |     | teks  | dalam  tugas  |
| -------------------------------------------------------- | ---------- | ---------- | --- | --------------- | -------- | ------------------ | --- | ----- | ----------- | --- | ----- | ------------- |
| Terakhir,                                                | dilakukan  | filtering  |     | terhadap  teks  | kosong,  |                    |     |       |             |     |       |               |
| komentar terlalu pendek (kurang dari tiga karakter atau  |            |            |     |                 |          | klasifikasi.       |     |       |             |     |       |               |
dua kata), serta penghapusan komentar duplikat untuk  Setelah  tokenisasi,  setiap  token  dikonversi  menjadi  ID
menghindari bias pada proses pelatihan.   angka berdasarkan kamus tokenizer yang telah didefinisikan
|     |     |     |     |     |     | sebelumnya.  | ID  | token  | yang  | telah  | berbentuk  | tensor  |
| --- | --- | --- | --- | --- | --- | ------------ | --- | ------ | ----- | ------ | ---------- | ------- |
Dengan tahapan ini, dataset yang dihasilkan menjadi lebih  selanjutnya dimasukkan ke dalam embedding layer model,
yang merupakan matriks besar yang memetakan setiap token
| bersih,  terstruktur,  |     | dan  siap  | digunakan  | untuk  | proses  |     |     |     |     |     |     |     |
| ---------------------- | --- | ---------- | ---------- | ------ | ------- | --- | --- | --- | --- | --- | --- | --- |
tokenization  serta  pelatihan  model  berbasis  transformer  numerik  menjadi  vektor  kontinu  berdimensi  768.    Batas
seperti DistilBERT dan DeBERTa [10].  maksimum panjang urutan (max sequence length) sebesar 128
Setelah  melalui  tahap  pra-pemrosesan  tersebut,  dataset  token. Nilai-nilai pada vektor embedding diperoleh dari hasil
kemudian  dibagi  ke  dalam  tiga  subset,  yaitu  data  latih  pre-training model pada korpus teks berskala besar. Vektor
(training set), data validasi (validation set), dan data uji (test  embedding kemudian diproses lebih lanjut melalui lapisan-
set).  Proses  pembagian  dilakukan  secara  acak  (random  lapisan transformer dalam model DistilBERT dan DeBERTa
yang akan menangkap konteks dan hubungan antar token
| shuffle)  | untuk  | menjaga  | agar  | setiap  subset  | tetap  |     |     |     |     |     |     |     |
| --------- | ------ | -------- | ----- | --------------- | ------ | --- | --- | --- | --- | --- | --- | --- |
merepresentasikan karakteristik keseluruhan dataset. Dengan  secara mendalam menggunakan mechanism attention[12].
demikian, model dapat dilatih secara optimal serta dievaluasi
D. Distillation BERT
| secara  objektif  |             | menggunakan  | data        | yang  belum  | pernah   |             |     |         |         |         |       |             |
| ----------------- | ----------- | ------------ | ----------- | ------------ | -------- | ----------- | --- | ------- | ------- | ------- | ----- | ----------- |
|                   |             |              |             |              |          | DistilBERT  |     | adalah  | varian  | ringan  | dari  | BERT  yang  |
| dipelajari        | sebelumnya  | [9].         | Distribusi  | pembagian    | dataset  |             |     |         |         |         |       |             |
ditunjukan pada Gambar 1.  dikembangkan untuk memperkecil ukuran model sekaligus
|     |     |     |     |     |     | mempertahankan  |     | sebagian  |     | besar  | kemampuannya.  |     |
| --- | --- | --- | --- | --- | --- | --------------- | --- | --------- | --- | ------ | -------------- | --- |
Pelatihannya menggunakan metode knowledge distillation,
yaitu proses ketika model kecil meniru perilaku model besar.
Dengan metode ini, DistilBERT memiliki parameter 40%
lebih sedikit dan kecepatan inferensi 60% lebih cepat, tetapi
tetap mempertahankan 97% performa BERT untuk berbagai
|     |     |     |     |     |     | tugas  NLP.                                               | Arsitektur  |     | DistilBERT  |     | menggunakan  | enam  |
| --- | --- | --- | --- | --- | --- | --------------------------------------------------------- | ----------- | --- | ----------- | --- | ------------ | ----- |
|     |     |     |     |     |     | lapisan transformer dengan mekanisme self-attention yang  |             |     |             |     |              |       |
Gambar 1. Pembagian Data [11]
|     |     |     |     |     |     | tetap  mempertahankan  |     |     | kemampuan  |     | memahami  | hubungan  |
| --- | --- | --- | --- | --- | --- | ---------------------- | --- | --- | ---------- | --- | --------- | --------- |
kontekstual antar kata[6]
C. Representasi Teks
E. Decoding-enhanced BERT with Disentangled Attention
Dalam penelitian ini, proses representasi teks sepenuhnya
DeBERTa digunakan untuk meningkatkan kinerja BERT
dilakukan dengan memanfaatkan word embedding berbasis
model Transformer dan tidak dilakukan secara manual. Word  melalui tiga inovasi utama:
a.  Disentangled attention mechanism, yang memisahkan
| embedding  | adalah  | representasi  | kata  | dalam  bentuk  | vektor  |               |     |         |           |             |     |              |
| ---------- | ------- | ------------- | ----- | -------------- | ------- | ------------- | --- | ------- | --------- | ----------- | --- | ------------ |
|            |         |               |       |                |         | representasi  |     | konten  | (content  | embedding)  |     | dan  posisi  |
numerik yang digunakan dalam pemrosesan bahasa alami
untuk menangkap makna semantik dan hubungan antar kata  (position embedding) dalam perhitungan atensi
yang dapat dimengerti oleh komputer. Proses representasi  b.  Enhanced mask decoder, yang memperbaiki pemahaman
konteks saat pemodelan masked language
teks diawali dengan tokenisasi yang bertujuan menghasilkan
c.  Absolute + relative position encoding, yang memadukan
| token dari teks mentah menggunakan metode  |     |     |     |     | WordPiece  |     |     |     |     |     |     |     |
| ------------------------------------------ | --- | --- | --- | --- | ---------- | --- | --- | --- | --- | --- | --- | --- |
untuk  DistilBERT  dan  Byte-Pair  Encoding  (BPE)  untuk  informasi posisi absolut dan relatif untuk memperkuat
pemahaman urutan kata. Perbaikan ini memungkinkan
DeBERTa. Metode WordPiece memecah kata menjadi unit-
DeBERTa mencapai hasil unggul di berbagai benchmark
unit lebih kecil (subword) jika kata tersebut tidak ditemukan
dalam kosakata tokenizer, dengan menambahkan tanda ##  NLP dengan efisiensi yang tetap kompetitif [13]
pada awal token untuk menunjukkan kelanjutan dari kata
F.  Pemodelan DistilBERT
| sebelumnya,  | sehingga  | memungkinkan  |     | model  | menangani  |     |     |     |     |     |     |     |
| ------------ | --------- | ------------- | --- | ------ | ---------- | --- | --- | --- | --- | --- | --- | --- |
kata-kata yang jarang atau tidak dikenal (out-of-vocabulary
words).
Sementara itu, metode BPE pada DeBERTa menggunakan
pendekatan byte-level yang memperlakukan setiap karakter
| termasuk  | spasi  sebagai  | bagian  | dari  | token,  dengan  | tanda  |     |     |     |     |     |     |     |
| --------- | --------------- | ------- | ----- | --------------- | ------ | --- | --- | --- | --- | --- | --- | --- |
JAIC Vol. 9, No. 6, December 2025:  3716 – 3725

| JAIC  |     |     |     | e-ISSN: 2548-6861  |     |     |     |     |     |     |     | 3719  |
| ----- | --- | --- | --- | ------------------ | --- | --- | --- | --- | --- | --- | --- | ----- |

|     |     |     |     |     |     |     | informasi  | konteks  | dari  | berbagai  posisi  | dalam  | kalimat.  |
| --- | --- | --- | --- | --- | --- | --- | ---------- | -------- | ----- | ----------------- | ------ | --------- |
Mekanisme pengolahan ini memungkinkan model memahami
hubungan sintaksis dan semantik secara simultan, sehingga
|     |     |     |     |     |     |     | representasi  | akhir  | mengandung  | informasi  |     | makna  kata  |
| --- | --- | --- | --- | --- | --- | --- | ------------- | ------ | ----------- | ---------- | --- | ------------ |
sekaligus posisinya dalam teks [13]

Gambar  1. Diagram Alir Pemodelan DistilBERT
| Pada  | penelitian  | ini  diawali  | dengan  | proses  | fine-tuning  |     |     |     |     |     |     |     |
| ----- | ----------- | ------------- | ------- | ------- | ------------ | --- | --- | --- | --- | --- | --- | --- |
terhadap data komentar YouTube yang telah melalui tahap
| pre-processing  |     | dan  representasi  |     | teks  berbasis  |     | word  |     |     |     |     |     |     |
| --------------- | --- | ------------------ | --- | --------------- | --- | ----- | --- | --- | --- | --- | --- | --- |

embedding. Setiap lapisan transformer memanfaatkan multi-
Gambar  2. Diagram Alir Pemodelan DeBERTa
head self-attention untuk menangkap hubungan kata dari
| berbagai  | konteks,  | diikuti  | oleh  layer  | normalization  |     | untuk  |     |     |     |     |     |     |
| --------- | --------- | -------- | ------------ | -------------- | --- | ------ | --- | --- | --- | --- | --- | --- |
menjaga stabilitas distribusi nilai, dan feed-forward network
Untuk memastikan hasil perbandingan yang adil dengan
untuk memperkuat representasi sebelum diteruskan ke lapisan
|     |     |     |     |     |     |     | DistilBERT,  | parameter  |     | pelatihan  seperti  | learning  | rate,  |
| --- | --- | --- | --- | --- | --- | --- | ------------ | ---------- | --- | ------------------- | --------- | ------ |
berikutnya.
|     |     |     |     |     |     |     | jumlah  | epoch,  | dan  batch  | size  dibuat  | sama.  | Dengan  |
| --- | --- | --- | --- | --- | --- | --- | ------- | ------- | ----------- | ------------- | ------ | ------- |
Selama proses pelatihan, DistilBERT menggunakan tiga
pendekatan ini, diharapkan DeBERTa mampu memberikan
komponen loss function utama.
kinerja optimal pada deteksi teks promosi judi online, baik
| •  Pertama,  | masked  | language  |     | modeling  | (MLM)  | yang  |     |     |     |     |     |     |
| ------------ | ------- | --------- | --- | --------- | ------ | ----- | --- | --- | --- | --- | --- | --- |
dari sisi akurasi maupun kemampuan mengidentifikasi pola
melatih model untuk memprediksi kata yang ditutupi  bahasa yang tersembunyi.
dalam sebuah kalimat.
H. Evaluasi Model
•  Kedua, distillation loss yang memanfaatkan keluaran
BERT sebagai acuan pembelajaran sehingga model siswa  Proses evaluasi ini dilakukan pada data validasi untuk
dapat meniru perilaku model guru.   memberikan  gambaran  tentang  performa  model  sebelum
•  Ketiga, cosine distance loss yang menjaga keselarasan  diujikan pada data yang benar-benar baru. Dengan evaluasi
arah vektor status tersembunyi antara kedua model.  ini, performa model dapat direfleksikan lebih akurat tanpa
Penggabungan  ketiga  komponen  ini  memungkinkan  bias  dari  data  yang  digunakan  untuk  pelatihan  atau
| DistilBERT                                                    | mempertahankan  |     | performa  | tinggi  | meskipun  |     |              |         |         |           |       |            |
| ------------------------------------------------------------- | --------------- | --- | --------- | ------- | --------- | --- | ------------ | ------- | ------- | --------- | ----- | ---------- |
|                                                               |                 |     |           |         |           |     | penyesuaian  | model.  | Metrik  | evaluasi  | yang  | digunakan  |
| memiliki arsitektur yang lebih ringan. Dalam penelitian ini,  |                 |     |           |         |           |     | mencakup:    |         |         |           |       |            |
parameter pelatihan seperti learning rate, jumlah epoch, dan  1.  Confusion Matrix: Matriks ini memberikan total
batch size disesuaikan untuk menjaga stabilitas pembelajaran
prediksi yang benar dan salah pada masing-masing kelas.
serta menghindari overfitting atau underfitting [6]
G. Pemodelan DeBERTa
Model ini dipilih karena keunggulannya mempertahankan
informasi hubungan antar kata secara lebih konsisten, bahkan
| pada  kalimat  |        | yang  memiliki  |         | struktur  kompleks  |     | atau  |     |     |     |     |     |     |
| -------------- | ------ | --------------- | ------- | ------------------- | --- | ----- | --- | --- | --- | --- | --- | --- |
| mengandung     | makna  | tersirat.       | Dengan  | arsitektur          |     | yang  |     |     |     |     |     |     |
dirancang untuk memaksimalkan penangkapan pola bahasa,
DeBERTa sangat relevan dalam mendeteksi promosi judi
| online  yang  | sering  | menggunakan  |     | kata-kata  | pengganti,  |     |     |     |     |     |     |     |
| ------------- | ------- | ------------ | --- | ---------- | ----------- | --- | --- | --- | --- | --- | --- | --- |
sinonim, atau frasa yang dimodifikasi agar lolos dari deteksi

Gambar  3. Konsep Confusion Matrix[14]
manual. Dalam proses pelatihannya, model DeBERTa sama

seperti model DistilBERT. Bedanya pada representasi, model
ini  diproses melalui blok transformer yang menggabungkan  Dimana label-label pada confusion matrix meliputi:
Comparison of Online Gambling Promotion Detection Perfomance Using DistilBERT and DeBERTa Models
(Halim Meliana Pratama, IGN Lanang Wijaya Kusuma, Ratna Sari Widiastuti)

| 3720        |     |     |     |     |     |     |     |        e-ISSN: 2548-6861   |     |     |
| ----------- | --- | --- | --- | --- | --- | --- | --- | -------------------------- | --- | --- |
• True Positive (TP), yaitu prediksi positif yang sesuai   menjadi token numerik dengan tetap menjaga struktur kata
• True Negative (TN), prediksi negatif yang benar   maupun sub-kata. Langkah tersebut menjamin data tetap rapi,
|     |     |     |     |     |     |     | seragam,  | serta  siap  digunakan  | dalam  | pelatihan  model  |
| --- | --- | --- | --- | --- | --- | --- | --------- | ----------------------- | ------ | ----------------- |
• False Positive (FP), prediksi positif yang salah
• False Negative (FN), prediksi negatif yang keliru.  sehingga performa dapat meningkat.
Berdasarkan confusion matrix tersebut, performa model
|           |             |              |     |           |     |         | B.  Pemodelan DistilBERT dan DeBERTa  |     |     |     |
| --------- | ----------- | ------------ | --- | --------- | --- | ------- | ------------------------------------- | --- | --- | --- |
| kemudian  | dievaluasi  | menggunakan  |     | sejumlah  |     | metrik  |                                       |     |     |     |
klasifikasi  umum  yaitu  precision,  recall,  F1-score,  dan  Pemodelan  dimulai  dengan  menetapkan  beberapa
accuracy untuk setiap kelas, di mana precision menunjukkan  hyperparameter yang dipakai, yaitu:

ketepatan prediksi positif yang benar-benar positif, recall
TABEL I.
mengukur kemampuan model untuk menangkap seluruh data
HYPERPARAMETER MODEL
| positif  yang  | sebenarnya,  | dan  | F1-score  | merepresentasikan  |     |     |     |                 |        |     |
| -------------- | ------------ | ---- | --------- | ------------------ | --- | --- | --- | --------------- | ------ | --- |
|                |              |      |           |                    |     |     |     | Hyperparamater  | Nilai  |     |
keseimbangan  antara  precision  dan  recall,  yang  sangat  Learning rate  1e-5
| berguna  | ketika  data memiliki  |     | distribusi  | kelas  | yang  | tidak  |     |             |     |     |
| -------- | ---------------------- | --- | ----------- | ------ | ----- | ------ | --- | ----------- | --- | --- |
|          |                        |     |             |        |       |        |     | Batch size  | 32  |     |
seimbang [15].
|     |     |     |     |     |     |     |     | Epoch  | 5   |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ------ | --- | --- |

|                                                   |     |     |     |     |     |     |     | Weight decay  | 0.2  |     |
| ------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | ------------- | ---- | --- |
| 2.  ROC AUC Score: Area under the ROC curve (ROC  |     |     |     |     |     |     |     |               |      |     |
AUC)  adalah  metrik  yang  mengukur  kemampuan  model  Proses  fine-tuning  merupakan  tahapan  krusial  dalam
dalam memisahkan kelas positif dan negatif pada berbagai
|     |     |     |     |     |     |     | mengadaptasi  | model  pre-trained  | untuk  | tugas  klasifikasi  |
| --- | --- | --- | --- | --- | --- | --- | ------------- | ------------------- | ------ | ------------------- |
ambang batas. Nilai AUC yang mendekati 1 menunjukkan  spesifik, yaitu deteksi promosi judi online. Pada penelitian ini,
bahwa  model  memiliki  performa  yang  baik  dalam  fine-tuning dilakukan pada kedua model DistilBERT dan
membedakan antara kelas promosi dan bukan promosi. ROC
DeBERTa dengan menggunakan konfigurasi hyperparameter
AUC digunakan karena mampu menggambarkan performa  yang  telah  dioptimalkan  untuk  mencapai  keseimbangan
model secara lebih umum tanpa bergantung pada ambang  antara kecepatan konvergensi dan kemampuan generalisasi
batas tertentu [11].
model. Konfigurasi hyperparameter yang digunakan meliputi:

|     |     |     |     |     |     |     | a.  learning rate sebesar 2×10⁻⁵ yang mengontrol seberapa  |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ---------------------------------------------------------- | --- | --- | --- |
I. Environment Setup  besar  langkah  pembaruan  bobot  dalam  setiap  iterasi
Eksperimen  dilakukan  menggunakan  platform  Google  pelatihan,  sehingga  mempengaruhi  kecepatan  dan
| Colab  dengan  | spesifikasi  |     | perangkat  | keras  | GPU  | NVIDIA  |     |     |     |     |
| -------------- | ------------ | --- | ---------- | ------ | ---- | ------- | --- | --- | --- | --- |
stabilitas konvergensi model.
Tesla  T4  yang  memiliki memori  15,36  GB,  dan  CUDA  b.  Batch size ditentukan sebesar 32, yang berarti pada setiap
version  12.4.  Sistem  memiliki  RAM  sebesar  13,29  GB  iterasi  model  memproses  32  sampel  data  sebelum
dengan lingkungan Python 3.12.12. Proses implementasi dan
melakukan pembaruan bobot.
pelatihan model dilakukan menggunakan framework PyTorch  c.  Jumlah epoch ditetapkan sebanyak 5, yang menunjukkan
sebagai backend utama dari library Transformers. Selain itu,  berapa kali model akan melalui seluruh dataset pelatihan
digunakan pula pustaka pendukung meliputi PyTorch 2.1.0,
secara lengkap tanpa memerlukan pelatihan yang terlalu
| Transformers  | 4.31.0,  | Pandas,  |     | NumPy,  | Scikit-learn,  |     |     |     |     |     |
| ------------- | -------- | -------- | --- | ------- | -------------- | --- | --- | --- | --- | --- |
panjang.
Imbalanced-learn (imblearn), NLTK, Matplotlib, Seaborn,  d.  Weight decay ditetapkan sebesar 0,01 sebagai teknik
dan WordCloud, yang berperan dalam proses pre-processing,  regularisasi  untuk  mencegah  overfitting  dengan
visualisasi, dan evaluasi model.
menambahkan penalti pada besarnya nilai bobot model
|     |     |     |     |     |     |     | Data  train  | digunakan  agar  | model  dapat  | mempelajari  |
| --- | --- | --- | --- | --- | --- | --- | ------------ | ---------------- | ------------- | ------------ |
perbedaan antara kelas promosi dan bukan promosi melalui
III. HASIL DAN PEMBAHASAN
penyesuaian bobot berdasarkan Training Loss. Sementara
itu, data validasi dievaluasi pada akhir setiap epoch untuk
A.  Pre-processing   memantau kinerja model, mendeteksi potensi overfitting,
| Setelah  | dataset  | melalui  | tahap  | pembersihan,  |     | akan  |     |     |     |     |
| -------- | -------- | -------- | ------ | ------------- | --- | ----- | --- | --- | --- | --- |
serta memastikan model tidak sekadar mengingat data latih.
| dilakukan  | penyeimbangan  |     |     | menggunakan  |     | teknik  |     |     |     |     |
| ---------- | -------------- | --- | --- | ------------ | --- | ------- | --- | --- | --- | --- |
undersampling. sehingga diperoleh distribusi yang seimbang
| pada  kedua  | label,  | masing-masing  |     | sebanyak  | 3.163  | data.  |     |     |     |     |
| ------------ | ------- | -------------- | --- | --------- | ------ | ------ | --- | --- | --- | --- |
Selanjutnya, dataset tersebut dibagi menjadi tiga bagian:
•  data latih (70%) sebanyak 4.428 data
•  data validasi (15%) sebanyak 948 data
•  data uji (15%) sebanyak 950 data
yang digunakan untuk memastikan performa model dapat
dievaluasi secara adil pada data yang tidak terlihat selama
proses pelatihan.
Tokenisasi berfungsi menyiapkan teks ke dalam format
yang dapat diproses oleh model. Pada tahap ini, teks dipecah
JAIC Vol. 9, No. 6, December 2025:  3716 – 3725

| JAIC  |     |     |     | e-ISSN: 2548-6861  |     |     |     |     |     |     |     |     | 3721  |
| ----- | --- | --- | --- | ------------------ | --- | --- | --- | --- | --- | --- | --- | --- | ----- |

|     |     |     |     |     |     | yang  lebih  | bertahap  | dari  | ~0,76      | menjadi    |     | ~0,69  | dengan   |
| --- | --- | --- | --- | --- | --- | ------------ | --------- | ----- | ---------- | ---------- | --- | ------ | -------- |
|     |     |     |     |     |     | validation   | loss      | yang  | konsisten  | mengikuti  |     | pola   | serupa,  |
sehingga meskipun membutuhkan waktu lebih lama untuk
konvergensi, model ini menunjukkan stabilitas yang lebih
baik serta kemampuan generalisasi yang relatif lebih kuat
dibandingkan DistilBERT.
C.  Performa Model
1.   Confusion Matrix:

Gambar 5. Training Data DistilBERT
Gambar 5 menunjukkan kurva training loss dan validation
loss dari proses pelatihan model DistilBERT. Nilai training
| loss  awalnya  | tinggi  | ~0,16  | lalu  menurun  |     | tajam  hingga  |     |     |     |     |     |     |     |     |
| -------------- | ------- | ------ | -------------- | --- | -------------- | --- | --- | --- | --- | --- | --- | --- | --- |
mendekati nol sejak epoch pertama, sedangkan validation loss
| tetap  stabil  | di  kisaran  |     | rendah  | 0,01–0,02.  | Pola  ini  |     |     |     |     |     |     |     |     |
| -------------- | ------------ | --- | ------- | ----------- | ---------- | --- | --- | --- | --- | --- | --- | --- | --- |
menunjukkan kemampuan belajar yang cepat, namun terdapat

indikasi awal overfitting karena perbedaan cukup jelas antara  Gambar 7. Confussion Matrix Model DistilBERT
training loss dan validation loss.
|     |     |     |     |     |     |  Berdasarkan  |     | confusion  | matrix  |     | di  Gambar  |     | 7,  model  |
| --- | --- | --- | --- | --- | --- | ------------- | --- | ---------- | ------- | --- | ----------- | --- | ---------- |
DistilBERT memperlihatkan performa yang juga sangat baik,
dengan 640 data "Promosi" terklasifikasi benar dan 7 data
salah diklasifikasikan sebagai "Bukan Promosi". Untuk kelas
"Bukan Promosi", terdapat 621 data yang diprediksi benar
dan hanya 2 data yang keliru diprediksi sebagai "Promosi".
Walaupun akurasi dan presisi masih tinggi, terlihat bahwa
|     |     |     |     |     |     | DistilBERT   | sedikit       | lebih  | banyak    |     | melakukan  |     | kesalahan  |
| --- | --- | --- | --- | --- | --- | ------------ | ------------- | ------ | --------- | --- | ---------- | --- | ---------- |
|     |     |     |     |     |     | klasifikasi  | dibandingkan  |        | DeBERTa,  |     | khususnya  |     | dalam      |
membedakan komentar promosi.

Gambar 6. Training Data DeBERTa

Gambar 6 menunjukkan kurva training loss dan validation
loss dari proses pelatihan model DeBERTa. Nilai training
loss awalnya lebih tinggi ~0,76 kemudian menurun secara
| bertahap  | hingga  sekitar  | 0,69  | pada  | epoch  kedua,  | dengan  |     |     |     |     |     |     |     |     |
| --------- | ---------------- | ----- | ----- | -------------- | ------- | --- | --- | --- | --- | --- | --- | --- | --- |
validation loss yang stabil di kisaran ~0,69 tanpa fluktuasi
berarti. Hal ini menandakan bahwa DeBERTa mampu belajar
| secara  lebih  | konsisten  | tanpa         | gejala  | overfitting,  | sehingga     |     |     |     |     |     |     |     |     |
| -------------- | ---------- | ------------- | ------- | ------------- | ------------ | --- | --- | --- | --- | --- | --- | --- | --- |
| memiliki       | kemampuan  | generalisasi  |         | yang          | lebih  baik  |     |     |     |     |     |     |     |     |
Gambar 8. Confussion Matrix Model DeBERTa
dibandingkan DistilBERT.
| Berdasarkan  | hasil  | kurva  | loss,  | menunjukkan  | bahwa  |     |     |     |     |     |     |     |     |
| ------------ | ------ | ------ | ------ | ------------ | ------ | --- | --- | --- | --- | --- | --- | --- | --- |
Berdasarkan Gambar 8, hasil confusion matrix model
DistilBERT mengalami penurunan training loss yang sangat
DeBERTa menunjukkan performa yang sangat baik dengan
cepat hingga mendekati nol pada epoch kedua, sedangkan
647 data "Promosi" terklasifikasi benar dan hanya 2 data
validation loss stabil di kisaran ~0,01, pola ini menandakan
|            |               |        |         |          |              | "Bukan      | Promosi"  | yang  | salah      | diklasifikasikan  |              |       | sebagai  |
| ---------- | ------------- | ------ | ------- | -------- | ------------ | ----------- | --------- | ----- | ---------- | ----------------- | ------------ | ----- | -------- |
| efisiensi  | pembelajaran  | namun  | dengan  | potensi  | overfitting  |             |           |       |            |                   |              |       |          |
|            |               |        |         |          |              | "Promosi".  | Tidak     | ada   | kesalahan  |                   | klasifikasi  | pada  | kelas    |
karena selisih cukup besar antara training dan validation loss.  "Promosi" ke kelas “bukan promosi”, serta 621 data "Bukan
Sebaliknya, DeBERTa menampilkan penurunan training loss
|     |     |     |     |     |     | Promosi"  | berhasil  | diprediksi  |     | dengan  | tepat.  | Hasil  | ini  |
| --- | --- | --- | --- | --- | --- | --------- | --------- | ----------- | --- | ------- | ------- | ------ | ---- |
Comparison of Online Gambling Promotion Detection Perfomance Using DistilBERT and DeBERTa Models
(Halim Meliana Pratama, IGN Lanang Wijaya Kusuma, Ratna Sari Widiastuti)

| 3722          |     |     |     |     |        e-ISSN: 2548-6861   |     |     |
| ------------- | --- | --- | --- | --- | -------------------------- | --- | --- |
mencerminkan tingkat akurasi yang sangat tinggi, presisi  promosi meskipun secara
mendekati sempurna, dan kemampuan generalisasi yang kuat  semantik mengandung
dalam membedakan komentar promosi judi online dan bukan  ajakan deposit.
|     |     |     | jangan coba  |     |     | Kata “main” dan “slot”  |     |
| --- | --- | --- | ------------ | --- | --- | ----------------------- | --- |
promosi.
|     |     |     | main slot  |     |     | diasosiasikan kuat   |     |
| --- | --- | --- | ---------- | --- | --- | -------------------- | --- |
|     |     |     |            |     | 0   | 1                    |     |
|     |     |     | temen      |     |     | dengan konteks judi  |     |
2.  Error Analysis: Setelah dilakukan evaluasi
online.
menggunakan  confusion  matrix,  tahap  berikutnya  adalah  link gacor  Kata “gacor” sering
melakukan error analysis untuk mengidentifikasi jenis dan
muncul pada data
penyebab  kesalahan  klasifikasi  yang  terjadi  pada  model.  0  1
promosi, tapi konteksnya
Analisis ini bertujuan untuk memberikan pemahaman yang
berbeda.
lebih mendalam. Berdasarkan hasil evaluasi, sebagian kecil
data masih diklasifikasikan secara keliru, baik dalam bentuk  TABEL III.
 KESALAHAN PADA MODEL DEBERTA
False Positive (FP) maupun False Negative (FN). Kesalahan
|     |     |     |     |          | Label  | Label  |           |
| --- | --- | --- | --- | -------- | ------ | ------ | --------- |
|     |     |     |     | Message  |        |        | Analisis  |
tersebut dapat disebabkan oleh kesamaan struktur, ambiguitas
|     |     |     |     |     | Asli  | Prediksi  |     |
| --- | --- | --- | --- | --- | ----- | --------- | --- |
konteks, serta pengaruh tahap pre-processing yang mengubah
|     |     |     | jangan coba  |     |     | Kata “main” dan “slot”  |     |
| --- | --- | --- | ------------ | --- | --- | ----------------------- | --- |
bentuk asli kata sehingga maknanya sulit dikenali oleh model.
|     |     |     | main slot  |     |     | diasosiasikan kuat  |     |
| --- | --- | --- | ---------- | --- | --- | ------------------- | --- |
|     |     |     |            |     | 0   | 1                   |     |
Oleh karena itu, bagian ini membahas secara rinci contoh- temen  dengan konteks judi
contoh kesalahan yang terjadi pada model DistilBERT dan  online.
DeBERTa  untuk  memahami  karakteristik  pola  teks  yang  link gacor  Kata “gacor” sering
paling memengaruhi performa deteksi promosi judi online.  muncul pada data
|     |     |     |     |     | 0   | 1   |     |
| --- | --- | --- | --- | --- | --- | --- | --- |
promosi, tapi

konteksnya berbeda.
TABEL II.

 KESALAHAN PADA MODEL DISTILBERT
|          | Label  Label  |           | 3.  | ROC AUC Score: Kedua model mencapai ROC  |     |     |     |
| -------- | ------------- | --------- | --- | ---------------------------------------- | --- | --- | --- |
| Message  |               | Analisis  |     |                                          |     |     |     |
Asli  Prediksi  AUC  score  sebesar  0.99  pada  data  uji,  menunjukkan
d3p0 100 jd  Model gagal mengenali  kemampuan model untuk membedakan antara kelas promosi
| 2jt buruan  | 1  0  | singkatan numerik seperti  |     |     |     |     |     |
| ----------- | ----- | -------------------------- | --- | --- | --- | --- | --- |
dan bukan promosi dengan baik, yang penting untuk aplikasi
| gas   |     | d3p0 (deposit)  |     |     |     |     |     |
| ----- | --- | --------------- | --- | --- | --- | --- | --- |
deteksi promosi judi online.
| freebet  |     | nama situs tersamar  |     |     |     |     |     |
| -------- | --- | -------------------- | --- | --- | --- | --- | --- |

| 100rb  |     | “wisdomtoto” karena  |     |     |     |     |     |
| ------ | --- | -------------------- | --- | --- | --- | --- | --- |
4.  Analisis Overfitting:
| wisdomtoto  |     | bentuknya tidak umum di  |     |     |     |     |     |
| ----------- | --- | ------------------------ | --- | --- | --- | --- | --- |

|     | 1  0  | korpus pelatihan,  |     |     |     |     |     |
| --- | ----- | ------------------ | --- | --- | --- | --- | --- |
TABEL IV.
sehingga model gagal
 CROSS VALIDATION DISTILBERT
mengidentifikasi konteks
F1-
|     |     | promosi   |     | Fold  | Akurasi  | Presisi  Recall  |     |
| --- | --- | --------- | --- | ----- | -------- | ---------------- | --- |
Score
| ketik di    |       | Frasa perintah sederhana  |     |     |        |               |        |
| ----------- | ----- | ------------------------- | --- | --- | ------ | ------------- | ------ |
|             |       |                           |     | 1   | 99.7%  | 99.7%  99.7%  | 99.7%  |
| google      |       | tanpa kata eksplisit      |     |     |        |               |        |
|             |       |                           |     | 2   | 100%   | 100%  100%    | 100%   |
| wisdomtoto  | 1  0  | seperti slot, judi        |     |     |        |               |        |
|             |       |                           |     | 3   | 100%   | 100%  100%    | 100%   |
membuat model salah
|               |     | mendeteksinya   |     | 4   | 99.7%  | 99.7%  99.7%  | 99.7%  |
| ------------- | --- | --------------- | --- | --- | ------ | ------------- | ------ |
| 100rb gratis  |     | Singkatan “rb”  |     | 5   | 99.9%  | 99.9%  99.9%  | 99.9%  |
Rata-
wisdomtoto  menyebabkan tokenisasi  99.8%  99.8%  99.8%  99.8%
Rata
|     | 1  0  | ambigu, model tidak  |     |     |     |     |     |
| --- | ----- | -------------------- | --- | --- | --- | --- | --- |

mampu menangkap
konsep bonus promosi  Untuk  menghindari  kecurigaan  overfitting  mengingat
freebet  Duplikasi pola singkat  akurasi yang sangat tinggi (≈99%), dilakukan k-fold cross-
100rb  seperti ini sering  validation dengan 𝑘 =5 pada model DistilBERT. Hasil pada
| wisdomtoto  | 1  0  | dianggap noise oleh  |     |     |     |     |     |
| ----------- | ----- | -------------------- | --- | --- | --- | --- | --- |
Tabel IV menunjukkan performa yang sangat konsisten di
model karena tidak ada
|     |     |     | seluruh  | fold  | dengan  akurasi  | rata-rata  | 99,8%  dan  standar  |
| --- | --- | --- | -------- | ----- | ---------------- | ---------- | -------------------- |
variasi sintaksis.
deviasi hanya 0,14%. Nilai precision, recall, dan F1-score
| ketik di  |     | Penulisan kata tanpa  |     |     |     |     |     |
| --------- | --- | --------------------- | --- | --- | --- | --- | --- |
juga menunjukkan variabilitas rendah dengan standar deviasi
| googlewisdo |     | spasi setelah  |     |     |     |     |     |
| ----------- | --- | -------------- | --- | --- | --- | --- | --- |
mtoto  pembersihan  <0,2%.  Konsistensi  ini  mengonfirmasi  bahwa  performa
1  0  tinggi  bukan  merupakan  hasil  overfitting,  melainkan
menyebabkan token
|     |     |     | mencerminkan  |     | kemampuan  | model  dalam  | mengenali  pola  |
| --- | --- | --- | ------------- | --- | ---------- | ------------- | ---------------- |
“googlewisdomtoto”
tidak dikenal   promosi  judi  online.  Distribusi  data  yang  seimbang  dan
100rb gratis  Tidak mencantumkan  karakteristik tekstual yang distinktif antara kelas "Promosi"
bonus tanpa  nama situs, sehingga  dan "Bukan Promosi" memungkinkan model untuk belajar
1  0
| deposit  |     | model gagal  |     |     |     |     |     |
| -------- | --- | ------------ | --- | --- | --- | --- | --- |
secara efektif tanpa mengalami overfitting yang signifikan.
mengidentifikasi konteks
JAIC Vol. 9, No. 6, December 2025:  3716 – 3725

| JAIC  |     |     |     |     | e-ISSN: 2548-6861  |     |     |     |     |     |     |     | 3723  |
| ----- | --- | --- | --- | --- | ------------------ | --- | --- | --- | --- | --- | --- | --- | ----- |

  akurat,  terutama  pada  teks  berstruktur  kompleks  seperti
|     |     |     | TABEL V.   |     |     |     | komentar media sosial.  |     |     |     |     |     |     |
| --- | --- | --- | ---------- | --- | --- | --- | ----------------------- | --- | --- | --- | --- | --- | --- |
HASIL CROSS VALIDATION DEBERTA  Dari sisi efisiensi komputasi, DistilBERT memiliki sekitar
Fold  Akurasi  Presisi  Recall  F1-Score  66 juta parameter, sedangkan DeBERTa base mencapai 140
| 1   | 99.9%  |     | 99.9%  |     | 99.9%  | 99.9%  |                   |                 |            |             |             |     |              |
| --- | ------ | --- | ------ | --- | ------ | ------ | ----------------- | --------------- | ---------- | ----------- | ----------- | --- | ------------ |
|     |        |     |        |     |        |        | juta  parameter.  |                 | Perbedaan  | ini         | berdampak   |     | pada  waktu  |
| 2   | 99.9%  |     | 99.9%  |     | 99.9%  | 99.9%  |                   |                 |            |             |             |     |              |
|     |        |     |        |     |        |        | pelatihan         | dan  kecepatan  |            | inferensi.  | DistilBERT  |     | mampu        |
| 3   | 99.9%  |     | 99.9%  |     | 99.9%  | 99.9%  |                   |                 |            |             |             |     |              |
menyelesaikan proses pelatihan dalam waktu sekitar 5 menit
| 4   | 99.9%  |     | 99.9%  |     | 99.9%  | 99.9%  |     |     |     |     |     |     |     |
| --- | ------ | --- | ------ | --- | ------ | ------ | --- | --- | --- | --- | --- | --- | --- |
5  99.9%  99.9%  99.9%  99.9%  dengan  penggunaan  memori  GPU  yang  lebih  rendah,
|     |     |     |     |     |     |     | menjadikannya  | lebih  | efisien  |     | untuk  | implementasi  | pada  |
| --- | --- | --- | --- | --- | --- | --- | -------------- | ------ | -------- | --- | ------ | ------------- | ----- |
Rata-
99.9%  99.9%  99.9%  99.9%  perangkat  dengan  sumber  daya  terbatas.  Sebaliknya,
Rata
|     |     |     |     |     |     |     | DeBERTa  | memerlukan  |     | waktu  | sekitar  | 11  menit  | karena  |
| --- | --- | --- | --- | --- | --- | --- | -------- | ----------- | --- | ------ | -------- | ---------- | ------- |
Tabel  V  menunjukkan  hasil  pengujian  model  arsitekturnya  yang  lebih  kompleks,  namun  menghasilkan
performa yang lebih tinggi.
menggunakan metode 5-Fold Cross Validation menunjukkan
|     |     |     |     |     |     |     | Dengan  | demikian,  | DistilBERT  |     | lebih  | cocok  | digunakan  |
| --- | --- | --- | --- | --- | --- | --- | ------- | ---------- | ----------- | --- | ------ | ------ | ---------- |
performa yang sangat konsisten dan tinggi pada setiap fold.
Nilai  akurasi,  presisi,  recall,  dan  F1-score  pada  masing- untuk kebutuhan real-time atau aplikasi ringan yang menuntut
masing fold berada di kisaran 99.9%, yang berarti model  efisiensi waktu dan sumber daya, sedangkan DeBERTa lebih
optimal untuk skenario yang menekankan akurasi tinggi dan
mampu melakukan klasifikasi dengan tingkat kesalahan yang
sangat  rendah.  Konsistensi  nilai  antar  fold  menunjukkan  pemahaman konteks mendalam. Sementara itu, keberadaan
bahwa model memiliki stabilitas dan kemampuan generalisasi  model SVM+TF-IDF sebagai baseline memperkuat analisis
perbandingan ini, menunjukkan bahwa meskipun transformer
yang baik terhadap data uji. Secara keseluruhan, rata-rata
hasil  evaluasi  sebesar  99.9%  pada  semua  metrik  unggul  dalam pemahaman  semantik,  model  klasik  masih
menunjukkan bahwa model mampu mendeteksi kategori data  relevan  sebagai  pendekatan  yang  efisien  dan  kompetitif
secara performa.
dengan tingkat ketepatan yang hampir sempurna.
| 5.  Perbandingan Performa Model:  |     |     |     |     |     |     | D.  Visualisasi Model  |     |     |     |     |     |     |
| --------------------------------- | --- | --- | --- | --- | --- | --- | ---------------------- | --- | --- | --- | --- | --- | --- |

1.  Perbandingan Metrik Antarmodel:
TABEL VI.
PERBANDINGAN PERFORMA MODEL
| Model   |     | Akurasi  | Presisi  |     | Recall  | F1-score  |     |     |     |     |     |     |     |
| ------- | --- | -------- | -------- | --- | ------- | --------- | --- | --- | --- | --- | --- | --- | --- |
| SVM+TF- |     | 99.89%   | 99.79%   |     | 100%    | 99.9%     |     |     |     |     |     |     |     |
IDF
| DeBERTa     |     | 99.84%  | 99.7%  |     | 100%   | 99.8%  |     |     |     |     |     |     |     |
| ----------- | --- | ------- | ------ | --- | ------ | ------ | --- | --- | --- | --- | --- | --- | --- |
| DistilBERT  |     | 99.29%  | 99.7%  |     | 98.9%  | 99.3%  |     |     |     |     |     |     |     |

| Berdasarkan  |     | hasil  | evaluasi,  | ketiga  | model  | yang  diuji  |     |     |     |     |     |     |     |
| ------------ | --- | ------ | ---------- | ------- | ------ | ------------ | --- | --- | --- | --- | --- | --- | --- |
menunjukkan performa yang sangat baik dengan akurasi di
| atas  99%.                                              | Model   | DeBERTa  |             | mencapai  | akurasi          | 99,84%,  |     |     |     |     |     |     |     |
| ------------------------------------------------------- | ------- | -------- | ----------- | --------- | ---------------- | -------- | --- | --- | --- | --- | --- | --- | --- |
| precision                                               | 99,7%,  | recall   | 100%,       | dan       | F1-score         | 99,8%,   |     |     |     |     |     |     |     |
| menandakan                                              | bahwa   |          | model  ini  | mampu     | mengklasifikasi  |          |     |     |     |     |     |     |     |
| komentar promosi secara sempurna tanpa kehilangan data  |         |          |             |           |                  |          |     |     |     |     |     |     |     |
Gambar 9. Perbandingan Metrik Antarmodel
| positif.                                                    | Sementara  | itu,  | DistilBERT  |     | memperoleh  | akurasi  |     |     |     |     |     |     |     |
| ----------------------------------------------------------- | ---------- | ----- | ----------- | --- | ----------- | -------- | --- | --- | --- | --- | --- | --- | --- |
| 99,29%, precision 99,7%, recall 98,9%, dan F1-score 99,3%.  |            |       |             |     |             |          |     |     |     |     |     |     |     |
Meskipun masih sangat tinggi, performa DistilBERT sedikit  Gambar  tersebut  memperlihatkan  perbandingan  nilai
|     |     |     |     |     |     |     | metrik  | kinerja  antara  | model  |     | DistilBERT  | dan  | DeBERTa  |
| --- | --- | --- | --- | --- | --- | --- | ------- | ---------------- | ------ | --- | ----------- | ---- | -------- |
lebih rendah pada aspek recall, yang menunjukkan adanya
beberapa komentar promosi yang tidak terdeteksi. Sebagai  berdasarkan hasil pengujian. Secara umum, model DeBERTa
baseline  pembanding,  digunakan  model  SVM+TF-IDF  menunjukkan  performa  yang  lebih  unggul  dibandingkan
DistilBERT pada seluruh metrik evaluasi, terlihat pada nilai
dengan hasil akurasi 99,89%, precision 99,79%, recall 100%,
dan F1-score 99,9%. Hasil ini menunjukkan bahwa model  recall yang paling signifikan, di mana DeBERTa mampu
klasik masih mampu bersaing secara kuantitatif dengan model  mendeteksi komentar promosi dengan tingkat keberhasilan
lebih tinggi dibandingkan DistilBERT.
transformer.
|         |                |     |        |          |              |     | Hal  | ini  menunjukkan  |     | bahwa  | DeBERTa  |     | memiliki  |
| ------- | -------------- | --- | ------ | -------- | ------------ | --- | ---- | ----------------- | --- | ------ | -------- | --- | --------- |
| Secara  | arsitektural,  |     | model  | DeBERTa  | menunjukkan  |     |      |                   |     |        |          |     |           |
performa yang lebih unggul dibandingkan DistilBERT dalam  kemampuan  yang  lebih  baik  dalam  memahami  konteks
tugas deteksi promosi judi online. Keunggulan ini berasal dari  kalimat yang kompleks dan variasi bahasa pada komentar
|            |               |     |            |     |                |       | YouTube.  | Sementara  |     | itu,  | meskipun  |     | DistilBERT  |
| ---------- | ------------- | --- | ---------- | --- | -------------- | ----- | --------- | ---------- | --- | ----- | --------- | --- | ----------- |
| mekanisme  | disentangled  |     | attention  |     | dan  enhanced  | mask  |           |            |     |       |           |     |             |
decoder  pada  arsitektur  DeBERTa,  yang  memungkinkan  menunjukkan  performa  yang  cukup  baik,  model  ini
model  memisahkan  representasi  posisi  dan  konten  kata  cenderung menghasilkan lebih banyak kesalahan pada data
dengan struktur kalimat yang ambigu. Dengan demikian,
sehingga mampu memahami konteks kalimat dengan lebih
Comparison of Online Gambling Promotion Detection Perfomance Using DistilBERT and DeBERTa Models
(Halim Meliana Pratama, IGN Lanang Wijaya Kusuma, Ratna Sari Widiastuti)

| 3724          |     |     |     |     |     |        e-ISSN: 2548-6861   |     |     |     |     |
| ------------- | --- | --- | --- | --- | --- | -------------------------- | --- | --- | --- | --- |
visualisasi ini mengonfirmasi bahwa arsitektur DeBERTa  1.  Pola Linguistik Promosi Judi Online: Berdasarkan
lebih efektif untuk tugas klasifikasi teks yang membutuhkan  analisis  korpus  data,  promosi  judi  online  menunjukkan
pemahaman konteks mendalam seperti deteksi promosi judi  karakteristik linguistik yang khas dan berbeda signifikan dari
| online  |     |     | komentar normal.                                       |     |     |     |     |     |     |     |
| ------- | --- | --- | ------------------------------------------------------ | --- | --- | --- | --- | --- | --- | --- |
|         |     |     | Pada analisis word cloud memperlihatkan dominasi kata- |     |     |     |     |     |     |     |
2.  Analisis Word Cloud:  kata yang berhubungan dengan penawaran insentif seperti
freebet, gratis, bonus, dan deposit, Sebaliknya, komentar non-
promosi didominasi oleh kata-kata percakapan sehari-hari
|     |     |     | seperti      | selamat  | ulang    | tahun,     |           | jogja,  | dan  tugu,  | yang         |
| --- | --- | --- | ------------ | -------- | -------- | ---------- | --------- | ------- | ----------- | ------------ |
|     |     |     | menunjukkan  |          | konteks  | interaksi  | sosial    | normal  |             | pada  acara  |
|     |     |     | komunitas.   | Melalui  |          | error      | analysis  | yang    | dilakukan   | pada         |
model, teridentifikasi beberapa kategori strategi penyamaran
linguistik yang digunakan pelaku promosi judi online:
|     |     |     | a.  Penggantian  |     | huruf  | dengan  | angka  | atau  | simbol  | untuk  |
| --- | --- | --- | ---------------- | --- | ------ | ------- | ------ | ----- | ------- | ------ |
menghindari deteksi kata kunci, seperti "d3p0" untuk
"deposit", "b0nus" untuk "bonus", dan "0nline" untuk
|     |     |     | "online".  |     | Teknik  | ini  | memanfaatkan  |     | kesamaan  | visual  |
| --- | --- | --- | ---------- | --- | ------- | ---- | ------------- | --- | --------- | ------- |
antara karakter alfanumerik.

b.  Penggunaan singkatan kreatif yang tidak umum dalam
kamus bahasa formal, seperti "rb" untuk "ribu", "jt" untuk
"juta", dan "gas" sebagai ajakan untuk segera bertindak.
Singkatan ini sering dikombinasikan dengan angka untuk
membentuk frasa promosi seperti "100rb gratis".
|     |     |     | c.  Strategi  |     | menyatukan  |           | beberapa  | kata                | menjadi  | satu  |
| --- | --- | --- | ------------- | --- | ----------- | --------- | --------- | ------------------- | -------- | ----- |
|     |     |     | kesatuan      |     | tanpa       | pemisah,  | seperti   | "googlewisdomtoto"  |          |       |
atau "ketikdigoogle", yang bertujuan untuk mengaburkan
|     |     |     | struktur  |     | sintaksis  | dan  | menyulitkan  |     | sistem  | deteksi  |
| --- | --- | --- | --------- | --- | ---------- | ---- | ------------ | --- | ------- | -------- |
berbasis keyword.
|     |     |     | d.  Penggunaan  |     | kalimat  |       | yang  | tidak  | secara     | eksplisit  |
| --- | --- | --- | --------------- | --- | -------- | ----- | ----- | ------ | ---------- | ---------- |
|     |     |     | menyebutkan     |     |          | judi  | atau  | situs  | tertentu,  | namun      |

Gambar 10. Hasil Analisis Word Cloud
|     |     |     | mengandung  |     | ajakan  | tersirat  |     | seperti  | "ketik  | di  google  |
| --- | --- | --- | ----------- | --- | ------- | --------- | --- | -------- | ------- | ----------- |
wisdomtoto" atau "freebet 100rb", yang bergantung pada
Word cloud pada teks promosi judi online memperlihatkan  pemahaman  konteks  untuk  mengidentifikasi  maksud
| dominasi kata-kata  | yang  berhubungan  | dengan  penawaran  |     |     |     |     |     |     |     |     |
| ------------------- | ------------------ | ------------------ | --- | --- | --- | --- | --- | --- | --- | --- |
promosi.
bonus seperti freebet, gratis, serta instruksi akses website

(ketik google, rb). Sebaliknya, word cloud pada teks bukan  2.  Mekanisme Tokenisasi dalam Menangani Ambiguitas:
promosi lebih banyak berisi kata-kata umum dan percakapan  Perbedaan fundamental antara DistilBERT dan DeBERTa
sehari-hari, seperti selamat ulang, jogja, dan tugu. Perbedaan
terletak pada metode tokenisasi yang digunakan, yang secara
ini  menunjukkan  bahwa  fitur  teks  promosi  judi  online  signifikan  memengaruhi  kemampuan  model  dalam
memiliki pola kosakata yang lebih spesifik dan berorientasi  menangani teks informal dan ambigu.
pada ajakan promosi, sementara teks bukan promosi lebih
|     |     |     | a.  Model  | DistilBERT  |     | menggunakan  |     | metode  |     | WordPiece  |
| --- | --- | --- | ---------- | ----------- | --- | ------------ | --- | ------- | --- | ---------- |
bervariasi dan kontekstual.
yang memecah kata menjadi subword units berdasarkan
|     |     |     | kosakata  |     | yang  | telah  | dipelajari  | selama  | pre-training.  |     |
| --- | --- | --- | --------- | --- | ----- | ------ | ----------- | ------- | -------------- | --- |
E.  Analisis Linguistik
Metode ini menambahkan prefix "##" untuk menandai
token yang merupakan kelanjutan dari kata sebelumnya,
Salah satu tantangan utama dalam deteksi promosi judi
di mana model mencoba mengenali komponen kata yang
online  adalah  kemampuan  pelaku  dalam  menggunakan  familiar. Namun, ketika menghadapi substitusi numerik
ambiguitas bahasa dan istilah terselubung untuk menghindari
|     |     |     | seperti  | "d3p0",  |     | tokenizer  |     | cenderung  | memecahnya  |     |
| --- | --- | --- | -------- | -------- | --- | ---------- | --- | ---------- | ----------- | --- |
sistem deteksi. Penelitian ini menganalisis secara mendalam
|     |     |     | menjadi  |     | token  | individual,  | yang  | kehilangan  |     | makna  |
| --- | --- | --- | -------- | --- | ------ | ------------ | ----- | ----------- | --- | ------ |
bagaimana model menangani berbagai strategi penyamaran  semantik dari kata asli "deposit". Hal ini menjelaskan
linguistik yang umum digunakan dalam promosi judi online,
mengapa DistilBERT gagal mendeteksi promosi yang
| termasuk  substitusi  | karakter,  singkatan  | kreatif,  dan  |     |     |     |     |     |     |     |     |
| --------------------- | --------------------- | -------------- | --- | --- | --- | --- | --- | --- | --- | --- |
menggunakan singkatan numerik.
penggunaan frasa ambigu.
|     |     |     | b.  DeBERTa  |     | menggunakan  |     | Byte-Pair  |     | Encoding  | (BPE)  |
| --- | --- | --- | ------------ | --- | ------------ | --- | ---------- | --- | --------- | ------ |
yang bekerja pada level byte dan memperlakukan setiap

karakter termasuk spasi sebagai bagian dari token. BPE
menggunakan penanda khusus "Ġ" untuk menunjukkan

JAIC Vol. 9, No. 6, December 2025:  3716 – 3725

JAIC e-ISSN: 2548-6861 3725
adanya spasi sebelum kata. Pendekatan ini lebih robust sosial. Selain itu, penerapan pendekatan semi-supervised
terhadap variasi penulisan karena tidak bergantung pada learning juga dapat menjadi arah penelitian berikutnya untuk
kosakata tetap, melainkan membangun representasi dari memanfaatkan data komentar tanpa label secara adaptif.
unit-unit byte yang lebih fundamental. Namun, Dengan demikian, sistem deteksi yang dihasilkan akan
mekanisme disentangled attention DeBERTa mampu semakin tangguh, kontekstual, dan relevan dalam
menangkap pola posisional dan kontekstual yang menghadapi dinamika penyebaran konten promosi ilegal di
mengindikasikan makna "deposit" melalui pembelajaran ruang digital.
dari contoh serupa dalam data training.
DAFTAR PUSTAKA
3. Keterbatasan dan Tantangan Linguistik: Meskipun [1] RRI Data (2024), Data Statistika Penggunaan Media Sosial
performa kuantitatif kedua model sangat tinggi (>99%), Masyarakat Indonesia. https://www.rri.co.id/iptek/721570/ini-
data-statistik-penggunaan-media-sosial-masyarakat-indonesia-
analisis linguistik mengungkapkan beberapa keterbatasan
tahun-2024.
yang perlu menjadi perhatian, yaitu sensitivitas terhadap [2] R. Bayu Perdana, I. Budi, A. Budi Santoso, A. Ramadiah, and P.
konteks negative dan ketergantungan pada kata kunci pada Kresna Putra, “Detecting Online Gambling Promotions on
analisis word cloud. Indonesian Twitter Using Text Mining Algorithm,” 2024. [Online].
Available: www.ijacsa.thesai.org
Secara keseluruhan, analisis linguistik mengonfirmasi
[3] A. Maulana and A. Yuliana, “Analisis Sentimen Opini Publik
bahwa DeBERTa memiliki keunggulan signifikan dalam Terkait Judi Online Pada Pengguna Aplikasi X Menggunakan
menangani ambiguitas bahasa dan variasi linguistik Algoritma Naïve Bayes Dan Support Vector Mechine,” Jurnal
dibandingkan DistilBERT, terutama berkat mekanisme Informatika dan Teknik Elektro Terapan, vol. 12, no. 3S1, Oct.
2024, doi: 10.23960/jitet.v12i3S1.5187.
disentangled attention dan metode tokenisasi BPE yang lebih
[4] E. Smith, N. Reiter, and J. Peters, “Automatic detection of
robust terhadap teks informal. Namun, tantangan dalam problem-gambling signs from online texts using large language
memahami negasi kontekstual dan adaptasi terhadap teknik models,” Nov. 2023, [Online]. Available:
baru masih menjadi area yang memerlukan pengembangan http://arxiv.org/abs/2312.00804
[5] F. Fajri et al., “Membandingkan Nilai Akurasi BERT dan
lebih lanjut.
DistilBERT pada Dataset Twitter,” vol. 8, no. 2, pp. 71–80, 2022.
[6] V. Sanh, L. Debut, J. Chaumond, and T. Wolf, “DistilBERT, a
IV. KESIMPULAN
distilled version of BERT: smaller, faster, cheaper and lighter,”
Oct. 2019, [Online]. Available: http://arxiv.org/abs/1910.01108
Penelitian ini membandingkan performa model [7] J. Carreras Timoneda and S. Vallejo Vera, “BERT, RoBERTa or
DistilBERT dan DeBERTa dalam mendeteksi promosi judi DeBERTa? Comparing Performance Across Transformer Models
online pada komentar YouTube. Hasil evaluasi menunjukkan in Political Science Text,” J Polit, Jan. 2024, doi: 10.1086/730737.
[8] S. Ruder, M. Peters, S. Swayamdipta, and T. Wolf, “Ruder, S.
bahwa kedua model memiliki kinerja yang sangat tinggi
(2019). Transfer Learning in Natural Language Processing. arXiv
dengan nilai presisi, recall, dan F1-score mencapai 1.00 preprint arXiv:1901.11504.”
(100%). DistilBERT memperoleh akurasi sebesar 99,29%, [9] I. Goodfellow, Y. Bengio, and A. Courville, Deep Learning.
sedangkan DeBERTa sedikit lebih unggul dengan akurasi Cambridge, MA: MIT Press, 2016.
[10] A. Chopra, A. Prashar, and C. Sain, “Natural Language
99,84%. Analisis word cloud juga mengonfirmasi bahwa teks
Processing,” International Journal Of Technology Enhancements
promosi judi online didominasi oleh kata-kata ajakan dan And Emerging Engineering Research, vol. 1, no. 4, 2013, [Online].
bonus seperti freebet dan gratis, sedangkan teks bukan Available: http://en.wikipedia.org/wiki/
promosi lebih bervariasi dan kontekstual. Oleh karena itu, [11] C. Jocelynne, L. Tobing, I. Lanang Wijayakusuma, L. Putu, and I.
Harini, “Detection of Political Hoax News Using Fine-Tuning
DeBERTa layak dijadikan pilihan utama dalam membangun
IndoBERT,” 2025. [Online]. Available:
sistem deteksi otomatis konten ilegal di media sosial. Namun, http://jurnal.polibatam.ac.id/index.php/JAIC
DistilBERT tetap berguna apabila fokus utamanya adalah [12] Vasmani, A., Shazeer, N., Parman, N., Uszkoreit, J., Jones, L.,
kecepatan inferensi dan efisiensi komputasi. Gomez, A., & Kaiser, L. (2017) Attention is all you need. URL
https://proceedings.neurips.cc/paper_files/paper/ 2017/file/3f5ee2
Dengan performa yang sangat baik tersebut, model deteksi
43547dee91fbd053c1c4a845aa-Paper.pdf.”
ini berpotensi diterapkan sebagai sistem pendukung moderasi [13] P. He, X. Liu, J. Gao, and W. Chen, “DeBERTa: Decoding-
konten pada platform YouTube maupun sistem filter konten enhanced BERT with Disentangled Attention,” Jun. 2020, doi:
milik pemerintah. Integrasi model DeBERTa ke dalam https://doi.org/10.48550/arXiv.2006.03654.
[14] M. B. Nugroho, A. Khanif Zyen, and A. Widiastuti, “Multiclass
mekanisme moderasi otomatis dapat membantu mendeteksi
Sentiment Analysis of Electric Vehicle Incentive Policies Using
dan memblokir komentar promosi judi online secara real time, IndoBERT and DeBERTa Algorithms,” 2025. [Online]. Available:
sehingga mampu meningkatkan keamanan digital dan http://jurnal.polibatam.ac.id/index.php/JAIC
menjaga kualitas interaksi pengguna. Ke depan, penelitian ini [15] S. Mahendru and T. Pandit, “SecureNet: A Comparative Study of
DeBERTa and Large Language Models for Phishing Detection,”
dapat dikembangkan dengan mengeksplorasi model
Jun. 2024, doi: 10.1109/BDAI62182.2024.10692765.
multilingual transformer seperti IndoBERTweet atau
mBERT agar mampu mengenali variasi bahasa informal dan
campuran bahasa asing yang umum digunakan di media
Comparison of Online Gambling Promotion Detection Perfomance Using DistilBERT and DeBERTa Models
(Halim Meliana Pratama, IGN Lanang Wijaya Kusuma, Ratna Sari Widiastuti)