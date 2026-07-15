# Near-Duplicate Candidate Filter Design

## Goal

Mengurangi spam template sebelum masuk database pada semua sumber: opsi candidate-only menyimpan hanya `weak_label=1`, dan kandidat yang hampir sama dengan dokumen tersimpan dilewati.

## Reusable architecture

Logika berada di `src/judol_detection/collection/deduplication.py` dan dipanggil oleh `CollectionStorage.store_document()`. Collector Telegram, YouTube, X, atau importer hanya mengirim `CollectedDocument`; tidak boleh mengimplementasikan deduplikasi sendiri.

`CollectionStorage` menerima konfigurasi `candidate_only` dan `near_duplicate_threshold` dengan default `False` dan `0.85`. Dengan default itu, sumber masa depan masih dapat mengumpulkan sampel negatif; pilot Telegram memilih `candidate_only=True`.

## Decision flow

1. Normalisasi dan paper-based weak label tetap dijalankan terlebih dahulu.
2. Jika `candidate_only=True` dan `weak_label=0`, pesan tidak disimpan dan dihitung sebagai `skipped_non_candidate`.
3. Untuk kandidat positif, buat bentuk deduplikasi: lowercase, Unicode/whitespace normalization, URL/mention/angka dinetralkan, lalu token alfanumerik unik diambil.
4. Bandingkan token set dengan dokumen yang sudah tersimpan memakai Jaccard similarity.
5. Similarity `>= 0.85` berarti `skipped_near_duplicate`; di bawah ambang disimpan seperti biasa.

## Storage and audit

`text_raw` tidak diubah. Bentuk deduplikasi hanya untuk perbandingan. Run menyimpan count kandidat yang disimpan, non-candidate yang dilewati, dan near-duplicate yang dilewati. Untuk pilot, alasan skip ditulis ke ringkasan run agar ambang dapat diaudit tanpa menyimpan seluruh teks yang dibuang.

## Verification

Tests mencakup URL/angka/mention template yang dianggap mirip, pesan yang berbeda cukup jauh, batas 0.85, dan pesan `weak_label=0` yang tidak pernah mencapai penyimpanan.

## Scope

Perubahan berlaku lintas collector melalui storage reusable. Database lama tidak dihapus; jalankan pilot baru ke database baru setelah verifikasi.
