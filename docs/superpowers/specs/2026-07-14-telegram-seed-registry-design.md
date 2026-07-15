# Telegram Seed Registry Design

## Goal

Menyimpan seed channel Telegram secara versioned dan terpisah dari kode collector, sehingga daftar seed dapat diaudit, diaktifkan/nonaktifkan, dan dipakai ulang pada run berikutnya.

## Configuration

File `configs/telegram_seeds.json` berisi `version` dan daftar `seeds`. Setiap seed memiliki `username` tanpa awalan `@`, `group` bernilai `candidate`, `enabled` boolean, serta opsional `reason` dan `added_at`.

Seed awal: `NewEraForAll`, `markleekpop`, `sumberdanna`, `busanslotofficial`, `LEGACYNIIHBOS`, `CravingHeatPublic`, `skizofernia_area`, `Indochek`, `thenineee`, dan `METAPPH1`.

## CLI behavior

`scripts/collect_telegram.py` mendapat opsi `--seed-file`. Bila diberikan, script memuat semua seed dengan `enabled=true`; `--seed` boleh tetap menambah seed sementara. Username harus dinormalisasi, dideduplikasi, dan dicatat pada `seed_or_query` serta `config_json` milik run.

## Guardrails

Nama channel adalah provenance seed, bukan label positif. File konfigurasi tidak menyimpan credential. File invalid, username kosong, atau `group` tidak dikenal harus menghasilkan error sebelum koneksi Telegram dibuat.

## Verification

Test mencakup pemuatan hanya seed aktif, normalisasi `@`, deduplikasi antara file dan CLI, dan penolakan konfigurasi invalid. Dry-run menampilkan jumlah serta username seed yang efektif tanpa koneksi Telegram.
