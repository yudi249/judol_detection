# Containment Deduplication Design

## Goal

Menangkap template promosi panjang yang memiliki inti sama tetapi ditambah ekor username, mention, atau token acak berbeda.

## Metric

Selain Jaccard, hitung containment:

```text
intersection(token_set_a, token_set_b) / min(len(token_set_a), len(token_set_b))
```

Pasangan dianggap near-duplicate bila Jaccard memenuhi threshold yang dikonfigurasi, containment `>= 0.90`, atau memiliki awalan token kanonis yang sama sedikitnya 20 token dan meliputi sedikitnya 80% dari token pesan yang lebih pendek.

## Aggressive shared-prefix rule

Pesan Telegram yang diuji mempunyai 64 token awal identik, kemudian berbeda hanya pada daftar username di ekor. Containment-nya `0.868`, sehingga tidak cukup untuk batas `0.90`. Karena itu, hitung jumlah token identik dari awal sampai token pertama yang berbeda dan bagi dengan panjang pesan yang lebih pendek. Aturan ini dipakai hanya jika jumlah token awal yang sama minimal 20, untuk menghindari penggabungan dua promosi hanya karena pembuka pendek yang umum.

## Canonical form

Tetap hapus URL, mention, dan angka. Token satu atau dua huruf tidak dipakai dalam token set deduplikasi, sehingga daftar username/sampah pendek tidak menurunkan skor inti promosi.

## Scope and verification

Metrik berada di `collection/deduplication.py` dan dipakai `CollectionStorage` oleh semua collector. Tests harus membuktikan template dengan ekor acak lolos containment, template dengan awalan panjang dan ekor username berbeda lolos shared-prefix, teks promosi berbeda tidak lolos, dan Jaccard lama tetap berfungsi.
